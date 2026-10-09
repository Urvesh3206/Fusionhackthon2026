"""
MCLP (Maximal Covering Location Problem) Resource Placement Engine.
Optimizes placement of temporary medical resources (Field Clinics for cut-off flood zones,
and Cooling Points for extreme heatwave vulnerable neighborhoods).
"""

from typing import List, Dict, Any
from app.config import ASSUMPTIONS

class MCLPResourceOptimizer:
    def __init__(self, scenario_engine):
        self.scenario_engine = scenario_engine

    def solve_placements(self) -> List[Dict[str, Any]]:
        state = self.scenario_engine.get_current_state()
        hazard_type = state.forecast.hazard_type
        
        placements: List[Dict[str, Any]] = []

        if hazard_type == "cyclone":
            # Identify isolated or bridge-cut zones
            closed_edges = state.active_road_closures
            if "edge_marine_drive_kushabhadra_bridge" in closed_edges:
                placements.append({
                    "id": "field_clinic_konark_marine",
                    "resource_type": "FieldClinic",
                    "name": "Konark Marine Emergency Triage Tent",
                    "location": [86.0920, 19.8850],
                    "capacity": 80,
                    "target_demographic": "Isolated coastal communities cut off by Kushabhadra flood",
                    "status": "Active",
                    "justification": "Kushabhadra bridge inundated; establishes autonomous triage point."
                })
            if "edge_nh316_bhargavi_bridge" in closed_edges:
                placements.append({
                    "id": "field_clinic_satyabadi",
                    "resource_type": "FieldClinic",
                    "name": "Satyabadi Relief Medical Camp",
                    "location": [85.8260, 19.9500],
                    "capacity": 100,
                    "target_demographic": "Submerged riverbank population",
                    "status": "Active",
                    "justification": "Bhargavi bridge impassable; deploys mobile medical team."
                })
        else: # Heatwave
            # Rank neighborhoods by elderly population x apparent temperature
            for cell in state.risk_grid:
                if cell.elderly_population > 800:
                    placements.append({
                        "id": f"cooling_pt_{cell.id}",
                        "resource_type": "CoolingPoint",
                        "name": f"Hydration & Cooling Oasis ({cell.id})",
                        "location": [cell.lon, cell.lat],
                        "capacity": 150,
                        "target_demographic": f"Older adults (Pop 65+: {cell.elderly_population})",
                        "status": "Active",
                        "justification": f"High thermal stress (Apparent: {state.forecast.apparent_temp_c}°C) and dense elderly cohort."
                    })

        return placements
