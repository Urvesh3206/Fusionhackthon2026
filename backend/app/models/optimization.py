"""
Pydantic schemas for optimization outputs, recommendations, counterfactuals, and dispatcher overrides.
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class CandidateOption(BaseModel):
    option_id: str
    label: str
    eta_min: float
    capacity_available: int
    icu_available: int
    specialty_match: bool
    risk_score: float
    data_age_sec: int
    score: float
    details: Dict[str, Any] = Field(default_factory=dict)

class Recommendation(BaseModel):
    id: str
    call_id: Optional[str] = None
    recommendation_type: str # "HOSPITAL_CHOICE", "AMBULANCE_DISPATCH", "AMBULANCE_STAGING", "EVACUATION_ROUTE", "COOLING_POINT_PLACEMENT"
    title: str
    choice: CandidateOption
    runner_up: Optional[CandidateOption] = None
    reasons: List[str]
    counterfactual_explanation: str
    data_age_sec: int
    assumptions: List[str]
    status: str = "PENDING" # "PENDING", "ACCEPTED", "EDITED", "REJECTED"
    created_at: str

class AmbulanceStagingRecommendation(BaseModel):
    station_id: str
    station_name: str
    location: List[float]
    allocated_ambulances: int
    change_delta: int # e.g. +1 or -1 compared to baseline
    coverage_pop_served: int
    reasons: List[str]
    runner_up_station: Optional[str] = None
    counterfactual: str

class OptimizationPlanResponse(BaseModel):
    timestamp: str
    scenario_id: str
    step_id: str
    recommendations: List[Recommendation]
    ambulance_staging: List[AmbulanceStagingRecommendation]
    evacuation_routes: List[Dict[str, Any]]
    temporary_resource_placements: List[Dict[str, Any]]
    equity_metrics: Dict[str, Any]
    efficiency_metrics: Dict[str, Any]
    computation_time_ms: float

class OverrideRequest(BaseModel):
    recommendation_id: str
    dispatcher_id: str = "dispatcher_main"
    action: str # "ACCEPT", "EDIT", "REJECT"
    chosen_option_id: str
    justification_reason: str
    custom_notes: Optional[str] = None

class OverrideLogEntry(BaseModel):
    id: str
    recommendation_id: str
    recommendation_type: str
    timestamp: str
    dispatcher_id: str
    action: str
    system_recommended_id: str
    dispatcher_chosen_id: str
    justification_reason: str
    custom_notes: Optional[str] = None
