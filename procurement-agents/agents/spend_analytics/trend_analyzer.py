"""Trend analysis and forecasting for spend data"""

import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from scipy import stats
from statsmodels.tsa.seasonal import seasonal_decompose
from statsmodels.tsa.holtwinters import ExponentialSmoothing
import warnings
warnings.filterwarnings('ignore')

from utils.logging_config import get_logger
from utils.common import safe_divide, calculate_percentage


class TrendAnalyzer:
    """Analyze spending trends and generate forecasts"""
    
    def __init__(self):
        self.logger = get_logger(__name__)
        
    async def analyze_trends(self, df: pd.DataFrame, period_days: int) -> Dict[str, Any]:
        """Analyze spending trends over time"""
        if df.empty:
            return {}
        
        # Ensure datetime column
        if 'transaction_date' in df.columns:
            df['date'] = pd.to_datetime(df['transaction_date'])
        
        # Sort by date
        df = df.sort_values('date')
        
        # Calculate overall trend
        overall_trend = self._calculate_linear_trend(df)
        
        # Category trends
        category_trends = {}
        if 'category' in df.columns:
            for category in df['category'].unique():
                if pd.notna(category):
                    cat_df = df[df['category'] == category]
                    category_trends[category] = self._calculate_linear_trend(cat_df)
        
        # Identify growth and declining categories
        growth_categories = [
            cat for cat, trend in category_trends.items() 
            if trend.get('slope', 0) > 0
        ]
        declining_categories = [
            cat for cat, trend in category_trends.items() 
            if trend.get('slope', 0) < 0
        ]
        
        # Sort by absolute slope
        growth_categories.sort(
            key=lambda x: abs(category_trends[x].get('slope', 0)), 
            reverse=True
        )
        declining_categories.sort(
            key=lambda x: abs(category_trends[x].get('slope', 0)), 
            reverse=True
        )
        
        # Calculate volatility
        volatility = self._calculate_volatility(df)
        
        # Find peak periods
        peak_periods = self._identify_peak_periods(df)
        
        return {
            "overall_trend": overall_trend,
            "category_trends": category_trends,
            "growth_categories": growth_categories[:5],
            "declining_categories": declining_categories[:5],
            "volatility": volatility,
            "peak_periods": peak_periods,
            "trend_summary": self._generate_trend_summary(overall_trend, volatility)
        }
    
    async def detect_seasonality(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Detect seasonal patterns in spending"""
        if df.empty or len(df) < 30:
            return {"has_seasonality": False}
        
        try:
            # Prepare time series
            df['date'] = pd.to_datetime(df['transaction_date'])
            
            # Daily aggregation
            daily = df.groupby('date')['amount'].sum()
            
            # Fill missing dates
            idx = pd.date_range(daily.index.min(), daily.index.max())
            daily = daily.reindex(idx, fill_value=0)
            
            # Need at least 2 periods for seasonal decomposition
            if len(daily) < 60:
                return {"has_seasonality": False, "message": "Insufficient data"}
            
            # Perform seasonal decomposition
            decomposition = seasonal_decompose(daily, model='additive', period=30)
            
            # Calculate strength of seasonality
            seasonal_strength = np.var(decomposition.seasonal) / np.var(decomposition.observed)
            
            # Identify seasonal peaks
            seasonal_peaks = self._identify_seasonal_peaks(decomposition.seasonal)
            
            return {
                "has_seasonality": seasonal_strength > 0.1,
                "seasonal_strength": float(seasonal_strength),
                "seasonal_peaks": seasonal_peaks,
                "recommendation": self._generate_seasonality_recommendation(
                    seasonal_strength, 
                    seasonal_peaks
                )
            }
            
        except Exception as e:
            self.logger.warning(f"Seasonality detection failed: {e}")
            return {"has_seasonality": False, "error": str(e)}
    
    async def detect_outliers(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Detect outlier transactions"""
        if df.empty:
            return []
        
        outliers = []
        
        # Calculate z-scores for amounts
        z_scores = np.abs(stats.zscore(df['amount']))
        threshold = 3  # 3 standard deviations
        
        # Find outliers
        outlier_indices = np.where(z_scores > threshold)[0]
        
        for idx in outlier_indices:
            row = df.iloc[idx]
            outliers.append({
                "transaction_id": row.get('transaction_id'),
                "date": row.get('transaction_date'),
                "vendor": row.get('vendor_name'),
                "amount": float(row['amount']),
                "z_score": float(z_scores[idx]),
                "category": row.get('category'),
                "deviation_from_mean": float(row['amount'] - df['amount'].mean())
            })
        
        # Sort by deviation
        outliers.sort(key=lambda x: abs(x['deviation_from_mean']), reverse=True)
        
        return outliers[:20]  # Return top 20 outliers
    
    async def generate_forecasts(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Generate spending forecasts"""
        if df.empty or len(df) < 30:
            return []
        
        forecasts = []
        
        # Overall forecast
        overall_forecast = await self._forecast_time_series(df, 'Total')
        if overall_forecast:
            forecasts.append(overall_forecast)
        
        # Category forecasts
        if 'category' in df.columns:
            top_categories = df.groupby('category')['amount'].sum().nlargest(5).index
            
            for category in top_categories:
                cat_df = df[df['category'] == category]
                if len(cat_df) >= 20:
                    forecast = await self._forecast_time_series(cat_df, category)
                    if forecast:
                        forecasts.append(forecast)
        
        return forecasts
    
    async def generate_detailed_forecasts(self, df: pd.DataFrame, 
                                        forecast_months: int,
                                        categories: List[str] = None) -> List[Dict[str, Any]]:
        """Generate detailed forecasts with confidence intervals"""
        if df.empty:
            return []
        
        forecasts = []
        
        # Prepare data
        df['date'] = pd.to_datetime(df['transaction_date'])
        
        # Overall forecast if no specific categories
        if not categories:
            forecast = await self._create_detailed_forecast(
                df, 
                forecast_months, 
                'Total Spend'
            )
            if forecast:
                forecasts.append(forecast)
        
        # Category-specific forecasts
        if categories and 'category' in df.columns:
            for category in categories:
                cat_df = df[df['category'] == category]
                if len(cat_df) >= 10:
                    forecast = await self._create_detailed_forecast(
                        cat_df, 
                        forecast_months, 
                        category
                    )
                    if forecast:
                        forecasts.append(forecast)
        
        return forecasts
    
    def _calculate_linear_trend(self, df: pd.DataFrame) -> Dict[str, float]:
        """Calculate linear trend metrics"""
        if len(df) < 2:
            return {"slope": 0, "r_squared": 0}
        
        # Create time index
        df = df.sort_values('date')
        x = np.arange(len(df))
        y = df['amount'].values
        
        # Calculate linear regression
        slope, intercept, r_value, p_value, std_err = stats.linregress(x, y)
        
        # Calculate percentage change
        first_value = df['amount'].iloc[0]
        last_value = df['amount'].iloc[-1]
        pct_change = safe_divide(last_value - first_value, first_value) * 100
        
        return {
            "slope": float(slope),
            "intercept": float(intercept),
            "r_squared": float(r_value ** 2),
            "p_value": float(p_value),
            "percentage_change": float(pct_change),
            "trend_direction": "increasing" if slope > 0 else "decreasing",
            "trend_strength": "strong" if abs(r_value) > 0.7 else "moderate" if abs(r_value) > 0.4 else "weak"
        }
    
    def _calculate_volatility(self, df: pd.DataFrame) -> Dict[str, float]:
        """Calculate spending volatility metrics"""
        if len(df) < 2:
            return {"volatility": 0, "cv": 0}
        
        # Daily aggregation
        daily = df.groupby(pd.to_datetime(df['transaction_date']).dt.date)['amount'].sum()
        
        # Calculate metrics
        mean_spend = daily.mean()
        std_spend = daily.std()
        cv = safe_divide(std_spend, mean_spend)  # Coefficient of variation
        
        # Calculate rolling volatility
        if len(daily) >= 7:
            rolling_std = daily.rolling(window=7).std()
            avg_volatility = rolling_std.mean()
        else:
            avg_volatility = std_spend
        
        return {
            "daily_std": float(std_spend),
            "coefficient_of_variation": float(cv),
            "rolling_volatility": float(avg_volatility),
            "volatility_level": "high" if cv > 0.5 else "moderate" if cv > 0.25 else "low"
        }
    
    def _identify_peak_periods(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Identify peak spending periods"""
        if df.empty:
            return []
        
        # Monthly aggregation
        df['month'] = pd.to_datetime(df['transaction_date']).dt.to_period('M')
        monthly = df.groupby('month')['amount'].sum()
        
        if len(monthly) < 3:
            return []
        
        # Calculate percentiles
        p75 = monthly.quantile(0.75)
        
        # Find peak months
        peaks = []
        for month, amount in monthly.items():
            if amount >= p75:
                peaks.append({
                    "period": str(month),
                    "amount": float(amount),
                    "deviation_from_mean": float(amount - monthly.mean()),
                    "percentile": float(stats.percentileofscore(monthly, amount))
                })
        
        # Sort by amount
        peaks.sort(key=lambda x: x['amount'], reverse=True)
        
        return peaks[:6]  # Top 6 peak periods
    
    def _identify_seasonal_peaks(self, seasonal_component: pd.Series) -> List[Dict[str, str]]:
        """Identify peaks in seasonal component"""
        peaks = []
        
        # Find local maxima
        for i in range(1, len(seasonal_component) - 1):
            if (seasonal_component.iloc[i] > seasonal_component.iloc[i-1] and 
                seasonal_component.iloc[i] > seasonal_component.iloc[i+1]):
                peaks.append({
                    "date": seasonal_component.index[i].strftime("%Y-%m-%d"),
                    "strength": float(seasonal_component.iloc[i])
                })
        
        # Sort by strength
        peaks.sort(key=lambda x: abs(x['strength']), reverse=True)
        
        return peaks[:5]
    
    def _generate_trend_summary(self, trend: Dict[str, float], 
                               volatility: Dict[str, float]) -> str:
        """Generate human-readable trend summary"""
        direction = trend.get('trend_direction', 'stable')
        strength = trend.get('trend_strength', 'weak')
        vol_level = volatility.get('volatility_level', 'moderate')
        
        summary = f"Spending is {direction} with {strength} trend confidence. "
        summary += f"Volatility is {vol_level}. "
        
        if trend.get('percentage_change', 0) > 10:
            summary += f"Significant growth of {trend['percentage_change']:.1f}% observed."
        elif trend.get('percentage_change', 0) < -10:
            summary += f"Significant decline of {abs(trend['percentage_change']):.1f}% observed."
        
        return summary
    
    def _generate_seasonality_recommendation(self, strength: float, 
                                            peaks: List[Dict]) -> str:
        """Generate recommendation based on seasonality"""
        if strength < 0.1:
            return "No significant seasonality detected. Standard procurement approach recommended."
        elif strength < 0.3:
            return "Moderate seasonality detected. Consider seasonal contracts for peak periods."
        else:
            return "Strong seasonality detected. Implement seasonal buying strategies and negotiate volume discounts for peak periods."
    
    async def _forecast_time_series(self, df: pd.DataFrame, 
                                   label: str) -> Optional[Dict[str, Any]]:
        """Forecast time series using exponential smoothing"""
        try:
            # Prepare data
            df = df.sort_values('date')
            daily = df.groupby(pd.to_datetime(df['transaction_date']).dt.date)['amount'].sum()
            
            if len(daily) < 10:
                return None
            
            # Create index with frequency
            daily.index = pd.to_datetime(daily.index)
            daily = daily.asfreq('D', fill_value=0)
            
            # Fit model
            model = ExponentialSmoothing(
                daily,
                seasonal_periods=7,
                trend='add',
                seasonal='add' if len(daily) >= 14 else None
            )
            fit = model.fit()
            
            # Generate forecast
            forecast_days = 30
            forecast = fit.forecast(forecast_days)
            
            # Calculate metrics
            total_forecast = float(forecast.sum())
            avg_daily = float(forecast.mean())
            
            # Trend from forecast
            x = np.arange(len(forecast))
            y = forecast.values
            slope, _, _, _, _ = stats.linregress(x, y)
            
            return {
                "category": label,
                "forecast_period_days": forecast_days,
                "predicted_value": total_forecast,
                "average_daily": avg_daily,
                "trend": "increasing" if slope > 0 else "decreasing",
                "growth_rate": float(slope / avg_daily) if avg_daily > 0 else 0,
                "model_type": "exponential_smoothing"
            }
            
        except Exception as e:
            self.logger.warning(f"Forecasting failed for {label}: {e}")
            return None
    
    async def _create_detailed_forecast(self, df: pd.DataFrame,
                                       forecast_months: int,
                                       category: str) -> Optional[Dict[str, Any]]:
        """Create detailed forecast with confidence intervals"""
        try:
            # Prepare monthly data
            df['month'] = pd.to_datetime(df['transaction_date']).dt.to_period('M')
            monthly = df.groupby('month')['amount'].sum()
            
            if len(monthly) < 6:
                return None
            
            # Convert to proper time series
            monthly.index = monthly.index.to_timestamp()
            
            # Fit model
            model = ExponentialSmoothing(
                monthly,
                seasonal_periods=12 if len(monthly) >= 24 else None,
                trend='add'
            )
            fit = model.fit()
            
            # Generate forecast
            forecast = fit.forecast(forecast_months)
            
            # Get prediction intervals (simplified)
            residuals = monthly - fit.fittedvalues
            std_error = residuals.std()
            
            # Calculate confidence intervals
            lower_bound = forecast - 1.96 * std_error
            upper_bound = forecast + 1.96 * std_error
            
            # Calculate total forecast
            total_forecast = float(forecast.sum())
            
            return {
                "category": category,
                "forecast_months": forecast_months,
                "predicted_value": total_forecast,
                "monthly_forecasts": [
                    {
                        "month": date.strftime("%Y-%m"),
                        "forecast": float(value),
                        "lower_bound": float(lower_bound.iloc[i]),
                        "upper_bound": float(upper_bound.iloc[i])
                    }
                    for i, (date, value) in enumerate(forecast.items())
                ],
                "std_dev": float(std_error),
                "trend": "increasing" if forecast.iloc[-1] > forecast.iloc[0] else "decreasing",
                "model_metrics": {
                    "aic": fit.aic,
                    "bic": fit.bic,
                    "mae": float(residuals.abs().mean())
                }
            }
            
        except Exception as e:
            self.logger.warning(f"Detailed forecasting failed for {category}: {e}")
            return None