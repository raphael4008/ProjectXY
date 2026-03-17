from datetime import datetime, timedelta
from typing import Optional, Union, Any
from jose import jwt
from passlib.context import CryptContext
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
ALGORITHM = "HS256"

def create_access_token(
    subject: Union[str, Any], 
    tenant_id: str,
    role: str = "viewer",
    expires_delta: timedelta = None
) -> str:
    """
    Generates a Zero-Trust JWT access token.
    Enforces Tenant Isolation by baking the TID directly into the token structure,
    making accidental cross-tenant data spillage impossible at the API gateway layer.
    """
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        # Ultra-short expiry for Defense platforms (15 mins default)
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {
        "exp": expire, 
        "sub": str(subject),
        "tenant_id": tenant_id,
        "role": role,
        "type": "access"
    }
    
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)
