#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseKey);

const ENTERPRISE_ID = '204801d7-f0db-4b99-a9c5-bc6b2420eeb2';

async function checkPDFStatus() {
  console.log('📊 Checking PDF attachment status...\n');

  // Count total contracts
  const { count: totalContracts } = await supabase
    .from('contracts')
    .select('*', { count: 'exact', head: true })
    .eq('enterprise_id', ENTERPRISE_ID);

  // Count contracts with PDFs
  const { count: contractsWithPDFs } = await supabase
    .from('contracts')
    .select('*', { count: 'exact', head: true })
    .eq('enterprise_id', ENTERPRISE_ID)
    .not('storage_id', 'is', null);

  // Check storage bucket
  const { data: files, error } = await supabase.storage
    .from('contracts')
    .list(ENTERPRISE_ID);

  console.log('Contract Status:');
  console.log(`  Total contracts: ${totalContracts}`);
  console.log(`  Contracts with PDFs: ${contractsWithPDFs}`);
  console.log(`  Contracts without PDFs: ${totalContracts - contractsWithPDFs}`);
  console.log(`  Completion rate: ${((contractsWithPDFs / totalContracts) * 100).toFixed(1)}%`);
  console.log('');
  console.log('Storage Status:');
  console.log(`  PDF files in storage: ${files?.length || 0}`);
  console.log('');

  if (contractsWithPDFs < totalContracts) {
    console.log(`⚠️  ${totalContracts - contractsWithPDFs} contracts still need PDFs attached.`);
    console.log('   This can happen due to database trigger issues during bulk uploads.');
  } else {
    console.log('✅ All contracts have PDFs attached!');
  }

  process.exit(0);
}

checkPDFStatus().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
