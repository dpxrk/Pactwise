"""Advanced Compliance Monitoring System for Vendors"""

import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from enum import Enum

from sqlalchemy.ext.asyncio import AsyncSession
from integrations.databases.models import Vendor, AuditLog


class ComplianceStatus(str, Enum):
    """Compliance status levels"""
    COMPLIANT = "compliant"
    MINOR_ISSUES = "minor_issues"
    MAJOR_ISSUES = "major_issues"
    NON_COMPLIANT = "non_compliant"
    UNDER_REVIEW = "under_review"


class ComplianceMonitor:
    """
    Comprehensive compliance monitoring system with:
    - Automated compliance checks
    - Regulatory requirement tracking
    - Certificate management
    - Audit trail maintenance
    - Predictive compliance risk
    """
    
    def __init__(self):
        # Compliance requirements by region
        self.regional_requirements = {
            "US": ["tax_compliance", "labor_standards", "environmental", "data_privacy", "export_controls"],
            "EU": ["gdpr", "reach", "rohs", "ce_marking", "vat_compliance"],
            "ASIA": ["import_licenses", "quality_certifications", "labor_compliance"],
            "GLOBAL": ["iso_9001", "iso_14001", "anti_corruption", "sanctions_screening"]
        }
        
        # Certificate types and validity periods
        self.certificate_requirements = {
            "iso_9001": {"validity_days": 1095, "critical": True},  # 3 years
            "iso_14001": {"validity_days": 1095, "critical": False},
            "gdpr_compliance": {"validity_days": 365, "critical": True},
            "insurance": {"validity_days": 365, "critical": True},
            "business_license": {"validity_days": 365, "critical": True},
            "tax_clearance": {"validity_days": 180, "critical": True},
            "quality_certification": {"validity_days": 730, "critical": False}
        }
        
        # Compliance check weights
        self.compliance_weights = {
            "documentation": 0.25,
            "certifications": 0.20,
            "financial": 0.15,
            "operational": 0.15,
            "legal": 0.15,
            "ethical": 0.10
        }
        
        # Risk thresholds
        self.risk_thresholds = {
            "low": 0.2,
            "medium": 0.5,
            "high": 0.7,
            "critical": 0.9
        }
    
    async def check_vendor_compliance(
        self,
        vendor_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Check compliance for new vendor"""
        
        compliance_checks = await asyncio.gather(
            self._check_documentation(vendor_data),
            self._check_certifications(vendor_data),
            self._check_financial_compliance(vendor_data),
            self._check_legal_compliance(vendor_data),
            self._check_sanctions(vendor_data),
            self._check_ethical_compliance(vendor_data)
        )
        
        documentation = compliance_checks[0]
        certifications = compliance_checks[1]
        financial = compliance_checks[2]
        legal = compliance_checks[3]
        sanctions = compliance_checks[4]
        ethical = compliance_checks[5]
        
        # Calculate overall compliance score
        compliance_score = self._calculate_compliance_score({
            "documentation": documentation,
            "certifications": certifications,
            "financial": financial,
            "legal": legal,
            "sanctions": sanctions,
            "ethical": ethical
        })
        
        # Determine compliance status
        status = self._determine_compliance_status(compliance_score, sanctions)
        
        return {
            "status": status,
            "compliance_score": round(compliance_score, 3),
            "checks": {
                "documentation": documentation,
                "certifications": certifications,
                "financial": financial,
                "legal": legal,
                "sanctions": sanctions,
                "ethical": ethical
            },
            "issues": self._identify_compliance_issues(compliance_checks),
            "recommendations": self._generate_compliance_recommendations(compliance_checks),
            "next_review_date": self._calculate_next_review_date(status)
        }
    
    async def check_vendor(
        self,
        db: AsyncSession,
        vendor: Vendor
    ) -> Dict[str, Any]:
        """Check existing vendor compliance"""
        
        # Check certificate expiry
        certificate_status = await self._check_certificate_expiry(vendor)
        
        # Check recent audit results
        audit_status = await self._check_audit_status(db, vendor)
        
        # Check incident history
        incident_status = await self._check_incident_history(db, vendor)
        
        # Check regulatory updates
        regulatory_status = await self._check_regulatory_compliance(vendor)
        
        # Calculate compliance health
        compliance_health = self._calculate_health_score(
            certificate_status,
            audit_status,
            incident_status,
            regulatory_status
        )
        
        return {
            "vendor_id": vendor.id,
            "compliant": compliance_health["score"] > 0.7,
            "health_score": compliance_health["score"],
            "status": compliance_health["status"],
            "certificate_status": certificate_status,
            "audit_status": audit_status,
            "incident_status": incident_status,
            "regulatory_status": regulatory_status,
            "actions_required": compliance_health["actions"],
            "next_audit_date": self._calculate_next_audit_date(vendor, compliance_health)
        }
    
    async def monitor_compliance_changes(
        self,
        db: AsyncSession,
        vendor_id: int
    ) -> Dict[str, Any]:
        """Monitor compliance changes and trends"""
        
        vendor = await db.get(Vendor, vendor_id)
        if not vendor:
            raise ValueError(f"Vendor {vendor_id} not found")
        
        # Get compliance history
        history = await self._get_compliance_history(db, vendor_id)
        
        # Analyze trends
        trend_analysis = self._analyze_compliance_trends(history)
        
        # Predict future compliance risk
        risk_prediction = self._predict_compliance_risk(history, trend_analysis)
        
        # Generate proactive alerts
        alerts = self._generate_compliance_alerts(vendor, trend_analysis, risk_prediction)
        
        return {
            "vendor_id": vendor_id,
            "current_status": vendor.compliance_status,
            "trend": trend_analysis,
            "risk_prediction": risk_prediction,
            "alerts": alerts,
            "recommended_actions": self._recommend_proactive_actions(risk_prediction)
        }
    
    async def _check_documentation(self, vendor_data: Dict[str, Any]) -> Dict[str, Any]:
        """Check documentation completeness"""
        
        required_docs = [
            "business_registration",
            "tax_id",
            "bank_details",
            "insurance_policy",
            "compliance_declaration"
        ]
        
        provided_docs = vendor_data.get("documents", [])
        missing_docs = [doc for doc in required_docs if doc not in provided_docs]
        
        completeness = (len(required_docs) - len(missing_docs)) / len(required_docs)
        
        return {
            "score": completeness,
            "required": required_docs,
            "provided": provided_docs,
            "missing": missing_docs,
            "status": "complete" if completeness == 1 else "incomplete"
        }
    
    async def _check_certifications(self, vendor_data: Dict[str, Any]) -> Dict[str, Any]:
        """Check certification status"""
        
        certifications = vendor_data.get("certifications", [])
        required_certs = self._get_required_certifications(vendor_data)
        
        cert_status = {}
        for cert in required_certs:
            cert_info = next((c for c in certifications if c["type"] == cert), None)
            if cert_info:
                expiry_date = datetime.fromisoformat(cert_info["expiry_date"])
                is_valid = expiry_date > datetime.utcnow()
                cert_status[cert] = {
                    "present": True,
                    "valid": is_valid,
                    "expiry_date": cert_info["expiry_date"]
                }
            else:
                cert_status[cert] = {
                    "present": False,
                    "valid": False
                }
        
        valid_certs = sum(1 for c in cert_status.values() if c["valid"])
        score = valid_certs / len(required_certs) if required_certs else 1.0
        
        return {
            "score": score,
            "required": required_certs,
            "status": cert_status,
            "valid_count": valid_certs,
            "expired_count": sum(1 for c in cert_status.values() if c["present"] and not c["valid"]),
            "missing_count": sum(1 for c in cert_status.values() if not c["present"])
        }
    
    async def _check_financial_compliance(self, vendor_data: Dict[str, Any]) -> Dict[str, Any]:
        """Check financial compliance"""
        
        # Mock financial checks
        credit_score = vendor_data.get("credit_score", 700)
        financial_statements = vendor_data.get("financial_statements", False)
        tax_compliance = vendor_data.get("tax_compliance", True)
        
        score = 0.0
        if credit_score > 650:
            score += 0.4
        if financial_statements:
            score += 0.3
        if tax_compliance:
            score += 0.3
        
        return {
            "score": score,
            "credit_score": credit_score,
            "financial_statements_provided": financial_statements,
            "tax_compliant": tax_compliance,
            "financial_health": "good" if score > 0.7 else "fair" if score > 0.5 else "poor"
        }
    
    async def _check_legal_compliance(self, vendor_data: Dict[str, Any]) -> Dict[str, Any]:
        """Check legal compliance"""
        
        # Mock legal checks
        litigation_history = vendor_data.get("litigation_history", [])
        regulatory_violations = vendor_data.get("regulatory_violations", [])
        licenses_valid = vendor_data.get("licenses_valid", True)
        
        score = 1.0
        if litigation_history:
            score -= 0.3 * min(len(litigation_history), 3)
        if regulatory_violations:
            score -= 0.4 * min(len(regulatory_violations), 2)
        if not licenses_valid:
            score -= 0.3
        
        return {
            "score": max(0, score),
            "litigation_cases": len(litigation_history),
            "regulatory_violations": len(regulatory_violations),
            "licenses_valid": licenses_valid,
            "legal_risk": "low" if score > 0.7 else "medium" if score > 0.4 else "high"
        }
    
    async def _check_sanctions(self, vendor_data: Dict[str, Any]) -> Dict[str, Any]:
        """Check sanctions and watchlists"""
        
        # Mock sanctions check
        vendor_name = vendor_data.get("name", "")
        country = vendor_data.get("country", "")
        
        # In production, this would call sanctions screening APIs
        sanctioned = False
        watchlisted = False
        pep = False  # Politically Exposed Person
        
        score = 1.0
        if sanctioned:
            score = 0.0
        elif watchlisted:
            score = 0.3
        elif pep:
            score = 0.7
        
        return {
            "score": score,
            "sanctioned": sanctioned,
            "watchlisted": watchlisted,
            "pep": pep,
            "screening_date": datetime.utcnow().isoformat(),
            "clearance": "clear" if score == 1.0 else "flagged" if score > 0 else "blocked"
        }
    
    async def _check_ethical_compliance(self, vendor_data: Dict[str, Any]) -> Dict[str, Any]:
        """Check ethical and sustainability compliance"""
        
        # Check for ethical certifications and policies
        has_code_of_conduct = vendor_data.get("code_of_conduct", False)
        has_sustainability_policy = vendor_data.get("sustainability_policy", False)
        has_labor_compliance = vendor_data.get("labor_compliance", False)
        has_environmental_policy = vendor_data.get("environmental_policy", False)
        
        score = 0.0
        if has_code_of_conduct:
            score += 0.25
        if has_sustainability_policy:
            score += 0.25
        if has_labor_compliance:
            score += 0.25
        if has_environmental_policy:
            score += 0.25
        
        return {
            "score": score,
            "code_of_conduct": has_code_of_conduct,
            "sustainability_policy": has_sustainability_policy,
            "labor_compliance": has_labor_compliance,
            "environmental_policy": has_environmental_policy,
            "ethical_rating": "excellent" if score > 0.75 else "good" if score > 0.5 else "needs improvement"
        }
    
    async def _check_certificate_expiry(self, vendor: Vendor) -> Dict[str, Any]:
        """Check certificate expiry status"""
        
        certifications = vendor.certifications or []
        expiring_soon = []
        expired = []
        
        for cert in certifications:
            if "expiry_date" in cert:
                expiry = datetime.fromisoformat(cert["expiry_date"])
                days_until_expiry = (expiry - datetime.utcnow()).days
                
                if days_until_expiry < 0:
                    expired.append({
                        "type": cert["type"],
                        "expired_days_ago": abs(days_until_expiry)
                    })
                elif days_until_expiry < 30:
                    expiring_soon.append({
                        "type": cert["type"],
                        "days_until_expiry": days_until_expiry
                    })
        
        return {
            "expired": expired,
            "expiring_soon": expiring_soon,
            "status": "critical" if expired else "warning" if expiring_soon else "ok"
        }
    
    async def _check_audit_status(
        self,
        db: AsyncSession,
        vendor: Vendor
    ) -> Dict[str, Any]:
        """Check audit status and history"""
        
        last_audit = vendor.last_audit_date
        if last_audit:
            days_since_audit = (datetime.utcnow() - last_audit).days
            audit_due = days_since_audit > 365
        else:
            days_since_audit = None
            audit_due = True
        
        return {
            "last_audit_date": last_audit.isoformat() if last_audit else None,
            "days_since_audit": days_since_audit,
            "audit_due": audit_due,
            "audit_frequency": "annual",
            "status": "overdue" if audit_due else "current"
        }
    
    async def _check_incident_history(
        self,
        db: AsyncSession,
        vendor: Vendor
    ) -> Dict[str, Any]:
        """Check compliance incident history"""
        
        # Query audit logs for compliance incidents
        # Mock implementation
        incidents_30d = 0
        incidents_90d = 1
        incidents_365d = 2
        
        severity_distribution = {
            "critical": 0,
            "high": 0,
            "medium": 1,
            "low": 1
        }
        
        return {
            "incidents_30d": incidents_30d,
            "incidents_90d": incidents_90d,
            "incidents_365d": incidents_365d,
            "severity_distribution": severity_distribution,
            "trend": "improving" if incidents_30d < incidents_90d / 3 else "stable" if incidents_30d == incidents_90d / 3 else "worsening"
        }
    
    async def _check_regulatory_compliance(self, vendor: Vendor) -> Dict[str, Any]:
        """Check regulatory compliance status"""
        
        region = vendor.address.get("country", "US") if vendor.address else "US"
        requirements = self.regional_requirements.get(region, self.regional_requirements["GLOBAL"])
        
        compliance_status = {}
        for requirement in requirements:
            # Mock compliance check
            compliance_status[requirement] = {
                "compliant": True,  # Would check actual compliance
                "last_verified": datetime.utcnow().isoformat()
            }
        
        compliant_count = sum(1 for r in compliance_status.values() if r["compliant"])
        total_requirements = len(requirements)
        
        return {
            "region": region,
            "requirements": requirements,
            "compliance_status": compliance_status,
            "compliant_count": compliant_count,
            "total_requirements": total_requirements,
            "compliance_rate": compliant_count / total_requirements if total_requirements > 0 else 1.0
        }
    
    def _calculate_compliance_score(self, checks: Dict[str, Any]) -> float:
        """Calculate overall compliance score"""
        
        score = 0.0
        for check_type, weight in self.compliance_weights.items():
            if check_type in checks:
                score += checks[check_type].get("score", 0) * weight
        
        return score
    
    def _determine_compliance_status(
        self,
        compliance_score: float,
        sanctions_check: Dict[str, Any]
    ) -> str:
        """Determine overall compliance status"""
        
        # Immediate non-compliance for sanctions
        if sanctions_check["sanctioned"]:
            return ComplianceStatus.NON_COMPLIANT
        
        if compliance_score >= 0.9:
            return ComplianceStatus.COMPLIANT
        elif compliance_score >= 0.7:
            return ComplianceStatus.MINOR_ISSUES
        elif compliance_score >= 0.5:
            return ComplianceStatus.MAJOR_ISSUES
        else:
            return ComplianceStatus.NON_COMPLIANT
    
    def _identify_compliance_issues(self, checks: List[Dict]) -> List[str]:
        """Identify specific compliance issues"""
        
        issues = []
        
        for check in checks:
            if isinstance(check, dict) and check.get("score", 1) < 0.7:
                if "missing" in check:
                    for item in check["missing"]:
                        issues.append(f"Missing: {item}")
                if "expired" in check:
                    for item in check["expired"]:
                        issues.append(f"Expired: {item}")
        
        return issues
    
    def _generate_compliance_recommendations(self, checks: List[Dict]) -> List[str]:
        """Generate compliance improvement recommendations"""
        
        recommendations = []
        
        for check in checks:
            if isinstance(check, dict):
                score = check.get("score", 1)
                if score < 0.5:
                    recommendations.append(f"Urgent: Address {check.get('status', 'compliance issues')}")
                elif score < 0.7:
                    recommendations.append(f"Review: Improve {check.get('status', 'compliance status')}")
        
        return recommendations[:5]  # Top 5 recommendations
    
    def _calculate_next_review_date(self, status: str) -> str:
        """Calculate next compliance review date"""
        
        days_until_review = {
            ComplianceStatus.COMPLIANT: 365,
            ComplianceStatus.MINOR_ISSUES: 180,
            ComplianceStatus.MAJOR_ISSUES: 90,
            ComplianceStatus.NON_COMPLIANT: 30,
            ComplianceStatus.UNDER_REVIEW: 7
        }
        
        days = days_until_review.get(status, 90)
        next_date = datetime.utcnow() + timedelta(days=days)
        
        return next_date.isoformat()
    
    def _calculate_health_score(self, *status_checks) -> Dict[str, Any]:
        """Calculate compliance health score"""
        
        scores = []
        actions = []
        
        for check in status_checks:
            if isinstance(check, dict):
                if "score" in check:
                    scores.append(check["score"])
                elif "compliance_rate" in check:
                    scores.append(check["compliance_rate"])
                
                if check.get("status") in ["critical", "overdue"]:
                    actions.append(f"Address {check.get('status')} items")
        
        avg_score = sum(scores) / len(scores) if scores else 0.5
        
        return {
            "score": avg_score,
            "status": self._determine_compliance_status(avg_score, {"sanctioned": False}),
            "actions": actions
        }
    
    def _get_required_certifications(self, vendor_data: Dict[str, Any]) -> List[str]:
        """Get required certifications based on vendor type"""
        
        vendor_type = vendor_data.get("type", "general")
        category = vendor_data.get("category", "general")
        
        base_certs = ["business_license", "insurance"]
        
        if category == "manufacturing":
            base_certs.extend(["iso_9001", "quality_certification"])
        elif category == "logistics":
            base_certs.extend(["transportation_license", "warehouse_certification"])
        elif category == "technology":
            base_certs.extend(["iso_27001", "gdpr_compliance"])
        
        return base_certs
    
    def _calculate_next_audit_date(
        self,
        vendor: Vendor,
        compliance_health: Dict
    ) -> str:
        """Calculate next audit date based on risk"""
        
        base_interval_days = 365  # Annual by default
        
        # Adjust based on compliance health
        if compliance_health["score"] < 0.5:
            interval_days = 90
        elif compliance_health["score"] < 0.7:
            interval_days = 180
        else:
            interval_days = base_interval_days
        
        last_audit = vendor.last_audit_date or datetime.utcnow()
        next_audit = last_audit + timedelta(days=interval_days)
        
        # Don't schedule in the past
        if next_audit < datetime.utcnow():
            next_audit = datetime.utcnow() + timedelta(days=30)
        
        return next_audit.isoformat()
    
    async def _get_compliance_history(
        self,
        db: AsyncSession,
        vendor_id: int
    ) -> List[Dict[str, Any]]:
        """Get compliance history for trend analysis"""
        
        # Mock compliance history
        history = []
        for i in range(12):  # Last 12 months
            month_ago = datetime.utcnow() - timedelta(days=30 * i)
            history.append({
                "date": month_ago.isoformat(),
                "compliance_score": 0.7 + (0.02 * i),  # Improving trend
                "incidents": max(0, 3 - i // 4),
                "audits_passed": i % 3 == 0
            })
        
        return history
    
    def _analyze_compliance_trends(self, history: List[Dict]) -> Dict[str, Any]:
        """Analyze compliance trends from history"""
        
        if not history:
            return {"trend": "unknown", "confidence": 0}
        
        scores = [h["compliance_score"] for h in history]
        recent_avg = sum(scores[:3]) / 3 if len(scores) >= 3 else scores[0]
        historical_avg = sum(scores) / len(scores)
        
        if recent_avg > historical_avg * 1.05:
            trend = "improving"
        elif recent_avg < historical_avg * 0.95:
            trend = "declining"
        else:
            trend = "stable"
        
        return {
            "trend": trend,
            "recent_score": recent_avg,
            "historical_score": historical_avg,
            "change_percentage": ((recent_avg - historical_avg) / historical_avg * 100) if historical_avg > 0 else 0,
            "confidence": min(len(history) / 12, 1.0)  # Higher confidence with more data
        }
    
    def _predict_compliance_risk(
        self,
        history: List[Dict],
        trend: Dict
    ) -> Dict[str, Any]:
        """Predict future compliance risk"""
        
        base_risk = 1.0 - (trend.get("recent_score", 0.5))
        
        # Adjust based on trend
        if trend["trend"] == "improving":
            future_risk = max(0, base_risk - 0.1)
        elif trend["trend"] == "declining":
            future_risk = min(1, base_risk + 0.2)
        else:
            future_risk = base_risk
        
        return {
            "risk_score": future_risk,
            "risk_level": "critical" if future_risk > 0.7 else "high" if future_risk > 0.5 else "medium" if future_risk > 0.3 else "low",
            "probability_of_incident": future_risk,
            "confidence": trend["confidence"]
        }
    
    def _generate_compliance_alerts(
        self,
        vendor: Vendor,
        trend: Dict,
        risk_prediction: Dict
    ) -> List[Dict[str, Any]]:
        """Generate proactive compliance alerts"""
        
        alerts = []
        
        if trend["trend"] == "declining":
            alerts.append({
                "type": "trend_alert",
                "severity": "medium",
                "message": f"Compliance score declining by {abs(trend['change_percentage']):.1f}%"
            })
        
        if risk_prediction["risk_level"] in ["high", "critical"]:
            alerts.append({
                "type": "risk_alert",
                "severity": "high",
                "message": f"High compliance risk predicted: {risk_prediction['risk_level']}"
            })
        
        # Check certificate expiry
        if vendor.certifications:
            for cert in vendor.certifications:
                if "expiry_date" in cert:
                    days_until = (datetime.fromisoformat(cert["expiry_date"]) - datetime.utcnow()).days
                    if days_until < 30 and days_until > 0:
                        alerts.append({
                            "type": "certificate_expiry",
                            "severity": "medium",
                            "message": f"{cert['type']} expires in {days_until} days"
                        })
        
        return alerts
    
    def _recommend_proactive_actions(self, risk_prediction: Dict) -> List[str]:
        """Recommend proactive compliance actions"""
        
        actions = []
        
        if risk_prediction["risk_level"] == "critical":
            actions.extend([
                "Schedule immediate compliance audit",
                "Review and update all certifications",
                "Implement daily compliance monitoring"
            ])
        elif risk_prediction["risk_level"] == "high":
            actions.extend([
                "Increase monitoring frequency",
                "Review compliance policies",
                "Schedule compliance training"
            ])
        elif risk_prediction["risk_level"] == "medium":
            actions.extend([
                "Maintain regular monitoring",
                "Update expiring certificates",
                "Review compliance procedures"
            ])
        else:
            actions.append("Continue standard compliance monitoring")
        
        return actions