"""Custom exceptions for the procurement system"""

from typing import Optional, Dict, Any
from enum import Enum


class ErrorCode(str, Enum):
    """Standard error codes for the procurement system"""
    
    # General errors (1000-1999)
    UNKNOWN_ERROR = "PRO-1000"
    VALIDATION_ERROR = "PRO-1001"
    AUTHENTICATION_ERROR = "PRO-1002"
    AUTHORIZATION_ERROR = "PRO-1003"
    NOT_FOUND = "PRO-1004"
    ALREADY_EXISTS = "PRO-1005"
    RATE_LIMIT_EXCEEDED = "PRO-1006"
    
    # Agent errors (2000-2999)
    AGENT_INITIALIZATION_ERROR = "PRO-2000"
    AGENT_EXECUTION_ERROR = "PRO-2001"
    AGENT_TIMEOUT = "PRO-2002"
    AGENT_COMMUNICATION_ERROR = "PRO-2003"
    AGENT_INVALID_STATE = "PRO-2004"
    
    # Integration errors (3000-3999)
    ERP_CONNECTION_ERROR = "PRO-3000"
    ERP_AUTHENTICATION_ERROR = "PRO-3001"
    ERP_DATA_ERROR = "PRO-3002"
    DATABASE_ERROR = "PRO-3003"
    EXTERNAL_API_ERROR = "PRO-3004"
    
    # Business logic errors (4000-4999)
    INSUFFICIENT_BUDGET = "PRO-4000"
    APPROVAL_REQUIRED = "PRO-4001"
    COMPLIANCE_VIOLATION = "PRO-4002"
    CONTRACT_VALIDATION_ERROR = "PRO-4003"
    VENDOR_NOT_QUALIFIED = "PRO-4004"
    INVENTORY_INSUFFICIENT = "PRO-4005"
    
    # Processing errors (5000-5999)
    DOCUMENT_PROCESSING_ERROR = "PRO-5000"
    OCR_EXTRACTION_ERROR = "PRO-5001"
    FILE_FORMAT_ERROR = "PRO-5002"
    DATA_PARSING_ERROR = "PRO-5003"


class ProcurementException(Exception):
    """Base exception for all procurement system errors"""
    
    def __init__(
        self,
        message: str,
        error_code: ErrorCode = ErrorCode.UNKNOWN_ERROR,
        details: Optional[Dict[str, Any]] = None,
        cause: Optional[Exception] = None
    ):
        super().__init__(message)
        self.message = message
        self.error_code = error_code
        self.details = details or {}
        self.cause = cause
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert exception to dictionary for API responses"""
        result = {
            'error': {
                'code': self.error_code,
                'message': self.message,
                'details': self.details
            }
        }
        
        if self.cause:
            result['error']['cause'] = str(self.cause)
        
        return result


# Specific exception classes

class ValidationError(ProcurementException):
    """Raised when data validation fails"""
    
    def __init__(self, message: str, field: str = None, value: Any = None, **kwargs):
        details = kwargs.get('details', {})
        if field:
            details['field'] = field
        if value is not None:
            details['value'] = value
        
        super().__init__(
            message=message,
            error_code=ErrorCode.VALIDATION_ERROR,
            details=details
        )


class AuthenticationError(ProcurementException):
    """Raised when authentication fails"""
    
    def __init__(self, message: str = "Authentication failed", **kwargs):
        super().__init__(
            message=message,
            error_code=ErrorCode.AUTHENTICATION_ERROR,
            **kwargs
        )


class AuthorizationError(ProcurementException):
    """Raised when authorization fails"""
    
    def __init__(self, message: str = "Insufficient permissions", required_permissions: list = None, **kwargs):
        details = kwargs.get('details', {})
        if required_permissions:
            details['required_permissions'] = required_permissions
        
        super().__init__(
            message=message,
            error_code=ErrorCode.AUTHORIZATION_ERROR,
            details=details
        )


class NotFoundError(ProcurementException):
    """Raised when a resource is not found"""
    
    def __init__(self, resource_type: str, resource_id: str = None, **kwargs):
        message = f"{resource_type} not found"
        if resource_id:
            message += f": {resource_id}"
        
        details = kwargs.get('details', {})
        details['resource_type'] = resource_type
        if resource_id:
            details['resource_id'] = resource_id
        
        super().__init__(
            message=message,
            error_code=ErrorCode.NOT_FOUND,
            details=details
        )


class AlreadyExistsError(ProcurementException):
    """Raised when trying to create a resource that already exists"""
    
    def __init__(self, resource_type: str, resource_id: str = None, **kwargs):
        message = f"{resource_type} already exists"
        if resource_id:
            message += f": {resource_id}"
        
        details = kwargs.get('details', {})
        details['resource_type'] = resource_type
        if resource_id:
            details['resource_id'] = resource_id
        
        super().__init__(
            message=message,
            error_code=ErrorCode.ALREADY_EXISTS,
            details=details
        )


# Agent-specific exceptions

class AgentInitializationError(ProcurementException):
    """Raised when an agent fails to initialize"""
    
    def __init__(self, agent_type: str, message: str, **kwargs):
        details = kwargs.get('details', {})
        details['agent_type'] = agent_type
        
        super().__init__(
            message=message,
            error_code=ErrorCode.AGENT_INITIALIZATION_ERROR,
            details=details
        )


class AgentExecutionError(ProcurementException):
    """Raised when an agent fails during execution"""
    
    def __init__(self, agent_id: str, operation: str, message: str, **kwargs):
        details = kwargs.get('details', {})
        details['agent_id'] = agent_id
        details['operation'] = operation
        
        super().__init__(
            message=message,
            error_code=ErrorCode.AGENT_EXECUTION_ERROR,
            details=details
        )


class AgentTimeoutError(ProcurementException):
    """Raised when an agent operation times out"""
    
    def __init__(self, agent_id: str, operation: str, timeout_seconds: int, **kwargs):
        details = kwargs.get('details', {})
        details['agent_id'] = agent_id
        details['operation'] = operation
        details['timeout_seconds'] = timeout_seconds
        
        super().__init__(
            message=f"Agent operation '{operation}' timed out after {timeout_seconds} seconds",
            error_code=ErrorCode.AGENT_TIMEOUT,
            details=details
        )


# Integration exceptions

class ERPConnectionError(ProcurementException):
    """Raised when ERP connection fails"""
    
    def __init__(self, system: str, message: str, **kwargs):
        details = kwargs.get('details', {})
        details['system'] = system
        
        super().__init__(
            message=message,
            error_code=ErrorCode.ERP_CONNECTION_ERROR,
            details=details
        )


class DatabaseError(ProcurementException):
    """Raised when database operations fail"""
    
    def __init__(self, operation: str, message: str, **kwargs):
        details = kwargs.get('details', {})
        details['operation'] = operation
        
        super().__init__(
            message=message,
            error_code=ErrorCode.DATABASE_ERROR,
            details=details
        )


# Business logic exceptions

class InsufficientBudgetError(ProcurementException):
    """Raised when budget is insufficient"""
    
    def __init__(self, required_amount: float, available_amount: float, currency: str = "USD", **kwargs):
        details = kwargs.get('details', {})
        details['required_amount'] = required_amount
        details['available_amount'] = available_amount
        details['currency'] = currency
        details['shortfall'] = required_amount - available_amount
        
        super().__init__(
            message=f"Insufficient budget: Required {currency} {required_amount}, Available {currency} {available_amount}",
            error_code=ErrorCode.INSUFFICIENT_BUDGET,
            details=details
        )


class ApprovalRequiredError(ProcurementException):
    """Raised when approval is required"""
    
    def __init__(self, approval_type: str, approvers: list = None, **kwargs):
        details = kwargs.get('details', {})
        details['approval_type'] = approval_type
        if approvers:
            details['approvers'] = approvers
        
        super().__init__(
            message=f"Approval required: {approval_type}",
            error_code=ErrorCode.APPROVAL_REQUIRED,
            details=details
        )


class ComplianceViolationError(ProcurementException):
    """Raised when compliance rules are violated"""
    
    def __init__(self, rule: str, violation_details: str, **kwargs):
        details = kwargs.get('details', {})
        details['rule'] = rule
        details['violation_details'] = violation_details
        
        super().__init__(
            message=f"Compliance violation: {rule}",
            error_code=ErrorCode.COMPLIANCE_VIOLATION,
            details=details
        )


# Processing exceptions

class DocumentProcessingError(ProcurementException):
    """Raised when document processing fails"""
    
    def __init__(self, document_name: str, operation: str, message: str, **kwargs):
        details = kwargs.get('details', {})
        details['document_name'] = document_name
        details['operation'] = operation
        
        super().__init__(
            message=message,
            error_code=ErrorCode.DOCUMENT_PROCESSING_ERROR,
            details=details
        )


class FileFormatError(ProcurementException):
    """Raised when file format is invalid"""
    
    def __init__(self, filename: str, expected_formats: list, actual_format: str = None, **kwargs):
        details = kwargs.get('details', {})
        details['filename'] = filename
        details['expected_formats'] = expected_formats
        if actual_format:
            details['actual_format'] = actual_format
        
        super().__init__(
            message=f"Invalid file format for {filename}. Expected: {', '.join(expected_formats)}",
            error_code=ErrorCode.FILE_FORMAT_ERROR,
            details=details
        )