"""
Vendor optimization and recommendation engine.
"""

import logging
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime, timedelta
import numpy as np
from enum import Enum

try:
    from scipy.optimize import linprog, minimize
    from scipy.stats import norm
    SCIPY_AVAILABLE = True
except ImportError:
    SCIPY_AVAILABLE = False
    logging.warning("SciPy not available for optimization")

try:
    import pulp
    PULP_AVAILABLE = True
except ImportError:
    PULP_AVAILABLE = False
    logging.warning("PuLP not available for linear programming")

logger = logging.getLogger(__name__)


class OptimizationType(Enum):
    """Types of optimization strategies."""
    COST_REDUCTION = "cost_reduction"
    PERFORMANCE_IMPROVEMENT = "performance_improvement"
    RISK_MITIGATION = "risk_mitigation"
    CAPACITY_OPTIMIZATION = "capacity_optimization"
    PORTFOLIO_BALANCING = "portfolio_balancing"
    RELATIONSHIP_ENHANCEMENT = "relationship_enhancement"
    COMPLIANCE_OPTIMIZATION = "compliance_optimization"
    SUSTAINABILITY_IMPROVEMENT = "sustainability_improvement"


@dataclass
class OptimizationRecommendation:
    """Optimization recommendation."""
    strategy: OptimizationType
    priority: str  # critical, high, medium, low
    expected_impact: Dict[str, float]
    implementation_steps: List[str]
    timeline_days: int
    roi_estimate: float
    confidence: float
    risks: List[str]


class VendorOptimizationEngine:
    """
    Generate optimization recommendations for vendor management.
    """
    
    def __init__(self):
        """Initialize optimization engine."""
        self.optimization_history = []
        self.strategy_templates = self._initialize_strategies()
    
    def _initialize_strategies(self) -> Dict[str, Any]:
        """Initialize optimization strategy templates."""
        return {
            OptimizationType.COST_REDUCTION: {
                "description": "Reduce vendor-related costs",
                "metrics": ["cost_efficiency", "price_variance", "discount_capture"],
                "tactics": [
                    "Volume consolidation",
                    "Payment term optimization",
                    "Competitive bidding",
                    "Demand management",
                    "Specification rationalization"
                ]
            },
            OptimizationType.PERFORMANCE_IMPROVEMENT: {
                "description": "Enhance vendor performance metrics",
                "metrics": ["on_time_delivery", "quality_score", "response_time"],
                "tactics": [
                    "Performance incentives",
                    "Training programs",
                    "Process improvement",
                    "Technology enablement",
                    "Communication enhancement"
                ]
            },
            OptimizationType.RISK_MITIGATION: {
                "description": "Reduce vendor-related risks",
                "metrics": ["risk_score", "compliance_rate", "financial_stability"],
                "tactics": [
                    "Dual sourcing",
                    "Inventory buffering",
                    "Contract protection",
                    "Performance bonds",
                    "Regular audits"
                ]
            },
            OptimizationType.CAPACITY_OPTIMIZATION: {
                "description": "Optimize vendor capacity utilization",
                "metrics": ["capacity_utilization", "flexibility_score", "scalability"],
                "tactics": [
                    "Demand forecasting",
                    "Capacity planning",
                    "Flexible agreements",
                    "Peak shaving",
                    "Load balancing"
                ]
            }
        }
    
    async def generate_recommendations(
        self,
        metrics: Any,
        risks: List[Dict[str, Any]],
        warnings: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Generate optimization recommendations.
        
        Args:
            metrics: Current vendor metrics
            risks: Identified risks
            warnings: Early warning signals
            
        Returns:
            List of optimization recommendations
        """
        recommendations = []
        
        # Analyze current state
        analysis = self._analyze_current_state(metrics, risks, warnings)
        
        # Generate strategy-based recommendations
        for strategy_type in OptimizationType:
            recommendation = await self._generate_strategy_recommendation(
                strategy_type,
                analysis,
                metrics
            )
            if recommendation:
                recommendations.append(recommendation)
        
        # Generate quick wins
        quick_wins = self._identify_quick_wins(metrics, risks)
        recommendations.extend(quick_wins)
        
        # Prioritize recommendations
        recommendations = self._prioritize_recommendations(recommendations)
        
        return recommendations[:10]  # Return top 10 recommendations
    
    def _analyze_current_state(
        self,
        metrics: Any,
        risks: List[Dict[str, Any]],
        warnings: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Analyze current vendor state."""
        analysis = {
            "performance_level": "normal",
            "risk_level": "medium",
            "urgency": "normal",
            "main_issues": [],
            "opportunities": []
        }
        
        # Assess performance
        if hasattr(metrics, '__dict__'):
            metric_values = []
            for attr in ['on_time_delivery', 'quality_score', 'response_time', 'compliance_rate']:
                if hasattr(metrics, attr):
                    metric_values.append(getattr(metrics, attr))
            
            if metric_values:
                avg_performance = np.mean(metric_values)
                if avg_performance < 60:
                    analysis["performance_level"] = "critical"
                elif avg_performance < 75:
                    analysis["performance_level"] = "poor"
                elif avg_performance > 90:
                    analysis["performance_level"] = "excellent"
        
        # Assess risk level
        critical_risks = [r for r in risks if r.get("level") == "critical"]
        high_risks = [r for r in risks if r.get("level") == "high"]
        
        if critical_risks:
            analysis["risk_level"] = "critical"
            analysis["urgency"] = "immediate"
        elif len(high_risks) > 2:
            analysis["risk_level"] = "high"
            analysis["urgency"] = "urgent"
        elif high_risks:
            analysis["risk_level"] = "medium-high"
        
        # Identify main issues
        if hasattr(metrics, 'on_time_delivery') and metrics.on_time_delivery < 80:
            analysis["main_issues"].append("delivery_performance")
        if hasattr(metrics, 'quality_score') and metrics.quality_score < 80:
            analysis["main_issues"].append("quality_issues")
        if hasattr(metrics, 'cost_efficiency') and metrics.cost_efficiency < 70:
            analysis["main_issues"].append("cost_overruns")
        
        # Identify opportunities
        if hasattr(metrics, 'cost_efficiency') and metrics.cost_efficiency < 80:
            analysis["opportunities"].append("cost_reduction")
        if len(risks) > 5:
            analysis["opportunities"].append("risk_consolidation")
        
        return analysis
    
    async def _generate_strategy_recommendation(
        self,
        strategy_type: OptimizationType,
        analysis: Dict[str, Any],
        metrics: Any
    ) -> Optional[Dict[str, Any]]:
        """Generate recommendation for specific strategy."""
        strategy_info = self.strategy_templates.get(strategy_type)
        if not strategy_info:
            return None
        
        # Check if strategy is relevant
        relevance_score = self._calculate_strategy_relevance(
            strategy_type,
            analysis,
            metrics
        )
        
        if relevance_score < 0.3:
            return None
        
        # Generate specific recommendation
        if strategy_type == OptimizationType.COST_REDUCTION:
            return self._generate_cost_reduction_recommendation(metrics, analysis)
        elif strategy_type == OptimizationType.PERFORMANCE_IMPROVEMENT:
            return self._generate_performance_recommendation(metrics, analysis)
        elif strategy_type == OptimizationType.RISK_MITIGATION:
            return self._generate_risk_mitigation_recommendation(analysis)
        elif strategy_type == OptimizationType.CAPACITY_OPTIMIZATION:
            return self._generate_capacity_recommendation(metrics, analysis)
        
        return None
    
    def _generate_cost_reduction_recommendation(
        self,
        metrics: Any,
        analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate cost reduction recommendation."""
        cost_efficiency = getattr(metrics, 'cost_efficiency', 75)
        
        if cost_efficiency < 80:
            potential_savings = (80 - cost_efficiency) / 100
            
            return {
                "strategy": OptimizationType.COST_REDUCTION.value,
                "priority": "high" if cost_efficiency < 60 else "medium",
                "description": "Implement cost reduction initiatives",
                "expected_impact": {
                    "cost_savings": potential_savings * 100,
                    "efficiency_gain": 10,
                    "roi": 3.5
                },
                "implementation_steps": [
                    "Conduct spend analysis",
                    "Identify consolidation opportunities",
                    "Negotiate volume discounts",
                    "Implement cost tracking",
                    "Review specifications"
                ],
                "timeline_days": 60,
                "confidence": 0.75,
                "risks": [
                    "Potential service level impact",
                    "Vendor relationship strain"
                ]
            }
        
        return None
    
    def _generate_performance_recommendation(
        self,
        metrics: Any,
        analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate performance improvement recommendation."""
        performance_issues = []
        
        if hasattr(metrics, 'on_time_delivery') and metrics.on_time_delivery < 85:
            performance_issues.append("delivery")
        if hasattr(metrics, 'quality_score') and metrics.quality_score < 85:
            performance_issues.append("quality")
        
        if performance_issues:
            return {
                "strategy": OptimizationType.PERFORMANCE_IMPROVEMENT.value,
                "priority": "critical" if analysis["performance_level"] == "critical" else "high",
                "description": f"Improve {', '.join(performance_issues)} performance",
                "expected_impact": {
                    "performance_improvement": 20,
                    "customer_satisfaction": 15,
                    "operational_efficiency": 10
                },
                "implementation_steps": [
                    "Root cause analysis",
                    "Performance improvement plan",
                    "KPI monitoring setup",
                    "Regular review meetings",
                    "Incentive alignment"
                ],
                "timeline_days": 45,
                "confidence": 0.8,
                "risks": [
                    "Implementation resistance",
                    "Short-term disruption"
                ]
            }
        
        return None
    
    def _generate_risk_mitigation_recommendation(
        self,
        analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate risk mitigation recommendation."""
        if analysis["risk_level"] in ["critical", "high"]:
            return {
                "strategy": OptimizationType.RISK_MITIGATION.value,
                "priority": "critical" if analysis["risk_level"] == "critical" else "high",
                "description": "Implement comprehensive risk mitigation",
                "expected_impact": {
                    "risk_reduction": 40,
                    "stability_improvement": 30,
                    "compliance_improvement": 25
                },
                "implementation_steps": [
                    "Risk assessment audit",
                    "Mitigation plan development",
                    "Backup vendor identification",
                    "Contract amendments",
                    "Monitoring system setup"
                ],
                "timeline_days": 30,
                "confidence": 0.85,
                "risks": [
                    "Increased costs",
                    "Complexity addition"
                ]
            }
        
        return None
    
    def _generate_capacity_recommendation(
        self,
        metrics: Any,
        analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate capacity optimization recommendation."""
        if "delivery_performance" in analysis["main_issues"]:
            return {
                "strategy": OptimizationType.CAPACITY_OPTIMIZATION.value,
                "priority": "high",
                "description": "Optimize vendor capacity allocation",
                "expected_impact": {
                    "delivery_improvement": 25,
                    "flexibility_increase": 20,
                    "cost_optimization": 10
                },
                "implementation_steps": [
                    "Demand pattern analysis",
                    "Capacity assessment",
                    "Flexible agreement negotiation",
                    "Buffer optimization",
                    "Load leveling implementation"
                ],
                "timeline_days": 45,
                "confidence": 0.7,
                "risks": [
                    "Forecasting accuracy",
                    "Vendor capability limits"
                ]
            }
        
        return None
    
    def _identify_quick_wins(
        self,
        metrics: Any,
        risks: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Identify quick win opportunities."""
        quick_wins = []
        
        # Communication improvement
        if hasattr(metrics, 'response_time') and metrics.response_time < 70:
            quick_wins.append({
                "strategy": OptimizationType.RELATIONSHIP_ENHANCEMENT.value,
                "priority": "medium",
                "description": "Improve communication protocols",
                "expected_impact": {
                    "response_improvement": 30,
                    "issue_resolution": 25
                },
                "implementation_steps": [
                    "Define communication SLAs",
                    "Establish regular check-ins",
                    "Create escalation matrix"
                ],
                "timeline_days": 14,
                "confidence": 0.9,
                "risks": []
            })
        
        # Compliance quick fixes
        compliance_risks = [r for r in risks if "compliance" in r.get("category", "").lower()]
        if compliance_risks:
            quick_wins.append({
                "strategy": OptimizationType.COMPLIANCE_OPTIMIZATION.value,
                "priority": "high",
                "description": "Address compliance gaps",
                "expected_impact": {
                    "compliance_improvement": 20,
                    "risk_reduction": 15
                },
                "implementation_steps": [
                    "Compliance checklist review",
                    "Documentation update",
                    "Training session"
                ],
                "timeline_days": 7,
                "confidence": 0.85,
                "risks": []
            })
        
        return quick_wins
    
    def _calculate_strategy_relevance(
        self,
        strategy_type: OptimizationType,
        analysis: Dict[str, Any],
        metrics: Any
    ) -> float:
        """Calculate relevance score for a strategy."""
        relevance = 0.5  # Base relevance
        
        # Adjust based on strategy type and current state
        if strategy_type == OptimizationType.COST_REDUCTION:
            if hasattr(metrics, 'cost_efficiency'):
                relevance = 1.0 - (metrics.cost_efficiency / 100)
        
        elif strategy_type == OptimizationType.PERFORMANCE_IMPROVEMENT:
            if analysis["performance_level"] in ["critical", "poor"]:
                relevance = 0.9
            elif analysis["performance_level"] == "normal":
                relevance = 0.5
            else:
                relevance = 0.2
        
        elif strategy_type == OptimizationType.RISK_MITIGATION:
            risk_map = {"critical": 1.0, "high": 0.8, "medium": 0.5, "low": 0.2}
            relevance = risk_map.get(analysis["risk_level"], 0.5)
        
        elif strategy_type == OptimizationType.CAPACITY_OPTIMIZATION:
            if "delivery_performance" in analysis["main_issues"]:
                relevance = 0.8
        
        return relevance
    
    def _prioritize_recommendations(
        self,
        recommendations: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Prioritize recommendations."""
        priority_scores = {
            "critical": 4,
            "high": 3,
            "medium": 2,
            "low": 1
        }
        
        for rec in recommendations:
            # Calculate priority score
            priority = rec.get("priority", "medium")
            confidence = rec.get("confidence", 0.5)
            timeline = rec.get("timeline_days", 30)
            
            # Expected value calculation
            impact_sum = sum(rec.get("expected_impact", {}).values())
            
            # Priority score = (priority * confidence * impact) / sqrt(timeline)
            score = (priority_scores[priority] * confidence * impact_sum) / np.sqrt(max(1, timeline))
            
            rec["_priority_score"] = score
        
        # Sort by priority score
        recommendations.sort(key=lambda x: x.get("_priority_score", 0), reverse=True)
        
        # Remove internal score
        for rec in recommendations:
            rec.pop("_priority_score", None)
        
        return recommendations
    
    async def optimize_vendor_portfolio(
        self,
        vendors: List[Dict[str, Any]],
        constraints: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Optimize entire vendor portfolio.
        
        Args:
            vendors: List of vendor data
            constraints: Optimization constraints
            
        Returns:
            Portfolio optimization results
        """
        if not vendors:
            return {"error": "No vendors to optimize"}
        
        # Portfolio analysis
        portfolio_metrics = self._analyze_portfolio(vendors)
        
        # Optimization recommendations
        recommendations = []
        
        # Concentration analysis
        if portfolio_metrics["concentration_risk"] > 0.3:
            recommendations.append({
                "action": "diversify",
                "description": "Reduce vendor concentration",
                "vendors_affected": portfolio_metrics["top_vendors"][:3]
            })
        
        # Performance optimization
        low_performers = portfolio_metrics["low_performers"]
        if low_performers:
            recommendations.append({
                "action": "improve_or_replace",
                "description": "Address low-performing vendors",
                "vendors_affected": low_performers[:5]
            })
        
        # Cost optimization
        if SCIPY_AVAILABLE and len(vendors) > 5:
            cost_optimization = self._optimize_costs(vendors, constraints)
            if cost_optimization:
                recommendations.append(cost_optimization)
        
        return {
            "portfolio_metrics": portfolio_metrics,
            "recommendations": recommendations,
            "optimization_potential": self._calculate_optimization_potential(portfolio_metrics)
        }
    
    def _analyze_portfolio(
        self,
        vendors: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Analyze vendor portfolio."""
        total_spend = sum(v.get("spend", 0) for v in vendors)
        
        # Calculate concentration
        vendor_shares = []
        for vendor in vendors:
            share = vendor.get("spend", 0) / total_spend if total_spend > 0 else 0
            vendor_shares.append(share)
        
        # Herfindahl index for concentration
        herfindahl = sum(s**2 for s in vendor_shares)
        
        # Identify low performers
        low_performers = []
        for vendor in vendors:
            if vendor.get("performance_score", 100) < 70:
                low_performers.append(vendor.get("id", "unknown"))
        
        # Top vendors by spend
        sorted_vendors = sorted(vendors, key=lambda x: x.get("spend", 0), reverse=True)
        top_vendors = [v.get("id", "unknown") for v in sorted_vendors[:5]]
        
        return {
            "total_vendors": len(vendors),
            "total_spend": total_spend,
            "concentration_risk": herfindahl,
            "low_performers": low_performers,
            "top_vendors": top_vendors,
            "avg_performance": np.mean([v.get("performance_score", 75) for v in vendors])
        }
    
    def _optimize_costs(
        self,
        vendors: List[Dict[str, Any]],
        constraints: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Optimize costs using linear programming."""
        if not SCIPY_AVAILABLE:
            return None
        
        try:
            # Simple cost optimization example
            n_vendors = len(vendors)
            
            # Objective: minimize total cost
            costs = [v.get("unit_cost", 1.0) for v in vendors]
            
            # Constraints
            A_ub = []
            b_ub = []
            
            # Capacity constraints
            if "max_capacity" in constraints:
                A_ub.append([1] * n_vendors)
                b_ub.append(constraints["max_capacity"])
            
            # Bounds (0 to max order per vendor)
            bounds = [(0, v.get("max_capacity", 1000)) for v in vendors]
            
            # Solve
            if A_ub:
                result = linprog(costs, A_ub=A_ub, b_ub=b_ub, bounds=bounds, method='highs')
                
                if result.success:
                    return {
                        "action": "optimize_allocation",
                        "description": "Optimal vendor allocation found",
                        "potential_savings": float(np.sum(costs) - result.fun),
                        "allocation": result.x.tolist()[:5]  # Top 5 allocations
                    }
            
        except Exception as e:
            logger.error(f"Cost optimization failed: {e}")
        
        return None
    
    def _calculate_optimization_potential(
        self,
        portfolio_metrics: Dict[str, Any]
    ) -> Dict[str, float]:
        """Calculate optimization potential."""
        potential = {}
        
        # Cost reduction potential
        avg_performance = portfolio_metrics.get("avg_performance", 75)
        if avg_performance < 85:
            potential["cost_reduction"] = (85 - avg_performance) / 100 * 15  # 15% max
        
        # Performance improvement potential
        low_performer_count = len(portfolio_metrics.get("low_performers", []))
        total_vendors = portfolio_metrics.get("total_vendors", 1)
        if total_vendors > 0:
            potential["performance_improvement"] = (low_performer_count / total_vendors) * 25
        
        # Risk reduction potential
        concentration = portfolio_metrics.get("concentration_risk", 0)
        if concentration > 0.2:
            potential["risk_reduction"] = min(30, concentration * 100)
        
        return potential