"""Document generation for RFP/RFQ processes"""

from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import json
import uuid

from utils.logging_config import get_logger
from utils.common import sanitize_filename, generate_id


class RFPDocumentGenerator:
    """Generate RFP and RFQ documents"""
    
    def __init__(self):
        self.logger = get_logger(__name__)
        
        # Document templates
        self.templates = {
            "rfp": self._get_rfp_template(),
            "rfq": self._get_rfq_template(),
            "evaluation": self._get_evaluation_template()
        }
    
    async def generate_rfp_document(self, title: str, 
                                   requirements: Dict[str, Any],
                                   evaluation_criteria: Dict[str, Any],
                                   timeline: Dict[str, str],
                                   terms: Dict[str, Any],
                                   attachments: List[str] = None) -> Dict[str, Any]:
        """Generate complete RFP document"""
        
        document_id = generate_id("doc")
        
        # Build document structure
        document = {
            "id": document_id,
            "type": "RFP",
            "title": title,
            "created_at": datetime.utcnow().isoformat(),
            "sections": []
        }
        
        # 1. Executive Summary
        document["sections"].append({
            "title": "Executive Summary",
            "content": self._generate_executive_summary(title, requirements)
        })
        
        # 2. Background and Objectives
        document["sections"].append({
            "title": "Background and Objectives",
            "content": self._generate_background(requirements)
        })
        
        # 3. Scope of Work
        document["sections"].append({
            "title": "Scope of Work",
            "content": self._generate_scope(requirements)
        })
        
        # 4. Requirements
        document["sections"].append({
            "title": "Requirements",
            "content": self._format_requirements(requirements)
        })
        
        # 5. Evaluation Criteria
        document["sections"].append({
            "title": "Evaluation Criteria",
            "content": self._format_evaluation_criteria(evaluation_criteria)
        })
        
        # 6. Timeline
        document["sections"].append({
            "title": "Timeline",
            "content": self._format_timeline(timeline)
        })
        
        # 7. Submission Requirements
        document["sections"].append({
            "title": "Submission Requirements",
            "content": self._generate_submission_requirements()
        })
        
        # 8. Terms and Conditions
        document["sections"].append({
            "title": "Terms and Conditions",
            "content": self._format_terms(terms)
        })
        
        # 9. Appendices
        if attachments:
            document["sections"].append({
                "title": "Appendices",
                "content": {"attachments": attachments}
            })
        
        # Generate document file
        file_path = await self._save_document(document)
        
        return {
            "document_id": document_id,
            "title": title,
            "sections": len(document["sections"]),
            "file_path": file_path,
            "url": f"/documents/{document_id}",
            "created_at": document["created_at"]
        }
    
    async def generate_rfq_document(self, items: List[Dict[str, Any]],
                                   quantities: Dict[str, int],
                                   delivery_date: str = None,
                                   terms: Dict[str, Any] = None) -> Dict[str, Any]:
        """Generate RFQ document (simpler than RFP)"""
        
        document_id = generate_id("rfq-doc")
        
        document = {
            "id": document_id,
            "type": "RFQ",
            "created_at": datetime.utcnow().isoformat(),
            "sections": []
        }
        
        # 1. Request Summary
        document["sections"].append({
            "title": "Request for Quotation",
            "content": {
                "request_date": datetime.utcnow().isoformat(),
                "response_deadline": (datetime.utcnow() + timedelta(days=7)).isoformat(),
                "delivery_required": delivery_date or (datetime.utcnow() + timedelta(days=30)).isoformat()
            }
        })
        
        # 2. Items Requested
        document["sections"].append({
            "title": "Items Requested",
            "content": self._format_rfq_items(items, quantities)
        })
        
        # 3. Delivery Requirements
        document["sections"].append({
            "title": "Delivery Requirements",
            "content": {
                "delivery_date": delivery_date,
                "delivery_location": terms.get("delivery_location", "TBD"),
                "incoterms": terms.get("incoterms", "DDP")
            }
        })
        
        # 4. Quotation Format
        document["sections"].append({
            "title": "Quotation Format",
            "content": self._generate_quotation_format()
        })
        
        # 5. Terms
        if terms:
            document["sections"].append({
                "title": "Terms and Conditions",
                "content": terms
            })
        
        # Save document
        file_path = await self._save_document(document)
        
        return {
            "document_id": document_id,
            "file_path": file_path,
            "url": f"/documents/{document_id}",
            "created_at": document["created_at"]
        }
    
    async def generate_evaluation_report(self, rfp_id: str,
                                        evaluations: List[Dict],
                                        recommendation: Dict) -> Dict[str, Any]:
        """Generate bid evaluation report"""
        
        document_id = generate_id("eval-doc")
        
        document = {
            "id": document_id,
            "type": "Evaluation Report",
            "rfp_id": rfp_id,
            "created_at": datetime.utcnow().isoformat(),
            "sections": []
        }
        
        # 1. Executive Summary
        document["sections"].append({
            "title": "Executive Summary",
            "content": self._generate_evaluation_summary(evaluations, recommendation)
        })
        
        # 2. Evaluation Methodology
        document["sections"].append({
            "title": "Evaluation Methodology",
            "content": self._describe_evaluation_methodology()
        })
        
        # 3. Bid Analysis
        document["sections"].append({
            "title": "Bid Analysis",
            "content": self._analyze_bids(evaluations)
        })
        
        # 4. Scoring Summary
        document["sections"].append({
            "title": "Scoring Summary",
            "content": self._create_scoring_table(evaluations)
        })
        
        # 5. Recommendation
        document["sections"].append({
            "title": "Recommendation",
            "content": recommendation
        })
        
        # Save document
        file_path = await self._save_document(document)
        
        return {
            "document_id": document_id,
            "rfp_id": rfp_id,
            "file_path": file_path,
            "url": f"/documents/{document_id}",
            "created_at": document["created_at"]
        }
    
    def _get_rfp_template(self) -> Dict[str, str]:
        """Get RFP document template"""
        return {
            "header": "REQUEST FOR PROPOSAL",
            "footer": "Confidential and Proprietary",
            "sections": [
                "Executive Summary",
                "Background and Objectives", 
                "Scope of Work",
                "Requirements",
                "Evaluation Criteria",
                "Timeline",
                "Submission Requirements",
                "Terms and Conditions",
                "Appendices"
            ]
        }
    
    def _get_rfq_template(self) -> Dict[str, str]:
        """Get RFQ document template"""
        return {
            "header": "REQUEST FOR QUOTATION",
            "footer": "Confidential",
            "sections": [
                "Request Summary",
                "Items Requested",
                "Delivery Requirements",
                "Quotation Format",
                "Terms and Conditions"
            ]
        }
    
    def _get_evaluation_template(self) -> Dict[str, str]:
        """Get evaluation report template"""
        return {
            "header": "BID EVALUATION REPORT",
            "footer": "Internal Use Only",
            "sections": [
                "Executive Summary",
                "Evaluation Methodology",
                "Bid Analysis",
                "Scoring Summary",
                "Recommendation"
            ]
        }
    
    def _generate_executive_summary(self, title: str, requirements: Dict) -> Dict[str, Any]:
        """Generate executive summary section"""
        return {
            "purpose": f"This Request for Proposal (RFP) seeks qualified vendors for: {title}",
            "overview": requirements.get("overview", ""),
            "key_objectives": requirements.get("objectives", []),
            "estimated_value": requirements.get("estimated_value"),
            "contract_duration": requirements.get("duration", "TBD")
        }
    
    def _generate_background(self, requirements: Dict) -> Dict[str, Any]:
        """Generate background section"""
        return {
            "organization": requirements.get("organization", "Our organization"),
            "current_situation": requirements.get("current_situation", ""),
            "challenges": requirements.get("challenges", []),
            "desired_outcome": requirements.get("desired_outcome", "")
        }
    
    def _generate_scope(self, requirements: Dict) -> Dict[str, Any]:
        """Generate scope of work section"""
        return {
            "deliverables": requirements.get("deliverables", []),
            "in_scope": requirements.get("in_scope", []),
            "out_of_scope": requirements.get("out_of_scope", []),
            "assumptions": requirements.get("assumptions", []),
            "constraints": requirements.get("constraints", [])
        }
    
    def _format_requirements(self, requirements: Dict) -> Dict[str, Any]:
        """Format requirements section"""
        return {
            "mandatory_requirements": requirements.get("mandatory", []),
            "optional_requirements": requirements.get("optional", []),
            "technical_requirements": requirements.get("technical", []),
            "functional_requirements": requirements.get("functional", []),
            "performance_requirements": requirements.get("performance", []),
            "compliance_requirements": requirements.get("compliance", [])
        }
    
    def _format_evaluation_criteria(self, criteria: Dict) -> Dict[str, Any]:
        """Format evaluation criteria section"""
        formatted = {
            "criteria": [],
            "scoring_method": criteria.get("scoring_method", "Weighted scoring"),
            "minimum_score": criteria.get("minimum_score", 60)
        }
        
        # Format each criterion
        for key, value in criteria.items():
            if key not in ["scoring_method", "minimum_score"]:
                formatted["criteria"].append({
                    "name": key.replace("_", " ").title(),
                    "weight": value if isinstance(value, (int, float)) else value.get("weight", 0),
                    "description": value.get("description", "") if isinstance(value, dict) else ""
                })
        
        return formatted
    
    def _format_timeline(self, timeline: Dict) -> List[Dict[str, str]]:
        """Format timeline section"""
        formatted = []
        
        for event, date in timeline.items():
            formatted.append({
                "event": event.replace("_", " ").title(),
                "date": date,
                "description": self._get_timeline_description(event)
            })
        
        return sorted(formatted, key=lambda x: x["date"])
    
    def _get_timeline_description(self, event: str) -> str:
        """Get description for timeline event"""
        descriptions = {
            "publish": "RFP published and distributed to vendors",
            "qa_deadline": "Last day to submit questions",
            "submission_deadline": "Proposals must be received by this date",
            "evaluation_complete": "Evaluation process completed",
            "award": "Contract award announcement",
            "contract_start": "Expected contract start date"
        }
        return descriptions.get(event, "")
    
    def _generate_submission_requirements(self) -> Dict[str, Any]:
        """Generate submission requirements section"""
        return {
            "format": {
                "file_type": "PDF",
                "max_pages": 50,
                "font_size": "11pt minimum",
                "margins": "1 inch"
            },
            "required_sections": [
                "Executive Summary",
                "Technical Proposal",
                "Pricing Proposal",
                "Company Qualifications",
                "References",
                "Implementation Timeline"
            ],
            "submission_method": {
                "email": "procurement@company.com",
                "portal": "https://procurement.company.com/submit",
                "deadline_time": "5:00 PM EST"
            },
            "required_attachments": [
                "Company financial statements (last 2 years)",
                "Insurance certificates",
                "Business licenses",
                "Certifications",
                "Sample work products"
            ]
        }
    
    def _format_terms(self, terms: Dict) -> Dict[str, Any]:
        """Format terms and conditions section"""
        default_terms = {
            "confidentiality": "All information provided is confidential",
            "right_to_reject": "We reserve the right to reject any or all proposals",
            "no_obligation": "This RFP does not constitute a commitment to purchase",
            "costs": "Vendors are responsible for all costs associated with proposal preparation",
            "validity": "Proposals must remain valid for 90 days",
            "questions": "All questions must be submitted in writing",
            "amendments": "We reserve the right to amend this RFP",
            "evaluation": "Proposals will be evaluated based on stated criteria"
        }
        
        return {**default_terms, **(terms or {})}
    
    def _format_rfq_items(self, items: List[Dict], quantities: Dict) -> List[Dict]:
        """Format items for RFQ"""
        formatted = []
        
        for item in items:
            item_id = item.get("id", item.get("code", ""))
            formatted.append({
                "item_number": item.get("number", len(formatted) + 1),
                "description": item.get("description", ""),
                "specifications": item.get("specifications", ""),
                "quantity": quantities.get(item_id, item.get("quantity", 1)),
                "unit": item.get("unit", "EA"),
                "required_certifications": item.get("certifications", [])
            })
        
        return formatted
    
    def _generate_quotation_format(self) -> Dict[str, Any]:
        """Generate quotation format requirements"""
        return {
            "required_information": [
                "Unit price for each item",
                "Total price per line item",
                "Shipping and handling charges",
                "Applicable taxes",
                "Total quotation amount",
                "Payment terms",
                "Delivery lead time",
                "Validity period of quotation"
            ],
            "optional_information": [
                "Volume discounts",
                "Alternative products",
                "Warranty terms",
                "Technical support"
            ]
        }
    
    def _generate_evaluation_summary(self, evaluations: List[Dict], 
                                    recommendation: Dict) -> Dict[str, Any]:
        """Generate evaluation summary"""
        return {
            "total_bids_received": len(evaluations),
            "bids_evaluated": len([e for e in evaluations if e.get("total_score")]),
            "recommended_vendor": recommendation.get("vendor_id"),
            "recommendation": recommendation.get("action"),
            "key_findings": recommendation.get("rationale", [])
        }
    
    def _describe_evaluation_methodology(self) -> Dict[str, Any]:
        """Describe evaluation methodology"""
        return {
            "approach": "Multi-criteria weighted scoring",
            "evaluators": "Cross-functional evaluation team",
            "process": [
                "Initial compliance review",
                "Technical evaluation",
                "Commercial evaluation",
                "Reference checks",
                "Final scoring and ranking"
            ],
            "scoring_scale": "0-100 points",
            "minimum_qualifying_score": 60
        }
    
    def _analyze_bids(self, evaluations: List[Dict]) -> Dict[str, Any]:
        """Analyze bid details"""
        return {
            "price_range": {
                "lowest": min(e.get("price", float('inf')) for e in evaluations),
                "highest": max(e.get("price", 0) for e in evaluations),
                "average": sum(e.get("price", 0) for e in evaluations) / len(evaluations)
            },
            "score_distribution": {
                "90-100": len([e for e in evaluations if e.get("total_score", 0) >= 90]),
                "80-89": len([e for e in evaluations if 80 <= e.get("total_score", 0) < 90]),
                "70-79": len([e for e in evaluations if 70 <= e.get("total_score", 0) < 80]),
                "60-69": len([e for e in evaluations if 60 <= e.get("total_score", 0) < 70]),
                "below-60": len([e for e in evaluations if e.get("total_score", 0) < 60])
            }
        }
    
    def _create_scoring_table(self, evaluations: List[Dict]) -> List[Dict]:
        """Create scoring summary table"""
        table = []
        
        for eval in evaluations:
            table.append({
                "vendor": eval.get("vendor_id"),
                "price_score": eval.get("scores", {}).get("price", 0),
                "technical_score": eval.get("scores", {}).get("quality", 0),
                "delivery_score": eval.get("scores", {}).get("delivery", 0),
                "experience_score": eval.get("scores", {}).get("experience", 0),
                "total_score": eval.get("total_score", 0),
                "rank": eval.get("rank")
            })
        
        return sorted(table, key=lambda x: x["total_score"], reverse=True)
    
    async def _save_document(self, document: Dict) -> str:
        """Save document to file system"""
        # In production, this would save to a document management system
        file_name = f"{document['type'].lower().replace(' ', '_')}_{document['id']}.json"
        file_path = f"/tmp/{file_name}"  # Temporary path
        
        # Would save to actual storage
        self.logger.info(f"Document saved: {file_path}")
        
        return file_path