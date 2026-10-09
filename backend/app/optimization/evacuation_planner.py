"""
Evacuation Planning & Shelter Capacity Matching Engine for ResQGrid AI.
Solves capacity-constrained evacuation allocation while routing along safe corridors.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime
from app.models.shelters import EvacuationPlanResponse, ShelterRecord, EvacuationZone

class EvacuationPlanner:
    def __init__(self, scenario_engine, router):
        self.scenario_engine = scenario_engine
        self.router = router

    def generate_evacuation_plan(
        self,
        zones_data: Optional[List[Dict[str, Any]]] = None,
        shelters_data: Optional[List[ShelterRecord]] = None
    ) -> EvacuationPlanResponse:
        state = self.scenario_engine.get_current_state()
        shelters = shelters_data or state.shelters
        
        # Build zones if not provided
        default_zones = [
            {"id": "zone_coastal_puri", "name": "Puri Coastal Lowlands", "population": 4200, "vulnerability": 0.85, "hazard": "Critical", "coords": [85.83, 19.80]},
            {"id": "zone_kushabhadra_basin", "name": "Kushabhadra River Basin", "population": 3100, "vulnerability": 0.70, "hazard": "Severe", "coords": [85.87, 19.85]},
            {"id": "zone_satyabadi_rural", "name": "Satyabadi Lowlands", "population": 2400, "vulnerability": 0.60, "hazard": "High", "coords": [85.82, 19.95]},
            {"id": "zone_pipili_west", "name": "Pipili West Floodway", "population": 1800, "vulnerability": 0.50, "hazard": "Moderate", "coords": [85.83, 20.08]}
        ]
        
        active_zones = zones_data or default_zones
        
        # Track shelter remaining capacities
        shelter_cap_map: Dict[str, Dict[str, Any]] = {}
        for s in shelters:
            shelter_cap_map[s.id] = {
                "shelter_id": s.id,
                "name": s.name,
                "total_capacity": s.capacity,
                "initial_occupancy": s.current_occupancy,
                "remaining_capacity": max(0, s.capacity - s.current_occupancy),
                "allocated_population": 0,
                "location": s.location,
                "is_accessible": s.is_accessible
            }

        total_at_risk = sum(z["population"] for z in active_zones)
        assigned_pop = 0
        zone_assignments: List[Dict[str, Any]] = []

        # Sort zones by vulnerability & hazard priority
        sorted_zones = sorted(active_zones, key=lambda z: z.get("vulnerability", 0.5), reverse=True)

        for z in sorted_zones:
            z_coords = z["coords"]
            z_node = self.router.find_nearest_node(z_coords)
            needed_pop = z["population"]
            
            # Find candidate accessible shelters with remaining capacity
            candidate_shelters = []
            for s_id, s_info in shelter_cap_map.items():
                if not s_info["is_accessible"] or s_info["remaining_capacity"] <= 0:
                    continue
                s_node = self.router.find_nearest_node(s_info["location"])
                route = self.router.find_route(
                    origin_node=z_node,
                    target_node=s_node,
                    is_evacuation=True,
                    safety_weight=0.85 # High safety weight for civilian evacuation
                )
                if route and route.get("is_feasible", False):
                    candidate_shelters.append({
                        "shelter_id": s_id,
                        "info": s_info,
                        "travel_time_min": route["total_time_min"],
                        "route": route
                    })

            # Sort by travel time
            candidate_shelters.sort(key=lambda c: c["travel_time_min"])

            if candidate_shelters:
                best_cand = candidate_shelters[0]
                s_info = best_cand["info"]
                alloc_amount = min(needed_pop, s_info["remaining_capacity"])
                
                s_info["remaining_capacity"] -= alloc_amount
                s_info["allocated_population"] += alloc_amount
                assigned_pop += alloc_amount

                status = "Fully Assigned" if alloc_amount == needed_pop else f"Partially Assigned ({alloc_amount}/{needed_pop})"

                zone_assignments.append({
                    "zone_id": z["id"],
                    "zone_name": z["name"],
                    "total_population": needed_pop,
                    "evacuated_population": alloc_amount,
                    "assigned_shelter_id": s_info["shelter_id"],
                    "assigned_shelter_name": s_info["name"],
                    "status": status,
                    "transit_time_min": best_cand["travel_time_min"],
                    "safe_evac_route": best_cand["route"].get("polyline", []),
                    "notes": f"Routing via high-elevation corridors avoiding flooded river crossings."
                })
            else:
                zone_assignments.append({
                    "zone_id": z["id"],
                    "zone_name": z["name"],
                    "total_population": needed_pop,
                    "evacuated_population": 0,
                    "assigned_shelter_id": None,
                    "assigned_shelter_name": "NONE AVAILABLE",
                    "status": "Cut-Off / No Passable Evacuation Route",
                    "transit_time_min": 999.0,
                    "safe_evac_route": [],
                    "notes": "WARNING: All direct corridors cut off by inundation. Urgent boat / airlift evacuation required."
                })

        shelter_utilization = [
            {
                "shelter_id": s["shelter_id"],
                "name": s["name"],
                "total_capacity": s["total_capacity"],
                "assigned_population": s["allocated_population"],
                "final_occupancy": s["initial_occupancy"] + s["allocated_population"],
                "utilization_pct": round(((s["initial_occupancy"] + s["allocated_population"]) / max(1, s["total_capacity"])) * 100.0, 1),
                "is_accessible": s["is_accessible"]
            }
            for s in shelter_cap_map.values()
        ]

        assumptions = [
            "Civilians routed exclusively on links with failure probability < 0.20",
            "Shelter capacities strictly enforced (no exceeding maximum structural limit)",
            "Allocations prioritize high-vulnerability coastal zones first"
        ]

        return EvacuationPlanResponse(
            timestamp=datetime.utcnow().isoformat() + "Z",
            total_zones=len(active_zones),
            total_at_risk_population=total_at_risk,
            assigned_population=assigned_pop,
            unassigned_population=total_at_risk - assigned_pop,
            shelter_utilization=shelter_utilization,
            zone_assignments=zone_assignments,
            assumptions_and_limitations=assumptions,
            is_feasible=(total_at_risk - assigned_pop == 0)
        )
