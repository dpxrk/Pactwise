# Contract Playbooks

## Overview

Contract playbooks define your organization's standard requirements and preferred terms for different types of contracts. The Enhanced Contract Review Agent uses these playbooks to:

1. Check if contracts contain required clauses
2. Identify missing preferred clauses
3. Flag prohibited terms
4. Validate financial terms against limits
5. Generate compliance scores

## Playbook Structure

Each playbook is a JSON file with the following structure:

```json
{
  "contract_type": "SOFTWARE",
  "description": "Description of when to use this playbook",
  "version": "1.0",
  "last_updated": "2025-01-15",
  "requirements": [
    {
      "clause_type": "LICENSE_GRANT",
      "type": "REQUIRED|PREFERRED|PROHIBITED",
      "severity": "CRITICAL|HIGH|MEDIUM|LOW",
      "description": "What this clause should cover",
      "preferred_language": "Template language to suggest",
      "key_points": ["Point 1", "Point 2"]
    }
  ],
  "financial_limits": {
    "max_advance_payment_percent": 25,
    "preferred_payment_terms": "Net 30",
    "max_annual_increase_percent": 5
  },
  "term_requirements": {
    "max_initial_term_years": 3,
    "min_termination_notice_days": 90
  }
}
```

## Available Playbooks

### 1. **software_saas_playbook.json**
- **Use For**: Software licenses, SaaS subscriptions, cloud services
- **Key Requirements**:
  - Service Level Agreements (SLA)
  - Data protection and GDPR compliance
  - Security certifications (SOC 2)
  - Data export rights
  - IP ownership clarity

### 2. **services_playbook.json**
- **Use For**: Professional services, consulting, implementation projects
- **Key Requirements**:
  - Detailed scope of work
  - Work product ownership
  - Milestone-based payments
  - Change order process
  - Quality warranties

### 3. **msa_playbook.json** (Coming soon)
- **Use For**: Master Service Agreements
- **Key Requirements**:
  - Framework for future SOWs
  - General terms and conditions
  - Insurance requirements
  - Audit rights

### 4. **purchase_playbook.json** (Coming soon)
- **Use For**: Purchase orders, product procurement
- **Key Requirements**:
  - Product warranties
  - Delivery terms
  - Inspection and acceptance
  - Returns and refunds

## Customization Guide

### Step 1: Copy Template
```bash
cp software_saas_playbook.json my_custom_playbook.json
```

### Step 2: Update Contract Type
```json
{
  "contract_type": "MY_CUSTOM_TYPE",
  "description": "Your description"
}
```

### Step 3: Define Requirements

#### Required Clauses
Clauses that MUST be present in the contract:
```json
{
  "clause_type": "DATA_PROTECTION",
  "type": "REQUIRED",
  "severity": "CRITICAL",
  "description": "GDPR compliance is mandatory",
  "preferred_language": "Your template language here..."
}
```

#### Preferred Clauses
Clauses that SHOULD be present (best practice):
```json
{
  "clause_type": "AUDIT_RIGHTS",
  "type": "PREFERRED",
  "severity": "MEDIUM",
  "description": "Ability to audit vendor",
  "preferred_language": "Template language..."
}
```

#### Prohibited Clauses
Terms that are NOT ACCEPTABLE:
```json
{
  "clause_type": "AUTO_RENEWAL",
  "type": "PROHIBITED",
  "severity": "CRITICAL",
  "description": "Auto-renewal without adequate notice",
  "preferred_language": null
}
```

### Step 4: Set Financial Limits
```json
"financial_limits": {
  "max_advance_payment_percent": 25,  // Maximum upfront payment
  "preferred_payment_terms": "Net 30",  // Ideal payment terms
  "max_payment_terms_days": 60,  // Maximum acceptable
  "max_annual_increase_percent": 5,  // Price increase limit
  "max_late_fee_percent": 1.5  // Late payment interest cap
}
```

### Step 5: Define Term Requirements
```json
"term_requirements": {
  "max_initial_term_years": 3,  // Maximum initial contract term
  "max_auto_renewal_years": 1,  // Maximum renewal period
  "min_termination_notice_days": 90,  // Minimum notice to terminate
  "min_non_renewal_notice_days": 90  // Notice to prevent renewal
}
```

## Using Playbooks

### Automatic Selection
The agent automatically selects the appropriate playbook based on contract type:

```python
# Agent automatically detects contract type
report = await agent.review_contract(contract_file)

# Playbook comparison in report
playbook_comparison = report['detailed_findings']['playbook_comparison']
```

### Manual Override
Specify a playbook manually:

```python
report = await agent.review_contract(
    contract_file,
    contract_metadata={'contract_type': 'SOFTWARE'}
)
```

### API Usage
```bash
curl -X POST http://localhost:8000/api/v1/contracts/analyze/playbook \
  -F "file=@contract.pdf" \
  -F "contract_type=SOFTWARE"
```

## Compliance Scoring

The agent calculates a compliance score based on:

1. **Required Clauses**: 100% weight
   - Missing required = significant penalty
   - Present = full credit

2. **Preferred Clauses**: 50% weight
   - Missing preferred = moderate penalty
   - Present = bonus credit

3. **Prohibited Clauses**: Immediate failure
   - Any prohibited clause found = critical issue flagged

**Example Scoring**:
- 10 required clauses: 8 present = 80% base score
- 5 preferred clauses: 3 present = +6% bonus
- 0 prohibited clauses found = no penalty
- **Final Score: 86/100**

## Best Practices

### 1. Start with Templates
Use provided playbooks as starting points and customize for your organization.

### 2. Version Control
- Update `version` and `last_updated` when making changes
- Keep old versions for historical contracts
- Document changes in commit messages

### 3. Legal Review
Have your legal team review playbooks before deployment:
- Ensure compliance with company policy
- Verify legal accuracy of preferred language
- Confirm financial limits align with procurement policy

### 4. Regular Updates
- Review playbooks quarterly
- Update based on lessons learned
- Incorporate feedback from legal and procurement teams

### 5. Industry-Specific Playbooks
Create specialized playbooks for:
- Industry-specific regulations (healthcare, finance)
- Geographic requirements (EU, California)
- Risk levels (high-value, strategic vendors)

## Examples

### Example 1: High-Risk Software Contract
```json
{
  "contract_type": "CRITICAL_SOFTWARE",
  "requirements": [
    {
      "clause_type": "BUSINESS_CONTINUITY",
      "type": "REQUIRED",
      "severity": "CRITICAL",
      "description": "Disaster recovery and backup procedures"
    },
    {
      "clause_type": "ESCROW",
      "type": "REQUIRED",
      "severity": "HIGH",
      "description": "Source code escrow for business continuity"
    }
  ],
  "financial_limits": {
    "max_advance_payment_percent": 10  // Stricter for high-risk
  }
}
```

### Example 2: Low-Risk Services
```json
{
  "contract_type": "LOW_RISK_SERVICES",
  "requirements": [
    // Fewer requirements for low-risk contracts
  ],
  "financial_limits": {
    "max_advance_payment_percent": 50  // More flexible
  }
}
```

## Troubleshooting

### Playbook Not Found
**Issue**: "No playbook found for contract type"
**Solution**:
1. Check contract type detection
2. Create playbook for that type
3. Or manually specify contract_type

### Low Compliance Score
**Issue**: Contract scores poorly against playbook
**Solution**:
1. Review missing clauses
2. Negotiate with vendor
3. Request legal exception if necessary

### Too Strict Playbook
**Issue**: No contracts pass playbook requirements
**Solution**:
1. Review if requirements are realistic
2. Move some REQUIRED to PREFERRED
3. Adjust financial limits
4. Consider risk-based playbooks

## API Reference

### Load Custom Playbook
```python
from agents.legal_contract.services.playbook_service import PlaybookService

playbook_service = PlaybookService(playbook_dir=Path("./my_playbooks"))
```

### Get Playbook List
```bash
curl http://localhost:8000/api/v1/contracts/playbooks
```

### Validate Playbook
```bash
curl -X POST http://localhost:8000/api/v1/contracts/playbooks/validate \
  -F "playbook=@my_playbook.json"
```

## Support

For questions or issues:
- GitHub Issues: [link]
- Email: legal-tech@company.com
- Slack: #contract-playbooks

## Contributing

To contribute a new playbook:
1. Create playbook based on template
2. Test with sample contracts
3. Document use cases
4. Submit for legal review
5. Create pull request

---

**Version**: 1.0
**Last Updated**: 2025-01-15
**Maintained by**: Legal & Procurement Teams
