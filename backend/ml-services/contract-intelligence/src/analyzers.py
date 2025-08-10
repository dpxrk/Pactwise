"""
Contract Analyzer - Core analysis engine using transformer models.
"""

import logging
from typing import List, Dict, Any, Optional
import numpy as np
from dataclasses import dataclass

try:
    from transformers import (
        AutoTokenizer,
        AutoModelForSequenceClassification,
        AutoModelForTokenClassification,
        pipeline
    )
    import torch
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False
    logging.warning("Transformers not available, using fallback methods")

try:
    from sentence_transformers import SentenceTransformer
    SENTENCE_TRANSFORMERS_AVAILABLE = True
except ImportError:
    SENTENCE_TRANSFORMERS_AVAILABLE = False
    logging.warning("Sentence transformers not available")

logger = logging.getLogger(__name__)


@dataclass
class AnalysisResult:
    """Container for analysis results."""
    classification: str
    confidence: float
    features: Dict[str, Any]
    embeddings: Optional[np.ndarray] = None


class ContractAnalyzer:
    """
    Advanced contract analysis using transformer models.
    Falls back to rule-based analysis if models are not available.
    """
    
    def __init__(self, model_path: Optional[str] = None):
        """Initialize the contract analyzer."""
        self.model_path = model_path
        self.tokenizer = None
        self.model = None
        self.sentence_encoder = None
        self.classifier = None
        
        self._initialize_models()
    
    def _initialize_models(self):
        """Initialize ML models if available."""
        if TRANSFORMERS_AVAILABLE:
            try:
                # Try to load Legal-BERT or fall back to standard BERT
                model_name = self.model_path or "nlpaueb/legal-bert-base-uncased"
                try:
                    self.tokenizer = AutoTokenizer.from_pretrained(model_name)
                    self.model = AutoModelForSequenceClassification.from_pretrained(
                        model_name,
                        num_labels=5  # Risk levels: minimal, low, medium, high, critical
                    )
                    logger.info(f"Loaded model: {model_name}")
                except Exception:
                    # Fallback to standard BERT
                    model_name = "bert-base-uncased"
                    self.tokenizer = AutoTokenizer.from_pretrained(model_name)
                    self.model = AutoModelForSequenceClassification.from_pretrained(
                        model_name,
                        num_labels=5
                    )
                    logger.info(f"Loaded fallback model: {model_name}")
                
                # Create classifier pipeline
                self.classifier = pipeline(
                    "text-classification",
                    model=self.model,
                    tokenizer=self.tokenizer,
                    device=-1  # CPU, use 0 for GPU
                )
                
            except Exception as e:
                logger.error(f"Failed to load transformer models: {e}")
                self.classifier = None
        
        if SENTENCE_TRANSFORMERS_AVAILABLE:
            try:
                # Load sentence encoder for similarity and embeddings
                self.sentence_encoder = SentenceTransformer('all-MiniLM-L6-v2')
                logger.info("Loaded sentence encoder")
            except Exception as e:
                logger.error(f"Failed to load sentence encoder: {e}")
                self.sentence_encoder = None
    
    async def analyze(self, text: str) -> AnalysisResult:
        """
        Perform comprehensive contract analysis.
        
        Args:
            text: Contract text to analyze
            
        Returns:
            AnalysisResult with classification, confidence, and features
        """
        features = await self._extract_features(text)
        
        # Use transformer model if available
        if self.classifier:
            try:
                results = self.classifier(text[:512])  # BERT max length
                classification = results[0]['label']
                confidence = results[0]['score']
            except Exception as e:
                logger.error(f"Classification failed: {e}")
                classification, confidence = self._rule_based_classification(features)
        else:
            classification, confidence = self._rule_based_classification(features)
        
        # Generate embeddings if encoder is available
        embeddings = None
        if self.sentence_encoder:
            try:
                embeddings = self.sentence_encoder.encode(text[:1000])
            except Exception as e:
                logger.error(f"Embedding generation failed: {e}")
        
        return AnalysisResult(
            classification=classification,
            confidence=confidence,
            features=features,
            embeddings=embeddings
        )
    
    async def _extract_features(self, text: str) -> Dict[str, Any]:
        """Extract features from contract text."""
        features = {
            "length": len(text),
            "num_sentences": text.count('.') + text.count('!') + text.count('?'),
            "num_paragraphs": text.count('\n\n') + 1,
            "has_monetary_values": self._has_monetary_values(text),
            "has_dates": self._has_dates(text),
            "has_obligations": self._has_obligations(text),
            "has_penalties": self._has_penalties(text),
            "has_termination": self._has_termination(text),
            "complexity_score": self._calculate_complexity(text)
        }
        
        # Extract key terms frequency
        key_terms = [
            "shall", "must", "liability", "indemnify", "warranty",
            "termination", "confidential", "payment", "delivery"
        ]
        
        text_lower = text.lower()
        for term in key_terms:
            features[f"term_{term}"] = text_lower.count(term)
        
        return features
    
    def _rule_based_classification(self, features: Dict[str, Any]) -> tuple:
        """
        Fallback rule-based classification.
        
        Returns:
            Tuple of (classification, confidence)
        """
        risk_score = 0
        
        # Calculate risk based on features
        if features.get("has_penalties"):
            risk_score += 20
        if features.get("term_liability", 0) > 3:
            risk_score += 15
        if features.get("term_indemnify", 0) > 2:
            risk_score += 15
        if not features.get("has_termination"):
            risk_score += 10
        if features.get("complexity_score", 0) > 0.7:
            risk_score += 10
        
        # Determine classification
        if risk_score >= 60:
            return "CRITICAL_RISK", 0.7
        elif risk_score >= 45:
            return "HIGH_RISK", 0.75
        elif risk_score >= 30:
            return "MEDIUM_RISK", 0.8
        elif risk_score >= 15:
            return "LOW_RISK", 0.85
        else:
            return "MINIMAL_RISK", 0.9
    
    def _has_monetary_values(self, text: str) -> bool:
        """Check if text contains monetary values."""
        import re
        pattern = r'\$[\d,]+(\.\d{2})?|\d+\s*(USD|EUR|GBP|dollars?|euros?|pounds?)'
        return bool(re.search(pattern, text, re.IGNORECASE))
    
    def _has_dates(self, text: str) -> bool:
        """Check if text contains dates."""
        import re
        pattern = r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2}|january|february|march|april|may|june|july|august|september|october|november|december'
        return bool(re.search(pattern, text, re.IGNORECASE))
    
    def _has_obligations(self, text: str) -> bool:
        """Check if text contains obligations."""
        obligation_terms = ["shall", "must", "will", "agrees to", "undertakes", "commits"]
        text_lower = text.lower()
        return any(term in text_lower for term in obligation_terms)
    
    def _has_penalties(self, text: str) -> bool:
        """Check if text contains penalty clauses."""
        penalty_terms = ["penalty", "penalties", "fine", "liquidated damages", "breach"]
        text_lower = text.lower()
        return any(term in text_lower for term in penalty_terms)
    
    def _has_termination(self, text: str) -> bool:
        """Check if text contains termination clauses."""
        termination_terms = ["terminat", "cancel", "expir", "end of term"]
        text_lower = text.lower()
        return any(term in text_lower for term in termination_terms)
    
    def _calculate_complexity(self, text: str) -> float:
        """
        Calculate text complexity score (0-1).
        Based on sentence length, vocabulary diversity, and structure.
        """
        sentences = text.split('.')
        if not sentences:
            return 0.0
        
        # Average sentence length
        avg_sentence_length = np.mean([len(s.split()) for s in sentences if s.strip()])
        
        # Vocabulary diversity (unique words / total words)
        words = text.lower().split()
        vocabulary_diversity = len(set(words)) / len(words) if words else 0
        
        # Structural complexity (based on nested clauses)
        nested_indicators = text.count('(') + text.count(';') + text.count(',')
        structural_complexity = min(1.0, nested_indicators / 100)
        
        # Combine metrics
        complexity = (
            min(1.0, avg_sentence_length / 50) * 0.3 +
            vocabulary_diversity * 0.4 +
            structural_complexity * 0.3
        )
        
        return complexity
    
    def compare_contracts(self, contract1: str, contract2: str) -> Dict[str, Any]:
        """
        Compare two contracts for similarity and differences.
        
        Args:
            contract1: First contract text
            contract2: Second contract text
            
        Returns:
            Dictionary with similarity metrics and key differences
        """
        if self.sentence_encoder:
            # Use embeddings for semantic similarity
            emb1 = self.sentence_encoder.encode(contract1[:1000])
            emb2 = self.sentence_encoder.encode(contract2[:1000])
            
            # Cosine similarity
            from sklearn.metrics.pairwise import cosine_similarity
            similarity = cosine_similarity([emb1], [emb2])[0][0]
        else:
            # Fallback to simple text similarity
            from difflib import SequenceMatcher
            similarity = SequenceMatcher(None, contract1, contract2).ratio()
        
        return {
            "similarity_score": float(similarity),
            "is_similar": similarity > 0.8,
            "recommendation": "High similarity detected" if similarity > 0.8 else "Contracts are substantially different"
        }