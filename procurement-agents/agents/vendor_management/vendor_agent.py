"""Advanced Vendor Management Agent with AI-powered capabilities"""

import asyncio
import json
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple
from enum import Enum

import numpy as np
from sqlalchemy import select, update, and_, or_, func
from sqlalchemy.ext.asyncio import AsyncSession

from agents.base_agent import BaseAgent, AgentResponse, AgentStatus
from integrations.databases.models import Vendor, PurchaseOrder, Contract, Invoice, VendorStatus
from integrations.databases.database import get_db_session
from integrations.sap.connector import SAPConnector
from shared.config import get_config
from shared.utils import generate_id

from .performance_tracker import VendorPerformanceTracker
from .compliance_monitor import ComplianceMonitor
from .risk_assessor import VendorRiskAssessor
from .onboarding_workflow import VendorOnboardingWorkflow


class VendorAction(str, Enum):
    """Vendor management actions"""
    ONBOARD = "onboard"
    EVALUATE = "evaluate"
    UPDATE = "update"
    SUSPEND = "suspend"
    REACTIVATE = "reactivate"
    ASSESS_RISK = "assess_risk"
    CHECK_COMPLIANCE = "check_compliance"
    GENERATE_SCORECARD = "generate_scorecard"
    NEGOTIATE = "negotiate"
    OFFBOARD = "offboard"


class VendorManagementAgent(BaseAgent):
    """
    Advanced Vendor Management Agent with:
    - AI-powered vendor assessment
    - Real-time performance tracking
    - Automated compliance monitoring
    - Risk assessment and mitigation
    - Smart contract negotiation
    - Predictive vendor analytics
    """
    
    def __init__(self):
        super().__init__("vendor_management")
        self.config = get_config()
        
        # Initialize sub-components
        self.performance_tracker = VendorPerformanceTracker()
        self.compliance_monitor = ComplianceMonitor()
        self.risk_assessor = VendorRiskAssessor()
        self.onboarding_workflow = VendorOnboardingWorkflow()
        
        # SAP integration
        self.sap_connector = SAPConnector(self.config.sap)
        
        # Configuration
        self.auto_suspend_threshold = 0.4  # Performance score threshold
        self.high_risk_threshold = 0.7
        self.compliance_check_interval_days = 30
        self.performance_review_interval_days = 90
        
        # Caching
        self.vendor_cache = {}
        self.cache_ttl = 3600  # 1 hour
        
        # ML models placeholders
        self.vendor_classifier = None  # For vendor categorization
        self.performance_predictor = None  # For performance prediction
        self.risk_predictor = None  # For risk prediction
    
    async def process_request(self, request: Dict[str, Any]) -> AgentResponse:
        """Process vendor management request"""
        
        action = request.get("action", VendorAction.EVALUATE)
        vendor_id = request.get("vendor_id")
        vendor_data = request.get("vendor_data", {})
        
        try:
            async with get_db_session() as db:
                if action == VendorAction.ONBOARD:
                    result = await self._onboard_vendor(db, vendor_data)
                
                elif action == VendorAction.EVALUATE:
                    result = await self._evaluate_vendor(db, vendor_id)
                
                elif action == VendorAction.UPDATE:
                    result = await self._update_vendor(db, vendor_id, vendor_data)
                
                elif action == VendorAction.SUSPEND:
                    result = await self._suspend_vendor(db, vendor_id, request.get("reason"))
                
                elif action == VendorAction.REACTIVATE:
                    result = await self._reactivate_vendor(db, vendor_id)
                
                elif action == VendorAction.ASSESS_RISK:
                    result = await self._assess_vendor_risk(db, vendor_id)
                
                elif action == VendorAction.CHECK_COMPLIANCE:
                    result = await self._check_compliance(db, vendor_id)
                
                elif action == VendorAction.GENERATE_SCORECARD:
                    result = await self._generate_scorecard(db, vendor_id)
                
                elif action == VendorAction.NEGOTIATE:
                    result = await self._negotiate_terms(db, vendor_id, vendor_data)
                
                elif action == VendorAction.OFFBOARD:
                    result = await self._offboard_vendor(db, vendor_id)
                
                else:
                    raise ValueError(f"Unknown action: {action}")
                
                return AgentResponse(
                    status=AgentStatus.SUCCESS,
                    data=result,
                    message=f"Vendor {action} completed successfully"
                )
        
        except Exception as e:
            self.logger.error(f"Vendor management error: {str(e)}")
            return AgentResponse(
                status=AgentStatus.ERROR,
                data=None,
                message=f"Vendor management failed: {str(e)}"
            )
    
    async def _onboard_vendor(
        self,
        db: AsyncSession,
        vendor_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Onboard new vendor with comprehensive vetting"""
        
        # Step 1: Initial validation
        validation_result = await self._validate_vendor_data(vendor_data)
        if not validation_result["is_valid"]:
            raise ValueError(f"Vendor validation failed: {validation_result['errors']}")
        
        # Step 2: Duplicate check
        existing = await self._check_duplicate_vendor(db, vendor_data)
        if existing:
            return {
                "status": "duplicate_found",
                "existing_vendor_id": existing.id,
                "message": "Vendor already exists in system"
            }
        
        # Step 3: Risk assessment
        risk_assessment = await self.risk_assessor.assess_new_vendor(vendor_data)
        
        # Step 4: Compliance check
        compliance_check = await self.compliance_monitor.check_vendor_compliance(vendor_data)
        
        # Step 5: Credit check (mock)
        credit_check = await self._perform_credit_check(vendor_data)
        
        # Step 6: Create vendor record
        vendor = Vendor(
            vendor_code=generate_id("VND"),
            name=vendor_data["name"],
            tax_id=vendor_data.get("tax_id"),
            address=vendor_data.get("address"),
            contact_person=vendor_data.get("contact_person"),
            email=vendor_data.get("email"),
            phone=vendor_data.get("phone"),
            
            # Classification
            category=vendor_data.get("category", "general"),
            subcategory=vendor_data.get("subcategory"),
            vendor_type=vendor_data.get("type", "supplier"),
            
            # Financial
            payment_terms=vendor_data.get("payment_terms", "net_30"),
            currency=vendor_data.get("currency", "USD"),
            bank_details=vendor_data.get("bank_details", {}),
            credit_limit=credit_check.get("credit_limit", 50000),
            
            # Risk and compliance
            risk_score=risk_assessment["risk_score"],
            risk_category=risk_assessment["risk_category"],
            compliance_status=compliance_check["status"],
            last_audit_date=datetime.utcnow() if compliance_check["status"] == "compliant" else None,
            
            # Performance (initial)
            performance_score=0.5,  # Neutral starting score
            quality_rating=0.0,
            delivery_rating=0.0,
            
            # Status
            status=VendorStatus.PENDING if risk_assessment["risk_score"] > self.high_risk_threshold else VendorStatus.ACTIVE,
            onboarding_date=datetime.utcnow(),
            
            # Capabilities
            capabilities=vendor_data.get("capabilities", []),
            certifications=vendor_data.get("certifications", []),
            
            # Metadata
            metadata={
                "onboarding_channel": vendor_data.get("channel", "manual"),
                "risk_assessment": risk_assessment,
                "compliance_check": compliance_check,
                "credit_check": credit_check
            }
        )
        
        db.add(vendor)
        
        # Step 7: Create vendor in SAP (if active)
        if vendor.status == VendorStatus.ACTIVE:
            try:
                sap_result = await self._create_vendor_in_sap(vendor)
                vendor.sap_vendor_code = sap_result.get("vendor_code")
                vendor.metadata["sap_sync"] = {
                    "synced": True,
                    "sync_date": datetime.utcnow().isoformat(),
                    "sap_code": sap_result.get("vendor_code")
                }
            except Exception as e:
                self.logger.warning(f"SAP sync failed: {str(e)}")
                vendor.metadata["sap_sync"] = {
                    "synced": False,
                    "error": str(e)
                }
        
        # Step 8: Start onboarding workflow
        workflow_result = await self.onboarding_workflow.start_workflow(
            vendor=vendor,
            risk_level=risk_assessment["risk_category"]
        )
        
        await db.commit()
        await db.refresh(vendor)
        
        # Step 9: Send notifications
        await self._send_onboarding_notifications(vendor, workflow_result)
        
        return {
            "vendor_id": vendor.id,
            "vendor_code": vendor.vendor_code,
            "status": vendor.status,
            "risk_assessment": risk_assessment,
            "compliance_status": compliance_check["status"],
            "workflow_id": workflow_result.get("workflow_id"),
            "next_steps": workflow_result.get("next_steps", [])
        }
    
    async def _evaluate_vendor(
        self,
        db: AsyncSession,
        vendor_id: int
    ) -> Dict[str, Any]:
        """Comprehensive vendor evaluation"""
        
        vendor = await db.get(Vendor, vendor_id)
        if not vendor:
            raise ValueError(f"Vendor {vendor_id} not found")
        
        # Parallel evaluation tasks
        evaluation_tasks = [
            self.performance_tracker.calculate_performance(db, vendor_id),
            self.risk_assessor.assess_vendor(db, vendor),
            self.compliance_monitor.check_vendor(db, vendor),
            self._analyze_spend_patterns(db, vendor_id),
            self._evaluate_contract_performance(db, vendor_id),
            self._assess_innovation_contribution(db, vendor_id)
        ]
        
        results = await asyncio.gather(*evaluation_tasks, return_exceptions=True)
        
        performance = results[0] if not isinstance(results[0], Exception) else {"score": 0}
        risk = results[1] if not isinstance(results[1], Exception) else {"risk_score": 0.5}
        compliance = results[2] if not isinstance(results[2], Exception) else {"compliant": False}
        spend = results[3] if not isinstance(results[3], Exception) else {}
        contracts = results[4] if not isinstance(results[4], Exception) else {}
        innovation = results[5] if not isinstance(results[5], Exception) else {"score": 0}
        
        # Calculate overall vendor score
        overall_score = self._calculate_overall_score(
            performance=performance,
            risk=risk,
            compliance=compliance,
            spend=spend,
            contracts=contracts,
            innovation=innovation
        )
        
        # Update vendor record
        vendor.performance_score = performance.get("score", 0)
        vendor.risk_score = risk.get("risk_score", 0.5)
        vendor.last_evaluation_date = datetime.utcnow()
        vendor.metadata["last_evaluation"] = {
            "date": datetime.utcnow().isoformat(),
            "overall_score": overall_score,
            "components": {
                "performance": performance,
                "risk": risk,
                "compliance": compliance,
                "spend": spend,
                "contracts": contracts,
                "innovation": innovation
            }
        }
        
        # Auto-actions based on evaluation
        if overall_score < self.auto_suspend_threshold:
            vendor.status = VendorStatus.UNDER_REVIEW
            await self._initiate_improvement_plan(db, vendor)
        elif overall_score > 0.8:
            vendor.preferred_vendor = True
        
        await db.commit()
        
        return {
            "vendor_id": vendor_id,
            "overall_score": overall_score,
            "performance": performance,
            "risk_assessment": risk,
            "compliance_status": compliance,
            "spend_analysis": spend,
            "contract_performance": contracts,
            "innovation_score": innovation,
            "recommendations": self._generate_recommendations(overall_score, performance, risk),
            "status": vendor.status
        }
    
    async def _assess_vendor_risk(
        self,
        db: AsyncSession,
        vendor_id: int
    ) -> Dict[str, Any]:
        """AI-powered vendor risk assessment"""
        
        vendor = await db.get(Vendor, vendor_id)
        if not vendor:
            raise ValueError(f"Vendor {vendor_id} not found")
        
        # Multi-dimensional risk assessment
        risk_factors = await asyncio.gather(
            self._assess_financial_risk(db, vendor),
            self._assess_operational_risk(db, vendor),
            self._assess_compliance_risk(db, vendor),
            self._assess_reputational_risk(vendor),
            self._assess_geographical_risk(vendor),
            self._assess_cyber_security_risk(vendor),
            self._assess_dependency_risk(db, vendor_id)
        )
        
        financial_risk = risk_factors[0]
        operational_risk = risk_factors[1]
        compliance_risk = risk_factors[2]
        reputational_risk = risk_factors[3]
        geographical_risk = risk_factors[4]
        cyber_risk = risk_factors[5]
        dependency_risk = risk_factors[6]
        
        # Calculate weighted risk score
        risk_weights = {
            "financial": 0.25,
            "operational": 0.20,
            "compliance": 0.20,
            "reputational": 0.15,
            "geographical": 0.10,
            "cyber": 0.05,
            "dependency": 0.05
        }
        
        weighted_risk_score = (
            financial_risk * risk_weights["financial"] +
            operational_risk * risk_weights["operational"] +
            compliance_risk * risk_weights["compliance"] +
            reputational_risk * risk_weights["reputational"] +
            geographical_risk * risk_weights["geographical"] +
            cyber_risk * risk_weights["cyber"] +
            dependency_risk * risk_weights["dependency"]
        )
        
        # Determine risk category
        if weighted_risk_score < 0.3:
            risk_category = "low"
        elif weighted_risk_score < 0.6:
            risk_category = "medium"
        elif weighted_risk_score < 0.8:
            risk_category = "high"
        else:
            risk_category = "critical"
        
        # Generate mitigation strategies
        mitigation_strategies = self._generate_mitigation_strategies(
            risk_category,
            financial_risk,
            operational_risk,
            compliance_risk
        )
        
        # Update vendor risk profile
        vendor.risk_score = weighted_risk_score
        vendor.risk_category = risk_category
        vendor.last_risk_assessment = datetime.utcnow()
        vendor.metadata["risk_profile"] = {
            "financial": financial_risk,
            "operational": operational_risk,
            "compliance": compliance_risk,
            "reputational": reputational_risk,
            "geographical": geographical_risk,
            "cyber": cyber_risk,
            "dependency": dependency_risk,
            "mitigation_strategies": mitigation_strategies
        }
        
        await db.commit()
        
        return {
            "vendor_id": vendor_id,
            "risk_score": weighted_risk_score,
            "risk_category": risk_category,
            "risk_factors": {
                "financial": financial_risk,
                "operational": operational_risk,
                "compliance": compliance_risk,
                "reputational": reputational_risk,
                "geographical": geographical_risk,
                "cyber": cyber_risk,
                "dependency": dependency_risk
            },
            "mitigation_strategies": mitigation_strategies,
            "monitoring_required": risk_category in ["high", "critical"],
            "review_frequency": self._determine_review_frequency(risk_category)
        }
    
    async def _generate_scorecard(
        self,
        db: AsyncSession,
        vendor_id: int
    ) -> Dict[str, Any]:
        """Generate comprehensive vendor scorecard"""
        
        vendor = await db.get(Vendor, vendor_id)
        if not vendor:
            raise ValueError(f"Vendor {vendor_id} not found")
        
        # Get historical data
        po_query = select(PurchaseOrder).where(
            PurchaseOrder.vendor_id == vendor_id
        ).order_by(PurchaseOrder.created_at.desc()).limit(100)
        
        result = await db.execute(po_query)
        purchase_orders = result.scalars().all()
        
        # Calculate KPIs
        kpis = {
            "total_spend": sum(po.total_amount for po in purchase_orders),
            "order_count": len(purchase_orders),
            "average_order_value": sum(po.total_amount for po in purchase_orders) / len(purchase_orders) if purchase_orders else 0,
            "on_time_delivery_rate": self._calculate_otd_rate(purchase_orders),
            "quality_acceptance_rate": self._calculate_quality_rate(purchase_orders),
            "invoice_accuracy_rate": await self._calculate_invoice_accuracy(db, vendor_id),
            "response_time": self._calculate_avg_response_time(vendor),
            "contract_compliance_rate": await self._calculate_contract_compliance(db, vendor_id),
            "sustainability_score": self._calculate_sustainability_score(vendor),
            "innovation_index": self._calculate_innovation_index(vendor)
        }
        
        # Trend analysis
        trends = {
            "spend_trend": self._analyze_spend_trend(purchase_orders),
            "performance_trend": await self._analyze_performance_trend(db, vendor_id),
            "risk_trend": self._analyze_risk_trend(vendor)
        }
        
        # Benchmarking
        benchmark = await self._benchmark_vendor(db, vendor)
        
        # Generate insights
        insights = self._generate_vendor_insights(kpis, trends, benchmark)
        
        return {
            "vendor_id": vendor_id,
            "vendor_name": vendor.name,
            "scorecard_date": datetime.utcnow().isoformat(),
            "overall_score": vendor.performance_score,
            "status": vendor.status,
            "kpis": kpis,
            "trends": trends,
            "benchmark": benchmark,
            "insights": insights,
            "recommendations": self._generate_scorecard_recommendations(kpis, trends),
            "next_review_date": (datetime.utcnow() + timedelta(days=self.performance_review_interval_days)).isoformat()
        }
    
    async def _negotiate_terms(
        self,
        db: AsyncSession,
        vendor_id: int,
        negotiation_params: Dict[str, Any]
    ) -> Dict[str, Any]:
        """AI-assisted vendor negotiation"""
        
        vendor = await db.get(Vendor, vendor_id)
        if not vendor:
            raise ValueError(f"Vendor {vendor_id} not found")
        
        # Get vendor's historical performance for leverage
        performance = await self.performance_tracker.calculate_performance(db, vendor_id)
        spend_data = await self._analyze_spend_patterns(db, vendor_id)
        
        # Analyze negotiation parameters
        target_discount = negotiation_params.get("target_discount", 0.05)
        payment_terms = negotiation_params.get("payment_terms", vendor.payment_terms)
        volume_commitment = negotiation_params.get("volume_commitment")
        contract_duration = negotiation_params.get("contract_duration", 12)  # months
        
        # Calculate negotiation leverage
        leverage_score = self._calculate_negotiation_leverage(
            performance=performance,
            spend_data=spend_data,
            vendor_dependency=await self._assess_dependency_risk(db, vendor_id)
        )
        
        # Generate negotiation strategy
        strategy = {
            "approach": "collaborative" if leverage_score < 0.5 else "competitive",
            "priority_areas": self._identify_negotiation_priorities(
                performance, spend_data, negotiation_params
            ),
            "target_outcomes": {
                "price_reduction": min(target_discount * (1 + leverage_score), 0.15),
                "payment_terms": self._optimize_payment_terms(payment_terms, leverage_score),
                "service_levels": self._define_service_levels(performance),
                "volume_discounts": self._calculate_volume_discounts(volume_commitment, spend_data)
            },
            "fallback_positions": self._define_fallback_positions(leverage_score),
            "walk_away_point": self._define_walk_away_criteria(vendor, leverage_score)
        }
        
        # Simulate negotiation outcome (in production, this would interface with negotiation module)
        simulated_outcome = self._simulate_negotiation(
            vendor=vendor,
            strategy=strategy,
            leverage=leverage_score
        )
        
        # Create negotiation record
        negotiation_record = {
            "vendor_id": vendor_id,
            "date": datetime.utcnow().isoformat(),
            "leverage_score": leverage_score,
            "strategy": strategy,
            "proposed_terms": simulated_outcome["proposed_terms"],
            "expected_savings": simulated_outcome["expected_savings"],
            "confidence_level": simulated_outcome["confidence"],
            "next_steps": simulated_outcome["next_steps"]
        }
        
        # Update vendor metadata
        if "negotiations" not in vendor.metadata:
            vendor.metadata["negotiations"] = []
        vendor.metadata["negotiations"].append(negotiation_record)
        
        await db.commit()
        
        return negotiation_record
    
    # Helper methods
    async def _validate_vendor_data(self, vendor_data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate vendor data completeness and accuracy"""
        errors = []
        warnings = []
        
        # Required fields
        required_fields = ["name", "tax_id", "address", "email", "contact_person"]
        for field in required_fields:
            if field not in vendor_data or not vendor_data[field]:
                errors.append(f"Missing required field: {field}")
        
        # Email validation
        if "email" in vendor_data:
            if "@" not in vendor_data["email"]:
                errors.append("Invalid email format")
        
        # Tax ID validation (simplified)
        if "tax_id" in vendor_data:
            if len(vendor_data["tax_id"]) < 9:
                warnings.append("Tax ID appears to be invalid")
        
        return {
            "is_valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings
        }
    
    async def _check_duplicate_vendor(
        self,
        db: AsyncSession,
        vendor_data: Dict[str, Any]
    ) -> Optional[Vendor]:
        """Check for duplicate vendor"""
        query = select(Vendor).where(
            or_(
                Vendor.tax_id == vendor_data.get("tax_id"),
                and_(
                    Vendor.name == vendor_data.get("name"),
                    Vendor.address == vendor_data.get("address")
                )
            )
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()
    
    async def _perform_credit_check(self, vendor_data: Dict[str, Any]) -> Dict[str, Any]:
        """Perform credit check (mock implementation)"""
        # In production, this would call external credit bureau APIs
        return {
            "credit_score": np.random.randint(600, 850),
            "credit_limit": np.random.randint(10000, 500000),
            "payment_history": "good",
            "financial_stability": "stable",
            "recommendation": "approve"
        }
    
    async def _create_vendor_in_sap(self, vendor: Vendor) -> Dict[str, Any]:
        """Create vendor in SAP system"""
        from integrations.sap.bapi_calls import create_vendor_master
        
        return await create_vendor_master(
            self.sap_connector,
            vendor_data={
                "name": vendor.name,
                "tax_id": vendor.tax_id,
                "address": vendor.address,
                "payment_terms": vendor.payment_terms,
                "currency": vendor.currency
            }
        )
    
    def _calculate_overall_score(self, **components) -> float:
        """Calculate overall vendor score from components"""
        weights = {
            "performance": 0.3,
            "risk": 0.2,
            "compliance": 0.2,
            "spend": 0.15,
            "contracts": 0.1,
            "innovation": 0.05
        }
        
        score = 0.0
        for component, weight in weights.items():
            if component in components and components[component]:
                if component == "risk":
                    # Invert risk score (lower risk = higher score)
                    component_score = 1.0 - components[component].get("risk_score", 0.5)
                elif component == "compliance":
                    component_score = 1.0 if components[component].get("compliant") else 0.0
                else:
                    component_score = components[component].get("score", 0.5)
                
                score += component_score * weight
        
        return round(score, 3)
    
    def _generate_recommendations(
        self,
        overall_score: float,
        performance: Dict,
        risk: Dict
    ) -> List[str]:
        """Generate actionable recommendations"""
        recommendations = []
        
        if overall_score < 0.5:
            recommendations.append("Consider alternative vendors for critical purchases")
        
        if performance.get("score", 0) < 0.6:
            recommendations.append("Implement vendor improvement program")
        
        if risk.get("risk_score", 0) > 0.7:
            recommendations.append("Increase monitoring frequency and implement risk mitigation plan")
        
        return recommendations
    
    async def _analyze_spend_patterns(
        self,
        db: AsyncSession,
        vendor_id: int
    ) -> Dict[str, Any]:
        """Analyze spending patterns with vendor"""
        # Implementation would analyze PO history
        return {
            "total_spend_ytd": np.random.randint(10000, 1000000),
            "spend_trend": "increasing",
            "average_order_size": np.random.randint(1000, 50000),
            "order_frequency": "monthly",
            "score": 0.7
        }
    
    async def _evaluate_contract_performance(
        self,
        db: AsyncSession,
        vendor_id: int
    ) -> Dict[str, Any]:
        """Evaluate contract performance"""
        return {
            "contracts_active": 3,
            "compliance_rate": 0.95,
            "sla_adherence": 0.92,
            "score": 0.93
        }
    
    async def _assess_innovation_contribution(
        self,
        db: AsyncSession,
        vendor_id: int
    ) -> Dict[str, Any]:
        """Assess vendor's innovation contribution"""
        return {
            "new_products_introduced": 5,
            "process_improvements": 3,
            "cost_savings_initiatives": 2,
            "score": 0.75
        }
    
    def _determine_review_frequency(self, risk_category: str) -> str:
        """Determine review frequency based on risk"""
        frequencies = {
            "low": "annually",
            "medium": "semi-annually",
            "high": "quarterly",
            "critical": "monthly"
        }
        return frequencies.get(risk_category, "quarterly")
    
    async def _send_onboarding_notifications(
        self,
        vendor: Vendor,
        workflow_result: Dict
    ):
        """Send notifications for vendor onboarding"""
        # Implementation would send emails/notifications
        pass