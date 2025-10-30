"""Vendor selection and identification for RFP processes"""

from typing import Dict, List, Any, Optional
import random

from utils.logging_config import get_logger
from utils.common import calculate_percentage


class VendorSelector:
    """Select and identify vendors for RFP/RFQ processes"""
    
    def __init__(self):
        self.logger = get_logger(__name__)
        
        # Vendor selection criteria
        self.selection_criteria = {
            "performance_threshold": 70,  # Minimum performance score
            "financial_health_threshold": 60,  # Minimum financial score
            "compliance_required": True,
            "active_status_required": True
        }
    
    async def identify_vendors(self, category: str = None,
                              requirements: Dict[str, Any] = None,
                              estimated_value: float = None) -> List[Dict[str, Any]]:
        """Identify potential vendors for RFP"""
        
        # Get vendors from database (mock implementation)
        all_vendors = await self._get_vendors_from_database(category)
        
        # Filter vendors
        qualified_vendors = []
        
        for vendor in all_vendors:
            if await self._is_vendor_qualified(vendor, requirements, estimated_value):
                # Calculate match score
                match_score = await self._calculate_match_score(vendor, requirements)
                
                vendor_info = {
                    "vendor_id": vendor["id"],
                    "vendor_name": vendor["name"],
                    "category": vendor.get("category", category),
                    "match_score": match_score,
                    "capabilities": vendor.get("capabilities", []),
                    "certifications": vendor.get("certifications", []),
                    "past_performance": vendor.get("performance_score", 0),
                    "financial_health": vendor.get("financial_score", 0),
                    "recommended": match_score >= 80
                }
                
                qualified_vendors.append(vendor_info)
        
        # Sort by match score
        qualified_vendors.sort(key=lambda x: x["match_score"], reverse=True)
        
        return qualified_vendors
    
    async def recommend_vendors(self, rfp_type: str,
                               requirements: Dict[str, Any],
                               vendor_pool: List[Dict]) -> List[Dict[str, Any]]:
        """Recommend best vendors for specific RFP"""
        
        recommendations = []
        
        # Score each vendor
        for vendor in vendor_pool:
            score = await self._score_vendor_for_rfp(vendor, rfp_type, requirements)
            
            if score >= self.selection_criteria["performance_threshold"]:
                recommendations.append({
                    "vendor_id": vendor["vendor_id"],
                    "vendor_name": vendor["vendor_name"],
                    "recommendation_score": score,
                    "strengths": self._identify_vendor_strengths(vendor, requirements),
                    "risks": self._identify_vendor_risks(vendor),
                    "rationale": self._generate_selection_rationale(vendor, score)
                })
        
        # Sort by recommendation score
        recommendations.sort(key=lambda x: x["recommendation_score"], reverse=True)
        
        # Limit to top vendors
        max_vendors = 20 if rfp_type == "RFP" else 10  # RFQs need fewer vendors
        
        return recommendations[:max_vendors]
    
    async def _get_vendors_from_database(self, category: str = None) -> List[Dict]:
        """Get vendors from database (mock implementation)"""
        # This would query actual database
        mock_vendors = []
        
        categories = ["IT", "Marketing", "Facilities", "Professional Services", "Logistics"]
        
        for i in range(50):  # Generate 50 mock vendors
            mock_vendors.append({
                "id": f"vendor_{i:03d}",
                "name": f"Vendor {chr(65 + i % 26)} Corp",
                "category": category or random.choice(categories),
                "capabilities": random.sample(
                    ["Cloud Services", "Consulting", "Implementation", "Support", "Training"],
                    k=random.randint(2, 4)
                ),
                "certifications": random.sample(
                    ["ISO 9001", "ISO 27001", "SOC 2", "CMMI", "PMP"],
                    k=random.randint(1, 3)
                ),
                "performance_score": random.uniform(60, 100),
                "financial_score": random.uniform(50, 100),
                "years_experience": random.randint(1, 20),
                "employee_count": random.randint(10, 5000),
                "annual_revenue": random.uniform(1, 100) * 1000000,
                "location": random.choice(["US", "EU", "Asia", "Global"]),
                "status": random.choice(["Active", "Active", "Active", "Inactive"])  # 75% active
            })
        
        return mock_vendors
    
    async def _is_vendor_qualified(self, vendor: Dict, 
                                  requirements: Dict = None,
                                  estimated_value: float = None) -> bool:
        """Check if vendor meets qualification criteria"""
        
        # Check active status
        if self.selection_criteria["active_status_required"]:
            if vendor.get("status") != "Active":
                return False
        
        # Check performance threshold
        if vendor.get("performance_score", 0) < self.selection_criteria["performance_threshold"]:
            return False
        
        # Check financial health
        if vendor.get("financial_score", 0) < self.selection_criteria["financial_health_threshold"]:
            return False
        
        # Check value threshold
        if estimated_value:
            if vendor.get("annual_revenue", 0) < estimated_value * 0.1:  # Revenue should be at least 10x contract value
                return False
        
        # Check required certifications
        if requirements and "certifications" in requirements:
            required_certs = requirements["certifications"]
            vendor_certs = vendor.get("certifications", [])
            
            if not all(cert in vendor_certs for cert in required_certs):
                return False
        
        return True
    
    async def _calculate_match_score(self, vendor: Dict, 
                                    requirements: Dict = None) -> float:
        """Calculate how well vendor matches requirements"""
        
        score = 50  # Base score
        
        # Performance history
        if vendor.get("performance_score", 0) >= 90:
            score += 15
        elif vendor.get("performance_score", 0) >= 80:
            score += 10
        elif vendor.get("performance_score", 0) >= 70:
            score += 5
        
        # Financial health
        if vendor.get("financial_score", 0) >= 80:
            score += 10
        elif vendor.get("financial_score", 0) >= 70:
            score += 5
        
        # Experience
        if vendor.get("years_experience", 0) >= 10:
            score += 10
        elif vendor.get("years_experience", 0) >= 5:
            score += 5
        
        # Certifications
        if vendor.get("certifications"):
            score += min(15, len(vendor["certifications"]) * 3)
        
        # Capabilities match
        if requirements and "capabilities" in requirements:
            required_caps = set(requirements["capabilities"])
            vendor_caps = set(vendor.get("capabilities", []))
            
            match_rate = len(required_caps & vendor_caps) / len(required_caps) if required_caps else 0
            score += match_rate * 10
        
        return min(100, score)
    
    async def _score_vendor_for_rfp(self, vendor: Dict,
                                   rfp_type: str,
                                   requirements: Dict) -> float:
        """Score vendor for specific RFP"""
        
        base_score = vendor.get("match_score", 50)
        
        # Adjust based on RFP type
        if rfp_type == "RFQ":
            # RFQs focus more on price and delivery
            if vendor.get("delivery_performance", 0) >= 90:
                base_score += 10
            if vendor.get("price_competitiveness", "average") == "competitive":
                base_score += 10
        else:  # RFP
            # RFPs focus more on capabilities and quality
            if len(vendor.get("capabilities", [])) >= 5:
                base_score += 10
            if vendor.get("innovation_score", 0) >= 70:
                base_score += 5
        
        # Industry-specific adjustments
        if requirements.get("industry") == vendor.get("industry_expertise"):
            base_score += 10
        
        return min(100, base_score)
    
    def _identify_vendor_strengths(self, vendor: Dict, 
                                  requirements: Dict = None) -> List[str]:
        """Identify vendor strengths"""
        strengths = []
        
        if vendor.get("past_performance", 0) >= 90:
            strengths.append("Excellent performance history")
        
        if vendor.get("financial_health", 0) >= 80:
            strengths.append("Strong financial position")
        
        if len(vendor.get("certifications", [])) >= 3:
            strengths.append("Multiple quality certifications")
        
        if vendor.get("match_score", 0) >= 85:
            strengths.append("High requirements match")
        
        if requirements and "capabilities" in requirements:
            required = set(requirements["capabilities"])
            vendor_caps = set(vendor.get("capabilities", []))
            if len(required & vendor_caps) == len(required):
                strengths.append("Meets all capability requirements")
        
        return strengths
    
    def _identify_vendor_risks(self, vendor: Dict) -> List[str]:
        """Identify vendor risks"""
        risks = []
        
        if vendor.get("financial_health", 0) < 70:
            risks.append("Financial health concerns")
        
        if vendor.get("past_performance", 0) < 75:
            risks.append("Performance history below average")
        
        if vendor.get("years_experience", 0) < 3:
            risks.append("Limited experience")
        
        if not vendor.get("certifications"):
            risks.append("No quality certifications")
        
        if vendor.get("location") not in ["US", "Global"]:
            risks.append("Potential timezone/communication challenges")
        
        return risks
    
    def _generate_selection_rationale(self, vendor: Dict, score: float) -> str:
        """Generate rationale for vendor selection"""
        
        if score >= 90:
            return f"Highly recommended - {vendor['vendor_name']} demonstrates excellent capabilities and track record"
        elif score >= 80:
            return f"Recommended - {vendor['vendor_name']} is well-qualified with strong credentials"
        elif score >= 70:
            return f"Qualified - {vendor['vendor_name']} meets requirements with acceptable risk"
        else:
            return f"Marginal - {vendor['vendor_name']} meets minimum requirements"