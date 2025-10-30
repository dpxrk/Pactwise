"""Savings Tracker Agent for monitoring and reporting procurement savings"""

import asyncio
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
from enum import Enum

from agents.base_agent import BaseAgent, AgentResponse
from utils.logging_config import get_logger
from utils.exceptions import ValidationError, AgentExecutionError
from utils.decorators import measure_execution_time, audit_log
from utils.common import (
    generate_id, format_currency, calculate_percentage,
    safe_divide
)

from .excel_importer import ExcelImporter
from .savings_calculator import SavingsCalculator
from .roi_analyzer import ROIAnalyzer


class SavingsType(str, Enum):
    """Types of savings"""
    NEGOTIATED = "negotiated"
    VOLUME_DISCOUNT = "volume_discount"
    PROCESS_IMPROVEMENT = "process_improvement"
    DEMAND_MANAGEMENT = "demand_management"
    SUBSTITUTION = "substitution"
    PAYMENT_TERMS = "payment_terms"
    REBATES = "rebates"
    COST_AVOIDANCE = "cost_avoidance"
    BUDGET_REDUCTION = "budget_reduction"


class SavingsStatus(str, Enum):
    """Savings initiative status"""
    IDENTIFIED = "identified"
    IN_PROGRESS = "in_progress"
    IMPLEMENTED = "implemented"
    REALIZED = "realized"
    VERIFIED = "verified"
    AT_RISK = "at_risk"
    LOST = "lost"


class SavingsTrackerAgent(BaseAgent):
    """Agent for tracking and managing procurement savings"""
    
    def __init__(self, **kwargs):
        super().__init__(agent_name="savings_tracker", **kwargs)
        
        # Initialize components
        self.excel_importer = ExcelImporter()
        self.savings_calculator = SavingsCalculator()
        self.roi_analyzer = ROIAnalyzer()
        
        # Configuration
        self.config.update({
            "min_savings_threshold": 1000,  # Minimum savings to track
            "verification_required_above": 50000,  # Require verification for large savings
            "risk_threshold_days": 30,  # Days before marking as at-risk
            "default_target_percentage": 5,  # Default savings target %
            "fiscal_year_start_month": 1,  # January
        })
        
        # In-memory storage (would be database in production)
        self.savings_initiatives = []
        self.savings_targets = {}
        self.excel_templates = {}
        
        self.logger.info("Savings Tracker Agent initialized")
    
    async def validate_request(self, request: Dict[str, Any]) -> Tuple[bool, Optional[List[str]]]:
        """Validate savings tracker request"""
        errors = []
        
        operation = request.get("operation")
        
        if not operation:
            errors.append("Operation type is required")
            return False, errors
        
        valid_operations = [
            "import_excel", "create_initiative", "update_initiative",
            "calculate_savings", "verify_savings", "generate_report",
            "set_targets", "track_progress", "identify_risks",
            "analyze_roi", "export_dashboard", "get_summary"
        ]
        
        if operation not in valid_operations:
            errors.append(f"Invalid operation: {operation}")
        
        # Operation-specific validation
        if operation == "import_excel":
            if not request.get("file_path") and not request.get("file_data"):
                errors.append("Excel file path or data required")
        
        elif operation == "create_initiative":
            if not request.get("title"):
                errors.append("Initiative title is required")
            if not request.get("category"):
                errors.append("Category is required")
            if not request.get("projected_savings"):
                errors.append("Projected savings amount is required")
        
        elif operation in ["update_initiative", "verify_savings"]:
            if not request.get("initiative_id"):
                errors.append("Initiative ID is required")
        
        return len(errors) == 0, errors if errors else None
    
    @measure_execution_time()
    async def process_request(self, request: Dict[str, Any]) -> AgentResponse:
        """Process savings tracker request"""
        operation = request.get("operation")
        
        try:
            self.logger.info(f"Processing {operation} request")
            
            result = None
            
            if operation == "import_excel":
                result = await self.import_excel_data(request)
            
            elif operation == "create_initiative":
                result = await self.create_savings_initiative(request)
            
            elif operation == "update_initiative":
                result = await self.update_savings_initiative(request)
            
            elif operation == "calculate_savings":
                result = await self.calculate_total_savings(request)
            
            elif operation == "verify_savings":
                result = await self.verify_savings(request)
            
            elif operation == "generate_report":
                result = await self.generate_savings_report(request)
            
            elif operation == "set_targets":
                result = await self.set_savings_targets(request)
            
            elif operation == "track_progress":
                result = await self.track_savings_progress(request)
            
            elif operation == "identify_risks":
                result = await self.identify_at_risk_savings(request)
            
            elif operation == "analyze_roi":
                result = await self.analyze_initiative_roi(request)
            
            elif operation == "export_dashboard":
                result = await self.export_dashboard_data(request)
            
            elif operation == "get_summary":
                result = await self.get_savings_summary(request)
            
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
    
    async def import_excel_data(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Import savings data from Excel file"""
        file_path = request.get("file_path")
        file_data = request.get("file_data")
        sheet_name = request.get("sheet_name", "Savings")
        
        # Import data
        imported_data = await self.excel_importer.import_savings_data(
            file_path=file_path,
            file_data=file_data,
            sheet_name=sheet_name
        )
        
        # Process imported initiatives
        imported_count = 0
        updated_count = 0
        errors = []
        
        for row in imported_data["initiatives"]:
            try:
                # Check if initiative exists
                existing = next(
                    (i for i in self.savings_initiatives 
                     if i.get("external_id") == row.get("id")),
                    None
                )
                
                if existing:
                    # Update existing
                    await self._update_initiative_from_import(existing, row)
                    updated_count += 1
                else:
                    # Create new
                    initiative = await self._create_initiative_from_import(row)
                    self.savings_initiatives.append(initiative)
                    imported_count += 1
                    
            except Exception as e:
                errors.append({
                    "row": row.get("id", "unknown"),
                    "error": str(e)
                })
        
        # Store template if provided
        if imported_data.get("template"):
            self.excel_templates["imported"] = imported_data["template"]
        
        return {
            "imported": imported_count,
            "updated": updated_count,
            "errors": errors,
            "total_initiatives": len(self.savings_initiatives),
            "summary": await self._calculate_import_summary(imported_data)
        }
    
    @audit_log(action="create_initiative", entity_type="savings")
    async def create_savings_initiative(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new savings initiative"""
        initiative_id = generate_id("sav")
        
        # Calculate savings details
        savings_details = await self.savings_calculator.calculate_savings(
            baseline_cost=request.get("baseline_cost", 0),
            new_cost=request.get("new_cost", 0),
            volume=request.get("volume", 1),
            savings_type=request.get("savings_type", SavingsType.NEGOTIATED)
        )
        
        # Create initiative
        initiative = {
            "id": initiative_id,
            "title": request["title"],
            "description": request.get("description", ""),
            "category": request["category"],
            "savings_type": request.get("savings_type", SavingsType.NEGOTIATED),
            "status": SavingsStatus.IDENTIFIED,
            "created_at": datetime.utcnow().isoformat(),
            "created_by": request.get("user_id"),
            
            # Financial details
            "baseline_cost": request.get("baseline_cost", 0),
            "new_cost": request.get("new_cost", 0),
            "projected_savings": request["projected_savings"],
            "realized_savings": 0,
            "verified_savings": 0,
            
            # Savings breakdown
            "annual_savings": savings_details.get("annual_savings", 0),
            "one_time_savings": request.get("one_time_savings", 0),
            "cost_avoidance": request.get("cost_avoidance", 0),
            
            # Timeline
            "start_date": request.get("start_date", datetime.utcnow().isoformat()),
            "end_date": request.get("end_date"),
            "implementation_date": request.get("implementation_date"),
            "verification_date": None,
            
            # Tracking
            "vendor_id": request.get("vendor_id"),
            "contract_id": request.get("contract_id"),
            "project_id": request.get("project_id"),
            "owner": request.get("owner"),
            "approver": request.get("approver"),
            
            # Risk and confidence
            "confidence_level": request.get("confidence_level", 0.8),
            "risk_level": "low",
            "risk_factors": [],
            
            # Documentation
            "documentation": request.get("documentation", []),
            "notes": request.get("notes", []),
            
            # Metrics
            "savings_percentage": savings_details.get("savings_percentage", 0),
            "implementation_cost": request.get("implementation_cost", 0),
            "payback_period_months": None
        }
        
        # Calculate ROI metrics
        roi_metrics = await self.roi_analyzer.calculate_roi(
            savings=initiative["projected_savings"],
            investment=initiative["implementation_cost"],
            timeframe_months=12
        )
        
        initiative["roi"] = roi_metrics["roi"]
        initiative["payback_period_months"] = roi_metrics["payback_months"]
        
        # Add to storage
        self.savings_initiatives.append(initiative)
        
        return {
            "initiative_id": initiative_id,
            "status": initiative["status"],
            "projected_savings": initiative["projected_savings"],
            "roi": initiative["roi"],
            "payback_period": f"{initiative['payback_period_months']} months" if initiative["payback_period_months"] else "Immediate",
            "next_steps": self._get_next_steps(initiative)
        }
    
    async def update_savings_initiative(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Update existing savings initiative"""
        initiative_id = request["initiative_id"]
        
        # Find initiative
        initiative = next(
            (i for i in self.savings_initiatives if i["id"] == initiative_id),
            None
        )
        
        if not initiative:
            raise ValidationError(f"Initiative {initiative_id} not found")
        
        # Track changes
        changes = []
        
        # Update status
        if new_status := request.get("status"):
            old_status = initiative["status"]
            initiative["status"] = new_status
            changes.append(f"Status: {old_status} → {new_status}")
            
            # Update dates based on status
            if new_status == SavingsStatus.IMPLEMENTED:
                initiative["implementation_date"] = datetime.utcnow().isoformat()
            elif new_status == SavingsStatus.VERIFIED:
                initiative["verification_date"] = datetime.utcnow().isoformat()
        
        # Update realized savings
        if "realized_savings" in request:
            old_realized = initiative["realized_savings"]
            initiative["realized_savings"] = request["realized_savings"]
            changes.append(f"Realized: {format_currency(old_realized)} → {format_currency(request['realized_savings'])}")
        
        # Update verified savings
        if "verified_savings" in request:
            initiative["verified_savings"] = request["verified_savings"]
            changes.append(f"Verified: {format_currency(request['verified_savings'])}")
        
        # Update risk level
        if "risk_level" in request:
            initiative["risk_level"] = request["risk_level"]
            
        if "risk_factors" in request:
            initiative["risk_factors"] = request["risk_factors"]
        
        # Add notes
        if notes := request.get("notes"):
            if not isinstance(initiative["notes"], list):
                initiative["notes"] = []
            initiative["notes"].append({
                "date": datetime.utcnow().isoformat(),
                "user": request.get("user_id"),
                "note": notes
            })
        
        # Recalculate metrics
        initiative["realization_rate"] = safe_divide(
            initiative["realized_savings"],
            initiative["projected_savings"]
        ) * 100
        
        return {
            "initiative_id": initiative_id,
            "changes": changes,
            "current_status": initiative["status"],
            "realization_rate": initiative["realization_rate"],
            "updated_at": datetime.utcnow().isoformat()
        }
    
    async def calculate_total_savings(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate total savings across initiatives"""
        # Date range
        start_date = request.get("start_date")
        end_date = request.get("end_date")
        category = request.get("category")
        status_filter = request.get("status")
        
        # Filter initiatives
        filtered = self.savings_initiatives
        
        if start_date:
            start = datetime.fromisoformat(start_date)
            filtered = [
                i for i in filtered 
                if datetime.fromisoformat(i["created_at"]) >= start
            ]
        
        if end_date:
            end = datetime.fromisoformat(end_date)
            filtered = [
                i for i in filtered
                if datetime.fromisoformat(i["created_at"]) <= end
            ]
        
        if category:
            filtered = [i for i in filtered if i["category"] == category]
        
        if status_filter:
            if isinstance(status_filter, list):
                filtered = [i for i in filtered if i["status"] in status_filter]
            else:
                filtered = [i for i in filtered if i["status"] == status_filter]
        
        # Calculate totals
        totals = await self.savings_calculator.calculate_totals(filtered)
        
        # Group by category
        by_category = {}
        for initiative in filtered:
            cat = initiative["category"]
            if cat not in by_category:
                by_category[cat] = {
                    "projected": 0,
                    "realized": 0,
                    "verified": 0,
                    "count": 0
                }
            by_category[cat]["projected"] += initiative["projected_savings"]
            by_category[cat]["realized"] += initiative["realized_savings"]
            by_category[cat]["verified"] += initiative["verified_savings"]
            by_category[cat]["count"] += 1
        
        # Group by status
        by_status = {}
        for initiative in filtered:
            status = initiative["status"]
            if status not in by_status:
                by_status[status] = {
                    "count": 0,
                    "total_savings": 0
                }
            by_status[status]["count"] += 1
            by_status[status]["total_savings"] += initiative["projected_savings"]
        
        return {
            "period": {
                "start": start_date,
                "end": end_date
            },
            "totals": totals,
            "by_category": by_category,
            "by_status": by_status,
            "initiative_count": len(filtered),
            "realization_rate": safe_divide(
                totals["total_realized"],
                totals["total_projected"]
            ) * 100,
            "verification_rate": safe_divide(
                totals["total_verified"],
                totals["total_realized"]
            ) * 100 if totals["total_realized"] > 0 else 0
        }
    
    async def verify_savings(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Verify savings for an initiative"""
        initiative_id = request["initiative_id"]
        verified_amount = request.get("verified_amount")
        verification_method = request.get("method", "financial_review")
        verifier = request.get("verifier", request.get("user_id"))
        
        # Find initiative
        initiative = next(
            (i for i in self.savings_initiatives if i["id"] == initiative_id),
            None
        )
        
        if not initiative:
            raise ValidationError(f"Initiative {initiative_id} not found")
        
        # Perform verification
        if verified_amount is None:
            # Auto-calculate based on actuals
            verified_amount = initiative["realized_savings"]
        
        # Update initiative
        initiative["verified_savings"] = verified_amount
        initiative["verification_date"] = datetime.utcnow().isoformat()
        initiative["verification_method"] = verification_method
        initiative["verified_by"] = verifier
        initiative["status"] = SavingsStatus.VERIFIED
        
        # Calculate variance
        variance = verified_amount - initiative["projected_savings"]
        variance_percentage = safe_divide(variance, initiative["projected_savings"]) * 100
        
        # Add verification note
        if not isinstance(initiative["notes"], list):
            initiative["notes"] = []
        
        initiative["notes"].append({
            "date": datetime.utcnow().isoformat(),
            "user": verifier,
            "note": f"Savings verified: {format_currency(verified_amount)} ({variance_percentage:+.1f}% vs projected)"
        })
        
        return {
            "initiative_id": initiative_id,
            "verified_amount": verified_amount,
            "projected_amount": initiative["projected_savings"],
            "variance": variance,
            "variance_percentage": variance_percentage,
            "verification_date": initiative["verification_date"],
            "status": "Verified"
        }
    
    async def generate_savings_report(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Generate comprehensive savings report"""
        period = request.get("period", "current_year")
        include_details = request.get("include_details", True)
        
        # Determine date range
        if period == "current_year":
            start_date = datetime(datetime.now().year, 1, 1)
            end_date = datetime.now()
        elif period == "current_quarter":
            quarter = (datetime.now().month - 1) // 3
            start_date = datetime(datetime.now().year, quarter * 3 + 1, 1)
            end_date = datetime.now()
        elif period == "last_12_months":
            start_date = datetime.now() - timedelta(days=365)
            end_date = datetime.now()
        else:
            start_date = datetime.fromisoformat(request.get("start_date"))
            end_date = datetime.fromisoformat(request.get("end_date"))
        
        # Get savings data
        savings_data = await self.calculate_total_savings({
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat()
        })
        
        # Get targets
        targets = self.savings_targets.get(str(datetime.now().year), {})
        
        # Calculate achievement
        target_total = targets.get("total", 0)
        achievement_rate = safe_divide(
            savings_data["totals"]["total_realized"],
            target_total
        ) * 100 if target_total > 0 else 0
        
        # Top initiatives
        top_initiatives = sorted(
            self.savings_initiatives,
            key=lambda x: x["projected_savings"],
            reverse=True
        )[:10]
        
        # At-risk savings
        at_risk = await self.identify_at_risk_savings({})
        
        report = {
            "report_date": datetime.utcnow().isoformat(),
            "period": {
                "description": period,
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            },
            "summary": {
                "total_projected": savings_data["totals"]["total_projected"],
                "total_realized": savings_data["totals"]["total_realized"],
                "total_verified": savings_data["totals"]["total_verified"],
                "realization_rate": savings_data["realization_rate"],
                "verification_rate": savings_data["verification_rate"]
            },
            "vs_target": {
                "target": target_total,
                "achieved": savings_data["totals"]["total_realized"],
                "gap": target_total - savings_data["totals"]["total_realized"],
                "achievement_rate": achievement_rate
            },
            "breakdown": {
                "by_category": savings_data["by_category"],
                "by_status": savings_data["by_status"],
                "by_type": await self._group_by_savings_type()
            },
            "highlights": {
                "top_initiatives": [
                    {
                        "id": i["id"],
                        "title": i["title"],
                        "savings": i["projected_savings"],
                        "status": i["status"]
                    }
                    for i in top_initiatives
                ],
                "at_risk_amount": at_risk["total_at_risk"],
                "upcoming_implementations": await self._get_upcoming_implementations()
            }
        }
        
        if include_details:
            report["detailed_initiatives"] = [
                await self._format_initiative_details(i)
                for i in self.savings_initiatives
            ]
        
        return report
    
    async def set_savings_targets(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Set savings targets for planning"""
        year = request.get("year", datetime.now().year)
        
        targets = {
            "year": year,
            "total": request.get("total_target", 0),
            "by_category": request.get("category_targets", {}),
            "by_quarter": request.get("quarterly_targets", {}),
            "stretch_goal": request.get("stretch_goal", 0),
            "created_at": datetime.utcnow().isoformat(),
            "created_by": request.get("user_id")
        }
        
        # Store targets
        self.savings_targets[str(year)] = targets
        
        # Calculate required run rate
        remaining_months = 12 - datetime.now().month + 1
        monthly_required = targets["total"] / 12
        remaining_required = targets["total"] * (remaining_months / 12)
        
        # Current pipeline
        pipeline_value = sum(
            i["projected_savings"]
            for i in self.savings_initiatives
            if i["status"] in [SavingsStatus.IDENTIFIED, SavingsStatus.IN_PROGRESS]
        )
        
        return {
            "year": year,
            "annual_target": targets["total"],
            "monthly_required": monthly_required,
            "remaining_required": remaining_required,
            "current_pipeline": pipeline_value,
            "gap_to_target": max(0, remaining_required - pipeline_value),
            "targets_set": True
        }
    
    async def track_savings_progress(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Track progress against savings targets"""
        year = request.get("year", datetime.now().year)
        as_of_date = request.get("as_of_date", datetime.now().isoformat())
        
        # Get targets
        targets = self.savings_targets.get(str(year), {})
        
        if not targets:
            return {
                "error": f"No targets set for year {year}",
                "suggestion": "Use set_targets operation to define savings goals"
            }
        
        # Calculate YTD savings
        ytd_savings = await self.calculate_total_savings({
            "start_date": f"{year}-01-01",
            "end_date": as_of_date
        })
        
        # Calculate progress
        annual_target = targets["total"]
        ytd_realized = ytd_savings["totals"]["total_realized"]
        ytd_projected = ytd_savings["totals"]["total_projected"]
        
        # Time progress
        days_elapsed = (datetime.fromisoformat(as_of_date) - datetime(year, 1, 1)).days
        days_in_year = 365 + (1 if year % 4 == 0 else 0)
        time_progress = days_elapsed / days_in_year * 100
        
        # Performance vs time
        performance_ratio = safe_divide(
            ytd_realized / annual_target * 100,
            time_progress
        ) if time_progress > 0 else 0
        
        # Forecast
        if time_progress > 0:
            run_rate = ytd_realized / (days_elapsed / days_in_year)
            forecast = run_rate
        else:
            forecast = 0
        
        # Pipeline analysis
        pipeline = sum(
            i["projected_savings"]
            for i in self.savings_initiatives
            if i["status"] in [SavingsStatus.IDENTIFIED, SavingsStatus.IN_PROGRESS]
        )
        
        return {
            "year": year,
            "as_of_date": as_of_date,
            "targets": {
                "annual": annual_target,
                "ytd_prorated": annual_target * (time_progress / 100)
            },
            "actual": {
                "realized": ytd_realized,
                "projected": ytd_projected,
                "pipeline": pipeline
            },
            "progress": {
                "vs_annual_target": safe_divide(ytd_realized, annual_target) * 100,
                "vs_ytd_target": safe_divide(ytd_realized, annual_target * (time_progress / 100)) * 100,
                "time_elapsed": time_progress,
                "performance_ratio": performance_ratio
            },
            "forecast": {
                "year_end": forecast,
                "vs_target": safe_divide(forecast, annual_target) * 100,
                "gap": max(0, annual_target - forecast)
            },
            "status": self._get_progress_status(performance_ratio),
            "recommendations": self._generate_progress_recommendations(performance_ratio, pipeline)
        }
    
    async def identify_at_risk_savings(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Identify savings initiatives at risk"""
        risk_factors = []
        at_risk_initiatives = []
        
        for initiative in self.savings_initiatives:
            risks = []
            risk_score = 0
            
            # Check implementation delay
            if initiative["status"] == SavingsStatus.IN_PROGRESS:
                if implementation_date := initiative.get("implementation_date"):
                    planned = datetime.fromisoformat(implementation_date)
                    if datetime.utcnow() > planned:
                        risks.append("Implementation delayed")
                        risk_score += 30
            
            # Check realization rate
            if initiative["status"] == SavingsStatus.IMPLEMENTED:
                if initiative["realized_savings"] < initiative["projected_savings"] * 0.5:
                    risks.append("Low realization rate")
                    risk_score += 40
            
            # Check age of initiative
            created = datetime.fromisoformat(initiative["created_at"])
            age_days = (datetime.utcnow() - created).days
            
            if age_days > 180 and initiative["status"] == SavingsStatus.IDENTIFIED:
                risks.append("Long time in identified status")
                risk_score += 20
            
            # Check confidence level
            if initiative.get("confidence_level", 1) < 0.6:
                risks.append("Low confidence level")
                risk_score += 25
            
            # Add explicit risk factors
            if initiative.get("risk_factors"):
                risks.extend(initiative["risk_factors"])
                risk_score += len(initiative["risk_factors"]) * 10
            
            # Determine if at risk
            if risk_score >= 40 or len(risks) >= 2:
                at_risk_initiatives.append({
                    "initiative_id": initiative["id"],
                    "title": initiative["title"],
                    "projected_savings": initiative["projected_savings"],
                    "risk_score": risk_score,
                    "risk_factors": risks,
                    "recommended_action": self._recommend_risk_mitigation(risks)
                })
        
        # Calculate total at risk
        total_at_risk = sum(i["projected_savings"] for i in at_risk_initiatives)
        
        return {
            "at_risk_count": len(at_risk_initiatives),
            "total_at_risk": total_at_risk,
            "initiatives": at_risk_initiatives,
            "risk_summary": self._summarize_risks(at_risk_initiatives),
            "mitigation_plan": self._create_mitigation_plan(at_risk_initiatives)
        }
    
    async def analyze_initiative_roi(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze ROI for savings initiatives"""
        initiative_id = request.get("initiative_id")
        
        if initiative_id:
            # Single initiative ROI
            initiative = next(
                (i for i in self.savings_initiatives if i["id"] == initiative_id),
                None
            )
            
            if not initiative:
                raise ValidationError(f"Initiative {initiative_id} not found")
            
            roi_analysis = await self.roi_analyzer.analyze_initiative(initiative)
            
            return roi_analysis
        else:
            # Portfolio ROI analysis
            portfolio_analysis = await self.roi_analyzer.analyze_portfolio(
                self.savings_initiatives
            )
            
            return portfolio_analysis
    
    async def export_dashboard_data(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Export data for dashboard visualization"""
        
        # Current month metrics
        current_month = datetime.now().strftime("%Y-%m")
        current_month_savings = await self._get_month_savings(current_month)
        
        # YTD metrics
        ytd_savings = await self.calculate_total_savings({
            "start_date": f"{datetime.now().year}-01-01",
            "end_date": datetime.now().isoformat()
        })
        
        # Progress tracking
        progress = await self.track_savings_progress({})
        
        # At-risk analysis
        at_risk = await self.identify_at_risk_savings({})
        
        # Top performers
        top_performers = sorted(
            [i for i in self.savings_initiatives if i["status"] == SavingsStatus.REALIZED],
            key=lambda x: x["realized_savings"],
            reverse=True
        )[:5]
        
        # Trend data (last 12 months)
        trend_data = await self._get_monthly_trend()
        
        return {
            "kpis": {
                "current_month_realized": current_month_savings["realized"],
                "ytd_realized": ytd_savings["totals"]["total_realized"],
                "ytd_projected": ytd_savings["totals"]["total_projected"],
                "ytd_verified": ytd_savings["totals"]["total_verified"],
                "realization_rate": ytd_savings["realization_rate"],
                "initiatives_count": len(self.savings_initiatives),
                "at_risk_amount": at_risk["total_at_risk"]
            },
            "progress": {
                "vs_target": progress.get("progress", {}).get("vs_annual_target", 0),
                "forecast": progress.get("forecast", {}).get("year_end", 0),
                "status": progress.get("status", "unknown")
            },
            "breakdown": {
                "by_category": ytd_savings["by_category"],
                "by_status": ytd_savings["by_status"],
                "by_type": await self._group_by_savings_type()
            },
            "trends": trend_data,
            "top_performers": [
                {
                    "title": i["title"],
                    "savings": i["realized_savings"],
                    "category": i["category"]
                }
                for i in top_performers
            ],
            "upcoming": await self._get_upcoming_implementations(),
            "alerts": await self._generate_dashboard_alerts()
        }
    
    async def get_savings_summary(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Get high-level savings summary"""
        
        # Calculate all key metrics
        total_savings = await self.calculate_total_savings({})
        progress = await self.track_savings_progress({})
        at_risk = await self.identify_at_risk_savings({})
        
        return {
            "overview": {
                "total_initiatives": len(self.savings_initiatives),
                "total_projected": total_savings["totals"]["total_projected"],
                "total_realized": total_savings["totals"]["total_realized"],
                "total_verified": total_savings["totals"]["total_verified"]
            },
            "performance": {
                "realization_rate": total_savings["realization_rate"],
                "vs_target": progress.get("progress", {}).get("vs_annual_target", 0),
                "forecast_achievement": progress.get("forecast", {}).get("vs_target", 0)
            },
            "risk": {
                "at_risk_count": at_risk["at_risk_count"],
                "at_risk_amount": at_risk["total_at_risk"],
                "risk_percentage": calculate_percentage(
                    at_risk["total_at_risk"],
                    total_savings["totals"]["total_projected"]
                )
            },
            "recommendations": await self._generate_summary_recommendations(
                total_savings,
                progress,
                at_risk
            )
        }
    
    # Helper methods
    
    async def _create_initiative_from_import(self, row: Dict) -> Dict[str, Any]:
        """Create initiative from imported Excel row"""
        return {
            "id": generate_id("sav"),
            "external_id": row.get("id"),
            "title": row.get("title", "Imported Initiative"),
            "description": row.get("description", ""),
            "category": row.get("category", "Other"),
            "savings_type": row.get("type", SavingsType.NEGOTIATED),
            "status": row.get("status", SavingsStatus.IDENTIFIED),
            "created_at": row.get("created_date", datetime.utcnow().isoformat()),
            "baseline_cost": row.get("baseline_cost", 0),
            "new_cost": row.get("new_cost", 0),
            "projected_savings": row.get("projected_savings", 0),
            "realized_savings": row.get("realized_savings", 0),
            "verified_savings": row.get("verified_savings", 0),
            "start_date": row.get("start_date"),
            "end_date": row.get("end_date"),
            "vendor_id": row.get("vendor"),
            "owner": row.get("owner"),
            "confidence_level": row.get("confidence", 0.8),
            "implementation_cost": row.get("implementation_cost", 0),
            "notes": [],
            "documentation": [],
            "risk_factors": []
        }
    
    async def _update_initiative_from_import(self, initiative: Dict, row: Dict):
        """Update existing initiative from imported data"""
        if "realized_savings" in row:
            initiative["realized_savings"] = row["realized_savings"]
        if "verified_savings" in row:
            initiative["verified_savings"] = row["verified_savings"]
        if "status" in row:
            initiative["status"] = row["status"]
    
    async def _calculate_import_summary(self, imported_data: Dict) -> Dict[str, Any]:
        """Calculate summary of imported data"""
        initiatives = imported_data.get("initiatives", [])
        
        return {
            "total_projected": sum(i.get("projected_savings", 0) for i in initiatives),
            "total_realized": sum(i.get("realized_savings", 0) for i in initiatives),
            "categories": list(set(i.get("category", "Other") for i in initiatives)),
            "date_range": {
                "earliest": min((i.get("start_date") for i in initiatives if i.get("start_date")), default=None),
                "latest": max((i.get("end_date") for i in initiatives if i.get("end_date")), default=None)
            }
        }
    
    def _get_next_steps(self, initiative: Dict) -> List[str]:
        """Get recommended next steps for initiative"""
        steps = []
        
        if initiative["status"] == SavingsStatus.IDENTIFIED:
            steps.append("Assign owner and approver")
            steps.append("Develop implementation plan")
            steps.append("Set target dates")
        elif initiative["status"] == SavingsStatus.IN_PROGRESS:
            steps.append("Monitor implementation progress")
            steps.append("Track actual savings")
            steps.append("Document changes and challenges")
        elif initiative["status"] == SavingsStatus.IMPLEMENTED:
            steps.append("Measure realized savings")
            steps.append("Schedule verification")
            steps.append("Document lessons learned")
        elif initiative["status"] == SavingsStatus.REALIZED:
            steps.append("Verify savings with finance")
            steps.append("Update documentation")
            steps.append("Share success story")
        
        return steps
    
    async def _group_by_savings_type(self) -> Dict[str, Any]:
        """Group savings by type"""
        by_type = {}
        
        for initiative in self.savings_initiatives:
            stype = initiative["savings_type"]
            if stype not in by_type:
                by_type[stype] = {
                    "count": 0,
                    "projected": 0,
                    "realized": 0
                }
            by_type[stype]["count"] += 1
            by_type[stype]["projected"] += initiative["projected_savings"]
            by_type[stype]["realized"] += initiative["realized_savings"]
        
        return by_type
    
    async def _get_upcoming_implementations(self) -> List[Dict]:
        """Get upcoming implementation dates"""
        upcoming = []
        
        for initiative in self.savings_initiatives:
            if initiative["status"] in [SavingsStatus.IDENTIFIED, SavingsStatus.IN_PROGRESS]:
                if impl_date := initiative.get("implementation_date"):
                    upcoming.append({
                        "initiative_id": initiative["id"],
                        "title": initiative["title"],
                        "implementation_date": impl_date,
                        "projected_savings": initiative["projected_savings"]
                    })
        
        return sorted(upcoming, key=lambda x: x["implementation_date"])[:5]
    
    async def _format_initiative_details(self, initiative: Dict) -> Dict[str, Any]:
        """Format initiative for detailed report"""
        return {
            "id": initiative["id"],
            "title": initiative["title"],
            "category": initiative["category"],
            "status": initiative["status"],
            "financial": {
                "projected": initiative["projected_savings"],
                "realized": initiative["realized_savings"],
                "verified": initiative["verified_savings"],
                "realization_rate": safe_divide(
                    initiative["realized_savings"],
                    initiative["projected_savings"]
                ) * 100
            },
            "timeline": {
                "created": initiative["created_at"],
                "start": initiative.get("start_date"),
                "implementation": initiative.get("implementation_date"),
                "verification": initiative.get("verification_date")
            },
            "ownership": {
                "owner": initiative.get("owner"),
                "approver": initiative.get("approver"),
                "created_by": initiative.get("created_by")
            }
        }
    
    def _get_progress_status(self, performance_ratio: float) -> str:
        """Determine progress status"""
        if performance_ratio >= 1.1:
            return "ahead_of_target"
        elif performance_ratio >= 0.9:
            return "on_track"
        elif performance_ratio >= 0.7:
            return "behind_target"
        else:
            return "at_risk"
    
    def _generate_progress_recommendations(self, performance_ratio: float, 
                                          pipeline: float) -> List[str]:
        """Generate recommendations based on progress"""
        recommendations = []
        
        if performance_ratio < 0.9:
            recommendations.append("Accelerate implementation of identified initiatives")
            recommendations.append("Identify additional savings opportunities")
        
        if pipeline < 1000000:  # Less than $1M in pipeline
            recommendations.append("Build stronger savings pipeline")
            recommendations.append("Conduct spend analysis to find opportunities")
        
        if performance_ratio > 1.1:
            recommendations.append("Consider setting stretch targets")
            recommendations.append("Document and share best practices")
        
        return recommendations
    
    def _recommend_risk_mitigation(self, risks: List[str]) -> str:
        """Recommend mitigation action based on risks"""
        if "Implementation delayed" in risks:
            return "Escalate to management and establish revised timeline"
        elif "Low realization rate" in risks:
            return "Review assumptions and adjust forecast"
        elif "Long time in identified status" in risks:
            return "Assign owner and create implementation plan"
        else:
            return "Review and address risk factors"
    
    def _summarize_risks(self, at_risk_initiatives: List[Dict]) -> Dict[str, Any]:
        """Summarize risk factors"""
        risk_factors = {}
        
        for initiative in at_risk_initiatives:
            for risk in initiative["risk_factors"]:
                risk_factors[risk] = risk_factors.get(risk, 0) + 1
        
        return {
            "top_risks": sorted(risk_factors.items(), key=lambda x: x[1], reverse=True)[:5],
            "total_risk_factors": sum(risk_factors.values())
        }
    
    def _create_mitigation_plan(self, at_risk_initiatives: List[Dict]) -> List[Dict]:
        """Create mitigation plan for at-risk initiatives"""
        plan = []
        
        # Group by risk type
        by_risk_type = {}
        for initiative in at_risk_initiatives:
            primary_risk = initiative["risk_factors"][0] if initiative["risk_factors"] else "Unknown"
            if primary_risk not in by_risk_type:
                by_risk_type[primary_risk] = []
            by_risk_type[primary_risk].append(initiative)
        
        for risk_type, initiatives in by_risk_type.items():
            plan.append({
                "risk_type": risk_type,
                "affected_initiatives": len(initiatives),
                "total_amount": sum(i["projected_savings"] for i in initiatives),
                "action": self._recommend_risk_mitigation([risk_type]),
                "priority": "high" if sum(i["projected_savings"] for i in initiatives) > 100000 else "medium"
            })
        
        return sorted(plan, key=lambda x: x["total_amount"], reverse=True)
    
    async def _get_month_savings(self, month: str) -> Dict[str, float]:
        """Get savings for a specific month"""
        realized = 0
        projected = 0
        
        for initiative in self.savings_initiatives:
            if initiative.get("implementation_date"):
                impl_month = initiative["implementation_date"][:7]
                if impl_month == month:
                    projected += initiative["projected_savings"] / 12  # Monthly portion
                    realized += initiative["realized_savings"] / 12
        
        return {"realized": realized, "projected": projected}
    
    async def _get_monthly_trend(self) -> List[Dict]:
        """Get monthly savings trend"""
        trend = []
        
        for i in range(11, -1, -1):
            month_date = datetime.now() - timedelta(days=i * 30)
            month_str = month_date.strftime("%Y-%m")
            
            month_savings = await self._get_month_savings(month_str)
            trend.append({
                "month": month_str,
                "realized": month_savings["realized"],
                "projected": month_savings["projected"]
            })
        
        return trend
    
    async def _generate_dashboard_alerts(self) -> List[Dict]:
        """Generate alerts for dashboard"""
        alerts = []
        
        # Check realization rate
        totals = await self.calculate_total_savings({})
        if totals["realization_rate"] < 70:
            alerts.append({
                "type": "warning",
                "message": f"Realization rate at {totals['realization_rate']:.1f}% - below target"
            })
        
        # Check at-risk amount
        at_risk = await self.identify_at_risk_savings({})
        if at_risk["total_at_risk"] > 100000:
            alerts.append({
                "type": "warning",
                "message": f"{format_currency(at_risk['total_at_risk'])} in savings at risk"
            })
        
        return alerts
    
    async def _generate_summary_recommendations(self, total_savings: Dict,
                                               progress: Dict,
                                               at_risk: Dict) -> List[str]:
        """Generate summary recommendations"""
        recommendations = []
        
        if total_savings["realization_rate"] < 80:
            recommendations.append("Focus on improving realization rate through better tracking")
        
        if at_risk["at_risk_count"] > 5:
            recommendations.append(f"Address {at_risk['at_risk_count']} at-risk initiatives immediately")
        
        if progress.get("forecast", {}).get("gap", 0) > 0:
            gap = progress["forecast"]["gap"]
            recommendations.append(f"Identify additional {format_currency(gap)} in savings to meet target")
        
        return recommendations[:5]