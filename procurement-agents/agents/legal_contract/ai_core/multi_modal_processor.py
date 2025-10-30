"""
Multi-Modal Processing for Contract Analysis
Handles text, images, audio, and video inputs
"""

import io
import base64
import asyncio
from typing import Dict, List, Any, Optional, Union, Tuple
from enum import Enum
from PIL import Image
import numpy as np
from dataclasses import dataclass
import json
import hashlib
from datetime import datetime


class InputModality(Enum):
    """Types of input modalities"""
    TEXT = "text"
    IMAGE = "image"
    PDF = "pdf"
    AUDIO = "audio"
    VIDEO = "video"
    HANDWRITTEN = "handwritten"
    SCAN = "scan"
    SCREENSHOT = "screenshot"


class ProcessingQuality(Enum):
    """Processing quality levels"""
    DRAFT = "draft"      # Fast, lower quality
    STANDARD = "standard"  # Balanced
    HIGH = "high"        # High quality
    FORENSIC = "forensic"  # Maximum quality


@dataclass
class MultiModalInput:
    """Container for multi-modal input"""
    modality: InputModality
    data: Union[str, bytes, np.ndarray]
    metadata: Dict[str, Any]
    quality_required: ProcessingQuality = ProcessingQuality.STANDARD
    

@dataclass
class ProcessedDocument:
    """Processed document with extracted content"""
    text: str
    confidence: float
    metadata: Dict[str, Any]
    extracted_elements: List[Dict]
    warnings: List[str]
    processing_time: float


class MultiModalProcessor:
    """
    State-of-the-art multi-modal processor for contract documents
    Handles various input types and extracts structured information
    """
    
    def __init__(self, use_gpu: bool = True):
        """
        Initialize multi-modal processor
        
        Args:
            use_gpu: Whether to use GPU acceleration
        """
        self.use_gpu = use_gpu
        self.cache = {}
        
        # Initialize processors (mock mode for now)
        self.ocr_engine = self._init_ocr_engine()
        self.audio_processor = self._init_audio_processor()
        self.video_processor = self._init_video_processor()
        self.image_enhancer = self._init_image_enhancer()
    
    def _init_ocr_engine(self):
        """Initialize OCR engine"""
        # In production, would use Tesseract, Google Vision, or Azure OCR
        return {"initialized": True, "engine": "mock_ocr"}
    
    def _init_audio_processor(self):
        """Initialize audio transcription"""
        # In production, would use Whisper, Google Speech, or Azure Speech
        return {"initialized": True, "engine": "mock_audio"}
    
    def _init_video_processor(self):
        """Initialize video processing"""
        # In production, would use OpenCV + transcription
        return {"initialized": True, "engine": "mock_video"}
    
    def _init_image_enhancer(self):
        """Initialize image enhancement"""
        # In production, would use CV2 + deep learning models
        return {"initialized": True, "engine": "mock_enhancer"}
    
    async def process_multi_modal_input(
        self,
        inputs: List[MultiModalInput],
        merge_strategy: str = "sequential",
        context: Optional[Dict] = None
    ) -> ProcessedDocument:
        """
        Process multi-modal inputs and extract contract text
        
        Args:
            inputs: List of multi-modal inputs
            merge_strategy: How to merge multiple inputs
            context: Additional context for processing
        
        Returns:
            ProcessedDocument with extracted content
        """
        
        start_time = datetime.now()
        processed_texts = []
        all_metadata = {}
        all_elements = []
        warnings = []
        
        # Process each input
        for input_item in inputs:
            try:
                if input_item.modality == InputModality.TEXT:
                    result = await self._process_text(input_item)
                elif input_item.modality == InputModality.IMAGE:
                    result = await self._process_image(input_item)
                elif input_item.modality == InputModality.PDF:
                    result = await self._process_pdf(input_item)
                elif input_item.modality == InputModality.AUDIO:
                    result = await self._process_audio(input_item)
                elif input_item.modality == InputModality.VIDEO:
                    result = await self._process_video(input_item)
                elif input_item.modality == InputModality.HANDWRITTEN:
                    result = await self._process_handwritten(input_item)
                elif input_item.modality == InputModality.SCAN:
                    result = await self._process_scan(input_item)
                elif input_item.modality == InputModality.SCREENSHOT:
                    result = await self._process_screenshot(input_item)
                else:
                    warnings.append(f"Unsupported modality: {input_item.modality}")
                    continue
                
                processed_texts.append(result["text"])
                all_metadata.update(result.get("metadata", {}))
                all_elements.extend(result.get("elements", []))
                warnings.extend(result.get("warnings", []))
                
            except Exception as e:
                warnings.append(f"Error processing {input_item.modality}: {str(e)}")
        
        # Merge processed texts
        merged_text = self._merge_texts(processed_texts, merge_strategy)
        
        # Calculate overall confidence
        confidence = self._calculate_confidence(processed_texts, warnings)
        
        # Extract structured elements
        elements = await self._extract_structured_elements(merged_text, all_elements)
        
        processing_time = (datetime.now() - start_time).total_seconds()
        
        return ProcessedDocument(
            text=merged_text,
            confidence=confidence,
            metadata=all_metadata,
            extracted_elements=elements,
            warnings=warnings,
            processing_time=processing_time
        )
    
    async def _process_text(self, input_item: MultiModalInput) -> Dict:
        """Process text input"""
        return {
            "text": input_item.data if isinstance(input_item.data, str) else str(input_item.data),
            "metadata": {"source": "direct_text"},
            "elements": [],
            "warnings": []
        }
    
    async def _process_image(self, input_item: MultiModalInput) -> Dict:
        """Process image input with OCR"""
        
        # Mock OCR for demonstration
        mock_text = self._generate_mock_ocr_text(input_item.metadata.get("filename", "contract.jpg"))
        
        # In production, would use:
        # 1. Image preprocessing (denoise, deskew, binarization)
        # 2. Text detection (EAST, CRAFT)
        # 3. Text recognition (Tesseract, PaddleOCR)
        # 4. Layout analysis (LayoutLM, DocTR)
        
        return {
            "text": mock_text,
            "metadata": {
                "source": "ocr",
                "image_quality": self._assess_image_quality(input_item.data),
                "detected_language": "en",
                "layout_type": "contract_document"
            },
            "elements": [
                {"type": "header", "text": "MASTER SERVICE AGREEMENT", "confidence": 0.95},
                {"type": "party", "text": "Acme Corporation", "confidence": 0.92},
                {"type": "date", "text": "January 15, 2024", "confidence": 0.88},
                {"type": "signature_block", "detected": True, "signed": True}
            ],
            "warnings": []
        }
    
    async def _process_pdf(self, input_item: MultiModalInput) -> Dict:
        """Process PDF with text extraction and OCR fallback"""
        
        # Mock PDF extraction
        mock_text = self._generate_mock_contract_text()
        
        # In production, would use:
        # 1. PyPDF2/pdfplumber for text extraction
        # 2. OCR for image-based PDFs
        # 3. Table extraction (Camelot, Tabula)
        # 4. Form field extraction
        
        return {
            "text": mock_text,
            "metadata": {
                "source": "pdf_extraction",
                "pages": 15,
                "has_images": True,
                "has_forms": False,
                "is_searchable": True
            },
            "elements": [
                {"type": "table", "title": "Payment Schedule", "rows": 5, "columns": 4},
                {"type": "clause", "number": "4.1", "title": "Payment Terms"},
                {"type": "clause", "number": "7.2", "title": "Liability Limitation"}
            ],
            "warnings": []
        }
    
    async def _process_audio(self, input_item: MultiModalInput) -> Dict:
        """Process audio negotiation recording"""
        
        # Mock transcription
        mock_transcript = self._generate_mock_negotiation_transcript()
        
        # In production, would use:
        # 1. Whisper/Google Speech for transcription
        # 2. Speaker diarization
        # 3. Emotion detection
        # 4. Key moment extraction
        
        return {
            "text": mock_transcript,
            "metadata": {
                "source": "audio_transcription",
                "duration_seconds": 1800,
                "speakers_detected": 3,
                "language": "en",
                "audio_quality": "good"
            },
            "elements": [
                {"type": "negotiation_point", "text": "We need the liability cap at 12 months", "speaker": 1, "timestamp": 245},
                {"type": "agreement", "text": "Agreed on Net 45 payment terms", "speaker": 2, "timestamp": 567},
                {"type": "concern", "text": "The termination clause needs review", "speaker": 1, "timestamp": 890}
            ],
            "warnings": ["Some audio segments had background noise"]
        }
    
    async def _process_video(self, input_item: MultiModalInput) -> Dict:
        """Process video negotiation or contract review"""
        
        # Mock video processing
        mock_analysis = self._generate_mock_video_analysis()
        
        # In production, would use:
        # 1. Video frame extraction
        # 2. OCR on relevant frames
        # 3. Audio transcription
        # 4. Body language analysis
        # 5. Screen capture detection
        
        return {
            "text": mock_analysis["transcript"],
            "metadata": {
                "source": "video_analysis",
                "duration_seconds": 2400,
                "has_screen_share": True,
                "participants": 4,
                "sentiment_overall": "positive"
            },
            "elements": [
                {"type": "document_shown", "timestamp": 120, "content": "Section 5 - Warranties"},
                {"type": "verbal_agreement", "timestamp": 450, "content": "Confirm 30-day termination"},
                {"type": "body_language", "timestamp": 780, "sentiment": "hesitant", "topic": "pricing"}
            ],
            "warnings": []
        }
    
    async def _process_handwritten(self, input_item: MultiModalInput) -> Dict:
        """Process handwritten notes or amendments"""
        
        # Mock handwriting recognition
        mock_text = "Amendment 1: Payment terms changed to Net 60. Initial: JD"
        
        # In production, would use:
        # 1. Handwriting recognition (Google Vision, Azure)
        # 2. Signature detection and verification
        # 3. Annotation extraction
        
        return {
            "text": mock_text,
            "metadata": {
                "source": "handwriting_recognition",
                "confidence": 0.78,
                "detected_signatures": 2,
                "detected_initials": 3
            },
            "elements": [
                {"type": "handwritten_amendment", "text": mock_text, "confidence": 0.78},
                {"type": "initial", "location": "page_3", "identity": "JD"}
            ],
            "warnings": ["Handwriting confidence below 80%"]
        }
    
    async def _process_scan(self, input_item: MultiModalInput) -> Dict:
        """Process scanned documents with enhancement"""
        
        # Enhance scan quality first
        enhanced = await self._enhance_scan_quality(input_item.data)
        
        # Then process as image
        return await self._process_image(MultiModalInput(
            modality=InputModality.IMAGE,
            data=enhanced,
            metadata=input_item.metadata,
            quality_required=input_item.quality_required
        ))
    
    async def _process_screenshot(self, input_item: MultiModalInput) -> Dict:
        """Process screenshot of contract or negotiation"""
        
        # Mock screenshot processing
        return {
            "text": "Contract terms displayed in vendor portal: Payment Net 30, Auto-renewal enabled",
            "metadata": {
                "source": "screenshot",
                "application_detected": "Vendor Portal",
                "ui_elements_detected": ["form_fields", "buttons", "terms_text"]
            },
            "elements": [
                {"type": "ui_field", "label": "Payment Terms", "value": "Net 30"},
                {"type": "ui_checkbox", "label": "Auto-renewal", "checked": True}
            ],
            "warnings": []
        }
    
    async def _enhance_scan_quality(self, image_data: Union[bytes, np.ndarray]) -> np.ndarray:
        """Enhance scan quality using image processing"""
        
        # Mock enhancement
        # In production, would use:
        # 1. Denoising
        # 2. Deskewing
        # 3. Contrast adjustment
        # 4. Shadow removal
        # 5. Super-resolution (ESRGAN)
        
        return image_data  # Return as-is in mock mode
    
    def _merge_texts(self, texts: List[str], strategy: str) -> str:
        """Merge multiple text inputs"""
        
        if strategy == "sequential":
            return "\n\n".join(texts)
        elif strategy == "smart":
            # Smart merging would deduplicate and organize
            return self._smart_merge(texts)
        else:
            return "\n\n".join(texts)
    
    def _smart_merge(self, texts: List[str]) -> str:
        """Smart merging with deduplication and organization"""
        
        # Remove duplicates while preserving order
        seen = set()
        unique_texts = []
        
        for text in texts:
            text_hash = hashlib.md5(text.encode()).hexdigest()
            if text_hash not in seen:
                seen.add(text_hash)
                unique_texts.append(text)
        
        return "\n\n".join(unique_texts)
    
    def _calculate_confidence(self, texts: List[str], warnings: List[str]) -> float:
        """Calculate overall processing confidence"""
        
        base_confidence = 0.85
        
        # Reduce confidence for warnings
        warning_penalty = len(warnings) * 0.05
        
        # Increase confidence for multiple sources
        source_bonus = min(0.1, len(texts) * 0.02)
        
        return max(0.1, min(1.0, base_confidence - warning_penalty + source_bonus))
    
    async def _extract_structured_elements(self, text: str, detected_elements: List[Dict]) -> List[Dict]:
        """Extract structured elements from merged text"""
        
        elements = detected_elements.copy()
        
        # Extract additional elements from text
        elements.extend(self._extract_dates(text))
        elements.extend(self._extract_parties(text))
        elements.extend(self._extract_amounts(text))
        elements.extend(self._extract_clauses(text))
        
        return elements
    
    def _extract_dates(self, text: str) -> List[Dict]:
        """Extract dates from text"""
        import re
        
        dates = []
        date_pattern = r'\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\w+ \d{1,2}, \d{4})\b'
        
        for match in re.finditer(date_pattern, text):
            dates.append({
                "type": "date",
                "value": match.group(),
                "position": match.start()
            })
        
        return dates[:10]  # Limit to 10 dates
    
    def _extract_parties(self, text: str) -> List[Dict]:
        """Extract party names from text"""
        import re
        
        parties = []
        party_pattern = r'("([^"]+)"(?:\s+or\s+"[^"]+")?)\s+(?:means|refers to|shall mean)'
        
        for match in re.finditer(party_pattern, text, re.IGNORECASE):
            parties.append({
                "type": "party",
                "name": match.group(2),
                "position": match.start()
            })
        
        return parties
    
    def _extract_amounts(self, text: str) -> List[Dict]:
        """Extract monetary amounts from text"""
        import re
        
        amounts = []
        amount_pattern = r'\$[\d,]+(?:\.\d{2})?(?:\s+(?:USD|million|thousand))?'
        
        for match in re.finditer(amount_pattern, text, re.IGNORECASE):
            amounts.append({
                "type": "amount",
                "value": match.group(),
                "position": match.start()
            })
        
        return amounts[:20]  # Limit to 20 amounts
    
    def _extract_clauses(self, text: str) -> List[Dict]:
        """Extract clause references from text"""
        import re
        
        clauses = []
        clause_pattern = r'(?:Section|Clause|Article)\s+(\d+(?:\.\d+)*)'
        
        for match in re.finditer(clause_pattern, text, re.IGNORECASE):
            clauses.append({
                "type": "clause_reference",
                "number": match.group(1),
                "position": match.start()
            })
        
        return clauses
    
    def _assess_image_quality(self, image_data: Union[bytes, np.ndarray]) -> str:
        """Assess image quality"""
        
        # Mock quality assessment
        # In production, would check:
        # 1. Resolution
        # 2. Contrast
        # 3. Noise level
        # 4. Blur detection
        
        import random
        return random.choice(["excellent", "good", "fair", "poor"])
    
    def _generate_mock_ocr_text(self, filename: str) -> str:
        """Generate mock OCR text"""
        return f"""
MASTER SERVICE AGREEMENT

This Agreement is entered into as of January 15, 2024 ("Effective Date") by and between
Acme Corporation, a Delaware corporation ("Client") and Service Provider Inc., a California
corporation ("Provider").

1. SERVICES
Provider shall provide the professional services as described in Exhibit A.

2. PAYMENT TERMS
Client shall pay Provider within thirty (30) days of receipt of invoice.

3. TERM
This Agreement shall commence on the Effective Date and continue for one (1) year.
"""
    
    def _generate_mock_contract_text(self) -> str:
        """Generate mock contract text"""
        return """
SOFTWARE LICENSE AND SERVICES AGREEMENT

This Software License and Services Agreement ("Agreement") is entered into as of January 1, 2024
("Effective Date") by and between TechCorp Solutions, Inc., a Delaware corporation ("Vendor") 
and Enterprise Client, LLC, a New York limited liability company ("Client").

WHEREAS, Vendor desires to license certain software and provide related services to Client;
WHEREAS, Client desires to obtain such license and services from Vendor;

NOW, THEREFORE, in consideration of the mutual covenants and agreements contained herein,
the parties agree as follows:

1. DEFINITIONS
1.1 "Software" means the Vendor's proprietary software platform as described in Exhibit A.
1.2 "Services" means the implementation, support, and maintenance services described in Exhibit B.
1.3 "Fees" means the license fees and service fees set forth in Exhibit C.

2. LICENSE GRANT
2.1 Subject to the terms and conditions of this Agreement, Vendor hereby grants to Client a
non-exclusive, non-transferable license to use the Software during the Term.

3. PAYMENT TERMS
3.1 Client shall pay Vendor the Fees within forty-five (45) days of receipt of invoice.
3.2 Late payments shall accrue interest at the rate of 1.5% per month.

4. WARRANTIES
4.1 Vendor warrants that the Software shall perform substantially in accordance with the
specifications for a period of ninety (90) days from delivery.

5. LIMITATION OF LIABILITY
5.1 IN NO EVENT SHALL EITHER PARTY'S LIABILITY EXCEED THE FEES PAID IN THE TWELVE (12)
MONTHS PRECEDING THE CLAIM.

6. TERM AND TERMINATION
6.1 This Agreement shall continue for an initial term of three (3) years.
6.2 Either party may terminate for convenience with ninety (90) days written notice.

7. CONFIDENTIALITY
7.1 Each party shall maintain the confidentiality of the other party's Confidential Information.

8. GOVERNING LAW
8.1 This Agreement shall be governed by the laws of the State of New York.
"""
    
    def _generate_mock_negotiation_transcript(self) -> str:
        """Generate mock negotiation transcript"""
        return """
[Speaker 1 - Buyer]: Good morning everyone. Let's discuss the key terms of this agreement.

[Speaker 2 - Seller]: Good morning. We're prepared to discuss all aspects of the contract.

[Speaker 1 - Buyer]: First, regarding the payment terms, we need Net 60 rather than Net 30.

[Speaker 2 - Seller]: We can consider Net 45 as a compromise, given the contract value.

[Speaker 1 - Buyer]: That's acceptable. Now, about the liability cap - we need it set at 12 months of fees.

[Speaker 2 - Seller]: Our standard is 24 months, but we understand your position. Let's agree on 12 months.

[Speaker 1 - Buyer]: Excellent. For the termination clause, we need the right to terminate for convenience.

[Speaker 2 - Seller]: We can agree to that with 90 days notice and payment of outstanding fees.

[Speaker 1 - Buyer]: Agreed. Let's document these changes and move forward.
"""
    
    def _generate_mock_video_analysis(self) -> Dict:
        """Generate mock video analysis"""
        return {
            "transcript": """
[00:00:15] Screen share started - showing contract draft
[00:02:30] Participant 1: "Let's review Section 4 on warranties"
[00:05:45] Participant 2: "We need to adjust the liability terms here"
[00:08:20] Document scrolled to payment terms section
[00:12:10] Participant 1: "These payment terms look acceptable"
[00:15:30] Agreement reached on termination clause
[00:18:45] Action item: Legal team to review changes
[00:22:00] Next steps discussed and meeting concluded
""",
            "key_moments": [
                {"time": "00:05:45", "event": "Liability discussion started"},
                {"time": "00:15:30", "event": "Agreement on termination"},
            ]
        }


class DocumentReconstructor:
    """Reconstruct damaged or partial contracts using AI"""
    
    def __init__(self):
        self.template_library = self._load_template_library()
    
    def _load_template_library(self) -> Dict:
        """Load contract template library"""
        return {
            "msa": {"sections": ["parties", "services", "payment", "term", "warranties", "liability"]},
            "nda": {"sections": ["parties", "confidential_info", "obligations", "term", "remedies"]},
            "sow": {"sections": ["parties", "scope", "deliverables", "timeline", "payment"]}
        }
    
    async def reconstruct_contract(
        self,
        partial_text: str,
        contract_type: str,
        known_parties: Optional[List[str]] = None,
        context: Optional[Dict] = None
    ) -> str:
        """
        Reconstruct a damaged or partial contract
        
        Args:
            partial_text: Available contract text
            contract_type: Type of contract
            known_parties: Known party names
            context: Additional context
        
        Returns:
            Reconstructed contract text
        """
        
        # Identify missing sections
        missing_sections = self._identify_missing_sections(partial_text, contract_type)
        
        # Reconstruct using templates and AI
        reconstructed = await self._ai_reconstruct(partial_text, missing_sections, contract_type, context)
        
        return reconstructed
    
    def _identify_missing_sections(self, text: str, contract_type: str) -> List[str]:
        """Identify missing contract sections"""
        
        template = self.template_library.get(contract_type.lower(), self.template_library["msa"])
        missing = []
        
        for section in template["sections"]:
            if section.lower() not in text.lower():
                missing.append(section)
        
        return missing
    
    async def _ai_reconstruct(
        self,
        partial_text: str,
        missing_sections: List[str],
        contract_type: str,
        context: Optional[Dict]
    ) -> str:
        """Use AI to reconstruct missing sections"""
        
        # Mock reconstruction
        reconstructed = partial_text
        
        for section in missing_sections:
            reconstructed += f"\n\n[RECONSTRUCTED - {section.upper()}]\n"
            reconstructed += f"Standard {section} provisions based on {contract_type} template.\n"
        
        return reconstructed