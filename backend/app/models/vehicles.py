"""
Ambulance and Fleet Models for ResQGrid AI.
"""

from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class VehicleStatus(str, Enum):
    AVAILABLE = "Available"
    ASSIGNED = "Assigned"
    EN_ROUTE = "En route"
    AT_SCENE = "At scene"
    TRANSPORTING = "Transporting"
    RETURNING = "Returning"
    OUT_OF_SERVICE = "Out of service"
    UNKNOWN_OR_STALE = "Unknown or stale"

class VehicleType(str, Enum):
    ALS = "ALS" # Advanced Life Support
    BLS = "BLS" # Basic Life Support
    RESCUE_BOAT = "Rescue Boat"
    AIR_AMBULANCE = "Air Ambulance"

class VehicleRecord(BaseModel):
    id: str
    callsign: str
    unit_type: VehicleType
    status: VehicleStatus
    station_id: str
    station_name: str
    coordinates: List[float] = Field(..., description="[lon, lat]")
    capabilities: List[str] = Field(default_factory=lambda: ["Trauma", "Defibrillator", "Oxygen"])
    assigned_incident_id: Optional[str] = None
    target_destination: Optional[List[float]] = None
    crew_members: List[str] = Field(default_factory=list)
    fuel_level_pct: int = 100
    last_location_update: str
    data_source: str = "GPS Telemetry"
    verification_status: str = "Verified"
    data_age_sec: int = 0
    simulated: bool = True

class DispatchCandidate(BaseModel):
    vehicle_id: str
    callsign: str
    unit_type: str
    distance_km: float
    estimated_arrival_min: float
    route_risk_score: float
    capabilities_match: bool
    feasibility: bool
    recommendation_score: float
    explanation: str

class DispatchRecommendation(BaseModel):
    incident_id: str
    recommended_vehicle_id: str
    recommended_vehicle_callsign: str
    candidates: List[DispatchCandidate]
    route_polyline: List[List[float]]
    estimated_response_time_min: float
    hazard_exposure_level: str
    explanation: str
    counterfactual: str
