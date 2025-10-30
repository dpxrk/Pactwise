"""Advanced Authorization Service with RBAC and ABAC"""

from enum import Enum
from functools import wraps
from typing import Any, Dict, List, Optional, Set

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.auth.models import User, Role, Permission


class ResourceAction(str, Enum):
    """Standard resource actions"""
    CREATE = "create"
    READ = "read"
    UPDATE = "update"
    DELETE = "delete"
    APPROVE = "approve"
    EXECUTE = "execute"
    EXPORT = "export"


class AuthorizationService:
    """Advanced authorization service with policy-based access control"""
    
    def __init__(self):
        # Policy engine for complex authorization rules
        self.policies = self._initialize_policies()
        
        # Resource hierarchy for inherited permissions
        self.resource_hierarchy = {
            "procurement": ["purchase_order", "requisition", "vendor", "contract"],
            "finance": ["budget", "payment", "invoice"],
            "analytics": ["reports", "dashboards", "exports"],
            "admin": ["users", "roles", "system", "audit"]
        }
        
        # Action hierarchy
        self.action_hierarchy = {
            "manage": ["create", "read", "update", "delete", "approve"],
            "write": ["create", "update"],
            "approve": ["read", "approve"],
            "view": ["read"]
        }
    
    def _initialize_policies(self) -> Dict[str, Any]:
        """Initialize authorization policies"""
        return {
            "purchase_order": {
                "create": {
                    "roles": ["buyer", "procurement_manager"],
                    "conditions": [
                        {"type": "amount_limit", "field": "total_amount", "operator": "<=", "value": 50000},
                        {"type": "department", "field": "department", "operator": "in", "value": "user.department"}
                    ]
                },
                "approve": {
                    "roles": ["approver", "procurement_manager"],
                    "conditions": [
                        {"type": "amount_threshold", "tiers": [
                            {"max": 10000, "roles": ["approver"]},
                            {"max": 50000, "roles": ["procurement_manager"]},
                            {"max": None, "roles": ["cfo", "ceo"]}
                        ]},
                        {"type": "not_own", "field": "requester_id", "operator": "!=", "value": "user.id"}
                    ]
                },
                "delete": {
                    "roles": ["admin"],
                    "conditions": [
                        {"type": "status", "field": "status", "operator": "in", "value": ["draft", "cancelled"]}
                    ]
                }
            },
            "vendor": {
                "create": {
                    "roles": ["vendor_manager", "procurement_manager"],
                    "conditions": []
                },
                "update": {
                    "roles": ["vendor_manager", "procurement_manager"],
                    "conditions": [
                        {"type": "vendor_status", "field": "status", "operator": "!=", "value": "blacklisted"}
                    ]
                },
                "delete": {
                    "roles": ["admin"],
                    "conditions": [
                        {"type": "no_active_contracts", "query": "check_vendor_contracts"}
                    ]
                }
            },
            "contract": {
                "create": {
                    "roles": ["contract_manager", "procurement_manager"],
                    "conditions": []
                },
                "approve": {
                    "roles": ["legal", "procurement_manager", "cfo"],
                    "conditions": [
                        {"type": "value_based", "tiers": [
                            {"max": 100000, "roles": ["procurement_manager"]},
                            {"max": 500000, "roles": ["cfo"]},
                            {"max": None, "roles": ["ceo"]}
                        ]}
                    ]
                }
            },
            "analytics": {
                "view": {
                    "roles": ["viewer", "analyst", "manager", "executive"],
                    "conditions": [
                        {"type": "data_scope", "scopes": {
                            "viewer": "department",
                            "analyst": "division",
                            "manager": "company",
                            "executive": "all"
                        }}
                    ]
                },
                "export": {
                    "roles": ["analyst", "manager", "executive"],
                    "conditions": [
                        {"type": "rate_limit", "max_per_day": 10}
                    ]
                }
            }
        }
    
    async def check_permission(
        self,
        user: User,
        resource: str,
        action: str,
        resource_data: Optional[Dict] = None,
        db: Optional[AsyncSession] = None
    ) -> bool:
        """Check if user has permission for resource and action"""
        
        # Superuser bypass
        if user.is_superuser:
            return True
        
        # Check basic permission
        permission_name = f"{resource}.{action}"
        if not user.has_permission(permission_name):
            # Check inherited permissions
            if not self._check_inherited_permission(user, resource, action):
                return False
        
        # Check policy-based conditions
        if resource in self.policies and action in self.policies[resource]:
            policy = self.policies[resource][action]
            
            # Check role requirement
            if not self._check_role_requirement(user, policy.get("roles", [])):
                return False
            
            # Check conditions
            if resource_data and policy.get("conditions"):
                for condition in policy["conditions"]:
                    if not await self._evaluate_condition(
                        user, condition, resource_data, db
                    ):
                        return False
        
        return True
    
    def _check_inherited_permission(
        self,
        user: User,
        resource: str,
        action: str
    ) -> bool:
        """Check inherited permissions through hierarchy"""
        
        # Check resource hierarchy
        for parent, children in self.resource_hierarchy.items():
            if resource in children:
                parent_permission = f"{parent}.{action}"
                if user.has_permission(parent_permission):
                    return True
        
        # Check action hierarchy
        for parent_action, child_actions in self.action_hierarchy.items():
            if action in child_actions:
                permission_name = f"{resource}.{parent_action}"
                if user.has_permission(permission_name):
                    return True
        
        return False
    
    def _check_role_requirement(
        self,
        user: User,
        required_roles: List[str]
    ) -> bool:
        """Check if user has any of the required roles"""
        if not required_roles:
            return True
        
        user_roles = {role.name for role in user.roles}
        return bool(user_roles.intersection(required_roles))
    
    async def _evaluate_condition(
        self,
        user: User,
        condition: Dict,
        resource_data: Dict,
        db: Optional[AsyncSession]
    ) -> bool:
        """Evaluate authorization condition"""
        
        condition_type = condition.get("type")
        
        if condition_type == "amount_limit":
            return self._check_amount_limit(condition, resource_data)
        
        elif condition_type == "department":
            return self._check_department(user, condition, resource_data)
        
        elif condition_type == "not_own":
            return self._check_not_own(user, condition, resource_data)
        
        elif condition_type == "status":
            return self._check_status(condition, resource_data)
        
        elif condition_type == "amount_threshold":
            return self._check_amount_threshold(user, condition, resource_data)
        
        elif condition_type == "value_based":
            return self._check_value_based(user, condition, resource_data)
        
        elif condition_type == "data_scope":
            return self._check_data_scope(user, condition, resource_data)
        
        elif condition_type == "no_active_contracts" and db:
            return await self._check_no_active_contracts(resource_data, db)
        
        elif condition_type == "rate_limit":
            return self._check_rate_limit(user, condition)
        
        return True
    
    def _check_amount_limit(self, condition: Dict, resource_data: Dict) -> bool:
        """Check amount limit condition"""
        field = condition["field"]
        operator = condition["operator"]
        limit = condition["value"]
        
        if field not in resource_data:
            return True
        
        amount = resource_data[field]
        
        if operator == "<=":
            return amount <= limit
        elif operator == "<":
            return amount < limit
        elif operator == ">=":
            return amount >= limit
        elif operator == ">":
            return amount > limit
        
        return False
    
    def _check_department(
        self,
        user: User,
        condition: Dict,
        resource_data: Dict
    ) -> bool:
        """Check department condition"""
        field = condition["field"]
        
        if field not in resource_data:
            return True
        
        resource_dept = resource_data[field]
        
        if condition["value"] == "user.department":
            return resource_dept == user.department
        
        return False
    
    def _check_not_own(
        self,
        user: User,
        condition: Dict,
        resource_data: Dict
    ) -> bool:
        """Check not own resource condition"""
        field = condition["field"]
        
        if field not in resource_data:
            return True
        
        resource_user_id = resource_data[field]
        
        return str(resource_user_id) != str(user.id)
    
    def _check_status(self, condition: Dict, resource_data: Dict) -> bool:
        """Check status condition"""
        field = condition["field"]
        operator = condition["operator"]
        allowed_values = condition["value"]
        
        if field not in resource_data:
            return True
        
        status = resource_data[field]
        
        if operator == "in":
            return status in allowed_values
        elif operator == "not_in":
            return status not in allowed_values
        elif operator == "==":
            return status == allowed_values
        elif operator == "!=":
            return status != allowed_values
        
        return False
    
    def _check_amount_threshold(
        self,
        user: User,
        condition: Dict,
        resource_data: Dict
    ) -> bool:
        """Check amount-based role threshold"""
        tiers = condition.get("tiers", [])
        amount = resource_data.get("total_amount", 0)
        user_roles = {role.name for role in user.roles}
        
        for tier in tiers:
            max_amount = tier.get("max")
            allowed_roles = tier.get("roles", [])
            
            if max_amount is None or amount <= max_amount:
                return bool(user_roles.intersection(allowed_roles))
        
        return False
    
    def _check_value_based(
        self,
        user: User,
        condition: Dict,
        resource_data: Dict
    ) -> bool:
        """Check value-based authorization"""
        return self._check_amount_threshold(user, condition, resource_data)
    
    def _check_data_scope(
        self,
        user: User,
        condition: Dict,
        resource_data: Dict
    ) -> bool:
        """Check data scope authorization"""
        scopes = condition.get("scopes", {})
        
        for role in user.roles:
            if role.name in scopes:
                scope = scopes[role.name]
                
                if scope == "all":
                    return True
                elif scope == "company":
                    return True  # Would check company match
                elif scope == "division":
                    # Check division match
                    return resource_data.get("division") == user.department
                elif scope == "department":
                    return resource_data.get("department") == user.department
        
        return False
    
    async def _check_no_active_contracts(
        self,
        resource_data: Dict,
        db: AsyncSession
    ) -> bool:
        """Check if vendor has no active contracts"""
        # This would query the database to check for active contracts
        # Simplified for demo
        return True
    
    def _check_rate_limit(self, user: User, condition: Dict) -> bool:
        """Check rate limit condition"""
        # This would check against a rate limiter
        # Simplified for demo
        return True
    
    async def get_user_permissions(
        self,
        db: AsyncSession,
        user: User
    ) -> Dict[str, List[str]]:
        """Get all permissions for user organized by resource"""
        permissions_by_resource = {}
        
        for permission_name in user.get_permissions():
            if "." in permission_name:
                resource, action = permission_name.split(".", 1)
                if resource not in permissions_by_resource:
                    permissions_by_resource[resource] = []
                permissions_by_resource[resource].append(action)
        
        return permissions_by_resource
    
    def filter_by_permissions(
        self,
        user: User,
        items: List[Dict],
        resource: str,
        action: str = "read"
    ) -> List[Dict]:
        """Filter list of items by user permissions"""
        filtered = []
        
        for item in items:
            if self.check_permission(user, resource, action, item):
                filtered.append(item)
        
        return filtered
    
    def get_permission_scope(
        self,
        user: User,
        resource: str
    ) -> str:
        """Get data scope for user on resource"""
        if user.is_superuser:
            return "all"
        
        # Check role-based scopes
        role_scopes = {
            "executive": "all",
            "manager": "company",
            "supervisor": "division",
            "employee": "department"
        }
        
        for role in user.roles:
            if role.name in role_scopes:
                return role_scopes[role.name]
        
        return "own"  # Default to own resources only


# Decorator for FastAPI route protection
def require_permission(resource: str, action: str):
    """Decorator to require permission for endpoint"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Get current user from request context
            # This would be injected by FastAPI dependency
            request = kwargs.get("request")
            user = getattr(request.state, "user", None)
            
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Not authenticated"
                )
            
            auth_service = AuthorizationService()
            
            # Check permission
            has_permission = await auth_service.check_permission(
                user, resource, action
            )
            
            if not has_permission:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"No permission for {resource}.{action}"
                )
            
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator


def require_roles(*role_names: str):
    """Decorator to require specific roles"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Get current user from request context
            request = kwargs.get("request")
            user = getattr(request.state, "user", None)
            
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Not authenticated"
                )
            
            user_roles = {role.name for role in user.roles}
            required_roles = set(role_names)
            
            if not user_roles.intersection(required_roles):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Requires one of roles: {', '.join(role_names)}"
                )
            
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator


def check_permission(resource: str, action: str):
    """Function to check permission in route"""
    async def permission_checker(user: User) -> bool:
        auth_service = AuthorizationService()
        return await auth_service.check_permission(user, resource, action)
    
    return permission_checker