#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseKey);

const ENTERPRISE_ID = 'a0000000-0000-0000-0000-000000000001';
const DEMO_USER_ID = 'b0000000-0000-0000-0000-000000000001';

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
  { name: 'Dell Technologies', industry: 'Hardware', rating: 4.4, spend: 92000 },
  { name: 'HP Inc', industry: 'Hardware', rating: 4.3, spend: 71000 },
  { name: 'Zoom Video Communications', industry: 'SaaS', rating: 4.6, spend: 45000 },
  { name: 'Slack Technologies', industry: 'SaaS', rating: 4.7, spend: 38000 },
  { name: 'DocuSign Inc', industry: 'Document Management', rating: 4.5, spend: 32000 },
  { name: 'Workday Inc', industry: 'HR Software', rating: 4.6, spend: 125000 },
  { name: 'ServiceNow Inc', industry: 'IT Service Management', rating: 4.5, spend: 98000 },
  { name: 'Snowflake Inc', industry: 'Data Warehouse', rating: 4.7, spend: 87000 },
  { name: 'Datadog Inc', industry: 'Monitoring', rating: 4.6, spend: 54000 },
  { name: 'MongoDB Inc', industry: 'Database', rating: 4.5, spend: 62000 },
  { name: 'Twilio Inc', industry: 'Communications API', rating: 4.4, spend: 48000 },
  { name: 'Stripe Inc', industry: 'Payment Processing', rating: 4.8, spend: 156000 },
  { name: 'HubSpot Inc', industry: 'Marketing Automation', rating: 4.6, spend: 72000 },
  { name: 'Zendesk Inc', industry: 'Customer Support', rating: 4.5, spend: 51000 },
  { name: 'Dropbox Inc', industry: 'Cloud Storage', rating: 4.4, spend: 39000 },
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
  if (rand < 0.7) return 'active';
  if (rand < 0.9) return 'pending_renewal';
  return 'expired';
}

async function seedDemo() {
  console.log('Setting up demo account...\n');

  // Step 1: Get auth user
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  let authUser = authUsers?.users?.find(u => u.email === 'demo@pactwise.com');

  if (!authUser) {
    console.log('Creating auth user...');
    const { data, error } = await supabase.auth.admin.createUser({
      email: 'demo@pactwise.com',
      password: 'Demo123!@#',
      email_confirm: true,
      user_metadata: { full_name: 'Demo User' }
    });
    if (error) {
      console.error('Error creating auth user:', error);
      return;
    }
    authUser = data.user;
  }

  console.log('✅ Auth user ready:', authUser.email);

  // Step 2: Create enterprise
  const { error: entError } = await supabase
    .from('enterprises')
    .upsert({
      id: ENTERPRISE_ID,
      name: 'Pactwise Demo Organization',
      domain: 'pactwise.com',
      industry: 'Technology',
      size: 'Enterprise',
      contract_volume: 0,
      primary_use_case: 'Contract Management',
      settings: { demo: true, is_personal: false },
      metadata: { created_via: 'demo_setup', protected: true }
    });

  if (entError) {
    console.error('Error creating enterprise:', entError);
    return;
  }

  console.log('✅ Enterprise ready\n');

  // Step 3: Create user profile
  const { error: userError } = await supabase
    .from('users')
    .upsert({
      id: DEMO_USER_ID,
      auth_id: authUser.id,
      email: 'demo@pactwise.com',
      first_name: 'Demo',
      last_name: 'User',
      enterprise_id: ENTERPRISE_ID,
      role: 'owner',
      department: 'Administration',
      title: 'System Administrator'
    });

  if (userError) {
    console.error('Error creating user:', userError);
    return;
  }

  console.log('✅ User profile ready\n');

  // Step 4: Delete existing data
  console.log('Cleaning existing data...');
  await supabase.from('contracts').delete().eq('enterprise_id', ENTERPRISE_ID);
  await supabase.from('vendors').delete().eq('enterprise_id', ENTERPRISE_ID);
  console.log('✅ Cleaned\n');

  // Step 5: Create vendors
  console.log('Creating 25 vendors...');
  const vendorIds = {};

  for (const vendor of VENDORS) {
    const id = crypto.randomUUID();
    const { error } = await supabase.from('vendors').insert({
      id,
      enterprise_id: ENTERPRISE_ID,
      name: vendor.name,
      industry: vendor.industry,
      performance_rating: vendor.rating,
      total_spend: vendor.spend,
      status: 'active',
      risk_score: Math.floor(Math.random() * 30) + 10,
      compliance_status: Math.random() > 0.1 ? 'compliant' : 'pending_review',
      created_by: DEMO_USER_ID
    });

    if (!error) {
      vendorIds[vendor.name] = id;
      console.log(`  ✓ ${vendor.name}`);
    }
  }

  console.log(`✅ Created ${Object.keys(vendorIds).length} vendors\n`);

  // Step 6: Create contracts
  console.log('Creating 100 contracts...');
  let count = 0;

  for (let i = 0; i < 100; i++) {
    const vendor = VENDORS[i % VENDORS.length];
    const vendorId = vendorIds[vendor.name];

    const contractTypes = ['SaaS Subscription Agreement', 'Master Services Agreement', 'Software License Agreement', 'Consulting Agreement', 'Support Agreement'];
    const type = contractTypes[Math.floor(Math.random() * contractTypes.length)];

    const value = vendor.spend * (0.5 + Math.random() * 1.5);
    const duration = [12, 24, 36][Math.floor(Math.random() * 3)];
    const startDate = randomDate(730, 30);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + duration);
    const status = randomStatus();

    const content = `${type.toUpperCase()}\n\nThis ${type} is entered into as of ${startDate} between Pactwise Demo Organization ("Client") and ${vendor.name} ("Vendor").\n\n1. SERVICES\nVendor shall provide professional services as outlined in this agreement.\n\n2. FEES\nTotal contract value: $${Math.floor(value).toLocaleString()}\nTerm: ${duration} months\n\n3. TERM\nThis agreement shall commence on ${startDate} and continue until ${endDate.toISOString().split('T')[0]}.\n\n4. GENERAL PROVISIONS\nThis agreement constitutes the entire agreement between the parties.`;

    const { error } = await supabase.from('contracts').insert({
      id: crypto.randomUUID(),
      enterprise_id: ENTERPRISE_ID,
      vendor_id: vendorId,
      title: `${type} - ${vendor.name}`,
      type,
      status,
      value: Math.floor(value),
      start_date: startDate,
      end_date: endDate.toISOString().split('T')[0],
      content,
      created_by: DEMO_USER_ID
    });

    if (!error) {
      count++;
      if (count % 20 === 0) console.log(`  ✓ ${count} contracts...`);
    }
  }

  console.log(`✅ Created ${count} contracts\n`);
  console.log('🎉 Demo account setup complete!');
}

seedDemo().catch(console.error);
