"""
Time-series analysis for vendor performance prediction.
"""

import logging
from typing import List, Dict, Any, Optional, Tuple
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from dataclasses import dataclass

try:
    from prophet import Prophet
    PROPHET_AVAILABLE = True
except ImportError:
    PROPHET_AVAILABLE = False
    logging.warning("Prophet not available")

try:
    from statsmodels.tsa.arima.model import ARIMA
    from statsmodels.tsa.seasonal import seasonal_decompose
    from statsmodels.tsa.stattools import adfuller
    STATSMODELS_AVAILABLE = True
except ImportError:
    STATSMODELS_AVAILABLE = False
    logging.warning("Statsmodels not available")

logger = logging.getLogger(__name__)


@dataclass
class TimeSeriesResult:
    """Time series analysis result."""
    trend: List[float]
    seasonal: Optional[List[float]]
    residual: List[float]
    forecast: List[float]
    confidence_lower: List[float]
    confidence_upper: List[float]
    anomalies: List[Dict[str, Any]]
    change_points: List[Dict[str, Any]]


class TimeSeriesAnalyzer:
    """
    Analyze vendor performance time series data.
    """
    
    def __init__(self):
        """Initialize time series analyzer."""
        self.models = {}
        self.cache = {}
    
    async def analyze(
        self,
        historical_data: List[Dict[str, Any]],
        horizon_days: int = 90
    ) -> Dict[str, Any]:
        """
        Analyze historical vendor data and forecast future performance.
        
        Args:
            historical_data: List of historical data points
            horizon_days: Number of days to forecast
            
        Returns:
            Analysis results including forecast and anomalies
        """
        if not historical_data:
            return {"error": "No historical data provided"}
        
        # Convert to DataFrame
        df = self._prepare_dataframe(historical_data)
        
        if df is None or len(df) < 10:
            return {"error": "Insufficient data for analysis"}
        
        results = {}
        
        # Analyze each metric
        metrics = ['delivery_rate', 'quality_score', 'response_time', 'cost']
        
        for metric in metrics:
            if metric in df.columns:
                # Perform analysis
                metric_results = await self._analyze_metric(
                    df[metric].values,
                    df.index,
                    horizon_days
                )
                results[metric] = metric_results
        
        # Detect anomalies
        anomalies = self._detect_anomalies(df)
        
        # Detect change points
        change_points = self._detect_change_points(df)
        
        # Generate overall predictions
        predictions = self._generate_predictions(results, horizon_days)
        
        return {
            "metrics_analysis": results,
            "anomalies": anomalies,
            "change_points": change_points,
            "predictions": predictions,
            "risk_trend": self._calculate_risk_trend(results)
        }
    
    async def forecast(
        self,
        historical_data: List[Dict[str, Any]],
        horizon_days: int
    ) -> Dict[str, Any]:
        """
        Generate forecasts for vendor metrics.
        
        Args:
            historical_data: Historical data
            horizon_days: Forecast horizon
            
        Returns:
            Forecasted values with confidence intervals
        """
        df = self._prepare_dataframe(historical_data)
        
        if df is None:
            return {"error": "Cannot prepare data for forecasting"}
        
        forecasts = {}
        
        # Use Prophet if available for better forecasting
        if PROPHET_AVAILABLE:
            for column in df.columns:
                if column != 'date':
                    forecast = self._prophet_forecast(df, column, horizon_days)
                    forecasts[column] = forecast
        elif STATSMODELS_AVAILABLE:
            for column in df.columns:
                if column != 'date':
                    forecast = self._arima_forecast(df[column].values, horizon_days)
                    forecasts[column] = forecast
        else:
            # Fallback to simple moving average
            for column in df.columns:
                if column != 'date':
                    forecast = self._simple_forecast(df[column].values, horizon_days)
                    forecasts[column] = forecast
        
        return {
            "forecasts": forecasts,
            "horizon_days": horizon_days,
            "method": self._get_forecast_method(),
            "confidence_level": 0.95
        }
    
    def _prepare_dataframe(self, data: List[Dict[str, Any]]) -> Optional[pd.DataFrame]:
        """Prepare DataFrame from historical data."""
        try:
            if not data:
                return None
            
            # Convert to DataFrame
            df = pd.DataFrame(data)
            
            # Ensure date column
            if 'date' in df.columns:
                df['date'] = pd.to_datetime(df['date'])
                df.set_index('date', inplace=True)
            elif 'timestamp' in df.columns:
                df['timestamp'] = pd.to_datetime(df['timestamp'])
                df.set_index('timestamp', inplace=True)
            else:
                # Create date index
                df.index = pd.date_range(
                    end=datetime.now(),
                    periods=len(df),
                    freq='D'
                )
            
            # Sort by date
            df.sort_index(inplace=True)
            
            # Handle missing values
            df.fillna(method='ffill', inplace=True)
            df.fillna(method='bfill', inplace=True)
            
            return df
            
        except Exception as e:
            logger.error(f"Error preparing dataframe: {e}")
            return None
    
    async def _analyze_metric(
        self,
        values: np.ndarray,
        dates: pd.DatetimeIndex,
        horizon: int
    ) -> Dict[str, Any]:
        """Analyze a single metric time series."""
        result = {
            "mean": float(np.mean(values)),
            "std": float(np.std(values)),
            "trend": "stable",
            "seasonality": False,
            "forecast": []
        }
        
        if len(values) < 10:
            return result
        
        # Trend analysis
        trend = self._calculate_trend(values)
        result["trend"] = trend
        
        # Seasonality detection
        if STATSMODELS_AVAILABLE and len(values) > 24:
            try:
                decomposition = seasonal_decompose(values, model='additive', period=7)
                seasonal_strength = np.std(decomposition.seasonal) / np.std(values)
                result["seasonality"] = seasonal_strength > 0.1
                result["seasonal_period"] = 7 if result["seasonality"] else None
            except:
                pass
        
        # Simple forecast
        if len(values) >= 7:
            forecast = self._simple_forecast(values, min(horizon, 30))
            result["forecast"] = forecast.tolist()
        
        return result
    
    def _calculate_trend(self, values: np.ndarray) -> str:
        """Calculate trend direction."""
        if len(values) < 3:
            return "insufficient_data"
        
        # Simple linear regression
        x = np.arange(len(values))
        coefficients = np.polyfit(x, values, 1)
        slope = coefficients[0]
        
        # Normalize slope by mean
        if np.mean(values) != 0:
            normalized_slope = slope / np.mean(values)
        else:
            normalized_slope = 0
        
        if normalized_slope > 0.01:
            return "increasing"
        elif normalized_slope < -0.01:
            return "decreasing"
        else:
            return "stable"
    
    def _detect_anomalies(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Detect anomalies in time series data."""
        anomalies = []
        
        for column in df.columns:
            if column == 'date':
                continue
            
            values = df[column].values
            if len(values) < 10:
                continue
            
            # Use IQR method
            Q1 = np.percentile(values, 25)
            Q3 = np.percentile(values, 75)
            IQR = Q3 - Q1
            
            lower_bound = Q1 - 1.5 * IQR
            upper_bound = Q3 + 1.5 * IQR
            
            # Find anomalies
            for i, value in enumerate(values):
                if value < lower_bound or value > upper_bound:
                    anomalies.append({
                        "metric": column,
                        "date": df.index[i].isoformat() if hasattr(df.index[i], 'isoformat') else str(df.index[i]),
                        "value": float(value),
                        "expected_range": [float(lower_bound), float(upper_bound)],
                        "severity": "high" if abs(value - np.mean(values)) > 3 * np.std(values) else "medium"
                    })
        
        return anomalies
    
    def _detect_change_points(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Detect significant change points in time series."""
        change_points = []
        
        for column in df.columns:
            if column == 'date':
                continue
            
            values = df[column].values
            if len(values) < 20:
                continue
            
            # Simple change point detection using rolling statistics
            window = min(7, len(values) // 4)
            rolling_mean = pd.Series(values).rolling(window).mean()
            rolling_std = pd.Series(values).rolling(window).std()
            
            # Detect significant changes
            for i in range(window, len(values) - window):
                before_mean = np.mean(values[i-window:i])
                after_mean = np.mean(values[i:i+window])
                
                change_magnitude = abs(after_mean - before_mean)
                threshold = 2 * rolling_std.iloc[i] if not pd.isna(rolling_std.iloc[i]) else np.std(values)
                
                if change_magnitude > threshold:
                    change_points.append({
                        "metric": column,
                        "date": df.index[i].isoformat() if hasattr(df.index[i], 'isoformat') else str(df.index[i]),
                        "before_value": float(before_mean),
                        "after_value": float(after_mean),
                        "change_magnitude": float(change_magnitude),
                        "type": "increase" if after_mean > before_mean else "decrease"
                    })
        
        return change_points
    
    def _prophet_forecast(self, df: pd.DataFrame, column: str, horizon: int) -> Dict[str, Any]:
        """Generate forecast using Prophet."""
        try:
            # Prepare data for Prophet
            prophet_df = pd.DataFrame({
                'ds': df.index,
                'y': df[column].values
            })
            
            # Create and fit model
            model = Prophet(
                seasonality_mode='multiplicative',
                changepoint_prior_scale=0.05
            )
            model.fit(prophet_df)
            
            # Make forecast
            future = model.make_future_dataframe(periods=horizon)
            forecast = model.predict(future)
            
            # Extract results
            forecast_values = forecast['yhat'].tail(horizon).tolist()
            lower_bound = forecast['yhat_lower'].tail(horizon).tolist()
            upper_bound = forecast['yhat_upper'].tail(horizon).tolist()
            
            return {
                "values": forecast_values,
                "lower_bound": lower_bound,
                "upper_bound": upper_bound,
                "method": "prophet"
            }
            
        except Exception as e:
            logger.error(f"Prophet forecast failed: {e}")
            return self._simple_forecast_dict(df[column].values, horizon)
    
    def _arima_forecast(self, values: np.ndarray, horizon: int) -> Dict[str, Any]:
        """Generate forecast using ARIMA."""
        try:
            # Fit ARIMA model
            model = ARIMA(values, order=(1, 1, 1))
            fitted = model.fit()
            
            # Generate forecast
            forecast = fitted.forecast(steps=horizon)
            
            # Simple confidence intervals
            std_error = np.std(fitted.resid)
            lower_bound = forecast - 1.96 * std_error
            upper_bound = forecast + 1.96 * std_error
            
            return {
                "values": forecast.tolist(),
                "lower_bound": lower_bound.tolist(),
                "upper_bound": upper_bound.tolist(),
                "method": "arima"
            }
            
        except Exception as e:
            logger.error(f"ARIMA forecast failed: {e}")
            return self._simple_forecast_dict(values, horizon)
    
    def _simple_forecast(self, values: np.ndarray, horizon: int) -> np.ndarray:
        """Simple moving average forecast."""
        if len(values) < 3:
            return np.full(horizon, np.mean(values))
        
        # Use last 7 values or available values
        window = min(7, len(values))
        last_values = values[-window:]
        
        # Calculate trend
        trend = (last_values[-1] - last_values[0]) / len(last_values)
        
        # Generate forecast
        forecast = []
        last_value = values[-1]
        
        for i in range(horizon):
            next_value = last_value + trend
            forecast.append(next_value)
            last_value = next_value
        
        return np.array(forecast)
    
    def _simple_forecast_dict(self, values: np.ndarray, horizon: int) -> Dict[str, Any]:
        """Simple forecast with confidence intervals."""
        forecast = self._simple_forecast(values, horizon)
        std = np.std(values)
        
        return {
            "values": forecast.tolist(),
            "lower_bound": (forecast - 1.96 * std).tolist(),
            "upper_bound": (forecast + 1.96 * std).tolist(),
            "method": "moving_average"
        }
    
    def _generate_predictions(self, results: Dict[str, Any], horizon: int) -> Dict[str, Any]:
        """Generate overall predictions from individual metric forecasts."""
        predictions = {
            "horizon_days": horizon,
            "risk_level": "medium",
            "confidence": 0.7
        }
        
        # Aggregate metric predictions
        if results:
            # Check for deteriorating metrics
            deteriorating = 0
            improving = 0
            
            for metric, analysis in results.items():
                if analysis.get("trend") == "decreasing":
                    if metric in ["delivery_rate", "quality_score"]:
                        deteriorating += 1
                    else:
                        improving += 1
                elif analysis.get("trend") == "increasing":
                    if metric in ["cost", "response_time"]:
                        deteriorating += 1
                    else:
                        improving += 1
            
            # Determine risk level
            if deteriorating > improving:
                predictions["risk_level"] = "high"
            elif improving > deteriorating:
                predictions["risk_level"] = "low"
        
        return predictions
    
    def _calculate_risk_trend(self, results: Dict[str, Any]) -> str:
        """Calculate overall risk trend."""
        if not results:
            return "stable"
        
        trends = []
        for metric, analysis in results.items():
            trend = analysis.get("trend", "stable")
            if metric in ["delivery_rate", "quality_score"]:
                # Higher is better
                if trend == "increasing":
                    trends.append(1)
                elif trend == "decreasing":
                    trends.append(-1)
                else:
                    trends.append(0)
            else:
                # Lower is better (cost, response_time)
                if trend == "increasing":
                    trends.append(-1)
                elif trend == "decreasing":
                    trends.append(1)
                else:
                    trends.append(0)
        
        avg_trend = np.mean(trends) if trends else 0
        
        if avg_trend > 0.3:
            return "improving"
        elif avg_trend < -0.3:
            return "deteriorating"
        else:
            return "stable"
    
    def _get_forecast_method(self) -> str:
        """Get the forecasting method being used."""
        if PROPHET_AVAILABLE:
            return "prophet"
        elif STATSMODELS_AVAILABLE:
            return "arima"
        else:
            return "moving_average"