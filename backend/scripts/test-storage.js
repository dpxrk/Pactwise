#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import PDFDocument from 'pdfkit';
import fs from 'fs';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testStorage() {
  console.log('Testing Supabase Storage...\n');

  // Check if bucket exists
  console.log('1. Checking if "contracts" bucket exists...');
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

  if (bucketsError) {
    console.error('Error listing buckets:', bucketsError);
    return;
  }

  console.log('Available buckets:', buckets.map(b => b.name).join(', '));
  const contractsBucket = buckets.find(b => b.name === 'contracts');

  if (!contractsBucket) {
    console.error('❌ "contracts" bucket not found!');
    return;
  }

  console.log('✓ "contracts" bucket exists\n');

  // Try to create a simple PDF
  console.log('2. Creating test PDF...');
  const doc = new PDFDocument();
  const filePath = '/tmp/test-contract.pdf';
  const writeStream = fs.createWriteStream(filePath);

  doc.pipe(writeStream);
  doc.fontSize(16).text('Test Contract PDF', { align: 'center' });
  doc.end();

  await new Promise((resolve) => {
    writeStream.on('finish', resolve);
  });

  console.log('✓ Test PDF created\n');

  // Try to upload
  console.log('3. Uploading test PDF to storage...');
  const fileBuffer = fs.readFileSync(filePath);

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('contracts')
    .upload('test/test-contract.pdf', fileBuffer, {
      contentType: 'application/pdf',
      upsert: true
    });

  if (uploadError) {
    console.error('❌ Upload failed:',  uploadError);
    console.error('Error details:', JSON.stringify(uploadError, null, 2));
    return;
  }

  console.log('✓ Upload successful!');
  console.log('Upload path:', uploadData.path);
  console.log('');

  // Clean up
  fs.unlinkSync(filePath);

  console.log('✅ Storage test passed!');
}

testStorage().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
