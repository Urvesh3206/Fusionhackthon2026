"""
Alerts, Forecasting, Audit and Settings Models for ResQGrid AI.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class AlertRecord(BaseModel):
    id: str
    title: str
    severity: str # Critical, High, Medium, Low, Info
    category: str # Hazard, RoadClosure, HospitalCapacity, ResourceShortage, StaleData, Integration
    message: str
    location_name: Optional[str] = None
    coordinates: Optional[List[float]] = None
    created_at: str
    is_acknowledged: bool = False
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[str] = None
    source: str = "ResQGrid Engine"

class DemandForecastPoint(BaseModel):
    horizon_min: int # 15, 30, 60
    zone_id: str
    zone_name: str
    predicted_call_rate: float
    lower_bound_95ci: float
    upper_bound_95ci: float
    key_drivers: List[str]
    model_type: str = "Explainable Poisson-Regression Baseline with Weather Covariates"
    uncertainty_level: str # Low, Medium, High

class SystemSettings(BaseModel):
    region_name: str = "Puri District, Odisha, India"
    target_response_time_min: float = 15.0
    safety_weight: float = 0.50
    caution_factor: float = 1.0
    route_block_threshold: float = 0.50
    evac_block_threshold: float = 0.20
    refresh_interval_sec: int = 15
    forecast_horizon_min: int = 30
    auto_dispatch_ai: bool = False
    offline_demo_mode: bool = True
    weights: Dict[str, float] = Field(default_factory=lambda: {
        "hazard_severity": 0.40,
        "population_exposure": 0.30,
        "vulnerability": 0.20,
        "infrastructure": 0.10
    })

class AuditLogEntryModel(BaseModel):
    id: str
    timestamp: str
    actor_id: str
    actor_name: str
    actor_role: str
    action_type: str # DISPATCH_OVERRIDE, ROAD_CLOSURE, SCENARIO_STEP, RESOURCE_ALLOCATION, HOSPITAL_UPDATE
    entity_id: str
    entity_type: str
    details: Dict[str, Any]
    justification: Optional[str] = None
    system_recommendation: Optional[str] = None
    chosen_action: Optional[str] = None
