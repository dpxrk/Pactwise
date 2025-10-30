"""Centralized logging configuration for the procurement system"""

import logging
import logging.config
import json
import sys
from pathlib import Path
from typing import Any, Dict
from datetime import datetime
import traceback


class StructuredFormatter(logging.Formatter):
    """Custom formatter that outputs structured JSON logs"""
    
    def format(self, record: logging.LogRecord) -> str:
        log_obj = {
            'timestamp': datetime.utcnow().isoformat(),
            'level': record.levelname,
            'logger': record.name,
            'module': record.module,
            'function': record.funcName,
            'line': record.lineno,
            'message': record.getMessage(),
            'agent_id': getattr(record, 'agent_id', None),
            'user_id': getattr(record, 'user_id', None),
            'request_id': getattr(record, 'request_id', None),
            'correlation_id': getattr(record, 'correlation_id', None)
        }
        
        # Add exception info if present
        if record.exc_info:
            log_obj['exception'] = {
                'type': record.exc_info[0].__name__,
                'message': str(record.exc_info[1]),
                'traceback': traceback.format_exception(*record.exc_info)
            }
        
        # Add extra fields
        for key, value in record.__dict__.items():
            if key not in ['name', 'msg', 'args', 'created', 'filename', 'funcName', 
                          'levelname', 'levelno', 'lineno', 'module', 'msecs', 
                          'pathname', 'process', 'processName', 'relativeCreated', 
                          'thread', 'threadName', 'exc_info', 'exc_text', 'stack_info',
                          'agent_id', 'user_id', 'request_id', 'correlation_id']:
                log_obj[key] = value
        
        return json.dumps(log_obj)


class AgentLoggerAdapter(logging.LoggerAdapter):
    """Logger adapter that adds agent context to all log messages"""
    
    def __init__(self, logger: logging.Logger, agent_id: str):
        super().__init__(logger, {'agent_id': agent_id})
    
    def process(self, msg: str, kwargs: Dict[str, Any]) -> tuple:
        if 'extra' not in kwargs:
            kwargs['extra'] = {}
        kwargs['extra']['agent_id'] = self.extra['agent_id']
        
        # Add request_id if available in context
        if hasattr(self, 'request_id'):
            kwargs['extra']['request_id'] = self.request_id
        
        return msg, kwargs


def setup_logging(
    log_level: str = 'INFO',
    log_file: str = None,
    json_output: bool = True
) -> None:
    """
    Set up centralized logging configuration
    
    Args:
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_file: Optional log file path
        json_output: Whether to output logs in JSON format
    """
    
    # Create logs directory if it doesn't exist
    if log_file:
        log_path = Path(log_file)
        log_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Base configuration
    config = {
        'version': 1,
        'disable_existing_loggers': False,
        'formatters': {
            'structured': {
                '()': StructuredFormatter,
            },
            'standard': {
                'format': '%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s',
                'datefmt': '%Y-%m-%d %H:%M:%S'
            }
        },
        'handlers': {
            'console': {
                'class': 'logging.StreamHandler',
                'level': log_level,
                'formatter': 'structured' if json_output else 'standard',
                'stream': 'ext://sys.stdout'
            }
        },
        'loggers': {
            'procurement': {
                'level': log_level,
                'handlers': ['console'],
                'propagate': False
            },
            'agents': {
                'level': log_level,
                'handlers': ['console'],
                'propagate': False
            },
            'api': {
                'level': log_level,
                'handlers': ['console'],
                'propagate': False
            },
            'integrations': {
                'level': log_level,
                'handlers': ['console'],
                'propagate': False
            }
        },
        'root': {
            'level': 'WARNING',
            'handlers': ['console']
        }
    }
    
    # Add file handler if specified
    if log_file:
        config['handlers']['file'] = {
            'class': 'logging.handlers.RotatingFileHandler',
            'level': log_level,
            'formatter': 'structured' if json_output else 'standard',
            'filename': log_file,
            'maxBytes': 10485760,  # 10MB
            'backupCount': 5
        }
        
        for logger in config['loggers'].values():
            logger['handlers'].append('file')
        config['root']['handlers'].append('file')
    
    # Apply configuration
    logging.config.dictConfig(config)


def get_logger(name: str, agent_id: str = None) -> logging.Logger:
    """
    Get a logger instance with optional agent context
    
    Args:
        name: Logger name (usually __name__)
        agent_id: Optional agent ID for context
    
    Returns:
        Logger or AgentLoggerAdapter instance
    """
    logger = logging.getLogger(name)
    
    if agent_id:
        return AgentLoggerAdapter(logger, agent_id)
    
    return logger


# Performance logging decorator
def log_performance(logger: logging.Logger = None):
    """Decorator to log function performance metrics"""
    import functools
    import time
    
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            nonlocal logger
            if logger is None:
                logger = logging.getLogger(func.__module__)
            
            start_time = time.time()
            
            try:
                result = func(*args, **kwargs)
                duration = time.time() - start_time
                
                logger.info(
                    f"Function {func.__name__} completed",
                    extra={
                        'function': func.__name__,
                        'duration_seconds': duration,
                        'status': 'success'
                    }
                )
                return result
                
            except Exception as e:
                duration = time.time() - start_time
                
                logger.error(
                    f"Function {func.__name__} failed",
                    extra={
                        'function': func.__name__,
                        'duration_seconds': duration,
                        'status': 'error',
                        'error_type': type(e).__name__,
                        'error_message': str(e)
                    },
                    exc_info=True
                )
                raise
        
        return wrapper
    return decorator


# Async performance logging decorator
def log_performance_async(logger: logging.Logger = None):
    """Decorator to log async function performance metrics"""
    import functools
    import time
    import asyncio
    
    def decorator(func):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            nonlocal logger
            if logger is None:
                logger = logging.getLogger(func.__module__)
            
            start_time = time.time()
            
            try:
                result = await func(*args, **kwargs)
                duration = time.time() - start_time
                
                logger.info(
                    f"Async function {func.__name__} completed",
                    extra={
                        'function': func.__name__,
                        'duration_seconds': duration,
                        'status': 'success'
                    }
                )
                return result
                
            except Exception as e:
                duration = time.time() - start_time
                
                logger.error(
                    f"Async function {func.__name__} failed",
                    extra={
                        'function': func.__name__,
                        'duration_seconds': duration,
                        'status': 'error',
                        'error_type': type(e).__name__,
                        'error_message': str(e)
                    },
                    exc_info=True
                )
                raise
        
        return wrapper
    return decorator