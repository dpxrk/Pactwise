"""
Extractors for clauses and entities from contracts.
"""

import re
import logging
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
import spacy
from datetime import datetime

logger = logging.getLogger(__name__)


@dataclass
class ExtractedClause:
    """Represents an extracted clause."""
    id: str
    type: str
    text: str
    start_pos: int
    end_pos: int
    importance: float
    risk_level: str
    obligations: List[str]
    deadlines: List[str]
    monetary_values: List[float]


@dataclass
class ExtractedEntity:
    """Represents an extracted entity."""
    type: str
    value: str
    confidence: float
    location: Dict[str, int]
    context: str


class ClauseExtractor:
    """
    Extract and classify clauses from contracts.
    Uses NLP techniques and pattern matching.
    """
    
    # Clause patterns
    CLAUSE_PATTERNS = {
        "payment": [
            r"payment[s]?\s+(?:shall|will|must)\s+be\s+made",
            r"invoice[s]?\s+(?:shall|will|must)\s+be\s+paid",
            r"payment\s+terms",
            r"net\s+\d+\s+days?"
        ],
        "delivery": [
            r"deliver(?:y|ies)?\s+(?:shall|will|must)",
            r"ship(?:ment|ping)?\s+(?:shall|will|must)",
            r"delivery\s+date",
            r"time\s+of\s+delivery"
        ],
        "termination": [
            r"terminat(?:e|ion)",
            r"expir(?:e|ation|y)",
            r"end\s+of\s+(?:term|agreement)",
            r"cancel(?:lation)?"
        ],
        "liability": [
            r"liabilit(?:y|ies)",
            r"liable\s+for",
            r"limitation[s]?\s+of\s+liability",
            r"cap(?:ped)?\s+at"
        ],
        "confidentiality": [
            r"confidential(?:ity)?",
            r"non-disclosure",
            r"proprietary\s+information",
            r"trade\s+secret"
        ],
        "warranty": [
            r"warrant(?:y|ies|s)",
            r"guarantee[s]?",
            r"defect(?:s|ive)?",
            r"fitness\s+for\s+(?:a\s+)?particular\s+purpose"
        ],
        "indemnification": [
            r"indemnif(?:y|ication)",
            r"hold\s+harmless",
            r"defend\s+and\s+indemnify",
            r"indemnit(?:y|ies)"
        ],
        "force_majeure": [
            r"force\s+majeure",
            r"act[s]?\s+of\s+god",
            r"unforeseeable\s+circumstances",
            r"beyond\s+(?:the\s+)?control"
        ],
        "dispute_resolution": [
            r"dispute[s]?\s+resolution",
            r"arbitration",
            r"mediation",
            r"governing\s+law",
            r"jurisdiction"
        ],
        "intellectual_property": [
            r"intellectual\s+property",
            r"copyright[s]?",
            r"patent[s]?",
            r"trademark[s]?",
            r"trade\s+dress"
        ]
    }
    
    def __init__(self):
        """Initialize the clause extractor."""
        try:
            self.nlp = spacy.load("en_core_web_sm")
        except:
            logger.warning("spaCy model not found, using basic extraction")
            self.nlp = None
    
    async def extract(self, text: str) -> List[ExtractedClause]:
        """
        Extract clauses from contract text.
        
        Args:
            text: Contract text
            
        Returns:
            List of extracted clauses
        """
        clauses = []
        
        # Split into paragraphs for clause detection
        paragraphs = self._split_into_paragraphs(text)
        
        for idx, paragraph in enumerate(paragraphs):
            if len(paragraph.strip()) < 20:  # Skip very short paragraphs
                continue
            
            # Identify clause type
            clause_type = self._identify_clause_type(paragraph)
            
            if clause_type:
                # Extract clause details
                obligations = self._extract_obligations(paragraph)
                deadlines = self._extract_deadlines(paragraph)
                monetary_values = self._extract_monetary_values(paragraph)
                risk_level = self._assess_clause_risk(paragraph, clause_type)
                importance = self._calculate_importance(
                    clause_type, risk_level, len(obligations), len(deadlines)
                )
                
                clause = ExtractedClause(
                    id=f"clause_{idx}",
                    type=clause_type,
                    text=paragraph.strip(),
                    start_pos=text.find(paragraph),
                    end_pos=text.find(paragraph) + len(paragraph),
                    importance=importance,
                    risk_level=risk_level,
                    obligations=obligations,
                    deadlines=deadlines,
                    monetary_values=monetary_values
                )
                
                clauses.append(clause)
        
        return clauses
    
    def _split_into_paragraphs(self, text: str) -> List[str]:
        """Split text into paragraphs."""
        # First try double newline
        paragraphs = text.split('\n\n')
        
        # If not enough paragraphs, try numbered sections
        if len(paragraphs) < 5:
            # Look for numbered sections like "1.", "2.", etc.
            pattern = r'\n(?=\d+\.|\([a-z]\)|\([A-Z]\)|\([ivx]+\))'
            paragraphs = re.split(pattern, text)
        
        # If still not enough, split by sentences (groups of 3-5)
        if len(paragraphs) < 5:
            sentences = text.split('.')
            paragraphs = []
            current = []
            for sent in sentences:
                current.append(sent)
                if len(current) >= 3:
                    paragraphs.append('. '.join(current) + '.')
                    current = []
            if current:
                paragraphs.append('. '.join(current) + '.')
        
        return [p for p in paragraphs if p.strip()]
    
    def _identify_clause_type(self, text: str) -> Optional[str]:
        """Identify the type of clause."""
        text_lower = text.lower()
        
        # Check each clause type
        best_match = None
        best_score = 0
        
        for clause_type, patterns in self.CLAUSE_PATTERNS.items():
            score = 0
            for pattern in patterns:
                if re.search(pattern, text_lower):
                    score += 1
            
            if score > best_score:
                best_score = score
                best_match = clause_type
        
        return best_match if best_score > 0 else None
    
    def _extract_obligations(self, text: str) -> List[str]:
        """Extract obligations from clause text."""
        obligations = []
        
        # Pattern for obligations
        obligation_pattern = r'(shall|must|will|agrees? to|undertakes? to|commits? to)\s+([^.;]+)'
        
        matches = re.finditer(obligation_pattern, text, re.IGNORECASE)
        for match in matches:
            obligation = match.group(0).strip()
            if len(obligation) > 10:  # Filter out very short matches
                obligations.append(obligation)
        
        return obligations[:5]  # Limit to top 5
    
    def _extract_deadlines(self, text: str) -> List[str]:
        """Extract deadlines and time constraints."""
        deadlines = []
        
        # Date patterns
        date_patterns = [
            r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}',
            r'\d{4}[/-]\d{1,2}[/-]\d{1,2}',
            r'(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}',
            r'within\s+\d+\s+(days?|weeks?|months?|years?)',
            r'no later than\s+[^.;]+',
            r'by\s+(the\s+)?\d{1,2}(st|nd|rd|th)\s+(?:of\s+)?[A-Z][a-z]+'
        ]
        
        for pattern in date_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                deadlines.append(match.group(0).strip())
        
        return list(set(deadlines))[:5]  # Unique, limited to 5
    
    def _extract_monetary_values(self, text: str) -> List[float]:
        """Extract monetary values from text."""
        values = []
        
        # Money patterns
        money_pattern = r'\$\s?([\d,]+(?:\.\d{2})?)'
        
        matches = re.finditer(money_pattern, text)
        for match in matches:
            value_str = match.group(1).replace(',', '')
            try:
                value = float(value_str)
                values.append(value)
            except ValueError:
                continue
        
        return sorted(values, reverse=True)[:5]  # Top 5 amounts
    
    def _assess_clause_risk(self, text: str, clause_type: str) -> str:
        """Assess the risk level of a clause."""
        text_lower = text.lower()
        
        # Critical risk indicators
        critical_indicators = [
            "unlimited liability",
            "personal guarantee",
            "no limitation",
            "sole discretion",
            "immediate termination",
            "liquidated damages"
        ]
        
        # High risk indicators
        high_indicators = [
            "indemnify",
            "hold harmless",
            "consequential damages",
            "punitive damages",
            "automatic renewal",
            "exclusive"
        ]
        
        # Check for risk indicators
        for indicator in critical_indicators:
            if indicator in text_lower:
                return "critical"
        
        for indicator in high_indicators:
            if indicator in text_lower:
                return "high"
        
        # Type-based risk assessment
        if clause_type in ["liability", "indemnification", "termination"]:
            return "high" if "cap" not in text_lower else "medium"
        elif clause_type in ["warranty", "confidentiality"]:
            return "medium"
        else:
            return "low"
    
    def _calculate_importance(
        self,
        clause_type: str,
        risk_level: str,
        num_obligations: int,
        num_deadlines: int
    ) -> float:
        """Calculate importance score for a clause."""
        # Base importance by type
        type_importance = {
            "liability": 0.9,
            "indemnification": 0.9,
            "termination": 0.85,
            "payment": 0.8,
            "warranty": 0.75,
            "confidentiality": 0.7,
            "delivery": 0.65,
            "dispute_resolution": 0.6,
            "intellectual_property": 0.7,
            "force_majeure": 0.5
        }
        
        base_score = type_importance.get(clause_type, 0.5)
        
        # Adjust for risk level
        risk_multiplier = {
            "critical": 1.3,
            "high": 1.2,
            "medium": 1.0,
            "low": 0.9,
            "minimal": 0.8
        }
        
        score = base_score * risk_multiplier.get(risk_level, 1.0)
        
        # Adjust for obligations and deadlines
        if num_obligations > 2:
            score += 0.1
        if num_deadlines > 0:
            score += 0.1
        
        return min(1.0, score)


class EntityExtractor:
    """
    Extract named entities and key information from contracts.
    """
    
    def __init__(self):
        """Initialize the entity extractor."""
        try:
            self.nlp = spacy.load("en_core_web_sm")
        except:
            logger.warning("spaCy model not found, using regex extraction")
            self.nlp = None
    
    async def extract(self, text: str) -> List[ExtractedEntity]:
        """
        Extract entities from contract text.
        
        Args:
            text: Contract text
            
        Returns:
            List of extracted entities
        """
        entities = []
        
        # Extract using spaCy if available
        if self.nlp:
            doc = self.nlp(text[:1000000])  # Limit to 1M chars
            
            for ent in doc.ents:
                if ent.label_ in ["ORG", "PERSON", "DATE", "MONEY", "GPE", "LOC"]:
                    entity = ExtractedEntity(
                        type=ent.label_,
                        value=ent.text,
                        confidence=0.8,  # spaCy doesn't provide confidence
                        location={"start": ent.start_char, "end": ent.end_char},
                        context=text[max(0, ent.start_char-50):min(len(text), ent.end_char+50)]
                    )
                    entities.append(entity)
        
        # Also use regex patterns for specific entities
        regex_entities = await self._extract_with_regex(text)
        entities.extend(regex_entities)
        
        # Deduplicate
        seen = set()
        unique_entities = []
        for entity in entities:
            key = (entity.type, entity.value.lower())
            if key not in seen:
                seen.add(key)
                unique_entities.append(entity)
        
        return unique_entities
    
    async def _extract_with_regex(self, text: str) -> List[ExtractedEntity]:
        """Extract entities using regex patterns."""
        entities = []
        
        # Email addresses
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        for match in re.finditer(email_pattern, text):
            entities.append(ExtractedEntity(
                type="EMAIL",
                value=match.group(0),
                confidence=0.95,
                location={"start": match.start(), "end": match.end()},
                context=text[max(0, match.start()-30):min(len(text), match.end()+30)]
            ))
        
        # Phone numbers
        phone_pattern = r'(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}'
        for match in re.finditer(phone_pattern, text):
            entities.append(ExtractedEntity(
                type="PHONE",
                value=match.group(0),
                confidence=0.85,
                location={"start": match.start(), "end": match.end()},
                context=text[max(0, match.start()-30):min(len(text), match.end()+30)]
            ))
        
        # Contract/Reference numbers
        ref_pattern = r'\b(?:Contract|Agreement|Reference|Ref)[:\s#]+([A-Z0-9-]+)\b'
        for match in re.finditer(ref_pattern, text, re.IGNORECASE):
            entities.append(ExtractedEntity(
                type="REFERENCE",
                value=match.group(1),
                confidence=0.9,
                location={"start": match.start(), "end": match.end()},
                context=text[max(0, match.start()-30):min(len(text), match.end()+30)]
            ))
        
        # Addresses (simplified)
        address_pattern = r'\d+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Place|Pl)'
        for match in re.finditer(address_pattern, text):
            entities.append(ExtractedEntity(
                type="ADDRESS",
                value=match.group(0),
                confidence=0.75,
                location={"start": match.start(), "end": match.end()},
                context=text[max(0, match.start()-50):min(len(text), match.end()+50)]
            ))
        
        return entities