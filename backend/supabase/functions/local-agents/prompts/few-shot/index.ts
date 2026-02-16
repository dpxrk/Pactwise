/**
 * Few-Shot Example Library
 *
 * Additional few-shot examples organized by task type.
 * These supplement the examples embedded in individual templates
 * and can be dynamically selected based on similarity to the current task.
 */

import type { FewShotExample } from '../types.ts';

/** Few-shot examples for contract classification tasks */
export const classificationExamples: FewShotExample[] = [
  {
    input: 'Document begins with "CONFIDENTIAL DISCLOSURE AGREEMENT" and contains terms about proprietary information exchange between two parties.',
    output: '{"documentType":"nda","urgency":"normal","confidence":0.95}',
    explanation: 'Clear NDA header with standard confidentiality terms.',
    tags: ['classification', 'nda'],
  },
  {
    input: 'Document titled "Statement of Work #4" references a Master Services Agreement and describes specific deliverables, timelines, and pricing for a data migration project.',
    output: '{"documentType":"sow","urgency":"normal","relatedDocuments":["parent_msa"],"confidence":0.92}',
    explanation: 'SOW referencing parent MSA. Number indicates it is part of a series.',
    tags: ['classification', 'sow'],
  },
  {
    input: 'Email attachment titled "Q4 Invoice" with line items totaling $45,000 and payment terms NET30.',
    output: '{"documentType":"invoice","urgency":"high","financialValue":45000,"paymentDeadline":"30 days from receipt","confidence":0.90}',
    explanation: 'Invoice requires timely processing. High urgency due to payment terms.',
    tags: ['classification', 'invoice'],
  },
];

/** Few-shot examples for financial analysis tasks */
export const financialAnalysisExamples: FewShotExample[] = [
  {
    input: 'Contract terms: 3-year term, $50,000 base + $500/user/month for 100 users, 5% annual escalation, $20,000 implementation fee.',
    output: '{"year1":{"base":50000,"perUser":600000,"implementation":20000,"total":670000},"year2":{"base":52500,"perUser":630000,"total":682500},"year3":{"base":55125,"perUser":661500,"total":716625},"tco3Year":2069125,"annualizedCost":689708}',
    explanation: 'Applied 5% escalation to both base and per-user fees. Implementation is year-1 only. TCO sums all three years.',
    tags: ['financial', 'tco'],
  },
  {
    input: 'Two proposals: Vendor A offers $100/user/month for 200 users with 3% annual increase. Vendor B offers $180,000/year flat for unlimited users with no increase.',
    output: '{"vendorA":{"year1":240000,"year2":247200,"year3":254616,"tco3Year":741816},"vendorB":{"year1":180000,"year2":180000,"year3":180000,"tco3Year":540000},"savings":201816,"recommendation":"Vendor B saves $201,816 over 3 years at current user count. Break-even is at 75 users/month. If user count may exceed 200, Vendor B becomes increasingly advantageous."}',
    explanation: 'Compared TCOs and identified the break-even point for decision-making.',
    tags: ['financial', 'comparison'],
  },
];

/** Few-shot examples for legal risk identification */
export const legalRiskExamples: FewShotExample[] = [
  {
    input: 'Clause: "Client shall indemnify Vendor against any claims arising from Client\'s use of the Services, including but not limited to claims of intellectual property infringement."',
    output: '{"riskLevel":"high","analysis":"This reverses the standard indemnification direction. Typically, the vendor indemnifies the client for IP infringement related to the service. This clause makes the client liable for IP claims that may arise from the vendor\'s own service design.","recommendation":"Reject. Counter with standard mutual indemnification where each party indemnifies for their own IP and actions."}',
    explanation: 'Red flag: client indemnifying vendor for IP infringement in the vendor\'s own service is non-standard and high risk.',
    tags: ['legal', 'indemnification', 'risk'],
  },
  {
    input: 'Clause: "Vendor may modify the terms of this Agreement at any time by posting updated terms on its website. Continued use of Services constitutes acceptance of modified terms."',
    output: '{"riskLevel":"critical","analysis":"Unilateral modification clause gives vendor complete control over contract terms without negotiation or notice. This effectively makes the agreement meaningless as the vendor can change pricing, SLAs, or any term at will.","recommendation":"Reject immediately. Require bilateral consent for material changes, minimum 60-day written notice for non-material changes, and right to terminate if changes are unacceptable."}',
    explanation: 'Critical risk: unilateral modification clauses undermine the entire contract.',
    tags: ['legal', 'modification', 'risk'],
  },
];

/** Few-shot examples for notification generation */
export const notificationExamples: FewShotExample[] = [
  {
    input: 'Event: SLA breach detected. Vendor: DataHost Inc. Metric: Uptime at 98.5% vs 99.9% SLA. Duration: 14 hours. Affected service: Production database hosting.',
    output: '{"subject":"SLA Breach: DataHost uptime at 98.5% (SLA: 99.9%)","body":"DataHost Inc production database hosting experienced 14 hours of degraded availability, bringing monthly uptime to 98.5% — below the 99.9% SLA threshold. This may trigger service credits per Section 5.2 of the MSA. Immediate action: verify impact on production systems and initiate formal SLA breach notification to vendor.","severity":"critical","channel":"push","actions":[{"label":"File SLA Claim","link":"/vendors/datahost/sla-claims/new"},{"label":"View Incident","link":"/vendors/datahost/incidents/latest"}]}',
    explanation: 'Critical because it affects production systems. Push notification for immediate visibility.',
    tags: ['notification', 'sla', 'breach'],
  },
];

/**
 * Get few-shot examples by tags.
 * Returns examples that match ALL provided tags.
 */
export function getFewShotByTags(tags: string[]): FewShotExample[] {
  const allExamples = [
    ...classificationExamples,
    ...financialAnalysisExamples,
    ...legalRiskExamples,
    ...notificationExamples,
  ];

  return allExamples.filter(ex =>
    tags.every(tag => ex.tags?.includes(tag)),
  );
}

/**
 * Get few-shot examples by category.
 */
export function getFewShotByCategory(category: string): FewShotExample[] {
  const categoryMap: Record<string, FewShotExample[]> = {
    classification: classificationExamples,
    financial: financialAnalysisExamples,
    legal: legalRiskExamples,
    notification: notificationExamples,
  };

  return categoryMap[category] || [];
}
