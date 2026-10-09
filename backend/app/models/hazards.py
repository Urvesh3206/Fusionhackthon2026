"""
Hazard Intelligence and Meteorological Models for ResQGrid AI.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class HazardRecord(BaseModel):
    id: str
    hazard_type: str # Flood, Cyclone, Heavy Rainfall, Extreme Heat, Severe Wind, Road Disruption
    title: str
    severity: str # Low, Moderate, High, Severe, Critical
    risk_score: float # 0.0 to 100.0
    affected_area_name: str
    coordinates_center: List[float]
    polygon: Optional[List[List[float]]] = None
    observation_time: str
    forecast_time: str
    source: str # Open-Meteo, IMD, GDACS, SDMA Live Gauges
    confidence: float = 0.90
    last_updated: str
    verification_status: str = "Verified"
    expiration_time: str
    metrics: Dict[str, Any] = Field(default_factory=dict)
    simulated: bool = False

class RiskScoreBreakdown(BaseModel):
    hazard_severity: float
    population_exposure: float
    vulnerability_index: float
    infrastructure_criticality: float
    final_risk_score: float
    formula_explanation: str
    weights_applied: Dict[str, float]

class HazardRefreshResponse(BaseModel):
    timestamp: str
    status: str
    source: str
    records_count: int
    data_freshness_sec: int
    is_cached: bool
    live_hazards: List[HazardRecord]
