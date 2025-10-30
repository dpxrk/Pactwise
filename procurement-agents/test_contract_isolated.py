#!/usr/bin/env python3
"""Isolated test for contract review - no database dependencies"""

import asyncio
import re
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any

# Mock simple NLP if spacy not available
try:
    import spacy
    nlp = spacy.load("en_core_web_sm")
    print("✅ spaCy loaded successfully\n")
except:
    nlp = None
    print("⚠️  spaCy not available, using basic text analysis\n")


async def simple_contract_review(contract_path: Path) -> Dict[str, Any]:
    """Simple standalone contract review"""

    print(f"📄 Analyzing: {contract_path.name}\n")

    # Read contract
    with open(contract_path, 'r') as f:
        text = f.read()

    print(f"✅ Loaded {len(text)} characters\n")

    # Extract basic information
    print("="*60)
    print("BASIC CONTRACT ANALYSIS")
    print("="*60 + "\n")

    # Extract parties
    parties = []
    party_pattern = r'([A-Z][A-Za-z\s]+(?:Corporation|Inc\.|LLC))'
    potential_parties = re.findall(party_pattern, text)
    if potential_parties:
        parties = list(set(potential_parties[:4]))  # Top 4 unique
        print(f"Parties Identified ({len(parties)}):")
        for party in parties:
            print(f"  • {party}")
        print()

    # Extract dates
    date_pattern = r'(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}'
    dates = re.findall(date_pattern, text)
    if dates:
        print(f"Key Dates Found:")
        for date in list(set(dates))[:3]:
            print(f"  • {date}")
        print()

    # Extract monetary values
    money_pattern = r'\$\s*([\d,]+(?:\.\d{2})?)'
    amounts = re.findall(money_pattern, text)
    if amounts:
        amounts_clean = [float(a.replace(',', '')) for a in amounts]
        print(f"Monetary Values:")
        for amt in sorted(set(amounts_clean), reverse=True)[:5]:
            print(f"  • ${amt:,.2f}")
        print()

    # Identify sections
    print("="*60)
    print("CONTRACT SECTIONS")
    print("="*60 + "\n")

    section_pattern = r'^\s*(\d+\.)\s+([A-Z][A-Z\s]+)\s*$'
    sections = []
    for line in text.split('\n'):
        match = re.match(section_pattern, line.strip())
        if match:
            sections.append(f"{match.group(1)} {match.group(2)}")

    if sections:
        print(f"Sections Found ({len(sections)}):")
        for section in sections:
            print(f"  {section}")
        print()

    # Risk indicators
    print("="*60)
    print("RISK INDICATORS")
    print("="*60 + "\n")

    risk_indicators = {
        'High Advance Payment': [r'80%.*upfront', r'75%.*upon execution', r'advance'],
        'Extended Payment Terms': [r'net\s+90', r'ninety.*days'],
        'Auto-Renewal': [r'automatically renew', r'auto.*renew'],
        'One-Sided Termination': [r'vendor may terminate immediately', r'terminate.*without cause'],
        'Limited Liability': [r'liability.*limited to', r'shall not exceed'],
        'One-Sided Indemnification': [r'customer shall indemnify.*vendor'],
        'No Termination Rights': [r'only for.*breach'],
        'Short Warranty Period': [r'thirty.*days', r'30.*day.*warranty'],
    }

    risks_found = []
    text_lower = text.lower()

    for risk_name, patterns in risk_indicators.items():
        for pattern in patterns:
            if re.search(pattern, text_lower):
                risks_found.append(risk_name)
                break

    if risks_found:
        print(f"⚠️  Risks Detected ({len(risks_found)}):")
        for risk in risks_found:
            print(f"  • {risk}")
        print()
    else:
        print("✅ No major risks detected\n")

    # Protection indicators
    protection_indicators = {
        'Mutual Indemnification': [r'each party.*indemnif', r'mutual.*indemnif'],
        'Liability Cap': [r'liability.*cap', r'limited to'],
        'Termination Rights': [r'either party.*terminate'],
        'Data Protection': [r'data protection', r'gdpr', r'privacy'],
        'Insurance Requirements': [r'insurance'],
        'Force Majeure': [r'force majeure'],
    }

    protections_found = []
    for protection_name, patterns in protection_indicators.items():
        for pattern in patterns:
            if re.search(pattern, text_lower):
                protections_found.append(protection_name)
                break

    if protections_found:
        print(f"✅ Protections Found ({len(protections_found)}):")
        for protection in protections_found:
            print(f"  • {protection}")
        print()

    # Missing key clauses
    print("="*60)
    print("KEY CLAUSE CHECK")
    print("="*60 + "\n")

    key_clauses = {
        'Service Level Agreement (SLA)': [r'service level', r'sla', r'uptime'],
        'Data Protection': [r'data protection', r'gdpr', r'personal data'],
        'Audit Rights': [r'audit', r'right to audit'],
        'Confidentiality': [r'confidential', r'non-disclosure'],
        'Intellectual Property': [r'intellectual property', r'ip rights'],
    }

    missing_clauses = []
    for clause_name, patterns in key_clauses.items():
        found = any(re.search(pattern, text_lower) for pattern in patterns)
        if found:
            print(f"✅ {clause_name}: Present")
        else:
            print(f"❌ {clause_name}: MISSING")
            missing_clauses.append(clause_name)

    print()

    # Calculate simple risk score
    risk_score = 0
    risk_score += len(risks_found) * 15  # Each risk adds 15 points
    risk_score -= len(protections_found) * 5  # Each protection reduces 5 points
    risk_score += len(missing_clauses) * 10  # Each missing clause adds 10 points
    risk_score = max(0, min(100, risk_score))  # Clamp to 0-100

    # Determine risk level
    if risk_score >= 75:
        risk_level = "CRITICAL"
        recommendation = "🔴 DO NOT SIGN - Immediate legal review required"
    elif risk_score >= 50:
        risk_level = "HIGH"
        recommendation = "🟠 CAUTION - Legal review strongly recommended"
    elif risk_score >= 25:
        risk_level = "MEDIUM"
        recommendation = "🟡 REVIEW - Address highlighted issues"
    else:
        risk_level = "LOW"
        recommendation = "🟢 ACCEPTABLE - Standard approvals apply"

    # Final summary
    print("="*60)
    print("SUMMARY")
    print("="*60 + "\n")

    print(f"Contract Value:     ${max(amounts_clean) if amounts_clean else 0:,.2f}")
    print(f"Sections:           {len(sections)}")
    print(f"Risk Score:         {risk_score}/100")
    print(f"Risk Level:         {risk_level}")
    print(f"Risks Found:        {len(risks_found)}")
    print(f"Protections:        {len(protections_found)}")
    print(f"Missing Clauses:    {len(missing_clauses)}")
    print()
    print(f"RECOMMENDATION:     {recommendation}")
    print()

    # Detailed recommendations
    if risks_found or missing_clauses:
        print("="*60)
        print("RECOMMENDED ACTIONS")
        print("="*60 + "\n")

        if 'High Advance Payment' in risks_found:
            print("1. Negotiate lower advance payment (max 25-30%)")
        if 'Auto-Renewal' in risks_found:
            print("2. Add non-renewal notice period (90 days minimum)")
        if 'One-Sided Termination' in risks_found:
            print("3. Negotiate mutual termination rights")
        if 'Limited Liability' in risks_found:
            print("4. Review and negotiate liability cap amount")
        if 'Service Level Agreement (SLA)' in missing_clauses:
            print("5. Add SLA with uptime guarantees and remedies")
        if 'Data Protection' in missing_clauses:
            print("6. Add GDPR-compliant data protection clause")

        print()

    return {
        'risk_score': risk_score,
        'risk_level': risk_level,
        'risks_found': risks_found,
        'protections_found': protections_found,
        'missing_clauses': missing_clauses,
        'parties': parties,
        'amounts': amounts_clean if amounts_clean else []
    }


async def main():
    print("\n" + "="*60)
    print("ISOLATED CONTRACT REVIEW TEST")
    print("="*60 + "\n")

    contract_path = Path("test_contracts/sample_software_agreement.txt")

    if not contract_path.exists():
        print(f"❌ Test contract not found: {contract_path}")
        print("Creating test contracts directory...")
        contract_path.parent.mkdir(exist_ok=True)
        print(f"Please place a contract file at: {contract_path}")
        return

    start_time = datetime.now()

    result = await simple_contract_review(contract_path)

    end_time = datetime.now()
    duration = (end_time - start_time).total_seconds()

    print("="*60)
    print(f"Analysis completed in {duration:.2f} seconds")
    print("="*60 + "\n")

    # Save result
    import json
    report_file = Path(f"test_contracts/simple_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
    with open(report_file, 'w') as f:
        json.dump(result, f, indent=2, default=str)

    print(f"📁 Report saved to: {report_file}\n")

    print("✅ Test completed successfully!\n")


if __name__ == "__main__":
    asyncio.run(main())
