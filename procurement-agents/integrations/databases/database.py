"""Database connection and session management"""

import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool

from .models import Base


def get_database_url(async_mode: bool = True) -> str:
    """Get database URL from environment"""
    url = os.getenv("DATABASE_URL", "postgresql://procurement:procurement123@localhost:5432/procurement")
    
    if async_mode and url.startswith("postgresql://"):
        # Convert to async URL for asyncpg
        url = url.replace("postgresql://", "postgresql+asyncpg://")
    elif not async_mode and url.startswith("postgresql+asyncpg://"):
        # Convert back to sync URL
        url = url.replace("postgresql+asyncpg://", "postgresql://")
    
    return url


# Async engine for FastAPI
async_engine = create_async_engine(
    get_database_url(async_mode=True),
    echo=os.getenv("ENVIRONMENT", "production") == "development",
    poolclass=NullPool,  # Use NullPool for better connection management
)

# Async session factory
AsyncSessionLocal = sessionmaker(
    async_engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# Sync engine for migrations and scripts
sync_engine = create_engine(
    get_database_url(async_mode=False),
    echo=os.getenv("ENVIRONMENT", "production") == "development",
    pool_pre_ping=True,
    pool_size=20,
    max_overflow=40
)

# Sync session factory
SessionLocal = sessionmaker(
    bind=sync_engine,
    autocommit=False,
    autoflush=False
)


@asynccontextmanager
async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """Get async database session"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


def get_sync_db_session():
    """Get sync database session"""
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


async def init_database():
    """Initialize database tables"""
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


def init_database_sync():
    """Initialize database tables synchronously"""
    Base.metadata.create_all(bind=sync_engine)