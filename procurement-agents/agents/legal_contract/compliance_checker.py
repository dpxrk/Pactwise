"""Compliance Checker for contract regulatory compliance"""

import re
from typing import Dict, List, Any, Optional
from integrations.databases.contract_models import ContractType


class ComplianceChecker:
    """
    Contract compliance checking engine with:
    - Regulatory requirement validation
    - Industry-specific compliance checks
    - Jurisdiction-based requirements
    - Data protection compliance
    """
    
    def __init__(self):
        # Compliance requirements by jurisdiction
        self.jurisdiction_requirements = {
            "US": {
                "federal": [
                    "equal opportunity", "anti-discrimination",
                    "FCPA", "export control", "OFAC compliance"
                ],
                "data_protection": ["CCPA", "COPPA", "HIPAA"],
                "industry": {
                    "financial": ["SOX", "Dodd-Frank", "AML", "KYC"],
                    "healthcare": ["HIPAA", "HITECH", "FDA"],
                    "government": ["FAR", "DFARS", "Buy American"]
                }
            },
            "EU": {
                "federal": [
                    "GDPR", "anti-corruption", "competition law"
                ],
                "data_protection": ["GDPR", "ePrivacy"],
                "industry": {
                    "financial": ["MiFID II", "PSD2", "AMLD"],
                    "healthcare": ["MDR", "IVDR", "Clinical Trials"]
                }
            },
            "UK": {
                "federal": [
                    "UK GDPR", "Bribery Act", "Modern Slavery Act"
                ],
                "data_protection": ["UK GDPR", "DPA 2018"],
                "industry": {
                    "financial": ["FCA", "PRA", "MiFID"],
                    "healthcare": ["MHRA", "CQC", "NHS"]
                }
            }
        }
        
        # Required clauses by type
        self.required_clauses = {
            "data_protection": [
                "data protection", "privacy", "confidentiality",
                "data security", "breach notification"
            ],
            "anti_corruption": [
                "anti-corruption", "anti-bribery", "FCPA",
                "gifts and entertainment", "compliance with laws"
            ],
            "labor": [
                "equal opportunity", "non-discrimination",
                "minimum wage", "working conditions", "child labor"
            ],
            "environmental": [
                "environmental compliance", "sustainability",
                "waste disposal", "emissions", "hazardous materials"
            ],
            "export_control": [
                "export control", "sanctions", "ITAR",
                "dual use", "embargo"
            ]
        }
        
        # Industry-specific requirements
        self.industry_requirements = {
            "financial": [
                "AML", "KYC", "sanctions screening",
                "data retention", "audit trail", "segregation of duties"
            ],
            "healthcare": [
                "patient privacy", "HIPAA", "clinical data",
                "FDA compliance", "medical device", "pharmacovigilance"
            ],
            "technology": [
                "source code escrow", "SLA", "uptime",
                "data portability", "security standards", "penetration testing"
            ],
            "government": [
                "security clearance", "ITAR", "FAR",
                "small business", "cost accounting", "audit rights"
            ]
        }
    
    async def check_compliance(
        self,
        contract_text: str,
        contract_type: ContractType,
        jurisdiction: str = "US",
        industry: Optional[str] = None
    ) -> Dict[str, Any]:
        """Check contract compliance with regulations"""
        
        contract_lower = contract_text.lower()
        
        # Check jurisdiction requirements
        jurisdiction_compliance = self._check_jurisdiction_compliance(
            contract_lower, jurisdiction
        )
        
        # Check required clauses
        clause_compliance = self._check_required_clauses(contract_lower)
        
        # Check industry-specific requirements
        industry_compliance = {}
        if industry:
            industry_compliance = self._check_industry_compliance(
                contract_lower, industry
            )
        
        # Check data protection
        data_protection = self._check_data_protection(contract_lower, jurisdiction)
        
        # Calculate overall compliance
        is_compliant, compliance_score = self._calculate_compliance_score(
            jurisdiction_compliance,
            clause_compliance,
            industry_compliance,
            data_protection
        )
        
        # Identify issues
        issues = self._identify_compliance_issues(
            jurisdiction_compliance,
            clause_compliance,
            industry_compliance,
            data_protection
        )
        
        # Generate recommendations
        recommendations = self._generate_compliance_recommendations(issues)
        
        return {
            "is_compliant": is_compliant,
            "compliance_score": compliance_score,
            "jurisdiction_compliance": jurisdiction_compliance,
            "clause_compliance": clause_compliance,
            "industry_compliance": industry_compliance,
            "data_protection": data_protection,
            "issues": issues,
            "recommendations": recommendations,
            "summary": self._generate_compliance_summary(is_compliant, compliance_score, issues)
        }
    
    def _check_jurisdiction_compliance(
        self,
        contract_text: str,
        jurisdiction: str
    ) -> Dict[str, Any]:
        """Check compliance with jurisdiction requirements"""
        
        requirements = self.jurisdiction_requirements.get(jurisdiction, {})
        compliance_status = {}
        
        # Check federal requirements
        federal_reqs = requirements.get("federal", [])
        federal_found = []
        federal_missing = []
        
        for req in federal_reqs:
            if req.lower() in contract_text or self._find_alternative_phrasing(req, contract_text):
                federal_found.append(req)
            else:
                federal_missing.append(req)
        
        compliance_status["federal"] = {
            "found": federal_found,
            "missing": federal_missing,
            "compliance_rate": len(federal_found) / len(federal_reqs) if federal_reqs else 1.0
        }
        
        # Check data protection requirements
        data_reqs = requirements.get("data_protection", [])
        data_found = []
        data_missing = []
        
        for req in data_reqs:
            if self._check_data_protection_clause(req, contract_text):
                data_found.append(req)
            else:
                data_missing.append(req)
        
        compliance_status["data_protection"] = {
            "found": data_found,
            "missing": data_missing,
            "compliance_rate": len(data_found) / len(data_reqs) if data_reqs else 1.0
        }
        
        return compliance_status
    
    def _check_required_clauses(self, contract_text: str) -> Dict[str, Any]:
        """Check for required compliance clauses"""
        
        clause_status = {}
        
        for category, clauses in self.required_clauses.items():
            found = []
            missing = []
            
            for clause in clauses:
                if clause in contract_text:
                    found.append(clause)
                else:
                    missing.append(clause)
            
            clause_status[category] = {
                "found": found,
                "missing": missing,
                "compliance_rate": len(found) / len(clauses) if clauses else 1.0
            }
        
        return clause_status
    
    def _check_industry_compliance(
        self,
        contract_text: str,
        industry: str
    ) -> Dict[str, Any]:
        """Check industry-specific compliance"""
        
        requirements = self.industry_requirements.get(industry, [])
        found = []
        missing = []
        
        for req in requirements:
            if req.lower() in contract_text:
                found.append(req)
            else:
                missing.append(req)
        
        return {
            "industry": industry,
            "found": found,
            "missing": missing,
            "compliance_rate": len(found) / len(requirements) if requirements else 1.0
        }
    
    def _check_data_protection(
        self,
        contract_text: str,
        jurisdiction: str
    ) -> Dict[str, Any]:
        """Check data protection compliance"""
        
        data_protection_status = {
            "has_privacy_clause": False,
            "has_data_security": False,
            "has_breach_notification": False,
            "has_data_retention": False,
            "has_data_rights": False,
            "gdpr_compliant": False
        }
        
        # Check for privacy clause
        if any(term in contract_text for term in ["privacy", "data protection", "personal information"]):
            data_protection_status["has_privacy_clause"] = True
        
        # Check for data security
        if any(term in contract_text for term in ["data security", "encryption", "security measures"]):
            data_protection_status["has_data_security"] = True
        
        # Check for breach notification
        if "breach" in contract_text and "notification" in contract_text:
            data_protection_status["has_breach_notification"] = True
        
        # Check for data retention
        if "data retention" in contract_text or "retention period" in contract_text:
            data_protection_status["has_data_retention"] = True
        
        # Check for data subject rights
        if any(term in contract_text for term in ["right to access", "right to delete", "data portability"]):
            data_protection_status["has_data_rights"] = True
        
        # GDPR specific checks
        if jurisdiction in ["EU", "UK"]:
            gdpr_terms = ["gdpr", "general data protection regulation", "data controller", "data processor"]
            if any(term in contract_text for term in gdpr_terms):
                data_protection_status["gdpr_compliant"] = True
        
        return data_protection_status
    
    def _check_data_protection_clause(self, requirement: str, contract_text: str) -> bool:
        """Check if data protection requirement is met"""
        
        requirement_lower = requirement.lower()
        
        # GDPR check
        if "gdpr" in requirement_lower:
            return "gdpr" in contract_text or "general data protection" in contract_text
        
        # CCPA check
        elif "ccpa" in requirement_lower:
            return "ccpa" in contract_text or "california consumer privacy" in contract_text
        
        # HIPAA check
        elif "hipaa" in requirement_lower:
            return "hipaa" in contract_text or "health insurance portability" in contract_text
        
        return requirement_lower in contract_text
    
    def _find_alternative_phrasing(self, requirement: str, contract_text: str) -> bool:
        """Find alternative phrasings for compliance requirements"""
        
        alternatives = {
            "FCPA": ["foreign corrupt practices", "anti-bribery"],
            "export control": ["export restrictions", "export compliance", "ITAR"],
            "equal opportunity": ["non-discrimination", "equal employment"],
            "anti-corruption": ["anti-bribery", "corrupt practices", "FCPA"]
        }
        
        alt_phrases = alternatives.get(requirement, [])
        
        for phrase in alt_phrases:
            if phrase.lower() in contract_text:
                return True
        
        return False
    
    def _calculate_compliance_score(
        self,
        jurisdiction_compliance: Dict,
        clause_compliance: Dict,
        industry_compliance: Dict,
        data_protection: Dict
    ) -> Tuple[bool, float]:
        """Calculate overall compliance score"""
        
        scores = []
        
        # Jurisdiction compliance score
        if jurisdiction_compliance:
            for category in jurisdiction_compliance.values():
                if isinstance(category, dict) and "compliance_rate" in category:
                    scores.append(category["compliance_rate"])
        
        # Clause compliance score
        for category in clause_compliance.values():
            if "compliance_rate" in category:
                scores.append(category["compliance_rate"])
        
        # Industry compliance score
        if industry_compliance and "compliance_rate" in industry_compliance:
            scores.append(industry_compliance["compliance_rate"])
        
        # Data protection score
        data_score = sum(1 for v in data_protection.values() if v) / len(data_protection)
        scores.append(data_score)
        
        # Calculate average
        overall_score = sum(scores) / len(scores) if scores else 0
        overall_score = round(overall_score * 100, 2)
        
        # Determine if compliant (threshold: 70%)
        is_compliant = overall_score >= 70
        
        return is_compliant, overall_score
    
    def _identify_compliance_issues(
        self,
        jurisdiction_compliance: Dict,
        clause_compliance: Dict,
        industry_compliance: Dict,
        data_protection: Dict
    ) -> List[str]:
        """Identify specific compliance issues"""
        
        issues = []
        
        # Jurisdiction issues
        for category, status in jurisdiction_compliance.items():
            if isinstance(status, dict) and status.get("missing"):
                for item in status["missing"][:3]:  # Top 3
                    issues.append(f"Missing {category} requirement: {item}")
        
        # Clause issues
        for category, status in clause_compliance.items():
            if status["compliance_rate"] < 0.5:
                issues.append(f"Insufficient {category.replace('_', ' ')} clauses")
        
        # Industry issues
        if industry_compliance and industry_compliance.get("missing"):
            for item in industry_compliance["missing"][:3]:
                issues.append(f"Missing industry requirement: {item}")
        
        # Data protection issues
        if not data_protection.get("has_privacy_clause"):
            issues.append("Missing privacy/data protection clause")
        
        if not data_protection.get("has_breach_notification"):
            issues.append("Missing data breach notification clause")
        
        return issues
    
    def _generate_compliance_recommendations(
        self,
        issues: List[str]
    ) -> List[str]:
        """Generate recommendations to address compliance issues"""
        
        recommendations = []
        
        for issue in issues:
            if "GDPR" in issue or "data protection" in issue:
                recommendations.append("Add comprehensive GDPR-compliant data protection clause")
            elif "FCPA" in issue or "anti-corruption" in issue:
                recommendations.append("Include anti-corruption and anti-bribery provisions")
            elif "export" in issue:
                recommendations.append("Add export control compliance clause")
            elif "breach notification" in issue:
                recommendations.append("Include data breach notification procedures (72-hour requirement)")
            elif "privacy" in issue:
                recommendations.append("Add privacy policy and data handling procedures")
            elif "industry requirement" in issue:
                recommendations.append(f"Review and add {issue.split(':')[1].strip()} provisions")
            else:
                recommendations.append(f"Address: {issue}")
        
        return list(set(recommendations))[:10]  # Unique, top 10
    
    def _generate_compliance_summary(
        self,
        is_compliant: bool,
        compliance_score: float,
        issues: List[str]
    ) -> str:
        """Generate compliance summary"""
        
        if is_compliant:
            summary = f"Contract is compliant with regulatory requirements (Score: {compliance_score:.1f}%)."
        else:
            summary = f"Contract has compliance gaps (Score: {compliance_score:.1f}%)."
        
        if issues:
            summary += f" {len(issues)} compliance issues identified requiring attention."
        
        if compliance_score < 50:
            summary += " Significant compliance remediation required before execution."
        elif compliance_score < 70:
            summary += " Moderate compliance improvements needed."
        
        return summary