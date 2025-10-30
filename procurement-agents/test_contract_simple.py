#!/usr/bin/env python3
"""Simple standalone test for Enhanced Contract Review Services"""

import asyncio
import sys
from pathlib import Path
from datetime import datetime

# Direct imports without base agent
sys.path.insert(0, str(Path(__file__).parent))

# Import only the services we need
from agents.legal_contract.services.comprehensive_review_service import ComprehensiveReviewService
from agents.legal_contract.services.risk_assessment_service import RiskAssessmentService
from agents.legal_contract.services.compliance_service import ComplianceService
from agents.legal_contract.services.playbook_service import PlaybookService


async def test_contract_review():
    """Test the contract review services"""
    print("\n" + "="*70)
    print("ENHANCED CONTRACT REVIEW - STANDALONE TEST".center(70))
    print("="*70 + "\n")

    # Initialize services
    print("Initializing services...")
    review_service = ComprehensiveReviewService()
    risk_service = RiskAssessmentService()
    compliance_service = ComplianceService()
    playbook_service = PlaybookService()
    print("✅ All services initialized\n")

    # Test contract
    contract_path = Path("test_contracts/sample_software_agreement.txt")

    if not contract_path.exists():
        print(f"❌ Test contract not found at: {contract_path}")
        return

    print(f"📄 Contract: {contract_path.name}\n")

    try:
        # Step 1: Ingest contract
        print("Step 1: Ingesting contract...")
        start_time = datetime.now()
        contract_data = await review_service.ingest_contract(contract_path)
        print(f"✅ Ingested {len(contract_data['raw_text'])} characters")
        print(f"✅ Found {len(contract_data['sections'])} sections\n")

        # Step 2: Extract metadata
        print("Step 2: Extracting metadata...")
        extracted_data = await review_service.extract_contract_data(contract_data)
        metadata = extracted_data['metadata']
        print(f"✅ Contract Type: {metadata.get('contract_type', 'UNKNOWN')}")
        print(f"✅ Parties: {len(metadata.get('parties', []))}")
        if metadata.get('contract_value'):
            print(f"✅ Value: ${metadata.get('contract_value'):,.2f} {metadata.get('currency', 'USD')}")
        print()

        # Step 3: Extract clauses
        print("Step 3: Extracting and categorizing clauses...")
        clauses = await review_service.extract_and_categorize_clauses(contract_data)
        print(f"✅ Extracted {len(clauses)} clauses")

        # Count by category
        categories = {}
        for clause in clauses:
            cat = str(clause.get('category', 'OTHER'))
            categories[cat] = categories.get(cat, 0) + 1

        print(f"✅ Categories found: {len(categories)}")
        for cat, count in sorted(categories.items(), key=lambda x: x[1], reverse=True)[:5]:
            print(f"   • {cat}: {count}")
        print()

        # Step 4: Risk assessment
        print("Step 4: Assessing risks...")
        risk_assessment = await risk_service.assess_risks(
            contract_data,
            extracted_data,
            clauses
        )

        print(f"✅ Overall Risk: {risk_assessment['overall_risk']}")
        print(f"✅ Risk Score: {risk_assessment['risk_score']:.1f}/100")
        print(f"✅ Critical Issues: {len(risk_assessment['critical_issues'])}")
        print(f"   - Legal: {len(risk_assessment['legal_risks'])}")
        print(f"   - Financial: {len(risk_assessment['financial_risks'])}")
        print(f"   - Operational: {len(risk_assessment['operational_risks'])}")
        print(f"   - Compliance: {len(risk_assessment['compliance_risks'])}")
        print()

        # Step 5: Compliance check
        print("Step 5: Checking compliance...")
        compliance_check = await compliance_service.check_compliance(
            contract_data,
            extracted_data,
            clauses
        )

        print(f"✅ Overall Compliant: {compliance_check['overall_compliant']}")
        print(f"✅ Compliance Score: {compliance_check['compliance_score']:.1f}/100")

        if compliance_check.get('regulatory'):
            print(f"✅ Frameworks checked: {len(compliance_check['regulatory'])}")
            for check in compliance_check['regulatory']:
                status = "✅" if check.get('compliant') else "❌"
                print(f"   {status} {check['framework']}: {check.get('score', 0):.0f}/100")
        print()

        # Step 6: Playbook comparison
        print("Step 6: Comparing to playbook...")
        playbook_comparison = await playbook_service.compare_to_playbook(
            extracted_data,
            clauses
        )

        if playbook_comparison.get('playbook_found'):
            print(f"✅ Playbook found for: {playbook_comparison['contract_type']}")
            print(f"✅ Compliance Score: {playbook_comparison['compliance_score']:.1f}/100")
            print(f"   - Missing Required: {len(playbook_comparison.get('missing_required_clauses', []))}")
            print(f"   - Missing Preferred: {len(playbook_comparison.get('missing_preferred_clauses', []))}")
            print(f"   - Prohibited Found: {len(playbook_comparison.get('prohibited_clauses_found', []))}")
        else:
            print("ℹ️  No playbook found for this contract type")
        print()

        # Display critical issues
        if risk_assessment['critical_issues']:
            print("\n" + "="*70)
            print(f"⚠️  CRITICAL ISSUES ({len(risk_assessment['critical_issues'])} found)".center(70))
            print("="*70 + "\n")

            for i, issue in enumerate(risk_assessment['critical_issues'][:5], 1):
                print(f"{i}. [{issue['severity']}] {issue['type']}")
                print(f"   Category: {issue.get('category', 'GENERAL')}")
                print(f"   Issue: {issue['description']}")
                print(f"   ➜ Recommendation: {issue.get('recommendation', 'Review required')}\n")

        # Display playbook issues
        if playbook_comparison.get('missing_required_clauses'):
            print("\n" + "="*70)
            print("❌ MISSING REQUIRED CLAUSES".center(70))
            print("="*70 + "\n")

            for clause in playbook_comparison['missing_required_clauses'][:3]:
                print(f"• {clause['clause_type']}")
                print(f"  {clause['description']}\n")

        # Final summary
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()

        print("\n" + "="*70)
        print("TEST SUMMARY".center(70))
        print("="*70 + "\n")

        print(f"✅ Test completed successfully")
        print(f"⏱️  Duration: {duration:.2f} seconds")
        print(f"📊 Overall Risk: {risk_assessment['overall_risk']}")
        print(f"📈 Risk Score: {risk_assessment['risk_score']:.1f}/100")
        print(f"📋 Critical Issues: {len(risk_assessment['critical_issues'])}")
        print(f"✓ Compliance: {'PASS' if compliance_check['overall_compliant'] else 'FAIL'}")

        if playbook_comparison.get('playbook_found'):
            print(f"📖 Playbook Match: {playbook_comparison['compliance_score']:.1f}/100")

        # Risk rating
        risk_level = risk_assessment['overall_risk']
        print()
        if risk_level == 'CRITICAL':
            print("🔴 RECOMMENDATION: DO NOT SIGN - Legal review mandatory")
        elif risk_level == 'HIGH':
            print("🟠 RECOMMENDATION: Legal review strongly recommended")
        elif risk_level == 'MEDIUM':
            print("🟡 RECOMMENDATION: Review highlighted issues before proceeding")
        else:
            print("🟢 RECOMMENDATION: Low risk, standard approvals apply")

        print("\n" + "="*70 + "\n")

        return {
            'contract_data': contract_data,
            'extracted_data': extracted_data,
            'clauses': clauses,
            'risk_assessment': risk_assessment,
            'compliance_check': compliance_check,
            'playbook_comparison': playbook_comparison
        }

    except Exception as e:
        print(f"\n❌ Error during test: {str(e)}")
        import traceback
        traceback.print_exc()
        return None


async def main():
    """Main test runner"""
    result = await test_contract_review()

    if result:
        print("✅ All tests passed successfully!\n")
        return 0
    else:
        print("❌ Tests failed\n")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
