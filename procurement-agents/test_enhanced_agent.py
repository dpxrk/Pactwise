#!/usr/bin/env python3
"""Test script for Enhanced Contract Review Agent"""

import asyncio
import sys
from pathlib import Path
from datetime import datetime

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))

from agents.legal_contract.services.enhanced_contract_agent import EnhancedContractAgent


def print_section(title: str, char: str = "="):
    """Print a formatted section header"""
    print(f"\n{char * 70}")
    print(f"{title:^70}")
    print(f"{char * 70}\n")


async def test_comprehensive_review():
    """Test comprehensive contract review"""
    print_section("ENHANCED CONTRACT REVIEW AGENT TEST", "=")

    # Initialize agent
    print("Initializing Enhanced Contract Agent...")
    agent = EnhancedContractAgent()
    print("✅ Agent initialized successfully\n")

    # Test contract path
    contract_path = Path("test_contracts/sample_software_agreement.txt")

    if not contract_path.exists():
        print(f"❌ Test contract not found at: {contract_path}")
        print("Please ensure the test contract file exists.")
        return

    print(f"📄 Contract: {contract_path.name}")
    print(f"📊 Review Type: Comprehensive")
    print(f"🕐 Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

    try:
        # Perform comprehensive review
        print("Starting comprehensive review...\n")
        start_time = datetime.now()

        report = await agent.review_contract(
            contract_file=contract_path,
            review_type="comprehensive",
            contract_metadata={
                'reviewed_by': 'test_user',
                'uploaded_filename': contract_path.name
            }
        )

        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()

        print(f"\n✅ Review completed in {duration:.2f} seconds")

        # Display summary
        print_section("CONTRACT REVIEW SUMMARY")

        summary = report['summary']
        print(f"Contract Type:        {summary.get('contract_type', 'UNKNOWN')}")
        print(f"Contract Value:       ${summary.get('contract_value', 0):,.2f} {summary.get('currency', 'USD')}")
        print(f"Term Length:          {summary.get('term_length', 'Not specified')}")

        print(f"\n📊 SCORES:")
        print(f"  Overall Risk:       {summary.get('overall_risk', 'UNKNOWN')} "
              f"({summary.get('risk_score', 0):.1f}/100)")
        print(f"  Compliance:         {summary.get('compliance_score', 0):.1f}/100")
        print(f"  Playbook Match:     {summary.get('playbook_compliance', 0):.1f}/100")

        # Parties
        parties = summary.get('parties', [])
        if parties:
            print(f"\n👥 PARTIES:")
            for i, party in enumerate(parties, 1):
                print(f"  {i}. {party.get('name', 'Unknown')} ({party.get('role', 'party')})")

        # Critical issues
        risk_assessment = report['detailed_findings']['risk_assessment']
        critical_issues = risk_assessment.get('critical_issues', [])

        if critical_issues:
            print_section(f"⚠️  CRITICAL ISSUES ({len(critical_issues)} found)", "-")
            for i, issue in enumerate(critical_issues[:5], 1):  # Show top 5
                print(f"{i}. [{issue['severity']}] {issue['type']}")
                print(f"   Category: {issue.get('category', 'GENERAL')}")
                print(f"   Issue: {issue['description']}")
                print(f"   ➜ {issue.get('recommendation', 'Review required')}\n")
        else:
            print("\n✅ No critical issues found")

        # Risk breakdown
        print_section("RISK BREAKDOWN BY CATEGORY", "-")
        print(f"Legal Risks:          {len(risk_assessment.get('legal_risks', []))} issues")
        print(f"Financial Risks:      {len(risk_assessment.get('financial_risks', []))} issues")
        print(f"Operational Risks:    {len(risk_assessment.get('operational_risks', []))} issues")
        print(f"Compliance Risks:     {len(risk_assessment.get('compliance_risks', []))} issues")
        print(f"Reputational Risks:   {len(risk_assessment.get('reputational_risks', []))} issues")

        # Compliance check
        compliance = report['detailed_findings']['compliance_check']
        if compliance.get('regulatory'):
            print_section("REGULATORY COMPLIANCE", "-")
            for check in compliance['regulatory']:
                status_icon = "✅" if check.get('compliant') else "❌"
                print(f"{status_icon} {check['framework']}: "
                      f"{'COMPLIANT' if check.get('compliant') else 'NON-COMPLIANT'} "
                      f"({check.get('score', 0):.0f}/100)")

                if not check.get('compliant') and check.get('missing_requirements'):
                    missing = check['missing_requirements'][:3]
                    print(f"   Missing: {', '.join(missing)}")

        # Playbook comparison
        playbook = report['detailed_findings']['playbook_comparison']
        if playbook.get('playbook_found'):
            print_section("PLAYBOOK COMPLIANCE", "-")
            print(f"Overall Compliance: {playbook.get('compliance_score', 0):.1f}/100")

            missing_required = playbook.get('missing_required_clauses', [])
            if missing_required:
                print(f"\n❌ Missing Required Clauses ({len(missing_required)}):")
                for clause in missing_required[:3]:
                    print(f"   • {clause['clause_type']}: {clause['description']}")

            prohibited = playbook.get('prohibited_clauses_found', [])
            if prohibited:
                print(f"\n⛔ Prohibited Clauses Found ({len(prohibited)}):")
                for clause in prohibited:
                    print(f"   • {clause['clause_type']}: {clause['reason']}")

        # Recommendations
        recommendations = report.get('recommendations', [])
        if recommendations:
            print_section("TOP RECOMMENDATIONS", "-")
            for i, rec in enumerate(recommendations[:5], 1):
                priority_emoji = {
                    'CRITICAL': '🔴',
                    'HIGH': '🟠',
                    'MEDIUM': '🟡',
                    'LOW': '🟢'
                }.get(rec.get('priority', 'LOW'), '⚪')

                print(f"{i}. {priority_emoji} [{rec.get('priority', 'LOW')}] {rec.get('action', '')}")
                print(f"   {rec.get('details', '')}")

                next_steps = rec.get('next_steps', [])
                if next_steps and isinstance(next_steps, list):
                    print(f"   Next Steps:")
                    for step in next_steps[:2]:
                        print(f"     - {step}")
                print()

        # Redlines
        redlines = report.get('redlines', [])
        if redlines:
            print_section(f"SUGGESTED REDLINES ({len(redlines)} changes)", "-")

            redline_types = {}
            for redline in redlines:
                rtype = redline.get('type', 'OTHER')
                redline_types[rtype] = redline_types.get(rtype, 0) + 1

            print("Summary:")
            for rtype, count in redline_types.items():
                print(f"  • {rtype}: {count}")

            print(f"\nTop 3 Priority Changes:")
            for i, redline in enumerate(redlines[:3], 1):
                print(f"\n{i}. [{redline.get('type')}] Priority: {redline.get('priority')}")
                print(f"   Reason: {redline.get('reason', '')}")

                if redline.get('type') == 'MODIFICATION':
                    orig = redline.get('original_text', '')[:80]
                    sugg = redline.get('suggested_text', '')[:80]
                    print(f"   Original: {orig}...")
                    print(f"   Suggested: {sugg}...")
                elif redline.get('type') == 'ADDITION':
                    sugg = redline.get('suggested_text', '')[:80]
                    print(f"   Add: {sugg}...")

        # Clause analysis
        clauses = report['detailed_findings'].get('clause_analysis', {})
        if clauses:
            print_section("CLAUSE ANALYSIS", "-")
            print(f"Total Clauses Identified: {clauses.get('total_clauses', 0)}")

            by_category = clauses.get('by_category', {})
            if by_category:
                print("\nBy Category:")
                for category, count in sorted(by_category.items(), key=lambda x: x[1], reverse=True)[:5]:
                    print(f"  • {category}: {count}")

        # Next steps
        next_steps = report.get('next_steps', [])
        if next_steps:
            print_section("RECOMMENDED NEXT STEPS", "-")
            for step in next_steps:
                print(f"  {step}")

        # Save report
        import json
        report_file = Path(f"test_contracts/review_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2, default=str)

        print_section("REPORT SAVED", "-")
        print(f"📁 Full report saved to: {report_file}")

        # Final summary
        print_section("TEST SUMMARY", "=")
        print(f"✅ Test completed successfully")
        print(f"⏱️  Duration: {duration:.2f} seconds")
        print(f"📊 Overall Risk: {summary.get('overall_risk')}")
        print(f"🎯 Critical Issues: {len(critical_issues)}")
        print(f"📋 Recommendations: {len(recommendations)}")
        print(f"✏️  Redlines: {len(redlines)}")

        # Risk rating
        risk_level = summary.get('overall_risk', 'UNKNOWN')
        if risk_level == 'CRITICAL':
            print(f"\n🔴 ACTION REQUIRED: DO NOT SIGN - Legal review mandatory")
        elif risk_level == 'HIGH':
            print(f"\n🟠 ACTION REQUIRED: Legal review strongly recommended")
        elif risk_level == 'MEDIUM':
            print(f"\n🟡 CAUTION: Review highlighted issues before proceeding")
        else:
            print(f"\n🟢 PROCEED: Low risk, standard approvals apply")

        print()

        return report

    except Exception as e:
        print(f"\n❌ Error during review: {str(e)}")
        import traceback
        traceback.print_exc()
        return None


async def test_quick_checks():
    """Test individual service components"""
    print_section("QUICK COMPONENT TESTS", "=")

    agent = EnhancedContractAgent()
    contract_path = Path("test_contracts/sample_software_agreement.txt")

    if not contract_path.exists():
        print(f"❌ Test contract not found")
        return

    print("Testing individual components...\n")

    try:
        # Test ingestion
        print("1. Testing document ingestion...")
        contract_data = await agent.review_service.ingest_contract(contract_path)
        print(f"   ✅ Ingested {len(contract_data['raw_text'])} characters")
        print(f"   ✅ Found {len(contract_data['sections'])} sections")

        # Test metadata extraction
        print("\n2. Testing metadata extraction...")
        extracted = await agent.review_service.extract_contract_data(contract_data)
        metadata = extracted['metadata']
        print(f"   ✅ Contract Type: {metadata.get('contract_type')}")
        print(f"   ✅ Parties: {len(metadata.get('parties', []))}")
        print(f"   ✅ Value: ${metadata.get('contract_value', 0):,.2f}")

        # Test clause extraction
        print("\n3. Testing clause extraction...")
        clauses = await agent.review_service.extract_and_categorize_clauses(contract_data)
        print(f"   ✅ Extracted {len(clauses)} clauses")

        categories = {}
        for clause in clauses:
            cat = clause.get('category', 'OTHER')
            categories[cat] = categories.get(cat, 0) + 1

        print(f"   ✅ Categories: {len(categories)}")
        for cat, count in list(categories.items())[:5]:
            print(f"      • {cat}: {count}")

        print("\n✅ All component tests passed!")

    except Exception as e:
        print(f"\n❌ Component test failed: {str(e)}")
        import traceback
        traceback.print_exc()


async def main():
    """Main test runner"""
    print("\n" + "="*70)
    print("ENHANCED CONTRACT REVIEW AGENT - TEST SUITE".center(70))
    print("="*70)
    print(f"\nTest Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

    # Run component tests first
    await test_quick_checks()

    # Run comprehensive review
    await test_comprehensive_review()

    print("\n" + "="*70)
    print("ALL TESTS COMPLETED".center(70))
    print("="*70 + "\n")


if __name__ == "__main__":
    asyncio.run(main())
