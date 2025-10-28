#!/usr/bin/env node
/**
 * Seed script for demo@pactwise.com account
 * Generates 100 realistic contracts with 25+ vendors
 */

import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Enterprise ID for Pactwise demo
const ENTERPRISE_ID = 'a0000000-0000-0000-0000-000000000001';
const DEMO_USER_ID = 'b0000000-0000-0000-0000-000000000001';

// Realistic vendor data
const VENDORS = [
  { name: 'Microsoft Corporation', industry: 'Technology', rating: 4.8, spend: 250000 },
  { name: 'Amazon Web Services', industry: 'Cloud Services', rating: 4.7, spend: 180000 },
  { name: 'Salesforce Inc', industry: 'SaaS', rating: 4.6, spend: 150000 },
  { name: 'Google Cloud Platform', industry: 'Cloud Services', rating: 4.7, spend: 140000 },
  { name: 'Oracle Corporation', industry: 'Database', rating: 4.3, spend: 120000 },
  { name: 'SAP America Inc', industry: 'Enterprise Software', rating: 4.4, spend: 110000 },
  { name: 'IBM Corporation', industry: 'Technology', rating: 4.5, spend: 95000 },
  { name: 'Atlassian Corporation', industry: 'SaaS', rating: 4.6, spend: 75000 },
  { name: 'Adobe Systems Inc', industry: 'Creative Software', rating: 4.7, spend: 68000 },
  { name: 'Cisco Systems Inc', industry: 'Networking', rating: 4.5, spend: 85000 },
  { name: 'Dell Technologies', industry: 'Hardware', rating: 4.4, spend: 92000 },
  { name: 'HP Inc', industry: 'Hardware', rating: 4.3, spend: 71000 },
  { name: 'Zoom Video Communications', industry: 'SaaS', rating: 4.6, spend: 45000 },
  { name: 'Slack Technologies', industry: 'SaaS', rating: 4.7, spend: 38000 },
  { name: 'DocuSign Inc', industry: 'Document Management', rating: 4.5, spend: 32000 },
  { name: 'Workday Inc', industry: 'HR Software', rating: 4.6, spend: 125000 },
  { name: 'ServiceNow Inc', industry: 'IT Service Management', rating: 4.5, spend: 98000 },
  { name: 'Snowflake Inc', industry: 'Data Warehouse', rating: 4.7, spend: 87000 },
  { name: 'Datadog Inc', industry: 'Monitoring', rating: 4.6, spend: 54000 },
  { name: 'MongoDB Inc', industry: 'Database', rating: 4.5, spend: 62000 },
  { name: 'Twilio Inc', industry: 'Communications API', rating: 4.4, spend: 48000 },
  { name: 'Stripe Inc', industry: 'Payment Processing', rating: 4.8, spend: 156000 },
  { name: 'HubSpot Inc', industry: 'Marketing Automation', rating: 4.6, spend: 72000 },
  { name: 'Zendesk Inc', industry: 'Customer Support', rating: 4.5, spend: 51000 },
  { name: 'Dropbox Inc', industry: 'Cloud Storage', rating: 4.4, spend: 39000 },
  { name: 'Box Inc', industry: 'Cloud Storage', rating: 4.5, spend: 44000 },
  { name: 'Okta Inc', industry: 'Identity Management', rating: 4.7, spend: 67000 },
  { name: 'PagerDuty Inc', industry: 'Incident Management', rating: 4.5, spend: 35000 },
  { name: 'New Relic Inc', industry: 'Application Monitoring', rating: 4.4, spend: 58000 },
  { name: 'Splunk Inc', industry: 'Security & Analytics', rating: 4.5, spend: 94000 },
];

// Contract templates with realistic legal terminology
const CONTRACT_TYPES = [
  {
    type: 'SaaS Subscription Agreement',
    template: (vendor: string, value: number, duration: number) => `
This Software as a Service Subscription Agreement ("Agreement") is entered into as of {date} ("Effective Date") by and between Pactwise Demo Organization, a Delaware corporation with its principal place of business at 123 Business Ave, San Francisco, CA 94102 ("Customer"), and ${vendor} ("Provider").

WHEREAS, Provider offers certain cloud-based software services;
WHEREAS, Customer desires to subscribe to such services;

NOW, THEREFORE, in consideration of the mutual covenants and agreements herein contained, the parties agree as follows:

1. DEFINITIONS
   1.1 "Services" means the software-as-a-service platform and related services described in Exhibit A.
   1.2 "Subscription Term" means the ${duration}-month period commencing on the Effective Date.
   1.3 "Fees" means the subscription fees of $${value.toLocaleString()} as set forth in Section 4.

2. GRANT OF LICENSE
   2.1 Subject to the terms hereof, Provider grants Customer a non-exclusive, non-transferable, non-sublicensable right to access and use the Services during the Subscription Term.
   2.2 Customer shall not: (a) reverse engineer the Services; (b) use the Services for competitive purposes; or (c) violate applicable laws.

3. DATA AND PRIVACY
   3.1 Provider shall process Customer Data in accordance with its Privacy Policy and applicable data protection laws, including GDPR and CCPA.
   3.2 Provider implements industry-standard security measures including SOC 2 Type II compliance.
   3.3 Customer retains all ownership rights to Customer Data.

4. FEES AND PAYMENT
   4.1 Customer shall pay Provider the Fees as follows: ${value > 100000 ? 'quarterly in advance' : 'monthly in arrears'}.
   4.2 Late payments shall accrue interest at 1.5% per month.
   4.3 All Fees are non-refundable except as expressly provided herein.

5. TERM AND TERMINATION
   5.1 This Agreement shall commence on the Effective Date and continue for the Subscription Term.
   5.2 Either party may terminate for material breach upon 30 days' written notice.
   5.3 Upon termination, Customer shall have 90 days to export Customer Data.

6. WARRANTIES AND DISCLAIMERS
   6.1 Provider warrants the Services shall perform materially in accordance with the Documentation.
   6.2 EXCEPT AS EXPRESSLY PROVIDED, THE SERVICES ARE PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND.

7. LIMITATION OF LIABILITY
   7.1 IN NO EVENT SHALL EITHER PARTY'S LIABILITY EXCEED THE FEES PAID IN THE 12 MONTHS PRECEDING THE CLAIM.
   7.2 NEITHER PARTY SHALL BE LIABLE FOR INDIRECT, INCIDENTAL, OR CONSEQUENTIAL DAMAGES.

8. GENERAL PROVISIONS
   8.1 This Agreement shall be governed by the laws of the State of California.
   8.2 Any disputes shall be resolved through binding arbitration in San Francisco, California.
   8.3 This Agreement constitutes the entire agreement between the parties.

IN WITNESS WHEREOF, the parties have executed this Agreement as of the Effective Date.
    `.trim()
  },
  {
    type: 'Master Services Agreement',
    template: (vendor: string, value: number, duration: number) => `
MASTER SERVICES AGREEMENT

This Master Services Agreement ("MSA") is made and entered into as of {date} ("Effective Date") by and between Pactwise Demo Organization ("Client") and ${vendor} ("Service Provider").

RECITALS
A. Service Provider provides professional services in the areas of technology consulting, implementation, and support.
B. Client wishes to engage Service Provider to perform certain services as described in Statements of Work.

AGREEMENT
1. SCOPE OF SERVICES
   1.1 Service Provider shall perform services as detailed in individual Statements of Work ("SOW") executed pursuant to this MSA.
   1.2 Each SOW shall specify: scope, deliverables, timeline, fees, and acceptance criteria.
   1.3 The terms of this MSA shall govern all SOWs unless explicitly modified therein.

2. FEES AND EXPENSES
   2.1 Client shall pay Service Provider fees totaling $${value.toLocaleString()} as detailed in the applicable SOW.
   2.2 Payment terms: Net 30 days from invoice date.
   2.3 Service Provider may invoice for pre-approved, reasonable out-of-pocket expenses.

3. INTELLECTUAL PROPERTY RIGHTS
   3.1 Work Product: All deliverables, inventions, and works created under this MSA ("Work Product") shall be owned by Client.
   3.2 Service Provider hereby assigns all rights, title, and interest in Work Product to Client.
   3.3 Service Provider retains ownership of pre-existing intellectual property and tools.

4. CONFIDENTIALITY
   4.1 Each party agrees to maintain the confidentiality of the other party's Confidential Information.
   4.2 Confidential Information excludes information that: (a) is publicly known; (b) is independently developed; or (c) is required to be disclosed by law.
   4.3 Confidentiality obligations survive for 5 years following termination.

5. REPRESENTATIONS AND WARRANTIES
   5.1 Service Provider warrants that: (a) services shall be performed in a professional manner; (b) Work Product shall not infringe third-party rights; and (c) it has the right to enter this MSA.
   5.2 CLIENT ACKNOWLEDGES THAT EXCEPT AS EXPRESSLY PROVIDED, SERVICE PROVIDER MAKES NO WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY OR FITNESS FOR A PARTICULAR PURPOSE.

6. INDEMNIFICATION
   6.1 Service Provider shall indemnify Client against third-party claims arising from Service Provider's breach of this MSA or infringement of intellectual property rights.
   6.2 Client shall indemnify Service Provider against claims arising from Client's use of Work Product.

7. LIMITATION OF LIABILITY
   7.1 Except for breaches of confidentiality or indemnification obligations, each party's liability shall not exceed the fees paid under the applicable SOW.
   7.2 Neither party shall be liable for consequential, incidental, punitive, or special damages.

8. TERM AND TERMINATION
   8.1 This MSA shall remain in effect for ${duration} months unless earlier terminated.
   8.2 Either party may terminate for convenience upon 60 days' written notice.
   8.3 Either party may terminate immediately for material breach if not cured within 30 days.

9. GENERAL PROVISIONS
   9.1 Independent Contractors: The parties are independent contractors.
   9.2 Governing Law: Delaware law, excluding conflicts of law principles.
   9.3 Dispute Resolution: Mediation followed by arbitration under AAA rules.
   9.4 Assignment: Neither party may assign without prior written consent.
   9.5 Entire Agreement: This MSA constitutes the entire agreement.

EXECUTED by the authorized representatives of the parties.
    `.trim()
  },
  {
    type: 'Software License Agreement',
    template: (vendor: string, value: number, duration: number) => `
PERPETUAL SOFTWARE LICENSE AGREEMENT

This Software License Agreement ("Agreement") is entered into effective {date} between ${vendor} ("Licensor") and Pactwise Demo Organization ("Licensee").

GRANT OF LICENSE
1.1 Licensor hereby grants Licensee a perpetual, non-exclusive, non-transferable license to use the Software (as defined in Exhibit A) subject to the terms and conditions herein.
1.2 License Fee: $${value.toLocaleString()} (one-time payment).
1.3 Authorized Users: Up to ${Math.floor(value / 1000)} named users.

RESTRICTIONS
2.1 Licensee shall not: (a) modify, adapt, or create derivative works; (b) reverse engineer, decompile, or disassemble; (c) rent, lease, or sublicense; or (d) remove proprietary notices.
2.2 Licensee may make one backup copy for archival purposes only.

MAINTENANCE AND SUPPORT
3.1 Licensor shall provide ${duration} months of maintenance and support, including:
     (a) Software updates and patches
     (b) Technical support during business hours
     (c) Bug fixes and error corrections
3.2 Maintenance fees: 20% of License Fee annually after initial period.

INTELLECTUAL PROPERTY
4.1 The Software is licensed, not sold. Licensor retains all ownership rights.
4.2 Licensee acknowledges that the Software contains proprietary trade secrets.
4.3 All intellectual property rights remain with Licensor.

WARRANTIES
5.1 Licensor warrants that for 90 days from delivery, the Software shall substantially conform to the Documentation.
5.2 Licensor's entire liability for breach of warranty is to repair or replace the Software or refund the License Fee.
5.3 LICENSOR DISCLAIMS ALL OTHER WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.

LIMITATION OF LIABILITY
6.1 IN NO EVENT SHALL LICENSOR'S LIABILITY EXCEED THE LICENSE FEE PAID BY LICENSEE.
6.2 LICENSOR SHALL NOT BE LIABLE FOR INDIRECT, SPECIAL, INCIDENTAL, OR CONSEQUENTIAL DAMAGES, EVEN IF ADVISED OF THEIR POSSIBILITY.
6.3 The above limitations apply to the fullest extent permitted by law.

TERM AND TERMINATION
7.1 This license is perpetual subject to Licensee's compliance.
7.2 Licensor may terminate immediately upon Licensee's material breach.
7.3 Upon termination, Licensee shall cease use and destroy all copies.

COMPLIANCE AND AUDIT
8.1 Licensor may audit Licensee's use of the Software upon 30 days' notice, no more than annually.
8.2 Licensee shall maintain accurate records of Software deployment.
8.3 Unauthorized use may result in additional fees and termination.

GOVERNING LAW
9.1 This Agreement shall be governed by California law.
9.2 Exclusive jurisdiction: state and federal courts in San Francisco County, California.

ENTIRE AGREEMENT
This Agreement constitutes the complete agreement and supersedes all prior communications.

EXECUTED as of the Effective Date.
    `.trim()
  },
  {
    type: 'Non-Disclosure Agreement',
    template: (vendor: string) => `
MUTUAL NON-DISCLOSURE AGREEMENT

This Mutual Non-Disclosure Agreement ("Agreement") is entered into as of {date} by and between Pactwise Demo Organization and ${vendor} (each a "Party" and collectively the "Parties").

WHEREAS, the Parties wish to explore a business relationship and may disclose Confidential Information to each other.

1. DEFINITION OF CONFIDENTIAL INFORMATION
   1.1 "Confidential Information" means all non-public information disclosed by either Party, whether orally, visually, in writing, or in electronic form, including but not limited to:
       (a) Business plans, strategies, and financial information
       (b) Technical data, algorithms, and source code
       (c) Customer lists and supplier information
       (d) Product roadmaps and development plans
       (e) Trade secrets and know-how

   1.2 Confidential Information does not include information that:
       (a) Is or becomes publicly available through no breach of this Agreement
       (b) Was rightfully in the receiving Party's possession before disclosure
       (c) Is independently developed without use of Confidential Information
       (d) Is rightfully received from a third party without confidentiality obligations
       (e) Must be disclosed pursuant to law or court order (with prior notice)

2. OBLIGATIONS
   2.1 Each Party agrees to:
       (a) Hold Confidential Information in strict confidence
       (b) Use Confidential Information solely to evaluate the potential business relationship
       (c) Protect Confidential Information using at least the same degree of care as for its own confidential information, but no less than reasonable care
       (d) Limit disclosure to employees and contractors with a need to know who are bound by confidentiality obligations

   2.2 Neither Party shall reverse engineer, disassemble, or decompile any prototypes or software disclosed.

3. REMEDIES
   3.1 The Parties acknowledge that monetary damages may be inadequate for breach of this Agreement.
   3.2 Each Party shall be entitled to seek equitable relief, including injunction and specific performance, in addition to all other remedies.

4. RETURN OF MATERIALS
   4.1 Upon request or termination, each Party shall promptly return or destroy all Confidential Information and certify such destruction in writing.
   4.2 Each Party may retain one copy for archival purposes to evidence compliance.

5. NO LICENSE
   5.1 This Agreement does not grant any rights or licenses under any patent, copyright, trademark, or trade secret.
   5.2 All Confidential Information remains the property of the disclosing Party.

6. TERM
   6.1 This Agreement shall remain in effect for 3 years from the Effective Date.
   6.2 Confidentiality obligations shall survive for 5 years from the date of disclosure.
   6.3 Either Party may terminate upon 30 days' written notice.

7. GENERAL PROVISIONS
   7.1 Governing Law: This Agreement shall be governed by Delaware law.
   7.2 No Waiver: Failure to enforce any provision shall not constitute a waiver.
   7.3 Severability: Invalid provisions shall be modified to the minimum extent necessary.
   7.4 Assignment: Neither Party may assign without prior written consent.
   7.5 Entire Agreement: This Agreement constitutes the entire agreement regarding confidentiality.
   7.6 Amendment: Amendments must be in writing and signed by both Parties.
   7.7 Counterparts: This Agreement may be executed in counterparts.

IN WITNESS WHEREOF, the Parties have executed this Agreement as of the Effective Date.
    `.trim()
  },
  {
    type: 'Data Processing Agreement',
    template: (vendor: string, value: number) => `
DATA PROCESSING AGREEMENT

This Data Processing Agreement ("DPA") is entered into as of {date} between Pactwise Demo Organization ("Controller") and ${vendor} ("Processor") and supplements the main services agreement.

WHEREAS, Processor provides services that involve the processing of personal data on behalf of Controller;
WHEREAS, the parties wish to comply with GDPR, CCPA, and other applicable data protection laws;

1. DEFINITIONS
   1.1 "Personal Data," "Processing," "Data Subject," "Controller," and "Processor" have the meanings set forth in applicable Data Protection Laws.
   1.2 "Data Protection Laws" means GDPR (EU 2016/679), CCPA (California Civil Code §1798.100 et seq.), and other applicable privacy laws.
   1.3 "Sub-processor" means any third party appointed by Processor to process Personal Data.

2. SCOPE AND NATURE OF PROCESSING
   2.1 Subject Matter: Processing of Personal Data in connection with the provision of Services.
   2.2 Duration: For the term of the main services agreement.
   2.3 Nature and Purpose: As described in Annex A.
   2.4 Types of Personal Data: As described in Annex A.
   2.5 Categories of Data Subjects: Employees, customers, and partners of Controller.

3. PROCESSOR'S OBLIGATIONS
   3.1 Processor shall:
       (a) Process Personal Data only on documented instructions from Controller
       (b) Ensure that persons authorized to process Personal Data are bound by confidentiality
       (c) Implement appropriate technical and organizational security measures
       (d) Engage Sub-processors only with Controller's prior written consent
       (e) Assist Controller in responding to Data Subject requests
       (f) Assist Controller in ensuring compliance with security obligations
       (g) Delete or return Personal Data upon termination
       (h) Make available all information necessary to demonstrate compliance

   3.2 Processor shall not:
       (a) Transfer Personal Data outside the EEA without appropriate safeguards
       (b) Process Personal Data for Processor's own purposes

4. SECURITY MEASURES
   4.1 Processor shall implement and maintain security measures including:
       (a) Encryption of Personal Data in transit and at rest
       (b) Regular security assessments and penetration testing
       (c) Access controls and authentication mechanisms
       (d) Security incident response procedures
       (e) Regular security awareness training
       (f) Business continuity and disaster recovery plans

   4.2 Processor maintains ISO 27001 and SOC 2 Type II certifications.
   4.3 Annual Fee for enhanced security: $${Math.floor(value * 0.15).toLocaleString()}.

5. DATA BREACH NOTIFICATION
   5.1 Processor shall notify Controller without undue delay (and in any event within 24 hours) upon becoming aware of a Personal Data breach.
   5.2 Notification shall include:
       (a) Description of the nature of the breach
       (b) Categories and approximate number of Data Subjects affected
       (c) Likely consequences of the breach
       (d) Measures taken or proposed to address the breach

6. SUB-PROCESSORS
   6.1 Controller authorizes Processor to engage the Sub-processors listed in Annex B.
   6.2 Processor shall inform Controller of any intended changes to Sub-processors with 30 days' notice.
   6.3 Controller may object to a new Sub-processor on reasonable grounds.
   6.4 Processor remains fully liable for Sub-processors' acts and omissions.

7. DATA SUBJECT RIGHTS
   7.1 Processor shall assist Controller in fulfilling Data Subject requests for:
       (a) Access to Personal Data
       (b) Rectification of inaccurate Personal Data
       (c) Erasure of Personal Data ("right to be forgotten")
       (d) Restriction of processing
       (e) Data portability
       (f) Objection to processing

   7.2 Processor shall respond to Controller's requests within 5 business days.

8. DATA PROTECTION IMPACT ASSESSMENT
   8.1 Processor shall assist Controller in conducting Data Protection Impact Assessments when required.
   8.2 Processor shall provide relevant information about processing activities.

9. INTERNATIONAL DATA TRANSFERS
   9.1 If Processor transfers Personal Data outside the EEA, Processor shall ensure:
       (a) Standard Contractual Clauses approved by the European Commission are in place, or
       (b) The recipient country ensures an adequate level of protection, or
       (c) Other appropriate safeguards are implemented

10. AUDIT RIGHTS
    10.1 Controller may audit Processor's compliance with this DPA:
          (a) Once annually upon 30 days' notice
          (b) At Controller's expense (unless non-compliance is found)
          (c) During business hours with minimal disruption
    10.2 Processor shall cooperate and provide access to relevant information.

11. LIABILITY AND INDEMNIFICATION
    11.1 Processor shall indemnify Controller for any fines, penalties, or damages arising from Processor's non-compliance with Data Protection Laws.
    11.2 Liability cap: Greater of $${value.toLocaleString()} or amount paid in preceding 12 months.

12. TERM AND TERMINATION
    12.1 This DPA shall remain in effect for the duration of the main services agreement.
    12.2 Upon termination, Processor shall:
          (a) Delete or return all Personal Data within 30 days
          (b) Certify in writing that Personal Data has been deleted
          (c) Delete Personal Data from Sub-processors

13. GOVERNING LAW
    13.1 This DPA shall be governed by the laws of the jurisdiction specified in the main agreement.
    13.2 For GDPR compliance, the parties also submit to the jurisdiction of EU data protection authorities.

ANNEXES:
Annex A: Details of Processing
Annex B: List of Sub-processors
Annex C: Technical and Organizational Security Measures

EXECUTED as of the Effective Date.
    `.trim()
  }
];

// Generate random dates within the last 24 months
function randomDate(startDaysAgo: number, endDaysAgo: number): string {
  const start = new Date();
  start.setDate(start.getDate() - startDaysAgo);
  const end = new Date();
  end.setDate(end.getDate() - endDaysAgo);
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return date.toISOString().split('T')[0];
}

function randomStatus(): string {
  const statuses = ['draft', 'active', 'pending_renewal', 'expired'];
  const weights = [0.1, 0.6, 0.2, 0.1];
  const rand = Math.random();
  let cumulative = 0;
  for (let i = 0; i < weights.length; i++) {
    cumulative += weights[i];
    if (rand <= cumulative) return statuses[i];
  }
  return 'active';
}

async function main() {
  console.log('🚀 Starting demo account seed...\n');

  // Check if enterprise exists
  const { data: enterprise, error: entError } = await supabase
    .from('enterprises')
    .select('id')
    .eq('id', ENTERPRISE_ID)
    .single();

  if (entError || !enterprise) {
    console.error('❌ Enterprise not found. Please run setup-demo-account.sql first.');
    process.exit(1);
  }

  console.log('✅ Enterprise found');

  // Delete existing vendors and contracts for demo account
  console.log('🗑️  Cleaning existing data...');
  await supabase.from('contracts').delete().eq('enterprise_id', ENTERPRISE_ID);
  await supabase.from('vendors').delete().eq('enterprise_id', ENTERPRISE_ID);
  console.log('✅ Cleaned existing data\n');

  // Create vendors
  console.log('👥 Creating vendors...');
  const vendorIds: Record<string, string> = {};

  for (const vendor of VENDORS) {
    const id = crypto.randomUUID();
    const { error } = await supabase.from('vendors').insert({
      id,
      enterprise_id: ENTERPRISE_ID,
      name: vendor.name,
      industry: vendor.industry,
      performance_rating: vendor.rating,
      total_spend: vendor.spend,
      status: 'active',
      risk_score: Math.floor(Math.random() * 30) + 10, // 10-40
      compliance_status: Math.random() > 0.1 ? 'compliant' : 'pending_review',
      created_by: DEMO_USER_ID,
      metadata: {
        contact_email: `contact@${vendor.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
        contact_phone: `+1-${Math.floor(Math.random() * 900 + 100)}-${Math.floor(Math.random() * 900 + 100)}-${Math.floor(Math.random() * 9000 + 1000)}`,
        website: `https://www.${vendor.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
      },
    });

    if (error) {
      console.error(`Error creating vendor ${vendor.name}:`, error.message);
    } else {
      vendorIds[vendor.name] = id;
      console.log(`  ✓ ${vendor.name}`);
    }
  }

  console.log(`✅ Created ${Object.keys(vendorIds).length} vendors\n`);

  // Create contracts
  console.log('📄 Creating contracts...');
  let contractCount = 0;

  for (let i = 0; i < 100; i++) {
    const vendor = VENDORS[i % VENDORS.length];
    const vendorId = vendorIds[vendor.name];
    const contractType = CONTRACT_TYPES[Math.floor(Math.random() * CONTRACT_TYPES.length)];

    const value = vendor.spend * (0.5 + Math.random() * 1.5);
    const duration = [12, 24, 36, 48][Math.floor(Math.random() * 4)];
    const startDate = randomDate(730, 30);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + duration);

    let content = contractType.template(vendor.name, Math.floor(value), duration);
    if (typeof content === 'function') {
      content = content(vendor.name, Math.floor(value), duration);
    }
    content = content.replace('{date}', startDate);

    const status = randomStatus();

    const { error } = await supabase.from('contracts').insert({
      id: crypto.randomUUID(),
      enterprise_id: ENTERPRISE_ID,
      vendor_id: vendorId,
      title: `${contractType.type} - ${vendor.name}`,
      type: contractType.type,
      status,
      value: Math.floor(value),
      start_date: startDate,
      end_date: endDate.toISOString().split('T')[0],
      renewal_date: status === 'pending_renewal' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : null,
      content,
      created_by: DEMO_USER_ID,
      metadata: {
        auto_renew: Math.random() > 0.3,
        payment_terms: value > 100000 ? 'Net 45' : 'Net 30',
        currency: 'USD',
        department: ['Engineering', 'Sales', 'Marketing', 'Finance', 'IT'][Math.floor(Math.random() * 5)],
      },
    });

    if (error) {
      console.error(`Error creating contract ${i + 1}:`, error.message);
    } else {
      contractCount++;
      if ((contractCount % 10) === 0) {
        console.log(`  ✓ Created ${contractCount} contracts...`);
      }
    }
  }

  console.log(`✅ Created ${contractCount} contracts\n`);
  console.log('🎉 Demo account seed complete!');
  console.log(`\n📊 Summary:`);
  console.log(`   - Vendors: ${Object.keys(vendorIds).length}`);
  console.log(`   - Contracts: ${contractCount}`);
  console.log(`   - Total Contract Value: $${VENDORS.reduce((sum, v) => sum + v.spend, 0).toLocaleString()}`);
}

main().catch(console.error);
