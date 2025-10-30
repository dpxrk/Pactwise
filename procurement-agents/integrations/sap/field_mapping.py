"""SAP Field Mapping Module"""

from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional


class SAPFieldMapper:
    """Map between internal fields and SAP fields"""
    
    def __init__(self):
        # Currency mapping
        self.currency_map = {
            "USD": "USD",
            "EUR": "EUR",
            "GBP": "GBP",
            "CNY": "CNY",
            "JPY": "JPY"
        }
        
        # Unit of measure mapping
        self.uom_map = {
            "piece": "EA",
            "pieces": "EA",
            "each": "EA",
            "kilogram": "KG",
            "kg": "KG",
            "gram": "G",
            "liter": "L",
            "meter": "M",
            "hour": "H",
            "day": "DAY"
        }
        
        # Document type mapping
        self.doc_type_map = {
            "standard": "NB",
            "service": "FO",
            "consignment": "KB",
            "subcontract": "UB"
        }
    
    def map_po_header(self, po_data: Dict) -> Dict[str, Any]:
        """Map PO data to SAP header structure"""
        header = {
            "COMP_CODE": po_data.get("company_code", "1000"),
            "DOC_TYPE": self.doc_type_map.get(po_data.get("po_type", "standard"), "NB"),
            "VENDOR": po_data.get("vendor_number", ""),
            "PURCH_ORG": po_data.get("purchasing_org", "1000"),
            "PUR_GROUP": po_data.get("purchasing_group", "001"),
            "CURRENCY": self.currency_map.get(po_data.get("currency", "USD"), "USD")
        }
        
        # Optional fields
        if po_data.get("header_text"):
            header["HEADER_TXT"] = po_data["header_text"][:25]
        
        if po_data.get("payment_terms"):
            header["PMNTTRMS"] = self._map_payment_terms(po_data["payment_terms"])
        
        if po_data.get("incoterms"):
            header["INCOTERMS1"] = po_data["incoterms"]
        
        return header
    
    def map_po_items(self, items: List[Dict]) -> Dict[str, List[Dict]]:
        """Map PO items to SAP item structure"""
        sap_items = []
        sap_items_x = []
        schedules = []
        schedules_x = []
        
        for idx, item in enumerate(items, 1):
            item_number = f"{idx:05d}"
            
            # Main item data
            sap_item = {
                "PO_ITEM": item_number,
                "SHORT_TEXT": item.get("description", "")[:40],
                "MATERIAL": item.get("material_number", ""),
                "PLANT": item.get("plant", "1000"),
                "QUANTITY": self._format_quantity(item.get("quantity", 0)),
                "PO_UNIT": self.uom_map.get(item.get("unit", "each").lower(), "EA"),
                "NET_PRICE": self._format_price(item.get("price", 0))
            }
            
            # Update flags
            sap_item_x = {
                "PO_ITEM": item_number,
                "SHORT_TEXT": "X",
                "MATERIAL": "X" if item.get("material_number") else "",
                "PLANT": "X",
                "QUANTITY": "X",
                "PO_UNIT": "X",
                "NET_PRICE": "X"
            }
            
            # Schedule line
            schedule = {
                "PO_ITEM": item_number,
                "SCHED_LINE": "0001",
                "DEL_DATCAT_EXT": "D",
                "DELIV_DATE": self._format_date(item.get("delivery_date")),
                "QUANTITY": self._format_quantity(item.get("quantity", 0))
            }
            
            schedule_x = {
                "PO_ITEM": item_number,
                "SCHED_LINE": "0001",
                "DEL_DATCAT_EXT": "X",
                "DELIV_DATE": "X",
                "QUANTITY": "X"
            }
            
            sap_items.append(sap_item)
            sap_items_x.append(sap_item_x)
            schedules.append(schedule)
            schedules_x.append(schedule_x)
        
        return {
            "items": sap_items,
            "items_x": sap_items_x,
            "schedules": schedules,
            "schedules_x": schedules_x
        }
    
    def map_vendor_general(self, vendor_data: Dict) -> Dict[str, Any]:
        """Map vendor data to SAP general data structure"""
        return {
            "VENDOR": vendor_data.get("vendor_number", ""),
            "NAME": vendor_data.get("company_name", "")[:35],
            "NAME_2": vendor_data.get("company_name_2", ""),
            "CITY": vendor_data.get("city", "")[:35],
            "POSTL_COD1": vendor_data.get("postal_code", "")[:10],
            "STREET": vendor_data.get("street", "")[:35],
            "COUNTRY": self._map_country_code(vendor_data.get("country", "")),
            "REGION": vendor_data.get("region", ""),
            "TELEPHONE": vendor_data.get("phone", "")[:16],
            "FAX_NUMBER": vendor_data.get("fax", "")[:31],
            "E_MAIL": vendor_data.get("email", "")[:241]
        }
    
    def map_vendor_company(self, vendor_data: Dict) -> Dict[str, Any]:
        """Map vendor data to SAP company data structure"""
        return {
            "COMP_CODE": vendor_data.get("company_code", "1000"),
            "VENDOR": vendor_data.get("vendor_number", ""),
            "AKONT": vendor_data.get("recon_account", "31000"),  # Reconciliation account
            "ZTERM": self._map_payment_terms(vendor_data.get("payment_terms", "NET30")),
            "REPRF": "X" if vendor_data.get("payment_block", False) else "",
            "ZWELS": vendor_data.get("payment_methods", "T")  # T = Transfer
        }
    
    def map_vendor_address(self, address_data: Dict) -> List[Dict]:
        """Map vendor address data"""
        return [{
            "ADDR_NO": "001",
            "NAME": address_data.get("name", ""),
            "CITY": address_data.get("city", ""),
            "POSTL_COD1": address_data.get("postal_code", ""),
            "STREET": address_data.get("street", ""),
            "COUNTRY": self._map_country_code(address_data.get("country", "")),
            "REGION": address_data.get("region", "")
        }]
    
    def map_contract_header(self, contract_data: Dict) -> Dict[str, Any]:
        """Map contract data to SAP header structure"""
        return {
            "VENDOR": contract_data.get("vendor_number", ""),
            "DOC_TYPE": "MK",  # Contract type
            "PURCH_ORG": contract_data.get("purchasing_org", "1000"),
            "PUR_GROUP": contract_data.get("purchasing_group", "001"),
            "CURRENCY": self.currency_map.get(contract_data.get("currency", "USD"), "USD"),
            "VPER_START": self._format_date(contract_data.get("valid_from")),
            "VPER_END": self._format_date(contract_data.get("valid_to")),
            "TARGET_VAL": self._format_price(contract_data.get("target_value", 0))
        }
    
    def map_contract_items(self, items: List[Dict]) -> Dict[str, List[Dict]]:
        """Map contract items to SAP structure"""
        sap_items = []
        sap_items_x = []
        
        for idx, item in enumerate(items, 1):
            item_number = f"{idx:05d}"
            
            sap_item = {
                "ITEM": item_number,
                "SHORT_TEXT": item.get("description", "")[:40],
                "MATERIAL": item.get("material_number", ""),
                "TARGET_QTY": self._format_quantity(item.get("target_quantity", 0)),
                "NET_PRICE": self._format_price(item.get("price", 0)),
                "PRICE_UNIT": item.get("price_unit", 1)
            }
            
            sap_item_x = {
                "ITEM": item_number,
                "SHORT_TEXT": "X",
                "MATERIAL": "X" if item.get("material_number") else "",
                "TARGET_QTY": "X",
                "NET_PRICE": "X",
                "PRICE_UNIT": "X"
            }
            
            sap_items.append(sap_item)
            sap_items_x.append(sap_item_x)
        
        return {
            "items": sap_items,
            "items_x": sap_items_x
        }
    
    def map_from_sap_po(self, sap_data: Dict) -> Dict[str, Any]:
        """Map SAP PO data to internal format"""
        header = sap_data.get("POHEADER", {})
        items = sap_data.get("POITEM", [])
        
        return {
            "po_number": header.get("PO_NUMBER", ""),
            "vendor_number": header.get("VENDOR", ""),
            "company_code": header.get("COMP_CODE", ""),
            "currency": header.get("CURRENCY", ""),
            "total_value": float(header.get("TOTAL_VAL", 0)),
            "created_date": self._parse_sap_date(header.get("CREATED_ON", "")),
            "items": [
                {
                    "item_number": item.get("PO_ITEM", ""),
                    "material": item.get("MATERIAL", ""),
                    "description": item.get("SHORT_TEXT", ""),
                    "quantity": float(item.get("QUANTITY", 0)),
                    "unit": item.get("PO_UNIT", ""),
                    "price": float(item.get("NET_PRICE", 0)),
                    "delivery_date": self._parse_sap_date(item.get("DELIV_DATE", ""))
                }
                for item in items
            ]
        }
    
    def map_from_sap_vendor(self, sap_data: Dict) -> Dict[str, Any]:
        """Map SAP vendor data to internal format"""
        general = sap_data.get("GENERALDETAIL", {})
        company = sap_data.get("COMPANYDETAIL", {})
        
        return {
            "vendor_number": general.get("VENDOR", ""),
            "company_name": general.get("NAME", ""),
            "street": general.get("STREET", ""),
            "city": general.get("CITY", ""),
            "postal_code": general.get("POSTL_COD1", ""),
            "country": general.get("COUNTRY", ""),
            "phone": general.get("TELEPHONE", ""),
            "email": general.get("E_MAIL", ""),
            "payment_terms": company.get("ZTERM", ""),
            "currency": company.get("CURR", "")
        }
    
    # Helper methods
    
    def _format_quantity(self, qty: Any) -> str:
        """Format quantity for SAP"""
        if isinstance(qty, str):
            qty = float(qty)
        return str(qty)
    
    def _format_price(self, price: Any) -> str:
        """Format price for SAP"""
        if isinstance(price, str):
            price = float(price)
        return f"{price:.2f}"
    
    def _format_date(self, date_value: Any) -> str:
        """Format date for SAP (YYYYMMDD)"""
        if not date_value:
            return ""
        
        if isinstance(date_value, str):
            if len(date_value) == 8 and date_value.isdigit():
                return date_value  # Already in SAP format
            try:
                date_obj = datetime.fromisoformat(date_value.replace('Z', '+00:00'))
            except:
                return ""
        elif isinstance(date_value, datetime):
            date_obj = date_value
        else:
            return ""
        
        return date_obj.strftime("%Y%m%d")
    
    def _parse_sap_date(self, sap_date: str) -> Optional[str]:
        """Parse SAP date (YYYYMMDD) to ISO format"""
        if not sap_date or len(sap_date) != 8:
            return None
        
        try:
            date_obj = datetime.strptime(sap_date, "%Y%m%d")
            return date_obj.isoformat()
        except:
            return None
    
    def _map_payment_terms(self, terms: str) -> str:
        """Map payment terms to SAP code"""
        payment_map = {
            "NET30": "ZN30",
            "NET60": "ZN60",
            "NET90": "ZN90",
            "2/10NET30": "Z210",
            "COD": "ZCOD",
            "IMMEDIATE": "ZI00"
        }
        return payment_map.get(terms.upper(), "ZN30")
    
    def _map_country_code(self, country: str) -> str:
        """Map country name to ISO code"""
        country_map = {
            "United States": "US",
            "USA": "US",
            "China": "CN",
            "Germany": "DE",
            "United Kingdom": "GB",
            "UK": "GB",
            "Japan": "JP",
            "India": "IN",
            "France": "FR",
            "Canada": "CA"
        }
        return country_map.get(country, country[:2].upper() if country else "")