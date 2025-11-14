#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseKey);

const ENTERPRISE_ID = '204801d7-f0db-4b99-a9c5-bc6b2420eeb2';
const DEMO_USER_ID = 'fc370738-0aad-46e4-aa40-22548b699b9b';

// Generate 200 diverse vendor names
const VENDOR_PREFIXES = [
  'Global', 'Digital', 'Tech', 'Advanced', 'Smart', 'Integrated', 'Premier', 'Elite',
  'Professional', 'Enterprise', 'Strategic', 'Innovative', 'Dynamic', 'Quantum', 'Apex',
  'Vertex', 'Nexus', 'Core', 'Prime', 'Summit', 'Precision', 'Optimal', 'Superior',
  'United', 'National', 'International', 'Continental', 'Regional', 'Metro', 'Coastal'
];

const VENDOR_CORE_NAMES = [
  'Software', 'Systems', 'Solutions', 'Technologies', 'Services', 'Consulting', 'Analytics',
  'Networks', 'Data', 'Cloud', 'Security', 'Infrastructure', 'Platform', 'Application',
  'Engineering', 'Development', 'Management', 'Operations', 'Integration', 'Automation',
  'Intelligence', 'Commerce', 'Communications', 'Computing', 'Logistics', 'Manufacturing',
  'Medical', 'Healthcare', 'Financial', 'Insurance', 'Marketing', 'Media', 'Education',
  'Energy', 'Construction', 'Real Estate', 'Transportation', 'Retail', 'Hospitality'
];

const VENDOR_SUFFIXES = [
  'Inc', 'Corp', 'LLC', 'Group', 'Partners', 'Associates', 'Enterprises', 'International',
  'Technologies', 'Solutions', 'Systems', 'Services', 'Industries', 'Company', 'Labs'
];

const CATEGORIES = ['technology', 'marketing', 'legal', 'finance', 'hr', 'facilities', 'logistics', 'manufacturing', 'consulting', 'other'];
const STATUSES = ['active', 'inactive', 'pending', 'suspended'];
const CONTRACT_TYPES = ['service_agreement', 'software_license', 'consulting', 'maintenance', 'subscription', 'professional_services'];
const CONTRACT_STATUSES = ['draft', 'active', 'pending_review', 'pending_analysis', 'expired', 'terminated'];

function generateVendorName(index) {
  const prefix = VENDOR_PREFIXES[index % VENDOR_PREFIXES.length];
  const core = VENDOR_CORE_NAMES[Math.floor(index / VENDOR_PREFIXES.length) % VENDOR_CORE_NAMES.length];
  const suffix = VENDOR_SUFFIXES[Math.floor(index / (VENDOR_PREFIXES.length * 2)) % VENDOR_SUFFIXES.length];
  return `${prefix} ${core} ${suffix}`;
}

function randomDate(startDaysAgo, endDaysAgo) {
  const start = new Date();
  start.setDate(start.getDate() - startDaysAgo);
  const end = new Date();
  end.setDate(end.getDate() - endDaysAgo);
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return date.toISOString().split('T')[0];
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function seedLargeDemo() {
  console.log('🌱 Seeding LARGE demo data for demo@pactwise.app...\n');
  console.log('Target: 200 vendors, 2000+ contracts\n');
  console.log('Enterprise ID:', ENTERPRISE_ID);
  console.log('User ID:', DEMO_USER_ID);
  console.log('');

  const startTime = Date.now();

  // Create 200 vendors in batches of 50
  console.log('Creating 200 vendors...');
  const vendorIds = [];
  const BATCH_SIZE = 50;

  for (let batchStart = 0; batchStart < 200; batchStart += BATCH_SIZE) {
    const vendors = [];

    for (let i = batchStart; i < Math.min(batchStart + BATCH_SIZE, 200); i++) {
      const vendorName = generateVendorName(i);
      vendors.push({
        enterprise_id: ENTERPRISE_ID,
        name: vendorName,
        category: randomChoice(CATEGORIES),
        status: randomChoice(STATUSES),
        performance_score: (3.0 + Math.random() * 2.0).toFixed(2),
        total_contract_value: randomInt(10000, 1000000),
        primary_contact_name: `Contact ${i + 1}`,
        primary_contact_email: `contact${i + 1}@${vendorName.toLowerCase().replace(/\s+/g, '')}.com`,
        created_by: DEMO_USER_ID
      });
    }

    const { data, error } = await supabase
      .from('vendors')
      .insert(vendors)
      .select('id');

    if (error) {
      console.error(`Error creating vendor batch ${batchStart / BATCH_SIZE + 1}:`, error.message);
    } else {
      vendorIds.push(...data.map(v => v.id));
      console.log(`  ✓ Batch ${batchStart / BATCH_SIZE + 1}/4: ${data.length} vendors (Total: ${vendorIds.length})`);
    }
  }

  console.log(`\n✅ Created ${vendorIds.length} vendors in ${((Date.now() - startTime) / 1000).toFixed(1)}s\n`);

  // Create 2000+ contracts in batches of 100
  console.log('Creating 2000+ contracts...');
  const contractIds = [];
  const CONTRACT_BATCH_SIZE = 100;
  const TARGET_CONTRACTS = 2100;

  for (let batchStart = 0; batchStart < TARGET_CONTRACTS; batchStart += CONTRACT_BATCH_SIZE) {
    const contracts = [];

    for (let i = batchStart; i < Math.min(batchStart + CONTRACT_BATCH_SIZE, TARGET_CONTRACTS); i++) {
      const vendorId = randomChoice(vendorIds);
      const status = randomChoice(CONTRACT_STATUSES);

      // Generate dates that are logically consistent
      const startDaysAgo = randomInt(30, 730); // Start date between 1 month and 2 years ago
      const contractLength = randomInt(90, 1095); // Contract length between 3 months and 3 years
      const endDaysAgo = startDaysAgo - contractLength;

      const startDate = randomDate(startDaysAgo, startDaysAgo);
      const endDate = randomDate(endDaysAgo, endDaysAgo);

      contracts.push({
        enterprise_id: ENTERPRISE_ID,
        vendor_id: vendorId,
        title: `Contract #${i + 1} - ${randomChoice(['Annual', 'Monthly', 'Quarterly', 'Multi-Year'])} ${randomChoice(CONTRACT_TYPES)}`,
        contract_type: randomChoice(CONTRACT_TYPES),
        status: status,
        value: randomInt(5000, 999999),
        start_date: startDate,
        end_date: endDate,
        is_auto_renew: Math.random() > 0.6,
        created_by: DEMO_USER_ID,
        owner_id: DEMO_USER_ID,
        notes: Math.random() > 0.7 ? `Sample notes for contract ${i + 1}` : null
      });
    }

    const { data, error } = await supabase
      .from('contracts')
      .insert(contracts)
      .select('id');

    if (error) {
      console.error(`Error creating contract batch ${batchStart / CONTRACT_BATCH_SIZE + 1}:`, error.message);
    } else {
      contractIds.push(...data.map(c => c.id));
      const batchNum = batchStart / CONTRACT_BATCH_SIZE + 1;
      const totalBatches = Math.ceil(TARGET_CONTRACTS / CONTRACT_BATCH_SIZE);
      const percentComplete = ((batchStart + CONTRACT_BATCH_SIZE) / TARGET_CONTRACTS * 100).toFixed(0);
      console.log(`  ✓ Batch ${batchNum}/${totalBatches}: ${data.length} contracts (Total: ${contractIds.length}, ${percentComplete}% complete)`);
    }
  }

  console.log(`\n✅ Created ${contractIds.length} contracts in ${((Date.now() - startTime) / 1000).toFixed(1)}s\n`);

  // Create budgets
  console.log('Creating budgets...');
  const budgets = [
    { name: 'Q1 2025 Software Budget', amount: 5000000, type: 'quarterly' },
    { name: 'Q2 2025 Software Budget', amount: 5000000, type: 'quarterly' },
    { name: 'Q1 2025 Services Budget', amount: 3000000, type: 'quarterly' },
    { name: 'Q2 2025 Services Budget', amount: 3000000, type: 'quarterly' },
    { name: 'Annual IT Infrastructure', amount: 15000000, type: 'annual' },
    { name: 'Annual Cloud Services', amount: 10000000, type: 'annual' },
    { name: 'Department A Budget', amount: 2000000, type: 'department' },
    { name: 'Department B Budget', amount: 1500000, type: 'department' },
  ];

  for (const budget of budgets) {
    const { error } = await supabase
      .from('budgets')
      .insert({
        enterprise_id: ENTERPRISE_ID,
        name: budget.name,
        budget_type: budget.type,
        total_budget: budget.amount,
        spent_amount: Math.floor(budget.amount * (0.2 + Math.random() * 0.5)),
        start_date: '2025-01-01',
        end_date: budget.type === 'annual' ? '2025-12-31' : '2025-03-31',
        created_by: DEMO_USER_ID,
        owner_id: DEMO_USER_ID
      });

    if (error) {
      console.error(`Error creating budget ${budget.name}:`, error.message);
    } else {
      console.log(`  ✓ ${budget.name}`);
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n✅ LARGE demo data seeded successfully!\n');
  console.log('📊 Summary:');
  console.log(`  • ${vendorIds.length} vendors`);
  console.log(`  • ${contractIds.length} contracts`);
  console.log(`  • ${budgets.length} budgets`);
  console.log(`  • Total time: ${totalTime}s`);
  console.log('\n🎉 You can now sign in with:');
  console.log('  Email: demo@pactwise.app');
  console.log('  Password: demo1234\n');

  process.exit(0);
}

seedLargeDemo().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
