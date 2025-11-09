#!/usr/bin/env node
/**
 * MEGA SEED SCRIPT - Creates comprehensive demo data
 * - 50+ vendors across multiple industries
 * - 200+ contracts with realistic terms
 * - PDF files for all contracts
 * - Uploads to Supabase storage
 */

import { createClient } from '@supabase/supabase-js';
import PDFDocument from 'pdfkit';
import { createWriteStream } from 'fs';
import { mkdir, readFile, unlink } from 'fs/promises';
import { join } from 'path';

const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Demo account IDs (from database query)
const ENTERPRISE_ID = 'f2e359ed-8950-4afa-9cf4-24a94c7caa7c';
const DEMO_USER_ID = 'd0a093b6-a806-4295-a63d-3358fc82a937';

// Massive vendor list across industries
const VENDORS = [
  // Technology & Cloud (20 vendors)
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
  { name: 'Palo Alto Networks', category: 'security', website: 'https://paloaltonetworks.com', performance: 4.8, compliance: 4.9, spend: 185000 },

  // SaaS & Productivity (15 vendors)
  { name: 'Slack Technologies', category: 'technology', website: 'https://slack.com', performance: 4.8, compliance: 4.7, spend: 75000 },
  { name: 'Zoom Video Communications', category: 'technology', website: 'https://zoom.us', performance: 4.7, compliance: 4.6, spend: 65000 },
  { name: 'Dropbox Inc', category: 'technology', website: 'https://dropbox.com', performance: 4.5, compliance: 4.6, spend: 55000 },
  { name: 'Box Inc', category: 'technology', website: 'https://box.com', performance: 4.6, compliance: 4.7, spend: 68000 },
  { name: 'DocuSign Inc', category: 'legal', website: 'https://docusign.com', performance: 4.7, compliance: 4.8, spend: 45000 },
  { name: 'Asana Inc', category: 'technology', website: 'https://asana.com', performance: 4.6, compliance: 4.5, spend: 38000 },
  { name: 'Monday.com', category: 'technology', website: 'https://monday.com', performance: 4.7, compliance: 4.6, spend: 42000 },
  { name: 'Notion Labs', category: 'technology', website: 'https://notion.so', performance: 4.8, compliance: 4.5, spend: 32000 },
  { name: 'Airtable Inc', category: 'technology', website: 'https://airtable.com', performance: 4.6, compliance: 4.6, spend: 35000 },
  { name: 'Miro Inc', category: 'technology', website: 'https://miro.com', performance: 4.7, compliance: 4.5, spend: 28000 },
  { name: 'Figma Inc', category: 'technology', website: 'https://figma.com', performance: 4.9, compliance: 4.7, spend: 52000 },
  { name: 'Canva Inc', category: 'marketing', website: 'https://canva.com', performance: 4.7, compliance: 4.5, spend: 25000 },
  { name: 'Lucidchart LLC', category: 'technology', website: 'https://lucidchart.com', performance: 4.5, compliance: 4.5, spend: 22000 },
  { name: 'Smartsheet Inc', category: 'technology', website: 'https://smartsheet.com', performance: 4.6, compliance: 4.6, spend: 48000 },
  { name: 'Confluence (Atlassian)', category: 'technology', website: 'https://atlassian.com/confluence', performance: 4.6, compliance: 4.6, spend: 35000 },

  // Marketing & Analytics (10 vendors)
  { name: 'HubSpot Inc', category: 'marketing', website: 'https://hubspot.com', performance: 4.7, compliance: 4.6, spend: 95000 },
  { name: 'Marketo (Adobe)', category: 'marketing', website: 'https://marketo.com', performance: 4.5, compliance: 4.5, spend: 72000 },
  { name: 'Mailchimp (Intuit)', category: 'marketing', website: 'https://mailchimp.com', performance: 4.6, compliance: 4.6, spend: 45000 },
  { name: 'Segment (Twilio)', category: 'technology', website: 'https://segment.com', performance: 4.7, compliance: 4.7, spend: 62000 },
  { name: 'Amplitude Inc', category: 'technology', website: 'https://amplitude.com', performance: 4.6, compliance: 4.6, spend: 58000 },
  { name: 'Mixpanel Inc', category: 'technology', website: 'https://mixpanel.com', performance: 4.5, compliance: 4.5, spend: 48000 },
  { name: 'Google Analytics 360', category: 'marketing', website: 'https://marketingplatform.google.com', performance: 4.7, compliance: 4.8, spend: 85000 },
  { name: 'Tableau (Salesforce)', category: 'technology', website: 'https://tableau.com', performance: 4.8, compliance: 4.7, spend: 110000 },
  { name: 'Looker (Google)', category: 'technology', website: 'https://looker.com', performance: 4.7, compliance: 4.8, spend: 95000 },
  { name: 'Power BI (Microsoft)', category: 'technology', website: 'https://powerbi.microsoft.com', performance: 4.6, compliance: 4.7, spend: 68000 },

  // Security & Compliance (8 vendors)
  { name: 'Okta Inc', category: 'security', website: 'https://okta.com', performance: 4.8, compliance: 4.9, spend: 125000 },
  { name: 'Auth0 (Okta)', category: 'security', website: 'https://auth0.com', performance: 4.7, compliance: 4.8, spend: 75000 },
  { name: 'CrowdStrike Holdings', category: 'security', website: 'https://crowdstrike.com', performance: 4.9, compliance: 4.9, spend: 145000 },
  { name: 'SentinelOne Inc', category: 'security', website: 'https://sentinelone.com', performance: 4.7, compliance: 4.8, spend: 98000 },
  { name: 'Cloudflare Inc', category: 'security', website: 'https://cloudflare.com', performance: 4.8, compliance: 4.8, spend: 85000 },
  { name: 'Zscaler Inc', category: 'security', website: 'https://zscaler.com', performance: 4.6, compliance: 4.7, spend: 105000 },
  { name: 'Duo Security (Cisco)', category: 'security', website: 'https://duo.com', performance: 4.7, compliance: 4.8, spend: 58000 },
  { name: 'Vanta Inc', category: 'compliance', website: 'https://vanta.com', performance: 4.8, compliance: 4.9, spend: 42000 },

  // Customer Support & Communications (7 vendors)
  { name: 'Zendesk Inc', category: 'technology', website: 'https://zendesk.com', performance: 4.6, compliance: 4.6, spend: 78000 },
  { name: 'Intercom Inc', category: 'technology', website: 'https://intercom.com', performance: 4.7, compliance: 4.6, spend: 65000 },
  { name: 'Freshdesk (Freshworks)', category: 'technology', website: 'https://freshdesk.com', performance: 4.5, compliance: 4.5, spend: 48000 },
  { name: 'Twilio Inc', category: 'technology', website: 'https://twilio.com', performance: 4.6, compliance: 4.7, spend: 95000 },
  { name: 'SendGrid (Twilio)', category: 'technology', website: 'https://sendgrid.com', performance: 4.7, compliance: 4.6, spend: 38000 },
  { name: 'PagerDuty Inc', category: 'technology', website: 'https://pagerduty.com', performance: 4.6, compliance: 4.7, spend: 52000 },
  { name: 'Datadog Inc', category: 'technology', website: 'https://datadog.com', performance: 4.8, compliance: 4.8, spend: 115000 },

  // Finance & Payments (5 vendors)
  { name: 'Stripe Inc', category: 'finance', website: 'https://stripe.com', performance: 4.9, compliance: 4.9, spend: 185000 },
  { name: 'Plaid Inc', category: 'finance', website: 'https://plaid.com', performance: 4.7, compliance: 4.8, spend: 72000 },
  { name: 'Bill.com Holdings', category: 'finance', website: 'https://bill.com', performance: 4.6, compliance: 4.7, spend: 55000 },
  { name: 'Expensify Inc', category: 'finance', website: 'https://expensify.com', performance: 4.5, compliance: 4.6, spend: 38000 },
  { name: 'Brex Inc', category: 'finance', website: 'https://brex.com', performance: 4.7, compliance: 4.7, spend: 65000 },
];

// Contract types and statuses
const CONTRACT_TYPES = ['SaaS Subscription', 'Master Services Agreement', 'Software License', 'Professional Services', 'Data Processing Agreement', 'Consulting Services'];
const STATUSES = ['active', 'active', 'active', 'active', 'draft', 'pending_review', 'expiring_soon'];

// Generate realistic contract text
function generateContractText(vendor: any, contractType: string, value: number, startDate: Date, endDate: Date): string {
  const effectiveDate = startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const termDate = endDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const monthsDuration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30));

  return `${contractType.toUpperCase()}

This ${contractType} ("Agreement") is entered into as of ${effectiveDate} ("Effective Date") by and between Pactwise Organization, a Delaware corporation with its principal place of business at 123 Business Ave, San Francisco, CA 94102 ("Customer"), and ${vendor.name} ("Provider").

RECITALS

WHEREAS, Provider offers certain services and products in the ${vendor.category} industry;
WHEREAS, Customer desires to engage Provider for such services;

NOW, THEREFORE, in consideration of the mutual covenants and agreements herein contained, the parties agree as follows:

1. DEFINITIONS
   1.1 "Services" means the services and products described in Exhibit A.
   1.2 "Term" means the ${monthsDuration}-month period from ${effectiveDate} to ${termDate}.
   1.3 "Fees" means the total amount of $${value.toLocaleString('en-US')} as set forth in Section 4.

2. SCOPE OF SERVICES
   2.1 Provider shall deliver the Services in accordance with industry best practices.
   2.2 Services shall include: implementation, support, maintenance, and updates.
   2.3 Provider warrants that Services shall be performed in a professional and workmanlike manner.

3. DATA PROTECTION AND PRIVACY
   3.1 Provider shall process Customer Data in accordance with GDPR, CCPA, and all applicable data protection laws.
   3.2 Provider maintains SOC 2 Type II certification and ISO 27001 compliance.
   3.3 Customer retains all ownership rights to Customer Data.
   3.4 Provider shall implement appropriate technical and organizational security measures including:
       a) AES-256 encryption for data at rest and in transit
       b) Multi-factor authentication for all system access
       c) Regular security audits and penetration testing
       d) Annual third-party security assessments

4. FEES AND PAYMENT TERMS
   4.1 Total Fees: $${value.toLocaleString('en-US')} for the Term
   4.2 Payment Schedule: ${value > 100000 ? 'Quarterly in advance' : 'Monthly in arrears'}
   4.3 Late payments shall accrue interest at 1.5% per month or the maximum rate permitted by law.
   4.4 All Fees are non-refundable except as expressly provided in Section 7.

5. INTELLECTUAL PROPERTY RIGHTS
   5.1 Provider retains all rights to pre-existing intellectual property and underlying platforms.
   5.2 Customer retains all rights to Customer Data and custom configurations.
   5.3 Provider grants Customer a non-exclusive, non-transferable license to use the Services.

6. CONFIDENTIALITY
   6.1 Each party agrees to maintain the confidentiality of the other party's Confidential Information.
   6.2 Confidential Information shall be protected for a period of 5 years after disclosure.
   6.3 Exceptions: publicly known information, independently developed, or legally required disclosure.

7. WARRANTIES AND DISCLAIMERS
   7.1 Provider warrants that:
       a) Services shall perform materially in accordance with Documentation
       b) Services shall be provided free from viruses and malicious code
       c) Provider has the right to provide the Services
   7.2 EXCEPT AS EXPRESSLY PROVIDED, SERVICES ARE PROVIDED "AS IS" WITHOUT WARRANTY.
   7.3 PROVIDER DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY AND FITNESS.

8. LIMITATION OF LIABILITY
   8.1 NEITHER PARTY'S LIABILITY SHALL EXCEED THE TOTAL FEES PAID IN THE 12 MONTHS PRECEDING THE CLAIM.
   8.2 NEITHER PARTY SHALL BE LIABLE FOR INDIRECT, INCIDENTAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES.
   8.3 Exceptions to limitations: gross negligence, willful misconduct, data protection violations.

9. INDEMNIFICATION
   9.1 Provider shall indemnify Customer against third-party claims arising from:
       a) Infringement of intellectual property rights
       b) Provider's breach of this Agreement
       c) Provider's negligence or willful misconduct
   9.2 Customer shall indemnify Provider against claims arising from Customer's misuse of Services.

10. TERM AND TERMINATION
    10.1 Initial Term: ${monthsDuration} months from the Effective Date
    10.2 Renewal: Automatic renewal for successive 12-month periods unless either party provides 90 days notice
    10.3 Termination for Cause: Either party may terminate upon 30 days written notice for material breach
    10.4 Termination for Convenience: Customer may terminate with 90 days notice and payment of early termination fee
    10.5 Effect of Termination: Customer shall have 90 days to export data before deletion

11. SERVICE LEVEL AGREEMENT
    11.1 Uptime Guarantee: 99.9% monthly uptime
    11.2 Support Response Times:
         - Critical issues: 1 hour
         - High priority: 4 hours
         - Medium priority: 1 business day
         - Low priority: 3 business days
    11.3 Credits for SLA breaches as specified in Exhibit B

12. COMPLIANCE AND CERTIFICATIONS
    12.1 Provider maintains the following certifications:
         - SOC 2 Type II
         - ISO 27001
         - GDPR compliance
         - HIPAA compliance (if applicable)
    12.2 Provider shall notify Customer within 24 hours of any compliance violations or data breaches

13. GENERAL PROVISIONS
    13.1 Governing Law: State of California
    13.2 Dispute Resolution: Binding arbitration in San Francisco, California
    13.3 Entire Agreement: This Agreement constitutes the entire agreement between parties
    13.4 Amendments: Must be in writing and signed by both parties
    13.5 Force Majeure: Neither party liable for delays due to events beyond reasonable control
    13.6 Assignment: Neither party may assign without prior written consent
    13.7 Notices: All notices must be in writing and delivered to addresses specified in this Agreement

14. EXHIBITS
    Exhibit A: Service Description and Specifications
    Exhibit B: Service Level Agreement Details
    Exhibit C: Data Processing Addendum
    Exhibit D: Security and Compliance Standards

IN WITNESS WHEREOF, the parties have executed this Agreement as of the Effective Date.

PACTWISE ORGANIZATION                    ${vendor.name.toUpperCase()}

By: _________________________           By: _________________________
Name: Sarah Johnson                     Name: ${getRandomName()}
Title: Chief Executive Officer          Title: ${getRandomTitle()}
Date: ${effectiveDate}                  Date: ${effectiveDate}


---
CONFIDENTIAL - Contains Proprietary Information
Document ID: ${Math.random().toString(36).substr(2, 9).toUpperCase()}
Version: 1.0
Generated: ${new Date().toISOString()}
`;
}

function getRandomName(): string {
  const firstNames = ['Michael', 'Sarah', 'David', 'Jennifer', 'Robert', 'Emily', 'James', 'Lisa', 'John', 'Amanda'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
  return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
}

function getRandomTitle(): string {
  const titles = ['Chief Executive Officer', 'Chief Technology Officer', 'Vice President of Sales', 'General Counsel', 'Chief Financial Officer', 'VP of Operations'];
  return titles[Math.floor(Math.random() * titles.length)];
}

// Generate PDF from contract text
async function generateContractPDF(contractText: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: 72, bottom: 72, left: 72, right: 72 }
    });

    const stream = createWriteStream(outputPath);
    doc.pipe(stream);

    // Add company logo placeholder
    doc.fontSize(24).font('Helvetica-Bold').text('PACTWISE', 72, 50);
    doc.fontSize(10).font('Helvetica').text('Contract Management Platform', 72, 78);
    doc.moveDown(2);

    // Add contract text with proper formatting
    const lines = contractText.split('\n');
    doc.fontSize(10).font('Helvetica');

    lines.forEach((line) => {
      if (line.match(/^[A-Z\s]+$/)) {
        // Section headers
        doc.moveDown(0.5).fontSize(14).font('Helvetica-Bold').text(line);
        doc.fontSize(10).font('Helvetica');
      } else if (line.match(/^\d+\./)) {
        // Main sections
        doc.moveDown(0.5).fontSize(11).font('Helvetica-Bold').text(line);
        doc.fontSize(10).font('Helvetica');
      } else if (line.trim().length > 0) {
        // Regular text
        doc.font('Helvetica').text(line, { align: 'left', continued: false });
      } else {
        doc.moveDown(0.3);
      }
    });

    // Add footer
    doc.fontSize(8).font('Helvetica').text(
      `Page ${doc.bufferedPageRange().count} - Confidential and Proprietary`,
      0,
      doc.page.height - 50,
      { align: 'center' }
    );

    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

async function main() {
  console.log('🚀 Starting MEGA seed process...\n');

  // Create temp directory for PDFs
  const tempDir = join('/tmp', 'pactwise-contracts');
  await mkdir(tempDir, { recursive: true });

  let vendorCount = 0;
  let contractCount = 0;
  let pdfCount = 0;

  // Step 1: Create all vendors
  console.log('📦 Creating vendors...');
  const vendorMap = new Map<string, string>();

  for (const vendorData of VENDORS) {
    const { data: vendor, error } = await supabase
      .from('vendors')
      .insert({
        name: vendorData.name,
        category: vendorData.category,
        status: 'active',
        website: vendorData.website,
        performance_score: vendorData.performance,
        compliance_score: vendorData.compliance,
        total_contract_value: vendorData.spend,
        enterprise_id: ENTERPRISE_ID,
        created_by: DEMO_USER_ID,
        metadata: { protected: true, seeded: true }
      })
      .select('id')
      .single();

    if (!error && vendor) {
      vendorMap.set(vendorData.name, vendor.id);
      vendorCount++;
      process.stdout.write(`\r   Created ${vendorCount}/${VENDORS.length} vendors`);
    }
  }
  console.log('\n✅ Vendors created!\n');

  // Step 2: Create contracts (3-5 per vendor)
  console.log('📄 Creating contracts with PDFs...');

  for (const [vendorName, vendorId] of vendorMap.entries()) {
    const vendorData = VENDORS.find(v => v.name === vendorName)!;
    const numContracts = Math.floor(Math.random() * 3) + 3; // 3-5 contracts per vendor

    for (let i = 0; i < numContracts; i++) {
      const contractType = CONTRACT_TYPES[Math.floor(Math.random() * CONTRACT_TYPES.length)];
      const status = STATUSES[Math.floor(Math.random() * STATUSES.length)] as any;

      // Random dates
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - Math.floor(Math.random() * 365));
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + (Math.floor(Math.random() * 24) + 12));

      const value = Math.floor(Math.random() * 200000) + 10000;

      // Generate contract text
      const contractText = generateContractText(vendorData, contractType, value, startDate, endDate);

      // Create contract in database
      const { data: contract, error: contractError } = await supabase
        .from('contracts')
        .insert({
          title: `${contractType} - ${vendorName}`,
          vendor_id: vendorId,
          contract_type: contractType.toLowerCase().replace(/\s+/g, '_'),
          status: status,
          value: value,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          is_auto_renew: Math.random() > 0.5,
          notes: 'Auto-generated demo contract with realistic terms',
          enterprise_id: ENTERPRISE_ID,
          owner_id: DEMO_USER_ID,
          created_by: DEMO_USER_ID,
          metadata: { protected: true, seeded: true, has_pdf: true },
          analysis_status: 'completed'
        })
        .select('id')
        .single();

      if (!contractError && contract) {
        contractCount++;

        // Generate PDF
        const pdfPath = join(tempDir, `contract-${contract.id}.pdf`);
        await generateContractPDF(contractText, pdfPath);

        // Upload PDF to Supabase storage
        const pdfBuffer = await readFile(pdfPath);
        const { error: uploadError } = await supabase.storage
          .from('contracts')
          .upload(`${ENTERPRISE_ID}/${contract.id}/contract.pdf`, pdfBuffer, {
            contentType: 'application/pdf',
            upsert: true
          });

        if (!uploadError) {
          pdfCount++;
          // Update contract with file path
          await supabase
            .from('contracts')
            .update({
              file_path: `${ENTERPRISE_ID}/${contract.id}/contract.pdf`,
              metadata: { protected: true, seeded: true, has_pdf: true, pdf_uploaded: true }
            })
            .eq('id', contract.id);
        }

        // Clean up temp file
        await unlink(pdfPath);

        process.stdout.write(`\r   Created ${contractCount} contracts, ${pdfCount} PDFs uploaded`);
      }
    }
  }

  console.log('\n\n✅ MEGA SEED COMPLETE!\n');
  console.log('📊 Summary:');
  console.log(`   • ${vendorCount} vendors created`);
  console.log(`   • ${contractCount} contracts created`);
  console.log(`   • ${pdfCount} PDF files uploaded`);
  console.log(`\n🎉 Your demo account is now loaded with realistic data!\n`);
}

main().catch(console.error);
