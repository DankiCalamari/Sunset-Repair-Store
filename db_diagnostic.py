#!/usr/bin/env python3
"""
Database diagnostic tool for Sunset Repair Shop ERP

Usage:
  python3 db_diagnostic.py --check-users
  python3 db_diagnostic.py --reset-db
  python3 db_diagnostic.py --create-test-user <email> <password>
"""

import os
import sys
from datetime import datetime, timezone
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy import select, text, func

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from app.models.business import Business, User
from app.core.security import hash_password


async def get_db_session():
    """Create an async database session"""
    database_url = os.getenv(
        'DATABASE_URL',
        'postgresql+asyncpg://sunset:sunset_dev_password@localhost:5432/sunset_erp'
    )
    engine = create_async_engine(database_url)
    SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    return SessionLocal()


async def check_users():
    """Check what users exist in the database"""
    db = await get_db_session()
    try:
        # Check businesses
        result = await db.execute(select(Business))
        businesses = result.scalars().all()
        
        print("=== BUSINESSES ===")
        if businesses:
            for biz in businesses:
                print(f"  ID: {biz.id}")
                print(f"  Name: {biz.name}")
                print(f"  Slug: {biz.slug}")
                print()
        else:
            print("  No businesses found - setup not completed")
            return
        
        # Check users
        result = await db.execute(select(User))
        users = result.scalars().all()
        
        print("=== USERS ===")
        if users:
            for user in users:
                print(f"  ID: {user.id}")
                print(f"  Email: {user.email}")
                print(f"  Name: {user.full_name}")
                print(f"  Role: {user.role}")
                print(f"  Active: {user.is_active}")
                print(f"  Business ID: {user.business_id}")
                print()
        else:
            print("  No users found - database may be corrupted")
    finally:
        await db.close()


async def reset_database():
    """Reset the database by dropping and recreating schema"""
    database_url = os.getenv(
        'DATABASE_URL',
        'postgresql+asyncpg://sunset:sunset_dev_password@localhost:5432/sunset_erp'
    )
    
    print("WARNING: This will delete all data!")
    confirm = input("Type 'YES' to confirm database reset: ")
    
    if confirm != "YES":
        print("Reset cancelled")
        return
    
    engine = create_async_engine(database_url)
    
    async with engine.begin() as conn:
        # Drop all existing tables
        await conn.execute(text("DROP SCHEMA public CASCADE"))
        await conn.execute(text("CREATE SCHEMA public"))
        
        # Re-enable extensions
        await conn.execute(text('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"'))
        await conn.execute(text('CREATE EXTENSION IF NOT EXISTS "pg_trgm"'))
    
    print("✓ Database reset complete")
    print("✓ Next: Navigate to http://localhost:5173/setup to complete initial setup")
    
    await engine.dispose()


async def create_test_user(email: str, password: str):
    """Create a test user (for existing business)"""
    db = await get_db_session()
    try:
        # Check if business exists
        result = await db.execute(select(Business))
        business = result.scalar_one_or_none()
        
        if not business:
            print("ERROR: No business found. Run setup first.")
            return
        
        # Check if user already exists
        result = await db.execute(select(User).where(User.email == email))
        existing = result.scalar_one_or_none()
        
        if existing:
            print(f"ERROR: User {email} already exists")
            return
        
        # Create new user
        user = User(
            business_id=business.id,
            email=email,
            password_hash=hash_password(password),
            full_name="Test User",
            role="owner",
            is_active=True,
        )
        db.add(user)
        await db.commit()
        
        print(f"✓ Created user: {email}")
        print(f"✓ Password: {password}")
        print(f"✓ Login at: http://localhost:5173/login")
    finally:
        await db.close()


async def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return
    
    command = sys.argv[1]
    
    if command == "--check-users":
        await check_users()
    elif command == "--reset-db":
        await reset_database()
    elif command == "--create-test-user" and len(sys.argv) == 4:
        email = sys.argv[2]
        password = sys.argv[3]
        await create_test_user(email, password)
    else:
        print(__doc__)


if __name__ == "__main__":
    asyncio.run(main())
