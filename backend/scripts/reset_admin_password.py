import asyncio
import sys
import os

# Add the backend directory to the python path so we can import app modules
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.all_models import AdminUser
from app.core.security import hash_password

async def reset_password():
    email = "admin@converso.com"
    new_password = "123&Icandoit"
    
    print(f"Resetting password for {email}...")
    
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(AdminUser).filter(AdminUser.email == email))
        user = result.scalars().first()
        
        if not user:
            print(f"Error: User {email} not found.")
            return
            
        print(f"User found: {user.id}")
        user.password_hash = hash_password(new_password)
        await db.commit()
        print("Password updated successfully.")

if __name__ == "__main__":
    asyncio.run(reset_password())
