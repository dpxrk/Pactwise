"""Decorators for common functionality across the procurement system"""

import functools
import asyncio
import time
from typing import Any, Callable, Optional, Type, Union, List
import logging
from datetime import datetime, timedelta

from utils.exceptions import (
    ProcurementException, 
    AgentTimeoutError, 
    ValidationError,
    AuthorizationError
)
from utils.cache import get_redis_client


logger = logging.getLogger(__name__)


def retry(
    max_attempts: int = 3,
    delay: float = 1.0,
    backoff: float = 2.0,
    exceptions: tuple = (Exception,),
    logger: Optional[logging.Logger] = None
):
    """
    Retry decorator with exponential backoff
    
    Args:
        max_attempts: Maximum number of retry attempts
        delay: Initial delay between retries in seconds
        backoff: Backoff multiplier
        exceptions: Tuple of exceptions to catch
        logger: Optional logger instance
    """
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            nonlocal logger
            if logger is None:
                logger = logging.getLogger(func.__module__)
            
            last_exception = None
            current_delay = delay
            
            for attempt in range(max_attempts):
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    last_exception = e
                    
                    if attempt < max_attempts - 1:
                        logger.warning(
                            f"Attempt {attempt + 1}/{max_attempts} failed for {func.__name__}: {str(e)}. Retrying in {current_delay}s...",
                            extra={'attempt': attempt + 1, 'max_attempts': max_attempts}
                        )
                        time.sleep(current_delay)
                        current_delay *= backoff
                    else:
                        logger.error(
                            f"All {max_attempts} attempts failed for {func.__name__}",
                            extra={'max_attempts': max_attempts}
                        )
            
            raise last_exception
        
        return wrapper
    return decorator


def retry_async(
    max_attempts: int = 3,
    delay: float = 1.0,
    backoff: float = 2.0,
    exceptions: tuple = (Exception,),
    logger: Optional[logging.Logger] = None
):
    """
    Async retry decorator with exponential backoff
    """
    def decorator(func):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            nonlocal logger
            if logger is None:
                logger = logging.getLogger(func.__module__)
            
            last_exception = None
            current_delay = delay
            
            for attempt in range(max_attempts):
                try:
                    return await func(*args, **kwargs)
                except exceptions as e:
                    last_exception = e
                    
                    if attempt < max_attempts - 1:
                        logger.warning(
                            f"Attempt {attempt + 1}/{max_attempts} failed for {func.__name__}: {str(e)}. Retrying in {current_delay}s...",
                            extra={'attempt': attempt + 1, 'max_attempts': max_attempts}
                        )
                        await asyncio.sleep(current_delay)
                        current_delay *= backoff
                    else:
                        logger.error(
                            f"All {max_attempts} attempts failed for {func.__name__}",
                            extra={'max_attempts': max_attempts}
                        )
            
            raise last_exception
        
        return wrapper
    return decorator


def timeout(seconds: int):
    """
    Timeout decorator for synchronous functions
    
    Args:
        seconds: Timeout in seconds
    """
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            import signal
            
            def timeout_handler(signum, frame):
                raise AgentTimeoutError(
                    agent_id=kwargs.get('agent_id', 'unknown'),
                    operation=func.__name__,
                    timeout_seconds=seconds
                )
            
            # Set the timeout handler
            signal.signal(signal.SIGALRM, timeout_handler)
            signal.alarm(seconds)
            
            try:
                result = func(*args, **kwargs)
            finally:
                # Disable the alarm
                signal.alarm(0)
            
            return result
        
        return wrapper
    return decorator


def timeout_async(seconds: int):
    """
    Timeout decorator for async functions
    
    Args:
        seconds: Timeout in seconds
    """
    def decorator(func):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            try:
                return await asyncio.wait_for(
                    func(*args, **kwargs),
                    timeout=seconds
                )
            except asyncio.TimeoutError:
                raise AgentTimeoutError(
                    agent_id=kwargs.get('agent_id', 'unknown'),
                    operation=func.__name__,
                    timeout_seconds=seconds
                )
        
        return wrapper
    return decorator


def validate_input(**validators):
    """
    Input validation decorator
    
    Args:
        **validators: Keyword arguments with validation functions
    
    Example:
        @validate_input(
            amount=lambda x: x > 0,
            email=lambda x: '@' in x
        )
        def process_order(amount: float, email: str):
            pass
    """
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Get function signature
            import inspect
            sig = inspect.signature(func)
            bound_args = sig.bind(*args, **kwargs)
            bound_args.apply_defaults()
            
            # Validate each argument
            for param_name, validator in validators.items():
                if param_name in bound_args.arguments:
                    value = bound_args.arguments[param_name]
                    
                    if not validator(value):
                        raise ValidationError(
                            message=f"Validation failed for parameter '{param_name}'",
                            field=param_name,
                            value=value
                        )
            
            return func(*args, **kwargs)
        
        return wrapper
    return decorator


def cache_result(ttl: int = 300, key_prefix: str = None):
    """
    Cache function results in Redis
    
    Args:
        ttl: Time to live in seconds (default 5 minutes)
        key_prefix: Optional key prefix
    """
    def decorator(func):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            # Generate cache key
            import hashlib
            import json
            
            # Create a unique key based on function name and arguments
            cache_data = {
                'func': func.__name__,
                'args': str(args),
                'kwargs': str(sorted(kwargs.items()))
            }
            cache_hash = hashlib.md5(json.dumps(cache_data).encode()).hexdigest()
            
            if key_prefix:
                cache_key = f"{key_prefix}:{cache_hash}"
            else:
                cache_key = f"cache:{func.__name__}:{cache_hash}"
            
            # Try to get from cache
            redis_client = await get_redis_client()
            if redis_client:
                cached = await redis_client.get(cache_key)
                if cached:
                    logger.debug(f"Cache hit for {cache_key}")
                    return json.loads(cached)
            
            # Execute function
            result = await func(*args, **kwargs)
            
            # Store in cache
            if redis_client and result is not None:
                await redis_client.setex(
                    cache_key,
                    ttl,
                    json.dumps(result, default=str)
                )
                logger.debug(f"Cached result for {cache_key} with TTL {ttl}s")
            
            return result
        
        return wrapper
    return decorator


def rate_limit(max_calls: int, period: int = 60):
    """
    Rate limiting decorator using Redis
    
    Args:
        max_calls: Maximum number of calls allowed
        period: Time period in seconds (default 60)
    """
    def decorator(func):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            # Get user identifier
            user_id = kwargs.get('user_id') or kwargs.get('current_user', {}).get('user_id', 'anonymous')
            
            # Create rate limit key
            rate_key = f"rate_limit:{func.__name__}:{user_id}"
            
            redis_client = await get_redis_client()
            if redis_client:
                # Get current count
                current = await redis_client.get(rate_key)
                
                if current:
                    count = int(current)
                    if count >= max_calls:
                        raise ValidationError(
                            f"Rate limit exceeded: {max_calls} calls per {period} seconds",
                            field='rate_limit',
                            value={'max_calls': max_calls, 'period': period}
                        )
                    
                    # Increment counter
                    await redis_client.incr(rate_key)
                else:
                    # Set initial counter with expiry
                    await redis_client.setex(rate_key, period, 1)
            
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator


def require_permissions(*required_perms: str):
    """
    Permission checking decorator
    
    Args:
        *required_perms: List of required permissions
    """
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Get user permissions from kwargs
            user = kwargs.get('current_user', {})
            user_permissions = user.get('permissions', [])
            
            # Check if user has all required permissions
            missing_perms = [p for p in required_perms if p not in user_permissions]
            
            if missing_perms:
                raise AuthorizationError(
                    message=f"Missing required permissions: {', '.join(missing_perms)}",
                    required_permissions=list(required_perms)
                )
            
            return func(*args, **kwargs)
        
        return wrapper
    return decorator


def audit_log(action: str, entity_type: str = None):
    """
    Audit logging decorator
    
    Args:
        action: The action being performed
        entity_type: Optional entity type being acted upon
    """
    def decorator(func):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            start_time = time.time()
            user = kwargs.get('current_user', {})
            
            audit_entry = {
                'timestamp': datetime.utcnow().isoformat(),
                'action': action,
                'entity_type': entity_type,
                'function': func.__name__,
                'user_id': user.get('user_id', 'system'),
                'user_email': user.get('email'),
                'ip_address': kwargs.get('request', {}).get('client', {}).get('host')
            }
            
            try:
                # Execute function
                result = await func(*args, **kwargs)
                
                # Log success
                audit_entry['status'] = 'success'
                audit_entry['duration_ms'] = int((time.time() - start_time) * 1000)
                
                # Extract entity ID if available
                if result and isinstance(result, dict):
                    audit_entry['entity_id'] = result.get('id') or result.get(f'{entity_type}_id')
                
                logger.info(f"Audit: {action} completed", extra=audit_entry)
                
                return result
                
            except Exception as e:
                # Log failure
                audit_entry['status'] = 'failure'
                audit_entry['duration_ms'] = int((time.time() - start_time) * 1000)
                audit_entry['error'] = str(e)
                audit_entry['error_type'] = type(e).__name__
                
                logger.error(f"Audit: {action} failed", extra=audit_entry, exc_info=True)
                raise
        
        return wrapper
    return decorator


def measure_execution_time(metric_name: str = None):
    """
    Measure and log execution time
    
    Args:
        metric_name: Optional metric name for monitoring systems
    """
    def decorator(func):
        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs):
            start = time.time()
            
            try:
                result = await func(*args, **kwargs)
                duration = time.time() - start
                
                logger.info(
                    f"Executed {metric_name or func.__name__}",
                    extra={
                        'metric': metric_name or func.__name__,
                        'duration_seconds': duration,
                        'status': 'success'
                    }
                )
                
                return result
                
            except Exception as e:
                duration = time.time() - start
                
                logger.error(
                    f"Failed {metric_name or func.__name__}",
                    extra={
                        'metric': metric_name or func.__name__,
                        'duration_seconds': duration,
                        'status': 'error',
                        'error': str(e)
                    }
                )
                raise
        
        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs):
            start = time.time()
            
            try:
                result = func(*args, **kwargs)
                duration = time.time() - start
                
                logger.info(
                    f"Executed {metric_name or func.__name__}",
                    extra={
                        'metric': metric_name or func.__name__,
                        'duration_seconds': duration,
                        'status': 'success'
                    }
                )
                
                return result
                
            except Exception as e:
                duration = time.time() - start
                
                logger.error(
                    f"Failed {metric_name or func.__name__}",
                    extra={
                        'metric': metric_name or func.__name__,
                        'duration_seconds': duration,
                        'status': 'error',
                        'error': str(e)
                    }
                )
                raise
        
        # Return appropriate wrapper based on function type
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator