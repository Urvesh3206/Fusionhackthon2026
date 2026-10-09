"""
Pydantic data models representing the live emergency state, telemetry, roads, hospitals, and fleet.
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class Coordinates(BaseModel):
    lon: float
    lat: float

class RoadEdge(BaseModel):
    id: str
    name: str
    source_node: str
    target_node: str
    length_m: float
    speed_kmh: float
    base_travel_time_sec: float
    elevation_m: float
    river_distance_m: float
    failure_prob: float = 0.0
    is_closed: bool = False
    closure_reason: Optional[str] = None
    geometry: List[List[float]] = Field(default_factory=list, description="List of [lon, lat] points")
    simulated: bool = True
    data_age_sec: int = 0

class Hospital(BaseModel):
    id: str
    name: str
    specialties: List[str] = Field(default_factory=lambda: ["General"])
    total_beds: int
    usable_beds: int
    occupied_beds: int
    free_icu_beds: int
    has_power: bool = True
    has_comms: bool = True
    derated_capacity_ratio: float = 1.0
    status_reason: str = "Normal operation"
    location: List[float] = Field(..., description="[lon, lat]")
    simulated: bool = True
    data_age_sec: int = 0

    @property
    def occupancy_ratio(self) -> float:
        if self.usable_beds <= 0:
            return 1.0
        return min(1.0, self.occupied_beds / max(1, self.usable_beds))

class Ambulance(BaseModel):
    id: str
    callsign: str
    unit_type: str = "ALS" # "ALS" (Advanced Life Support) or "BLS" (Basic)
    status: str = "Available" # "Available", "Dispatched", "In-Transit", "Returning"
    station_id: str
    location: List[float] = Field(..., description="[lon, lat]")
    assigned_call_id: Optional[str] = None
    target_destination: Optional[List[float]] = None
    route_polyline: Optional[List[List[float]]] = None
    simulated: bool = True
    data_age_sec: int = 0

class Shelter(BaseModel):
    id: str
    name: str
    capacity: int
    current_occupancy: int
    location: List[float]
    is_accessible: bool = True
    simulated: bool = True

class TemporaryResource(BaseModel):
    id: str
    name: str
    resource_type: str # "FieldClinic" or "CoolingPoint"
    location: List[float]
    capacity: int
    status: str = "Active"
    target_demographic: str = "General"
    simulated: bool = True

class EmergencyCall(BaseModel):
    id: str
    timestamp: str
    priority: str # "P1_Critical", "P2_Urgent", "P3_Standard"
    patient_condition: str
    required_specialty: str = "General"
    location: List[float] # [lon, lat]
    district_zone: str = "Puri Urban"
    status: str = "Pending" # "Pending", "Dispatched", "Transporting", "Resolved"
    assigned_ambulance_id: Optional[str] = None
    assigned_hospital_id: Optional[str] = None
    simulated: bool = True

class RiskGridCell(BaseModel):
    id: str
    lon: float
    lat: float
    hazard_flood: float = 0.0
    hazard_cyclone: float = 0.0
    hazard_heat: float = 0.0
    combined_hazard: float = 0.0
    population: int = 0
    elderly_population: int = 0
    vulnerability_score: float = 0.0
    combined_risk: float = 0.0

class HazardForecast(BaseModel):
    scenario_id: str
    step_id: str
    hazard_type: str # "cyclone" or "heatwave"
    cone_polygon: Optional[List[List[float]]] = None
    wind_speed_kmh: float = 0.0
    rain_rate_mmh: float = 0.0
    river_discharge_m3s: float = 0.0
    apparent_temp_c: float = 0.0
    wet_bulb_temp_c: float = 0.0
    summary_text: str = ""

class FullSystemState(BaseModel):
    scenario_id: str
    active_step_id: str
    step_index: int
    total_steps: int
    simulation_time_label: str
    forecast: HazardForecast
    road_edges: List[RoadEdge]
    hospitals: List[Hospital]
    ambulances: List[Ambulance]
    shelters: List[Shelter]
    temporary_resources: List[TemporaryResource]
    emergency_calls: List[EmergencyCall]
    risk_grid: List[RiskGridCell]
    staged_stations: List[Dict[str, Any]]
    active_road_closures: List[str]
    system_metrics: Dict[str, Any]
    offline_mode: bool = False
    last_updated: str
