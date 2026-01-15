import { NextRequest, NextResponse } from 'next/server';

// Mock contract analysis for demo purposes
export async function POST(request: NextRequest) {
  try {
    const { contractText: _contractText, analysisType: _analysisType } = await request.json();

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Return comprehensive mock analysis results
    const analysisResults = {
      success: true,
      analysis: {
        // Executive Summary
        summary: {
          type: "Service Agreement",
          parties: ["Your Company", "Vendor Corp"],
          value: "$125,000",
          duration: "12 months",
          effectiveDate: "2024-03-01",
          expirationDate: "2025-02-28",
          status: "Active",
          jurisdiction: "Delaware, USA",
          governingLaw: "Delaware State Law"
        },
        
        // Comprehensive Risk Assessment
        riskScore: 72,
        riskLevel: "Medium",
        riskBreakdown: {
          financial: { score: 65, level: "Medium", factors: ["Uncapped liability", "No payment guarantees"] },
          legal: { score: 78, level: "Low", factors: ["Clear jurisdiction", "Dispute resolution defined"] },
          operational: { score: 70, level: "Medium", factors: ["Vague deliverables", "No SLAs defined"] },
          compliance: { score: 85, level: "Low", factors: ["GDPR compliant", "Security standards met"] },
          reputational: { score: 82, level: "Low", factors: ["Confidentiality protected", "IP rights clear"] }
        },
        
        // Detailed Key Terms Analysis
        keyTerms: [
          {
            category: "Payment Terms",
            detail: "Net 30 days from invoice date",
            importance: "high",
            marketComparison: "Standard (Industry avg: Net 30-45)",
            negotiationLeverage: "Low",
            risks: ["Late payment penalties not defined", "No early payment discount"],
            recommendations: ["Add 2% late fee after 45 days", "Negotiate 2/10 net 30 discount"]
          },
          {
            category: "Liability & Indemnification",
            detail: "Mutual indemnification, liability limited to contract value",
            importance: "high",
            marketComparison: "Favorable (Industry often uncapped)",
            negotiationLeverage: "Medium",
            risks: ["Excludes consequential damages", "No cap on indemnification"],
            recommendations: ["Maintain current liability cap", "Add indemnification cap at 2x contract value"]
          },
          {
            category: "Termination",
            detail: "Either party may terminate with 30 days written notice",
            importance: "high",
            marketComparison: "Aggressive (Industry avg: 60-90 days)",
            negotiationLeverage: "High",
            risks: ["Short notice period", "No cure period for breaches"],
            recommendations: ["Negotiate 60-day notice", "Add 15-day cure period"]
          },
          {
            category: "Intellectual Property",
            detail: "All work product becomes client property upon payment",
            importance: "high",
            marketComparison: "Client-favorable",
            negotiationLeverage: "Low",
            risks: ["No carve-outs for vendor IP", "Broad definition of work product"],
            recommendations: ["Define pre-existing IP exceptions", "Clarify derivative works ownership"]
          },
          {
            category: "Confidentiality",
            detail: "Mutual NDA, 5-year term post-contract",
            importance: "medium",
            marketComparison: "Standard",
            negotiationLeverage: "Low",
            risks: ["No residual knowledge clause", "Broad definition of confidential info"],
            recommendations: ["Add residual knowledge provision", "Define specific exclusions"]
          },
          {
            category: "Service Levels",
            detail: "99.5% uptime commitment",
            importance: "high",
            marketComparison: "Below market (Industry: 99.9%)",
            negotiationLeverage: "High",
            risks: ["No service credits", "Maintenance windows included in uptime"],
            recommendations: ["Negotiate 99.9% SLA", "Add service credit structure"]
          }
        ],
        
        // Critical Issues & Red Flags
        issues: [
          {
            severity: "critical",
            title: "Unlimited Liability for Data Breaches",
            description: "Contract excludes data breaches from liability cap",
            impact: "Potential exposure to millions in damages",
            recommendation: "Negotiate specific cap for data breach liability",
            suggestedLanguage: "Liability for data breaches shall not exceed $5 million",
            priority: 1
          },
          {
            severity: "high",
            title: "Missing Force Majeure Clause",
            description: "No provisions for pandemic, natural disasters, or acts of God",
            impact: "Could be held liable for non-performance during crisis",
            recommendation: "Add comprehensive force majeure language",
            suggestedLanguage: "Standard ICC force majeure clause 2020",
            priority: 2
          },
          {
            severity: "high",
            title: "Ambiguous Scope of Services",
            description: "Services description uses vague terms like 'support' and 'assistance'",
            impact: "Scope creep risk, potential disputes over deliverables",
            recommendation: "Define specific deliverables and out-of-scope items",
            suggestedLanguage: "See attached Statement of Work for detailed scope",
            priority: 3
          },
          {
            severity: "medium",
            title: "No Price Protection",
            description: "Vendor can increase prices without limitation",
            impact: "Budget uncertainty, potential 20-30% annual increases",
            recommendation: "Cap annual increases at CPI + 3%",
            suggestedLanguage: "Annual price increases shall not exceed the lesser of 5% or CPI + 3%",
            priority: 4
          },
          {
            severity: "medium",
            title: "Weak Data Protection Terms",
            description: "Generic data protection language, no specific security requirements",
            impact: "Compliance risk with GDPR, CCPA, and industry regulations",
            recommendation: "Add specific security requirements and audit rights",
            suggestedLanguage: "Vendor shall maintain SOC 2 Type II certification",
            priority: 5
          },
          {
            severity: "low",
            title: "No Benchmarking Clause",
            description: "Cannot compare pricing/service to market",
            impact: "May overpay relative to market rates",
            recommendation: "Add annual benchmarking provision",
            suggestedLanguage: "Annual third-party benchmarking with price adjustment rights",
            priority: 6
          }
        ],
        
        // Financial Analysis
        financialAnalysis: {
          totalContractValue: "$125,000",
          monthlyBurn: "$10,417",
          costPerUser: "$125/user/month",
          marketComparison: {
            status: "15% above market",
            marketAverage: "$108,000",
            percentile: "65th",
            competitorPricing: [
              { vendor: "Competitor A", price: "$95,000", features: "Similar" },
              { vendor: "Competitor B", price: "$110,000", features: "Similar + 24/7 support" },
              { vendor: "Market Leader", price: "$145,000", features: "Premium features" }
            ]
          },
          hiddenCosts: [
            { item: "Implementation fees", amount: "$15,000", likelihood: "High" },
            { item: "Training costs", amount: "$5,000", likelihood: "Medium" },
            { item: "Integration expenses", amount: "$8,000", likelihood: "Medium" },
            { item: "Overage charges", amount: "$500-2000/month", likelihood: "Low" }
          ],
          savingsOpportunities: [
            { strategy: "Annual prepayment", savings: "$12,500 (10%)", difficulty: "Easy" },
            { strategy: "Multi-year commitment", savings: "$25,000 (20%)", difficulty: "Medium" },
            { strategy: "Bundle with other services", savings: "$18,750 (15%)", difficulty: "Medium" },
            { strategy: "Reduce user licenses", savings: "$30,000 (24%)", difficulty: "Hard" }
          ],
          roi: {
            estimatedROI: "185%",
            paybackPeriod: "6.5 months",
            fiveYearTCV: "$625,000",
            breakEvenPoint: "Month 7"
          }
        },
        
        // Compliance & Regulatory
        compliance: {
          overallScore: 85,
          status: "Compliant with Minor Gaps",
          frameworks: {
            gdpr: { status: "pass", score: 92, gaps: ["Data portability not addressed"] },
            ccpa: { status: "pass", score: 88, gaps: ["Consumer rights process unclear"] },
            sox: { status: "pass", score: 90, gaps: ["Audit trail requirements vague"] },
            hipaa: { status: "n/a", score: null, gaps: [] },
            pciDss: { status: "warning", score: 75, gaps: ["Cardholder data handling not specified"] }
          },
          certifications: [
            { cert: "SOC 2 Type II", status: "verified", expiry: "2024-12-31" },
            { cert: "ISO 27001", status: "verified", expiry: "2025-06-30" },
            { cert: "ISO 9001", status: "pending", expiry: null }
          ],
          auditRights: {
            frequency: "Annual",
            notice: "30 days",
            scope: "Limited to security controls",
            recommendations: ["Expand to include financial audits", "Reduce notice to 15 days"]
          }
        },
        
        // Negotiation Intelligence
        negotiationStrategy: {
          leverage: "Medium-High",
          vendorDependency: "Low - Multiple alternatives available",
          timingAdvantage: "High - End of vendor's fiscal quarter",
          keyLeveragePoints: [
            "Vendor seeking reference customer in your industry",
            "Competitive alternatives 15-20% cheaper",
            "Current economic climate favors buyers",
            "Your company's growth trajectory attractive to vendor"
          ],
          recommendedTactics: [
            {
              tactic: "Bundle negotiation",
              description: "Combine with 2 other pending contracts for volume discount",
              expectedOutcome: "15-20% discount",
              risk: "Low"
            },
            {
              tactic: "Competitive pressure",
              description: "Mention ongoing evaluation of Competitor B",
              expectedOutcome: "10-15% discount + enhanced terms",
              risk: "Medium"
            },
            {
              tactic: "Strategic partnership",
              description: "Offer case study and reference in exchange for better terms",
              expectedOutcome: "Premium support + 10% discount",
              risk: "Low"
            }
          ],
          walkAwayPoints: [
            "Price increase > 5% annually",
            "No liability cap for data breaches",
            "Termination notice > 60 days",
            "No SLA credits"
          ]
        },
        
        // AI-Powered Insights
        aiInsights: {
          patterns: [
            "This contract structure matches 87% with your previously successful agreements",
            "Payment terms are 15% better than your portfolio average",
            "Liability provisions stronger than 73% of similar contracts in database",
            "Termination clause is aggressive compared to 90% of peer companies"
          ],
          predictions: [
            { event: "Vendor will accept 10-15% discount", probability: "78%", confidence: "High" },
            { event: "Service issues likely in months 3-4", probability: "45%", confidence: "Medium" },
            { event: "Price increase request at renewal", probability: "85%", confidence: "Very High" },
            { event: "Vendor acquisition within 18 months", probability: "32%", confidence: "Low" }
          ],
          recommendations: [
            { priority: "High", action: "Lock in multi-year pricing now", reason: "Market prices rising 12% annually" },
            { priority: "High", action: "Negotiate data breach cap", reason: "Critical gap in risk management" },
            { priority: "Medium", action: "Add benchmarking clause", reason: "Ensure competitive pricing long-term" },
            { priority: "Low", action: "Include step-in rights", reason: "Protect against vendor instability" }
          ],
          similarContracts: [
            { name: "TechVendor Agreement 2023", similarity: "92%", outcome: "Successful - 18% savings achieved" },
            { name: "CloudService Contract 2023", similarity: "85%", outcome: "Renegotiated after 6 months" },
            { name: "SaaS Provider Deal 2022", similarity: "78%", outcome: "Successful - Renewed with improvements" }
          ]
        },
        
        // Action Items & Workflow
        actionPlan: {
          immediate: [
            { task: "Review critical liability issue with legal", due: "Within 24 hours", owner: "Legal Team" },
            { task: "Prepare negotiation strategy document", due: "Within 48 hours", owner: "Procurement" },
            { task: "Schedule vendor meeting", due: "This week", owner: "Vendor Manager" }
          ],
          shortTerm: [
            { task: "Conduct competitive analysis", due: "Next 7 days", owner: "Procurement" },
            { task: "Draft amended contract terms", due: "Next 10 days", owner: "Legal Team" },
            { task: "Align with finance on budget impact", due: "Next 7 days", owner: "Finance" }
          ],
          longTerm: [
            { task: "Implement contract management system", due: "Next 30 days", owner: "IT" },
            { task: "Establish vendor scorecard", due: "Next 45 days", owner: "Vendor Manager" },
            { task: "Plan Q2 business review", due: "Next quarter", owner: "Business Owner" }
          ]
        },
        
        // Market Intelligence
        marketContext: {
          industryTrends: [
            "Shift towards outcome-based pricing models",
            "Increased focus on AI/ML capabilities in contracts",
            "Rising importance of ESG compliance terms",
            "Trend toward shorter contract terms (12 vs 36 months)"
          ],
          vendorIntel: {
            financialHealth: "Strong - Revenue growing 23% YoY",
            marketPosition: "#3 in market, 18% market share",
            recentEvents: ["Acquired competitor last quarter", "Launched new AI features", "IPO planned for 2025"],
            customerSentiment: "Generally positive (4.2/5 on G2)",
            strengths: ["Strong product", "Good support", "Regular updates"],
            weaknesses: ["Expensive", "Complex implementation", "Limited customization"]
          }
        }
      }
    };

    return NextResponse.json(analysisResults);
  } catch (error) {
    console.error('Demo analysis error:', error);
    return NextResponse.json(
      { error: 'Analysis failed', details: error },
      { status: 500 }
    );
  }
}