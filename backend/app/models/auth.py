"""
Authentication and Role-Based Access Control Models for ResQGrid AI.
"""

from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field

class UserRole(str, Enum):
    ADMIN = "admin"
    EMERGENCY_COORDINATOR = "emergency_coordinator"
    DISPATCHER = "dispatcher"
    MEDICAL_COORDINATOR = "medical_coordinator"
    ANALYST = "analyst"

class User(BaseModel):
    id: str
    username: str
    full_name: str
    role: UserRole
    organization: str = "IFRC - Odisha Disaster Response"
    email: str
    permissions: List[str] = Field(default_factory=list)
    is_active: bool = True

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    token: str
    token_type: str = "bearer"
    user: User
    expires_in_sec: int = 86400
