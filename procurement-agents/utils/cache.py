"""Redis cache configuration and utilities"""

import redis.asyncio as redis
import json
import pickle
from typing import Any, Optional, Union
import logging
from datetime import timedelta

logger = logging.getLogger(__name__)

# Global Redis client
_redis_client: Optional[redis.Redis] = None


async def init_redis(
    host: str = "localhost",
    port: int = 6379,
    db: int = 0,
    password: Optional[str] = None,
    **kwargs
) -> redis.Redis:
    """
    Initialize Redis connection
    
    Args:
        host: Redis host
        port: Redis port
        db: Redis database number
        password: Optional Redis password
        **kwargs: Additional Redis connection parameters
    
    Returns:
        Redis client instance
    """
    global _redis_client
    
    try:
        _redis_client = redis.Redis(
            host=host,
            port=port,
            db=db,
            password=password,
            decode_responses=False,  # We'll handle encoding/decoding ourselves
            **kwargs
        )
        
        # Test connection
        await _redis_client.ping()
        logger.info(f"Successfully connected to Redis at {host}:{port}")
        
        return _redis_client
        
    except Exception as e:
        logger.error(f"Failed to connect to Redis: {str(e)}")
        _redis_client = None
        raise


async def get_redis_client() -> Optional[redis.Redis]:
    """Get the global Redis client instance"""
    return _redis_client


async def close_redis():
    """Close Redis connection"""
    global _redis_client
    
    if _redis_client:
        await _redis_client.close()
        _redis_client = None
        logger.info("Redis connection closed")


class CacheManager:
    """Manager for caching operations with different serialization strategies"""
    
    def __init__(self, redis_client: Optional[redis.Redis] = None, default_ttl: int = 300):
        """
        Initialize cache manager
        
        Args:
            redis_client: Optional Redis client instance
            default_ttl: Default TTL in seconds
        """
        self.redis = redis_client
        self.default_ttl = default_ttl
    
    async def get(
        self, 
        key: str, 
        deserialize: str = 'json'
    ) -> Optional[Any]:
        """
        Get value from cache
        
        Args:
            key: Cache key
            deserialize: Deserialization method ('json', 'pickle', 'raw')
        
        Returns:
            Cached value or None if not found
        """
        if not self.redis:
            self.redis = await get_redis_client()
        
        if not self.redis:
            return None
        
        try:
            value = await self.redis.get(key)
            
            if value is None:
                return None
            
            if deserialize == 'json':
                return json.loads(value)
            elif deserialize == 'pickle':
                return pickle.loads(value)
            else:  # raw
                return value.decode('utf-8') if isinstance(value, bytes) else value
                
        except Exception as e:
            logger.error(f"Error getting cache key {key}: {str(e)}")
            return None
    
    async def set(
        self,
        key: str,
        value: Any,
        ttl: Optional[int] = None,
        serialize: str = 'json'
    ) -> bool:
        """
        Set value in cache
        
        Args:
            key: Cache key
            value: Value to cache
            ttl: TTL in seconds (uses default if not specified)
            serialize: Serialization method ('json', 'pickle', 'raw')
        
        Returns:
            True if successful, False otherwise
        """
        if not self.redis:
            self.redis = await get_redis_client()
        
        if not self.redis:
            return False
        
        ttl = ttl or self.default_ttl
        
        try:
            if serialize == 'json':
                serialized = json.dumps(value, default=str)
            elif serialize == 'pickle':
                serialized = pickle.dumps(value)
            else:  # raw
                serialized = str(value)
            
            await self.redis.setex(key, ttl, serialized)
            return True
            
        except Exception as e:
            logger.error(f"Error setting cache key {key}: {str(e)}")
            return False
    
    async def delete(self, key: str) -> bool:
        """
        Delete key from cache
        
        Args:
            key: Cache key to delete
        
        Returns:
            True if key was deleted, False otherwise
        """
        if not self.redis:
            self.redis = await get_redis_client()
        
        if not self.redis:
            return False
        
        try:
            result = await self.redis.delete(key)
            return result > 0
            
        except Exception as e:
            logger.error(f"Error deleting cache key {key}: {str(e)}")
            return False
    
    async def exists(self, key: str) -> bool:
        """
        Check if key exists in cache
        
        Args:
            key: Cache key to check
        
        Returns:
            True if key exists, False otherwise
        """
        if not self.redis:
            self.redis = await get_redis_client()
        
        if not self.redis:
            return False
        
        try:
            return await self.redis.exists(key) > 0
            
        except Exception as e:
            logger.error(f"Error checking cache key {key}: {str(e)}")
            return False
    
    async def invalidate_pattern(self, pattern: str) -> int:
        """
        Invalidate all keys matching a pattern
        
        Args:
            pattern: Pattern to match (e.g., "user:*")
        
        Returns:
            Number of keys deleted
        """
        if not self.redis:
            self.redis = await get_redis_client()
        
        if not self.redis:
            return 0
        
        try:
            keys = []
            async for key in self.redis.scan_iter(pattern):
                keys.append(key)
            
            if keys:
                return await self.redis.delete(*keys)
            return 0
            
        except Exception as e:
            logger.error(f"Error invalidating pattern {pattern}: {str(e)}")
            return 0
    
    async def get_or_set(
        self,
        key: str,
        factory: callable,
        ttl: Optional[int] = None,
        serialize: str = 'json'
    ) -> Any:
        """
        Get value from cache or compute and set it
        
        Args:
            key: Cache key
            factory: Async callable to compute value if not in cache
            ttl: TTL in seconds
            serialize: Serialization method
        
        Returns:
            Cached or computed value
        """
        # Try to get from cache
        value = await self.get(key, deserialize=serialize)
        
        if value is not None:
            logger.debug(f"Cache hit for key: {key}")
            return value
        
        # Compute value
        logger.debug(f"Cache miss for key: {key}, computing value")
        value = await factory()
        
        # Store in cache
        await self.set(key, value, ttl=ttl, serialize=serialize)
        
        return value


# Specific cache utilities for different entity types

class AgentCache:
    """Cache utilities specific to agent operations"""
    
    def __init__(self, cache_manager: Optional[CacheManager] = None):
        self.cache = cache_manager or CacheManager()
    
    async def get_agent_result(self, agent_id: str, operation: str) -> Optional[dict]:
        """Get cached agent operation result"""
        key = f"agent:{agent_id}:{operation}"
        return await self.cache.get(key)
    
    async def set_agent_result(
        self,
        agent_id: str,
        operation: str,
        result: dict,
        ttl: int = 300
    ):
        """Cache agent operation result"""
        key = f"agent:{agent_id}:{operation}"
        return await self.cache.set(key, result, ttl=ttl)
    
    async def invalidate_agent(self, agent_id: str):
        """Invalidate all cache entries for an agent"""
        pattern = f"agent:{agent_id}:*"
        return await self.cache.invalidate_pattern(pattern)


class VendorCache:
    """Cache utilities for vendor data"""
    
    def __init__(self, cache_manager: Optional[CacheManager] = None):
        self.cache = cache_manager or CacheManager()
    
    async def get_vendor(self, vendor_id: str) -> Optional[dict]:
        """Get cached vendor data"""
        key = f"vendor:{vendor_id}"
        return await self.cache.get(key)
    
    async def set_vendor(self, vendor_id: str, vendor_data: dict, ttl: int = 3600):
        """Cache vendor data"""
        key = f"vendor:{vendor_id}"
        return await self.cache.set(key, vendor_data, ttl=ttl)
    
    async def get_vendor_score(self, vendor_id: str) -> Optional[float]:
        """Get cached vendor score"""
        key = f"vendor:score:{vendor_id}"
        result = await self.cache.get(key, deserialize='raw')
        return float(result) if result else None
    
    async def set_vendor_score(self, vendor_id: str, score: float, ttl: int = 3600):
        """Cache vendor score"""
        key = f"vendor:score:{vendor_id}"
        return await self.cache.set(key, score, ttl=ttl, serialize='raw')


class ContractCache:
    """Cache utilities for contract data"""
    
    def __init__(self, cache_manager: Optional[CacheManager] = None):
        self.cache = cache_manager or CacheManager()
    
    async def get_contract_analysis(self, contract_id: str) -> Optional[dict]:
        """Get cached contract analysis"""
        key = f"contract:analysis:{contract_id}"
        return await self.cache.get(key)
    
    async def set_contract_analysis(
        self,
        contract_id: str,
        analysis: dict,
        ttl: int = 86400  # 24 hours
    ):
        """Cache contract analysis"""
        key = f"contract:analysis:{contract_id}"
        return await self.cache.set(key, analysis, ttl=ttl)
    
    async def get_template(self, template_id: str) -> Optional[dict]:
        """Get cached contract template"""
        key = f"contract:template:{template_id}"
        return await self.cache.get(key)
    
    async def set_template(self, template_id: str, template: dict, ttl: int = 86400):
        """Cache contract template"""
        key = f"contract:template:{template_id}"
        return await self.cache.set(key, template, ttl=ttl)