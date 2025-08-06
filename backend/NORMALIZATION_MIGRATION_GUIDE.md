# Database Normalization Migration Guide

This guide helps developers update their code to work with the normalized database schema.

## Quick Reference

### Migration Status
- ✅ **044**: Vendors contacts normalization (COMPLETED)
- ✅ **045**: Contracts extractions normalization (COMPLETED)
- 🆕 **046**: Users departments/titles normalization (NEW)
- 🆕 **047**: Payment methods normalization (NEW)
- 🆕 **048**: Address data centralization (NEW)

## Code Update Examples

### 1. Users Table Changes (Migration 046)

#### Old Query
```typescript
const { data: user } = await supabase
  .from('users')
  .select('*, department, title')
  .eq('id', userId)
  .single();
```

#### New Query (Backward Compatible)
```typescript
// Option 1: Use compatibility columns (temporary)
const { data: user } = await supabase
  .from('users')
  .select(`
    *,
    primary_department:departments!primary_department_id(*),
    primary_job_title:job_titles!primary_job_title_id(*)
  `)
  .eq('id', userId)
  .single();

// Option 2: Use normalized tables (recommended)
const { data: user } = await supabase
  .from('users')
  .select(`
    *,
    user_positions!inner(
      is_primary,
      department:departments(*),
      job_title:job_titles(*)
    )
  `)
  .eq('id', userId)
  .eq('user_positions.is_primary', true)
  .single();
```

#### Creating/Updating Users
```typescript
// Old way
await supabase.from('users').insert({
  email: 'user@example.com',
  department: 'Engineering',
  title: 'Senior Developer'
});

// New way
// Step 1: Create user
const { data: user } = await supabase.from('users').insert({
  email: 'user@example.com'
}).select().single();

// Step 2: Get or create department
const { data: dept } = await supabase.from('departments')
  .select()
  .eq('name', 'Engineering')
  .eq('enterprise_id', enterpriseId)
  .single();

// Step 3: Get or create job title
const { data: title } = await supabase.from('job_titles')
  .select()
  .eq('title', 'Senior Developer')
  .eq('enterprise_id', enterpriseId)
  .single();

// Step 4: Create position
await supabase.from('user_positions').insert({
  user_id: user.id,
  department_id: dept.id,
  job_title_id: title.id,
  is_primary: true
});
```

### 2. Vendor Contacts Changes (Migration 044 - Already Applied)

#### Old Query
```typescript
const { data: vendor } = await supabase
  .from('vendors')
  .select('*, contact_name, contact_email, contact_phone')
  .eq('id', vendorId)
  .single();
```

#### New Query
```typescript
const { data: vendor } = await supabase
  .from('vendors')
  .select(`
    *,
    contacts(*)
  `)
  .eq('id', vendorId)
  .single();
```

### 3. Contract Extractions Changes (Migration 045 - Already Applied)

#### Old Query
```typescript
const { data: contract } = await supabase
  .from('contracts')
  .select('*, extracted_parties, extracted_address')
  .eq('id', contractId)
  .single();
```

#### New Query
```typescript
const { data: contract } = await supabase
  .from('contracts')
  .select(`
    *,
    contract_extractions(*)
  `)
  .eq('id', contractId)
  .single();
```

### 4. Payment Methods Changes (Migration 047)

#### Old Query
```typescript
const { data: paymentMethod } = await supabase
  .from('payment_methods')
  .select('*, card_brand, card_last4')
  .eq('id', methodId)
  .single();
```

#### New Query
```typescript
const { data: paymentMethod } = await supabase
  .from('payment_methods')
  .select(`
    *,
    payment_method_cards(*),
    payment_method_bank_accounts(*)
  `)
  .eq('id', methodId)
  .single();

// Access card details
if (paymentMethod.type === 'card' && paymentMethod.payment_method_cards) {
  const cardDetails = paymentMethod.payment_method_cards[0];
  console.log(cardDetails.brand, cardDetails.last4);
}
```

### 5. Address Data Changes (Migration 048)

#### Old Query
```typescript
const { data: vendor } = await supabase
  .from('vendors')
  .select('*, address')
  .eq('id', vendorId)
  .single();
```

#### New Query
```typescript
const { data: vendor } = await supabase
  .from('vendors')
  .select(`
    *,
    addresses!addresses_entity_id_fkey(*)
  `)
  .eq('id', vendorId)
  .single();

// Or use the foreign key
const { data: vendor } = await supabase
  .from('vendors')
  .select(`
    *,
    primary_address:addresses!primary_address_id(*)
  `)
  .eq('id', vendorId)
  .single();
```

## TypeScript Type Updates

### Generate New Types
```bash
cd backend
npm run types:generate
```

### Updated Type Definitions
```typescript
// Old User type
interface User {
  id: string;
  email: string;
  department?: string;
  title?: string;
}

// New User type with relations
interface User {
  id: string;
  email: string;
  primary_department_id?: string;
  primary_job_title_id?: string;
  // Relations
  user_positions?: UserPosition[];
  primary_department?: Department;
  primary_job_title?: JobTitle;
}

interface UserPosition {
  id: string;
  user_id: string;
  department_id?: string;
  job_title_id?: string;
  is_primary: boolean;
  department?: Department;
  job_title?: JobTitle;
}
```

## Testing Checklist

Before deploying normalized schema:

- [ ] Run all migration scripts locally
- [ ] Test backward compatibility with existing queries
- [ ] Update TypeScript types
- [ ] Test CRUD operations on new tables
- [ ] Verify RLS policies work correctly
- [ ] Check query performance with JOINs
- [ ] Test data integrity constraints
- [ ] Verify triggers are working

## Rollback Plan

If issues arise, migrations can be rolled back:

```bash
# Rollback to specific migration
supabase migration down --to-version 045

# Or manually drop new tables (data loss warning!)
DROP TABLE IF EXISTS user_positions CASCADE;
DROP TABLE IF EXISTS job_titles CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
-- etc.
```

## Performance Optimization

### Recommended Indexes (Already Created)
- Departments by enterprise
- Job titles by enterprise and department
- User positions by user and primary status
- Addresses by entity type and ID
- Payment method details by payment method ID

### Query Optimization Tips
1. Use specific column selection instead of `*`
2. Filter JOINs early with `.eq()` conditions
3. Use indexes effectively with proper WHERE clauses
4. Consider creating materialized views for complex queries

## Support

For questions or issues:
1. Check the migration files for detailed comments
2. Review the `3NF_BCNF_NORMALIZATION_REPORT.md`
3. Test queries in Supabase Studio SQL editor
4. Monitor query performance in production