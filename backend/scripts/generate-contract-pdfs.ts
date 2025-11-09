#!/usr/bin/env node
/**
 * Generate PDF files for all contracts and upload to Supabase storage
 */

import { createClient } from '@supabase/supabase-js';
import PDFDocument from 'pdfkit';
import { createWriteStream } from 'fs';
import { mkdir, readFile, unlink, rm } from 'fs/promises';
import { join } from 'path';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseKey);

const ENTERPRISE_ID = 'f2e359ed-8950-4afa-9cf4-24a94c7caa7c';

interface Contract {
  id: string;
  title: string;
  contract_type: string;
  value: number;
  start_date: string;
  end_date: string;
  is_auto_renew: boolean;
  notes: string;
  vendor: {
    name: string;
    category: string;
    website: string;
  };
}

function generateContractContent(contract: Contract): string {
  const startDate = new Date(contract.start_date);
  const endDate = new Date(contract.end_date);
  const effectiveDate = startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const termDate = endDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const monthsDuration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
  const vendorName = contract.vendor.name;
  const category = contract.vendor.category;

  return `${contract.contract_type.toUpperCase()}

This ${contract.contract_type} ("Agreement") is entered into as of ${effectiveDate} ("Effective Date") by and between Pactwise Organization, a Delaware corporation with its principal place of business at 123 Business Avenue, San Francisco, CA 94102 ("Customer"), and ${vendorName} ("Provider").

RECITALS

WHEREAS, Provider is engaged in the business of providing ${category} services and solutions;
WHEREAS, Customer desires to engage Provider to provide certain services as described herein;
WHEREAS, the parties wish to establish the terms and conditions governing their business relationship;

NOW, THEREFORE, in consideration of the mutual covenants, agreements, and promises contained herein, and for other good and valuable consideration, the receipt and sufficiency of which are hereby acknowledged, the parties agree as follows:

ARTICLE 1: DEFINITIONS

1.1 "Services" means the ${category} services and products to be provided by Provider as described in Exhibit A attached hereto.

1.2 "Term" means the ${monthsDuration}-month period commencing on ${effectiveDate} and ending on ${termDate}, unless earlier terminated in accordance with Article 10.

1.3 "Fees" means the total compensation of $${contract.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} to be paid by Customer to Provider as set forth in Article 4.

1.4 "Confidential Information" means all non-public information disclosed by one party to the other, whether orally, in writing, or in any other form.

1.5 "Customer Data" means all data, information, and materials provided by Customer to Provider in connection with the Services.

ARTICLE 2: SCOPE OF SERVICES

2.1 Provider Services. Provider shall deliver the Services in accordance with industry best practices and professional standards applicable to ${category} service providers.

2.2 Service Standards. Provider warrants that:
    (a) Services shall be performed in a professional and workmanlike manner;
    (b) Personnel assigned to provide Services shall be qualified and experienced;
    (c) Services shall comply with all applicable laws and regulations;
    (d) Provider has all necessary licenses, permits, and authorizations required to provide the Services.

2.3 Service Levels. Provider shall maintain the service levels set forth in the Service Level Agreement attached as Exhibit B, including:
    (a) 99.9% uptime for critical systems
    (b) Response times as specified in the SLA
    (c) Disaster recovery and business continuity capabilities

ARTICLE 3: DATA PROTECTION AND SECURITY

3.1 Data Protection Compliance. Provider shall process Customer Data in accordance with:
    (a) General Data Protection Regulation (GDPR) (EU) 2016/679
    (b) California Consumer Privacy Act (CCPA)
    (c) All other applicable data protection and privacy laws

3.2 Security Measures. Provider shall implement and maintain appropriate technical and organizational security measures, including:
    (a) AES-256 encryption for data at rest and in transit
    (b) Multi-factor authentication for all system access
    (c) Regular security audits and penetration testing
    (d) SOC 2 Type II certification (or equivalent)
    (e) Annual third-party security assessments

3.3 Data Breach Notification. Provider shall notify Customer within 24 hours of becoming aware of any unauthorized access to, or acquisition of, Customer Data.

3.4 Data Ownership. Customer retains all right, title, and interest in and to Customer Data. Provider acquires no rights in Customer Data except as necessary to provide the Services.

ARTICLE 4: FEES AND PAYMENT TERMS

4.1 Total Fees. The total Fees for the Services during the Term shall be $${contract.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.

4.2 Payment Schedule. Customer shall pay Provider as follows:
    ${contract.value > 100000 ? 'Quarterly payments of $' + (contract.value / (monthsDuration / 3)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' in advance' : 'Monthly payments in arrears'}

4.3 Late Payment. Late payments shall accrue interest at the rate of 1.5% per month or the maximum rate permitted by law, whichever is less.

4.4 Taxes. Fees are exclusive of all federal, state, local, and foreign taxes. Customer shall be responsible for all taxes except those based on Provider's net income.

4.5 Non-Refundable. All Fees are non-refundable except as expressly provided in Article 7 or Article 10.

ARTICLE 5: INTELLECTUAL PROPERTY RIGHTS

5.1 Provider IP. Provider retains all right, title, and interest in and to:
    (a) Pre-existing intellectual property
    (b) The underlying platform and technology
    (c) Improvements and enhancements to Provider's systems

5.2 Customer IP. Customer retains all right, title, and interest in and to:
    (a) Customer Data
    (b) Customer's pre-existing intellectual property
    (c) Custom configurations and settings

5.3 License Grant. Provider grants Customer a non-exclusive, non-transferable, non-sublicensable license to use the Services during the Term.

ARTICLE 6: CONFIDENTIALITY

6.1 Confidentiality Obligations. Each party agrees to:
    (a) Maintain the confidentiality of the other party's Confidential Information
    (b) Use Confidential Information solely for purposes of performing under this Agreement
    (c) Protect Confidential Information using the same degree of care used to protect its own confidential information

6.2 Exceptions. Confidential Information does not include information that:
    (a) Is or becomes publicly known through no breach of this Agreement
    (b) Is independently developed without use of Confidential Information
    (c) Is rightfully received from a third party without breach of confidentiality
    (d) Must be disclosed pursuant to law or court order

6.3 Survival. Confidentiality obligations shall survive termination of this Agreement for five (5) years.

ARTICLE 7: WARRANTIES AND DISCLAIMERS

7.1 Provider Warranties. Provider warrants that:
    (a) Services shall perform materially in accordance with the Documentation
    (b) Services shall be provided free from viruses and malicious code
    (c) Provider has the right and authority to provide the Services
    (d) Services do not infringe any third-party intellectual property rights

7.2 Customer Warranties. Customer warrants that:
    (a) It has the right to provide Customer Data to Provider
    (b) Customer Data does not violate any third-party rights
    (c) Customer's use of Services complies with applicable law

7.3 DISCLAIMER. EXCEPT AS EXPRESSLY PROVIDED IN THIS ARTICLE 7, SERVICES ARE PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND. PROVIDER DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.

ARTICLE 8: LIMITATION OF LIABILITY

8.1 Liability Cap. EXCEPT AS PROVIDED IN SECTION 8.3, NEITHER PARTY'S TOTAL AGGREGATE LIABILITY ARISING OUT OF OR RELATED TO THIS AGREEMENT SHALL EXCEED THE TOTAL FEES PAID OR PAYABLE BY CUSTOMER TO PROVIDER IN THE TWELVE (12) MONTHS PRECEDING THE EVENT GIVING RISE TO LIABILITY.

8.2 Exclusion of Consequential Damages. NEITHER PARTY SHALL BE LIABLE FOR INDIRECT, INCIDENTAL, CONSEQUENTIAL, SPECIAL, OR PUNITIVE DAMAGES, INCLUDING LOST PROFITS, LOST REVENUE, LOST DATA, OR BUSINESS INTERRUPTION, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.

8.3 Exceptions. The limitations in Sections 8.1 and 8.2 do not apply to:
    (a) Either party's indemnification obligations under Article 9
    (b) Breaches of confidentiality obligations
    (c) Violations of intellectual property rights
    (d) Gross negligence or willful misconduct

ARTICLE 9: INDEMNIFICATION

9.1 Provider Indemnification. Provider shall indemnify, defend, and hold harmless Customer from and against any third-party claims arising from:
    (a) Infringement of intellectual property rights by the Services
    (b) Provider's breach of this Agreement
    (c) Provider's negligence or willful misconduct

9.2 Customer Indemnification. Customer shall indemnify, defend, and hold harmless Provider from and against any third-party claims arising from:
    (a) Customer Data
    (b) Customer's use of Services in violation of this Agreement
    (c) Customer's negligence or willful misconduct

9.3 Indemnification Procedures. The indemnified party shall:
    (a) Promptly notify the indemnifying party of any claim
    (b) Cooperate with the indemnifying party in defense of the claim
    (c) Allow the indemnifying party to control the defense and settlement

ARTICLE 10: TERM AND TERMINATION

10.1 Initial Term. This Agreement shall commence on the Effective Date and continue for ${monthsDuration} months unless earlier terminated.

10.2 Renewal. ${contract.is_auto_renew ? 'This Agreement shall automatically renew for successive one-year periods unless either party provides written notice of non-renewal at least ninety (90) days prior to the end of the then-current term.' : 'This Agreement shall not automatically renew. Any extension must be agreed upon in writing by both parties.'}

10.3 Termination for Cause. Either party may terminate this Agreement upon thirty (30) days written notice if the other party materially breaches this Agreement and fails to cure such breach within the notice period.

10.4 Termination for Convenience. Customer may terminate this Agreement for convenience upon ninety (90) days written notice, subject to payment of an early termination fee equal to 50% of the remaining Fees.

10.5 Effect of Termination. Upon termination:
    (a) All licenses granted hereunder shall immediately terminate
    (b) Customer shall have ninety (90) days to retrieve Customer Data
    (c) Provider shall securely delete all Customer Data after the retrieval period
    (d) Sections surviving termination shall continue in effect

ARTICLE 11: SERVICE LEVEL AGREEMENT

11.1 Uptime Guarantee. Provider guarantees 99.9% monthly uptime for production services.

11.2 Response Times. Provider shall respond to support requests within:
    (a) Critical issues: 1 hour
    (b) High priority: 4 business hours
    (c) Medium priority: 1 business day
    (d) Low priority: 3 business days

11.3 Credits for SLA Breaches. If Provider fails to meet the SLA, Customer shall receive service credits as specified in Exhibit B.

ARTICLE 12: COMPLIANCE AND CERTIFICATIONS

12.1 Regulatory Compliance. Provider maintains compliance with:
    (a) SOC 2 Type II standards
    (b) ISO 27001:2013 certification
    (c) GDPR and CCPA requirements
    (d) Industry-specific regulations applicable to ${category} services

12.2 Audit Rights. Customer may audit Provider's compliance with this Agreement annually upon reasonable notice.

ARTICLE 13: GENERAL PROVISIONS

13.1 Governing Law. This Agreement shall be governed by and construed in accordance with the laws of the State of California, without regard to conflicts of law principles.

13.2 Dispute Resolution. Any disputes arising under this Agreement shall be resolved through:
    (a) Good faith negotiations between senior executives
    (b) Mediation before a mutually agreed mediator
    (c) If unresolved, binding arbitration in San Francisco, California under AAA Commercial Arbitration Rules

13.3 Entire Agreement. This Agreement constitutes the entire agreement between the parties and supersedes all prior agreements, understandings, and communications.

13.4 Amendments. This Agreement may be amended only by a written instrument signed by both parties.

13.5 Force Majeure. Neither party shall be liable for delays or failures in performance resulting from events beyond its reasonable control, including natural disasters, war, terrorism, pandemics, or governmental actions.

13.6 Assignment. Neither party may assign this Agreement without the prior written consent of the other party, except that either party may assign to a successor in a merger or acquisition.

13.7 Severability. If any provision is found invalid or unenforceable, the remaining provisions shall continue in full force and effect.

13.8 Waiver. No waiver of any provision shall constitute a waiver of any other provision or a continuing waiver.

13.9 Notices. All notices must be in writing and delivered to:

    For Customer:
    Pactwise Organization
    123 Business Avenue
    San Francisco, CA 94102
    Attention: Legal Department
    Email: legal@pactwise.com

    For Provider:
    ${vendorName}
    ${contract.vendor.website}
    Attention: Contracts Department

13.10 Counterparts. This Agreement may be executed in counterparts, each of which shall be deemed an original.

13.11 Headings. Section headings are for convenience only and shall not affect interpretation.

EXHIBITS

Exhibit A: Service Description and Specifications
Exhibit B: Service Level Agreement
Exhibit C: Data Processing Addendum
Exhibit D: Security Standards and Procedures

IN WITNESS WHEREOF, the parties have executed this Agreement as of the Effective Date.

PACTWISE ORGANIZATION                    ${vendorName.toUpperCase()}

By: _________________________           By: _________________________
Name: Sarah Chen                        Name: ${getRandomName()}
Title: Chief Executive Officer          Title: ${getRandomTitle()}
Date: ${effectiveDate}                  Date: ${effectiveDate}


By: _________________________           By: _________________________
Name: Michael Roberts                   Name: ${getRandomName()}
Title: Chief Legal Officer              Title: Chief Legal Officer
Date: ${effectiveDate}                  Date: ${effectiveDate}


---
CONFIDENTIAL AND PROPRIETARY
This document contains confidential and proprietary information.
Do not copy, distribute, or disclose without authorization.

Document ID: ${contract.id.substring(0, 8).toUpperCase()}
Contract Type: ${contract.contract_type}
Effective Date: ${effectiveDate}
Term End Date: ${termDate}
Total Contract Value: $${contract.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
Generated: ${new Date().toISOString()}
Version: 1.0
`;
}

function getRandomName(): string {
  const firstNames = ['Michael', 'Sarah', 'David', 'Jennifer', 'Robert', 'Emily', 'James', 'Lisa', 'John', 'Amanda', 'Christopher', 'Jessica', 'Daniel', 'Ashley', 'Matthew'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Chen', 'Lee', 'Anderson', 'Taylor', 'Thomas'];
  return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
}

function getRandomTitle(): string {
  const titles = ['Chief Executive Officer', 'Chief Technology Officer', 'Vice President of Sales', 'General Counsel', 'Chief Financial Officer', 'VP of Operations', 'Chief Revenue Officer', 'VP of Engineering'];
  return titles[Math.floor(Math.random() * titles.length)];
}

async function generatePDF(content: string, outputPath: string, contractTitle: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: 72, bottom: 72, left: 72, right: 72 },
      info: {
        Title: contractTitle,
        Author: 'Pactwise Organization',
        Subject: 'Contract Agreement',
        Keywords: 'contract, legal, agreement'
      }
    });

    const stream = createWriteStream(outputPath);
    doc.pipe(stream);

    // Header
    doc.fontSize(24).font('Helvetica-Bold').fillColor('#291528').text('PACTWISE', 72, 40);
    doc.fontSize(9).font('Helvetica').fillColor('#666666').text('Contract Management Platform | 123 Business Ave, San Francisco, CA 94102', 72, 68);

    doc.moveTo(72, 90).lineTo(540, 90).stroke('#291528');
    doc.moveDown(3);

    // Content
    const lines = content.split('\n');
    let currentY = doc.y;

    lines.forEach((line, index) => {
      // Check for page break
      if (currentY > 720) {
        doc.addPage();
        currentY = 72;
        doc.y = currentY;
      }

      if (line.match(/^[A-Z\s]+$/) && line.trim().length > 0 && line.trim().length < 50) {
        // Section headers
        doc.moveDown(0.5);
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#291528').text(line, { align: 'left' });
        doc.moveDown(0.3);
        currentY = doc.y;
      } else if (line.match(/^ARTICLE \d+:/)) {
        // Article headers
        doc.moveDown(0.7);
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#291528').text(line);
        doc.moveDown(0.3);
        currentY = doc.y;
      } else if (line.match(/^\d+\.\d+/)) {
        // Subsections
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#333333').text(line);
        doc.moveDown(0.2);
        currentY = doc.y;
      } else if (line.trim().startsWith('(')) {
        // Sub-points
        doc.fontSize(9).font('Helvetica').fillColor('#444444').text(line, { indent: 20 });
        currentY = doc.y;
      } else if (line.trim().length > 0) {
        // Regular text
        doc.fontSize(9).font('Helvetica').fillColor('#333333').text(line, { align: 'left' });
        currentY = doc.y;
      } else {
        doc.moveDown(0.2);
        currentY = doc.y;
      }
    });

    // Footer on last page
    doc.fontSize(7).font('Helvetica').fillColor('#666666').text(
      `Page ${doc.bufferedPageRange().count} - Confidential and Proprietary | Pactwise Organization`,
      72,
      doc.page.height - 50,
      { align: 'center' }
    );

    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

async function main() {
  console.log('🚀 Starting PDF generation for all contracts...\n');

  // Create temp directory
  const tempDir = join('/tmp', 'pactwise-pdfs');
  await rm(tempDir, { recursive: true, force: true });
  await mkdir(tempDir, { recursive: true });

  // Fetch all contracts
  console.log('📥 Fetching contracts from database...');
  const { data: contracts, error: fetchError } = await supabase
    .from('contracts')
    .select(`
      id,
      title,
      contract_type,
      value,
      start_date,
      end_date,
      is_auto_renew,
      notes,
      vendor:vendors (
        name,
        category,
        website
      )
    `)
    .eq('enterprise_id', ENTERPRISE_ID);

  if (fetchError || !contracts) {
    console.error('❌ Error fetching contracts:', fetchError);
    process.exit(1);
  }

  console.log(`✅ Found ${contracts.length} contracts\n`);
  console.log('📄 Generating PDFs...');

  let successCount = 0;
  let uploadCount = 0;

  for (let i = 0; i < contracts.length; i++) {
    const contract = contracts[i] as Contract;

    try {
      // Generate content
      const content = generateContractContent(contract);

      // Generate PDF
      const pdfPath = join(tempDir, `${contract.id}.pdf`);
      await generatePDF(content, pdfPath, contract.title);
      successCount++;

      // Upload to storage
      const pdfBuffer = await readFile(pdfPath);
      const storagePath = `${ENTERPRISE_ID}/${contract.id}/contract.pdf`;

      const { error: uploadError } = await supabase.storage
        .from('contracts')
        .upload(storagePath, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (!uploadError) {
        // Update contract record
        await supabase
          .from('contracts')
          .update({
            storage_id: storagePath,
            file_name: 'contract.pdf',
            file_type: 'application/pdf'
          })
          .eq('id', contract.id);

        uploadCount++;
      }

      // Clean up temp file
      await unlink(pdfPath);

      // Progress indicator
      process.stdout.write(`\r   Progress: ${i + 1}/${contracts.length} - Generated: ${successCount} - Uploaded: ${uploadCount}`);

    } catch (error: any) {
      console.error(`\n❌ Error processing contract ${contract.id}:`, error.message);
    }
  }

  console.log('\n\n✅ PDF GENERATION COMPLETE!\n');
  console.log('📊 Summary:');
  console.log(`   • Total contracts: ${contracts.length}`);
  console.log(`   • PDFs generated: ${successCount}`);
  console.log(`   • PDFs uploaded: ${uploadCount}`);
  console.log(`\n🎉 All contract PDFs are now available in your demo account!\n`);

  // Clean up temp directory
  await rm(tempDir, { recursive: true, force: true });
}

main().catch(console.error);
