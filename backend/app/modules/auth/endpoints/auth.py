from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.core import security
from app.core.config import settings
from app.models import models
from app.api import deps

# Use a mock session dependency for now, until we setup the real DB dependency
# In a real app we would use: get_db = deps.get_db
# For now we will mock the DB interaction for the router file creation, 
# but we will implement the actual DB dependency logic in deps.py next.

router = APIRouter()


@router.post("/access-token", response_model=dict)
async def login_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests.
    """
    # 1. Fetch User
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    
    # 2. Validate
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    
    # 3. Mint Token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": security.create_access_token(
            subject=user.email, 
            tenant_id=getattr(user, 'tenant_id', 'default_tenant'),
            role=getattr(user, 'role', 'viewer'),
            expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }

