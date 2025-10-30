"""Bid evaluation engine for RFQ/RFP processes"""

from typing import Dict, List, Any, Optional
import numpy as np
from datetime import datetime

from utils.logging_config import get_logger
from utils.common import safe_divide, calculate_percentage


class BidEvaluator:
    """Evaluate and score bids based on multiple criteria"""
    
    def __init__(self):
        self.logger = get_logger(__name__)
        
        # Default scoring weights if not provided
        self.default_weights = {
            "price": 0.4,
            "quality": 0.3,
            "delivery": 0.15,
            "experience": 0.15
        }
        
        # Scoring rubrics
        self.scoring_rubrics = {
            "price": self._score_price,
            "quality": self._score_quality,
            "delivery": self._score_delivery,
            "experience": self._score_experience,
            "compliance": self._score_compliance,
            "innovation": self._score_innovation,
            "sustainability": self._score_sustainability
        }
    
    async def evaluate_bid(self, bid: Dict[str, Any], 
                          criteria: Dict[str, Any],
                          weights: Dict[str, float],
                          requirements: Dict[str, Any]) -> Dict[str, Any]:
        """Evaluate a single bid against criteria"""
        
        scores = {}
        weighted_scores = {}
        
        # Ensure weights sum to 1
        total_weight = sum(weights.values())
        if abs(total_weight - 1.0) > 0.01:
            self.logger.warning(f"Weights sum to {total_weight}, normalizing")
            weights = {k: v/total_weight for k, v in weights.items()}
        
        # Score each criterion
        for criterion, weight in weights.items():
            if criterion in self.scoring_rubrics:
                score = await self.scoring_rubrics[criterion](bid, criteria, requirements)
                scores[criterion] = score
                weighted_scores[criterion] = score * weight
            else:
                self.logger.warning(f"Unknown criterion: {criterion}")
                scores[criterion] = 0
                weighted_scores[criterion] = 0
        
        # Calculate total score
        total_score = sum(weighted_scores.values())
        
        # Generate strengths and weaknesses
        strengths = [k for k, v in scores.items() if v >= 80]
        weaknesses = [k for k, v in scores.items() if v < 60]
        
        return {
            "bid_id": bid.get("id"),
            "vendor_id": bid.get("vendor_id"),
            "scores": scores,
            "weighted_scores": weighted_scores,
            "total_score": round(total_score, 2),
            "strengths": strengths,
            "weaknesses": weaknesses,
            "recommendation": self._generate_recommendation(total_score),
            "risk_factors": self._identify_risk_factors(bid, scores)
        }
    
    async def _score_price(self, bid: Dict, criteria: Dict, requirements: Dict) -> float:
        """Score based on price competitiveness"""
        if not bid.get("total_price"):
            return 0
        
        # Get price benchmarks from criteria
        target_price = criteria.get("target_price", 0)
        max_price = criteria.get("max_price", target_price * 1.2)
        
        bid_price = bid["total_price"]
        
        if bid_price <= 0:
            return 0
        
        if bid_price > max_price:
            return 0  # Over budget
        
        if target_price > 0:
            # Score based on proximity to target
            if bid_price <= target_price:
                # Under target is good
                discount = (target_price - bid_price) / target_price
                score = 80 + min(20, discount * 100)  # 80-100 score
            else:
                # Over target but under max
                overage = (bid_price - target_price) / (max_price - target_price)
                score = 80 * (1 - overage)  # 0-80 score
        else:
            # No target price, just score relative to max
            score = 100 * (1 - bid_price / max_price)
        
        return max(0, min(100, score))
    
    async def _score_quality(self, bid: Dict, criteria: Dict, requirements: Dict) -> float:
        """Score based on technical quality and solution fit"""
        score = 70  # Base score
        
        technical_proposal = bid.get("technical_proposal", {})
        
        # Check for key quality indicators
        if technical_proposal.get("certifications"):
            score += 5
        
        if technical_proposal.get("quality_assurance"):
            score += 5
        
        if technical_proposal.get("methodology"):
            score += 5
        
        if technical_proposal.get("team_qualifications"):
            score += 5
        
        if technical_proposal.get("innovation"):
            score += 10
        
        # Check compliance with requirements
        if requirements:
            met_requirements = technical_proposal.get("requirements_met", [])
            total_requirements = len(requirements.get("mandatory", []))
            if total_requirements > 0:
                compliance_rate = len(met_requirements) / total_requirements
                score = score * compliance_rate
        
        return max(0, min(100, score))
    
    async def _score_delivery(self, bid: Dict, criteria: Dict, requirements: Dict) -> float:
        """Score based on delivery timeline and reliability"""
        score = 70  # Base score
        
        delivery = bid.get("delivery_timeline", {})
        
        # Check delivery date
        required_date = requirements.get("required_delivery_date")
        proposed_date = delivery.get("completion_date")
        
        if required_date and proposed_date:
            required = datetime.fromisoformat(required_date)
            proposed = datetime.fromisoformat(proposed_date)
            
            if proposed <= required:
                # On time or early
                days_early = (required - proposed).days
                score = 80 + min(20, days_early)  # Bonus for early delivery
            else:
                # Late delivery
                days_late = (proposed - required).days
                score = max(0, 80 - days_late * 2)  # Penalty for late delivery
        
        # Delivery reliability factors
        if delivery.get("guaranteed_delivery"):
            score += 5
        
        if delivery.get("penalties_for_delay"):
            score += 5
        
        if delivery.get("track_record"):
            score += 5
        
        return max(0, min(100, score))
    
    async def _score_experience(self, bid: Dict, criteria: Dict, requirements: Dict) -> float:
        """Score based on vendor experience and references"""
        score = 60  # Base score
        
        # References
        references = bid.get("references", [])
        if references:
            score += min(20, len(references) * 5)  # Up to 20 points for references
        
        # Relevant experience
        technical_proposal = bid.get("technical_proposal", {})
        
        if technical_proposal.get("similar_projects"):
            projects = technical_proposal["similar_projects"]
            score += min(10, len(projects) * 2)
        
        if technical_proposal.get("years_experience"):
            years = technical_proposal["years_experience"]
            score += min(10, years)  # Up to 10 points for experience
        
        # Industry expertise
        if technical_proposal.get("industry_certifications"):
            score += 5
        
        if technical_proposal.get("client_testimonials"):
            score += 5
        
        return max(0, min(100, score))
    
    async def _score_compliance(self, bid: Dict, criteria: Dict, requirements: Dict) -> float:
        """Score based on compliance with requirements"""
        compliance_checklist = bid.get("compliance_checklist", {})
        
        if not compliance_checklist:
            return 50  # Default if no compliance data
        
        total_items = len(compliance_checklist)
        compliant_items = sum(1 for v in compliance_checklist.values() if v)
        
        if total_items == 0:
            return 50
        
        compliance_rate = compliant_items / total_items
        return compliance_rate * 100
    
    async def _score_innovation(self, bid: Dict, criteria: Dict, requirements: Dict) -> float:
        """Score based on innovative solutions offered"""
        score = 50  # Base score
        
        technical_proposal = bid.get("technical_proposal", {})
        
        # Check for innovation indicators
        if technical_proposal.get("innovation"):
            innovations = technical_proposal["innovation"]
            if isinstance(innovations, list):
                score += min(30, len(innovations) * 10)
            else:
                score += 20
        
        if technical_proposal.get("value_adds"):
            score += 15
        
        if technical_proposal.get("cost_savings_proposal"):
            score += 15
        
        return max(0, min(100, score))
    
    async def _score_sustainability(self, bid: Dict, criteria: Dict, requirements: Dict) -> float:
        """Score based on sustainability and ESG factors"""
        score = 50  # Base score
        
        technical_proposal = bid.get("technical_proposal", {})
        
        # Check for sustainability indicators
        if technical_proposal.get("environmental_certifications"):
            score += 20
        
        if technical_proposal.get("carbon_neutral"):
            score += 15
        
        if technical_proposal.get("sustainable_practices"):
            score += 15
        
        if technical_proposal.get("diversity_inclusion"):
            score += 10
        
        if technical_proposal.get("local_sourcing"):
            score += 10
        
        return max(0, min(100, score))
    
    async def generate_comparison_matrix(self, evaluations: List[Dict]) -> Dict[str, Any]:
        """Generate comparison matrix for multiple bids"""
        if not evaluations:
            return {}
        
        # Extract key metrics
        matrix = {
            "criteria": list(evaluations[0]["scores"].keys()),
            "bids": []
        }
        
        for eval in evaluations:
            matrix["bids"].append({
                "bid_id": eval["bid_id"],
                "vendor_id": eval["vendor_id"],
                "scores": eval["scores"],
                "total_score": eval["total_score"],
                "rank": None  # Will be set by caller
            })
        
        # Calculate statistics
        all_scores = [b["total_score"] for b in matrix["bids"]]
        matrix["statistics"] = {
            "mean": np.mean(all_scores),
            "median": np.median(all_scores),
            "std_dev": np.std(all_scores),
            "range": max(all_scores) - min(all_scores)
        }
        
        # Identify best in each category
        matrix["category_leaders"] = {}
        for criterion in matrix["criteria"]:
            scores = [(b["vendor_id"], b["scores"].get(criterion, 0)) 
                     for b in matrix["bids"]]
            best = max(scores, key=lambda x: x[1])
            matrix["category_leaders"][criterion] = {
                "vendor_id": best[0],
                "score": best[1]
            }
        
        return matrix
    
    async def generate_detailed_comparison(self, bids: List[Dict],
                                          criteria: Dict[str, Any],
                                          weights: Dict[str, float]) -> Dict[str, Any]:
        """Generate detailed comparison report"""
        
        comparison = {
            "summary": {
                "total_bids": len(bids),
                "evaluation_date": datetime.utcnow().isoformat()
            },
            "price_analysis": await self._analyze_pricing(bids),
            "technical_comparison": await self._compare_technical_aspects(bids),
            "risk_assessment": await self._assess_comparative_risks(bids),
            "recommendations": []
        }
        
        # Rank bids
        ranked_bids = sorted(bids, key=lambda x: x.get("score", 0), reverse=True)
        
        # Generate recommendations
        if ranked_bids:
            top_bid = ranked_bids[0]
            
            if top_bid.get("score", 0) >= 85:
                comparison["recommendations"].append({
                    "action": "proceed",
                    "vendor": top_bid["vendor_id"],
                    "rationale": "Clear winner with excellent score"
                })
            elif top_bid.get("score", 0) >= 70:
                comparison["recommendations"].append({
                    "action": "negotiate",
                    "vendor": top_bid["vendor_id"],
                    "rationale": "Good candidate, negotiate for better terms"
                })
            else:
                comparison["recommendations"].append({
                    "action": "re-tender",
                    "rationale": "No bids meet minimum quality threshold"
                })
        
        # Add detailed bid comparison
        comparison["detailed_bids"] = []
        for i, bid in enumerate(ranked_bids[:5], 1):  # Top 5
            comparison["detailed_bids"].append({
                "rank": i,
                "vendor_id": bid["vendor_id"],
                "score": bid.get("score", 0),
                "price": bid.get("total_price"),
                "strengths": bid.get("evaluation", {}).get("strengths", []),
                "weaknesses": bid.get("evaluation", {}).get("weaknesses", []),
                "risk_level": self._calculate_risk_level(bid)
            })
        
        return comparison
    
    async def _analyze_pricing(self, bids: List[Dict]) -> Dict[str, Any]:
        """Analyze pricing across all bids"""
        prices = [b.get("total_price", 0) for b in bids if b.get("total_price")]
        
        if not prices:
            return {}
        
        return {
            "lowest": min(prices),
            "highest": max(prices),
            "average": np.mean(prices),
            "median": np.median(prices),
            "std_dev": np.std(prices),
            "spread": max(prices) - min(prices),
            "coefficient_of_variation": safe_divide(np.std(prices), np.mean(prices))
        }
    
    async def _compare_technical_aspects(self, bids: List[Dict]) -> Dict[str, Any]:
        """Compare technical aspects of bids"""
        aspects = {
            "delivery_times": [],
            "certifications": [],
            "innovations": [],
            "guarantees": []
        }
        
        for bid in bids:
            # Delivery
            if delivery := bid.get("delivery_timeline", {}).get("completion_date"):
                aspects["delivery_times"].append(delivery)
            
            # Certifications
            if certs := bid.get("technical_proposal", {}).get("certifications"):
                aspects["certifications"].extend(certs if isinstance(certs, list) else [certs])
            
            # Innovations
            if innovations := bid.get("technical_proposal", {}).get("innovation"):
                aspects["innovations"].append(innovations)
            
            # Guarantees
            if guarantee := bid.get("delivery_timeline", {}).get("guaranteed_delivery"):
                aspects["guarantees"].append(bid["vendor_id"])
        
        return {
            "earliest_delivery": min(aspects["delivery_times"]) if aspects["delivery_times"] else None,
            "unique_certifications": list(set(aspects["certifications"])),
            "vendors_with_innovations": len(aspects["innovations"]),
            "vendors_with_guarantees": len(aspects["guarantees"])
        }
    
    async def _assess_comparative_risks(self, bids: List[Dict]) -> Dict[str, Any]:
        """Assess risks across all bids"""
        risk_assessment = {
            "high_risk": [],
            "medium_risk": [],
            "low_risk": []
        }
        
        for bid in bids:
            risk_level = self._calculate_risk_level(bid)
            
            risk_item = {
                "vendor_id": bid["vendor_id"],
                "factors": bid.get("evaluation", {}).get("risk_factors", [])
            }
            
            if risk_level == "high":
                risk_assessment["high_risk"].append(risk_item)
            elif risk_level == "medium":
                risk_assessment["medium_risk"].append(risk_item)
            else:
                risk_assessment["low_risk"].append(risk_item)
        
        return risk_assessment
    
    def _generate_recommendation(self, score: float) -> str:
        """Generate recommendation based on score"""
        if score >= 90:
            return "Highly recommended - Excellent bid"
        elif score >= 80:
            return "Recommended - Strong bid"
        elif score >= 70:
            return "Acceptable - Meets requirements"
        elif score >= 60:
            return "Marginal - Consider with conditions"
        else:
            return "Not recommended - Below threshold"
    
    def _identify_risk_factors(self, bid: Dict, scores: Dict) -> List[str]:
        """Identify risk factors in bid"""
        risks = []
        
        # Score-based risks
        if scores.get("price", 100) < 50:
            risks.append("Price significantly over budget")
        
        if scores.get("delivery", 100) < 60:
            risks.append("Delivery timeline concerns")
        
        if scores.get("experience", 100) < 50:
            risks.append("Limited relevant experience")
        
        if scores.get("compliance", 100) < 70:
            risks.append("Compliance gaps identified")
        
        # Bid-specific risks
        if not bid.get("references"):
            risks.append("No references provided")
        
        if not bid.get("delivery_timeline", {}).get("guaranteed_delivery"):
            risks.append("No delivery guarantee")
        
        return risks
    
    def _calculate_risk_level(self, bid: Dict) -> str:
        """Calculate overall risk level for bid"""
        risk_factors = bid.get("evaluation", {}).get("risk_factors", [])
        score = bid.get("score", 0)
        
        if len(risk_factors) >= 3 or score < 60:
            return "high"
        elif len(risk_factors) >= 1 or score < 70:
            return "medium"
        else:
            return "low"