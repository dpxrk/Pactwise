"""Supplier Matching using AI/ML"""

import json
import re
from typing import Dict, List, Optional
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np


class SupplierMatcher:
    """AI-powered supplier matching engine"""
    
    def __init__(self):
        self.vectorizer = TfidfVectorizer(
            max_features=100,
            stop_words='english',
            ngram_range=(1, 2)
        )
        
        # Keywords for different aspects
        self.quality_keywords = [
            "ISO", "certified", "quality", "premium", "reliable",
            "tested", "verified", "guaranteed", "warranty"
        ]
        
        self.capability_keywords = [
            "manufacture", "produce", "supply", "deliver", "stock",
            "inventory", "capacity", "volume", "scale"
        ]
        
        self.compliance_keywords = [
            "compliant", "regulation", "standard", "audit", "certified",
            "approved", "licensed", "registered"
        ]
    
    async def calculate_match_score(
        self,
        supplier: Dict,
        specifications: str
    ) -> float:
        """Calculate match score between supplier and specifications"""
        try:
            # Prepare supplier text representation
            supplier_text = self._prepare_supplier_text(supplier)
            
            # Calculate different matching aspects
            semantic_score = self._calculate_semantic_similarity(
                supplier_text, specifications
            )
            
            category_score = self._calculate_category_match(
                supplier.get("categories", []),
                specifications
            )
            
            capability_score = self._calculate_capability_score(
                supplier_text, specifications
            )
            
            quality_score = self._calculate_quality_score(supplier)
            
            # Weighted combination
            weights = {
                "semantic": 0.35,
                "category": 0.25,
                "capability": 0.25,
                "quality": 0.15
            }
            
            final_score = (
                semantic_score * weights["semantic"] +
                category_score * weights["category"] +
                capability_score * weights["capability"] +
                quality_score * weights["quality"]
            )
            
            return min(final_score, 1.0)
            
        except Exception as e:
            # Return neutral score on error
            return 0.5
    
    def _prepare_supplier_text(self, supplier: Dict) -> str:
        """Prepare text representation of supplier"""
        components = []
        
        # Add supplier name and description
        if supplier.get("name"):
            components.append(supplier["name"])
        
        if supplier.get("description"):
            components.append(supplier["description"])
        
        # Add categories
        if supplier.get("categories"):
            if isinstance(supplier["categories"], list):
                components.extend(supplier["categories"])
            else:
                components.append(str(supplier["categories"]))
        
        # Add capabilities
        if supplier.get("capabilities"):
            components.append(supplier["capabilities"])
        
        # Add certifications
        if supplier.get("certifications"):
            if isinstance(supplier["certifications"], list):
                components.extend(supplier["certifications"])
            else:
                components.append(str(supplier["certifications"]))
        
        # Add products/services
        if supplier.get("products"):
            components.append(supplier["products"])
        
        if supplier.get("services"):
            components.append(supplier["services"])
        
        return " ".join(str(c) for c in components)
    
    def _calculate_semantic_similarity(
        self,
        supplier_text: str,
        specifications: str
    ) -> float:
        """Calculate semantic similarity using TF-IDF"""
        try:
            if not supplier_text or not specifications:
                return 0.0
            
            # Combine texts for vectorization
            documents = [supplier_text.lower(), specifications.lower()]
            
            # Vectorize
            tfidf_matrix = self.vectorizer.fit_transform(documents)
            
            # Calculate cosine similarity
            similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
            
            return float(similarity)
            
        except Exception:
            return 0.0
    
    def _calculate_category_match(
        self,
        supplier_categories: List,
        specifications: str
    ) -> float:
        """Calculate category match score"""
        if not supplier_categories:
            return 0.0
        
        spec_lower = specifications.lower()
        matches = 0
        
        for category in supplier_categories:
            if isinstance(category, str):
                # Check if category appears in specifications
                category_words = category.lower().split()
                for word in category_words:
                    if len(word) > 3 and word in spec_lower:
                        matches += 1
                        break
        
        # Normalize score
        return min(matches / max(len(supplier_categories), 1), 1.0)
    
    def _calculate_capability_score(
        self,
        supplier_text: str,
        specifications: str
    ) -> float:
        """Calculate capability matching score"""
        supplier_lower = supplier_text.lower()
        spec_lower = specifications.lower()
        
        # Extract key requirements from specifications
        requirements = self._extract_requirements(spec_lower)
        
        if not requirements:
            # No specific requirements found, check general capability keywords
            keyword_matches = sum(
                1 for keyword in self.capability_keywords
                if keyword in supplier_lower
            )
            return min(keyword_matches / len(self.capability_keywords), 1.0)
        
        # Check how many requirements are mentioned in supplier text
        matched_requirements = sum(
            1 for req in requirements
            if self._requirement_mentioned(req, supplier_lower)
        )
        
        return matched_requirements / len(requirements)
    
    def _extract_requirements(self, text: str) -> List[str]:
        """Extract key requirements from specifications"""
        requirements = []
        
        # Pattern for quantities (e.g., "1000 units", "500kg")
        quantity_pattern = r'\d+\s*(?:units?|pcs?|pieces?|kg|tons?|liters?)'
        requirements.extend(re.findall(quantity_pattern, text))
        
        # Pattern for materials
        material_pattern = r'(?:steel|aluminum|plastic|cotton|wood|metal|fabric)'
        requirements.extend(re.findall(material_pattern, text))
        
        # Pattern for standards
        standard_pattern = r'(?:ISO|CE|UL|ANSI|ASTM|DIN)\s*\d*'
        requirements.extend(re.findall(standard_pattern, text))
        
        # Pattern for specifications (e.g., "5mm thick", "grade A")
        spec_pattern = r'\d+\s*(?:mm|cm|m|inch|inches|grade\s+\w+)'
        requirements.extend(re.findall(spec_pattern, text))
        
        return requirements
    
    def _requirement_mentioned(self, requirement: str, supplier_text: str) -> bool:
        """Check if requirement is mentioned in supplier text"""
        # Normalize requirement
        req_words = requirement.lower().split()
        
        # Check if all significant words appear in supplier text
        significant_words = [w for w in req_words if len(w) > 2]
        
        if not significant_words:
            return False
        
        matches = sum(1 for word in significant_words if word in supplier_text)
        
        # Consider it a match if at least 70% of words are found
        return matches >= len(significant_words) * 0.7
    
    def _calculate_quality_score(self, supplier: Dict) -> float:
        """Calculate quality score based on supplier attributes"""
        score_components = []
        
        # Check for quality certifications
        certifications = supplier.get("certifications", [])
        if certifications:
            if isinstance(certifications, list):
                cert_text = " ".join(certifications).lower()
            else:
                cert_text = str(certifications).lower()
            
            quality_cert_score = sum(
                1 for keyword in self.quality_keywords
                if keyword in cert_text
            ) / len(self.quality_keywords)
            score_components.append(quality_cert_score)
        
        # Check ratings if available
        if supplier.get("rating") is not None:
            # Normalize rating to 0-1 scale
            rating = float(supplier["rating"])
            if rating <= 5:  # Assume 5-star scale
                score_components.append(rating / 5)
            elif rating <= 100:  # Assume percentage
                score_components.append(rating / 100)
        
        # Check on-time delivery rate
        if supplier.get("on_time_delivery") is not None:
            score_components.append(float(supplier["on_time_delivery"]))
        
        # Return average of available scores
        if score_components:
            return sum(score_components) / len(score_components)
        
        # Default score if no quality indicators
        return 0.5
    
    def extract_supplier_keywords(self, supplier: Dict) -> List[str]:
        """Extract key keywords from supplier for indexing"""
        keywords = []
        
        # Extract from name
        if supplier.get("name"):
            keywords.extend(supplier["name"].lower().split())
        
        # Extract from categories
        if supplier.get("categories"):
            if isinstance(supplier["categories"], list):
                for cat in supplier["categories"]:
                    keywords.extend(str(cat).lower().split())
        
        # Extract from description
        if supplier.get("description"):
            # Get most important words using TF-IDF
            try:
                vectorizer = TfidfVectorizer(max_features=10, stop_words='english')
                vectorizer.fit([supplier["description"]])
                keywords.extend(vectorizer.get_feature_names_out())
            except:
                pass
        
        # Remove duplicates and short words
        keywords = list(set(k for k in keywords if len(k) > 3))
        
        return keywords[:20]  # Limit to top 20 keywords