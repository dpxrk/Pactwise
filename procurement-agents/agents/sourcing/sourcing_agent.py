"""Sourcing Agent Implementation"""

import asyncio
import json
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from agents.base_agent import AgentResponse, BaseAgent
from integrations.databases.models import Vendor, RFQRequest, RFQResponse
from .supplier_matcher import SupplierMatcher
from .web_scraper import MarketplaceScraper
from .rfq_generator import RFQGenerator


class SourcingAgent(BaseAgent):
    """Agent for discovering and evaluating suppliers"""
    
    def __init__(self, *args, **kwargs):
        super().__init__("sourcing", *args, **kwargs)
        self.supplier_matcher = SupplierMatcher()
        self.scraper = MarketplaceScraper()
        self.rfq_generator = RFQGenerator()
        
        # Configuration
        self.min_match_score = float(self.config.get("min_match_score", 0.7))
        self.max_risk_score = float(self.config.get("max_risk_score", 0.3))
        self.max_suppliers_to_evaluate = int(self.config.get("max_suppliers", 20))
        self.rfq_auto_send = self.config.get("auto_send_rfq", True)
    
    async def validate_request(self, request: Dict[str, Any]) -> bool:
        """Validate sourcing request"""
        required_fields = ["category", "specifications", "quantity"]
        
        for field in required_fields:
            if field not in request:
                self.logger.error(f"Missing required field: {field}")
                return False
        
        # Validate quantity
        if request["quantity"] <= 0:
            self.logger.error("Quantity must be positive")
            return False
        
        # Validate delivery date if provided
        if "required_by" in request:
            try:
                required_date = datetime.fromisoformat(request["required_by"])
                if required_date <= datetime.utcnow():
                    self.logger.error("Required date must be in the future")
                    return False
            except ValueError:
                self.logger.error("Invalid date format for required_by")
                return False
        
        return True
    
    async def process_request(self, request: Dict[str, Any]) -> AgentResponse:
        """Process sourcing request"""
        try:
            self.logger.info(f"Processing sourcing request for category: {request['category']}")
            
            # Extract request details
            specifications = request["specifications"]
            quantity = request["quantity"]
            required_by = request.get("required_by")
            budget_max = request.get("budget_max")
            preferred_vendors = request.get("preferred_vendors", [])
            
            # Step 1: Search for suppliers
            suppliers = await self._discover_suppliers(request)
            
            # Step 2: Evaluate suppliers
            evaluated_suppliers = await self._evaluate_suppliers(
                suppliers, specifications, quantity
            )
            
            # Step 3: Filter qualified suppliers
            qualified_suppliers = self._filter_qualified_suppliers(
                evaluated_suppliers, budget_max
            )
            
            # Step 4: Create and send RFQs
            rfq_results = None
            if qualified_suppliers and self.rfq_auto_send:
                rfq_results = await self._create_rfqs(
                    qualified_suppliers[:10],  # Top 10 suppliers
                    specifications,
                    quantity,
                    required_by
                )
            
            # Step 5: Generate recommendations
            recommendations = self._generate_recommendations(
                qualified_suppliers,
                rfq_results
            )
            
            # Cache results
            await self._cache_results(request, recommendations)
            
            return AgentResponse(
                success=True,
                message=f"Found {len(qualified_suppliers)} qualified suppliers",
                data={
                    "request_id": self._generate_message_id(),
                    "suppliers": [self._format_supplier(s) for s in qualified_suppliers[:10]],
                    "rfq_status": rfq_results,
                    "recommendations": recommendations,
                    "total_suppliers_evaluated": len(suppliers),
                    "qualified_count": len(qualified_suppliers)
                }
            )
            
        except Exception as e:
            self.logger.error(f"Error processing sourcing request: {str(e)}")
            return AgentResponse(
                success=False,
                message="Failed to process sourcing request",
                errors=[str(e)]
            )
    
    async def _discover_suppliers(self, request: Dict[str, Any]) -> List[Dict]:
        """Discover suppliers from various sources"""
        suppliers = []
        
        # Check cache first
        cache_key = f"suppliers:{request['category']}:{request.get('specifications', '')[:50]}"
        cached_suppliers = await self.cache_get(cache_key)
        if cached_suppliers:
            self.logger.info(f"Using {len(cached_suppliers)} cached suppliers")
            return cached_suppliers
        
        # Parallel supplier discovery
        tasks = []
        
        # 1. Search existing vendor database
        tasks.append(self._search_existing_vendors(request))
        
        # 2. Web scraping from marketplaces
        if self.config.get("enable_web_scraping", True):
            tasks.append(self._scrape_marketplaces(request))
        
        # 3. Industry databases (if configured)
        if self.config.get("industry_db_enabled", False):
            tasks.append(self._search_industry_databases(request))
        
        # Execute all discovery tasks in parallel
        discovery_results = await asyncio.gather(*tasks, return_exceptions=True)
        
        for result in discovery_results:
            if isinstance(result, Exception):
                self.logger.warning(f"Discovery task failed: {str(result)}")
            elif result:
                suppliers.extend(result)
        
        # Deduplicate suppliers
        unique_suppliers = self._deduplicate_suppliers(suppliers)
        
        # Cache results
        await self.cache_set(cache_key, unique_suppliers, expire_seconds=3600)
        
        self.logger.info(f"Discovered {len(unique_suppliers)} unique suppliers")
        return unique_suppliers
    
    async def _search_existing_vendors(self, request: Dict[str, Any]) -> List[Dict]:
        """Search existing vendors in database"""
        if not self.db_session:
            return []
        
        try:
            async with self.db_session as session:
                # Query vendors by category
                query = select(Vendor).where(
                    and_(
                        Vendor.status == "active",
                        Vendor.categories.contains([request["category"]])
                    )
                )
                
                result = await session.execute(query)
                vendors = result.scalars().all()
                
                return [
                    {
                        "id": v.id,
                        "name": v.company_name,
                        "source": "existing_vendor",
                        "categories": v.categories,
                        "rating": v.quality_rating,
                        "on_time_delivery": v.on_time_delivery_rate,
                        "country": v.country,
                        "payment_terms": v.payment_terms
                    }
                    for v in vendors
                ]
        except Exception as e:
            self.logger.error(f"Error searching existing vendors: {str(e)}")
            return []
    
    async def _scrape_marketplaces(self, request: Dict[str, Any]) -> List[Dict]:
        """Scrape online marketplaces for suppliers"""
        try:
            # Scrape configured marketplaces
            marketplaces = self.config.get("marketplaces", ["alibaba", "thomasnet"])
            scraped_suppliers = []
            
            for marketplace in marketplaces:
                try:
                    suppliers = await self.scraper.scrape_marketplace(
                        marketplace,
                        request["category"],
                        request["specifications"]
                    )
                    scraped_suppliers.extend(suppliers)
                except Exception as e:
                    self.logger.warning(f"Failed to scrape {marketplace}: {str(e)}")
            
            return scraped_suppliers
        except Exception as e:
            self.logger.error(f"Web scraping failed: {str(e)}")
            return []
    
    async def _search_industry_databases(self, request: Dict[str, Any]) -> List[Dict]:
        """Search industry-specific databases"""
        # Placeholder for industry database integration
        # This would connect to APIs like ThomasNet, GlobalSources, etc.
        return []
    
    async def _evaluate_suppliers(
        self,
        suppliers: List[Dict],
        specifications: str,
        quantity: float
    ) -> List[Dict]:
        """Evaluate and score suppliers"""
        evaluated_suppliers = []
        
        for supplier in suppliers[:self.max_suppliers_to_evaluate]:
            try:
                # Calculate match score using AI
                match_score = await self.supplier_matcher.calculate_match_score(
                    supplier,
                    specifications
                )
                
                # Assess risk
                risk_score = await self._assess_supplier_risk(supplier)
                
                # Calculate total score
                total_score = (match_score * 0.6) + ((1 - risk_score) * 0.4)
                
                supplier.update({
                    "match_score": match_score,
                    "risk_score": risk_score,
                    "total_score": total_score,
                    "can_fulfill_quantity": await self._check_quantity_capability(
                        supplier, quantity
                    )
                })
                
                evaluated_suppliers.append(supplier)
                
            except Exception as e:
                self.logger.warning(f"Failed to evaluate supplier {supplier.get('name')}: {str(e)}")
        
        # Sort by total score
        evaluated_suppliers.sort(key=lambda x: x["total_score"], reverse=True)
        
        return evaluated_suppliers
    
    async def _assess_supplier_risk(self, supplier: Dict) -> float:
        """Assess supplier risk score"""
        risk_factors = {
            "country_risk": 0.0,
            "financial_risk": 0.0,
            "performance_risk": 0.0,
            "compliance_risk": 0.0
        }
        
        # Country risk (simplified)
        high_risk_countries = self.config.get("high_risk_countries", [])
        if supplier.get("country") in high_risk_countries:
            risk_factors["country_risk"] = 0.8
        
        # Performance risk (if existing vendor)
        if supplier.get("source") == "existing_vendor":
            otd = supplier.get("on_time_delivery", 1.0)
            if otd < 0.8:
                risk_factors["performance_risk"] = 1.0 - otd
        
        # Calculate weighted average risk
        weights = {"country_risk": 0.3, "financial_risk": 0.3,
                  "performance_risk": 0.2, "compliance_risk": 0.2}
        
        total_risk = sum(risk_factors[k] * weights[k] for k in risk_factors)
        
        return min(total_risk, 1.0)
    
    async def _check_quantity_capability(self, supplier: Dict, quantity: float) -> bool:
        """Check if supplier can fulfill required quantity"""
        # This would involve checking supplier capacity data
        # For now, return True for all suppliers
        return True
    
    def _filter_qualified_suppliers(
        self,
        suppliers: List[Dict],
        budget_max: Optional[float]
    ) -> List[Dict]:
        """Filter suppliers based on qualification criteria"""
        qualified = []
        
        for supplier in suppliers:
            # Check match score
            if supplier["match_score"] < self.min_match_score:
                continue
            
            # Check risk score
            if supplier["risk_score"] > self.max_risk_score:
                continue
            
            # Check quantity capability
            if not supplier.get("can_fulfill_quantity", True):
                continue
            
            # Check budget if provided
            if budget_max and supplier.get("estimated_price"):
                if supplier["estimated_price"] > budget_max:
                    continue
            
            qualified.append(supplier)
        
        return qualified
    
    async def _create_rfqs(
        self,
        suppliers: List[Dict],
        specifications: str,
        quantity: float,
        required_by: Optional[str]
    ) -> Dict[str, Any]:
        """Create and send RFQ to suppliers"""
        try:
            # Generate RFQ document
            rfq_document = await self.rfq_generator.generate_rfq(
                specifications=specifications,
                quantity=quantity,
                required_by=required_by
            )
            
            # Create RFQ in database
            if self.db_session:
                async with self.db_session as session:
                    rfq = RFQRequest(
                        rfq_number=self._generate_rfq_number(),
                        title=f"RFQ for {specifications[:100]}",
                        description=rfq_document["description"],
                        specifications={"specs": specifications, "quantity": quantity},
                        quantity=quantity,
                        delivery_date=datetime.fromisoformat(required_by) if required_by else None,
                        question_deadline=datetime.utcnow() + timedelta(days=3),
                        submission_deadline=datetime.utcnow() + timedelta(days=7),
                        evaluation_criteria=rfq_document["evaluation_criteria"]
                    )
                    session.add(rfq)
                    await session.commit()
                    
                    rfq_id = rfq.id
            else:
                rfq_id = self._generate_message_id()
            
            # Send RFQ to suppliers
            sent_count = 0
            for supplier in suppliers:
                if await self._send_rfq_to_supplier(supplier, rfq_document):
                    sent_count += 1
            
            return {
                "rfq_id": rfq_id,
                "rfq_number": rfq_document.get("rfq_number"),
                "sent_to": sent_count,
                "submission_deadline": (datetime.utcnow() + timedelta(days=7)).isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Failed to create RFQs: {str(e)}")
            return {"error": str(e)}
    
    async def _send_rfq_to_supplier(self, supplier: Dict, rfq_document: Dict) -> bool:
        """Send RFQ to individual supplier"""
        try:
            # Publish event for RFQ sending
            await self.publish_event(
                event_type="rfq_created",
                data={
                    "supplier": supplier,
                    "rfq": rfq_document
                },
                target_agent="notification"
            )
            
            # In a real implementation, this would:
            # 1. Send email to supplier
            # 2. Create supplier portal notification
            # 3. Send via EDI if configured
            
            return True
        except Exception as e:
            self.logger.warning(f"Failed to send RFQ to {supplier.get('name')}: {str(e)}")
            return False
    
    def _generate_recommendations(
        self,
        suppliers: List[Dict],
        rfq_results: Optional[Dict]
    ) -> Dict[str, Any]:
        """Generate procurement recommendations"""
        if not suppliers:
            return {"message": "No qualified suppliers found"}
        
        top_supplier = suppliers[0]
        
        recommendations = {
            "primary_recommendation": {
                "supplier": top_supplier["name"],
                "score": top_supplier["total_score"],
                "reasons": self._get_recommendation_reasons(top_supplier)
            },
            "alternative_options": [
                {
                    "supplier": s["name"],
                    "score": s["total_score"]
                }
                for s in suppliers[1:4]  # Next 3 suppliers
            ]
        }
        
        if rfq_results and not rfq_results.get("error"):
            recommendations["rfq_status"] = {
                "sent": True,
                "rfq_id": rfq_results["rfq_id"],
                "response_deadline": rfq_results["submission_deadline"]
            }
        
        return recommendations
    
    def _get_recommendation_reasons(self, supplier: Dict) -> List[str]:
        """Get reasons for recommending a supplier"""
        reasons = []
        
        if supplier["match_score"] > 0.9:
            reasons.append("Excellent match with specifications")
        elif supplier["match_score"] > 0.8:
            reasons.append("Strong match with specifications")
        
        if supplier["risk_score"] < 0.1:
            reasons.append("Very low risk profile")
        elif supplier["risk_score"] < 0.2:
            reasons.append("Low risk profile")
        
        if supplier.get("on_time_delivery", 0) > 0.95:
            reasons.append("Outstanding delivery performance")
        
        if supplier.get("source") == "existing_vendor":
            reasons.append("Established relationship")
        
        return reasons
    
    def _deduplicate_suppliers(self, suppliers: List[Dict]) -> List[Dict]:
        """Remove duplicate suppliers"""
        seen = set()
        unique = []
        
        for supplier in suppliers:
            # Use name and country as unique identifier
            key = f"{supplier.get('name', '')}:{supplier.get('country', '')}"
            if key not in seen:
                seen.add(key)
                unique.append(supplier)
        
        return unique
    
    def _format_supplier(self, supplier: Dict) -> Dict:
        """Format supplier data for response"""
        return {
            "id": supplier.get("id"),
            "name": supplier.get("name"),
            "country": supplier.get("country"),
            "match_score": round(supplier.get("match_score", 0), 2),
            "risk_score": round(supplier.get("risk_score", 0), 2),
            "total_score": round(supplier.get("total_score", 0), 2),
            "categories": supplier.get("categories", []),
            "source": supplier.get("source")
        }
    
    def _generate_rfq_number(self) -> str:
        """Generate unique RFQ number"""
        import uuid
        timestamp = datetime.utcnow().strftime("%Y%m%d")
        unique_id = str(uuid.uuid4())[:8].upper()
        return f"RFQ-{timestamp}-{unique_id}"
    
    async def _cache_results(self, request: Dict, recommendations: Dict):
        """Cache sourcing results"""
        cache_key = f"sourcing_result:{self._generate_message_id()}"
        await self.cache_set(
            cache_key,
            {
                "request": request,
                "recommendations": recommendations,
                "timestamp": datetime.utcnow().isoformat()
            },
            expire_seconds=86400  # 24 hours
        )