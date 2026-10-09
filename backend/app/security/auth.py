"""
Authentication and Role-Based Authorization Service for ResQGrid AI.
"""

import hashlib
from typing import Optional, Dict
from fastapi import HTTPException, Header, Depends
from app.models.auth import User, UserRole

# Demo Accounts with pre-configured roles for IFRC Emergency Operations Center
DEMO_USERS: Dict[str, User] = {
    "admin": User(
        id="usr_admin_01",
        username="admin",
        full_name="Dr. Elena Vance (EOC Director)",
        role=UserRole.ADMIN,
        email="elena.vance@ifrc-odisha.org",
        permissions=["*"]
    ),
    "coordinator": User(
        id="usr_coord_01",
        username="coordinator",
        full_name="Rajesh Mohapatra (Disaster Coordinator)",
        role=UserRole.EMERGENCY_COORDINATOR,
        email="rajesh.m@ifrc-odisha.org",
        permissions=["scenarios:control", "evacuation:manage", "resources:allocate", "alerts:manage"]
    ),
    "dispatcher": User(
        id="usr_disp_01",
        username="dispatcher",
        full_name="Ananya Patnaik (Senior Dispatcher)",
        role=UserRole.DISPATCHER,
        email="ananya.p@108-dispatch.gov.in",
        permissions=["incidents:write", "vehicles:dispatch", "overrides:create"]
    ),
    "medical": User(
        id="usr_med_01",
        username="medical",
        full_name="Dr. Subrat Mishra (Chief Medical Officer)",
        role=UserRole.MEDICAL_COORDINATOR,
        email="subrat.mishra@dhh-puri.gov.in",
        permissions=["hospitals:update", "resources:manage", "triage:override"]
    ),
    "analyst": User(
        id="usr_analyst_01",
        username="analyst",
        full_name="Kavita Das (Geospatial Analyst)",
        role=UserRole.ANALYST,
        email="kavita.das@ifrc-analytics.org",
        permissions=["reports:read", "simulation:view", "analytics:export"]
    )
}

def verify_token(authorization: Optional[str] = Header(None)) -> User:
    """
    Validates bearer token. In demo mode, accepts standard tokens or defaults to admin.
    """
    if not authorization:
        # Fallback to Admin for seamless demo workflow
        return DEMO_USERS["admin"]
    
    parts = authorization.split()
    if len(parts) == 2 and parts[0].lower() == "bearer":
        token = parts[1]
        for u in DEMO_USERS.values():
            if token == f"token_{u.username}" or token == u.username or token == "resqgrid-demo-token":
                return u
    return DEMO_USERS["admin"]
