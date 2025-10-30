"""SAP BAPI Function Calls"""

import logging
from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional

from .connector import SAPConnector
from .field_mapping import SAPFieldMapper
from .error_handler import SAPErrorHandler


class BAPIFunctions:
    """Wrapper for common BAPI functions"""
    
    def __init__(self, connector: Optional[SAPConnector] = None):
        self.connector = connector or SAPConnector()
        self.field_mapper = SAPFieldMapper()
        self.error_handler = SAPErrorHandler()
        self.logger = logging.getLogger(__name__)
    
    # Purchase Order BAPIs
    
    def create_purchase_order(self, po_data: Dict) -> Dict[str, Any]:
        """Create a purchase order in SAP"""
        try:
            # Map fields to SAP format
            sap_header = self.field_mapper.map_po_header(po_data)
            sap_items = self.field_mapper.map_po_items(po_data.get("items", []))
            
            # Prepare BAPI parameters
            params = {
                "POHEADER": sap_header,
                "POHEADERX": self._create_update_flags(sap_header),
                "POITEM": sap_items["items"],
                "POITEMX": sap_items["items_x"],
                "POSCHEDULE": sap_items["schedules"],
                "POSCHEDULEX": sap_items["schedules_x"]
            }
            
            # Add optional data
            if po_data.get("vendor_address"):
                params["POADDRVENDOR"] = self.field_mapper.map_vendor_address(
                    po_data["vendor_address"]
                )
            
            # Execute BAPI
            result = self.connector.execute_bapi("BAPI_PO_CREATE1", params, commit=True)
            
            if "EXPPURCHASEORDER" in result:
                po_number = result["EXPPURCHASEORDER"]
                self.logger.info(f"Purchase Order created: {po_number}")
                
                return {
                    "success": True,
                    "po_number": po_number,
                    "messages": self._extract_messages(result.get("RETURN", []))
                }
            else:
                return {
                    "success": False,
                    "error": "PO creation failed",
                    "messages": self._extract_messages(result.get("RETURN", []))
                }
                
        except Exception as e:
            self.logger.error(f"Error creating PO: {str(e)}")
            return self.error_handler.handle_bapi_error(e)
    
    def change_purchase_order(self, po_number: str, changes: Dict) -> Dict[str, Any]:
        """Change an existing purchase order"""
        try:
            params = {
                "PURCHASEORDER": po_number,
                "POHEADER": self.field_mapper.map_po_header(changes),
                "POHEADERX": self._create_update_flags(changes, prefix="POHEADER")
            }
            
            if "items" in changes:
                items_data = self.field_mapper.map_po_items(changes["items"])
                params.update({
                    "POITEM": items_data["items"],
                    "POITEMX": items_data["items_x"]
                })
            
            result = self.connector.execute_bapi("BAPI_PO_CHANGE", params, commit=True)
            
            return {
                "success": not self._has_errors(result),
                "messages": self._extract_messages(result.get("RETURN", []))
            }
            
        except Exception as e:
            self.logger.error(f"Error changing PO {po_number}: {str(e)}")
            return self.error_handler.handle_bapi_error(e)
    
    def get_purchase_order_details(self, po_number: str) -> Dict[str, Any]:
        """Get purchase order details from SAP"""
        try:
            params = {
                "PURCHASEORDER": po_number,
                "ITEMS": "X",
                "SCHEDULES": "X",
                "ACCOUNT_ASSIGNMENT": "X",
                "HISTORY": "X"
            }
            
            result = self.connector.execute_bapi("BAPI_PO_GETDETAIL1", params, commit=False)
            
            if "POHEADER" in result:
                return {
                    "success": True,
                    "header": result["POHEADER"],
                    "items": result.get("POITEM", []),
                    "schedules": result.get("POSCHEDULE", []),
                    "history": result.get("POHISTORY", [])
                }
            else:
                return {
                    "success": False,
                    "error": f"PO {po_number} not found"
                }
                
        except Exception as e:
            self.logger.error(f"Error getting PO details for {po_number}: {str(e)}")
            return self.error_handler.handle_bapi_error(e)
    
    def release_purchase_order(self, po_number: str, release_code: str = "") -> Dict[str, Any]:
        """Release a purchase order"""
        try:
            params = {
                "PURCHASEORDER": po_number,
                "PO_REL_CODE": release_code or "01",
                "USE_EXCEPTIONS": " "
            }
            
            result = self.connector.execute_bapi("BAPI_PO_RELEASE", params, commit=True)
            
            return {
                "success": result.get("REL_STATUS_NEW") == "R",  # R = Released
                "release_status": result.get("REL_STATUS_NEW"),
                "messages": self._extract_messages(result.get("RETURN", []))
            }
            
        except Exception as e:
            self.logger.error(f"Error releasing PO {po_number}: {str(e)}")
            return self.error_handler.handle_bapi_error(e)
    
    # Vendor BAPIs
    
    def create_vendor(self, vendor_data: Dict) -> Dict[str, Any]:
        """Create a vendor in SAP"""
        try:
            # Map vendor data
            general_data = self.field_mapper.map_vendor_general(vendor_data)
            company_data = self.field_mapper.map_vendor_company(vendor_data)
            
            params = {
                "GENERALDATA": general_data,
                "GENERALDATAX": self._create_update_flags(general_data),
                "COMPANYDATA": company_data,
                "COMPANYDATAX": self._create_update_flags(company_data)
            }
            
            result = self.connector.execute_bapi("BAPI_VENDOR_CREATE", params, commit=True)
            
            if "VENDOR" in result:
                return {
                    "success": True,
                    "vendor_number": result["VENDOR"],
                    "messages": self._extract_messages(result.get("RETURN", []))
                }
            else:
                return {
                    "success": False,
                    "error": "Vendor creation failed",
                    "messages": self._extract_messages(result.get("RETURN", []))
                }
                
        except Exception as e:
            self.logger.error(f"Error creating vendor: {str(e)}")
            return self.error_handler.handle_bapi_error(e)
    
    def get_vendor_details(self, vendor_number: str) -> Dict[str, Any]:
        """Get vendor details from SAP"""
        try:
            params = {
                "VENDORNO": vendor_number,
                "COMPANYCODE": self.connector.config.client
            }
            
            result = self.connector.execute_bapi("BAPI_VENDOR_GETDETAIL", params, commit=False)
            
            if "GENERALDETAIL" in result:
                return {
                    "success": True,
                    "general": result["GENERALDETAIL"],
                    "company": result.get("COMPANYDETAIL", {}),
                    "bank": result.get("BANKDETAIL", [])
                }
            else:
                return {
                    "success": False,
                    "error": f"Vendor {vendor_number} not found"
                }
                
        except Exception as e:
            self.logger.error(f"Error getting vendor details for {vendor_number}: {str(e)}")
            return self.error_handler.handle_bapi_error(e)
    
    # Material/Service BAPIs
    
    def get_material_details(self, material_number: str) -> Dict[str, Any]:
        """Get material details from SAP"""
        try:
            params = {
                "MATERIAL": material_number,
                "PLANT": "*"  # All plants
            }
            
            result = self.connector.execute_bapi("BAPI_MATERIAL_GET_DETAIL", params, commit=False)
            
            if "MATERIAL_GENERAL_DATA" in result:
                return {
                    "success": True,
                    "general": result["MATERIAL_GENERAL_DATA"],
                    "plant_data": result.get("MATERIALPLANTDATA", []),
                    "valuation": result.get("MATERIALVALUATIONDATA", [])
                }
            else:
                return {
                    "success": False,
                    "error": f"Material {material_number} not found"
                }
                
        except Exception as e:
            self.logger.error(f"Error getting material details for {material_number}: {str(e)}")
            return self.error_handler.handle_bapi_error(e)
    
    # Goods Receipt BAPIs
    
    def create_goods_receipt(self, gr_data: Dict) -> Dict[str, Any]:
        """Create goods receipt for purchase order"""
        try:
            # Map goods receipt data
            header = {
                "PSTNG_DATE": self._format_date(gr_data.get("posting_date", datetime.now())),
                "DOC_DATE": self._format_date(gr_data.get("document_date", datetime.now())),
                "HEADER_TXT": gr_data.get("header_text", ""),
                "BILL_OF_LADING": gr_data.get("delivery_note", "")
            }
            
            items = []
            for item in gr_data.get("items", []):
                items.append({
                    "MATERIAL": item["material"],
                    "PLANT": item.get("plant", "1000"),
                    "STGE_LOC": item.get("storage_location", ""),
                    "MOVE_TYPE": "101",  # Goods receipt for PO
                    "ENTRY_QNT": item["quantity"],
                    "ENTRY_UOM": item.get("unit", "EA"),
                    "PO_NUMBER": gr_data["po_number"],
                    "PO_ITEM": item["po_item"]
                })
            
            params = {
                "GOODSMVT_HEADER": header,
                "GOODSMVT_CODE": {"GM_CODE": "01"},  # Goods receipt for PO
                "GOODSMVT_ITEM": items
            }
            
            result = self.connector.execute_bapi("BAPI_GOODSMVT_CREATE", params, commit=True)
            
            if "MATERIALDOCUMENT" in result:
                return {
                    "success": True,
                    "material_document": result["MATERIALDOCUMENT"],
                    "year": result.get("MATDOCUMENTYEAR"),
                    "messages": self._extract_messages(result.get("RETURN", []))
                }
            else:
                return {
                    "success": False,
                    "error": "Goods receipt creation failed",
                    "messages": self._extract_messages(result.get("RETURN", []))
                }
                
        except Exception as e:
            self.logger.error(f"Error creating goods receipt: {str(e)}")
            return self.error_handler.handle_bapi_error(e)
    
    # Contract BAPIs
    
    def create_contract(self, contract_data: Dict) -> Dict[str, Any]:
        """Create a contract in SAP"""
        try:
            # Similar to PO but with contract-specific fields
            header = self.field_mapper.map_contract_header(contract_data)
            items = self.field_mapper.map_contract_items(contract_data.get("items", []))
            
            params = {
                "CONTRACTHEADER": header,
                "CONTRACTHEADERX": self._create_update_flags(header),
                "CONTRACTITEM": items["items"],
                "CONTRACTITEMX": items["items_x"]
            }
            
            result = self.connector.execute_bapi("BAPI_CONTRACT_CREATE", params, commit=True)
            
            if "CONTRACT" in result:
                return {
                    "success": True,
                    "contract_number": result["CONTRACT"],
                    "messages": self._extract_messages(result.get("RETURN", []))
                }
            else:
                return {
                    "success": False,
                    "error": "Contract creation failed",
                    "messages": self._extract_messages(result.get("RETURN", []))
                }
                
        except Exception as e:
            self.logger.error(f"Error creating contract: {str(e)}")
            return self.error_handler.handle_bapi_error(e)
    
    # Requisition BAPIs
    
    def create_requisition(self, req_data: Dict) -> Dict[str, Any]:
        """Create a purchase requisition in SAP"""
        try:
            items = []
            for item in req_data.get("items", []):
                items.append({
                    "PREQ_ITEM": item.get("item_number", "00010"),
                    "SHORT_TEXT": item["description"][:40],
                    "MATERIAL": item.get("material", ""),
                    "PLANT": item.get("plant", "1000"),
                    "QUANTITY": item["quantity"],
                    "UNIT": item.get("unit", "EA"),
                    "DELIV_DATE": self._format_date(item.get("delivery_date")),
                    "ACCTASSCAT": item.get("account_assignment", "K"),
                    "COST_CTR": req_data.get("cost_center", "")
                })
            
            params = {
                "REQUISITION_ITEMS": items
            }
            
            result = self.connector.execute_bapi("BAPI_REQUISITION_CREATE", params, commit=True)
            
            if "REQUISITION" in result:
                return {
                    "success": True,
                    "requisition_number": result["REQUISITION"],
                    "messages": self._extract_messages(result.get("RETURN", []))
                }
            else:
                return {
                    "success": False,
                    "error": "Requisition creation failed",
                    "messages": self._extract_messages(result.get("RETURN", []))
                }
                
        except Exception as e:
            self.logger.error(f"Error creating requisition: {str(e)}")
            return self.error_handler.handle_bapi_error(e)
    
    # Utility methods
    
    def _create_update_flags(self, data: Dict, prefix: str = "") -> Dict[str, str]:
        """Create update flags for BAPI parameters"""
        flags = {}
        for key, value in data.items():
            if value is not None and value != "":
                flag_key = f"{prefix}_{key}" if prefix else key
                flags[key] = "X"
        return flags
    
    def _format_date(self, date_value) -> str:
        """Format date for SAP (YYYYMMDD)"""
        if isinstance(date_value, str):
            # Parse ISO format
            date_obj = datetime.fromisoformat(date_value.replace('Z', '+00:00'))
        elif isinstance(date_value, datetime):
            date_obj = date_value
        else:
            date_obj = datetime.now()
        
        return date_obj.strftime("%Y%m%d")
    
    def _extract_messages(self, return_data: List[Dict]) -> List[Dict]:
        """Extract messages from BAPI return"""
        messages = []
        for msg in return_data:
            messages.append({
                "type": msg.get("TYPE", ""),
                "id": msg.get("ID", ""),
                "number": msg.get("NUMBER", ""),
                "message": msg.get("MESSAGE", ""),
                "severity": self._get_severity(msg.get("TYPE", ""))
            })
        return messages
    
    def _get_severity(self, msg_type: str) -> str:
        """Get message severity from type"""
        severities = {
            "S": "success",
            "I": "info",
            "W": "warning",
            "E": "error",
            "A": "abort"
        }
        return severities.get(msg_type, "unknown")
    
    def _has_errors(self, result: Dict) -> bool:
        """Check if BAPI result has errors"""
        if "RETURN" not in result:
            return False
        
        returns = result["RETURN"]
        if isinstance(returns, dict):
            returns = [returns]
        
        return any(msg.get("TYPE") in ["E", "A"] for msg in returns)