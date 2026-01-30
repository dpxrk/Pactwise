/**
 * Legal Agent Test Fixtures
 *
 * Annotated contract samples for testing the Legal Agent's analysis capabilities.
 * Each fixture includes the contract content and expected analysis outcomes.
 */

// ==================== NDA Contract ====================

export const mockNDAContent = `
NON-DISCLOSURE AGREEMENT

This Non-Disclosure Agreement ("Agreement") is entered into as of January 1, 2024
by and between:

ABC Corporation ("Disclosing Party")
and
XYZ Services Inc. ("Receiving Party")

1. DEFINITION OF CONFIDENTIAL INFORMATION

"Confidential Information" means any non-public information disclosed by the
Disclosing Party to the Receiving Party, whether orally, in writing, or by
inspection, including but not limited to:

- Trade secrets and proprietary data
- Business plans and strategies
- Customer lists and data
- Technical specifications and designs
- Financial information and projections

2. OBLIGATIONS OF RECEIVING PARTY

The Receiving Party shall:
a) Hold Confidential Information in strict confidence
b) Not disclose Confidential Information to any third party
c) Use Confidential Information solely for the Purpose
d) Protect Confidential Information with reasonable care

3. TERM AND TERMINATION

This Agreement shall remain in effect for a period of three (3) years from
the Effective Date. The confidentiality obligations shall survive termination
for an additional five (5) years.

4. LIMITATION OF LIABILITY

Neither party shall be liable for indirect, incidental, or consequential
damages arising under this Agreement. Maximum liability is capped at $100,000.

5. GOVERNING LAW

This Agreement shall be governed by the laws of the State of California.

6. DISPUTE RESOLUTION

Any disputes shall be resolved through binding arbitration in San Francisco.
`;

export const mockNDAExpectedAnalysis = {
  documentType: 'nda',
  clauses: ['confidentiality', 'termination', 'limitation_of_liability', 'governing_law', 'dispute_resolution'],
  protections: {
    limitationOfLiability: true,
    confidentialityProtection: true,
    disputeResolution: true,
  },
  redFlags: [],
  missingClauses: [],
};

// ==================== Master Service Agreement ====================

export const mockMSAContent = `
MASTER SERVICE AGREEMENT

This Master Service Agreement ("MSA") is entered into as of January 1, 2024
by and between:

Customer Corp ("Customer")
and
Service Provider Inc. ("Provider")

RECITALS

WHEREAS, Provider is engaged in the business of providing software development
and consulting services; and

WHEREAS, Customer desires to engage Provider to perform certain services.

NOW, THEREFORE, in consideration of the mutual covenants herein, the parties agree:

ARTICLE 1: DEFINITIONS

1.1 "Services" means the software development, consulting, and support services
to be provided by Provider under individual Statements of Work.

1.2 "Deliverables" means all work product created by Provider under this Agreement.

ARTICLE 2: SERVICES AND DELIVERABLES

2.1 Provider shall perform Services as set forth in executed Statements of Work.
2.2 All Deliverables shall meet the specifications in the applicable SOW.

ARTICLE 3: FEES AND PAYMENT

3.1 Customer shall pay Provider the fees set forth in each SOW.
3.2 Payment Terms: Net 30 from invoice date.
3.3 Late payments shall accrue interest at 1.5% per month.

ARTICLE 4: INTELLECTUAL PROPERTY

4.1 All intellectual property created under this Agreement shall be owned by Customer.
4.2 Provider grants Customer a perpetual license to any pre-existing IP used.

ARTICLE 5: CONFIDENTIALITY

5.1 Both parties shall maintain the confidentiality of proprietary information.
5.2 Confidentiality obligations survive termination for three (3) years.

ARTICLE 6: REPRESENTATIONS AND WARRANTIES

6.1 Provider warrants that Services will be performed in a professional manner.
6.2 Provider warrants compliance with all applicable laws and regulations.

ARTICLE 7: INDEMNIFICATION

7.1 Each party shall indemnify and hold harmless the other party from claims
arising from its breach of this Agreement or negligent acts.

ARTICLE 8: LIMITATION OF LIABILITY

8.1 NEITHER PARTY SHALL BE LIABLE FOR ANY INDIRECT, INCIDENTAL, CONSEQUENTIAL,
OR PUNITIVE DAMAGES.

8.2 Maximum liability shall not exceed the total fees paid in the prior 12 months.

ARTICLE 9: TERM AND TERMINATION

9.1 This Agreement shall have an initial term of one (1) year.
9.2 Either party may terminate with 30 days written notice.
9.3 Customer may terminate for cause if Provider materially breaches this Agreement.

ARTICLE 10: GOVERNING LAW AND DISPUTE RESOLUTION

10.1 This Agreement shall be governed by the laws of Delaware.
10.2 Disputes shall be resolved through mediation, then binding arbitration.

ARTICLE 11: DATA PROTECTION

11.1 Provider shall comply with GDPR, CCPA, and all applicable data protection laws.
11.2 Provider shall implement appropriate technical and organizational security measures.

ARTICLE 12: FORCE MAJEURE

12.1 Neither party shall be liable for failure to perform due to acts of God,
war, terrorism, labor disputes, or other events beyond reasonable control.

ARTICLE 13: GENERAL PROVISIONS

13.1 This Agreement constitutes the entire agreement between the parties.
13.2 Amendments must be in writing signed by both parties.
13.3 Neither party may assign without prior written consent.
`;

export const mockMSAExpectedAnalysis = {
  documentType: 'msa',
  clauses: [
    'confidentiality',
    'indemnification',
    'limitation_of_liability',
    'termination',
    'governing_law',
    'dispute_resolution',
    'force_majeure',
    'warranty',
  ],
  protections: {
    limitationOfLiability: true,
    capOnDamages: true,
    rightToTerminate: true,
    disputeResolution: true,
    intellectualPropertyRights: true,
    confidentialityProtection: true,
    dataProtection: true,
  },
  redFlags: [],
  regulations: ['GDPR', 'CCPA'],
};

// ==================== Statement of Work ====================

export const mockSOWContent = `
STATEMENT OF WORK #001

This Statement of Work ("SOW") is executed pursuant to the Master Service Agreement
dated January 1, 2024 between Customer Corp and Service Provider Inc.

PROJECT: Enterprise Software Development

1. SCOPE OF WORK

Provider shall develop and deliver the following:

1.1 Custom web application with the following features:
    - User authentication and authorization
    - Dashboard with real-time analytics
    - API integrations with third-party services
    - Mobile-responsive design

1.2 Technical documentation including:
    - System architecture documentation
    - API documentation
    - User guides

2. DELIVERABLES AND MILESTONES

Milestone 1: Requirements and Design (Week 1-2)
- Requirements document
- System design specifications
- UI/UX mockups

Milestone 2: Development Phase 1 (Week 3-6)
- Core functionality
- Database schema
- API endpoints

Milestone 3: Development Phase 2 (Week 7-10)
- Integration testing
- User acceptance testing
- Bug fixes

Milestone 4: Deployment (Week 11-12)
- Production deployment
- Knowledge transfer
- Go-live support

3. PROJECT TIMELINE

Start Date: February 1, 2024
End Date: April 30, 2024
Duration: 12 weeks

4. FEES AND PAYMENT SCHEDULE

Total Project Fee: $150,000

Payment Schedule:
- 25% upon SOW execution: $37,500
- 25% upon Milestone 2 completion: $37,500
- 25% upon Milestone 3 completion: $37,500
- 25% upon final acceptance: $37,500

5. ASSUMPTIONS AND DEPENDENCIES

5.1 Customer shall provide timely feedback within 5 business days.
5.2 Customer shall provide access to necessary systems and data.
5.3 Scope changes require written Change Order approval.

6. ACCEPTANCE CRITERIA

6.1 All deliverables meet functional specifications.
6.2 System passes all test cases with 95% coverage.
6.3 No critical or high-severity defects remain open.

7. KEY PERSONNEL

Project Manager: John Smith
Technical Lead: Jane Doe
`;

export const mockSOWExpectedAnalysis = {
  documentType: 'sow',
  clauses: [],
  protections: {},
  obligations: ['provide timely feedback', 'provide access to necessary systems'],
};

// ==================== Software License Agreement ====================

export const mockLicenseAgreementContent = `
SOFTWARE LICENSE AGREEMENT

This Software License Agreement ("Agreement") is entered into as of January 1, 2024.

LICENSOR: SoftwareCo Inc.
LICENSEE: Enterprise Corp

1. GRANT OF LICENSE

1.1 Licensor hereby grants to Licensee a non-exclusive, non-transferable license
to use the Software known as "Enterprise Suite" subject to the terms herein.

1.2 License Scope:
    - Number of Users: Up to 500 concurrent users
    - Territory: Worldwide
    - Term: Perpetual (subject to payment)

2. LICENSE FEE

2.1 Annual License Fee: $250,000
2.2 Annual Maintenance and Support: $50,000
2.3 Payment due within 30 days of invoice date.

3. INTELLECTUAL PROPERTY

3.1 Licensor retains all intellectual property rights in the Software.
3.2 Licensee receives no ownership rights under this Agreement.
3.3 Licensee shall not reverse engineer, decompile, or disassemble the Software.

4. WARRANTY

4.1 Licensor warrants that the Software will perform substantially in accordance
with the documentation for a period of 90 days from delivery.

4.2 WARRANTY DISCLAIMER: EXCEPT AS EXPRESSLY SET FORTH ABOVE, THE SOFTWARE IS
PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND.

5. LIMITATION OF LIABILITY

5.1 IN NO EVENT SHALL LICENSOR BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
CONSEQUENTIAL, OR PUNITIVE DAMAGES.

5.2 LICENSOR'S TOTAL LIABILITY SHALL NOT EXCEED THE LICENSE FEES PAID IN THE
PRECEDING 12 MONTHS.

6. SUPPORT AND MAINTENANCE

6.1 Licensor shall provide technical support during business hours.
6.2 Licensor shall provide bug fixes and security patches.
6.3 Major version upgrades may be subject to additional fees.

7. CONFIDENTIALITY

7.1 Both parties shall maintain the confidentiality of the other's proprietary
information disclosed in connection with this Agreement.

8. TERMINATION

8.1 Either party may terminate for material breach with 30 days notice.
8.2 Upon termination, Licensee shall cease all use of the Software.
8.3 Licensor may terminate immediately if Licensee fails to pay fees.

9. GOVERNING LAW

This Agreement shall be governed by the laws of the State of New York.
`;

export const mockLicenseAgreementExpectedAnalysis = {
  documentType: 'license',
  clauses: [
    'warranty',
    'limitation_of_liability',
    'confidentiality',
    'termination',
    'governing_law',
  ],
  protections: {
    limitationOfLiability: true,
    capOnDamages: true,
    warrantyDisclaimer: true,
    intellectualPropertyRights: true,
    rightToTerminate: true,
    confidentialityProtection: true,
  },
};

// ==================== Employment Contract ====================

export const mockEmploymentContractContent = `
EMPLOYMENT AGREEMENT

This Employment Agreement ("Agreement") is entered into as of January 1, 2024.

EMPLOYER: TechCorp Inc.
EMPLOYEE: John Doe

1. POSITION AND DUTIES

1.1 Employer hereby employs Employee as Senior Software Engineer.
1.2 Employee shall perform duties as assigned by Employer.
1.3 Employee shall devote full-time attention to Employer's business.

2. COMPENSATION

2.1 Base Salary: $180,000 per annum
2.2 Payment Schedule: Bi-weekly
2.3 Bonus: Eligible for annual performance bonus up to 20% of base salary.

3. BENEFITS

3.1 Health insurance coverage
3.2 401(k) retirement plan with 4% employer match
3.3 Paid time off: 20 days per year
3.4 Stock options as per separate grant agreement

4. TERM

4.1 Employment shall be at-will.
4.2 Either party may terminate at any time with 2 weeks notice.

5. CONFIDENTIALITY

5.1 Employee shall maintain strict confidentiality of all proprietary information.
5.2 Confidentiality obligations survive termination indefinitely.

6. INTELLECTUAL PROPERTY

6.1 All work product created during employment belongs to Employer.
6.2 Employee assigns all intellectual property rights to Employer.

7. NON-COMPETE

7.1 Employee agrees not to compete with Employer for 12 months after termination
within a 50-mile radius.

8. NON-SOLICITATION

8.1 Employee shall not solicit Employer's employees or customers for 12 months
after termination.

9. GOVERNING LAW

This Agreement shall be governed by the laws of the State of Texas.
`;

export const mockEmploymentContractExpectedAnalysis = {
  documentType: 'employment',
  clauses: ['confidentiality', 'termination', 'governing_law'],
  protections: {
    confidentialityProtection: true,
    intellectualPropertyRights: true,
    rightToTerminate: true,
  },
  redFlags: [
    { flag: 'Non-compete clause', severity: 'high' },
    { flag: 'Perpetual obligations', severity: 'high' },
  ],
};

// ==================== Edge Case: Malformed Content ====================

export const mockMalformedContent = `
{{{BROKEN JSON}}}
This is not properly formatted content
<xml>also broken</xml>
null undefined NaN
[object Object]
`;

// ==================== Edge Case: Unicode Content ====================

export const mockUnicodeContent = `
VERTRAG (Vereinbarung)

Diese Vereinbarung wird am 1. Januar 2024 geschlossen zwischen:

ABC GmbH (Auftraggeber)
und
XYZ Dienstleistungen AG (Auftragnehmer)

1. HAFTUNGSBESCHRÄNKUNG

Die Haftung der Parteien ist auf den Vertragswert beschränkt.
Limitation of liability applies to both parties.

2. KÜNDIGUNG (Termination)

Jede Partei kann mit einer Frist von 30 Tagen kündigen.
Either party may terminate with 30 days notice.

3. VERTRAULICHKEIT (Confidentiality)

Alle vertraulichen Informationen sind zu schützen.

签名 (Signature): _______________
日期 (Date): _______________
`;

// ==================== Edge Case: Empty Content ====================

export const mockEmptyContent = '';

// ==================== Edge Case: Very Long Content ====================

export const mockVeryLongContent = `
MASTER SERVICE AGREEMENT

${Array(1000).fill(`
Section X: Standard Terms

This is a standard section that contains typical contract language.
The vendor shall provide services in accordance with industry standards.
The customer shall pay for services within 30 days of invoice.
Limitation of liability applies to both parties under this agreement.
Confidentiality obligations apply to all proprietary information.

`).join('')}
`;

// ==================== Edge Case: Multi-Party Contract ====================

export const mockMultiPartyContent = `
CONSORTIUM AGREEMENT

This Agreement is entered into as of January 1, 2024 by and among:

Party A: Alpha Corporation ("Alpha")
Party B: Beta Industries LLC ("Beta")
Party C: Gamma Holdings Inc. ("Gamma")
Party D: Delta Services Ltd. ("Delta")

RECITALS

WHEREAS, the parties wish to collaborate on the "Enterprise Project";
WHEREAS, each party brings unique capabilities to the consortium;

NOW, THEREFORE, the parties agree as follows:

1. OBLIGATIONS OF EACH PARTY

1.1 Alpha shall provide project management services.
1.2 Beta shall provide technical development services.
1.3 Gamma shall provide financial backing and investment.
1.4 Delta shall provide marketing and sales services.

2. REVENUE SHARING

Revenue shall be distributed as follows:
- Alpha: 25%
- Beta: 35%
- Gamma: 20%
- Delta: 20%

3. JOINT AND SEVERAL LIABILITY

Each party shall be jointly and severally liable for the obligations
of the consortium to third parties.

4. TERMINATION

Any party may withdraw with 90 days notice, subject to fulfilling
existing obligations.

5. DISPUTE RESOLUTION

Disputes among the parties shall be resolved through mediation,
followed by binding arbitration if necessary.
`;

// ==================== Test Fixtures Registry ====================

export interface ContractFixture {
  name: string;
  content: string;
  expectedDocumentType: string;
  expectedClauses: string[];
  expectedProtections: Record<string, boolean>;
  expectedRedFlags: Array<{ flag: string; severity: string }>;
  expectedRegulations?: string[];
}

export const contractFixtures: ContractFixture[] = [
  {
    name: 'NDA',
    content: mockNDAContent,
    expectedDocumentType: 'nda',
    expectedClauses: ['confidentiality', 'termination', 'limitation_of_liability', 'governing_law', 'dispute_resolution'],
    expectedProtections: {
      limitationOfLiability: true,
      confidentialityProtection: true,
      disputeResolution: true,
    },
    expectedRedFlags: [],
  },
  {
    name: 'MSA',
    content: mockMSAContent,
    expectedDocumentType: 'msa',
    expectedClauses: ['confidentiality', 'indemnification', 'limitation_of_liability', 'termination'],
    expectedProtections: {
      limitationOfLiability: true,
      rightToTerminate: true,
      disputeResolution: true,
      intellectualPropertyRights: true,
      confidentialityProtection: true,
      dataProtection: true,
    },
    expectedRedFlags: [],
    expectedRegulations: ['GDPR', 'CCPA'],
  },
  {
    name: 'SOW',
    content: mockSOWContent,
    expectedDocumentType: 'sow',
    // SOWs typically reference parent MSA and don't contain standalone legal clauses
    expectedClauses: [],
    expectedProtections: {},
    expectedRedFlags: [],
  },
  {
    name: 'License Agreement',
    content: mockLicenseAgreementContent,
    expectedDocumentType: 'license',
    expectedClauses: ['warranty', 'limitation_of_liability', 'confidentiality', 'termination'],
    expectedProtections: {
      limitationOfLiability: true,
      warrantyDisclaimer: true,
      rightToTerminate: true,
      confidentialityProtection: true,
    },
    expectedRedFlags: [],
  },
  {
    name: 'Employment Contract',
    content: mockEmploymentContractContent,
    expectedDocumentType: 'employment',
    expectedClauses: ['confidentiality', 'termination'],
    expectedProtections: {
      confidentialityProtection: true,
      intellectualPropertyRights: true,
    },
    expectedRedFlags: [
      { flag: 'Non-compete clause', severity: 'high' },
      { flag: 'Perpetual obligations', severity: 'high' },
    ],
  },
];

// ==================== Accuracy Benchmark Data ====================

export interface ClauseGroundTruth {
  type: string;
  startIndex: number;
  endIndex: number;
  text: string;
  risk: 'low' | 'medium' | 'high';
}

export interface AccuracyBenchmark {
  name: string;
  content: string;
  groundTruth: {
    clauses: ClauseGroundTruth[];
    protections: Record<string, boolean>;
    redFlags: Array<{ flag: string; severity: string }>;
    regulations: string[];
  };
}

// Ground truth for MSA accuracy testing
export const msaAccuracyBenchmark: AccuracyBenchmark = {
  name: 'MSA Accuracy Benchmark',
  content: mockMSAContent,
  groundTruth: {
    clauses: [
      {
        type: 'confidentiality',
        startIndex: mockMSAContent.indexOf('ARTICLE 5: CONFIDENTIALITY'),
        endIndex: mockMSAContent.indexOf('ARTICLE 6'),
        text: mockMSAContent.slice(
          mockMSAContent.indexOf('ARTICLE 5: CONFIDENTIALITY'),
          mockMSAContent.indexOf('ARTICLE 6'),
        ),
        risk: 'medium',
      },
      {
        type: 'indemnification',
        startIndex: mockMSAContent.indexOf('ARTICLE 7: INDEMNIFICATION'),
        endIndex: mockMSAContent.indexOf('ARTICLE 8'),
        text: mockMSAContent.slice(
          mockMSAContent.indexOf('ARTICLE 7: INDEMNIFICATION'),
          mockMSAContent.indexOf('ARTICLE 8'),
        ),
        risk: 'medium',
      },
      {
        type: 'limitation_of_liability',
        startIndex: mockMSAContent.indexOf('ARTICLE 8: LIMITATION OF LIABILITY'),
        endIndex: mockMSAContent.indexOf('ARTICLE 9'),
        text: mockMSAContent.slice(
          mockMSAContent.indexOf('ARTICLE 8: LIMITATION OF LIABILITY'),
          mockMSAContent.indexOf('ARTICLE 9'),
        ),
        risk: 'high',
      },
      {
        type: 'termination',
        startIndex: mockMSAContent.indexOf('ARTICLE 9: TERM AND TERMINATION'),
        endIndex: mockMSAContent.indexOf('ARTICLE 10'),
        text: mockMSAContent.slice(
          mockMSAContent.indexOf('ARTICLE 9: TERM AND TERMINATION'),
          mockMSAContent.indexOf('ARTICLE 10'),
        ),
        risk: 'medium',
      },
    ],
    protections: {
      limitationOfLiability: true,
      capOnDamages: true,
      rightToTerminate: true,
      disputeResolution: true,
      intellectualPropertyRights: true,
      confidentialityProtection: true,
      dataProtection: true,
      warrantyDisclaimer: false,
    },
    redFlags: [],
    regulations: ['GDPR', 'CCPA'],
  },
};

// ==================== Utility Functions ====================

/**
 * Calculate precision for clause detection
 */
export function calculatePrecision(
  detected: string[],
  groundTruth: string[],
): number {
  if (detected.length === 0) return 0;
  const truePositives = detected.filter(d => groundTruth.includes(d)).length;
  return truePositives / detected.length;
}

/**
 * Calculate recall for clause detection
 */
export function calculateRecall(
  detected: string[],
  groundTruth: string[],
): number {
  if (groundTruth.length === 0) return 1;
  const truePositives = detected.filter(d => groundTruth.includes(d)).length;
  return truePositives / groundTruth.length;
}

/**
 * Calculate F1 score from precision and recall
 */
export function calculateF1Score(precision: number, recall: number): number {
  if (precision + recall === 0) return 0;
  return (2 * precision * recall) / (precision + recall);
}
