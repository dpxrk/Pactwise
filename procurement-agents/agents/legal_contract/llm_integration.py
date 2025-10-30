"""LLM Integration Module for Contract Analysis"""

import os
from typing import Dict, List, Optional
from enum import Enum

# Configuration for different LLM providers
class LLMProvider(Enum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    AZURE_OPENAI = "azure_openai"
    LOCAL = "local"
    HUGGINGFACE = "huggingface"


class LLMConfig:
    """Configuration for LLM providers"""
    
    PROVIDER_CONFIGS = {
        LLMProvider.OPENAI: {
            "models": {
                "fast": "gpt-3.5-turbo",
                "standard": "gpt-4",
                "advanced": "gpt-4-turbo-preview"
            },
            "api_key_env": "OPENAI_API_KEY",
            "cost_per_1k_tokens": {
                "gpt-3.5-turbo": {"input": 0.0005, "output": 0.0015},
                "gpt-4": {"input": 0.03, "output": 0.06},
                "gpt-4-turbo-preview": {"input": 0.01, "output": 0.03}
            }
        },
        LLMProvider.ANTHROPIC: {
            "models": {
                "fast": "claude-3-haiku-20240307",
                "standard": "claude-3-sonnet-20240229",
                "advanced": "claude-3-opus-20240229"
            },
            "api_key_env": "ANTHROPIC_API_KEY",
            "cost_per_1k_tokens": {
                "claude-3-haiku-20240307": {"input": 0.00025, "output": 0.00125},
                "claude-3-sonnet-20240229": {"input": 0.003, "output": 0.015},
                "claude-3-opus-20240229": {"input": 0.015, "output": 0.075}
            }
        },
        LLMProvider.AZURE_OPENAI: {
            "models": {
                "fast": "gpt-35-turbo",
                "standard": "gpt-4",
                "advanced": "gpt-4-32k"
            },
            "api_key_env": "AZURE_OPENAI_API_KEY",
            "endpoint_env": "AZURE_OPENAI_ENDPOINT",
            "deployment_env": "AZURE_OPENAI_DEPLOYMENT"
        },
        LLMProvider.LOCAL: {
            "models": {
                "fast": "mistral-7b",
                "standard": "llama-2-70b",
                "advanced": "mixtral-8x7b"
            },
            "endpoint": "http://localhost:11434",  # Ollama default
            "cost_per_1k_tokens": {"input": 0, "output": 0}  # Free for local
        }
    }


class CommercialTermsPrompts:
    """Specialized prompts for different commercial analysis tasks"""
    
    PAYMENT_TERMS_ANALYSIS = """
    Analyze the payment terms in this contract section:
    
    Extract and evaluate:
    1. Payment schedule (net days, milestones, etc.)
    2. Late payment penalties or interest
    3. Early payment discounts
    4. Currency and exchange provisions
    5. Payment methods accepted
    6. Withholding rights
    7. Set-off provisions
    
    Rate each term as:
    - Favorable (benefits buyer)
    - Standard (market normal)
    - Unfavorable (disadvantages buyer)
    
    Text: {text}
    
    Respond with structured JSON including term, value, rating, and impact.
    """
    
    PRICING_MODEL_ANALYSIS = """
    Identify and analyze the pricing model in this contract:
    
    Determine:
    1. Pricing structure (fixed, T&M, cost-plus, unit-based, subscription)
    2. Rate cards or pricing schedules
    3. Volume discounts or tiers
    4. Price adjustment mechanisms (CPI, annual increases)
    5. Most Favored Customer (MFC) clauses
    6. Benchmarking provisions
    7. Hidden costs or fees
    
    Calculate total cost implications if possible.
    
    Text: {text}
    
    Return analysis with specific numbers and percentages where found.
    """
    
    LIABILITY_ANALYSIS = """
    Analyze liability and indemnification provisions:
    
    Identify:
    1. Liability caps (amount or formula)
    2. Liability exclusions (consequential, indirect, etc.)
    3. Indemnification scope (mutual vs one-sided)
    4. Duty to defend provisions
    5. Insurance requirements
    6. Gross negligence/willful misconduct carveouts
    7. IP indemnification
    8. Data breach liability
    
    Assess risk level and balance between parties.
    
    Text: {text}
    
    Provide risk score (1-10) and specific concerns.
    """
    
    SLA_PERFORMANCE_ANALYSIS = """
    Extract and evaluate Service Level Agreements (SLAs) and performance metrics:
    
    Find:
    1. Availability/uptime commitments
    2. Response time requirements
    3. Resolution time requirements  
    4. Performance metrics and KPIs
    5. Remedies for SLA failures (credits, penalties)
    6. Measurement and reporting requirements
    7. Excuse events
    8. Continuous improvement obligations
    
    Text: {text}
    
    Rate achievability and commercial impact of each SLA.
    """
    
    TERMINATION_ANALYSIS = """
    Analyze termination provisions:
    
    Identify:
    1. Term and renewal provisions
    2. Termination for convenience rights (mutual or one-sided)
    3. Notice periods required
    4. Termination for cause events
    5. Cure periods
    6. Effects of termination (IP, data, transition)
    7. Termination fees or penalties
    8. Survival clauses
    
    Assess flexibility and exit costs.
    
    Text: {text}
    
    Rate termination flexibility (1-10) and identify risks.
    """
    
    NEGOTIATION_LEVERAGE = """
    Based on this contract analysis, identify negotiation leverage points:
    
    Contract Summary:
    {summary}
    
    Provide:
    1. Top 5 terms that MUST be negotiated (non-negotiable issues)
    2. Secondary items for negotiation (important but not deal-breakers)
    3. Potential trade-offs (what to give to get priority items)
    4. Industry arguments to support position
    5. Alternative language suggestions for key provisions
    6. BATNA considerations
    
    Frame as actionable negotiation strategy.
    """


class ContractIntelligence:
    """
    Practical implementation for integrating LLM intelligence into contract analysis
    """
    
    def __init__(self, provider: LLMProvider = LLMProvider.OPENAI, model_tier: str = "standard"):
        """
        Initialize with chosen provider and model tier
        
        Args:
            provider: LLM provider to use
            model_tier: "fast", "standard", or "advanced" based on needs/budget
        """
        self.provider = provider
        self.config = LLMConfig.PROVIDER_CONFIGS[provider]
        self.model = self.config["models"][model_tier]
        self.prompts = CommercialTermsPrompts()
        
        # Initialize the appropriate client
        self._init_client()
    
    def _init_client(self):
        """Initialize the LLM client based on provider"""
        
        if self.provider == LLMProvider.OPENAI:
            import openai
            openai.api_key = os.getenv(self.config["api_key_env"])
            self.client = openai
            
        elif self.provider == LLMProvider.ANTHROPIC:
            import anthropic
            self.client = anthropic.Client(api_key=os.getenv(self.config["api_key_env"]))
            
        elif self.provider == LLMProvider.AZURE_OPENAI:
            import openai
            openai.api_type = "azure"
            openai.api_key = os.getenv(self.config["api_key_env"])
            openai.api_base = os.getenv(self.config["endpoint_env"])
            openai.api_version = "2024-02-01"
            self.client = openai
            
        elif self.provider == LLMProvider.LOCAL:
            # For Ollama or local models
            import requests
            self.client = requests.Session()
    
    async def analyze_section(self, text: str, analysis_type: str) -> Dict:
        """
        Analyze a specific section of contract with appropriate prompt
        
        Args:
            text: Contract section text
            analysis_type: Type of analysis (payment, pricing, liability, etc.)
        """
        
        # Select appropriate prompt
        prompt_map = {
            "payment": self.prompts.PAYMENT_TERMS_ANALYSIS,
            "pricing": self.prompts.PRICING_MODEL_ANALYSIS,
            "liability": self.prompts.LIABILITY_ANALYSIS,
            "sla": self.prompts.SLA_PERFORMANCE_ANALYSIS,
            "termination": self.prompts.TERMINATION_ANALYSIS
        }
        
        prompt = prompt_map.get(analysis_type, self.prompts.PAYMENT_TERMS_ANALYSIS)
        formatted_prompt = prompt.format(text=text[:4000])  # Limit context length
        
        # Call LLM
        response = await self._call_llm(formatted_prompt)
        
        # Parse and structure response
        return self._parse_llm_response(response, analysis_type)
    
    async def generate_negotiation_strategy(self, contract_analysis: Dict) -> Dict:
        """
        Generate negotiation strategy based on contract analysis
        """
        
        summary = self._create_analysis_summary(contract_analysis)
        prompt = self.prompts.NEGOTIATION_LEVERAGE.format(summary=summary)
        
        response = await self._call_llm(prompt)
        
        return {
            "strategy": response,
            "estimated_negotiation_time": "2-3 rounds",
            "success_probability": self._estimate_success_probability(contract_analysis)
        }
    
    async def _call_llm(self, prompt: str) -> str:
        """Make actual LLM API call"""
        
        if self.provider == LLMProvider.OPENAI:
            response = await self.client.ChatCompletion.acreate(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a senior contract analyst specializing in enterprise procurement."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=2000
            )
            return response.choices[0].message.content
            
        elif self.provider == LLMProvider.ANTHROPIC:
            response = await self.client.messages.create(
                model=self.model,
                max_tokens=2000,
                temperature=0.1,
                messages=[{"role": "user", "content": prompt}]
            )
            return response.content[0].text
            
        elif self.provider == LLMProvider.LOCAL:
            # Ollama example
            response = self.client.post(
                f"{self.config['endpoint']}/api/generate",
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "temperature": 0.1
                }
            )
            return response.json()["response"]
        
        return "LLM call failed"
    
    def _parse_llm_response(self, response: str, analysis_type: str) -> Dict:
        """Parse LLM response into structured format"""
        
        import json
        import re
        
        # Try to extract JSON if present
        json_match = re.search(r'\{.*\}', response, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group())
            except:
                pass
        
        # Fallback to text parsing
        return {
            "analysis_type": analysis_type,
            "raw_analysis": response,
            "structured_data": self._extract_structured_data(response, analysis_type)
        }
    
    def _extract_structured_data(self, text: str, analysis_type: str) -> Dict:
        """Extract structured data from text response"""
        
        # Basic extraction logic - enhance based on your needs
        data = {}
        
        if analysis_type == "payment":
            # Extract payment terms
            if "net" in text.lower():
                import re
                net_days = re.search(r'net\s*(\d+)', text.lower())
                if net_days:
                    data["payment_terms"] = f"Net {net_days.group(1)}"
        
        elif analysis_type == "pricing":
            # Extract pricing model
            if "fixed" in text.lower():
                data["pricing_model"] = "fixed"
            elif "time and material" in text.lower() or "t&m" in text.lower():
                data["pricing_model"] = "time_and_materials"
        
        # Add more extraction logic as needed
        
        return data
    
    def _create_analysis_summary(self, contract_analysis: Dict) -> str:
        """Create summary for negotiation strategy generation"""
        
        summary = f"""
        Contract Analysis Summary:
        - Overall Score: {contract_analysis.get('score', 'N/A')}
        - Key Risks: {contract_analysis.get('risks', [])}
        - Missing Clauses: {contract_analysis.get('missing_clauses', [])}
        - Unfavorable Terms: {contract_analysis.get('unfavorable_terms', [])}
        - Contract Value: {contract_analysis.get('value', 'Unknown')}
        """
        
        return summary
    
    def _estimate_success_probability(self, contract_analysis: Dict) -> str:
        """Estimate negotiation success probability"""
        
        score = contract_analysis.get('score', 50)
        
        if score > 80:
            return "High (80%+)"
        elif score > 60:
            return "Medium (50-80%)"
        else:
            return "Low (<50%)"
    
    def estimate_analysis_cost(self, contract_length: int) -> float:
        """Estimate cost of analyzing a contract"""
        
        # Estimate tokens (rough: 1 token ≈ 4 chars)
        estimated_tokens = contract_length / 4
        
        # Multiple API calls for comprehensive analysis
        estimated_calls = 10  # Various analysis types
        
        # Get cost config
        cost_config = self.config.get("cost_per_1k_tokens", {}).get(self.model, {})
        input_cost = cost_config.get("input", 0) * (estimated_tokens / 1000) * estimated_calls
        output_cost = cost_config.get("output", 0) * (2000 / 1000) * estimated_calls  # Assume 2k output per call
        
        return round(input_cost + output_cost, 2)


# Practical usage example
async def enhanced_contract_analysis_workflow():
    """
    Complete workflow showing how to use LLM-enhanced analysis
    """
    
    # Initialize intelligence module
    intelligence = ContractIntelligence(
        provider=LLMProvider.OPENAI,
        model_tier="standard"  # Use "fast" for lower cost, "advanced" for complex contracts
    )
    
    # Your existing contract text extraction
    contract_text = "..."  # From your PDF/Word extraction
    
    # Split contract into sections (you can enhance this)
    sections = {
        "payment": extract_section(contract_text, "payment"),
        "pricing": extract_section(contract_text, "pricing"),
        "liability": extract_section(contract_text, "liability"),
        "termination": extract_section(contract_text, "termination")
    }
    
    # Analyze each section
    analysis_results = {}
    for section_type, section_text in sections.items():
        if section_text:
            analysis_results[section_type] = await intelligence.analyze_section(
                section_text,
                section_type
            )
    
    # Generate negotiation strategy
    negotiation_strategy = await intelligence.generate_negotiation_strategy(analysis_results)
    
    # Calculate cost
    analysis_cost = intelligence.estimate_analysis_cost(len(contract_text))
    
    return {
        "detailed_analysis": analysis_results,
        "negotiation_strategy": negotiation_strategy,
        "analysis_cost": f"${analysis_cost}",
        "recommendations": generate_recommendations(analysis_results)
    }


def extract_section(contract_text: str, section_type: str) -> str:
    """Extract specific section from contract text"""
    # Implement section extraction logic
    # This is a placeholder - enhance with actual extraction
    return contract_text[:2000]  # Return first 2000 chars as example


def generate_recommendations(analysis_results: Dict) -> List[str]:
    """Generate recommendations based on analysis"""
    recommendations = []
    
    # Check payment terms
    if "payment" in analysis_results:
        payment_data = analysis_results["payment"]
        if "unfavorable" in str(payment_data).lower():
            recommendations.append("Negotiate payment terms to Net 30 or better")
    
    # Check liability
    if "liability" in analysis_results:
        liability_data = analysis_results["liability"]
        if "unlimited" in str(liability_data).lower():
            recommendations.append("Require liability cap at 12 months of fees")
    
    # Add more recommendation logic
    
    return recommendations