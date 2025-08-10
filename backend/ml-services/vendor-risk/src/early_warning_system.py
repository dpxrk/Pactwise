"""
Early warning system for vendor risk detection.
"""

import logging
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime, timedelta
import numpy as np
import pandas as pd
from collections import deque
from enum import Enum

logger = logging.getLogger(__name__)


class SignalType(Enum):
    """Types of early warning signals."""
    PERFORMANCE_DECLINE = "performance_decline"
    FINANCIAL_STRESS = "financial_stress"
    COMPLIANCE_BREACH = "compliance_breach"
    QUALITY_DEGRADATION = "quality_degradation"
    COMMUNICATION_BREAKDOWN = "communication_breakdown"
    MARKET_DISRUPTION = "market_disruption"
    CAPACITY_CONSTRAINT = "capacity_constraint"
    REPUTATION_DAMAGE = "reputation_damage"
    OPERATIONAL_INSTABILITY = "operational_instability"
    STRATEGIC_MISALIGNMENT = "strategic_misalignment"


@dataclass
class WarningSignal:
    """Early warning signal data."""
    signal_type: SignalType
    severity: str  # critical, high, medium, low
    confidence: float  # 0-1
    description: str
    indicators: List[str]
    trend: str  # accelerating, stable, decelerating
    time_to_impact: int  # days
    recommended_actions: List[str]


class EarlyWarningSystem:
    """
    Detect early warning signals for vendor risks.
    """
    
    # Signal detection thresholds
    THRESHOLDS = {
        "performance_decline": {
            "critical": -20,  # 20% decline
            "high": -15,
            "medium": -10,
            "low": -5
        },
        "quality_degradation": {
            "critical": -25,
            "high": -15,
            "medium": -10,
            "low": -5
        },
        "response_time_increase": {
            "critical": 100,  # 100% increase
            "high": 50,
            "medium": 25,
            "low": 10
        },
        "cost_variance": {
            "critical": 20,  # 20% variance
            "high": 15,
            "medium": 10,
            "low": 5
        }
    }
    
    def __init__(self):
        """Initialize early warning system."""
        self.signal_history = deque(maxlen=1000)
        self.pattern_library = self._initialize_patterns()
        self.active_warnings = []
    
    def _initialize_patterns(self) -> Dict[str, Any]:
        """Initialize pattern library for signal detection."""
        return {
            "gradual_decline": {
                "description": "Consistent deterioration over time",
                "min_points": 5,
                "check_function": self._check_gradual_decline
            },
            "sudden_drop": {
                "description": "Abrupt performance drop",
                "min_points": 2,
                "check_function": self._check_sudden_drop
            },
            "volatility_increase": {
                "description": "Increasing variance in metrics",
                "min_points": 10,
                "check_function": self._check_volatility_increase
            },
            "threshold_breach": {
                "description": "Metric exceeds critical threshold",
                "min_points": 1,
                "check_function": self._check_threshold_breach
            },
            "trend_reversal": {
                "description": "Positive trend turning negative",
                "min_points": 7,
                "check_function": self._check_trend_reversal
            }
        }
    
    async def detect_signals(
        self,
        vendor_data: Dict[str, Any],
        metrics: Any,
        historical_data: Optional[List[Dict[str, Any]]] = None
    ) -> List[Dict[str, Any]]:
        """
        Detect early warning signals.
        
        Args:
            vendor_data: Current vendor information
            metrics: Current performance metrics
            historical_data: Historical performance data
            
        Returns:
            List of detected warning signals
        """
        warnings = []
        
        # Real-time signal detection
        realtime_signals = self._detect_realtime_signals(vendor_data, metrics)
        warnings.extend(realtime_signals)
        
        # Historical pattern detection
        if historical_data and len(historical_data) > 5:
            pattern_signals = await self._detect_pattern_signals(historical_data)
            warnings.extend(pattern_signals)
        
        # External signal detection
        external_signals = self._detect_external_signals(vendor_data)
        warnings.extend(external_signals)
        
        # Composite signal detection
        composite_signals = self._detect_composite_signals(vendor_data, metrics, warnings)
        warnings.extend(composite_signals)
        
        # Update active warnings
        self.active_warnings = warnings
        
        # Prioritize warnings
        warnings = self._prioritize_warnings(warnings)
        
        return warnings
    
    def _detect_realtime_signals(
        self,
        vendor_data: Dict[str, Any],
        metrics: Any
    ) -> List[Dict[str, Any]]:
        """Detect real-time warning signals."""
        signals = []
        
        # Performance decline signal
        if hasattr(metrics, 'on_time_delivery'):
            if metrics.on_time_delivery < 70:
                severity = "critical" if metrics.on_time_delivery < 50 else "high"
                signals.append({
                    "type": SignalType.PERFORMANCE_DECLINE.value,
                    "severity": severity,
                    "confidence": 0.9,
                    "description": f"Delivery performance at {metrics.on_time_delivery}%",
                    "indicators": [
                        f"On-time delivery: {metrics.on_time_delivery}%",
                        "Below acceptable threshold"
                    ],
                    "trend": "declining",
                    "time_to_impact": 7 if severity == "critical" else 14,
                    "recommended_actions": [
                        "Schedule urgent vendor meeting",
                        "Review delivery processes",
                        "Consider backup suppliers"
                    ]
                })
        
        # Quality degradation signal
        if hasattr(metrics, 'quality_score'):
            if metrics.quality_score < 70:
                signals.append({
                    "type": SignalType.QUALITY_DEGRADATION.value,
                    "severity": "high" if metrics.quality_score < 60 else "medium",
                    "confidence": 0.85,
                    "description": f"Quality score dropped to {metrics.quality_score}",
                    "indicators": [
                        f"Quality score: {metrics.quality_score}",
                        "Increased defect rates"
                    ],
                    "trend": "declining",
                    "time_to_impact": 10,
                    "recommended_actions": [
                        "Implement quality audit",
                        "Review QA processes",
                        "Consider penalties"
                    ]
                })
        
        # Compliance breach signal
        if hasattr(metrics, 'compliance_rate'):
            if metrics.compliance_rate < 80:
                signals.append({
                    "type": SignalType.COMPLIANCE_BREACH.value,
                    "severity": "high",
                    "confidence": 0.95,
                    "description": f"Compliance rate at {metrics.compliance_rate}%",
                    "indicators": [
                        f"Compliance rate: {metrics.compliance_rate}%",
                        "Regulatory requirements at risk"
                    ],
                    "trend": "stable",
                    "time_to_impact": 5,
                    "recommended_actions": [
                        "Immediate compliance review",
                        "Corrective action plan",
                        "Legal consultation"
                    ]
                })
        
        # Response time signal
        if hasattr(metrics, 'response_time'):
            if metrics.response_time < 60:  # Poor response score
                signals.append({
                    "type": SignalType.COMMUNICATION_BREAKDOWN.value,
                    "severity": "medium",
                    "confidence": 0.7,
                    "description": "Deteriorating communication responsiveness",
                    "indicators": [
                        f"Response score: {metrics.response_time}",
                        "Delayed communications"
                    ],
                    "trend": "declining",
                    "time_to_impact": 21,
                    "recommended_actions": [
                        "Establish communication SLAs",
                        "Escalation procedures",
                        "Regular check-ins"
                    ]
                })
        
        return signals
    
    async def _detect_pattern_signals(
        self,
        historical_data: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Detect pattern-based warning signals."""
        signals = []
        
        try:
            # Convert to DataFrame for analysis
            df = pd.DataFrame(historical_data)
            
            # Check each metric for patterns
            for column in df.select_dtypes(include=[np.number]).columns:
                if len(df[column]) < 5:
                    continue
                
                values = df[column].values
                
                # Check for gradual decline
                decline_signal = self._check_gradual_decline(values, column)
                if decline_signal:
                    signals.append(decline_signal)
                
                # Check for sudden drops
                drop_signal = self._check_sudden_drop(values, column)
                if drop_signal:
                    signals.append(drop_signal)
                
                # Check for volatility increase
                volatility_signal = self._check_volatility_increase(values, column)
                if volatility_signal:
                    signals.append(volatility_signal)
            
        except Exception as e:
            logger.error(f"Pattern detection failed: {e}")
        
        return signals
    
    def _check_gradual_decline(
        self,
        values: np.ndarray,
        metric_name: str
    ) -> Optional[Dict[str, Any]]:
        """Check for gradual decline pattern."""
        if len(values) < 5:
            return None
        
        # Calculate trend
        x = np.arange(len(values))
        coefficients = np.polyfit(x, values, 1)
        slope = coefficients[0]
        
        # Check if declining
        if slope < -0.5:  # Significant negative slope
            decline_rate = abs(slope) * 100 / np.mean(values) if np.mean(values) != 0 else 0
            
            if decline_rate > 5:  # More than 5% decline rate
                return {
                    "type": SignalType.PERFORMANCE_DECLINE.value,
                    "severity": "high" if decline_rate > 10 else "medium",
                    "confidence": 0.75,
                    "description": f"Gradual decline in {metric_name}",
                    "indicators": [
                        f"{metric_name} declining at {decline_rate:.1f}% rate",
                        f"Current value: {values[-1]:.1f}"
                    ],
                    "trend": "declining",
                    "time_to_impact": int(30 / decline_rate) if decline_rate > 0 else 30,
                    "recommended_actions": [
                        "Investigate root cause",
                        "Implement improvement plan",
                        "Monitor closely"
                    ]
                }
        
        return None
    
    def _check_sudden_drop(
        self,
        values: np.ndarray,
        metric_name: str
    ) -> Optional[Dict[str, Any]]:
        """Check for sudden drop pattern."""
        if len(values) < 2:
            return None
        
        # Check recent drop
        if len(values) >= 2:
            recent_change = (values[-1] - values[-2]) / values[-2] * 100 if values[-2] != 0 else 0
            
            if recent_change < -15:  # More than 15% drop
                return {
                    "type": SignalType.OPERATIONAL_INSTABILITY.value,
                    "severity": "critical" if recent_change < -25 else "high",
                    "confidence": 0.85,
                    "description": f"Sudden drop in {metric_name}",
                    "indicators": [
                        f"{metric_name} dropped {abs(recent_change):.1f}%",
                        f"From {values[-2]:.1f} to {values[-1]:.1f}"
                    ],
                    "trend": "accelerating",
                    "time_to_impact": 3,
                    "recommended_actions": [
                        "Immediate investigation",
                        "Emergency response activation",
                        "Contingency plan execution"
                    ]
                }
        
        return None
    
    def _check_volatility_increase(
        self,
        values: np.ndarray,
        metric_name: str
    ) -> Optional[Dict[str, Any]]:
        """Check for increasing volatility."""
        if len(values) < 10:
            return None
        
        # Calculate rolling standard deviation
        window = min(5, len(values) // 2)
        rolling_std = pd.Series(values).rolling(window).std()
        
        # Check if volatility is increasing
        if len(rolling_std) > window:
            recent_vol = rolling_std.iloc[-1]
            historical_vol = rolling_std.iloc[window:-1].mean()
            
            if historical_vol > 0 and recent_vol / historical_vol > 1.5:
                return {
                    "type": SignalType.OPERATIONAL_INSTABILITY.value,
                    "severity": "medium",
                    "confidence": 0.65,
                    "description": f"Increasing volatility in {metric_name}",
                    "indicators": [
                        f"Volatility increased {(recent_vol/historical_vol - 1)*100:.0f}%",
                        "Unstable performance"
                    ],
                    "trend": "volatile",
                    "time_to_impact": 14,
                    "recommended_actions": [
                        "Identify instability causes",
                        "Stabilization measures",
                        "Increased monitoring"
                    ]
                }
        
        return None
    
    def _check_threshold_breach(
        self,
        value: float,
        metric_name: str,
        thresholds: Dict[str, float]
    ) -> Optional[Dict[str, Any]]:
        """Check for threshold breaches."""
        for severity, threshold in thresholds.items():
            if value < threshold:
                return {
                    "type": SignalType.PERFORMANCE_DECLINE.value,
                    "severity": severity,
                    "confidence": 0.95,
                    "description": f"{metric_name} below {severity} threshold",
                    "indicators": [
                        f"Current value: {value}",
                        f"Threshold: {threshold}"
                    ],
                    "trend": "critical",
                    "time_to_impact": 1 if severity == "critical" else 7,
                    "recommended_actions": [
                        "Immediate action required",
                        "Escalate to management",
                        "Activate contingency"
                    ]
                }
        
        return None
    
    def _check_trend_reversal(
        self,
        values: np.ndarray,
        metric_name: str
    ) -> Optional[Dict[str, Any]]:
        """Check for trend reversal."""
        if len(values) < 7:
            return None
        
        # Split data
        mid_point = len(values) // 2
        first_half = values[:mid_point]
        second_half = values[mid_point:]
        
        # Calculate trends
        x1 = np.arange(len(first_half))
        x2 = np.arange(len(second_half))
        
        slope1 = np.polyfit(x1, first_half, 1)[0]
        slope2 = np.polyfit(x2, second_half, 1)[0]
        
        # Check for reversal
        if slope1 > 0 and slope2 < -0.5:  # Was improving, now declining
            return {
                "type": SignalType.STRATEGIC_MISALIGNMENT.value,
                "severity": "medium",
                "confidence": 0.7,
                "description": f"Trend reversal in {metric_name}",
                "indicators": [
                    "Previously improving metric now declining",
                    f"Current trend: {slope2:.2f}"
                ],
                "trend": "reversing",
                "time_to_impact": 21,
                "recommended_actions": [
                    "Review recent changes",
                    "Realignment discussion",
                    "Corrective measures"
                ]
            }
        
        return None
    
    def _detect_external_signals(
        self,
        vendor_data: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Detect external warning signals."""
        signals = []
        
        # Financial stress indicators
        if 'credit_rating' in vendor_data:
            rating = vendor_data['credit_rating']
            if isinstance(rating, str) and rating.lower() in ['bb', 'b', 'ccc', 'cc', 'c', 'd']:
                signals.append({
                    "type": SignalType.FINANCIAL_STRESS.value,
                    "severity": "high" if rating.lower() in ['ccc', 'cc', 'c', 'd'] else "medium",
                    "confidence": 0.8,
                    "description": f"Poor credit rating: {rating}",
                    "indicators": [
                        f"Credit rating: {rating}",
                        "Financial instability risk"
                    ],
                    "trend": "concerning",
                    "time_to_impact": 30,
                    "recommended_actions": [
                        "Financial health assessment",
                        "Payment terms review",
                        "Alternative vendor identification"
                    ]
                })
        
        # Market disruption signals
        if 'industry_risk' in vendor_data:
            risk_level = vendor_data['industry_risk']
            if isinstance(risk_level, str) and risk_level.lower() in ['high', 'critical']:
                signals.append({
                    "type": SignalType.MARKET_DISRUPTION.value,
                    "severity": "medium",
                    "confidence": 0.6,
                    "description": "Industry facing disruption",
                    "indicators": [
                        f"Industry risk: {risk_level}",
                        "Market volatility"
                    ],
                    "trend": "external",
                    "time_to_impact": 60,
                    "recommended_actions": [
                        "Market analysis",
                        "Diversification strategy",
                        "Long-term planning"
                    ]
                })
        
        # Reputation signals
        if 'reputation_score' in vendor_data:
            score = vendor_data['reputation_score']
            if isinstance(score, (int, float)) and score < 50:
                signals.append({
                    "type": SignalType.REPUTATION_DAMAGE.value,
                    "severity": "medium",
                    "confidence": 0.65,
                    "description": "Reputation concerns",
                    "indicators": [
                        f"Reputation score: {score}",
                        "Public perception issues"
                    ],
                    "trend": "concerning",
                    "time_to_impact": 45,
                    "recommended_actions": [
                        "Reputation monitoring",
                        "Brand association review",
                        "PR strategy assessment"
                    ]
                })
        
        return signals
    
    def _detect_composite_signals(
        self,
        vendor_data: Dict[str, Any],
        metrics: Any,
        existing_signals: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Detect composite signals from multiple indicators."""
        signals = []
        
        # Count signal types
        signal_types = [s.get('type') for s in existing_signals]
        
        # Multiple performance issues
        performance_signals = [s for s in signal_types if 'performance' in s or 'quality' in s]
        if len(performance_signals) >= 2:
            signals.append({
                "type": SignalType.OPERATIONAL_INSTABILITY.value,
                "severity": "critical",
                "confidence": 0.9,
                "description": "Multiple performance indicators failing",
                "indicators": [
                    f"{len(performance_signals)} performance metrics declining",
                    "Systemic operational issues"
                ],
                "trend": "accelerating",
                "time_to_impact": 5,
                "recommended_actions": [
                    "Executive-level intervention",
                    "Comprehensive vendor review",
                    "Immediate contingency activation"
                ]
            })
        
        # Capacity constraints
        if hasattr(metrics, 'on_time_delivery') and hasattr(metrics, 'quality_score'):
            if metrics.on_time_delivery < 75 and metrics.quality_score < 75:
                signals.append({
                    "type": SignalType.CAPACITY_CONSTRAINT.value,
                    "severity": "high",
                    "confidence": 0.75,
                    "description": "Vendor capacity constraints detected",
                    "indicators": [
                        "Delivery and quality both declining",
                        "Possible overextension"
                    ],
                    "trend": "concerning",
                    "time_to_impact": 10,
                    "recommended_actions": [
                        "Capacity assessment",
                        "Workload redistribution",
                        "Additional vendor sourcing"
                    ]
                })
        
        return signals
    
    def _prioritize_warnings(
        self,
        warnings: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Prioritize warnings by severity and time to impact."""
        # Define priority scores
        severity_scores = {
            "critical": 4,
            "high": 3,
            "medium": 2,
            "low": 1
        }
        
        # Calculate priority score for each warning
        for warning in warnings:
            severity = warning.get("severity", "low")
            time_to_impact = warning.get("time_to_impact", 30)
            confidence = warning.get("confidence", 0.5)
            
            # Priority = severity * confidence / sqrt(time_to_impact)
            severity_score = severity_scores.get(severity, 1)
            time_factor = np.sqrt(max(1, time_to_impact))
            
            warning["priority_score"] = (severity_score * confidence * 10) / time_factor
        
        # Sort by priority score
        warnings.sort(key=lambda x: x.get("priority_score", 0), reverse=True)
        
        # Remove priority score from output
        for warning in warnings:
            warning.pop("priority_score", None)
        
        return warnings
    
    async def get_active_warnings(self) -> List[Dict[str, Any]]:
        """Get currently active warnings."""
        return self.active_warnings
    
    async def acknowledge_warning(
        self,
        warning_id: str
    ) -> bool:
        """
        Acknowledge a warning.
        
        Args:
            warning_id: Warning identifier
            
        Returns:
            Success status
        """
        # Remove from active warnings
        self.active_warnings = [
            w for w in self.active_warnings
            if w.get("id") != warning_id
        ]
        return True
    
    async def get_warning_trends(
        self,
        vendor_id: str,
        days: int = 30
    ) -> Dict[str, Any]:
        """
        Get warning trends for a vendor.
        
        Args:
            vendor_id: Vendor identifier
            days: Number of days to analyze
            
        Returns:
            Warning trend analysis
        """
        # This would typically query historical warnings from database
        # For now, return sample analysis
        return {
            "vendor_id": vendor_id,
            "period_days": days,
            "total_warnings": len(self.signal_history),
            "by_severity": {
                "critical": 2,
                "high": 5,
                "medium": 8,
                "low": 3
            },
            "by_type": {
                "performance": 6,
                "quality": 4,
                "compliance": 3,
                "financial": 2,
                "other": 3
            },
            "trend": "improving" if len(self.active_warnings) < 5 else "deteriorating"
        }