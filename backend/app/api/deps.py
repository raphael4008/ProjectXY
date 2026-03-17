from typing import Generator, Optional
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from pydantic import ValidationError
from sqlalchemy.orm import Session
from app.core import security
from app.core.config import settings
from app.models.models import User
from app.infrastructure.session import get_db
from app.modules.zero_trust.zero_trust import zero_trust_engine

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/login/access-token")

def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
) -> User:
    """
    Validates JWT and retrieves the user from the Database.
    P0 Fix: Replaced mock dict with real SQLAlchemy query.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[security.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except (JWTError, ValidationError):
        raise credentials_exception
        
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
        
    # [ZERO TRUST MULTI-FACTOR EVALUATION (Phase 7)]
    client_ip = request.client.host if request.client else "127.0.0.1"
    device_fingerprint = request.headers.get("X-Device-Fingerprint", "unknown")
    
    zt_eval = zero_trust_engine.evaluate_session_context(
        user_id=str(user.id),
        client_ip=client_ip,
        device_fingerprint=device_fingerprint,
        expected_role=user.role
    )
    
    if not zt_eval.get("is_authorized"):
        raise HTTPException(
            status_code=403,
            detail=f"Zero Trust Policy Violation: {zt_eval.get('reason')}"
        )
        
    # [ENTERPRISE SAAS TIER ENFORCEMENT (Phase 11)]
    from app.modules.misc.services.enterprise import saas_manager
    # In production, fetch subscription tier from tenant table. Mocking 'ADVANCED' for demo.
    billing_tier = "ADVANCED" 
    
    # We could restrict login here entirely if the path requires a specific feature, 
    # but normally this is handled via a dedicated @requires_feature() dependency.
    user.billing_tier = billing_tier
        
    # Dynamically override the object role safely in memory (Does not commit to DB)
    user.dynamic_role = zt_eval.get("dynamic_role", user.role)
    
    return user

def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

def get_current_active_superuser(current_user: User = Depends(get_current_active_user)) -> User:
    # Use dynamically assessed role from Zero Trust Engine
    active_role = getattr(current_user, "dynamic_role", current_user.role)
    if active_role != "admin":
        raise HTTPException(
            status_code=403, detail="The user doesn't have enough privileges (Dynamic Eval failed)"
        )
    return current_user

