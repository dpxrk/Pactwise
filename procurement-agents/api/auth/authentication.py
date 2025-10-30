"""JWT Authentication Service with Advanced Security Features"""

import secrets
from datetime import datetime, timedelta
from typing import Any, Dict, Optional, Tuple

import pyotp
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from api.auth.models import User, UserSession, UserAuditLog, UserStatus
from shared.config import get_config


class AuthenticationService:
    """Advanced authentication service with MFA and session management"""
    
    def __init__(self):
        self.config = get_config()
        self.pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        
        # JWT configuration
        self.secret_key = self.config.api.secret_key
        self.algorithm = self.config.api.jwt_algorithm
        self.access_token_expire = timedelta(hours=self.config.api.jwt_expiration_hours)
        self.refresh_token_expire = timedelta(days=7)
        
        # Security settings
        self.max_login_attempts = 5
        self.lockout_duration = timedelta(minutes=30)
        self.password_min_length = 8
        self.password_require_special = True
        self.password_require_number = True
        self.password_require_upper = True
        
        # Session management
        self.max_sessions_per_user = 5
        self.session_timeout = timedelta(hours=24)
    
    async def authenticate_user(
        self,
        db: AsyncSession,
        username: str,
        password: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Tuple[Optional[User], Optional[str]]:
        """Authenticate user with enhanced security"""
        
        # Get user
        result = await db.execute(
            select(User).where(
                (User.username == username) | (User.email == username)
            )
        )
        user = result.scalar_one_or_none()
        
        if not user:
            # Log failed attempt
            await self._log_auth_attempt(
                db, None, "login", "failure", 
                {"reason": "user_not_found"}, ip_address, user_agent
            )
            return None, "Invalid credentials"
        
        # Check if account is locked
        if user.is_locked():
            await self._log_auth_attempt(
                db, user.id, "login", "failure",
                {"reason": "account_locked"}, ip_address, user_agent
            )
            return None, "Account is locked. Please try again later."
        
        # Check account status
        if user.status == UserStatus.SUSPENDED:
            return None, "Account is suspended. Please contact administrator."
        
        if user.status == UserStatus.INACTIVE:
            return None, "Account is inactive."
        
        # Verify password
        if not user.verify_password(password):
            # Increment failed attempts
            user.failed_login_attempts += 1
            
            # Lock account if max attempts exceeded
            if user.failed_login_attempts >= self.max_login_attempts:
                user.locked_until = datetime.utcnow() + self.lockout_duration
                await db.commit()
                
                await self._log_auth_attempt(
                    db, user.id, "login", "failure",
                    {"reason": "max_attempts_exceeded"}, ip_address, user_agent
                )
                
                return None, "Too many failed attempts. Account locked."
            
            await db.commit()
            
            await self._log_auth_attempt(
                db, user.id, "login", "failure",
                {"reason": "invalid_password"}, ip_address, user_agent
            )
            
            return None, "Invalid credentials"
        
        # Check password expiry
        if user.password_expiry and datetime.utcnow() > user.password_expiry:
            return None, "Password has expired. Please reset your password."
        
        # Reset failed attempts on successful authentication
        user.failed_login_attempts = 0
        user.last_login = datetime.utcnow()
        
        await db.commit()
        
        # Log successful authentication
        await self._log_auth_attempt(
            db, user.id, "login", "success",
            {}, ip_address, user_agent
        )
        
        return user, None
    
    async def create_session(
        self,
        db: AsyncSession,
        user: User,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        device_info: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Create user session with tokens"""
        
        # Check max sessions
        await self._cleanup_old_sessions(db, user.id)
        
        active_sessions = await db.execute(
            select(UserSession).where(
                UserSession.user_id == user.id,
                UserSession.is_active == True
            )
        )
        
        if active_sessions.scalars().count() >= self.max_sessions_per_user:
            # Revoke oldest session
            oldest = active_sessions.scalars().first()
            oldest.is_active = False
            oldest.revoked_at = datetime.utcnow()
            oldest.revoke_reason = "max_sessions_exceeded"
        
        # Generate tokens
        access_token, access_jti = self.create_access_token(user)
        refresh_token, refresh_jti = self.create_refresh_token(user)
        
        # Create session
        session = UserSession(
            session_id=secrets.token_urlsafe(32),
            user_id=user.id,
            ip_address=ip_address,
            user_agent=user_agent,
            device_info=device_info,
            access_token_jti=access_jti,
            refresh_token_jti=refresh_jti,
            created_at=datetime.utcnow(),
            last_activity=datetime.utcnow(),
            expires_at=datetime.utcnow() + self.session_timeout,
            is_active=True
        )
        
        db.add(session)
        await db.commit()
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": self.access_token_expire.total_seconds(),
            "session_id": session.session_id,
            "user": user.to_dict()
        }
    
    def create_access_token(self, user: User) -> Tuple[str, str]:
        """Create JWT access token"""
        jti = secrets.token_urlsafe(32)
        
        payload = {
            "sub": str(user.id),
            "username": user.username,
            "email": user.email,
            "roles": [role.name for role in user.roles],
            "permissions": list(user.get_permissions()),
            "exp": datetime.utcnow() + self.access_token_expire,
            "iat": datetime.utcnow(),
            "jti": jti,
            "type": "access"
        }
        
        token = jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
        
        return token, jti
    
    def create_refresh_token(self, user: User) -> Tuple[str, str]:
        """Create JWT refresh token"""
        jti = secrets.token_urlsafe(32)
        
        payload = {
            "sub": str(user.id),
            "exp": datetime.utcnow() + self.refresh_token_expire,
            "iat": datetime.utcnow(),
            "jti": jti,
            "type": "refresh"
        }
        
        token = jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
        
        return token, jti
    
    async def verify_token(
        self,
        db: AsyncSession,
        token: str,
        token_type: str = "access"
    ) -> Tuple[Optional[Dict], Optional[str]]:
        """Verify and decode JWT token"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            
            # Check token type
            if payload.get("type") != token_type:
                return None, "Invalid token type"
            
            # Check if token is revoked
            jti = payload.get("jti")
            if jti:
                session = await db.execute(
                    select(UserSession).where(
                        (UserSession.access_token_jti == jti) |
                        (UserSession.refresh_token_jti == jti)
                    )
                )
                session = session.scalar_one_or_none()
                
                if session and not session.is_active:
                    return None, "Token has been revoked"
            
            return payload, None
            
        except jwt.ExpiredSignatureError:
            return None, "Token has expired"
        except JWTError:
            return None, "Invalid token"
    
    async def refresh_access_token(
        self,
        db: AsyncSession,
        refresh_token: str
    ) -> Tuple[Optional[str], Optional[str]]:
        """Refresh access token using refresh token"""
        
        # Verify refresh token
        payload, error = await self.verify_token(db, refresh_token, "refresh")
        
        if error:
            return None, error
        
        # Get user
        user_id = int(payload["sub"])
        user = await db.get(User, user_id)
        
        if not user or user.status != UserStatus.ACTIVE:
            return None, "User not found or inactive"
        
        # Generate new access token
        access_token, access_jti = self.create_access_token(user)
        
        # Update session
        session = await db.execute(
            select(UserSession).where(
                UserSession.refresh_token_jti == payload["jti"]
            )
        )
        session = session.scalar_one_or_none()
        
        if session:
            session.access_token_jti = access_jti
            session.last_activity = datetime.utcnow()
            await db.commit()
        
        return access_token, None
    
    async def revoke_token(
        self,
        db: AsyncSession,
        token: str,
        reason: Optional[str] = None
    ) -> bool:
        """Revoke a token"""
        payload, error = await self.verify_token(db, token)
        
        if error:
            return False
        
        jti = payload.get("jti")
        if not jti:
            return False
        
        # Find and revoke session
        session = await db.execute(
            select(UserSession).where(
                (UserSession.access_token_jti == jti) |
                (UserSession.refresh_token_jti == jti)
            )
        )
        session = session.scalar_one_or_none()
        
        if session:
            session.is_active = False
            session.revoked_at = datetime.utcnow()
            session.revoke_reason = reason or "manual_revocation"
            await db.commit()
            return True
        
        return False
    
    async def logout(
        self,
        db: AsyncSession,
        user_id: int,
        session_id: Optional[str] = None
    ) -> bool:
        """Logout user and revoke tokens"""
        
        if session_id:
            # Logout specific session
            session = await db.execute(
                select(UserSession).where(
                    UserSession.session_id == session_id,
                    UserSession.user_id == user_id
                )
            )
            session = session.scalar_one_or_none()
            
            if session:
                session.is_active = False
                session.revoked_at = datetime.utcnow()
                session.revoke_reason = "logout"
        else:
            # Logout all sessions
            await db.execute(
                update(UserSession)
                .where(UserSession.user_id == user_id, UserSession.is_active == True)
                .values(
                    is_active=False,
                    revoked_at=datetime.utcnow(),
                    revoke_reason="logout_all"
                )
            )
        
        await db.commit()
        
        # Log logout
        await self._log_auth_attempt(db, user_id, "logout", "success")
        
        return True
    
    def validate_password_strength(self, password: str) -> Tuple[bool, Optional[str]]:
        """Validate password strength"""
        
        if len(password) < self.password_min_length:
            return False, f"Password must be at least {self.password_min_length} characters"
        
        if self.password_require_upper and not any(c.isupper() for c in password):
            return False, "Password must contain at least one uppercase letter"
        
        if self.password_require_number and not any(c.isdigit() for c in password):
            return False, "Password must contain at least one number"
        
        if self.password_require_special and not any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password):
            return False, "Password must contain at least one special character"
        
        return True, None
    
    async def change_password(
        self,
        db: AsyncSession,
        user: User,
        old_password: str,
        new_password: str
    ) -> Tuple[bool, Optional[str]]:
        """Change user password"""
        
        # Verify old password
        if not user.verify_password(old_password):
            return False, "Current password is incorrect"
        
        # Validate new password
        is_valid, error = self.validate_password_strength(new_password)
        if not is_valid:
            return False, error
        
        # Set new password
        user.set_password(new_password)
        user.password_expiry = datetime.utcnow() + timedelta(days=90)  # 90-day expiry
        
        # Revoke all sessions for security
        await db.execute(
            update(UserSession)
            .where(UserSession.user_id == user.id, UserSession.is_active == True)
            .values(
                is_active=False,
                revoked_at=datetime.utcnow(),
                revoke_reason="password_changed"
            )
        )
        
        await db.commit()
        
        # Log password change
        await self._log_auth_attempt(db, user.id, "password_change", "success")
        
        return True, None
    
    def generate_2fa_secret(self) -> str:
        """Generate 2FA secret for user"""
        return pyotp.random_base32()
    
    def generate_2fa_qr_code(self, user: User, secret: str) -> str:
        """Generate QR code URL for 2FA setup"""
        totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(
            name=user.email,
            issuer_name="Procurement System"
        )
        return totp_uri
    
    def verify_2fa_token(self, secret: str, token: str) -> bool:
        """Verify 2FA token"""
        totp = pyotp.TOTP(secret)
        return totp.verify(token, valid_window=1)  # Allow 30-second window
    
    async def enable_2fa(
        self,
        db: AsyncSession,
        user: User,
        secret: str,
        token: str
    ) -> Tuple[bool, Optional[str]]:
        """Enable 2FA for user"""
        
        # Verify token
        if not self.verify_2fa_token(secret, token):
            return False, "Invalid verification code"
        
        # Enable 2FA
        user.two_factor_enabled = True
        user.two_factor_secret = secret
        
        await db.commit()
        
        # Log 2FA enablement
        await self._log_auth_attempt(db, user.id, "2fa_enabled", "success")
        
        return True, None
    
    async def _cleanup_old_sessions(self, db: AsyncSession, user_id: int):
        """Clean up expired sessions"""
        await db.execute(
            update(UserSession)
            .where(
                UserSession.user_id == user_id,
                UserSession.expires_at < datetime.utcnow()
            )
            .values(
                is_active=False,
                revoked_at=datetime.utcnow(),
                revoke_reason="expired"
            )
        )
    
    async def _log_auth_attempt(
        self,
        db: AsyncSession,
        user_id: Optional[int],
        event_type: str,
        status: str = "success",
        details: Optional[Dict] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ):
        """Log authentication attempt"""
        if user_id:
            log = UserAuditLog(
                user_id=user_id,
                event_type=event_type,
                event_status=status,
                event_details=details or {},
                ip_address=ip_address,
                user_agent=user_agent,
                created_at=datetime.utcnow()
            )
            db.add(log)
            await db.commit()


# Utility functions for use in FastAPI
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create access token (simplified version for dependencies)"""
    config = get_config()
    
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=config.api.jwt_expiration_hours)
    
    to_encode.update({"exp": expire, "type": "access"})
    
    encoded_jwt = jwt.encode(
        to_encode, 
        config.api.secret_key, 
        algorithm=config.api.jwt_algorithm
    )
    
    return encoded_jwt


def verify_token(token: str) -> Dict:
    """Verify token (simplified version for dependencies)"""
    config = get_config()
    
    try:
        payload = jwt.decode(
            token,
            config.api.secret_key,
            algorithms=[config.api.jwt_algorithm]
        )
        return payload
    except JWTError:
        raise ValueError("Invalid token")