/**
 * Generate Sample Contract PDFs for Testing
 *
 * Install dependencies: npm install pdfkit
 * Run with: node backend/scripts/generate-sample-contracts.js
 */

const fs = require('fs');
const PDFDocument = require('pdfkit');
const path = require('path');

const contracts = [
  {
    title: 'Software License Agreement',
    primaryParty: 'Pactwise Inc.',
    vendorParty: 'TechVendor Solutions LLC',
    vendorEmail: 'contracts@techvendor.com',
    vendorPhone: '555-0123',
    vendorAddress: '123 Tech Street, San Francisco, CA 94105',
    contractType: 'License Agreement',
    effectiveDate: '2024-01-15',
    expirationDate: '2025-01-14',
    value: '$50,000',
    description: 'Annual software license for enterprise resource planning system including support and maintenance.'
  },
  {
    title: 'Cloud Services Agreement',
    primaryParty: 'Pactwise',
    vendorParty: 'CloudHost Inc',
    vendorEmail: 'sales@cloudhost.com',
    vendorPhone: '555-0456',
    vendorAddress: '456 Cloud Ave, Seattle, WA 98101',
    contractType: 'Service Agreement',
    effectiveDate: '2024-02-01',
    expirationDate: '2026-01-31',
    value: '$120,000',
    description: 'Multi-year cloud infrastructure hosting services with 99.9% uptime SLA.'
  },
  {
    title: 'Marketing Services Contract',
    primaryParty: 'Pactwise Inc',
    vendorParty: 'Creative Marketing Group',
    vendorEmail: 'info@creativemarketing.com',
    vendorPhone: '555-0789',
    vendorAddress: '789 Marketing Blvd, New York, NY 10001',
    contractType: 'Service Agreement',
    effectiveDate: '2024-03-01',
    expirationDate: '2024-08-31',
    value: '$75,000',
    description: 'Digital marketing campaign management including SEO, content creation, and social media.'
  },
  {
    title: 'Office Equipment Lease',
    primaryParty: 'Pactwise Corporation',
    vendorParty: 'Office Solutions Ltd.',
    vendorEmail: 'leasing@officesolutions.com',
    vendorPhone: '555-0321',
    vendorAddress: '321 Business Park, Chicago, IL 60601',
    contractType: 'Lease Agreement',
    effectiveDate: '2024-01-01',
    expirationDate: '2027-12-31',
    value: '$36,000',
    description: 'Three-year lease for office equipment including copiers, printers, and scanners.'
  },
  {
    title: 'Consulting Services Agreement',
    primaryParty: 'Pactwise',
    vendorParty: 'Strategic Consulting Partners',
    vendorEmail: 'engage@stratconsult.com',
    vendorPhone: '555-0654',
    vendorAddress: '654 Consultant Way, Boston, MA 02101',
    contractType: 'Consulting Agreement',
    effectiveDate: '2024-04-01',
    expirationDate: '2024-09-30',
    value: '$180,000',
    description: 'Business strategy consulting for market expansion and operational efficiency improvements.'
  },
  {
    title: 'Data Analytics Platform License',
    primaryParty: 'Pactwise Inc.',
    vendorParty: 'Analytics Pro Corporation',
    vendorEmail: 'licensing@analyticspro.com',
    vendorPhone: '555-0987',
    vendorAddress: '987 Data Drive, Austin, TX 78701',
    contractType: 'License Agreement',
    effectiveDate: '2024-02-15',
    expirationDate: '2025-02-14',
    value: '$95,000',
    description: 'Enterprise analytics platform with unlimited users and premium support.'
  },
  {
    title: 'Cybersecurity Services Contract',
    primaryParty: 'Pactwise Corporation',
    vendorParty: 'SecureIT Solutions Inc',
    vendorEmail: 'contracts@secureit.com',
    vendorPhone: '555-0147',
    vendorAddress: '147 Security Lane, Washington, DC 20001',
    contractType: 'Service Agreement',
    effectiveDate: '2024-01-01',
    expirationDate: '2024-12-31',
    value: '$150,000',
    description: 'Comprehensive cybersecurity services including monitoring, threat detection, and incident response.'
  },
  {
    title: 'Legal Services Retainer',
    primaryParty: 'Pactwise Inc',
    vendorParty: 'Morrison & Associates Law Firm',
    vendorEmail: 'retainer@morrisonlaw.com',
    vendorPhone: '555-0258',
    vendorAddress: '258 Legal Plaza, Los Angeles, CA 90001',
    contractType: 'Retainer Agreement',
    effectiveDate: '2024-01-01',
    expirationDate: '2024-12-31',
    value: '$200,000',
    description: 'Annual legal services retainer for corporate matters, contract review, and compliance.'
  },
  {
    title: 'Telecommunications Services',
    primaryParty: 'Pactwise',
    vendorParty: 'GlobalTel Communications',
    vendorEmail: 'business@globaltel.com',
    vendorPhone: '555-0369',
    vendorAddress: '369 Telecom Tower, Atlanta, GA 30301',
    contractType: 'Service Agreement',
    effectiveDate: '2024-03-01',
    expirationDate: '2026-02-28',
    value: '$60,000',
    description: 'Business telecommunications services including VoIP, conferencing, and international calling.'
  },
  {
    title: 'HR Management Software Subscription',
    primaryParty: 'Pactwise Inc.',
    vendorParty: 'PeopleFirst Software Co',
    vendorEmail: 'sales@peoplefirst.com',
    vendorPhone: '555-0741',
    vendorAddress: '741 HR Boulevard, Denver, CO 80201',
    contractType: 'SaaS Agreement',
    effectiveDate: '2024-02-01',
    expirationDate: '2025-01-31',
    value: '$45,000',
    description: 'Cloud-based HR management system for payroll, benefits, and employee records.'
  }
];

// Create output directory
const outputDir = path.join(__dirname, '../sample-contracts');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

function generateContractPDF(contract, index) {
  return new Promise((resolve, reject) => {
    const fileName = `sample_contract_${String(index + 1).padStart(2, '0')}_${contract.vendorParty.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    const filePath = path.join(outputDir, fileName);

    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream);

    // Header
    doc.fontSize(20).font('Helvetica-Bold').text(contract.title.toUpperCase(), { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').text(`Contract No: CTR-2024-${String(index + 1).padStart(4, '0')}`, { align: 'center' });
    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(1.5);

    // Parties Section
    doc.fontSize(12).font('Helvetica-Bold').text('PARTIES TO THIS AGREEMENT');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica').text(`This ${contract.contractType} ("Agreement") is entered into between:`);
    doc.moveDown(0.5);

    doc.font('Helvetica-Bold').text('Party A (Client): ', { continued: true });
    doc.font('Helvetica').text(contract.primaryParty);
    doc.moveDown(0.3);

    doc.font('Helvetica-Bold').text('Party B (Vendor): ', { continued: true });
    doc.font('Helvetica').text(contract.vendorParty);

    if (contract.vendorEmail) {
      doc.fontSize(9).text(`Email: ${contract.vendorEmail}`, { indent: 120 });
    }
    if (contract.vendorPhone) {
      doc.text(`Phone: ${contract.vendorPhone}`, { indent: 120 });
    }
    if (contract.vendorAddress) {
      doc.text(`Address: ${contract.vendorAddress}`, { indent: 120 });
    }

    doc.moveDown(1.5);

    // Terms Section
    doc.fontSize(12).font('Helvetica-Bold').text('TERMS AND CONDITIONS');
    doc.moveDown(0.5);

    doc.fontSize(11).font('Helvetica-Bold').text('1. Effective Date: ', { continued: true });
    doc.font('Helvetica').text(contract.effectiveDate);

    doc.font('Helvetica-Bold').text('2. Expiration Date: ', { continued: true });
    doc.font('Helvetica').text(contract.expirationDate);

    doc.font('Helvetica-Bold').text('3. Contract Value: ', { continued: true });
    doc.font('Helvetica').text(contract.value);
    doc.moveDown(0.5);

    doc.font('Helvetica-Bold').text('4. Scope of Work:');
    doc.font('Helvetica').text(contract.description, { indent: 20 });
    doc.moveDown(0.5);

    // Standard Clauses
    doc.font('Helvetica-Bold').text('5. Payment Terms:');
    doc.font('Helvetica').text('Payment shall be made within 30 days of invoice receipt. Late payments shall accrue interest at 1.5% per month.', { indent: 20 });
    doc.moveDown(0.5);

    doc.font('Helvetica-Bold').text('6. Termination:');
    doc.font('Helvetica').text('Either party may terminate this Agreement with 30 days written notice.', { indent: 20 });
    doc.moveDown(0.5);

    doc.font('Helvetica-Bold').text('7. Confidentiality:');
    doc.font('Helvetica').text('Both parties agree to maintain confidentiality of proprietary information.', { indent: 20 });
    doc.moveDown(0.5);

    doc.font('Helvetica-Bold').text('8. Governing Law:');
    doc.font('Helvetica').text('This Agreement shall be governed by the laws of the State of California.', { indent: 20 });
    doc.moveDown(2);

    // Signature Section
    doc.moveDown(1);
    const signatureY = doc.y;
    doc.moveTo(50, signatureY).lineTo(250, signatureY).stroke();
    doc.moveTo(300, signatureY).lineTo(500, signatureY).stroke();

    doc.moveDown(0.3);
    doc.fontSize(9).text('Signature: ___________________', 50, doc.y);
    doc.text('Signature: ___________________', 300, doc.y - 12);

    doc.moveDown(0.3);
    doc.text(`Party A: ${contract.primaryParty}`, 50, doc.y);
    doc.text(`Party B: ${contract.vendorParty}`, 300, doc.y - 12);

    doc.moveDown(0.3);
    doc.text('Date: _______________________', 50, doc.y);
    doc.text('Date: _______________________', 300, doc.y - 12);

    // Footer
    doc.fontSize(8).fillColor('gray').text(
      'Generated with Claude Code for Pactwise Testing',
      50,
      doc.page.height - 50,
      { align: 'center' }
    );

    doc.end();

    stream.on('finish', () => {
      console.log(`✓ Generated: ${fileName}`);
      resolve();
    });

    stream.on('error', reject);
  });
}

// Main execution
async function main() {
  console.log('Generating sample contract PDFs...\n');

  for (let i = 0; i < contracts.length; i++) {
    await generateContractPDF(contracts[i], i);
  }

  console.log(`\n✅ Successfully generated ${contracts.length} sample contract PDFs!`);
  console.log(`📁 Location: ${outputDir}`);
  console.log('\nThese PDFs can be used to test the batch upload system.');
  console.log('Upload them via Settings → Data → Batch Import → Upload Contracts\n');
}

main().catch(console.error);
