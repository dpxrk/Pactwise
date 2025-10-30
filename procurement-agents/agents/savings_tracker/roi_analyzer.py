"""ROI analysis for savings initiatives"""

from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
import numpy as np
from scipy import stats

from utils.logging_config import get_logger
from utils.exceptions import ValidationError


class ROIAnalyzer:
    """Analyze return on investment for savings initiatives"""
    
    def __init__(self):
        self.logger = get_logger(__name__)
        
        # Financial metrics thresholds
        self.thresholds = {
            "min_roi": 15,  # Minimum ROI percentage
            "max_payback": 24,  # Maximum payback period in months
            "min_irr": 12,  # Minimum internal rate of return
            "hurdle_rate": 10,  # Company hurdle rate
            "risk_free_rate": 3  # Risk-free rate for Sharpe ratio
        }
    
    async def analyze_roi(self, initiative: Dict[str, Any],
                         cash_flows: List[float] = None) -> Dict[str, Any]:
        """Analyze ROI for a savings initiative"""
        
        try:
            # Extract financial data
            investment = Decimal(str(initiative.get("implementation_cost", 0)))
            annual_benefit = Decimal(str(initiative.get("annual_savings", 0)))
            
            # If no cash flows provided, generate them
            if not cash_flows:
                cash_flows = await self._generate_cash_flows(initiative)
            
            # Calculate various ROI metrics
            simple_roi = await self._calculate_simple_roi(investment, annual_benefit)
            payback = await self._calculate_payback_period(investment, cash_flows)
            npv = await self._calculate_npv(cash_flows, self.thresholds["hurdle_rate"])
            irr = await self._calculate_irr(cash_flows)
            profitability_index = await self._calculate_profitability_index(investment, npv)
            
            # Risk-adjusted metrics
            risk_adjusted = await self._calculate_risk_adjusted_roi(
                simple_roi, 
                initiative.get("confidence", 0.8)
            )
            
            # Sensitivity analysis
            sensitivity = await self._perform_sensitivity_analysis(
                investment,
                annual_benefit,
                initiative
            )
            
            # Generate recommendation
            recommendation = await self._generate_recommendation(
                simple_roi,
                payback,
                irr,
                risk_adjusted
            )
            
            return {
                "initiative_id": initiative.get("id"),
                "investment": float(investment),
                "annual_benefit": float(annual_benefit),
                "metrics": {
                    "simple_roi": simple_roi,
                    "risk_adjusted_roi": risk_adjusted,
                    "payback_period_months": payback,
                    "npv": npv,
                    "irr": irr,
                    "profitability_index": profitability_index
                },
                "sensitivity_analysis": sensitivity,
                "recommendation": recommendation,
                "cash_flow_projection": cash_flows,
                "analyzed_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Error analyzing ROI: {str(e)}")
            raise ValidationError(f"ROI analysis failed: {str(e)}")
    
    async def _generate_cash_flows(self, initiative: Dict) -> List[float]:
        """Generate projected cash flows"""
        
        # Initial investment (negative)
        investment = -float(initiative.get("implementation_cost", 0))
        
        # Annual benefits
        annual_savings = float(initiative.get("annual_savings", 0))
        
        # Project duration
        years = initiative.get("project_years", 3)
        
        # Build cash flow array
        cash_flows = [investment]  # Year 0
        
        # Apply growth rate if specified
        growth_rate = float(initiative.get("savings_growth_rate", 0))
        
        for year in range(1, years + 1):
            if growth_rate > 0:
                yearly_savings = annual_savings * ((1 + growth_rate) ** (year - 1))
            else:
                yearly_savings = annual_savings
            
            # Apply decay factor if specified (for initiatives that degrade over time)
            decay_rate = float(initiative.get("savings_decay_rate", 0))
            if decay_rate > 0 and year > 1:
                yearly_savings *= (1 - decay_rate) ** (year - 1)
            
            cash_flows.append(yearly_savings)
        
        return cash_flows
    
    async def _calculate_simple_roi(self, investment: Decimal, 
                                   annual_benefit: Decimal) -> float:
        """Calculate simple ROI percentage"""
        
        if investment <= 0:
            return 0.0
        
        roi = ((annual_benefit - investment) / investment) * 100
        return float(roi)
    
    async def _calculate_payback_period(self, investment: Decimal,
                                       cash_flows: List[float]) -> float:
        """Calculate payback period in months"""
        
        if not cash_flows or investment <= 0:
            return 0.0
        
        cumulative = 0
        months = 0
        
        # Skip initial investment (index 0)
        for i, cf in enumerate(cash_flows[1:], 1):
            cumulative += cf
            
            if cumulative >= float(investment):
                # Calculate fractional month
                months = (i - 1) * 12
                if cf > 0:
                    remaining = float(investment) - (cumulative - cf)
                    months += (remaining / cf) * 12
                break
        else:
            # Payback not achieved within projection period
            months = len(cash_flows) * 12
        
        return round(months, 1)
    
    async def _calculate_npv(self, cash_flows: List[float], 
                            discount_rate: float) -> float:
        """Calculate Net Present Value"""
        
        if not cash_flows:
            return 0.0
        
        rate = discount_rate / 100
        npv = 0
        
        for i, cf in enumerate(cash_flows):
            npv += cf / ((1 + rate) ** i)
        
        return round(npv, 2)
    
    async def _calculate_irr(self, cash_flows: List[float]) -> float:
        """Calculate Internal Rate of Return"""
        
        if not cash_flows or len(cash_flows) < 2:
            return 0.0
        
        # Use numpy's IRR calculation
        try:
            irr = np.irr(cash_flows) * 100
            return round(float(irr), 2) if not np.isnan(irr) else 0.0
        except:
            # Fallback to manual calculation if numpy fails
            return await self._calculate_irr_manual(cash_flows)
    
    async def _calculate_irr_manual(self, cash_flows: List[float]) -> float:
        """Manual IRR calculation using Newton's method"""
        
        def npv_at_rate(rate):
            return sum(cf / ((1 + rate) ** i) for i, cf in enumerate(cash_flows))
        
        # Newton's method
        rate = 0.1  # Initial guess
        tolerance = 1e-6
        max_iterations = 100
        
        for _ in range(max_iterations):
            npv = npv_at_rate(rate)
            
            if abs(npv) < tolerance:
                return round(rate * 100, 2)
            
            # Calculate derivative
            dnpv = sum(-i * cf / ((1 + rate) ** (i + 1)) 
                      for i, cf in enumerate(cash_flows))
            
            if dnpv == 0:
                break
            
            # Update rate
            rate = rate - npv / dnpv
        
        return 0.0
    
    async def _calculate_profitability_index(self, investment: Decimal,
                                            npv: float) -> float:
        """Calculate profitability index"""
        
        if investment <= 0:
            return 0.0
        
        pv_benefits = float(investment) + npv
        pi = pv_benefits / float(investment)
        
        return round(pi, 2)
    
    async def _calculate_risk_adjusted_roi(self, base_roi: float,
                                          confidence: float) -> float:
        """Calculate risk-adjusted ROI"""
        
        # Apply confidence factor
        risk_adjusted = base_roi * confidence
        
        # Apply additional risk premium based on confidence level
        if confidence < 0.5:
            risk_premium = 0.3  # High risk
        elif confidence < 0.7:
            risk_premium = 0.2  # Medium risk
        elif confidence < 0.9:
            risk_premium = 0.1  # Low risk
        else:
            risk_premium = 0.05  # Very low risk
        
        risk_adjusted *= (1 - risk_premium)
        
        return round(risk_adjusted, 2)
    
    async def _perform_sensitivity_analysis(self, investment: Decimal,
                                          annual_benefit: Decimal,
                                          initiative: Dict) -> Dict[str, Any]:
        """Perform sensitivity analysis on key variables"""
        
        base_roi = float(((annual_benefit - investment) / investment) * 100) if investment > 0 else 0
        
        # Define variation ranges
        variations = [-20, -10, 0, 10, 20]  # Percentage variations
        
        sensitivity = {
            "investment_impact": {},
            "benefit_impact": {},
            "combined_impact": {},
            "break_even": {}
        }
        
        # Investment sensitivity
        for var in variations:
            adj_investment = investment * Decimal(1 + var/100)
            if adj_investment > 0:
                new_roi = float(((annual_benefit - adj_investment) / adj_investment) * 100)
                sensitivity["investment_impact"][f"{var:+d}%"] = round(new_roi, 2)
        
        # Benefit sensitivity
        for var in variations:
            adj_benefit = annual_benefit * Decimal(1 + var/100)
            if investment > 0:
                new_roi = float(((adj_benefit - investment) / investment) * 100)
                sensitivity["benefit_impact"][f"{var:+d}%"] = round(new_roi, 2)
        
        # Combined sensitivity (worst case, best case)
        worst_case = float(((annual_benefit * Decimal(0.8) - investment * Decimal(1.2)) / 
                           (investment * Decimal(1.2))) * 100) if investment > 0 else 0
        best_case = float(((annual_benefit * Decimal(1.2) - investment * Decimal(0.8)) / 
                          (investment * Decimal(0.8))) * 100) if investment > 0 else 0
        
        sensitivity["combined_impact"] = {
            "worst_case": round(worst_case, 2),
            "expected": round(base_roi, 2),
            "best_case": round(best_case, 2)
        }
        
        # Break-even analysis
        if annual_benefit > 0:
            break_even_investment = annual_benefit  # ROI = 0
            break_even_change = float(((break_even_investment - investment) / investment) * 100) if investment > 0 else 0
            
            sensitivity["break_even"] = {
                "max_investment": float(break_even_investment),
                "investment_increase_tolerance": round(break_even_change, 2)
            }
        
        if investment > 0:
            break_even_benefit = investment
            break_even_change = float(((break_even_benefit - annual_benefit) / annual_benefit) * 100) if annual_benefit > 0 else 0
            
            sensitivity["break_even"]["min_benefit"] = float(break_even_benefit)
            sensitivity["break_even"]["benefit_decrease_tolerance"] = round(break_even_change, 2)
        
        return sensitivity
    
    async def _generate_recommendation(self, roi: float, payback: float,
                                      irr: float, risk_adjusted_roi: float) -> Dict[str, Any]:
        """Generate investment recommendation"""
        
        # Score calculation
        score = 0
        max_score = 100
        
        # ROI scoring (40 points max)
        if risk_adjusted_roi >= 50:
            score += 40
        elif risk_adjusted_roi >= 30:
            score += 30
        elif risk_adjusted_roi >= self.thresholds["min_roi"]:
            score += 20
        elif risk_adjusted_roi >= 10:
            score += 10
        
        # Payback scoring (30 points max)
        if payback <= 12:
            score += 30
        elif payback <= 18:
            score += 20
        elif payback <= self.thresholds["max_payback"]:
            score += 10
        elif payback <= 36:
            score += 5
        
        # IRR scoring (30 points max)
        if irr >= 30:
            score += 30
        elif irr >= 20:
            score += 20
        elif irr >= self.thresholds["min_irr"]:
            score += 10
        elif irr >= 8:
            score += 5
        
        # Determine recommendation
        if score >= 80:
            action = "Strongly Recommended"
            confidence = "High"
        elif score >= 60:
            action = "Recommended"
            confidence = "Medium-High"
        elif score >= 40:
            action = "Conditional Approval"
            confidence = "Medium"
        elif score >= 20:
            action = "Review Required"
            confidence = "Low"
        else:
            action = "Not Recommended"
            confidence = "Very Low"
        
        return {
            "action": action,
            "confidence": confidence,
            "score": score,
            "max_score": max_score,
            "rationale": self._generate_rationale(roi, payback, irr, risk_adjusted_roi),
            "conditions": self._generate_conditions(score, roi, payback, irr)
        }
    
    def _generate_rationale(self, roi: float, payback: float,
                           irr: float, risk_adjusted_roi: float) -> List[str]:
        """Generate recommendation rationale"""
        
        rationale = []
        
        # ROI assessment
        if risk_adjusted_roi >= 30:
            rationale.append(f"Strong ROI of {risk_adjusted_roi:.1f}% exceeds target")
        elif risk_adjusted_roi >= self.thresholds["min_roi"]:
            rationale.append(f"ROI of {risk_adjusted_roi:.1f}% meets minimum threshold")
        else:
            rationale.append(f"ROI of {risk_adjusted_roi:.1f}% below target of {self.thresholds['min_roi']}%")
        
        # Payback assessment
        if payback <= 12:
            rationale.append(f"Excellent payback period of {payback:.1f} months")
        elif payback <= self.thresholds["max_payback"]:
            rationale.append(f"Acceptable payback period of {payback:.1f} months")
        else:
            rationale.append(f"Long payback period of {payback:.1f} months exceeds threshold")
        
        # IRR assessment
        if irr >= self.thresholds["min_irr"]:
            rationale.append(f"IRR of {irr:.1f}% exceeds hurdle rate")
        else:
            rationale.append(f"IRR of {irr:.1f}% below hurdle rate of {self.thresholds['min_irr']}%")
        
        return rationale
    
    def _generate_conditions(self, score: int, roi: float,
                           payback: float, irr: float) -> List[str]:
        """Generate approval conditions"""
        
        conditions = []
        
        if score < 80:
            if roi < self.thresholds["min_roi"]:
                conditions.append("Improve ROI through cost reduction or benefit enhancement")
            
            if payback > self.thresholds["max_payback"]:
                conditions.append("Reduce payback period through phased implementation")
            
            if irr < self.thresholds["min_irr"]:
                conditions.append("Enhance cash flow profile to improve IRR")
            
            if score < 40:
                conditions.append("Consider alternative approaches with better financial metrics")
        
        if not conditions and score < 60:
            conditions.append("Monitor implementation closely for expected benefits realization")
        
        return conditions
    
    async def analyze_portfolio_roi(self, initiatives: List[Dict]) -> Dict[str, Any]:
        """Analyze ROI across portfolio of initiatives"""
        
        portfolio_results = []
        total_investment = Decimal('0')
        total_benefit = Decimal('0')
        
        # Analyze each initiative
        for initiative in initiatives:
            result = await self.analyze_roi(initiative)
            portfolio_results.append(result)
            
            total_investment += Decimal(str(result["investment"]))
            total_benefit += Decimal(str(result["annual_benefit"]))
        
        # Calculate portfolio metrics
        portfolio_roi = float(((total_benefit - total_investment) / total_investment) * 100) if total_investment > 0 else 0
        
        # Calculate weighted averages
        weights = [float(r["investment"]) for r in portfolio_results]
        total_weight = sum(weights)
        
        if total_weight > 0:
            weighted_roi = sum(
                r["metrics"]["simple_roi"] * w / total_weight 
                for r, w in zip(portfolio_results, weights)
            )
            weighted_irr = sum(
                r["metrics"]["irr"] * w / total_weight 
                for r, w in zip(portfolio_results, weights)
            )
        else:
            weighted_roi = 0
            weighted_irr = 0
        
        # Risk analysis
        roi_values = [r["metrics"]["simple_roi"] for r in portfolio_results]
        roi_std = np.std(roi_values) if roi_values else 0
        
        # Categorize initiatives
        high_performers = [r for r in portfolio_results if r["metrics"]["simple_roi"] >= 30]
        at_risk = [r for r in portfolio_results if r["metrics"]["simple_roi"] < self.thresholds["min_roi"]]
        
        return {
            "portfolio_metrics": {
                "total_investment": float(total_investment),
                "total_annual_benefit": float(total_benefit),
                "portfolio_roi": round(portfolio_roi, 2),
                "weighted_avg_roi": round(weighted_roi, 2),
                "weighted_avg_irr": round(weighted_irr, 2),
                "roi_std_deviation": round(float(roi_std), 2)
            },
            "initiative_count": len(initiatives),
            "high_performers": len(high_performers),
            "at_risk_count": len(at_risk),
            "recommendations": {
                "strongly_recommended": len([r for r in portfolio_results 
                                           if r["recommendation"]["action"] == "Strongly Recommended"]),
                "recommended": len([r for r in portfolio_results 
                                  if r["recommendation"]["action"] == "Recommended"]),
                "conditional": len([r for r in portfolio_results 
                                  if r["recommendation"]["action"] == "Conditional Approval"]),
                "not_recommended": len([r for r in portfolio_results 
                                     if r["recommendation"]["action"] == "Not Recommended"])
            },
            "initiative_details": portfolio_results
        }
    
    async def calculate_comparative_roi(self, initiatives: List[Dict]) -> Dict[str, Any]:
        """Compare ROI across multiple initiatives for selection"""
        
        comparisons = []
        
        for initiative in initiatives:
            roi_analysis = await self.analyze_roi(initiative)
            
            # Calculate additional comparative metrics
            efficiency_ratio = roi_analysis["annual_benefit"] / roi_analysis["investment"] if roi_analysis["investment"] > 0 else 0
            
            comparisons.append({
                "initiative_id": initiative.get("id"),
                "title": initiative.get("title"),
                "investment": roi_analysis["investment"],
                "roi": roi_analysis["metrics"]["simple_roi"],
                "risk_adjusted_roi": roi_analysis["metrics"]["risk_adjusted_roi"],
                "payback_months": roi_analysis["metrics"]["payback_period_months"],
                "npv": roi_analysis["metrics"]["npv"],
                "irr": roi_analysis["metrics"]["irr"],
                "efficiency_ratio": round(efficiency_ratio, 2),
                "recommendation_score": roi_analysis["recommendation"]["score"],
                "recommendation": roi_analysis["recommendation"]["action"]
            })
        
        # Sort by multiple criteria
        comparisons.sort(key=lambda x: (
            -x["recommendation_score"],  # Higher score first
            -x["risk_adjusted_roi"],     # Higher ROI second
            x["payback_months"]           # Lower payback third
        ))
        
        # Identify optimal selection
        budget = sum(c["investment"] for c in comparisons)
        optimal_selection = self._optimize_portfolio_selection(comparisons, budget)
        
        return {
            "ranked_initiatives": comparisons,
            "optimal_selection": optimal_selection,
            "selection_criteria": [
                "Recommendation score",
                "Risk-adjusted ROI",
                "Payback period"
            ]
        }
    
    def _optimize_portfolio_selection(self, initiatives: List[Dict],
                                     budget: float) -> Dict[str, Any]:
        """Optimize portfolio selection within budget constraint"""
        
        # Simple greedy algorithm for portfolio optimization
        # In production, use more sophisticated optimization (e.g., knapsack algorithm)
        
        selected = []
        remaining_budget = budget
        total_roi_value = 0
        
        for init in initiatives:
            if init["investment"] <= remaining_budget and init["recommendation_score"] >= 40:
                selected.append(init["initiative_id"])
                remaining_budget -= init["investment"]
                total_roi_value += init["npv"]
        
        return {
            "selected_initiatives": selected,
            "total_investment": budget - remaining_budget,
            "total_npv": round(total_roi_value, 2),
            "budget_utilization": round((budget - remaining_budget) / budget * 100, 2) if budget > 0 else 0
        }