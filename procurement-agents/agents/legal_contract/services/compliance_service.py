"""Comprehensive Compliance Checking Service - GDPR, CCPA, SOX, HIPAA, Industry Standards"""

from typing import Dict, List, Any, Optional
from enum import Enum
import re


class ComplianceFramework(str, Enum):
    """Regulatory compliance frameworks"""
    GDPR = "GDPR"
    CCPA = "CCPA"
    SOX = "SOX"
    HIPAA = "HIPAA"
    PCI_DSS = "PCI_DSS"
    ISO_27001 = "ISO_27001"
    SOC2 = "SOC2"


class ComplianceService:
    """
    Comprehensive regulatory and policy compliance checking for contracts
    Supports: GDPR, CCPA, SOX, HIPAA, PCI-DSS, ISO standards, SOC 2
    """

    def __init__(self):
        # GDPR required elements
        self.gdpr_requirements = [
            'data subject rights',
            'data processor',
            'data controller',
            'right to erasure',
            'right to access',
            'data breach notification',
            'data protection officer',
            'lawful basis for processing',
            'consent',
            'data minimization'
        ]

        # CCPA required elements
        self.ccpa_requirements = [
            'personal information',
            'right to know',
            'right to delete',
            'right to opt-out',
            'non-discrimination',
            'consumer rights'
        ]

        # SOX requirements for contracts
        self.sox_requirements = [
            'internal controls',
            'financial disclosure',
            'audit rights',
            'record retention',
            'whistleblower protection'
        ]

        # HIPAA requirements
        self.hipaa_requirements = [
            'protected health information',
            'phi',
            'business associate',
            'hipaa compliance',
            'breach notification',
            'minimum necessary',
            'safeguards'
        ]

    async def check_compliance(
        self,
        contract_data: Dict[str, Any],
        extracted_data: Dict[str, Any],
        clauses: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Comprehensive compliance check across multiple frameworks
        """
        metadata = extracted_data['metadata']
        text = contract_data['raw_text']

        compliance_results = {
            'regulatory': [],
            'corporate_policy': [],
            'industry_standards': [],
            'overall_compliant': True,
            'compliance_score': 0.0
        }

        jurisdiction = metadata.get('jurisdiction', 'US')
        contract_type = metadata.get('contract_type', '')

        # GDPR Compliance (if EU/UK or data processing)
        if jurisdiction in ['EU', 'UK', 'EEA'] or self._involves_data_processing(text):
            gdpr_result = await self.check_gdpr_compliance(text, clauses)
            compliance_results['regulatory'].append(gdpr_result)
            if not gdpr_result['compliant']:
                compliance_results['overall_compliant'] = False

        # CCPA Compliance (if California)
        if jurisdiction in ['CA', 'California'] or 'california' in text.lower():
            ccpa_result = await self.check_ccpa_compliance(text, clauses)
            compliance_results['regulatory'].append(ccpa_result)
            if not ccpa_result['compliant']:
                compliance_results['overall_compliant'] = False

        # SOX Compliance (if public company)
        if self._is_public_company():
            sox_result = await self.check_sox_compliance(text, metadata)
            compliance_results['regulatory'].append(sox_result)
            if not sox_result['compliant']:
                compliance_results['overall_compliant'] = False

        # HIPAA Compliance (if healthcare/medical)
        if contract_type in ['HEALTHCARE', 'MEDICAL'] or self._involves_phi(text):
            hipaa_result = await self.check_hipaa_compliance(text, clauses)
            compliance_results['regulatory'].append(hipaa_result)
            if not hipaa_result['compliant']:
                compliance_results['overall_compliant'] = False

        # Industry Standards
        industry_checks = await self._check_industry_standards(
            contract_type, text, clauses
        )
        compliance_results['industry_standards'] = industry_checks

        # Calculate overall compliance score
        compliance_results['compliance_score'] = self._calculate_compliance_score(
            compliance_results
        )

        return compliance_results

    async def check_gdpr_compliance(
        self,
        text: str,
        clauses: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Check GDPR compliance"""
        text_lower = text.lower()

        result = {
            'framework': 'GDPR',
            'compliant': True,
            'score': 0,
            'missing_requirements': [],
            'details': [],
            'recommendations': []
        }

        found_requirements = 0
        total_requirements = len(self.gdpr_requirements)

        # Check for GDPR-specific terms
        for requirement in self.gdpr_requirements:
            if requirement in text_lower:
                found_requirements += 1
                result['details'].append(f"Found: {requirement}")
            else:
                result['missing_requirements'].append(requirement)

        # Check data protection clauses
        data_clauses = [
            c for c in clauses
            if c.get('category') == 'DATA_PROTECTION'
        ]

        if not data_clauses:
            result['compliant'] = False
            result['recommendations'].append(
                "Add comprehensive data protection clause covering GDPR requirements"
            )
        else:
            # Check if data clause has key GDPR elements
            for clause in data_clauses:
                if not clause.get('gdpr_compliant'):
                    result['compliant'] = False
                    result['recommendations'].append(
                        "Enhance data protection clause to include all GDPR requirements"
                    )

        # Calculate score
        result['score'] = (found_requirements / total_requirements) * 100

        if result['score'] < 70:
            result['compliant'] = False
            result['recommendations'].append(
                f"GDPR compliance score is {result['score']:.0f}%. "
                "Must include: data subject rights, lawful basis, breach notification"
            )

        # Check for DPA (Data Processing Agreement)
        if 'data processing agreement' not in text_lower and 'dpa' not in text_lower:
            result['recommendations'].append(
                "Include Data Processing Agreement (DPA) as required by GDPR Article 28"
            )

        return result

    async def check_ccpa_compliance(
        self,
        text: str,
        clauses: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Check CCPA compliance"""
        text_lower = text.lower()

        result = {
            'framework': 'CCPA',
            'compliant': True,
            'score': 0,
            'missing_requirements': [],
            'details': [],
            'recommendations': []
        }

        found_requirements = 0
        total_requirements = len(self.ccpa_requirements)

        for requirement in self.ccpa_requirements:
            if requirement in text_lower:
                found_requirements += 1
                result['details'].append(f"Found: {requirement}")
            else:
                result['missing_requirements'].append(requirement)

        result['score'] = (found_requirements / total_requirements) * 100

        if result['score'] < 60:
            result['compliant'] = False
            result['recommendations'].append(
                f"CCPA compliance score is {result['score']:.0f}%. "
                "Must include consumer rights: right to know, delete, and opt-out"
            )

        # Check for specific CCPA requirements
        if 'do not sell' not in text_lower and 'opt-out' not in text_lower:
            result['compliant'] = False
            result['recommendations'].append(
                "Include provisions for consumer opt-out rights (Do Not Sell)"
            )

        if 'non-discrimination' not in text_lower:
            result['recommendations'].append(
                "Add non-discrimination clause for consumers exercising CCPA rights"
            )

        return result

    async def check_sox_compliance(
        self,
        text: str,
        metadata: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Check SOX (Sarbanes-Oxley) compliance"""
        text_lower = text.lower()

        result = {
            'framework': 'SOX',
            'compliant': True,
            'score': 0,
            'missing_requirements': [],
            'details': [],
            'recommendations': []
        }

        found_requirements = 0
        total_requirements = len(self.sox_requirements)

        for requirement in self.sox_requirements:
            if requirement in text_lower:
                found_requirements += 1
                result['details'].append(f"Found: {requirement}")
            else:
                result['missing_requirements'].append(requirement)

        result['score'] = (found_requirements / total_requirements) * 100

        # SOX-specific checks
        if 'audit' not in text_lower and 'audit rights' not in text_lower:
            result['compliant'] = False
            result['recommendations'].append(
                "Add audit rights clause for SOX compliance verification"
            )

        if 'record retention' not in text_lower and 'records' not in text_lower:
            result['compliant'] = False
            result['recommendations'].append(
                "Include record retention requirements (minimum 7 years for SOX)"
            )

        # Check contract value threshold
        contract_value = metadata.get('contract_value', 0)
        if contract_value and contract_value > 1000000:  # $1M+
            if 'internal controls' not in text_lower:
                result['recommendations'].append(
                    "High-value contracts should include internal controls provisions"
                )

        if result['score'] < 60:
            result['compliant'] = False

        return result

    async def check_hipaa_compliance(
        self,
        text: str,
        clauses: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Check HIPAA compliance"""
        text_lower = text.lower()

        result = {
            'framework': 'HIPAA',
            'compliant': True,
            'score': 0,
            'missing_requirements': [],
            'details': [],
            'recommendations': []
        }

        found_requirements = 0
        total_requirements = len(self.hipaa_requirements)

        for requirement in self.hipaa_requirements:
            if requirement in text_lower:
                found_requirements += 1
                result['details'].append(f"Found: {requirement}")
            else:
                result['missing_requirements'].append(requirement)

        result['score'] = (found_requirements / total_requirements) * 100

        # Check for BAA (Business Associate Agreement)
        if 'business associate agreement' not in text_lower and 'baa' not in text_lower:
            result['compliant'] = False
            result['recommendations'].append(
                "Include Business Associate Agreement (BAA) as required by HIPAA"
            )

        # Check for PHI safeguards
        if 'safeguards' not in text_lower and 'security measures' not in text_lower:
            result['compliant'] = False
            result['recommendations'].append(
                "Add technical, physical, and administrative safeguards for PHI"
            )

        # Breach notification
        if 'breach notification' not in text_lower:
            result['compliant'] = False
            result['recommendations'].append(
                "Include breach notification requirements (within 60 days)"
            )

        if result['score'] < 70:
            result['compliant'] = False

        return result

    async def _check_industry_standards(
        self,
        contract_type: str,
        text: str,
        clauses: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Check industry-specific standards"""
        standards = []

        text_lower = text.lower()

        # ISO 27001 (Information Security)
        if contract_type in ['SOFTWARE', 'SAAS', 'IT', 'SERVICES']:
            iso_check = {
                'standard': 'ISO 27001',
                'compliant': 'iso 27001' in text_lower or 'information security' in text_lower,
                'recommendation': 'Consider requiring ISO 27001 certification for information security'
            }
            standards.append(iso_check)

        # SOC 2 (Service Organization Controls)
        if contract_type in ['SAAS', 'CLOUD', 'SERVICES']:
            soc2_check = {
                'standard': 'SOC 2',
                'compliant': 'soc 2' in text_lower or 'soc2' in text_lower,
                'recommendation': 'Request SOC 2 Type II report for cloud service providers'
            }
            standards.append(soc2_check)

        # PCI DSS (Payment Card Industry)
        if 'payment' in text_lower or 'credit card' in text_lower:
            pci_check = {
                'standard': 'PCI DSS',
                'compliant': 'pci' in text_lower or 'payment card industry' in text_lower,
                'recommendation': 'Require PCI DSS compliance for payment processing'
            }
            standards.append(pci_check)

        return standards

    def _involves_data_processing(self, text: str) -> bool:
        """Check if contract involves data processing"""
        data_indicators = [
            'personal data',
            'personal information',
            'customer data',
            'user data',
            'data processing',
            'data collection'
        ]
        text_lower = text.lower()
        return any(indicator in text_lower for indicator in data_indicators)

    def _involves_phi(self, text: str) -> bool:
        """Check if contract involves Protected Health Information"""
        phi_indicators = [
            'health information',
            'medical records',
            'patient data',
            'phi',
            'protected health',
            'healthcare'
        ]
        text_lower = text.lower()
        return any(indicator in text_lower for indicator in phi_indicators)

    def _is_public_company(self) -> bool:
        """Check if company is public (would check config in production)"""
        # TODO: Load from config
        return False  # Placeholder

    def _calculate_compliance_score(
        self,
        compliance_results: Dict[str, Any]
    ) -> float:
        """Calculate overall compliance score"""
        regulatory_checks = compliance_results.get('regulatory', [])

        if not regulatory_checks:
            return 100.0  # No regulatory requirements

        total_score = 0
        for check in regulatory_checks:
            total_score += check.get('score', 0)

        return total_score / len(regulatory_checks)

    async def generate_compliance_report(
        self,
        compliance_results: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate detailed compliance report"""
        report = {
            'overall_status': 'COMPLIANT' if compliance_results['overall_compliant'] else 'NON_COMPLIANT',
            'compliance_score': compliance_results['compliance_score'],
            'frameworks_checked': [],
            'critical_issues': [],
            'recommendations': [],
            'certifications_required': []
        }

        # Extract framework results
        for check in compliance_results.get('regulatory', []):
            framework_result = {
                'framework': check['framework'],
                'compliant': check['compliant'],
                'score': check['score'],
                'missing_requirements': check.get('missing_requirements', [])
            }
            report['frameworks_checked'].append(framework_result)

            if not check['compliant']:
                report['critical_issues'].append({
                    'framework': check['framework'],
                    'issue': f"Non-compliant with {check['framework']}",
                    'severity': 'HIGH'
                })

            report['recommendations'].extend(check.get('recommendations', []))

        # Industry standards
        for standard in compliance_results.get('industry_standards', []):
            if not standard.get('compliant'):
                report['certifications_required'].append(standard['standard'])
                report['recommendations'].append(standard.get('recommendation', ''))

        return report
