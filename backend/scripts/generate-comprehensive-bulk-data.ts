#!/usr/bin/env tsx
/**
 * Comprehensive Bulk Data Generator
 * Generates 1000+ realistic contracts with PDF files
 *
 * Usage: npx tsx scripts/generate-comprehensive-bulk-data.ts
 */

import { faker } from '@faker-js/faker';
import { createClient } from '@supabase/supabase-js';
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Configuration
const CONFIG = {
  NUM_VENDORS: 500,
  NUM_CONTRACTS: 2000,
  NUM_BUDGETS: 50,
  GENERATE_PDFS: true,
  PDF_OUTPUT_DIR: '/tmp/pactwise-contracts',
};

// Contract types with realistic templates
const CONTRACT_TYPES = {
  nda: {
    name: 'Non-Disclosure Agreement',
    avgValue: 0,
    typicalTermMonths: 24,
    clauses: [
      'Confidential Information shall include all information disclosed by either party',
      'The receiving party shall not disclose Confidential Information to third parties',
      'This agreement shall remain in effect for a period of {term} years',
      'Either party may terminate this agreement with 30 days written notice',
    ],
  },
  msa: {
    name: 'Master Service Agreement',
    avgValue: 500000,
    typicalTermMonths: 36,
    clauses: [
      'Services shall be performed in accordance with industry standards',
      'Payment terms: Net 30 days from invoice date',
      'Either party may terminate for convenience with 90 days notice',
      'Liability shall be limited to fees paid in the 12 months preceding the claim',
      'Disputes shall be resolved through binding arbitration',
    ],
  },
  saas: {
    name: 'Software as a Service Agreement',
    avgValue: 120000,
    typicalTermMonths: 12,
    clauses: [
      'Service Level Agreement: 99.9% uptime guarantee',
      'Data shall remain the property of the customer',
      'Vendor shall maintain SOC 2 Type II compliance',
      'Auto-renewal unless terminated 60 days prior to renewal date',
      'Price increases limited to 5% annually',
    ],
  },
  license: {
    name: 'Software License Agreement',
    avgValue: 250000,
    typicalTermMonths: 36,
    clauses: [
      'License is non-exclusive and non-transferable',
      'Customer may not reverse engineer, decompile, or disassemble the software',
      'Support and maintenance included for the term of the agreement',
      'Updates and upgrades provided at no additional cost',
    ],
  },
  consulting: {
    name: 'Consulting Services Agreement',
    avgValue: 300000,
    typicalTermMonths: 12,
    clauses: [
      'Consultant shall provide services on a time and materials basis',
      'Hourly rates: Senior Consultant $250/hr, Junior Consultant $150/hr',
      'All work product shall be the property of the client',
      'Consultant warrants services will be performed in a professional manner',
    ],
  },
  employment: {
    name: 'Employment Agreement',
    avgValue: 150000,
    typicalTermMonths: 24,
    clauses: [
      'Employee shall perform duties as assigned by management',
      'Compensation: Base salary plus benefits as outlined',
      'Confidentiality and non-compete provisions apply',
      'Employment is at-will unless otherwise specified',
    ],
  },
  procurement: {
    name: 'Procurement Agreement',
    avgValue: 750000,
    typicalTermMonths: 24,
    clauses: [
      'Goods shall be delivered FOB destination',
      'Quality standards and specifications attached as Exhibit A',
      'Buyer reserves right to inspect goods prior to acceptance',
      'Payment upon receipt and acceptance of conforming goods',
    ],
  },
  partnership: {
    name: 'Partnership Agreement',
    avgValue: 1000000,
    typicalTermMonths: 60,
    clauses: [
      'Partners shall share profits and losses according to ownership percentages',
      'Major decisions require unanimous consent',
      'Partners may not compete with the partnership during the term',
      'Dissolution requires 90 days notice and partner approval',
    ],
  },
};

// Vendor categories with realistic companies
const VENDOR_CATEGORIES = {
  technology: ['Cloud Services', 'Software', 'Hardware', 'IT Services', 'Security'],
  marketing: ['Digital Marketing', 'Advertising', 'PR', 'Content Creation', 'SEO'],
  legal: ['Law Firm', 'Compliance', 'IP Services', 'Regulatory'],
  finance: ['Accounting', 'Banking', 'Investment', 'Insurance'],
  hr: ['Recruiting', 'Benefits Administration', 'Training', 'Payroll'],
  facilities: ['Cleaning', 'Security', 'Maintenance', 'Utilities'],
  logistics: ['Shipping', 'Warehousing', 'Transportation', 'Supply Chain'],
  manufacturing: ['Raw Materials', 'Equipment', 'Production', 'Quality Control'],
  consulting: ['Strategy', 'Operations', 'Technology', 'Management'],
  other: ['Miscellaneous Services', 'Other'],
};

// Generate realistic company name based on category
function generateCompanyName(category: string, subcategory: string): string {
  const prefixes = ['Global', 'Advanced', 'Premier', 'Elite', 'Innovative', 'Strategic', 'Dynamic', 'Optimal', 'Peak', 'Apex'];
  const suffixes = ['Solutions', 'Technologies', 'Systems', 'Services', 'Group', 'Partners', 'Enterprises', 'Corp', 'Inc', 'LLC'];

  const useRealName = Math.random() > 0.5;
  if (useRealName) {
    return faker.company.name();
  }

  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];

  return `${prefix} ${subcategory} ${suffix}`;
}

// Generate realistic contract PDF
async function generateContractPDF(contract: any, vendor: any, enterprise: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 72 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc.fontSize(20).font('Helvetica-Bold').text(contract.contract_type.toUpperCase(), { align: 'center' });
    doc.moveDown();
    doc.fontSize(16).text(contract.title, { align: 'center' });
    doc.moveDown(2);

    // Contract details
    doc.fontSize(10).font('Helvetica');
    doc.text(`Contract Number: ${contract.contract_number || 'N/A'}`);
    doc.text(`Effective Date: ${new Date(contract.start_date).toLocaleDateString()}`);
    doc.text(`Expiration Date: ${new Date(contract.end_date).toLocaleDateString()}`);
    doc.text(`Contract Value: $${contract.value.toLocaleString()}`);
    doc.moveDown(2);

    // Parties
    doc.fontSize(14).font('Helvetica-Bold').text('PARTIES', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    doc.text(`Provider: ${vendor.name}`);
    doc.text(`Address: ${vendor.address || faker.location.streetAddress()}`);
    doc.text(`Website: ${vendor.website || 'N/A'}`);
    doc.moveDown();
    doc.text(`Client: ${enterprise.name}`);
    doc.text(`Industry: ${enterprise.industry}`);
    doc.moveDown(2);

    // Terms and Conditions
    doc.fontSize(14).font('Helvetica-Bold').text('TERMS AND CONDITIONS', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');

    const contractTypeData = CONTRACT_TYPES[contract.contract_type as keyof typeof CONTRACT_TYPES];
    if (contractTypeData && contractTypeData.clauses) {
      contractTypeData.clauses.forEach((clause, index) => {
        doc.text(`${index + 1}. ${clause}`, { align: 'justify' });
        doc.moveDown(0.5);
      });
    }

    // Payment terms
    doc.moveDown();
    doc.fontSize(14).font('Helvetica-Bold').text('PAYMENT TERMS', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    doc.text(contract.payment_terms || 'Net 30 days from invoice date');
    doc.moveDown(2);

    // Signatures
    doc.fontSize(14).font('Helvetica-Bold').text('SIGNATURES', { underline: true });
    doc.moveDown(2);

    doc.fontSize(10).font('Helvetica');
    doc.text('_______________________________', { continued: true }).text('    _______________________________');
    doc.text(`${vendor.name}`, { continued: true }).text(`    ${enterprise.name}`);
    doc.text('Authorized Signatory', { continued: true }).text('                Authorized Signatory');
    doc.moveDown();
    doc.text(`Date: ${new Date().toLocaleDateString()}`);

    // Footer
    doc.fontSize(8).text(`Generated by Pactwise - Contract Management Platform`, {
      align: 'center',
      baseline: 'bottom',
    });

    doc.end();
  });
}

// Upload PDF to Supabase Storage
async function uploadPDFToStorage(pdfBuffer: Buffer, contractId: string, fileName: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from('contracts')
      .upload(`${contractId}/${fileName}`, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (error) {
      console.error(`Error uploading PDF for contract ${contractId}:`, error.message);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('contracts')
      .getPublicUrl(`${contractId}/${fileName}`);

    return urlData.publicUrl;
  } catch (error) {
    console.error(`Failed to upload PDF for contract ${contractId}:`, error);
    return null;
  }
}

async function main() {
  console.log('🚀 Starting Comprehensive Bulk Data Generation...\n');

  // Get demo enterprise and user
  const { data: enterprises, error: enterpriseError } = await supabase
    .from('enterprises')
    .select('*')
    .limit(1)
    .single();

  if (enterpriseError || !enterprises) {
    console.error('❌ No enterprise found. Please create a demo user first.');
    process.exit(1);
  }

  const { data: users, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('enterprise_id', enterprises.id)
    .limit(1)
    .single();

  if (userError || !users) {
    console.error('❌ No user found for enterprise.');
    process.exit(1);
  }

  console.log(`✅ Found enterprise: ${enterprises.name}`);
  console.log(`✅ Found user: ${users.email}\n`);

  const enterpriseId = enterprises.id;
  const userId = users.id;

  // Create PDF output directory
  if (CONFIG.GENERATE_PDFS) {
    if (!fs.existsSync(CONFIG.PDF_OUTPUT_DIR)) {
      fs.mkdirSync(CONFIG.PDF_OUTPUT_DIR, { recursive: true });
    }
    console.log(`📁 PDF output directory: ${CONFIG.PDF_OUTPUT_DIR}\n`);
  }

  // STEP 1: Generate Vendors
  console.log(`📊 Generating ${CONFIG.NUM_VENDORS} vendors...`);
  const vendors: any[] = [];

  for (let i = 0; i < CONFIG.NUM_VENDORS; i++) {
    const category = Object.keys(VENDOR_CATEGORIES)[Math.floor(Math.random() * Object.keys(VENDOR_CATEGORIES).length)];
    const subcategories = VENDOR_CATEGORIES[category as keyof typeof VENDOR_CATEGORIES];
    const subcategory = subcategories[Math.floor(Math.random() * subcategories.length)];

    const vendor = {
      name: generateCompanyName(category, subcategory),
      category,
      status: Math.random() > 0.1 ? 'active' : (Math.random() > 0.5 ? 'pending' : 'inactive'),
      website: faker.internet.url(),
      street_address_1: faker.location.streetAddress(),
      city: faker.location.city(),
      state_province: faker.location.state(),
      country: 'US',
      postal_code: faker.location.zipCode(),
      performance_score: parseFloat((Math.random() * 2 + 3).toFixed(2)), // 3.0 - 5.0
      compliance_score: parseFloat((Math.random() * 2 + 3).toFixed(2)),
      total_contract_value: 0,
      active_contracts: 0,
      enterprise_id: enterpriseId,
      created_by: userId,
      metadata: {
        tax_id: faker.string.alphanumeric(10).toUpperCase(),
        certifications: ['ISO 9001', 'SOC 2 Type II'].filter(() => Math.random() > 0.5),
        employees: Math.floor(Math.random() * 10000) + 50,
        subcategory,
      },
    };

    vendors.push(vendor);

    if ((i + 1) % 100 === 0) {
      console.log(`  Generated ${i + 1}/${CONFIG.NUM_VENDORS} vendors...`);
    }
  }

  // Insert vendors in batches
  console.log('💾 Inserting vendors into database...');
  const BATCH_SIZE = 100;
  const insertedVendors: any[] = [];

  for (let i = 0; i < vendors.length; i += BATCH_SIZE) {
    const batch = vendors.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase
      .from('vendors')
      .insert(batch)
      .select();

    if (error) {
      console.error(`Error inserting vendor batch ${i / BATCH_SIZE + 1}:`, error.message);
    } else {
      insertedVendors.push(...(data || []));
      console.log(`  Inserted batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(vendors.length / BATCH_SIZE)}`);
    }
  }

  console.log(`✅ Inserted ${insertedVendors.length} vendors\n`);

  // STEP 2: Generate Budgets
  console.log(`💰 Generating ${CONFIG.NUM_BUDGETS} budgets...`);
  const budgets: any[] = [];
  const departments = ['IT', 'Finance', 'Legal', 'Marketing', 'HR', 'Operations', 'Sales', 'R&D'];
  const currentYear = new Date().getFullYear();

  for (let i = 0; i < CONFIG.NUM_BUDGETS; i++) {
    const department = departments[Math.floor(Math.random() * departments.length)];
    const budgetType = ['monthly', 'quarterly', 'annual', 'project', 'department'][Math.floor(Math.random() * 5)];
    const totalBudget = Math.floor(Math.random() * 1000000) + 100000;
    const allocatedAmount = Math.floor(totalBudget * (Math.random() * 0.3 + 0.5));
    const spentAmount = Math.floor(allocatedAmount * Math.random());
    const committedAmount = Math.floor((allocatedAmount - spentAmount) * Math.random());

    const budget = {
      name: `${department} ${budgetType.charAt(0).toUpperCase() + budgetType.slice(1)} Budget ${currentYear}`,
      budget_type: budgetType,
      total_budget: totalBudget,
      allocated_amount: allocatedAmount,
      spent_amount: spentAmount,
      committed_amount: committedAmount,
      start_date: new Date(`${currentYear}-01-01`).toISOString().split('T')[0],
      end_date: new Date(`${currentYear}-12-31`).toISOString().split('T')[0],
      department,
      status: spentAmount > allocatedAmount ? 'exceeded' : (spentAmount > allocatedAmount * 0.9 ? 'at_risk' : 'healthy'),
      enterprise_id: enterpriseId,
      created_by: userId,
      metadata: {
        period: budgetType,
        fiscal_year: currentYear,
      },
    };

    budgets.push(budget);
  }

  console.log('💾 Inserting budgets into database...');
  const { data: insertedBudgets, error: budgetError } = await supabase
    .from('budgets')
    .insert(budgets)
    .select();

  if (budgetError) {
    console.error('Error inserting budgets:', budgetError.message);
  } else {
    console.log(`✅ Inserted ${insertedBudgets?.length || 0} budgets\n`);
  }

  // STEP 3: Generate Contracts with PDFs
  console.log(`📄 Generating ${CONFIG.NUM_CONTRACTS} contracts with PDFs...`);
  const contracts: any[] = [];
  let pdfGenerationCount = 0;

  for (let i = 0; i < CONFIG.NUM_CONTRACTS; i++) {
    const vendor = insertedVendors[Math.floor(Math.random() * insertedVendors.length)];
    const contractTypeKey = Object.keys(CONTRACT_TYPES)[Math.floor(Math.random() * Object.keys(CONTRACT_TYPES).length)] as keyof typeof CONTRACT_TYPES;
    const contractType = CONTRACT_TYPES[contractTypeKey];

    const startDate = faker.date.between({
      from: new Date(Date.now() - 365 * 3 * 24 * 60 * 60 * 1000),
      to: new Date()
    });
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + contractType.typicalTermMonths);

    const value = Math.floor(contractType.avgValue * (0.5 + Math.random()));
    const now = new Date();
    const status = endDate < now ? 'expired' : (startDate > now ? 'draft' : 'active');

    const contract = {
      title: `${contractType.name} - ${vendor.name}`,
      vendor_id: vendor.id,
      contract_type: contractTypeKey,
      contract_number: `CTR-${currentYear}-${String(i + 1).padStart(6, '0')}`,
      status,
      value,
      currency: 'USD',
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      effective_date: startDate.toISOString(),
      auto_renewal: Math.random() > 0.5,
      renewal_notice_days: [30, 60, 90][Math.floor(Math.random() * 3)],
      payment_terms: ['Net 30', 'Net 60', 'Due on receipt', 'Monthly in advance'][Math.floor(Math.random() * 4)],
      payment_frequency: ['monthly', 'quarterly', 'annual'][Math.floor(Math.random() * 3)],
      enterprise_id: enterpriseId,
      created_by: userId,
      analysis_status: 'completed',
      metadata: {
        generated: true,
        category: vendor.category,
        terms: contractType.typicalTermMonths,
      },
    };

    contracts.push(contract);

    if ((i + 1) % 100 === 0) {
      console.log(`  Generated ${i + 1}/${CONFIG.NUM_CONTRACTS} contracts...`);
    }
  }

  // Insert contracts in batches
  console.log('💾 Inserting contracts into database...');
  const insertedContracts: any[] = [];

  for (let i = 0; i < contracts.length; i += BATCH_SIZE) {
    const batch = contracts.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase
      .from('contracts')
      .insert(batch)
      .select();

    if (error) {
      console.error(`Error inserting contract batch ${i / BATCH_SIZE + 1}:`, error.message);
    } else {
      insertedContracts.push(...(data || []));
      console.log(`  Inserted batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(contracts.length / BATCH_SIZE)}`);
    }
  }

  console.log(`✅ Inserted ${insertedContracts.length} contracts\n`);

  // STEP 4: Generate PDFs for contracts
  if (CONFIG.GENERATE_PDFS) {
    console.log('📄 Generating PDF files for contracts...');

    for (let i = 0; i < insertedContracts.length; i++) {
      const contract = insertedContracts[i];
      const vendor = insertedVendors.find(v => v.id === contract.vendor_id);

      if (!vendor) continue;

      try {
        const pdfBuffer = await generateContractPDF(contract, vendor, enterprises);

        // Save to local filesystem
        const fileName = `${contract.contract_number}.pdf`;
        const filePath = path.join(CONFIG.PDF_OUTPUT_DIR, fileName);
        fs.writeFileSync(filePath, pdfBuffer);

        // Upload to Supabase Storage
        const publicUrl = await uploadPDFToStorage(pdfBuffer, contract.id, fileName);

        if (publicUrl) {
          // Update contract with PDF URL
          await supabase
            .from('contracts')
            .update({
              file_url: publicUrl,
              file_name: fileName,
              metadata: { ...contract.metadata, pdf_generated: true }
            })
            .eq('id', contract.id);

          pdfGenerationCount++;
        }

        if ((i + 1) % 100 === 0) {
          console.log(`  Generated ${i + 1}/${insertedContracts.length} PDFs...`);
        }
      } catch (error) {
        console.error(`Error generating PDF for contract ${contract.id}:`, error);
      }
    }

    console.log(`✅ Generated ${pdfGenerationCount} PDF files\n`);
  }

  // Update vendor statistics
  console.log('📊 Updating vendor statistics...');
  for (const vendor of insertedVendors) {
    const vendorContracts = insertedContracts.filter(c => c.vendor_id === vendor.id);
    const totalValue = vendorContracts.reduce((sum, c) => sum + (c.value || 0), 0);
    const activeCount = vendorContracts.filter(c => c.status === 'active').length;

    await supabase
      .from('vendors')
      .update({
        total_contract_value: totalValue,
        active_contracts: activeCount,
      })
      .eq('id', vendor.id);
  }

  console.log('✅ Updated vendor statistics\n');

  // Summary
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🎉 BULK DATA GENERATION COMPLETE!');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`✅ Vendors created: ${insertedVendors.length}`);
  console.log(`✅ Budgets created: ${insertedBudgets?.length || 0}`);
  console.log(`✅ Contracts created: ${insertedContracts.length}`);
  if (CONFIG.GENERATE_PDFS) {
    console.log(`✅ PDFs generated: ${pdfGenerationCount}`);
    console.log(`📁 PDFs saved to: ${CONFIG.PDF_OUTPUT_DIR}`);
  }
  console.log('═══════════════════════════════════════════════════════════\n');
}

main().catch(console.error);
