"""Enhanced Contract Analyzer with LLM Integration for Deep Commercial Analysis"""

import json
import re
from typing import Dict, List, Any, Optional, Tuple
from enum import Enum
import asyncio
from datetime import datetime
from decimal import Decimal

# LLM Integration - you can use OpenAI, Anthropic Claude, or local models
from openai import AsyncOpenAI
# from anthropic import AsyncAnthropic  # Alternative: Claude
# from transformers import pipeline  # Alternative: Local models

from integrations.databases.contract_models import ContractType, RiskLevel


class CommercialTermType(Enum):
    """Types of commercial terms to analyze"""
    PAYMENT = "payment_terms"
    PRICING = "pricing_model"
    LIABILITY = "liability_allocation"
    PERFORMANCE = "performance_obligations"
    WARRANTIES = "warranties_guarantees"
    INTELLECTUAL_PROPERTY = "ip_rights"
    TERMINATION = "termination_rights"
    COMPLIANCE = "regulatory_compliance"
    FINANCIAL = "financial_covenants"
    OPERATIONAL = "operational_requirements"


class EnhancedContractAnalyzer:
    """
    Advanced contract analyzer with LLM integration for:
    - Deep semantic understanding of commercial terms
    - Industry-specific analysis and benchmarking
    - Financial impact assessment
    - Negotiation strategy recommendations
    - Risk-adjusted scoring
    """
    
    def __init__(self, llm_provider: str = "openai"):
        """
        Initialize with LLM provider
        
        Args:
            llm_provider: "openai", "anthropic", or "local"
        """
        self.llm_provider = llm_provider
        
        # Initialize LLM client
        if llm_provider == "openai":
            self.llm = AsyncOpenAI()  # Requires OPENAI_API_KEY env var
            self.model = "gpt-4-turbo-preview"
        elif llm_provider == "anthropic":
            # self.llm = AsyncAnthropic()  # Requires ANTHROPIC_API_KEY
            # self.model = "claude-3-opus-20240229"
            pass
        else:
            # Local model option (e.g., Llama, Mistral)
            # self.llm = pipeline("text-generation", model="mistralai/Mixtral-8x7B")
            pass
        
        # Industry benchmarks (in production, this would be a database)
        self.industry_benchmarks = {
            "technology": {
                "payment_terms": {"standard": "Net 30", "range": [15, 45]},
                "liability_cap": {"standard": "12 months fees", "range": [6, 24]},
                "warranty_period": {"standard": "90 days", "range": [30, 180]},
                "termination_notice": {"standard": "30 days", "range": [30, 90]},
                "price_escalation": {"standard": "3% annually", "range": [0, 5]},
            },
            "manufacturing": {
                "payment_terms": {"standard": "Net 60", "range": [30, 90]},
                "liability_cap": {"standard": "Contract value", "range": [0.5, 2]},
                "warranty_period": {"standard": "12 months", "range": [6, 24]},
                "lead_time": {"standard": "8 weeks", "range": [4, 16]},
                "minimum_order": {"standard": "1000 units", "range": [100, 5000]},
            },
            "services": {
                "payment_terms": {"standard": "Net 45", "range": [30, 60]},
                "liability_cap": {"standard": "Annual fees", "range": [0.5, 1.5]},
                "sla_uptime": {"standard": "99.9%", "range": [99, 99.99]},
                "termination_notice": {"standard": "60 days", "range": [30, 90]},
                "rate_increases": {"standard": "5% annually", "range": [3, 7]},
            }
        }
        
        # Commercial risk weights for scoring
        self.risk_weights = {
            "payment_terms": 0.15,
            "liability_exposure": 0.20,
            "termination_flexibility": 0.15,
            "price_protection": 0.15,
            "performance_obligations": 0.10,
            "warranty_coverage": 0.10,
            "ip_ownership": 0.10,
            "dispute_resolution": 0.05
        }
    
    async def analyze_contract_comprehensive(
        self,
        contract_text: str,
        contract_type: ContractType,
        industry: str = "technology",
        company_context: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Perform comprehensive contract analysis with LLM
        
        Args:
            contract_text: Full contract text
            contract_type: Type of contract
            industry: Industry for benchmarking
            company_context: Company-specific context (size, negotiating position, etc.)
        """
        
        # Run multiple analysis tasks in parallel
        analysis_tasks = [
            self._analyze_commercial_terms(contract_text),
            self._analyze_financial_impact(contract_text, company_context),
            self._identify_negotiation_points(contract_text),
            self._assess_market_alignment(contract_text, industry),
            self._evaluate_risk_allocation(contract_text),
            self._analyze_operational_impact(contract_text)
        ]
        
        results = await asyncio.gather(*analysis_tasks)
        
        commercial_terms = results[0]
        financial_impact = results[1]
        negotiation_points = results[2]
        market_alignment = results[3]
        risk_allocation = results[4]
        operational_impact = results[5]
        
        # Calculate comprehensive score
        comprehensive_score = self._calculate_comprehensive_score(
            commercial_terms,
            financial_impact,
            market_alignment,
            risk_allocation
        )
        
        # Generate executive summary
        executive_summary = await self._generate_executive_summary(
            contract_text,
            comprehensive_score,
            commercial_terms,
            financial_impact
        )
        
        return {
            "comprehensive_score": comprehensive_score,
            "executive_summary": executive_summary,
            "commercial_terms": commercial_terms,
            "financial_impact": financial_impact,
            "negotiation_strategy": {
                "priority_items": negotiation_points["high_priority"],
                "leverage_points": negotiation_points["leverage_points"],
                "walk_away_triggers": negotiation_points["walk_away_triggers"],
                "concession_options": negotiation_points["concession_options"]
            },
            "market_alignment": market_alignment,
            "risk_allocation": risk_allocation,
            "operational_impact": operational_impact,
            "recommendations": self._generate_recommendations(
                comprehensive_score,
                commercial_terms,
                negotiation_points
            )
        }
    
    async def _analyze_commercial_terms(self, contract_text: str) -> Dict[str, Any]:
        """
        Deep analysis of commercial terms using LLM
        """
        
        prompt = """
        Analyze the following contract for commercial terms. Extract and evaluate:
        
        1. Payment Terms:
           - Payment schedule and milestones
           - Late payment penalties
           - Early payment discounts
           - Currency and exchange rate provisions
        
        2. Pricing Structure:
           - Pricing model (fixed, T&M, cost-plus, etc.)
           - Price adjustment mechanisms
           - Volume discounts or rebates
           - Most favored customer clauses
        
        3. Performance Obligations:
           - Deliverables and acceptance criteria
           - Service levels and KPIs
           - Penalties for non-performance
           - Performance guarantees
        
        4. Commercial Protection:
           - Liability caps and exclusions
           - Indemnification provisions
           - Insurance requirements
           - Warranty terms and remedies
        
        5. Flexibility Terms:
           - Change order process
           - Termination rights and penalties
           - Assignment and subcontracting rights
           - Renewal and extension options
        
        For each term found, provide:
        - The specific provision
        - Market alignment (favorable/standard/unfavorable)
        - Business impact assessment
        - Risk level (low/medium/high)
        
        Contract text:
        {contract_text}
        
        Return analysis in JSON format.
        """
        
        response = await self._call_llm(prompt.format(contract_text=contract_text[:10000]))
        
        try:
            return json.loads(response)
        except:
            # Fallback to structured extraction if JSON parsing fails
            return self._parse_commercial_terms_response(response)
    
    async def _analyze_financial_impact(
        self,
        contract_text: str,
        company_context: Optional[Dict]
    ) -> Dict[str, Any]:
        """
        Analyze financial implications of the contract
        """
        
        context_str = json.dumps(company_context) if company_context else "No specific context provided"
        
        prompt = """
        Analyze the financial impact of this contract. Consider:
        
        1. Total Contract Value (TCV):
           - Base contract value
           - Optional services or products
           - Potential overages or additional fees
        
        2. Cash Flow Analysis:
           - Payment timing and milestones
           - Working capital requirements
           - Revenue recognition implications
        
        3. Cost Structure:
           - Direct costs and margins
           - Hidden or indirect costs
           - Cost escalation exposure
        
        4. Financial Risks:
           - Currency exposure
           - Credit risk
           - Performance bond requirements
           - Liquidated damages exposure
        
        5. ROI Considerations:
           - Payback period
           - NPV implications
           - Opportunity costs
        
        Company Context: {context}
        
        Contract text:
        {contract_text}
        
        Provide specific dollar amounts or percentages where identifiable.
        """
        
        response = await self._call_llm(
            prompt.format(
                context=context_str,
                contract_text=contract_text[:10000]
            )
        )
        
        return self._parse_financial_response(response)
    
    async def _identify_negotiation_points(self, contract_text: str) -> Dict[str, Any]:
        """
        Identify key negotiation points and strategies
        """
        
        prompt = """
        Identify negotiation priorities and strategies for this contract:
        
        1. High Priority Negotiation Items:
           - One-sided or unfair terms
           - Missing standard protections
           - Excessive risk allocation
           - Non-market terms
        
        2. Leverage Points:
           - Areas where we have negotiating power
           - Alternative options available
           - Terms that favor us currently
        
        3. Walk-Away Triggers:
           - Unacceptable terms that should prevent signing
           - Critical missing provisions
           - Excessive liability or risk
        
        4. Potential Concessions:
           - Areas where we could compromise
           - Trade-offs to secure critical terms
           - Win-win opportunities
        
        5. Negotiation Tactics:
           - Recommended approach (collaborative vs. competitive)
           - Sequencing of asks
           - BATNA considerations
        
        Contract text:
        {contract_text}
        
        Provide specific clause references and practical negotiation guidance.
        """
        
        response = await self._call_llm(prompt.format(contract_text=contract_text[:10000]))
        
        return self._parse_negotiation_response(response)
    
    async def _assess_market_alignment(self, contract_text: str, industry: str) -> Dict[str, Any]:
        """
        Compare contract terms against industry benchmarks
        """
        
        benchmarks = self.industry_benchmarks.get(industry, self.industry_benchmarks["technology"])
        
        prompt = """
        Compare this contract against industry standards for {industry}:
        
        Industry Benchmarks:
        {benchmarks}
        
        For each commercial term:
        1. Identify the contract provision
        2. Compare to industry standard
        3. Rate alignment (below/at/above market)
        4. Quantify deviation if applicable
        5. Assess business impact of deviation
        
        Contract text:
        {contract_text}
        
        Focus on material deviations that impact commercial value.
        """
        
        response = await self._call_llm(
            prompt.format(
                industry=industry,
                benchmarks=json.dumps(benchmarks, indent=2),
                contract_text=contract_text[:10000]
            )
        )
        
        return self._parse_benchmark_response(response, benchmarks)
    
    async def _evaluate_risk_allocation(self, contract_text: str) -> Dict[str, Any]:
        """
        Evaluate how risks are allocated between parties
        """
        
        prompt = """
        Analyze risk allocation in this contract:
        
        1. Risk Transfer Mechanisms:
           - Which party bears which risks?
           - Indemnification provisions
           - Insurance requirements
           - Liability limitations
        
        2. Balanced vs. One-Sided:
           - Are risks fairly allocated?
           - Disproportionate risk burden
           - Missing mutual provisions
        
        3. Uncovered Risks:
           - Risks not addressed in contract
           - Gaps in protection
           - Ambiguous allocations
        
        4. Risk Mitigation:
           - Risk reduction mechanisms
           - Monitoring and controls
           - Escalation procedures
        
        5. Quantified Risk Exposure:
           - Maximum liability exposure
           - Uncapped liabilities
           - Consequential damages exposure
        
        Contract text:
        {contract_text}
        
        Provide risk scores (1-10) for each category and overall risk rating.
        """
        
        response = await self._call_llm(prompt.format(contract_text=contract_text[:10000]))
        
        return self._parse_risk_response(response)
    
    async def _analyze_operational_impact(self, contract_text: str) -> Dict[str, Any]:
        """
        Analyze operational implications of contract terms
        """
        
        prompt = """
        Analyze operational impact of this contract:
        
        1. Resource Requirements:
           - Personnel commitments
           - System/technology requirements
           - Facilities or equipment needs
        
        2. Process Changes:
           - New procedures required
           - Reporting obligations
           - Compliance requirements
        
        3. Timeline Constraints:
           - Implementation deadlines
           - Milestone dependencies
           - Critical path items
        
        4. Integration Complexity:
           - System integrations needed
           - Data sharing requirements
           - Third-party dependencies
        
        5. Ongoing Obligations:
           - Monitoring requirements
           - Reporting frequency
           - Audit obligations
           - Renewal management
        
        Contract text:
        {contract_text}
        
        Rate operational complexity (1-10) and identify major implementation challenges.
        """
        
        response = await self._call_llm(prompt.format(contract_text=contract_text[:10000]))
        
        return self._parse_operational_response(response)
    
    async def _generate_executive_summary(
        self,
        contract_text: str,
        comprehensive_score: Dict,
        commercial_terms: Dict,
        financial_impact: Dict
    ) -> str:
        """
        Generate executive summary using LLM
        """
        
        prompt = """
        Generate a concise executive summary for this contract analysis:
        
        Overall Score: {score}
        Key Commercial Terms: {terms}
        Financial Impact: {financial}
        
        Contract excerpt: {contract_excerpt}
        
        The summary should be 3-4 paragraphs covering:
        1. Overall assessment and recommendation
        2. Key commercial highlights and concerns
        3. Financial implications and value assessment
        4. Critical action items for negotiation
        
        Write for a C-level audience. Be direct and actionable.
        """
        
        response = await self._call_llm(
            prompt.format(
                score=comprehensive_score,
                terms=json.dumps(commercial_terms, indent=2)[:2000],
                financial=json.dumps(financial_impact, indent=2)[:2000],
                contract_excerpt=contract_text[:3000]
            )
        )
        
        return response
    
    async def _call_llm(self, prompt: str) -> str:
        """
        Call LLM with prompt and return response
        """
        
        if self.llm_provider == "openai":
            response = await self.llm.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are an expert contract analyst specializing in commercial terms and enterprise procurement."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,  # Lower temperature for more consistent analysis
                max_tokens=4000
            )
            return response.choices[0].message.content
        
        elif self.llm_provider == "anthropic":
            # Anthropic Claude implementation
            # response = await self.llm.messages.create(...)
            pass
        
        else:
            # Local model implementation
            pass
        
        # Fallback
        return "LLM analysis not available"
    
    def _calculate_comprehensive_score(
        self,
        commercial_terms: Dict,
        financial_impact: Dict,
        market_alignment: Dict,
        risk_allocation: Dict
    ) -> Dict[str, Any]:
        """
        Calculate comprehensive scoring with multiple dimensions
        """
        
        scores = {}
        
        # Commercial terms score (0-100)
        commercial_score = 50  # Base score
        if commercial_terms.get("payment_terms", {}).get("favorable"):
            commercial_score += 10
        if commercial_terms.get("pricing_model", {}).get("favorable"):
            commercial_score += 10
        if commercial_terms.get("liability_caps", {}).get("present"):
            commercial_score += 15
        if commercial_terms.get("termination_rights", {}).get("mutual"):
            commercial_score += 10
        scores["commercial"] = min(100, commercial_score)
        
        # Financial score (0-100)
        financial_score = 50
        if financial_impact.get("roi_positive"):
            financial_score += 20
        if financial_impact.get("cash_flow_favorable"):
            financial_score += 15
        if financial_impact.get("cost_predictable"):
            financial_score += 15
        scores["financial"] = min(100, financial_score)
        
        # Market alignment score (0-100)
        market_score = 50
        deviations = market_alignment.get("deviations", [])
        for deviation in deviations:
            if deviation.get("favorable"):
                market_score += 5
            else:
                market_score -= 5
        scores["market_alignment"] = min(100, max(0, market_score))
        
        # Risk score (0-100, higher is better/lower risk)
        risk_score = 100  # Start high (low risk)
        risks = risk_allocation.get("identified_risks", [])
        for risk in risks:
            if risk.get("severity") == "high":
                risk_score -= 15
            elif risk.get("severity") == "medium":
                risk_score -= 7
        scores["risk"] = max(0, risk_score)
        
        # Overall weighted score
        weights = {
            "commercial": 0.35,
            "financial": 0.25,
            "market_alignment": 0.20,
            "risk": 0.20
        }
        
        overall = sum(scores[k] * weights[k] for k in weights.keys())
        
        return {
            "overall": round(overall, 1),
            "breakdown": scores,
            "grade": self._score_to_grade(overall),
            "recommendation": self._score_to_recommendation(overall)
        }
    
    def _score_to_grade(self, score: float) -> str:
        """Convert score to letter grade"""
        if score >= 90: return "A"
        elif score >= 80: return "B"
        elif score >= 70: return "C"
        elif score >= 60: return "D"
        else: return "F"
    
    def _score_to_recommendation(self, score: float) -> str:
        """Convert score to recommendation"""
        if score >= 85:
            return "Strongly Recommended - Excellent terms with minimal risk"
        elif score >= 70:
            return "Recommended - Good terms with manageable concerns"
        elif score >= 55:
            return "Proceed with Caution - Significant issues require negotiation"
        elif score >= 40:
            return "Not Recommended - Major concerns outweigh benefits"
        else:
            return "Strongly Advise Against - Unacceptable risk and terms"
    
    def _generate_recommendations(
        self,
        comprehensive_score: Dict,
        commercial_terms: Dict,
        negotiation_points: Dict
    ) -> List[Dict[str, str]]:
        """
        Generate specific actionable recommendations
        """
        
        recommendations = []
        
        # Based on score
        if comprehensive_score["overall"] < 70:
            recommendations.append({
                "priority": "HIGH",
                "category": "Overall",
                "recommendation": "Engage legal counsel before proceeding",
                "rationale": "Contract score below acceptable threshold"
            })
        
        # Based on commercial terms
        if not commercial_terms.get("liability_caps", {}).get("present"):
            recommendations.append({
                "priority": "HIGH",
                "category": "Risk",
                "recommendation": "Negotiate liability cap at 12 months fees",
                "rationale": "Unlimited liability exposure is unacceptable"
            })
        
        # Based on negotiation points
        for point in negotiation_points.get("high_priority", [])[:3]:
            recommendations.append({
                "priority": "HIGH",
                "category": "Negotiation",
                "recommendation": point.get("action"),
                "rationale": point.get("reason")
            })
        
        return recommendations
    
    # Parsing helper methods
    def _parse_commercial_terms_response(self, response: str) -> Dict:
        """Parse LLM response for commercial terms"""
        # Implementation to parse non-JSON responses
        return {}
    
    def _parse_financial_response(self, response: str) -> Dict:
        """Parse LLM response for financial analysis"""
        return {}
    
    def _parse_negotiation_response(self, response: str) -> Dict:
        """Parse LLM response for negotiation points"""
        return {}
    
    def _parse_benchmark_response(self, response: str, benchmarks: Dict) -> Dict:
        """Parse LLM response for benchmark comparison"""
        return {}
    
    def _parse_risk_response(self, response: str) -> Dict:
        """Parse LLM response for risk analysis"""
        return {}
    
    def _parse_operational_response(self, response: str) -> Dict:
        """Parse LLM response for operational impact"""
        return {}


# Usage example
async def analyze_contract_example():
    """Example of using the enhanced analyzer"""
    
    analyzer = EnhancedContractAnalyzer(llm_provider="openai")
    
    # Load contract
    with open("sample_contract.pdf", "rb") as f:
        contract_text = extract_text_from_pdf(f)  # Your existing extraction
    
    # Company context
    company_context = {
        "company_size": "mid-market",
        "annual_revenue": "$50M",
        "negotiating_position": "strong",  # strong/neutral/weak
        "strategic_importance": "high",
        "budget": "$500K",
        "preferred_payment_terms": "Net 45"
    }
    
    # Analyze
    results = await analyzer.analyze_contract_comprehensive(
        contract_text=contract_text,
        contract_type=ContractType.MSA,
        industry="technology",
        company_context=company_context
    )
    
    print(f"Overall Score: {results['comprehensive_score']['overall']}")
    print(f"Grade: {results['comprehensive_score']['grade']}")
    print(f"Recommendation: {results['comprehensive_score']['recommendation']}")
    print(f"\nExecutive Summary:\n{results['executive_summary']}")
    print(f"\nTop Negotiation Priorities:")
    for item in results['negotiation_strategy']['priority_items'][:5]:
        print(f"  - {item}")