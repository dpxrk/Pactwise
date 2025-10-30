"""Calculate various types of savings and metrics"""

from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
import numpy as np
from enum import Enum

from utils.logging_config import get_logger
from utils.exceptions import ValidationError


class SavingsType(Enum):
    """Types of savings calculations"""
    NEGOTIATED = "negotiated"
    VOLUME_DISCOUNT = "volume_discount"
    PROCESS_IMPROVEMENT = "process_improvement"
    DEMAND_MANAGEMENT = "demand_management"
    SUBSTITUTION = "substitution"
    PAYMENT_TERMS = "payment_terms"
    REBATES = "rebates"
    COST_AVOIDANCE = "cost_avoidance"
    PRICE_VARIANCE = "price_variance"
    BUDGET_VARIANCE = "budget_variance"


class SavingsCalculator:
    """Calculate various types of procurement savings"""
    
    def __init__(self):
        self.logger = get_logger(__name__)
        
        # Calculation parameters
        self.parameters = {
            "annualization_factor": 12,  # For monthly to annual conversion
            "discount_rate": 0.08,  # For NPV calculations
            "inflation_rate": 0.03,  # For cost avoidance
            "fx_buffer": 0.02,  # Foreign exchange buffer
            "risk_adjustment": 0.1  # Risk adjustment factor
        }
    
    async def calculate_savings(self, initiative: Dict[str, Any],
                               calculation_type: str = None) -> Dict[str, Any]:
        """Calculate savings for an initiative"""
        
        try:
            # Determine calculation type
            calc_type = calculation_type or initiative.get("savings_type", "negotiated")
            
            # Get appropriate calculation method
            calculation_methods = {
                "negotiated": self._calculate_negotiated_savings,
                "volume_discount": self._calculate_volume_discount,
                "process_improvement": self._calculate_process_improvement,
                "demand_management": self._calculate_demand_management,
                "substitution": self._calculate_substitution_savings,
                "payment_terms": self._calculate_payment_terms_savings,
                "rebates": self._calculate_rebate_savings,
                "cost_avoidance": self._calculate_cost_avoidance,
                "price_variance": self._calculate_price_variance,
                "budget_variance": self._calculate_budget_variance
            }
            
            method = calculation_methods.get(calc_type, self._calculate_generic_savings)
            
            # Calculate base savings
            base_result = await method(initiative)
            
            # Apply adjustments
            adjusted_result = await self._apply_adjustments(base_result, initiative)
            
            # Calculate time-based metrics
            time_metrics = await self._calculate_time_metrics(adjusted_result, initiative)
            
            return {
                "initiative_id": initiative.get("id"),
                "calculation_type": calc_type,
                "base_savings": base_result["savings"],
                "adjusted_savings": adjusted_result["savings"],
                "monthly_savings": time_metrics["monthly"],
                "quarterly_savings": time_metrics["quarterly"],
                "annual_savings": time_metrics["annual"],
                "lifetime_savings": time_metrics["lifetime"],
                "npv": time_metrics["npv"],
                "payback_period": time_metrics["payback_period"],
                "calculation_details": {
                    **base_result.get("details", {}),
                    "adjustments": adjusted_result.get("adjustments", {}),
                    "assumptions": base_result.get("assumptions", [])
                },
                "confidence_level": initiative.get("confidence", 0.8),
                "calculated_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Error calculating savings: {str(e)}")
            raise ValidationError(f"Savings calculation failed: {str(e)}")
    
    async def _calculate_negotiated_savings(self, initiative: Dict) -> Dict[str, Any]:
        """Calculate negotiated price reduction savings"""
        
        baseline = Decimal(str(initiative.get("baseline_cost", 0)))
        new_cost = Decimal(str(initiative.get("new_cost", 0)))
        volume = Decimal(str(initiative.get("volume", 1)))
        
        # Basic negotiated savings
        unit_savings = baseline - new_cost
        total_savings = unit_savings * volume
        
        # Calculate percentage saved
        percent_saved = (unit_savings / baseline * 100) if baseline > 0 else Decimal('0')
        
        return {
            "savings": float(total_savings),
            "details": {
                "baseline_unit_cost": float(baseline),
                "new_unit_cost": float(new_cost),
                "unit_savings": float(unit_savings),
                "volume": float(volume),
                "percent_reduction": float(percent_saved)
            },
            "assumptions": [
                f"Volume remains constant at {volume} units",
                "No additional costs for switching suppliers",
                "Quality and service levels maintained"
            ]
        }
    
    async def _calculate_volume_discount(self, initiative: Dict) -> Dict[str, Any]:
        """Calculate volume-based discount savings"""
        
        tiers = initiative.get("volume_tiers", [])
        current_volume = Decimal(str(initiative.get("current_volume", 0)))
        projected_volume = Decimal(str(initiative.get("projected_volume", 0)))
        base_price = Decimal(str(initiative.get("base_price", 0)))
        
        # Find applicable discount tiers
        current_discount = self._get_volume_discount(current_volume, tiers)
        projected_discount = self._get_volume_discount(projected_volume, tiers)
        
        # Calculate savings
        current_cost = current_volume * base_price * (1 - current_discount)
        projected_cost = projected_volume * base_price * (1 - projected_discount)
        
        # Consider both increased discount and volume
        savings = float(current_cost - projected_cost)
        
        # If savings are negative (cost increase), calculate avoided cost increase
        if savings < 0:
            market_price = base_price * Decimal('1.05')  # Assume 5% market increase
            avoided_increase = float(projected_volume * market_price - projected_cost)
            savings = avoided_increase
        
        return {
            "savings": savings,
            "details": {
                "current_volume": float(current_volume),
                "projected_volume": float(projected_volume),
                "current_discount": float(current_discount * 100),
                "projected_discount": float(projected_discount * 100),
                "volume_increase": float((projected_volume - current_volume) / current_volume * 100) if current_volume > 0 else 0
            },
            "assumptions": [
                "Volume commitments will be met",
                "Discount tiers remain unchanged",
                "No penalties for volume shortfalls"
            ]
        }
    
    async def _calculate_process_improvement(self, initiative: Dict) -> Dict[str, Any]:
        """Calculate process improvement savings"""
        
        # Time savings
        hours_saved_per_month = Decimal(str(initiative.get("hours_saved", 0)))
        hourly_rate = Decimal(str(initiative.get("hourly_rate", 50)))  # Default $50/hour
        
        # Error reduction savings
        errors_reduced = Decimal(str(initiative.get("errors_reduced", 0)))
        cost_per_error = Decimal(str(initiative.get("error_cost", 500)))  # Default $500/error
        
        # Efficiency gains
        throughput_increase = Decimal(str(initiative.get("throughput_increase", 0)))  # Percentage
        current_cost = Decimal(str(initiative.get("current_process_cost", 0)))
        
        # Calculate components
        labor_savings = hours_saved_per_month * hourly_rate * 12  # Annual
        error_savings = errors_reduced * cost_per_error * 12  # Annual
        efficiency_savings = current_cost * (throughput_increase / 100)
        
        total_savings = labor_savings + error_savings + efficiency_savings
        
        return {
            "savings": float(total_savings),
            "details": {
                "labor_savings": float(labor_savings),
                "error_reduction_savings": float(error_savings),
                "efficiency_savings": float(efficiency_savings),
                "hours_saved_annually": float(hours_saved_per_month * 12),
                "errors_avoided_annually": float(errors_reduced * 12)
            },
            "assumptions": [
                f"Hourly rate of ${hourly_rate}/hour",
                f"Error cost of ${cost_per_error} per incident",
                "Process improvements are sustained",
                "No degradation in quality"
            ]
        }
    
    async def _calculate_demand_management(self, initiative: Dict) -> Dict[str, Any]:
        """Calculate demand management savings"""
        
        # Consumption reduction
        baseline_consumption = Decimal(str(initiative.get("baseline_consumption", 0)))
        reduced_consumption = Decimal(str(initiative.get("reduced_consumption", 0)))
        unit_cost = Decimal(str(initiative.get("unit_cost", 0)))
        
        # Waste reduction
        waste_percentage = Decimal(str(initiative.get("waste_reduction", 0)))  # Percentage
        waste_cost = Decimal(str(initiative.get("annual_waste_cost", 0)))
        
        # Calculate savings
        consumption_savings = (baseline_consumption - reduced_consumption) * unit_cost
        waste_savings = waste_cost * (waste_percentage / 100)
        
        total_savings = consumption_savings + waste_savings
        
        return {
            "savings": float(total_savings),
            "details": {
                "consumption_reduction": float(baseline_consumption - reduced_consumption),
                "consumption_savings": float(consumption_savings),
                "waste_savings": float(waste_savings),
                "percent_reduction": float((baseline_consumption - reduced_consumption) / baseline_consumption * 100) if baseline_consumption > 0 else 0
            },
            "assumptions": [
                "Demand reduction is sustainable",
                "No impact on operations",
                "User adoption maintained"
            ]
        }
    
    async def _calculate_substitution_savings(self, initiative: Dict) -> Dict[str, Any]:
        """Calculate substitution/alternative product savings"""
        
        original_cost = Decimal(str(initiative.get("original_product_cost", 0)))
        substitute_cost = Decimal(str(initiative.get("substitute_cost", 0)))
        volume = Decimal(str(initiative.get("volume", 0)))
        
        # Switching costs
        switching_cost = Decimal(str(initiative.get("switching_cost", 0)))
        training_cost = Decimal(str(initiative.get("training_cost", 0)))
        
        # Calculate net savings
        gross_savings = (original_cost - substitute_cost) * volume
        one_time_costs = switching_cost + training_cost
        
        # Amortize one-time costs over expected lifetime
        lifetime_months = Decimal(str(initiative.get("expected_lifetime_months", 12)))
        amortized_costs = one_time_costs / lifetime_months * 12  # Annual
        
        net_savings = gross_savings - amortized_costs
        
        return {
            "savings": float(net_savings),
            "details": {
                "gross_savings": float(gross_savings),
                "one_time_costs": float(one_time_costs),
                "amortized_annual_cost": float(amortized_costs),
                "net_savings": float(net_savings),
                "payback_months": float(one_time_costs / (gross_savings / 12)) if gross_savings > 0 else 0
            },
            "assumptions": [
                "Substitute product meets all requirements",
                "No quality degradation",
                f"Lifetime of {lifetime_months} months"
            ]
        }
    
    async def _calculate_payment_terms_savings(self, initiative: Dict) -> Dict[str, Any]:
        """Calculate payment terms improvement savings"""
        
        annual_spend = Decimal(str(initiative.get("annual_spend", 0)))
        old_terms = Decimal(str(initiative.get("old_payment_days", 30)))
        new_terms = Decimal(str(initiative.get("new_payment_days", 60)))
        cost_of_capital = Decimal(str(initiative.get("cost_of_capital", 0.08)))  # Default 8%
        
        # Early payment discount
        discount_rate = Decimal(str(initiative.get("early_payment_discount", 0)))  # Percentage
        discount_utilization = Decimal(str(initiative.get("discount_utilization", 0.5)))  # 50% default
        
        # Calculate working capital benefit
        days_improved = new_terms - old_terms
        daily_spend = annual_spend / 365
        working_capital_benefit = daily_spend * days_improved * cost_of_capital
        
        # Calculate discount savings
        discount_savings = annual_spend * (discount_rate / 100) * discount_utilization
        
        total_savings = working_capital_benefit + discount_savings
        
        return {
            "savings": float(total_savings),
            "details": {
                "working_capital_benefit": float(working_capital_benefit),
                "discount_savings": float(discount_savings),
                "days_improved": float(days_improved),
                "cash_flow_improvement": float(daily_spend * days_improved)
            },
            "assumptions": [
                f"Cost of capital at {float(cost_of_capital * 100)}%",
                "Payment terms consistently achieved",
                f"Discount utilization at {float(discount_utilization * 100)}%"
            ]
        }
    
    async def _calculate_rebate_savings(self, initiative: Dict) -> Dict[str, Any]:
        """Calculate rebate program savings"""
        
        annual_spend = Decimal(str(initiative.get("annual_spend", 0)))
        rebate_tiers = initiative.get("rebate_tiers", [])
        
        # Calculate expected rebate
        expected_rebate = Decimal('0')
        
        for tier in rebate_tiers:
            threshold = Decimal(str(tier.get("threshold", 0)))
            rate = Decimal(str(tier.get("rate", 0))) / 100
            
            if annual_spend >= threshold:
                if tier.get("incremental", False):
                    # Incremental rebate on amount above threshold
                    tier_amount = annual_spend - threshold
                    expected_rebate += tier_amount * rate
                else:
                    # Flat rebate on entire amount
                    expected_rebate = annual_spend * rate
        
        # Apply achievement probability
        probability = Decimal(str(initiative.get("achievement_probability", 0.9)))
        risk_adjusted_rebate = expected_rebate * probability
        
        return {
            "savings": float(risk_adjusted_rebate),
            "details": {
                "annual_spend": float(annual_spend),
                "expected_rebate": float(expected_rebate),
                "achievement_probability": float(probability * 100),
                "risk_adjusted_rebate": float(risk_adjusted_rebate)
            },
            "assumptions": [
                "Spend targets will be achieved",
                "Rebate program continues unchanged",
                "No exclusions or disqualifications"
            ]
        }
    
    async def _calculate_cost_avoidance(self, initiative: Dict) -> Dict[str, Any]:
        """Calculate cost avoidance savings"""
        
        baseline_cost = Decimal(str(initiative.get("baseline_cost", 0)))
        market_increase = Decimal(str(initiative.get("market_increase_rate", 0.05)))  # 5% default
        negotiated_increase = Decimal(str(initiative.get("negotiated_increase", 0.02)))  # 2% default
        volume = Decimal(str(initiative.get("volume", 1)))
        
        # Calculate avoided cost
        market_cost = baseline_cost * (1 + market_increase) * volume
        negotiated_cost = baseline_cost * (1 + negotiated_increase) * volume
        
        avoided_cost = market_cost - negotiated_cost
        
        return {
            "savings": float(avoided_cost),
            "details": {
                "market_rate_increase": float(market_increase * 100),
                "negotiated_increase": float(negotiated_increase * 100),
                "avoided_increase": float((market_increase - negotiated_increase) * 100),
                "market_cost": float(market_cost),
                "negotiated_cost": float(negotiated_cost)
            },
            "assumptions": [
                f"Market rates would increase by {float(market_increase * 100)}%",
                "Negotiated rates are locked in",
                "Volume remains stable"
            ]
        }
    
    async def _calculate_price_variance(self, initiative: Dict) -> Dict[str, Any]:
        """Calculate price variance savings"""
        
        budgeted_price = Decimal(str(initiative.get("budgeted_price", 0)))
        actual_price = Decimal(str(initiative.get("actual_price", 0)))
        volume = Decimal(str(initiative.get("volume", 0)))
        
        # Favorable variance (actual < budget)
        price_variance = (budgeted_price - actual_price) * volume
        
        return {
            "savings": float(price_variance),
            "details": {
                "budgeted_price": float(budgeted_price),
                "actual_price": float(actual_price),
                "variance_per_unit": float(budgeted_price - actual_price),
                "variance_percentage": float((budgeted_price - actual_price) / budgeted_price * 100) if budgeted_price > 0 else 0
            },
            "assumptions": [
                "Budget baseline is accurate",
                "No scope changes",
                "Volume as planned"
            ]
        }
    
    async def _calculate_budget_variance(self, initiative: Dict) -> Dict[str, Any]:
        """Calculate budget variance savings"""
        
        budgeted_amount = Decimal(str(initiative.get("budgeted_amount", 0)))
        actual_amount = Decimal(str(initiative.get("actual_amount", 0)))
        
        # Favorable variance
        budget_variance = budgeted_amount - actual_amount
        
        return {
            "savings": float(budget_variance),
            "details": {
                "budgeted_amount": float(budgeted_amount),
                "actual_amount": float(actual_amount),
                "variance": float(budget_variance),
                "variance_percentage": float(budget_variance / budgeted_amount * 100) if budgeted_amount > 0 else 0
            },
            "assumptions": [
                "All planned activities completed",
                "No scope reduction",
                "Quality maintained"
            ]
        }
    
    async def _calculate_generic_savings(self, initiative: Dict) -> Dict[str, Any]:
        """Generic savings calculation"""
        
        projected = Decimal(str(initiative.get("projected_savings", 0)))
        realized = Decimal(str(initiative.get("realized_savings", 0)))
        
        # Use realized if available, otherwise projected
        savings = realized if realized > 0 else projected
        
        return {
            "savings": float(savings),
            "details": {
                "projected": float(projected),
                "realized": float(realized),
                "achievement_rate": float(realized / projected * 100) if projected > 0 else 0
            },
            "assumptions": [
                "Savings estimates are accurate",
                "No external factors impact savings"
            ]
        }
    
    def _get_volume_discount(self, volume: Decimal, tiers: List[Dict]) -> Decimal:
        """Get applicable volume discount from tiers"""
        
        discount = Decimal('0')
        
        for tier in sorted(tiers, key=lambda x: x.get("min_volume", 0), reverse=True):
            min_volume = Decimal(str(tier.get("min_volume", 0)))
            tier_discount = Decimal(str(tier.get("discount", 0))) / 100
            
            if volume >= min_volume:
                discount = tier_discount
                break
        
        return discount
    
    async def _apply_adjustments(self, base_result: Dict, 
                                initiative: Dict) -> Dict[str, Any]:
        """Apply risk and other adjustments to savings"""
        
        savings = Decimal(str(base_result["savings"]))
        adjustments = {}
        
        # Risk adjustment
        confidence = Decimal(str(initiative.get("confidence", 0.8)))
        risk_adjusted = savings * confidence
        adjustments["risk"] = float(savings - risk_adjusted)
        
        # Foreign exchange adjustment
        if initiative.get("currency") and initiative.get("currency") != "USD":
            fx_buffer = Decimal(str(self.parameters["fx_buffer"]))
            fx_adjusted = risk_adjusted * (1 - fx_buffer)
            adjustments["fx"] = float(risk_adjusted - fx_adjusted)
            savings = fx_adjusted
        else:
            savings = risk_adjusted
        
        # Implementation cost adjustment
        impl_cost = Decimal(str(initiative.get("implementation_cost", 0)))
        if impl_cost > 0:
            # Amortize over first year
            savings = savings - impl_cost
            adjustments["implementation"] = float(impl_cost)
        
        return {
            "savings": float(savings),
            "adjustments": adjustments,
            "total_adjustment": sum(adjustments.values())
        }
    
    async def _calculate_time_metrics(self, result: Dict, 
                                     initiative: Dict) -> Dict[str, Any]:
        """Calculate time-based savings metrics"""
        
        annual_savings = Decimal(str(result["savings"]))
        
        # Monthly, quarterly calculations
        monthly = annual_savings / 12
        quarterly = annual_savings / 4
        
        # Lifetime calculation
        start_date = initiative.get("start_date")
        end_date = initiative.get("end_date")
        
        if start_date and end_date:
            start = datetime.fromisoformat(start_date)
            end = datetime.fromisoformat(end_date)
            months = (end.year - start.year) * 12 + (end.month - start.month)
            lifetime = annual_savings * (Decimal(str(months)) / 12)
        else:
            lifetime = annual_savings * 3  # Default 3 years
        
        # NPV calculation
        discount_rate = Decimal(str(self.parameters["discount_rate"]))
        years = int(lifetime / annual_savings) if annual_savings > 0 else 3
        
        npv = Decimal('0')
        for year in range(1, years + 1):
            discounted = annual_savings / ((1 + discount_rate) ** year)
            npv += discounted
        
        # Payback period
        impl_cost = Decimal(str(initiative.get("implementation_cost", 0)))
        if impl_cost > 0 and monthly > 0:
            payback_months = impl_cost / monthly
        else:
            payback_months = Decimal('0')
        
        return {
            "monthly": float(monthly),
            "quarterly": float(quarterly),
            "annual": float(annual_savings),
            "lifetime": float(lifetime),
            "npv": float(npv),
            "payback_period": float(payback_months)
        }
    
    async def calculate_portfolio_savings(self, 
                                        initiatives: List[Dict]) -> Dict[str, Any]:
        """Calculate savings across portfolio of initiatives"""
        
        portfolio_results = []
        total_savings = Decimal('0')
        total_realized = Decimal('0')
        
        by_type = {}
        by_status = {}
        by_category = {}
        
        for initiative in initiatives:
            # Calculate individual savings
            result = await self.calculate_savings(initiative)
            portfolio_results.append(result)
            
            # Aggregate totals
            total_savings += Decimal(str(result["annual_savings"]))
            realized = Decimal(str(initiative.get("realized_savings", 0)))
            total_realized += realized
            
            # Group by type
            sav_type = initiative.get("savings_type", "Other")
            if sav_type not in by_type:
                by_type[sav_type] = Decimal('0')
            by_type[sav_type] += Decimal(str(result["annual_savings"]))
            
            # Group by status  
            status = initiative.get("status", "Unknown")
            if status not in by_status:
                by_status[status] = Decimal('0')
            by_status[status] += Decimal(str(result["annual_savings"]))
            
            # Group by category
            category = initiative.get("category", "Other")
            if category not in by_category:
                by_category[category] = Decimal('0')
            by_category[category] += Decimal(str(result["annual_savings"]))
        
        return {
            "total_projected_savings": float(total_savings),
            "total_realized_savings": float(total_realized),
            "realization_rate": float(total_realized / total_savings * 100) if total_savings > 0 else 0,
            "initiative_count": len(initiatives),
            "average_savings": float(total_savings / len(initiatives)) if initiatives else 0,
            "by_type": {k: float(v) for k, v in by_type.items()},
            "by_status": {k: float(v) for k, v in by_status.items()},
            "by_category": {k: float(v) for k, v in by_category.items()},
            "details": portfolio_results
        }