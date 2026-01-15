import { NextRequest, NextResponse } from 'next/server';

// Mock vendor evaluation for demo purposes
export async function POST(request: NextRequest) {
  try {
    const { vendorData: _vendorData } = await request.json();

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Return mock evaluation results
    const evaluationResults = {
      success: true,
      evaluation: {
        overallScore: 82,
        rating: "Excellent",
        recommendation: "Approved - Low Risk",
        scores: {
          financial: 85,
          operational: 78,
          compliance: 90,
          performance: 80,
          reputation: 77
        },
        strengths: [
          "Strong financial stability with consistent revenue growth",
          "Excellent compliance track record",
          "ISO 9001 and SOC 2 certified",
          "Positive customer satisfaction scores"
        ],
        weaknesses: [
          "Limited presence in certain geographic regions",
          "Higher pricing compared to competitors",
          "Some delays reported in Q3 deliveries"
        ],
        risks: [
          {
            level: "low",
            category: "Operational",
            description: "Minor capacity constraints during peak periods",
            mitigation: "Establish backup vendor relationships"
          },
          {
            level: "medium",
            category: "Market",
            description: "Dependent on single supplier for key components",
            mitigation: "Request supplier diversification plan"
          }
        ],
        financialMetrics: {
          revenue: "$45M",
          growth: "+12%",
          profitability: "15% margin",
          creditScore: "A+"
        },
        certifications: [
          "ISO 9001:2015",
          "SOC 2 Type II",
          "GDPR Compliant",
          "PCI DSS Level 1"
        ],
        contractRecommendations: [
          "Negotiate volume discounts for orders over $100k",
          "Include SLA penalties for delivery delays",
          "Request quarterly business reviews",
          "Add termination clause for performance issues"
        ],
        competitors: [
          {
            name: "Competitor A",
            score: 75,
            pricing: "10% lower",
            strengths: "Cost-effective"
          },
          {
            name: "Competitor B",
            score: 79,
            pricing: "5% higher",
            strengths: "Better SLAs"
          }
        ],
        nextSteps: [
          "Schedule vendor presentation",
          "Request additional references",
          "Conduct site visit",
          "Begin contract negotiations"
        ]
      }
    };

    return NextResponse.json(evaluationResults);
  } catch (error) {
    console.error('Demo evaluation error:', error);
    return NextResponse.json(
      { error: 'Evaluation failed', details: error },
      { status: 500 }
    );
  }
}