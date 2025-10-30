"""AI-Powered Vendor Risk Assessment Module"""

import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from enum import Enum

from sqlalchemy.ext.asyncio import AsyncSession
from integrations.databases.models import Vendor


class RiskCategory(str, Enum):
    """Risk categories"""
    FINANCIAL = "financial"
    OPERATIONAL = "operational"
    COMPLIANCE = "compliance"
    REPUTATIONAL = "reputational"
    STRATEGIC = "strategic"
    CYBER = "cyber"
    GEOGRAPHICAL = "geographical"


class VendorRiskAssessor:
    """
    Advanced risk assessment system with:
    - Multi-dimensional risk scoring
    - Predictive risk modeling
    - Real-time risk monitoring
    - Automated mitigation strategies
    """
    
    def __init__(self):
        # Risk scoring weights
        self.risk_weights = {
            RiskCategory.FINANCIAL: 0.25,
            RiskCategory.OPERATIONAL: 0.20,
            RiskCategory.COMPLIANCE: 0.20,
            RiskCategory.REPUTATIONAL: 0.15,
            RiskCategory.STRATEGIC: 0.10,
            RiskCategory.CYBER: 0.05,
            RiskCategory.GEOGRAPHICAL: 0.05
        }
        
        # Risk factors and their impact
        self.risk_factors = {
            "financial_stability": {"weight": 0.3, "category": RiskCategory.FINANCIAL},
            "payment_history": {"weight": 0.2, "category": RiskCategory.FINANCIAL},
            "delivery_performance": {"weight": 0.3, "category": RiskCategory.OPERATIONAL},
            "quality_issues": {"weight": 0.2, "category": RiskCategory.OPERATIONAL},
            "certification_status": {"weight": 0.3, "category": RiskCategory.COMPLIANCE},
            "audit_findings": {"weight": 0.2, "category": RiskCategory.COMPLIANCE},
            "market_reputation": {"weight": 0.4, "category": RiskCategory.REPUTATIONAL},
            "dependency_level": {"weight": 0.5, "category": RiskCategory.STRATEGIC},
            "data_security": {"weight": 0.5, "category": RiskCategory.CYBER},
            "country_risk": {"weight": 0.5, "category": RiskCategory.GEOGRAPHICAL}
        }
        
        # Country risk scores (simplified)
        self.country_risk_scores = {
            "US": 0.1, "UK": 0.1, "DE": 0.1, "JP": 0.1,
            "CN": 0.4, "IN": 0.3, "BR": 0.4, "RU": 0.6,
            "NG": 0.7, "VE": 0.8, "DEFAULT": 0.5
        }
    
    async def assess_new_vendor(self, vendor_data: Dict[str, Any]) -> Dict[str, Any]:
        """Assess risk for new vendor"""
        
        # Calculate individual risk scores
        financial_risk = self._assess_financial_risk_new(vendor_data)
        operational_risk = self._assess_operational_risk_new(vendor_data)
        compliance_risk = self._assess_compliance_risk_new(vendor_data)
        reputational_risk = self._assess_reputational_risk_new(vendor_data)
        strategic_risk = self._assess_strategic_risk_new(vendor_data)
        cyber_risk = self._assess_cyber_risk_new(vendor_data)
        geographical_risk = self._assess_geographical_risk_new(vendor_data)
        
        # Combine risk scores
        risk_scores = {
            RiskCategory.FINANCIAL: financial_risk,
            RiskCategory.OPERATIONAL: operational_risk,
            RiskCategory.COMPLIANCE: compliance_risk,
            RiskCategory.REPUTATIONAL: reputational_risk,
            RiskCategory.STRATEGIC: strategic_risk,
            RiskCategory.CYBER: cyber_risk,
            RiskCategory.GEOGRAPHICAL: geographical_risk
        }
        
        # Calculate weighted overall risk
        overall_risk = sum(
            score * self.risk_weights[category]
            for category, score in risk_scores.items()
        )
        
        # Determine risk category
        risk_category = self._categorize_risk(overall_risk)
        
        # Generate risk mitigation plan
        mitigation_plan = self._generate_mitigation_plan(risk_scores, risk_category)
        
        return {
            "risk_score": round(overall_risk, 3),
            "risk_category": risk_category,
            "risk_scores": {k.value: round(v, 3) for k, v in risk_scores.items()},
            "high_risk_areas": [k.value for k, v in risk_scores.items() if v > 0.7],
            "mitigation_plan": mitigation_plan,
            "monitoring_frequency": self._determine_monitoring_frequency(risk_category),
            "approval_required": risk_category in ["high", "critical"]
        }
    
    async def assess_vendor(
        self,
        db: AsyncSession,
        vendor: Vendor
    ) -> Dict[str, Any]:
        """Assess risk for existing vendor"""
        
        # Get vendor performance data
        performance_data = await self._get_vendor_performance_data(db, vendor)
        
        # Calculate risk scores based on actual data
        risk_scores = {
            RiskCategory.FINANCIAL: await self._calculate_financial_risk(vendor, performance_data),
            RiskCategory.OPERATIONAL: await self._calculate_operational_risk(vendor, performance_data),
            RiskCategory.COMPLIANCE: await self._calculate_compliance_risk(vendor, performance_data),
            RiskCategory.REPUTATIONAL: await self._calculate_reputational_risk(vendor, performance_data),
            RiskCategory.STRATEGIC: await self._calculate_strategic_risk(vendor, performance_data),
            RiskCategory.CYBER: await self._calculate_cyber_risk(vendor),
            RiskCategory.GEOGRAPHICAL: self._calculate_geographical_risk(vendor)
        }
        
        # Calculate weighted overall risk
        overall_risk = sum(
            score * self.risk_weights[category]
            for category, score in risk_scores.items()
        )
        
        # Compare with previous assessment
        risk_trend = self._analyze_risk_trend(vendor, overall_risk)
        
        # Predict future risk
        future_risk = self._predict_future_risk(risk_scores, risk_trend)
        
        # Generate insights and recommendations
        insights = self._generate_risk_insights(risk_scores, risk_trend, future_risk)
        
        return {
            "vendor_id": vendor.id,
            "risk_score": round(overall_risk, 3),
            "risk_category": self._categorize_risk(overall_risk),
            "risk_scores": {k.value: round(v, 3) for k, v in risk_scores.items()},
            "risk_trend": risk_trend,
            "future_risk_prediction": future_risk,
            "insights": insights,
            "recommended_actions": self._recommend_risk_actions(risk_scores, overall_risk),
            "next_assessment_date": self._calculate_next_assessment_date(overall_risk)
        }
    
    def _assess_financial_risk_new(self, vendor_data: Dict[str, Any]) -> float:
        """Assess financial risk for new vendor"""
        
        risk_score = 0.5  # Base risk
        
        # Credit score impact
        credit_score = vendor_data.get("credit_score", 650)
        if credit_score < 600:
            risk_score += 0.3
        elif credit_score < 700:
            risk_score += 0.1
        else:
            risk_score -= 0.1
        
        # Financial statements
        if not vendor_data.get("financial_statements"):
            risk_score += 0.2
        
        # Years in business
        years_in_business = vendor_data.get("years_in_business", 0)
        if years_in_business < 2:
            risk_score += 0.2
        elif years_in_business > 10:
            risk_score -= 0.1
        
        # Revenue size
        annual_revenue = vendor_data.get("annual_revenue", 0)
        if annual_revenue < 1000000:  # Less than $1M
            risk_score += 0.1
        elif annual_revenue > 10000000:  # More than $10M
            risk_score -= 0.1
        
        return min(1.0, max(0.0, risk_score))
    
    def _assess_operational_risk_new(self, vendor_data: Dict[str, Any]) -> float:
        """Assess operational risk for new vendor"""
        
        risk_score = 0.4  # Base risk
        
        # Production capacity
        if vendor_data.get("production_capacity", "low") == "low":
            risk_score += 0.2
        
        # Quality certifications
        if not vendor_data.get("iso_certified", False):
            risk_score += 0.15
        
        # Number of production facilities
        facilities = vendor_data.get("production_facilities", 1)
        if facilities == 1:
            risk_score += 0.15  # Single point of failure
        elif facilities > 3:
            risk_score -= 0.1
        
        # Technology capabilities
        if vendor_data.get("technology_level", "basic") == "advanced":
            risk_score -= 0.15
        
        return min(1.0, max(0.0, risk_score))
    
    def _assess_compliance_risk_new(self, vendor_data: Dict[str, Any]) -> float:
        """Assess compliance risk for new vendor"""
        
        risk_score = 0.3  # Base risk
        
        # Certification status
        certifications = vendor_data.get("certifications", [])
        if len(certifications) == 0:
            risk_score += 0.3
        elif len(certifications) < 3:
            risk_score += 0.1
        else:
            risk_score -= 0.1
        
        # Regulatory compliance
        if not vendor_data.get("regulatory_compliant", True):
            risk_score += 0.4
        
        # Audit history
        if vendor_data.get("failed_audits", 0) > 0:
            risk_score += 0.2
        
        # Legal issues
        if vendor_data.get("legal_issues", False):
            risk_score += 0.3
        
        return min(1.0, max(0.0, risk_score))
    
    def _assess_reputational_risk_new(self, vendor_data: Dict[str, Any]) -> float:
        """Assess reputational risk for new vendor"""
        
        risk_score = 0.5  # Base risk (unknown reputation)
        
        # Customer references
        references = vendor_data.get("customer_references", 0)
        if references == 0:
            risk_score += 0.2
        elif references > 5:
            risk_score -= 0.2
        
        # Industry reputation
        reputation = vendor_data.get("industry_reputation", "unknown")
        if reputation == "excellent":
            risk_score -= 0.3
        elif reputation == "good":
            risk_score -= 0.1
        elif reputation == "poor":
            risk_score += 0.3
        
        # Media coverage
        if vendor_data.get("negative_media", False):
            risk_score += 0.25
        
        # Awards and recognition
        if vendor_data.get("industry_awards", 0) > 0:
            risk_score -= 0.1
        
        return min(1.0, max(0.0, risk_score))
    
    def _assess_strategic_risk_new(self, vendor_data: Dict[str, Any]) -> float:
        """Assess strategic risk for new vendor"""
        
        risk_score = 0.4  # Base risk
        
        # Market position
        market_share = vendor_data.get("market_share", 0)
        if market_share < 0.05:  # Less than 5%
            risk_score += 0.2
        elif market_share > 0.20:  # More than 20%
            risk_score -= 0.1
        
        # Innovation capability
        if vendor_data.get("rd_investment", 0) < 0.03:  # Less than 3% of revenue
            risk_score += 0.15
        
        # Strategic alignment
        if not vendor_data.get("strategic_fit", True):
            risk_score += 0.25
        
        # Alternative suppliers
        if vendor_data.get("unique_supplier", False):
            risk_score += 0.3  # High dependency risk
        
        return min(1.0, max(0.0, risk_score))
    
    def _assess_cyber_risk_new(self, vendor_data: Dict[str, Any]) -> float:
        """Assess cyber security risk for new vendor"""
        
        risk_score = 0.5  # Base risk
        
        # Security certifications
        if not vendor_data.get("iso_27001", False):
            risk_score += 0.2
        
        # Data handling
        if vendor_data.get("handles_sensitive_data", False):
            risk_score += 0.2
        
        # Security incidents
        incidents = vendor_data.get("security_incidents_past_year", 0)
        risk_score += min(0.3, incidents * 0.1)
        
        # Security measures
        if vendor_data.get("security_audit_passed", False):
            risk_score -= 0.2
        
        return min(1.0, max(0.0, risk_score))
    
    def _assess_geographical_risk_new(self, vendor_data: Dict[str, Any]) -> float:
        """Assess geographical risk for new vendor"""
        
        country = vendor_data.get("country", "DEFAULT")
        base_risk = self.country_risk_scores.get(country, self.country_risk_scores["DEFAULT"])
        
        # Adjust for specific factors
        risk_score = base_risk
        
        # Political stability
        if vendor_data.get("political_instability", False):
            risk_score += 0.2
        
        # Natural disaster risk
        if vendor_data.get("natural_disaster_prone", False):
            risk_score += 0.1
        
        # Trade restrictions
        if vendor_data.get("trade_restrictions", False):
            risk_score += 0.2
        
        return min(1.0, max(0.0, risk_score))
    
    async def _calculate_financial_risk(
        self,
        vendor: Vendor,
        performance_data: Dict
    ) -> float:
        """Calculate financial risk based on actual data"""
        
        risk_score = 0.3
        
        # Payment history
        late_payments = performance_data.get("late_payments", 0)
        risk_score += min(0.3, late_payments * 0.05)
        
        # Credit utilization
        credit_utilization = performance_data.get("credit_utilization", 0.5)
        if credit_utilization > 0.8:
            risk_score += 0.2
        
        # Financial health indicators
        if vendor.metadata.get("financial_health") == "poor":
            risk_score += 0.3
        
        return min(1.0, max(0.0, risk_score))
    
    async def _calculate_operational_risk(
        self,
        vendor: Vendor,
        performance_data: Dict
    ) -> float:
        """Calculate operational risk based on performance"""
        
        risk_score = 0.2
        
        # Delivery performance
        otd_rate = performance_data.get("on_time_delivery_rate", 0.9)
        risk_score += max(0, (0.9 - otd_rate) * 2)  # Penalty for < 90% OTD
        
        # Quality issues
        defect_rate = performance_data.get("defect_rate", 0.02)
        risk_score += min(0.3, defect_rate * 10)
        
        # Capacity utilization
        if performance_data.get("capacity_constrained", False):
            risk_score += 0.2
        
        return min(1.0, max(0.0, risk_score))
    
    async def _calculate_compliance_risk(
        self,
        vendor: Vendor,
        performance_data: Dict
    ) -> float:
        """Calculate compliance risk"""
        
        risk_score = 0.2
        
        # Certification expiry
        expired_certs = performance_data.get("expired_certifications", 0)
        risk_score += min(0.3, expired_certs * 0.1)
        
        # Audit findings
        audit_issues = performance_data.get("audit_findings", 0)
        risk_score += min(0.3, audit_issues * 0.05)
        
        # Compliance violations
        violations = performance_data.get("compliance_violations", 0)
        risk_score += min(0.4, violations * 0.2)
        
        return min(1.0, max(0.0, risk_score))
    
    async def _calculate_reputational_risk(
        self,
        vendor: Vendor,
        performance_data: Dict
    ) -> float:
        """Calculate reputational risk"""
        
        risk_score = 0.2
        
        # Customer complaints
        complaints = performance_data.get("customer_complaints", 0)
        risk_score += min(0.3, complaints * 0.05)
        
        # Public incidents
        if performance_data.get("public_incidents", False):
            risk_score += 0.3
        
        # Rating decline
        if performance_data.get("rating_trend") == "declining":
            risk_score += 0.2
        
        return min(1.0, max(0.0, risk_score))
    
    async def _calculate_strategic_risk(
        self,
        vendor: Vendor,
        performance_data: Dict
    ) -> float:
        """Calculate strategic risk"""
        
        risk_score = 0.3
        
        # Dependency level
        spend_concentration = performance_data.get("spend_concentration", 0.1)
        if spend_concentration > 0.3:  # More than 30% of category spend
            risk_score += 0.3
        
        # Alternative suppliers
        if performance_data.get("sole_source", False):
            risk_score += 0.4
        
        # Innovation contribution
        if performance_data.get("innovation_score", 0.5) < 0.3:
            risk_score += 0.1
        
        return min(1.0, max(0.0, risk_score))
    
    async def _calculate_cyber_risk(self, vendor: Vendor) -> float:
        """Calculate cyber security risk"""
        
        risk_score = 0.4
        
        # Check for security certifications
        certs = vendor.certifications or []
        has_security_cert = any(c.get("type") == "iso_27001" for c in certs)
        
        if not has_security_cert:
            risk_score += 0.2
        
        # Data sensitivity
        if vendor.metadata.get("handles_pii", False):
            risk_score += 0.2
        
        # Recent incidents
        if vendor.metadata.get("security_incidents", 0) > 0:
            risk_score += 0.2
        
        return min(1.0, max(0.0, risk_score))
    
    def _calculate_geographical_risk(self, vendor: Vendor) -> float:
        """Calculate geographical risk"""
        
        country = vendor.address.get("country", "DEFAULT") if vendor.address else "DEFAULT"
        return self.country_risk_scores.get(country, self.country_risk_scores["DEFAULT"])
    
    def _categorize_risk(self, risk_score: float) -> str:
        """Categorize risk level"""
        
        if risk_score < 0.3:
            return "low"
        elif risk_score < 0.5:
            return "medium"
        elif risk_score < 0.7:
            return "high"
        else:
            return "critical"
    
    def _generate_mitigation_plan(
        self,
        risk_scores: Dict[RiskCategory, float],
        risk_category: str
    ) -> List[Dict[str, Any]]:
        """Generate risk mitigation plan"""
        
        mitigation_actions = []
        
        for category, score in risk_scores.items():
            if score > 0.6:  # High risk threshold
                mitigation_actions.append({
                    "risk_area": category.value,
                    "risk_level": "high" if score > 0.7 else "medium",
                    "actions": self._get_mitigation_actions(category, score),
                    "priority": "high" if score > 0.7 else "medium",
                    "timeline": "immediate" if score > 0.8 else "30 days"
                })
        
        return mitigation_actions
    
    def _get_mitigation_actions(self, category: RiskCategory, score: float) -> List[str]:
        """Get specific mitigation actions for risk category"""
        
        actions_map = {
            RiskCategory.FINANCIAL: [
                "Request financial guarantees",
                "Implement payment terms protection",
                "Monitor credit ratings monthly",
                "Require parent company guarantee"
            ],
            RiskCategory.OPERATIONAL: [
                "Implement quality audits",
                "Establish backup suppliers",
                "Create buffer inventory",
                "Define strict SLAs"
            ],
            RiskCategory.COMPLIANCE: [
                "Conduct compliance audit",
                "Review all certifications",
                "Implement monitoring system",
                "Require compliance attestation"
            ],
            RiskCategory.REPUTATIONAL: [
                "Enhance due diligence",
                "Monitor media coverage",
                "Establish escalation process",
                "Review reference checks"
            ],
            RiskCategory.STRATEGIC: [
                "Develop alternative sources",
                "Negotiate long-term contracts",
                "Reduce dependency",
                "Create contingency plans"
            ],
            RiskCategory.CYBER: [
                "Conduct security assessment",
                "Require security certifications",
                "Implement data protection agreements",
                "Regular security audits"
            ],
            RiskCategory.GEOGRAPHICAL: [
                "Monitor political situation",
                "Establish regional alternatives",
                "Review force majeure clauses",
                "Consider inventory buffers"
            ]
        }
        
        base_actions = actions_map.get(category, ["Review and monitor"])
        
        # Select actions based on risk score
        if score > 0.8:
            return base_actions[:4]  # All actions
        elif score > 0.6:
            return base_actions[:2]  # Top 2 actions
        else:
            return [base_actions[0]]  # Top action
    
    def _determine_monitoring_frequency(self, risk_category: str) -> str:
        """Determine risk monitoring frequency"""
        
        frequencies = {
            "low": "quarterly",
            "medium": "monthly",
            "high": "weekly",
            "critical": "daily"
        }
        
        return frequencies.get(risk_category, "monthly")
    
    async def _get_vendor_performance_data(
        self,
        db: AsyncSession,
        vendor: Vendor
    ) -> Dict[str, Any]:
        """Get vendor performance data for risk assessment"""
        
        # This would query actual performance metrics
        # Mock implementation for now
        return {
            "on_time_delivery_rate": 0.92,
            "defect_rate": 0.02,
            "late_payments": 2,
            "credit_utilization": 0.65,
            "customer_complaints": 3,
            "audit_findings": 1,
            "compliance_violations": 0,
            "spend_concentration": 0.15,
            "innovation_score": 0.6,
            "capacity_constrained": False,
            "sole_source": False,
            "rating_trend": "stable"
        }
    
    def _analyze_risk_trend(self, vendor: Vendor, current_risk: float) -> Dict[str, Any]:
        """Analyze risk trend over time"""
        
        previous_risk = vendor.risk_score or 0.5
        change = current_risk - previous_risk
        
        if abs(change) < 0.05:
            trend = "stable"
        elif change > 0:
            trend = "increasing"
        else:
            trend = "decreasing"
        
        return {
            "trend": trend,
            "previous_score": previous_risk,
            "current_score": current_risk,
            "change": round(change, 3),
            "change_percentage": round(change / previous_risk * 100, 1) if previous_risk > 0 else 0
        }
    
    def _predict_future_risk(
        self,
        risk_scores: Dict[RiskCategory, float],
        risk_trend: Dict
    ) -> Dict[str, Any]:
        """Predict future risk based on current state and trends"""
        
        # Simple prediction model
        trend_factor = 0.1 if risk_trend["trend"] == "increasing" else -0.05 if risk_trend["trend"] == "decreasing" else 0
        
        predicted_30d = risk_trend["current_score"] + trend_factor
        predicted_90d = predicted_30d + (trend_factor * 0.5)
        
        return {
            "risk_30d": round(min(1.0, max(0.0, predicted_30d)), 3),
            "risk_90d": round(min(1.0, max(0.0, predicted_90d)), 3),
            "confidence": 0.75,
            "factors": ["historical_trend", "current_performance", "market_conditions"]
        }
    
    def _generate_risk_insights(
        self,
        risk_scores: Dict[RiskCategory, float],
        risk_trend: Dict,
        future_risk: Dict
    ) -> List[str]:
        """Generate risk insights and observations"""
        
        insights = []
        
        # High risk areas
        high_risk = [k.value for k, v in risk_scores.items() if v > 0.7]
        if high_risk:
            insights.append(f"High risk identified in: {', '.join(high_risk)}")
        
        # Trend insights
        if risk_trend["trend"] == "increasing":
            insights.append(f"Risk increasing by {risk_trend['change_percentage']}%")
        elif risk_trend["trend"] == "decreasing":
            insights.append(f"Risk improving by {abs(risk_trend['change_percentage'])}%")
        
        # Future risk
        if future_risk["risk_30d"] > 0.7:
            insights.append("Predicted high risk in next 30 days - immediate action required")
        
        # Positive insights
        low_risk = [k.value for k, v in risk_scores.items() if v < 0.3]
        if low_risk:
            insights.append(f"Strong performance in: {', '.join(low_risk)}")
        
        return insights
    
    def _recommend_risk_actions(
        self,
        risk_scores: Dict[RiskCategory, float],
        overall_risk: float
    ) -> List[Dict[str, Any]]:
        """Recommend risk management actions"""
        
        actions = []
        
        if overall_risk > 0.7:
            actions.append({
                "action": "Immediate risk review",
                "priority": "critical",
                "timeline": "within 24 hours"
            })
        
        # Category-specific actions
        for category, score in risk_scores.items():
            if score > 0.6:
                actions.append({
                    "action": f"Address {category.value} risk",
                    "priority": "high" if score > 0.7 else "medium",
                    "timeline": "within 1 week" if score > 0.7 else "within 1 month"
                })
        
        return actions[:5]  # Top 5 actions
    
    def _calculate_next_assessment_date(self, risk_score: float) -> str:
        """Calculate next risk assessment date"""
        
        if risk_score > 0.7:
            days = 7  # Weekly for high risk
        elif risk_score > 0.5:
            days = 30  # Monthly for medium risk
        else:
            days = 90  # Quarterly for low risk
        
        next_date = datetime.utcnow() + timedelta(days=days)
        return next_date.isoformat()