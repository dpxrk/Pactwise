"""
Regulation tracking and management system.
"""

import logging
from typing import List, Dict, Any, Optional, Set
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum
import json
import re

logger = logging.getLogger(__name__)


class RegulationType(Enum):
    """Types of regulations."""
    DATA_PRIVACY = "data_privacy"
    FINANCIAL = "financial"
    HEALTHCARE = "healthcare"
    ENVIRONMENTAL = "environmental"
    LABOR = "labor"
    CONSUMER_PROTECTION = "consumer_protection"
    CYBERSECURITY = "cybersecurity"
    ANTI_CORRUPTION = "anti_corruption"
    TRADE = "trade"
    INTELLECTUAL_PROPERTY = "intellectual_property"


@dataclass
class Regulation:
    """Regulation information."""
    id: str
    name: str
    acronym: str
    type: RegulationType
    jurisdiction: List[str]
    industries: List[str]
    effective_date: datetime
    last_updated: datetime
    requirements: List[Dict[str, Any]]
    penalties: Dict[str, Any]
    keywords: List[str]


class RegulationTracker:
    """
    Track and manage regulatory requirements.
    """
    
    def __init__(self):
        """Initialize regulation tracker."""
        self.regulations_db = {}
        self.jurisdiction_map = {}
        self.industry_map = {}
        self.update_cache = {}
        
    async def initialize(self):
        """Initialize regulation database."""
        # Load core regulations
        self.regulations_db = self._load_core_regulations()
        
        # Build indices
        self._build_indices()
        
        logger.info(f"Loaded {len(self.regulations_db)} regulations")
    
    def _load_core_regulations(self) -> Dict[str, Regulation]:
        """Load core regulation definitions."""
        regulations = {}
        
        # GDPR
        regulations["GDPR"] = Regulation(
            id="gdpr_2016_679",
            name="General Data Protection Regulation",
            acronym="GDPR",
            type=RegulationType.DATA_PRIVACY,
            jurisdiction=["EU", "EEA"],
            industries=["all"],
            effective_date=datetime(2018, 5, 25),
            last_updated=datetime(2024, 1, 1),
            requirements=[
                {
                    "id": "gdpr_lawful_basis",
                    "title": "Lawful Basis for Processing",
                    "description": "Must have lawful basis for processing personal data",
                    "article": "Article 6",
                    "mandatory": True,
                    "check_patterns": [
                        r"lawful basis",
                        r"legal grounds?",
                        r"consent",
                        r"legitimate interests?"
                    ]
                },
                {
                    "id": "gdpr_data_subject_rights",
                    "title": "Data Subject Rights",
                    "description": "Must respect data subject rights",
                    "article": "Articles 15-22",
                    "mandatory": True,
                    "check_patterns": [
                        r"data subject rights?",
                        r"right to access",
                        r"right to erasure",
                        r"right to portability"
                    ]
                },
                {
                    "id": "gdpr_breach_notification",
                    "title": "Breach Notification",
                    "description": "72-hour breach notification requirement",
                    "article": "Articles 33-34",
                    "mandatory": True,
                    "check_patterns": [
                        r"breach notification",
                        r"72 hours?",
                        r"data breach"
                    ]
                },
                {
                    "id": "gdpr_dpo",
                    "title": "Data Protection Officer",
                    "description": "DPO designation when required",
                    "article": "Articles 37-39",
                    "mandatory": False,
                    "check_patterns": [
                        r"data protection officer",
                        r"DPO"
                    ]
                },
                {
                    "id": "gdpr_privacy_by_design",
                    "title": "Privacy by Design",
                    "description": "Privacy by design and default",
                    "article": "Article 25",
                    "mandatory": True,
                    "check_patterns": [
                        r"privacy by design",
                        r"data protection by design",
                        r"privacy by default"
                    ]
                }
            ],
            penalties={
                "max_fine": "€20 million or 4% of global turnover",
                "enforcement": "Data Protection Authorities",
                "severity": "high"
            },
            keywords=["personal data", "privacy", "data protection", "controller", "processor"]
        )
        
        # CCPA
        regulations["CCPA"] = Regulation(
            id="ccpa_2018",
            name="California Consumer Privacy Act",
            acronym="CCPA",
            type=RegulationType.DATA_PRIVACY,
            jurisdiction=["US-CA"],
            industries=["all"],
            effective_date=datetime(2020, 1, 1),
            last_updated=datetime(2023, 1, 1),
            requirements=[
                {
                    "id": "ccpa_opt_out",
                    "title": "Right to Opt-Out",
                    "description": "Right to opt-out of sale of personal information",
                    "section": "1798.120",
                    "mandatory": True,
                    "check_patterns": [
                        r"opt[- ]?out",
                        r"do not sell",
                        r"sale of personal information"
                    ]
                },
                {
                    "id": "ccpa_disclosure",
                    "title": "Disclosure Requirements",
                    "description": "Disclosure of data collection practices",
                    "section": "1798.100",
                    "mandatory": True,
                    "check_patterns": [
                        r"categories of personal information",
                        r"disclosure",
                        r"privacy notice"
                    ]
                },
                {
                    "id": "ccpa_deletion",
                    "title": "Right to Delete",
                    "description": "Right to delete personal information",
                    "section": "1798.105",
                    "mandatory": True,
                    "check_patterns": [
                        r"right to delete",
                        r"deletion request",
                        r"erase personal"
                    ]
                }
            ],
            penalties={
                "civil_penalty": "$2,500-$7,500 per violation",
                "private_right": "Yes, for data breaches",
                "severity": "medium"
            },
            keywords=["consumer", "personal information", "California", "opt-out", "sale"]
        )
        
        # HIPAA
        regulations["HIPAA"] = Regulation(
            id="hipaa_1996",
            name="Health Insurance Portability and Accountability Act",
            acronym="HIPAA",
            type=RegulationType.HEALTHCARE,
            jurisdiction=["US"],
            industries=["healthcare", "health_tech", "insurance"],
            effective_date=datetime(1996, 8, 21),
            last_updated=datetime(2022, 1, 1),
            requirements=[
                {
                    "id": "hipaa_baa",
                    "title": "Business Associate Agreement",
                    "description": "BAA required for business associates",
                    "rule": "Privacy Rule",
                    "mandatory": True,
                    "check_patterns": [
                        r"business associate agreement",
                        r"BAA",
                        r"business associate"
                    ]
                },
                {
                    "id": "hipaa_phi_safeguards",
                    "title": "PHI Safeguards",
                    "description": "Administrative, physical, and technical safeguards",
                    "rule": "Security Rule",
                    "mandatory": True,
                    "check_patterns": [
                        r"PHI",
                        r"protected health information",
                        r"safeguards"
                    ]
                },
                {
                    "id": "hipaa_minimum_necessary",
                    "title": "Minimum Necessary Standard",
                    "description": "Use minimum necessary PHI",
                    "rule": "Privacy Rule",
                    "mandatory": True,
                    "check_patterns": [
                        r"minimum necessary",
                        r"need[- ]?to[- ]?know"
                    ]
                }
            ],
            penalties={
                "max_fine": "$2 million per violation type per year",
                "criminal_penalties": "Yes",
                "severity": "high"
            },
            keywords=["PHI", "health information", "medical", "patient", "HIPAA"]
        )
        
        # SOX
        regulations["SOX"] = Regulation(
            id="sox_2002",
            name="Sarbanes-Oxley Act",
            acronym="SOX",
            type=RegulationType.FINANCIAL,
            jurisdiction=["US"],
            industries=["finance", "public_companies"],
            effective_date=datetime(2002, 7, 30),
            last_updated=datetime(2023, 1, 1),
            requirements=[
                {
                    "id": "sox_internal_controls",
                    "title": "Internal Controls",
                    "description": "Internal control over financial reporting",
                    "section": "Section 404",
                    "mandatory": True,
                    "check_patterns": [
                        r"internal controls?",
                        r"financial reporting",
                        r"ICFR"
                    ]
                },
                {
                    "id": "sox_audit_independence",
                    "title": "Auditor Independence",
                    "description": "Maintain auditor independence",
                    "section": "Section 201-209",
                    "mandatory": True,
                    "check_patterns": [
                        r"auditor independence",
                        r"audit committee",
                        r"external auditor"
                    ]
                }
            ],
            penalties={
                "criminal_penalties": "Up to 20 years imprisonment",
                "fines": "Up to $5 million",
                "severity": "critical"
            },
            keywords=["financial reporting", "internal controls", "audit", "disclosure", "SOX"]
        )
        
        # PCI DSS
        regulations["PCI_DSS"] = Regulation(
            id="pci_dss_v4",
            name="Payment Card Industry Data Security Standard",
            acronym="PCI DSS",
            type=RegulationType.FINANCIAL,
            jurisdiction=["global"],
            industries=["retail", "e-commerce", "finance"],
            effective_date=datetime(2022, 3, 31),
            last_updated=datetime(2024, 1, 1),
            requirements=[
                {
                    "id": "pci_encryption",
                    "title": "Encryption Requirements",
                    "description": "Encrypt cardholder data",
                    "requirement": "Requirement 3",
                    "mandatory": True,
                    "check_patterns": [
                        r"encrypt",
                        r"cardholder data",
                        r"card data"
                    ]
                },
                {
                    "id": "pci_access_control",
                    "title": "Access Control",
                    "description": "Restrict access to cardholder data",
                    "requirement": "Requirements 7-9",
                    "mandatory": True,
                    "check_patterns": [
                        r"access control",
                        r"authentication",
                        r"authorization"
                    ]
                }
            ],
            penalties={
                "fines": "$5,000-$100,000 per month",
                "card_brand_penalties": "Yes",
                "severity": "high"
            },
            keywords=["payment", "card", "PCI", "cardholder", "merchant"]
        )
        
        return regulations
    
    def _build_indices(self):
        """Build lookup indices for fast access."""
        for reg_id, regulation in self.regulations_db.items():
            # Jurisdiction index
            for jurisdiction in regulation.jurisdiction:
                if jurisdiction not in self.jurisdiction_map:
                    self.jurisdiction_map[jurisdiction] = []
                self.jurisdiction_map[jurisdiction].append(reg_id)
            
            # Industry index
            for industry in regulation.industries:
                if industry not in self.industry_map:
                    self.industry_map[industry] = []
                self.industry_map[industry].append(reg_id)
    
    async def identify_regulations(
        self,
        document_text: str,
        document_type: str,
        jurisdiction: Optional[str] = None
    ) -> List[str]:
        """
        Identify applicable regulations for a document.
        
        Args:
            document_text: Document content
            document_type: Type of document
            jurisdiction: Jurisdiction to check
            
        Returns:
            List of applicable regulation IDs
        """
        applicable = set()
        doc_lower = document_text.lower()
        
        # Check by jurisdiction
        if jurisdiction:
            jurisdiction_regs = self.jurisdiction_map.get(jurisdiction, [])
            applicable.update(jurisdiction_regs)
        
        # Check by keywords
        for reg_id, regulation in self.regulations_db.items():
            # Check if any keywords match
            for keyword in regulation.keywords:
                if keyword.lower() in doc_lower:
                    applicable.add(reg_id)
                    break
            
            # Check specific patterns
            for req in regulation.requirements:
                patterns = req.get("check_patterns", [])
                for pattern in patterns:
                    if re.search(pattern, doc_lower, re.IGNORECASE):
                        applicable.add(reg_id)
                        break
        
        # Filter by document type
        if document_type:
            doc_type_lower = document_type.lower()
            if "contract" in doc_type_lower or "agreement" in doc_type_lower:
                # For contracts, include all identified regulations
                pass
            elif "policy" in doc_type_lower:
                # For policies, focus on compliance regulations
                applicable = {r for r in applicable 
                             if self.regulations_db[r].type in 
                             [RegulationType.DATA_PRIVACY, RegulationType.CYBERSECURITY]}
            elif "financial" in doc_type_lower:
                # For financial documents, focus on financial regulations
                applicable = {r for r in applicable 
                             if self.regulations_db[r].type == RegulationType.FINANCIAL}
        
        return list(applicable)
    
    async def get_requirements(
        self,
        regulation_id: str
    ) -> List[Dict[str, Any]]:
        """
        Get requirements for a specific regulation.
        
        Args:
            regulation_id: Regulation identifier
            
        Returns:
            List of requirements
        """
        regulation = self.regulations_db.get(regulation_id.upper())
        if regulation:
            return regulation.requirements
        return []
    
    async def list_regulations(
        self,
        jurisdiction: Optional[str] = None,
        industry: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        List available regulations.
        
        Args:
            jurisdiction: Filter by jurisdiction
            industry: Filter by industry
            
        Returns:
            List of regulation information
        """
        regulations = []
        
        # Get regulation IDs based on filters
        reg_ids = set(self.regulations_db.keys())
        
        if jurisdiction:
            jurisdiction_regs = set(self.jurisdiction_map.get(jurisdiction, []))
            reg_ids = reg_ids.intersection(jurisdiction_regs)
        
        if industry:
            industry_regs = set(self.industry_map.get(industry, []))
            reg_ids = reg_ids.intersection(industry_regs)
        
        # Build regulation list
        for reg_id in reg_ids:
            regulation = self.regulations_db[reg_id]
            regulations.append({
                "id": reg_id,
                "name": regulation.name,
                "acronym": regulation.acronym,
                "type": regulation.type.value,
                "jurisdiction": regulation.jurisdiction,
                "industries": regulation.industries,
                "effective_date": regulation.effective_date.isoformat(),
                "requirements_count": len(regulation.requirements)
            })
        
        return regulations
    
    async def get_updates(
        self,
        since: Optional[datetime] = None
    ) -> List[Dict[str, Any]]:
        """
        Get regulation updates.
        
        Args:
            since: Get updates since this date
            
        Returns:
            List of updates
        """
        updates = []
        
        # Default to last 30 days if not specified
        if not since:
            since = datetime.utcnow() - timedelta(days=30)
        
        # Check for updates (in production, this would query a real database)
        for reg_id, regulation in self.regulations_db.items():
            if regulation.last_updated > since:
                updates.append({
                    "regulation": reg_id,
                    "name": regulation.name,
                    "update_date": regulation.last_updated.isoformat(),
                    "update_type": "requirements_update",
                    "description": f"Updated requirements for {regulation.name}"
                })
        
        # Add some sample updates for demonstration
        if len(updates) == 0:
            updates = [
                {
                    "regulation": "GDPR",
                    "name": "General Data Protection Regulation",
                    "update_date": datetime.utcnow().isoformat(),
                    "update_type": "guidance",
                    "description": "New guidance on legitimate interest assessments"
                },
                {
                    "regulation": "CCPA",
                    "name": "California Consumer Privacy Act",
                    "update_date": (datetime.utcnow() - timedelta(days=7)).isoformat(),
                    "update_type": "enforcement",
                    "description": "Updated enforcement priorities announced"
                }
            ]
        
        return updates
    
    async def check_applicability(
        self,
        regulation_id: str,
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Check if a regulation applies to given context.
        
        Args:
            regulation_id: Regulation to check
            context: Business context (jurisdiction, industry, etc.)
            
        Returns:
            Applicability analysis
        """
        regulation = self.regulations_db.get(regulation_id.upper())
        
        if not regulation:
            return {"applicable": False, "reason": "Regulation not found"}
        
        # Check jurisdiction
        if context.get("jurisdiction"):
            if context["jurisdiction"] not in regulation.jurisdiction:
                if "global" not in regulation.jurisdiction and "all" not in regulation.jurisdiction:
                    return {
                        "applicable": False,
                        "reason": f"Regulation not applicable in {context['jurisdiction']}"
                    }
        
        # Check industry
        if context.get("industry"):
            if "all" not in regulation.industries:
                if context["industry"] not in regulation.industries:
                    return {
                        "applicable": False,
                        "reason": f"Regulation not applicable to {context['industry']} industry"
                    }
        
        # Check effective date
        if context.get("date"):
            if context["date"] < regulation.effective_date:
                return {
                    "applicable": False,
                    "reason": f"Regulation not yet effective on {context['date']}"
                }
        
        return {
            "applicable": True,
            "regulation": regulation.name,
            "requirements": len(regulation.requirements),
            "penalties": regulation.penalties
        }
    
    async def cleanup(self):
        """Cleanup resources."""
        self.regulations_db.clear()
        self.jurisdiction_map.clear()
        self.industry_map.clear()
        self.update_cache.clear()