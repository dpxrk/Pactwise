/**
 * Generate Sample Contract PDFs for Testing
 *
 * This script generates realistic contract PDFs for testing the batch upload system.
 * Run with: deno run --allow-write --allow-read generate-sample-contracts.ts
 */

import { jsPDF } from 'npm:jspdf@2.5.1';

interface ContractData {
  title: string;
  primaryParty: string;
  vendorParty: string;
  vendorEmail?: string;
  vendorPhone?: string;
  vendorAddress?: string;
  contractType: string;
  effectiveDate: string;
  expirationDate: string;
  value: string;
  description: string;
}

const contracts: ContractData[] = [
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

function generateContractPDF(contract: ContractData, index: number): void {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(contract.title.toUpperCase(), 105, 20, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Contract No: CTR-2024-${String(index + 1).padStart(4, '0')}`, 105, 28, { align: 'center' });

  // Horizontal line
  doc.setLineWidth(0.5);
  doc.line(20, 35, 190, 35);

  // Parties Section
  let yPos = 45;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('PARTIES TO THIS AGREEMENT', 20, yPos);

  yPos += 10;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`This ${contract.contractType} ("Agreement") is entered into between:`, 20, yPos);

  yPos += 10;
  doc.setFont('helvetica', 'bold');
  doc.text('Party A (Client):', 20, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(contract.primaryParty, 60, yPos);

  yPos += 8;
  doc.setFont('helvetica', 'bold');
  doc.text('Party B (Vendor):', 20, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(contract.vendorParty, 60, yPos);

  if (contract.vendorEmail) {
    yPos += 6;
    doc.setFontSize(9);
    doc.text(`Email: ${contract.vendorEmail}`, 60, yPos);
  }

  if (contract.vendorPhone) {
    yPos += 5;
    doc.text(`Phone: ${contract.vendorPhone}`, 60, yPos);
  }

  if (contract.vendorAddress) {
    yPos += 5;
    doc.text(`Address: ${contract.vendorAddress}`, 60, yPos);
  }

  // Terms Section
  yPos += 15;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('TERMS AND CONDITIONS', 20, yPos);

  yPos += 10;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('1. Effective Date:', 20, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(contract.effectiveDate, 60, yPos);

  yPos += 8;
  doc.setFont('helvetica', 'bold');
  doc.text('2. Expiration Date:', 20, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(contract.expirationDate, 60, yPos);

  yPos += 8;
  doc.setFont('helvetica', 'bold');
  doc.text('3. Contract Value:', 20, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(contract.value, 60, yPos);

  yPos += 12;
  doc.setFont('helvetica', 'bold');
  doc.text('4. Scope of Work:', 20, yPos);
  yPos += 7;
  doc.setFont('helvetica', 'normal');

  // Wrap description text
  const splitDescription = doc.splitTextToSize(contract.description, 170);
  doc.text(splitDescription, 20, yPos);
  yPos += splitDescription.length * 5 + 5;

  // Standard Clauses
  yPos += 10;
  doc.setFont('helvetica', 'bold');
  doc.text('5. Payment Terms:', 20, yPos);
  yPos += 7;
  doc.setFont('helvetica', 'normal');
  doc.text('Payment shall be made within 30 days of invoice receipt. Late payments shall', 20, yPos);
  yPos += 5;
  doc.text('accrue interest at 1.5% per month.', 20, yPos);

  yPos += 10;
  doc.setFont('helvetica', 'bold');
  doc.text('6. Termination:', 20, yPos);
  yPos += 7;
  doc.setFont('helvetica', 'normal');
  doc.text('Either party may terminate this Agreement with 30 days written notice.', 20, yPos);

  yPos += 10;
  doc.setFont('helvetica', 'bold');
  doc.text('7. Confidentiality:', 20, yPos);
  yPos += 7;
  doc.setFont('helvetica', 'normal');
  doc.text('Both parties agree to maintain confidentiality of proprietary information.', 20, yPos);

  yPos += 10;
  doc.setFont('helvetica', 'bold');
  doc.text('8. Governing Law:', 20, yPos);
  yPos += 7;
  doc.setFont('helvetica', 'normal');
  doc.text('This Agreement shall be governed by the laws of the State of California.', 20, yPos);

  // Signature Section
  yPos += 20;
  doc.setLineWidth(0.3);
  doc.line(20, yPos, 85, yPos);
  doc.line(105, yPos, 170, yPos);

  yPos += 5;
  doc.setFontSize(9);
  doc.text('Signature: ___________________', 20, yPos);
  doc.text('Signature: ___________________', 105, yPos);

  yPos += 5;
  doc.text(`Party A: ${contract.primaryParty}`, 20, yPos);
  doc.text(`Party B: ${contract.vendorParty}`, 105, yPos);

  yPos += 5;
  doc.text(`Date: _______________________`, 20, yPos);
  doc.text(`Date: _______________________`, 105, yPos);

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text('Generated with Claude Code for Pactwise Testing', 105, 285, { align: 'center' });

  // Save PDF
  const fileName = `sample_contract_${index + 1}_${contract.vendorParty.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  doc.save(fileName);

  console.log(`✓ Generated: ${fileName}`);
}

// Generate all contracts
console.log('Generating sample contract PDFs...\n');

contracts.forEach((contract, index) => {
  generateContractPDF(contract, index);
});

console.log(`\n✅ Successfully generated ${contracts.length} sample contract PDFs!`);
console.log('\nThese PDFs can be used to test the batch upload system.');
console.log('Upload them via Settings → Data → Batch Import → Upload Contracts\n');
