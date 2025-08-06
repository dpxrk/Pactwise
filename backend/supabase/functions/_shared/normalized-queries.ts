/**
 * Helper functions for querying normalized database structure
 * Provides backward-compatible queries that work with both old and new schema
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database';

/**
 * Get user with all normalized relations
 */
export async function getUserWithPositions(
  client: SupabaseClient<Database>,
  userId: string
) {
  return await client
    .from('users')
    .select(`
      *,
      primary_department:departments!primary_department_id(*),
      primary_job_title:job_titles!primary_job_title_id(*),
      user_positions(
        *,
        department:departments(*),
        job_title:job_titles(*)
      )
    `)
    .eq('id', userId)
    .single();
}

/**
 * Get vendor with contacts and addresses
 */
export async function getVendorWithDetails(
  client: SupabaseClient<Database>,
  vendorId: string
) {
  return await client
    .from('vendors')
    .select(`
      *,
      contacts(*),
      primary_address:addresses!primary_address_id(*),
      all_addresses:addresses!addresses_entity_id_fkey(*)
    `)
    .eq('id', vendorId)
    .single();
}

/**
 * Get contract with extractions and addresses
 */
export async function getContractWithDetails(
  client: SupabaseClient<Database>,
  contractId: string
) {
  return await client
    .from('contracts')
    .select(`
      *,
      contract_extractions(*),
      legal_address:addresses!legal_address_id(*),
      vendor(
        *,
        contacts(*),
        primary_address:addresses!primary_address_id(*)
      )
    `)
    .eq('id', contractId)
    .single();
}

/**
 * Get payment method with type-specific details
 */
export async function getPaymentMethodWithDetails(
  client: SupabaseClient<Database>,
  paymentMethodId: string
) {
  const { data, error } = await client
    .from('payment_methods')
    .select(`
      *,
      payment_method_cards(*),
      payment_method_bank_accounts(*)
    `)
    .eq('id', paymentMethodId)
    .single();

  if (error) throw error;

  // Flatten the response based on type
  if (data?.type === 'card' && data.payment_method_cards?.length > 0) {
    return {
      ...data,
      card_details: data.payment_method_cards[0],
      payment_method_cards: undefined,
      payment_method_bank_accounts: undefined,
    };
  } else if (data?.type === 'bank_account' && data.payment_method_bank_accounts?.length > 0) {
    return {
      ...data,
      bank_details: data.payment_method_bank_accounts[0],
      payment_method_cards: undefined,
      payment_method_bank_accounts: undefined,
    };
  }

  return data;
}

/**
 * Create or update vendor with contacts
 */
export async function upsertVendorWithContacts(
  client: SupabaseClient<Database>,
  vendorData: any,
  contactData?: {
    name: string;
    email?: string;
    phone?: string;
  }
) {
  // Create or update vendor
  const { data: vendor, error: vendorError } = await client
    .from('vendors')
    .upsert(vendorData)
    .select()
    .single();

  if (vendorError) throw vendorError;

  // Handle contact if provided
  if (contactData && vendor) {
    // Check if primary contact exists
    const { data: existingContact } = await client
      .from('contacts')
      .select('id')
      .eq('vendor_id', vendor.id)
      .eq('is_primary', true)
      .single();

    if (existingContact) {
      // Update existing contact
      await client
        .from('contacts')
        .update(contactData)
        .eq('id', existingContact.id);
    } else {
      // Create new contact
      await client
        .from('contacts')
        .insert({
          vendor_id: vendor.id,
          ...contactData,
          is_primary: true,
        });
    }
  }

  return vendor;
}

/**
 * Create or update contract with extractions
 */
export async function upsertContractWithExtractions(
  client: SupabaseClient<Database>,
  contractData: any,
  extractionData?: any
) {
  // Create or update contract
  const { data: contract, error: contractError } = await client
    .from('contracts')
    .upsert(contractData)
    .select()
    .single();

  if (contractError) throw contractError;

  // Handle extractions if provided
  if (extractionData && contract) {
    // Check if extraction exists
    const { data: existingExtraction } = await client
      .from('contract_extractions')
      .select('id')
      .eq('contract_id', contract.id)
      .single();

    if (existingExtraction) {
      // Update existing extraction
      await client
        .from('contract_extractions')
        .update(extractionData)
        .eq('id', existingExtraction.id);
    } else {
      // Create new extraction
      await client
        .from('contract_extractions')
        .insert({
          contract_id: contract.id,
          ...extractionData,
        });
    }
  }

  return contract;
}

/**
 * Create or update address for any entity
 */
export async function upsertAddress(
  client: SupabaseClient<Database>,
  addressData: {
    entity_type: 'vendor' | 'enterprise' | 'user' | 'contract';
    entity_id: string;
    address_type?: string;
    street_address_1?: string;
    street_address_2?: string;
    city?: string;
    state_province?: string;
    postal_code?: string;
    country?: string;
    enterprise_id: string;
  }
) {
  // Format the address
  const formattedAddress = formatAddress(
    addressData.street_address_1,
    addressData.street_address_2,
    addressData.city,
    addressData.state_province,
    addressData.postal_code,
    addressData.country
  );

  // Check if primary address exists
  const { data: existingAddress } = await client
    .from('addresses')
    .select('id')
    .eq('entity_type', addressData.entity_type)
    .eq('entity_id', addressData.entity_id)
    .eq('is_primary', true)
    .single();

  if (existingAddress) {
    // Update existing address
    const { data, error } = await client
      .from('addresses')
      .update({
        ...addressData,
        formatted_address: formattedAddress,
      })
      .eq('id', existingAddress.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } else {
    // Create new address
    const { data, error } = await client
      .from('addresses')
      .insert({
        ...addressData,
        address_type: addressData.address_type || 'primary',
        formatted_address: formattedAddress,
        is_primary: true,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

/**
 * Format address components into a single string
 */
function formatAddress(
  street1?: string | null,
  street2?: string | null,
  city?: string | null,
  state?: string | null,
  postal?: string | null,
  country?: string | null
): string {
  const parts = [];
  
  if (street1) parts.push(street1);
  if (street2) parts.push(street2);
  if (city) parts.push(city);
  if (state) parts.push(state);
  if (postal) parts.push(postal);
  if (country) parts.push(country);
  
  return parts.join(', ');
}

/**
 * Migrate legacy vendor data to normalized structure
 */
export async function migrateVendorToNormalized(
  client: SupabaseClient<Database>,
  vendorId: string
) {
  // Get vendor with old structure
  const { data: vendor, error } = await client
    .from('vendors')
    .select('*')
    .eq('id', vendorId)
    .single();

  if (error || !vendor) throw error || new Error('Vendor not found');

  // Migrate contact if exists (fields might already be null due to migration)
  if (vendor.contact_name || vendor.contact_email || vendor.contact_phone) {
    await client
      .from('contacts')
      .insert({
        vendor_id: vendorId,
        name: vendor.contact_name || 'Primary Contact',
        email: vendor.contact_email,
        phone: vendor.contact_phone,
        is_primary: true,
      })
      .select();
  }

  // Migrate address if exists
  if (vendor.address) {
    const address = await upsertAddress(client, {
      entity_type: 'vendor',
      entity_id: vendorId,
      address_type: 'primary',
      formatted_address: vendor.address,
      enterprise_id: vendor.enterprise_id,
    });

    // Update vendor with address reference
    if (address) {
      await client
        .from('vendors')
        .update({ primary_address_id: address.id })
        .eq('id', vendorId);
    }
  }

  return vendor;
}

/**
 * Get all users in an enterprise with their positions
 */
export async function getEnterpriseUsersWithPositions(
  client: SupabaseClient<Database>,
  enterpriseId: string,
  options?: {
    department_id?: string;
    role?: string;
    is_active?: boolean;
  }
) {
  let query = client
    .from('users')
    .select(`
      *,
      primary_department:departments!primary_department_id(*),
      primary_job_title:job_titles!primary_job_title_id(*),
      user_positions!inner(
        *,
        department:departments(*),
        job_title:job_titles(*)
      )
    `)
    .eq('enterprise_id', enterpriseId);

  if (options?.department_id) {
    query = query.eq('user_positions.department_id', options.department_id);
  }
  if (options?.role) {
    query = query.eq('role', options.role);
  }
  if (options?.is_active !== undefined) {
    query = query.eq('is_active', options.is_active);
  }

  return await query;
}