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


# ─────────────────────────────────────────────────────────────────────────────
# Intelligence Services DI Factories (org-scoped)
# ─────────────────────────────────────────────────────────────────────────────

def get_org_id_from_request(request: Request) -> str:
    """
    Extract org_id from request context (header or JWT claim).
    
    Priority:
    1. X-Org-ID header
    2. org_id claim in JWT token
    3. Default to 'default_org'
    """
    # Try header first
    org_id = request.headers.get("X-Org-ID")
    if org_id:
        return org_id
    
    # Try JWT claim
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if token:
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[security.ALGORITHM])
            org_id = payload.get("org_id")
            if org_id:
                return org_id
        except:
            pass
    
    # Default
    return "default_org"


def get_attribution_engine(
    current_user: User = Depends(get_current_active_user),
    request: Request = None
):
    """
    Returns an org-scoped AttributionEngine instance for threat actor correlation.
    
    Usage in endpoint:
        @router.post("/correlate")
        async def correlate(indicators: List[str], engine = Depends(get_attribution_engine)):
            return await engine.correlate_indicators(indicators)
    """
    from app.core.intelligence_di import get_di_container
    
    container = get_di_container()
    org_id = get_org_id_from_request(request) if request else "default_org"
    
    engine = container.get_attribution_engine(org_id=org_id)
    return engine


def get_microseg_service(
    current_user: User = Depends(get_current_active_user),
    request: Request = None
):
    """
    Returns an org-scoped MicrosegmentationService for automated containment.
    
    Usage in endpoint:
        @router.post("/isolate")
        async def isolate(host: str, service = Depends(get_microseg_service)):
            return await service.isolate_host(...)
    """
    from app.core.intelligence_di import get_di_container
    
    container = get_di_container()
    org_id = get_org_id_from_request(request) if request else "default_org"
    
    service = container.get_microseg_service(org_id=org_id)
    return service


def get_request_orchestrator(
    current_user: User = Depends(get_current_active_user),
    request: Request = None
):
    """
    Returns an org-scoped DistributedRequestOrchestrator for resilient API queries.
    
    Usage in endpoint:
        @router.post("/query")
        async def query(url: str, orchestrator = Depends(get_request_orchestrator)):
            return await orchestrator.request("GET", url)
    """
    from app.core.intelligence_di import get_di_container
    
    container = get_di_container()
    org_id = get_org_id_from_request(request) if request else "default_org"
    
    orchestrator = container.get_request_orchestrator(org_id=org_id)
    return orchestrator

