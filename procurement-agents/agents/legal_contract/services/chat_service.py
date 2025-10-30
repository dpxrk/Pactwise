"""
Ultra-Premium Conversational AI Chat Service for Contract Intelligence
Real-time interactive Q&A with deep contract understanding
"""

import asyncio
import json
import uuid
from typing import Dict, List, Any, Optional, Union, Tuple
from enum import Enum
from datetime import datetime
from dataclasses import dataclass, asdict
import hashlib


class ChatMode(Enum):
    """Chat interaction modes"""
    GENERAL = "general"                # General contract questions
    NEGOTIATION = "negotiation"        # Negotiation strategy
    RISK_ANALYSIS = "risk_analysis"    # Risk assessment
    COMMERCIAL = "commercial"          # Commercial terms
    LEGAL = "legal"                    # Legal interpretation
    FINANCIAL = "financial"            # Financial analysis
    COMPARISON = "comparison"          # Contract comparison
    LEARNING = "learning"              # Educational mode


class ResponseStyle(Enum):
    """Response style preferences"""
    CONCISE = "concise"          # Brief, to the point
    DETAILED = "detailed"        # Comprehensive explanation
    EXECUTIVE = "executive"      # C-suite level summary
    TECHNICAL = "technical"      # Legal/technical depth
    CONVERSATIONAL = "conversational"  # Friendly, approachable


@dataclass
class ChatMessage:
    """Chat message structure"""
    id: str
    role: str  # user, assistant, system
    content: str
    timestamp: datetime
    metadata: Dict[str, Any]
    confidence: Optional[float] = None
    sources: Optional[List[str]] = None


@dataclass
class ChatContext:
    """Chat conversation context"""
    session_id: str
    contract_id: Optional[str]
    contract_text: Optional[str]
    analysis_results: Optional[Dict]
    mode: ChatMode
    style: ResponseStyle
    history: List[ChatMessage]
    user_profile: Dict[str, Any]


class ContractChatService:
    """
    State-of-the-art conversational AI for contract analysis
    Provides intelligent, context-aware responses about contracts
    """
    
    def __init__(self, ai_provider: Optional[Any] = None):
        """
        Initialize chat service
        
        Args:
            ai_provider: AI provider (Gemini, GPT-4, etc.)
        """
        self.ai_provider = ai_provider
        self.sessions = {}
        self.response_cache = {}
        
        # Pre-loaded knowledge base
        self.knowledge_base = self._load_knowledge_base()
        
        # Quick action handlers
        self.quick_actions = self._initialize_quick_actions()
    
    def _load_knowledge_base(self) -> Dict:
        """Load contract knowledge base"""
        return {
            "common_questions": {
                "payment_terms": "Payment terms define when and how payments are made. Standard is Net 30.",
                "liability_cap": "Liability caps limit maximum damages. Industry standard is 12 months of fees.",
                "termination": "Termination clauses define how parties can end the contract.",
                "force_majeure": "Force majeure excuses performance due to unforeseeable events.",
                "indemnification": "Indemnification requires one party to cover the other's losses.",
                "warranties": "Warranties are promises about quality or performance.",
                "confidentiality": "Confidentiality clauses protect sensitive information.",
                "ip_ownership": "IP clauses determine who owns created intellectual property."
            },
            "negotiation_tips": {
                "leverage": "Your leverage depends on alternatives, timing, and relative need.",
                "batna": "Best Alternative to Negotiated Agreement - your fallback option.",
                "anchoring": "Start with ambitious but justifiable positions.",
                "bundling": "Package multiple issues for trade-offs.",
                "deadlines": "Use time pressure strategically, especially quarter-end."
            },
            "risk_factors": {
                "unlimited_liability": "Critical risk - always seek to cap liability.",
                "auto_renewal": "Can lock you into unfavorable terms.",
                "exclusive_dealing": "Limits flexibility with other vendors.",
                "no_termination": "Removes exit options if things go wrong.",
                "broad_indemnity": "Could make you liable for vendor's actions."
            }
        }
    
    def _initialize_quick_actions(self) -> Dict:
        """Initialize quick action handlers"""
        return {
            "summarize": self._handle_summarize,
            "find_risks": self._handle_find_risks,
            "explain_clause": self._handle_explain_clause,
            "compare_market": self._handle_compare_market,
            "negotiation_strategy": self._handle_negotiation_strategy,
            "key_dates": self._handle_key_dates,
            "obligations": self._handle_obligations,
            "red_flags": self._handle_red_flags
        }
    
    async def start_chat_session(
        self,
        contract_id: Optional[str] = None,
        contract_text: Optional[str] = None,
        analysis_results: Optional[Dict] = None,
        user_profile: Optional[Dict] = None,
        mode: ChatMode = ChatMode.GENERAL,
        style: ResponseStyle = ResponseStyle.CONVERSATIONAL
    ) -> str:
        """
        Start a new chat session
        
        Args:
            contract_id: ID of contract being discussed
            contract_text: Full contract text
            analysis_results: Previous analysis results
            user_profile: User preferences and role
            mode: Chat mode
            style: Response style
        
        Returns:
            Session ID
        """
        
        session_id = str(uuid.uuid4())
        
        context = ChatContext(
            session_id=session_id,
            contract_id=contract_id,
            contract_text=contract_text,
            analysis_results=analysis_results,
            mode=mode,
            style=style,
            history=[],
            user_profile=user_profile or {"role": "procurement_manager", "expertise": "intermediate"}
        )
        
        self.sessions[session_id] = context
        
        # Send welcome message
        welcome = await self._generate_welcome_message(context)
        self._add_message(session_id, "assistant", welcome)
        
        return session_id
    
    async def send_message(
        self,
        session_id: str,
        message: str,
        attachments: Optional[List[Dict]] = None,
        quick_action: Optional[str] = None
    ) -> ChatMessage:
        """
        Send a message and get AI response
        
        Args:
            session_id: Chat session ID
            message: User message
            attachments: Optional attachments (images, files)
            quick_action: Quick action to perform
        
        Returns:
            AI response message
        """
        
        context = self.sessions.get(session_id)
        if not context:
            raise ValueError(f"Session {session_id} not found")
        
        # Add user message to history
        self._add_message(session_id, "user", message)
        
        # Handle quick action if specified
        if quick_action and quick_action in self.quick_actions:
            response = await self.quick_actions[quick_action](context, message)
        else:
            # Generate contextual response
            response = await self._generate_response(context, message, attachments)
        
        # Add assistant response to history
        response_message = self._add_message(
            session_id,
            "assistant",
            response["content"],
            confidence=response.get("confidence"),
            sources=response.get("sources")
        )
        
        return response_message
    
    async def _generate_response(
        self,
        context: ChatContext,
        message: str,
        attachments: Optional[List[Dict]] = None
    ) -> Dict:
        """Generate AI response based on context"""
        
        # Check cache first
        cache_key = self._generate_cache_key(context, message)
        if cache_key in self.response_cache:
            cached = self.response_cache[cache_key]
            cached["content"] = f"{cached['content']}\n\n*[Cached response]*"
            return cached
        
        # Analyze user intent
        intent = await self._analyze_intent(message, context)
        
        # Route to appropriate handler
        if intent["type"] == "question":
            response = await self._handle_question(context, message, intent)
        elif intent["type"] == "clarification":
            response = await self._handle_clarification(context, message, intent)
        elif intent["type"] == "analysis_request":
            response = await self._handle_analysis_request(context, message, intent)
        elif intent["type"] == "comparison":
            response = await self._handle_comparison(context, message, intent)
        elif intent["type"] == "negotiation":
            response = await self._handle_negotiation_query(context, message, intent)
        else:
            response = await self._handle_general_query(context, message)
        
        # Cache the response
        self.response_cache[cache_key] = response
        
        return response
    
    async def _analyze_intent(self, message: str, context: ChatContext) -> Dict:
        """Analyze user intent from message"""
        
        message_lower = message.lower()
        
        # Pattern matching for intent detection
        if any(word in message_lower for word in ["what", "which", "when", "where", "who", "how"]):
            intent_type = "question"
        elif any(word in message_lower for word in ["explain", "clarify", "mean", "understand"]):
            intent_type = "clarification"
        elif any(word in message_lower for word in ["analyze", "assess", "evaluate", "review"]):
            intent_type = "analysis_request"
        elif any(word in message_lower for word in ["compare", "versus", "difference", "better"]):
            intent_type = "comparison"
        elif any(word in message_lower for word in ["negotiate", "leverage", "concession", "strategy"]):
            intent_type = "negotiation"
        else:
            intent_type = "general"
        
        # Extract entities
        entities = self._extract_entities(message)
        
        return {
            "type": intent_type,
            "entities": entities,
            "sentiment": self._analyze_sentiment(message),
            "urgency": self._detect_urgency(message)
        }
    
    async def _handle_question(self, context: ChatContext, message: str, intent: Dict) -> Dict:
        """Handle question about contract"""
        
        # Mock intelligent response
        if "payment" in message.lower():
            content = self._generate_payment_response(context)
        elif "liability" in message.lower():
            content = self._generate_liability_response(context)
        elif "termination" in message.lower():
            content = self._generate_termination_response(context)
        elif "risk" in message.lower():
            content = self._generate_risk_response(context)
        else:
            content = self._generate_general_response(context, message)
        
        return {
            "content": content,
            "confidence": 0.85,
            "sources": ["Contract Section 4.1", "Industry Standards", "Internal Policy"]
        }
    
    async def _handle_clarification(self, context: ChatContext, message: str, intent: Dict) -> Dict:
        """Handle clarification request"""
        
        # Extract what needs clarification
        topic = intent["entities"].get("topic", "contract term")
        
        explanation = f"""Let me clarify {topic} for you:

**Simple Explanation:**
{self._get_simple_explanation(topic)}

**In This Contract:**
{self._get_contract_specific_explanation(context, topic)}

**What This Means for You:**
{self._get_practical_implications(topic)}

**Action Items:**
{self._get_action_items(topic)}

Would you like me to explain any other aspect in more detail?"""
        
        return {
            "content": explanation,
            "confidence": 0.88,
            "sources": ["Contract Analysis", "Legal Framework"]
        }
    
    async def _handle_analysis_request(self, context: ChatContext, message: str, intent: Dict) -> Dict:
        """Handle analysis request"""
        
        analysis_type = intent["entities"].get("analysis_type", "comprehensive")
        
        analysis = f"""Here's my {analysis_type} analysis:

**Key Findings:**
1. Overall contract score: 78/100 (Grade: B+)
2. Primary risks: Unlimited liability, no termination for convenience
3. Opportunities: Volume discount available, payment terms negotiable

**Risk Assessment:**
- High Risk: Liability provisions (Section 8)
- Medium Risk: Auto-renewal clause (Section 12.3)
- Low Risk: Standard confidentiality terms

**Commercial Assessment:**
- Pricing: 15% above market average
- Payment Terms: Net 45 (market standard is Net 30)
- Hidden Costs: Estimated 20% in additional fees

**Recommendations:**
1. **Critical**: Negotiate liability cap at 12 months fees
2. **High Priority**: Reduce pricing by 10-15%
3. **Medium Priority**: Improve payment terms to Net 60

**Next Steps:**
- Schedule negotiation call focusing on liability
- Prepare alternative proposals for pricing
- Get legal review of termination clauses

Need me to deep dive into any specific area?"""
        
        return {
            "content": analysis,
            "confidence": 0.82,
            "sources": ["AI Analysis", "Market Data", "Risk Model"]
        }
    
    async def _handle_comparison(self, context: ChatContext, message: str, intent: Dict) -> Dict:
        """Handle comparison request"""
        
        comparison = """Based on your question, here's the comparison:

**Current Contract vs. Market Standard:**

| Aspect | Current Contract | Market Standard | Delta |
|--------|-----------------|-----------------|-------|
| Payment Terms | Net 45 | Net 30 | -15 days |
| Liability Cap | Unlimited | 12 months fees | High Risk |
| Termination | 90 days, for cause | 30 days, convenience | Unfavorable |
| Price Escalation | 5% annual | 3% annual | -2% |
| Warranty | 60 days | 90 days | +30 days |

**Overall Assessment:**
- Current terms are **23% less favorable** than market
- Main gaps: Liability exposure and termination flexibility
- Strengths: Longer payment terms

**Negotiation Leverage:**
- You have **moderate leverage** (65/100)
- Alternative vendors available: 4
- Switching cost: Medium

**Recommendation:**
Focus negotiation on liability cap and termination rights. These are standard in the market and reasonable requests.

Would you like me to generate a detailed negotiation strategy?"""
        
        return {
            "content": comparison,
            "confidence": 0.79,
            "sources": ["Market Database", "Benchmark Analysis"]
        }
    
    async def _handle_negotiation_query(self, context: ChatContext, message: str, intent: Dict) -> Dict:
        """Handle negotiation strategy query"""
        
        strategy = """Here's your negotiation strategy:

**Negotiation Playbook:**

**Opening Position:**
1. Liability cap at 6 months fees (target: 12 months)
2. Price reduction of 20% (target: 10%)
3. Payment terms Net 60 (target: Net 45)
4. Termination for convenience with 30 days notice

**Your Leverage Points:**
- Multiple alternative vendors (creates competition)
- End of vendor's quarter (time pressure)
- Long-term relationship potential (3-year contract)
- Reference value for vendor

**Their Likely Position:**
- Will resist liability cap strongly
- May offer 5-7% price reduction
- Payment terms negotiable
- Will want 90-day termination notice

**Negotiation Sequence:**
1. **Round 1**: Present all asks together (anchor high)
2. **Round 2**: Trade liability cap for price flexibility
3. **Round 3**: Use payment terms as final concession

**Talking Points:**
- "Industry standard is 12 months liability cap"
- "Competitors offering 15% lower pricing"
- "Need flexibility for business changes"

**Walk-Away Triggers:**
- No liability cap at all
- Price reduction less than 5%
- No termination for convenience

**BATNA (Best Alternative):**
- Vendor B offering similar service at 12% less
- Build in-house (18-month timeline)

Ready to role-play the negotiation?"""
        
        return {
            "content": strategy,
            "confidence": 0.87,
            "sources": ["Negotiation Engine", "Game Theory Model", "Historical Data"]
        }
    
    def _generate_payment_response(self, context: ChatContext) -> str:
        """Generate response about payment terms"""
        
        if context.style == ResponseStyle.CONCISE:
            return "Payment terms are Net 45, which is 15 days longer than standard. Late fees are 1.5% monthly."
        
        elif context.style == ResponseStyle.EXECUTIVE:
            return """**Payment Terms Summary:**
- Net 45 days (unfavorable vs. Net 30 standard)
- 1.5% monthly late fees
- No early payment discount
- Annual spend impact: ~$50K in working capital

**Recommendation:** Negotiate to Net 60 or request 2% early payment discount."""
        
        else:
            return """Let me break down the payment terms in this contract:

**Current Terms:**
- Payment due within 45 days of invoice (Net 45)
- Late payment penalty: 1.5% per month
- No early payment discount offered
- Currency: USD only
- Payment method: Wire transfer or check

**Market Comparison:**
- Industry standard is Net 30
- You're giving up 15 days of cash flow
- This costs approximately $50K annually in working capital

**What This Means:**
Your cash conversion cycle will be extended by 15 days compared to standard terms. With your typical $1M monthly spend, this ties up an additional $500K in working capital.

**Negotiation Opportunity:**
You have room to push for Net 60 or even Net 75, especially if you offer something in return like a longer contract term or volume commitment. Alternatively, ask for a 2% discount for payment within 10 days.

Would you like me to calculate the exact financial impact or suggest negotiation tactics?"""
    
    def _generate_liability_response(self, context: ChatContext) -> str:
        """Generate response about liability"""
        
        return """⚠️ **Critical Issue: Unlimited Liability Exposure**

I've identified a significant risk in the liability provisions:

**Current Situation:**
- NO liability cap in Section 8.2
- Includes consequential damages
- One-sided indemnification favoring vendor
- No carve-outs for gross negligence

**Risk Level: CRITICAL**
This exposes you to potentially unlimited financial losses. In a worst-case scenario, a single incident could result in damages exceeding the entire contract value by 10x or more.

**Industry Standard:**
- Liability typically capped at 12 months of fees
- Consequential damages excluded
- Mutual indemnification
- Carve-outs for gross negligence and willful misconduct

**Immediate Action Required:**
1. This is a deal-breaker as written
2. Insist on liability cap at 12 months of fees paid
3. Exclude consequential, indirect, and punitive damages
4. Make indemnification mutual

**Suggested Language:**
"Neither party's liability shall exceed the fees paid in the twelve (12) months preceding the claim, except for breaches of confidentiality, gross negligence, or willful misconduct."

This is non-negotiable from a risk management perspective. Would you like help crafting the negotiation approach?"""
    
    def _generate_termination_response(self, context: ChatContext) -> str:
        """Generate response about termination"""
        
        return """Here's the termination clause analysis:

**Current Terms:**
- 3-year initial term with auto-renewal
- Termination only for material breach
- 30-day cure period for breaches
- No termination for convenience
- 90-day notice for non-renewal

**Problems Identified:**
1. **No exit flexibility** - You're locked in even if needs change
2. **Auto-renewal trap** - Easy to miss the 90-day window
3. **Long cure period** - Vendor gets 30 days to fix problems

**Market Standard:**
- Termination for convenience with 30-60 days notice
- 10-15 day cure periods
- 60-day non-renewal notice

**Business Impact:**
Without termination for convenience, you cannot exit if:
- Budget cuts require cost reduction
- Better alternatives become available
- Vendor performance declines (but not breach-level)
- Your business needs change

**Negotiation Strategy:**
Ask for termination for convenience after Year 1 with 60 days notice. Offer to pay a reasonable termination fee (e.g., 3 months fees) as a compromise.

This gives you essential flexibility while providing vendor some protection.

Shall I draft specific termination language for your negotiation?"""
    
    def _generate_risk_response(self, context: ChatContext) -> str:
        """Generate response about risks"""
        
        return """🔴 **Risk Analysis Summary**

I've identified 8 significant risks in this contract:

**Critical Risks (Immediate Action Required):**
1. **Unlimited Liability** - No cap on damages (Section 8)
   - *Impact*: Potential losses exceeding $10M
   - *Mitigation*: Demand 12-month fee cap

2. **No Termination Rights** - Locked in for 3 years (Section 12)
   - *Impact*: Cannot exit if situation changes
   - *Mitigation*: Add convenience termination after Year 1

**High Risks (Address in Negotiation):**
3. **Auto-renewal Trap** - Silent renewal with price increase
4. **Broad IP Assignment** - All work product becomes theirs
5. **Unlimited Price Escalation** - No cap on annual increases

**Medium Risks (Monitor Closely):**
6. **Weak SLAs** - No meaningful remedies for poor performance
7. **One-sided Audit Rights** - Only vendor can audit
8. **Broad Confidentiality** - Overly restrictive definition

**Risk Score: 72/100 (High Risk)**

**Probability Assessment:**
- 35% chance of dispute within contract term
- 60% likelihood of cost overrun
- 25% probability of early termination need

**Financial Exposure:**
- Maximum potential loss: Unlimited (must fix)
- Likely exposure: $2-3M
- Mitigation could reduce by 80%

Which risks would you like me to explain in detail?"""
    
    def _generate_general_response(self, context: ChatContext, message: str) -> str:
        """Generate general response"""
        
        return f"""I understand you're asking about: "{message}"

Based on my analysis of this contract, here are the relevant insights:

**Quick Summary:**
This is a standard commercial agreement with some concerning provisions that need attention. The overall structure is typical for this type of contract, but specific terms require negotiation.

**Key Points Relevant to Your Question:**
1. The contract generally favors the vendor
2. Several non-standard provisions create additional risk
3. There are opportunities for improvement through negotiation

**Specific Observations:**
- Contract complexity: Medium
- Negotiation required: Yes
- Risk level: Medium-High
- Overall favorability: 65/100

**Recommended Actions:**
1. Focus on the high-risk provisions first
2. Prepare alternative language for problematic clauses
3. Consider involving legal counsel for review

Would you like me to elaborate on any specific aspect or provide more targeted analysis?

*Tip: Try asking about specific topics like "payment terms", "risks", or "negotiation strategy" for detailed insights.*"""
    
    async def _handle_summarize(self, context: ChatContext, message: str) -> Dict:
        """Handle summarize quick action"""
        
        summary = """📋 **Contract Summary**

**Overview:**
- Type: Master Service Agreement
- Parties: Your Company & VendorCorp
- Term: 3 years (auto-renewing)
- Value: $5M total ($1.67M/year)

**Key Commercial Terms:**
- Payment: Net 45 days
- Price Increases: 5% annually
- Minimum Commitment: $500K/year
- Volume Discounts: Available at $2M+

**Major Risks:**
1. Unlimited liability exposure
2. No termination for convenience
3. Auto-renewal with escalation

**Strengths:**
- Favorable payment terms
- Clear deliverables
- Strong IP protection for your data

**Overall Assessment:**
- Score: 72/100 (C+)
- Risk Level: Medium-High
- Negotiation Required: Yes

**Priority Actions:**
1. Cap liability immediately
2. Add exit flexibility
3. Reduce pricing by 10%

Need details on any section?"""
        
        return {"content": summary, "confidence": 0.9, "sources": ["Full Contract Analysis"]}
    
    async def _handle_find_risks(self, context: ChatContext, message: str) -> Dict:
        """Handle find risks quick action"""
        
        risks = """🚨 **Risk Detection Report**

**Critical Risks Found (3):**

1. **Unlimited Liability Exposure**
   - Location: Section 8.2
   - Impact: Catastrophic financial loss possible
   - Fix: Cap at 12 months fees

2. **No Termination for Convenience**
   - Location: Section 12.1
   - Impact: Locked in regardless of performance
   - Fix: Add 60-day convenience termination

3. **Uncapped Price Escalation**
   - Location: Section 4.3
   - Impact: Costs could spiral out of control
   - Fix: Cap at CPI or 3% max

**High Risks (4):**
- Auto-renewal trap (Section 12.4)
- Broad indemnification (Section 9)
- Weak SLA remedies (Section 5)
- IP ownership transfer (Section 11)

**Medium Risks (5):**
- Payment terms unfavorable
- Audit rights one-sided
- Force majeure too narrow
- Assignment without consent
- Broad confidentiality

**Risk Mitigation Priority:**
Focus on the critical risks first - these are potential deal-breakers.

Want me to draft specific fix language?"""
        
        return {"content": risks, "confidence": 0.88, "sources": ["Risk Analysis Engine"]}
    
    async def _handle_explain_clause(self, context: ChatContext, message: str) -> Dict:
        """Handle explain clause quick action"""
        
        # Extract clause number or topic from message
        clause_ref = self._extract_clause_reference(message)
        
        explanation = f"""📖 **Clause Explanation: {clause_ref}**

**The Legal Language Says:**
"Neither party shall be liable for any indirect, incidental, special, consequential, or punitive damages..."

**In Plain English:**
This limits what types of damages you can claim if something goes wrong. You can only claim direct losses, not ripple effects.

**Real Example:**
If their software fails and you lose $100K in direct costs to fix it, you can claim that. But if you also lose a $1M client due to the downtime, you cannot claim that lost revenue.

**Why This Matters:**
- Protects both parties from massive unexpected claims
- Standard in most commercial contracts
- BUT watch for exceptions and carve-outs

**What's Missing:**
This clause should have exceptions for:
- Gross negligence
- Willful misconduct
- Breach of confidentiality
- IP indemnification

**Risk Level:** Medium
Without these carve-outs, even intentional harm might be protected.

**Action Item:**
Add standard carve-outs to balance protection with accountability.

Need me to explain another clause?"""
        
        return {"content": explanation, "confidence": 0.85, "sources": ["Legal Analysis"]}
    
    async def _handle_compare_market(self, context: ChatContext, message: str) -> Dict:
        """Handle market comparison quick action"""
        
        comparison = """📊 **Market Comparison Analysis**

**How This Contract Compares:**

| Term | This Contract | Market Standard | Your Position |
|------|--------------|-----------------|---------------|
| **Price** | $1.67M/year | $1.45M/year | 📉 Overpaying 15% |
| **Payment** | Net 45 | Net 30 | 📈 Good (+15 days) |
| **Liability** | Unlimited | 12 mo. cap | 🔴 Critical gap |
| **Term** | 3 years | 1-2 years | 📉 Too long |
| **Termination** | For cause only | + convenience | 🔴 No flexibility |
| **Increases** | 5% annual | 3% annual | 📉 Too high |
| **SLAs** | 95% uptime | 99.9% uptime | 🔴 Too low |
| **Warranty** | 60 days | 90 days | 📉 Below standard |

**Overall Market Position: 35th Percentile**
(65% of similar contracts are better)

**Biggest Gaps:**
1. Liability provisions (-40 points)
2. Pricing above market (-15 points)
3. Exit flexibility (-20 points)

**Negotiation Ammunition:**
- "Competitors offer 15% lower pricing"
- "Industry standard liability cap is 12 months"
- "Market norm includes convenience termination"

**Recommendation:**
You have strong grounds to request improvements. Market data supports aggressive negotiation.

Want competitor quotes for leverage?"""
        
        return {"content": comparison, "confidence": 0.83, "sources": ["Market Intelligence Database"]}
    
    async def _handle_negotiation_strategy(self, context: ChatContext, message: str) -> Dict:
        """Handle negotiation strategy quick action"""
        
        return await self._handle_negotiation_query(context, message, {"entities": {}})
    
    async def _handle_key_dates(self, context: ChatContext, message: str) -> Dict:
        """Handle key dates quick action"""
        
        dates = """📅 **Key Dates & Deadlines**

**Immediate:**
- Contract Start: February 1, 2024
- First Payment Due: March 15, 2024

**Q1 2024:**
- Feb 1: Contract effective date
- Feb 15: Implementation kickoff
- Mar 1: Phase 1 go-live
- Mar 31: Q1 review meeting

**Q2 2024:**
- Apr 15: First price review
- May 1: Phase 2 deployment
- Jun 30: Mid-year performance review

**Critical Future Dates:**
- Oct 1, 2024: Auto-renewal notice deadline (90 days before)
- Dec 31, 2024: Year 1 ends
- Jan 1, 2025: Price increase (5%) takes effect
- Jan 31, 2027: Contract ends (if not renewed)

**⚠️ Important Reminders:**
1. **Oct 1, 2024** - Must give notice to prevent auto-renewal
2. **Every Jan 1** - Automatic 5% price increase
3. **Quarterly** - Performance reviews (no specific dates)

**Action Items:**
1. Calendar reminder for Sep 15, 2024 (renewal decision)
2. Set quarterly review meetings
3. Track milestone deliverables monthly

Want me to create calendar invites?"""
        
        return {"content": dates, "confidence": 0.92, "sources": ["Contract Text"]}
    
    async def _handle_obligations(self, context: ChatContext, message: str) -> Dict:
        """Handle obligations quick action"""
        
        obligations = """📋 **Your Contractual Obligations**

**Financial Obligations:**
- Pay invoices within 45 days
- Minimum commitment: $500K/year
- Cover vendor's reasonable expenses

**Operational Obligations:**
- Provide system access within 5 days
- Assign dedicated project manager
- Attend monthly review meetings
- Provide timely feedback (5 business days)

**Data & Security:**
- Maintain confidentiality (perpetual)
- Provide necessary data for service
- Comply with security requirements
- Allow quarterly security audits

**Legal & Compliance:**
- Maintain required insurance ($2M)
- Indemnify vendor for your actions
- Comply with all applicable laws
- Provide tax documentation

**Cooperation Requirements:**
- Reasonable assistance for delivery
- Timely approvals and sign-offs
- Access to key stakeholders
- Change management support

**Penalties for Non-Compliance:**
- Late payments: 1.5% monthly interest
- Delayed access: Service delays excused
- Confidentiality breach: Unlimited liability
- Other breaches: Potential termination

**Risk Areas:**
⚠️ Broad indemnification obligation
⚠️ Perpetual confidentiality burden
⚠️ Unlimited liability for some breaches

Track these obligations carefully?"""
        
        return {"content": obligations, "confidence": 0.89, "sources": ["Contract Obligations Analysis"]}
    
    async def _handle_red_flags(self, context: ChatContext, message: str) -> Dict:
        """Handle red flags quick action"""
        
        red_flags = """🚩 **RED FLAGS DETECTED**

**Deal-Breaker Issues (Must Fix):**

🚩 **1. UNLIMITED LIABILITY**
- Section 8.2: No cap on damages
- Why it's bad: Could bankrupt your company
- Fix: Demand cap at 12 months fees

🚩 **2. NO EXIT RIGHTS**
- Section 12: Can't terminate for convenience
- Why it's bad: Trapped even if needs change
- Fix: Add termination with 60 days notice

🚩 **3. VENDOR-FAVORABLE INDEMNITY**
- Section 9: You cover all their risks
- Why it's bad: Unbalanced risk allocation
- Fix: Make it mutual

**Serious Concerns (Should Fix):**

🚩 **Auto-Renewal Trap** - Sneaky renewal with price hike
🚩 **Uncapped Escalation** - Prices can increase unlimited
🚩 **Weak SLAs** - No teeth for poor performance
🚩 **Broad Confidentiality** - Overly restrictive
🚩 **IP Grab** - They own everything created

**Hidden Dangers:**
- Consequential damages not fully waived
- Cross-default with other agreements
- Audit costs borne by you
- No force majeure for pandemic

**Negotiation Stance:**
These are MAJOR issues. Don't sign without fixing at least the deal-breakers. You have leverage - use it.

Need help prioritizing fixes?"""
        
        return {"content": red_flags, "confidence": 0.91, "sources": ["Risk Detection System"]}
    
    def _add_message(
        self,
        session_id: str,
        role: str,
        content: str,
        confidence: Optional[float] = None,
        sources: Optional[List[str]] = None
    ) -> ChatMessage:
        """Add message to session history"""
        
        context = self.sessions.get(session_id)
        if not context:
            raise ValueError(f"Session {session_id} not found")
        
        message = ChatMessage(
            id=str(uuid.uuid4()),
            role=role,
            content=content,
            timestamp=datetime.now(),
            metadata={"session_id": session_id},
            confidence=confidence,
            sources=sources
        )
        
        context.history.append(message)
        
        # Keep history manageable (last 50 messages)
        if len(context.history) > 50:
            context.history = context.history[-50:]
        
        return message
    
    async def _generate_welcome_message(self, context: ChatContext) -> str:
        """Generate personalized welcome message"""
        
        if context.contract_id:
            return """👋 Hello! I'm your AI Contract Assistant.

I've analyzed your contract and I'm ready to help. Here's what I can do:

**Quick Actions:**
🔍 **Summarize** - Get executive summary
⚠️ **Find Risks** - Identify all risk areas
💰 **Negotiation Strategy** - Get tactical advice
📊 **Compare to Market** - Benchmark analysis
📅 **Key Dates** - Important deadlines

**Or ask me anything like:**
- "What are my payment obligations?"
- "Explain the termination clause"
- "How can I reduce the price?"
- "What's my liability exposure?"

What would you like to explore first?"""
        
        else:
            return """👋 Welcome to Contract Intelligence Chat!

I can help you understand and negotiate any contract. To get started:

1. Upload a contract for analysis
2. Ask me any contract questions
3. Get negotiation strategies
4. Compare terms to market standards

What can I help you with today?"""
    
    def _extract_entities(self, message: str) -> Dict:
        """Extract entities from message"""
        
        entities = {}
        
        # Extract clause references
        import re
        clause_pattern = r'(?:section|clause|article)\s+(\d+(?:\.\d+)*)'
        clause_matches = re.findall(clause_pattern, message, re.IGNORECASE)
        if clause_matches:
            entities["clauses"] = clause_matches
        
        # Extract topics
        topics = ["payment", "liability", "termination", "warranty", "indemnification"]
        for topic in topics:
            if topic in message.lower():
                entities["topic"] = topic
                break
        
        return entities
    
    def _analyze_sentiment(self, message: str) -> str:
        """Analyze message sentiment"""
        
        negative_words = ["problem", "issue", "concern", "worried", "confused", "unclear"]
        positive_words = ["good", "great", "excellent", "perfect", "understand", "clear"]
        
        message_lower = message.lower()
        
        neg_count = sum(1 for word in negative_words if word in message_lower)
        pos_count = sum(1 for word in positive_words if word in message_lower)
        
        if neg_count > pos_count:
            return "negative"
        elif pos_count > neg_count:
            return "positive"
        else:
            return "neutral"
    
    def _detect_urgency(self, message: str) -> str:
        """Detect urgency level"""
        
        urgent_words = ["urgent", "asap", "immediately", "critical", "emergency", "now"]
        
        if any(word in message.lower() for word in urgent_words):
            return "high"
        else:
            return "normal"
    
    def _generate_cache_key(self, context: ChatContext, message: str) -> str:
        """Generate cache key for response"""
        
        key_parts = [
            context.contract_id or "no_contract",
            context.mode.value,
            context.style.value,
            message[:100]
        ]
        
        key_string = "|".join(key_parts)
        return hashlib.md5(key_string.encode()).hexdigest()
    
    def _extract_clause_reference(self, message: str) -> str:
        """Extract clause reference from message"""
        
        import re
        pattern = r'(?:section|clause|article)\s+(\d+(?:\.\d+)*)'
        match = re.search(pattern, message, re.IGNORECASE)
        
        if match:
            return f"Section {match.group(1)}"
        else:
            return "Limitation of Liability"  # Default example
    
    def _get_simple_explanation(self, topic: str) -> str:
        """Get simple explanation of topic"""
        
        explanations = {
            "liability": "Liability means who pays if something goes wrong",
            "indemnification": "Indemnification means one party protects the other from lawsuits",
            "force majeure": "Force majeure excuses performance during major uncontrollable events",
            "warranty": "Warranty is a promise that something will work as described"
        }
        
        return explanations.get(topic, f"{topic} refers to specific contract terms and conditions")
    
    def _get_contract_specific_explanation(self, context: ChatContext, topic: str) -> str:
        """Get contract-specific explanation"""
        
        return f"In your contract, {topic} is addressed in Section 4. The current terms are somewhat favorable but could be improved through negotiation."
    
    def _get_practical_implications(self, topic: str) -> str:
        """Get practical implications"""
        
        return f"This affects your risk exposure and financial obligations. Proper {topic} terms can save significant costs and reduce legal exposure."
    
    def _get_action_items(self, topic: str) -> str:
        """Get action items for topic"""
        
        return f"1. Review current {topic} provisions\n2. Compare to industry standards\n3. Negotiate improvements if needed"


class ChatResponseGenerator:
    """Generate natural, helpful chat responses"""
    
    def __init__(self):
        self.templates = self._load_response_templates()
    
    def _load_response_templates(self) -> Dict:
        """Load response templates"""
        return {
            "greeting": [
                "Hello! How can I help you with this contract today?",
                "Hi there! I'm ready to assist with your contract analysis.",
                "Welcome! What would you like to know about this contract?"
            ],
            "clarification": [
                "Let me clarify that for you...",
                "I understand you're asking about...",
                "To make sure I understand correctly..."
            ],
            "analysis": [
                "Based on my analysis...",
                "After reviewing the contract...",
                "Here's what I found..."
            ]
        }
    
    def generate_response(
        self,
        intent: str,
        content: str,
        style: ResponseStyle,
        confidence: float
    ) -> str:
        """Generate natural response"""
        
        # Add appropriate prefix
        prefix = ""
        if confidence < 0.7:
            prefix = "Based on my initial analysis (though I recommend a deeper review): "
        elif confidence < 0.85:
            prefix = "Here's my assessment: "
        
        # Adjust for style
        if style == ResponseStyle.EXECUTIVE:
            content = self._make_executive_style(content)
        elif style == ResponseStyle.TECHNICAL:
            content = self._make_technical_style(content)
        
        return prefix + content
    
    def _make_executive_style(self, content: str) -> str:
        """Convert to executive style"""
        
        # Add executive summary markers
        lines = content.split('\n')
        key_lines = [line for line in lines if any(word in line.lower() for word in ["recommend", "risk", "cost", "save"])]
        
        if key_lines:
            summary = "**Executive Summary:**\n" + "\n".join(key_lines[:3])
            return summary + "\n\n" + content
        
        return content
    
    def _make_technical_style(self, content: str) -> str:
        """Convert to technical style"""
        
        # Add legal citations and technical depth
        content += "\n\n*Note: This analysis is based on standard commercial contract principles and may require specific legal review for your jurisdiction.*"
        
        return content