"""
Medical Resource & Temporary Site Allocation Models for ResQGrid AI.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class MedicalResourceItem(BaseModel):
    id: str
    name: str
    category: str # "Emergency Kits", "Medicines", "Cooling Supplies", "First Aid Stations", "Surgical Units"
    quantity: int
    unit: str # "kits", "doses", "units", "tents", "liters"
    location_name: str
    coordinates: List[float]
    available_quantity: int
    allocated_quantity: int
    status: str = "Available" # "Available", "Low Stock", "Depleted"
    last_updated: str
    data_source: str = "IFRC Logistics ERP"
    simulated: bool = True

class ClinicCandidate(BaseModel):
    site_id: str
    site_name: str
    coordinates: List[float]
    elevation_m: float
    flood_hazard_score: float
    population_density_score: float
    accessibility_score: float
    nearest_hospital_dist_km: float
    suitability_score: float
    recommended_resource_type: str
    capacity: int
    reasoning: List[str]
    is_safe: bool = True

class ResourceAllocationRequest(BaseModel):
    resource_id: str
    target_site_id: str
    quantity: int
    notes: Optional[str] = None
    coordinator_id: str = "coord_1"
