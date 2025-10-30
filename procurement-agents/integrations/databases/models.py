"""Database Models for Procurement Agents System"""

from datetime import datetime
from decimal import Decimal
from enum import Enum as PyEnum
from typing import List, Optional

from sqlalchemy import (
    JSON, Boolean, Column, DateTime, Enum, Float, ForeignKey, Index,
    Integer, Numeric, String, Text, UniqueConstraint
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

Base = declarative_base()


# Enums
class VendorStatus(str, PyEnum):
    """Vendor status enumeration"""
    PROSPECTIVE = "prospective"
    ONBOARDING = "onboarding"
    ACTIVE = "active"
    SUSPENDED = "suspended"
    BLACKLISTED = "blacklisted"
    INACTIVE = "inactive"


class POStatus(str, PyEnum):
    """Purchase Order status enumeration"""
    DRAFT = "draft"
    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    SENT_TO_VENDOR = "sent_to_vendor"
    ACKNOWLEDGED = "acknowledged"
    PARTIALLY_RECEIVED = "partially_received"
    RECEIVED = "received"
    CANCELLED = "cancelled"
    CLOSED = "closed"


class RequisitionStatus(str, PyEnum):
    """Requisition status enumeration"""
    DRAFT = "draft"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    PO_CREATED = "po_created"
    CANCELLED = "cancelled"


class InvoiceStatus(str, PyEnum):
    """Invoice status enumeration"""
    RECEIVED = "received"
    PROCESSING = "processing"
    THREE_WAY_MATCHED = "three_way_matched"
    EXCEPTION = "exception"
    APPROVED = "approved"
    PAYMENT_SCHEDULED = "payment_scheduled"
    PAID = "paid"
    DISPUTED = "disputed"


class ContractStatus(str, PyEnum):
    """Contract status enumeration"""
    DRAFT = "draft"
    UNDER_NEGOTIATION = "under_negotiation"
    PENDING_SIGNATURES = "pending_signatures"
    ACTIVE = "active"
    EXPIRING_SOON = "expiring_soon"
    EXPIRED = "expired"
    TERMINATED = "terminated"


class ApprovalStatus(str, PyEnum):
    """Approval status enumeration"""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    ESCALATED = "escalated"
    DELEGATED = "delegated"


# Models
class Vendor(Base):
    """Vendor master data model"""
    __tablename__ = "vendors"
    
    id = Column(Integer, primary_key=True)
    vendor_code = Column(String(50), unique=True, nullable=False, index=True)
    company_name = Column(String(255), nullable=False)
    registration_number = Column(String(100))
    tax_id = Column(String(50))
    status = Column(Enum(VendorStatus), default=VendorStatus.PROSPECTIVE)
    
    # Contact Information
    primary_contact_name = Column(String(255))
    primary_contact_email = Column(String(255))
    primary_contact_phone = Column(String(50))
    address_line1 = Column(String(255))
    address_line2 = Column(String(255))
    city = Column(String(100))
    state_province = Column(String(100))
    postal_code = Column(String(20))
    country = Column(String(100))
    
    # Business Information
    categories = Column(JSON)  # List of product/service categories
    payment_terms = Column(String(50))
    currency = Column(String(3), default="USD")
    credit_limit = Column(Numeric(15, 2))
    
    # Performance Metrics
    on_time_delivery_rate = Column(Float, default=0.0)
    quality_rating = Column(Float, default=0.0)
    response_time_hours = Column(Float, default=0.0)
    total_spend = Column(Numeric(15, 2), default=0)
    
    # Compliance
    certifications = Column(JSON)  # List of certifications
    insurance_expiry = Column(DateTime)
    agreement_expiry = Column(DateTime)
    
    # Risk Assessment
    risk_score = Column(Float, default=0.0)
    financial_health_score = Column(Float, default=0.0)
    compliance_score = Column(Float, default=0.0)
    
    # SAP Integration
    sap_vendor_number = Column(String(50))
    
    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    onboarded_at = Column(DateTime)
    last_review_date = Column(DateTime)
    
    # Relationships
    purchase_orders = relationship("PurchaseOrder", back_populates="vendor")
    contracts = relationship("Contract", back_populates="vendor")
    invoices = relationship("Invoice", back_populates="vendor")
    rfq_responses = relationship("RFQResponse", back_populates="vendor")
    
    # Indexes
    __table_args__ = (
        Index("idx_vendor_status", "status"),
        Index("idx_vendor_country", "country"),
        Index("idx_vendor_risk_score", "risk_score"),
    )


class Requisition(Base):
    """Purchase requisition model"""
    __tablename__ = "requisitions"
    
    id = Column(Integer, primary_key=True)
    requisition_number = Column(String(50), unique=True, nullable=False, index=True)
    status = Column(Enum(RequisitionStatus), default=RequisitionStatus.DRAFT)
    
    # Requester Information
    requester_id = Column(String(100), nullable=False)
    requester_name = Column(String(255))
    department = Column(String(100))
    cost_center = Column(String(50))
    
    # Request Details
    title = Column(String(500), nullable=False)
    description = Column(Text)
    category = Column(String(100))
    urgency = Column(String(20))  # normal, urgent, emergency
    required_by = Column(DateTime)
    
    # Financial
    estimated_amount = Column(Numeric(15, 2))
    currency = Column(String(3), default="USD")
    budget_code = Column(String(50))
    
    # Items
    line_items = Column(JSON)  # List of requested items
    
    # Vendor Selection
    suggested_vendor_id = Column(Integer, ForeignKey("vendors.id"))
    vendor_justification = Column(Text)
    
    # Approval
    current_approver_id = Column(String(100))
    approval_chain = Column(JSON)  # List of approvers
    approval_history = Column(JSON)  # Approval actions taken
    
    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    submitted_at = Column(DateTime)
    approved_at = Column(DateTime)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    purchase_order = relationship("PurchaseOrder", back_populates="requisition", uselist=False)
    suggested_vendor = relationship("Vendor")
    
    # Indexes
    __table_args__ = (
        Index("idx_requisition_status", "status"),
        Index("idx_requisition_requester", "requester_id"),
        Index("idx_requisition_department", "department"),
    )


class PurchaseOrder(Base):
    """Purchase Order model"""
    __tablename__ = "purchase_orders"
    
    id = Column(Integer, primary_key=True)
    po_number = Column(String(50), unique=True, nullable=False, index=True)
    status = Column(Enum(POStatus), default=POStatus.DRAFT)
    
    # Reference
    requisition_id = Column(Integer, ForeignKey("requisitions.id"))
    contract_id = Column(Integer, ForeignKey("contracts.id"))
    
    # Vendor
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=False)
    vendor_name = Column(String(255))  # Denormalized for performance
    
    # Financial
    total_amount = Column(Numeric(15, 2), nullable=False)
    tax_amount = Column(Numeric(15, 2), default=0)
    shipping_cost = Column(Numeric(15, 2), default=0)
    discount_amount = Column(Numeric(15, 2), default=0)
    currency = Column(String(3), default="USD")
    payment_terms = Column(String(100))
    
    # Delivery
    delivery_date = Column(DateTime)
    delivery_address = Column(Text)
    incoterms = Column(String(10))  # FOB, CIF, etc.
    
    # Items
    line_items = Column(JSON)  # Detailed line items
    
    # SAP Integration
    sap_po_number = Column(String(50))
    sap_sync_status = Column(String(20))
    sap_sync_date = Column(DateTime)
    
    # Approval
    approval_status = Column(Enum(ApprovalStatus), default=ApprovalStatus.PENDING)
    approval_history = Column(JSON)
    
    # Tracking
    acknowledgment_date = Column(DateTime)
    goods_received_date = Column(DateTime)
    invoice_received = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    sent_at = Column(DateTime)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    closed_at = Column(DateTime)
    
    # Relationships
    vendor = relationship("Vendor", back_populates="purchase_orders")
    requisition = relationship("Requisition", back_populates="purchase_order")
    contract = relationship("Contract", back_populates="purchase_orders")
    invoices = relationship("Invoice", back_populates="purchase_order")
    goods_receipts = relationship("GoodsReceipt", back_populates="purchase_order")
    
    # Indexes
    __table_args__ = (
        Index("idx_po_status", "status"),
        Index("idx_po_vendor", "vendor_id"),
        Index("idx_po_created", "created_at"),
    )


class Invoice(Base):
    """Invoice model"""
    __tablename__ = "invoices"
    
    id = Column(Integer, primary_key=True)
    invoice_number = Column(String(100), nullable=False)
    status = Column(Enum(InvoiceStatus), default=InvoiceStatus.RECEIVED)
    
    # Vendor
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=False)
    vendor_invoice_number = Column(String(100))
    
    # PO Reference
    purchase_order_id = Column(Integer, ForeignKey("purchase_orders.id"))
    po_number = Column(String(50))  # Denormalized
    
    # Financial
    invoice_amount = Column(Numeric(15, 2), nullable=False)
    tax_amount = Column(Numeric(15, 2), default=0)
    currency = Column(String(3), default="USD")
    
    # Dates
    invoice_date = Column(DateTime, nullable=False)
    due_date = Column(DateTime)
    received_date = Column(DateTime, server_default=func.now())
    
    # Processing
    three_way_match_status = Column(String(50))
    match_variance = Column(Numeric(15, 2))
    exception_reason = Column(Text)
    
    # Payment
    payment_status = Column(String(50))
    payment_date = Column(DateTime)
    payment_reference = Column(String(100))
    
    # Document
    document_url = Column(String(500))
    ocr_extracted_data = Column(JSON)
    
    # GL Coding
    gl_coding = Column(JSON)
    cost_center = Column(String(50))
    
    # Approval
    approval_status = Column(Enum(ApprovalStatus))
    approved_by = Column(String(100))
    approved_at = Column(DateTime)
    
    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    vendor = relationship("Vendor", back_populates="invoices")
    purchase_order = relationship("PurchaseOrder", back_populates="invoices")
    
    # Indexes
    __table_args__ = (
        UniqueConstraint("vendor_id", "vendor_invoice_number", name="uq_vendor_invoice"),
        Index("idx_invoice_status", "status"),
        Index("idx_invoice_vendor", "vendor_id"),
        Index("idx_invoice_po", "purchase_order_id"),
    )


class Contract(Base):
    """Contract model"""
    __tablename__ = "contracts"
    
    id = Column(Integer, primary_key=True)
    contract_number = Column(String(50), unique=True, nullable=False, index=True)
    status = Column(Enum(ContractStatus), default=ContractStatus.DRAFT)
    
    # Parties
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=False)
    contract_type = Column(String(50))  # master_agreement, purchase, service, nda
    
    # Details
    title = Column(String(500), nullable=False)
    description = Column(Text)
    category = Column(String(100))
    
    # Value
    total_value = Column(Numeric(15, 2))
    spent_value = Column(Numeric(15, 2), default=0)
    currency = Column(String(3), default="USD")
    
    # Terms
    payment_terms = Column(String(100))
    delivery_terms = Column(Text)
    termination_clause = Column(Text)
    
    # Dates
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    signed_date = Column(DateTime)
    renewal_date = Column(DateTime)
    
    # Documents
    document_url = Column(String(500))
    template_used = Column(String(100))
    clauses = Column(JSON)  # List of contract clauses
    
    # Renewal
    auto_renewal = Column(Boolean, default=False)
    renewal_notice_days = Column(Integer, default=90)
    renewal_notified = Column(Boolean, default=False)
    
    # Performance
    sla_terms = Column(JSON)
    kpi_metrics = Column(JSON)
    
    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    vendor = relationship("Vendor", back_populates="contracts")
    purchase_orders = relationship("PurchaseOrder", back_populates="contract")
    
    # Indexes
    __table_args__ = (
        Index("idx_contract_status", "status"),
        Index("idx_contract_vendor", "vendor_id"),
        Index("idx_contract_end_date", "end_date"),
    )


class SpendTransaction(Base):
    """Spend transaction for analytics"""
    __tablename__ = "spend_transactions"
    
    id = Column(Integer, primary_key=True)
    
    # Reference
    source_type = Column(String(50))  # po, invoice, credit_card, expense_report
    source_id = Column(String(100))
    
    # Transaction Details
    transaction_date = Column(DateTime, nullable=False, index=True)
    amount = Column(Numeric(15, 2), nullable=False)
    currency = Column(String(3), default="USD")
    
    # Classification
    category = Column(String(100), index=True)
    subcategory = Column(String(100))
    gl_account = Column(String(50))
    cost_center = Column(String(50), index=True)
    department = Column(String(100), index=True)
    
    # Vendor
    vendor_id = Column(Integer, ForeignKey("vendors.id"))
    vendor_name = Column(String(255))
    
    # Contract
    contract_id = Column(Integer, ForeignKey("contracts.id"))
    on_contract = Column(Boolean, default=False)
    
    # Analytics
    maverick_spend = Column(Boolean, default=False)
    savings_opportunity = Column(Numeric(15, 2))
    
    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    
    # Indexes
    __table_args__ = (
        Index("idx_spend_date", "transaction_date"),
        Index("idx_spend_category", "category"),
        Index("idx_spend_vendor", "vendor_id"),
    )


class GoodsReceipt(Base):
    """Goods receipt model"""
    __tablename__ = "goods_receipts"
    
    id = Column(Integer, primary_key=True)
    receipt_number = Column(String(50), unique=True, nullable=False, index=True)
    
    # PO Reference
    purchase_order_id = Column(Integer, ForeignKey("purchase_orders.id"), nullable=False)
    po_number = Column(String(50))  # Denormalized
    
    # Receipt Details
    receipt_date = Column(DateTime, nullable=False)
    received_by = Column(String(100))
    
    # Items
    line_items = Column(JSON)  # Items with quantities received
    
    # Status
    full_receipt = Column(Boolean, default=True)
    quality_check_passed = Column(Boolean, default=True)
    notes = Column(Text)
    
    # SAP Integration
    sap_material_document = Column(String(50))
    
    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    
    # Relationships
    purchase_order = relationship("PurchaseOrder", back_populates="goods_receipts")


class ApprovalWorkflow(Base):
    """Approval workflow configuration"""
    __tablename__ = "approval_workflows"
    
    id = Column(Integer, primary_key=True)
    
    # Workflow Definition
    document_type = Column(String(50), nullable=False)  # requisition, po, invoice
    workflow_name = Column(String(100), nullable=False)
    active = Column(Boolean, default=True)
    
    # Conditions
    min_amount = Column(Numeric(15, 2))
    max_amount = Column(Numeric(15, 2))
    category = Column(String(100))
    department = Column(String(100))
    
    # Approval Chain
    approval_levels = Column(JSON)  # List of approval levels with roles
    
    # Settings
    allow_delegation = Column(Boolean, default=True)
    auto_escalate_hours = Column(Integer, default=48)
    require_all_approvals = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Indexes
    __table_args__ = (
        Index("idx_workflow_type", "document_type"),
        Index("idx_workflow_active", "active"),
    )


class RFQRequest(Base):
    """Request for Quote model"""
    __tablename__ = "rfq_requests"
    
    id = Column(Integer, primary_key=True)
    rfq_number = Column(String(50), unique=True, nullable=False, index=True)
    
    # RFQ Details
    title = Column(String(500), nullable=False)
    description = Column(Text)
    category = Column(String(100))
    
    # Requirements
    specifications = Column(JSON)
    quantity = Column(Numeric(15, 2))
    delivery_date = Column(DateTime)
    
    # Timeline
    issued_date = Column(DateTime, server_default=func.now())
    question_deadline = Column(DateTime)
    submission_deadline = Column(DateTime)
    
    # Evaluation
    evaluation_criteria = Column(JSON)
    scoring_weights = Column(JSON)
    
    # Status
    status = Column(String(50), default="active")
    
    # Selected Vendor
    selected_vendor_id = Column(Integer, ForeignKey("vendors.id"))
    selection_date = Column(DateTime)
    
    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    responses = relationship("RFQResponse", back_populates="rfq_request")


class RFQResponse(Base):
    """RFQ Response from vendors"""
    __tablename__ = "rfq_responses"
    
    id = Column(Integer, primary_key=True)
    
    # References
    rfq_request_id = Column(Integer, ForeignKey("rfq_requests.id"), nullable=False)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=False)
    
    # Response
    unit_price = Column(Numeric(15, 2))
    total_price = Column(Numeric(15, 2))
    currency = Column(String(3), default="USD")
    
    # Terms
    payment_terms = Column(String(100))
    delivery_date = Column(DateTime)
    validity_period_days = Column(Integer)
    
    # Documents
    proposal_document_url = Column(String(500))
    
    # Evaluation
    technical_score = Column(Float)
    commercial_score = Column(Float)
    total_score = Column(Float)
    rank = Column(Integer)
    
    # Status
    status = Column(String(50), default="submitted")
    
    # Timestamps
    submitted_at = Column(DateTime, server_default=func.now())
    evaluated_at = Column(DateTime)
    
    # Relationships
    rfq_request = relationship("RFQRequest", back_populates="responses")
    vendor = relationship("Vendor", back_populates="rfq_responses")
    
    # Indexes
    __table_args__ = (
        UniqueConstraint("rfq_request_id", "vendor_id", name="uq_rfq_vendor"),
    )


class SavingsCategory(Base):
    """Savings category for tracking procurement savings"""
    __tablename__ = "savings_categories"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    fiscal_year = Column(String(4), nullable=False, index=True)
    description = Column(Text)
    
    # Metrics (auto-calculated from initiatives)
    total_amount = Column(Numeric(15, 2), default=0)
    initiative_count = Column(Integer, default=0)
    
    # Display Order
    display_order = Column(Integer, default=0)
    
    # Status
    active = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    initiatives = relationship("SavingsInitiative", back_populates="category", cascade="all, delete-orphan")
    
    # Indexes
    __table_args__ = (
        UniqueConstraint("name", "fiscal_year", name="uq_category_fiscal_year"),
        Index("idx_category_fiscal_year", "fiscal_year"),
        Index("idx_category_active", "active"),
    )


class SavingsInitiative(Base):
    """Individual savings initiative/project"""
    __tablename__ = "savings_initiatives"
    
    id = Column(Integer, primary_key=True)
    initiative_id = Column(String(50), unique=True, nullable=False, index=True)
    
    # Basic Info
    title = Column(String(500), nullable=False)
    description = Column(Text)
    fiscal_year = Column(String(4), nullable=False, index=True)
    
    # Category
    category_id = Column(Integer, ForeignKey("savings_categories.id"), nullable=False)
    
    # Status
    status = Column(String(50), default="proposed", index=True)  # proposed, in_progress, realized, cancelled
    
    # Financial
    amount = Column(Numeric(15, 2), nullable=False)
    currency = Column(String(3), default="USD")
    realized_amount = Column(Numeric(15, 2), default=0)
    
    # Vendor
    vendor_id = Column(Integer, ForeignKey("vendors.id"))
    vendor_name = Column(String(255))
    
    # Dates
    initiated_date = Column(DateTime, nullable=False)
    target_date = Column(DateTime)
    realized_date = Column(DateTime)
    
    # Owner
    owner_id = Column(String(100))
    owner_name = Column(String(255))
    department = Column(String(100))
    
    # Documentation
    documents = Column(JSON)  # List of document URLs
    notes = Column(Text)
    
    # Validation
    validation_method = Column(String(100))  # price_comparison, contract_savings, etc.
    validated = Column(Boolean, default=False)
    validated_by = Column(String(100))
    validated_at = Column(DateTime)
    
    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    category = relationship("SavingsCategory", back_populates="initiatives")
    vendor = relationship("Vendor")
    
    # Indexes
    __table_args__ = (
        Index("idx_initiative_fiscal_year", "fiscal_year"),
        Index("idx_initiative_status", "status"),
        Index("idx_initiative_category", "category_id"),
        Index("idx_initiative_vendor", "vendor_id"),
        Index("idx_initiative_dates", "initiated_date", "realized_date"),
    )


class SavingsFiscalYear(Base):
    """Fiscal year configuration for savings tracking"""
    __tablename__ = "savings_fiscal_years"
    
    id = Column(Integer, primary_key=True)
    fiscal_year = Column(String(4), unique=True, nullable=False, index=True)
    
    # Targets
    annual_target = Column(Numeric(15, 2), nullable=False)
    quarterly_targets = Column(JSON)  # Q1-Q4 targets
    
    # Actuals (auto-calculated)
    ytd_actual = Column(Numeric(15, 2), default=0)
    projected_eoy = Column(Numeric(15, 2), default=0)
    
    # Status
    active = Column(Boolean, default=False)
    locked = Column(Boolean, default=False)  # Lock after year end
    
    # Dates
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    
    # Notes
    notes = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class MonthlySpend(Base):
    """Monthly spend tracking for trend analysis"""
    __tablename__ = "monthly_spend"
    
    id = Column(Integer, primary_key=True)
    
    # Period
    fiscal_year = Column(String(4), nullable=False, index=True)
    month = Column(Integer, nullable=False)  # 1-12
    month_name = Column(String(10))  # Jan, Feb, etc.
    
    # Spend Data
    total_spend = Column(Numeric(15, 2), default=0)
    savings_amount = Column(Numeric(15, 2), default=0)
    
    # By Category
    category_breakdown = Column(JSON)  # {category_name: amount}
    
    # By Vendor
    top_vendors = Column(JSON)  # [{vendor_name, amount}]
    
    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Indexes
    __table_args__ = (
        UniqueConstraint("fiscal_year", "month", name="uq_fiscal_month"),
        Index("idx_monthly_fiscal_year", "fiscal_year"),
    )


class AuditLog(Base):
    """Audit log for compliance"""
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True)
    
    # Event Details
    event_type = Column(String(100), nullable=False, index=True)
    entity_type = Column(String(50), index=True)
    entity_id = Column(String(100))
    
    # User Information
    user_id = Column(String(100), nullable=False, index=True)
    user_name = Column(String(255))
    user_role = Column(String(50))
    
    # Change Details
    action = Column(String(50), nullable=False)  # create, update, delete, approve, reject
    old_values = Column(JSON)
    new_values = Column(JSON)
    
    # Context
    ip_address = Column(String(45))
    user_agent = Column(String(500))
    session_id = Column(String(100))
    
    # Timestamps
    created_at = Column(DateTime, server_default=func.now(), index=True)
    
    # Indexes
    __table_args__ = (
        Index("idx_audit_user_date", "user_id", "created_at"),
        Index("idx_audit_entity", "entity_type", "entity_id"),
    )