"""Configuration Management Module"""

import os
from pathlib import Path
from typing import Any, Dict, Optional

from dotenv import load_dotenv
from pydantic import BaseSettings, Field, validator


# Load environment variables
env_file = Path(__file__).parent.parent / ".env"
load_dotenv(env_file)


class DatabaseConfig(BaseSettings):
    """Database configuration"""
    url: str = Field(env="DATABASE_URL")
    pool_size: int = Field(default=20, env="DB_POOL_SIZE")
    max_overflow: int = Field(default=40, env="DB_MAX_OVERFLOW")
    echo: bool = Field(default=False)
    
    @validator("echo", pre=True)
    def set_echo(cls, v, values):
        env = os.getenv("ENVIRONMENT", "production")
        return env == "development"
    
    class Config:
        env_prefix = "DB_"


class RedisConfig(BaseSettings):
    """Redis configuration"""
    url: str = Field(env="REDIS_URL")
    ttl: int = Field(default=3600, env="CACHE_TTL_SECONDS")
    
    class Config:
        env_prefix = "REDIS_"


class RabbitMQConfig(BaseSettings):
    """RabbitMQ configuration"""
    url: str = Field(env="RABBITMQ_URL")
    
    class Config:
        env_prefix = "RABBITMQ_"


class SAPConfig(BaseSettings):
    """SAP configuration"""
    ashost: str = Field(env="SAP_ASHOST")
    sysnr: str = Field(default="00", env="SAP_SYSNR")
    client: str = Field(env="SAP_CLIENT")
    user: str = Field(env="SAP_USER")
    password: str = Field(env="SAP_PASSWORD")
    lang: str = Field(default="EN", env="SAP_LANG")
    
    class Config:
        env_prefix = "SAP_"


class APIConfig(BaseSettings):
    """API configuration"""
    host: str = Field(default="0.0.0.0", env="API_HOST")
    port: int = Field(default=8000, env="API_PORT")
    workers: int = Field(default=4, env="API_WORKERS")
    secret_key: str = Field(env="API_SECRET_KEY")
    jwt_algorithm: str = Field(default="HS256", env="JWT_ALGORITHM")
    jwt_expiration_hours: int = Field(default=24, env="JWT_EXPIRATION_HOURS")
    cors_origins: str = Field(default="*", env="CORS_ORIGINS")
    
    @property
    def cors_origins_list(self) -> list:
        return self.cors_origins.split(",")
    
    class Config:
        env_prefix = "API_"


class AgentConfig(BaseSettings):
    """Agent configuration"""
    # Sourcing Agent
    sourcing_enabled: bool = Field(default=True, env="SOURCING_AGENT_ENABLED")
    sourcing_workers: int = Field(default=2, env="SOURCING_AGENT_WORKERS")
    sourcing_web_scraping: bool = Field(default=True, env="ENABLE_WEB_SCRAPING")
    sourcing_scraping_timeout: int = Field(default=30, env="SOURCING_WEB_SCRAPING_TIMEOUT")
    
    # PO Agent
    po_enabled: bool = Field(default=True, env="PO_AGENT_ENABLED")
    po_workers: int = Field(default=2, env="PO_AGENT_WORKERS")
    po_approval_timeout: int = Field(default=48, env="PO_APPROVAL_TIMEOUT_HOURS")
    
    # Vendor Agent
    vendor_enabled: bool = Field(default=True, env="VENDOR_AGENT_ENABLED")
    vendor_workers: int = Field(default=1, env="VENDOR_AGENT_WORKERS")
    vendor_review_cycle: int = Field(default=90, env="VENDOR_REVIEW_CYCLE_DAYS")
    
    # Invoice Agent
    invoice_enabled: bool = Field(default=True, env="INVOICE_AGENT_ENABLED")
    invoice_workers: int = Field(default=2, env="INVOICE_AGENT_WORKERS")
    invoice_tolerance_percent: float = Field(default=5.0, env="INVOICE_TOLERANCE_PERCENT")
    
    class Config:
        env_prefix = "AGENT_"


class AIConfig(BaseSettings):
    """AI/ML configuration"""
    openai_api_key: Optional[str] = Field(None, env="OPENAI_API_KEY")
    anthropic_api_key: Optional[str] = Field(None, env="ANTHROPIC_API_KEY")
    ai_model: str = Field(default="gpt-4", env="AI_MODEL")
    enable_ai_matching: bool = Field(default=True, env="ENABLE_AI_MATCHING")
    enable_predictive_analytics: bool = Field(default=True, env="ENABLE_PREDICTIVE_ANALYTICS")
    
    class Config:
        env_prefix = "AI_"


class NotificationConfig(BaseSettings):
    """Notification configuration"""
    smtp_host: str = Field(env="SMTP_HOST")
    smtp_port: int = Field(default=587, env="SMTP_PORT")
    smtp_user: str = Field(env="SMTP_USER")
    smtp_password: str = Field(env="SMTP_PASSWORD")
    from_email: str = Field(env="FROM_EMAIL")
    
    class Config:
        env_prefix = "SMTP_"


class SecurityConfig(BaseSettings):
    """Security configuration"""
    allowed_hosts: str = Field(default="localhost,127.0.0.1", env="ALLOWED_HOSTS")
    secure_cookies: bool = Field(default=False, env="SECURE_COOKIES")
    csrf_protection: bool = Field(default=True, env="CSRF_PROTECTION")
    rate_limit_enabled: bool = Field(default=True, env="RATE_LIMIT_ENABLED")
    rate_limit_requests: int = Field(default=60, env="RATE_LIMIT_REQUESTS_PER_MINUTE")
    rate_limit_burst: int = Field(default=100, env="RATE_LIMIT_BURST_SIZE")
    
    @property
    def allowed_hosts_list(self) -> list:
        return self.allowed_hosts.split(",")
    
    class Config:
        env_prefix = "SECURITY_"


class FeatureFlags(BaseSettings):
    """Feature flags"""
    enable_ai_matching: bool = Field(default=True, env="ENABLE_AI_MATCHING")
    enable_auto_approval: bool = Field(default=True, env="ENABLE_AUTO_APPROVAL")
    enable_predictive_analytics: bool = Field(default=True, env="ENABLE_PREDICTIVE_ANALYTICS")
    enable_blockchain_contracts: bool = Field(default=False, env="ENABLE_BLOCKCHAIN_CONTRACTS")
    
    class Config:
        env_prefix = "FEATURE_"


class Config:
    """Main configuration class"""
    
    def __init__(self):
        self.environment = os.getenv("ENVIRONMENT", "production")
        self.database = DatabaseConfig()
        self.redis = RedisConfig()
        self.rabbitmq = RabbitMQConfig()
        self.sap = SAPConfig()
        self.api = APIConfig()
        self.agents = AgentConfig()
        self.ai = AIConfig()
        self.notifications = NotificationConfig()
        self.security = SecurityConfig()
        self.features = FeatureFlags()
        
        # Paths
        self.base_dir = Path(__file__).parent.parent
        self.upload_dir = Path(os.getenv("UPLOAD_DIR", "/var/lib/procurement/uploads"))
        self.backup_dir = Path(os.getenv("BACKUP_PATH", "/var/backups/procurement"))
        self.log_file = Path(os.getenv("LOG_FILE", "/var/log/procurement/app.log"))
        
        # Ensure directories exist
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        self.log_file.parent.mkdir(parents=True, exist_ok=True)
        
        # Performance
        self.max_concurrent_requests = int(os.getenv("MAX_CONCURRENT_REQUESTS", 100))
        self.request_timeout = int(os.getenv("REQUEST_TIMEOUT_SECONDS", 60))
        
        # File settings
        self.max_upload_size_mb = int(os.getenv("MAX_UPLOAD_SIZE_MB", 50))
        self.allowed_file_types = os.getenv(
            "ALLOWED_FILE_TYPES",
            "pdf,doc,docx,xls,xlsx,png,jpg"
        ).split(",")
        
        # Webhook settings
        self.webhook_retry_count = int(os.getenv("WEBHOOK_RETRY_COUNT", 3))
        self.webhook_timeout = int(os.getenv("WEBHOOK_TIMEOUT_SECONDS", 30))
        self.n8n_webhook_url = os.getenv("N8N_WEBHOOK_URL", "http://localhost:5678/webhook")
        
        # External APIs
        self.external_apis = {
            "alibaba": os.getenv("ALIBABA_API_URL", "https://api.alibaba.com"),
            "thomasnet": os.getenv("THOMASNET_API_URL", "https://api.thomasnet.com"),
            "credit_check": os.getenv("CREDIT_CHECK_API_URL", "https://api.creditcheck.com"),
            "compliance": os.getenv("COMPLIANCE_DB_URL", "https://api.compliance.com")
        }
        
        # Monitoring
        self.prometheus_port = int(os.getenv("PROMETHEUS_PORT", 9090))
        self.grafana_url = f"http://localhost:{os.getenv('GRAFANA_PORT', 3000)}"
        
        # Logging
        self.log_level = os.getenv("LOG_LEVEL", "INFO")
        self.log_format = os.getenv("LOG_FORMAT", "json")
    
    @property
    def is_development(self) -> bool:
        """Check if running in development mode"""
        return self.environment == "development"
    
    @property
    def is_production(self) -> bool:
        """Check if running in production mode"""
        return self.environment == "production"
    
    @property
    def is_testing(self) -> bool:
        """Check if running in test mode"""
        return self.environment == "testing"
    
    def get_agent_config(self, agent_name: str) -> Dict[str, Any]:
        """Get configuration for specific agent"""
        agent_configs = {
            "sourcing": {
                "enabled": self.agents.sourcing_enabled,
                "workers": self.agents.sourcing_workers,
                "enable_web_scraping": self.agents.sourcing_web_scraping,
                "scraping_timeout": self.agents.sourcing_scraping_timeout,
                "min_match_score": 0.7,
                "max_risk_score": 0.3,
                "max_suppliers": 20,
                "auto_send_rfq": True,
                "marketplaces": ["alibaba", "thomasnet", "globalsources"],
                "high_risk_countries": ["Country1", "Country2"]  # Configure as needed
            },
            "purchase_order": {
                "enabled": self.agents.po_enabled,
                "workers": self.agents.po_workers,
                "approval_timeout_hours": self.agents.po_approval_timeout,
                "auto_approve_limit": 5000,
                "require_vendor_acknowledgment": True,
                "sap_integration_enabled": bool(self.sap.ashost)
            },
            "vendor_management": {
                "enabled": self.agents.vendor_enabled,
                "workers": self.agents.vendor_workers,
                "review_cycle_days": self.agents.vendor_review_cycle,
                "min_performance_score": 0.7,
                "auto_suspend_threshold": 0.5
            },
            "invoice_processing": {
                "enabled": self.agents.invoice_enabled,
                "workers": self.agents.invoice_workers,
                "tolerance_percent": self.agents.invoice_tolerance_percent,
                "auto_approve_matched": True,
                "ocr_enabled": True
            }
        }
        
        return agent_configs.get(agent_name, {})
    
    def get_database_url(self, async_mode: bool = True) -> str:
        """Get database URL"""
        url = self.database.url
        
        if async_mode and url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://")
        elif not async_mode and url.startswith("postgresql+asyncpg://"):
            url = url.replace("postgresql+asyncpg://", "postgresql://")
        
        return url
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert configuration to dictionary"""
        return {
            "environment": self.environment,
            "database": {
                "pool_size": self.database.pool_size,
                "max_overflow": self.database.max_overflow
            },
            "redis": {
                "ttl": self.redis.ttl
            },
            "api": {
                "host": self.api.host,
                "port": self.api.port,
                "workers": self.api.workers
            },
            "agents": {
                "sourcing": self.get_agent_config("sourcing"),
                "purchase_order": self.get_agent_config("purchase_order"),
                "vendor_management": self.get_agent_config("vendor_management"),
                "invoice_processing": self.get_agent_config("invoice_processing")
            },
            "features": {
                "ai_matching": self.features.enable_ai_matching,
                "auto_approval": self.features.enable_auto_approval,
                "predictive_analytics": self.features.enable_predictive_analytics,
                "blockchain_contracts": self.features.enable_blockchain_contracts
            },
            "security": {
                "rate_limit_enabled": self.security.rate_limit_enabled,
                "csrf_protection": self.security.csrf_protection
            }
        }


# Singleton instance
_config: Optional[Config] = None


def get_config() -> Config:
    """Get configuration singleton"""
    global _config
    if _config is None:
        _config = Config()
    return _config