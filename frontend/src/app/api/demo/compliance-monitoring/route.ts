import { NextRequest, NextResponse } from 'next/server';

// Mock compliance monitoring for demo purposes
export async function POST(request: NextRequest) {
  try {
    const { contractId: _contractId, checkType: _checkType } = await request.json();

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Return mock compliance results
    const complianceResults = {
      success: true,
      monitoring: {
        overallStatus: "Compliant with Warnings",
        score: 87,
        lastChecked: new Date().toISOString(),
        nextReview: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        
        complianceAreas: [
          {
            category: "Data Protection",
            status: "compliant",
            score: 95,
            items: [
              { name: "GDPR Compliance", status: "pass", lastAudit: "2024-01-15" },
              { name: "Data Encryption", status: "pass", lastAudit: "2024-01-15" },
              { name: "Access Controls", status: "pass", lastAudit: "2024-01-15" }
            ]
          },
          {
            category: "Security Standards",
            status: "compliant",
            score: 90,
            items: [
              { name: "SOC 2 Type II", status: "pass", lastAudit: "2023-12-01" },
              { name: "ISO 27001", status: "pass", lastAudit: "2023-11-15" },
              { name: "Penetration Testing", status: "pass", lastAudit: "2024-01-10" }
            ]
          },
          {
            category: "Insurance Requirements",
            status: "warning",
            score: 75,
            items: [
              { name: "General Liability", status: "pass", expires: "2024-12-31" },
              { name: "Professional Liability", status: "warning", expires: "2024-03-15" },
              { name: "Cyber Insurance", status: "pass", expires: "2024-08-30" }
            ]
          },
          {
            category: "Performance Metrics",
            status: "compliant",
            score: 88,
            items: [
              { name: "SLA Compliance", status: "pass", value: "99.8%" },
              { name: "Response Time", status: "pass", value: "2.3 hours avg" },
              { name: "Resolution Rate", status: "pass", value: "94%" }
            ]
          }
        ],
        
        alerts: [
          {
            severity: "warning",
            title: "Professional Liability Insurance Expiring",
            description: "Insurance expires in 45 days. Request renewal documentation.",
            dueDate: "2024-03-15"
          },
          {
            severity: "info",
            title: "Annual Security Audit Due",
            description: "Schedule annual security review for Q2 2024",
            dueDate: "2024-06-30"
          }
        ],
        
        timeline: [
          { date: "2024-01-15", event: "GDPR audit completed", status: "completed" },
          { date: "2024-02-01", event: "Quarterly performance review", status: "scheduled" },
          { date: "2024-03-15", event: "Insurance renewal due", status: "pending" },
          { date: "2024-06-30", event: "Annual security audit", status: "planned" }
        ],
        
        recommendations: [
          "Request updated insurance certificates before expiration",
          "Schedule Q2 security audit with vendor",
          "Review and update data processing agreements",
          "Conduct quarterly performance reviews"
        ],
        
        benchmarks: {
          industry: {
            average: 82,
            top10: 92,
            yourScore: 87
          },
          trend: "improving",
          percentile: 75
        }
      }
    };

    return NextResponse.json(complianceResults);
  } catch (error) {
    console.error('Demo compliance error:', error);
    return NextResponse.json(
      { error: 'Compliance monitoring failed', details: error },
      { status: 500 }
    );
  }
}