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

// Contract template clauses
const SAMPLE_CLAUSES = {
  confidentiality: "Both parties agree to maintain strict confidentiality of all proprietary information exchanged during the term of this agreement. Neither party shall disclose such information to any third party without prior written consent.",

  termination: "Either party may terminate this agreement with 30 days written notice. In the event of material breach, the non-breaching party may terminate immediately upon written notice.",

  liability: "Neither party shall be liable for any indirect, incidental, consequential, or punitive damages arising from this agreement. Total liability shall not exceed the total fees paid under this agreement.",

  payment: "Payment terms are Net 30 from date of invoice. Late payments shall incur interest at 1.5% per month or the maximum rate permitted by law, whichever is less.",

  warranty: "Services shall be performed in a professional and workmanlike manner consistent with industry standards. Provider warrants that deliverables will conform to specifications agreed upon in writing.",

  intellectual_property: "All intellectual property rights in deliverables created under this agreement shall vest in the Client upon full payment. Provider retains rights to pre-existing materials and tools.",

  force_majeure: "Neither party shall be liable for delays or failures in performance resulting from acts beyond reasonable control, including natural disasters, war, terrorism, or government actions.",

  governing_law: "This agreement shall be governed by and construed in accordance with the laws of the State of Delaware, without regard to conflicts of law principles."
};

function generateContractPDF(contract, vendor, outputPath) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
    const writeStream = fs.createWriteStream(outputPath);

    doc.pipe(writeStream);

    // Header
    doc.fontSize(20).font('Helvetica-Bold').text('SERVICE AGREEMENT', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').text(`Contract ID: ${contract.id}`, { align: 'center' });
    doc.moveDown(2);

    // Contract parties
    doc.fontSize(14).font('Helvetica-Bold').text('BETWEEN:');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica');
    doc.text(`${vendor.name} ("Provider")`);
    doc.text(`Contact: ${vendor.primary_contact_name || 'N/A'}`);
    doc.text(`Email: ${vendor.primary_contact_email || 'N/A'}`);
    doc.moveDown(1);

    doc.fontSize(14).font('Helvetica-Bold').text('AND:');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica');
    doc.text('Demo Enterprise Corporation ("Client")');
    doc.text('123 Business Avenue, Suite 100');
    doc.text('San Francisco, CA 94105');
    doc.moveDown(2);

    // Contract details
    doc.fontSize(14).font('Helvetica-Bold').text('1. AGREEMENT DETAILS');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica');
    doc.text(`Contract Title: ${contract.title}`);
    doc.text(`Contract Type: ${contract.contract_type.replace(/_/g, ' ').toUpperCase()}`);
    doc.text(`Contract Value: $${contract.value?.toLocaleString() || '0'}`);
    doc.text(`Start Date: ${contract.start_date || 'TBD'}`);
    doc.text(`End Date: ${contract.end_date || 'TBD'}`);
    doc.text(`Auto-Renewal: ${contract.is_auto_renew ? 'Yes' : 'No'}`);
    doc.text(`Status: ${contract.status.toUpperCase()}`);
    doc.moveDown(2);

    // Scope of work
    doc.fontSize(14).font('Helvetica-Bold').text('2. SCOPE OF WORK');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica');

    if (contract.contract_type === 'software_license') {
      doc.text('Provider grants Client a non-exclusive, non-transferable license to use the software for the term of this agreement. License includes:');
      doc.list([
        'Access to software application and updates',
        'Technical support during business hours',
        'Data storage and backup services',
        'Security and compliance monitoring',
        'User training and documentation'
      ]);
    } else if (contract.contract_type === 'consulting') {
      doc.text('Provider shall provide professional consulting services including:');
      doc.list([
        'Strategic planning and advisory services',
        'Process improvement recommendations',
        'Implementation support and guidance',
        'Regular status meetings and reporting',
        'Documentation and knowledge transfer'
      ]);
    } else if (contract.contract_type === 'maintenance') {
      doc.text('Provider shall provide ongoing maintenance services including:');
      doc.list([
        'System monitoring and health checks',
        'Preventive maintenance procedures',
        'Emergency support and repairs',
        'Parts and equipment replacement as needed',
        'Quarterly performance reviews'
      ]);
    } else {
      doc.text('Provider shall deliver services as described in the attached Statement of Work, including all agreed-upon deliverables, timelines, and quality standards.');
    }
    doc.moveDown(2);

    // Payment terms
    doc.fontSize(14).font('Helvetica-Bold').text('3. PAYMENT TERMS');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica');
    doc.text(SAMPLE_CLAUSES.payment);
    doc.moveDown(1);

    const monthlyRate = Math.floor(contract.value / 12);
    if (contract.is_auto_renew) {
      doc.text(`Monthly Recurring Fees: $${monthlyRate.toLocaleString()}`);
    } else {
      doc.text(`Total Contract Value: $${contract.value?.toLocaleString() || '0'}`);
    }
    doc.moveDown(2);

    // Standard clauses
    doc.fontSize(14).font('Helvetica-Bold').text('4. CONFIDENTIALITY');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica');
    doc.text(SAMPLE_CLAUSES.confidentiality);
    doc.moveDown(2);

    doc.fontSize(14).font('Helvetica-Bold').text('5. WARRANTY');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica');
    doc.text(SAMPLE_CLAUSES.warranty);
    doc.moveDown(2);

    doc.fontSize(14).font('Helvetica-Bold').text('6. LIMITATION OF LIABILITY');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica');
    doc.text(SAMPLE_CLAUSES.liability);
    doc.moveDown(2);

    // New page for remaining clauses
    doc.addPage();

    doc.fontSize(14).font('Helvetica-Bold').text('7. INTELLECTUAL PROPERTY');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica');
    doc.text(SAMPLE_CLAUSES.intellectual_property);
    doc.moveDown(2);

    doc.fontSize(14).font('Helvetica-Bold').text('8. TERMINATION');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica');
    doc.text(SAMPLE_CLAUSES.termination);
    doc.moveDown(2);

    doc.fontSize(14).font('Helvetica-Bold').text('9. FORCE MAJEURE');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica');
    doc.text(SAMPLE_CLAUSES.force_majeure);
    doc.moveDown(2);

    doc.fontSize(14).font('Helvetica-Bold').text('10. GOVERNING LAW');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica');
    doc.text(SAMPLE_CLAUSES.governing_law);
    doc.moveDown(3);

    // Signatures
    doc.fontSize(14).font('Helvetica-Bold').text('SIGNATURES');
    doc.moveDown(2);

    doc.fontSize(11).font('Helvetica');
    doc.text('Provider:');
    doc.moveDown(0.5);
    doc.text('_________________________________');
    doc.text(`${vendor.primary_contact_name || 'Authorized Signatory'}`);
    doc.text(vendor.name);
    doc.text(`Date: ${new Date().toLocaleDateString()}`);
    doc.moveDown(2);

    doc.text('Client:');
    doc.moveDown(0.5);
    doc.text('_________________________________');
    doc.text('Demo User');
    doc.text('Demo Enterprise Corporation');
    doc.text(`Date: ${new Date().toLocaleDateString()}`);

    // Footer
    doc.fontSize(8).text(`Generated on ${new Date().toLocaleString()}`, 50, doc.page.height - 50, {
      align: 'center'
    });

    doc.end();

    writeStream.on('finish', () => resolve());
    writeStream.on('error', reject);
  });
}

async function generatePDFs() {
  console.log('📄 Generating PDF files for contracts...\n');
  console.log('Enterprise ID:', ENTERPRISE_ID);
  console.log('');

  const startTime = Date.now();

  // Create temp directory for PDFs
  const tempDir = path.join(__dirname, 'temp-pdfs');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  // Fetch all contracts with vendor info (paginated)
  console.log('Fetching contracts from database...');
  let allContracts = [];
  let page = 0;
  const PAGE_SIZE = 1000;

  while (true) {
    const { data: contracts, error: fetchError } = await supabase
      .from('contracts')
      .select(`
        *,
        vendors (
          id,
          name,
          primary_contact_name,
          primary_contact_email
        )
      `)
      .eq('enterprise_id', ENTERPRISE_ID)
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (fetchError) {
      console.error('Error fetching contracts:', fetchError.message);
      break;
    }

    if (!contracts || contracts.length === 0) break;

    allContracts = allContracts.concat(contracts);
    console.log(`  Fetched page ${page + 1}: ${contracts.length} contracts (Total: ${allContracts.length})`);

    if (contracts.length < PAGE_SIZE) break;
    page++;
  }

  const contracts = allContracts;

  console.log(`✓ Found ${contracts.length} contracts\n`);

  // Process contracts in smaller batches to avoid overwhelming triggers
  const BATCH_SIZE = 10;
  let processedCount = 0;
  let uploadedCount = 0;
  let errorCount = 0;

  console.log('Generating and uploading PDFs...');

  for (let i = 0; i < contracts.length; i += BATCH_SIZE) {
    const batch = contracts.slice(i, Math.min(i + BATCH_SIZE, contracts.length));

    // Generate PDFs for batch
    const pdfPromises = batch.map(async (contract) => {
      try {
        const fileName = `contract-${contract.id}.pdf`;
        const filePath = path.join(tempDir, fileName);

        // Generate PDF
        await generateContractPDF(contract, contract.vendors, filePath);

        // Read file as buffer
        const fileBuffer = fs.readFileSync(filePath);

        // Upload to Supabase Storage
        const storagePath = `${ENTERPRISE_ID}/${fileName}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('contracts')
          .upload(storagePath, fileBuffer, {
            contentType: 'application/pdf',
            upsert: true
          });

        if (uploadError) {
          console.error(`  ✗ Upload failed for contract ${contract.id}:`, uploadError.message);
          errorCount++;
          return;
        }

        // Update contract record with storage info
        const { error: updateError } = await supabase
          .from('contracts')
          .update({
            file_name: fileName,
            file_type: 'application/pdf',
            storage_id: storagePath
          })
          .eq('id', contract.id);

        if (updateError) {
          console.error(`  ✗ Database update failed for contract ${contract.id}:`, updateError.message);
          errorCount++;
          return;
        }

        // Clean up temp file
        fs.unlinkSync(filePath);

        uploadedCount++;
        processedCount++;

      } catch (error) {
        console.error(`  ✗ Error processing contract ${contract.id}:`, error.message);
        errorCount++;
      }
    });

    await Promise.all(pdfPromises);

    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(contracts.length / BATCH_SIZE);
    const percentComplete = Math.min(100, Math.floor((processedCount / contracts.length) * 100));
    console.log(`  ✓ Batch ${batchNum}/${totalBatches}: ${uploadedCount} uploaded (${percentComplete}% complete)`);

    // Small delay to avoid overwhelming database triggers
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Clean up temp directory
  try {
    fs.rmdirSync(tempDir);
  } catch (err) {
    // Directory might not be empty if there were errors
    console.log('  Note: Temp directory not cleaned up (may contain failed PDFs)');
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n✅ PDF generation complete!\n');
  console.log('📊 Summary:');
  console.log(`  • ${contracts.length} contracts processed`);
  console.log(`  • ${uploadedCount} PDFs uploaded successfully`);
  console.log(`  • ${errorCount} errors`);
  console.log(`  • Total time: ${totalTime}s`);
  console.log(`  • Average: ${(contracts.length / totalTime).toFixed(1)} contracts/sec`);
  console.log('');

  process.exit(0);
}

generatePDFs().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
