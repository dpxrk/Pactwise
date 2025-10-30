"""Enhanced Contract Management Agent - Complete Orchestrator"""

from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import asyncio

from .comprehensive_review_service import ComprehensiveReviewService, ClauseCategory
from .risk_assessment_service import RiskAssessmentService
from .compliance_service import ComplianceService
from .playbook_service import PlaybookService


class EnhancedContractAgent:
    """
    Main orchestrator for comprehensive contract review and management
    Integrates all services:
    - Document ingestion and parsing
    - Clause extraction and categorization
    - Multi-dimensional risk assessment
    - Regulatory compliance checking
    - Playbook comparison
    - Intelligent redlining
    - Obligation tracking
    - Lifecycle management
    """

    def __init__(self):
        # Initialize all sub-services
        self.review_service = ComprehensiveReviewService()
        self.risk_service = RiskAssessmentService()
        self.compliance_service = ComplianceService()
        self.playbook_service = PlaybookService()

    async def review_contract(
        self,
        contract_file: Path,
        review_type: str = 'comprehensive',
        contract_metadata: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Main entry point for comprehensive contract review

        Args:
            contract_file: Path to contract file
            review_type: 'comprehensive', 'quick', or 'focused'
            contract_metadata: Optional additional metadata

        Returns:
            Complete analysis report
        """
        print(f"Starting {review_type} review of contract: {contract_file.name}")

        # Step 1: Ingest contract
        print("Step 1/10: Ingesting contract...")
        contract_data = await self.review_service.ingest_contract(contract_file)

        # Step 2: Extract metadata
        print("Step 2/10: Extracting metadata...")
        extracted_data = await self.review_service.extract_contract_data(contract_data)

        # Merge any provided metadata
        if contract_metadata:
            extracted_data['metadata'].update(contract_metadata)

        # Step 3: Extract and categorize clauses
        print("Step 3/10: Extracting and categorizing clauses...")
        clauses = await self.review_service.extract_and_categorize_clauses(contract_data)

        # Step 4: Risk assessment
        print("Step 4/10: Assessing risks...")
        risk_assessment = await self.risk_service.assess_risks(
            contract_data,
            extracted_data,
            clauses
        )

        # Step 5: Compliance checking
        print("Step 5/10: Checking compliance...")
        compliance_check = await self.compliance_service.check_compliance(
            contract_data,
            extracted_data,
            clauses
        )

        # Step 6: Financial analysis
        print("Step 6/10: Analyzing financial terms...")
        financial_analysis = await self._analyze_financial_terms(extracted_data, clauses)

        # Step 7: Playbook comparison
        print("Step 7/10: Comparing to playbook...")
        playbook_comparison = await self.playbook_service.compare_to_playbook(
            extracted_data,
            clauses
        )

        # Step 8: Generate redlines
        print("Step 8/10: Generating redlines...")
        redlines = await self._generate_redlines(
            contract_data,
            extracted_data,
            risk_assessment,
            playbook_comparison,
            clauses
        )

        # Compile all analysis results
        analysis_results = {
            'metadata': extracted_data['metadata'],
            'clauses': clauses,
            'risk_assessment': risk_assessment,
            'compliance_check': compliance_check,
            'financial_analysis': financial_analysis,
            'playbook_comparison': playbook_comparison,
            'redlines': redlines,
            'recommendations': []
        }

        # Step 9: Generate recommendations
        print("Step 9/10: Generating recommendations...")
        analysis_results['recommendations'] = await self._generate_recommendations(
            analysis_results
        )

        # Step 10: Generate final report
        print("Step 10/10: Generating report...")
        report = await self._generate_review_report(analysis_results)

        print(f"Review complete! Overall risk: {risk_assessment['overall_risk']}, Score: {risk_assessment['risk_score']:.1f}/100")

        return report

    async def _analyze_financial_terms(
        self,
        extracted_data: Dict[str, Any],
        clauses: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Analyze financial terms and conditions"""
        metadata = extracted_data['metadata']

        financial_analysis = {
            'total_value': metadata.get('contract_value'),
            'currency': metadata.get('currency', 'USD'),
            'payment_structure': metadata.get('payment_terms'),
            'price_escalation': False,
            'penalties': [],
            'discounts': [],
            'hidden_costs': [],
            'forex_risk': 'LOW',
            'budget_compliance': None
        }

        # Analyze payment clauses
        payment_clauses = [c for c in clauses if c.get('category') == 'PAYMENT']

        for clause in payment_clauses:
            if clause.get('advance_payment'):
                financial_analysis['payment_structure'] = {
                    'type': 'ADVANCE',
                    'percentage': clause.get('advance_percentage', 0),
                    'risk': 'HIGH' if clause.get('advance_percentage', 0) > 50 else 'MEDIUM'
                }

            if clause.get('milestone_based'):
                financial_analysis['payment_structure'] = {
                    'type': 'MILESTONE',
                    'risk': 'LOW'
                }

        # Check for penalties
        contract_text = extracted_data.get('raw_contract', {}).get('raw_text', '').lower()
        if 'penalty' in contract_text or 'liquidated damages' in contract_text:
            financial_analysis['penalties'].append({
                'type': 'GENERAL',
                'description': 'Contract includes penalty or liquidated damages provisions'
            })

        # Forex risk (if non-USD currency)
        if financial_analysis['currency'] != 'USD':
            financial_analysis['forex_risk'] = 'MEDIUM'

        return financial_analysis

    async def _generate_redlines(
        self,
        contract_data: Dict[str, Any],
        extracted_data: Dict[str, Any],
        risk_assessment: Dict[str, Any],
        playbook_comparison: Dict[str, Any],
        clauses: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Generate intelligent redlines/suggested edits
        """
        redlines = []

        # Redlines for critical risks
        for risk in risk_assessment.get('critical_issues', []):
            if risk.get('clause_reference'):
                redline = {
                    'type': 'MODIFICATION',
                    'priority': 'HIGH',
                    'original_text': risk['clause_reference'],
                    'suggested_text': await self._generate_alternative_language(
                        risk['type'],
                        risk.get('clause_reference', '')
                    ),
                    'reason': risk['description'],
                    'recommendation': risk.get('recommendation', '')
                }
                redlines.append(redline)

        # Redlines for missing required clauses
        for missing in playbook_comparison.get('missing_required_clauses', []):
            redline = {
                'type': 'ADDITION',
                'priority': 'HIGH',
                'suggested_text': missing.get('playbook_language', ''),
                'reason': f'Missing required {missing["clause_type"]} clause',
                'location': 'END_OF_CONTRACT'
            }
            redlines.append(redline)

        # Redlines for missing preferred clauses
        for missing in playbook_comparison.get('missing_preferred_clauses', []):
            redline = {
                'type': 'ADDITION',
                'priority': 'MEDIUM',
                'suggested_text': missing.get('playbook_language', ''),
                'reason': f'Recommended: Add {missing["clause_type"]} clause',
                'location': 'END_OF_CONTRACT'
            }
            redlines.append(redline)

        # Redlines for prohibited clauses
        for prohibited in playbook_comparison.get('prohibited_clauses_found', []):
            redline = {
                'type': 'DELETION',
                'priority': 'CRITICAL',
                'original_text': prohibited.get('clause_reference', ''),
                'reason': prohibited['reason'],
                'recommendation': f'Remove or significantly modify {prohibited["clause_type"]}'
            }
            redlines.append(redline)

        # Sort by priority
        priority_order = {'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3}
        redlines.sort(key=lambda x: priority_order.get(x.get('priority', 'LOW'), 3))

        return redlines

    async def _generate_alternative_language(
        self,
        issue_type: str,
        original_text: str
    ) -> str:
        """Generate alternative language for problematic clauses"""

        # Template-based alternative language
        alternatives = {
            'ONE_SIDED_INDEMNIFICATION': (
                'MUTUAL INDEMNIFICATION: Each party shall indemnify, defend and hold harmless '
                'the other party from any third-party claims arising from such party\'s breach '
                'of this Agreement or negligence.'
            ),
            'LOW_LIABILITY_CAP': (
                'LIMITATION OF LIABILITY: Except for breaches of confidentiality, IP infringement, '
                'gross negligence or willful misconduct, each party\'s liability shall be limited to '
                'the greater of (i) twelve (12) months of fees paid or (ii) the total contract value.'
            ),
            'NO_TERMINATION_FOR_CONVENIENCE': (
                'TERMINATION FOR CONVENIENCE: Either party may terminate this Agreement for convenience '
                'upon ninety (90) days prior written notice to the other party.'
            ),
            'MISSING_DATA_PROTECTION': (
                'DATA PROTECTION: Vendor shall process all personal data in accordance with applicable '
                'data protection laws including GDPR and CCPA. Vendor shall implement appropriate '
                'technical and organizational measures to protect personal data.'
            ),
            'MISSING_SLA': (
                'SERVICE LEVEL AGREEMENT: Vendor shall maintain 99.9% uptime measured monthly. '
                'In the event of failure to meet SLA, Customer shall receive service credits of '
                '10% for 99.0-99.9% uptime and 25% for below 99.0% uptime.'
            )
        }

        return alternatives.get(
            issue_type,
            f'[Recommended: Revise or remove this clause - {issue_type}]'
        )

    async def _generate_recommendations(
        self,
        analysis_results: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Generate comprehensive recommendations"""
        recommendations = []

        risk_assessment = analysis_results['risk_assessment']
        compliance_check = analysis_results['compliance_check']
        playbook_comparison = analysis_results['playbook_comparison']

        # Overall risk-based recommendation
        overall_risk = risk_assessment.get('overall_risk', 'LOW')

        if overall_risk == 'CRITICAL':
            recommendations.append({
                'priority': 'CRITICAL',
                'category': 'OVERALL',
                'action': 'DO NOT SIGN - CRITICAL RISKS PRESENT',
                'details': 'Contract contains critical risks that must be addressed before execution',
                'next_steps': [
                    'Escalate to Legal team immediately',
                    'Schedule negotiation meeting with vendor',
                    'Review all critical issues in risk assessment',
                    'Do not proceed without legal approval'
                ]
            })
        elif overall_risk == 'HIGH':
            recommendations.append({
                'priority': 'HIGH',
                'category': 'OVERALL',
                'action': 'REQUIRES LEGAL REVIEW',
                'details': 'Contract has significant risks requiring legal review before execution',
                'next_steps': [
                    'Send to Legal department for review',
                    'Prepare redlined version for vendor',
                    'Schedule negotiation meeting',
                    'Obtain legal sign-off before execution'
                ]
            })
        elif overall_risk == 'MEDIUM':
            recommendations.append({
                'priority': 'MEDIUM',
                'category': 'OVERALL',
                'action': 'REVIEW AND ADDRESS MEDIUM RISKS',
                'details': 'Contract has moderate risks that should be addressed',
                'next_steps': [
                    'Review highlighted risks with business owner',
                    'Negotiate key terms with vendor',
                    'Obtain appropriate approvals'
                ]
            })

        # Add specific risk recommendations
        for risk in risk_assessment.get('critical_issues', [])[:5]:
            recommendations.append({
                'priority': risk['severity'],
                'category': risk.get('category', 'GENERAL'),
                'action': risk.get('recommendation', 'Review and address'),
                'details': risk['description']
            })

        # Compliance recommendations
        if not compliance_check.get('overall_compliant', True):
            for check in compliance_check.get('regulatory', []):
                if not check.get('compliant', True):
                    recommendations.append({
                        'priority': 'HIGH',
                        'category': 'COMPLIANCE',
                        'action': f'Address {check["framework"]} compliance',
                        'details': f'Contract not compliant with {check["framework"]}',
                        'next_steps': check.get('recommendations', [])
                    })

        # Playbook recommendations
        if playbook_comparison.get('playbook_found'):
            compliance_score = playbook_comparison.get('compliance_score', 100)
            if compliance_score < 80:
                recommendations.append({
                    'priority': 'MEDIUM',
                    'category': 'POLICY',
                    'action': 'Improve playbook compliance',
                    'details': f'Contract is {compliance_score:.0f}% compliant with company standards',
                    'next_steps': [
                        'Add missing required clauses',
                        'Negotiate to include preferred terms',
                        'Request exception approval if needed'
                    ]
                })

        return recommendations

    async def _generate_review_report(
        self,
        analysis_results: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate comprehensive final report"""

        metadata = analysis_results['metadata']
        risk_assessment = analysis_results['risk_assessment']
        compliance_check = analysis_results['compliance_check']
        playbook_comparison = analysis_results['playbook_comparison']

        report = {
            'summary': {
                'contract_type': metadata.get('contract_type', 'UNKNOWN'),
                'parties': metadata.get('parties', []),
                'contract_value': metadata.get('contract_value'),
                'currency': metadata.get('currency', 'USD'),
                'term_length': metadata.get('term_length'),
                'effective_date': metadata.get('effective_date'),
                'expiration_date': metadata.get('expiration_date'),
                'overall_risk': risk_assessment.get('overall_risk', 'UNKNOWN'),
                'risk_score': risk_assessment.get('risk_score', 0.0),
                'compliance_score': compliance_check.get('compliance_score', 0.0),
                'playbook_compliance': playbook_comparison.get('compliance_score', 0.0),
                'recommendation': analysis_results['recommendations'][0] if analysis_results['recommendations'] else None
            },
            'executive_summary': await self._generate_executive_summary(analysis_results),
            'detailed_findings': {
                'risk_assessment': risk_assessment,
                'compliance_analysis': compliance_check,
                'financial_analysis': analysis_results['financial_analysis'],
                'playbook_comparison': playbook_comparison
            },
            'clause_analysis': {
                'total_clauses': len(analysis_results['clauses']),
                'by_category': self._categorize_clauses(analysis_results['clauses']),
                'high_risk_clauses': [
                    c for c in analysis_results['clauses']
                    if c.get('risk_level') in ['HIGH', 'CRITICAL']
                ]
            },
            'redlines': analysis_results['redlines'],
            'recommendations': analysis_results['recommendations'],
            'next_steps': await self._determine_next_steps(analysis_results),
            'generated_date': datetime.now().isoformat(),
            'reviewer': 'AI Contract Review Agent v2.0'
        }

        return report

    async def _generate_executive_summary(
        self,
        analysis_results: Dict[str, Any]
    ) -> str:
        """Generate executive summary"""

        metadata = analysis_results['metadata']
        risk = analysis_results['risk_assessment']
        compliance = analysis_results['compliance_check']

        summary_parts = []

        # Contract basics
        contract_type = metadata.get('contract_type', 'contract')
        parties = metadata.get('parties', [])
        if len(parties) >= 2:
            summary_parts.append(
                f"This {contract_type} agreement between {parties[0].get('name', 'Party 1')} "
                f"and {parties[1].get('name', 'Party 2')}"
            )
        else:
            summary_parts.append(f"This {contract_type} agreement")

        # Value and term
        value = metadata.get('contract_value')
        if value:
            currency = metadata.get('currency', 'USD')
            summary_parts.append(f"with a total value of {currency} {value:,.2f}")

        term = metadata.get('term_length')
        if term:
            summary_parts.append(f"for a term of {term}")

        # Risk assessment
        overall_risk = risk.get('overall_risk', 'UNKNOWN')
        risk_score = risk.get('risk_score', 0)
        summary_parts.append(
            f"has been assessed as **{overall_risk} RISK** (score: {risk_score:.1f}/100)."
        )

        # Critical issues
        critical_issues = len(risk.get('critical_issues', []))
        if critical_issues > 0:
            summary_parts.append(
                f"\n\n**{critical_issues} critical issue(s)** require immediate attention:"
            )

        # Compliance
        if not compliance.get('overall_compliant', True):
            frameworks = [c['framework'] for c in compliance.get('regulatory', []) if not c.get('compliant')]
            if frameworks:
                summary_parts.append(
                    f"\n\nCompliance concerns identified with: {', '.join(frameworks)}"
                )

        return " ".join(summary_parts)

    def _categorize_clauses(self, clauses: List[Dict[str, Any]]) -> Dict[str, int]:
        """Count clauses by category"""
        categories = {}
        for clause in clauses:
            category = clause.get('category', 'OTHER')
            categories[category] = categories.get(category, 0) + 1
        return categories

    async def _determine_next_steps(
        self,
        analysis_results: Dict[str, Any]
    ) -> List[str]:
        """Determine next steps based on analysis"""
        next_steps = []

        overall_risk = analysis_results['risk_assessment'].get('overall_risk', 'LOW')

        if overall_risk == 'CRITICAL':
            next_steps = [
                '1. DO NOT SIGN - Escalate to Legal immediately',
                '2. Schedule meeting with vendor to negotiate critical terms',
                '3. Prepare detailed list of required changes',
                '4. Obtain legal approval before proceeding'
            ]
        elif overall_risk == 'HIGH':
            next_steps = [
                '1. Send contract to Legal department for review',
                '2. Prepare redlined version with suggested changes',
                '3. Schedule negotiation meeting with vendor',
                '4. Address all high-priority issues before execution'
            ]
        elif overall_risk == 'MEDIUM':
            next_steps = [
                '1. Review highlighted issues with business owner',
                '2. Negotiate key terms with vendor',
                '3. Obtain necessary approvals',
                '4. Address compliance concerns if any'
            ]
        else:
            next_steps = [
                '1. Perform final review of contract terms',
                '2. Obtain required approvals',
                '3. Proceed with execution'
            ]

        return next_steps

    async def track_contract_lifecycle(
        self,
        contract_id: str
    ) -> Dict[str, Any]:
        """Track ongoing contract lifecycle and obligations"""
        # This would integrate with database in production
        lifecycle_data = {
            'contract_id': contract_id,
            'status': 'ACTIVE',
            'renewal_status': await self._check_renewal_status(contract_id),
            'active_obligations': await self._track_obligations(contract_id),
            'upcoming_milestones': [],
            'compliance_monitoring': {},
            'vendor_performance': {}
        }

        return lifecycle_data

    async def _check_renewal_status(self, contract_id: str) -> Dict[str, Any]:
        """Check contract renewal status"""
        # Placeholder - would query database in production
        return {
            'auto_renew': False,
            'days_to_expiration': 90,
            'renewal_notice_sent': False,
            'action_required': True
        }

    async def _track_obligations(self, contract_id: str) -> List[Dict[str, Any]]:
        """Track contractual obligations"""
        # Placeholder - would query database in production
        return []
