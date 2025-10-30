"""FastAPI endpoints for Legal Contract Agent"""

import os
import uuid
from datetime import datetime
from typing import Dict, List, Any, Optional
from pathlib import Path
import tempfile
import shutil

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends, status, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field, validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from integrations.databases.session import get_db_async
from integrations.databases.contract_models import (
    Contract, ContractTemplate, TemplateVariable, ContractAnalysis,
    ContractType, ContractStatus, RiskLevel
)
from agents.legal_contract.legal_agent import LegalContractAgent
from api.auth.dependencies import get_current_user, require_permissions


router = APIRouter(
    prefix="/api/v1/legal",
    tags=["legal-contract"],
    responses={404: {"description": "Not found"}},
)


# Request/Response Models
class ContractAnalysisRequest(BaseModel):
    """Request model for contract analysis"""
    contract_type: ContractType = ContractType.OTHER
    jurisdiction: str = "US"
    industry: Optional[str] = None
    risk_tolerance: str = "medium"  # low, medium, high
    compare_with_template: Optional[str] = None
    extract_key_terms: bool = True
    
    @validator('risk_tolerance')
    def validate_risk_tolerance(cls, v):
        if v not in ['low', 'medium', 'high']:
            raise ValueError('risk_tolerance must be low, medium, or high')
        return v


class ContractGenerationRequest(BaseModel):
    """Request model for contract generation"""
    template_id: str
    variables: Dict[str, Any]
    output_format: str = "pdf"  # pdf, docx
    include_watermark: bool = False
    include_signature_blocks: bool = True
    
    @validator('output_format')
    def validate_output_format(cls, v):
        if v not in ['pdf', 'docx']:
            raise ValueError('output_format must be pdf or docx')
        return v


class TemplateUploadResponse(BaseModel):
    """Response model for template upload"""
    template_id: str
    name: str
    variables: List[Dict[str, Any]]
    structure: Dict[str, Any]
    created_at: datetime


class ContractAnalysisResponse(BaseModel):
    """Response model for contract analysis"""
    analysis_id: str
    contract_id: str
    overall_score: float
    grade: str
    risk_level: RiskLevel
    completeness_score: float
    risk_coverage_score: float
    legal_compliance_score: float
    clarity_score: float
    commercial_protection_score: float
    key_findings: List[str]
    missing_clauses: List[str]
    risky_provisions: List[Dict[str, Any]]
    recommendations: List[str]
    compliance_status: Dict[str, Any]
    risk_assessment: Dict[str, Any]
    extracted_terms: Optional[Dict[str, Any]]
    summary: str
    created_at: datetime


class ContractComparisonResponse(BaseModel):
    """Response model for contract comparison"""
    comparison_id: str
    contract1_score: float
    contract2_score: float
    score_difference: float
    better_contract: int
    category_comparison: Dict[str, Any]
    key_differences: List[str]
    recommendations: List[str]


class ClauseLibraryResponse(BaseModel):
    """Response model for clause library"""
    clauses: List[Dict[str, Any]]
    total: int
    categories: List[str]


class TemplateVariableValidationResponse(BaseModel):
    """Response model for template variable validation"""
    is_valid: bool
    errors: List[str]
    warnings: List[str]


# Initialize agent (in production this would be done at startup)
legal_agent = None


def get_legal_agent():
    """Get or create legal agent instance"""
    global legal_agent
    if legal_agent is None:
        legal_agent = LegalContractAgent(
            agent_id=f"legal-contract-{uuid.uuid4().hex[:8]}",
            config={}
        )
    return legal_agent


# Endpoints

@router.post("/analyze", response_model=ContractAnalysisResponse)
async def analyze_contract(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    contract_type: ContractType = Form(ContractType.OTHER),
    jurisdiction: str = Form("US"),
    industry: Optional[str] = Form(None),
    risk_tolerance: str = Form("medium"),
    extract_key_terms: bool = Form(True),
    db: AsyncSession = Depends(get_db_async),
    current_user = Depends(get_current_user),
    _ = Depends(require_permissions(["legal:analyze", "contract:read"]))
):
    """
    Analyze a contract document and provide AI-powered scoring and feedback
    
    - **file**: Contract document (PDF or Word)
    - **contract_type**: Type of contract (MSA, SOW, NDA, etc.)
    - **jurisdiction**: Legal jurisdiction (US, EU, UK, etc.)
    - **industry**: Industry for specific compliance checks
    - **risk_tolerance**: Risk tolerance level (low, medium, high)
    - **extract_key_terms**: Whether to extract key commercial terms
    """
    try:
        # Validate file type
        if not file.filename.endswith(('.pdf', '.docx', '.doc')):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File must be PDF or Word document"
            )
        
        # Save uploaded file temporarily
        temp_dir = tempfile.mkdtemp()
        file_path = os.path.join(temp_dir, file.filename)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Get agent
        agent = get_legal_agent()
        
        # Prepare analysis request
        analysis_request = {
            "file_path": file_path,
            "file_name": file.filename,
            "contract_type": contract_type,
            "jurisdiction": jurisdiction,
            "industry": industry,
            "risk_tolerance": risk_tolerance,
            "extract_key_terms": extract_key_terms,
            "user_id": current_user["user_id"]
        }
        
        # Perform analysis
        result = await agent.analyze_contract(analysis_request)
        
        # Save to database
        contract = Contract(
            id=result["contract_id"],
            name=file.filename,
            contract_type=contract_type,
            status=ContractStatus.ACTIVE,
            party1_name=result.get("extracted_terms", {}).get("party1", "Unknown"),
            party2_name=result.get("extracted_terms", {}).get("party2", "Unknown"),
            value=result.get("extracted_terms", {}).get("value", 0),
            currency=result.get("extracted_terms", {}).get("currency", "USD"),
            overall_score=result["overall_score"],
            grade=result["grade"],
            risk_level=result["risk_level"],
            created_by=current_user["user_id"]
        )
        
        db.add(contract)
        
        # Save analysis
        analysis = ContractAnalysis(
            id=result["analysis_id"],
            contract_id=result["contract_id"],
            overall_score=result["overall_score"],
            completeness_score=result["completeness_score"],
            risk_coverage_score=result["risk_coverage_score"],
            legal_compliance_score=result["legal_compliance_score"],
            clarity_score=result["clarity_score"],
            commercial_protection_score=result["commercial_protection_score"],
            grade=result["grade"],
            risk_level=result["risk_level"],
            key_findings=result["key_findings"],
            recommendations=result["recommendations"],
            analysis_data=result
        )
        
        db.add(analysis)
        await db.commit()
        
        # Clean up in background
        background_tasks.add_task(cleanup_temp_dir, temp_dir)
        
        # Return response
        return ContractAnalysisResponse(
            analysis_id=result["analysis_id"],
            contract_id=result["contract_id"],
            overall_score=result["overall_score"],
            grade=result["grade"],
            risk_level=result["risk_level"],
            completeness_score=result["completeness_score"],
            risk_coverage_score=result["risk_coverage_score"],
            legal_compliance_score=result["legal_compliance_score"],
            clarity_score=result["clarity_score"],
            commercial_protection_score=result["commercial_protection_score"],
            key_findings=result["key_findings"],
            missing_clauses=result["missing_clauses"],
            risky_provisions=result["risky_provisions"],
            recommendations=result["recommendations"],
            compliance_status=result["compliance_check"],
            risk_assessment=result["risk_assessment"],
            extracted_terms=result.get("extracted_terms"),
            summary=result["summary"],
            created_at=datetime.utcnow()
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error analyzing contract: {str(e)}"
        )


@router.post("/generate", response_model=Dict[str, Any])
async def generate_contract(
    request: ContractGenerationRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db_async),
    current_user = Depends(get_current_user),
    _ = Depends(require_permissions(["legal:generate", "contract:write"]))
):
    """
    Generate a new contract from a template with variable substitution
    
    - **template_id**: ID of the template to use
    - **variables**: Dictionary of variables to replace in template
    - **output_format**: Output format (pdf or docx)
    - **include_watermark**: Whether to include watermark
    - **include_signature_blocks**: Whether to include signature blocks
    """
    try:
        # Get template from database
        template = await db.get(ContractTemplate, request.template_id)
        
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Template not found"
            )
        
        # Get agent
        agent = get_legal_agent()
        
        # Prepare generation request
        gen_request = {
            "template_path": template.file_path,
            "template_id": request.template_id,
            "variables": request.variables,
            "output_format": request.output_format,
            "include_watermark": request.include_watermark,
            "include_signature_blocks": request.include_signature_blocks,
            "user_id": current_user["user_id"]
        }
        
        # Generate document
        result = await agent.generate_document(gen_request)
        
        # Save generated contract
        contract = Contract(
            id=result["contract_id"],
            name=result["document_name"],
            template_id=request.template_id,
            contract_type=template.contract_type,
            status=ContractStatus.DRAFT,
            file_path=result["file_path"],
            created_by=current_user["user_id"]
        )
        
        db.add(contract)
        await db.commit()
        
        return {
            "success": True,
            "contract_id": result["contract_id"],
            "document_name": result["document_name"],
            "file_path": result["file_path"],
            "download_url": f"/api/v1/legal/download/{result['contract_id']}",
            "variables_replaced": len(request.variables),
            "format": request.output_format,
            "created_at": datetime.utcnow()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating contract: {str(e)}"
        )


@router.post("/templates", response_model=TemplateUploadResponse)
async def upload_template(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    name: str = Form(...),
    contract_type: ContractType = Form(ContractType.OTHER),
    description: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db_async),
    current_user = Depends(get_current_user),
    _ = Depends(require_permissions(["legal:template:write"]))
):
    """
    Upload a new contract template and extract variables
    
    - **file**: Template document (PDF or Word)
    - **name**: Template name
    - **contract_type**: Type of contract template
    - **description**: Optional template description
    """
    try:
        # Validate file type
        if not file.filename.endswith(('.pdf', '.docx', '.doc')):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File must be PDF or Word document"
            )
        
        # Save template file
        template_dir = Path("templates/contracts")
        template_dir.mkdir(parents=True, exist_ok=True)
        
        template_id = f"template-{uuid.uuid4().hex[:8]}"
        file_extension = Path(file.filename).suffix
        template_path = template_dir / f"{template_id}{file_extension}"
        
        with open(template_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Get agent
        agent = get_legal_agent()
        
        # Extract variables and analyze structure
        from agents.legal_contract.template_parser import TemplateParser
        parser = TemplateParser()
        
        variables = await parser.extract_variables(
            str(template_path),
            file_extension[1:]  # Remove the dot
        )
        
        structure = await parser.analyze_structure(
            str(template_path),
            file_extension[1:]
        )
        
        # Group variables by section
        grouped_variables = parser.group_variables_by_section(variables)
        
        # Save template to database
        template = ContractTemplate(
            id=template_id,
            name=name,
            description=description,
            contract_type=contract_type,
            file_path=str(template_path),
            created_by=current_user["user_id"]
        )
        
        db.add(template)
        
        # Save variables
        for var in variables:
            template_var = TemplateVariable(
                id=f"var-{uuid.uuid4().hex[:8]}",
                template_id=template_id,
                variable_key=var["key"],
                label=var["label"],
                variable_type=var["type"],
                required=var.get("required", False),
                default_value=var.get("default_value"),
                options=var.get("options", []),
                validation_rules={"validation": var.get("validation")},
                help_text=var.get("help_text", ""),
                display_order=var.get("order", 0)
            )
            db.add(template_var)
        
        await db.commit()
        
        return TemplateUploadResponse(
            template_id=template_id,
            name=name,
            variables=variables,
            structure=structure,
            created_at=datetime.utcnow()
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error uploading template: {str(e)}"
        )


@router.get("/templates/{template_id}/variables", response_model=Dict[str, Any])
async def get_template_variables(
    template_id: str,
    db: AsyncSession = Depends(get_db_async),
    current_user = Depends(get_current_user),
    _ = Depends(require_permissions(["legal:template:read"]))
):
    """
    Get all variables for a template with their properties and UI hints
    
    - **template_id**: ID of the template
    """
    try:
        # Get template
        template = await db.get(ContractTemplate, template_id)
        
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Template not found"
            )
        
        # Get variables
        variables = await db.execute(
            select(TemplateVariable)
            .where(TemplateVariable.template_id == template_id)
            .order_by(TemplateVariable.display_order)
        )
        variables = variables.scalars().all()
        
        # Format for UI
        from agents.legal_contract.template_parser import TemplateParser
        parser = TemplateParser()
        
        variable_list = [
            {
                "key": var.variable_key,
                "label": var.label,
                "type": var.variable_type,
                "required": var.required,
                "default_value": var.default_value,
                "options": var.options,
                "validation": var.validation_rules.get("validation"),
                "help_text": var.help_text,
                "order": var.display_order
            }
            for var in variables
        ]
        
        # Group by section
        grouped = parser.group_variables_by_section(variable_list)
        
        return {
            "template_id": template_id,
            "template_name": template.name,
            "variables": variable_list,
            "grouped_variables": grouped,
            "total_variables": len(variables),
            "required_variables": sum(1 for v in variables if v.required)
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting template variables: {str(e)}"
        )


@router.post("/templates/{template_id}/validate", response_model=TemplateVariableValidationResponse)
async def validate_template_variables(
    template_id: str,
    variables: Dict[str, Any],
    db: AsyncSession = Depends(get_db_async),
    current_user = Depends(get_current_user)
):
    """
    Validate variables against template requirements before generation
    
    - **template_id**: ID of the template
    - **variables**: Dictionary of variables to validate
    """
    try:
        # Get template variables
        template_vars = await db.execute(
            select(TemplateVariable)
            .where(TemplateVariable.template_id == template_id)
        )
        template_vars = template_vars.scalars().all()
        
        if not template_vars:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Template not found or has no variables"
            )
        
        # Convert to format expected by parser
        var_definitions = [
            {
                "key": var.variable_key,
                "label": var.label,
                "type": var.variable_type,
                "required": var.required,
                "validation": var.validation_rules.get("validation"),
                "min": var.validation_rules.get("min"),
                "max": var.validation_rules.get("max")
            }
            for var in template_vars
        ]
        
        # Validate using parser
        from agents.legal_contract.template_parser import TemplateParser
        parser = TemplateParser()
        
        validation_result = await parser.validate_variables(
            var_definitions,
            variables
        )
        
        return TemplateVariableValidationResponse(
            is_valid=validation_result["is_valid"],
            errors=validation_result["errors"],
            warnings=validation_result["warnings"]
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error validating variables: {str(e)}"
        )


@router.post("/compare")
async def compare_contracts(
    background_tasks: BackgroundTasks,
    file1: UploadFile = File(...),
    file2: UploadFile = File(...),
    current_user = Depends(get_current_user),
    _ = Depends(require_permissions(["legal:analyze"]))
):
    """
    Compare two contracts and identify differences in risk and terms
    
    - **file1**: First contract document
    - **file2**: Second contract document
    """
    try:
        # Save files temporarily
        temp_dir = tempfile.mkdtemp()
        file1_path = os.path.join(temp_dir, f"contract1_{file1.filename}")
        file2_path = os.path.join(temp_dir, f"contract2_{file2.filename}")
        
        with open(file1_path, "wb") as buffer:
            shutil.copyfileobj(file1.file, buffer)
        
        with open(file2_path, "wb") as buffer:
            shutil.copyfileobj(file2.file, buffer)
        
        # Get agent
        agent = get_legal_agent()
        
        # Analyze both contracts
        result1 = await agent.analyze_contract({
            "file_path": file1_path,
            "file_name": file1.filename,
            "user_id": current_user["user_id"]
        })
        
        result2 = await agent.analyze_contract({
            "file_path": file2_path,
            "file_name": file2.filename,
            "user_id": current_user["user_id"]
        })
        
        # Compare risk profiles
        from agents.legal_contract.risk_evaluator import RiskEvaluator
        evaluator = RiskEvaluator()
        
        # Extract text for comparison
        with open(file1_path, "r") as f:
            text1 = f.read()
        with open(file2_path, "r") as f:
            text2 = f.read()
        
        comparison = await evaluator.compare_risk_profiles(text1, text2)
        
        # Clean up in background
        background_tasks.add_task(cleanup_temp_dir, temp_dir)
        
        # Generate comparison response
        key_differences = []
        recommendations = []
        
        # Score differences
        if abs(result1["overall_score"] - result2["overall_score"]) > 10:
            key_differences.append(
                f"Significant score difference: Contract 1 ({result1['overall_score']:.1f}) vs Contract 2 ({result2['overall_score']:.1f})"
            )
        
        # Risk level differences
        if result1["risk_level"] != result2["risk_level"]:
            key_differences.append(
                f"Different risk levels: Contract 1 ({result1['risk_level']}) vs Contract 2 ({result2['risk_level']})"
            )
        
        # Compliance differences
        compliance1 = result1["compliance_check"]["compliance_score"]
        compliance2 = result2["compliance_check"]["compliance_score"]
        if abs(compliance1 - compliance2) > 15:
            key_differences.append(
                f"Compliance gap: Contract 1 ({compliance1:.1f}%) vs Contract 2 ({compliance2:.1f}%)"
            )
        
        # Recommendations
        better = 1 if result1["overall_score"] > result2["overall_score"] else 2
        recommendations.append(f"Contract {better} appears to be more favorable overall")
        
        if result1["risk_level"] == "HIGH" or result2["risk_level"] == "HIGH":
            recommendations.append("Consider additional legal review for high-risk provisions")
        
        return ContractComparisonResponse(
            comparison_id=f"comp-{uuid.uuid4().hex[:8]}",
            contract1_score=result1["overall_score"],
            contract2_score=result2["overall_score"],
            score_difference=abs(result1["overall_score"] - result2["overall_score"]),
            better_contract=better,
            category_comparison=comparison["category_comparison"],
            key_differences=key_differences,
            recommendations=recommendations
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error comparing contracts: {str(e)}"
        )


@router.get("/clauses", response_model=ClauseLibraryResponse)
async def get_clause_library(
    category: Optional[str] = None,
    risk_level: Optional[str] = None,
    search: Optional[str] = None,
    current_user = Depends(get_current_user),
    _ = Depends(require_permissions(["legal:clause:read"]))
):
    """
    Get standard clauses from the clause library
    
    - **category**: Filter by clause category
    - **risk_level**: Filter by risk level (LOW, MEDIUM, HIGH)
    - **search**: Search for specific keywords in clauses
    """
    try:
        from agents.legal_contract.clause_library import ClauseLibrary
        library = ClauseLibrary()
        
        clauses = []
        
        if search:
            # Search for specific keyword
            clauses = library.search_clauses(search)
        else:
            # Get all clauses or filter by category
            for clause_type in library.standard_clauses.keys():
                if category and category != clause_type:
                    continue
                
                alternatives = library.get_clause_alternatives(clause_type)
                
                for alt in alternatives:
                    if risk_level and alt["risk_level"] != risk_level:
                        continue
                    
                    clauses.append({
                        "type": clause_type,
                        "variant": alt["variant"],
                        "text": alt["text"],
                        "risk_level": alt["risk_level"],
                        "fallback_positions": library.get_fallback_positions(clause_type)
                    })
        
        # Get unique categories
        categories = list(library.standard_clauses.keys())
        
        return ClauseLibraryResponse(
            clauses=clauses,
            total=len(clauses),
            categories=categories
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting clause library: {str(e)}"
        )


@router.get("/contracts/{contract_id}", response_model=Dict[str, Any])
async def get_contract(
    contract_id: str,
    db: AsyncSession = Depends(get_db_async),
    current_user = Depends(get_current_user),
    _ = Depends(require_permissions(["legal:contract:read"]))
):
    """
    Get contract details and latest analysis
    
    - **contract_id**: ID of the contract
    """
    try:
        # Get contract
        contract = await db.get(Contract, contract_id)
        
        if not contract:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Contract not found"
            )
        
        # Get latest analysis
        analysis = await db.execute(
            select(ContractAnalysis)
            .where(ContractAnalysis.contract_id == contract_id)
            .order_by(ContractAnalysis.created_at.desc())
            .limit(1)
        )
        analysis = analysis.scalar_one_or_none()
        
        return {
            "contract": {
                "id": contract.id,
                "name": contract.name,
                "type": contract.contract_type,
                "status": contract.status,
                "party1": contract.party1_name,
                "party2": contract.party2_name,
                "value": contract.value,
                "currency": contract.currency,
                "start_date": contract.start_date,
                "end_date": contract.end_date,
                "overall_score": contract.overall_score,
                "grade": contract.grade,
                "risk_level": contract.risk_level,
                "created_at": contract.created_at,
                "updated_at": contract.updated_at
            },
            "latest_analysis": {
                "id": analysis.id,
                "overall_score": analysis.overall_score,
                "grade": analysis.grade,
                "risk_level": analysis.risk_level,
                "key_findings": analysis.key_findings,
                "recommendations": analysis.recommendations,
                "analyzed_at": analysis.created_at
            } if analysis else None
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting contract: {str(e)}"
        )


@router.get("/download/{contract_id}")
async def download_contract(
    contract_id: str,
    db: AsyncSession = Depends(get_db_async),
    current_user = Depends(get_current_user),
    _ = Depends(require_permissions(["legal:contract:read"]))
):
    """
    Download a generated contract document
    
    - **contract_id**: ID of the contract to download
    """
    try:
        # Get contract
        contract = await db.get(Contract, contract_id)
        
        if not contract:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Contract not found"
            )
        
        if not contract.file_path or not os.path.exists(contract.file_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Contract file not found"
            )
        
        # Return file
        return FileResponse(
            path=contract.file_path,
            filename=os.path.basename(contract.file_path),
            media_type='application/octet-stream'
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error downloading contract: {str(e)}"
        )


@router.post("/negotiate/{contract_id}")
async def negotiate_contract(
    contract_id: str,
    negotiation_point: str = Form(...),
    proposed_change: str = Form(...),
    justification: Optional[str] = Form(None),
    priority: str = Form("medium"),
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db_async),
    current_user = Depends(get_current_user),
    _ = Depends(require_permissions(["legal:negotiate"]))
):
    """
    Submit a negotiation point for a contract
    
    - **contract_id**: ID of the contract to negotiate
    - **negotiation_point**: Specific clause or section to negotiate
    - **proposed_change**: Proposed alternative text or terms
    - **justification**: Business justification for the change
    - **priority**: Priority level (low, medium, high)
    """
    try:
        # Get contract
        contract = await db.get(Contract, contract_id)
        
        if not contract:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Contract not found"
            )
        
        # Get agent
        agent = get_legal_agent()
        
        # Prepare negotiation request
        negotiation_request = {
            "contract_id": contract_id,
            "negotiation_point": negotiation_point,
            "proposed_change": proposed_change,
            "justification": justification,
            "priority": priority,
            "user_id": current_user["user_id"]
        }
        
        # Generate negotiation strategy
        strategy = await agent.create_negotiation_strategy(negotiation_request)
        
        # Store negotiation history (would be in a separate table in production)
        negotiation_id = f"nego-{uuid.uuid4().hex[:8]}"
        
        return {
            "negotiation_id": negotiation_id,
            "contract_id": contract_id,
            "negotiation_point": negotiation_point,
            "proposed_change": proposed_change,
            "strategy": strategy.get("strategy"),
            "fallback_positions": strategy.get("fallback_positions"),
            "risk_assessment": strategy.get("risk_assessment"),
            "recommended_approach": strategy.get("recommended_approach"),
            "created_at": datetime.utcnow()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating negotiation: {str(e)}"
        )


@router.post("/contracts/{contract_id}/renewal-reminder")
async def set_contract_renewal_reminder(
    contract_id: str,
    reminder_days: int = Form(90),
    notification_emails: List[str] = Form([]),
    auto_renew: bool = Form(False),
    db: AsyncSession = Depends(get_db_async),
    current_user = Depends(get_current_user),
    _ = Depends(require_permissions(["legal:contract:write"]))
):
    """
    Set up renewal reminders for a contract
    
    - **contract_id**: ID of the contract
    - **reminder_days**: Days before expiry to send reminder (default 90)
    - **notification_emails**: List of emails to notify
    - **auto_renew**: Whether to automatically renew the contract
    """
    try:
        # Get contract
        contract = await db.get(Contract, contract_id)
        
        if not contract:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Contract not found"
            )
        
        if not contract.end_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Contract has no end date specified"
            )
        
        # Calculate reminder date
        from datetime import timedelta
        reminder_date = contract.end_date - timedelta(days=reminder_days)
        
        # Store reminder (would be in a separate table in production)
        reminder_id = f"reminder-{uuid.uuid4().hex[:8]}"
        
        # Schedule the reminder (in production, this would use a task scheduler)
        reminder = {
            "reminder_id": reminder_id,
            "contract_id": contract_id,
            "contract_name": contract.name,
            "end_date": contract.end_date.isoformat(),
            "reminder_date": reminder_date.isoformat(),
            "reminder_days": reminder_days,
            "notification_emails": notification_emails or [current_user["email"]],
            "auto_renew": auto_renew,
            "status": "scheduled",
            "created_by": current_user["user_id"],
            "created_at": datetime.utcnow()
        }
        
        return reminder
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error setting renewal reminder: {str(e)}"
        )


@router.get("/contracts/{contract_id}/milestones")
async def get_contract_milestones(
    contract_id: str,
    db: AsyncSession = Depends(get_db_async),
    current_user = Depends(get_current_user),
    _ = Depends(require_permissions(["legal:contract:read"]))
):
    """
    Get milestones and important dates for a contract
    
    - **contract_id**: ID of the contract
    """
    try:
        # Get contract
        contract = await db.get(Contract, contract_id)
        
        if not contract:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Contract not found"
            )
        
        # Get latest analysis
        analysis = await db.execute(
            select(ContractAnalysis)
            .where(ContractAnalysis.contract_id == contract_id)
            .order_by(ContractAnalysis.created_at.desc())
            .limit(1)
        )
        analysis = analysis.scalar_one_or_none()
        
        # Extract milestones from analysis
        milestones = []
        
        # Add contract dates as milestones
        if contract.start_date:
            milestones.append({
                "type": "contract_start",
                "date": contract.start_date.isoformat(),
                "description": "Contract Start Date",
                "status": "completed" if contract.start_date < datetime.utcnow() else "pending"
            })
        
        if contract.end_date:
            milestones.append({
                "type": "contract_end",
                "date": contract.end_date.isoformat(),
                "description": "Contract End Date",
                "status": "pending"
            })
            
            # Add renewal reminder milestone
            from datetime import timedelta
            renewal_reminder = contract.end_date - timedelta(days=90)
            milestones.append({
                "type": "renewal_reminder",
                "date": renewal_reminder.isoformat(),
                "description": "Renewal Reminder (90 days before expiry)",
                "status": "pending"
            })
        
        # Extract payment milestones from analysis if available
        if analysis and analysis.analysis_data:
            extracted_terms = analysis.analysis_data.get("extracted_terms", {})
            if "payment_terms" in extracted_terms:
                payment_terms = extracted_terms["payment_terms"]
                if isinstance(payment_terms, dict):
                    if "milestones" in payment_terms:
                        for idx, milestone in enumerate(payment_terms["milestones"]):
                            milestones.append({
                                "type": "payment",
                                "date": milestone.get("date"),
                                "description": f"Payment Milestone {idx+1}: {milestone.get('description', 'Payment Due')}",
                                "amount": milestone.get("amount"),
                                "status": "pending"
                            })
        
        # Sort milestones by date
        milestones.sort(key=lambda x: x.get("date") or "9999-12-31")
        
        return {
            "contract_id": contract_id,
            "contract_name": contract.name,
            "milestones": milestones,
            "total_milestones": len(milestones),
            "upcoming_milestones": len([m for m in milestones if m["status"] == "pending"]),
            "completed_milestones": len([m for m in milestones if m["status"] == "completed"])
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting contract milestones: {str(e)}"
        )


@router.post("/contracts/{contract_id}/milestones")
async def add_contract_milestone(
    contract_id: str,
    milestone_type: str = Form(...),
    date: str = Form(...),
    description: str = Form(...),
    amount: Optional[float] = Form(None),
    db: AsyncSession = Depends(get_db_async),
    current_user = Depends(get_current_user),
    _ = Depends(require_permissions(["legal:contract:write"]))
):
    """
    Add a custom milestone to a contract
    
    - **contract_id**: ID of the contract
    - **milestone_type**: Type of milestone (payment, deliverable, review, etc.)
    - **date**: Milestone date (ISO format)
    - **description**: Description of the milestone
    - **amount**: Optional amount for payment milestones
    """
    try:
        # Get contract
        contract = await db.get(Contract, contract_id)
        
        if not contract:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Contract not found"
            )
        
        # Create milestone (would be in a separate table in production)
        milestone_id = f"milestone-{uuid.uuid4().hex[:8]}"
        
        milestone = {
            "milestone_id": milestone_id,
            "contract_id": contract_id,
            "type": milestone_type,
            "date": date,
            "description": description,
            "amount": amount,
            "status": "pending",
            "created_by": current_user["user_id"],
            "created_at": datetime.utcnow()
        }
        
        return {
            "success": True,
            "milestone": milestone,
            "message": "Milestone added successfully"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error adding milestone: {str(e)}"
        )


@router.post("/analyze/bulk")
async def bulk_analyze_contracts(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    contract_type: ContractType = Form(ContractType.OTHER),
    jurisdiction: str = Form("US"),
    risk_tolerance: str = Form("medium"),
    db: AsyncSession = Depends(get_db_async),
    current_user = Depends(get_current_user),
    _ = Depends(require_permissions(["legal:analyze", "contract:read"]))
):
    """
    Analyze multiple contracts in bulk
    
    - **files**: List of contract documents (PDF or Word)
    - **contract_type**: Type of contracts
    - **jurisdiction**: Legal jurisdiction for all contracts
    - **risk_tolerance**: Risk tolerance level for analysis
    """
    try:
        if len(files) > 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Maximum 10 files allowed per bulk analysis"
            )
        
        # Save files temporarily
        temp_dir = tempfile.mkdtemp()
        results = []
        
        # Get agent
        agent = get_legal_agent()
        
        for file in files:
            # Validate file type
            if not file.filename.endswith(('.pdf', '.docx', '.doc')):
                results.append({
                    "filename": file.filename,
                    "status": "error",
                    "error": "Invalid file type. Must be PDF or Word document"
                })
                continue
            
            file_path = os.path.join(temp_dir, file.filename)
            
            try:
                with open(file_path, "wb") as buffer:
                    shutil.copyfileobj(file.file, buffer)
                
                # Prepare analysis request
                analysis_request = {
                    "file_path": file_path,
                    "file_name": file.filename,
                    "contract_type": contract_type,
                    "jurisdiction": jurisdiction,
                    "risk_tolerance": risk_tolerance,
                    "extract_key_terms": True,
                    "user_id": current_user["user_id"]
                }
                
                # Perform analysis
                result = await agent.analyze_contract(analysis_request)
                
                # Save to database
                contract = Contract(
                    id=result["contract_id"],
                    name=file.filename,
                    contract_type=contract_type,
                    status=ContractStatus.ACTIVE,
                    party1_name=result.get("extracted_terms", {}).get("party1", "Unknown"),
                    party2_name=result.get("extracted_terms", {}).get("party2", "Unknown"),
                    value=result.get("extracted_terms", {}).get("value", 0),
                    currency=result.get("extracted_terms", {}).get("currency", "USD"),
                    overall_score=result["overall_score"],
                    grade=result["grade"],
                    risk_level=result["risk_level"],
                    created_by=current_user["user_id"]
                )
                
                db.add(contract)
                
                # Save analysis
                analysis = ContractAnalysis(
                    id=result["analysis_id"],
                    contract_id=result["contract_id"],
                    overall_score=result["overall_score"],
                    completeness_score=result["completeness_score"],
                    risk_coverage_score=result["risk_coverage_score"],
                    legal_compliance_score=result["legal_compliance_score"],
                    clarity_score=result["clarity_score"],
                    commercial_protection_score=result["commercial_protection_score"],
                    grade=result["grade"],
                    risk_level=result["risk_level"],
                    key_findings=result["key_findings"],
                    recommendations=result["recommendations"],
                    analysis_data=result
                )
                
                db.add(analysis)
                
                results.append({
                    "filename": file.filename,
                    "status": "success",
                    "contract_id": result["contract_id"],
                    "analysis_id": result["analysis_id"],
                    "overall_score": result["overall_score"],
                    "grade": result["grade"],
                    "risk_level": result["risk_level"],
                    "summary": result["summary"]
                })
                
            except Exception as e:
                results.append({
                    "filename": file.filename,
                    "status": "error",
                    "error": str(e)
                })
        
        # Commit all successful analyses
        await db.commit()
        
        # Clean up in background
        background_tasks.add_task(cleanup_temp_dir, temp_dir)
        
        # Generate summary
        successful = len([r for r in results if r["status"] == "success"])
        failed = len([r for r in results if r["status"] == "error"])
        
        avg_score = 0
        if successful > 0:
            avg_score = sum(r["overall_score"] for r in results if r["status"] == "success") / successful
        
        risk_distribution = {}
        for r in results:
            if r["status"] == "success":
                risk_level = r["risk_level"]
                risk_distribution[risk_level] = risk_distribution.get(risk_level, 0) + 1
        
        return {
            "batch_id": f"batch-{uuid.uuid4().hex[:8]}",
            "total_files": len(files),
            "successful": successful,
            "failed": failed,
            "average_score": round(avg_score, 2),
            "risk_distribution": risk_distribution,
            "results": results,
            "created_at": datetime.utcnow()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error in bulk analysis: {str(e)}"
        )


@router.get("/contracts/{contract_id}/versions")
async def get_contract_versions(
    contract_id: str,
    db: AsyncSession = Depends(get_db_async),
    current_user = Depends(get_current_user),
    _ = Depends(require_permissions(["legal:contract:read"]))
):
    """
    Get version history for a contract
    
    - **contract_id**: ID of the contract
    """
    try:
        # Get contract
        contract = await db.get(Contract, contract_id)
        
        if not contract:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Contract not found"
            )
        
        # Get all analyses (treated as versions)
        analyses = await db.execute(
            select(ContractAnalysis)
            .where(ContractAnalysis.contract_id == contract_id)
            .order_by(ContractAnalysis.created_at.desc())
        )
        analyses = analyses.scalars().all()
        
        versions = []
        for idx, analysis in enumerate(analyses):
            version_number = len(analyses) - idx
            versions.append({
                "version": f"v{version_number}",
                "analysis_id": analysis.id,
                "created_at": analysis.created_at.isoformat(),
                "overall_score": analysis.overall_score,
                "grade": analysis.grade,
                "risk_level": analysis.risk_level,
                "changes_from_previous": None if idx == len(analyses) - 1 else {
                    "score_change": analysis.overall_score - analyses[idx + 1].overall_score,
                    "grade_change": f"{analyses[idx + 1].grade} → {analysis.grade}" if analyses[idx + 1].grade != analysis.grade else None,
                    "risk_change": f"{analyses[idx + 1].risk_level} → {analysis.risk_level}" if analyses[idx + 1].risk_level != analysis.risk_level else None
                }
            })
        
        # Calculate overall trend
        trend = "stable"
        if len(versions) > 1:
            score_diff = versions[0]["overall_score"] - versions[-1]["overall_score"]
            if score_diff > 5:
                trend = "improving"
            elif score_diff < -5:
                trend = "declining"
        
        return {
            "contract_id": contract_id,
            "contract_name": contract.name,
            "total_versions": len(versions),
            "versions": versions,
            "latest_version": versions[0] if versions else None,
            "original_version": versions[-1] if versions else None,
            "trend": trend
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting contract versions: {str(e)}"
        )


# Utility functions
def cleanup_temp_dir(directory: str):
    """Clean up temporary directory"""
    try:
        shutil.rmtree(directory)
    except Exception as e:
        print(f"Error cleaning up temp directory: {e}")


# Add routes to main app
def setup_routes(app):
    """Setup legal contract routes"""
    app.include_router(router)