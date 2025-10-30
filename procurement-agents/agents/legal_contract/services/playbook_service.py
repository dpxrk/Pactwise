"""Contract Playbook Comparison Service - Compare contracts against company standards"""

from typing import Dict, List, Any, Optional
from enum import Enum
import json
from pathlib import Path


class RequirementType(str, Enum):
    """Playbook requirement types"""
    REQUIRED = "REQUIRED"
    PREFERRED = "PREFERRED"
    PROHIBITED = "PROHIBITED"
    OPTIONAL = "OPTIONAL"


class PlaybookService:
    """
    Contract playbook comparison service
    Compares contracts against company-defined standard terms and preferred language
    """

    def __init__(self, playbook_dir: Optional[Path] = None):
        self.playbook_dir = playbook_dir or Path("./playbooks")
        self.playbooks = self._load_playbooks()

    def _load_playbooks(self) -> Dict[str, Any]:
        """Load contract playbooks from files"""
        # In production, load from database or files
        # For now, return default playbooks
        return {
            'SOFTWARE': self._get_software_playbook(),
            'SAAS': self._get_saas_playbook(),
            'SERVICES': self._get_services_playbook(),
            'MSA': self._get_msa_playbook(),
            'PURCHASE': self._get_purchase_playbook()
        }

    def _get_software_playbook(self) -> Dict[str, Any]:
        """Software/SaaS contract playbook"""
        return {
            'contract_type': 'SOFTWARE',
            'requirements': [
                {
                    'clause_type': 'LICENSE_GRANT',
                    'type': RequirementType.REQUIRED,
                    'description': 'Clear license grant with scope',
                    'preferred_language': 'Vendor grants Customer a non-exclusive, non-transferable license to use the Software...'
                },
                {
                    'clause_type': 'SLA',
                    'type': RequirementType.REQUIRED,
                    'description': 'Service Level Agreement with uptime guarantees',
                    'preferred_language': 'Vendor will maintain 99.9% uptime with credits for failures'
                },
                {
                    'clause_type': 'DATA_PROTECTION',
                    'type': RequirementType.REQUIRED,
                    'description': 'GDPR-compliant data protection',
                    'preferred_language': 'Vendor will process data in accordance with GDPR and other applicable data protection laws'
                },
                {
                    'clause_type': 'SECURITY',
                    'type': RequirementType.REQUIRED,
                    'description': 'Security standards and certifications',
                    'preferred_language': 'Vendor maintains SOC 2 Type II certification and implements industry-standard security controls'
                },
                {
                    'clause_type': 'IP_OWNERSHIP',
                    'type': RequirementType.REQUIRED,
                    'description': 'Customer owns all customer data',
                    'preferred_language': 'Customer retains all rights, title and interest in Customer Data'
                },
                {
                    'clause_type': 'TERMINATION_CONVENIENCE',
                    'type': RequirementType.PREFERRED,
                    'description': 'Right to terminate for convenience',
                    'preferred_language': 'Either party may terminate with 90 days written notice'
                },
                {
                    'clause_type': 'LIABILITY_CAP',
                    'type': RequirementType.REQUIRED,
                    'description': 'Reasonable liability cap',
                    'preferred_language': 'Liability capped at 12 months fees paid, with exceptions for gross negligence, fraud, IP infringement'
                },
                {
                    'clause_type': 'AUTO_RENEWAL',
                    'type': RequirementType.PROHIBITED,
                    'description': 'Auto-renewal without notice',
                    'preferred_language': None
                },
                {
                    'clause_type': 'UNLIMITED_LIABILITY',
                    'type': RequirementType.PROHIBITED,
                    'description': 'Unlimited liability for Customer',
                    'preferred_language': None
                }
            ],
            'financial_limits': {
                'max_advance_payment': 25,  # percentage
                'preferred_payment_terms': 'Net 30',
                'max_annual_increase': 5  # percentage
            }
        }

    def _get_saas_playbook(self) -> Dict[str, Any]:
        """SaaS contract playbook"""
        playbook = self._get_software_playbook()
        playbook['contract_type'] = 'SAAS'
        # Add SaaS-specific requirements
        playbook['requirements'].extend([
            {
                'clause_type': 'DATA_EXPORT',
                'type': RequirementType.REQUIRED,
                'description': 'Right to export data at any time',
                'preferred_language': 'Customer may export all data in standard format at any time'
            },
            {
                'clause_type': 'DOWNTIME_CREDITS',
                'type': RequirementType.REQUIRED,
                'description': 'Service credits for downtime',
                'preferred_language': 'Vendor provides service credits: 10% for 99-99.9% uptime, 25% for <99%'
            }
        ])
        return playbook

    def _get_services_playbook(self) -> Dict[str, Any]:
        """Professional services playbook"""
        return {
            'contract_type': 'SERVICES',
            'requirements': [
                {
                    'clause_type': 'SCOPE_OF_WORK',
                    'type': RequirementType.REQUIRED,
                    'description': 'Detailed scope of work',
                    'preferred_language': 'Specific deliverables, timeline, and acceptance criteria'
                },
                {
                    'clause_type': 'WORK_PRODUCT_OWNERSHIP',
                    'type': RequirementType.REQUIRED,
                    'description': 'Customer owns all work product',
                    'preferred_language': 'All work product created shall be owned by Customer'
                },
                {
                    'clause_type': 'BACKGROUND_CHECKS',
                    'type': RequirementType.PREFERRED,
                    'description': 'Background checks for personnel',
                    'preferred_language': 'Vendor will conduct background checks on all personnel'
                },
                {
                    'clause_type': 'CHANGE_ORDERS',
                    'type': RequirementType.REQUIRED,
                    'description': 'Change order process',
                    'preferred_language': 'Changes require written change order signed by both parties'
                }
            ]
        }

    def _get_msa_playbook(self) -> Dict[str, Any]:
        """Master Service Agreement playbook"""
        return {
            'contract_type': 'MSA',
            'requirements': [
                {
                    'clause_type': 'MUTUAL_INDEMNIFICATION',
                    'type': RequirementType.REQUIRED,
                    'description': 'Mutual indemnification',
                    'preferred_language': 'Each party indemnifies the other for third-party claims arising from breach'
                },
                {
                    'clause_type': 'CONFIDENTIALITY',
                    'type': RequirementType.REQUIRED,
                    'description': 'Mutual confidentiality obligations',
                    'preferred_language': 'Both parties protect confidential information for 5 years'
                },
                {
                    'clause_type': 'INSURANCE',
                    'type': RequirementType.REQUIRED,
                    'description': 'Vendor insurance requirements',
                    'preferred_language': 'Vendor maintains $1M general liability and appropriate professional liability insurance'
                },
                {
                    'clause_type': 'AUDIT_RIGHTS',
                    'type': RequirementType.PREFERRED,
                    'description': 'Right to audit vendor',
                    'preferred_language': 'Customer may audit Vendor compliance annually with 30 days notice'
                }
            ]
        }

    def _get_purchase_playbook(self) -> Dict[str, Any]:
        """Purchase agreement playbook"""
        return {
            'contract_type': 'PURCHASE',
            'requirements': [
                {
                    'clause_type': 'WARRANTIES',
                    'type': RequirementType.REQUIRED,
                    'description': 'Product warranties',
                    'preferred_language': 'Vendor warrants products are free from defects for 12 months'
                },
                {
                    'clause_type': 'DELIVERY_TERMS',
                    'type': RequirementType.REQUIRED,
                    'description': 'Clear delivery terms',
                    'preferred_language': 'Delivery FOB destination, risk of loss passes on acceptance'
                },
                {
                    'clause_type': 'INSPECTION_RIGHTS',
                    'type': RequirementType.REQUIRED,
                    'description': 'Right to inspect and reject',
                    'preferred_language': 'Customer may inspect and reject non-conforming goods within 30 days'
                },
                {
                    'clause_type': 'RETURN_POLICY',
                    'type': RequirementType.PREFERRED,
                    'description': 'Return and refund policy',
                    'preferred_language': 'Defective goods may be returned for refund or replacement'
                }
            ]
        }

    async def compare_to_playbook(
        self,
        extracted_data: Dict[str, Any],
        clauses: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Compare contract to applicable playbook
        """
        contract_type = extracted_data['metadata'].get('contract_type', 'OTHER')

        # Get applicable playbook
        playbook = self.playbooks.get(contract_type)

        if not playbook:
            return {
                'playbook_found': False,
                'compliance_score': 0.0,
                'message': f'No playbook defined for contract type: {contract_type}'
            }

        comparison = {
            'playbook_found': True,
            'contract_type': contract_type,
            'deviations': [],
            'missing_required_clauses': [],
            'missing_preferred_clauses': [],
            'prohibited_clauses_found': [],
            'compliant_clauses': [],
            'compliance_score': 0.0
        }

        # Check each playbook requirement
        total_requirements = 0
        met_requirements = 0

        for requirement in playbook.get('requirements', []):
            req_type = requirement['type']
            clause_type = requirement['clause_type']

            # Check if clause exists in contract
            has_clause = self._has_clause_type(clauses, clause_type)

            if req_type == RequirementType.REQUIRED:
                total_requirements += 1
                if has_clause:
                    met_requirements += 1
                    comparison['compliant_clauses'].append({
                        'clause_type': clause_type,
                        'status': 'PRESENT'
                    })
                else:
                    comparison['missing_required_clauses'].append({
                        'clause_type': clause_type,
                        'severity': 'HIGH',
                        'description': requirement['description'],
                        'playbook_language': requirement.get('preferred_language', '')
                    })

            elif req_type == RequirementType.PREFERRED:
                total_requirements += 1
                if has_clause:
                    met_requirements += 1
                    comparison['compliant_clauses'].append({
                        'clause_type': clause_type,
                        'status': 'PRESENT'
                    })
                else:
                    comparison['missing_preferred_clauses'].append({
                        'clause_type': clause_type,
                        'severity': 'MEDIUM',
                        'description': requirement['description'],
                        'playbook_language': requirement.get('preferred_language', '')
                    })

            elif req_type == RequirementType.PROHIBITED:
                if has_clause:
                    comparison['prohibited_clauses_found'].append({
                        'clause_type': clause_type,
                        'severity': 'CRITICAL',
                        'description': requirement['description'],
                        'reason': 'Prohibited by company policy'
                    })
                else:
                    met_requirements += 1  # Good - prohibited clause not found

                total_requirements += 1

        # Calculate compliance score
        if total_requirements > 0:
            comparison['compliance_score'] = (met_requirements / total_requirements) * 100
        else:
            comparison['compliance_score'] = 100.0

        # Check financial terms if applicable
        if 'financial_limits' in playbook:
            financial_compliance = self._check_financial_compliance(
                extracted_data['metadata'],
                playbook['financial_limits']
            )
            comparison['financial_compliance'] = financial_compliance

        return comparison

    def _has_clause_type(
        self,
        clauses: List[Dict[str, Any]],
        clause_type: str
    ) -> bool:
        """Check if contract has a specific clause type"""
        # Map playbook clause types to extracted clause categories
        clause_mapping = {
            'LICENSE_GRANT': ['LICENSE', 'IP_RIGHTS'],
            'SLA': ['SLA'],
            'DATA_PROTECTION': ['DATA_PROTECTION'],
            'SECURITY': ['SECURITY', 'DATA_PROTECTION'],
            'IP_OWNERSHIP': ['IP_RIGHTS'],
            'TERMINATION_CONVENIENCE': ['TERMINATION'],
            'LIABILITY_CAP': ['LIABILITY'],
            'AUTO_RENEWAL': ['RENEWAL', 'TERMINATION'],
            'UNLIMITED_LIABILITY': ['LIABILITY'],
            'MUTUAL_INDEMNIFICATION': ['INDEMNIFICATION'],
            'CONFIDENTIALITY': ['CONFIDENTIALITY'],
            'INSURANCE': ['INSURANCE'],
            'WARRANTIES': ['WARRANTY'],
            'AUDIT_RIGHTS': ['AUDIT_RIGHTS']
        }

        mapped_categories = clause_mapping.get(clause_type, [clause_type])

        for clause in clauses:
            clause_category = clause.get('category', '').upper()
            if clause_category in mapped_categories:
                # Additional checks for specific clause types
                if clause_type == 'TERMINATION_CONVENIENCE':
                    if clause.get('termination_for_convenience'):
                        return True
                elif clause_type == 'MUTUAL_INDEMNIFICATION':
                    if clause.get('mutual'):
                        return True
                elif clause_type == 'LIABILITY_CAP':
                    if clause.get('has_cap'):
                        return True
                elif clause_type == 'AUTO_RENEWAL':
                    # This is prohibited, so we check if it exists
                    return clause.get('auto_renewal', False)
                else:
                    return True

        return False

    def _check_financial_compliance(
        self,
        metadata: Dict[str, Any],
        limits: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Check if financial terms comply with playbook limits"""
        compliance = {
            'compliant': True,
            'violations': []
        }

        # Check advance payment
        payment_terms = metadata.get('payment_terms', '').lower()
        if 'advance' in payment_terms:
            # Extract percentage (simplified)
            import re
            match = re.search(r'(\d+)\s*%', payment_terms)
            if match:
                advance_pct = int(match.group(1))
                max_advance = limits.get('max_advance_payment', 100)
                if advance_pct > max_advance:
                    compliance['compliant'] = False
                    compliance['violations'].append({
                        'type': 'ADVANCE_PAYMENT',
                        'value': f'{advance_pct}%',
                        'limit': f'{max_advance}%',
                        'severity': 'MEDIUM'
                    })

        # Check payment terms
        preferred_terms = limits.get('preferred_payment_terms', 'Net 30')
        if payment_terms and preferred_terms.lower() not in payment_terms:
            compliance['violations'].append({
                'type': 'PAYMENT_TERMS',
                'value': payment_terms,
                'preferred': preferred_terms,
                'severity': 'LOW'
            })

        return compliance

    async def generate_playbook_recommendations(
        self,
        comparison: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Generate recommendations based on playbook comparison"""
        recommendations = []

        # Missing required clauses
        for missing in comparison.get('missing_required_clauses', []):
            recommendations.append({
                'priority': 'HIGH',
                'category': 'MISSING_REQUIRED_CLAUSE',
                'action': f'Add required {missing["clause_type"]} clause',
                'details': missing['description'],
                'suggested_language': missing.get('playbook_language', '')
            })

        # Missing preferred clauses
        for missing in comparison.get('missing_preferred_clauses', []):
            recommendations.append({
                'priority': 'MEDIUM',
                'category': 'MISSING_PREFERRED_CLAUSE',
                'action': f'Consider adding {missing["clause_type"]} clause',
                'details': missing['description'],
                'suggested_language': missing.get('playbook_language', '')
            })

        # Prohibited clauses found
        for prohibited in comparison.get('prohibited_clauses_found', []):
            recommendations.append({
                'priority': 'CRITICAL',
                'category': 'PROHIBITED_CLAUSE',
                'action': f'Remove or modify {prohibited["clause_type"]}',
                'details': prohibited['reason']
            })

        # Financial compliance
        financial = comparison.get('financial_compliance', {})
        if not financial.get('compliant', True):
            for violation in financial.get('violations', []):
                recommendations.append({
                    'priority': violation['severity'],
                    'category': 'FINANCIAL_TERMS',
                    'action': f'Adjust {violation["type"]}',
                    'details': f'Current: {violation["value"]}, Limit/Preferred: {violation.get("limit") or violation.get("preferred")}'
                })

        return recommendations
