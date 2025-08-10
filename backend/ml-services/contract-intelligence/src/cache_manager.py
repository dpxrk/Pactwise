"""
Cache management for ML service results.
"""

import os
import json
import hashlib
import logging
from typing import Any, Optional
import redis.asyncio as redis
from datetime import timedelta

logger = logging.getLogger(__name__)


class CacheManager:
    """
    Manage caching of analysis results using Redis.
    """
    
    def __init__(self, ttl_seconds: int = 3600):
        """
        Initialize cache manager.
        
        Args:
            ttl_seconds: Time to live for cache entries (default 1 hour)
        """
        self.ttl = ttl_seconds
        self.redis_client = None
        self._initialize_redis()
    
    def _initialize_redis(self):
        """Initialize Redis connection."""
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        try:
            self.redis_client = redis.from_url(
                redis_url,
                encoding="utf-8",
                decode_responses=True
            )
            logger.info("Redis cache initialized")
        except Exception as e:
            logger.warning(f"Redis initialization failed: {e}. Caching disabled.")
            self.redis_client = None
    
    async def get_analysis(self, contract_text: str) -> Optional[Any]:
        """
        Get cached analysis for contract text.
        
        Args:
            contract_text: The contract text
            
        Returns:
            Cached analysis or None
        """
        if not self.redis_client:
            return None
        
        try:
            cache_key = self._generate_key(contract_text)
            cached_data = await self.redis_client.get(cache_key)
            
            if cached_data:
                logger.info(f"Cache hit for key: {cache_key[:8]}...")
                return json.loads(cached_data)
            
            return None
            
        except Exception as e:
            logger.error(f"Cache get error: {e}")
            return None
    
    async def store_analysis(self, contract_text: str, analysis: Any):
        """
        Store analysis result in cache.
        
        Args:
            contract_text: The contract text
            analysis: Analysis result to cache
        """
        if not self.redis_client:
            return
        
        try:
            cache_key = self._generate_key(contract_text)
            
            # Convert to JSON-serializable format
            if hasattr(analysis, 'dict'):
                data = analysis.dict()
            elif hasattr(analysis, '__dict__'):
                data = analysis.__dict__
            else:
                data = analysis
            
            await self.redis_client.setex(
                cache_key,
                timedelta(seconds=self.ttl),
                json.dumps(data, default=str)
            )
            
            logger.info(f"Cached analysis for key: {cache_key[:8]}...")
            
        except Exception as e:
            logger.error(f"Cache store error: {e}")
    
    async def invalidate(self, contract_text: str):
        """
        Invalidate cache for specific contract.
        
        Args:
            contract_text: The contract text
        """
        if not self.redis_client:
            return
        
        try:
            cache_key = self._generate_key(contract_text)
            await self.redis_client.delete(cache_key)
            logger.info(f"Invalidated cache for key: {cache_key[:8]}...")
            
        except Exception as e:
            logger.error(f"Cache invalidate error: {e}")
    
    async def clear_all(self):
        """Clear all cached entries."""
        if not self.redis_client:
            return
        
        try:
            await self.redis_client.flushdb()
            logger.info("Cleared all cache entries")
            
        except Exception as e:
            logger.error(f"Cache clear error: {e}")
    
    async def ping(self) -> bool:
        """
        Check if Redis is available.
        
        Returns:
            True if Redis is available, False otherwise
        """
        if not self.redis_client:
            return False
        
        try:
            await self.redis_client.ping()
            return True
        except:
            return False
    
    async def close(self):
        """Close Redis connection."""
        if self.redis_client:
            await self.redis_client.close()
            logger.info("Redis connection closed")
    
    def _generate_key(self, text: str) -> str:
        """
        Generate cache key from text.
        
        Args:
            text: Input text
            
        Returns:
            Cache key
        """
        # Use SHA256 hash of text for consistent key
        hash_object = hashlib.sha256(text.encode())
        return f"contract_analysis:{hash_object.hexdigest()}"