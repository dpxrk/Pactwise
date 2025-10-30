"""RFQ/RFP Agent for Managing Competitive Bidding Processes"""

import asyncio
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
import uuid
import json
from enum import Enum

from agents.base_agent import BaseAgent, AgentResponse, AgentPriority
from utils.logging_config import get_logger
from utils.exceptions import ValidationError, AgentExecutionError
from utils.decorators import measure_execution_time, cache_result, audit_log
from utils.common import (
    generate_id, format_currency, calculate_percentage, 
    normalize_string, sanitize_filename
)

from .bid_evaluator import BidEvaluator
from .document_generator import RFPDocumentGenerator
from .vendor_selector import VendorSelector


class RFPStatus(str, Enum):
    """RFP/RFQ Status"""
    DRAFT = "draft"
    PUBLISHED = "published"
    QUESTIONS = "questions"
    BIDDING = "bidding"
    EVALUATION = "evaluation"
    AWARDED = "awarded"
    CANCELLED = "cancelled"
    CLOSED = "closed"


class BidStatus(str, Enum):
    """Bid Status"""
    INVITED = "invited"
    ACKNOWLEDGED = "acknowledged"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    SHORTLISTED = "shortlisted"
    REJECTED = "rejected"
    AWARDED = "awarded"


class RFQRFPAgent(BaseAgent):
    """Agent for managing RFQ/RFP processes"""
    
    def __init__(self, **kwargs):
        super().__init__(agent_name="rfq_rfp", **kwargs)
        
        # Initialize sub-components
        self.bid_evaluator = BidEvaluator()
        self.document_generator = RFPDocumentGenerator()
        self.vendor_selector = VendorSelector()
        
        # Configuration
        self.config.update({
            "min_vendors_rfq": 3,
            "min_vendors_rfp": 5,
            "max_vendors_invited": 20,
            "default_response_days": 14,
            "default_qa_days": 7,
            "auto_extend_threshold": 0.3,  # Extend if < 30% responses
            "min_bid_score": 60,  # Minimum score to qualify
            "weight_price": 0.4,
            "weight_quality": 0.3,
            "weight_delivery": 0.15,
            "weight_experience": 0.15
        })
        
        # In-memory storage (would be database in production)
        self.rfps = {}
        self.bids = {}
        self.questions = {}
        
        self.logger.info("RFQ/RFP Agent initialized")
    
    async def validate_request(self, request: Dict[str, Any]) -> Tuple[bool, Optional[List[str]]]:
        """Validate RFQ/RFP request"""
        errors = []
        
        operation = request.get("operation")
        
        if not operation:
            errors.append("Operation type is required")
            return False, errors
        
        valid_operations = [
            "create_rfp", "create_rfq", "publish_rfp", "invite_vendors",
            "submit_question", "answer_question", "submit_bid", "evaluate_bids",
            "select_vendor", "get_rfp_status", "extend_deadline", "cancel_rfp",
            "generate_comparison", "finalize_award"
        ]
        
        if operation not in valid_operations:
            errors.append(f"Invalid operation: {operation}")
        
        # Operation-specific validation
        if operation in ["create_rfp", "create_rfq"]:
            if not request.get("title"):
                errors.append("Title is required")
            if not request.get("requirements"):
                errors.append("Requirements are required")
            if not request.get("evaluation_criteria"):
                errors.append("Evaluation criteria are required")
        
        elif operation == "submit_bid":
            if not request.get("rfp_id"):
                errors.append("RFP ID is required")
            if not request.get("vendor_id"):
                errors.append("Vendor ID is required")
            if not request.get("bid_data"):
                errors.append("Bid data is required")
        
        elif operation == "evaluate_bids":
            if not request.get("rfp_id"):
                errors.append("RFP ID is required")
        
        return len(errors) == 0, errors if errors else None
    
    @measure_execution_time()
    async def process_request(self, request: Dict[str, Any]) -> AgentResponse:
        """Process RFQ/RFP request"""
        operation = request.get("operation")
        
        try:
            self.logger.info(f"Processing {operation} request")
            
            result = None
            
            if operation == "create_rfp":
                result = await self.create_rfp(request)
            
            elif operation == "create_rfq":
                result = await self.create_rfq(request)
            
            elif operation == "publish_rfp":
                result = await self.publish_rfp(request)
            
            elif operation == "invite_vendors":
                result = await self.invite_vendors(request)
            
            elif operation == "submit_question":
                result = await self.submit_question(request)
            
            elif operation == "answer_question":
                result = await self.answer_question(request)
            
            elif operation == "submit_bid":
                result = await self.submit_bid(request)
            
            elif operation == "evaluate_bids":
                result = await self.evaluate_bids(request)
            
            elif operation == "select_vendor":
                result = await self.select_vendor(request)
            
            elif operation == "get_rfp_status":
                result = await self.get_rfp_status(request)
            
            elif operation == "extend_deadline":
                result = await self.extend_deadline(request)
            
            elif operation == "cancel_rfp":
                result = await self.cancel_rfp(request)
            
            elif operation == "generate_comparison":
                result = await self.generate_bid_comparison(request)
            
            elif operation == "finalize_award":
                result = await self.finalize_award(request)
            
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
    
    @audit_log(action="create_rfp", entity_type="rfp")
    async def create_rfp(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new RFP"""
        rfp_id = generate_id("rfp")
        
        # Generate RFP document
        document = await self.document_generator.generate_rfp_document(
            title=request["title"],
            requirements=request["requirements"],
            evaluation_criteria=request["evaluation_criteria"],
            timeline=request.get("timeline", self._generate_default_timeline()),
            terms=request.get("terms", {}),
            attachments=request.get("attachments", [])
        )
        
        # Create RFP record
        rfp = {
            "id": rfp_id,
            "title": request["title"],
            "type": "RFP",
            "status": RFPStatus.DRAFT,
            "requirements": request["requirements"],
            "evaluation_criteria": request["evaluation_criteria"],
            "timeline": request.get("timeline", self._generate_default_timeline()),
            "document": document,
            "created_by": request.get("user_id"),
            "created_at": datetime.utcnow().isoformat(),
            "response_deadline": (datetime.utcnow() + timedelta(
                days=request.get("response_days", self.config["default_response_days"])
            )).isoformat(),
            "qa_deadline": (datetime.utcnow() + timedelta(
                days=request.get("qa_days", self.config["default_qa_days"])
            )).isoformat(),
            "estimated_value": request.get("estimated_value"),
            "category": request.get("category"),
            "invited_vendors": [],
            "received_bids": [],
            "questions": [],
            "evaluation_weights": {
                "price": request.get("weight_price", self.config["weight_price"]),
                "quality": request.get("weight_quality", self.config["weight_quality"]),
                "delivery": request.get("weight_delivery", self.config["weight_delivery"]),
                "experience": request.get("weight_experience", self.config["weight_experience"])
            }
        }
        
        # Store RFP
        self.rfps[rfp_id] = rfp
        
        # Identify potential vendors
        potential_vendors = await self.vendor_selector.identify_vendors(
            category=request.get("category"),
            requirements=request["requirements"],
            estimated_value=request.get("estimated_value")
        )
        
        return {
            "rfp_id": rfp_id,
            "status": RFPStatus.DRAFT,
            "document_url": document["url"],
            "potential_vendors": potential_vendors,
            "timeline": rfp["timeline"],
            "next_steps": [
                "Review and finalize RFP document",
                "Select vendors to invite",
                "Publish RFP"
            ]
        }
    
    async def create_rfq(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new RFQ (simpler than RFP)"""
        rfq_id = generate_id("rfq")
        
        # Generate RFQ document (simpler than RFP)
        document = await self.document_generator.generate_rfq_document(
            items=request["requirements"].get("items", []),
            quantities=request["requirements"].get("quantities", {}),
            delivery_date=request.get("delivery_date"),
            terms=request.get("terms", {})
        )
        
        # Create RFQ record
        rfq = {
            "id": rfq_id,
            "title": request["title"],
            "type": "RFQ",
            "status": RFPStatus.DRAFT,
            "requirements": request["requirements"],
            "evaluation_criteria": request.get("evaluation_criteria", {"price": 1.0}),
            "document": document,
            "created_by": request.get("user_id"),
            "created_at": datetime.utcnow().isoformat(),
            "response_deadline": (datetime.utcnow() + timedelta(
                days=request.get("response_days", 7)  # RFQs typically shorter
            )).isoformat(),
            "invited_vendors": [],
            "received_bids": []
        }
        
        # Store RFQ
        self.rfps[rfq_id] = rfq
        
        return {
            "rfq_id": rfq_id,
            "status": RFPStatus.DRAFT,
            "document_url": document["url"],
            "response_deadline": rfq["response_deadline"]
        }
    
    async def publish_rfp(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Publish RFP and notify vendors"""
        rfp_id = request["rfp_id"]
        
        if rfp_id not in self.rfps:
            raise ValidationError(f"RFP {rfp_id} not found")
        
        rfp = self.rfps[rfp_id]
        
        if rfp["status"] != RFPStatus.DRAFT:
            raise ValidationError(f"RFP must be in DRAFT status to publish")
        
        # Update status
        rfp["status"] = RFPStatus.PUBLISHED
        rfp["published_at"] = datetime.utcnow().isoformat()
        
        # Auto-invite vendors if specified
        if request.get("auto_invite", True):
            vendor_ids = request.get("vendor_ids", [])
            
            if not vendor_ids:
                # Auto-select vendors
                potential_vendors = await self.vendor_selector.identify_vendors(
                    category=rfp.get("category"),
                    requirements=rfp["requirements"],
                    estimated_value=rfp.get("estimated_value")
                )
                vendor_ids = [v["vendor_id"] for v in potential_vendors[:self.config["max_vendors_invited"]]]
            
            # Invite vendors
            for vendor_id in vendor_ids:
                await self._invite_vendor(rfp_id, vendor_id)
        
        # Publish event
        await self.publish_event(
            event_type="rfp_published",
            data={
                "rfp_id": rfp_id,
                "title": rfp["title"],
                "deadline": rfp["response_deadline"]
            }
        )
        
        return {
            "rfp_id": rfp_id,
            "status": RFPStatus.PUBLISHED,
            "published_at": rfp["published_at"],
            "invited_vendors": len(rfp["invited_vendors"]),
            "response_deadline": rfp["response_deadline"],
            "qa_deadline": rfp.get("qa_deadline")
        }
    
    async def invite_vendors(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Invite additional vendors to RFP"""
        rfp_id = request["rfp_id"]
        vendor_ids = request["vendor_ids"]
        
        if rfp_id not in self.rfps:
            raise ValidationError(f"RFP {rfp_id} not found")
        
        rfp = self.rfps[rfp_id]
        
        invited = []
        already_invited = []
        
        for vendor_id in vendor_ids:
            if vendor_id not in rfp["invited_vendors"]:
                await self._invite_vendor(rfp_id, vendor_id)
                invited.append(vendor_id)
            else:
                already_invited.append(vendor_id)
        
        return {
            "rfp_id": rfp_id,
            "newly_invited": invited,
            "already_invited": already_invited,
            "total_invited": len(rfp["invited_vendors"])
        }
    
    async def submit_question(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Submit a question about RFP"""
        rfp_id = request["rfp_id"]
        
        if rfp_id not in self.rfps:
            raise ValidationError(f"RFP {rfp_id} not found")
        
        rfp = self.rfps[rfp_id]
        
        # Check if in Q&A period
        if rfp.get("qa_deadline"):
            if datetime.utcnow() > datetime.fromisoformat(rfp["qa_deadline"]):
                raise ValidationError("Q&A period has ended")
        
        question_id = generate_id("q")
        
        question = {
            "id": question_id,
            "rfp_id": rfp_id,
            "vendor_id": request["vendor_id"],
            "question": request["question"],
            "submitted_at": datetime.utcnow().isoformat(),
            "answer": None,
            "answered_at": None,
            "is_public": request.get("is_public", True)
        }
        
        # Store question
        if rfp_id not in self.questions:
            self.questions[rfp_id] = []
        self.questions[rfp_id].append(question)
        
        rfp["questions"].append(question_id)
        
        return {
            "question_id": question_id,
            "rfp_id": rfp_id,
            "status": "submitted",
            "will_be_public": question["is_public"]
        }
    
    async def answer_question(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Answer a vendor question"""
        rfp_id = request["rfp_id"]
        question_id = request["question_id"]
        
        if rfp_id not in self.questions:
            raise ValidationError(f"No questions for RFP {rfp_id}")
        
        question = next((q for q in self.questions[rfp_id] if q["id"] == question_id), None)
        
        if not question:
            raise ValidationError(f"Question {question_id} not found")
        
        # Update question
        question["answer"] = request["answer"]
        question["answered_at"] = datetime.utcnow().isoformat()
        question["answered_by"] = request.get("user_id")
        
        # Notify all vendors if public
        if question["is_public"]:
            rfp = self.rfps[rfp_id]
            await self._notify_vendors_qa_update(rfp_id, question)
        
        return {
            "question_id": question_id,
            "status": "answered",
            "is_public": question["is_public"],
            "notified_vendors": len(self.rfps[rfp_id]["invited_vendors"]) if question["is_public"] else 1
        }
    
    async def submit_bid(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Submit a bid for RFP"""
        rfp_id = request["rfp_id"]
        vendor_id = request["vendor_id"]
        
        if rfp_id not in self.rfps:
            raise ValidationError(f"RFP {rfp_id} not found")
        
        rfp = self.rfps[rfp_id]
        
        # Check deadline
        if datetime.utcnow() > datetime.fromisoformat(rfp["response_deadline"]):
            raise ValidationError("Submission deadline has passed")
        
        # Check if vendor was invited
        if vendor_id not in rfp["invited_vendors"] and rfp["type"] == "RFP":
            raise ValidationError("Vendor was not invited to this RFP")
        
        bid_id = generate_id("bid")
        
        # Validate bid data
        bid_data = request["bid_data"]
        validation_result = await self._validate_bid(bid_data, rfp["requirements"])
        
        if not validation_result["is_valid"]:
            raise ValidationError(f"Bid validation failed: {validation_result['errors']}")
        
        # Create bid record
        bid = {
            "id": bid_id,
            "rfp_id": rfp_id,
            "vendor_id": vendor_id,
            "status": BidStatus.SUBMITTED,
            "submitted_at": datetime.utcnow().isoformat(),
            "pricing": bid_data.get("pricing", {}),
            "technical_proposal": bid_data.get("technical_proposal", {}),
            "delivery_timeline": bid_data.get("delivery_timeline", {}),
            "references": bid_data.get("references", []),
            "attachments": bid_data.get("attachments", []),
            "total_price": bid_data.get("total_price"),
            "validity_days": bid_data.get("validity_days", 90),
            "compliance_checklist": validation_result["compliance"],
            "score": None,
            "rank": None
        }
        
        # Store bid
        if rfp_id not in self.bids:
            self.bids[rfp_id] = []
        self.bids[rfp_id].append(bid)
        
        rfp["received_bids"].append(bid_id)
        
        return {
            "bid_id": bid_id,
            "rfp_id": rfp_id,
            "status": BidStatus.SUBMITTED,
            "submission_number": len(rfp["received_bids"]),
            "compliance_score": validation_result["compliance_score"],
            "confirmation": f"Bid submitted successfully. Valid for {bid['validity_days']} days."
        }
    
    async def evaluate_bids(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Evaluate all submitted bids"""
        rfp_id = request["rfp_id"]
        
        if rfp_id not in self.rfps:
            raise ValidationError(f"RFP {rfp_id} not found")
        
        rfp = self.rfps[rfp_id]
        
        if rfp_id not in self.bids or not self.bids[rfp_id]:
            return {
                "rfp_id": rfp_id,
                "message": "No bids received",
                "evaluation": None
            }
        
        # Update RFP status
        rfp["status"] = RFPStatus.EVALUATION
        
        # Get all bids
        bids = self.bids[rfp_id]
        
        # Evaluate each bid
        evaluations = []
        for bid in bids:
            evaluation = await self.bid_evaluator.evaluate_bid(
                bid=bid,
                criteria=rfp["evaluation_criteria"],
                weights=rfp["evaluation_weights"],
                requirements=rfp["requirements"]
            )
            
            bid["score"] = evaluation["total_score"]
            bid["evaluation"] = evaluation
            evaluations.append(evaluation)
        
        # Rank bids
        bids.sort(key=lambda x: x["score"], reverse=True)
        for i, bid in enumerate(bids, 1):
            bid["rank"] = i
            bid["status"] = BidStatus.UNDER_REVIEW
        
        # Identify shortlist
        shortlist = [
            bid for bid in bids 
            if bid["score"] >= self.config["min_bid_score"]
        ][:5]  # Top 5
        
        for bid in shortlist:
            bid["status"] = BidStatus.SHORTLISTED
        
        # Generate comparison matrix
        comparison = await self.bid_evaluator.generate_comparison_matrix(evaluations)
        
        return {
            "rfp_id": rfp_id,
            "total_bids": len(bids),
            "qualified_bids": len(shortlist),
            "evaluation_summary": {
                "highest_score": bids[0]["score"] if bids else 0,
                "lowest_score": bids[-1]["score"] if bids else 0,
                "average_score": sum(b["score"] for b in bids) / len(bids) if bids else 0,
                "price_range": {
                    "min": min(b["total_price"] for b in bids if b.get("total_price")),
                    "max": max(b["total_price"] for b in bids if b.get("total_price"))
                } if any(b.get("total_price") for b in bids) else None
            },
            "shortlist": [
                {
                    "bid_id": bid["id"],
                    "vendor_id": bid["vendor_id"],
                    "score": bid["score"],
                    "rank": bid["rank"],
                    "price": bid.get("total_price")
                }
                for bid in shortlist
            ],
            "comparison_matrix": comparison,
            "recommendation": self._generate_recommendation(shortlist)
        }
    
    async def select_vendor(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Select winning vendor"""
        rfp_id = request["rfp_id"]
        bid_id = request.get("bid_id")
        
        if rfp_id not in self.rfps:
            raise ValidationError(f"RFP {rfp_id} not found")
        
        rfp = self.rfps[rfp_id]
        
        if rfp_id not in self.bids:
            raise ValidationError(f"No bids for RFP {rfp_id}")
        
        bids = self.bids[rfp_id]
        
        # Find selected bid
        if bid_id:
            selected_bid = next((b for b in bids if b["id"] == bid_id), None)
            if not selected_bid:
                raise ValidationError(f"Bid {bid_id} not found")
        else:
            # Auto-select highest scoring bid
            selected_bid = max(bids, key=lambda x: x.get("score", 0))
        
        # Update bid status
        selected_bid["status"] = BidStatus.AWARDED
        rfp["winning_bid"] = selected_bid["id"]
        rfp["status"] = RFPStatus.AWARDED
        rfp["awarded_at"] = datetime.utcnow().isoformat()
        
        # Update other bids
        for bid in bids:
            if bid["id"] != selected_bid["id"] and bid["status"] != BidStatus.AWARDED:
                bid["status"] = BidStatus.REJECTED
        
        # Notify vendors
        await self._notify_award_decision(rfp_id, selected_bid["id"])
        
        return {
            "rfp_id": rfp_id,
            "winning_bid": selected_bid["id"],
            "vendor_id": selected_bid["vendor_id"],
            "awarded_value": selected_bid.get("total_price"),
            "score": selected_bid["score"],
            "notification_sent": True,
            "next_steps": [
                "Generate contract",
                "Conduct negotiations if needed",
                "Finalize terms and conditions"
            ]
        }
    
    async def get_rfp_status(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Get current RFP status and metrics"""
        rfp_id = request["rfp_id"]
        
        if rfp_id not in self.rfps:
            raise ValidationError(f"RFP {rfp_id} not found")
        
        rfp = self.rfps[rfp_id]
        
        # Calculate metrics
        response_rate = 0
        if rfp["invited_vendors"]:
            response_rate = len(rfp["received_bids"]) / len(rfp["invited_vendors"]) * 100
        
        # Time remaining
        deadline = datetime.fromisoformat(rfp["response_deadline"])
        time_remaining = deadline - datetime.utcnow()
        
        status = {
            "rfp_id": rfp_id,
            "title": rfp["title"],
            "status": rfp["status"],
            "created_at": rfp["created_at"],
            "response_deadline": rfp["response_deadline"],
            "time_remaining": {
                "days": time_remaining.days if time_remaining.total_seconds() > 0 else 0,
                "hours": int(time_remaining.seconds / 3600) if time_remaining.total_seconds() > 0 else 0
            },
            "metrics": {
                "vendors_invited": len(rfp["invited_vendors"]),
                "bids_received": len(rfp["received_bids"]),
                "response_rate": response_rate,
                "questions_received": len(rfp.get("questions", [])),
                "questions_answered": sum(
                    1 for q in self.questions.get(rfp_id, []) 
                    if q.get("answer")
                )
            }
        }
        
        # Add evaluation results if available
        if rfp_id in self.bids and self.bids[rfp_id]:
            evaluated_bids = [b for b in self.bids[rfp_id] if b.get("score")]
            if evaluated_bids:
                status["evaluation"] = {
                    "evaluated_bids": len(evaluated_bids),
                    "highest_score": max(b["score"] for b in evaluated_bids),
                    "average_score": sum(b["score"] for b in evaluated_bids) / len(evaluated_bids)
                }
        
        return status
    
    async def extend_deadline(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Extend RFP submission deadline"""
        rfp_id = request["rfp_id"]
        extension_days = request["extension_days"]
        
        if rfp_id not in self.rfps:
            raise ValidationError(f"RFP {rfp_id} not found")
        
        rfp = self.rfps[rfp_id]
        
        if rfp["status"] not in [RFPStatus.PUBLISHED, RFPStatus.QUESTIONS]:
            raise ValidationError("Can only extend deadline for published RFPs")
        
        # Update deadline
        old_deadline = datetime.fromisoformat(rfp["response_deadline"])
        new_deadline = old_deadline + timedelta(days=extension_days)
        
        rfp["response_deadline"] = new_deadline.isoformat()
        rfp["deadline_extended"] = True
        rfp["extension_count"] = rfp.get("extension_count", 0) + 1
        
        # Notify vendors
        await self._notify_deadline_extension(rfp_id, old_deadline, new_deadline)
        
        return {
            "rfp_id": rfp_id,
            "old_deadline": old_deadline.isoformat(),
            "new_deadline": new_deadline.isoformat(),
            "extension_days": extension_days,
            "notified_vendors": len(rfp["invited_vendors"])
        }
    
    async def cancel_rfp(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Cancel an RFP"""
        rfp_id = request["rfp_id"]
        reason = request.get("reason", "Cancelled by requester")
        
        if rfp_id not in self.rfps:
            raise ValidationError(f"RFP {rfp_id} not found")
        
        rfp = self.rfps[rfp_id]
        
        if rfp["status"] in [RFPStatus.AWARDED, RFPStatus.CLOSED]:
            raise ValidationError("Cannot cancel RFP in current status")
        
        # Update status
        rfp["status"] = RFPStatus.CANCELLED
        rfp["cancelled_at"] = datetime.utcnow().isoformat()
        rfp["cancellation_reason"] = reason
        
        # Update all bids
        if rfp_id in self.bids:
            for bid in self.bids[rfp_id]:
                bid["status"] = BidStatus.REJECTED
                bid["rejection_reason"] = "RFP cancelled"
        
        # Notify vendors
        await self._notify_cancellation(rfp_id, reason)
        
        return {
            "rfp_id": rfp_id,
            "status": RFPStatus.CANCELLED,
            "reason": reason,
            "notified_vendors": len(rfp["invited_vendors"]),
            "affected_bids": len(rfp["received_bids"])
        }
    
    async def generate_bid_comparison(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Generate detailed bid comparison report"""
        rfp_id = request["rfp_id"]
        
        if rfp_id not in self.bids or not self.bids[rfp_id]:
            raise ValidationError(f"No bids found for RFP {rfp_id}")
        
        bids = self.bids[rfp_id]
        rfp = self.rfps[rfp_id]
        
        # Only compare evaluated bids
        evaluated_bids = [b for b in bids if b.get("score")]
        
        if not evaluated_bids:
            raise ValidationError("No evaluated bids to compare")
        
        # Generate comparison
        comparison = await self.bid_evaluator.generate_detailed_comparison(
            bids=evaluated_bids,
            criteria=rfp["evaluation_criteria"],
            weights=rfp["evaluation_weights"]
        )
        
        return comparison
    
    async def finalize_award(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Finalize RFP award and close process"""
        rfp_id = request["rfp_id"]
        
        if rfp_id not in self.rfps:
            raise ValidationError(f"RFP {rfp_id} not found")
        
        rfp = self.rfps[rfp_id]
        
        if rfp["status"] != RFPStatus.AWARDED:
            raise ValidationError("RFP must be in AWARDED status to finalize")
        
        # Update status
        rfp["status"] = RFPStatus.CLOSED
        rfp["closed_at"] = datetime.utcnow().isoformat()
        
        # Generate final report
        report = await self._generate_final_report(rfp_id)
        
        # Archive RFP data
        await self._archive_rfp(rfp_id)
        
        return {
            "rfp_id": rfp_id,
            "status": RFPStatus.CLOSED,
            "final_report": report,
            "archived": True
        }
    
    # Helper methods
    
    async def _invite_vendor(self, rfp_id: str, vendor_id: str):
        """Invite a vendor to participate in RFP"""
        rfp = self.rfps[rfp_id]
        
        if vendor_id not in rfp["invited_vendors"]:
            rfp["invited_vendors"].append(vendor_id)
            
            # Send invitation (would integrate with notification service)
            await self.publish_event(
                event_type="vendor_invited",
                data={
                    "rfp_id": rfp_id,
                    "vendor_id": vendor_id,
                    "title": rfp["title"],
                    "deadline": rfp["response_deadline"]
                },
                target_agent="notification"
            )
    
    async def _validate_bid(self, bid_data: Dict, requirements: Dict) -> Dict[str, Any]:
        """Validate bid against requirements"""
        errors = []
        compliance = {}
        
        # Check required fields
        required_fields = ["pricing", "technical_proposal", "delivery_timeline"]
        for field in required_fields:
            if field not in bid_data:
                errors.append(f"Missing required field: {field}")
            else:
                compliance[field] = True
        
        # Validate pricing
        if "pricing" in bid_data:
            if not bid_data["pricing"].get("total_price"):
                errors.append("Total price is required")
            elif bid_data["pricing"]["total_price"] <= 0:
                errors.append("Price must be positive")
        
        # Calculate compliance score
        compliance_score = len(compliance) / len(required_fields) * 100 if required_fields else 0
        
        return {
            "is_valid": len(errors) == 0,
            "errors": errors,
            "compliance": compliance,
            "compliance_score": compliance_score
        }
    
    async def _notify_vendors_qa_update(self, rfp_id: str, question: Dict):
        """Notify vendors of Q&A update"""
        rfp = self.rfps[rfp_id]
        
        await self.publish_event(
            event_type="rfp_qa_updated",
            data={
                "rfp_id": rfp_id,
                "question": question["question"],
                "answer": question["answer"],
                "vendors": rfp["invited_vendors"]
            },
            target_agent="notification"
        )
    
    async def _notify_award_decision(self, rfp_id: str, winning_bid_id: str):
        """Notify all vendors of award decision"""
        rfp = self.rfps[rfp_id]
        bids = self.bids.get(rfp_id, [])
        
        for bid in bids:
            await self.publish_event(
                event_type="rfp_award_notification",
                data={
                    "rfp_id": rfp_id,
                    "vendor_id": bid["vendor_id"],
                    "is_winner": bid["id"] == winning_bid_id,
                    "bid_status": bid["status"]
                },
                target_agent="notification"
            )
    
    async def _notify_deadline_extension(self, rfp_id: str, 
                                        old_deadline: datetime, 
                                        new_deadline: datetime):
        """Notify vendors of deadline extension"""
        rfp = self.rfps[rfp_id]
        
        await self.publish_event(
            event_type="rfp_deadline_extended",
            data={
                "rfp_id": rfp_id,
                "old_deadline": old_deadline.isoformat(),
                "new_deadline": new_deadline.isoformat(),
                "vendors": rfp["invited_vendors"]
            },
            target_agent="notification"
        )
    
    async def _notify_cancellation(self, rfp_id: str, reason: str):
        """Notify vendors of RFP cancellation"""
        rfp = self.rfps[rfp_id]
        
        await self.publish_event(
            event_type="rfp_cancelled",
            data={
                "rfp_id": rfp_id,
                "reason": reason,
                "vendors": rfp["invited_vendors"]
            },
            target_agent="notification"
        )
    
    async def _generate_final_report(self, rfp_id: str) -> Dict[str, Any]:
        """Generate final RFP report"""
        rfp = self.rfps[rfp_id]
        bids = self.bids.get(rfp_id, [])
        
        winning_bid = next((b for b in bids if b["status"] == BidStatus.AWARDED), None)
        
        return {
            "rfp_summary": {
                "id": rfp_id,
                "title": rfp["title"],
                "created": rfp["created_at"],
                "closed": rfp.get("closed_at")
            },
            "participation": {
                "vendors_invited": len(rfp["invited_vendors"]),
                "bids_received": len(bids),
                "response_rate": calculate_percentage(
                    len(bids), 
                    len(rfp["invited_vendors"])
                ) if rfp["invited_vendors"] else 0
            },
            "winning_bid": {
                "vendor_id": winning_bid["vendor_id"],
                "price": winning_bid.get("total_price"),
                "score": winning_bid["score"]
            } if winning_bid else None,
            "savings": self._calculate_savings(bids, winning_bid) if winning_bid else None
        }
    
    async def _archive_rfp(self, rfp_id: str):
        """Archive RFP data"""
        # In production, this would move data to long-term storage
        self.logger.info(f"Archiving RFP {rfp_id}")
    
    def _generate_default_timeline(self) -> Dict[str, str]:
        """Generate default RFP timeline"""
        now = datetime.utcnow()
        
        return {
            "publish": now.isoformat(),
            "qa_deadline": (now + timedelta(days=self.config["default_qa_days"])).isoformat(),
            "submission_deadline": (now + timedelta(days=self.config["default_response_days"])).isoformat(),
            "evaluation_complete": (now + timedelta(days=self.config["default_response_days"] + 7)).isoformat(),
            "award": (now + timedelta(days=self.config["default_response_days"] + 10)).isoformat()
        }
    
    def _generate_recommendation(self, shortlist: List[Dict]) -> Dict[str, Any]:
        """Generate vendor selection recommendation"""
        if not shortlist:
            return {
                "recommendation": "No qualified bids",
                "action": "Consider revising requirements or extending deadline"
            }
        
        top_bid = shortlist[0]
        
        recommendation = {
            "recommended_vendor": top_bid["vendor_id"],
            "score": top_bid["score"],
            "rationale": []
        }
        
        if top_bid["score"] >= 90:
            recommendation["rationale"].append("Excellent overall score")
        elif top_bid["score"] >= 80:
            recommendation["rationale"].append("Strong overall score")
        else:
            recommendation["rationale"].append("Acceptable score meeting minimum requirements")
        
        # Price consideration
        if len(shortlist) > 1:
            price_diff = (shortlist[1].get("total_price", 0) - top_bid.get("total_price", 0))
            if price_diff > 0:
                recommendation["rationale"].append(f"Lowest price by {format_currency(price_diff)}")
        
        return recommendation
    
    def _calculate_savings(self, bids: List[Dict], winning_bid: Dict) -> Dict[str, float]:
        """Calculate savings achieved through competitive bidding"""
        if not bids or not winning_bid:
            return None
        
        prices = [b.get("total_price", 0) for b in bids if b.get("total_price")]
        
        if not prices:
            return None
        
        avg_price = sum(prices) / len(prices)
        max_price = max(prices)
        winning_price = winning_bid.get("total_price", 0)
        
        return {
            "vs_average": avg_price - winning_price,
            "vs_highest": max_price - winning_price,
            "percentage_saved": calculate_percentage(
                avg_price - winning_price,
                avg_price
            )
        }