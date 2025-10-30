"""Contract Review API Routes"""

from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from typing import Optional, Dict, Any
from pathlib import Path
from pydantic import BaseModel
import tempfile
import shutil
from datetime import datetime

# Simple auth bypass for testing
def get_current_user_bypass():
    """Bypass authentication for testing"""
    return {"id": "test_user", "name": "Test User", "email": "test@example.com"}


router = APIRouter(prefix="/api/v1/contracts", tags=["Contract Review"])


# Pydantic models
class ContractReviewResponse(BaseModel):
    """Contract review response model"""
    success: bool
    review_id: str
    status: str
    message: str
    report: Optional[Dict[str, Any]] = None


# Initialize with conditional import
try:
    from agents.legal_contract.services.enhanced_contract_agent import EnhancedContractAgent
    contract_agent = EnhancedContractAgent()
    AGENT_AVAILABLE = True
except Exception as e:
    print(f"Warning: Could not load EnhancedContractAgent: {e}")
    print("Contract review will use fallback mode")
    contract_agent = None
    AGENT_AVAILABLE = False


@router.post("/review", response_model=ContractReviewResponse)
async def review_contract(
    file: UploadFile = File(...),
    review_type: str = "comprehensive",
    background_tasks: BackgroundTasks = None
):
    """
    Comprehensive contract review endpoint

    Performs multi-dimensional analysis:
    - Document ingestion (PDF, DOCX, OCR)
    - Clause extraction and categorization
    - Risk assessment (legal, financial, operational, compliance)
    - Regulatory compliance (GDPR, CCPA, SOX, HIPAA)
    - Playbook comparison
    - Intelligent redlining
    - Recommendations generation

    Args:
        file: Contract file (PDF, DOCX, TXT)
        review_type: Type of review (comprehensive, quick, focused)

    Returns:
        Comprehensive review report
    """
    try:
        # Get current user (bypass auth for testing)
        current_user = get_current_user_bypass()

        # Validate file type
        allowed_extensions = ['.pdf', '.docx', '.doc', '.txt']
        file_ext = Path(file.filename).suffix.lower()

        if file_ext not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type. Allowed: {', '.join(allowed_extensions)}"
            )

        # Save uploaded file to temp location
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as temp_file:
            shutil.copyfileobj(file.file, temp_file)
            temp_path = Path(temp_file.name)

        try:
            if AGENT_AVAILABLE and contract_agent:
                # Use full agent
                report = await contract_agent.review_contract(
                    contract_file=temp_path,
                    review_type=review_type,
                    contract_metadata={
                        'reviewed_by': current_user.get('id'),
                        'uploaded_filename': file.filename
                    }
                )
            else:
                # Fallback to simple analysis
                from test_contract_isolated import simple_contract_review
                result = await simple_contract_review(temp_path)

                # Convert to standard report format
                report = {
                    'summary': {
                        'contract_type': 'UNKNOWN',
                        'overall_risk': result['risk_level'],
                        'risk_score': result['risk_score'],
                        'contract_value': result['amounts'][0] if result['amounts'] else 0,
                        'currency': 'USD'
                    },
                    'detailed_findings': {
                        'risk_assessment': {
                            'risks_found': result['risks_found'],
                            'protections_found': result['protections_found']
                        }
                    },
                    'recommendations': [
                        {
                            'priority': 'HIGH',
                            'action': f"Address {len(result['risks_found'])} identified risks",
                            'details': ', '.join(result['risks_found'][:3])
                        }
                    ]
                }

            # Clean up temp file
            temp_path.unlink()

            return ContractReviewResponse(
                success=True,
                review_id=f"REV-{int(datetime.now().timestamp())}",
                status="completed",
                message="Contract review completed successfully",
                report=report
            )

        except Exception as e:
            # Clean up temp file on error
            if temp_path.exists():
                temp_path.unlink()
            raise e

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Contract review failed: {str(e)}"
        )


@router.post("/analyze/risks")
async def analyze_contract_risks(file: UploadFile = File(...)):
    """
    Focused risk assessment endpoint

    Performs multi-dimensional risk analysis:
    - Legal risks (indemnification, liability, IP)
    - Financial risks (payment terms, penalties)
    - Operational risks (SLAs, termination rights)
    - Compliance risks (data protection, regulatory)
    - Reputational risks (exclusivity, non-compete)

    Returns:
        Detailed risk assessment with severity scoring
    """
    try:
        current_user = get_current_user_bypass()

        # Save file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=Path(file.filename).suffix) as temp_file:
            shutil.copyfileobj(file.file, temp_file)
            temp_path = Path(temp_file.name)

        try:
            if AGENT_AVAILABLE and contract_agent:
                report = await contract_agent.review_contract(
                    contract_file=temp_path,
                    review_type='focused'
                )
                risk_assessment = report['detailed_findings']['risk_assessment']
            else:
                # Fallback
                from test_contract_isolated import simple_contract_review
                result = await simple_contract_review(temp_path)
                risk_assessment = {
                    'overall_risk': result['risk_level'],
                    'risk_score': result['risk_score'],
                    'risks_found': result['risks_found']
                }

            temp_path.unlink()

            return {
                "success": True,
                "risk_assessment": risk_assessment
            }

        except Exception as e:
            if temp_path.exists():
                temp_path.unlink()
            raise e

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Risk assessment failed: {str(e)}"
        )


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Contract Review API",
        "version": "2.0",
        "agent_available": AGENT_AVAILABLE
    }


@router.get("/supported-formats")
async def get_supported_formats():
    """Get list of supported file formats"""
    return {
        "formats": [
            {
                "extension": ".pdf",
                "description": "PDF documents (including scanned with OCR)"
            },
            {
                "extension": ".docx",
                "description": "Microsoft Word documents"
            },
            {
                "extension": ".doc",
                "description": "Legacy Word documents"
            },
            {
                "extension": ".txt",
                "description": "Plain text files"
            }
        ]
    }


@router.get("/frameworks")
async def get_compliance_frameworks():
    """Get list of supported compliance frameworks"""
    return {
        "frameworks": [
            {
                "code": "GDPR",
                "name": "General Data Protection Regulation",
                "region": "EU/EEA"
            },
            {
                "code": "CCPA",
                "name": "California Consumer Privacy Act",
                "region": "California, USA"
            },
            {
                "code": "SOX",
                "name": "Sarbanes-Oxley Act",
                "region": "USA (Public Companies)"
            },
            {
                "code": "HIPAA",
                "name": "Health Insurance Portability and Accountability Act",
                "region": "USA (Healthcare)"
            },
            {
                "code": "ISO_27001",
                "name": "Information Security Management",
                "region": "International"
            },
            {
                "code": "SOC2",
                "name": "Service Organization Control 2",
                "region": "International"
            },
            {
                "code": "PCI_DSS",
                "name": "Payment Card Industry Data Security Standard",
                "region": "International"
            }
        ]
    }
