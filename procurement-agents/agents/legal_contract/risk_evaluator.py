"""Risk Evaluator for contract risk assessment"""

import re
from typing import Dict, List, Any, Optional
from integrations.databases.contract_models import ContractType, RiskLevel


class RiskEvaluator:
    """
    Contract risk evaluation engine with:
    - Multi-factor risk scoring
    - Risky provision detection
    - Risk mitigation suggestions
    - Industry-specific risk assessment
    """
    
    def __init__(self):
        # Risk indicators by category
        self.risk_categories = {
            "liability": {
                "high": [
                    "unlimited liability", "uncapped liability", "consequential damages",
                    "indirect damages", "punitive damages", "personal liability",
                    "joint and several liability", "gross negligence standard"
                ],
                "medium": [
                    "broad indemnification", "one-sided indemnification",
                    "defense costs", "third party claims"
                ],
                "low": [
                    "mutual indemnification", "liability cap", "limitation of liability",
                    "reasonable efforts", "commercially reasonable"
                ]
            },
            "termination": {
                "high": [
                    "no termination rights", "termination for cause only",
                    "one-sided termination", "automatic renewal", "evergreen clause"
                ],
                "medium": [
                    "long notice period", "termination penalties",
                    "minimum commitment", "lock-in period"
                ],
                "low": [
                    "termination for convenience", "mutual termination",
                    "30 days notice", "no penalties"
                ]
            },
            "payment": {
                "high": [
                    "advance payment", "no payment terms", "payment on demand",
                    "no refund", "price escalation", "blank check"
                ],
                "medium": [
                    "net 90", "net 120", "milestone payment",
                    "retention amount", "variable pricing"
                ],
                "low": [
                    "net 30", "fixed price", "payment upon delivery",
                    "standard terms", "clear payment schedule"
                ]
            },
            "intellectual_property": {
                "high": [
                    "all rights transfer", "work for hire", "no retention of rights",
                    "unlimited license", "perpetual license", "assignment of inventions"
                ],
                "medium": [
                    "exclusive license", "broad license", "derivative works",
                    "sublicense rights", "royalty obligations"
                ],
                "low": [
                    "limited license", "non-exclusive license", "retained ownership",
                    "license for specific use", "revocable license"
                ]
            },
            "compliance": {
                "high": [
                    "no compliance clauses", "undefined standards",
                    "strict liability for compliance", "no audit rights"
                ],
                "medium": [
                    "broad compliance requirements", "frequent audits",
                    "undefined penalties", "self-certification"
                ],
                "low": [
                    "industry standard compliance", "reasonable audit rights",
                    "clear standards", "mutual compliance"
                ]
            },
            "dispute_resolution": {
                "high": [
                    "foreign jurisdiction", "waiver of jury trial",
                    "binding arbitration only", "no appeal rights"
                ],
                "medium": [
                    "distant venue", "arbitration required",
                    "loser pays", "expedited procedures"
                ],
                "low": [
                    "local jurisdiction", "mediation first",
                    "mutual agreement on arbitrator", "appeal rights"
                ]
            }
        }
        
        # Mitigation strategies
        self.mitigation_strategies = {
            "liability": [
                "Add liability cap at reasonable multiple of contract value",
                "Exclude consequential and indirect damages",
                "Include mutual indemnification clause",
                "Add insurance requirements",
                "Define standard of care clearly"
            ],
            "termination": [
                "Include termination for convenience clause",
                "Negotiate shorter notice period",
                "Add termination rights for material breach",
                "Remove automatic renewal clauses",
                "Include wind-down provisions"
            ],
            "payment": [
                "Negotiate standard payment terms (Net 30)",
                "Add late payment interest clause",
                "Include payment milestones tied to deliverables",
                "Add right to suspend for non-payment",
                "Include dispute resolution for payment issues"
            ],
            "intellectual_property": [
                "Retain ownership of pre-existing IP",
                "Limit license to specific use case",
                "Add confidentiality protections",
                "Include IP warranty and indemnification",
                "Define ownership of derivatives clearly"
            ]
        }
    
    async def evaluate_risk(
        self,
        contract_text: str,
        contract_type: ContractType
    ) -> Dict[str, Any]:
        """Evaluate overall contract risk"""
        
        # Analyze risk by category
        risk_scores = {}
        risky_provisions = []
        
        for category, indicators in self.risk_categories.items():
            category_score, category_provisions = self._evaluate_category_risk(
                contract_text, category, indicators
            )
            risk_scores[category] = category_score
            risky_provisions.extend(category_provisions)
        
        # Calculate overall risk
        overall_risk_score = self._calculate_overall_risk(risk_scores)
        risk_level = self._determine_risk_level(overall_risk_score)
        
        # Get top risks
        top_risks = self._identify_top_risks(risk_scores, risky_provisions)
        
        # Generate mitigation plan
        mitigation_plan = self._generate_mitigation_plan(risk_scores, risky_provisions)
        
        return {
            "risk_score": overall_risk_score,
            "risk_level": risk_level,
            "category_scores": risk_scores,
            "risky_provisions": risky_provisions[:10],  # Top 10
            "top_risks": top_risks,
            "mitigation_plan": mitigation_plan,
            "summary": self._generate_risk_summary(risk_level, top_risks)
        }
    
    def _evaluate_category_risk(
        self,
        contract_text: str,
        category: str,
        indicators: Dict[str, List[str]]
    ) -> Tuple[float, List[Dict[str, Any]]]:
        """Evaluate risk for specific category"""
        
        contract_lower = contract_text.lower()
        risk_score = 50  # Base score
        provisions = []
        
        # Check high risk indicators
        for indicator in indicators.get("high", []):
            if indicator in contract_lower:
                risk_score += 15
                provisions.append({
                    "category": category,
                    "risk_level": "high",
                    "provision": indicator,
                    "recommendation": f"Remove or modify: {indicator}"
                })
        
        # Check medium risk indicators
        for indicator in indicators.get("medium", []):
            if indicator in contract_lower:
                risk_score += 8
                provisions.append({
                    "category": category,
                    "risk_level": "medium",
                    "provision": indicator,
                    "recommendation": f"Review and consider modifying: {indicator}"
                })
        
        # Check low risk (protective) indicators
        for indicator in indicators.get("low", []):
            if indicator in contract_lower:
                risk_score -= 10
        
        # Normalize score to 0-100
        risk_score = min(100, max(0, risk_score))
        
        return risk_score, provisions
    
    def _calculate_overall_risk(self, category_scores: Dict[str, float]) -> float:
        """Calculate weighted overall risk score"""
        
        # Category weights based on importance
        weights = {
            "liability": 0.25,
            "termination": 0.15,
            "payment": 0.15,
            "intellectual_property": 0.20,
            "compliance": 0.15,
            "dispute_resolution": 0.10
        }
        
        weighted_score = sum(
            category_scores.get(category, 50) * weight
            for category, weight in weights.items()
        )
        
        return round(weighted_score, 2)
    
    def _determine_risk_level(self, risk_score: float) -> str:
        """Determine risk level from score"""
        
        if risk_score < 30:
            return RiskLevel.LOW
        elif risk_score < 50:
            return RiskLevel.MEDIUM
        elif risk_score < 70:
            return RiskLevel.HIGH
        else:
            return RiskLevel.CRITICAL
    
    def _identify_top_risks(
        self,
        risk_scores: Dict[str, float],
        risky_provisions: List[Dict[str, Any]]
    ) -> List[str]:
        """Identify top risk areas"""
        
        top_risks = []
        
        # High-scoring categories
        for category, score in risk_scores.items():
            if score > 70:
                top_risks.append(f"High {category.replace('_', ' ')} risk (score: {score:.0f})")
        
        # Critical provisions
        critical_provisions = [
            p for p in risky_provisions
            if p["risk_level"] == "high"
        ]
        
        if len(critical_provisions) > 3:
            top_risks.append(f"{len(critical_provisions)} critical risk provisions found")
        
        return top_risks[:5]
    
    def _generate_mitigation_plan(
        self,
        risk_scores: Dict[str, float],
        risky_provisions: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Generate risk mitigation plan"""
        
        plan = []
        
        # Add mitigation for high-risk categories
        for category, score in risk_scores.items():
            if score > 60:
                strategies = self.mitigation_strategies.get(category, [])
                
                for strategy in strategies[:3]:  # Top 3 strategies
                    plan.append({
                        "category": category,
                        "risk_score": score,
                        "action": strategy,
                        "priority": "high" if score > 80 else "medium"
                    })
        
        # Add specific provision modifications
        for provision in risky_provisions[:5]:
            if provision["risk_level"] == "high":
                plan.append({
                    "category": provision["category"],
                    "risk_score": 90,
                    "action": provision["recommendation"],
                    "priority": "critical"
                })
        
        # Sort by priority
        priority_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
        plan.sort(key=lambda x: priority_order.get(x["priority"], 3))
        
        return plan[:10]  # Top 10 actions
    
    def _generate_risk_summary(self, risk_level: str, top_risks: List[str]) -> str:
        """Generate risk summary text"""
        
        summaries = {
            RiskLevel.LOW: "This contract presents low overall risk with adequate protections in place.",
            RiskLevel.MEDIUM: "This contract has moderate risk levels that should be reviewed and potentially negotiated.",
            RiskLevel.HIGH: "This contract contains significant risks that require careful review and modification.",
            RiskLevel.CRITICAL: "This contract poses critical risks and should not be executed without substantial changes."
        }
        
        summary = summaries.get(risk_level, "Risk assessment complete.")
        
        if top_risks:
            summary += f" Key concerns: {', '.join(top_risks[:3])}"
        
        return summary
    
    async def evaluate_template(self, template_text: str) -> Dict[str, Any]:
        """Evaluate risk in contract template"""
        
        # Similar to contract evaluation but for templates
        risk_scores = {}
        
        for category, indicators in self.risk_categories.items():
            category_score, _ = self._evaluate_category_risk(
                template_text, category, indicators
            )
            risk_scores[category] = category_score
        
        overall_risk = self._calculate_overall_risk(risk_scores)
        risk_level = self._determine_risk_level(overall_risk)
        
        return {
            "risk_score": overall_risk,
            "risk_level": risk_level,
            "category_scores": risk_scores,
            "template_suitability": self._assess_template_suitability(risk_level)
        }
    
    def _assess_template_suitability(self, risk_level: str) -> str:
        """Assess template suitability based on risk"""
        
        if risk_level == RiskLevel.LOW:
            return "Template is well-balanced and suitable for use"
        elif risk_level == RiskLevel.MEDIUM:
            return "Template is acceptable but may need minor adjustments"
        elif risk_level == RiskLevel.HIGH:
            return "Template requires significant modifications before use"
        else:
            return "Template is not recommended without major revisions"
    
    async def compare_risk_profiles(
        self,
        contract1_text: str,
        contract2_text: str
    ) -> Dict[str, Any]:
        """Compare risk profiles of two contracts"""
        
        # Evaluate both contracts
        risk1 = await self.evaluate_risk(contract1_text, ContractType.OTHER)
        risk2 = await self.evaluate_risk(contract2_text, ContractType.OTHER)
        
        # Compare scores
        comparison = {
            "contract1_risk": risk1["risk_score"],
            "contract2_risk": risk2["risk_score"],
            "risk_difference": abs(risk1["risk_score"] - risk2["risk_score"]),
            "safer_contract": 1 if risk1["risk_score"] < risk2["risk_score"] else 2,
            "category_comparison": {}
        }
        
        # Compare by category
        for category in risk1["category_scores"]:
            score1 = risk1["category_scores"].get(category, 50)
            score2 = risk2["category_scores"].get(category, 50)
            
            comparison["category_comparison"][category] = {
                "contract1": score1,
                "contract2": score2,
                "difference": score1 - score2,
                "safer": 1 if score1 < score2 else 2
            }
        
        return comparison