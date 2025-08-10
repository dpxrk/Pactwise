"""
LLM Integration for enhanced contract analysis.
Supports OpenAI GPT-4 and Anthropic Claude.
"""

import os
import logging
from typing import List, Dict, Any, Optional
import json

try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    logging.warning("OpenAI not available")

try:
    import anthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False
    logging.warning("Anthropic not available")

logger = logging.getLogger(__name__)


class LLMAnalyzer:
    """
    Enhanced contract analysis using Large Language Models.
    """
    
    def __init__(self):
        """Initialize LLM clients."""
        self.openai_client = None
        self.anthropic_client = None
        
        # Initialize OpenAI
        if OPENAI_AVAILABLE and os.getenv("OPENAI_API_KEY"):
            openai.api_key = os.getenv("OPENAI_API_KEY")
            self.openai_client = openai
            logger.info("OpenAI client initialized")
        
        # Initialize Anthropic
        if ANTHROPIC_AVAILABLE and os.getenv("ANTHROPIC_API_KEY"):
            self.anthropic_client = anthropic.Anthropic(
                api_key=os.getenv("ANTHROPIC_API_KEY")
            )
            logger.info("Anthropic client initialized")
    
    async def analyze(
        self,
        contract_text: str,
        clauses: List[Any],
        risk_analysis: Dict[str, Any],
        compliance_results: List[Any]
    ) -> Dict[str, Any]:
        """
        Perform LLM-enhanced analysis of contract.
        
        Args:
            contract_text: The contract text
            clauses: Extracted clauses
            risk_analysis: Risk assessment results
            compliance_results: Compliance check results
            
        Returns:
            Enhanced analysis with LLM insights
        """
        # Prepare context for LLM
        context = self._prepare_context(
            contract_text[:3000],  # Limit context size
            clauses[:5],  # Top 5 clauses
            risk_analysis,
            compliance_results[:3]  # Top 3 compliance issues
        )
        
        # Try OpenAI first, fallback to Anthropic
        if self.openai_client:
            try:
                result = await self._analyze_with_openai(context)
                return result
            except Exception as e:
                logger.error(f"OpenAI analysis failed: {e}")
        
        if self.anthropic_client:
            try:
                result = await self._analyze_with_anthropic(context)
                return result
            except Exception as e:
                logger.error(f"Anthropic analysis failed: {e}")
        
        # Fallback to enhanced rule-based analysis
        return self._fallback_analysis(contract_text, clauses, risk_analysis)
    
    def _prepare_context(
        self,
        contract_excerpt: str,
        top_clauses: List[Any],
        risk_analysis: Dict[str, Any],
        top_compliance_issues: List[Any]
    ) -> str:
        """Prepare context for LLM analysis."""
        context = f"""
CONTRACT ANALYSIS CONTEXT:

CONTRACT EXCERPT:
{contract_excerpt}

KEY CLAUSES IDENTIFIED:
{self._format_clauses(top_clauses)}

RISK ASSESSMENT:
- Overall Risk Score: {risk_analysis.get('overall_score', 'N/A')}/100
- High Priority Risks: {len(risk_analysis.get('high_priority_risks', []))}
- Top Risk Factors:
{self._format_risk_factors(risk_analysis.get('factors', [])[:3])}

COMPLIANCE ISSUES:
{self._format_compliance_issues(top_compliance_issues)}

Please analyze this contract and provide:
1. Key concerns and red flags
2. Negotiation leverage points
3. Specific recommendations for improvement
4. Hidden risks or unusual terms
5. Overall assessment and priority actions
"""
        return context
    
    async def _analyze_with_openai(self, context: str) -> Dict[str, Any]:
        """Analyze using OpenAI GPT-4."""
        try:
            response = await self.openai_client.ChatCompletion.acreate(
                model="gpt-4-turbo-preview",
                messages=[
                    {
                        "role": "system",
                        "content": """You are an expert contract analyst and legal advisor. 
                        Analyze contracts for risks, opportunities, and provide actionable recommendations.
                        Focus on practical business implications and negotiation strategies."""
                    },
                    {
                        "role": "user",
                        "content": context
                    }
                ],
                temperature=0.3,  # Lower temperature for more consistent analysis
                max_tokens=1500
            )
            
            analysis_text = response.choices[0].message.content
            return self._parse_llm_response(analysis_text)
            
        except Exception as e:
            logger.error(f"OpenAI API error: {e}")
            raise
    
    async def _analyze_with_anthropic(self, context: str) -> Dict[str, Any]:
        """Analyze using Anthropic Claude."""
        try:
            message = self.anthropic_client.messages.create(
                model="claude-3-opus-20240229",
                max_tokens=1500,
                temperature=0.3,
                system="""You are an expert contract analyst and legal advisor. 
                Analyze contracts for risks, opportunities, and provide actionable recommendations.
                Focus on practical business implications and negotiation strategies.""",
                messages=[
                    {
                        "role": "user",
                        "content": context
                    }
                ]
            )
            
            analysis_text = message.content[0].text
            return self._parse_llm_response(analysis_text)
            
        except Exception as e:
            logger.error(f"Anthropic API error: {e}")
            raise
    
    def _parse_llm_response(self, response_text: str) -> Dict[str, Any]:
        """Parse LLM response into structured format."""
        lines = response_text.split('\n')
        
        result = {
            "recommendations": [],
            "concerns": [],
            "leverage_points": [],
            "hidden_risks": [],
            "priority_actions": [],
            "overall_assessment": ""
        }
        
        current_section = None
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Detect sections
            if "recommendation" in line.lower():
                current_section = "recommendations"
            elif "concern" in line.lower() or "red flag" in line.lower():
                current_section = "concerns"
            elif "leverage" in line.lower():
                current_section = "leverage_points"
            elif "hidden" in line.lower() or "unusual" in line.lower():
                current_section = "hidden_risks"
            elif "priority" in line.lower() or "action" in line.lower():
                current_section = "priority_actions"
            elif "overall" in line.lower() or "assessment" in line.lower():
                current_section = "overall_assessment"
            elif current_section and line.startswith(('-', '•', '*', '1', '2', '3')):
                # Extract item
                item = line.lstrip('-•*0123456789. ')
                if current_section == "overall_assessment":
                    result[current_section] += " " + item
                elif current_section in result and isinstance(result[current_section], list):
                    result[current_section].append(item)
        
        # Ensure we have at least some content
        if not result["recommendations"]:
            result["recommendations"] = ["Review contract with legal counsel"]
        
        return result
    
    def _fallback_analysis(
        self,
        contract_text: str,
        clauses: List[Any],
        risk_analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Enhanced rule-based analysis when LLMs are not available."""
        recommendations = []
        concerns = []
        
        # Analyze contract length and complexity
        if len(contract_text) > 50000:
            concerns.append("Unusually long contract may hide unfavorable terms")
            recommendations.append("Consider breaking into separate agreements")
        
        # Check for one-sided terms
        party_mentions = self._analyze_party_balance(contract_text)
        if party_mentions["imbalance"] > 0.3:
            concerns.append("Contract appears to favor one party significantly")
            recommendations.append("Negotiate for more balanced terms")
        
        # Analyze clause distribution
        clause_types = [c.type for c in clauses if hasattr(c, 'type')]
        missing_important = self._check_missing_clauses(clause_types)
        
        for missing in missing_important:
            recommendations.append(f"Add {missing} clause for better protection")
        
        # Risk-based recommendations
        high_risks = risk_analysis.get("high_priority_risks", [])
        for risk in high_risks[:3]:
            if hasattr(risk, 'mitigation') and risk.mitigation:
                recommendations.append(risk.mitigation)
        
        return {
            "recommendations": recommendations[:10],
            "concerns": concerns,
            "leverage_points": self._identify_leverage_points(contract_text),
            "hidden_risks": self._identify_hidden_risks(contract_text),
            "priority_actions": self._determine_priority_actions(risk_analysis),
            "overall_assessment": self._generate_assessment(risk_analysis)
        }
    
    def _format_clauses(self, clauses: List[Any]) -> str:
        """Format clauses for LLM context."""
        formatted = []
        for i, clause in enumerate(clauses, 1):
            if hasattr(clause, 'type') and hasattr(clause, 'risk_level'):
                formatted.append(f"{i}. {clause.type} (Risk: {clause.risk_level})")
        return '\n'.join(formatted) if formatted else "No significant clauses identified"
    
    def _format_risk_factors(self, factors: List[Any]) -> str:
        """Format risk factors for LLM context."""
        formatted = []
        for factor in factors:
            if hasattr(factor, 'description') and hasattr(factor, 'severity'):
                formatted.append(f"- {factor.description} (Severity: {factor.severity:.2f})")
        return '\n'.join(formatted) if formatted else "- No significant risks identified"
    
    def _format_compliance_issues(self, issues: List[Any]) -> str:
        """Format compliance issues for LLM context."""
        formatted = []
        for issue in issues:
            if hasattr(issue, 'regulation') and hasattr(issue, 'compliant'):
                status = "✓" if issue.compliant else "✗"
                formatted.append(f"{status} {issue.regulation}: {issue.score:.0f}/100")
        return '\n'.join(formatted) if formatted else "No compliance issues identified"
    
    def _analyze_party_balance(self, text: str) -> Dict[str, Any]:
        """Analyze balance between parties in obligations."""
        # Simple heuristic: count obligations for each party
        buyer_obligations = text.lower().count("buyer shall") + text.lower().count("buyer must")
        seller_obligations = text.lower().count("seller shall") + text.lower().count("seller must")
        
        total = buyer_obligations + seller_obligations
        if total == 0:
            return {"imbalance": 0}
        
        imbalance = abs(buyer_obligations - seller_obligations) / total
        return {
            "imbalance": imbalance,
            "buyer_obligations": buyer_obligations,
            "seller_obligations": seller_obligations
        }
    
    def _check_missing_clauses(self, present_types: List[str]) -> List[str]:
        """Check for missing important clause types."""
        important = {
            "force_majeure", "termination", "liability", "confidentiality",
            "dispute_resolution", "warranty", "indemnification"
        }
        
        present = set(present_types)
        missing = important - present
        
        return list(missing)
    
    def _identify_leverage_points(self, text: str) -> List[str]:
        """Identify potential negotiation leverage points."""
        leverage = []
        
        if "exclusive" in text.lower():
            leverage.append("Exclusivity provides significant value to counterparty")
        
        if "volume" in text.lower() or "quantity" in text.lower():
            leverage.append("Volume commitments can be used for better pricing")
        
        if "renew" in text.lower():
            leverage.append("Renewal terms provide opportunity for renegotiation")
        
        return leverage[:5]
    
    def _identify_hidden_risks(self, text: str) -> List[str]:
        """Identify potentially hidden or unusual risks."""
        hidden = []
        
        if "assignment" in text.lower() and "consent" not in text.lower():
            hidden.append("Unrestricted assignment rights could change counterparty")
        
        if "audit" in text.lower() and "unlimited" in text.lower():
            hidden.append("Unlimited audit rights could be disruptive")
        
        if "most favored" in text.lower():
            hidden.append("Most favored nation clause may limit flexibility")
        
        return hidden[:5]
    
    def _determine_priority_actions(self, risk_analysis: Dict[str, Any]) -> List[str]:
        """Determine priority actions based on risk analysis."""
        actions = []
        
        risk_score = risk_analysis.get("overall_score", 0)
        
        if risk_score > 70:
            actions.append("Immediate legal review required")
        elif risk_score > 50:
            actions.append("Schedule negotiation session to address risks")
        else:
            actions.append("Document acceptance criteria and proceed")
        
        high_risks = risk_analysis.get("high_priority_risks", [])
        if len(high_risks) > 3:
            actions.append("Focus on top 3 risk areas in negotiations")
        
        return actions[:5]
    
    def _generate_assessment(self, risk_analysis: Dict[str, Any]) -> str:
        """Generate overall assessment."""
        risk_score = risk_analysis.get("overall_score", 0)
        
        if risk_score > 70:
            return "High-risk contract requiring significant modifications"
        elif risk_score > 50:
            return "Moderate risk contract with several areas for improvement"
        elif risk_score > 30:
            return "Acceptable contract with minor concerns"
        else:
            return "Low-risk contract suitable for execution with minor review"