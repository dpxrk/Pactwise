"""Database initialization script with sample data"""

import asyncio
import sys
from pathlib import Path
from datetime import datetime, timedelta
import random

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent))

from sqlalchemy.ext.asyncio import AsyncSession
from integrations.databases.database import async_engine, get_db_session
from integrations.databases.models import Base, Vendor, VendorStatus
from api.auth.models import User, Role, Permission, create_default_roles_and_permissions


async def create_tables():
    """Create all database tables"""
    async with async_engine.begin() as conn:
        # Drop all tables (careful in production!)
        # await conn.run_sync(Base.metadata.drop_all)
        
        # Create all tables
        await conn.run_sync(Base.metadata.create_all)
        print("✓ Database tables created")


async def create_default_users(db: AsyncSession):
    """Create default users for testing"""
    
    # Get default roles and permissions
    default_permissions, default_roles = create_default_roles_and_permissions()
    
    # Create permissions
    permissions = {}
    for perm_data in default_permissions:
        permission = Permission(**perm_data)
        db.add(permission)
        permissions[perm_data["name"]] = permission
    
    await db.flush()
    print(f"✓ Created {len(permissions)} permissions")
    
    # Create roles with permissions
    roles = {}
    for role_data in default_roles:
        role_permissions = role_data.pop("permissions", [])
        role = Role(**role_data)
        
        # Add permissions to role
        for perm_name in role_permissions:
            if perm_name in permissions:
                role.permissions.append(permissions[perm_name])
        
        db.add(role)
        roles[role_data["name"]] = role
    
    await db.flush()
    print(f"✓ Created {len(roles)} roles")
    
    # Create internal team users
    test_users = [
        {
            "username": "admin",
            "email": "admin@company.com",
            "full_name": "System Administrator",
            "department": "IT",
            "is_superuser": True,
            "roles": ["admin"],
            "password": "admin123!@#"
        },
        {
            "username": "operations_lead",
            "email": "ops.lead@company.com",
            "full_name": "Operations Lead",
            "department": "Operations",
            "roles": ["operations_manager"],
            "password": "ops123!@#"
        },
        {
            "username": "project_manager",
            "email": "pm@company.com",
            "full_name": "Project Manager",
            "department": "Project Management",
            "roles": ["project_manager"],
            "password": "pm123!@#"
        },
        {
            "username": "finance_lead",
            "email": "finance@company.com",
            "full_name": "Finance Lead",
            "department": "Finance",
            "roles": ["finance_manager"],
            "password": "finance123!@#"
        },
        {
            "username": "legal_team",
            "email": "legal@company.com",
            "full_name": "Legal Team Member",
            "department": "Legal",
            "roles": ["legal_reviewer"],
            "password": "legal123!@#"
        }
    ]
    
    for user_data in test_users:
        user_roles = user_data.pop("roles", [])
        password = user_data.pop("password")
        
        user = User(**user_data)
        user.set_password(password)
        user.status = "active"
        user.email_verified = True
        
        # Add roles
        for role_name in user_roles:
            if role_name in roles:
                user.roles.append(roles[role_name])
        
        db.add(user)
    
    await db.commit()
    print(f"✓ Created {len(test_users)} test users")


async def create_sample_vendors(db: AsyncSession):
    """Create sample vendor data"""
    
    sample_vendors = [
        {
            "vendor_code": "VND-001",
            "name": "TechSupplies Inc.",
            "tax_id": "12-3456789",
            "category": "electronics",
            "vendor_type": "supplier",
            "status": VendorStatus.ACTIVE,
            "performance_score": 0.85,
            "risk_score": 0.25,
            "payment_terms": "net_30",
            "currency": "USD",
            "credit_limit": 100000,
            "address": {
                "street": "123 Tech Street",
                "city": "San Francisco",
                "state": "CA",
                "country": "US",
                "postal_code": "94105"
            },
            "email": "contact@techsupplies.com",
            "phone": "+1-415-555-0100",
            "certifications": [
                {"type": "iso_9001", "expiry_date": (datetime.utcnow() + timedelta(days=365)).isoformat()},
                {"type": "iso_27001", "expiry_date": (datetime.utcnow() + timedelta(days=300)).isoformat()}
            ]
        },
        {
            "vendor_code": "VND-002",
            "name": "Global Manufacturing Co.",
            "tax_id": "98-7654321",
            "category": "raw_materials",
            "vendor_type": "manufacturer",
            "status": VendorStatus.ACTIVE,
            "performance_score": 0.92,
            "risk_score": 0.15,
            "payment_terms": "net_45",
            "currency": "USD",
            "credit_limit": 250000,
            "address": {
                "street": "456 Industrial Blvd",
                "city": "Detroit",
                "state": "MI",
                "country": "US",
                "postal_code": "48201"
            },
            "email": "sales@globalmanufacturing.com",
            "phone": "+1-313-555-0200",
            "preferred_vendor": True
        },
        {
            "vendor_code": "VND-003",
            "name": "Office Essentials Ltd.",
            "tax_id": "55-1234567",
            "category": "office_supplies",
            "vendor_type": "distributor",
            "status": VendorStatus.ACTIVE,
            "performance_score": 0.78,
            "risk_score": 0.30,
            "payment_terms": "net_15",
            "currency": "USD",
            "credit_limit": 50000,
            "address": {
                "street": "789 Commerce Way",
                "city": "Chicago",
                "state": "IL",
                "country": "US",
                "postal_code": "60601"
            },
            "email": "orders@officeessentials.com",
            "phone": "+1-312-555-0300"
        },
        {
            "vendor_code": "VND-004",
            "name": "Premium Logistics",
            "tax_id": "77-9876543",
            "category": "logistics",
            "vendor_type": "service_provider",
            "status": VendorStatus.ACTIVE,
            "performance_score": 0.88,
            "risk_score": 0.20,
            "payment_terms": "net_30",
            "currency": "USD",
            "credit_limit": 150000,
            "address": {
                "street": "321 Transport Ave",
                "city": "Los Angeles",
                "state": "CA",
                "country": "US",
                "postal_code": "90001"
            },
            "email": "dispatch@premiumlogistics.com",
            "phone": "+1-213-555-0400",
            "capabilities": ["express_delivery", "international_shipping", "warehousing"]
        },
        {
            "vendor_code": "VND-005",
            "name": "Safety Equipment Pro",
            "tax_id": "33-4567890",
            "category": "safety_equipment",
            "vendor_type": "specialist",
            "status": VendorStatus.UNDER_REVIEW,
            "performance_score": 0.65,
            "risk_score": 0.45,
            "payment_terms": "prepayment",
            "currency": "USD",
            "credit_limit": 25000,
            "address": {
                "street": "555 Safety Blvd",
                "city": "Houston",
                "state": "TX",
                "country": "US",
                "postal_code": "77001"
            },
            "email": "info@safetyequipmentpro.com",
            "phone": "+1-713-555-0500"
        }
    ]
    
    for vendor_data in sample_vendors:
        vendor = Vendor(**vendor_data)
        vendor.onboarding_date = datetime.utcnow() - timedelta(days=random.randint(30, 365))
        vendor.last_evaluation_date = datetime.utcnow() - timedelta(days=random.randint(1, 30))
        
        # Add some metadata
        vendor.metadata = {
            "preferred_contact_method": random.choice(["email", "phone"]),
            "account_manager": f"manager_{random.randint(1, 5)}",
            "contract_expiry": (datetime.utcnow() + timedelta(days=random.randint(90, 730))).isoformat()
        }
        
        db.add(vendor)
    
    await db.commit()
    print(f"✓ Created {len(sample_vendors)} sample vendors")


async def main():
    """Main initialization function"""
    print("🚀 Initializing Procurement Agents Database...")
    
    try:
        # Create tables
        await create_tables()
        
        # Create sample data
        async with get_db_session() as db:
            # Check if data already exists
            existing_users = await db.execute("SELECT COUNT(*) FROM users")
            if existing_users.scalar() > 0:
                print("⚠️  Database already contains data. Skipping initialization.")
                return
            
            await create_default_users(db)
            await create_sample_vendors(db)
        
        print("\n✅ Database initialization complete!")
        print("\n📋 Internal Team Users Created:")
        print("  • admin / admin123!@# (System Administrator)")
        print("  • operations_lead / ops123!@# (Operations Lead)")
        print("  • project_manager / pm123!@# (Project Manager)")
        print("  • finance_lead / finance123!@# (Finance Lead)")
        print("  • legal_team / legal123!@# (Legal Team Member)")
        
    except Exception as e:
        print(f"\n❌ Error during initialization: {str(e)}")
        raise


if __name__ == "__main__":
    asyncio.run(main())