"""
Compliance checking module for contracts.
"""

import re
import logging
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class Regulation(Enum):
    """Supported regulations."""
    GDPR = "GDPR"
    CCPA = "CCPA"
    HIPAA = "HIPAA"
    SOX = "SOX"
    SOC2 = "SOC2"
    ISO27001 = "ISO27001"
    PCI_DSS = "PCI_DSS"
    FERPA = "FERPA"
    GLBA = "GLBA"
    FCPA = "FCPA"


@dataclass
class ComplianceRequirement:
    """Represents a compliance requirement."""
    regulation: Regulation
    requirement: str
    description: str
    severity: str  # critical, high, medium, low
    check_pattern: Optional[str] = None


class ComplianceChecker:
    """
    Check contracts for regulatory compliance.
    """
    
    # Compliance requirements database
    REQUIREMENTS = {
        Regulation.GDPR: [
            ComplianceRequirement(
                regulation=Regulation.GDPR,
                requirement="lawful_basis",
                description="Lawful basis for data processing",
                severity="critical",
                check_pattern=r"lawful basis|legal basis|consent|legitimate interest"
            ),
            ComplianceRequirement(
                regulation=Regulation.GDPR,
                requirement="data_subject_rights",
                description="Data subject rights (access, deletion, portability)",
                severity="critical",
                check_pattern=r"data subject|right to access|right to erasure|right to portability|right to rectification"
            ),
            ComplianceRequirement(
                regulation=Regulation.GDPR,
                requirement="breach_notification",
                description="72-hour breach notification",
                severity="high",
                check_pattern=r"breach notification|72 hours?|seventy.?two hours?"
            ),
            ComplianceRequirement(
                regulation=Regulation.GDPR,
                requirement="dpo",
                description="Data Protection Officer designation",
                severity="medium",
                check_pattern=r"data protection officer|DPO"
            ),
            ComplianceRequirement(
                regulation=Regulation.GDPR,
                requirement="data_retention",
                description="Data retention and deletion policies",
                severity="high",
                check_pattern=r"data retention|retention period|deletion|data minimization"
            ),
            ComplianceRequirement(
                regulation=Regulation.GDPR,
                requirement="international_transfers",
                description="Cross-border data transfer safeguards",
                severity="high",
                check_pattern=r"international transfer|cross.?border|standard contractual clauses|SCC|adequacy"
            )
        ],
        Regulation.CCPA: [
            ComplianceRequirement(
                regulation=Regulation.CCPA,
                requirement="opt_out",
                description="Right to opt-out of data sale",
                severity="critical",
                check_pattern=r"opt.?out|do not sell|sale of personal information"
            ),
            ComplianceRequirement(
                regulation=Regulation.CCPA,
                requirement="disclosure",
                description="Disclosure of data collection practices",
                severity="high",
                check_pattern=r"categories of personal information|disclosure|collection practices"
            ),
            ComplianceRequirement(
                regulation=Regulation.CCPA,
                requirement="non_discrimination",
                description="Non-discrimination for exercising rights",
                severity="high",
                check_pattern=r"non.?discrimination|discriminate|equal service"
            ),
            ComplianceRequirement(
                regulation=Regulation.CCPA,
                requirement="deletion_right",
                description="Right to delete personal information",
                severity="high",
                check_pattern=r"right to delete|deletion request|erase personal"
            )
        ],
        Regulation.HIPAA: [
            ComplianceRequirement(
                regulation=Regulation.HIPAA,
                requirement="baa",
                description="Business Associate Agreement",
                severity="critical",
                check_pattern=r"business associate agreement|BAA|business associate"
            ),
            ComplianceRequirement(
                regulation=Regulation.HIPAA,
                requirement="phi_safeguards",
                description="PHI safeguards (administrative, physical, technical)",
                severity="critical",
                check_pattern=r"PHI|protected health information|health information|safeguards"
            ),
            ComplianceRequirement(
                regulation=Regulation.HIPAA,
                requirement="minimum_necessary",
                description="Minimum necessary standard",
                severity="high",
                check_pattern=r"minimum necessary|need.?to.?know"
            ),
            ComplianceRequirement(
                regulation=Regulation.HIPAA,
                requirement="breach_notification_hipaa",
                description="60-day breach notification",
                severity="high",
                check_pattern=r"breach notification|60 days?|sixty days?"
            )
        ],
        Regulation.SOC2: [
            ComplianceRequirement(
                regulation=Regulation.SOC2,
                requirement="security",
                description="Security controls and encryption",
                severity="critical",
                check_pattern=r"security|encryption|secure|cryptograph"
            ),
            ComplianceRequirement(
                regulation=Regulation.SOC2,
                requirement="availability",
                description="Availability and uptime commitments",
                severity="high",
                check_pattern=r"availability|uptime|SLA|service level"
            ),
            ComplianceRequirement(
                regulation=Regulation.SOC2,
                requirement="confidentiality",
                description="Confidentiality provisions",
                severity="high",
                check_pattern=r"confidential|confidentiality|non.?disclosure"
            ),
            ComplianceRequirement(
                regulation=Regulation.SOC2,
                requirement="processing_integrity",
                description="Processing integrity and accuracy",
                severity="medium",
                check_pattern=r"integrity|accuracy|complete|reliable"
            ),
            ComplianceRequirement(
                regulation=Regulation.SOC2,
                requirement="privacy",
                description="Privacy controls",
                severity="high",
                check_pattern=r"privacy|private|personal information"
            )
        ]
    }
    
    def __init__(self):
        """Initialize compliance checker."""
        self.cache = {}
    
    async def check(
        self,
        contract_text: str,
        regulations: List[str]
    ) -> List[Dict[str, Any]]:
        """
        Check contract for compliance with specified regulations.
        
        Args:
            contract_text: Contract text to check
            regulations: List of regulation names to check
            
        Returns:
            List of compliance check results
        """
        results = []
        
        for reg_name in regulations:
            try:
                regulation = Regulation[reg_name.upper().replace("-", "_")]
                result = await self._check_regulation(contract_text, regulation)
                results.append(result)
            except KeyError:
                logger.warning(f"Unknown regulation: {reg_name}")
                results.append({
                    "regulation": reg_name,
                    "compliant": False,
                    "score": 0,
                    "issues": [f"Regulation {reg_name} not supported"],
                    "recommendations": ["Contact compliance team for guidance"],
                    "confidence": "low"
                })
        
        return results
    
    async def _check_regulation(
        self,
        contract_text: str,
        regulation: Regulation
    ) -> Dict[str, Any]:
        """
        Check compliance with a specific regulation.
        
        Args:
            contract_text: Contract text
            regulation: Regulation to check
            
        Returns:
            Compliance check result
        """
        requirements = self.REQUIREMENTS.get(regulation, [])
        
        if not requirements:
            return {
                "regulation": regulation.value,
                "compliant": False,
                "score": 0,
                "issues": ["No requirements defined"],
                "recommendations": [],
                "confidence": "very_low"
            }
        
        issues = []
        recommendations = []
        passed_checks = 0
        total_weight = 0
        
        contract_lower = contract_text.lower()
        
        for req in requirements:
            # Weight by severity
            weight = {"critical": 4, "high": 3, "medium": 2, "low": 1}.get(req.severity, 1)
            total_weight += weight
            
            # Check if requirement is met
            if req.check_pattern:
                if re.search(req.check_pattern, contract_lower):
                    passed_checks += weight
                else:
                    issues.append(f"{req.description} not addressed")
                    recommendations.append(f"Add provisions for {req.requirement}")
        
        # Calculate compliance score
        score = (passed_checks / total_weight * 100) if total_weight > 0 else 0
        
        # Determine overall compliance
        compliant = score >= 70  # 70% threshold for compliance
        
        # Determine confidence level
        confidence = self._determine_confidence(score, len(requirements))
        
        # Add regulation-specific recommendations
        if regulation == Regulation.GDPR and score < 100:
            if "lawful basis" in str(issues):
                recommendations.append("Specify lawful basis under GDPR Article 6")
            if "data subject rights" in str(issues):
                recommendations.append("Include comprehensive data subject rights per Articles 15-22")
        
        elif regulation == Regulation.HIPAA and score < 100:
            if "BAA" in str(issues) or "business associate" in str(issues):
                recommendations.append("Execute Business Associate Agreement immediately")
            if "PHI" in str(issues):
                recommendations.append("Define administrative, physical, and technical safeguards for PHI")
        
        return {
            "regulation": regulation.value,
            "compliant": compliant,
            "score": round(score, 1),
            "issues": issues[:10],  # Limit to top 10 issues
            "recommendations": recommendations[:5],  # Top 5 recommendations
            "confidence": confidence
        }
    
    def _determine_confidence(self, score: float, num_requirements: int) -> str:
        """
        Determine confidence level of compliance assessment.
        
        Args:
            score: Compliance score
            num_requirements: Number of requirements checked
            
        Returns:
            Confidence level
        """
        if num_requirements < 3:
            return "low"
        elif num_requirements < 5:
            if score > 80:
                return "medium"
            else:
                return "low"
        else:
            if score > 90:
                return "very_high"
            elif score > 75:
                return "high"
            elif score > 50:
                return "medium"
            else:
                return "low"
    
    async def suggest_improvements(
        self,
        contract_text: str,
        target_regulations: List[str]
    ) -> List[Dict[str, Any]]:
        """
        Suggest improvements for better compliance.
        
        Args:
            contract_text: Contract text
            target_regulations: Regulations to comply with
            
        Returns:
            List of improvement suggestions
        """
        suggestions = []
        
        for reg_name in target_regulations:
            try:
                regulation = Regulation[reg_name.upper().replace("-", "_")]
                requirements = self.REQUIREMENTS.get(regulation, [])
                
                for req in requirements:
                    if req.check_pattern and not re.search(req.check_pattern, contract_text.lower()):
                        suggestions.append({
                            "regulation": regulation.value,
                            "requirement": req.requirement,
                            "suggestion": f"Add clause: {req.description}",
                            "sample_text": self._get_sample_clause(regulation, req.requirement),
                            "priority": req.severity
                        })
            except KeyError:
                continue
        
        # Sort by priority
        priority_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
        suggestions.sort(key=lambda x: priority_order.get(x["priority"], 99))
        
        return suggestions[:10]  # Return top 10 suggestions
    
    def _get_sample_clause(self, regulation: Regulation, requirement: str) -> str:
        """
        Get sample clause text for a requirement.
        
        Args:
            regulation: Regulation
            requirement: Requirement name
            
        Returns:
            Sample clause text
        """
        samples = {
            (Regulation.GDPR, "lawful_basis"): 
                "The processing of personal data under this Agreement shall be based on [consent/legitimate interest/contract performance] as the lawful basis under Article 6 of the GDPR.",
            
            (Regulation.GDPR, "breach_notification"):
                "In the event of a personal data breach, the Processor shall notify the Controller without undue delay and in any case within 72 hours of becoming aware of the breach.",
            
            (Regulation.CCPA, "opt_out"):
                "Consumers have the right to opt-out of the sale of their personal information. The Company shall provide a clear and conspicuous 'Do Not Sell My Personal Information' link.",
            
            (Regulation.HIPAA, "baa"):
                "The parties agree to execute a Business Associate Agreement as required by HIPAA to ensure proper handling of Protected Health Information.",
            
            (Regulation.SOC2, "security"):
                "The Service Provider shall implement and maintain industry-standard security controls including encryption of data in transit and at rest using AES-256 or equivalent."
        }
        
        return samples.get((regulation, requirement), "Please consult legal counsel for appropriate clause language.")