"""Multi-dimensional Risk Assessment Service for Contract Review"""

from typing import Dict, List, Any, Optional
from enum import Enum


class RiskSeverity(str, Enum):
    """Risk severity levels"""
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class RiskAssessmentService:
    """
    Comprehensive risk assessment engine that evaluates contracts across:
    - Legal risks
    - Financial risks
    - Operational risks
    - Compliance risks
    - Reputational risks
    """

    def __init__(self):
        self.severity_weights = {
            'CRITICAL': 100,
            'HIGH': 75,
            'MEDIUM': 50,
            'LOW': 25
        }

    async def assess_risks(
        self,
        contract_data: Dict[str, Any],
        extracted_data: Dict[str, Any],
        clauses: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Comprehensive risk assessment across all dimensions
        """
        metadata = extracted_data['metadata']

        risk_assessment = {
            'legal_risks': [],
            'financial_risks': [],
            'operational_risks': [],
            'compliance_risks': [],
            'reputational_risks': [],
            'overall_risk': 'LOW',
            'risk_score': 0.0,
            'critical_issues': []
        }

        # Assess each risk category
        risk_assessment['legal_risks'] = await self._assess_legal_risks(
            clauses, metadata
        )

        risk_assessment['financial_risks'] = await self._assess_financial_risks(
            clauses, metadata
        )

        risk_assessment['operational_risks'] = await self._assess_operational_risks(
            clauses, metadata
        )

        risk_assessment['compliance_risks'] = await self._assess_compliance_risks(
            clauses, metadata
        )

        risk_assessment['reputational_risks'] = await self._assess_reputational_risks(
            clauses, metadata
        )

        # Calculate overall risk score
        all_risks = (
            risk_assessment['legal_risks'] +
            risk_assessment['financial_risks'] +
            risk_assessment['operational_risks'] +
            risk_assessment['compliance_risks'] +
            risk_assessment['reputational_risks']
        )

        risk_score = self._calculate_risk_score(all_risks)
        risk_assessment['risk_score'] = risk_score

        # Determine overall risk level
        if risk_score >= 75:
            risk_assessment['overall_risk'] = 'CRITICAL'
        elif risk_score >= 50:
            risk_assessment['overall_risk'] = 'HIGH'
        elif risk_score >= 25:
            risk_assessment['overall_risk'] = 'MEDIUM'
        else:
            risk_assessment['overall_risk'] = 'LOW'

        # Extract critical issues
        risk_assessment['critical_issues'] = [
            risk for risk in all_risks
            if risk['severity'] in ['CRITICAL', 'HIGH']
        ]

        return risk_assessment

    async def _assess_legal_risks(
        self,
        clauses: List[Dict[str, Any]],
        metadata: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Assess legal risks"""
        risks = []

        # Check indemnification clauses
        indemnity_clauses = [
            c for c in clauses
            if c.get('category') == 'INDEMNIFICATION'
        ]

        for clause in indemnity_clauses:
            if clause.get('one_sided') and clause.get('favors') == 'VENDOR':
                risks.append({
                    'type': 'ONE_SIDED_INDEMNIFICATION',
                    'severity': 'HIGH',
                    'description': 'Indemnification clause heavily favors vendor',
                    'clause_reference': clause['text'][:200],
                    'recommendation': 'Negotiate mutual indemnification',
                    'category': 'LEGAL'
                })

            if not clause.get('scope'):
                risks.append({
                    'type': 'UNDEFINED_INDEMNITY_SCOPE',
                    'severity': 'MEDIUM',
                    'description': 'Indemnification scope not clearly defined',
                    'clause_reference': clause['text'][:200],
                    'recommendation': 'Define specific indemnification scenarios',
                    'category': 'LEGAL'
                })

        # Check liability clauses
        liability_clauses = [
            c for c in clauses
            if c.get('category') == 'LIABILITY'
        ]

        for clause in liability_clauses:
            if clause.get('cap_amount'):
                contract_value = metadata.get('contract_value', 1)
                if contract_value and contract_value > 0:
                    cap_ratio = clause['cap_amount'] / contract_value
                    if cap_ratio < 1.0:
                        severity = 'MEDIUM' if cap_ratio > 0.5 else 'HIGH'
                        risks.append({
                            'type': 'LOW_LIABILITY_CAP',
                            'severity': severity,
                            'description': f'Liability cap is {cap_ratio:.0%} of contract value',
                            'clause_reference': clause['text'][:200],
                            'recommendation': 'Negotiate higher liability cap or remove cap',
                            'category': 'LEGAL'
                        })

            if clause.get('consequential_damages_excluded'):
                risks.append({
                    'type': 'CONSEQUENTIAL_DAMAGES_EXCLUDED',
                    'severity': 'HIGH',
                    'description': 'Consequential damages are excluded',
                    'clause_reference': clause['text'][:200],
                    'recommendation': 'Request inclusion of consequential damages or carve-outs',
                    'category': 'LEGAL'
                })

        # Check for unlimited liability
        has_liability_limit = any(
            c.get('has_cap') for c in liability_clauses
        )
        if not has_liability_limit and liability_clauses:
            risks.append({
                'type': 'UNLIMITED_LIABILITY',
                'severity': 'CRITICAL',
                'description': 'No liability limitations found in contract',
                'recommendation': 'Add liability cap and exclusions',
                'category': 'LEGAL'
            })

        return risks

    async def _assess_financial_risks(
        self,
        clauses: List[Dict[str, Any]],
        metadata: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Assess financial risks"""
        risks = []

        # Check payment terms
        payment_clauses = [
            c for c in clauses
            if c.get('category') == 'PAYMENT'
        ]

        for clause in payment_clauses:
            if clause.get('advance_payment'):
                advance_pct = clause.get('advance_percentage', 0)
                if advance_pct > 50:
                    risks.append({
                        'type': 'HIGH_ADVANCE_PAYMENT',
                        'severity': 'HIGH' if advance_pct > 75 else 'MEDIUM',
                        'description': f'{advance_pct}% advance payment required',
                        'clause_reference': clause['text'][:200],
                        'recommendation': 'Negotiate lower advance or milestone-based payments',
                        'category': 'FINANCIAL'
                    })

            payment_terms = clause.get('payment_terms', '')
            if 'net 90' in payment_terms.lower() or 'net 120' in payment_terms.lower():
                risks.append({
                    'type': 'EXTENDED_PAYMENT_TERMS',
                    'severity': 'MEDIUM',
                    'description': f'Extended payment terms: {payment_terms}',
                    'recommendation': 'Review cash flow impact',
                    'category': 'FINANCIAL'
                })

        # Check for price escalation
        contract_text = metadata.get('raw_text', '').lower()
        if 'price increase' in contract_text or 'escalation' in contract_text:
            risks.append({
                'type': 'PRICE_ESCALATION_RISK',
                'severity': 'MEDIUM',
                'description': 'Contract includes price escalation provisions',
                'recommendation': 'Review and cap escalation percentage',
                'category': 'FINANCIAL'
            })

        # Check for penalties
        if 'penalty' in contract_text or 'liquidated damages' in contract_text:
            risks.append({
                'type': 'PENALTY_PROVISIONS',
                'severity': 'MEDIUM',
                'description': 'Contract includes penalty or liquidated damages',
                'recommendation': 'Review penalty amounts and triggers',
                'category': 'FINANCIAL'
            })

        return risks

    async def _assess_operational_risks(
        self,
        clauses: List[Dict[str, Any]],
        metadata: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Assess operational risks"""
        risks = []

        # Check for SLAs
        sla_clauses = [
            c for c in clauses
            if c.get('category') == 'SLA'
        ]

        contract_type = metadata.get('contract_type', '')
        if contract_type in ['SOFTWARE', 'SAAS', 'SERVICES', 'MSA']:
            if not sla_clauses:
                risks.append({
                    'type': 'MISSING_SLA',
                    'severity': 'MEDIUM',
                    'description': 'No service level agreement found',
                    'recommendation': 'Add SLA with clear performance metrics and remedies',
                    'category': 'OPERATIONAL'
                })

        # Check termination rights
        term_clauses = [
            c for c in clauses
            if c.get('category') == 'TERMINATION'
        ]

        has_convenience_termination = False
        for clause in term_clauses:
            if clause.get('termination_for_convenience'):
                has_convenience_termination = True

            if not clause.get('mutual_termination'):
                risks.append({
                    'type': 'ONE_SIDED_TERMINATION',
                    'severity': 'HIGH',
                    'description': 'Termination rights are one-sided',
                    'clause_reference': clause['text'][:200],
                    'recommendation': 'Negotiate mutual termination rights',
                    'category': 'OPERATIONAL'
                })

        if not has_convenience_termination and term_clauses:
            risks.append({
                'type': 'NO_TERMINATION_FOR_CONVENIENCE',
                'severity': 'HIGH',
                'description': 'No right to terminate for convenience',
                'recommendation': 'Add termination for convenience with reasonable notice',
                'category': 'OPERATIONAL'
                })

        # Check for auto-renewal
        if metadata.get('auto_renewal'):
            notice_period = metadata.get('notice_period', '')
            if not notice_period:
                risks.append({
                    'type': 'AUTO_RENEWAL_NO_NOTICE',
                    'severity': 'MEDIUM',
                    'description': 'Auto-renewal without clear notice requirements',
                    'recommendation': 'Define notice period to prevent auto-renewal',
                    'category': 'OPERATIONAL'
                })

        return risks

    async def _assess_compliance_risks(
        self,
        clauses: List[Dict[str, Any]],
        metadata: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Assess regulatory compliance risks"""
        risks = []

        contract_type = metadata.get('contract_type', '')

        # Check data protection for relevant contract types
        data_clauses = [
            c for c in clauses
            if c.get('category') == 'DATA_PROTECTION'
        ]

        if contract_type in ['SOFTWARE', 'SAAS', 'SERVICES', 'CONSULTING']:
            if not data_clauses:
                risks.append({
                    'type': 'MISSING_DATA_PROTECTION',
                    'severity': 'HIGH',
                    'description': 'No data protection/privacy clause found',
                    'recommendation': 'Add GDPR/CCPA compliant data protection clause',
                    'category': 'COMPLIANCE'
                })
            else:
                for clause in data_clauses:
                    if not clause.get('gdpr_compliant'):
                        risks.append({
                            'type': 'INADEQUATE_DATA_PROTECTION',
                            'severity': 'HIGH',
                            'description': 'Data protection clause may not meet GDPR requirements',
                            'clause_reference': clause['text'][:200],
                            'recommendation': 'Update to include GDPR-compliant provisions',
                            'category': 'COMPLIANCE'
                        })

        # Check for governing law
        if not metadata.get('governing_law'):
            risks.append({
                'type': 'MISSING_GOVERNING_LAW',
                'severity': 'MEDIUM',
                'description': 'No governing law specified',
                'recommendation': 'Specify governing law and jurisdiction',
                'category': 'COMPLIANCE'
            })

        # Check for dispute resolution
        dispute_clauses = [
            c for c in clauses
            if c.get('category') == 'DISPUTE_RESOLUTION'
        ]

        if not dispute_clauses:
            risks.append({
                'type': 'MISSING_DISPUTE_RESOLUTION',
                'severity': 'MEDIUM',
                'description': 'No dispute resolution mechanism specified',
                'recommendation': 'Add arbitration or mediation clause',
                'category': 'COMPLIANCE'
            })

        return risks

    async def _assess_reputational_risks(
        self,
        clauses: List[Dict[str, Any]],
        metadata: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Assess reputational risks"""
        risks = []

        contract_text = str(metadata.get('raw_text', '')).lower()

        # Check for exclusivity
        if 'exclusive' in contract_text or 'exclusivity' in contract_text:
            risks.append({
                'type': 'EXCLUSIVITY_CLAUSE',
                'severity': 'MEDIUM',
                'description': 'Contract contains exclusivity provisions',
                'recommendation': 'Review exclusivity scope and duration',
                'category': 'REPUTATIONAL'
            })

        # Check for non-compete
        if 'non-compete' in contract_text or 'non compete' in contract_text:
            risks.append({
                'type': 'NON_COMPETE_CLAUSE',
                'severity': 'MEDIUM',
                'description': 'Contract contains non-compete provisions',
                'recommendation': 'Limit non-compete scope and geography',
                'category': 'REPUTATIONAL'
            })

        # Check for publicity/marketing restrictions
        if 'publicity' in contract_text or 'press release' in contract_text:
            risks.append({
                'type': 'PUBLICITY_RESTRICTIONS',
                'severity': 'LOW',
                'description': 'Contract contains publicity or marketing restrictions',
                'recommendation': 'Review restrictions on customer references',
                'category': 'REPUTATIONAL'
            })

        return risks

    def _calculate_risk_score(self, all_risks: List[Dict[str, Any]]) -> float:
        """
        Calculate overall risk score based on severity and count of risks
        """
        if not all_risks:
            return 0.0

        # Weight by severity
        total_weighted_score = 0
        max_possible_score = 0

        for risk in all_risks:
            severity = risk.get('severity', 'LOW')
            weight = self.severity_weights.get(severity, 25)
            total_weighted_score += weight
            max_possible_score += 100

        # Normalize to 0-100 scale
        if max_possible_score == 0:
            return 0.0

        # Apply diminishing returns for multiple risks
        risk_count = len(all_risks)
        if risk_count > 10:
            # Cap the impact of having too many risks
            adjustment_factor = 0.8 + (0.2 * (10 / risk_count))
        else:
            adjustment_factor = 1.0

        normalized_score = (total_weighted_score / max_possible_score) * 100 * adjustment_factor

        return min(normalized_score, 100.0)

    async def generate_risk_matrix(
        self,
        risk_assessment: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Generate risk matrix for visualization
        """
        matrix = {
            'by_category': {},
            'by_severity': {
                'CRITICAL': 0,
                'HIGH': 0,
                'MEDIUM': 0,
                'LOW': 0
            },
            'top_risks': []
        }

        all_risks = (
            risk_assessment.get('legal_risks', []) +
            risk_assessment.get('financial_risks', []) +
            risk_assessment.get('operational_risks', []) +
            risk_assessment.get('compliance_risks', []) +
            risk_assessment.get('reputational_risks', [])
        )

        # Count by category
        for risk in all_risks:
            category = risk.get('category', 'OTHER')
            severity = risk.get('severity', 'LOW')

            if category not in matrix['by_category']:
                matrix['by_category'][category] = 0
            matrix['by_category'][category] += 1

            matrix['by_severity'][severity] += 1

        # Get top 5 risks
        sorted_risks = sorted(
            all_risks,
            key=lambda r: self.severity_weights.get(r.get('severity', 'LOW'), 0),
            reverse=True
        )
        matrix['top_risks'] = sorted_risks[:5]

        return matrix
