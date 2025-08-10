"""
Risk Assessment module for contract analysis.
"""

import logging
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import numpy as np
from enum import Enum

logger = logging.getLogger(__name__)


class RiskCategory(Enum):
    """Risk categories."""
    FINANCIAL = "financial"
    OPERATIONAL = "operational"
    LEGAL = "legal"
    COMPLIANCE = "compliance"
    REPUTATIONAL = "reputational"
    STRATEGIC = "strategic"


@dataclass
class RiskFactor:
    """Represents a risk factor."""
    category: RiskCategory
    description: str
    severity: float  # 0-1
    likelihood: float  # 0-1
    impact: str
    mitigation: Optional[str]
    confidence: float  # 0-1


class RiskAssessor:
    """
    Assess risks in contracts using multi-dimensional analysis.
    """
    
    # Risk patterns and their weights
    RISK_PATTERNS = {
        "unlimited_liability": {
            "patterns": ["unlimited liability", "no cap", "no limitation of liability"],
            "category": RiskCategory.FINANCIAL,
            "base_severity": 0.95,
            "description": "Unlimited liability exposure"
        },
        "auto_renewal": {
            "patterns": ["automatically renew", "auto-renewal", "automatic renewal"],
            "category": RiskCategory.OPERATIONAL,
            "base_severity": 0.4,
            "description": "Automatic renewal clause"
        },
        "termination_for_convenience": {
            "patterns": ["termination for convenience", "terminate without cause"],
            "category": RiskCategory.OPERATIONAL,
            "base_severity": 0.6,
            "description": "Counterparty can terminate without cause"
        },
        "no_termination_right": {
            "patterns": ["may not terminate", "cannot terminate", "no right to terminate"],
            "category": RiskCategory.LEGAL,
            "base_severity": 0.7,
            "description": "Limited termination rights"
        },
        "consequential_damages": {
            "patterns": ["consequential damages", "indirect damages", "special damages"],
            "category": RiskCategory.FINANCIAL,
            "base_severity": 0.8,
            "description": "Liability for consequential damages"
        },
        "personal_guarantee": {
            "patterns": ["personal guarantee", "personally liable", "personal liability"],
            "category": RiskCategory.FINANCIAL,
            "base_severity": 0.9,
            "description": "Personal guarantee required"
        },
        "exclusive_dealing": {
            "patterns": ["exclusive", "sole supplier", "exclusivity"],
            "category": RiskCategory.STRATEGIC,
            "base_severity": 0.65,
            "description": "Exclusivity restrictions"
        },
        "non_compete": {
            "patterns": ["non-compete", "noncompete", "covenant not to compete"],
            "category": RiskCategory.STRATEGIC,
            "base_severity": 0.7,
            "description": "Non-compete restrictions"
        },
        "data_breach_liability": {
            "patterns": ["data breach", "security incident", "cyber"],
            "category": RiskCategory.COMPLIANCE,
            "base_severity": 0.75,
            "description": "Data breach liability exposure"
        },
        "regulatory_compliance": {
            "patterns": ["regulatory compliance", "comply with all laws", "regulatory requirements"],
            "category": RiskCategory.COMPLIANCE,
            "base_severity": 0.5,
            "description": "Broad compliance obligations"
        }
    }
    
    def __init__(self):
        """Initialize the risk assessor."""
        self.risk_cache = {}
    
    async def assess(self, text: str, clauses: List[Any]) -> Dict[str, Any]:
        """
        Assess risks in contract text.
        
        Args:
            text: Contract text
            clauses: Extracted clauses
            
        Returns:
            Dictionary with risk factors and overall assessment
        """
        risk_factors = []
        
        # Pattern-based risk detection
        text_lower = text.lower()
        for risk_key, risk_config in self.RISK_PATTERNS.items():
            for pattern in risk_config["patterns"]:
                if pattern in text_lower:
                    factor = self._create_risk_factor(
                        risk_config,
                        pattern,
                        text_lower
                    )
                    risk_factors.append(factor)
                    break
        
        # Clause-based risk assessment
        clause_risks = self._assess_clause_risks(clauses)
        risk_factors.extend(clause_risks)
        
        # Missing clause risks
        missing_risks = self._assess_missing_clauses(text_lower)
        risk_factors.extend(missing_risks)
        
        # Calculate aggregate metrics
        overall_score = self._calculate_overall_risk_score(risk_factors)
        risk_matrix = self._create_risk_matrix(risk_factors)
        
        return {
            "factors": risk_factors,
            "overall_score": overall_score,
            "risk_matrix": risk_matrix,
            "high_priority_risks": [f for f in risk_factors if f.severity * f.likelihood > 0.6],
            "recommendations": self._generate_recommendations(risk_factors)
        }
    
    def _create_risk_factor(
        self,
        risk_config: Dict,
        pattern: str,
        text: str
    ) -> RiskFactor:
        """Create a risk factor from configuration."""
        # Adjust severity based on context
        severity = risk_config["base_severity"]
        
        # Check for mitigating factors
        mitigations = {
            "cap": -0.2,
            "limit": -0.15,
            "reasonable": -0.1,
            "mutual": -0.15,
            "except": -0.1
        }
        
        for mitigation, adjustment in mitigations.items():
            if mitigation in text:
                severity = max(0.1, severity + adjustment)
        
        return RiskFactor(
            category=risk_config["category"],
            description=risk_config["description"],
            severity=severity,
            likelihood=0.7,  # Default likelihood
            impact=self._determine_impact(severity),
            mitigation=self._suggest_mitigation(risk_config["category"], severity),
            confidence=0.85
        )
    
    def _assess_clause_risks(self, clauses: List[Any]) -> List[RiskFactor]:
        """Assess risks from extracted clauses."""
        clause_risks = []
        
        for clause in clauses:
            if hasattr(clause, 'risk_level') and hasattr(clause, 'type'):
                if clause.risk_level in ['critical', 'high']:
                    severity_map = {'critical': 0.9, 'high': 0.7}
                    
                    factor = RiskFactor(
                        category=self._map_clause_to_category(clause.type),
                        description=f"High-risk {clause.type} clause",
                        severity=severity_map.get(clause.risk_level, 0.5),
                        likelihood=0.6,
                        impact=f"Potential issues with {clause.type}",
                        mitigation=f"Review and negotiate {clause.type} terms",
                        confidence=0.8
                    )
                    clause_risks.append(factor)
        
        return clause_risks
    
    def _assess_missing_clauses(self, text: str) -> List[RiskFactor]:
        """Assess risks from missing important clauses."""
        missing_risks = []
        
        important_clauses = {
            "force majeure": {
                "category": RiskCategory.OPERATIONAL,
                "severity": 0.6,
                "description": "No force majeure clause"
            },
            "limitation of liability": {
                "category": RiskCategory.FINANCIAL,
                "severity": 0.7,
                "description": "No limitation of liability clause"
            },
            "governing law": {
                "category": RiskCategory.LEGAL,
                "severity": 0.5,
                "description": "No governing law specified"
            },
            "dispute resolution": {
                "category": RiskCategory.LEGAL,
                "severity": 0.55,
                "description": "No dispute resolution mechanism"
            },
            "termination": {
                "category": RiskCategory.OPERATIONAL,
                "severity": 0.65,
                "description": "No termination provisions"
            },
            "confidentiality": {
                "category": RiskCategory.REPUTATIONAL,
                "severity": 0.5,
                "description": "No confidentiality provisions"
            }
        }
        
        for clause, config in important_clauses.items():
            if clause not in text:
                factor = RiskFactor(
                    category=config["category"],
                    description=config["description"],
                    severity=config["severity"],
                    likelihood=0.8,
                    impact=f"Missing {clause} exposes parties to uncertainty",
                    mitigation=f"Add {clause} clause to contract",
                    confidence=0.9
                )
                missing_risks.append(factor)
        
        return missing_risks
    
    def _calculate_overall_risk_score(self, risk_factors: List[RiskFactor]) -> float:
        """
        Calculate overall risk score (0-100).
        Uses weighted average of risk factors.
        """
        if not risk_factors:
            return 0.0
        
        # Calculate risk score for each factor (severity * likelihood)
        risk_scores = [f.severity * f.likelihood * f.confidence for f in risk_factors]
        
        # Weight by category importance
        category_weights = {
            RiskCategory.FINANCIAL: 1.3,
            RiskCategory.LEGAL: 1.2,
            RiskCategory.COMPLIANCE: 1.15,
            RiskCategory.OPERATIONAL: 1.0,
            RiskCategory.STRATEGIC: 0.9,
            RiskCategory.REPUTATIONAL: 0.85
        }
        
        weighted_scores = []
        for factor, score in zip(risk_factors, risk_scores):
            weight = category_weights.get(factor.category, 1.0)
            weighted_scores.append(score * weight)
        
        # Calculate overall score (normalize to 0-100)
        overall = np.mean(weighted_scores) * 100
        
        return min(100, overall)
    
    def _create_risk_matrix(self, risk_factors: List[RiskFactor]) -> Dict[str, Any]:
        """
        Create risk matrix for visualization.
        Maps risks by severity and likelihood.
        """
        matrix = {
            "high_high": [],     # High severity, high likelihood
            "high_medium": [],   # High severity, medium likelihood
            "high_low": [],      # High severity, low likelihood
            "medium_high": [],   # Medium severity, high likelihood
            "medium_medium": [], # Medium severity, medium likelihood
            "medium_low": [],    # Medium severity, low likelihood
            "low_high": [],      # Low severity, high likelihood
            "low_medium": [],    # Low severity, medium likelihood
            "low_low": []        # Low severity, low likelihood
        }
        
        for factor in risk_factors:
            # Categorize severity
            if factor.severity >= 0.7:
                sev_cat = "high"
            elif factor.severity >= 0.4:
                sev_cat = "medium"
            else:
                sev_cat = "low"
            
            # Categorize likelihood
            if factor.likelihood >= 0.7:
                like_cat = "high"
            elif factor.likelihood >= 0.4:
                like_cat = "medium"
            else:
                like_cat = "low"
            
            key = f"{sev_cat}_{like_cat}"
            matrix[key].append({
                "description": factor.description,
                "category": factor.category.value,
                "score": factor.severity * factor.likelihood
            })
        
        return matrix
    
    def _determine_impact(self, severity: float) -> str:
        """Determine impact description based on severity."""
        if severity >= 0.8:
            return "Critical impact on business operations and financial position"
        elif severity >= 0.6:
            return "Significant impact requiring immediate attention"
        elif severity >= 0.4:
            return "Moderate impact that should be addressed"
        else:
            return "Minor impact but should be monitored"
    
    def _suggest_mitigation(self, category: RiskCategory, severity: float) -> str:
        """Suggest mitigation strategies based on risk category and severity."""
        mitigations = {
            RiskCategory.FINANCIAL: {
                "high": "Negotiate liability caps, obtain insurance, or seek indemnification",
                "medium": "Review financial terms and consider hedging strategies",
                "low": "Monitor financial exposure and maintain reserves"
            },
            RiskCategory.LEGAL: {
                "high": "Obtain legal counsel review immediately",
                "medium": "Clarify ambiguous terms and document interpretations",
                "low": "Maintain legal compliance documentation"
            },
            RiskCategory.OPERATIONAL: {
                "high": "Develop contingency plans and alternative suppliers",
                "medium": "Implement monitoring and early warning systems",
                "low": "Regular performance reviews and communication"
            },
            RiskCategory.COMPLIANCE: {
                "high": "Conduct compliance audit and implement controls",
                "medium": "Review regulatory requirements and update procedures",
                "low": "Maintain compliance tracking and documentation"
            },
            RiskCategory.STRATEGIC: {
                "high": "Re-evaluate strategic alignment and alternatives",
                "medium": "Develop exit strategies and flexibility options",
                "low": "Monitor market conditions and competitive landscape"
            },
            RiskCategory.REPUTATIONAL: {
                "high": "Implement crisis management and PR strategies",
                "medium": "Enhance transparency and stakeholder communication",
                "low": "Monitor public perception and maintain good practices"
            }
        }
        
        sev_level = "high" if severity >= 0.7 else "medium" if severity >= 0.4 else "low"
        return mitigations.get(category, {}).get(sev_level, "Review and assess risk factors")
    
    def _map_clause_to_category(self, clause_type: str) -> RiskCategory:
        """Map clause type to risk category."""
        mapping = {
            "payment": RiskCategory.FINANCIAL,
            "liability": RiskCategory.FINANCIAL,
            "indemnification": RiskCategory.FINANCIAL,
            "warranty": RiskCategory.LEGAL,
            "termination": RiskCategory.OPERATIONAL,
            "delivery": RiskCategory.OPERATIONAL,
            "confidentiality": RiskCategory.REPUTATIONAL,
            "intellectual_property": RiskCategory.STRATEGIC,
            "dispute_resolution": RiskCategory.LEGAL,
            "force_majeure": RiskCategory.OPERATIONAL
        }
        
        return mapping.get(clause_type, RiskCategory.OPERATIONAL)
    
    def _generate_recommendations(self, risk_factors: List[RiskFactor]) -> List[str]:
        """Generate actionable recommendations based on risk factors."""
        recommendations = []
        
        # Group by category
        by_category = {}
        for factor in risk_factors:
            if factor.category not in by_category:
                by_category[factor.category] = []
            by_category[factor.category].append(factor)
        
        # Generate category-specific recommendations
        for category, factors in by_category.items():
            high_risk_count = sum(1 for f in factors if f.severity * f.likelihood > 0.6)
            
            if high_risk_count > 0:
                if category == RiskCategory.FINANCIAL:
                    recommendations.append("Prioritize financial risk mitigation through insurance or liability caps")
                elif category == RiskCategory.LEGAL:
                    recommendations.append("Seek immediate legal counsel review for high-risk legal provisions")
                elif category == RiskCategory.COMPLIANCE:
                    recommendations.append("Conduct compliance assessment and implement necessary controls")
                elif category == RiskCategory.OPERATIONAL:
                    recommendations.append("Develop operational contingency plans and monitoring systems")
        
        # Add general recommendations
        total_high_risk = sum(1 for f in risk_factors if f.severity * f.likelihood > 0.6)
        if total_high_risk > 5:
            recommendations.append("Consider renegotiating contract terms due to multiple high-risk factors")
        
        return recommendations