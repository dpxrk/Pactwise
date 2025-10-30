"""Automated Vendor Onboarding Workflow Engine"""

import asyncio
import json
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from enum import Enum

from integrations.databases.models import Vendor
from shared.utils import generate_id


class OnboardingStatus(str, Enum):
    """Onboarding workflow status"""
    INITIATED = "initiated"
    DOCUMENT_COLLECTION = "document_collection"
    VERIFICATION = "verification"
    RISK_ASSESSMENT = "risk_assessment"
    APPROVAL_PENDING = "approval_pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    COMPLETED = "completed"


class OnboardingStep(str, Enum):
    """Onboarding workflow steps"""
    INITIAL_SUBMISSION = "initial_submission"
    DOCUMENT_UPLOAD = "document_upload"
    KYC_VERIFICATION = "kyc_verification"
    FINANCIAL_CHECK = "financial_check"
    COMPLIANCE_CHECK = "compliance_check"
    RISK_ASSESSMENT = "risk_assessment"
    REFERENCE_CHECK = "reference_check"
    SITE_VISIT = "site_visit"
    CONTRACT_NEGOTIATION = "contract_negotiation"
    SYSTEM_SETUP = "system_setup"
    TRAINING = "training"
    FINAL_APPROVAL = "final_approval"


class VendorOnboardingWorkflow:
    """
    Comprehensive vendor onboarding workflow with:
    - Automated document collection
    - Multi-stage verification
    - Parallel processing
    - SLA tracking
    - Automated notifications
    """
    
    def __init__(self):
        # Workflow configuration
        self.workflow_templates = {
            "standard": {
                "steps": [
                    OnboardingStep.INITIAL_SUBMISSION,
                    OnboardingStep.DOCUMENT_UPLOAD,
                    OnboardingStep.KYC_VERIFICATION,
                    OnboardingStep.FINANCIAL_CHECK,
                    OnboardingStep.COMPLIANCE_CHECK,
                    OnboardingStep.RISK_ASSESSMENT,
                    OnboardingStep.REFERENCE_CHECK,
                    OnboardingStep.SYSTEM_SETUP,
                    OnboardingStep.FINAL_APPROVAL
                ],
                "sla_days": 14
            },
            "expedited": {
                "steps": [
                    OnboardingStep.INITIAL_SUBMISSION,
                    OnboardingStep.DOCUMENT_UPLOAD,
                    OnboardingStep.KYC_VERIFICATION,
                    OnboardingStep.RISK_ASSESSMENT,
                    OnboardingStep.SYSTEM_SETUP,
                    OnboardingStep.FINAL_APPROVAL
                ],
                "sla_days": 7
            },
            "high_risk": {
                "steps": [
                    OnboardingStep.INITIAL_SUBMISSION,
                    OnboardingStep.DOCUMENT_UPLOAD,
                    OnboardingStep.KYC_VERIFICATION,
                    OnboardingStep.FINANCIAL_CHECK,
                    OnboardingStep.COMPLIANCE_CHECK,
                    OnboardingStep.RISK_ASSESSMENT,
                    OnboardingStep.REFERENCE_CHECK,
                    OnboardingStep.SITE_VISIT,
                    OnboardingStep.CONTRACT_NEGOTIATION,
                    OnboardingStep.SYSTEM_SETUP,
                    OnboardingStep.TRAINING,
                    OnboardingStep.FINAL_APPROVAL
                ],
                "sla_days": 30
            }
        }
        
        # Step dependencies
        self.step_dependencies = {
            OnboardingStep.KYC_VERIFICATION: [OnboardingStep.DOCUMENT_UPLOAD],
            OnboardingStep.FINANCIAL_CHECK: [OnboardingStep.DOCUMENT_UPLOAD],
            OnboardingStep.COMPLIANCE_CHECK: [OnboardingStep.DOCUMENT_UPLOAD],
            OnboardingStep.RISK_ASSESSMENT: [OnboardingStep.KYC_VERIFICATION],
            OnboardingStep.REFERENCE_CHECK: [OnboardingStep.KYC_VERIFICATION],
            OnboardingStep.SITE_VISIT: [OnboardingStep.RISK_ASSESSMENT],
            OnboardingStep.CONTRACT_NEGOTIATION: [OnboardingStep.RISK_ASSESSMENT],
            OnboardingStep.SYSTEM_SETUP: [OnboardingStep.FINAL_APPROVAL],
            OnboardingStep.FINAL_APPROVAL: []  # Depends on all previous steps
        }
        
        # Step SLAs (in hours)
        self.step_slas = {
            OnboardingStep.INITIAL_SUBMISSION: 24,
            OnboardingStep.DOCUMENT_UPLOAD: 48,
            OnboardingStep.KYC_VERIFICATION: 24,
            OnboardingStep.FINANCIAL_CHECK: 48,
            OnboardingStep.COMPLIANCE_CHECK: 48,
            OnboardingStep.RISK_ASSESSMENT: 24,
            OnboardingStep.REFERENCE_CHECK: 72,
            OnboardingStep.SITE_VISIT: 120,
            OnboardingStep.CONTRACT_NEGOTIATION: 72,
            OnboardingStep.SYSTEM_SETUP: 24,
            OnboardingStep.TRAINING: 48,
            OnboardingStep.FINAL_APPROVAL: 24
        }
        
        # Active workflows
        self.active_workflows = {}
    
    async def start_workflow(
        self,
        vendor: Vendor,
        risk_level: str = "low"
    ) -> Dict[str, Any]:
        """Start vendor onboarding workflow"""
        
        # Select workflow template based on risk
        if risk_level == "critical" or risk_level == "high":
            template_name = "high_risk"
        elif vendor.metadata.get("expedited"):
            template_name = "expedited"
        else:
            template_name = "standard"
        
        template = self.workflow_templates[template_name]
        
        # Create workflow instance
        workflow_id = generate_id("WFL")
        workflow = {
            "workflow_id": workflow_id,
            "vendor_id": vendor.id,
            "vendor_name": vendor.name,
            "template": template_name,
            "status": OnboardingStatus.INITIATED,
            "risk_level": risk_level,
            "steps": self._initialize_steps(template["steps"]),
            "started_at": datetime.utcnow().isoformat(),
            "sla_date": (datetime.utcnow() + timedelta(days=template["sla_days"])).isoformat(),
            "completed_steps": [],
            "current_steps": [OnboardingStep.INITIAL_SUBMISSION],
            "blockers": [],
            "metadata": {
                "vendor_category": vendor.category,
                "vendor_type": vendor.vendor_type,
                "priority": "high" if risk_level in ["high", "critical"] else "normal"
            }
        }
        
        # Store workflow
        self.active_workflows[workflow_id] = workflow
        
        # Start processing
        asyncio.create_task(self._process_workflow(workflow_id))
        
        return {
            "workflow_id": workflow_id,
            "status": "started",
            "template": template_name,
            "estimated_completion": workflow["sla_date"],
            "next_steps": self._get_next_actions(workflow),
            "tracking_url": f"/workflows/{workflow_id}"
        }
    
    async def get_workflow_status(self, workflow_id: str) -> Dict[str, Any]:
        """Get current workflow status"""
        
        workflow = self.active_workflows.get(workflow_id)
        if not workflow:
            return {"error": "Workflow not found"}
        
        # Calculate progress
        total_steps = len(workflow["steps"])
        completed_steps = len(workflow["completed_steps"])
        progress = (completed_steps / total_steps) * 100 if total_steps > 0 else 0
        
        # Check SLA status
        sla_date = datetime.fromisoformat(workflow["sla_date"])
        is_overdue = datetime.utcnow() > sla_date
        
        return {
            "workflow_id": workflow_id,
            "vendor_id": workflow["vendor_id"],
            "vendor_name": workflow["vendor_name"],
            "status": workflow["status"],
            "progress": round(progress, 1),
            "completed_steps": workflow["completed_steps"],
            "current_steps": workflow["current_steps"],
            "pending_steps": [s["step"] for s in workflow["steps"].values() if s["status"] == "pending"],
            "blockers": workflow["blockers"],
            "sla_date": workflow["sla_date"],
            "is_overdue": is_overdue,
            "time_remaining": self._calculate_time_remaining(sla_date),
            "next_actions": self._get_next_actions(workflow)
        }
    
    async def update_step(
        self,
        workflow_id: str,
        step: OnboardingStep,
        status: str,
        data: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Update workflow step status"""
        
        workflow = self.active_workflows.get(workflow_id)
        if not workflow:
            return {"error": "Workflow not found"}
        
        # Update step status
        if step in workflow["steps"]:
            workflow["steps"][step]["status"] = status
            workflow["steps"][step]["completed_at"] = datetime.utcnow().isoformat() if status == "completed" else None
            if data:
                workflow["steps"][step]["data"] = data
            
            # Update workflow lists
            if status == "completed":
                if step not in workflow["completed_steps"]:
                    workflow["completed_steps"].append(step)
                if step in workflow["current_steps"]:
                    workflow["current_steps"].remove(step)
                
                # Activate dependent steps
                await self._activate_next_steps(workflow, step)
            
            elif status == "failed":
                workflow["blockers"].append({
                    "step": step,
                    "reason": data.get("reason") if data else "Step failed",
                    "timestamp": datetime.utcnow().isoformat()
                })
                workflow["status"] = OnboardingStatus.APPROVAL_PENDING
            
            # Check if workflow is complete
            if self._is_workflow_complete(workflow):
                workflow["status"] = OnboardingStatus.COMPLETED
                workflow["completed_at"] = datetime.utcnow().isoformat()
        
        return {
            "success": True,
            "workflow_id": workflow_id,
            "step": step,
            "new_status": status,
            "workflow_status": workflow["status"],
            "next_steps": workflow["current_steps"]
        }
    
    def _initialize_steps(self, step_list: List[OnboardingStep]) -> Dict[str, Dict]:
        """Initialize workflow steps"""
        
        steps = {}
        for step in step_list:
            steps[step] = {
                "step": step,
                "status": "pending",
                "started_at": None,
                "completed_at": None,
                "sla_hours": self.step_slas.get(step, 24),
                "assigned_to": None,
                "data": {},
                "validation_status": None
            }
        
        return steps
    
    async def _process_workflow(self, workflow_id: str):
        """Process workflow asynchronously"""
        
        workflow = self.active_workflows.get(workflow_id)
        if not workflow:
            return
        
        workflow["status"] = OnboardingStatus.DOCUMENT_COLLECTION
        
        # Simulate workflow processing
        for step_name in workflow["current_steps"]:
            step = workflow["steps"][step_name]
            
            # Mark step as in progress
            step["status"] = "in_progress"
            step["started_at"] = datetime.utcnow().isoformat()
            
            # Simulate step execution
            await asyncio.sleep(2)  # Simulate processing time
            
            # Auto-complete for demo (in production, would wait for actual completion)
            await self.update_step(workflow_id, step_name, "completed", {"result": "success"})
    
    async def _activate_next_steps(self, workflow: Dict, completed_step: OnboardingStep):
        """Activate steps that depend on the completed step"""
        
        for step_name, step_data in workflow["steps"].items():
            if step_data["status"] == "pending":
                dependencies = self.step_dependencies.get(step_name, [])
                
                # Check if all dependencies are completed
                if all(dep in workflow["completed_steps"] for dep in dependencies):
                    if step_name not in workflow["current_steps"]:
                        workflow["current_steps"].append(step_name)
                        step_data["status"] = "ready"
                        step_data["started_at"] = datetime.utcnow().isoformat()
    
    def _is_workflow_complete(self, workflow: Dict) -> bool:
        """Check if workflow is complete"""
        
        required_steps = [s for s in workflow["steps"] if workflow["steps"][s].get("required", True)]
        completed_required = all(s in workflow["completed_steps"] for s in required_steps)
        
        return completed_required and len(workflow["current_steps"]) == 0
    
    def _get_next_actions(self, workflow: Dict) -> List[Dict[str, Any]]:
        """Get next required actions"""
        
        actions = []
        
        for step_name in workflow["current_steps"]:
            step = workflow["steps"][step_name]
            actions.append({
                "step": step_name,
                "description": self._get_step_description(step_name),
                "assigned_to": step.get("assigned_to", "pending_assignment"),
                "sla_hours": step["sla_hours"],
                "priority": "high" if workflow["metadata"]["priority"] == "high" else "normal"
            })
        
        # Add blocker resolution actions
        for blocker in workflow["blockers"]:
            actions.append({
                "step": "resolve_blocker",
                "description": f"Resolve: {blocker['reason']}",
                "assigned_to": "compliance_team",
                "sla_hours": 24,
                "priority": "urgent"
            })
        
        return actions
    
    def _get_step_description(self, step: OnboardingStep) -> str:
        """Get human-readable step description"""
        
        descriptions = {
            OnboardingStep.INITIAL_SUBMISSION: "Complete initial vendor registration form",
            OnboardingStep.DOCUMENT_UPLOAD: "Upload required documents (licenses, certificates, insurance)",
            OnboardingStep.KYC_VERIFICATION: "Complete Know Your Customer verification",
            OnboardingStep.FINANCIAL_CHECK: "Perform financial stability assessment",
            OnboardingStep.COMPLIANCE_CHECK: "Verify regulatory compliance",
            OnboardingStep.RISK_ASSESSMENT: "Conduct comprehensive risk assessment",
            OnboardingStep.REFERENCE_CHECK: "Contact and verify vendor references",
            OnboardingStep.SITE_VISIT: "Conduct on-site facility inspection",
            OnboardingStep.CONTRACT_NEGOTIATION: "Negotiate terms and conditions",
            OnboardingStep.SYSTEM_SETUP: "Configure vendor in procurement systems",
            OnboardingStep.TRAINING: "Complete vendor training program",
            OnboardingStep.FINAL_APPROVAL: "Obtain final approval from management"
        }
        
        return descriptions.get(step, "Complete workflow step")
    
    def _calculate_time_remaining(self, sla_date: datetime) -> str:
        """Calculate time remaining until SLA"""
        
        remaining = sla_date - datetime.utcnow()
        
        if remaining.total_seconds() < 0:
            return "Overdue"
        
        days = remaining.days
        hours = remaining.seconds // 3600
        
        if days > 0:
            return f"{days} days, {hours} hours"
        else:
            return f"{hours} hours"
    
    async def expedite_workflow(self, workflow_id: str, reason: str) -> Dict[str, Any]:
        """Expedite workflow processing"""
        
        workflow = self.active_workflows.get(workflow_id)
        if not workflow:
            return {"error": "Workflow not found"}
        
        # Update priority
        workflow["metadata"]["priority"] = "urgent"
        workflow["metadata"]["expedited"] = True
        workflow["metadata"]["expedite_reason"] = reason
        
        # Reduce SLAs by 50%
        for step in workflow["steps"].values():
            step["sla_hours"] = step["sla_hours"] // 2
        
        # Update overall SLA
        new_sla = datetime.utcnow() + timedelta(days=3)  # 3 days for expedited
        workflow["sla_date"] = new_sla.isoformat()
        
        return {
            "success": True,
            "workflow_id": workflow_id,
            "new_priority": "urgent",
            "new_sla": new_sla.isoformat(),
            "message": "Workflow expedited successfully"
        }
    
    async def cancel_workflow(self, workflow_id: str, reason: str) -> Dict[str, Any]:
        """Cancel onboarding workflow"""
        
        workflow = self.active_workflows.get(workflow_id)
        if not workflow:
            return {"error": "Workflow not found"}
        
        workflow["status"] = OnboardingStatus.REJECTED
        workflow["cancelled_at"] = datetime.utcnow().isoformat()
        workflow["cancellation_reason"] = reason
        
        # Clean up
        del self.active_workflows[workflow_id]
        
        return {
            "success": True,
            "workflow_id": workflow_id,
            "status": "cancelled",
            "reason": reason
        }
    
    async def get_workflow_metrics(self) -> Dict[str, Any]:
        """Get workflow performance metrics"""
        
        active = len([w for w in self.active_workflows.values() if w["status"] not in [OnboardingStatus.COMPLETED, OnboardingStatus.REJECTED]])
        completed = len([w for w in self.active_workflows.values() if w["status"] == OnboardingStatus.COMPLETED])
        rejected = len([w for w in self.active_workflows.values() if w["status"] == OnboardingStatus.REJECTED])
        
        # Calculate average completion time
        completion_times = []
        for workflow in self.active_workflows.values():
            if workflow["status"] == OnboardingStatus.COMPLETED and "completed_at" in workflow:
                start = datetime.fromisoformat(workflow["started_at"])
                end = datetime.fromisoformat(workflow["completed_at"])
                completion_times.append((end - start).days)
        
        avg_completion = sum(completion_times) / len(completion_times) if completion_times else 0
        
        return {
            "active_workflows": active,
            "completed_workflows": completed,
            "rejected_workflows": rejected,
            "total_workflows": len(self.active_workflows),
            "average_completion_days": round(avg_completion, 1),
            "sla_compliance_rate": self._calculate_sla_compliance(),
            "bottleneck_steps": self._identify_bottlenecks()
        }
    
    def _calculate_sla_compliance(self) -> float:
        """Calculate SLA compliance rate"""
        
        compliant = 0
        total = 0
        
        for workflow in self.active_workflows.values():
            if workflow["status"] == OnboardingStatus.COMPLETED:
                total += 1
                sla_date = datetime.fromisoformat(workflow["sla_date"])
                completed_date = datetime.fromisoformat(workflow.get("completed_at", workflow["sla_date"]))
                
                if completed_date <= sla_date:
                    compliant += 1
        
        return (compliant / total * 100) if total > 0 else 100.0
    
    def _identify_bottlenecks(self) -> List[str]:
        """Identify workflow bottleneck steps"""
        
        step_durations = {}
        
        for workflow in self.active_workflows.values():
            for step_name, step_data in workflow["steps"].items():
                if step_data["status"] == "completed" and step_data.get("started_at") and step_data.get("completed_at"):
                    start = datetime.fromisoformat(step_data["started_at"])
                    end = datetime.fromisoformat(step_data["completed_at"])
                    duration = (end - start).total_seconds() / 3600  # Hours
                    
                    if step_name not in step_durations:
                        step_durations[step_name] = []
                    step_durations[step_name].append(duration)
        
        # Calculate average durations
        avg_durations = {}
        for step, durations in step_durations.items():
            avg_durations[step] = sum(durations) / len(durations) if durations else 0
        
        # Identify bottlenecks (steps taking longer than SLA)
        bottlenecks = []
        for step, avg_duration in avg_durations.items():
            sla = self.step_slas.get(step, 24)
            if avg_duration > sla:
                bottlenecks.append(step)
        
        return bottlenecks