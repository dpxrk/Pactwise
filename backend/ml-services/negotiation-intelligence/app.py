"""
Negotiation Intelligence Service - Main Application
AI-powered contract negotiation assistant with game theory and NLP
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
    NegotiationRequest,
    NegotiationResponse,
    NegotiationStrategy,
    ClauseRecommendation,
    NegotiationTactic,
    ConfidenceLevel,
    ErrorResponse
)

from src.strategy_engine import StrategyEngine
from src.clause_optimizer import ClauseOptimizer
from src.concession_analyzer import ConcessionAnalyzer
from src.game_theory_modeler import GameTheoryModeler
from src.negotiation_simulator import NegotiationSimulator
from src.benchmark_analyzer import BenchmarkAnalyzer

# Configure logging
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global instances
strategy_engine: Optional[StrategyEngine] = None
clause_optimizer: Optional[ClauseOptimizer] = None
concession_analyzer: Optional[ConcessionAnalyzer] = None
game_theory_modeler: Optional[GameTheoryModeler] = None
negotiation_simulator: Optional[NegotiationSimulator] = None
benchmark_analyzer: Optional[BenchmarkAnalyzer] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle."""
    # Startup
    logger.info("Starting Negotiation Intelligence Service...")
    
    global strategy_engine, clause_optimizer, concession_analyzer
    global game_theory_modeler, negotiation_simulator, benchmark_analyzer
    
    try:
        # Initialize components
        strategy_engine = StrategyEngine()
        clause_optimizer = ClauseOptimizer()
        concession_analyzer = ConcessionAnalyzer()
        game_theory_modeler = GameTheoryModeler()
        negotiation_simulator = NegotiationSimulator()
        benchmark_analyzer = BenchmarkAnalyzer()
        
        # Load negotiation models
        await strategy_engine.initialize()
        await benchmark_analyzer.load_benchmarks()
        
        logger.info("All components initialized successfully")
        
    except Exception as e:
        logger.error(f"Failed to initialize components: {e}")
        raise
    
    yield
    
    # Shutdown
    logger.info("Shutting down Negotiation Intelligence Service...")


# Create FastAPI app
app = FastAPI(
    title="Negotiation Intelligence Service",
    description="AI-powered contract negotiation with game theory optimization",
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
        "service": "Negotiation Intelligence",
        "version": "1.0.0",
        "status": "operational",
        "capabilities": [
            "negotiation_strategy",
            "clause_optimization",
            "concession_analysis",
            "game_theory_modeling",
            "negotiation_simulation",
            "benchmark_analysis"
        ]
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "components": {
            "strategy_engine": strategy_engine is not None,
            "clause_optimizer": clause_optimizer is not None,
            "concession_analyzer": concession_analyzer is not None,
            "game_theory": game_theory_modeler is not None,
            "simulator": negotiation_simulator is not None,
            "benchmarks": benchmark_analyzer is not None
        }
    }


@app.post("/analyze", response_model=NegotiationResponse)
async def analyze_negotiation(
    request: NegotiationRequest,
    background_tasks: BackgroundTasks
):
    """
    Analyze negotiation position and provide recommendations.
    
    This endpoint performs:
    - Strategic position analysis
    - Clause-by-clause optimization
    - Concession point identification
    - Game theory modeling
    - Negotiation simulation
    - Benchmark comparison
    """
    start_time = time.time()
    
    try:
        # Step 1: Analyze current position
        logger.info("Analyzing negotiation position...")
        position_analysis = await strategy_engine.analyze_position(
            request.current_terms,
            request.target_terms,
            request.constraints
        )
        
        # Step 2: Optimize clauses
        logger.info("Optimizing contract clauses...")
        optimized_clauses = await clause_optimizer.optimize(
            request.current_terms,
            request.target_terms,
            request.negotiation_style
        )
        
        # Step 3: Analyze concession points
        logger.info("Analyzing concession points...")
        concession_points = await concession_analyzer.analyze(
            request.current_terms,
            request.target_terms,
            request.priorities
        )
        
        # Step 4: Game theory modeling
        logger.info("Running game theory analysis...")
        game_analysis = await game_theory_modeler.model_negotiation(
            position_analysis,
            request.counterparty_profile
        )
        
        # Step 5: Run negotiation simulation
        logger.info("Running negotiation simulation...")
        simulation_results = await negotiation_simulator.simulate(
            request.current_terms,
            request.target_terms,
            game_analysis,
            request.num_simulations
        )
        
        # Step 6: Benchmark analysis
        logger.info("Comparing with benchmarks...")
        benchmark_insights = await benchmark_analyzer.compare(
            request.current_terms,
            request.industry,
            request.deal_size
        )
        
        # Generate strategy recommendations
        strategy = generate_negotiation_strategy(
            position_analysis,
            game_analysis,
            simulation_results
        )
        
        # Generate tactics
        tactics = generate_negotiation_tactics(
            concession_points,
            game_analysis,
            request.negotiation_style
        )
        
        # Calculate confidence
        confidence = calculate_confidence(
            simulation_results,
            benchmark_insights
        )
        
        # Build response
        response = NegotiationResponse(
            negotiation_id=request.negotiation_id,
            strategy=strategy,
            recommended_clauses=optimized_clauses[:10],  # Top 10 clauses
            concession_points=concession_points[:5],  # Top 5 concession points
            tactics=tactics[:5],  # Top 5 tactics
            expected_outcome=simulation_results.get("expected_outcome"),
            success_probability=simulation_results.get("success_rate", 0.5),
            benchmark_insights=benchmark_insights,
            confidence=confidence,
            processing_time_ms=int((time.time() - start_time) * 1000)
        )
        
        logger.info(f"Negotiation analysis completed in {response.processing_time_ms}ms")
        return response
        
    except Exception as e:
        logger.error(f"Negotiation analysis failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Analysis failed: {str(e)}"
        )


@app.post("/optimize-clause")
async def optimize_single_clause(
    clause_text: str,
    optimization_goal: str
):
    """
    Optimize a single contract clause.
    
    Args:
        clause_text: Current clause text
        optimization_goal: Goal (e.g., "favorable_terms", "balanced", "protective")
    """
    try:
        optimized = await clause_optimizer.optimize_single(
            clause_text,
            optimization_goal
        )
        
        return {
            "original": clause_text,
            "optimized": optimized.get("text"),
            "improvements": optimized.get("improvements"),
            "risk_reduction": optimized.get("risk_reduction"),
            "alternatives": optimized.get("alternatives", [])[:3]
        }
        
    except Exception as e:
        logger.error(f"Clause optimization failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/simulate")
async def simulate_negotiation(
    scenario: Dict[str, Any],
    num_rounds: int = 10
):
    """
    Simulate negotiation rounds.
    
    Args:
        scenario: Negotiation scenario
        num_rounds: Number of rounds to simulate
    """
    try:
        results = await negotiation_simulator.run_simulation(
            scenario,
            num_rounds
        )
        
        return {
            "rounds": results.get("rounds"),
            "final_outcome": results.get("final_outcome"),
            "success_probability": results.get("success_probability"),
            "optimal_strategy": results.get("optimal_strategy"),
            "key_decision_points": results.get("decision_points")
        }
        
    except Exception as e:
        logger.error(f"Simulation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/analyze-counterparty")
async def analyze_counterparty(
    counterparty_data: Dict[str, Any]
):
    """
    Analyze counterparty negotiation style and predict behavior.
    
    Args:
        counterparty_data: Information about counterparty
    """
    try:
        analysis = await game_theory_modeler.analyze_counterparty(
            counterparty_data
        )
        
        return {
            "negotiation_style": analysis.get("style"),
            "predicted_priorities": analysis.get("priorities"),
            "likely_tactics": analysis.get("tactics"),
            "concession_pattern": analysis.get("concession_pattern"),
            "recommended_approach": analysis.get("recommended_approach")
        }
        
    except Exception as e:
        logger.error(f"Counterparty analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/benchmarks")
async def get_benchmarks(
    industry: Optional[str] = None,
    deal_size: Optional[str] = None
):
    """
    Get negotiation benchmarks.
    
    Args:
        industry: Industry filter
        deal_size: Deal size category
    """
    try:
        benchmarks = await benchmark_analyzer.get_benchmarks(
            industry,
            deal_size
        )
        
        return {
            "total_benchmarks": len(benchmarks),
            "benchmarks": benchmarks,
            "statistics": await benchmark_analyzer.get_statistics(industry, deal_size)
        }
        
    except Exception as e:
        logger.error(f"Failed to get benchmarks: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/generate-counteroffer")
async def generate_counteroffer(
    their_offer: Dict[str, Any],
    our_position: Dict[str, Any],
    negotiation_round: int = 1
):
    """
    Generate strategic counteroffer.
    
    Args:
        their_offer: Their latest offer
        our_position: Our position and constraints
        negotiation_round: Current round number
    """
    try:
        counteroffer = await strategy_engine.generate_counteroffer(
            their_offer,
            our_position,
            negotiation_round
        )
        
        return {
            "counteroffer": counteroffer.get("terms"),
            "justifications": counteroffer.get("justifications"),
            "concessions_made": counteroffer.get("concessions"),
            "expected_response": counteroffer.get("expected_response"),
            "alternative_options": counteroffer.get("alternatives", [])[:3]
        }
        
    except Exception as e:
        logger.error(f"Counteroffer generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# Utility functions
def generate_negotiation_strategy(
    position_analysis: Dict[str, Any],
    game_analysis: Dict[str, Any],
    simulation_results: Dict[str, Any]
) -> NegotiationStrategy:
    """Generate negotiation strategy."""
    # Determine approach based on analysis
    if position_analysis.get("leverage", 0) > 0.7:
        approach = "assertive"
        description = "Strong position - push for favorable terms"
    elif position_analysis.get("leverage", 0) < 0.3:
        approach = "collaborative"
        description = "Weak position - focus on win-win solutions"
    else:
        approach = "balanced"
        description = "Balanced position - strategic give and take"
    
    # Key objectives
    objectives = []
    if "critical_terms" in position_analysis:
        objectives.extend([f"Secure {term}" for term in position_analysis["critical_terms"][:3]])
    
    # Risk factors
    risks = []
    if game_analysis.get("deadlock_probability", 0) > 0.3:
        risks.append("High risk of negotiation deadlock")
    if simulation_results.get("volatility", 0) > 0.5:
        risks.append("Unpredictable negotiation dynamics")
    
    return NegotiationStrategy(
        approach=approach,
        description=description,
        key_objectives=objectives[:5],
        risk_factors=risks[:3],
        success_probability=simulation_results.get("success_rate", 0.5)
    )


def generate_negotiation_tactics(
    concession_points: List[Dict[str, Any]],
    game_analysis: Dict[str, Any],
    negotiation_style: str
) -> List[NegotiationTactic]:
    """Generate specific negotiation tactics."""
    tactics = []
    
    # Opening move
    tactics.append(NegotiationTactic(
        tactic_type="opening",
        description="Start with ambitious but justifiable position",
        timing="Round 1",
        expected_impact="Set favorable anchor point"
    ))
    
    # Concession strategy
    if concession_points:
        tactics.append(NegotiationTactic(
            tactic_type="concession",
            description=f"Offer concession on {concession_points[0].get('item', 'secondary item')}",
            timing="Round 3-4",
            expected_impact="Build goodwill for critical asks"
        ))
    
    # Deadline pressure
    if negotiation_style in ["assertive", "competitive"]:
        tactics.append(NegotiationTactic(
            tactic_type="deadline",
            description="Create urgency with decision deadline",
            timing="Round 5-6",
            expected_impact="Accelerate decision making"
        ))
    
    # Value creation
    tactics.append(NegotiationTactic(
        tactic_type="value_creation",
        description="Propose creative solutions for mutual benefit",
        timing="Mid-negotiation",
        expected_impact="Expand negotiation possibilities"
    ))
    
    # BATNA leverage
    if game_analysis.get("batna_strength", 0) > 0.6:
        tactics.append(NegotiationTactic(
            tactic_type="alternative",
            description="Reference strong alternatives subtly",
            timing="If deadlocked",
            expected_impact="Increase negotiation leverage"
        ))
    
    return tactics


def calculate_confidence(
    simulation_results: Dict[str, Any],
    benchmark_insights: Dict[str, Any]
) -> ConfidenceLevel:
    """Calculate confidence level of recommendations."""
    confidence_score = 60  # Base confidence
    
    # Simulation consistency
    if simulation_results.get("consistency", 0) > 0.8:
        confidence_score += 20
    elif simulation_results.get("consistency", 0) > 0.6:
        confidence_score += 10
    
    # Benchmark data quality
    if benchmark_insights.get("sample_size", 0) > 100:
        confidence_score += 15
    elif benchmark_insights.get("sample_size", 0) > 50:
        confidence_score += 10
    
    # Model convergence
    if simulation_results.get("convergence", False):
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


if __name__ == "__main__":
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8003,
        reload=True,
        log_level=os.getenv("LOG_LEVEL", "info").lower()
    )