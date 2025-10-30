"""Savings Tracker API Routes"""

from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from integrations.databases.database import get_db_session
from integrations.databases.models import (
    SavingsCategory,
    SavingsInitiative,
    SavingsFiscalYear,
    MonthlySpend,
)

router = APIRouter(prefix="/api/savings", tags=["Savings Tracker"])


# Pydantic Models
class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    fiscal_year: str = Field(..., min_length=4, max_length=4)
    description: Optional[str] = None


class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    display_order: Optional[int] = None


class CategoryResponse(BaseModel):
    id: int
    name: str
    fiscal_year: str
    description: Optional[str]
    total_amount: float
    initiative_count: int
    percentage: float = 0.0
    display_order: int
    active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class InitiativeCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    description: Optional[str] = None
    fiscal_year: str = Field(..., min_length=4, max_length=4)
    category_id: int
    status: str = "proposed"
    amount: Decimal
    vendor_id: Optional[int] = None
    vendor_name: Optional[str] = None
    initiated_date: datetime
    target_date: Optional[datetime] = None
    owner_id: Optional[str] = None
    owner_name: Optional[str] = None
    department: Optional[str] = None
    notes: Optional[str] = None


class InitiativeUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    description: Optional[str] = None
    category_id: Optional[int] = None
    status: Optional[str] = None
    amount: Optional[Decimal] = None
    realized_amount: Optional[Decimal] = None
    vendor_id: Optional[int] = None
    vendor_name: Optional[str] = None
    target_date: Optional[datetime] = None
    realized_date: Optional[datetime] = None
    owner_name: Optional[str] = None
    department: Optional[str] = None
    notes: Optional[str] = None


class InitiativeResponse(BaseModel):
    id: int
    initiative_id: str
    title: str
    description: Optional[str]
    fiscal_year: str
    category_id: int
    status: str
    amount: float
    realized_amount: float
    vendor_name: Optional[str]
    initiated_date: datetime
    target_date: Optional[datetime]
    realized_date: Optional[datetime]
    owner_name: Optional[str]
    department: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class FiscalYearCreate(BaseModel):
    fiscal_year: str = Field(..., min_length=4, max_length=4)
    annual_target: Decimal
    start_date: datetime
    end_date: datetime
    quarterly_targets: Optional[dict] = None


class FiscalYearResponse(BaseModel):
    id: int
    fiscal_year: str
    annual_target: float
    ytd_actual: float
    projected_eoy: float
    active: bool
    locked: bool
    start_date: datetime
    end_date: datetime

    class Config:
        from_attributes = True


class MonthlyTrendResponse(BaseModel):
    month: int
    month_name: str
    savings_amount: float
    total_spend: float

    class Config:
        from_attributes = True


class SavingsDashboardResponse(BaseModel):
    fiscal_year: str
    total_savings: float
    annual_target: float
    ytd_actual: float
    projected_eoy: float
    active_initiatives: int
    categories: List[CategoryResponse]
    recent_initiatives: List[InitiativeResponse]
    monthly_trend: List[MonthlyTrendResponse]


# Helper Functions
async def calculate_category_metrics(
    session: AsyncSession, 
    category_id: int, 
    fiscal_year: str
):
    """Recalculate category metrics from initiatives"""
    result = await session.execute(
        select(
            func.sum(SavingsInitiative.realized_amount).label('total'),
            func.count(SavingsInitiative.id).label('count')
        )
        .where(
            SavingsInitiative.category_id == category_id,
            SavingsInitiative.fiscal_year == fiscal_year,
            SavingsInitiative.status == 'realized'
        )
    )
    row = result.first()
    
    return {
        'total_amount': float(row.total or 0),
        'initiative_count': row.count or 0
    }


async def generate_initiative_id(session: AsyncSession, fiscal_year: str) -> str:
    """Generate unique initiative ID"""
    result = await session.execute(
        select(func.count(SavingsInitiative.id))
        .where(SavingsInitiative.fiscal_year == fiscal_year)
    )
    count = result.scalar() or 0
    return f"SAV-{fiscal_year}-{str(count + 1).zfill(3)}"


# Category Endpoints
@router.get("/categories", response_model=List[CategoryResponse])
async def get_categories(
    fiscal_year: str = Query(..., description="Fiscal year (e.g., 2025)"),
    session: AsyncSession = Depends(get_db_session)
):
    """Get all savings categories for a fiscal year"""
    async with session:
        result = await session.execute(
            select(SavingsCategory)
            .where(
                SavingsCategory.fiscal_year == fiscal_year,
                SavingsCategory.active == True
            )
            .order_by(SavingsCategory.display_order, SavingsCategory.name)
        )
        categories = result.scalars().all()
        
        # Calculate total for percentage
        total_savings = sum(float(cat.total_amount) for cat in categories)
        
        # Add percentage to each category
        response_categories = []
        for cat in categories:
            cat_dict = CategoryResponse.from_orm(cat).dict()
            if total_savings > 0:
                cat_dict['percentage'] = (float(cat.total_amount) / total_savings) * 100
            response_categories.append(CategoryResponse(**cat_dict))
        
        return response_categories


@router.post("/categories", response_model=CategoryResponse, status_code=201)
async def create_category(
    category: CategoryCreate,
    session: AsyncSession = Depends(get_db_session)
):
    """Create a new savings category"""
    async with session:
        # Check for duplicate
        existing = await session.execute(
            select(SavingsCategory)
            .where(
                SavingsCategory.name == category.name,
                SavingsCategory.fiscal_year == category.fiscal_year
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=400,
                detail=f"Category '{category.name}' already exists for fiscal year {category.fiscal_year}"
            )
        
        # Get max display order
        result = await session.execute(
            select(func.max(SavingsCategory.display_order))
            .where(SavingsCategory.fiscal_year == category.fiscal_year)
        )
        max_order = result.scalar() or 0
        
        # Create category
        db_category = SavingsCategory(
            **category.dict(),
            display_order=max_order + 1
        )
        session.add(db_category)
        await session.commit()
        await session.refresh(db_category)
        
        return CategoryResponse.from_orm(db_category)


@router.put("/categories/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: int,
    category: CategoryUpdate,
    session: AsyncSession = Depends(get_db_session)
):
    """Update a savings category"""
    async with session:
        result = await session.execute(
            select(SavingsCategory).where(SavingsCategory.id == category_id)
        )
        db_category = result.scalar_one_or_none()
        
        if not db_category:
            raise HTTPException(status_code=404, detail="Category not found")
        
        # Update fields
        update_data = category.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_category, field, value)
        
        await session.commit()
        await session.refresh(db_category)
        
        return CategoryResponse.from_orm(db_category)


@router.delete("/categories/{category_id}", status_code=204)
async def delete_category(
    category_id: int,
    session: AsyncSession = Depends(get_db_session)
):
    """Delete a savings category"""
    async with session:
        result = await session.execute(
            select(SavingsCategory).where(SavingsCategory.id == category_id)
        )
        db_category = result.scalar_one_or_none()
        
        if not db_category:
            raise HTTPException(status_code=404, detail="Category not found")
        
        # Check if category has initiatives
        initiatives = await session.execute(
            select(func.count(SavingsInitiative.id))
            .where(SavingsInitiative.category_id == category_id)
        )
        if initiatives.scalar() > 0:
            # Soft delete
            db_category.active = False
        else:
            # Hard delete if no initiatives
            await session.delete(db_category)
        
        await session.commit()


# Initiative Endpoints
@router.get("/initiatives", response_model=List[InitiativeResponse])
async def get_initiatives(
    fiscal_year: str = Query(..., description="Fiscal year"),
    category_id: Optional[int] = Query(None, description="Filter by category"),
    status: Optional[str] = Query(None, description="Filter by status"),
    limit: int = Query(50, le=200),
    session: AsyncSession = Depends(get_db_session)
):
    """Get savings initiatives"""
    async with session:
        query = select(SavingsInitiative).where(
            SavingsInitiative.fiscal_year == fiscal_year
        )
        
        if category_id:
            query = query.where(SavingsInitiative.category_id == category_id)
        if status:
            query = query.where(SavingsInitiative.status == status)
        
        query = query.order_by(SavingsInitiative.initiated_date.desc()).limit(limit)
        
        result = await session.execute(query)
        initiatives = result.scalars().all()
        
        return [InitiativeResponse.from_orm(init) for init in initiatives]


@router.post("/initiatives", response_model=InitiativeResponse, status_code=201)
async def create_initiative(
    initiative: InitiativeCreate,
    session: AsyncSession = Depends(get_db_session)
):
    """Create a new savings initiative"""
    async with session:
        # Verify category exists
        category = await session.execute(
            select(SavingsCategory).where(SavingsCategory.id == initiative.category_id)
        )
        if not category.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Category not found")
        
        # Generate initiative ID
        initiative_id = await generate_initiative_id(session, initiative.fiscal_year)
        
        # Create initiative
        db_initiative = SavingsInitiative(
            initiative_id=initiative_id,
            **initiative.dict()
        )
        session.add(db_initiative)
        
        # Update category metrics if realized
        if initiative.status == 'realized':
            metrics = await calculate_category_metrics(
                session, 
                initiative.category_id, 
                initiative.fiscal_year
            )
            category_obj = await session.get(SavingsCategory, initiative.category_id)
            category_obj.total_amount = metrics['total_amount']
            category_obj.initiative_count = metrics['initiative_count']
        
        await session.commit()
        await session.refresh(db_initiative)
        
        return InitiativeResponse.from_orm(db_initiative)


@router.put("/initiatives/{initiative_id}", response_model=InitiativeResponse)
async def update_initiative(
    initiative_id: int,
    initiative: InitiativeUpdate,
    session: AsyncSession = Depends(get_db_session)
):
    """Update a savings initiative"""
    async with session:
        result = await session.execute(
            select(SavingsInitiative).where(SavingsInitiative.id == initiative_id)
        )
        db_initiative = result.scalar_one_or_none()
        
        if not db_initiative:
            raise HTTPException(status_code=404, detail="Initiative not found")
        
        old_category_id = db_initiative.category_id
        old_status = db_initiative.status
        
        # Update fields
        update_data = initiative.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_initiative, field, value)
        
        # Recalculate category metrics if changed
        if (initiative.status and initiative.status != old_status) or \
           (initiative.category_id and initiative.category_id != old_category_id):
            # Update old category
            metrics = await calculate_category_metrics(
                session, old_category_id, db_initiative.fiscal_year
            )
            old_category = await session.get(SavingsCategory, old_category_id)
            old_category.total_amount = metrics['total_amount']
            old_category.initiative_count = metrics['initiative_count']
            
            # Update new category if changed
            if initiative.category_id and initiative.category_id != old_category_id:
                metrics = await calculate_category_metrics(
                    session, initiative.category_id, db_initiative.fiscal_year
                )
                new_category = await session.get(SavingsCategory, initiative.category_id)
                new_category.total_amount = metrics['total_amount']
                new_category.initiative_count = metrics['initiative_count']
        
        await session.commit()
        await session.refresh(db_initiative)
        
        return InitiativeResponse.from_orm(db_initiative)


@router.delete("/initiatives/{initiative_id}", status_code=204)
async def delete_initiative(
    initiative_id: int,
    session: AsyncSession = Depends(get_db_session)
):
    """Delete a savings initiative"""
    async with session:
        result = await session.execute(
            select(SavingsInitiative).where(SavingsInitiative.id == initiative_id)
        )
        db_initiative = result.scalar_one_or_none()
        
        if not db_initiative:
            raise HTTPException(status_code=404, detail="Initiative not found")
        
        category_id = db_initiative.category_id
        fiscal_year = db_initiative.fiscal_year
        
        await session.delete(db_initiative)
        
        # Recalculate category metrics
        metrics = await calculate_category_metrics(session, category_id, fiscal_year)
        category = await session.get(SavingsCategory, category_id)
        category.total_amount = metrics['total_amount']
        category.initiative_count = metrics['initiative_count']
        
        await session.commit()


# Fiscal Year Endpoints
@router.get("/fiscal-years", response_model=List[FiscalYearResponse])
async def get_fiscal_years(
    session: AsyncSession = Depends(get_db_session)
):
    """Get all fiscal years"""
    async with session:
        result = await session.execute(
            select(SavingsFiscalYear).order_by(SavingsFiscalYear.fiscal_year.desc())
        )
        fiscal_years = result.scalars().all()
        return [FiscalYearResponse.from_orm(fy) for fy in fiscal_years]


@router.post("/fiscal-years", response_model=FiscalYearResponse, status_code=201)
async def create_fiscal_year(
    fiscal_year: FiscalYearCreate,
    session: AsyncSession = Depends(get_db_session)
):
    """Create a new fiscal year"""
    async with session:
        # Check for duplicate
        existing = await session.execute(
            select(SavingsFiscalYear)
            .where(SavingsFiscalYear.fiscal_year == fiscal_year.fiscal_year)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=400,
                detail=f"Fiscal year {fiscal_year.fiscal_year} already exists"
            )
        
        db_fiscal_year = SavingsFiscalYear(**fiscal_year.dict())
        session.add(db_fiscal_year)
        await session.commit()
        await session.refresh(db_fiscal_year)
        
        return FiscalYearResponse.from_orm(db_fiscal_year)


# Dashboard Endpoint
@router.get("/dashboard", response_model=SavingsDashboardResponse)
async def get_dashboard(
    fiscal_year: str = Query(..., description="Fiscal year"),
    session: AsyncSession = Depends(get_db_session)
):
    """Get complete savings dashboard data"""
    async with session:
        # Get fiscal year config
        fy_result = await session.execute(
            select(SavingsFiscalYear)
            .where(SavingsFiscalYear.fiscal_year == fiscal_year)
        )
        fiscal_year_obj = fy_result.scalar_one_or_none()
        
        # Get categories
        categories_result = await session.execute(
            select(SavingsCategory)
            .where(
                SavingsCategory.fiscal_year == fiscal_year,
                SavingsCategory.active == True
            )
            .order_by(SavingsCategory.display_order)
        )
        categories = categories_result.scalars().all()
        
        # Calculate total savings
        total_savings = sum(float(cat.total_amount) for cat in categories)
        
        # Add percentages
        categories_with_pct = []
        for cat in categories:
            cat_dict = CategoryResponse.from_orm(cat).dict()
            if total_savings > 0:
                cat_dict['percentage'] = (float(cat.total_amount) / total_savings) * 100
            categories_with_pct.append(CategoryResponse(**cat_dict))
        
        # Get recent initiatives
        initiatives_result = await session.execute(
            select(SavingsInitiative)
            .where(SavingsInitiative.fiscal_year == fiscal_year)
            .order_by(SavingsInitiative.created_at.desc())
            .limit(10)
        )
        initiatives = initiatives_result.scalars().all()
        
        # Get monthly trend
        monthly_result = await session.execute(
            select(MonthlySpend)
            .where(MonthlySpend.fiscal_year == fiscal_year)
            .order_by(MonthlySpend.month)
        )
        monthly_data = monthly_result.scalars().all()
        
        # Count active initiatives
        active_count = await session.execute(
            select(func.count(SavingsInitiative.id))
            .where(
                SavingsInitiative.fiscal_year == fiscal_year,
                SavingsInitiative.status.in_(['proposed', 'in_progress'])
            )
        )
        
        return SavingsDashboardResponse(
            fiscal_year=fiscal_year,
            total_savings=total_savings,
            annual_target=float(fiscal_year_obj.annual_target) if fiscal_year_obj else 0,
            ytd_actual=float(fiscal_year_obj.ytd_actual) if fiscal_year_obj else 0,
            projected_eoy=float(fiscal_year_obj.projected_eoy) if fiscal_year_obj else 0,
            active_initiatives=active_count.scalar() or 0,
            categories=categories_with_pct,
            recent_initiatives=[InitiativeResponse.from_orm(init) for init in initiatives],
            monthly_trend=[MonthlyTrendResponse.from_orm(m) for m in monthly_data]
        )


# Monthly Spend Endpoints
@router.put("/monthly-spend/{fiscal_year}/{month}")
async def update_monthly_spend(
    fiscal_year: str,
    month: int,
    savings_amount: Decimal,
    session: AsyncSession = Depends(get_db_session)
):
    """Update monthly savings amount"""
    if month < 1 or month > 12:
        raise HTTPException(status_code=400, detail="Month must be between 1 and 12")
    
    async with session:
        # Get or create monthly record
        result = await session.execute(
            select(MonthlySpend)
            .where(
                MonthlySpend.fiscal_year == fiscal_year,
                MonthlySpend.month == month
            )
        )
        monthly = result.scalar_one_or_none()
        
        month_names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        
        if not monthly:
            monthly = MonthlySpend(
                fiscal_year=fiscal_year,
                month=month,
                month_name=month_names[month - 1],
                savings_amount=savings_amount
            )
            session.add(monthly)
        else:
            monthly.savings_amount = savings_amount
        
        await session.commit()
        
        return {"message": "Monthly spend updated successfully"}