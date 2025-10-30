"""RFQ Document Generator"""

import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional


class RFQGenerator:
    """Generate Request for Quote documents"""
    
    def __init__(self):
        self.company_info = {
            "name": "Your Company Name",
            "address": "Company Address",
            "contact": "procurement@company.com"
        }
        
        self.standard_terms = {
            "payment": "Net 30 days",
            "delivery": "FOB Destination",
            "warranty": "12 months minimum",
            "quality": "ISO 9001 or equivalent required"
        }
    
    async def generate_rfq(
        self,
        specifications: str,
        quantity: float,
        required_by: Optional[str] = None,
        special_requirements: Optional[Dict] = None
    ) -> Dict:
        """Generate RFQ document"""
        
        rfq_number = self._generate_rfq_number()
        issue_date = datetime.utcnow()
        
        # Calculate deadlines
        question_deadline = issue_date + timedelta(days=3)
        submission_deadline = issue_date + timedelta(days=7)
        
        if required_by:
            delivery_date = datetime.fromisoformat(required_by)
        else:
            delivery_date = issue_date + timedelta(days=30)
        
        rfq_document = {
            "rfq_number": rfq_number,
            "issue_date": issue_date.isoformat(),
            "issuer": self.company_info,
            
            "timeline": {
                "question_deadline": question_deadline.isoformat(),
                "submission_deadline": submission_deadline.isoformat(),
                "evaluation_period": "7 days after submission deadline",
                "award_date": (submission_deadline + timedelta(days=7)).isoformat(),
                "delivery_required": delivery_date.isoformat()
            },
            
            "requirements": {
                "specifications": specifications,
                "quantity": quantity,
                "delivery_location": special_requirements.get("delivery_location") if special_requirements else "To be specified",
                "packaging_requirements": special_requirements.get("packaging") if special_requirements else "Standard commercial packaging",
                "quality_requirements": self._generate_quality_requirements(specifications)
            },
            
            "commercial_terms": {
                "payment_terms": special_requirements.get("payment_terms", self.standard_terms["payment"]),
                "delivery_terms": special_requirements.get("delivery_terms", self.standard_terms["delivery"]),
                "warranty_requirements": self.standard_terms["warranty"],
                "insurance_requirements": "Vendor to maintain adequate insurance",
                "penalties": self._generate_penalty_clauses()
            },
            
            "submission_requirements": self._generate_submission_requirements(),
            
            "evaluation_criteria": self._generate_evaluation_criteria(),
            
            "instructions": self._generate_rfq_instructions(),
            
            "description": self._generate_rfq_description(specifications, quantity),
            
            "attachments": []
        }
        
        return rfq_document
    
    def _generate_rfq_number(self) -> str:
        """Generate unique RFQ number"""
        import uuid
        timestamp = datetime.utcnow().strftime("%Y%m%d")
        unique_id = str(uuid.uuid4())[:8].upper()
        return f"RFQ-{timestamp}-{unique_id}"
    
    def _generate_quality_requirements(self, specifications: str) -> Dict:
        """Generate quality requirements based on specifications"""
        requirements = {
            "standards": [],
            "certifications": [],
            "testing": [],
            "documentation": []
        }
        
        # Check for standard requirements in specifications
        spec_lower = specifications.lower()
        
        # ISO standards
        if any(term in spec_lower for term in ["quality", "manufactured", "industrial"]):
            requirements["standards"].append("ISO 9001:2015 certified")
        
        if "electronic" in spec_lower or "electrical" in spec_lower:
            requirements["standards"].append("CE marking required")
            requirements["standards"].append("RoHS compliant")
        
        if "food" in spec_lower or "pharmaceutical" in spec_lower:
            requirements["standards"].append("FDA approved materials")
            requirements["certifications"].append("GMP certification")
        
        # Testing requirements
        requirements["testing"].append("Certificate of Conformance (CoC) required")
        requirements["testing"].append("Material test certificates if applicable")
        
        # Documentation
        requirements["documentation"].append("Product specifications sheet")
        requirements["documentation"].append("Safety data sheets (SDS) if applicable")
        requirements["documentation"].append("User manual/technical documentation")
        
        return requirements
    
    def _generate_penalty_clauses(self) -> Dict:
        """Generate standard penalty clauses"""
        return {
            "late_delivery": {
                "description": "Late delivery penalty",
                "rate": "0.5% of order value per day",
                "maximum": "10% of total order value",
                "grace_period": "3 days"
            },
            "quality_issues": {
                "description": "Quality non-conformance",
                "action": "Replacement at vendor's cost",
                "timeline": "Within 7 days of notification"
            },
            "quantity_shortage": {
                "description": "Quantity shortage penalty",
                "action": "Pro-rated payment or immediate fulfillment"
            }
        }
    
    def _generate_submission_requirements(self) -> Dict:
        """Generate submission requirements for vendors"""
        return {
            "required_documents": [
                "Completed price quotation form",
                "Company profile and capabilities statement",
                "List of relevant past projects/clients",
                "Quality certifications",
                "Financial stability evidence (last 2 years)",
                "Product samples (if applicable)",
                "Technical specifications compliance matrix"
            ],
            
            "pricing_breakdown": {
                "unit_price": "Per item/unit",
                "volume_discounts": "Tiered pricing if applicable",
                "shipping_costs": "Separately itemized",
                "taxes": "Clearly specified",
                "payment_terms": "Proposed payment schedule",
                "validity_period": "Quote validity period (minimum 30 days)"
            },
            
            "format": {
                "submission_method": "Email to procurement@company.com",
                "file_format": "PDF for documents, Excel for pricing",
                "language": "English",
                "currency": "USD or local currency with exchange rate"
            }
        }
    
    def _generate_evaluation_criteria(self) -> Dict:
        """Generate evaluation criteria with weights"""
        return {
            "criteria": [
                {
                    "name": "Price Competitiveness",
                    "weight": 30,
                    "description": "Total cost including all charges"
                },
                {
                    "name": "Technical Compliance",
                    "weight": 25,
                    "description": "Meeting all technical specifications"
                },
                {
                    "name": "Quality & Certifications",
                    "weight": 20,
                    "description": "Quality standards and relevant certifications"
                },
                {
                    "name": "Delivery Timeline",
                    "weight": 15,
                    "description": "Ability to meet required delivery date"
                },
                {
                    "name": "Company Capability",
                    "weight": 10,
                    "description": "Past performance, financial stability, capacity"
                }
            ],
            
            "scoring_method": "Weighted average",
            "minimum_score": 70,
            "disqualification_criteria": [
                "Failure to meet mandatory requirements",
                "Incomplete submission",
                "Submission after deadline",
                "Unacceptable payment terms"
            ]
        }
    
    def _generate_rfq_instructions(self) -> List[str]:
        """Generate instructions for vendors"""
        return [
            "All questions must be submitted in writing before the question deadline",
            "Responses to questions will be shared with all participating vendors",
            "Late submissions will not be accepted",
            "Partial bids are not acceptable unless specifically allowed",
            "Vendors must clearly indicate any deviations from requirements",
            "All prices must be firm and fixed for the validity period",
            "The buyer reserves the right to reject any or all bids",
            "This RFQ does not constitute a commitment to purchase",
            "Vendors are responsible for all costs associated with bid preparation",
            "Confidentiality must be maintained for all shared information"
        ]
    
    def _generate_rfq_description(self, specifications: str, quantity: float) -> str:
        """Generate RFQ description"""
        return (
            f"Request for Quote for the supply of {quantity} units of the following:\n\n"
            f"{specifications}\n\n"
            f"The selected vendor will be required to deliver the complete quantity "
            f"according to the timeline specified in this RFQ. "
            f"All items must meet the quality standards and specifications detailed herein."
        )
    
    def generate_rfq_email_template(self, rfq_document: Dict) -> str:
        """Generate email template for RFQ"""
        template = f"""
        Subject: Request for Quote - {rfq_document['rfq_number']}
        
        Dear [Vendor Name],
        
        We are pleased to invite you to submit a quotation for the supply of goods/services 
        as detailed in the attached Request for Quote (RFQ) document.
        
        RFQ Number: {rfq_document['rfq_number']}
        Issue Date: {rfq_document['issue_date']}
        Submission Deadline: {rfq_document['timeline']['submission_deadline']}
        
        Summary of Requirements:
        {rfq_document['description']}
        
        Important Dates:
        - Question Deadline: {rfq_document['timeline']['question_deadline']}
        - Submission Deadline: {rfq_document['timeline']['submission_deadline']}
        - Expected Award Date: {rfq_document['timeline']['award_date']}
        
        Please review the attached RFQ document carefully and ensure your submission 
        includes all required information and documentation.
        
        All submissions must be sent to: procurement@company.com
        
        We look forward to receiving your competitive quotation.
        
        Best regards,
        Procurement Department
        {rfq_document['issuer']['name']}
        """
        
        return template.strip()
    
    def generate_rfq_comparison_template(self) -> Dict:
        """Generate template for comparing RFQ responses"""
        return {
            "headers": [
                "Vendor Name",
                "Total Price",
                "Unit Price", 
                "Delivery Time",
                "Payment Terms",
                "Warranty Period",
                "Technical Score",
                "Quality Score",
                "Overall Score",
                "Rank",
                "Notes"
            ],
            
            "scoring_formula": {
                "price_score": "lowest_price / vendor_price * weight",
                "delivery_score": "earliest_delivery / vendor_delivery * weight",
                "technical_score": "manual evaluation (0-100) * weight",
                "quality_score": "certification_points * weight",
                "overall_score": "sum of all weighted scores"
            }
        }