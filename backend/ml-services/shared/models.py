"""
Shared Pydantic models for ML services.
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any, Literal
from datetime import datetime
from enum import Enum


class AnalysisType(str, Enum):
    """Types of analysis available."""
    RISK = "risk"
    COMPLIANCE = "compliance"
    FULL = "full"
    QUICK = "quick"
    DEEP = "deep"


class ConfidenceLevel(str, Enum):
    """Confidence levels for predictions."""
    VERY_LOW = "very_low"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    VERY_HIGH = "very_high"


class RiskLevel(str, Enum):
    """Risk severity levels."""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    MINIMAL = "minimal"


# Contract Intelligence Models
class ContractClause(BaseModel):
    """Represents a contract clause."""
    id: str
    type: str
    text: str
    start_pos: int
    end_pos: int
    importance: float = Field(ge=0, le=1)
    risk_level: RiskLevel
    obligations: List[str] = []
    deadlines: List[datetime] = []
    monetary_values: List[float] = []


class RiskFactor(BaseModel):
    """Risk factor in a contract."""
    category: str
    description: str
    severity: float = Field(ge=0, le=1)
    location: Optional[Dict[str, int]] = None
    mitigation: Optional[str] = None
    confidence: float = Field(ge=0, le=1)


class ComplianceCheck(BaseModel):
    """Compliance check result."""
    regulation: str
    compliant: bool
    score: float = Field(ge=0, le=100)
    issues: List[str] = []
    recommendations: List[str] = []
    confidence: ConfidenceLevel


class ContractRequest(BaseModel):
    """Request for contract analysis."""
    text: str
    analysis_type: AnalysisType = AnalysisType.FULL
    regulations: List[str] = ["GDPR", "CCPA", "SOC2"]
    language: str = "en"
    include_explanations: bool = True
    max_processing_time: Optional[int] = None  # milliseconds


class ContractResponse(BaseModel):
    """Response from contract analysis."""
    request_id: str
    clauses: List[ContractClause]
    risk_score: float = Field(ge=0, le=100)
    risk_factors: List[RiskFactor]
    compliance_checks: List[ComplianceCheck]
    overall_compliance_score: float = Field(ge=0, le=100)
    recommendations: List[str]
    key_obligations: List[Dict[str, Any]]
    timeline: List[Dict[str, Any]]
    confidence: ConfidenceLevel
    processing_time_ms: int
    model_version: str


# Vendor Risk Models
class VendorMetrics(BaseModel):
    """Vendor performance metrics."""
    on_time_delivery: float = Field(ge=0, le=100)
    quality_score: float = Field(ge=0, le=100)
    response_time: float = Field(ge=0, le=100)
    cost_efficiency: float = Field(ge=0, le=100)
    compliance_rate: float = Field(ge=0, le=100)


class VendorRisk(BaseModel):
    """Vendor risk assessment."""
    level: RiskLevel
    category: str
    description: str
    impact: str
    likelihood: float = Field(ge=0, le=1)
    mitigation_strategies: List[str] = []


class VendorRequest(BaseModel):
    """Request for vendor risk analysis."""
    vendor_id: Optional[str] = None
    vendor_data: str
    historical_data: Optional[List[Dict[str, Any]]] = None
    time_horizon: int = 90  # days
    include_predictions: bool = True


class VendorResponse(BaseModel):
    """Response from vendor risk analysis."""
    vendor_id: Optional[str]
    overall_score: float = Field(ge=0, le=100)
    performance_grade: str
    metrics: VendorMetrics
    risks: List[VendorRisk]
    predictions: Optional[Dict[str, Any]] = None
    early_warnings: List[str] = []
    recommendations: List[str]
    confidence: ConfidenceLevel
    processing_time_ms: int


# Negotiation Models
class NegotiationPosition(BaseModel):
    """Negotiation position analysis."""
    strength: Literal["strong", "moderate", "weak"]
    leverage_points: List[str]
    weaknesses: List[str]
    batna: Optional[str] = None  # Best Alternative to Negotiated Agreement


class NegotiationStrategy(BaseModel):
    """Negotiation strategy recommendation."""
    approach: Literal["competitive", "collaborative", "accommodating", "avoiding"]
    priorities: List[Dict[str, Any]]
    concessions: List[str]
    red_lines: List[str]
    talking_points: List[Dict[str, str]]


class NegotiationRequest(BaseModel):
    """Request for negotiation analysis."""
    current_terms: str
    desired_terms: str
    context: Literal["new", "renewal", "renegotiation"] = "renegotiation"
    counterparty_info: Optional[str] = None
    historical_data: Optional[List[Dict[str, Any]]] = None


class NegotiationResponse(BaseModel):
    """Response from negotiation analysis."""
    position: NegotiationPosition
    strategy: NegotiationStrategy
    predicted_outcomes: List[Dict[str, Any]]
    success_probability: float = Field(ge=0, le=1)
    potential_value: Dict[str, float]
    recommendations: List[str]
    confidence: ConfidenceLevel
    processing_time_ms: int


# Document Understanding Models
class DocumentEntity(BaseModel):
    """Entity extracted from document."""
    type: str
    value: str
    confidence: float = Field(ge=0, le=1)
    location: Optional[Dict[str, int]] = None
    context: Optional[str] = None


class DocumentSection(BaseModel):
    """Document section analysis."""
    title: str
    content: str
    section_type: str
    importance: float = Field(ge=0, le=1)
    entities: List[DocumentEntity] = []
    summary: Optional[str] = None


class DocumentRequest(BaseModel):
    """Request for document understanding."""
    document: str  # Base64 encoded or text
    document_type: Optional[str] = None
    extract_tables: bool = True
    extract_entities: bool = True
    generate_summary: bool = True
    ocr_required: bool = False


class DocumentResponse(BaseModel):
    """Response from document understanding."""
    document_type: str
    sections: List[DocumentSection]
    entities: List[DocumentEntity]
    tables: Optional[List[Dict[str, Any]]] = None
    summary: Optional[str] = None
    metadata: Dict[str, Any]
    confidence: ConfidenceLevel
    processing_time_ms: int


# Shared Error Model
class ErrorResponse(BaseModel):
    """Error response from ML services."""
    error: str
    error_code: str
    details: Optional[Dict[str, Any]] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    request_id: Optional[str] = None