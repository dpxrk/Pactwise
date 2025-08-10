"""
Vendor Risk Prediction Service - Main Application
Advanced vendor risk analysis using time-series forecasting and network analysis
"""

import os
import sys
import time
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

# Add shared module to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from shared.models import (
    VendorRequest,
    VendorResponse,
    VendorMetrics,
    VendorRisk,
    RiskLevel,
    ConfidenceLevel,
    ErrorResponse
)

from src.time_series_analyzer import TimeSeriesAnalyzer
from src.risk_predictor import VendorRiskPredictor
from src.network_analyzer import VendorNetworkAnalyzer
from src.early_warning_system import EarlyWarningSystem
from src.optimization_engine import VendorOptimizationEngine

# Configure logging
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global instances
time_series_analyzer: Optional[TimeSeriesAnalyzer] = None
risk_predictor: Optional[VendorRiskPredictor] = None
network_analyzer: Optional[VendorNetworkAnalyzer] = None
early_warning: Optional[EarlyWarningSystem] = None
optimization_engine: Optional[VendorOptimizationEngine] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle."""
    # Startup
    logger.info("Starting Vendor Risk Prediction Service...")
    
    global time_series_analyzer, risk_predictor, network_analyzer
    global early_warning, optimization_engine
    
    try:
        # Initialize components
        time_series_analyzer = TimeSeriesAnalyzer()
        risk_predictor = VendorRiskPredictor()
        network_analyzer = VendorNetworkAnalyzer()
        early_warning = EarlyWarningSystem()
        optimization_engine = VendorOptimizationEngine()
        
        logger.info("All components initialized successfully")
        
    except Exception as e:
        logger.error(f"Failed to initialize components: {e}")
        raise
    
    yield
    
    # Shutdown
    logger.info("Shutting down Vendor Risk Prediction Service...")


# Create FastAPI app
app = FastAPI(
    title="Vendor Risk Prediction Service",
    description="AI-powered vendor risk analysis with time-series forecasting",
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
        "service": "Vendor Risk Prediction",
        "version": "1.0.0",
        "status": "operational",
        "capabilities": [
            "time_series_analysis",
            "risk_prediction",
            "network_analysis",
            "early_warning",
            "vendor_optimization"
        ]
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "components": {
            "time_series": time_series_analyzer is not None,
            "risk_predictor": risk_predictor is not None,
            "network_analyzer": network_analyzer is not None,
            "early_warning": early_warning is not None,
            "optimization": optimization_engine is not None
        }
    }


@app.post("/analyze", response_model=VendorResponse)
async def analyze_vendor(
    request: VendorRequest,
    background_tasks: BackgroundTasks
):
    """
    Analyze vendor risk with advanced ML models.
    
    This endpoint performs:
    - Time-series analysis of vendor performance
    - Risk prediction using ensemble models
    - Network dependency analysis
    - Early warning signal detection
    - Optimization recommendations
    """
    start_time = time.time()
    
    try:
        # Step 1: Parse vendor data
        vendor_data = parse_vendor_data(request.vendor_data)
        
        # Step 2: Calculate current metrics
        metrics = calculate_vendor_metrics(vendor_data)
        
        # Step 3: Time-series analysis if historical data available
        predictions = None
        if request.historical_data and request.include_predictions:
            logger.info("Running time-series analysis...")
            ts_results = await time_series_analyzer.analyze(
                request.historical_data,
                request.time_horizon
            )
            predictions = ts_results
        
        # Step 4: Risk assessment
        logger.info("Assessing vendor risks...")
        risks = await risk_predictor.predict_risks(
            vendor_data,
            metrics,
            request.historical_data
        )
        
        # Step 5: Network analysis
        logger.info("Analyzing vendor network...")
        network_risks = await network_analyzer.analyze_dependencies(
            request.vendor_id or "unknown",
            vendor_data
        )
        risks.extend(network_risks)
        
        # Step 6: Early warning signals
        logger.info("Checking early warning signals...")
        warnings = await early_warning.detect_signals(
            vendor_data,
            metrics,
            request.historical_data
        )
        
        # Step 7: Generate recommendations
        recommendations = await optimization_engine.generate_recommendations(
            metrics,
            risks,
            warnings
        )
        
        # Calculate scores
        overall_score = calculate_overall_score(metrics, risks)
        performance_grade = get_performance_grade(overall_score)
        confidence = determine_confidence(vendor_data, request.historical_data)
        
        # Build response
        response = VendorResponse(
            vendor_id=request.vendor_id,
            overall_score=overall_score,
            performance_grade=performance_grade,
            metrics=metrics,
            risks=risks[:10],  # Top 10 risks
            predictions=predictions,
            early_warnings=warnings[:5],  # Top 5 warnings
            recommendations=recommendations[:5],  # Top 5 recommendations
            confidence=confidence,
            processing_time_ms=int((time.time() - start_time) * 1000)
        )
        
        logger.info(f"Analysis completed in {response.processing_time_ms}ms")
        return response
        
    except Exception as e:
        logger.error(f"Vendor analysis failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Analysis failed: {str(e)}"
        )


@app.post("/predict")
async def predict_vendor_performance(
    vendor_id: str,
    horizon_days: int = 90
):
    """
    Predict future vendor performance.
    
    Args:
        vendor_id: Vendor identifier
        horizon_days: Prediction horizon in days
    """
    try:
        # TODO: Fetch historical data from database
        historical_data = []
        
        if not historical_data:
            return {"error": "No historical data available for vendor"}
        
        # Run prediction
        predictions = await time_series_analyzer.forecast(
            historical_data,
            horizon_days
        )
        
        return {
            "vendor_id": vendor_id,
            "predictions": predictions,
            "horizon_days": horizon_days,
            "confidence_intervals": predictions.get("confidence_intervals")
        }
        
    except Exception as e:
        logger.error(f"Prediction failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/network/analyze")
async def analyze_vendor_network(
    vendor_ids: List[str]
):
    """
    Analyze vendor network dependencies and risks.
    
    Args:
        vendor_ids: List of vendor identifiers to analyze
    """
    try:
        # Build network
        network = await network_analyzer.build_network(vendor_ids)
        
        # Analyze risks
        cascade_risks = await network_analyzer.simulate_cascade_failure(network)
        critical_vendors = await network_analyzer.identify_critical_nodes(network)
        
        return {
            "network_size": len(vendor_ids),
            "critical_vendors": critical_vendors,
            "cascade_risks": cascade_risks,
            "resilience_score": network.get("resilience_score"),
            "recommendations": network.get("recommendations")
        }
        
    except Exception as e:
        logger.error(f"Network analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/warnings/active")
async def get_active_warnings():
    """Get currently active early warning signals."""
    try:
        warnings = await early_warning.get_active_warnings()
        
        return {
            "total_warnings": len(warnings),
            "critical": [w for w in warnings if w.get("severity") == "critical"],
            "high": [w for w in warnings if w.get("severity") == "high"],
            "medium": [w for w in warnings if w.get("severity") == "medium"],
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to get warnings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# Utility functions
def parse_vendor_data(vendor_data: str) -> Dict[str, Any]:
    """Parse vendor data from text format."""
    data = {}
    lines = vendor_data.strip().split('\n')
    
    for line in lines:
        if ':' in line:
            key, value = line.split(':', 1)
            key = key.strip().lower().replace(' ', '_')
            value = value.strip()
            
            # Parse numeric values
            if any(char.isdigit() for char in value):
                # Extract numbers
                import re
                numbers = re.findall(r'[\d.]+', value)
                if numbers:
                    try:
                        data[key] = float(numbers[0])
                    except:
                        data[key] = value
            else:
                data[key] = value
    
    return data


def calculate_vendor_metrics(vendor_data: Dict[str, Any]) -> VendorMetrics:
    """Calculate vendor performance metrics."""
    return VendorMetrics(
        on_time_delivery=vendor_data.get('delivery_performance', 85.0),
        quality_score=vendor_data.get('quality_metrics', 80.0),
        response_time=vendor_data.get('support_response', 75.0),
        cost_efficiency=vendor_data.get('cost_efficiency', 70.0),
        compliance_rate=vendor_data.get('compliance', 90.0)
    )


def calculate_overall_score(
    metrics: VendorMetrics,
    risks: List[VendorRisk]
) -> float:
    """Calculate overall vendor score."""
    # Base score from metrics (weighted average)
    metric_score = (
        metrics.on_time_delivery * 0.25 +
        metrics.quality_score * 0.25 +
        metrics.response_time * 0.15 +
        metrics.cost_efficiency * 0.15 +
        metrics.compliance_rate * 0.20
    )
    
    # Adjust for risks
    risk_penalty = 0
    for risk in risks:
        if risk.level == RiskLevel.CRITICAL:
            risk_penalty += 10
        elif risk.level == RiskLevel.HIGH:
            risk_penalty += 5
        elif risk.level == RiskLevel.MEDIUM:
            risk_penalty += 2
    
    overall_score = max(0, metric_score - risk_penalty)
    
    return min(100, overall_score)


def get_performance_grade(score: float) -> str:
    """Convert score to performance grade."""
    if score >= 90:
        return "A"
    elif score >= 80:
        return "B+"
    elif score >= 70:
        return "B"
    elif score >= 60:
        return "C+"
    elif score >= 50:
        return "C"
    else:
        return "D"


def determine_confidence(
    vendor_data: Dict[str, Any],
    historical_data: Optional[List[Dict[str, Any]]]
) -> ConfidenceLevel:
    """Determine confidence level of analysis."""
    confidence_score = 50  # Base confidence
    
    # More data points increase confidence
    if len(vendor_data) > 10:
        confidence_score += 20
    elif len(vendor_data) > 5:
        confidence_score += 10
    
    # Historical data increases confidence
    if historical_data:
        if len(historical_data) > 100:
            confidence_score += 30
        elif len(historical_data) > 50:
            confidence_score += 20
        elif len(historical_data) > 20:
            confidence_score += 10
    
    if confidence_score >= 80:
        return ConfidenceLevel.VERY_HIGH
    elif confidence_score >= 70:
        return ConfidenceLevel.HIGH
    elif confidence_score >= 50:
        return ConfidenceLevel.MEDIUM
    elif confidence_score >= 30:
        return ConfidenceLevel.LOW
    else:
        return ConfidenceLevel.VERY_LOW


if __name__ == "__main__":
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level=os.getenv("LOG_LEVEL", "info").lower()
    )