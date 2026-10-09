"""
Incident Management Models for ResQGrid AI.
"""

from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class IncidentPriority(str, Enum):
    CRITICAL = "Critical"
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"
    UNASSESSED = "Unassessed"

class IncidentStatus(str, Enum):
    REPORTED = "Reported"
    VERIFIED = "Verified"
    AWAITING_DISPATCH = "Awaiting dispatch"
    ASSIGNED = "Assigned"
    EN_ROUTE = "En route"
    AT_SCENE = "At scene"
    TRANSPORTING = "Transporting"
    RESOLVED = "Resolved"
    CANCELLED = "Cancelled"

class IncidentCreate(BaseModel):
    title: str
    incident_type: str = "Medical Emergency" # Flooding Trauma, Heat Stroke, Structural Collapse, Cardiac
    priority: IncidentPriority = IncidentPriority.HIGH
    location_name: str
    coordinates: List[float] = Field(..., description="[lon, lat]")
    affected_population: int = 1
    description: str = ""
    associated_hazard: Optional[str] = None
    required_specialty: str = "General" # Trauma, Cardiac, Heat, General
    reported_by: str = "IFRC Hotline"

class IncidentUpdate(BaseModel):
    title: Optional[str] = None
    priority: Optional[IncidentPriority] = None
    status: Optional[IncidentStatus] = None
    affected_population: Optional[int] = None
    description: Optional[str] = None
    assigned_vehicle_id: Optional[str] = None
    recommended_hospital_id: Optional[str] = None
    notes: Optional[str] = None
    verification_status: Optional[str] = None

class IncidentRecord(BaseModel):
    id: str
    title: str
    incident_type: str
    priority: IncidentPriority
    status: IncidentStatus
    location_name: str
    coordinates: List[float]
    affected_population: int
    description: str
    reported_time: str
    last_updated: str
    associated_hazard: Optional[str] = None
    assigned_vehicle_id: Optional[str] = None
    recommended_hospital_id: Optional[str] = None
    required_specialty: str = "General"
    reported_by: str
    verification_status: str = "Verified"
    activity_history: List[Dict[str, Any]] = Field(default_factory=list)
    simulated: bool = True
