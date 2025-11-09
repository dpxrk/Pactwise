#!/usr/bin/env node
/**
 * MEGA SEED SCRIPT - Fixed version
 * Creates comprehensive demo data with PDFs
 */

import { createClient } from '@supabase/supabase-js';
import PDFDocument from 'pdfkit';
import { createWriteStream } from 'fs';
import { mkdir, readFile, unlink } from 'fs/promises';
import { join } from 'path';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseKey);

const ENTERPRISE_ID = 'f2e359ed-8950-4afa-9cf4-24a94c7caa7c';
const DEMO_USER_ID = 'd0a093b6-a806-4295-a63d-3358fc82a937';

// Vendors with valid categories only
const VENDORS = [
  { name: 'Microsoft Corporation', category: 'technology', website: 'https://microsoft.com', performance: 4.8, compliance: 4.9, spend: 350000 },
  { name: 'Amazon Web Services', category: 'technology', website: 'https://aws.amazon.com', performance: 4.9, compliance: 4.8, spend: 420000 },
  { name: 'Google Cloud Platform', category: 'technology', website: 'https://cloud.google.com', performance: 4.7, compliance: 4.7, spend: 280000 },
  { name: 'Salesforce Inc', category: 'technology', website: 'https://salesforce.com', performance: 4.6, compliance: 4.8, spend: 250000 },
  { name: 'Oracle Corporation', category: 'technology', website: 'https://oracle.com', performance: 4.4, compliance: 4.5, spend: 180000 },
  { name: 'SAP America', category: 'technology', website: 'https://sap.com', performance: 4.5, compliance: 4.6, spend: 220000 },
  { name: 'IBM Corporation', category: 'technology', website: 'https://ibm.com', performance: 4.6, compliance: 4.7, spend: 195000 },
  { name: 'Snowflake Inc', category: 'technology', website: 'https://snowflake.com', performance: 4.8, compliance: 4.9, spend: 145000 },
  { name: 'Databricks Inc', category: 'technology', website: 'https://databricks.com', performance: 4.7, compliance: 4.6, spend: 125000 },
  { name: 'MongoDB Inc', category: 'technology', website: 'https://mongodb.com', performance: 4.6, compliance: 4.5, spend: 95000 },
  { name: 'Atlassian Corporation', category: 'technology', website: 'https://atlassian.com', performance: 4.7, compliance: 4.7, spend: 110000 },
  { name: 'ServiceNow Inc', category: 'technology', website: 'https://servicenow.com', performance: 4.5, compliance: 4.6, spend: 165000 },
  { name: 'Workday Inc', category: 'hr', website: 'https://workday.com', performance: 4.6, compliance: 4.8, spend: 200000 },
  { name: 'Adobe Systems', category: 'technology', website: 'https://adobe.com', performance: 4.7, compliance: 4.6, spend: 85000 },
  { name: 'Cisco Systems', category: 'technology', website: 'https://cisco.com', performance: 4.5, compliance: 4.7, spend: 175000 },
  { name: 'Dell Technologies', category: 'technology', website: 'https://dell.com', performance: 4.4, compliance: 4.5, spend: 160000 },
  { name: 'HP Enterprise', category: 'technology', website: 'https://hpe.com', performance: 4.3, compliance: 4.4, spend: 140000 },
  { name: 'VMware Inc', category: 'technology', website: 'https://vmware.com', performance: 4.6, compliance: 4.7, spend: 130000 },
  { name: 'Red Hat Inc', category: 'technology', website: 'https://redhat.com', performance: 4.7, compliance: 4.8, spend: 115000 },
  { name: 'Palo Alto Networks', category: 'technology', website: 'https://paloaltonetworks.com', performance: 4.8, compliance: 4.9, spend: 185000 },
  { name: 'Slack Technologies', category: 'technology', website: 'https://slack.com', performance: 4.8, compliance: 4.7, spend: 75000 },
  { name: 'Zoom Video Communications', category: 'technology', website: 'https://zoom.us', performance: 4.7, compliance: 4.6, spend: 65000 },
  { name: 'Dropbox Inc', category: 'technology', website: 'https://dropbox.com', performance: 4.5, compliance: 4.6, spend: 55000 },
  { name: 'Box Inc', category: 'technology', website: 'https://box.com', performance: 4.6, compliance: 4.7, spend: 68000 },
  { name: 'DocuSign Inc', category: 'legal', website: 'https://docusign.com', performance: 4.7, compliance: 4.8, spend: 45000 },
  { name: 'HubSpot Inc', category: 'marketing', website: 'https://hubspot.com', performance: 4.7, compliance: 4.6, spend: 95000 },
  { name: 'Mailchimp', category: 'marketing', website: 'https://mailchimp.com', performance: 4.6, compliance: 4.6, spend: 45000 },
  { name: 'Zendesk Inc', category: 'technology', website: 'https://zendesk.com', performance: 4.6, compliance: 4.6, spend: 78000 },
  { name: 'Stripe Inc', category: 'finance', website: 'https://stripe.com', performance: 4.9, compliance: 4.9, spend: 185000 },
  { name: 'Plaid Inc', category: 'finance', website: 'https://plaid.com', performance: 4.7, compliance: 4.8, spend: 72000 },
  { name: 'Deloitte Consulting', category: 'consulting', website: 'https://deloitte.com', performance: 4.5, compliance: 4.7, spend: 450000 },
  { name: 'McKinsey & Company', category: 'consulting', website: 'https://mckinsey.com', performance: 4.7, compliance: 4.8, spend: 380000 },
  { name: 'Boston Consulting Group', category: 'consulting', website: 'https://bcg.com', performance: 4.6, compliance: 4.7, spend: 320000 },
  { name: 'Accenture', category: 'consulting', website: 'https://accenture.com', performance: 4.5, compliance: 4.6, spend: 290000 },
  { name: 'PwC Consulting', category: 'consulting', website: 'https://pwc.com', performance: 4.6, compliance: 4.7, spend: 310000 },
  { name: 'EY Advisory', category: 'consulting', website: 'https://ey.com', performance: 4.5, compliance: 4.6, spend: 275000 },
  { name: 'KPMG Advisory', category: 'consulting', website: 'https://kpmg.com', performance: 4.4, compliance: 4.5, spend: 265000 },
  { name: 'Bain & Company', category: 'consulting', website: 'https://bain.com', performance: 4.7, compliance: 4.7, spend: 295000 },
  { name: 'Grant Thornton', category: 'consulting', website: 'https://grantthornton.com', performance: 4.3, compliance: 4.4, spend: 185000 },
  { name: 'Cushman & Wakefield', category: 'facilities', website: 'https://cushmanwakefield.com', performance: 4.4, compliance: 4.5, spend: 240000 },
  { name: 'CBRE Group', category: 'facilities', website: 'https://cbre.com', performance: 4.5, compliance: 4.6, spend: 280000 },
  { name: 'JLL', category: 'facilities', website: 'https://jll.com', performance: 4.4, compliance: 4.5, spend: 220000 },
  { name: 'FedEx Corporation', category: 'logistics', website: 'https://fedex.com', performance: 4.5, compliance: 4.6, spend: 125000 },
  { name: 'UPS', category: 'logistics', website: 'https://ups.com', performance: 4.6, compliance: 4.7, spend: 135000 },
  { name: 'DHL Express', category: 'logistics', website: 'https://dhl.com', performance: 4.4, compliance: 4.5, spend: 98000 },
  { name: 'ADP Payroll Services', category: 'hr', website: 'https://adp.com', performance: 4.6, compliance: 4.8, spend: 180000 },
  { name: 'Paychex Inc', category: 'hr', website: 'https://paychex.com', performance: 4.5, compliance: 4.6, spend: 145000 },
  { name: 'Gusto', category: 'hr', website: 'https://gusto.com', performance: 4.7, compliance: 4.7, spend: 95000 },
  { name: 'BambooHR', category: 'hr', website: 'https://bamboohr.com', performance: 4.6, compliance: 4.6, spend: 68000 },
  { name: 'Thomson Reuters', category: 'legal', website: 'https://thomsonreuters.com', performance: 4.5, compliance: 4.8, spend: 125000 },
];

const CONTRACT_TYPES = ['SaaS Subscription', 'Master Services Agreement', 'Software License', 'Professional Services', 'Data Processing Agreement', 'Consulting Services'];
const STATUSES: Array<'draft' | 'pending_review' | 'active' | 'expiring_soon' | 'expired'> = ['active', 'active', 'active', 'pending_review', 'draft'];

function generateContractText(vendor: any, contractType: string, value: number, startDate: Date, endDate: Date): string {
  const effectiveDate = startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const termDate = endDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const monthsDuration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30));

  return `${contractType.toUpperCase()}

This ${contractType} ("Agreement") is entered into as of ${effectiveDate} ("Effective Date") by and between Pactwise Organization, a Delaware corporation ("Customer"), and ${vendor.name} ("Provider").

WHEREAS, Provider offers services in the ${vendor.category} industry;
WHEREAS, Customer desires to engage Provider for such services;

1. SCOPE OF SERVICES
   Provider shall deliver services for ${monthsDuration} months from ${effectiveDate} to ${termDate}.

2. FEES AND PAYMENT
   Total Fees: $${value.toLocaleString('en-US')}
   Payment: ${value > 100000 ? 'Quarterly in advance' : 'Monthly in arrears'}

3. DATA PROTECTION
   Provider shall comply with GDPR, CCPA, and maintain SOC 2 Type II certification.
   Customer Data protected with AES-256 encryption.

4. TERM AND TERMINATION
   Term: ${monthsDuration} months
   Auto-renewal: ${Math.random() > 0.5 ? 'Yes' : 'No'} with 90 days notice

5. LIABILITY
   Liability cap: Total fees paid in preceding 12 months

IN WITNESS WHEREOF, parties have executed this Agreement on ${effectiveDate}.

Document ID: ${Math.random().toString(36).substr(2, 9).toUpperCase()}
`;
}

async function generatePDF(text: string, path: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margins: { top: 50, bottom: 50, left: 50, right: 50 } });
    const stream = createWriteStream(path);
    doc.pipe(stream);

    doc.fontSize(20).font('Helvetica-Bold').text('PACTWISE CONTRACT', { align: 'center' });
    doc.moveDown(2);
    doc.fontSize(10).font('Helvetica').text(text);
    doc.end();

    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

async function main() {
  console.log('🚀 MEGA SEED Starting...\n');

  const tempDir = join('/tmp', 'contracts-pdf');
  await mkdir(tempDir, { recursive: true });

  let vendorCount = 0;
  let contractCount = 0;
  let pdfCount = 0;
  const vendorMap = new Map<string, string>();

  console.log('📦 Creating vendors...');
  for (const v of VENDORS) {
    try {
      const { data, error } = await supabase
        .from('vendors')
        .insert({
          name: v.name,
          category: v.category,
          status: 'active',
          website: v.website,
          performance_score: v.performance,
          compliance_score: v.compliance,
          total_contract_value: v.spend,
          enterprise_id: ENTERPRISE_ID,
          created_by: DEMO_USER_ID,
          metadata: { seeded: true }
        })
        .select('id')
        .single();

      if (error) {
        console.error(`Error creating vendor ${v.name}:`, error.message);
      } else if (data) {
        vendorMap.set(v.name, data.id);
        vendorCount++;
        process.stdout.write(`\r   ${vendorCount}/${VENDORS.length} vendors`);
      }
    } catch (err: any) {
      console.error(`Exception creating vendor ${v.name}:`, err.message);
    }
  }
  console.log('\n✅ Vendors created!\n');

  console.log('📄 Creating contracts with PDFs...');
  for (const [vendorName, vendorId] of vendorMap.entries()) {
    const vendor = VENDORS.find(v => v.name === vendorName)!;
    const numContracts = Math.floor(Math.random() * 3) + 3;

    for (let i = 0; i < numContracts; i++) {
      try {
        const contractType = CONTRACT_TYPES[Math.floor(Math.random() * CONTRACT_TYPES.length)];
        const status = STATUSES[Math.floor(Math.random() * STATUSES.length)];

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - Math.floor(Math.random() * 365));
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + (Math.floor(Math.random() * 24) + 12));

        const value = Math.floor(Math.random() * 150000) + 10000;
        const contractText = generateContractText(vendor, contractType, value, startDate, endDate);

        const { data: contract, error: contractError } = await supabase
          .from('contracts')
          .insert({
            title: `${contractType} - ${vendorName}`,
            vendor_id: vendorId,
            contract_type: contractType,
            status: status,
            value: value,
            start_date: startDate.toISOString().split('T')[0],
            end_date: endDate.toISOString().split('T')[0],
            is_auto_renew: Math.random() > 0.5,
            notes: 'Auto-generated demo contract',
            enterprise_id: ENTERPRISE_ID,
            owner_id: DEMO_USER_ID,
            created_by: DEMO_USER_ID,
            metadata: { seeded: true },
            analysis_status: 'completed'
          })
          .select('id')
          .single();

        if (!contractError && contract) {
          contractCount++;

          // Generate and upload PDF
          const pdfPath = join(tempDir, `${contract.id}.pdf`);
          await generatePDF(contractText, pdfPath);

          const pdfBuffer = await readFile(pdfPath);
          const storagePath = `${ENTERPRISE_ID}/${contract.id}/contract.pdf`;

          const { error: uploadError } = await supabase.storage
            .from('contracts')
            .upload(storagePath, pdfBuffer, {
              contentType: 'application/pdf',
              upsert: true
            });

          if (!uploadError) {
            pdfCount++;
            await supabase
              .from('contracts')
              .update({ storage_id: storagePath })
              .eq('id', contract.id);
          }

          await unlink(pdfPath);
          process.stdout.write(`\r   ${contractCount} contracts, ${pdfCount} PDFs`);
        }
      } catch (err: any) {
        console.error(`Error creating contract:`, err.message);
      }
    }
  }

  console.log('\n\n✅ COMPLETE!\n');
  console.log('📊 Summary:');
  console.log(`   • ${vendorCount} vendors`);
  console.log(`   • ${contractCount} contracts`);
  console.log(`   • ${pdfCount} PDFs\n`);
}

main().catch(console.error);
