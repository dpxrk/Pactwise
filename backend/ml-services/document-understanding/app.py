"""
Document Understanding Pipeline - Main Application
Advanced document processing with OCR, NLP, and layout understanding
"""

import os
import sys
import time
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, BackgroundTasks, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

# Add shared module to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from shared.models import (
    DocumentRequest,
    DocumentResponse,
    ExtractedEntity,
    DocumentSection,
    DocumentMetadata,
    ConfidenceLevel,
    ErrorResponse
)

from src.document_processor import DocumentProcessor
from src.layout_analyzer import LayoutAnalyzer
from src.entity_extractor import EntityExtractor
from src.structure_parser import StructureParser
from src.semantic_analyzer import SemanticAnalyzer
from src.document_classifier import DocumentClassifier

# Configure logging
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global instances
document_processor: Optional[DocumentProcessor] = None
layout_analyzer: Optional[LayoutAnalyzer] = None
entity_extractor: Optional[EntityExtractor] = None
structure_parser: Optional[StructureParser] = None
semantic_analyzer: Optional[SemanticAnalyzer] = None
document_classifier: Optional[DocumentClassifier] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle."""
    # Startup
    logger.info("Starting Document Understanding Pipeline...")
    
    global document_processor, layout_analyzer, entity_extractor
    global structure_parser, semantic_analyzer, document_classifier
    
    try:
        # Initialize components
        document_processor = DocumentProcessor()
        layout_analyzer = LayoutAnalyzer()
        entity_extractor = EntityExtractor()
        structure_parser = StructureParser()
        semantic_analyzer = SemanticAnalyzer()
        document_classifier = DocumentClassifier()
        
        # Load ML models
        await entity_extractor.load_models()
        await document_classifier.load_models()
        
        logger.info("All components initialized successfully")
        
    except Exception as e:
        logger.error(f"Failed to initialize components: {e}")
        raise
    
    yield
    
    # Shutdown
    logger.info("Shutting down Document Understanding Pipeline...")
    if entity_extractor:
        await entity_extractor.cleanup()


# Create FastAPI app
app = FastAPI(
    title="Document Understanding Pipeline",
    description="Advanced document AI with layout understanding and entity extraction",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "service": "Document Understanding Pipeline",
        "version": "1.0.0",
        "status": "operational",
        "capabilities": [
            "ocr_processing",
            "layout_analysis",
            "entity_extraction",
            "structure_parsing",
            "semantic_understanding",
            "document_classification",
            "table_extraction",
            "form_understanding"
        ]
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "components": {
            "processor": document_processor is not None,
            "layout": layout_analyzer is not None,
            "entities": entity_extractor is not None,
            "structure": structure_parser is not None,
            "semantic": semantic_analyzer is not None,
            "classifier": document_classifier is not None
        }
    }


@app.post("/process", response_model=DocumentResponse)
async def process_document(
    request: DocumentRequest,
    background_tasks: BackgroundTasks
):
    """
    Process document with full understanding pipeline.
    
    This endpoint performs:
    - Document preprocessing and cleaning
    - Layout analysis and structure detection
    - Entity extraction (dates, parties, amounts, etc.)
    - Semantic understanding
    - Document classification
    - Table and form extraction
    """
    start_time = time.time()
    
    try:
        # Step 1: Preprocess document
        logger.info("Preprocessing document...")
        processed_doc = await document_processor.process(
            request.document_content,
            request.document_format
        )
        
        # Step 2: Analyze layout
        logger.info("Analyzing document layout...")
        layout = await layout_analyzer.analyze(
            processed_doc,
            request.enable_ocr
        )
        
        # Step 3: Parse structure
        logger.info("Parsing document structure...")
        structure = await structure_parser.parse(
            processed_doc,
            layout
        )
        
        # Step 4: Extract entities
        logger.info("Extracting entities...")
        entities = await entity_extractor.extract(
            processed_doc,
            request.entity_types
        )
        
        # Step 5: Semantic analysis
        logger.info("Performing semantic analysis...")
        semantic_insights = await semantic_analyzer.analyze(
            processed_doc,
            entities,
            structure
        )
        
        # Step 6: Classify document
        logger.info("Classifying document...")
        classification = await document_classifier.classify(
            processed_doc,
            semantic_insights
        )
        
        # Generate metadata
        metadata = generate_metadata(
            processed_doc,
            classification,
            entities
        )
        
        # Calculate confidence
        confidence = calculate_confidence(
            entities,
            classification,
            semantic_insights
        )
        
        # Build response
        response = DocumentResponse(
            document_id=request.document_id,
            document_type=classification.get("type"),
            metadata=metadata,
            sections=structure.get("sections", [])[:20],  # Top 20 sections
            entities=entities[:50],  # Top 50 entities
            tables=layout.get("tables", [])[:10],  # Top 10 tables
            key_insights=semantic_insights.get("insights", [])[:10],
            relationships=semantic_insights.get("relationships", [])[:20],
            confidence=confidence,
            processing_time_ms=int((time.time() - start_time) * 1000)
        )
        
        # Background task: Store processed document
        background_tasks.add_task(
            store_processed_document,
            request.document_id,
            response.dict()
        )
        
        logger.info(f"Document processing completed in {response.processing_time_ms}ms")
        return response
        
    except Exception as e:
        logger.error(f"Document processing failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Processing failed: {str(e)}"
        )


@app.post("/extract-tables")
async def extract_tables(file: UploadFile = File(...)):
    """
    Extract tables from document.
    
    Args:
        file: Document file to process
    """
    try:
        # Read file content
        content = await file.read()
        
        # Process document
        processed = await document_processor.process_file(
            content,
            file.filename
        )
        
        # Extract tables
        tables = await layout_analyzer.extract_tables(processed)
        
        return {
            "filename": file.filename,
            "tables_found": len(tables),
            "tables": tables,
            "extraction_confidence": calculate_table_confidence(tables)
        }
        
    except Exception as e:
        logger.error(f"Table extraction failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/extract-forms")
async def extract_forms(file: UploadFile = File(...)):
    """
    Extract form fields from document.
    
    Args:
        file: Document file to process
    """
    try:
        # Read file content
        content = await file.read()
        
        # Process document
        processed = await document_processor.process_file(
            content,
            file.filename
        )
        
        # Extract form fields
        forms = await layout_analyzer.extract_forms(processed)
        
        return {
            "filename": file.filename,
            "forms_found": len(forms),
            "fields": forms,
            "field_types": categorize_form_fields(forms)
        }
        
    except Exception as e:
        logger.error(f"Form extraction failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/classify")
async def classify_document(
    document_text: str,
    return_probabilities: bool = False
):
    """
    Classify document type.
    
    Args:
        document_text: Document content
        return_probabilities: Return classification probabilities
    """
    try:
        classification = await document_classifier.classify_text(
            document_text,
            return_probabilities
        )
        
        return {
            "document_type": classification.get("type"),
            "confidence": classification.get("confidence"),
            "subcategory": classification.get("subcategory"),
            "probabilities": classification.get("probabilities") if return_probabilities else None
        }
        
    except Exception as e:
        logger.error(f"Classification failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/extract-entities")
async def extract_entities_only(
    document_text: str,
    entity_types: Optional[List[str]] = None
):
    """
    Extract entities from document.
    
    Args:
        document_text: Document content
        entity_types: Types of entities to extract
    """
    try:
        entities = await entity_extractor.extract_from_text(
            document_text,
            entity_types or ["all"]
        )
        
        # Group entities by type
        grouped = {}
        for entity in entities:
            entity_type = entity.get("type", "unknown")
            if entity_type not in grouped:
                grouped[entity_type] = []
            grouped[entity_type].append(entity)
        
        return {
            "total_entities": len(entities),
            "entities_by_type": grouped,
            "key_entities": entities[:20]  # Top 20 most important
        }
        
    except Exception as e:
        logger.error(f"Entity extraction failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/analyze-structure")
async def analyze_document_structure(
    document_text: str
):
    """
    Analyze document structure and hierarchy.
    
    Args:
        document_text: Document content
    """
    try:
        # Parse structure
        structure = await structure_parser.parse_text(document_text)
        
        return {
            "sections": structure.get("sections"),
            "hierarchy": structure.get("hierarchy"),
            "outline": structure.get("outline"),
            "cross_references": structure.get("cross_references"),
            "structure_type": structure.get("type")
        }
        
    except Exception as e:
        logger.error(f"Structure analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/semantic-search")
async def semantic_search(
    document_text: str,
    query: str,
    top_k: int = 5
):
    """
    Perform semantic search within document.
    
    Args:
        document_text: Document content
        query: Search query
        top_k: Number of results to return
    """
    try:
        results = await semantic_analyzer.search(
            document_text,
            query,
            top_k
        )
        
        return {
            "query": query,
            "results": results,
            "total_matches": len(results)
        }
        
    except Exception as e:
        logger.error(f"Semantic search failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/compare-documents")
async def compare_documents(
    document1: str,
    document2: str
):
    """
    Compare two documents for similarities and differences.
    
    Args:
        document1: First document
        document2: Second document
    """
    try:
        comparison = await semantic_analyzer.compare(
            document1,
            document2
        )
        
        return {
            "similarity_score": comparison.get("similarity"),
            "common_entities": comparison.get("common_entities"),
            "unique_to_doc1": comparison.get("unique_doc1"),
            "unique_to_doc2": comparison.get("unique_doc2"),
            "structural_similarity": comparison.get("structural_similarity"),
            "key_differences": comparison.get("differences")
        }
        
    except Exception as e:
        logger.error(f"Document comparison failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# Utility functions
def generate_metadata(
    processed_doc: Dict[str, Any],
    classification: Dict[str, Any],
    entities: List[ExtractedEntity]
) -> DocumentMetadata:
    """Generate document metadata."""
    # Extract key dates
    dates = [e for e in entities if e.get("type") == "date"]
    
    # Extract parties
    parties = [e for e in entities if e.get("type") in ["organization", "person"]]
    
    # Extract amounts
    amounts = [e for e in entities if e.get("type") in ["money", "amount"]]
    
    return DocumentMetadata(
        title=processed_doc.get("title", "Untitled"),
        document_type=classification.get("type", "unknown"),
        language=processed_doc.get("language", "en"),
        page_count=processed_doc.get("page_count", 1),
        word_count=processed_doc.get("word_count", 0),
        creation_date=dates[0].get("value") if dates else None,
        parties=[p.get("value") for p in parties[:5]],
        key_terms=processed_doc.get("key_terms", [])[:10],
        summary=processed_doc.get("summary", "")
    )


def calculate_confidence(
    entities: List[ExtractedEntity],
    classification: Dict[str, Any],
    semantic_insights: Dict[str, Any]
) -> ConfidenceLevel:
    """Calculate overall confidence level."""
    confidence_score = 60  # Base confidence
    
    # Entity extraction confidence
    if entities:
        avg_entity_conf = sum(e.get("confidence", 0.5) for e in entities) / len(entities)
        confidence_score += avg_entity_conf * 20
    
    # Classification confidence
    if classification.get("confidence", 0) > 0.8:
        confidence_score += 15
    elif classification.get("confidence", 0) > 0.6:
        confidence_score += 10
    
    # Semantic analysis quality
    if semantic_insights.get("quality_score", 0) > 0.7:
        confidence_score += 10
    
    if confidence_score >= 85:
        return ConfidenceLevel.VERY_HIGH
    elif confidence_score >= 75:
        return ConfidenceLevel.HIGH
    elif confidence_score >= 60:
        return ConfidenceLevel.MEDIUM
    elif confidence_score >= 40:
        return ConfidenceLevel.LOW
    else:
        return ConfidenceLevel.VERY_LOW


def calculate_table_confidence(tables: List[Dict[str, Any]]) -> float:
    """Calculate confidence for table extraction."""
    if not tables:
        return 0.0
    
    confidences = []
    for table in tables:
        # Check table quality indicators
        quality = 0.5  # Base quality
        
        if table.get("headers"):
            quality += 0.2
        if table.get("rows", 0) > 1:
            quality += 0.15
        if table.get("columns", 0) > 1:
            quality += 0.15
        
        confidences.append(min(1.0, quality))
    
    return sum(confidences) / len(confidences)


def categorize_form_fields(forms: List[Dict[str, Any]]) -> Dict[str, int]:
    """Categorize extracted form fields."""
    categories = {
        "text": 0,
        "date": 0,
        "number": 0,
        "checkbox": 0,
        "signature": 0,
        "other": 0
    }
    
    for field in forms:
        field_type = field.get("type", "other")
        if field_type in categories:
            categories[field_type] += 1
        else:
            categories["other"] += 1
    
    return categories


async def store_processed_document(
    document_id: str,
    processed_data: Dict[str, Any]
):
    """Store processed document data (background task)."""
    try:
        # In production, this would store to database
        logger.info(f"Storing processed document {document_id}")
        # Simulate storage
        await asyncio.sleep(0.1)
    except Exception as e:
        logger.error(f"Failed to store document {document_id}: {e}")


if __name__ == "__main__":
    import asyncio
    
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8004,
        reload=True,
        log_level=os.getenv("LOG_LEVEL", "info").lower()
    )