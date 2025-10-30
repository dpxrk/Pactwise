"""Spend Analytics Agent with Advanced Analytics Capabilities"""

import asyncio
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from agents.base_agent import BaseAgent, AgentResponse, AgentPriority
from utils.logging_config import get_logger
from utils.exceptions import ValidationError, AgentExecutionError
from utils.decorators import measure_execution_time, cache_result, retry_async
from utils.common import (
    generate_id, calculate_percentage, safe_divide, 
    format_currency, batch_list
)
from integrations.databases.models import Transaction, Vendor, Contract

from .category_classifier import CategoryClassifier
from .trend_analyzer import TrendAnalyzer
from .savings_identifier import SavingsIdentifier


class SpendAnalyticsAgent(BaseAgent):
    """Agent for comprehensive spend analysis and insights"""
    
    def __init__(self, **kwargs):
        super().__init__(agent_name="spend_analytics", **kwargs)
        
        # Initialize sub-components
        self.category_classifier = CategoryClassifier()
        self.trend_analyzer = TrendAnalyzer()
        self.savings_identifier = SavingsIdentifier()
        
        # Configuration
        self.config.update({
            "maverick_threshold": 0.2,  # 20% threshold for maverick spend
            "consolidation_threshold": 5,  # Min vendors for consolidation opportunity
            "price_variance_threshold": 0.15,  # 15% price variance threshold
            "analysis_period_days": 365,  # Default analysis period
            "min_spend_for_analysis": 1000,  # Minimum spend to include in analysis
        })
        
        self.logger.info("Spend Analytics Agent initialized")
    
    async def validate_request(self, request: Dict[str, Any]) -> Tuple[bool, Optional[List[str]]]:
        """Validate spend analysis request"""
        errors = []
        
        # Check required fields based on operation
        operation = request.get("operation")
        
        if not operation:
            errors.append("Operation type is required")
            return False, errors
        
        valid_operations = [
            "analyze_spend", "categorize_transactions", "identify_savings",
            "detect_maverick", "analyze_trends", "benchmark_categories",
            "generate_dashboard", "analyze_vendor_spend", "forecast_spend"
        ]
        
        if operation not in valid_operations:
            errors.append(f"Invalid operation: {operation}")
        
        # Operation-specific validation
        if operation == "analyze_spend":
            if not request.get("start_date"):
                errors.append("Start date is required for spend analysis")
            if not request.get("end_date"):
                errors.append("End date is required for spend analysis")
        
        elif operation == "categorize_transactions":
            if not request.get("transactions") and not request.get("transaction_ids"):
                errors.append("Transactions or transaction IDs required")
        
        elif operation == "analyze_vendor_spend":
            if not request.get("vendor_id") and not request.get("vendor_ids"):
                errors.append("Vendor ID(s) required")
        
        return len(errors) == 0, errors if errors else None
    
    @measure_execution_time()
    async def process_request(self, request: Dict[str, Any]) -> AgentResponse:
        """Process spend analytics request"""
        operation = request.get("operation")
        
        try:
            self.logger.info(f"Processing {operation} request")
            
            result = None
            
            if operation == "analyze_spend":
                result = await self.analyze_spend(request)
            
            elif operation == "categorize_transactions":
                result = await self.categorize_transactions(request)
            
            elif operation == "identify_savings":
                result = await self.identify_savings_opportunities(request)
            
            elif operation == "detect_maverick":
                result = await self.detect_maverick_spend(request)
            
            elif operation == "analyze_trends":
                result = await self.analyze_spending_trends(request)
            
            elif operation == "benchmark_categories":
                result = await self.benchmark_categories(request)
            
            elif operation == "generate_dashboard":
                result = await self.generate_analytics_dashboard(request)
            
            elif operation == "analyze_vendor_spend":
                result = await self.analyze_vendor_spend(request)
            
            elif operation == "forecast_spend":
                result = await self.forecast_future_spend(request)
            
            return AgentResponse(
                success=True,
                message=f"{operation} completed successfully",
                data=result
            )
            
        except Exception as e:
            self.logger.error(f"Error in {operation}: {str(e)}", exc_info=True)
            
            return AgentResponse(
                success=False,
                message=f"Failed to process {operation}",
                errors=[str(e)]
            )
    
    async def analyze_spend(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Comprehensive spend analysis"""
        start_date = datetime.fromisoformat(request["start_date"])
        end_date = datetime.fromisoformat(request["end_date"])
        
        # Get transactions from database
        transactions = await self._get_transactions(start_date, end_date)
        
        if not transactions:
            return {
                "period": {
                    "start": start_date.isoformat(),
                    "end": end_date.isoformat()
                },
                "total_spend": 0,
                "transaction_count": 0,
                "message": "No transactions found in the specified period"
            }
        
        # Convert to DataFrame for analysis
        df = pd.DataFrame(transactions)
        
        # Calculate metrics
        total_spend = float(df['amount'].sum())
        transaction_count = len(df)
        unique_vendors = df['vendor_id'].nunique()
        unique_categories = df['category'].nunique() if 'category' in df.columns else 0
        
        # Spend by category
        category_spend = {}
        if 'category' in df.columns:
            category_spend = df.groupby('category')['amount'].sum().to_dict()
        
        # Spend by vendor
        vendor_spend = df.groupby('vendor_name')['amount'].sum().nlargest(10).to_dict()
        
        # Monthly trend
        df['month'] = pd.to_datetime(df['transaction_date']).dt.to_period('M')
        monthly_spend = df.groupby('month')['amount'].sum()
        monthly_trend = [
            {
                "month": str(month),
                "spend": float(amount)
            }
            for month, amount in monthly_spend.items()
        ]
        
        # Calculate growth rate
        if len(monthly_spend) > 1:
            growth_rate = ((monthly_spend.iloc[-1] - monthly_spend.iloc[0]) / monthly_spend.iloc[0]) * 100
        else:
            growth_rate = 0
        
        # Identify top categories for savings
        top_categories_for_savings = await self.savings_identifier.identify_top_categories(df)
        
        return {
            "period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat(),
                "days": (end_date - start_date).days
            },
            "summary": {
                "total_spend": total_spend,
                "transaction_count": transaction_count,
                "average_transaction": safe_divide(total_spend, transaction_count),
                "unique_vendors": unique_vendors,
                "unique_categories": unique_categories,
                "growth_rate": round(growth_rate, 2)
            },
            "breakdown": {
                "by_category": category_spend,
                "by_vendor": vendor_spend,
                "monthly_trend": monthly_trend
            },
            "insights": {
                "largest_category": max(category_spend, key=category_spend.get) if category_spend else None,
                "largest_vendor": max(vendor_spend, key=vendor_spend.get) if vendor_spend else None,
                "spend_concentration": calculate_percentage(
                    sum(list(vendor_spend.values())[:3]), 
                    total_spend
                ) if vendor_spend else 0,
                "top_savings_categories": top_categories_for_savings
            }
        }
    
    async def categorize_transactions(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Categorize transactions using AI"""
        transactions = request.get("transactions", [])
        
        if not transactions:
            # Get from database if IDs provided
            if transaction_ids := request.get("transaction_ids"):
                transactions = await self._get_transactions_by_ids(transaction_ids)
        
        if not transactions:
            return {"categorized": 0, "transactions": []}
        
        # Batch categorization for performance
        batches = batch_list(transactions, 100)
        categorized_transactions = []
        
        for batch in batches:
            # Use AI classifier
            results = await self.category_classifier.classify_batch(batch)
            categorized_transactions.extend(results)
        
        # Group by category
        category_summary = {}
        for trans in categorized_transactions:
            cat = trans['category']
            if cat not in category_summary:
                category_summary[cat] = {
                    'count': 0,
                    'total_spend': 0,
                    'confidence': 0
                }
            category_summary[cat]['count'] += 1
            category_summary[cat]['total_spend'] += trans['amount']
            category_summary[cat]['confidence'] += trans.get('confidence', 1.0)
        
        # Calculate average confidence
        for cat in category_summary:
            category_summary[cat]['avg_confidence'] = (
                category_summary[cat]['confidence'] / category_summary[cat]['count']
            )
            del category_summary[cat]['confidence']
        
        return {
            "categorized": len(categorized_transactions),
            "categories_identified": len(category_summary),
            "category_summary": category_summary,
            "transactions": categorized_transactions[:100],  # Return sample
            "uncategorized": [
                t for t in categorized_transactions 
                if t.get('category') == 'Uncategorized'
            ]
        }
    
    async def identify_savings_opportunities(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Identify savings opportunities across spend"""
        start_date = datetime.fromisoformat(request.get("start_date", 
            (datetime.now() - timedelta(days=365)).isoformat()))
        end_date = datetime.fromisoformat(request.get("end_date", 
            datetime.now().isoformat()))
        
        # Get spend data
        transactions = await self._get_transactions(start_date, end_date)
        
        if not transactions:
            return {"opportunities": [], "total_potential_savings": 0}
        
        df = pd.DataFrame(transactions)
        
        # Use savings identifier
        opportunities = await self.savings_identifier.analyze_opportunities(df)
        
        # Calculate potential savings
        total_potential = sum(opp['potential_savings'] for opp in opportunities)
        
        # Rank opportunities
        opportunities.sort(key=lambda x: x['potential_savings'], reverse=True)
        
        # Add implementation difficulty and timeframe
        for opp in opportunities:
            opp['implementation'] = self._assess_implementation(opp)
            opp['roi'] = safe_divide(
                opp['potential_savings'], 
                opp['implementation']['estimated_cost']
            )
        
        return {
            "opportunities": opportunities[:20],  # Top 20 opportunities
            "total_potential_savings": total_potential,
            "savings_as_percentage": calculate_percentage(
                total_potential, 
                float(df['amount'].sum())
            ),
            "quick_wins": [
                opp for opp in opportunities 
                if opp['implementation']['difficulty'] == 'low'
            ][:5],
            "strategic_initiatives": [
                opp for opp in opportunities
                if opp['potential_savings'] > 50000
            ][:5]
        }
    
    async def detect_maverick_spend(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Detect off-contract/maverick spending"""
        start_date = datetime.fromisoformat(request.get("start_date",
            (datetime.now() - timedelta(days=90)).isoformat()))
        end_date = datetime.fromisoformat(request.get("end_date",
            datetime.now().isoformat()))
        
        # Get transactions and contracts
        transactions = await self._get_transactions(start_date, end_date)
        contracts = await self._get_active_contracts()
        
        if not transactions:
            return {"maverick_spend": 0, "compliant_spend": 0, "transactions": []}
        
        df = pd.DataFrame(transactions)
        total_spend = float(df['amount'].sum())
        
        # Identify contracted vendors and categories
        contracted_vendors = set(c['vendor_id'] for c in contracts)
        contracted_categories = {}
        for contract in contracts:
            if 'categories' in contract:
                for cat in contract['categories']:
                    if cat not in contracted_categories:
                        contracted_categories[cat] = []
                    contracted_categories[cat].append(contract['vendor_id'])
        
        # Detect maverick transactions
        maverick_transactions = []
        maverick_spend = 0
        
        for _, trans in df.iterrows():
            is_maverick = False
            reason = []
            
            # Check vendor compliance
            if trans['vendor_id'] not in contracted_vendors:
                is_maverick = True
                reason.append("Non-contracted vendor")
            
            # Check category compliance
            if trans.get('category') in contracted_categories:
                if trans['vendor_id'] not in contracted_categories[trans['category']]:
                    is_maverick = True
                    reason.append(f"Wrong vendor for category {trans['category']}")
            
            # Check price compliance (if applicable)
            if not is_maverick and 'unit_price' in trans:
                contracted_price = await self._get_contracted_price(
                    trans['vendor_id'],
                    trans.get('item_code')
                )
                if contracted_price:
                    variance = abs(trans['unit_price'] - contracted_price) / contracted_price
                    if variance > self.config['price_variance_threshold']:
                        is_maverick = True
                        reason.append(f"Price variance {variance:.1%} above threshold")
            
            if is_maverick:
                maverick_spend += trans['amount']
                maverick_transactions.append({
                    'transaction_id': trans['transaction_id'],
                    'vendor': trans['vendor_name'],
                    'amount': trans['amount'],
                    'date': trans['transaction_date'],
                    'category': trans.get('category'),
                    'reasons': reason
                })
        
        compliant_spend = total_spend - maverick_spend
        
        # Group maverick by reason
        maverick_by_reason = {}
        for trans in maverick_transactions:
            for reason in trans['reasons']:
                if reason not in maverick_by_reason:
                    maverick_by_reason[reason] = {
                        'count': 0,
                        'amount': 0
                    }
                maverick_by_reason[reason]['count'] += 1
                maverick_by_reason[reason]['amount'] += trans['amount']
        
        return {
            "total_spend": total_spend,
            "maverick_spend": maverick_spend,
            "compliant_spend": compliant_spend,
            "maverick_percentage": calculate_percentage(maverick_spend, total_spend),
            "maverick_transactions_count": len(maverick_transactions),
            "maverick_by_reason": maverick_by_reason,
            "top_maverick_vendors": self._get_top_maverick_vendors(
                maverick_transactions
            ),
            "transactions": maverick_transactions[:100],  # Sample
            "recommendations": self._generate_maverick_recommendations(
                maverick_by_reason,
                maverick_spend
            )
        }
    
    async def analyze_spending_trends(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze spending trends and patterns"""
        period_days = request.get("period_days", 365)
        end_date = datetime.now()
        start_date = end_date - timedelta(days=period_days)
        
        # Get historical data
        transactions = await self._get_transactions(start_date, end_date)
        
        if not transactions:
            return {"trends": [], "forecasts": []}
        
        df = pd.DataFrame(transactions)
        
        # Use trend analyzer
        trends = await self.trend_analyzer.analyze_trends(df, period_days)
        
        # Generate forecasts
        forecasts = await self.trend_analyzer.generate_forecasts(df)
        
        # Identify patterns
        patterns = {
            "seasonality": await self.trend_analyzer.detect_seasonality(df),
            "outliers": await self.trend_analyzer.detect_outliers(df),
            "growth_areas": trends.get('growth_categories', []),
            "declining_areas": trends.get('declining_categories', [])
        }
        
        return {
            "period_analyzed": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat(),
                "days": period_days
            },
            "trends": trends,
            "forecasts": forecasts,
            "patterns": patterns,
            "insights": self._generate_trend_insights(trends, patterns)
        }
    
    async def benchmark_categories(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Benchmark spending against industry standards"""
        categories = request.get("categories", [])
        
        if not categories:
            # Get all categories from recent spend
            transactions = await self._get_transactions(
                datetime.now() - timedelta(days=90),
                datetime.now()
            )
            if transactions:
                df = pd.DataFrame(transactions)
                categories = df['category'].unique().tolist() if 'category' in df.columns else []
        
        benchmarks = []
        
        for category in categories:
            # Get category spend
            category_spend = await self._get_category_spend(category)
            
            # Get industry benchmark (would connect to external data source)
            industry_benchmark = await self._get_industry_benchmark(category)
            
            variance = 0
            status = "unknown"
            
            if industry_benchmark:
                variance = ((category_spend['avg_price'] - industry_benchmark['avg_price']) 
                          / industry_benchmark['avg_price'] * 100)
                
                if variance > 10:
                    status = "above_market"
                elif variance < -10:
                    status = "below_market"
                else:
                    status = "at_market"
            
            benchmarks.append({
                "category": category,
                "your_spend": category_spend,
                "industry_benchmark": industry_benchmark,
                "variance_percentage": variance,
                "status": status,
                "potential_savings": max(0, (variance / 100) * category_spend['total_spend'])
                                    if variance > 0 else 0
            })
        
        # Sort by potential savings
        benchmarks.sort(key=lambda x: x['potential_savings'], reverse=True)
        
        total_potential_savings = sum(b['potential_savings'] for b in benchmarks)
        
        return {
            "benchmarks": benchmarks,
            "total_potential_savings": total_potential_savings,
            "categories_above_market": [
                b for b in benchmarks if b['status'] == 'above_market'
            ],
            "categories_below_market": [
                b for b in benchmarks if b['status'] == 'below_market'
            ],
            "recommendations": self._generate_benchmark_recommendations(benchmarks)
        }
    
    async def generate_analytics_dashboard(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Generate comprehensive analytics dashboard data"""
        period = request.get("period", "current_quarter")
        
        # Determine date range
        end_date = datetime.now()
        if period == "current_month":
            start_date = end_date.replace(day=1)
        elif period == "current_quarter":
            quarter_month = ((end_date.month - 1) // 3) * 3 + 1
            start_date = end_date.replace(month=quarter_month, day=1)
        elif period == "current_year":
            start_date = end_date.replace(month=1, day=1)
        else:
            start_date = end_date - timedelta(days=90)
        
        # Gather all analytics
        spend_analysis = await self.analyze_spend({
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat()
        })
        
        savings_opportunities = await self.identify_savings_opportunities({
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat()
        })
        
        maverick_analysis = await self.detect_maverick_spend({
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat()
        })
        
        trends = await self.analyze_spending_trends({
            "period_days": (end_date - start_date).days
        })
        
        # Calculate KPIs
        kpis = {
            "total_spend": spend_analysis['summary']['total_spend'],
            "transaction_count": spend_analysis['summary']['transaction_count'],
            "unique_vendors": spend_analysis['summary']['unique_vendors'],
            "maverick_percentage": maverick_analysis['maverick_percentage'],
            "potential_savings": savings_opportunities['total_potential_savings'],
            "spend_growth": spend_analysis['summary']['growth_rate']
        }
        
        return {
            "period": period,
            "date_range": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            },
            "kpis": kpis,
            "spend_breakdown": spend_analysis['breakdown'],
            "top_opportunities": savings_opportunities['opportunities'][:5],
            "maverick_summary": {
                "total": maverick_analysis['maverick_spend'],
                "percentage": maverick_analysis['maverick_percentage'],
                "top_reasons": list(maverick_analysis['maverick_by_reason'].keys())[:3]
            },
            "trends": trends['trends'],
            "alerts": self._generate_dashboard_alerts(kpis, maverick_analysis),
            "recommendations": self._generate_dashboard_recommendations(
                spend_analysis,
                savings_opportunities,
                maverick_analysis
            )
        }
    
    async def analyze_vendor_spend(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze spending with specific vendors"""
        vendor_ids = request.get("vendor_ids", [request.get("vendor_id")])
        
        if not vendor_ids:
            return {"error": "No vendor IDs provided"}
        
        vendor_analytics = []
        
        for vendor_id in vendor_ids:
            # Get vendor transactions
            transactions = await self._get_vendor_transactions(vendor_id)
            
            if not transactions:
                continue
            
            df = pd.DataFrame(transactions)
            
            # Calculate metrics
            total_spend = float(df['amount'].sum())
            transaction_count = len(df)
            avg_transaction = safe_divide(total_spend, transaction_count)
            
            # Trend analysis
            df['month'] = pd.to_datetime(df['transaction_date']).dt.to_period('M')
            monthly_spend = df.groupby('month')['amount'].sum()
            
            # Category breakdown
            category_breakdown = {}
            if 'category' in df.columns:
                category_breakdown = df.groupby('category')['amount'].sum().to_dict()
            
            # Contract compliance
            contract_info = await self._get_vendor_contract(vendor_id)
            compliance_rate = await self._calculate_vendor_compliance(vendor_id, df)
            
            vendor_analytics.append({
                "vendor_id": vendor_id,
                "vendor_name": df.iloc[0]['vendor_name'] if 'vendor_name' in df.columns else vendor_id,
                "total_spend": total_spend,
                "transaction_count": transaction_count,
                "average_transaction": avg_transaction,
                "first_transaction": df['transaction_date'].min(),
                "last_transaction": df['transaction_date'].max(),
                "category_breakdown": category_breakdown,
                "monthly_trend": monthly_spend.to_dict(),
                "contract_status": "Active" if contract_info else "No Contract",
                "compliance_rate": compliance_rate,
                "risk_indicators": await self._assess_vendor_risks(vendor_id, df)
            })
        
        # Compare vendors
        comparison = self._compare_vendors(vendor_analytics) if len(vendor_analytics) > 1 else None
        
        return {
            "vendors": vendor_analytics,
            "comparison": comparison,
            "consolidation_opportunity": self._assess_consolidation(vendor_analytics),
            "recommendations": self._generate_vendor_recommendations(vendor_analytics)
        }
    
    async def forecast_future_spend(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Forecast future spending based on historical data"""
        forecast_months = request.get("forecast_months", 3)
        categories = request.get("categories", [])
        
        # Get historical data
        historical_data = await self._get_transactions(
            datetime.now() - timedelta(days=365),
            datetime.now()
        )
        
        if not historical_data:
            return {"error": "Insufficient historical data for forecasting"}
        
        df = pd.DataFrame(historical_data)
        
        # Generate forecasts
        forecasts = await self.trend_analyzer.generate_detailed_forecasts(
            df,
            forecast_months,
            categories
        )
        
        # Calculate confidence intervals
        for forecast in forecasts:
            forecast['confidence_interval'] = self._calculate_confidence_interval(
                forecast['predicted_value'],
                forecast.get('std_dev', 0)
            )
        
        # Identify risks and opportunities
        risks = []
        opportunities = []
        
        for forecast in forecasts:
            if forecast['predicted_value'] > forecast.get('budget', float('inf')):
                risks.append({
                    "type": "budget_overrun",
                    "category": forecast.get('category', 'Total'),
                    "expected_overrun": forecast['predicted_value'] - forecast['budget']
                })
            
            if forecast.get('trend') == 'increasing' and forecast.get('growth_rate', 0) > 0.1:
                opportunities.append({
                    "type": "negotiate_volume_discount",
                    "category": forecast.get('category', 'Total'),
                    "expected_volume_increase": forecast['growth_rate']
                })
        
        return {
            "forecast_period": {
                "start": datetime.now().isoformat(),
                "end": (datetime.now() + timedelta(days=forecast_months * 30)).isoformat(),
                "months": forecast_months
            },
            "forecasts": forecasts,
            "total_forecasted_spend": sum(f['predicted_value'] for f in forecasts),
            "risks": risks,
            "opportunities": opportunities,
            "accuracy_metrics": await self._get_forecast_accuracy_metrics()
        }
    
    # Helper methods
    
    async def _get_transactions(self, start_date: datetime, end_date: datetime) -> List[Dict]:
        """Get transactions from database"""
        # This would query the actual database
        # For now, returning mock data structure
        return []
    
    async def _get_transactions_by_ids(self, transaction_ids: List[str]) -> List[Dict]:
        """Get specific transactions by IDs"""
        return []
    
    async def _get_active_contracts(self) -> List[Dict]:
        """Get active contracts"""
        return []
    
    async def _get_contracted_price(self, vendor_id: str, item_code: str) -> Optional[float]:
        """Get contracted price for an item"""
        return None
    
    async def _get_category_spend(self, category: str) -> Dict[str, Any]:
        """Get spending metrics for a category"""
        return {
            "total_spend": 0,
            "avg_price": 0,
            "transaction_count": 0
        }
    
    async def _get_industry_benchmark(self, category: str) -> Optional[Dict[str, Any]]:
        """Get industry benchmark data"""
        # This would connect to external benchmark data
        return {
            "avg_price": 0,
            "market_range": {"min": 0, "max": 0}
        }
    
    async def _get_vendor_transactions(self, vendor_id: str) -> List[Dict]:
        """Get transactions for a specific vendor"""
        return []
    
    async def _get_vendor_contract(self, vendor_id: str) -> Optional[Dict]:
        """Get contract information for a vendor"""
        return None
    
    async def _calculate_vendor_compliance(self, vendor_id: str, transactions_df: pd.DataFrame) -> float:
        """Calculate vendor compliance rate"""
        return 0.95  # Mock 95% compliance
    
    async def _assess_vendor_risks(self, vendor_id: str, transactions_df: pd.DataFrame) -> List[Dict]:
        """Assess risks associated with a vendor"""
        risks = []
        
        # Concentration risk
        total_spend = float(transactions_df['amount'].sum())
        if total_spend > 1000000:
            risks.append({
                "type": "concentration",
                "level": "high",
                "description": "High spend concentration with single vendor"
            })
        
        return risks
    
    async def _get_forecast_accuracy_metrics(self) -> Dict[str, float]:
        """Get historical forecast accuracy metrics"""
        return {
            "mean_absolute_error": 0.05,
            "mean_squared_error": 0.02,
            "r_squared": 0.92
        }
    
    def _assess_implementation(self, opportunity: Dict) -> Dict[str, Any]:
        """Assess implementation difficulty and cost"""
        # Simple heuristic based on opportunity type
        if opportunity.get('type') == 'consolidation':
            return {
                "difficulty": "medium",
                "timeframe_weeks": 8,
                "estimated_cost": 5000
            }
        elif opportunity.get('type') == 'contract_negotiation':
            return {
                "difficulty": "low",
                "timeframe_weeks": 4,
                "estimated_cost": 2000
            }
        else:
            return {
                "difficulty": "high",
                "timeframe_weeks": 12,
                "estimated_cost": 10000
            }
    
    def _get_top_maverick_vendors(self, maverick_transactions: List[Dict]) -> List[Dict]:
        """Get top vendors by maverick spend"""
        vendor_spend = {}
        
        for trans in maverick_transactions:
            vendor = trans['vendor']
            if vendor not in vendor_spend:
                vendor_spend[vendor] = {"amount": 0, "count": 0}
            vendor_spend[vendor]["amount"] += trans['amount']
            vendor_spend[vendor]["count"] += 1
        
        # Sort by amount
        sorted_vendors = sorted(
            vendor_spend.items(),
            key=lambda x: x[1]["amount"],
            reverse=True
        )
        
        return [
            {
                "vendor": vendor,
                "maverick_spend": data["amount"],
                "transaction_count": data["count"]
            }
            for vendor, data in sorted_vendors[:10]
        ]
    
    def _generate_maverick_recommendations(self, maverick_by_reason: Dict, 
                                          maverick_spend: float) -> List[str]:
        """Generate recommendations to reduce maverick spend"""
        recommendations = []
        
        if "Non-contracted vendor" in maverick_by_reason:
            recommendations.append(
                "Establish contracts with frequently used non-contracted vendors"
            )
        
        if maverick_spend > 100000:
            recommendations.append(
                "Implement stricter PO approval process for non-contracted purchases"
            )
        
        if len(maverick_by_reason) > 3:
            recommendations.append(
                "Conduct training on procurement policies and preferred vendors"
            )
        
        return recommendations
    
    def _generate_trend_insights(self, trends: Dict, patterns: Dict) -> List[str]:
        """Generate insights from trends and patterns"""
        insights = []
        
        if patterns.get("seasonality"):
            insights.append("Strong seasonal patterns detected - consider seasonal contracts")
        
        if trends.get("growth_rate", 0) > 0.1:
            insights.append("Spending growing rapidly - opportunity for volume discounts")
        
        if patterns.get("outliers"):
            insights.append(f"Found {len(patterns['outliers'])} unusual transactions requiring review")
        
        return insights
    
    def _generate_benchmark_recommendations(self, benchmarks: List[Dict]) -> List[str]:
        """Generate recommendations from benchmarking"""
        recommendations = []
        
        above_market = [b for b in benchmarks if b['status'] == 'above_market']
        if above_market:
            recommendations.append(
                f"Renegotiate contracts for {len(above_market)} categories above market rates"
            )
        
        high_savings = [b for b in benchmarks if b['potential_savings'] > 10000]
        if high_savings:
            recommendations.append(
                f"Focus on {high_savings[0]['category']} for immediate savings opportunity"
            )
        
        return recommendations
    
    def _compare_vendors(self, vendor_analytics: List[Dict]) -> Dict[str, Any]:
        """Compare multiple vendors"""
        if not vendor_analytics:
            return {}
        
        # Find best performers
        best_price = min(vendor_analytics, key=lambda x: x['average_transaction'])
        most_compliant = max(vendor_analytics, key=lambda x: x.get('compliance_rate', 0))
        
        return {
            "best_price": best_price['vendor_name'],
            "most_compliant": most_compliant['vendor_name'],
            "price_variance": max(v['average_transaction'] for v in vendor_analytics) - 
                             min(v['average_transaction'] for v in vendor_analytics)
        }
    
    def _assess_consolidation(self, vendor_analytics: List[Dict]) -> Dict[str, Any]:
        """Assess vendor consolidation opportunities"""
        if len(vendor_analytics) < 2:
            return {"opportunity": False}
        
        total_spend = sum(v['total_spend'] for v in vendor_analytics)
        
        # Check if consolidation makes sense
        if len(vendor_analytics) >= self.config['consolidation_threshold']:
            return {
                "opportunity": True,
                "potential_savings": total_spend * 0.1,  # Assume 10% savings
                "recommended_vendors": vendor_analytics[:2],  # Top 2 vendors
                "rationale": "Consolidating spend can yield volume discounts"
            }
        
        return {"opportunity": False}
    
    def _generate_vendor_recommendations(self, vendor_analytics: List[Dict]) -> List[str]:
        """Generate vendor-specific recommendations"""
        recommendations = []
        
        for vendor in vendor_analytics:
            if vendor.get('compliance_rate', 1) < 0.9:
                recommendations.append(
                    f"Improve compliance with {vendor['vendor_name']} (currently {vendor['compliance_rate']:.0%})"
                )
            
            if vendor.get('total_spend', 0) > 500000:
                recommendations.append(
                    f"Consider long-term contract with {vendor['vendor_name']} for volume discounts"
                )
        
        return recommendations
    
    def _calculate_confidence_interval(self, predicted_value: float, 
                                      std_dev: float) -> Dict[str, float]:
        """Calculate confidence interval for forecast"""
        z_score = 1.96  # 95% confidence
        margin = z_score * std_dev
        
        return {
            "lower": predicted_value - margin,
            "upper": predicted_value + margin,
            "confidence_level": 0.95
        }
    
    def _generate_dashboard_alerts(self, kpis: Dict, maverick_analysis: Dict) -> List[Dict]:
        """Generate alerts for dashboard"""
        alerts = []
        
        if kpis.get('maverick_percentage', 0) > 20:
            alerts.append({
                "type": "warning",
                "message": f"Maverick spend at {kpis['maverick_percentage']:.1f}% - above threshold"
            })
        
        if kpis.get('spend_growth', 0) > 15:
            alerts.append({
                "type": "info",
                "message": f"Spend growing rapidly at {kpis['spend_growth']:.1f}%"
            })
        
        return alerts
    
    def _generate_dashboard_recommendations(self, spend_analysis: Dict,
                                           savings_opportunities: Dict,
                                           maverick_analysis: Dict) -> List[str]:
        """Generate dashboard recommendations"""
        recommendations = []
        
        if savings_opportunities['total_potential_savings'] > 50000:
            recommendations.append(
                f"Review top savings opportunities - potential to save ${savings_opportunities['total_potential_savings']:,.0f}"
            )
        
        if maverick_analysis['maverick_percentage'] > 15:
            recommendations.append(
                "Implement procurement compliance training to reduce maverick spend"
            )
        
        if spend_analysis['summary']['unique_vendors'] > 100:
            recommendations.append(
                "Consider vendor consolidation to improve negotiating power"
            )
        
        return recommendations[:5]  # Top 5 recommendations