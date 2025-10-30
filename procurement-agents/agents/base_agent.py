"""Enhanced Base Agent Class with Production-Ready Features"""

import asyncio
import json
from abc import ABC, abstractmethod
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Union
import time

import pika
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from utils.logging_config import get_logger, log_performance_async
from utils.exceptions import (
    AgentInitializationError,
    AgentExecutionError,
    AgentTimeoutError,
    ProcurementException
)
from utils.decorators import retry_async, timeout_async, measure_execution_time
from utils.cache import CacheManager, AgentCache
from utils.common import generate_id, calculate_hash, merge_dicts


class AgentStatus(str, Enum):
    """Agent operational status"""
    IDLE = "idle"
    PROCESSING = "processing"
    ERROR = "error"
    OFFLINE = "offline"
    INITIALIZING = "initializing"
    BUSY = "busy"


class AgentPriority(str, Enum):
    """Message priority levels"""
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    CRITICAL = "critical"


class AgentMessage(BaseModel):
    """Enhanced message format for inter-agent communication"""
    agent_id: str
    message_id: str = Field(default_factory=lambda: generate_id("msg"))
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    message_type: str
    payload: Dict[str, Any]
    correlation_id: Optional[str] = None
    reply_to: Optional[str] = None
    priority: AgentPriority = AgentPriority.NORMAL
    ttl: Optional[int] = None  # Time to live in seconds
    retry_count: int = 0
    max_retries: int = 3


class AgentResponse(BaseModel):
    """Enhanced response format with more metadata"""
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None
    errors: Optional[List[str]] = None
    warnings: Optional[List[str]] = None
    processing_time: Optional[float] = None
    agent_id: Optional[str] = None
    correlation_id: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    metadata: Optional[Dict[str, Any]] = None


class BaseAgent(ABC):
    """Enhanced base class for all procurement agents"""
    
    def __init__(
        self,
        agent_name: str,
        agent_id: str = None,
        cache_manager: Optional[CacheManager] = None,
        db_session: Optional[AsyncSession] = None,
        rabbitmq_url: Optional[str] = None,
        config: Optional[Dict[str, Any]] = None,
        enable_metrics: bool = True
    ):
        """
        Initialize base agent with enhanced features
        
        Args:
            agent_name: Name of the agent type
            agent_id: Unique agent ID (auto-generated if not provided)
            cache_manager: Cache manager instance
            db_session: Database session
            rabbitmq_url: RabbitMQ connection URL
            config: Agent configuration
            enable_metrics: Whether to enable metrics collection
        """
        self.agent_name = agent_name
        self.agent_id = agent_id or generate_id(f"agent-{agent_name}")
        self.db_session = db_session
        self.rabbitmq_url = rabbitmq_url
        self.config = config or {}
        self.enable_metrics = enable_metrics
        
        # Setup enhanced logging
        self.logger = get_logger(f"agents.{agent_name}", self.agent_id)
        
        # Setup caching
        self.cache_manager = cache_manager or CacheManager()
        self.agent_cache = AgentCache(self.cache_manager)
        
        # Agent state
        self.status = AgentStatus.INITIALIZING
        self.metrics = {
            "requests_processed": 0,
            "successful_requests": 0,
            "failed_requests": 0,
            "errors": 0,
            "warnings": 0,
            "avg_processing_time": 0.0,
            "min_processing_time": float('inf'),
            "max_processing_time": 0.0,
            "last_activity": datetime.utcnow(),
            "uptime_seconds": 0,
            "start_time": datetime.utcnow()
        }
        
        # Message queue connection
        self.mq_connection = None
        self.mq_channel = None
        self.queue_name = f"agent.{self.agent_name}.{self.agent_id}"
        
        # Performance tracking
        self._request_durations = []
        self._max_duration_samples = 100
        
        # Initialize components
        try:
            self._initialize()
            self.status = AgentStatus.IDLE
        except Exception as e:
            self.status = AgentStatus.ERROR
            raise AgentInitializationError(
                agent_type=self.agent_name,
                message=f"Failed to initialize agent: {str(e)}",
                cause=e
            )
    
    def _initialize(self):
        """Initialize agent components with error handling"""
        self.logger.info(
            f"Initializing {self.agent_name} agent",
            extra={"agent_id": self.agent_id, "config": self.config}
        )
        
        if self.rabbitmq_url:
            try:
                self._setup_message_queue()
            except Exception as e:
                self.logger.error(f"Message queue setup failed: {str(e)}", exc_info=True)
                # Don't fail initialization, but log the issue
        
        # Call agent-specific initialization
        self.initialize_agent()
        
        self.logger.info(
            f"{self.agent_name} agent initialized successfully",
            extra={"agent_id": self.agent_id}
        )
    
    def initialize_agent(self):
        """Override this method for agent-specific initialization"""
        pass
    
    def _setup_message_queue(self):
        """Setup RabbitMQ connection with enhanced error handling"""
        try:
            parameters = pika.URLParameters(self.rabbitmq_url)
            parameters.connection_attempts = 3
            parameters.retry_delay = 2
            
            self.mq_connection = pika.BlockingConnection(parameters)
            self.mq_channel = self.mq_connection.channel()
            
            # Set channel QoS
            self.mq_channel.basic_qos(prefetch_count=10)
            
            # Declare agent-specific queue with DLX
            self.mq_channel.queue_declare(
                queue=self.queue_name,
                durable=True,
                arguments={
                    'x-message-ttl': 3600000,  # 1 hour TTL
                    'x-dead-letter-exchange': 'procurement.dlx',
                    'x-max-length': 10000
                }
            )
            
            # Setup exchanges
            self.mq_channel.exchange_declare(
                exchange='procurement.agents',
                exchange_type='topic',
                durable=True
            )
            
            self.mq_channel.exchange_declare(
                exchange='procurement.dlx',
                exchange_type='topic',
                durable=True
            )
            
            # Bind queue to exchange
            self.mq_channel.queue_bind(
                exchange='procurement.agents',
                queue=self.queue_name,
                routing_key=f"{self.agent_name}.*"
            )
            
            # Also bind for broadcast messages
            self.mq_channel.queue_bind(
                exchange='procurement.agents',
                queue=self.queue_name,
                routing_key="broadcast.*"
            )
            
            self.logger.info(
                f"Message queue setup complete",
                extra={"queue": self.queue_name}
            )
            
        except Exception as e:
            self.logger.error(f"Failed to setup message queue: {str(e)}", exc_info=True)
            raise
    
    @abstractmethod
    async def process_request(self, request: Dict[str, Any]) -> AgentResponse:
        """Process incoming request - must be implemented by each agent"""
        pass
    
    @abstractmethod
    async def validate_request(self, request: Dict[str, Any]) -> tuple[bool, Optional[List[str]]]:
        """
        Validate incoming request
        
        Returns:
            Tuple of (is_valid, error_messages)
        """
        pass
    
    @measure_execution_time()
    async def handle_message(self, message: AgentMessage) -> AgentResponse:
        """Enhanced message handling with comprehensive error handling"""
        start_time = time.time()
        self.status = AgentStatus.PROCESSING
        correlation_id = message.correlation_id or generate_id("corr")
        
        self.logger.info(
            f"Processing message",
            extra={
                "message_id": message.message_id,
                "message_type": message.message_type,
                "correlation_id": correlation_id,
                "priority": message.priority
            }
        )
        
        try:
            # Check cache for idempotent operations
            cache_key = f"message:{message.message_id}"
            cached_response = await self.agent_cache.get_agent_result(
                self.agent_id,
                cache_key
            )
            
            if cached_response:
                self.logger.info(f"Returning cached response for message {message.message_id}")
                return AgentResponse(**cached_response)
            
            # Validate message
            is_valid, validation_errors = await self.validate_request(message.payload)
            
            if not is_valid:
                self.logger.warning(
                    f"Request validation failed",
                    extra={
                        "message_id": message.message_id,
                        "errors": validation_errors
                    }
                )
                
                response = AgentResponse(
                    success=False,
                    message="Request validation failed",
                    errors=validation_errors,
                    agent_id=self.agent_id,
                    correlation_id=correlation_id
                )
                
                self._update_metrics(0, success=False)
                return response
            
            # Process request with timeout
            timeout_seconds = self.config.get("request_timeout", 30)
            
            if message.priority == AgentPriority.CRITICAL:
                timeout_seconds *= 2  # Double timeout for critical messages
            
            response = await asyncio.wait_for(
                self.process_request(message.payload),
                timeout=timeout_seconds
            )
            
            # Add metadata
            response.agent_id = self.agent_id
            response.correlation_id = correlation_id
            
            # Calculate processing time
            processing_time = time.time() - start_time
            response.processing_time = processing_time
            
            # Update metrics
            self._update_metrics(processing_time, success=response.success)
            
            # Cache successful responses
            if response.success:
                await self.agent_cache.set_agent_result(
                    self.agent_id,
                    cache_key,
                    response.model_dump(),
                    ttl=300  # 5 minutes
                )
            
            self.logger.info(
                f"Message processed successfully",
                extra={
                    "message_id": message.message_id,
                    "processing_time": processing_time,
                    "success": response.success
                }
            )
            
            return response
            
        except asyncio.TimeoutError:
            self.logger.error(
                f"Request timeout",
                extra={"message_id": message.message_id, "timeout": timeout_seconds}
            )
            
            self._update_metrics(0, success=False)
            
            raise AgentTimeoutError(
                agent_id=self.agent_id,
                operation=message.message_type,
                timeout_seconds=timeout_seconds
            )
            
        except ProcurementException as e:
            # Handle known exceptions
            self.logger.error(
                f"Known error processing message",
                extra={
                    "message_id": message.message_id,
                    "error_code": e.error_code,
                    "error": str(e)
                }
            )
            
            self._update_metrics(0, success=False)
            
            return AgentResponse(
                success=False,
                message=e.message,
                errors=[str(e)],
                agent_id=self.agent_id,
                correlation_id=correlation_id,
                metadata={"error_code": e.error_code}
            )
            
        except Exception as e:
            # Handle unexpected exceptions
            self.logger.error(
                f"Unexpected error processing message",
                extra={"message_id": message.message_id},
                exc_info=True
            )
            
            self._update_metrics(0, success=False)
            
            # Retry logic for transient errors
            if message.retry_count < message.max_retries:
                self.logger.info(
                    f"Scheduling retry",
                    extra={
                        "message_id": message.message_id,
                        "retry_count": message.retry_count + 1
                    }
                )
                
                message.retry_count += 1
                await self._schedule_retry(message)
            
            return AgentResponse(
                success=False,
                message="An unexpected error occurred",
                errors=[str(e)],
                agent_id=self.agent_id,
                correlation_id=correlation_id
            )
            
        finally:
            self.status = AgentStatus.IDLE
    
    def _update_metrics(self, processing_time: float, success: bool):
        """Update agent metrics with enhanced tracking"""
        if not self.enable_metrics:
            return
        
        self.metrics["requests_processed"] += 1
        self.metrics["last_activity"] = datetime.utcnow()
        
        if success:
            self.metrics["successful_requests"] += 1
        else:
            self.metrics["failed_requests"] += 1
            self.metrics["errors"] += 1
        
        # Update processing time metrics
        if processing_time > 0:
            self._request_durations.append(processing_time)
            
            # Keep only last N samples
            if len(self._request_durations) > self._max_duration_samples:
                self._request_durations.pop(0)
            
            self.metrics["avg_processing_time"] = sum(self._request_durations) / len(self._request_durations)
            self.metrics["min_processing_time"] = min(self._request_durations)
            self.metrics["max_processing_time"] = max(self._request_durations)
        
        # Update uptime
        uptime = datetime.utcnow() - self.metrics["start_time"]
        self.metrics["uptime_seconds"] = uptime.total_seconds()
    
    async def publish_event(
        self,
        event_type: str,
        data: Dict[str, Any],
        target_agent: Optional[str] = None,
        priority: AgentPriority = AgentPriority.NORMAL,
        correlation_id: Optional[str] = None
    ):
        """Enhanced event publishing with priority and correlation"""
        if not self.mq_channel:
            self.logger.warning("Message queue not configured, cannot publish event")
            return
        
        message = AgentMessage(
            agent_id=self.agent_id,
            message_type=event_type,
            payload=data,
            priority=priority,
            correlation_id=correlation_id or generate_id("corr")
        )
        
        routing_key = f"{target_agent}.{event_type}" if target_agent else f"broadcast.{event_type}"
        
        # Set message priority
        priority_value = {
            AgentPriority.LOW: 1,
            AgentPriority.NORMAL: 5,
            AgentPriority.HIGH: 8,
            AgentPriority.CRITICAL: 10
        }.get(priority, 5)
        
        try:
            self.mq_channel.basic_publish(
                exchange='procurement.agents',
                routing_key=routing_key,
                body=message.model_dump_json(),
                properties=pika.BasicProperties(
                    delivery_mode=2,  # Persistent
                    priority=priority_value,
                    correlation_id=message.correlation_id,
                    expiration=str(message.ttl * 1000) if message.ttl else None
                )
            )
            
            self.logger.info(
                f"Event published",
                extra={
                    "event_type": event_type,
                    "routing_key": routing_key,
                    "correlation_id": message.correlation_id
                }
            )
            
        except Exception as e:
            self.logger.error(
                f"Failed to publish event",
                extra={"event_type": event_type, "error": str(e)},
                exc_info=True
            )
            raise AgentExecutionError(
                agent_id=self.agent_id,
                operation="publish_event",
                message=f"Failed to publish event: {str(e)}"
            )
    
    async def _schedule_retry(self, message: AgentMessage):
        """Schedule message retry with exponential backoff"""
        delay = 2 ** message.retry_count  # Exponential backoff
        
        # Publish to delay queue (implementation depends on your setup)
        # This is a simplified version
        await asyncio.sleep(delay)
        await self.handle_message(message)
    
    @retry_async(max_attempts=3, exceptions=(Exception,))
    async def call_external_api(
        self,
        url: str,
        method: str = "GET",
        headers: Optional[Dict] = None,
        data: Optional[Dict] = None,
        timeout: int = 30
    ) -> Dict[str, Any]:
        """Enhanced external API call with retry and timeout"""
        import httpx
        
        self.logger.info(
            f"Calling external API",
            extra={"url": url, "method": method}
        )
        
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.request(
                method=method,
                url=url,
                headers=headers,
                json=data
            )
            response.raise_for_status()
            return response.json()
    
    async def health_check(self) -> Dict[str, Any]:
        """Enhanced health check with detailed status"""
        health_status = {
            "agent_name": self.agent_name,
            "agent_id": self.agent_id,
            "status": self.status.value,
            "version": self.config.get("version", "1.0.0"),
            "metrics": self.metrics,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Check dependencies
        dependencies = {}
        
        # Check cache
        try:
            test_key = f"health_check_{self.agent_id}"
            await self.cache_manager.set(test_key, "test", ttl=10)
            cached = await self.cache_manager.get(test_key)
            dependencies["cache"] = "healthy" if cached == "test" else "degraded"
        except:
            dependencies["cache"] = "unhealthy"
        
        # Check message queue
        if self.mq_connection:
            dependencies["rabbitmq"] = "healthy" if not self.mq_connection.is_closed else "unhealthy"
        
        # Check database
        if self.db_session:
            try:
                await self.db_session.execute("SELECT 1")
                dependencies["database"] = "healthy"
            except:
                dependencies["database"] = "unhealthy"
        
        health_status["dependencies"] = dependencies
        
        # Calculate overall health
        unhealthy_deps = [k for k, v in dependencies.items() if v == "unhealthy"]
        if unhealthy_deps:
            health_status["overall_health"] = "unhealthy"
            health_status["issues"] = unhealthy_deps
        else:
            health_status["overall_health"] = "healthy"
        
        return health_status
    
    async def shutdown(self):
        """Enhanced graceful shutdown"""
        self.logger.info(f"Initiating shutdown for {self.agent_name} agent")
        
        # Set status
        self.status = AgentStatus.OFFLINE
        
        # Close message queue connection
        if self.mq_connection and not self.mq_connection.is_closed:
            try:
                self.mq_connection.close()
                self.logger.info("Message queue connection closed")
            except Exception as e:
                self.logger.error(f"Error closing message queue: {str(e)}")
        
        # Close database session
        if self.db_session:
            try:
                await self.db_session.close()
                self.logger.info("Database session closed")
            except Exception as e:
                self.logger.error(f"Error closing database session: {str(e)}")
        
        # Clear cache
        try:
            await self.agent_cache.invalidate_agent(self.agent_id)
            self.logger.info("Agent cache cleared")
        except Exception as e:
            self.logger.error(f"Error clearing cache: {str(e)}")
        
        # Call agent-specific cleanup
        await self.cleanup()
        
        self.logger.info(f"Shutdown complete for {self.agent_name} agent")
    
    async def cleanup(self):
        """Override this method for agent-specific cleanup"""
        pass
    
    def __repr__(self):
        return f"<{self.__class__.__name__}(name={self.agent_name}, id={self.agent_id}, status={self.status})>"