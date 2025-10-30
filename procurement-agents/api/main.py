"""FastAPI Main Application for Procurement Agents System"""

import logging
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from prometheus_client import Counter, Histogram, generate_latest
from redis import Redis

# Import routers
from api.routes import savings_tracker
try:
    from api.routes import contract_review
    CONTRACT_REVIEW_AVAILABLE = True
except Exception as e:
    print(f"Contract review router not available: {e}")
    CONTRACT_REVIEW_AVAILABLE = False

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Metrics
request_count = Counter(
    'procurement_api_requests_total',
    'Total API requests',
    ['method', 'endpoint', 'status']
)

request_duration = Histogram(
    'procurement_api_request_duration_seconds',
    'API request duration',
    ['method', 'endpoint']
)


# Request/Response Models
class HealthCheckResponse(BaseModel):
    """Health check response model"""
    status: str
    timestamp: datetime
    version: str
    services: Dict[str, str]


class SourcingRequest(BaseModel):
    """Sourcing request model"""
    category: str
    specifications: str
    quantity: float
    required_by: datetime
    budget_max: Optional[float] = None
    preferred_vendors: Optional[List[str]] = None


class PurchaseOrderRequest(BaseModel):
    """Purchase order request model"""
    requisition_id: str
    vendor_id: str
    items: List[Dict[str, Any]]
    delivery_date: datetime
    payment_terms: str
    cost_center: str


class VendorOnboardingRequest(BaseModel):
    """Vendor onboarding request model"""
    company_name: str
    company_registration: str
    categories: List[str]
    contact_info: Dict[str, str]
    financial_info: Optional[Dict[str, Any]] = None
    references: Optional[List[Dict[str, str]]] = None


class InvoiceProcessingRequest(BaseModel):
    """Invoice processing request model"""
    invoice_number: str
    vendor_id: str
    amount: float
    currency: str = "USD"
    invoice_date: datetime
    po_number: Optional[str] = None
    line_items: List[Dict[str, Any]]


class ApiResponse(BaseModel):
    """Standard API response model"""
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None
    errors: Optional[List[str]] = None
    request_id: Optional[str] = None


# Application lifespan management
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle"""
    # Startup
    logger.info("Starting Procurement Agents API")
    
    # Initialize Redis connection
    app.state.redis = Redis(
        host="redis",
        port=6379,
        decode_responses=True
    )
    
    # Initialize agent registry
    app.state.agents = {}
    
    logger.info("API startup complete")
    
    yield
    
    # Shutdown
    logger.info("Shutting down Procurement Agents API")
    
    # Close Redis connection
    if hasattr(app.state, 'redis'):
        app.state.redis.close()
    
    # Shutdown agents
    for agent in app.state.agents.values():
        await agent.shutdown()
    
    logger.info("API shutdown complete")


# Create FastAPI app
app = FastAPI(
    title="Procurement Agents API",
    description="Enterprise procurement automation system with intelligent agents",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(savings_tracker.router)
if CONTRACT_REVIEW_AVAILABLE:
    app.include_router(contract_review.router)
    logger.info("Contract Review endpoints enabled")
else:
    logger.warning("Contract Review endpoints not available")


# Middleware for request tracking
@app.middleware("http")
async def track_requests(request: Request, call_next):
    """Track request metrics"""
    import time
    start_time = time.time()
    
    # Process request
    response = await call_next(request)
    
    # Record metrics
    duration = time.time() - start_time
    request_duration.labels(
        method=request.method,
        endpoint=request.url.path
    ).observe(duration)
    
    request_count.labels(
        method=request.method,
        endpoint=request.url.path,
        status=response.status_code
    ).inc()
    
    return response


# Exception handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": exc.detail,
            "errors": [str(exc)]
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle general exceptions"""
    logger.error(f"Unhandled exception: {str(exc)}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "message": "Internal server error",
            "errors": [str(exc)]
        }
    )


# Root endpoint
@app.get("/", response_model=Dict[str, str])
async def root():
    """Root endpoint"""
    return {
        "message": "Procurement Agents API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }


# Health check endpoint
@app.get("/health", response_model=HealthCheckResponse)
async def health_check(request: Request):
    """Health check endpoint"""
    services = {}
    
    # Check Redis
    try:
        request.app.state.redis.ping()
        services["redis"] = "healthy"
    except:
        services["redis"] = "unhealthy"
    
    # Check agents
    for agent_name, agent in request.app.state.agents.items():
        agent_health = await agent.health_check()
        services[f"agent_{agent_name}"] = agent_health["status"]
    
    return HealthCheckResponse(
        status="healthy" if all(s == "healthy" for s in services.values()) else "degraded",
        timestamp=datetime.utcnow(),
        version="1.0.0",
        services=services
    )


# Metrics endpoint
@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint"""
    return generate_latest()


# Sourcing endpoints
@app.post("/api/v1/sourcing/request", response_model=ApiResponse)
async def create_sourcing_request(request: SourcingRequest):
    """Create a new sourcing request"""
    try:
        # Process through sourcing agent
        # TODO: Implement actual agent call
        
        return ApiResponse(
            success=True,
            message="Sourcing request created successfully",
            data={
                "request_id": "SRC-2024-001",
                "status": "processing",
                "estimated_completion": "2024-01-15T10:00:00"
            }
        )
    except Exception as e:
        logger.error(f"Error creating sourcing request: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@app.get("/api/v1/sourcing/request/{request_id}", response_model=ApiResponse)
async def get_sourcing_request(request_id: str):
    """Get sourcing request status"""
    try:
        # TODO: Implement actual data retrieval
        
        return ApiResponse(
            success=True,
            message="Sourcing request retrieved",
            data={
                "request_id": request_id,
                "status": "completed",
                "suppliers": []
            }
        )
    except Exception as e:
        logger.error(f"Error retrieving sourcing request: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# Purchase Order endpoints
@app.post("/api/v1/purchase-order/create", response_model=ApiResponse)
async def create_purchase_order(request: PurchaseOrderRequest):
    """Create a new purchase order"""
    try:
        # Process through PO agent
        # TODO: Implement actual agent call
        
        return ApiResponse(
            success=True,
            message="Purchase order created successfully",
            data={
                "po_number": "PO-2024-001",
                "status": "pending_approval",
                "sap_document": "4500000123"
            }
        )
    except Exception as e:
        logger.error(f"Error creating purchase order: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@app.get("/api/v1/purchase-order/{po_number}", response_model=ApiResponse)
async def get_purchase_order(po_number: str):
    """Get purchase order details"""
    try:
        # TODO: Implement actual data retrieval
        
        return ApiResponse(
            success=True,
            message="Purchase order retrieved",
            data={
                "po_number": po_number,
                "status": "approved",
                "details": {}
            }
        )
    except Exception as e:
        logger.error(f"Error retrieving purchase order: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# Vendor Management endpoints
@app.post("/api/v1/vendor/onboard", response_model=ApiResponse)
async def onboard_vendor(request: VendorOnboardingRequest):
    """Onboard a new vendor"""
    try:
        # Process through vendor management agent
        # TODO: Implement actual agent call
        
        return ApiResponse(
            success=True,
            message="Vendor onboarding initiated",
            data={
                "vendor_id": "V-2024-001",
                "status": "pending_verification",
                "next_steps": ["document_verification", "site_audit"]
            }
        )
    except Exception as e:
        logger.error(f"Error onboarding vendor: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@app.get("/api/v1/vendor/{vendor_id}/performance", response_model=ApiResponse)
async def get_vendor_performance(vendor_id: str):
    """Get vendor performance metrics"""
    try:
        # TODO: Implement actual data retrieval
        
        return ApiResponse(
            success=True,
            message="Vendor performance retrieved",
            data={
                "vendor_id": vendor_id,
                "on_time_delivery": 0.95,
                "quality_score": 0.92,
                "overall_rating": 4.5
            }
        )
    except Exception as e:
        logger.error(f"Error retrieving vendor performance: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# Invoice Processing endpoints
@app.post("/api/v1/invoice/process", response_model=ApiResponse)
async def process_invoice(request: InvoiceProcessingRequest):
    """Process an invoice"""
    try:
        # Process through invoice agent
        # TODO: Implement actual agent call
        
        return ApiResponse(
            success=True,
            message="Invoice processing started",
            data={
                "invoice_id": "INV-2024-001",
                "status": "three_way_matching",
                "match_result": "pending"
            }
        )
    except Exception as e:
        logger.error(f"Error processing invoice: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# Spend Analytics endpoints
@app.get("/api/v1/analytics/spend/{period}", response_model=ApiResponse)
async def get_spend_analytics(period: str):
    """Get spend analytics for a period"""
    try:
        # TODO: Implement actual analytics
        
        return ApiResponse(
            success=True,
            message="Spend analytics retrieved",
            data={
                "period": period,
                "total_spend": 1500000,
                "categories": {},
                "savings_identified": 75000
            }
        )
    except Exception as e:
        logger.error(f"Error retrieving spend analytics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# Workflow Integration endpoints
@app.post("/api/v1/workflow/webhook/{workflow_id}", response_model=ApiResponse)
async def workflow_webhook(workflow_id: str, request: Request):
    """Webhook endpoint for n8n workflows"""
    try:
        body = await request.json()
        
        # Process webhook data
        # TODO: Implement actual workflow processing
        
        return ApiResponse(
            success=True,
            message="Workflow webhook processed",
            data={
                "workflow_id": workflow_id,
                "status": "processed"
            }
        )
    except Exception as e:
        logger.error(f"Error processing workflow webhook: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# Admin endpoints
@app.get("/api/v1/admin/agents", response_model=ApiResponse)
async def list_agents(request: Request):
    """List all registered agents"""
    try:
        agents_info = []
        
        for agent_name, agent in request.app.state.agents.items():
            health = await agent.health_check()
            agents_info.append({
                "name": agent_name,
                "id": agent.agent_id,
                "status": health["status"],
                "metrics": health["metrics"]
            })
        
        return ApiResponse(
            success=True,
            message="Agents list retrieved",
            data={"agents": agents_info}
        )
    except Exception as e:
        logger.error(f"Error listing agents: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )