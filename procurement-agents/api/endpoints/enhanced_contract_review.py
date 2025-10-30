"""Enhanced Contract Review API Endpoints"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, BackgroundTasks
from fastapi.responses import JSONResponse
from typing import Optional, Dict, Any
from pathlib import Path
from pydantic import BaseModel
import tempfile
import shutil

from agents.legal_contract.services.enhanced_contract_agent import EnhancedContractAgent
from shared.auth import get_current_user  # Assuming auth module exists


router = APIRouter(prefix="/api/v1/contracts", tags=["Contract Review"])


# Pydantic models
class ContractReviewRequest(BaseModel):
    """Contract review request model"""
    review_type: str = "comprehensive"  # comprehensive, quick, focused
    contract_metadata: Optional[Dict[str, Any]] = None


class ContractReviewResponse(BaseModel):
    """Contract review response model"""
    success: bool
    review_id: str
    status: str
    message: str
    report: Optional[Dict[str, Any]] = None


class RiskAssessmentResponse(BaseModel):
    """Risk assessment response"""
    overall_risk: str
    risk_score: float
    critical_issues: list
    legal_risks: list
    financial_risks: list
    operational_risks: list
    compliance_risks: list


# Initialize agent
contract_agent = EnhancedContractAgent()


@router.post("/review", response_model=ContractReviewResponse)
async def review_contract(
    file: UploadFile = File(...),
    review_type: str = "comprehensive",
    background_tasks: BackgroundTasks = None,
    current_user: dict = Depends(get_current_user)
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
        current_user: Authenticated user

    Returns:
        Comprehensive review report
    """
    try:
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
            # Perform comprehensive review
            report = await contract_agent.review_contract(
                contract_file=temp_path,
                review_type=review_type,
                contract_metadata={
                    'reviewed_by': current_user.get('id'),
                    'uploaded_filename': file.filename
                }
            )

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
async def analyze_contract_risks(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
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
        # Save file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=Path(file.filename).suffix) as temp_file:
            shutil.copyfileobj(file.file, temp_file)
            temp_path = Path(temp_file.name)

        try:
            # Perform focused risk assessment
            report = await contract_agent.review_contract(
                contract_file=temp_path,
                review_type='focused'
            )

            risk_assessment = report['detailed_findings']['risk_assessment']

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


@router.post("/analyze/compliance")
async def analyze_compliance(
    file: UploadFile = File(...),
    frameworks: Optional[list] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Compliance checking endpoint

    Checks regulatory compliance against:
    - GDPR (EU data protection)
    - CCPA (California privacy)
    - SOX (Sarbanes-Oxley)
    - HIPAA (Healthcare)
    - Industry standards (ISO, SOC 2, PCI-DSS)

    Args:
        file: Contract file
        frameworks: Specific frameworks to check (optional)

    Returns:
        Compliance assessment with recommendations
    """
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=Path(file.filename).suffix) as temp_file:
            shutil.copyfileobj(file.file, temp_file)
            temp_path = Path(temp_file.name)

        try:
            report = await contract_agent.review_contract(
                contract_file=temp_path,
                review_type='focused'
            )

            compliance_check = report['detailed_findings']['compliance_analysis']

            temp_path.unlink()

            return {
                "success": True,
                "compliance_check": compliance_check
            }

        except Exception as e:
            if temp_path.exists():
                temp_path.unlink()
            raise e

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Compliance check failed: {str(e)}"
        )


@router.post("/analyze/playbook")
async def compare_to_playbook(
    file: UploadFile = File(...),
    contract_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Playbook comparison endpoint

    Compares contract against company-defined playbook:
    - Checks required clauses
    - Identifies missing preferred clauses
    - Flags prohibited clauses
    - Validates financial terms

    Returns:
        Playbook compliance score and deviations
    """
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=Path(file.filename).suffix) as temp_file:
            shutil.copyfileobj(file.file, temp_file)
            temp_path = Path(temp_file.name)

        try:
            metadata = {}
            if contract_type:
                metadata['contract_type'] = contract_type

            report = await contract_agent.review_contract(
                contract_file=temp_path,
                review_type='focused',
                contract_metadata=metadata
            )

            playbook_comparison = report['detailed_findings']['playbook_comparison']

            temp_path.unlink()

            return {
                "success": True,
                "playbook_comparison": playbook_comparison
            }

        except Exception as e:
            if temp_path.exists():
                temp_path.unlink()
            raise e

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Playbook comparison failed: {str(e)}"
        )


@router.post("/generate/redlines")
async def generate_redlines(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Redlining generation endpoint

    Generates intelligent redlines/suggestions:
    - Modifications for high-risk clauses
    - Additions for missing required clauses
    - Deletions for prohibited clauses
    - Alternative language suggestions

    Returns:
        Prioritized list of redlines with suggested text
    """
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=Path(file.filename).suffix) as temp_file:
            shutil.copyfileobj(file.file, temp_file)
            temp_path = Path(temp_file.name)

        try:
            report = await contract_agent.review_contract(
                contract_file=temp_path,
                review_type='comprehensive'
            )

            redlines = report.get('redlines', [])

            temp_path.unlink()

            return {
                "success": True,
                "redlines": redlines,
                "count": len(redlines)
            }

        except Exception as e:
            if temp_path.exists():
                temp_path.unlink()
            raise e

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Redline generation failed: {str(e)}"
        )


@router.get("/lifecycle/{contract_id}")
async def get_contract_lifecycle(
    contract_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Contract lifecycle tracking endpoint

    Tracks ongoing contract management:
    - Renewal status and reminders
    - Active obligations tracking
    - Upcoming milestones
    - Compliance monitoring
    - Vendor performance

    Returns:
        Current lifecycle status and upcoming actions
    """
    try:
        lifecycle_data = await contract_agent.track_contract_lifecycle(contract_id)

        return {
            "success": True,
            "lifecycle": lifecycle_data
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Lifecycle tracking failed: {str(e)}"
        )


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Enhanced Contract Review API",
        "version": "2.0"
    }


# Additional utility endpoints
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
