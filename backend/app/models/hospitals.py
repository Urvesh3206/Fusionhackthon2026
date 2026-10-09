"""
Hospital and Medical Capacity Models for ResQGrid AI.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class HospitalRecord(BaseModel):
    id: str
    name: str
    facility_type: str = "District Headquarters Hospital" # Sub-Divisional, Community Health Centre, Field Hospital
    coordinates: List[float] = Field(..., description="[lon, lat]")
    specialties: List[str] = Field(default_factory=lambda: ["General", "Trauma", "Cardiac"])
    total_beds: int
    usable_beds: int
    occupied_beds: int
    free_icu_beds: int
    has_power: bool = True
    has_comms: bool = True
    is_accepting_patients: bool = True
    derated_capacity_ratio: float = 1.0
    status_reason: str = "Normal operation"
    data_source: str = "HMIS Direct Telemetry"
    last_update: str
    verification_status: str = "Verified"
    data_age_sec: int = 0
    simulated: bool = True

    @property
    def available_beds(self) -> int:
        return max(0, self.usable_beds - self.occupied_beds)

class HospitalMatchCandidate(BaseModel):
    hospital_id: str
    hospital_name: str
    travel_time_min: float
    distance_km: float
    free_beds: int
    free_icu_beds: int
    specialties_match: bool
    is_accepting: bool
    has_power: bool
    has_comms: bool
    score: float
    feasibility: bool
    reasons: List[str]
    counterfactual: str

class HospitalMatchResponse(BaseModel):
    incident_id: str
    recommended_hospital: HospitalMatchCandidate
    alternative_hospitals: List[HospitalMatchCandidate]
    route_polyline: List[List[float]]
    summary_explanation: str
    data_limitations: str
