"""Database Models for Legal Contract Management"""

from datetime import datetime
from enum import Enum as PyEnum
from typing import Optional

from sqlalchemy import (
    JSON, Boolean, Column, DateTime, Enum, Float, ForeignKey, Index,
    Integer, String, Text, UniqueConstraint
)
from sqlalchemy.orm import relationship

from .models import Base


class ContractStatus(str, PyEnum):
    """Contract status enumeration"""
    DRAFT = "draft"
    UNDER_REVIEW = "under_review"
    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    SIGNED = "signed"
    ACTIVE = "active"
    EXPIRED = "expired"
    TERMINATED = "terminated"
    DISPUTED = "disputed"


class ContractType(str, PyEnum):
    """Contract type enumeration"""
    NDA = "nda"
    MSA = "msa"  # Master Service Agreement
    SOW = "sow"  # Statement of Work
    PURCHASE = "purchase"
    SALES = "sales"
    EMPLOYMENT = "employment"
    CONSULTING = "consulting"
    LICENSE = "license"
    PARTNERSHIP = "partnership"
    OTHER = "other"


class RiskLevel(str, PyEnum):
    """Risk level enumeration"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class Contract(Base):
    """Contract record model"""
    __tablename__ = "contracts"
    
    id = Column(Integer, primary_key=True)
    contract_number = Column(String(50), unique=True, nullable=False, index=True)
    
    # Basic Information
    title = Column(String(255), nullable=False)
    contract_type = Column(Enum(ContractType), nullable=False)
    status = Column(Enum(ContractStatus), default=ContractStatus.DRAFT, nullable=False)
    
    # Parties
    party1_name = Column(String(255), nullable=False)  # Our company
    party1_address = Column(Text)
    party1_contact = Column(String(255))
    
    party2_name = Column(String(255), nullable=False)  # Counterparty
    party2_address = Column(Text)
    party2_contact = Column(String(255))
    party2_entity_type = Column(String(50))  # Company, Individual, etc.
    
    # Contract Details
    description = Column(Text)
    value = Column(Float, default=0)
    currency = Column(String(3), default="USD")
    
    # Dates
    effective_date = Column(DateTime)
    expiry_date = Column(DateTime)
    signed_date = Column(DateTime)
    
    # Document Storage
    original_file_path = Column(Text)  # Path to original uploaded file
    original_file_type = Column(String(10))  # pdf, docx, etc.
    generated_file_path = Column(Text)  # Path to generated document
    file_hash = Column(String(64))  # SHA-256 hash for integrity
    
    # Template Information (if generated from template)
    template_id = Column(Integer, ForeignKey("contract_templates.id"))
    template_variables = Column(JSON)  # Variables used in generation
    
    # Analysis Results
    overall_score = Column(Float)  # 0-100
    grade = Column(String(2))  # A+, A, B, C, D, F
    risk_level = Column(Enum(RiskLevel))
    
    # Detailed Scores
    completeness_score = Column(Float)
    risk_coverage_score = Column(Float)
    legal_compliance_score = Column(Float)
    clarity_score = Column(Float)
    commercial_protection_score = Column(Float)
    
    # Analysis Feedback
    strengths = Column(JSON)  # List of strengths
    weaknesses = Column(JSON)  # List of weaknesses
    recommendations = Column(JSON)  # List of recommendations
    missing_clauses = Column(JSON)  # List of missing important clauses
    risky_provisions = Column(JSON)  # List of risky provisions found
    
    # Metadata
    created_by = Column(Integer, ForeignKey("users.id"))
    reviewed_by = Column(Integer, ForeignKey("users.id"))
    approved_by = Column(Integer, ForeignKey("users.id"))
    
    department = Column(String(100))
    project_id = Column(String(50))
    vendor_id = Column(Integer, ForeignKey("vendors.id"))
    
    # Compliance
    jurisdiction = Column(String(100))
    governing_law = Column(String(100))
    compliance_checked = Column(Boolean, default=False)
    compliance_notes = Column(Text)
    
    # Audit
    created_at = Column(DateTime, server_default="CURRENT_TIMESTAMP")
    updated_at = Column(DateTime, onupdate="CURRENT_TIMESTAMP")
    last_reviewed_at = Column(DateTime)
    
    # Version Control
    version = Column(Integer, default=1)
    parent_contract_id = Column(Integer, ForeignKey("contracts.id"))  # For amendments
    
    # Additional metadata
    metadata = Column(JSON, default=dict)
    
    # Relationships
    template = relationship("ContractTemplate", back_populates="contracts")
    analyses = relationship("ContractAnalysis", back_populates="contract", cascade="all, delete-orphan")
    clauses = relationship("ContractClause", back_populates="contract", cascade="all, delete-orphan")
    
    # Indexes
    __table_args__ = (
        Index("idx_contract_status", "status"),
        Index("idx_contract_type", "contract_type"),
        Index("idx_contract_dates", "effective_date", "expiry_date"),
        Index("idx_contract_party2", "party2_name"),
    )


class ContractTemplate(Base):
    """Contract template model"""
    __tablename__ = "contract_templates"
    
    id = Column(Integer, primary_key=True)
    template_code = Column(String(50), unique=True, nullable=False, index=True)
    
    # Template Information
    name = Column(String(255), nullable=False)
    description = Column(Text)
    contract_type = Column(Enum(ContractType), nullable=False)
    
    # Template File
    file_path = Column(Text, nullable=False)
    file_type = Column(String(10), nullable=False)  # docx, pdf
    file_size = Column(Integer)  # Size in bytes
    
    # Template Category
    category = Column(String(100))
    subcategory = Column(String(100))
    
    # Usage
    is_active = Column(Boolean, default=True)
    is_approved = Column(Boolean, default=False)
    approval_date = Column(DateTime)
    approved_by = Column(Integer, ForeignKey("users.id"))
    
    # Version
    version = Column(String(20), default="1.0")
    parent_template_id = Column(Integer, ForeignKey("contract_templates.id"))
    
    # Risk and Compliance
    risk_level = Column(Enum(RiskLevel), default=RiskLevel.MEDIUM)
    compliance_verified = Column(Boolean, default=False)
    jurisdictions = Column(JSON)  # List of applicable jurisdictions
    
    # Variables (automatically extracted)
    variables = Column(JSON)  # List of variable definitions
    variable_count = Column(Integer, default=0)
    
    # Standard Clauses
    standard_clauses = Column(JSON)  # List of standard clause IDs included
    
    # Metadata
    created_by = Column(Integer, ForeignKey("users.id"))
    department = Column(String(100))
    
    # Usage Statistics
    usage_count = Column(Integer, default=0)
    last_used_at = Column(DateTime)
    average_generation_time = Column(Float)  # In seconds
    
    # Audit
    created_at = Column(DateTime, server_default="CURRENT_TIMESTAMP")
    updated_at = Column(DateTime, onupdate="CURRENT_TIMESTAMP")
    
    # Additional metadata
    metadata = Column(JSON, default=dict)
    
    # Relationships
    contracts = relationship("Contract", back_populates="template")
    variables_list = relationship("TemplateVariable", back_populates="template", cascade="all, delete-orphan")


class TemplateVariable(Base):
    """Template variable definition"""
    __tablename__ = "template_variables"
    
    id = Column(Integer, primary_key=True)
    template_id = Column(Integer, ForeignKey("contract_templates.id"), nullable=False)
    
    # Variable Definition
    variable_key = Column(String(100), nullable=False)  # e.g., "party2_name"
    variable_label = Column(String(255), nullable=False)  # e.g., "Counterparty Name"
    variable_type = Column(String(50), nullable=False)  # text, number, date, select, etc.
    
    # Variable Properties
    is_required = Column(Boolean, default=True)
    default_value = Column(Text)
    placeholder = Column(String(255))
    help_text = Column(Text)
    
    # Validation Rules
    validation_rules = Column(JSON)  # Min/max length, regex pattern, etc.
    options = Column(JSON)  # For select/dropdown types
    format = Column(String(50))  # currency, percentage, email, etc.
    
    # Position
    section = Column(String(100))  # Which section of the document
    order_index = Column(Integer, default=0)  # Display order
    
    # Conditional Logic
    depends_on = Column(String(100))  # Another variable key
    condition = Column(JSON)  # Condition for showing this variable
    
    # Metadata
    created_at = Column(DateTime, server_default="CURRENT_TIMESTAMP")
    updated_at = Column(DateTime, onupdate="CURRENT_TIMESTAMP")
    
    # Relationship
    template = relationship("ContractTemplate", back_populates="variables_list")
    
    # Unique constraint
    __table_args__ = (
        UniqueConstraint("template_id", "variable_key", name="_template_variable_uc"),
        Index("idx_template_variable", "template_id", "variable_key"),
    )


class ContractAnalysis(Base):
    """Contract analysis history"""
    __tablename__ = "contract_analyses"
    
    id = Column(Integer, primary_key=True)
    contract_id = Column(Integer, ForeignKey("contracts.id"), nullable=False)
    
    # Analysis Information
    analysis_type = Column(String(50))  # initial, review, amendment
    analysis_version = Column(Integer, default=1)
    
    # Scores
    overall_score = Column(Float, nullable=False)
    grade = Column(String(2), nullable=False)
    
    detailed_scores = Column(JSON, nullable=False)
    # {
    #   "completeness": 90,
    #   "risk_coverage": 85,
    #   "legal_compliance": 95,
    #   "clarity": 80,
    #   "commercial_protection": 88
    # }
    
    # Analysis Results
    feedback = Column(JSON, nullable=False)
    # {
    #   "strengths": [...],
    #   "weaknesses": [...],
    #   "recommendations": [...],
    #   "risk_flags": [...]
    # }
    
    identified_clauses = Column(JSON)  # List of identified clauses
    missing_clauses = Column(JSON)  # List of missing important clauses
    risky_provisions = Column(JSON)  # List of risky provisions
    
    # AI/ML Model Information
    model_used = Column(String(100))  # Which AI model was used
    model_version = Column(String(20))
    confidence_score = Column(Float)  # Confidence in the analysis
    
    # Processing Information
    processing_time = Column(Float)  # Time in seconds
    word_count = Column(Integer)
    page_count = Column(Integer)
    
    # Reviewer Information
    analyzed_by = Column(Integer, ForeignKey("users.id"))
    reviewed_by = Column(Integer, ForeignKey("users.id"))
    review_notes = Column(Text)
    
    # Timestamps
    analyzed_at = Column(DateTime, server_default="CURRENT_TIMESTAMP")
    reviewed_at = Column(DateTime)
    
    # Relationship
    contract = relationship("Contract", back_populates="analyses")


class ContractClause(Base):
    """Individual contract clauses"""
    __tablename__ = "contract_clauses"
    
    id = Column(Integer, primary_key=True)
    contract_id = Column(Integer, ForeignKey("contracts.id"), nullable=False)
    
    # Clause Information
    clause_type = Column(String(100), nullable=False)  # payment_terms, liability, etc.
    clause_title = Column(String(255))
    clause_number = Column(String(20))  # Section number in contract
    
    # Content
    clause_text = Column(Text, nullable=False)
    normalized_text = Column(Text)  # Standardized version for comparison
    
    # Analysis
    risk_level = Column(Enum(RiskLevel))
    compliance_status = Column(String(50))  # compliant, non-compliant, needs_review
    
    # Flags
    is_standard = Column(Boolean, default=False)
    is_modified = Column(Boolean, default=False)
    needs_review = Column(Boolean, default=False)
    
    # Recommendations
    recommended_changes = Column(Text)
    alternative_text = Column(Text)
    
    # Position
    start_position = Column(Integer)  # Character position in document
    end_position = Column(Integer)
    page_number = Column(Integer)
    
    # Library Reference
    library_clause_id = Column(Integer, ForeignKey("clause_library.id"))
    similarity_score = Column(Float)  # How similar to library clause (0-1)
    
    # Metadata
    created_at = Column(DateTime, server_default="CURRENT_TIMESTAMP")
    
    # Relationship
    contract = relationship("Contract", back_populates="clauses")
    library_clause = relationship("ClauseLibrary")


class ClauseLibrary(Base):
    """Standard clause library"""
    __tablename__ = "clause_library"
    
    id = Column(Integer, primary_key=True)
    clause_code = Column(String(50), unique=True, nullable=False, index=True)
    
    # Clause Information
    clause_type = Column(String(100), nullable=False, index=True)
    clause_title = Column(String(255), nullable=False)
    clause_category = Column(String(100))
    
    # Content
    standard_text = Column(Text, nullable=False)
    plain_english = Column(Text)  # Simplified explanation
    
    # Variations
    variations = Column(JSON)  # Different versions for different scenarios
    # [
    #   {"scenario": "high_risk", "text": "..."},
    #   {"scenario": "low_value", "text": "..."}
    # ]
    
    # Risk and Compliance
    risk_level = Column(Enum(RiskLevel), default=RiskLevel.LOW)
    is_mandatory = Column(Boolean, default=False)
    jurisdictions = Column(JSON)  # Applicable jurisdictions
    
    # Usage
    is_active = Column(Boolean, default=True)
    is_approved = Column(Boolean, default=True)
    applicable_contract_types = Column(JSON)  # List of contract types
    
    # Protection
    protects_party = Column(String(20))  # party1, party2, both
    protection_areas = Column(JSON)  # ["liability", "ip", "confidentiality"]
    
    # Dependencies
    requires_clauses = Column(JSON)  # Other clause IDs that must be present
    conflicts_with = Column(JSON)  # Clause IDs that conflict
    
    # Metadata
    created_by = Column(Integer, ForeignKey("users.id"))
    approved_by = Column(Integer, ForeignKey("users.id"))
    department = Column(String(100))
    
    # Usage Statistics
    usage_count = Column(Integer, default=0)
    last_used_at = Column(DateTime)
    effectiveness_score = Column(Float)  # Based on historical outcomes
    
    # Version Control
    version = Column(Integer, default=1)
    parent_clause_id = Column(Integer, ForeignKey("clause_library.id"))
    
    # Audit
    created_at = Column(DateTime, server_default="CURRENT_TIMESTAMP")
    updated_at = Column(DateTime, onupdate="CURRENT_TIMESTAMP")
    reviewed_at = Column(DateTime)
    
    # Additional metadata
    notes = Column(Text)
    references = Column(JSON)  # Legal references, precedents
    
    # Indexes
    __table_args__ = (
        Index("idx_clause_type_category", "clause_type", "clause_category"),
        Index("idx_clause_active_approved", "is_active", "is_approved"),
    )


class ContractEmbedding(Base):
    """Vector embeddings for contract semantic search"""
    __tablename__ = "contract_embeddings"

    id = Column(Integer, primary_key=True)
    contract_id = Column(Integer, ForeignKey("contracts.id", ondelete="CASCADE"), nullable=False)

    # Embedding Information
    embedding_type = Column(String(50), nullable=False)  # full_document, clause, section
    content_hash = Column(String(64), nullable=False, index=True)  # SHA-256 of content

    # Content Reference
    clause_id = Column(Integer, ForeignKey("contract_clauses.id"))
    section_name = Column(String(255))

    # Embedding Vector (stored as JSON array or use pgvector extension)
    embedding = Column(JSON, nullable=False)  # Will be array of floats
    embedding_model = Column(String(100), nullable=False)  # Model used for embedding
    embedding_dimensions = Column(Integer, default=1536)

    # Metadata
    created_at = Column(DateTime, server_default="CURRENT_TIMESTAMP")

    # Indexes
    __table_args__ = (
        Index("idx_embedding_contract", "contract_id"),
        Index("idx_embedding_type", "embedding_type"),
        Index("idx_embedding_hash", "content_hash"),
    )


class ContractRiskAssessment(Base):
    """Detailed risk assessment for contracts"""
    __tablename__ = "contract_risk_assessments"

    id = Column(Integer, primary_key=True)
    contract_id = Column(Integer, ForeignKey("contracts.id", ondelete="CASCADE"), nullable=False)

    # Overall Risk
    overall_risk_level = Column(Enum(RiskLevel), nullable=False)
    overall_risk_score = Column(Float, nullable=False)  # 0-100

    # Risk Categories
    legal_risk_score = Column(Float, default=0)
    financial_risk_score = Column(Float, default=0)
    operational_risk_score = Column(Float, default=0)
    compliance_risk_score = Column(Float, default=0)
    reputational_risk_score = Column(Float, default=0)

    # Detailed Risk Items
    legal_risks = Column(JSON, default=list)
    # [{"type": "ONE_SIDED_INDEMNIFICATION", "severity": "HIGH", "description": "...", "recommendation": "..."}]

    financial_risks = Column(JSON, default=list)
    operational_risks = Column(JSON, default=list)
    compliance_risks = Column(JSON, default=list)
    reputational_risks = Column(JSON, default=list)

    # Critical Issues
    critical_issues = Column(JSON, default=list)
    high_priority_items = Column(JSON, default=list)

    # Recommendations
    recommendations = Column(JSON, default=list)

    # Auto-Approval Eligibility
    auto_approvable = Column(Boolean, default=False)
    auto_approval_blocked_reasons = Column(JSON)

    # Model Information
    assessed_by_model = Column(String(100))
    model_confidence = Column(Float)

    # Human Review
    reviewed_by = Column(Integer, ForeignKey("users.id"))
    review_status = Column(String(50))  # pending_review, reviewed, escalated
    reviewer_notes = Column(Text)
    reviewer_agreement = Column(Boolean)  # Agrees with AI assessment

    # Timestamps
    assessed_at = Column(DateTime, server_default="CURRENT_TIMESTAMP")
    reviewed_at = Column(DateTime)

    # Indexes
    __table_args__ = (
        Index("idx_risk_contract", "contract_id"),
        Index("idx_risk_level", "overall_risk_level"),
        Index("idx_risk_score", "overall_risk_score"),
    )


class ContractPlaybookCompliance(Base):
    """Playbook compliance tracking"""
    __tablename__ = "contract_playbook_compliance"

    id = Column(Integer, primary_key=True)
    contract_id = Column(Integer, ForeignKey("contracts.id", ondelete="CASCADE"), nullable=False)
    playbook_id = Column(Integer, ForeignKey("contract_playbooks.id"), nullable=False)

    # Compliance Score
    compliance_score = Column(Float, nullable=False)  # 0-100
    compliance_grade = Column(String(2))  # A+, A, B, C, D, F

    # Deviations
    missing_required_clauses = Column(JSON, default=list)
    missing_preferred_clauses = Column(JSON, default=list)
    unapproved_clauses = Column(JSON, default=list)
    deviations = Column(JSON, default=list)

    # Requirements Met
    total_requirements = Column(Integer, default=0)
    requirements_met = Column(Integer, default=0)

    # Approval Status
    requires_exception = Column(Boolean, default=False)
    exception_requested = Column(Boolean, default=False)
    exception_approved = Column(Boolean, default=False)
    exception_approver = Column(Integer, ForeignKey("users.id"))
    exception_reason = Column(Text)

    # Timestamps
    assessed_at = Column(DateTime, server_default="CURRENT_TIMESTAMP")
    exception_requested_at = Column(DateTime)
    exception_approved_at = Column(DateTime)

    # Indexes
    __table_args__ = (
        Index("idx_playbook_compliance_contract", "contract_id"),
        Index("idx_playbook_compliance_score", "compliance_score"),
    )


class ContractPlaybook(Base):
    """Contract playbook/standard terms"""
    __tablename__ = "contract_playbooks"

    id = Column(Integer, primary_key=True)
    playbook_code = Column(String(50), unique=True, nullable=False, index=True)

    # Playbook Information
    name = Column(String(255), nullable=False)
    description = Column(Text)
    contract_type = Column(Enum(ContractType), nullable=False)

    # Requirements
    required_clauses = Column(JSON, default=list)  # Must have these
    preferred_clauses = Column(JSON, default=list)  # Should have these
    prohibited_clauses = Column(JSON, default=list)  # Must not have these

    # Risk Thresholds
    max_acceptable_risk_score = Column(Float, default=75)
    auto_approve_threshold = Column(Float, default=90)  # Compliance score

    # Preferred Language
    preferred_language = Column(JSON, default=dict)  # Clause type → preferred text

    # Approval Rules
    approval_matrix = Column(JSON)  # Define who must approve based on conditions

    # Status
    is_active = Column(Boolean, default=True)
    is_approved = Column(Boolean, default=False)

    # Version
    version = Column(String(20), default="1.0")
    parent_playbook_id = Column(Integer, ForeignKey("contract_playbooks.id"))

    # Metadata
    created_by = Column(Integer, ForeignKey("users.id"))
    approved_by = Column(Integer, ForeignKey("users.id"))
    department = Column(String(100))

    # Timestamps
    created_at = Column(DateTime, server_default="CURRENT_TIMESTAMP")
    updated_at = Column(DateTime, onupdate="CURRENT_TIMESTAMP")
    approved_at = Column(DateTime)

    # Indexes
    __table_args__ = (
        Index("idx_playbook_type", "contract_type"),
        Index("idx_playbook_active", "is_active"),
    )


class ContractObligation(Base):
    """Track contractual obligations"""
    __tablename__ = "contract_obligations"

    id = Column(Integer, primary_key=True)
    contract_id = Column(Integer, ForeignKey("contracts.id", ondelete="CASCADE"), nullable=False)
    clause_id = Column(Integer, ForeignKey("contract_clauses.id"))

    # Obligation Details
    obligation_type = Column(String(100), nullable=False, index=True)
    # payment, delivery, reporting, certification, insurance, warranty, etc.

    description = Column(Text, nullable=False)
    party_responsible = Column(String(50), nullable=False)  # party1, party2, both

    # Status
    status = Column(String(50), default="pending", index=True)
    # pending, in_progress, completed, overdue, waived

    # Timing
    due_date = Column(DateTime, index=True)
    reminder_date = Column(DateTime)
    completed_date = Column(DateTime)

    # Recurrence
    is_recurring = Column(Boolean, default=False)
    recurrence_pattern = Column(String(50))  # monthly, quarterly, annually
    next_due_date = Column(DateTime)

    # Completion
    completion_evidence_url = Column(String(500))
    completion_notes = Column(Text)
    completed_by = Column(Integer, ForeignKey("users.id"))

    # Notifications
    notification_sent = Column(Boolean, default=False)
    escalation_sent = Column(Boolean, default=False)

    # Priority
    priority = Column(String(20), default="medium")  # low, medium, high, critical

    # Metadata
    created_at = Column(DateTime, server_default="CURRENT_TIMESTAMP")
    updated_at = Column(DateTime, onupdate="CURRENT_TIMESTAMP")

    # Indexes
    __table_args__ = (
        Index("idx_obligation_contract", "contract_id"),
        Index("idx_obligation_status_due", "status", "due_date"),
        Index("idx_obligation_type", "obligation_type"),
    )


class ContractApproval(Base):
    """Contract approval workflow tracking"""
    __tablename__ = "contract_approvals"

    id = Column(Integer, primary_key=True)
    contract_id = Column(Integer, ForeignKey("contracts.id", ondelete="CASCADE"), nullable=False)

    # Approval Details
    approval_level = Column(Integer, nullable=False)  # 1, 2, 3, etc.
    approver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    approver_role = Column(String(100))

    # Status
    status = Column(String(50), default="pending", index=True)
    # pending, approved, rejected, delegated, escalated

    # Decision
    decision = Column(String(50))  # approved, rejected, approve_with_conditions
    comments = Column(Text)
    conditions = Column(JSON)  # Conditions for approval

    # Delegation
    delegated_to = Column(Integer, ForeignKey("users.id"))
    delegation_reason = Column(Text)
    delegated_at = Column(DateTime)

    # Timing
    requested_at = Column(DateTime, server_default="CURRENT_TIMESTAMP", index=True)
    due_by = Column(DateTime)
    responded_at = Column(DateTime)

    # Escalation
    escalated = Column(Boolean, default=False)
    escalated_to = Column(Integer, ForeignKey("users.id"))
    escalated_at = Column(DateTime)
    escalation_reason = Column(String(255))

    # Notifications
    notification_sent = Column(Boolean, default=False)
    reminder_count = Column(Integer, default=0)
    last_reminder_sent = Column(DateTime)

    # Indexes
    __table_args__ = (
        Index("idx_approval_contract", "contract_id"),
        Index("idx_approval_approver_status", "approver_id", "status"),
        Index("idx_approval_requested", "requested_at"),
    )


class ContractRedline(Base):
    """Redlines/comments on contracts"""
    __tablename__ = "contract_redlines"

    id = Column(Integer, primary_key=True)
    contract_id = Column(Integer, ForeignKey("contracts.id", ondelete="CASCADE"), nullable=False)
    clause_id = Column(Integer, ForeignKey("contract_clauses.id"))

    # Redline Type
    redline_type = Column(String(50), nullable=False)
    # modification, addition, deletion, comment, question

    # Content
    original_text = Column(Text)
    suggested_text = Column(Text)
    rationale = Column(Text)

    # Priority
    priority = Column(String(20), default="medium")  # low, medium, high, critical

    # Position
    page_number = Column(Integer)
    start_position = Column(Integer)
    end_position = Column(Integer)

    # Status
    status = Column(String(50), default="proposed")
    # proposed, accepted, rejected, under_discussion, implemented

    # Author
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    assigned_to = Column(Integer, ForeignKey("users.id"))

    # Resolution
    resolved = Column(Boolean, default=False)
    resolved_by = Column(Integer, ForeignKey("users.id"))
    resolved_at = Column(DateTime)
    resolution_notes = Column(Text)

    # Thread (for discussions)
    parent_redline_id = Column(Integer, ForeignKey("contract_redlines.id"))

    # Timestamps
    created_at = Column(DateTime, server_default="CURRENT_TIMESTAMP")
    updated_at = Column(DateTime, onupdate="CURRENT_TIMESTAMP")

    # Indexes
    __table_args__ = (
        Index("idx_redline_contract", "contract_id"),
        Index("idx_redline_status", "status"),
        Index("idx_redline_created_by", "created_by"),
    )


class ContractVersion(Base):
    """Contract version history"""
    __tablename__ = "contract_versions"

    id = Column(Integer, primary_key=True)
    contract_id = Column(Integer, ForeignKey("contracts.id", ondelete="CASCADE"), nullable=False)

    # Version Information
    version_number = Column(Integer, nullable=False)
    version_label = Column(String(50))  # v1.0, v1.1, draft, final, etc.

    # Content Snapshot
    file_path = Column(Text, nullable=False)
    file_hash = Column(String(64), nullable=False)

    # Changes
    change_summary = Column(Text)
    changes = Column(JSON)  # Detailed list of changes
    redlines_applied = Column(JSON)  # List of redline IDs applied

    # Status
    is_current = Column(Boolean, default=False, index=True)
    is_signed = Column(Boolean, default=False)

    # Metadata
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    change_reason = Column(String(255))

    # Timestamps
    created_at = Column(DateTime, server_default="CURRENT_TIMESTAMP", index=True)

    # Indexes
    __table_args__ = (
        UniqueConstraint("contract_id", "version_number", name="_contract_version_uc"),
        Index("idx_version_contract", "contract_id"),
        Index("idx_version_current", "is_current"),
    )