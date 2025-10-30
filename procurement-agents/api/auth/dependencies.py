"""FastAPI Authentication Dependencies"""

from typing import Optional, List
from datetime import datetime

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from api.auth.models import User, UserStatus
from api.auth.authentication import AuthenticationService
from api.auth.authorization import AuthorizationService
from integrations.databases.database import get_db
from shared.config import get_config


# Security scheme
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Get current authenticated user from JWT token"""
    
    token = credentials.credentials
    config = get_config()
    
    # Decode token
    try:
        payload = jwt.decode(
            token,
            config.api.secret_key,
            algorithms=[config.api.jwt_algorithm]
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check token type
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Get user from database
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    result = await db.execute(
        select(User).where(User.id == int(user_id))
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check JTI for token revocation
    auth_service = AuthenticationService()
    payload_valid, error = await auth_service.verify_token(db, token)
    if error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=error,
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Ensure user is active"""
    
    if current_user.status != UserStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"User account is {current_user.status}"
        )
    
    if current_user.is_locked():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is locked"
        )
    
    return current_user


async def get_current_superuser(
    current_user: User = Depends(get_current_active_user)
) -> User:
    """Ensure user is a superuser"""
    
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough privileges"
        )
    
    return current_user


def require_permissions(permissions: List[str]):
    """Dependency to require specific permissions"""
    
    async def permission_checker(
        current_user: User = Depends(get_current_active_user),
        db: AsyncSession = Depends(get_db)
    ):
        auth_service = AuthorizationService()
        
        for permission in permissions:
            if "." in permission:
                resource, action = permission.rsplit(".", 1)
                has_permission = await auth_service.check_permission(
                    current_user, resource, action, db=db
                )
                
                if not has_permission:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"Missing required permission: {permission}"
                    )
        
        return current_user
    
    return permission_checker


def require_any_permission(permissions: List[str]):
    """Dependency to require at least one of the specified permissions"""
    
    async def permission_checker(
        current_user: User = Depends(get_current_active_user),
        db: AsyncSession = Depends(get_db)
    ):
        auth_service = AuthorizationService()
        
        has_any = False
        for permission in permissions:
            if "." in permission:
                resource, action = permission.rsplit(".", 1)
                has_permission = await auth_service.check_permission(
                    current_user, resource, action, db=db
                )
                
                if has_permission:
                    has_any = True
                    break
        
        if not has_any:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires at least one permission: {', '.join(permissions)}"
            )
        
        return current_user
    
    return permission_checker


def require_resource_permission(resource: str, action: str):
    """Dependency for resource-based permission checking"""
    
    async def permission_checker(
        current_user: User = Depends(get_current_active_user),
        db: AsyncSession = Depends(get_db)
    ):
        auth_service = AuthorizationService()
        
        has_permission = await auth_service.check_permission(
            current_user, resource, action, db=db
        )
        
        if not has_permission:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"No permission for {resource}.{action}"
            )
        
        return current_user
    
    return permission_checker


class PermissionChecker:
    """Class-based dependency for checking permissions with resource data"""
    
    def __init__(self, resource: str, action: str):
        self.resource = resource
        self.action = action
    
    async def __call__(
        self,
        current_user: User = Depends(get_current_active_user),
        db: AsyncSession = Depends(get_db)
    ):
        """Check permission when called as dependency"""
        
        auth_service = AuthorizationService()
        
        # Basic permission check without resource data
        has_permission = await auth_service.check_permission(
            current_user, self.resource, self.action, db=db
        )
        
        if not has_permission:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"No permission for {self.resource}.{self.action}"
            )
        
        # Return both user and auth service for use in endpoint
        return {
            "user": current_user,
            "auth_service": auth_service,
            "resource": self.resource,
            "action": self.action
        }


async def get_optional_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    """Get current user if authenticated, otherwise None"""
    
    if not credentials:
        return None
    
    try:
        return await get_current_user(credentials, db)
    except HTTPException:
        return None


def require_roles(role_names: List[str]):
    """Dependency to require specific roles"""
    
    async def role_checker(
        current_user: User = Depends(get_current_active_user)
    ):
        user_roles = {role.name for role in current_user.roles}
        required_roles = set(role_names)
        
        if not user_roles.intersection(required_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires one of roles: {', '.join(role_names)}"
            )
        
        return current_user
    
    return role_checker


def require_department(department: str):
    """Dependency to require user from specific department"""
    
    async def department_checker(
        current_user: User = Depends(get_current_active_user)
    ):
        if current_user.department != department and not current_user.is_superuser:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access restricted to {department} department"
            )
        
        return current_user
    
    return department_checker


class RateLimiter:
    """Rate limiting dependency"""
    
    def __init__(self, max_requests: int = 100, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests = {}  # Simple in-memory storage
    
    async def __call__(
        self,
        current_user: User = Depends(get_current_active_user)
    ):
        """Check rate limit for user"""
        
        now = datetime.utcnow()
        user_key = f"user_{current_user.id}"
        
        # Clean old entries
        self.requests = {
            k: v for k, v in self.requests.items()
            if (now - v["first_request"]).total_seconds() < self.window_seconds
        }
        
        # Check user's requests
        if user_key in self.requests:
            user_data = self.requests[user_key]
            if user_data["count"] >= self.max_requests:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Rate limit exceeded"
                )
            user_data["count"] += 1
        else:
            self.requests[user_key] = {
                "count": 1,
                "first_request": now
            }
        
        return current_user


# Pre-configured permission checkers for common resources
PurchaseOrderPermission = {
    "create": PermissionChecker("purchase_order", "create"),
    "read": PermissionChecker("purchase_order", "read"),
    "update": PermissionChecker("purchase_order", "update"),
    "delete": PermissionChecker("purchase_order", "delete"),
    "approve": PermissionChecker("purchase_order", "approve")
}

VendorPermission = {
    "create": PermissionChecker("vendor", "create"),
    "read": PermissionChecker("vendor", "read"),
    "update": PermissionChecker("vendor", "update"),
    "delete": PermissionChecker("vendor", "delete")
}

ContractPermission = {
    "create": PermissionChecker("contract", "create"),
    "read": PermissionChecker("contract", "read"),
    "update": PermissionChecker("contract", "update"),
    "approve": PermissionChecker("contract", "approve")
}

AnalyticsPermission = {
    "view": PermissionChecker("analytics", "view"),
    "export": PermissionChecker("analytics", "export")
}


# API Key authentication
async def get_api_key_user(
    api_key: str = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Authenticate using API key"""
    
    from api.auth.models import APIKey
    
    result = await db.execute(
        select(APIKey).where(
            APIKey.key == api_key,
            APIKey.is_active == True
        )
    )
    api_key_obj = result.scalar_one_or_none()
    
    if not api_key_obj:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key"
        )
    
    # Check expiry
    if api_key_obj.expires_at and datetime.utcnow() > api_key_obj.expires_at:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key has expired"
        )
    
    # Update usage
    api_key_obj.last_used = datetime.utcnow()
    api_key_obj.usage_count += 1
    
    # Get associated user
    result = await db.execute(
        select(User).where(User.id == api_key_obj.user_id)
    )
    user = result.scalar_one_or_none()
    
    if not user or user.status != UserStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Associated user is not active"
        )
    
    await db.commit()
    
    return user


# Pagination dependency
class PaginationParams:
    """Common pagination parameters"""
    
    def __init__(
        self,
        skip: int = 0,
        limit: int = 100,
        sort_by: Optional[str] = None,
        sort_order: str = "asc"
    ):
        self.skip = skip
        self.limit = min(limit, 1000)  # Cap at 1000
        self.sort_by = sort_by
        self.sort_order = sort_order


# Filter dependency for data scoping
async def get_data_scope(
    resource: str,
    current_user: User = Depends(get_current_active_user)
) -> str:
    """Get user's data scope for a resource"""
    
    auth_service = AuthorizationService()
    return auth_service.get_permission_scope(current_user, resource)