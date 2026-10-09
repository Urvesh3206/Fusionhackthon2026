"""
Shelter and Evacuation Planning Models for ResQGrid AI.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class ShelterRecord(BaseModel):
    id: str
    name: str
    shelter_type: str = "Cyclone Shelter" # Cyclone Shelter, School/Community Center, High Ground Camp
    coordinates: List[float]
    total_capacity: int
    current_occupancy: int
    is_accessible: bool = True
    has_potable_water: bool = True
    has_backup_power: bool = True
    elevation_m: float
    data_source: str = "Odisha SDMA Shelter Registry"
    last_updated: str
    simulated: bool = True

    @property
    def remaining_capacity(self) -> int:
        return max(0, self.total_capacity - self.current_occupancy)

class EvacuationZone(BaseModel):
    id: str
    name: str
    polygon: List[List[float]]
    population: int
    vulnerability_score: float # 0.0 to 1.0
    hazard_level: str # Low, Moderate, High, Severe, Critical
    assigned_shelter_id: Optional[str] = None
    recommended_evac_route: List[List[float]] = Field(default_factory=list)
    evac_status: str = "Standby" # Standby, Advisory, Mandatory Evac, In Progress, Completed

class EvacuationPlanResponse(BaseModel):
    timestamp: str
    total_zones: int
    total_at_risk_population: int
    assigned_population: int
    unassigned_population: int
    shelter_utilization: List[Dict[str, Any]]
    zone_assignments: List[Dict[str, Any]]
    assumptions_and_limitations: List[str]
    is_feasible: bool
