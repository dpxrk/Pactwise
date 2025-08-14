import { NextRequest, NextResponse } from 'next/server';

// Mock negotiation assistant for demo purposes
export async function POST(request: NextRequest) {
  try {
    const { query, context } = await request.json();

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // Return mock negotiation suggestions
    const suggestions = {
      success: true,
      response: {
        strategy: "Collaborative negotiation with focus on value creation",
        suggestions: [
          {
            type: "pricing",
            title: "Volume Discount Opportunity",
            description: "Based on your projected volume, you could negotiate a 15-20% discount",
            talkingPoints: [
              "We're projecting $500k in annual purchases",
              "Competitors offer 18% for this volume",
              "We're willing to sign a 2-year commitment"
            ]
          },
          {
            type: "terms",
            title: "Payment Terms Improvement",
            description: "Request Net 45 instead of Net 30",
            talkingPoints: [
              "Strong payment history with other vendors",
              "Improves our cash flow management",
              "Industry standard is Net 45 for enterprise clients"
            ]
          },
          {
            type: "sla",
            title: "Service Level Agreement",
            description: "Negotiate stronger SLA terms",
            talkingPoints: [
              "99.9% uptime guarantee with credits",
              "4-hour response time for critical issues",
              "Monthly performance reviews"
            ]
          }
        ],
        leverage: [
          "Your company is in the top 10% of their client base",
          "Market alternatives available at competitive rates",
          "Strong negotiating position due to contract timing"
        ],
        risks: [
          "Vendor may resist pricing changes in current market",
          "Too aggressive negotiation could delay contract closure"
        ],
        bestPractices: [
          "Start with non-monetary terms to build rapport",
          "Use data to support your position",
          "Be prepared to offer something in return",
          "Document all agreements in writing"
        ],
        alternativeOptions: [
          "Consider multi-year agreement for better pricing",
          "Bundle services for package discount",
          "Negotiate performance-based pricing model"
        ]
      }
    };

    return NextResponse.json(suggestions);
  } catch (error) {
    console.error('Demo negotiation error:', error);
    return NextResponse.json(
      { error: 'Negotiation assistant failed', details: error },
      { status: 500 }
    );
  }
}