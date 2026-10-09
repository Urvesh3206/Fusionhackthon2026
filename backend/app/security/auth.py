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
        full_name="Team Delta (EOC Incident Commander)",
        role=UserRole.ADMIN,
        email="admin@resqgrid.in",
        permissions=["*"]
    ),
    "admin@resqgrid.in": User(
        id="usr_admin_01",
        username="admin",
        full_name="Team Delta (EOC Incident Commander)",
        role=UserRole.ADMIN,
        email="admin@resqgrid.in",
        permissions=["*"]
    ),
    "citizen": User(
        id="usr_patient_01",
        username="citizen",
        full_name="Rajesh Mohanty (Citizen / Patient)",
        role=UserRole.CITIZEN,
        email="citizen@resqgrid.in",
        permissions=["incidents:create", "incidents:read_own"]
    ),
    "patient": User(
        id="usr_patient_01",
        username="citizen",
        full_name="Rajesh Mohanty (Citizen / Patient)",
        role=UserRole.CITIZEN,
        email="citizen@resqgrid.in",
        permissions=["incidents:create", "incidents:read_own"]
    ),
    "citizen@resqgrid.in": User(
        id="usr_patient_01",
        username="citizen",
        full_name="Rajesh Mohanty (Citizen / Patient)",
        role=UserRole.CITIZEN,
        email="citizen@resqgrid.in",
        permissions=["incidents:create", "incidents:read_own"]
    ),
    "doctor": User(
        id="usr_med_01",
        username="doctor",
        full_name="Dr. Subrat Mishra (Chief Medical Officer)",
        role=UserRole.DOCTOR,
        email="doctor@resqgrid.in",
        permissions=["hospitals:update", "resources:manage", "triage:override"]
    ),
    "doctor@resqgrid.in": User(
        id="usr_med_01",
        username="doctor",
        full_name="Dr. Subrat Mishra (Chief Medical Officer)",
        role=UserRole.DOCTOR,
        email="doctor@resqgrid.in",
        permissions=["hospitals:update", "resources:manage", "triage:override"]
    ),
    "dr.senapati": User(
        id="usr_med_02",
        username="doctor",
        full_name="Dr. A. Senapati (Chief Triage Officer)",
        role=UserRole.DOCTOR,
        email="doctor@resqgrid.in",
        permissions=["hospitals:update", "resources:manage", "triage:override"]
    ),
    "coordinator": User(
        id="usr_coord_01",
        username="coordinator",
        full_name="Rajesh Mohapatra (Disaster Coordinator)",
        role=UserRole.EMERGENCY_COORDINATOR,
        email="coordinator@resqgrid.in",
        permissions=["scenarios:control", "evacuation:manage", "resources:allocate", "alerts:manage"]
    ),
    "dispatcher": User(
        id="usr_disp_01",
        username="dispatcher",
        full_name="Ananya Patnaik (Senior Dispatcher)",
        role=UserRole.DISPATCHER,
        email="dispatcher@resqgrid.in",
        permissions=["incidents:write", "vehicles:dispatch", "overrides:create"]
    )
}

def verify_token(authorization: Optional[str] = Header(None)) -> User:
    """
    Validates bearer token. In demo mode, accepts standard tokens or defaults to admin.
    """
    if not authorization:
        return DEMO_USERS["admin"]
    
    parts = authorization.split()
    if len(parts) == 2 and parts[0].lower() == "bearer":
        token = parts[1]
        for u in DEMO_USERS.values():
            if token == f"token_{u.username}" or token == u.username or token == "resqgrid-demo-token":
                return u
    return DEMO_USERS["admin"]
