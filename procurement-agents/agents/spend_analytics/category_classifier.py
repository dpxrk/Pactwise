"""AI-powered category classifier for spend transactions"""

import re
from typing import Dict, List, Any, Optional
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
import joblib
import asyncio

from utils.logging_config import get_logger
from utils.cache import CacheManager
from utils.common import normalize_string


class CategoryClassifier:
    """Classify transactions into spend categories using ML"""
    
    def __init__(self):
        self.logger = get_logger(__name__)
        self.cache = CacheManager()
        
        # Category mapping rules
        self.category_rules = {
            "IT Software": [
                "software", "saas", "license", "subscription", "cloud",
                "microsoft", "adobe", "salesforce", "aws", "azure"
            ],
            "IT Hardware": [
                "computer", "laptop", "server", "hardware", "monitor",
                "keyboard", "mouse", "printer", "scanner", "dell", "hp", "lenovo"
            ],
            "Office Supplies": [
                "paper", "pen", "pencil", "stapler", "folder", "binder",
                "envelope", "tape", "staples", "office depot", "stationery"
            ],
            "Travel": [
                "flight", "hotel", "airline", "travel", "lodging", "uber",
                "lyft", "taxi", "rental car", "airfare", "marriott", "hilton"
            ],
            "Professional Services": [
                "consulting", "legal", "accounting", "audit", "advisory",
                "contractor", "freelance", "agency", "deloitte", "pwc", "ey"
            ],
            "Marketing": [
                "advertising", "marketing", "campaign", "promotion", "media",
                "google ads", "facebook", "linkedin", "billboard", "sponsorship"
            ],
            "Facilities": [
                "rent", "lease", "utilities", "electricity", "water", "gas",
                "maintenance", "cleaning", "security", "hvac", "facility"
            ],
            "Telecommunications": [
                "phone", "internet", "mobile", "cellular", "telecom",
                "verizon", "at&t", "comcast", "bandwidth", "voip"
            ],
            "HR Services": [
                "recruitment", "training", "benefits", "payroll", "insurance",
                "health", "dental", "vision", "401k", "adp", "workday"
            ],
            "Logistics": [
                "shipping", "freight", "delivery", "courier", "fedex",
                "ups", "dhl", "warehouse", "storage", "fulfillment"
            ],
            "Raw Materials": [
                "steel", "aluminum", "plastic", "wood", "fabric", "chemical",
                "component", "part", "material", "commodity"
            ],
            "MRO": [
                "maintenance", "repair", "operations", "tool", "equipment",
                "safety", "ppe", "gloves", "helmet", "uniform"
            ]
        }
        
        # Build keyword index for faster matching
        self.keyword_index = self._build_keyword_index()
        
        # ML model placeholders (would be loaded from trained models)
        self.vectorizer = None
        self.classifier = None
        
        # Try to load pre-trained model
        self._load_model()
    
    def _build_keyword_index(self) -> Dict[str, List[str]]:
        """Build inverted index of keywords to categories"""
        index = {}
        for category, keywords in self.category_rules.items():
            for keyword in keywords:
                if keyword not in index:
                    index[keyword] = []
                index[keyword].append(category)
        return index
    
    def _load_model(self):
        """Load pre-trained classification model"""
        try:
            # In production, load from file
            # self.vectorizer = joblib.load('models/category_vectorizer.pkl')
            # self.classifier = joblib.load('models/category_classifier.pkl')
            pass
        except Exception as e:
            self.logger.warning(f"Could not load pre-trained model: {e}")
    
    async def classify_batch(self, transactions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Classify a batch of transactions"""
        results = []
        
        for trans in transactions:
            classification = await self.classify_single(trans)
            trans.update(classification)
            results.append(trans)
        
        return results
    
    async def classify_single(self, transaction: Dict[str, Any]) -> Dict[str, Any]:
        """Classify a single transaction"""
        
        # Check cache first
        cache_key = f"category:{transaction.get('vendor_name', '')}:{transaction.get('description', '')}"
        cached = await self.cache.get(cache_key)
        if cached:
            return cached
        
        # Combine relevant text fields
        text_parts = [
            transaction.get('vendor_name', ''),
            transaction.get('description', ''),
            transaction.get('item_description', ''),
            transaction.get('gl_account', '')
        ]
        text = ' '.join(filter(None, text_parts)).lower()
        
        # Try rule-based classification first
        category, confidence = self._classify_by_rules(text)
        
        # If rule-based classification is not confident, try ML
        if confidence < 0.7 and self.classifier:
            ml_category, ml_confidence = self._classify_by_ml(text)
            if ml_confidence > confidence:
                category = ml_category
                confidence = ml_confidence
        
        # Default to uncategorized if confidence is too low
        if confidence < 0.5:
            category = "Uncategorized"
            confidence = 0.0
        
        result = {
            "category": category,
            "confidence": confidence,
            "method": "rule-based" if confidence >= 0.7 else "ml"
        }
        
        # Cache the result
        await self.cache.set(cache_key, result, ttl=86400)  # 24 hours
        
        return result
    
    def _classify_by_rules(self, text: str) -> tuple[str, float]:
        """Classify using keyword rules"""
        text = normalize_string(text)
        scores = {}
        
        # Calculate scores for each category
        for category, keywords in self.category_rules.items():
            score = 0
            matched_keywords = 0
            
            for keyword in keywords:
                if keyword in text:
                    # Weight by keyword specificity
                    weight = 1.0 / len(self.keyword_index.get(keyword, [category]))
                    score += weight
                    matched_keywords += 1
            
            if matched_keywords > 0:
                # Normalize by number of keywords
                scores[category] = score / len(keywords)
        
        if not scores:
            return "Uncategorized", 0.0
        
        # Get best category
        best_category = max(scores, key=scores.get)
        confidence = min(scores[best_category], 1.0)
        
        # Boost confidence if multiple keywords match
        matched_count = sum(1 for kw in self.category_rules[best_category] if kw in text)
        if matched_count >= 3:
            confidence = min(confidence * 1.2, 1.0)
        
        return best_category, confidence
    
    def _classify_by_ml(self, text: str) -> tuple[str, float]:
        """Classify using machine learning model"""
        if not self.classifier or not self.vectorizer:
            return "Uncategorized", 0.0
        
        try:
            # Vectorize text
            X = self.vectorizer.transform([text])
            
            # Get prediction and probability
            prediction = self.classifier.predict(X)[0]
            probabilities = self.classifier.predict_proba(X)[0]
            confidence = max(probabilities)
            
            return prediction, confidence
            
        except Exception as e:
            self.logger.error(f"ML classification error: {e}")
            return "Uncategorized", 0.0
    
    async def train_model(self, training_data: List[Dict[str, Any]]):
        """Train or update the classification model"""
        if not training_data:
            return
        
        # Prepare training data
        texts = []
        labels = []
        
        for item in training_data:
            text = ' '.join([
                item.get('vendor_name', ''),
                item.get('description', ''),
                item.get('item_description', '')
            ])
            texts.append(text)
            labels.append(item['category'])
        
        # Create and train vectorizer
        self.vectorizer = TfidfVectorizer(
            max_features=1000,
            ngram_range=(1, 2),
            stop_words='english'
        )
        X = self.vectorizer.fit_transform(texts)
        
        # Train classifier
        self.classifier = MultinomialNB()
        self.classifier.fit(X, labels)
        
        self.logger.info("Category classification model trained")
        
        # Save model (in production)
        # joblib.dump(self.vectorizer, 'models/category_vectorizer.pkl')
        # joblib.dump(self.classifier, 'models/category_classifier.pkl')
    
    async def suggest_new_categories(self, uncategorized_items: List[Dict[str, Any]]) -> List[str]:
        """Suggest new categories based on uncategorized items"""
        if not uncategorized_items:
            return []
        
        # Extract common terms from uncategorized items
        all_text = ' '.join([
            f"{item.get('vendor_name', '')} {item.get('description', '')}"
            for item in uncategorized_items
        ])
        
        # Simple frequency-based approach
        words = all_text.lower().split()
        word_freq = {}
        
        for word in words:
            # Filter out common words and short words
            if len(word) > 4 and word not in ['the', 'and', 'for', 'with']:
                word_freq[word] = word_freq.get(word, 0) + 1
        
        # Get top terms that might represent new categories
        sorted_terms = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)
        suggestions = []
        
        for term, freq in sorted_terms[:10]:
            if freq >= 3:  # Appears at least 3 times
                # Check if term is not already in existing categories
                if not any(term in ' '.join(keywords).lower() 
                          for keywords in self.category_rules.values()):
                    suggestions.append(term.title())
        
        return suggestions[:5]  # Return top 5 suggestions
    
    def get_category_hierarchy(self) -> Dict[str, List[str]]:
        """Get hierarchical structure of categories"""
        hierarchy = {
            "Direct": ["Raw Materials", "MRO", "Office Supplies"],
            "Indirect": {
                "Technology": ["IT Software", "IT Hardware", "Telecommunications"],
                "Services": ["Professional Services", "HR Services", "Marketing"],
                "Operations": ["Facilities", "Logistics", "Travel"]
            }
        }
        return hierarchy
    
    def get_category_mapping_rules(self) -> Dict[str, List[str]]:
        """Get current category mapping rules"""
        return self.category_rules.copy()
    
    def add_category_rule(self, category: str, keywords: List[str]):
        """Add or update category rule"""
        if category not in self.category_rules:
            self.category_rules[category] = []
        
        # Add new keywords
        for keyword in keywords:
            if keyword not in self.category_rules[category]:
                self.category_rules[category].append(keyword.lower())
        
        # Rebuild index
        self.keyword_index = self._build_keyword_index()
        
        self.logger.info(f"Updated category rules for {category}")
    
    async def validate_categorization(self, transaction: Dict[str, Any], 
                                     suggested_category: str) -> bool:
        """Validate if a categorization makes sense"""
        
        # Check if category exists
        if suggested_category not in self.category_rules:
            return False
        
        # Check if any keywords match
        text = f"{transaction.get('vendor_name', '')} {transaction.get('description', '')}".lower()
        keywords = self.category_rules[suggested_category]
        
        return any(keyword in text for keyword in keywords)