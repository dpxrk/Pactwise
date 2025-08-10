"""
Vendor Risk Prediction using ensemble ML models.
"""

import logging
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import numpy as np
import pandas as pd
from datetime import datetime, timedelta

try:
    import xgboost as xgb
    XGBOOST_AVAILABLE = True
except ImportError:
    XGBOOST_AVAILABLE = False
    logging.warning("XGBoost not available")

try:
    import lightgbm as lgb
    LIGHTGBM_AVAILABLE = True
except ImportError:
    LIGHTGBM_AVAILABLE = False
    logging.warning("LightGBM not available")

try:
    from sklearn.ensemble import RandomForestRegressor, IsolationForest
    from sklearn.preprocessing import StandardScaler
    from sklearn.model_selection import cross_val_score
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False
    logging.warning("Scikit-learn not available")

logger = logging.getLogger(__name__)


@dataclass
class RiskPrediction:
    """Risk prediction result."""
    risk_level: str  # critical, high, medium, low
    risk_score: float  # 0-100
    confidence: float  # 0-1
    factors: List[Dict[str, Any]]
    recommendations: List[str]


class VendorRiskPredictor:
    """
    Predict vendor risks using ensemble machine learning models.
    """
    
    # Risk factors and their weights
    RISK_FACTORS = {
        "delivery_performance": {
            "weight": 0.25,
            "threshold_critical": 60,
            "threshold_high": 75,
            "threshold_medium": 85,
            "inverse": False  # Lower is worse
        },
        "quality_score": {
            "weight": 0.25,
            "threshold_critical": 50,
            "threshold_high": 70,
            "threshold_medium": 80,
            "inverse": False
        },
        "response_time": {
            "weight": 0.15,
            "threshold_critical": 48,  # hours
            "threshold_high": 24,
            "threshold_medium": 12,
            "inverse": True  # Higher is worse
        },
        "cost_variance": {
            "weight": 0.15,
            "threshold_critical": 20,  # percentage
            "threshold_high": 15,
            "threshold_medium": 10,
            "inverse": True
        },
        "compliance_rate": {
            "weight": 0.20,
            "threshold_critical": 60,
            "threshold_high": 75,
            "threshold_medium": 90,
            "inverse": False
        }
    }
    
    def __init__(self):
        """Initialize risk predictor."""
        self.models = {}
        self.scaler = StandardScaler() if SKLEARN_AVAILABLE else None
        self._initialize_models()
    
    def _initialize_models(self):
        """Initialize ML models for risk prediction."""
        if XGBOOST_AVAILABLE:
            self.models['xgboost'] = xgb.XGBRegressor(
                n_estimators=100,
                max_depth=5,
                learning_rate=0.1,
                objective='reg:squarederror'
            )
        
        if LIGHTGBM_AVAILABLE:
            self.models['lightgbm'] = lgb.LGBMRegressor(
                n_estimators=100,
                max_depth=5,
                learning_rate=0.1,
                objective='regression'
            )
        
        if SKLEARN_AVAILABLE:
            self.models['random_forest'] = RandomForestRegressor(
                n_estimators=100,
                max_depth=5,
                random_state=42
            )
            self.models['isolation_forest'] = IsolationForest(
                contamination=0.1,
                random_state=42
            )
    
    async def predict_risks(
        self,
        vendor_data: Dict[str, Any],
        metrics: Any,
        historical_data: Optional[List[Dict[str, Any]]] = None
    ) -> List[Dict[str, Any]]:
        """
        Predict vendor risks based on current and historical data.
        
        Args:
            vendor_data: Current vendor information
            metrics: Current performance metrics
            historical_data: Historical performance data
            
        Returns:
            List of identified risks with details
        """
        risks = []
        
        # Rule-based risk assessment
        rule_risks = self._assess_rule_based_risks(vendor_data, metrics)
        risks.extend(rule_risks)
        
        # ML-based risk prediction if historical data available
        if historical_data and len(historical_data) > 10:
            ml_risks = await self._predict_ml_risks(historical_data, metrics)
            risks.extend(ml_risks)
        
        # Pattern-based risk detection
        pattern_risks = self._detect_risk_patterns(vendor_data, metrics)
        risks.extend(pattern_risks)
        
        # Deduplicate and prioritize risks
        risks = self._prioritize_risks(risks)
        
        return risks
    
    def _assess_rule_based_risks(
        self,
        vendor_data: Dict[str, Any],
        metrics: Any
    ) -> List[Dict[str, Any]]:
        """Assess risks using rule-based logic."""
        risks = []
        
        # Check delivery performance
        if hasattr(metrics, 'on_time_delivery'):
            if metrics.on_time_delivery < 60:
                risks.append({
                    "level": "critical",
                    "category": "Operational",
                    "description": "Critical delivery performance issues",
                    "impact": "Severe operational disruptions likely",
                    "likelihood": 0.9,
                    "mitigation_strategies": [
                        "Immediate vendor meeting required",
                        "Activate backup suppliers",
                        "Review and revise delivery SLAs"
                    ]
                })
            elif metrics.on_time_delivery < 75:
                risks.append({
                    "level": "high",
                    "category": "Operational",
                    "description": "Poor delivery performance",
                    "impact": "Operational delays expected",
                    "likelihood": 0.7,
                    "mitigation_strategies": [
                        "Implement performance improvement plan",
                        "Increase safety stock levels"
                    ]
                })
        
        # Check quality issues
        if hasattr(metrics, 'quality_score'):
            if metrics.quality_score < 70:
                risks.append({
                    "level": "high",
                    "category": "Quality",
                    "description": "Substandard quality metrics",
                    "impact": "Product quality and customer satisfaction at risk",
                    "likelihood": 0.8,
                    "mitigation_strategies": [
                        "Implement quality audit program",
                        "Require quality improvement plan",
                        "Consider alternative vendors"
                    ]
                })
        
        # Check compliance
        if hasattr(metrics, 'compliance_rate'):
            if metrics.compliance_rate < 80:
                risks.append({
                    "level": "high",
                    "category": "Compliance",
                    "description": "Compliance requirements not being met",
                    "impact": "Regulatory penalties and audit failures possible",
                    "likelihood": 0.75,
                    "mitigation_strategies": [
                        "Conduct compliance audit",
                        "Implement corrective action plan",
                        "Enhance monitoring procedures"
                    ]
                })
        
        # Check financial stability indicators
        if 'financial_rating' in vendor_data:
            rating = vendor_data['financial_rating']
            if isinstance(rating, str) and rating.lower() in ['poor', 'weak', 'd', 'f']:
                risks.append({
                    "level": "high",
                    "category": "Financial",
                    "description": "Vendor financial instability",
                    "impact": "Risk of vendor bankruptcy or service disruption",
                    "likelihood": 0.6,
                    "mitigation_strategies": [
                        "Request financial guarantees",
                        "Diversify supplier base",
                        "Develop contingency plans"
                    ]
                })
        
        # Check concentration risk
        if 'spend_percentage' in vendor_data:
            spend_pct = vendor_data.get('spend_percentage', 0)
            if spend_pct > 30:
                risks.append({
                    "level": "medium",
                    "category": "Strategic",
                    "description": f"High vendor concentration ({spend_pct}% of spend)",
                    "impact": "Over-dependence on single vendor",
                    "likelihood": 0.5,
                    "mitigation_strategies": [
                        "Identify alternative suppliers",
                        "Negotiate better terms",
                        "Develop dual-sourcing strategy"
                    ]
                })
        
        # Check contract expiry
        if 'contract_expiry' in vendor_data:
            try:
                expiry = pd.to_datetime(vendor_data['contract_expiry'])
                days_to_expiry = (expiry - datetime.now()).days
                
                if days_to_expiry < 30:
                    risks.append({
                        "level": "high",
                        "category": "Contractual",
                        "description": f"Contract expiring in {days_to_expiry} days",
                        "impact": "Service disruption if renewal not completed",
                        "likelihood": 0.8,
                        "mitigation_strategies": [
                            "Initiate renewal negotiations immediately",
                            "Prepare contingency plans",
                            "Review alternative options"
                        ]
                    })
                elif days_to_expiry < 90:
                    risks.append({
                        "level": "medium",
                        "category": "Contractual",
                        "description": f"Contract expiring in {days_to_expiry} days",
                        "impact": "Limited time for negotiation",
                        "likelihood": 0.5,
                        "mitigation_strategies": [
                            "Begin renewal discussions",
                            "Benchmark market rates"
                        ]
                    })
            except:
                pass
        
        return risks
    
    async def _predict_ml_risks(
        self,
        historical_data: List[Dict[str, Any]],
        current_metrics: Any
    ) -> List[Dict[str, Any]]:
        """Predict risks using machine learning models."""
        risks = []
        
        if not self.models:
            return risks
        
        try:
            # Prepare features
            X, feature_names = self._prepare_features(historical_data)
            
            if X is None or len(X) < 5:
                return risks
            
            # Get current features
            current_features = self._extract_current_features(current_metrics)
            
            # Predict risk score using ensemble
            risk_scores = []
            
            for model_name, model in self.models.items():
                if model_name == 'isolation_forest':
                    # Anomaly detection
                    if SKLEARN_AVAILABLE:
                        try:
                            model.fit(X)
                            anomaly_score = model.decision_function([current_features])[0]
                            if anomaly_score < -0.1:  # Anomaly threshold
                                risks.append({
                                    "level": "high",
                                    "category": "Anomaly",
                                    "description": "Unusual vendor behavior detected",
                                    "impact": "Unexpected performance deviation",
                                    "likelihood": 0.7,
                                    "mitigation_strategies": [
                                        "Investigate recent changes",
                                        "Increase monitoring frequency"
                                    ]
                                })
                        except:
                            pass
                else:
                    # Regression models for risk scoring
                    try:
                        # Create synthetic risk labels for training
                        y = self._create_risk_labels(historical_data)
                        
                        if len(X) == len(y):
                            model.fit(X, y)
                            risk_score = model.predict([current_features])[0]
                            risk_scores.append(risk_score)
                    except Exception as e:
                        logger.warning(f"Model {model_name} prediction failed: {e}")
            
            # Aggregate risk scores
            if risk_scores:
                avg_risk_score = np.mean(risk_scores)
                
                if avg_risk_score > 70:
                    risks.append({
                        "level": "high",
                        "category": "Predictive",
                        "description": "ML models predict high risk",
                        "impact": "Likely performance degradation",
                        "likelihood": min(0.9, avg_risk_score / 100),
                        "mitigation_strategies": [
                            "Proactive intervention required",
                            "Review vendor relationship"
                        ]
                    })
                elif avg_risk_score > 50:
                    risks.append({
                        "level": "medium",
                        "category": "Predictive",
                        "description": "ML models indicate elevated risk",
                        "impact": "Potential performance issues",
                        "likelihood": avg_risk_score / 100,
                        "mitigation_strategies": [
                            "Enhanced monitoring recommended",
                            "Prepare contingency plans"
                        ]
                    })
            
        except Exception as e:
            logger.error(f"ML risk prediction failed: {e}")
        
        return risks
    
    def _detect_risk_patterns(
        self,
        vendor_data: Dict[str, Any],
        metrics: Any
    ) -> List[Dict[str, Any]]:
        """Detect risk patterns in vendor behavior."""
        risks = []
        
        # Pattern: Declining performance trend
        if hasattr(metrics, '__dict__'):
            metric_values = [getattr(metrics, attr) for attr in dir(metrics) 
                           if not attr.startswith('_') and isinstance(getattr(metrics, attr), (int, float))]
            
            if metric_values:
                avg_performance = np.mean(metric_values)
                if avg_performance < 70:
                    risks.append({
                        "level": "medium",
                        "category": "Pattern",
                        "description": "Overall declining performance pattern",
                        "impact": "Gradual service degradation",
                        "likelihood": 0.6,
                        "mitigation_strategies": [
                            "Schedule performance review",
                            "Identify root causes"
                        ]
                    })
        
        # Pattern: High volatility
        if 'performance_volatility' in vendor_data:
            volatility = vendor_data['performance_volatility']
            if volatility > 20:  # 20% volatility threshold
                risks.append({
                    "level": "medium",
                    "category": "Stability",
                    "description": "High performance volatility",
                    "impact": "Unpredictable service levels",
                    "likelihood": 0.65,
                    "mitigation_strategies": [
                        "Implement stabilization measures",
                        "Increase buffer stocks"
                    ]
                })
        
        # Pattern: Seasonal risks
        current_month = datetime.now().month
        if current_month in [11, 12, 1]:  # Holiday season
            risks.append({
                "level": "low",
                "category": "Seasonal",
                "description": "Peak season capacity concerns",
                "impact": "Potential delays during high demand",
                "likelihood": 0.4,
                "mitigation_strategies": [
                    "Confirm capacity allocation",
                    "Plan for seasonal fluctuations"
                ]
            })
        
        return risks
    
    def _prepare_features(
        self,
        historical_data: List[Dict[str, Any]]
    ) -> tuple:
        """Prepare features for ML models."""
        if not historical_data:
            return None, []
        
        try:
            df = pd.DataFrame(historical_data)
            
            # Select numeric columns
            numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
            
            if not numeric_cols:
                return None, []
            
            # Handle missing values
            df[numeric_cols] = df[numeric_cols].fillna(df[numeric_cols].mean())
            
            # Create features
            features = df[numeric_cols].values
            
            # Scale features if scaler available
            if self.scaler and SKLEARN_AVAILABLE:
                features = self.scaler.fit_transform(features)
            
            return features, numeric_cols
            
        except Exception as e:
            logger.error(f"Feature preparation failed: {e}")
            return None, []
    
    def _extract_current_features(self, metrics: Any) -> List[float]:
        """Extract features from current metrics."""
        features = []
        
        # Extract numeric values from metrics
        if hasattr(metrics, '__dict__'):
            for attr in sorted(dir(metrics)):
                if not attr.startswith('_'):
                    value = getattr(metrics, attr)
                    if isinstance(value, (int, float)):
                        features.append(float(value))
        
        # Ensure we have the right number of features
        while len(features) < 5:
            features.append(0.0)
        
        return features
    
    def _create_risk_labels(
        self,
        historical_data: List[Dict[str, Any]]
    ) -> np.ndarray:
        """Create synthetic risk labels for training."""
        labels = []
        
        for record in historical_data:
            risk_score = 0
            
            # Calculate risk based on performance metrics
            if 'delivery_rate' in record:
                if record['delivery_rate'] < 70:
                    risk_score += 30
                elif record['delivery_rate'] < 85:
                    risk_score += 15
            
            if 'quality_score' in record:
                if record['quality_score'] < 70:
                    risk_score += 30
                elif record['quality_score'] < 85:
                    risk_score += 15
            
            if 'cost_variance' in record:
                if abs(record['cost_variance']) > 15:
                    risk_score += 20
                elif abs(record['cost_variance']) > 10:
                    risk_score += 10
            
            labels.append(min(100, risk_score))
        
        return np.array(labels)
    
    def _prioritize_risks(self, risks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Prioritize and deduplicate risks."""
        # Remove duplicates based on description
        seen_descriptions = set()
        unique_risks = []
        
        for risk in risks:
            desc = risk.get('description', '')
            if desc not in seen_descriptions:
                seen_descriptions.add(desc)
                unique_risks.append(risk)
        
        # Sort by severity (critical > high > medium > low)
        severity_order = {'critical': 0, 'high': 1, 'medium': 2, 'low': 3}
        unique_risks.sort(key=lambda r: (
            severity_order.get(r.get('level', 'low'), 4),
            -r.get('likelihood', 0)
        ))
        
        return unique_risks