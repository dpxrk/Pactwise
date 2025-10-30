"""Identify savings opportunities in spend data"""

import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta

from utils.logging_config import get_logger
from utils.common import safe_divide, calculate_percentage


class SavingsIdentifier:
    """Identify and quantify savings opportunities"""
    
    def __init__(self):
        self.logger = get_logger(__name__)
        
        # Savings opportunity thresholds
        self.thresholds = {
            "price_variance": 0.15,  # 15% price variance
            "vendor_consolidation": 5,  # Min vendors for consolidation
            "volume_discount": 100000,  # Min spend for volume discount
            "payment_term_discount": 0.02,  # 2% early payment discount
            "contract_compliance": 0.8,  # 80% compliance threshold
            "tail_spend": 0.2  # 20% of vendors = tail spend
        }
    
    async def analyze_opportunities(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Analyze all savings opportunities in spend data"""
        if df.empty:
            return []
        
        opportunities = []
        
        # 1. Price variance opportunities
        price_opps = await self._identify_price_variance_opportunities(df)
        opportunities.extend(price_opps)
        
        # 2. Vendor consolidation opportunities
        consolidation_opps = await self._identify_consolidation_opportunities(df)
        opportunities.extend(consolidation_opps)
        
        # 3. Volume discount opportunities
        volume_opps = await self._identify_volume_discount_opportunities(df)
        opportunities.extend(volume_opps)
        
        # 4. Payment term opportunities
        payment_opps = await self._identify_payment_term_opportunities(df)
        opportunities.extend(payment_opps)
        
        # 5. Contract compliance opportunities
        compliance_opps = await self._identify_compliance_opportunities(df)
        opportunities.extend(compliance_opps)
        
        # 6. Tail spend opportunities
        tail_opps = await self._identify_tail_spend_opportunities(df)
        opportunities.extend(tail_opps)
        
        # 7. Category-specific opportunities
        category_opps = await self._identify_category_opportunities(df)
        opportunities.extend(category_opps)
        
        # Sort by potential savings
        opportunities.sort(key=lambda x: x['potential_savings'], reverse=True)
        
        return opportunities
    
    async def identify_top_categories(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Identify top categories for savings focus"""
        if df.empty or 'category' not in df.columns:
            return []
        
        # Group by category
        category_spend = df.groupby('category').agg({
            'amount': ['sum', 'mean', 'count'],
            'vendor_id': 'nunique'
        })
        
        category_spend.columns = ['total_spend', 'avg_transaction', 'transaction_count', 'vendor_count']
        category_spend = category_spend.reset_index()
        
        # Calculate savings potential score
        categories = []
        
        for _, row in category_spend.iterrows():
            # Score based on multiple factors
            score = 0
            potential_savings = 0
            
            # High spend categories
            if row['total_spend'] > 100000:
                score += 30
                potential_savings += row['total_spend'] * 0.05  # 5% potential
            
            # Many vendors (consolidation opportunity)
            if row['vendor_count'] > 10:
                score += 20
                potential_savings += row['total_spend'] * 0.03  # 3% from consolidation
            
            # High transaction count (process improvement)
            if row['transaction_count'] > 100:
                score += 10
                potential_savings += row['transaction_count'] * 10  # $10 per transaction
            
            categories.append({
                "category": row['category'],
                "total_spend": float(row['total_spend']),
                "vendor_count": int(row['vendor_count']),
                "transaction_count": int(row['transaction_count']),
                "savings_potential_score": score,
                "estimated_savings": potential_savings,
                "opportunities": self._get_category_opportunities(row)
            })
        
        # Sort by savings potential
        categories.sort(key=lambda x: x['savings_potential_score'], reverse=True)
        
        return categories[:10]
    
    async def _identify_price_variance_opportunities(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Identify opportunities from price variances"""
        opportunities = []
        
        # Check if we have item-level data
        if 'item_code' not in df.columns or 'unit_price' not in df.columns:
            return opportunities
        
        # Group by item
        item_prices = df.groupby('item_code')['unit_price'].agg(['mean', 'std', 'min', 'max', 'count'])
        
        for item_code, stats in item_prices.iterrows():
            if stats['count'] < 3:
                continue
            
            # Calculate coefficient of variation
            cv = safe_divide(stats['std'], stats['mean'])
            
            if cv > self.thresholds['price_variance']:
                # Calculate potential savings
                item_spend = df[df['item_code'] == item_code]['amount'].sum()
                potential_savings = (stats['mean'] - stats['min']) / stats['mean'] * item_spend
                
                opportunities.append({
                    "type": "price_variance",
                    "item": item_code,
                    "current_avg_price": float(stats['mean']),
                    "best_price": float(stats['min']),
                    "price_variance": float(cv),
                    "potential_savings": float(potential_savings),
                    "action": f"Standardize pricing for {item_code} at best price",
                    "difficulty": "low",
                    "timeframe_weeks": 2
                })
        
        return opportunities
    
    async def _identify_consolidation_opportunities(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Identify vendor consolidation opportunities"""
        opportunities = []
        
        if 'category' not in df.columns:
            return opportunities
        
        # Group by category
        category_vendors = df.groupby('category')['vendor_id'].nunique()
        
        for category, vendor_count in category_vendors.items():
            if vendor_count >= self.thresholds['vendor_consolidation']:
                cat_df = df[df['category'] == category]
                total_spend = cat_df['amount'].sum()
                
                # Calculate concentration
                vendor_spend = cat_df.groupby('vendor_id')['amount'].sum()
                top_3_spend = vendor_spend.nlargest(3).sum()
                concentration = safe_divide(top_3_spend, total_spend)
                
                # Low concentration means opportunity
                if concentration < 0.6:
                    potential_savings = total_spend * 0.08  # 8% from consolidation
                    
                    opportunities.append({
                        "type": "vendor_consolidation",
                        "category": category,
                        "current_vendors": int(vendor_count),
                        "recommended_vendors": 3,
                        "total_spend": float(total_spend),
                        "potential_savings": float(potential_savings),
                        "action": f"Consolidate {category} spend to top 3 vendors",
                        "difficulty": "medium",
                        "timeframe_weeks": 8
                    })
        
        return opportunities
    
    async def _identify_volume_discount_opportunities(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Identify volume discount opportunities"""
        opportunities = []
        
        # Group by vendor
        vendor_spend = df.groupby('vendor_id').agg({
            'amount': 'sum',
            'transaction_id': 'count'
        })
        vendor_spend.columns = ['total_spend', 'transaction_count']
        
        for vendor_id, stats in vendor_spend.iterrows():
            if stats['total_spend'] >= self.thresholds['volume_discount']:
                # Check if we have a contract (simplified)
                has_contract = np.random.random() > 0.5  # Would check actual contract status
                
                if not has_contract:
                    potential_savings = stats['total_spend'] * 0.1  # 10% volume discount
                    
                    vendor_name = df[df['vendor_id'] == vendor_id]['vendor_name'].iloc[0] if 'vendor_name' in df.columns else vendor_id
                    
                    opportunities.append({
                        "type": "volume_discount",
                        "vendor": vendor_name,
                        "annual_spend": float(stats['total_spend']),
                        "transaction_count": int(stats['transaction_count']),
                        "potential_savings": float(potential_savings),
                        "action": f"Negotiate volume discount with {vendor_name}",
                        "difficulty": "low",
                        "timeframe_weeks": 4
                    })
        
        return opportunities
    
    async def _identify_payment_term_opportunities(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Identify payment term optimization opportunities"""
        opportunities = []
        
        # Check for payment term data
        if 'payment_terms' not in df.columns:
            # Assume standard terms if not available
            total_spend = df['amount'].sum()
            
            if total_spend > 500000:
                potential_savings = total_spend * self.thresholds['payment_term_discount']
                
                opportunities.append({
                    "type": "payment_terms",
                    "current_terms": "Net 30",
                    "proposed_terms": "2/10 Net 30",
                    "eligible_spend": float(total_spend * 0.6),  # Assume 60% eligible
                    "potential_savings": float(potential_savings * 0.6),
                    "action": "Negotiate early payment discounts",
                    "difficulty": "low",
                    "timeframe_weeks": 2
                })
        
        return opportunities
    
    async def _identify_compliance_opportunities(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Identify contract compliance opportunities"""
        opportunities = []
        
        # Check for off-contract spend
        if 'contract_id' in df.columns:
            total_spend = df['amount'].sum()
            on_contract_spend = df[df['contract_id'].notna()]['amount'].sum()
            compliance_rate = safe_divide(on_contract_spend, total_spend)
            
            if compliance_rate < self.thresholds['contract_compliance']:
                off_contract_spend = total_spend - on_contract_spend
                potential_savings = off_contract_spend * 0.15  # 15% savings from compliance
                
                opportunities.append({
                    "type": "contract_compliance",
                    "compliance_rate": float(compliance_rate),
                    "off_contract_spend": float(off_contract_spend),
                    "potential_savings": float(potential_savings),
                    "action": "Improve contract compliance through training and controls",
                    "difficulty": "medium",
                    "timeframe_weeks": 6
                })
        
        return opportunities
    
    async def _identify_tail_spend_opportunities(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Identify tail spend management opportunities"""
        opportunities = []
        
        # Calculate tail spend
        vendor_spend = df.groupby('vendor_id')['amount'].sum().sort_values()
        
        # Bottom 80% of vendors
        tail_cutoff = int(len(vendor_spend) * 0.8)
        tail_vendors = vendor_spend.iloc[:tail_cutoff]
        tail_spend = tail_vendors.sum()
        
        # Check if tail spend is significant
        total_spend = df['amount'].sum()
        tail_percentage = safe_divide(tail_spend, total_spend)
        
        if tail_percentage > self.thresholds['tail_spend'] and tail_spend > 100000:
            potential_savings = tail_spend * 0.12  # 12% from tail spend management
            
            opportunities.append({
                "type": "tail_spend",
                "tail_vendor_count": len(tail_vendors),
                "tail_spend": float(tail_spend),
                "tail_percentage": float(tail_percentage),
                "potential_savings": float(potential_savings),
                "action": "Implement tail spend management program",
                "difficulty": "high",
                "timeframe_weeks": 12
            })
        
        return opportunities
    
    async def _identify_category_opportunities(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Identify category-specific opportunities"""
        opportunities = []
        
        if 'category' not in df.columns:
            return opportunities
        
        # Analyze each category
        categories = df['category'].unique()
        
        for category in categories:
            if pd.isna(category):
                continue
            
            cat_df = df[df['category'] == category]
            cat_spend = cat_df['amount'].sum()
            
            # Skip small categories
            if cat_spend < 50000:
                continue
            
            # Category-specific analysis
            opp = await self._analyze_category_opportunity(category, cat_df)
            if opp:
                opportunities.append(opp)
        
        return opportunities
    
    async def _analyze_category_opportunity(self, category: str, 
                                           df: pd.DataFrame) -> Optional[Dict[str, Any]]:
        """Analyze specific category for opportunities"""
        
        # Different strategies for different categories
        category_strategies = {
            "IT Software": {
                "opportunity": "license_optimization",
                "savings_rate": 0.2,
                "action": "Optimize software licenses and eliminate unused subscriptions"
            },
            "Travel": {
                "opportunity": "travel_policy",
                "savings_rate": 0.15,
                "action": "Implement stricter travel policy and preferred vendors"
            },
            "Marketing": {
                "opportunity": "agency_consolidation",
                "savings_rate": 0.12,
                "action": "Consolidate marketing agencies and negotiate retainers"
            },
            "Office Supplies": {
                "opportunity": "catalog_management",
                "savings_rate": 0.08,
                "action": "Implement catalog buying and standardize products"
            },
            "Professional Services": {
                "opportunity": "rate_card_negotiation",
                "savings_rate": 0.15,
                "action": "Negotiate standard rate cards with consulting firms"
            }
        }
        
        if category in category_strategies:
            strategy = category_strategies[category]
            total_spend = df['amount'].sum()
            potential_savings = total_spend * strategy['savings_rate']
            
            return {
                "type": "category_optimization",
                "category": category,
                "opportunity": strategy['opportunity'],
                "current_spend": float(total_spend),
                "potential_savings": float(potential_savings),
                "action": strategy['action'],
                "difficulty": "medium",
                "timeframe_weeks": 6
            }
        
        return None
    
    def _get_category_opportunities(self, category_data: pd.Series) -> List[str]:
        """Get list of opportunities for a category"""
        opportunities = []
        
        if category_data['vendor_count'] > 10:
            opportunities.append("Vendor consolidation")
        
        if category_data['total_spend'] > 100000:
            opportunities.append("Volume discounts")
        
        if category_data['transaction_count'] > 100:
            opportunities.append("Process automation")
        
        if category_data['total_spend'] > 50000:
            opportunities.append("Contract negotiation")
        
        return opportunities