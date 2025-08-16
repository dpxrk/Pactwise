// Random Sample Contract Generators for Demos

// Company name generators
const techCompanies = [
  'TechVault Solutions', 'CloudPeak Systems', 'DataStream Inc', 'NexusPoint Technologies',
  'QuantumBridge Corp', 'SkyNet Analytics', 'CyberCore Systems', 'InnovateTech Solutions',
  'FutureScale Inc', 'DigitalForge Technologies', 'SmartWave Systems', 'TechNova Corp',
  'CloudMatrix Solutions', 'DataPulse Technologies', 'SecureNet Systems', 'ByteForce Inc'
];

const enterpriseCompanies = [
  'Global Dynamics Corporation', 'Meridian Enterprises', 'Apex Industries', 'Titan Corporation',
  'Pinnacle Global', 'Summit Holdings', 'Vanguard Enterprises', 'Nexus International',
  'Atlas Corporation', 'Phoenix Group', 'Horizon Industries', 'Sterling Enterprises'
];

const healthcareOrgs = [
  'Regional Medical Center', 'St. Mary\'s Healthcare', 'Unity Health Systems', 'Mercy General Hospital',
  'Northwest Medical Group', 'CarePoint Health', 'HealthBridge Medical', 'MedTech Solutions'
];

// Random data generators
const getRandomElement = <T>(array: T[]): T => array[Math.floor(Math.random() * array.length)];
const getRandomNumber = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;
const getRandomDate = (startDays: number, endDays: number): string => {
  const start = new Date();
  start.setDate(start.getDate() + startDays);
  const end = new Date();
  end.setDate(end.getDate() + endDays);
  const randomDate = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return randomDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

// GDPR Compliance Contract Generator
export const generateGDPRContract = (): string => {
  const controller = getRandomElement(enterpriseCompanies);
  const processor = getRandomElement(techCompanies);
  const effectiveDate = getRandomDate(0, 30);
  const breachHours = getRandomElement([24, 48, 72]);
  const auditFrequency = getRandomElement(['monthly', 'quarterly', 'bi-annually', 'annually']);
  const retentionDays = getRandomElement([30, 60, 90, 180, 365]);
  
  const gdprClauses = [
    `1. GDPR COMPLIANCE
The Processor shall comply with all applicable requirements of the General Data Protection Regulation (EU) 2016/679 and any successor legislation.`,
    
    `2. DATA SUBJECT RIGHTS
The Processor shall assist the Controller in responding to data subject requests including access, rectification, erasure, data portability, and restriction of processing within ${getRandomElement(['24 hours', '48 hours', '3 business days'])}.`,
    
    `3. SECURITY MEASURES
The Processor shall implement appropriate technical and organizational measures including ${getRandomElement(['AES-256 encryption', 'end-to-end encryption', 'military-grade encryption'])}, pseudonymization, regular security testing, and ${getRandomElement(['ISO 27001 certification', 'SOC 2 compliance', 'continuous security monitoring'])}.`,
    
    `4. DATA BREACH NOTIFICATION
The Processor shall notify the Controller without undue delay and in any event within ${breachHours} hours after becoming aware of a personal data breach, providing full details of the incident and remediation steps.`,
    
    `5. SUBPROCESSORS
${getRandomElement([
  'The Processor shall not engage any subprocessor without prior written consent from the Controller.',
  'The Processor may engage subprocessors with 30 days prior notice to the Controller.',
  'Pre-approved subprocessors are listed in Annex II and may be updated with Controller approval.'
])}`,
    
    `6. CROSS-BORDER TRANSFERS
${getRandomElement([
  'Any transfer of personal data outside the EEA shall be subject to Standard Contractual Clauses.',
  'Data transfers shall only occur to countries with adequate data protection levels.',
  'No cross-border transfers permitted without explicit Controller authorization.'
])}`,
    
    `7. DATA RETENTION AND DELETION
Personal data shall be retained for no longer than ${retentionDays} days after contract termination and shall be securely deleted using ${getRandomElement(['DoD 5220.22-M standard', 'NIST 800-88 guidelines', 'certified data destruction'])}.`,
    
    `8. AUDIT RIGHTS
The Controller reserves the right to conduct compliance audits ${auditFrequency}, with ${getRandomElement(['7 days', '14 days', '30 days'])} advance notice.`,

    `9. LIABILITY AND INDEMNIFICATION
${getRandomElement([
  'Each party\'s liability is limited to direct damages up to the annual contract value.',
  'Processor shall indemnify Controller for any GDPR violations resulting from Processor\'s actions.',
  'Liability cap shall not apply to data protection violations or gross negligence.'
])}`
  ];

  return `DATA PROCESSING AGREEMENT

Effective Date: ${effectiveDate}
Data Controller: ${controller}
Data Processor: ${processor}

${gdprClauses.join('\n\n')}

10. DATA PROTECTION OFFICER
${getRandomElement([
  `Processor has appointed a DPO reachable at dpo@${processor.toLowerCase().replace(/\s+/g, '')}.com`,
  'Both parties shall maintain designated Data Protection Officers.',
  'DPO contact information shall be exchanged within 7 days of agreement execution.'
])}`;
};

// SaaS Agreement Generator
export const generateSaaSContract = (): string => {
  const provider = getRandomElement(techCompanies);
  const customer = getRandomElement(enterpriseCompanies);
  const effectiveDate = getRandomDate(0, 30);
  const uptime = getRandomElement(['99.5%', '99.9%', '99.95%', '99.99%']);
  const supportLevel = getRandomElement(['8x5', '16x5', '24x5', '24x7']);
  const rto = getRandomNumber(1, 8);
  const rpo = getRandomNumber(1, 4);
  
  return `SOFTWARE AS A SERVICE AGREEMENT

Provider: ${provider}
Customer: ${customer}
Effective Date: ${effectiveDate}
Contract Term: ${getRandomElement(['1 year', '2 years', '3 years'])}

1. SERVICE LEVELS
Provider guarantees ${uptime} uptime availability measured monthly, with service credits of ${getRandomElement(['5%', '10%', '15%'])} for each 1% below SLA.

2. SECURITY & COMPLIANCE
Provider implements ${getRandomElement(['enterprise-grade', 'military-grade', 'bank-level'])} security including:
- ${getRandomElement(['SOC 2 Type II', 'ISO 27001', 'SOC 2 Type II and ISO 27001'])} certification
- Encryption at rest (${getRandomElement(['AES-256', 'AES-512'])}) and in transit (${getRandomElement(['TLS 1.3', 'TLS 1.2+'])})
- ${getRandomElement(['Weekly', 'Monthly', 'Quarterly'])} vulnerability assessments and penetration testing
- ${getRandomElement(['Real-time', '24-hour', 'Continuous'])} security monitoring

3. DATA PRIVACY & OWNERSHIP
- Customer retains all rights to their data
- Provider complies with ${getRandomElement(['GDPR and CCPA', 'GDPR, CCPA, and PIPEDA', 'all applicable privacy regulations'])}
- Data residency: ${getRandomElement(['US only', 'EU only', 'Customer-selected region', 'Global with restrictions'])}
- ${getRandomElement(['Immediate', '30-day', '90-day'])} data purge upon contract termination

4. INCIDENT RESPONSE
- Initial response within ${getRandomElement(['15 minutes', '30 minutes', '1 hour'])} for critical issues
- Dedicated incident commander for P1 incidents
- Root cause analysis provided within ${getRandomElement(['24 hours', '48 hours', '72 hours'])}
- ${getRandomElement(['Real-time', 'Hourly', '30-minute'])} status updates during incidents

5. ACCESS CONTROLS
- ${getRandomElement(['SAML 2.0', 'OAuth 2.0', 'SAML 2.0 and OAuth 2.0'])} SSO integration
- Multi-factor authentication ${getRandomElement(['required', 'available', 'enforced for admin accounts'])}
- Role-based access control with ${getRandomElement(['unlimited', '10', '25'])} custom roles
- Audit logs retained for ${getRandomElement(['90 days', '180 days', '365 days', '7 years'])}

6. BUSINESS CONTINUITY
- Recovery Time Objective (RTO): ${rto} hours
- Recovery Point Objective (RPO): ${rpo} hour${rpo > 1 ? 's' : ''}
- ${getRandomElement(['Hot', 'Warm', 'Cold'])} standby disaster recovery site
- Backup frequency: ${getRandomElement(['Every 15 minutes', 'Hourly', 'Every 4 hours', 'Daily'])}

7. SUPPORT & MAINTENANCE
- ${supportLevel} technical support via ${getRandomElement(['phone, email, and chat', 'dedicated slack channel', 'all channels'])}
- ${getRandomElement(['Unlimited', '10', '5'])} named support contacts
- Response time: ${getRandomElement(['1 hour', '2 hours', '4 hours'])} for critical issues
- ${getRandomElement(['Monthly', 'Quarterly', 'Weekly'])} service reviews

8. PRICING & PAYMENT
- ${getRandomElement(['Per-user', 'Flat-rate', 'Usage-based', 'Tiered'])} pricing model
- Payment terms: ${getRandomElement(['Net 30', 'Net 45', 'Net 60', 'Annual prepay'])}
- Price protection: ${getRandomElement(['3-year lock', '5% annual cap', 'CPI-based increases only'])}
- ${getRandomElement(['No', '30-day', '90-day'])} auto-renewal clause

9. WARRANTIES & LIMITATIONS
- Provider warrants services will perform materially as documented
- ${getRandomElement(['Mutual', 'Provider', 'Limited'])} indemnification for IP claims
- Liability limited to ${getRandomElement(['12 months fees', '6 months fees', 'total contract value'])}
- Consequential damages ${getRandomElement(['excluded', 'excluded except for data breaches', 'included'])}

10. TERMINATION
- ${getRandomElement(['30', '60', '90'])} days notice for termination without cause
- Immediate termination for material breach not cured within ${getRandomElement(['15', '30', '45'])} days
- Data export provided in ${getRandomElement(['JSON', 'CSV', 'Customer-specified'])} format`;
};

// Healthcare BAA Generator
export const generateHealthcareContract = (): string => {
  const coveredEntity = getRandomElement(healthcareOrgs);
  const businessAssociate = getRandomElement(techCompanies);
  const effectiveDate = getRandomDate(0, 30);
  
  return `BUSINESS ASSOCIATE AGREEMENT

Covered Entity: ${coveredEntity}
Business Associate: ${businessAssociate}
Effective Date: ${effectiveDate}

1. HIPAA COMPLIANCE
Business Associate agrees to comply with the Health Insurance Portability and Accountability Act (HIPAA), the HITECH Act, and all applicable regulations including ${getRandomElement(['45 CFR Parts 160 and 164', 'the HIPAA Security Rule and Privacy Rule', 'all HIPAA omnibus rule requirements'])}.

2. PROTECTED HEALTH INFORMATION (PHI)
- Business Associate shall not use or disclose PHI except as permitted by this Agreement
- Implement ${getRandomElement(['administrative, physical, and technical', 'comprehensive', 'NIST-compliant'])} safeguards
- Report any use or disclosure not provided for by this Agreement within ${getRandomElement(['24 hours', '48 hours', 'immediately upon discovery'])}
- Ensure any agents or subcontractors agree to the same restrictions

3. MINIMUM NECESSARY STANDARD
Business Associate shall:
- Limit PHI access to the minimum necessary for the intended purpose
- Implement ${getRandomElement(['role-based', 'attribute-based', 'mandatory'])} access controls
- Maintain access logs for ${getRandomElement(['6 years', '7 years', '10 years'])}
- Conduct ${getRandomElement(['quarterly', 'annual', 'bi-annual'])} access reviews

4. SECURITY SAFEGUARDS
Required security measures include:
- Encryption: ${getRandomElement(['AES-256', 'FIPS 140-2 Level 2', 'NIST-approved algorithms'])} for data at rest
- Transmission: ${getRandomElement(['TLS 1.3', 'VPN with AES encryption', 'SFTP with SSH keys'])} for data in transit
- Authentication: ${getRandomElement(['Multi-factor', 'Biometric', 'Smart card'])} authentication required
- Physical security: ${getRandomElement(['24/7 monitoring', 'Biometric access controls', 'SOC 2 certified data centers'])}

5. BREACH NOTIFICATION
- Notify Covered Entity within ${getRandomElement(['24 hours', '48 hours', '60 hours'])} of discovering a breach
- Provide detailed incident report including:
  • Nature of PHI involved
  • ${getRandomElement(['Individuals affected', 'Root cause analysis', 'Forensic investigation results'])}
  • Mitigation steps taken
  • Recommendations for preventing future incidents
- Maintain breach log for ${getRandomElement(['6 years', '7 years', 'indefinitely'])}

6. AUDIT CONTROLS & MONITORING
- Comprehensive audit logging of all PHI access and modifications
- ${getRandomElement(['Real-time', 'Daily', 'Continuous'])} log monitoring and alerting
- Log retention period: ${getRandomElement(['6 years', '7 years', '10 years'])}
- ${getRandomElement(['Monthly', 'Quarterly', 'Annual'])} audit reports provided to Covered Entity
- Support for Covered Entity's compliance audits with ${getRandomElement(['7', '14', '30'])} days notice

7. SUBCONTRACTORS
${getRandomElement([
  'No subcontractors permitted without prior written approval and executed BAA',
  'Pre-approved subcontractors listed in Exhibit A with signed BAAs',
  'Subcontractors permitted with 30-day notice and equivalent BAA terms'
])}

8. DATA RETENTION & DISPOSAL
- PHI retained only as required for business purposes or legal requirements
- Secure disposal using ${getRandomElement(['NIST 800-88', 'DoD 5220.22-M', 'HHS-approved'])} methods
- Certificate of destruction provided within ${getRandomElement(['30', '45', '60'])} days
- ${getRandomElement(['Annual', 'Bi-annual', 'Upon request'])} retention policy review

9. INDIVIDUAL RIGHTS
Business Associate shall assist Covered Entity in responding to:
- Access requests within ${getRandomElement(['15', '20', '30'])} days
- Amendment requests within ${getRandomElement(['30', '45', '60'])} days
- Accounting of disclosures covering ${getRandomElement(['6 years', '3 years', 'entire retention period'])}
- ${getRandomElement(['Restriction requests', 'All HIPAA-mandated individual rights', 'Right to data portability'])}

10. TRAINING & AWARENESS
- ${getRandomElement(['Annual', 'Bi-annual', 'Quarterly'])} HIPAA training for all staff with PHI access
- Background checks for all personnel handling PHI
- Signed confidentiality agreements from all employees
- ${getRandomElement(['Immediate', 'Same-day', '24-hour'])} access revocation upon termination`;
};

// Negotiation Contract Generator
export const generateNegotiationContract = (): string => {
  const contractValue = getRandomNumber(200, 2000) * 1000;
  const currentPayment = getRandomElement([30, 45, 60, 90]);
  const desiredPayment = Math.max(15, currentPayment - getRandomNumber(15, 30));
  const currentSLA = getRandomElement([95, 96, 97, 98]);
  const desiredSLA = Math.min(99.9, currentSLA + getRandomNumber(1, 4));
  const currentSupport = getRandomElement(['Business hours only', '8x5', '12x5', '16x5']);
  const desiredSupport = '24x7';
  const priceCap = getRandomElement([3, 5, 7, 10]);
  
  return `CURRENT TERMS:
- Contract Value: $${contractValue.toLocaleString()}/year
- Payment Terms: Net ${currentPayment}
- Service Level: ${currentSLA}% uptime
- Support: ${currentSupport}
- Price Increases: ${getRandomElement(['Uncapped', '10% annual cap', 'CPI + 5%'])}
- Contract Length: ${getRandomElement(['1 year', '2 years'])}
- Termination: ${getRandomElement(['30', '60', '90', '120'])} days notice
- Auto-renewal: ${getRandomElement(['Yes - 90 days notice', 'Yes - 60 days notice', 'No auto-renewal'])}
- Liability Cap: ${getRandomElement(['Unlimited', '$1M', '$500K', 'Annual contract value'])}
- Data Export: ${getRandomElement(['Not specified', 'CSV only', 'Upon request - fees apply'])}

DESIRED TERMS:
- Contract Value: $${(contractValue * 0.85).toLocaleString()}/year
- Payment Terms: Net ${desiredPayment}
- Service Level: ${desiredSLA}% uptime
- Support: ${desiredSupport}
- Price Increases: ${priceCap}% annual cap
- Contract Length: 3 years
- Termination: 30 days notice
- Auto-renewal: No auto-renewal
- Liability Cap: $2M minimum
- Data Export: Free, automated, multiple formats

ADDITIONAL CONTEXT:
- Current vendor relationship: ${getRandomNumber(1, 5)} years
- Annual spend growth: ${getRandomNumber(20, 50)}% year-over-year
- Number of users: ${getRandomNumber(100, 1000)}
- Strategic importance: ${getRandomElement(['Critical', 'High', 'Medium-High'])}
- Alternative vendors evaluated: ${getRandomNumber(3, 6)}
- Decision timeline: ${getRandomElement(['30 days', '45 days', '60 days', 'End of quarter'])}`;
};

// Interactive Demo Contract Generator
export const generateInteractiveDemoContract = (): string => {
  const contractTypes = [
    generateSimpleNDA(),
    generateSoftwareLicense(),
    generateServiceAgreement(),
    generatePartnershipAgreement()
  ];
  
  return getRandomElement(contractTypes);
};

const generateSimpleNDA = (): string => {
  const disclosingParty = getRandomElement(enterpriseCompanies);
  const receivingParty = getRandomElement(techCompanies);
  const term = getRandomElement(['2 years', '3 years', '5 years', 'perpetual']);
  
  return `NON-DISCLOSURE AGREEMENT

This Agreement is entered into as of ${getRandomDate(0, 30)} between:
Disclosing Party: ${disclosingParty}
Receiving Party: ${receivingParty}

1. CONFIDENTIAL INFORMATION
"Confidential Information" means any non-public, proprietary information disclosed by Disclosing Party, including but not limited to:
- ${getRandomElement(['Technical specifications and source code', 'Business strategies and financial data', 'Customer lists and pricing information'])}
- ${getRandomElement(['Product roadmaps and development plans', 'Marketing strategies and research', 'Trade secrets and know-how'])}
- Any information marked as "Confidential" or that would reasonably be considered confidential

2. OBLIGATIONS
Receiving Party agrees to:
- Maintain strict confidentiality of all Confidential Information
- Use Confidential Information solely for evaluating potential business relationship
- Limit access to employees with a legitimate need to know
- Protect information using ${getRandomElement(['industry-standard', 'bank-level', 'military-grade'])} security measures

3. TERM AND TERMINATION
This Agreement shall remain in effect for ${term} from the date of execution.
Obligations regarding Confidential Information shall survive termination for ${getRandomElement(['3 years', '5 years', '7 years', 'indefinitely'])}.

4. EXCEPTIONS
Obligations do not apply to information that:
- Was publicly known at time of disclosure
- Becomes publicly known through no breach by Receiving Party
- Was independently developed without use of Confidential Information
- Must be disclosed by law with prompt notice to Disclosing Party

5. REMEDIES
Breach may cause irreparable harm for which monetary damages are inadequate.
Disclosing Party entitled to ${getRandomElement(['injunctive relief', 'specific performance', 'all equitable remedies'])} without bond.`;
};

const generateSoftwareLicense = (): string => {
  const licensor = getRandomElement(techCompanies);
  const licensee = getRandomElement(enterpriseCompanies);
  const licenseType = getRandomElement(['Enterprise', 'Perpetual', 'Subscription', 'Site']);
  const users = getRandomNumber(50, 500);
  
  return `SOFTWARE LICENSE AGREEMENT

Licensor: ${licensor}
Licensee: ${licensee}
License Type: ${licenseType} License
Effective Date: ${getRandomDate(0, 30)}

1. GRANT OF LICENSE
Licensor grants Licensee a ${getRandomElement(['non-exclusive, non-transferable', 'exclusive, transferable', 'non-exclusive, worldwide'])} license to:
- Install and use the Software for up to ${users} authorized users
- ${getRandomElement(['Create backup copies for archival purposes', 'Modify and customize for internal use', 'Integrate with third-party systems'])}
- Access ${getRandomElement(['standard', 'premium', 'enterprise'])} features and updates

2. LICENSE RESTRICTIONS
Licensee shall not:
- Reverse engineer, decompile, or disassemble the Software
- ${getRandomElement(['Sublicense or redistribute', 'Use for commercial purposes', 'Modify without written consent'])}
- Remove or alter proprietary notices
- Use in violation of applicable laws or regulations

3. FEES AND PAYMENT
- License Fee: $${getRandomNumber(50, 500) * users} ${licenseType === 'Subscription' ? 'per year' : 'one-time'}
- Payment Terms: ${getRandomElement(['Net 30', 'Net 45', 'Annual prepayment', 'Quarterly installments'])}
- Maintenance & Support: ${getRandomElement(['Included', '20% of license fee annually', '$' + getRandomNumber(10, 50) * users + ' per year'])}
- Overages: $${getRandomNumber(100, 500)} per additional user per month

4. INTELLECTUAL PROPERTY
- Licensor retains all rights, title, and interest in the Software
- ${getRandomElement(['Licensee owns all data created', 'Feedback may be used by Licensor', 'Custom developments jointly owned'])}
- No implied licenses granted

5. WARRANTY AND SUPPORT
- Software warranted to perform substantially as documented for ${getRandomElement(['90 days', '180 days', '1 year'])}
- ${getRandomElement(['8x5', '24x7', '16x5'])} technical support included
- ${getRandomElement(['Monthly', 'Quarterly', 'Semi-annual'])} updates and patches
- Bug fixes within ${getRandomElement(['24 hours', '48 hours', '5 business days'])} for critical issues`;
};

const generateServiceAgreement = (): string => {
  const serviceProvider = getRandomElement(techCompanies);
  const client = getRandomElement(enterpriseCompanies);
  const serviceType = getRandomElement(['Consulting', 'Managed Services', 'Professional Services', 'Implementation']);
  
  return `${serviceType.toUpperCase()} AGREEMENT

Service Provider: ${serviceProvider}
Client: ${client}
Commencement Date: ${getRandomDate(0, 30)}
Term: ${getRandomElement(['6 months', '12 months', '24 months'])}

1. SCOPE OF SERVICES
Provider shall deliver the following services:
- ${getRandomElement(['System implementation and configuration', 'Ongoing maintenance and support', 'Strategic consulting and advisory'])}
- ${getRandomElement(['24x7 monitoring and incident response', 'Custom development and integration', 'Training and knowledge transfer'])}
- ${getRandomElement(['Monthly performance reporting', 'Quarterly business reviews', 'Annual strategic planning'])}
- Deliverables as specified in Statement of Work

2. SERVICE LEVELS
- Availability: ${getRandomElement(['99.5%', '99.9%', '99.95%'])} uptime guarantee
- Response Time: ${getRandomElement(['1 hour', '2 hours', '4 hours'])} for Priority 1 issues
- Resolution Time: ${getRandomElement(['4 hours', '8 hours', '24 hours'])} for critical issues
- Service Credits: ${getRandomElement(['5%', '10%', '15%'])} for SLA breaches

3. FEES AND EXPENSES
- ${serviceType} Fee: $${getRandomNumber(10, 100) * 1000}/month
- ${getRandomElement(['Time & Materials', 'Fixed Price', 'Retainer'])} billing model
- Hourly Rate (if applicable): $${getRandomNumber(150, 350)}/hour
- Expenses: ${getRandomElement(['Pre-approved only', 'Up to 10% of fees', 'Included in fee'])}
- Payment Terms: ${getRandomElement(['Net 30', 'Net 45', 'Due upon receipt'])}

4. PERSONNEL AND RESOURCES
- Dedicated ${getRandomElement(['Project Manager', 'Account Manager', 'Technical Lead'])}
- Team of ${getRandomNumber(2, 10)} ${getRandomElement(['certified professionals', 'senior consultants', 'technical specialists'])}
- ${getRandomElement(['On-site', 'Remote', 'Hybrid'])} service delivery
- Background-checked and NDA-bound personnel

5. CONFIDENTIALITY AND IP
- Mutual NDA terms apply
- ${getRandomElement(['Client owns all deliverables', 'Provider retains methodology', 'Joint IP ownership'])}
- ${getRandomElement(['Unlimited license to use', 'Single-use license', 'Perpetual license'])} for deliverables
- Right to use Client name as reference: ${getRandomElement(['Yes', 'No', 'With prior approval'])}`;
};

const generatePartnershipAgreement = (): string => {
  const partner1 = getRandomElement(enterpriseCompanies);
  const partner2 = getRandomElement(techCompanies);
  const revenue = getRandomNumber(500, 5000) * 1000;
  
  return `STRATEGIC PARTNERSHIP AGREEMENT

Partner A: ${partner1}
Partner B: ${partner2}
Effective Date: ${getRandomDate(0, 30)}
Initial Term: ${getRandomElement(['2 years', '3 years', '5 years'])}

1. PARTNERSHIP OBJECTIVES
The Parties agree to collaborate on:
- ${getRandomElement(['Joint product development', 'Market expansion initiatives', 'Technology integration'])}
- ${getRandomElement(['Co-marketing and lead generation', 'Shared service delivery', 'Research and development'])}
- Combined revenue target: $${revenue.toLocaleString()} annually
- Market focus: ${getRandomElement(['North America', 'Global', 'EMEA', 'APAC'])}

2. ROLES AND RESPONSIBILITIES
Partner A shall:
- ${getRandomElement(['Provide market access and distribution', 'Lead customer relationships', 'Handle tier-1 support'])}
- Contribute ${getRandomElement(['sales and marketing resources', 'technical expertise', 'industry knowledge'])}
- Invest $${getRandomNumber(100, 500) * 1000} in joint initiatives

Partner B shall:
- ${getRandomElement(['Deliver technology platform', 'Provide implementation services', 'Manage technical operations'])}
- ${getRandomElement(['Train Partner A personnel', 'Develop custom integrations', 'Maintain infrastructure'])}
- Provide ${getRandomElement(['24x7', '16x5', '8x5'])} technical support

3. REVENUE SHARING
- Revenue Split: ${getRandomElement(['50/50', '60/40', '70/30'])} (Partner A/Partner B)
- ${getRandomElement(['Quarterly', 'Monthly', 'Annual'])} reconciliation and payment
- Minimum revenue commitment: $${(revenue * 0.5).toLocaleString()} per partner
- Performance bonus: ${getRandomElement(['5%', '10%', '15%'])} for exceeding targets

4. INTELLECTUAL PROPERTY
- ${getRandomElement(['Jointly owned IP', 'Each party retains own IP', 'License exchange model'])}
- ${getRandomElement(['Unlimited cross-license', 'Field-of-use restrictions', 'Royalty-bearing license'])}
- Brand usage: ${getRandomElement(['Co-branding required', 'Separate branding', 'Case-by-case approval'])}

5. GOVERNANCE
- ${getRandomElement(['Quarterly', 'Monthly', 'Bi-monthly'])} steering committee meetings
- Decisions by ${getRandomElement(['unanimous consent', 'majority vote', 'designated representatives'])}
- Annual partnership review and planning session
- Dispute resolution through ${getRandomElement(['mediation', 'arbitration', 'escalation process'])}`;
};