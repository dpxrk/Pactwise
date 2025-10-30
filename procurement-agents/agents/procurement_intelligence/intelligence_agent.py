"""Main Procurement Intelligence Agent"""

from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import asyncio

from agents.base_agent import BaseAgent
from .insight_generator import InsightGenerator
from .predictive_analytics import PredictiveAnalytics
from .recommendation_engine import RecommendationEngine
from utils.logging_config import get_logger
from utils.decorators import with_retry, measure_time, with_caching
from utils.exceptions import AgentError


class ProcurementIntelligenceAgent(BaseAgent):
    """Agent for procurement intelligence and analytics"""
    
    def __init__(self):
        super().__init__("procurement_intelligence", "Procurement Intelligence Agent")
        self.logger = get_logger(__name__)
        
        # Initialize supporting modules
        self.insight_generator = InsightGenerator()
        self.predictive_analytics = PredictiveAnalytics()
        self.recommendation_engine = RecommendationEngine()
        
        # Intelligence configuration
        self.config = {
            "insight_threshold": 0.7,  # Minimum confidence for insights
            "prediction_horizon_days": 90,  # Default prediction window
            "recommendation_limit": 10,  # Max recommendations per request
            "refresh_interval_hours": 24  # Cache refresh interval
        }
    
    @measure_time
    @with_retry(max_attempts=2)
    async def generate_intelligence_report(self, 
                                          report_type: str = "comprehensive",
                                          time_period: str = "last_30_days",
                                          filters: Dict = None) -> Dict[str, Any]:
        """Generate comprehensive intelligence report"""
        
        try:
            self.logger.info(f"Generating {report_type} intelligence report for {time_period}")
            
            # Parse time period
            date_range = self._parse_time_period(time_period)
            
            # Gather data concurrently
            insights, predictions, recommendations = await asyncio.gather(
                self.insight_generator.generate_insights(date_range, filters),
                self.predictive_analytics.generate_predictions(date_range),
                self.recommendation_engine.generate_recommendations(filters)
            )
            
            # Apply report type filtering
            if report_type == "executive":
                insights = self._filter_executive_insights(insights)
                recommendations = recommendations[:5]  # Top 5 only
            elif report_type == "operational":
                insights = self._filter_operational_insights(insights)
            
            # Calculate intelligence score
            intelligence_score = self._calculate_intelligence_score(
                insights, predictions, recommendations
            )
            
            return {
                "report_id": self._generate_report_id(),
                "report_type": report_type,
                "time_period": time_period,
                "date_range": date_range,
                "generated_at": datetime.utcnow().isoformat(),
                "intelligence_score": intelligence_score,
                "insights": insights,
                "predictions": predictions,
                "recommendations": recommendations,
                "summary": self._generate_summary(insights, predictions, recommendations)
            }
            
        except Exception as e:
            self.logger.error(f"Error generating intelligence report: {str(e)}")
            raise AgentError(
                agent_name=self.name,
                operation="generate_intelligence_report",
                details={"error": str(e)}
            )
    
    @measure_time
    async def analyze_opportunities(self, 
                                   category: str = None,
                                   min_value: float = None) -> Dict[str, Any]:
        """Analyze procurement opportunities"""
        
        try:
            # Get spend analysis
            spend_insights = await self.insight_generator.analyze_spend_patterns(category)
            
            # Identify savings opportunities
            savings_opps = await self.recommendation_engine.identify_savings_opportunities(
                category, min_value
            )
            
            # Get consolidation opportunities
            consolidation = await self.recommendation_engine.identify_consolidation_opportunities(
                category
            )
            
            # Predict future opportunities
            future_opps = await self.predictive_analytics.predict_opportunities(category)
            
            return {
                "category": category or "All",
                "current_opportunities": {
                    "savings": savings_opps,
                    "consolidation": consolidation
                },
                "predicted_opportunities": future_opps,
                "spend_patterns": spend_insights,
                "total_potential_value": self._calculate_opportunity_value(
                    savings_opps, consolidation
                ),
                "analyzed_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Error analyzing opportunities: {str(e)}")
            raise AgentError(
                agent_name=self.name,
                operation="analyze_opportunities",
                details={"error": str(e)}
            )
    
    @measure_time
    async def get_vendor_intelligence(self, vendor_id: str = None) -> Dict[str, Any]:
        """Get intelligence about vendors"""
        
        try:
            # Vendor performance insights
            performance = await self.insight_generator.analyze_vendor_performance(vendor_id)
            
            # Risk predictions
            risks = await self.predictive_analytics.predict_vendor_risks(vendor_id)
            
            # Recommendations for vendor management
            recommendations = await self.recommendation_engine.generate_vendor_recommendations(
                vendor_id
            )
            
            return {
                "vendor_id": vendor_id,
                "performance_insights": performance,
                "risk_assessment": risks,
                "recommendations": recommendations,
                "analyzed_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Error getting vendor intelligence: {str(e)}")
            raise AgentError(
                agent_name=self.name,
                operation="get_vendor_intelligence",
                details={"error": str(e)}
            )
    
    @measure_time
    async def forecast_spend(self, 
                            category: str = None,
                            horizon_days: int = None) -> Dict[str, Any]:
        """Forecast future spend"""
        
        try:
            horizon = horizon_days or self.config["prediction_horizon_days"]
            
            # Get historical data
            historical = await self.insight_generator.get_spend_history(category)
            
            # Generate forecast
            forecast = await self.predictive_analytics.forecast_spend(
                category, horizon, historical
            )
            
            # Calculate confidence intervals
            confidence = self._calculate_confidence_intervals(forecast)
            
            return {
                "category": category or "All",
                "forecast_horizon_days": horizon,
                "forecast": forecast,
                "confidence_intervals": confidence,
                "historical_data": historical,
                "forecast_accuracy": self._calculate_forecast_accuracy(historical),
                "generated_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Error forecasting spend: {str(e)}")
            raise AgentError(
                agent_name=self.name,
                operation="forecast_spend",
                details={"error": str(e)}
            )
    
    @measure_time
    async def identify_anomalies(self, 
                                time_period: str = "last_7_days") -> Dict[str, Any]:
        """Identify anomalies in procurement data"""
        
        try:
            date_range = self._parse_time_period(time_period)
            
            # Detect anomalies
            anomalies = await self.insight_generator.detect_anomalies(date_range)
            
            # Classify by severity
            critical = [a for a in anomalies if a["severity"] == "critical"]
            high = [a for a in anomalies if a["severity"] == "high"]
            medium = [a for a in anomalies if a["severity"] == "medium"]
            
            # Generate recommendations for each critical anomaly
            critical_actions = []
            for anomaly in critical:
                actions = await self.recommendation_engine.recommend_anomaly_actions(anomaly)
                critical_actions.append({
                    "anomaly": anomaly,
                    "recommended_actions": actions
                })
            
            return {
                "time_period": time_period,
                "date_range": date_range,
                "summary": {
                    "total_anomalies": len(anomalies),
                    "critical": len(critical),
                    "high": len(high),
                    "medium": len(medium)
                },
                "critical_anomalies": critical_actions,
                "all_anomalies": anomalies,
                "detected_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Error identifying anomalies: {str(e)}")
            raise AgentError(
                agent_name=self.name,
                operation="identify_anomalies",
                details={"error": str(e)}
            )
    
    @measure_time
    async def benchmark_performance(self, 
                                   metric: str,
                                   category: str = None) -> Dict[str, Any]:
        """Benchmark procurement performance"""
        
        try:
            # Get current performance
            current = await self.insight_generator.get_performance_metrics(metric, category)
            
            # Get industry benchmarks
            benchmarks = await self.insight_generator.get_industry_benchmarks(metric, category)
            
            # Calculate gaps
            gaps = self._calculate_performance_gaps(current, benchmarks)
            
            # Get improvement recommendations
            improvements = await self.recommendation_engine.recommend_performance_improvements(
                metric, gaps
            )
            
            return {
                "metric": metric,
                "category": category,
                "current_performance": current,
                "industry_benchmarks": benchmarks,
                "performance_gaps": gaps,
                "improvement_recommendations": improvements,
                "analyzed_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Error benchmarking performance: {str(e)}")
            raise AgentError(
                agent_name=self.name,
                operation="benchmark_performance",
                details={"error": str(e)}
            )
    
    def _parse_time_period(self, period: str) -> Dict[str, str]:
        """Parse time period string into date range"""
        
        end_date = datetime.utcnow()
        
        period_map = {
            "today": 1,
            "last_7_days": 7,
            "last_14_days": 14,
            "last_30_days": 30,
            "last_60_days": 60,
            "last_90_days": 90,
            "last_quarter": 90,
            "last_6_months": 180,
            "last_year": 365
        }
        
        days = period_map.get(period, 30)
        start_date = end_date - timedelta(days=days)
        
        return {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "days": days
        }
    
    def _generate_report_id(self) -> str:
        """Generate unique report ID"""
        timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
        return f"INTEL-{timestamp}"
    
    def _calculate_intelligence_score(self, insights: Dict, 
                                     predictions: Dict, 
                                     recommendations: Dict) -> float:
        """Calculate overall intelligence quality score"""
        
        # Score components
        insight_score = len(insights.get("insights", [])) * 2
        prediction_score = predictions.get("confidence", 0) * 30
        recommendation_score = len(recommendations.get("recommendations", [])) * 3
        
        total_score = min(100, insight_score + prediction_score + recommendation_score)
        
        return round(total_score, 1)
    
    def _filter_executive_insights(self, insights: Dict) -> Dict:
        """Filter insights for executive audience"""
        
        # Keep only high-impact insights
        filtered = {
            "insights": [
                i for i in insights.get("insights", [])
                if i.get("impact") in ["high", "critical"]
            ]
        }
        
        return filtered
    
    def _filter_operational_insights(self, insights: Dict) -> Dict:
        """Filter insights for operational audience"""
        
        # Include all except low-priority insights
        filtered = {
            "insights": [
                i for i in insights.get("insights", [])
                if i.get("priority") != "low"
            ]
        }
        
        return filtered
    
    def _generate_summary(self, insights: Dict, 
                         predictions: Dict, 
                         recommendations: Dict) -> Dict[str, Any]:
        """Generate executive summary"""
        
        return {
            "key_insights": len(insights.get("insights", [])),
            "critical_insights": len([
                i for i in insights.get("insights", [])
                if i.get("severity") == "critical"
            ]),
            "predictions_count": len(predictions.get("forecasts", [])),
            "recommendations_count": len(recommendations.get("recommendations", [])),
            "high_priority_actions": len([
                r for r in recommendations.get("recommendations", [])
                if r.get("priority") == "high"
            ])
        }
    
    def _calculate_opportunity_value(self, savings: Dict, 
                                    consolidation: Dict) -> float:
        """Calculate total value of identified opportunities"""
        
        savings_value = sum(
            s.get("estimated_value", 0) 
            for s in savings.get("opportunities", [])
        )
        
        consolidation_value = sum(
            c.get("estimated_value", 0)
            for c in consolidation.get("opportunities", [])
        )
        
        return round(savings_value + consolidation_value, 2)
    
    def _calculate_confidence_intervals(self, forecast: Dict) -> Dict[str, Any]:
        """Calculate confidence intervals for forecast"""
        
        # Simplified confidence interval calculation
        forecast_value = forecast.get("predicted_value", 0)
        variance = forecast.get("variance", 0.1)
        
        return {
            "80_percent": {
                "lower": round(forecast_value * (1 - variance * 1.28), 2),
                "upper": round(forecast_value * (1 + variance * 1.28), 2)
            },
            "95_percent": {
                "lower": round(forecast_value * (1 - variance * 1.96), 2),
                "upper": round(forecast_value * (1 + variance * 1.96), 2)
            }
        }
    
    def _calculate_forecast_accuracy(self, historical: Dict) -> float:
        """Calculate historical forecast accuracy"""
        
        # Simplified accuracy calculation
        # In production, compare previous forecasts to actuals
        
        return 85.0  # Placeholder
    
    def _calculate_performance_gaps(self, current: Dict, 
                                   benchmarks: Dict) -> List[Dict]:
        """Calculate gaps between current and benchmark performance"""
        
        gaps = []
        
        for metric, current_value in current.items():
            benchmark_value = benchmarks.get(metric)
            
            if benchmark_value:
                gap_percent = ((benchmark_value - current_value) / benchmark_value * 100)
                
                gaps.append({
                    "metric": metric,
                    "current": current_value,
                    "benchmark": benchmark_value,
                    "gap_percent": round(gap_percent, 2),
                    "status": "below" if gap_percent > 0 else "above"
                })
        
        return gaps
    
    async def _process_task(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Process intelligence task"""
        
        task_type = task.get("type")
        
        handlers = {
            "generate_report": self.generate_intelligence_report,
            "analyze_opportunities": self.analyze_opportunities,
            "vendor_intelligence": self.get_vendor_intelligence,
            "forecast_spend": self.forecast_spend,
            "identify_anomalies": self.identify_anomalies,
            "benchmark": self.benchmark_performance
        }
        
        handler = handlers.get(task_type)
        
        if handler:
            return await handler(**task.get("params", {}))
        else:
            raise AgentError(
                agent_name=self.name,
                operation="_process_task",
                details={"error": f"Unknown task type: {task_type}"}
            )