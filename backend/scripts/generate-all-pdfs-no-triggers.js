#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseKey);

const ENTERPRISE_ID = '204801d7-f0db-4b99-a9c5-bc6b2420eeb2';

// Simplified contract clauses
const CLAUSES = {
  confidentiality: "Both parties agree to maintain strict confidentiality of all proprietary information exchanged during the term of this agreement.",
  termination: "Either party may terminate this agreement with 30 days written notice.",
  liability: "Neither party shall be liable for indirect, incidental, or consequential damages.",
  payment: "Payment terms are Net 30 from date of invoice.",
};

function generateQuickPDF(contract, vendor, outputPath) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
    const writeStream = fs.createWriteStream(outputPath);
    doc.pipe(writeStream);

    // Header
    doc.fontSize(18).font('Helvetica-Bold').text('SERVICE AGREEMENT', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(`Contract ID: ${contract.id.slice(0, 8)}`, { align: 'center' });
    doc.moveDown(2);

    // Parties
    doc.fontSize(12).font('Helvetica-Bold').text('PARTIES:');
    doc.fontSize(10).font('Helvetica');
    doc.text(`Provider: ${vendor.name}`);
    doc.text(`Client: Demo Enterprise Corporation`);
    doc.moveDown();

    // Details
    doc.fontSize(12).font('Helvetica-Bold').text('AGREEMENT DETAILS:');
    doc.fontSize(10).font('Helvetica');
    doc.text(`Title: ${contract.title}`);
    doc.text(`Type: ${contract.contract_type}`);
    doc.text(`Value: $${contract.value?.toLocaleString() || '0'}`);
    doc.text(`Period: ${contract.start_date} to ${contract.end_date}`);
    doc.text(`Status: ${contract.status}`);
    doc.moveDown(2);

    // Clauses
    doc.fontSize(11).font('Helvetica-Bold').text('1. CONFIDENTIALITY');
    doc.fontSize(9).font('Helvetica').text(CLAUSES.confidentiality);
    doc.moveDown();

    doc.fontSize(11).font('Helvetica-Bold').text('2. PAYMENT');
    doc.fontSize(9).font('Helvetica').text(CLAUSES.payment);
    doc.moveDown();

    doc.fontSize(11).font('Helvetica-Bold').text('3. TERMINATION');
    doc.fontSize(9).font('Helvetica').text(CLAUSES.termination);
    doc.moveDown();

    doc.fontSize(11).font('Helvetica-Bold').text('4. LIABILITY');
    doc.fontSize(9).font('Helvetica').text(CLAUSES.liability);

    doc.end();
    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
  });
}

async function generateAllPDFs() {
  console.log('📄 Generating ALL PDFs (trigger-safe method)...\n');
  console.log('Enterprise ID:', ENTERPRISE_ID);
  console.log('');

  const startTime = Date.now();

  // Create temp directory
  const tempDir = path.join(__dirname, 'temp-pdfs');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  // Fetch contracts that don't have PDFs yet
  console.log('Fetching contracts without PDFs...');
  let allContracts = [];
  let page = 0;
  const PAGE_SIZE = 1000;

  while (true) {
    const { data: contracts } = await supabase
      .from('contracts')
      .select(`
        *,
        vendors (id, name, primary_contact_name, primary_contact_email)
      `)
      .eq('enterprise_id', ENTERPRISE_ID)
      .is('storage_id', null)
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (!contracts || contracts.length === 0) break;
    allContracts = allContracts.concat(contracts);
    console.log(`  Page ${page + 1}: ${contracts.length} contracts (Total: ${allContracts.length})`);
    if (contracts.length < PAGE_SIZE) break;
    page++;
  }

  console.log(`✓ Found ${allContracts.length} contracts needing PDFs\n`);

  if (allContracts.length === 0) {
    console.log('✅ All contracts already have PDFs!');
    process.exit(0);
  }

  // Process sequentially to avoid issues
  let uploadedCount = 0;
  let errorCount = 0;

  console.log('Generating and uploading PDFs (this will take a while)...\n');

  for (let i = 0; i < allContracts.length; i++) {
    const contract = allContracts[i];

    try {
      const fileName = `contract-${contract.id}.pdf`;
      const filePath = path.join(tempDir, fileName);

      // Generate PDF
      await generateQuickPDF(contract, contract.vendors, filePath);

      // Upload to storage
      const fileBuffer = fs.readFileSync(filePath);
      const storagePath = `${ENTERPRISE_ID}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('contracts')
        .upload(storagePath, fileBuffer, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Update contract record
      await supabase
        .from('contracts')
        .update({
          file_name: fileName,
          file_type: 'application/pdf',
          storage_id: storagePath
        })
        .eq('id', contract.id);

      // Clean up
      fs.unlinkSync(filePath);

      uploadedCount++;

      // Progress update every 50 contracts
      if (uploadedCount % 50 === 0) {
        const percentComplete = Math.floor((uploadedCount / allContracts.length) * 100);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
        const rate = (uploadedCount / elapsed).toFixed(1);
        console.log(`  ✓ ${uploadedCount}/${allContracts.length} uploaded (${percentComplete}% complete, ${rate}/sec)`);
      }

    } catch (error) {
      errorCount++;
      if (errorCount === 1 || errorCount % 100 === 0) {
        console.error(`  ✗ Error ${errorCount}:`, error.message);
      }
    }
  }

  // Clean up temp directory
  try {
    fs.rmdirSync(tempDir);
  } catch (err) {
    // Ignore
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n✅ PDF generation complete!\n');
  console.log('📊 Summary:');
  console.log(`  • ${allContracts.length} contracts processed`);
  console.log(`  • ${uploadedCount} PDFs uploaded successfully`);
  console.log(`  • ${errorCount} errors`);
  console.log(`  • Total time: ${totalTime}s`);
  console.log(`  • Average: ${(allContracts.length / totalTime).toFixed(1)} contracts/sec`);
  console.log('');

  process.exit(0);
}

generateAllPDFs().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
