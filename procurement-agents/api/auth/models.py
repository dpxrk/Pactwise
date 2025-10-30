"""Authentication and Authorization Models"""

from datetime import datetime
from enum import Enum
from typing import List, Optional, Set

from sqlalchemy import (
    Boolean, Column, DateTime, ForeignKey, Integer, 
    String, Table, Text, JSON, Index
)
from sqlalchemy.orm import relationship
from passlib.context import CryptContext

from integrations.databases.models import Base


# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# Association tables for many-to-many relationships
user_roles = Table(
    "user_roles",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE")),
    Column("role_id", Integer, ForeignKey("roles.id", ondelete="CASCADE")),
    Index("idx_user_roles", "user_id", "role_id")
)

role_permissions = Table(
    "role_permissions",
    Base.metadata,
    Column("role_id", Integer, ForeignKey("roles.id", ondelete="CASCADE")),
    Column("permission_id", Integer, ForeignKey("permissions.id", ondelete="CASCADE")),
    Index("idx_role_permissions", "role_id", "permission_id")
)


class UserStatus(str, Enum):
    """User account status"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    PENDING = "pending"


class User(Base):
    """User model with advanced security features"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    
    # Profile
    full_name = Column(String(255))
    department = Column(String(100))
    employee_id = Column(String(50), unique=True, index=True)
    manager_id = Column(Integer, ForeignKey("users.id"))
    
    # Status and security
    status = Column(String(20), default=UserStatus.PENDING)
    is_superuser = Column(Boolean, default=False)
    email_verified = Column(Boolean, default=False)
    two_factor_enabled = Column(Boolean, default=False)
    two_factor_secret = Column(String(255))
    
    # Authentication tracking
    last_login = Column(DateTime)
    last_password_change = Column(DateTime)
    password_expiry = Column(DateTime)
    failed_login_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime)
    
    # Session management
    active_sessions = Column(JSON, default=list)  # List of active session IDs
    refresh_tokens = Column(JSON, default=list)   # List of valid refresh tokens
    
    # API access
    api_key = Column(String(255), unique=True, index=True)
    api_key_created = Column(DateTime)
    api_rate_limit = Column(Integer, default=100)  # Requests per minute
    
    # Preferences
    preferences = Column(JSON, default=dict)
    notification_settings = Column(JSON, default=dict)
    
    # Audit
    created_at = Column(DateTime, server_default="CURRENT_TIMESTAMP")
    updated_at = Column(DateTime, onupdate="CURRENT_TIMESTAMP")
    created_by = Column(Integer, ForeignKey("users.id"))
    
    # Relationships
    roles = relationship("Role", secondary=user_roles, back_populates="users", lazy="selectin")
    manager = relationship("User", remote_side=[id], backref="subordinates")
    created_by_user = relationship("User", remote_side=[id], foreign_keys=[created_by])
    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("UserAuditLog", back_populates="user", cascade="all, delete-orphan")
    
    def set_password(self, password: str):
        """Set hashed password"""
        self.hashed_password = pwd_context.hash(password)
        self.last_password_change = datetime.utcnow()
    
    def verify_password(self, password: str) -> bool:
        """Verify password against hash"""
        return pwd_context.verify(password, self.hashed_password)
    
    def has_role(self, role_name: str) -> bool:
        """Check if user has specific role"""
        return any(role.name == role_name for role in self.roles)
    
    def has_permission(self, permission_name: str) -> bool:
        """Check if user has specific permission"""
        if self.is_superuser:
            return True
        
        for role in self.roles:
            if any(perm.name == permission_name for perm in role.permissions):
                return True
        
        return False
    
    def get_permissions(self) -> Set[str]:
        """Get all user permissions"""
        if self.is_superuser:
            # Superuser has all permissions
            return {"*"}
        
        permissions = set()
        for role in self.roles:
            for permission in role.permissions:
                permissions.add(permission.name)
        
        return permissions
    
    def is_locked(self) -> bool:
        """Check if account is locked"""
        if self.locked_until:
            return datetime.utcnow() < self.locked_until
        return False
    
    def to_dict(self) -> dict:
        """Convert to dictionary for JWT payload"""
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "full_name": self.full_name,
            "department": self.department,
            "roles": [role.name for role in self.roles],
            "permissions": list(self.get_permissions()),
            "is_superuser": self.is_superuser
        }


class Role(Base):
    """Role model for RBAC"""
    __tablename__ = "roles"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(50), unique=True, nullable=False, index=True)
    description = Column(Text)
    
    # Hierarchy
    parent_id = Column(Integer, ForeignKey("roles.id"))
    hierarchy_level = Column(Integer, default=0)
    
    # Status
    is_active = Column(Boolean, default=True)
    is_system = Column(Boolean, default=False)  # System roles can't be deleted
    
    # Metadata
    created_at = Column(DateTime, server_default="CURRENT_TIMESTAMP")
    updated_at = Column(DateTime, onupdate="CURRENT_TIMESTAMP")
    
    # Relationships
    users = relationship("User", secondary=user_roles, back_populates="roles")
    permissions = relationship("Permission", secondary=role_permissions, back_populates="roles", lazy="selectin")
    parent = relationship("Role", remote_side=[id], backref="children")
    
    def get_all_permissions(self) -> Set[str]:
        """Get all permissions including inherited from parent"""
        permissions = {perm.name for perm in self.permissions}
        
        if self.parent:
            permissions.update(self.parent.get_all_permissions())
        
        return permissions


class Permission(Base):
    """Permission model for fine-grained access control"""
    __tablename__ = "permissions"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    resource = Column(String(50), nullable=False, index=True)  # e.g., "purchase_order"
    action = Column(String(50), nullable=False)  # e.g., "create", "read", "update", "delete"
    description = Column(Text)
    
    # Scope
    scope = Column(String(50))  # e.g., "own", "department", "all"
    conditions = Column(JSON)  # Additional conditions for permission
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Metadata
    created_at = Column(DateTime, server_default="CURRENT_TIMESTAMP")
    
    # Relationships
    roles = relationship("Role", secondary=role_permissions, back_populates="permissions")
    
    # Indexes
    __table_args__ = (
        Index("idx_permission_resource_action", "resource", "action"),
    )


class UserSession(Base):
    """User session tracking"""
    __tablename__ = "user_sessions"
    
    id = Column(Integer, primary_key=True)
    session_id = Column(String(255), unique=True, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Session data
    ip_address = Column(String(45))
    user_agent = Column(String(500))
    device_info = Column(JSON)
    
    # Token management
    access_token_jti = Column(String(255), index=True)  # JWT ID for access token
    refresh_token_jti = Column(String(255), index=True)  # JWT ID for refresh token
    
    # Activity
    created_at = Column(DateTime, server_default="CURRENT_TIMESTAMP")
    last_activity = Column(DateTime)
    expires_at = Column(DateTime)
    
    # Security
    is_active = Column(Boolean, default=True)
    revoked_at = Column(DateTime)
    revoke_reason = Column(String(255))
    
    # Relationships
    user = relationship("User", back_populates="sessions")


class UserAuditLog(Base):
    """User activity audit log"""
    __tablename__ = "user_audit_logs"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Event details
    event_type = Column(String(50), nullable=False, index=True)  # login, logout, password_change, etc.
    event_status = Column(String(20))  # success, failure
    event_details = Column(JSON)
    
    # Context
    ip_address = Column(String(45))
    user_agent = Column(String(500))
    session_id = Column(String(255))
    
    # Timestamp
    created_at = Column(DateTime, server_default="CURRENT_TIMESTAMP", index=True)
    
    # Relationships
    user = relationship("User", back_populates="audit_logs")
    
    # Indexes
    __table_args__ = (
        Index("idx_audit_user_event", "user_id", "event_type"),
        Index("idx_audit_created", "created_at"),
    )


class APIKey(Base):
    """API Key management"""
    __tablename__ = "api_keys"
    
    id = Column(Integer, primary_key=True)
    key = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    
    # Permissions
    scopes = Column(JSON, default=list)  # List of allowed scopes
    allowed_ips = Column(JSON, default=list)  # IP whitelist
    
    # Rate limiting
    rate_limit = Column(Integer, default=100)  # Requests per minute
    
    # Expiry
    expires_at = Column(DateTime)
    last_used = Column(DateTime)
    
    # Status
    is_active = Column(Boolean, default=True)
    revoked_at = Column(DateTime)
    
    # Metadata
    created_at = Column(DateTime, server_default="CURRENT_TIMESTAMP")
    
    # Usage tracking
    usage_count = Column(Integer, default=0)
    last_error = Column(DateTime)
    error_count = Column(Integer, default=0)


# Create default roles and permissions
def create_default_roles_and_permissions():
    """Create default roles and permissions for the system"""
    
    default_permissions = [
        # Purchase Orders
        {"name": "po.create", "resource": "purchase_order", "action": "create"},
        {"name": "po.read", "resource": "purchase_order", "action": "read"},
        {"name": "po.update", "resource": "purchase_order", "action": "update"},
        {"name": "po.delete", "resource": "purchase_order", "action": "delete"},
        {"name": "po.approve", "resource": "purchase_order", "action": "approve"},
        
        # Vendors
        {"name": "vendor.create", "resource": "vendor", "action": "create"},
        {"name": "vendor.read", "resource": "vendor", "action": "read"},
        {"name": "vendor.update", "resource": "vendor", "action": "update"},
        {"name": "vendor.delete", "resource": "vendor", "action": "delete"},
        
        # Contracts
        {"name": "contract.create", "resource": "contract", "action": "create"},
        {"name": "contract.read", "resource": "contract", "action": "read"},
        {"name": "contract.update", "resource": "contract", "action": "update"},
        {"name": "contract.approve", "resource": "contract", "action": "approve"},
        
        # Analytics
        {"name": "analytics.view", "resource": "analytics", "action": "view"},
        {"name": "analytics.export", "resource": "analytics", "action": "export"},
        
        # Admin
        {"name": "admin.users", "resource": "admin", "action": "manage_users"},
        {"name": "admin.roles", "resource": "admin", "action": "manage_roles"},
        {"name": "admin.system", "resource": "admin", "action": "system_config"},
    ]
    
    default_roles = [
        {
            "name": "admin",
            "description": "System Administrator",
            "permissions": ["admin.users", "admin.roles", "admin.system"],
            "is_system": True
        },
        {
            "name": "operations_manager",
            "description": "Operations Manager - Full operational access",
            "permissions": [
                "po.create", "po.read", "po.update", "po.approve",
                "vendor.create", "vendor.read", "vendor.update",
                "contract.read", "contract.update",
                "analytics.view", "analytics.export"
            ]
        },
        {
            "name": "project_manager",
            "description": "Project Manager - Project and resource management",
            "permissions": [
                "po.create", "po.read", "po.update",
                "vendor.read",
                "contract.read",
                "analytics.view"
            ]
        },
        {
            "name": "finance_manager",
            "description": "Finance Manager - Financial oversight and approval",
            "permissions": [
                "po.read", "po.approve",
                "contract.read", "contract.approve",
                "analytics.view", "analytics.export"
            ]
        },
        {
            "name": "legal_reviewer",
            "description": "Legal Team - Contract and compliance review",
            "permissions": [
                "contract.create", "contract.read", "contract.update", "contract.approve",
                "vendor.read",
                "po.read"
            ]
        },
        {
            "name": "team_member",
            "description": "General Team Member - Basic access",
            "permissions": [
                "po.read",
                "vendor.read",
                "contract.read",
                "analytics.view"
            ]
        }
    ]
    
    return default_permissions, default_roles