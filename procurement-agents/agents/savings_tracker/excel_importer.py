"""Excel import functionality for savings data"""

import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional
import io
import base64
from datetime import datetime

from utils.logging_config import get_logger
from utils.exceptions import ValidationError, FileFormatError


class ExcelImporter:
    """Import savings data from Excel files"""
    
    def __init__(self):
        self.logger = get_logger(__name__)
        
        # Standard column mappings
        self.column_mappings = {
            # Common variations of column names
            "initiative_id": ["id", "initiative id", "initiative_id", "ref", "reference"],
            "title": ["title", "name", "initiative", "description", "project"],
            "category": ["category", "type", "spend category", "area"],
            "savings_type": ["savings type", "type", "savings_type", "classification"],
            "status": ["status", "stage", "phase", "state"],
            "baseline_cost": ["baseline", "baseline cost", "baseline_cost", "original cost", "current cost"],
            "new_cost": ["new cost", "new_cost", "target cost", "negotiated cost"],
            "projected_savings": ["projected", "projected savings", "projected_savings", "estimated savings", "target"],
            "realized_savings": ["realized", "realized savings", "realized_savings", "actual savings", "achieved"],
            "verified_savings": ["verified", "verified savings", "verified_savings", "validated"],
            "start_date": ["start date", "start_date", "begin date", "from"],
            "end_date": ["end date", "end_date", "finish date", "to"],
            "implementation_date": ["implementation date", "implementation_date", "impl date", "go live"],
            "owner": ["owner", "responsible", "lead", "manager"],
            "vendor": ["vendor", "supplier", "vendor name", "supplier name"],
            "confidence": ["confidence", "confidence level", "probability", "likelihood"],
            "notes": ["notes", "comments", "remarks", "description"]
        }
        
        # Required columns
        self.required_columns = ["title", "projected_savings"]
        
        # Date columns for parsing
        self.date_columns = ["start_date", "end_date", "implementation_date", "created_date"]
        
        # Numeric columns
        self.numeric_columns = [
            "baseline_cost", "new_cost", "projected_savings", 
            "realized_savings", "verified_savings", "implementation_cost",
            "confidence"
        ]
    
    async def import_savings_data(self, file_path: str = None, 
                                 file_data: bytes = None,
                                 sheet_name: str = None) -> Dict[str, Any]:
        """Import savings data from Excel file"""
        
        try:
            # Read Excel file
            if file_path:
                df = pd.read_excel(file_path, sheet_name=sheet_name or 0)
                self.logger.info(f"Loaded Excel file from {file_path}")
            elif file_data:
                # Handle base64 encoded data if provided
                if isinstance(file_data, str):
                    file_data = base64.b64decode(file_data)
                
                df = pd.read_excel(io.BytesIO(file_data), sheet_name=sheet_name or 0)
                self.logger.info("Loaded Excel file from data")
            else:
                raise ValidationError("Either file_path or file_data must be provided")
            
            # Clean column names
            df.columns = [col.strip().lower() for col in df.columns]
            
            # Map columns to standard names
            df = self._map_columns(df)
            
            # Validate required columns
            self._validate_columns(df)
            
            # Process data
            initiatives = self._process_initiatives(df)
            
            # Extract template structure
            template = self._extract_template(df)
            
            # Generate summary
            summary = self._generate_import_summary(initiatives)
            
            return {
                "success": True,
                "initiatives": initiatives,
                "template": template,
                "summary": summary,
                "row_count": len(df),
                "processed_count": len(initiatives),
                "columns_mapped": list(df.columns)
            }
            
        except Exception as e:
            self.logger.error(f"Error importing Excel file: {str(e)}")
            raise FileFormatError(
                filename="excel_import",
                expected_formats=["xlsx", "xls"],
                actual_format="unknown",
                details={"error": str(e)}
            )
    
    async def export_template(self) -> bytes:
        """Generate Excel template for savings data"""
        
        # Create template data
        template_data = {
            "ID": ["SAV-001", "SAV-002"],
            "Title": ["Negotiate supplier contract", "Implement e-procurement"],
            "Category": ["Direct Materials", "Process Improvement"],
            "Savings Type": ["Negotiated", "Process Improvement"],
            "Status": ["Identified", "In Progress"],
            "Baseline Cost": [1000000, 500000],
            "New Cost": [900000, 450000],
            "Projected Savings": [100000, 50000],
            "Realized Savings": [0, 25000],
            "Verified Savings": [0, 0],
            "Start Date": ["2024-01-01", "2024-02-01"],
            "End Date": ["2024-12-31", "2024-06-30"],
            "Implementation Date": ["2024-03-01", "2024-04-01"],
            "Owner": ["John Smith", "Jane Doe"],
            "Vendor": ["Supplier ABC", ""],
            "Confidence": [0.8, 0.9],
            "Implementation Cost": [5000, 10000],
            "Notes": ["Initial negotiation complete", "Training phase"]
        }
        
        # Create DataFrame
        df = pd.DataFrame(template_data)
        
        # Create Excel file in memory
        output = io.BytesIO()
        
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            # Main data sheet
            df.to_excel(writer, sheet_name='Savings Initiatives', index=False)
            
            # Add instructions sheet
            instructions = pd.DataFrame({
                "Instructions": [
                    "Use this template to import savings initiatives",
                    "Required fields: Title, Projected Savings",
                    "Status values: Identified, In Progress, Implemented, Realized, Verified",
                    "Savings Type: Negotiated, Volume Discount, Process Improvement, etc.",
                    "Dates should be in YYYY-MM-DD format",
                    "Confidence should be between 0 and 1 (e.g., 0.8 = 80%)",
                    "Leave cells blank if data is not available"
                ]
            })
            instructions.to_excel(writer, sheet_name='Instructions', index=False)
            
            # Add lookups sheet
            lookups = pd.DataFrame({
                "Categories": ["Direct Materials", "Indirect Materials", "Services", 
                              "IT", "Marketing", "Facilities", "Logistics"],
                "Statuses": ["Identified", "In Progress", "Implemented", 
                            "Realized", "Verified", "At Risk", "Lost"],
                "Savings Types": ["Negotiated", "Volume Discount", "Process Improvement",
                                "Demand Management", "Substitution", "Payment Terms", 
                                "Rebates", "Cost Avoidance"]
            })
            lookups.to_excel(writer, sheet_name='Lookups', index=False)
        
        output.seek(0)
        return output.read()
    
    def _map_columns(self, df: pd.DataFrame) -> pd.DataFrame:
        """Map Excel columns to standard names"""
        
        column_map = {}
        
        for standard_name, variations in self.column_mappings.items():
            for col in df.columns:
                if col in variations:
                    column_map[col] = standard_name
                    break
        
        # Rename columns
        df = df.rename(columns=column_map)
        
        return df
    
    def _validate_columns(self, df: pd.DataFrame):
        """Validate required columns exist"""
        
        missing_columns = []
        
        for required_col in self.required_columns:
            if required_col not in df.columns:
                missing_columns.append(required_col)
        
        if missing_columns:
            raise ValidationError(
                f"Missing required columns: {', '.join(missing_columns)}",
                field="columns",
                value=list(df.columns)
            )
    
    def _process_initiatives(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Process initiatives from DataFrame"""
        
        initiatives = []
        
        for idx, row in df.iterrows():
            try:
                # Skip empty rows
                if pd.isna(row.get('title')) and pd.isna(row.get('projected_savings')):
                    continue
                
                initiative = self._process_row(row, idx)
                
                if initiative:
                    initiatives.append(initiative)
                    
            except Exception as e:
                self.logger.warning(f"Error processing row {idx}: {str(e)}")
                continue
        
        return initiatives
    
    def _process_row(self, row: pd.Series, row_index: int) -> Dict[str, Any]:
        """Process a single row into initiative format"""
        
        initiative = {}
        
        # Process each field
        for column in row.index:
            value = row[column]
            
            # Skip NaN values
            if pd.isna(value):
                continue
            
            # Process based on column type
            if column in self.date_columns:
                initiative[column] = self._parse_date(value)
            elif column in self.numeric_columns:
                initiative[column] = self._parse_number(value)
            elif column == "status":
                initiative[column] = self._normalize_status(value)
            elif column == "savings_type":
                initiative[column] = self._normalize_savings_type(value)
            else:
                initiative[column] = str(value).strip()
        
        # Validate initiative
        if not initiative.get("title"):
            raise ValidationError(f"Row {row_index}: Title is required")
        
        if not initiative.get("projected_savings"):
            raise ValidationError(f"Row {row_index}: Projected savings is required")
        
        # Add defaults
        initiative.setdefault("category", "Other")
        initiative.setdefault("status", "Identified")
        initiative.setdefault("savings_type", "Negotiated")
        initiative.setdefault("confidence", 0.8)
        initiative.setdefault("realized_savings", 0)
        initiative.setdefault("verified_savings", 0)
        
        # Calculate savings if baseline and new cost provided
        if initiative.get("baseline_cost") and initiative.get("new_cost"):
            calculated_savings = initiative["baseline_cost"] - initiative["new_cost"]
            if not initiative.get("projected_savings"):
                initiative["projected_savings"] = calculated_savings
        
        return initiative
    
    def _parse_date(self, value) -> Optional[str]:
        """Parse date value to ISO format"""
        
        if pd.isna(value):
            return None
        
        try:
            if isinstance(value, str):
                # Try parsing common date formats
                for fmt in ["%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y", "%Y/%m/%d"]:
                    try:
                        date_obj = datetime.strptime(value, fmt)
                        return date_obj.isoformat()
                    except:
                        continue
                
                # Try pandas parsing
                date_obj = pd.to_datetime(value)
                return date_obj.isoformat()
            
            elif isinstance(value, (pd.Timestamp, datetime)):
                return value.isoformat()
            
            else:
                return None
                
        except Exception as e:
            self.logger.warning(f"Could not parse date: {value}")
            return None
    
    def _parse_number(self, value) -> float:
        """Parse numeric value"""
        
        if pd.isna(value):
            return 0.0
        
        try:
            # Remove currency symbols and commas
            if isinstance(value, str):
                value = value.replace('$', '').replace(',', '').replace(' ', '')
            
            return float(value)
            
        except:
            self.logger.warning(f"Could not parse number: {value}")
            return 0.0
    
    def _normalize_status(self, value: str) -> str:
        """Normalize status value"""
        
        if pd.isna(value):
            return "Identified"
        
        value = str(value).strip().lower()
        
        status_map = {
            "identified": "Identified",
            "in progress": "In Progress",
            "in-progress": "In Progress",
            "implemented": "Implemented",
            "realized": "Realized",
            "verified": "Verified",
            "at risk": "At Risk",
            "at-risk": "At Risk",
            "lost": "Lost",
            "cancelled": "Lost"
        }
        
        return status_map.get(value, "Identified")
    
    def _normalize_savings_type(self, value: str) -> str:
        """Normalize savings type value"""
        
        if pd.isna(value):
            return "Negotiated"
        
        value = str(value).strip().lower()
        
        type_map = {
            "negotiated": "Negotiated",
            "negotiation": "Negotiated",
            "volume discount": "Volume Discount",
            "volume": "Volume Discount",
            "process improvement": "Process Improvement",
            "process": "Process Improvement",
            "demand management": "Demand Management",
            "demand": "Demand Management",
            "substitution": "Substitution",
            "payment terms": "Payment Terms",
            "payment": "Payment Terms",
            "rebates": "Rebates",
            "rebate": "Rebates",
            "cost avoidance": "Cost Avoidance",
            "avoidance": "Cost Avoidance"
        }
        
        return type_map.get(value, "Negotiated")
    
    def _extract_template(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Extract template structure from DataFrame"""
        
        return {
            "columns": list(df.columns),
            "data_types": {col: str(df[col].dtype) for col in df.columns},
            "sample_values": {
                col: df[col].dropna().iloc[0] if len(df[col].dropna()) > 0 else None
                for col in df.columns
            }
        }
    
    def _generate_import_summary(self, initiatives: List[Dict]) -> Dict[str, Any]:
        """Generate summary of imported initiatives"""
        
        if not initiatives:
            return {
                "total_count": 0,
                "total_projected": 0,
                "total_realized": 0
            }
        
        # Convert to DataFrame for easy aggregation
        df = pd.DataFrame(initiatives)
        
        summary = {
            "total_count": len(initiatives),
            "total_projected": df["projected_savings"].sum() if "projected_savings" in df else 0,
            "total_realized": df["realized_savings"].sum() if "realized_savings" in df else 0,
            "total_verified": df["verified_savings"].sum() if "verified_savings" in df else 0,
            "by_status": {},
            "by_category": {},
            "by_type": {}
        }
        
        # Group by status
        if "status" in df:
            summary["by_status"] = df.groupby("status")["projected_savings"].agg(['count', 'sum']).to_dict('index')
        
        # Group by category
        if "category" in df:
            summary["by_category"] = df.groupby("category")["projected_savings"].agg(['count', 'sum']).to_dict('index')
        
        # Group by type
        if "savings_type" in df:
            summary["by_type"] = df.groupby("savings_type")["projected_savings"].agg(['count', 'sum']).to_dict('index')
        
        return summary
    
    async def validate_excel_format(self, file_path: str = None, 
                                   file_data: bytes = None) -> Dict[str, Any]:
        """Validate Excel file format without importing"""
        
        try:
            # Read Excel file
            if file_path:
                df = pd.read_excel(file_path, nrows=5)  # Read only first 5 rows
            elif file_data:
                if isinstance(file_data, str):
                    file_data = base64.b64decode(file_data)
                df = pd.read_excel(io.BytesIO(file_data), nrows=5)
            else:
                raise ValidationError("Either file_path or file_data must be provided")
            
            # Clean column names
            df.columns = [col.strip().lower() for col in df.columns]
            
            # Map columns
            df = self._map_columns(df)
            
            # Check required columns
            missing_required = []
            for col in self.required_columns:
                if col not in df.columns:
                    missing_required.append(col)
            
            # Identify available columns
            recognized_columns = [
                col for col in df.columns 
                if col in self.column_mappings
            ]
            
            unrecognized_columns = [
                col for col in df.columns 
                if col not in recognized_columns
            ]
            
            return {
                "valid": len(missing_required) == 0,
                "missing_required": missing_required,
                "recognized_columns": recognized_columns,
                "unrecognized_columns": unrecognized_columns,
                "total_columns": len(df.columns),
                "sample_rows": min(5, len(df))
            }
            
        except Exception as e:
            return {
                "valid": False,
                "error": str(e)
            }