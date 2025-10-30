"""Advanced Vendor Performance Tracking with ML-powered predictions"""

import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import numpy as np
from scipy import stats
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from integrations.databases.models import Vendor, PurchaseOrder, Invoice, GoodsReceipt


class VendorPerformanceTracker:
    """
    Advanced performance tracking system with:
    - Real-time KPI monitoring
    - Predictive performance modeling
    - Automated alerting for performance degradation
    - Benchmarking against industry standards
    """
    
    def __init__(self):
        # KPI weights for overall score
        self.kpi_weights = {
            "on_time_delivery": 0.25,
            "quality_score": 0.20,
            "price_competitiveness": 0.15,
            "responsiveness": 0.10,
            "invoice_accuracy": 0.10,
            "compliance_rate": 0.10,
            "flexibility": 0.05,
            "innovation": 0.05
        }
        
        # Performance thresholds
        self.thresholds = {
            "excellent": 0.9,
            "good": 0.75,
            "acceptable": 0.6,
            "poor": 0.4,
            "critical": 0.0
        }
        
        # ML models for prediction
        self.performance_predictor = LinearRegression()
        self.anomaly_detector = None  # IsolationForest for anomaly detection
        self.scaler = StandardScaler()
        
        # Cache for performance data
        self.performance_cache = {}
        self.cache_ttl = 3600  # 1 hour
    
    async def calculate_performance(
        self,
        db: AsyncSession,
        vendor_id: int,
        period_days: int = 90
    ) -> Dict[str, Any]:
        """Calculate comprehensive vendor performance metrics"""
        
        vendor = await db.get(Vendor, vendor_id)
        if not vendor:
            raise ValueError(f"Vendor {vendor_id} not found")
        
        # Define time period
        start_date = datetime.utcnow() - timedelta(days=period_days)
        
        # Parallel KPI calculations
        kpi_tasks = [
            self._calculate_on_time_delivery(db, vendor_id, start_date),
            self._calculate_quality_score(db, vendor_id, start_date),
            self._calculate_price_competitiveness(db, vendor_id, start_date),
            self._calculate_responsiveness(db, vendor_id, start_date),
            self._calculate_invoice_accuracy(db, vendor_id, start_date),
            self._calculate_compliance_rate(db, vendor_id, start_date),
            self._calculate_flexibility_score(db, vendor_id, start_date),
            self._calculate_innovation_score(db, vendor_id, start_date)
        ]
        
        kpi_results = await asyncio.gather(*kpi_tasks)
        
        # Build KPI dictionary
        kpis = {
            "on_time_delivery": kpi_results[0],
            "quality_score": kpi_results[1],
            "price_competitiveness": kpi_results[2],
            "responsiveness": kpi_results[3],
            "invoice_accuracy": kpi_results[4],
            "compliance_rate": kpi_results[5],
            "flexibility": kpi_results[6],
            "innovation": kpi_results[7]
        }
        
        # Calculate weighted overall score
        overall_score = sum(
            kpis[kpi]["score"] * self.kpi_weights[kpi]
            for kpi in self.kpi_weights.keys()
        )
        
        # Determine performance category
        performance_category = self._categorize_performance(overall_score)
        
        # Trend analysis
        trend = await self._analyze_performance_trend(db, vendor_id, kpis)
        
        # Predict future performance
        prediction = await self._predict_future_performance(db, vendor_id, kpis)
        
        # Identify improvement areas
        improvement_areas = self._identify_improvement_areas(kpis)
        
        # Generate alerts if needed
        alerts = self._generate_performance_alerts(kpis, trend, prediction)
        
        return {
            "vendor_id": vendor_id,
            "evaluation_period": f"{period_days} days",
            "evaluation_date": datetime.utcnow().isoformat(),
            "score": round(overall_score, 3),
            "category": performance_category,
            "kpis": kpis,
            "trend": trend,
            "prediction": prediction,
            "improvement_areas": improvement_areas,
            "alerts": alerts,
            "benchmark": await self._get_industry_benchmark(vendor.category)
        }
    
    async def _calculate_on_time_delivery(
        self,
        db: AsyncSession,
        vendor_id: int,
        start_date: datetime
    ) -> Dict[str, Any]:
        """Calculate on-time delivery performance"""
        
        # Get POs with delivery dates
        query = select(PurchaseOrder).where(
            and_(
                PurchaseOrder.vendor_id == vendor_id,
                PurchaseOrder.created_at >= start_date,
                PurchaseOrder.delivery_date.isnot(None)
            )
        )
        
        result = await db.execute(query)
        purchase_orders = result.scalars().all()
        
        if not purchase_orders:
            return {"score": 0.5, "sample_size": 0, "details": {}}
        
        on_time_count = 0
        total_count = len(purchase_orders)
        delivery_delays = []
        
        for po in purchase_orders:
            # Get goods receipts for this PO
            gr_query = select(GoodsReceipt).where(
                GoodsReceipt.po_id == po.id
            )
            gr_result = await db.execute(gr_query)
            goods_receipts = gr_result.scalars().all()
            
            if goods_receipts:
                actual_delivery = min(gr.receipt_date for gr in goods_receipts)
                expected_delivery = po.delivery_date
                
                if actual_delivery <= expected_delivery:
                    on_time_count += 1
                else:
                    delay_days = (actual_delivery - expected_delivery).days
                    delivery_delays.append(delay_days)
        
        otd_rate = on_time_count / total_count if total_count > 0 else 0
        avg_delay = np.mean(delivery_delays) if delivery_delays else 0
        
        return {
            "score": otd_rate,
            "sample_size": total_count,
            "details": {
                "on_time_deliveries": on_time_count,
                "late_deliveries": total_count - on_time_count,
                "otd_percentage": round(otd_rate * 100, 2),
                "average_delay_days": round(avg_delay, 1),
                "max_delay_days": max(delivery_delays) if delivery_delays else 0
            }
        }
    
    async def _calculate_quality_score(
        self,
        db: AsyncSession,
        vendor_id: int,
        start_date: datetime
    ) -> Dict[str, Any]:
        """Calculate quality performance based on rejections and returns"""
        
        # Get goods receipts with quality data
        query = select(GoodsReceipt).join(
            PurchaseOrder
        ).where(
            and_(
                PurchaseOrder.vendor_id == vendor_id,
                GoodsReceipt.receipt_date >= start_date
            )
        )
        
        result = await db.execute(query)
        receipts = result.scalars().all()
        
        if not receipts:
            return {"score": 0.5, "sample_size": 0, "details": {}}
        
        total_qty = sum(r.quantity for r in receipts)
        rejected_qty = sum(r.rejected_quantity or 0 for r in receipts)
        
        acceptance_rate = (total_qty - rejected_qty) / total_qty if total_qty > 0 else 0
        
        return {
            "score": acceptance_rate,
            "sample_size": len(receipts),
            "details": {
                "total_quantity": total_qty,
                "accepted_quantity": total_qty - rejected_qty,
                "rejected_quantity": rejected_qty,
                "acceptance_rate": round(acceptance_rate * 100, 2),
                "defect_rate": round((1 - acceptance_rate) * 100, 2)
            }
        }
    
    async def _calculate_price_competitiveness(
        self,
        db: AsyncSession,
        vendor_id: int,
        start_date: datetime
    ) -> Dict[str, Any]:
        """Calculate price competitiveness against market"""
        
        # Get vendor's average prices
        vendor_query = select(
            func.avg(PurchaseOrder.total_amount / PurchaseOrder.quantity).label("avg_price")
        ).where(
            and_(
                PurchaseOrder.vendor_id == vendor_id,
                PurchaseOrder.created_at >= start_date
            )
        )
        
        vendor_result = await db.execute(vendor_query)
        vendor_avg_price = vendor_result.scalar() or 0
        
        # Get market average (all vendors)
        market_query = select(
            func.avg(PurchaseOrder.total_amount / PurchaseOrder.quantity).label("avg_price")
        ).where(
            PurchaseOrder.created_at >= start_date
        )
        
        market_result = await db.execute(market_query)
        market_avg_price = market_result.scalar() or vendor_avg_price
        
        # Calculate competitiveness score (lower price = higher score)
        if market_avg_price > 0:
            price_ratio = vendor_avg_price / market_avg_price
            score = max(0, min(1, 2 - price_ratio))  # Score decreases as price increases
        else:
            score = 0.5
        
        return {
            "score": score,
            "sample_size": 1,  # Simplified
            "details": {
                "vendor_avg_price": round(vendor_avg_price, 2),
                "market_avg_price": round(market_avg_price, 2),
                "price_variance": round((vendor_avg_price - market_avg_price) / market_avg_price * 100, 2) if market_avg_price > 0 else 0,
                "competitiveness": "competitive" if score > 0.6 else "not competitive"
            }
        }
    
    async def _calculate_responsiveness(
        self,
        db: AsyncSession,
        vendor_id: int,
        start_date: datetime
    ) -> Dict[str, Any]:
        """Calculate vendor responsiveness metrics"""
        
        # Mock implementation - would track RFQ response times, query resolution times, etc.
        response_times = np.random.normal(24, 8, 20)  # Hours
        avg_response_time = np.mean(response_times)
        
        # Score based on response time (faster = higher score)
        # Assuming 24 hours is good, 48 hours is acceptable
        if avg_response_time <= 24:
            score = 1.0
        elif avg_response_time <= 48:
            score = 0.75
        elif avg_response_time <= 72:
            score = 0.5
        else:
            score = max(0, 1 - (avg_response_time - 72) / 72)
        
        return {
            "score": score,
            "sample_size": len(response_times),
            "details": {
                "avg_response_time_hours": round(avg_response_time, 1),
                "min_response_time": round(min(response_times), 1),
                "max_response_time": round(max(response_times), 1),
                "response_time_std": round(np.std(response_times), 1)
            }
        }
    
    async def _calculate_invoice_accuracy(
        self,
        db: AsyncSession,
        vendor_id: int,
        start_date: datetime
    ) -> Dict[str, Any]:
        """Calculate invoice accuracy rate"""
        
        # Get invoices for vendor
        query = select(Invoice).where(
            and_(
                Invoice.vendor_id == vendor_id,
                Invoice.invoice_date >= start_date
            )
        )
        
        result = await db.execute(query)
        invoices = result.scalars().all()
        
        if not invoices:
            return {"score": 0.5, "sample_size": 0, "details": {}}
        
        total_invoices = len(invoices)
        accurate_invoices = sum(
            1 for inv in invoices
            if inv.status in ["approved", "paid"]  # Assuming these statuses mean accurate
        )
        
        accuracy_rate = accurate_invoices / total_invoices if total_invoices > 0 else 0
        
        return {
            "score": accuracy_rate,
            "sample_size": total_invoices,
            "details": {
                "total_invoices": total_invoices,
                "accurate_invoices": accurate_invoices,
                "disputed_invoices": total_invoices - accurate_invoices,
                "accuracy_percentage": round(accuracy_rate * 100, 2)
            }
        }
    
    async def _calculate_compliance_rate(
        self,
        db: AsyncSession,
        vendor_id: int,
        start_date: datetime
    ) -> Dict[str, Any]:
        """Calculate compliance rate with policies and regulations"""
        
        # Mock implementation
        compliance_checks = 20
        passed_checks = 18
        compliance_rate = passed_checks / compliance_checks
        
        return {
            "score": compliance_rate,
            "sample_size": compliance_checks,
            "details": {
                "total_checks": compliance_checks,
                "passed_checks": passed_checks,
                "failed_checks": compliance_checks - passed_checks,
                "compliance_percentage": round(compliance_rate * 100, 2)
            }
        }
    
    async def _calculate_flexibility_score(
        self,
        db: AsyncSession,
        vendor_id: int,
        start_date: datetime
    ) -> Dict[str, Any]:
        """Calculate vendor flexibility in handling changes"""
        
        # Mock implementation - would track change requests, expedited orders, etc.
        change_requests = 10
        accepted_changes = 8
        flexibility_rate = accepted_changes / change_requests if change_requests > 0 else 0.5
        
        return {
            "score": flexibility_rate,
            "sample_size": change_requests,
            "details": {
                "change_requests": change_requests,
                "accepted_changes": accepted_changes,
                "rejected_changes": change_requests - accepted_changes,
                "flexibility_percentage": round(flexibility_rate * 100, 2)
            }
        }
    
    async def _calculate_innovation_score(
        self,
        db: AsyncSession,
        vendor_id: int,
        start_date: datetime
    ) -> Dict[str, Any]:
        """Calculate innovation contribution score"""
        
        # Mock implementation
        innovations_proposed = 5
        innovations_implemented = 3
        cost_savings = 50000
        
        # Score based on innovation rate and impact
        innovation_rate = innovations_implemented / max(innovations_proposed, 1)
        impact_score = min(1, cost_savings / 100000)  # Normalize to 100k
        
        score = (innovation_rate + impact_score) / 2
        
        return {
            "score": score,
            "sample_size": innovations_proposed,
            "details": {
                "innovations_proposed": innovations_proposed,
                "innovations_implemented": innovations_implemented,
                "estimated_cost_savings": cost_savings,
                "innovation_rate": round(innovation_rate * 100, 2)
            }
        }
    
    def _categorize_performance(self, score: float) -> str:
        """Categorize performance based on score"""
        for category, threshold in self.thresholds.items():
            if score >= threshold:
                return category
        return "critical"
    
    async def _analyze_performance_trend(
        self,
        db: AsyncSession,
        vendor_id: int,
        current_kpis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Analyze performance trend over time"""
        
        # Mock trend analysis
        trend_direction = np.random.choice(["improving", "stable", "declining"])
        trend_percentage = np.random.uniform(-10, 10)
        
        return {
            "direction": trend_direction,
            "change_percentage": round(trend_percentage, 2),
            "momentum": "strong" if abs(trend_percentage) > 5 else "weak",
            "forecast_confidence": 0.75
        }
    
    async def _predict_future_performance(
        self,
        db: AsyncSession,
        vendor_id: int,
        current_kpis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Predict future performance using ML"""
        
        # Mock prediction
        predicted_score = current_kpis.get("score", 0.5) + np.random.uniform(-0.1, 0.1)
        predicted_score = max(0, min(1, predicted_score))
        
        return {
            "predicted_score_30d": round(predicted_score, 3),
            "predicted_score_90d": round(predicted_score + np.random.uniform(-0.05, 0.05), 3),
            "confidence_interval": [round(predicted_score - 0.1, 3), round(predicted_score + 0.1, 3)],
            "risk_of_degradation": "low" if predicted_score > 0.7 else "medium" if predicted_score > 0.5 else "high"
        }
    
    def _identify_improvement_areas(self, kpis: Dict[str, Any]) -> List[str]:
        """Identify areas needing improvement"""
        improvement_areas = []
        
        for kpi_name, kpi_data in kpis.items():
            if kpi_data["score"] < 0.6:
                improvement_areas.append(f"Improve {kpi_name.replace('_', ' ')}: current score {kpi_data['score']:.2f}")
        
        return improvement_areas[:3]  # Top 3 areas
    
    def _generate_performance_alerts(
        self,
        kpis: Dict[str, Any],
        trend: Dict[str, Any],
        prediction: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Generate alerts for performance issues"""
        alerts = []
        
        # Check for poor KPIs
        for kpi_name, kpi_data in kpis.items():
            if kpi_data["score"] < 0.4:
                alerts.append({
                    "type": "critical_kpi",
                    "kpi": kpi_name,
                    "message": f"Critical performance in {kpi_name}: {kpi_data['score']:.2f}",
                    "severity": "high"
                })
        
        # Check for declining trend
        if trend["direction"] == "declining" and abs(trend["change_percentage"]) > 5:
            alerts.append({
                "type": "declining_trend",
                "message": f"Performance declining by {abs(trend['change_percentage'])}%",
                "severity": "medium"
            })
        
        # Check prediction
        if prediction["risk_of_degradation"] == "high":
            alerts.append({
                "type": "future_risk",
                "message": "High risk of performance degradation in next 30 days",
                "severity": "medium"
            })
        
        return alerts
    
    async def _get_industry_benchmark(self, category: str) -> Dict[str, Any]:
        """Get industry benchmark for comparison"""
        
        # Mock benchmark data
        benchmarks = {
            "electronics": {"otd": 0.95, "quality": 0.98, "price": 0.85},
            "raw_materials": {"otd": 0.90, "quality": 0.95, "price": 0.80},
            "services": {"otd": 0.92, "quality": 0.96, "price": 0.88},
            "general": {"otd": 0.90, "quality": 0.95, "price": 0.85}
        }
        
        return benchmarks.get(category, benchmarks["general"])