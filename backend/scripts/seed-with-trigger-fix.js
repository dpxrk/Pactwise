#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseKey);

// Use the actual enterprise and user IDs
const ENTERPRISE_ID = '36ceb93e-7627-4033-be2f-25bb755388bb';
const DEMO_USER_ID = '69c89a48-7b09-47df-9fd2-a749c631db9f';

const VENDORS = [
  { name: 'Microsoft Corporation', industry: 'Technology', rating: 4.8, spend: 250000 },
  { name: 'Amazon Web Services', industry: 'Cloud Services', rating: 4.7, spend: 180000 },
  { name: 'Salesforce Inc', industry: 'SaaS', rating: 4.6, spend: 150000 },
  { name: 'Google Cloud Platform', industry: 'Cloud Services', rating: 4.7, spend: 140000 },
  { name: 'Oracle Corporation', industry: 'Database', rating: 4.3, spend: 120000 },
  { name: 'SAP America Inc', industry: 'Enterprise Software', rating: 4.4, spend: 110000 },
  { name: 'IBM Corporation', industry: 'Technology', rating: 4.5, spend: 95000 },
  { name: 'Atlassian Corporation', industry: 'SaaS', rating: 4.6, spend: 75000 },
  { name: 'Adobe Systems Inc', industry: 'Creative Software', rating: 4.7, spend: 68000 },
  { name: 'Cisco Systems Inc', industry: 'Networking', rating: 4.5, spend: 85000 },
];

function randomDate(startDaysAgo, endDaysAgo) {
  const start = new Date();
  start.setDate(start.getDate() - startDaysAgo);
  const end = new Date();
  end.setDate(end.getDate() - endDaysAgo);
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return date.toISOString().split('T')[0];
}

function randomStatus() {
  const rand = Math.random();
  if (rand < 0.1) return 'draft';
  if (rand < 0.6) return 'active';
  if (rand < 0.8) return 'pending_review';
  if (rand < 0.95) return 'expired';
  return 'terminated';
}

async function seedDemo() {
  console.log('🌱 Seeding demo data for demo@pactwise.app...\n');
  console.log('Enterprise ID:', ENTERPRISE_ID);
  console.log('User ID:', DEMO_USER_ID);
  console.log('');

  // Disable search triggers
  console.log('Disabling search triggers...');
  await supabase.rpc('exec_sql', {
    sql: 'ALTER TABLE vendors DISABLE TRIGGER update_vendor_search_index;'
  }).catch(err => {
    // Try direct query if RPC doesn't work
    console.log('  (Trigger may already be disabled or not exist)');
  });

  // Create vendors
  console.log('\nCreating vendors...');
  const vendorIds = [];

  for (const vendor of VENDORS) {
    const { data, error} = await supabase
      .from('vendors')
      .insert({
        enterprise_id: ENTERPRISE_ID,
        name: vendor.name,
        category: 'technology',
        status: 'active',
        performance_score: vendor.rating,
        total_contract_value: vendor.spend,
        primary_contact_name: `Contact at ${vendor.name}`,
        primary_contact_email: `contact@${vendor.name.toLowerCase().replace(/\s+/g, '')}.com`,
        created_by: DEMO_USER_ID
      })
      .select()
      .single();

    if (error) {
      console.error(`Error creating vendor ${vendor.name}:`, error.message);
    } else {
      vendorIds.push(data.id);
      console.log(`  ✓ ${vendor.name}`);
    }
  }

  console.log(`\n✅ Created ${vendorIds.length} vendors\n`);

  // Re-enable search triggers
  console.log('Re-enabling search triggers...');
  await supabase.rpc('exec_sql', {
    sql: 'ALTER TABLE vendors ENABLE TRIGGER update_vendor_search_index;'
  }).catch(err => {
    console.log('  (Could not re-enable trigger)');
  });

  // Create contracts
  console.log('\nCreating contracts...');
  const contractIds = [];

  for (let i = 0; i < 20; i++) {
    const vendorId = vendorIds[Math.floor(Math.random() * vendorIds.length)];
    const status = randomStatus();
    const startDate = randomDate(365, 30);
    const endDate = randomDate(90, -180);
    const value = Math.floor(Math.random() * 500000) + 50000;

    const { data, error } = await supabase
      .from('contracts')
      .insert({
        enterprise_id: ENTERPRISE_ID,
        vendor_id: vendorId,
        title: `Contract ${i + 1} - ${VENDORS.find((v, idx) => vendorIds[idx] === vendorId)?.name || 'Vendor'}`,
        contract_type: ['service_agreement', 'software_license', 'consulting', 'maintenance'][Math.floor(Math.random() * 4)],
        status: status,
        value: value,
        start_date: startDate,
        end_date: endDate,
        is_auto_renew: Math.random() > 0.5,
        created_by: DEMO_USER_ID,
        owner_id: DEMO_USER_ID
      })
      .select()
      .single();

    if (error) {
      console.error(`Error creating contract ${i + 1}:`, error.message);
    } else {
      contractIds.push(data.id);
      console.log(`  ✓ Contract ${i + 1} - ${status}`);
    }
  }

  console.log(`\n✅ Created ${contractIds.length} contracts\n`);

  // Create budgets
  console.log('Creating budgets...');

  const budgets = [
    { name: 'Q1 2025 Software Budget', amount: 500000, type: 'quarterly' },
    { name: 'Q1 2025 Services Budget', amount: 300000, type: 'quarterly' },
    { name: 'Annual IT Infrastructure', amount: 1000000, type: 'annual' }
  ];

  for (const budget of budgets) {
    const { error } = await supabase
      .from('budgets')
      .insert({
        enterprise_id: ENTERPRISE_ID,
        name: budget.name,
        budget_type: budget.type,
        total_budget: budget.amount,
        spent_amount: Math.floor(budget.amount * (0.3 + Math.random() * 0.4)),
        start_date: '2025-01-01',
        end_date: '2025-03-31',
        created_by: DEMO_USER_ID,
        owner_id: DEMO_USER_ID
      });

    if (error) {
      console.error(`Error creating budget ${budget.name}:`, error.message);
    } else {
      console.log(`  ✓ ${budget.name}`);
    }
  }

  console.log('\n✅ Demo data seeded successfully!\n');
  console.log('📊 Summary:');
  console.log(`  • ${vendorIds.length} vendors`);
  console.log(`  • ${contractIds.length} contracts`);
  console.log(`  • ${budgets.length} budgets`);
  console.log('\n🎉 You can now sign in with:');
  console.log('  Email: demo@pactwise.app');
  console.log('  Password: demo1234\n');

  process.exit(0);
}

seedDemo().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
