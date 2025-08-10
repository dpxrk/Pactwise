"""
Compliance Orchestrator Service - Main Application
AI-powered regulatory compliance monitoring and management
"""

import os
import sys
import time
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, BackgroundTasks, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

# Add shared module to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from shared.models import (
    ComplianceRequest,
    ComplianceResponse,
    ComplianceCheck,
    ComplianceIssue,
    ComplianceScore,
    ConfidenceLevel,
    ErrorResponse
)

from src.regulation_tracker import RegulationTracker
from src.compliance_analyzer import ComplianceAnalyzer
from src.gap_detector import GapDetector
from src.remediation_planner import RemediationPlanner
from src.audit_manager import AuditManager
from src.policy_generator import PolicyGenerator

# Configure logging
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global instances
regulation_tracker: Optional[RegulationTracker] = None
compliance_analyzer: Optional[ComplianceAnalyzer] = None
gap_detector: Optional[GapDetector] = None
remediation_planner: Optional[RemediationPlanner] = None
audit_manager: Optional[AuditManager] = None
policy_generator: Optional[PolicyGenerator] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle."""
    # Startup
    logger.info("Starting Compliance Orchestrator Service...")
    
    global regulation_tracker, compliance_analyzer, gap_detector
    global remediation_planner, audit_manager, policy_generator
    
    try:
        # Initialize components
        regulation_tracker = RegulationTracker()
        compliance_analyzer = ComplianceAnalyzer()
        gap_detector = GapDetector()
        remediation_planner = RemediationPlanner()
        audit_manager = AuditManager()
        policy_generator = PolicyGenerator()
        
        # Load regulation database
        await regulation_tracker.initialize()
        
        logger.info("All components initialized successfully")
        
    except Exception as e:
        logger.error(f"Failed to initialize components: {e}")
        raise
    
    yield
    
    # Shutdown
    logger.info("Shutting down Compliance Orchestrator Service...")
    if regulation_tracker:
        await regulation_tracker.cleanup()


# Create FastAPI app
app = FastAPI(
    title="Compliance Orchestrator Service",
    description="AI-powered regulatory compliance monitoring and management",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "service": "Compliance Orchestrator",
        "version": "1.0.0",
        "status": "operational",
        "capabilities": [
            "multi_regulation_compliance",
            "gap_detection",
            "remediation_planning",
            "audit_management",
            "policy_generation",
            "real_time_monitoring"
        ]
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "components": {
            "regulation_tracker": regulation_tracker is not None,
            "compliance_analyzer": compliance_analyzer is not None,
            "gap_detector": gap_detector is not None,
            "remediation_planner": remediation_planner is not None,
            "audit_manager": audit_manager is not None,
            "policy_generator": policy_generator is not None
        }
    }


@app.post("/analyze", response_model=ComplianceResponse)
async def analyze_compliance(
    request: ComplianceRequest,
    background_tasks: BackgroundTasks
):
    """
    Analyze document/contract for compliance.
    
    This endpoint performs:
    - Multi-regulation compliance checking
    - Gap detection and analysis
    - Risk assessment
    - Remediation recommendations
    - Policy suggestions
    """
    start_time = time.time()
    
    try:
        # Step 1: Identify applicable regulations
        logger.info("Identifying applicable regulations...")
        applicable_regulations = await regulation_tracker.identify_regulations(
            request.document_text,
            request.document_type,
            request.jurisdiction
        )
        
        # Step 2: Perform compliance analysis
        logger.info(f"Analyzing compliance for {len(applicable_regulations)} regulations...")
        compliance_results = await compliance_analyzer.analyze(
            request.document_text,
            applicable_regulations,
            request.industry
        )
        
        # Step 3: Detect gaps
        logger.info("Detecting compliance gaps...")
        gaps = await gap_detector.detect_gaps(
            request.document_text,
            compliance_results,
            applicable_regulations
        )
        
        # Step 4: Generate remediation plan
        logger.info("Generating remediation plan...")
        remediation_plan = await remediation_planner.create_plan(
            gaps,
            request.priority_level
        )
        
        # Step 5: Calculate overall compliance score
        overall_score = calculate_overall_score(compliance_results)
        compliance_status = determine_compliance_status(overall_score)
        confidence = determine_confidence(compliance_results, gaps)
        
        # Step 6: Generate recommendations
        recommendations = generate_recommendations(
            compliance_results,
            gaps,
            remediation_plan
        )
        
        # Build response
        response = ComplianceResponse(
            document_id=request.document_id,
            compliance_status=compliance_status,
            overall_score=overall_score,
            regulations_checked=applicable_regulations,
            compliance_checks=compliance_results[:20],  # Top 20 checks
            issues=gaps[:10],  # Top 10 issues
            remediation_plan=remediation_plan,
            recommendations=recommendations[:5],  # Top 5 recommendations
            confidence=confidence,
            processing_time_ms=int((time.time() - start_time) * 1000)
        )
        
        # Background task: Store audit trail
        background_tasks.add_task(
            audit_manager.log_compliance_check,
            request.document_id,
            response.dict()
        )
        
        logger.info(f"Compliance analysis completed in {response.processing_time_ms}ms")
        return response
        
    except Exception as e:
        logger.error(f"Compliance analysis failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Analysis failed: {str(e)}"
        )


@app.post("/check-regulation")
async def check_specific_regulation(
    document_text: str,
    regulation: str
):
    """
    Check compliance with a specific regulation.
    
    Args:
        document_text: Document to check
        regulation: Regulation name (e.g., "GDPR", "HIPAA")
    """
    try:
        # Get regulation requirements
        requirements = await regulation_tracker.get_requirements(regulation)
        
        if not requirements:
            raise HTTPException(
                status_code=404,
                detail=f"Regulation {regulation} not found"
            )
        
        # Analyze compliance
        compliance_result = await compliance_analyzer.check_regulation(
            document_text,
            regulation,
            requirements
        )
        
        return {
            "regulation": regulation,
            "compliant": compliance_result.get("compliant"),
            "score": compliance_result.get("score"),
            "missing_requirements": compliance_result.get("missing"),
            "recommendations": compliance_result.get("recommendations")
        }
        
    except Exception as e:
        logger.error(f"Regulation check failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/generate-policy")
async def generate_policy(
    requirements: Dict[str, Any],
    template_type: str = "standard"
):
    """
    Generate compliance policy document.
    
    Args:
        requirements: Policy requirements
        template_type: Type of policy template
    """
    try:
        # Generate policy
        policy = await policy_generator.generate(
            requirements,
            template_type
        )
        
        return {
            "policy_document": policy.get("document"),
            "sections": policy.get("sections"),
            "compliance_mappings": policy.get("mappings"),
            "review_checklist": policy.get("checklist")
        }
        
    except Exception as e:
        logger.error(f"Policy generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/regulations")
async def list_regulations(
    jurisdiction: Optional[str] = None,
    industry: Optional[str] = None
):
    """
    List available regulations.
    
    Args:
        jurisdiction: Filter by jurisdiction
        industry: Filter by industry
    """
    try:
        regulations = await regulation_tracker.list_regulations(
            jurisdiction,
            industry
        )
        
        return {
            "total": len(regulations),
            "regulations": regulations
        }
        
    except Exception as e:
        logger.error(f"Failed to list regulations: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/audit/start")
async def start_audit(
    audit_config: Dict[str, Any]
):
    """
    Start compliance audit process.
    
    Args:
        audit_config: Audit configuration
    """
    try:
        audit_id = await audit_manager.start_audit(audit_config)
        
        return {
            "audit_id": audit_id,
            "status": "started",
            "estimated_completion": datetime.utcnow() + timedelta(hours=2)
        }
        
    except Exception as e:
        logger.error(f"Failed to start audit: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/audit/{audit_id}/status")
async def get_audit_status(audit_id: str):
    """Get audit status."""
    try:
        status = await audit_manager.get_audit_status(audit_id)
        
        if not status:
            raise HTTPException(status_code=404, detail="Audit not found")
        
        return status
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get audit status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/monitor/setup")
async def setup_monitoring(
    monitoring_config: Dict[str, Any]
):
    """
    Setup continuous compliance monitoring.
    
    Args:
        monitoring_config: Monitoring configuration
    """
    try:
        # Setup monitoring
        monitor_id = await compliance_analyzer.setup_monitoring(
            monitoring_config
        )
        
        return {
            "monitor_id": monitor_id,
            "status": "active",
            "check_frequency": monitoring_config.get("frequency", "daily"),
            "regulations": monitoring_config.get("regulations", [])
        }
        
    except Exception as e:
        logger.error(f"Failed to setup monitoring: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/updates/regulations")
async def get_regulation_updates(
    since: Optional[datetime] = None
):
    """Get recent regulation updates."""
    try:
        updates = await regulation_tracker.get_updates(since)
        
        return {
            "total_updates": len(updates),
            "updates": updates,
            "last_check": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to get updates: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# Utility functions
def calculate_overall_score(
    compliance_results: List[ComplianceCheck]
) -> float:
    """Calculate overall compliance score."""
    if not compliance_results:
        return 0.0
    
    total_score = 0
    total_weight = 0
    
    for check in compliance_results:
        weight = 1.0
        if hasattr(check, 'severity'):
            weight_map = {"critical": 3.0, "high": 2.0, "medium": 1.5, "low": 1.0}
            weight = weight_map.get(check.severity, 1.0)
        
        if hasattr(check, 'score'):
            total_score += check.score * weight
            total_weight += weight
    
    return (total_score / total_weight) if total_weight > 0 else 0.0


def determine_compliance_status(score: float) -> str:
    """Determine compliance status from score."""
    if score >= 95:
        return "fully_compliant"
    elif score >= 80:
        return "mostly_compliant"
    elif score >= 60:
        return "partially_compliant"
    elif score >= 40:
        return "non_compliant"
    else:
        return "severely_non_compliant"


def determine_confidence(
    compliance_results: List[ComplianceCheck],
    gaps: List[ComplianceIssue]
) -> ConfidenceLevel:
    """Determine confidence level of analysis."""
    confidence_score = 70  # Base confidence
    
    # More checks increase confidence
    if len(compliance_results) > 20:
        confidence_score += 15
    elif len(compliance_results) > 10:
        confidence_score += 10
    
    # Fewer gaps increase confidence
    if len(gaps) == 0:
        confidence_score += 15
    elif len(gaps) < 5:
        confidence_score += 5
    
    if confidence_score >= 85:
        return ConfidenceLevel.VERY_HIGH
    elif confidence_score >= 75:
        return ConfidenceLevel.HIGH
    elif confidence_score >= 60:
        return ConfidenceLevel.MEDIUM
    elif confidence_score >= 40:
        return ConfidenceLevel.LOW
    else:
        return ConfidenceLevel.VERY_LOW


def generate_recommendations(
    compliance_results: List[ComplianceCheck],
    gaps: List[ComplianceIssue],
    remediation_plan: Dict[str, Any]
) -> List[str]:
    """Generate compliance recommendations."""
    recommendations = []
    
    # Critical gaps
    critical_gaps = [g for g in gaps if hasattr(g, 'severity') and g.severity == "critical"]
    if critical_gaps:
        recommendations.append(f"Address {len(critical_gaps)} critical compliance gaps immediately")
    
    # Low scores
    low_score_checks = [c for c in compliance_results if hasattr(c, 'score') and c.score < 50]
    if low_score_checks:
        recommendations.append(f"Improve compliance in {len(low_score_checks)} areas with low scores")
    
    # Remediation priority
    if remediation_plan and "high_priority" in remediation_plan:
        recommendations.append("Focus on high-priority remediation items first")
    
    # Monitoring
    if len(gaps) > 10:
        recommendations.append("Implement continuous compliance monitoring")
    
    # Training
    if any("awareness" in str(g).lower() for g in gaps if hasattr(g, '__str__')):
        recommendations.append("Conduct compliance training for relevant personnel")
    
    return recommendations


if __name__ == "__main__":
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8002,
        reload=True,
        log_level=os.getenv("LOG_LEVEL", "info").lower()
    )