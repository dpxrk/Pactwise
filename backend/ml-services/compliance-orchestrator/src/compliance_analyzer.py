"""
Compliance analysis engine.
"""

import logging
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import re
from datetime import datetime

logger = logging.getLogger(__name__)


@dataclass
class ComplianceResult:
    """Compliance analysis result."""
    regulation: str
    requirement_id: str
    requirement_title: str
    compliant: bool
    score: float
    evidence: List[str]
    gaps: List[str]
    recommendations: List[str]
    confidence: float


class ComplianceAnalyzer:
    """
    Analyze documents for regulatory compliance.
    """
    
    def __init__(self):
        """Initialize compliance analyzer."""
        self.analysis_cache = {}
        self.monitoring_configs = {}
    
    async def analyze(
        self,
        document_text: str,
        regulations: List[str],
        industry: Optional[str] = None
    ) -> List[ComplianceResult]:
        """
        Analyze document for compliance with regulations.
        
        Args:
            document_text: Document to analyze
            regulations: List of regulation IDs
            industry: Industry context
            
        Returns:
            List of compliance results
        """
        results = []
        doc_lower = document_text.lower()
        
        for regulation in regulations:
            reg_results = await self._analyze_regulation(
                doc_lower,
                regulation,
                industry
            )
            results.extend(reg_results)
        
        return results
    
    async def _analyze_regulation(
        self,
        doc_text: str,
        regulation: str,
        industry: Optional[str] = None
    ) -> List[ComplianceResult]:
        """Analyze compliance with specific regulation."""
        results = []
        
        # Get regulation-specific analysis
        if regulation.upper() == "GDPR":
            results = self._analyze_gdpr(doc_text)
        elif regulation.upper() == "CCPA":
            results = self._analyze_ccpa(doc_text)
        elif regulation.upper() == "HIPAA":
            results = self._analyze_hipaa(doc_text)
        elif regulation.upper() == "SOX":
            results = self._analyze_sox(doc_text)
        elif regulation.upper() == "PCI_DSS":
            results = self._analyze_pci_dss(doc_text)
        else:
            # Generic analysis
            results = self._generic_compliance_analysis(doc_text, regulation)
        
        return results
    
    def _analyze_gdpr(self, doc_text: str) -> List[ComplianceResult]:
        """Analyze GDPR compliance."""
        results = []
        
        # Check lawful basis
        lawful_basis_patterns = [
            r"lawful basis",
            r"legal (basis|grounds)",
            r"consent",
            r"legitimate interests?"
        ]
        
        lawful_basis_found = any(
            re.search(pattern, doc_text, re.IGNORECASE) 
            for pattern in lawful_basis_patterns
        )
        
        results.append(ComplianceResult(
            regulation="GDPR",
            requirement_id="gdpr_lawful_basis",
            requirement_title="Lawful Basis for Processing",
            compliant=lawful_basis_found,
            score=100.0 if lawful_basis_found else 0.0,
            evidence=[m.group() for pattern in lawful_basis_patterns 
                     for m in re.finditer(pattern, doc_text, re.IGNORECASE)][:3],
            gaps=[] if lawful_basis_found else ["No lawful basis specified"],
            recommendations=[] if lawful_basis_found else 
                ["Add explicit lawful basis under Article 6"],
            confidence=0.9 if lawful_basis_found else 0.8
        ))
        
        # Check data subject rights
        rights_patterns = [
            r"data subject rights?",
            r"right to (access|erasure|portability|rectification)",
            r"exercise (your|their) rights?"
        ]
        
        rights_found = any(
            re.search(pattern, doc_text, re.IGNORECASE)
            for pattern in rights_patterns
        )
        
        results.append(ComplianceResult(
            regulation="GDPR",
            requirement_id="gdpr_data_rights",
            requirement_title="Data Subject Rights",
            compliant=rights_found,
            score=100.0 if rights_found else 0.0,
            evidence=[m.group() for pattern in rights_patterns
                     for m in re.finditer(pattern, doc_text, re.IGNORECASE)][:3],
            gaps=[] if rights_found else ["Data subject rights not addressed"],
            recommendations=[] if rights_found else
                ["Include comprehensive data subject rights per Articles 15-22"],
            confidence=0.85 if rights_found else 0.8
        ))
        
        # Check breach notification
        breach_patterns = [
            r"breach notification",
            r"72 hours?",
            r"data breach",
            r"security incident"
        ]
        
        breach_found = any(
            re.search(pattern, doc_text, re.IGNORECASE)
            for pattern in breach_patterns
        )
        
        results.append(ComplianceResult(
            regulation="GDPR",
            requirement_id="gdpr_breach",
            requirement_title="Breach Notification",
            compliant=breach_found,
            score=100.0 if breach_found else 0.0,
            evidence=[m.group() for pattern in breach_patterns
                     for m in re.finditer(pattern, doc_text, re.IGNORECASE)][:3],
            gaps=[] if breach_found else ["Breach notification procedures missing"],
            recommendations=[] if breach_found else
                ["Add 72-hour breach notification requirement"],
            confidence=0.9 if breach_found else 0.75
        ))
        
        return results
    
    def _analyze_ccpa(self, doc_text: str) -> List[ComplianceResult]:
        """Analyze CCPA compliance."""
        results = []
        
        # Check opt-out rights
        optout_patterns = [
            r"opt[- ]?out",
            r"do not sell",
            r"sale of (personal )?information"
        ]
        
        optout_found = any(
            re.search(pattern, doc_text, re.IGNORECASE)
            for pattern in optout_patterns
        )
        
        results.append(ComplianceResult(
            regulation="CCPA",
            requirement_id="ccpa_optout",
            requirement_title="Right to Opt-Out",
            compliant=optout_found,
            score=100.0 if optout_found else 0.0,
            evidence=[m.group() for pattern in optout_patterns
                     for m in re.finditer(pattern, doc_text, re.IGNORECASE)][:3],
            gaps=[] if optout_found else ["Opt-out mechanism not provided"],
            recommendations=[] if optout_found else
                ["Add 'Do Not Sell My Personal Information' provisions"],
            confidence=0.9 if optout_found else 0.8
        ))
        
        return results
    
    def _analyze_hipaa(self, doc_text: str) -> List[ComplianceResult]:
        """Analyze HIPAA compliance."""
        results = []
        
        # Check BAA requirement
        baa_patterns = [
            r"business associate agreement",
            r"BAA",
            r"business associate"
        ]
        
        baa_found = any(
            re.search(pattern, doc_text, re.IGNORECASE)
            for pattern in baa_patterns
        )
        
        results.append(ComplianceResult(
            regulation="HIPAA",
            requirement_id="hipaa_baa",
            requirement_title="Business Associate Agreement",
            compliant=baa_found,
            score=100.0 if baa_found else 0.0,
            evidence=[m.group() for pattern in baa_patterns
                     for m in re.finditer(pattern, doc_text, re.IGNORECASE)][:3],
            gaps=[] if baa_found else ["Business Associate Agreement required"],
            recommendations=[] if baa_found else
                ["Execute Business Associate Agreement immediately"],
            confidence=0.95 if baa_found else 0.9
        ))
        
        # Check PHI safeguards
        phi_patterns = [
            r"PHI",
            r"protected health information",
            r"safeguards",
            r"administrative.*physical.*technical"
        ]
        
        phi_found = any(
            re.search(pattern, doc_text, re.IGNORECASE)
            for pattern in phi_patterns
        )
        
        results.append(ComplianceResult(
            regulation="HIPAA",
            requirement_id="hipaa_safeguards",
            requirement_title="PHI Safeguards",
            compliant=phi_found,
            score=100.0 if phi_found else 0.0,
            evidence=[m.group() for pattern in phi_patterns
                     for m in re.finditer(pattern, doc_text, re.IGNORECASE)][:3],
            gaps=[] if phi_found else ["PHI safeguards not specified"],
            recommendations=[] if phi_found else
                ["Define administrative, physical, and technical safeguards"],
            confidence=0.85 if phi_found else 0.8
        ))
        
        return results
    
    def _analyze_sox(self, doc_text: str) -> List[ComplianceResult]:
        """Analyze SOX compliance."""
        results = []
        
        # Check internal controls
        control_patterns = [
            r"internal controls?",
            r"financial reporting",
            r"ICFR",
            r"control environment"
        ]
        
        controls_found = any(
            re.search(pattern, doc_text, re.IGNORECASE)
            for pattern in control_patterns
        )
        
        results.append(ComplianceResult(
            regulation="SOX",
            requirement_id="sox_controls",
            requirement_title="Internal Controls",
            compliant=controls_found,
            score=100.0 if controls_found else 0.0,
            evidence=[m.group() for pattern in control_patterns
                     for m in re.finditer(pattern, doc_text, re.IGNORECASE)][:3],
            gaps=[] if controls_found else ["Internal controls not documented"],
            recommendations=[] if controls_found else
                ["Document internal controls over financial reporting"],
            confidence=0.85 if controls_found else 0.75
        ))
        
        return results
    
    def _analyze_pci_dss(self, doc_text: str) -> List[ComplianceResult]:
        """Analyze PCI DSS compliance."""
        results = []
        
        # Check encryption
        encryption_patterns = [
            r"encrypt",
            r"AES[- ]?256",
            r"TLS",
            r"cardholder data"
        ]
        
        encryption_found = any(
            re.search(pattern, doc_text, re.IGNORECASE)
            for pattern in encryption_patterns
        )
        
        results.append(ComplianceResult(
            regulation="PCI_DSS",
            requirement_id="pci_encryption",
            requirement_title="Data Encryption",
            compliant=encryption_found,
            score=100.0 if encryption_found else 0.0,
            evidence=[m.group() for pattern in encryption_patterns
                     for m in re.finditer(pattern, doc_text, re.IGNORECASE)][:3],
            gaps=[] if encryption_found else ["Encryption requirements not met"],
            recommendations=[] if encryption_found else
                ["Implement AES-256 encryption for cardholder data"],
            confidence=0.9 if encryption_found else 0.8
        ))
        
        return results
    
    def _generic_compliance_analysis(
        self,
        doc_text: str,
        regulation: str
    ) -> List[ComplianceResult]:
        """Generic compliance analysis for unknown regulations."""
        return [
            ComplianceResult(
                regulation=regulation,
                requirement_id=f"{regulation.lower()}_general",
                requirement_title="General Compliance",
                compliant=False,
                score=50.0,
                evidence=[],
                gaps=["Unable to perform detailed analysis"],
                recommendations=["Consult compliance specialist"],
                confidence=0.3
            )
        ]
    
    async def check_regulation(
        self,
        document_text: str,
        regulation: str,
        requirements: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Check compliance with specific regulation.
        
        Args:
            document_text: Document to check
            regulation: Regulation name
            requirements: Regulation requirements
            
        Returns:
            Compliance check result
        """
        doc_lower = document_text.lower()
        missing_requirements = []
        found_requirements = []
        
        for requirement in requirements:
            patterns = requirement.get("check_patterns", [])
            found = False
            
            for pattern in patterns:
                if re.search(pattern, doc_lower, re.IGNORECASE):
                    found = True
                    found_requirements.append(requirement["title"])
                    break
            
            if not found and requirement.get("mandatory", False):
                missing_requirements.append(requirement["title"])
        
        total_requirements = len(requirements)
        found_count = len(found_requirements)
        score = (found_count / total_requirements * 100) if total_requirements > 0 else 0
        
        return {
            "compliant": len(missing_requirements) == 0,
            "score": score,
            "found": found_requirements,
            "missing": missing_requirements,
            "recommendations": [f"Add provisions for: {req}" for req in missing_requirements[:5]]
        }
    
    async def setup_monitoring(
        self,
        config: Dict[str, Any]
    ) -> str:
        """
        Setup continuous compliance monitoring.
        
        Args:
            config: Monitoring configuration
            
        Returns:
            Monitor ID
        """
        monitor_id = f"monitor_{datetime.utcnow().timestamp()}"
        self.monitoring_configs[monitor_id] = config
        
        logger.info(f"Set up monitoring {monitor_id} for {config.get('regulations', [])}")
        
        return monitor_id