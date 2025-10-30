"""Legal Contract Agent - Main Orchestrator for Contract Analysis and Generation"""

import asyncio
import hashlib
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from enum import Enum

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from agents.base_agent import BaseAgent, AgentResponse, AgentStatus
from integrations.databases.contract_models import (
    Contract, ContractTemplate, ContractAnalysis,
    ContractStatus, ContractType, RiskLevel
)
from integrations.databases.database import get_db_session
from shared.config import get_config
from shared.utils import generate_id

from .contract_analyzer import ContractAnalyzer
from .document_generator import DocumentGenerator
from .template_parser import TemplateParser
from .risk_evaluator import RiskEvaluator
from .compliance_checker import ComplianceChecker


class LegalAction(str, Enum):
    """Legal agent actions"""
    ANALYZE_CONTRACT = "analyze_contract"
    GENERATE_DOCUMENT = "generate_document"
    UPLOAD_TEMPLATE = "upload_template"
    PARSE_TEMPLATE = "parse_template"
    GET_TEMPLATE_VARIABLES = "get_template_variables"
    REVIEW_CONTRACT = "review_contract"
    COMPARE_CONTRACTS = "compare_contracts"
    EXTRACT_CLAUSES = "extract_clauses"
    CHECK_COMPLIANCE = "check_compliance"
    ASSESS_RISK = "assess_risk"


class LegalContractAgent(BaseAgent):
    """
    Advanced Legal Contract Agent with:
    - AI-powered contract analysis and scoring
    - Template-based document generation
    - Risk assessment and compliance checking
    - Clause extraction and comparison
    - Multi-format document support (PDF, Word)
    """
    
    def __init__(self):
        super().__init__("legal_contract")
        self.config = get_config()
        
        # Initialize sub-components
        self.analyzer = ContractAnalyzer()
        self.generator = DocumentGenerator()
        self.parser = TemplateParser()
        self.risk_evaluator = RiskEvaluator()
        self.compliance_checker = ComplianceChecker()
        
        # Configuration
        self.upload_dir = Path(self.config.storage.contracts_dir if hasattr(self.config, 'storage') else "/tmp/contracts")
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        
        self.templates_dir = self.upload_dir / "templates"
        self.templates_dir.mkdir(exist_ok=True)
        
        self.generated_dir = self.upload_dir / "generated"
        self.generated_dir.mkdir(exist_ok=True)
        
        # Scoring thresholds for grades
        self.grade_thresholds = {
            "A": 90,
            "B": 80,
            "C": 70,
            "D": 60,
            "F": 0
        }
    
    async def process_request(self, request: Dict[str, Any]) -> AgentResponse:
        """Process legal contract request"""
        
        action = request.get("action", LegalAction.ANALYZE_CONTRACT)
        
        try:
            if action == LegalAction.ANALYZE_CONTRACT:
                result = await self._analyze_contract(request)
            
            elif action == LegalAction.GENERATE_DOCUMENT:
                result = await self._generate_document(request)
            
            elif action == LegalAction.UPLOAD_TEMPLATE:
                result = await self._upload_template(request)
            
            elif action == LegalAction.PARSE_TEMPLATE:
                result = await self._parse_template(request)
            
            elif action == LegalAction.GET_TEMPLATE_VARIABLES:
                result = await self._get_template_variables(request)
            
            elif action == LegalAction.REVIEW_CONTRACT:
                result = await self._review_contract(request)
            
            elif action == LegalAction.COMPARE_CONTRACTS:
                result = await self._compare_contracts(request)
            
            elif action == LegalAction.CHECK_COMPLIANCE:
                result = await self._check_compliance(request)
            
            elif action == LegalAction.ASSESS_RISK:
                result = await self._assess_risk(request)
            
            else:
                raise ValueError(f"Unknown action: {action}")
            
            return AgentResponse(
                status=AgentStatus.SUCCESS,
                data=result,
                message=f"Legal {action} completed successfully"
            )
        
        except Exception as e:
            self.logger.error(f"Legal contract error: {str(e)}")
            return AgentResponse(
                status=AgentStatus.ERROR,
                data=None,
                message=f"Legal contract operation failed: {str(e)}"
            )
    
    async def _analyze_contract(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze uploaded contract and provide scoring and feedback
        """
        file_path = request.get("file_path")
        file_content = request.get("file_content")  # Base64 encoded
        file_type = request.get("file_type", "pdf")
        contract_type = request.get("contract_type", ContractType.OTHER)
        party2_name = request.get("party2_name", "Unknown")
        user_id = request.get("user_id")
        
        # Save uploaded file
        if file_content:
            file_path = await self._save_uploaded_file(file_content, file_type)
        
        if not file_path or not os.path.exists(file_path):
            raise ValueError("Contract file not found")
        
        # Extract text from document
        document_text = await self.analyzer.extract_text(file_path, file_type)
        
        # Perform comprehensive analysis
        analysis_tasks = [
            self.analyzer.analyze_contract(document_text, contract_type),
            self.risk_evaluator.evaluate_risk(document_text, contract_type),
            self.compliance_checker.check_compliance(document_text, contract_type),
            self.analyzer.extract_clauses(document_text),
            self.analyzer.identify_missing_clauses(document_text, contract_type)
        ]
        
        results = await asyncio.gather(*analysis_tasks)
        
        base_analysis = results[0]
        risk_assessment = results[1]
        compliance_check = results[2]
        extracted_clauses = results[3]
        missing_clauses = results[4]
        
        # Calculate overall score
        overall_score = self._calculate_overall_score(
            base_analysis,
            risk_assessment,
            compliance_check
        )
        
        # Determine grade
        grade = self._calculate_grade(overall_score)
        
        # Generate comprehensive feedback
        feedback = self._generate_feedback(
            overall_score,
            grade,
            base_analysis,
            risk_assessment,
            compliance_check,
            missing_clauses
        )
        
        # Store analysis in database
        async with get_db_session() as db:
            contract = await self._store_contract_analysis(
                db,
                file_path=file_path,
                file_type=file_type,
                contract_type=contract_type,
                party2_name=party2_name,
                overall_score=overall_score,
                grade=grade,
                detailed_scores=base_analysis["scores"],
                feedback=feedback,
                missing_clauses=missing_clauses,
                risky_provisions=risk_assessment.get("risky_provisions", []),
                user_id=user_id
            )
            
            contract_id = contract.id
        
        return {
            "contract_id": contract_id,
            "overall_score": overall_score,
            "grade": grade,
            "detailed_scores": base_analysis["scores"],
            "feedback": feedback,
            "extracted_clauses": extracted_clauses,
            "missing_clauses": missing_clauses,
            "risk_assessment": risk_assessment,
            "compliance_check": compliance_check,
            "recommendations": self._generate_recommendations(
                overall_score,
                missing_clauses,
                risk_assessment
            ),
            "summary": self._generate_summary(overall_score, grade, feedback)
        }
    
    async def _generate_document(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate new contract document from template with variables
        """
        template_id = request.get("template_id")
        variables = request.get("variables", {})
        output_format = request.get("output_format", "pdf")
        user_id = request.get("user_id")
        
        async with get_db_session() as db:
            # Get template
            template = await db.get(ContractTemplate, template_id)
            if not template:
                raise ValueError(f"Template {template_id} not found")
            
            # Validate variables against template requirements
            validation_result = await self.parser.validate_variables(
                template.variables,
                variables
            )
            
            if not validation_result["is_valid"]:
                raise ValueError(f"Variable validation failed: {validation_result['errors']}")
            
            # Generate document
            generated_path = await self.generator.generate_from_template(
                template_path=template.file_path,
                variables=variables,
                output_format=output_format,
                output_dir=str(self.generated_dir)
            )
            
            # Create contract record
            contract = Contract(
                contract_number=generate_id("CTR"),
                title=variables.get("contract_title", f"Contract from {template.name}"),
                contract_type=template.contract_type,
                status=ContractStatus.DRAFT,
                party1_name=variables.get("party1_name", "Our Company"),
                party2_name=variables.get("party2_name", "Counterparty"),
                template_id=template_id,
                template_variables=variables,
                generated_file_path=generated_path,
                original_file_type=output_format,
                created_by=user_id
            )
            
            db.add(contract)
            
            # Update template usage stats
            template.usage_count += 1
            template.last_used_at = datetime.utcnow()
            
            await db.commit()
            await db.refresh(contract)
        
        return {
            "contract_id": contract.id,
            "contract_number": contract.contract_number,
            "file_path": generated_path,
            "download_url": f"/api/legal/document/{contract.id}",
            "status": "generated",
            "message": "Contract generated successfully"
        }
    
    async def _upload_template(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """
        Upload and process new contract template
        """
        file_content = request.get("file_content")  # Base64 encoded
        file_type = request.get("file_type", "docx")
        template_name = request.get("name")
        contract_type = request.get("contract_type", ContractType.OTHER)
        category = request.get("category")
        user_id = request.get("user_id")
        
        # Save template file
        template_path = await self._save_template_file(
            file_content,
            file_type,
            template_name
        )
        
        # Parse template to extract variables
        variables = await self.parser.extract_variables(template_path, file_type)
        
        # Analyze template for risk and compliance
        template_text = await self.analyzer.extract_text(template_path, file_type)
        risk_assessment = await self.risk_evaluator.evaluate_template(template_text)
        
        # Store template in database
        async with get_db_session() as db:
            template = ContractTemplate(
                template_code=generate_id("TMPL"),
                name=template_name,
                contract_type=contract_type,
                category=category,
                file_path=template_path,
                file_type=file_type,
                variables=variables,
                variable_count=len(variables),
                risk_level=risk_assessment["risk_level"],
                created_by=user_id
            )
            
            db.add(template)
            await db.commit()
            await db.refresh(template)
            
            template_id = template.id
        
        return {
            "template_id": template_id,
            "template_code": template.template_code,
            "name": template_name,
            "variables": variables,
            "variable_count": len(variables),
            "risk_level": risk_assessment["risk_level"],
            "status": "uploaded",
            "message": f"Template uploaded with {len(variables)} variables identified"
        }
    
    async def _parse_template(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse template to extract variables and structure
        """
        template_id = request.get("template_id")
        
        async with get_db_session() as db:
            template = await db.get(ContractTemplate, template_id)
            if not template:
                raise ValueError(f"Template {template_id} not found")
            
            # Re-parse template
            variables = await self.parser.extract_variables(
                template.file_path,
                template.file_type
            )
            
            # Analyze structure
            structure = await self.parser.analyze_structure(
                template.file_path,
                template.file_type
            )
            
            # Update template
            template.variables = variables
            template.variable_count = len(variables)
            template.metadata = {
                "structure": structure,
                "last_parsed": datetime.utcnow().isoformat()
            }
            
            await db.commit()
        
        return {
            "template_id": template_id,
            "variables": variables,
            "structure": structure,
            "variable_count": len(variables)
        }
    
    async def _get_template_variables(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """
        Get variables for a template with their definitions
        """
        template_id = request.get("template_id")
        
        async with get_db_session() as db:
            template = await db.get(ContractTemplate, template_id)
            if not template:
                raise ValueError(f"Template {template_id} not found")
            
            # Enhance variables with UI hints
            enhanced_variables = self.parser.enhance_variables_for_ui(
                template.variables
            )
        
        return {
            "template_id": template_id,
            "template_name": template.name,
            "contract_type": template.contract_type,
            "variables": enhanced_variables,
            "sections": self.parser.group_variables_by_section(enhanced_variables)
        }
    
    def _calculate_overall_score(
        self,
        base_analysis: Dict,
        risk_assessment: Dict,
        compliance_check: Dict
    ) -> float:
        """Calculate overall contract score"""
        
        scores = base_analysis.get("scores", {})
        
        # Weighted average of different scoring dimensions
        weights = {
            "completeness": 0.20,
            "risk_coverage": 0.25,
            "legal_compliance": 0.25,
            "clarity": 0.15,
            "commercial_protection": 0.15
        }
        
        weighted_score = sum(
            scores.get(dimension, 50) * weight
            for dimension, weight in weights.items()
        )
        
        # Apply penalties for high risks or compliance issues
        if risk_assessment.get("risk_level") == RiskLevel.CRITICAL:
            weighted_score *= 0.7
        elif risk_assessment.get("risk_level") == RiskLevel.HIGH:
            weighted_score *= 0.85
        
        if not compliance_check.get("is_compliant", True):
            weighted_score *= 0.8
        
        return min(100, max(0, weighted_score))
    
    def _calculate_grade(self, score: float) -> str:
        """Calculate letter grade from score"""
        
        if score >= 95:
            return "A+"
        elif score >= 90:
            return "A"
        elif score >= 87:
            return "A-"
        elif score >= 83:
            return "B+"
        elif score >= 80:
            return "B"
        elif score >= 77:
            return "B-"
        elif score >= 73:
            return "C+"
        elif score >= 70:
            return "C"
        elif score >= 67:
            return "C-"
        elif score >= 63:
            return "D+"
        elif score >= 60:
            return "D"
        else:
            return "F"
    
    def _generate_feedback(
        self,
        overall_score: float,
        grade: str,
        base_analysis: Dict,
        risk_assessment: Dict,
        compliance_check: Dict,
        missing_clauses: List[str]
    ) -> Dict[str, Any]:
        """Generate comprehensive feedback"""
        
        strengths = []
        weaknesses = []
        recommendations = []
        
        # Analyze scores for strengths and weaknesses
        scores = base_analysis.get("scores", {})
        
        for dimension, score in scores.items():
            if score >= 85:
                strengths.append(f"Strong {dimension.replace('_', ' ')}: {score:.0f}/100")
            elif score < 60:
                weaknesses.append(f"Weak {dimension.replace('_', ' ')}: {score:.0f}/100")
        
        # Add risk-based feedback
        if risk_assessment.get("risk_level") in [RiskLevel.HIGH, RiskLevel.CRITICAL]:
            weaknesses.append(f"High risk level identified: {risk_assessment.get('risk_level')}")
            recommendations.append("Urgent: Address high-risk provisions immediately")
        
        # Add compliance feedback
        if not compliance_check.get("is_compliant", True):
            weaknesses.append("Compliance issues detected")
            for issue in compliance_check.get("issues", []):
                recommendations.append(f"Fix compliance: {issue}")
        
        # Add missing clauses feedback
        if missing_clauses:
            weaknesses.append(f"Missing {len(missing_clauses)} important clauses")
            for clause in missing_clauses[:3]:  # Top 3
                recommendations.append(f"Add clause: {clause}")
        
        # Generate grade explanation
        grade_explanation = self._explain_grade(grade, overall_score)
        
        return {
            "strengths": strengths,
            "weaknesses": weaknesses,
            "recommendations": recommendations,
            "grade_explanation": grade_explanation,
            "risk_summary": risk_assessment.get("summary", ""),
            "compliance_summary": compliance_check.get("summary", "")
        }
    
    def _explain_grade(self, grade: str, score: float) -> str:
        """Explain why the grade was given"""
        
        explanations = {
            "A+": f"Excellent contract (Score: {score:.1f}/100). This contract provides comprehensive protection with minimal risk.",
            "A": f"Very good contract (Score: {score:.1f}/100). Well-drafted with strong protections and clear terms.",
            "A-": f"Good contract with minor improvements needed (Score: {score:.1f}/100). Solid foundation with a few areas to enhance.",
            "B+": f"Above average contract (Score: {score:.1f}/100). Generally good but missing some important protections.",
            "B": f"Acceptable contract (Score: {score:.1f}/100). Adequate protection but several areas need improvement.",
            "B-": f"Below average contract (Score: {score:.1f}/100). Basic protections present but significant gaps exist.",
            "C+": f"Marginal contract (Score: {score:.1f}/100). Some protections but substantial improvements required.",
            "C": f"Weak contract (Score: {score:.1f}/100). Limited protection with many important clauses missing.",
            "C-": f"Very weak contract (Score: {score:.1f}/100). Minimal protection and high risk exposure.",
            "D+": f"Poor contract (Score: {score:.1f}/100). Inadequate protection with serious deficiencies.",
            "D": f"Very poor contract (Score: {score:.1f}/100). Major issues throughout requiring complete revision.",
            "F": f"Failing contract (Score: {score:.1f}/100). Unacceptable risk level. Do not proceed without major changes."
        }
        
        return explanations.get(grade, f"Score: {score:.1f}/100")
    
    def _generate_recommendations(
        self,
        overall_score: float,
        missing_clauses: List[str],
        risk_assessment: Dict
    ) -> List[str]:
        """Generate actionable recommendations"""
        
        recommendations = []
        
        # Score-based recommendations
        if overall_score < 60:
            recommendations.append("Consider complete contract revision or use a different template")
        elif overall_score < 75:
            recommendations.append("Review and strengthen key protection clauses")
        
        # Missing clauses recommendations
        for clause in missing_clauses[:5]:  # Top 5
            recommendations.append(f"Add {clause} clause for better protection")
        
        # Risk-based recommendations
        for risk in risk_assessment.get("top_risks", [])[:3]:
            recommendations.append(f"Mitigate risk: {risk}")
        
        return recommendations
    
    def _generate_summary(
        self,
        overall_score: float,
        grade: str,
        feedback: Dict
    ) -> str:
        """Generate executive summary"""
        
        strength_count = len(feedback.get("strengths", []))
        weakness_count = len(feedback.get("weaknesses", []))
        
        summary = f"Contract Analysis Summary: Grade {grade} ({overall_score:.1f}/100)\n\n"
        summary += f"Identified {strength_count} strengths and {weakness_count} areas for improvement. "
        
        if grade in ["A+", "A", "A-"]:
            summary += "This contract provides strong protection and is ready for use with minor adjustments."
        elif grade in ["B+", "B", "B-"]:
            summary += "This contract is acceptable but would benefit from addressing the identified weaknesses."
        elif grade in ["C+", "C", "C-"]:
            summary += "This contract requires significant improvements before execution."
        else:
            summary += "This contract has major deficiencies and should not be executed without substantial revision."
        
        return summary
    
    async def _store_contract_analysis(
        self,
        db: AsyncSession,
        **kwargs
    ) -> Contract:
        """Store contract and analysis in database"""
        
        # Create contract record
        contract = Contract(
            contract_number=generate_id("CTR"),
            title=kwargs.get("title", "Analyzed Contract"),
            contract_type=kwargs.get("contract_type", ContractType.OTHER),
            status=ContractStatus.UNDER_REVIEW,
            party2_name=kwargs.get("party2_name", "Unknown"),
            original_file_path=kwargs.get("file_path"),
            original_file_type=kwargs.get("file_type"),
            overall_score=kwargs.get("overall_score"),
            grade=kwargs.get("grade"),
            completeness_score=kwargs.get("detailed_scores", {}).get("completeness"),
            risk_coverage_score=kwargs.get("detailed_scores", {}).get("risk_coverage"),
            legal_compliance_score=kwargs.get("detailed_scores", {}).get("legal_compliance"),
            clarity_score=kwargs.get("detailed_scores", {}).get("clarity"),
            commercial_protection_score=kwargs.get("detailed_scores", {}).get("commercial_protection"),
            strengths=kwargs.get("feedback", {}).get("strengths", []),
            weaknesses=kwargs.get("feedback", {}).get("weaknesses", []),
            recommendations=kwargs.get("feedback", {}).get("recommendations", []),
            missing_clauses=kwargs.get("missing_clauses", []),
            risky_provisions=kwargs.get("risky_provisions", []),
            created_by=kwargs.get("user_id")
        )
        
        # Calculate file hash
        if kwargs.get("file_path") and os.path.exists(kwargs.get("file_path")):
            with open(kwargs.get("file_path"), "rb") as f:
                contract.file_hash = hashlib.sha256(f.read()).hexdigest()
        
        db.add(contract)
        
        # Create analysis record
        analysis = ContractAnalysis(
            contract=contract,
            analysis_type="initial",
            overall_score=kwargs.get("overall_score"),
            grade=kwargs.get("grade"),
            detailed_scores=kwargs.get("detailed_scores", {}),
            feedback=kwargs.get("feedback", {}),
            missing_clauses=kwargs.get("missing_clauses", []),
            risky_provisions=kwargs.get("risky_provisions", []),
            analyzed_by=kwargs.get("user_id")
        )
        
        db.add(analysis)
        
        await db.commit()
        await db.refresh(contract)
        
        return contract
    
    async def _save_uploaded_file(
        self,
        file_content: bytes,
        file_type: str
    ) -> str:
        """Save uploaded file to disk"""
        
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        filename = f"contract_{timestamp}.{file_type}"
        file_path = self.upload_dir / filename
        
        # Decode base64 if needed
        if isinstance(file_content, str):
            import base64
            file_content = base64.b64decode(file_content)
        
        with open(file_path, "wb") as f:
            f.write(file_content)
        
        return str(file_path)
    
    async def _save_template_file(
        self,
        file_content: bytes,
        file_type: str,
        template_name: str
    ) -> str:
        """Save template file to disk"""
        
        # Clean template name for filename
        safe_name = "".join(c for c in template_name if c.isalnum() or c in (' ', '-', '_')).rstrip()
        safe_name = safe_name.replace(' ', '_')
        
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        filename = f"{safe_name}_{timestamp}.{file_type}"
        file_path = self.templates_dir / filename
        
        # Decode base64 if needed
        if isinstance(file_content, str):
            import base64
            file_content = base64.b64decode(file_content)
        
        with open(file_path, "wb") as f:
            f.write(file_content)
        
        return str(file_path)
    
    async def _review_contract(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Review existing contract"""
        # Implementation for reviewing stored contracts
        pass
    
    async def _compare_contracts(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Compare two contracts"""
        # Implementation for comparing contracts
        pass
    
    async def _check_compliance(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Check contract compliance"""
        # Delegate to compliance checker
        pass
    
    async def _assess_risk(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Assess contract risk"""
        # Delegate to risk evaluator
        pass