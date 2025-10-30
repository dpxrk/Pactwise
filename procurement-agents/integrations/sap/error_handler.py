"""SAP Error Handler Module"""

import logging
from typing import Any, Dict, List, Optional


class SAPErrorHandler:
    """Handle SAP errors and provide meaningful messages"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
        # Common SAP error codes and their meanings
        self.error_codes = {
            # Purchase Order errors
            "ME001": "Purchase order already exists",
            "ME002": "Vendor not found",
            "ME003": "Material not found",
            "ME004": "Invalid quantity",
            "ME005": "Invalid delivery date",
            "ME006": "Budget exceeded",
            "ME007": "Approval required",
            "ME008": "Contract expired",
            "ME009": "Price variance too high",
            "ME010": "Purchasing organization not authorized",
            
            # Vendor errors
            "VE001": "Vendor already exists",
            "VE002": "Invalid vendor data",
            "VE003": "Missing required vendor fields",
            "VE004": "Vendor blocked",
            "VE005": "Invalid tax number",
            
            # Material errors
            "MM001": "Material does not exist",
            "MM002": "Material blocked for procurement",
            "MM003": "Material not extended to plant",
            "MM004": "Invalid material group",
            
            # Authorization errors
            "AU001": "User not authorized for this transaction",
            "AU002": "No authorization for company code",
            "AU003": "No authorization for purchasing organization",
            "AU004": "No authorization for document type",
            
            # System errors
            "SY001": "System error occurred",
            "SY002": "Database error",
            "SY003": "Lock conflict",
            "SY004": "Number range exhausted",
            
            # RFC errors
            "RFC001": "Connection failed",
            "RFC002": "Function module not found",
            "RFC003": "Invalid parameters",
            "RFC004": "Timeout occurred"
        }
        
        # Error resolution suggestions
        self.resolutions = {
            "ME001": "Check if PO number already exists and use change function instead",
            "ME002": "Verify vendor number or create vendor first",
            "ME003": "Check material number or create material master",
            "ME004": "Ensure quantity is positive and within allowed limits",
            "ME005": "Delivery date must be in the future",
            "ME006": "Check budget availability or request approval",
            "ME007": "Submit for approval through appropriate workflow",
            "ME008": "Renew contract or select different vendor",
            "ME009": "Check price against contract or request approval for variance",
            "ME010": "Check user authorization for purchasing organization",
            
            "VE001": "Use vendor change function or check for duplicate",
            "VE002": "Review vendor data for completeness",
            "VE003": "Ensure all mandatory vendor fields are provided",
            "VE004": "Contact vendor management to unblock vendor",
            "VE005": "Verify tax identification number format",
            
            "MM001": "Verify material number or create material first",
            "MM002": "Contact material management to unblock material",
            "MM003": "Extend material to required plant",
            "MM004": "Use valid material group from configuration",
            
            "AU001": "Request authorization from security administrator",
            "AU002": "Request company code authorization",
            "AU003": "Request purchasing organization authorization",
            "AU004": "Request document type authorization",
            
            "SY001": "Contact system administrator",
            "SY002": "Check database connection and retry",
            "SY003": "Wait and retry or contact administrator",
            "SY004": "Contact administrator to extend number range",
            
            "RFC001": "Check network connection and SAP system availability",
            "RFC002": "Verify function module name and availability",
            "RFC003": "Review parameter requirements for function",
            "RFC004": "Increase timeout or optimize query"
        }
    
    def handle_bapi_error(self, error: Exception) -> Dict[str, Any]:
        """Handle BAPI errors and return structured response"""
        error_str = str(error)
        
        # Parse error details
        error_code = self._extract_error_code(error_str)
        error_message = self._extract_error_message(error_str)
        
        # Get resolution suggestion
        resolution = self.resolutions.get(error_code, "Contact SAP administrator for assistance")
        
        # Log error
        self.logger.error(f"SAP Error {error_code}: {error_message}")
        
        return {
            "success": False,
            "error_code": error_code,
            "error_message": error_message or self.error_codes.get(error_code, "Unknown error"),
            "resolution": resolution,
            "technical_details": error_str,
            "retry_possible": self._is_retryable(error_code)
        }
    
    def parse_return_messages(self, return_data: List[Dict]) -> Dict[str, List[Dict]]:
        """Parse and categorize BAPI return messages"""
        messages = {
            "errors": [],
            "warnings": [],
            "info": [],
            "success": []
        }
        
        for msg in return_data:
            msg_type = msg.get("TYPE", "")
            msg_text = msg.get("MESSAGE", "")
            msg_id = msg.get("ID", "")
            msg_number = msg.get("NUMBER", "")
            
            # Create structured message
            structured_msg = {
                "code": f"{msg_id}{msg_number}",
                "text": msg_text,
                "field": msg.get("FIELD", ""),
                "resolution": self._get_resolution_for_message(msg_id, msg_number)
            }
            
            # Categorize by type
            if msg_type == "E":  # Error
                messages["errors"].append(structured_msg)
            elif msg_type == "W":  # Warning
                messages["warnings"].append(structured_msg)
            elif msg_type == "I":  # Info
                messages["info"].append(structured_msg)
            elif msg_type == "S":  # Success
                messages["success"].append(structured_msg)
        
        return messages
    
    def validate_bapi_result(self, result: Dict) -> bool:
        """Validate BAPI result and check for errors"""
        if "RETURN" not in result:
            return True  # No return messages, assume success
        
        return_data = result["RETURN"]
        if isinstance(return_data, dict):
            return_data = [return_data]
        
        # Check for errors
        has_errors = any(msg.get("TYPE") == "E" for msg in return_data)
        has_abort = any(msg.get("TYPE") == "A" for msg in return_data)
        
        return not (has_errors or has_abort)
    
    def format_error_response(self, errors: List[Dict]) -> str:
        """Format error messages for user display"""
        if not errors:
            return "No errors"
        
        formatted = []
        for error in errors:
            if isinstance(error, dict):
                code = error.get("code", "")
                text = error.get("text", "Unknown error")
                resolution = error.get("resolution", "")
                
                msg = f"• {text}"
                if code:
                    msg = f"• [{code}] {text}"
                if resolution:
                    msg += f"\n  Resolution: {resolution}"
                
                formatted.append(msg)
            else:
                formatted.append(f"• {error}")
        
        return "\n".join(formatted)
    
    def _extract_error_code(self, error_str: str) -> str:
        """Extract error code from error string"""
        # Try to find SAP error code pattern
        import re
        
        # Pattern for SAP error codes (e.g., ME001, VE002)
        pattern = r'([A-Z]{2}\d{3})'
        match = re.search(pattern, error_str)
        
        if match:
            return match.group(1)
        
        # Check for RFC errors
        if "RFC" in error_str or "Connection" in error_str:
            return "RFC001"
        elif "Authorization" in error_str or "not authorized" in error_str.lower():
            return "AU001"
        elif "lock" in error_str.lower():
            return "SY003"
        
        return "SY001"  # Default system error
    
    def _extract_error_message(self, error_str: str) -> str:
        """Extract meaningful error message"""
        # Remove technical details
        import re
        
        # Remove stack trace if present
        lines = error_str.split('\n')
        if lines:
            return lines[0].strip()
        
        return error_str
    
    def _is_retryable(self, error_code: str) -> bool:
        """Check if error is retryable"""
        retryable_codes = [
            "SY003",  # Lock conflict
            "RFC001",  # Connection failed
            "RFC004"  # Timeout
        ]
        
        return error_code in retryable_codes
    
    def _get_resolution_for_message(self, msg_id: str, msg_number: str) -> str:
        """Get resolution for specific message ID and number"""
        # Map specific SAP message IDs to resolutions
        message_resolutions = {
            "06010": "Check purchase order number",
            "06020": "Verify vendor exists and is not blocked",
            "06030": "Check material master data",
            "06040": "Review quantity and unit of measure",
            "06050": "Verify delivery date is valid",
            "06060": "Check authorization for this transaction",
            "06070": "Review pricing conditions",
            "06080": "Check contract validity",
            "06090": "Verify account assignment",
            "06100": "Check approval workflow status"
        }
        
        key = f"{msg_id}{msg_number}"
        return message_resolutions.get(key, "")
    
    def create_user_friendly_message(self, technical_error: str) -> str:
        """Convert technical error to user-friendly message"""
        # Map technical terms to user-friendly language
        replacements = {
            "BAPI": "system function",
            "RFC": "connection",
            "Authorization object": "permission",
            "Lock entry": "record is being edited by another user",
            "Number range": "document numbering sequence",
            "Commit work": "save operation",
            "Material master": "product information",
            "Vendor master": "supplier information"
        }
        
        message = technical_error
        for technical, friendly in replacements.items():
            message = message.replace(technical, friendly)
        
        return message