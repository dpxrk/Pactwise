"""
Contract Intelligence Service - Main Application
Advanced contract analysis using transformer models and LLMs
"""

import os
import sys
import time
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

# Add shared module to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from shared.models import (
    ContractRequest,
    ContractResponse,
    ContractClause,
    RiskFactor,
    ComplianceCheck,
    RiskLevel,
    ConfidenceLevel,
    ErrorResponse
)

from src.analyzers import ContractAnalyzer
from src.extractors import ClauseExtractor, EntityExtractor
from src.risk_assessor import RiskAssessor
from src.compliance_checker import ComplianceChecker
from src.timeline_generator import TimelineGenerator
from src.llm_integration import LLMAnalyzer
from src.cache_manager import CacheManager
from src.metrics import MetricsCollector

# Configure logging
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global instances
contract_analyzer: Optional[ContractAnalyzer] = None
clause_extractor: Optional[ClauseExtractor] = None
entity_extractor: Optional[EntityExtractor] = None
risk_assessor: Optional[RiskAssessor] = None
compliance_checker: Optional[ComplianceChecker] = None
timeline_generator: Optional[TimelineGenerator] = None
llm_analyzer: Optional[LLMAnalyzer] = None
cache_manager: Optional[CacheManager] = None
metrics_collector: Optional[MetricsCollector] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle."""
    # Startup
    logger.info("Starting Contract Intelligence Service...")
    
    global contract_analyzer, clause_extractor, entity_extractor
    global risk_assessor, compliance_checker, timeline_generator
    global llm_analyzer, cache_manager, metrics_collector
    
    try:
        # Initialize components
        cache_manager = CacheManager()
        metrics_collector = MetricsCollector()
        
        # Initialize ML models
        contract_analyzer = ContractAnalyzer()
        clause_extractor = ClauseExtractor()
        entity_extractor = EntityExtractor()
        risk_assessor = RiskAssessor()
        compliance_checker = ComplianceChecker()
        timeline_generator = TimelineGenerator()
        
        # Initialize LLM if API keys are available
        if os.getenv("OPENAI_API_KEY") or os.getenv("ANTHROPIC_API_KEY"):
            llm_analyzer = LLMAnalyzer()
            logger.info("LLM integration initialized")
        else:
            logger.warning("No LLM API keys found, running in local mode only")
        
        logger.info("All components initialized successfully")
        
    except Exception as e:
        logger.error(f"Failed to initialize components: {e}")
        raise
    
    yield
    
    # Shutdown
    logger.info("Shutting down Contract Intelligence Service...")
    if cache_manager:
        await cache_manager.close()


# Create FastAPI app
app = FastAPI(
    title="Contract Intelligence Service",
    description="Advanced AI-powered contract analysis with transformer models",
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


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "service": "Contract Intelligence",
        "version": "1.0.0",
        "status": "operational",
        "capabilities": [
            "clause_extraction",
            "risk_assessment",
            "compliance_checking",
            "timeline_generation",
            "entity_extraction",
            "llm_analysis" if llm_analyzer else None
        ]
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    health_status = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "components": {
            "contract_analyzer": contract_analyzer is not None,
            "clause_extractor": clause_extractor is not None,
            "risk_assessor": risk_assessor is not None,
            "compliance_checker": compliance_checker is not None,
            "llm_analyzer": llm_analyzer is not None,
            "cache": cache_manager is not None and await cache_manager.ping()
        }
    }
    
    # Check if all critical components are healthy
    critical_components = [
        health_status["components"]["contract_analyzer"],
        health_status["components"]["clause_extractor"],
        health_status["components"]["risk_assessor"]
    ]
    
    if not all(critical_components):
        health_status["status"] = "degraded"
        return JSONResponse(content=health_status, status_code=503)
    
    return health_status


@app.post("/analyze", response_model=ContractResponse)
async def analyze_contract(
    request: ContractRequest,
    background_tasks: BackgroundTasks
):
    """
    Analyze a contract with advanced AI models.
    
    This endpoint performs comprehensive contract analysis including:
    - Clause extraction and classification
    - Risk assessment and scoring
    - Compliance checking against regulations
    - Timeline and obligation extraction
    - AI-powered recommendations
    """
    start_time = time.time()
    request_id = f"req_{int(time.time() * 1000)}"
    
    try:
        # Check cache first
        if cache_manager:
            cached_result = await cache_manager.get_analysis(request.text)
            if cached_result:
                metrics_collector.record_cache_hit()
                return cached_result
        
        # Step 1: Extract clauses
        logger.info(f"[{request_id}] Extracting clauses...")
        clauses = await clause_extractor.extract(request.text)
        
        # Step 2: Extract entities
        logger.info(f"[{request_id}] Extracting entities...")
        entities = await entity_extractor.extract(request.text)
        
        # Step 3: Assess risks
        logger.info(f"[{request_id}] Assessing risks...")
        risk_analysis = await risk_assessor.assess(request.text, clauses)
        
        # Step 4: Check compliance
        logger.info(f"[{request_id}] Checking compliance...")
        compliance_results = await compliance_checker.check(
            request.text,
            request.regulations
        )
        
        # Step 5: Generate timeline
        logger.info(f"[{request_id}] Generating timeline...")
        timeline = await timeline_generator.generate(request.text, entities)
        
        # Step 6: Extract key obligations
        obligations = extract_obligations(clauses, entities)
        
        # Step 7: Use LLM for enhanced analysis if available
        recommendations = []
        confidence = ConfidenceLevel.MEDIUM
        
        if llm_analyzer and request.analysis_type in ["deep", "full"]:
            logger.info(f"[{request_id}] Running LLM analysis...")
            llm_result = await llm_analyzer.analyze(
                request.text,
                clauses,
                risk_analysis,
                compliance_results
            )
            recommendations.extend(llm_result.get("recommendations", []))
            confidence = ConfidenceLevel.HIGH
        else:
            # Generate rule-based recommendations
            recommendations = generate_recommendations(
                risk_analysis,
                compliance_results,
                clauses
            )
        
        # Calculate scores
        risk_score = calculate_risk_score(risk_analysis["factors"])
        compliance_score = calculate_compliance_score(compliance_results)
        
        # Build response
        response = ContractResponse(
            request_id=request_id,
            clauses=clauses,
            risk_score=risk_score,
            risk_factors=risk_analysis["factors"],
            compliance_checks=compliance_results,
            overall_compliance_score=compliance_score,
            recommendations=recommendations[:10],  # Top 10 recommendations
            key_obligations=obligations,
            timeline=timeline,
            confidence=confidence,
            processing_time_ms=int((time.time() - start_time) * 1000),
            model_version="1.0.0"
        )
        
        # Cache result asynchronously
        if cache_manager:
            background_tasks.add_task(
                cache_manager.store_analysis,
                request.text,
                response
            )
        
        # Record metrics
        metrics_collector.record_analysis(
            processing_time=response.processing_time_ms,
            risk_score=risk_score,
            compliance_score=compliance_score
        )
        
        logger.info(f"[{request_id}] Analysis completed in {response.processing_time_ms}ms")
        return response
        
    except Exception as e:
        logger.error(f"[{request_id}] Analysis failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Analysis failed: {str(e)}"
        )


@app.post("/analyze/quick")
async def quick_analysis(request: ContractRequest):
    """
    Perform quick contract analysis using only local models.
    Faster but less comprehensive than full analysis.
    """
    request.analysis_type = "quick"
    request.include_explanations = False
    return await analyze_contract(request, BackgroundTasks())


@app.post("/analyze/batch")
async def batch_analysis(contracts: List[ContractRequest]):
    """
    Analyze multiple contracts in batch.
    Returns a list of analysis results.
    """
    results = []
    for contract in contracts:
        try:
            result = await analyze_contract(contract, BackgroundTasks())
            results.append({"success": True, "data": result})
        except Exception as e:
            results.append({"success": False, "error": str(e)})
    
    return {"results": results, "total": len(contracts)}


@app.get("/metrics")
async def get_metrics():
    """Get service metrics for monitoring."""
    if metrics_collector:
        return metrics_collector.get_metrics()
    return {"error": "Metrics not available"}


@app.post("/feedback")
async def submit_feedback(
    request_id: str,
    rating: int,
    comments: Optional[str] = None
):
    """Submit feedback for an analysis to improve the model."""
    # Store feedback for model improvement
    logger.info(f"Feedback received for {request_id}: rating={rating}")
    
    # TODO: Implement feedback storage and processing
    
    return {"status": "feedback_received", "request_id": request_id}


# Utility functions
def extract_obligations(
    clauses: List[ContractClause],
    entities: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """Extract key obligations from clauses and entities."""
    obligations = []
    
    for clause in clauses:
        if clause.obligations:
            for obligation in clause.obligations:
                obligations.append({
                    "text": obligation,
                    "clause_id": clause.id,
                    "type": clause.type,
                    "deadlines": clause.deadlines,
                    "monetary_values": clause.monetary_values,
                    "priority": "high" if clause.risk_level in [RiskLevel.CRITICAL, RiskLevel.HIGH] else "medium"
                })
    
    return obligations


def generate_recommendations(
    risk_analysis: Dict[str, Any],
    compliance_results: List[ComplianceCheck],
    clauses: List[ContractClause]
) -> List[str]:
    """Generate recommendations based on analysis results."""
    recommendations = []
    
    # Risk-based recommendations
    for factor in risk_analysis.get("factors", []):
        if factor.severity > 0.7 and factor.mitigation:
            recommendations.append(factor.mitigation)
    
    # Compliance-based recommendations
    for check in compliance_results:
        if not check.compliant:
            recommendations.extend(check.recommendations[:2])
    
    # Clause-based recommendations
    high_risk_clauses = [c for c in clauses if c.risk_level in [RiskLevel.CRITICAL, RiskLevel.HIGH]]
    if len(high_risk_clauses) > 3:
        recommendations.append("Multiple high-risk clauses detected - prioritize legal review")
    
    # Check for missing important clause types
    clause_types = set(c.type for c in clauses)
    important_types = {"termination", "liability", "confidentiality", "dispute_resolution"}
    missing_types = important_types - clause_types
    
    for missing_type in missing_types:
        recommendations.append(f"Consider adding {missing_type.replace('_', ' ')} clause")
    
    return list(set(recommendations))  # Remove duplicates


def calculate_risk_score(risk_factors: List[RiskFactor]) -> float:
    """Calculate overall risk score from risk factors."""
    if not risk_factors:
        return 0.0
    
    total_severity = sum(f.severity * f.confidence for f in risk_factors)
    max_possible = len(risk_factors)
    
    return min(100.0, (total_severity / max_possible) * 100) if max_possible > 0 else 0.0


def calculate_compliance_score(compliance_checks: List[ComplianceCheck]) -> float:
    """Calculate overall compliance score."""
    if not compliance_checks:
        return 100.0
    
    total_score = sum(c.score for c in compliance_checks)
    return total_score / len(compliance_checks)


if __name__ == "__main__":
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level=os.getenv("LOG_LEVEL", "info").lower()
    )