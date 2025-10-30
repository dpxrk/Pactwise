"""Clause Library - Standard contract clauses repository"""

from typing import Dict, List, Any, Optional
from integrations.databases.contract_models import ContractType, RiskLevel


class ClauseLibrary:
    """
    Repository of standard contract clauses with:
    - Pre-approved clause templates
    - Risk-rated clauses
    - Industry-specific clauses
    - Fallback positions
    """
    
    def __init__(self):
        # Standard clauses by category
        self.standard_clauses = {
            "limitation_of_liability": {
                "protective": """
                LIMITATION OF LIABILITY. IN NO EVENT SHALL EITHER PARTY BE LIABLE FOR ANY INDIRECT, 
                INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION, 
                LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES. THE AGGREGATE LIABILITY 
                OF EACH PARTY SHALL NOT EXCEED THE TOTAL AMOUNT PAID OR PAYABLE UNDER THIS AGREEMENT 
                IN THE TWELVE (12) MONTHS PRECEDING THE EVENT GIVING RISE TO LIABILITY.
                """,
                "balanced": """
                LIMITATION OF LIABILITY. EXCEPT FOR BREACHES OF CONFIDENTIALITY, INDEMNIFICATION OBLIGATIONS, 
                OR GROSS NEGLIGENCE AND WILLFUL MISCONDUCT, IN NO EVENT SHALL EITHER PARTY BE LIABLE FOR 
                INDIRECT OR CONSEQUENTIAL DAMAGES. THE AGGREGATE LIABILITY SHALL NOT EXCEED THE FEES PAID 
                IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.
                """,
                "risk_level": RiskLevel.LOW
            },
            
            "indemnification": {
                "mutual": """
                MUTUAL INDEMNIFICATION. Each party shall defend, indemnify, and hold harmless the other party 
                from and against any third-party claims arising from: (i) breach of this Agreement; 
                (ii) negligence or willful misconduct; (iii) violation of applicable laws; or 
                (iv) infringement of intellectual property rights.
                """,
                "one_sided": """
                INDEMNIFICATION. Vendor shall defend, indemnify, and hold harmless Company from all claims, 
                damages, and expenses arising from Vendor's performance under this Agreement.
                """,
                "risk_level": RiskLevel.MEDIUM
            },
            
            "termination": {
                "balanced": """
                TERMINATION. Either party may terminate this Agreement: (a) for convenience upon thirty (30) 
                days written notice; (b) immediately upon material breach if not cured within fifteen (15) days 
                of written notice; (c) immediately upon insolvency or bankruptcy of the other party.
                """,
                "protective": """
                TERMINATION FOR CONVENIENCE. Company may terminate this Agreement at any time for any reason 
                upon thirty (30) days written notice to Vendor. Upon termination, Company shall pay for 
                services satisfactorily performed through the termination date.
                """,
                "risk_level": RiskLevel.LOW
            },
            
            "payment_terms": {
                "standard": """
                PAYMENT TERMS. Company shall pay all undisputed invoices within thirty (30) days of receipt. 
                Invoices must include detailed description of services performed and expenses incurred. 
                Company may withhold payment for disputed amounts pending resolution.
                """,
                "protective": """
                PAYMENT TERMS. Payment shall be made within forty-five (45) days after receipt of correct 
                invoice and acceptance of deliverables. Company reserves the right to offset any amounts 
                owed by Vendor. Late payments shall accrue interest at 1.5% per month or maximum allowed by law.
                """,
                "risk_level": RiskLevel.LOW
            },
            
            "confidentiality": {
                "mutual": """
                CONFIDENTIALITY. Each party acknowledges that it may have access to confidential information 
                of the other party. Each party agrees to maintain the confidentiality of such information and 
                not disclose it to third parties, except as required by law or with prior written consent. 
                This obligation shall survive termination for five (5) years.
                """,
                "comprehensive": """
                CONFIDENTIALITY. "Confidential Information" means all non-public information disclosed by one 
                party to the other, whether orally, in writing, or in any other form, including but not limited 
                to: technical data, trade secrets, know-how, research, business plans, customer information, 
                and financial information. The receiving party shall: (i) maintain strict confidentiality; 
                (ii) not disclose to third parties; (iii) use solely for purposes of this Agreement; 
                (iv) protect with same degree of care as its own confidential information, but no less than 
                reasonable care. These obligations shall not apply to information that: (a) was publicly known; 
                (b) was rightfully received from a third party; (c) was independently developed; or 
                (d) is required to be disclosed by law.
                """,
                "risk_level": RiskLevel.LOW
            },
            
            "intellectual_property": {
                "work_product": """
                INTELLECTUAL PROPERTY. All work product created specifically for Company under this Agreement 
                shall be considered work-for-hire and shall be the exclusive property of Company. Vendor hereby 
                assigns all rights, title, and interest in such work product to Company. Vendor retains ownership 
                of pre-existing intellectual property and grants Company a perpetual, worldwide, royalty-free 
                license to use such pre-existing IP as incorporated in the deliverables.
                """,
                "licensed": """
                INTELLECTUAL PROPERTY LICENSE. Vendor grants Company a non-exclusive, worldwide, perpetual, 
                irrevocable license to use, modify, and distribute the deliverables provided under this Agreement. 
                Vendor retains all ownership rights in the deliverables and any derivatives thereof.
                """,
                "risk_level": RiskLevel.MEDIUM
            },
            
            "warranties": {
                "comprehensive": """
                WARRANTIES. Vendor represents and warrants that: (i) it has the right and authority to enter 
                into this Agreement; (ii) services will be performed in a professional and workmanlike manner; 
                (iii) deliverables will conform to specifications and be free from defects for ninety (90) days; 
                (iv) deliverables will not infringe any third-party intellectual property rights; (v) it will 
                comply with all applicable laws and regulations. EXCEPT AS EXPRESSLY SET FORTH HEREIN, VENDOR 
                DISCLAIMS ALL OTHER WARRANTIES, EXPRESS OR IMPLIED.
                """,
                "limited": """
                LIMITED WARRANTY. Vendor warrants that services will be performed in a professional manner 
                consistent with industry standards. Vendor's sole obligation for breach of warranty shall be 
                to re-perform the non-conforming services. THIS WARRANTY IS EXCLUSIVE AND IN LIEU OF ALL 
                OTHER WARRANTIES, EXPRESS OR IMPLIED.
                """,
                "risk_level": RiskLevel.MEDIUM
            },
            
            "force_majeure": {
                "standard": """
                FORCE MAJEURE. Neither party shall be liable for any delay or failure to perform due to causes 
                beyond its reasonable control, including but not limited to: acts of God, natural disasters, war, 
                terrorism, epidemic, pandemic, labor disputes, or governmental actions. The affected party shall 
                promptly notify the other party and use commercially reasonable efforts to mitigate the impact. 
                If the force majeure event continues for more than sixty (60) days, either party may terminate 
                this Agreement upon written notice.
                """,
                "risk_level": RiskLevel.LOW
            },
            
            "dispute_resolution": {
                "escalation": """
                DISPUTE RESOLUTION. The parties shall attempt to resolve any dispute through good faith 
                negotiations between senior executives. If not resolved within thirty (30) days, the dispute 
                shall be submitted to mediation. If mediation fails, the dispute may be submitted to binding 
                arbitration under the rules of the American Arbitration Association. The prevailing party 
                shall be entitled to recover reasonable attorneys' fees.
                """,
                "arbitration": """
                ARBITRATION. Any dispute arising out of this Agreement shall be resolved through binding 
                arbitration in accordance with the Commercial Arbitration Rules of the American Arbitration 
                Association. The arbitration shall be conducted by a single arbitrator in [City, State]. 
                The arbitrator's decision shall be final and binding, and judgment may be entered in any 
                court of competent jurisdiction.
                """,
                "risk_level": RiskLevel.MEDIUM
            },
            
            "governing_law": {
                "standard": """
                GOVERNING LAW. This Agreement shall be governed by and construed in accordance with the laws 
                of the State of [State], without regard to its conflict of law principles. Any legal action 
                shall be brought exclusively in the state or federal courts located in [County, State], and 
                the parties consent to personal jurisdiction therein.
                """,
                "risk_level": RiskLevel.LOW
            }
        }
        
        # Fallback clause positions
        self.fallback_positions = {
            "limitation_of_liability": [
                "Cap at total contract value",
                "Cap at 12 months of fees",
                "Cap at 6 months of fees",
                "Exclude only consequential damages",
                "Mutual limitation"
            ],
            "payment_terms": [
                "Net 30 days",
                "Net 45 days",
                "Net 60 days",
                "2/10 Net 30 (2% discount if paid in 10 days)",
                "Progress payments"
            ],
            "termination": [
                "30 days notice for convenience",
                "60 days notice for convenience",
                "90 days notice for convenience",
                "For cause only",
                "Mutual consent"
            ]
        }
    
    def get_clause(
        self,
        clause_type: str,
        variant: str = "standard"
    ) -> Optional[Dict[str, Any]]:
        """Get specific clause from library"""
        
        if clause_type in self.standard_clauses:
            clause_data = self.standard_clauses[clause_type]
            
            if variant in clause_data:
                return {
                    "text": clause_data[variant].strip(),
                    "risk_level": clause_data.get("risk_level", RiskLevel.MEDIUM),
                    "type": clause_type,
                    "variant": variant
                }
            elif isinstance(clause_data, dict) and len(clause_data) > 0:
                # Return first available variant
                for key, value in clause_data.items():
                    if key != "risk_level" and isinstance(value, str):
                        return {
                            "text": value.strip(),
                            "risk_level": clause_data.get("risk_level", RiskLevel.MEDIUM),
                            "type": clause_type,
                            "variant": key
                        }
        
        return None
    
    def get_clause_alternatives(self, clause_type: str) -> List[Dict[str, Any]]:
        """Get all alternatives for a clause type"""
        
        alternatives = []
        
        if clause_type in self.standard_clauses:
            clause_data = self.standard_clauses[clause_type]
            
            for variant, text in clause_data.items():
                if variant != "risk_level" and isinstance(text, str):
                    alternatives.append({
                        "variant": variant,
                        "text": text.strip(),
                        "risk_level": clause_data.get("risk_level", RiskLevel.MEDIUM)
                    })
        
        return alternatives
    
    def get_fallback_positions(self, clause_type: str) -> List[str]:
        """Get negotiation fallback positions for a clause"""
        
        return self.fallback_positions.get(clause_type, [])
    
    def suggest_clauses(
        self,
        contract_type: ContractType,
        risk_tolerance: str = "medium"
    ) -> List[Dict[str, Any]]:
        """Suggest clauses based on contract type and risk tolerance"""
        
        suggested = []
        
        # Essential clauses for all contracts
        essential = [
            "limitation_of_liability",
            "indemnification",
            "termination",
            "governing_law",
            "dispute_resolution"
        ]
        
        # Additional clauses by contract type
        type_specific = {
            ContractType.MSA: [
                "payment_terms", "warranties", "intellectual_property",
                "confidentiality", "force_majeure"
            ],
            ContractType.SOW: [
                "payment_terms", "deliverables", "acceptance_criteria"
            ],
            ContractType.NDA: [
                "confidentiality", "return_of_information", "term"
            ],
            ContractType.PURCHASE: [
                "payment_terms", "warranties", "delivery_terms"
            ]
        }
        
        # Combine essential and type-specific
        needed_clauses = essential + type_specific.get(contract_type, [])
        
        # Select appropriate variant based on risk tolerance
        variant_map = {
            "low": "protective",
            "medium": "balanced",
            "high": "standard"
        }
        
        preferred_variant = variant_map.get(risk_tolerance, "balanced")
        
        for clause_type in set(needed_clauses):
            clause = self.get_clause(clause_type, preferred_variant)
            
            if not clause:
                # Fall back to any available variant
                clause = self.get_clause(clause_type)
            
            if clause:
                suggested.append(clause)
        
        return suggested
    
    def search_clauses(self, keyword: str) -> List[Dict[str, Any]]:
        """Search for clauses containing specific keyword"""
        
        results = []
        keyword_lower = keyword.lower()
        
        for clause_type, clause_data in self.standard_clauses.items():
            for variant, text in clause_data.items():
                if variant != "risk_level" and isinstance(text, str):
                    if keyword_lower in text.lower():
                        results.append({
                            "type": clause_type,
                            "variant": variant,
                            "text": text.strip(),
                            "risk_level": clause_data.get("risk_level", RiskLevel.MEDIUM)
                        })
        
        return results