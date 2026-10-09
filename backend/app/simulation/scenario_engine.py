"""
Scenario Engine for Tidewatch.
Drives scripted timeline milestones (Cyclone landfall & Heatwave),
processes live manual road closures, and updates full system state.
"""

import time
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional

from app.models.state import (
    FullSystemState, RoadEdge, Hospital, Ambulance, Shelter, TemporaryResource,
    RiskGridCell, HazardForecast, EmergencyCall
)
from app.data.loader import DataLoader
from app.config import ASSUMPTIONS

class ScenarioEngine:
    def __init__(self, replay_mode: bool = True):
        self.data_loader = DataLoader(replay_mode=replay_mode)
        self.active_scenario_id = "cyclone_fani_puri"
        self.active_step_index = 0
        self.manual_road_closures: List[str] = []
        self.manual_road_closure_reasons: Dict[str, str] = {}
        self.manual_hospital_deratings: Dict[str, Any] = {}
        self.dispatcher_overrides: List[Dict[str, Any]] = []
        self.sim_start_time = time.time()
        
        # Load baseline entities
        self.road_network = self.data_loader.load_road_network()
        self.hospitals = self.data_loader.load_hospitals()
        self.ambulances = self.data_loader.load_initial_ambulances()
        self.shelters = self.data_loader.load_shelters()
        self.population_grid = self.data_loader.load_population_grid()
        self.temporary_resources: List[TemporaryResource] = []
        self.pending_calls: List[EmergencyCall] = []
        self.call_status_overrides: Dict[str, Dict[str, Any]] = {}
        self.scenario_data = self.data_loader.load_scenario_data(self.active_scenario_id)

    def set_scenario(self, scenario_id: str):
        normalized = scenario_id
        if scenario_id in ["cyclone_fani", "fani", "cyclone"]:
            normalized = "cyclone_fani_puri"
        elif scenario_id in ["heatwave", "heat"]:
            normalized = "heatwave_odisha"
        if normalized not in ["cyclone_fani_puri", "heatwave_odisha"]:
            raise ValueError(f"Unknown scenario ID: {scenario_id}")
        self.active_scenario_id = normalized
        self.active_step_index = 0
        self.manual_road_closures.clear()
        self.manual_road_closure_reasons.clear()
        self.manual_hospital_deratings.clear()
        self.scenario_data = self.data_loader.load_scenario_data(self.active_scenario_id)
        # Reset hospitals and ambulances to baseline
        self.hospitals = self.data_loader.load_hospitals()
        self.ambulances = self.data_loader.load_initial_ambulances()
        self.temporary_resources.clear()
        self.pending_calls.clear()

    def advance_step(self, target_index: Optional[int] = None) -> FullSystemState:
        steps = self.scenario_data.get("steps", [])
        if not steps:
            return self.get_current_state()
        
        if target_index is not None:
            self.active_step_index = max(0, min(target_index, len(steps) - 1))
        else:
            self.active_step_index = (self.active_step_index + 1) % len(steps)
        
        return self.get_current_state()

    def trigger_manual_closure(self, edge_id: str, reason: str = "Live dispatcher emergency road closure"):
        if edge_id not in self.manual_road_closures:
            self.manual_road_closures.append(edge_id)
        self.manual_road_closure_reasons[edge_id] = reason
        return self.get_current_state()

    def clear_manual_closures(self):
        self.manual_road_closures.clear()
        self.manual_road_closure_reasons.clear()
        return self.get_current_state()

    def get_current_state(self) -> FullSystemState:
        steps = self.scenario_data.get("steps", [])
        current_step = steps[self.active_step_index] if steps else {}
        
        step_id = current_step.get("step_id", "T-0")
        time_label = current_step.get("time_label", "Active Step")
        hazard_type = current_step.get("hazard_type", "cyclone")
        
        # Build forecast
        forecast = HazardForecast(
            scenario_id=self.active_scenario_id,
            step_id=step_id,
            hazard_type=hazard_type,
            cone_polygon=current_step.get("cone_polygon"),
            wind_speed_kmh=current_step.get("wind_speed_kmh", 0.0),
            rain_rate_mmh=current_step.get("rain_rate_mmh", 0.0),
            river_discharge_m3s=current_step.get("river_discharge_m3s", 0.0),
            apparent_temp_c=current_step.get("apparent_temp_c", 32.0),
            wet_bulb_temp_c=current_step.get("wet_bulb_temp_c", 26.0),
            summary_text=current_step.get("summary_text", "")
        )

        # Update road edges based on step failures and manual closures
        step_failures = current_step.get("road_failures", {})
        active_edges: List[RoadEdge] = []
        for e in self.road_network["edges"]:
            edge_copy = e.model_copy()
            
            # Check scripted failure
            if edge_copy.id in step_failures:
                failure_info = step_failures[edge_copy.id]
                edge_copy.failure_prob = failure_info.get("failure_prob", 0.90)
                edge_copy.is_closed = failure_info.get("is_closed", True)
                edge_copy.closure_reason = failure_info.get("closure_reason", "Flooded / Impassable")
            # Check manual closure
            elif edge_copy.id in self.manual_road_closures:
                edge_copy.failure_prob = 1.0
                edge_copy.is_closed = True
                edge_copy.closure_reason = self.manual_road_closure_reasons.get(edge_copy.id, "Live dispatcher road closure")
            else:
                # Dynamic minor baseline failure prob calculated from rain & elevation
                discharge = forecast.river_discharge_m3s
                if discharge > 400 and edge_copy.elevation_m < 3.0:
                    edge_copy.failure_prob = min(0.45, 0.1 + (discharge / 3000.0))
                else:
                    edge_copy.failure_prob = 0.05
                edge_copy.is_closed = False
                edge_copy.closure_reason = None
            
            # Simulated telemetry age
            edge_copy.data_age_sec = int((time.time() - self.sim_start_time) % 180) + 10
            active_edges.append(edge_copy)

        # Update hospitals based on step deratings
        step_deratings = current_step.get("hospital_deratings", {})
        active_hospitals: List[Hospital] = []
        for h in self.hospitals:
            h_copy = h.model_copy()
            if h_copy.id in step_deratings:
                derating = step_deratings[h_copy.id]
                h_copy.has_power = derating.get("has_power", True)
                h_copy.has_comms = derating.get("has_comms", True)
                h_copy.usable_beds = derating.get("usable_beds", int(h_copy.total_beds * derating.get("derated_capacity_ratio", 0.5)))
                h_copy.free_icu_beds = derating.get("free_icu_beds", 0)
                h_copy.derated_capacity_ratio = derating.get("derated_capacity_ratio", 0.5)
                h_copy.status_reason = derating.get("status_reason", "Cascading outage derating active.")
                h_copy.data_age_sec = 1800 if not h_copy.has_comms else 30 # 30 min old if comms dropped
            else:
                h_copy.derated_capacity_ratio = 1.0
                h_copy.status_reason = "Normal operational status."
                h_copy.data_age_sec = int((time.time() - self.sim_start_time) % 90) + 15
            active_hospitals.append(h_copy)

        # Update emergency calls
        calls_data = current_step.get("emergency_calls", [])
        current_calls: List[EmergencyCall] = []
        for c in calls_data:
            call_obj = EmergencyCall(
                id=c["id"],
                timestamp=time_label,
                priority=c["priority"],
                patient_condition=c["patient_condition"],
                required_specialty=c.get("required_specialty", "General"),
                location=c["location"],
                district_zone=c.get("district", "Puri Urban"),
                status="Pending",
                simulated=True
            )
            if call_obj.id in self.call_status_overrides:
                ov = self.call_status_overrides[call_obj.id]
                if "status" in ov: call_obj.status = ov["status"]
                if "assigned_ambulance_id" in ov: call_obj.assigned_ambulance_id = ov["assigned_ambulance_id"]
                if "assigned_hospital_id" in ov: call_obj.assigned_hospital_id = ov["assigned_hospital_id"]
            current_calls.append(call_obj)

        # Include dynamic citizen emergency calls at the top
        for dyn_call in self.pending_calls:
            dyn_copy = dyn_call.model_copy()
            if dyn_copy.id in self.call_status_overrides:
                ov = self.call_status_overrides[dyn_copy.id]
                if "status" in ov: dyn_copy.status = ov["status"]
                if "assigned_ambulance_id" in ov: dyn_copy.assigned_ambulance_id = ov["assigned_ambulance_id"]
                if "assigned_hospital_id" in ov: dyn_copy.assigned_hospital_id = ov["assigned_hospital_id"]
            current_calls.insert(0, dyn_copy)

        # Build risk grid cells
        risk_cells: List[RiskGridCell] = []
        for cell in self.population_grid:
            pop = cell["population"]
            elderly = cell["elderly_population"]
            elev = cell["elevation_m"]
            
            # Hazard calculation
            if hazard_type == "cyclone":
                flood_haz = min(1.0, max(0.05, (forecast.river_discharge_m3s / 1500.0) * (8.0 / max(1.5, elev)) * (forecast.rain_rate_mmh / 100.0)))
                cyc_haz = min(1.0, forecast.wind_speed_kmh / 220.0)
                heat_haz = 0.1
            else:
                flood_haz = 0.05
                cyc_haz = 0.05
                heat_haz = min(1.0, max(0.2, (forecast.apparent_temp_c - 35.0) / 15.0))
            
            # Noisy-OR hazard fusion: P = 1 - (1-p1)*(1-p2)*(1-p3)
            comb_hazard = 1.0 - (1.0 - flood_haz) * (1.0 - cyc_haz) * (1.0 - heat_haz)
            
            # Vulnerability: elderly ratio + infrastructure vulnerability
            vulnerability = (elderly / max(1, pop)) * 2.5
            comb_risk = round(comb_hazard * (pop / 5000.0) * (0.8 + vulnerability), 3)
            
            risk_cells.append(RiskGridCell(
                id=cell["id"],
                lon=cell["lon"],
                lat=cell["lat"],
                hazard_flood=round(flood_haz, 2),
                hazard_cyclone=round(cyc_haz, 2),
                hazard_heat=round(heat_haz, 2),
                combined_hazard=round(comb_hazard, 2),
                population=pop,
                elderly_population=elderly,
                vulnerability_score=round(vulnerability, 2),
                combined_risk=comb_risk
            ))

        # Staged station metadata
        staged_stations = [
            {"id": "node_puri_center", "name": "Puri Town Central Station", "location": [85.8285, 19.8080], "assigned_units": 2},
            {"id": "node_swargadwar", "name": "Swargadwar Beach Station", "location": [85.8175, 19.7960], "assigned_units": 1},
            {"id": "node_satyabadi", "name": "Satyabadi Rural Station", "location": [85.8270, 19.9510], "assigned_units": 1},
            {"id": "node_pipili", "name": "Pipili Highway Station", "location": [85.8330, 20.1150], "assigned_units": 1},
            {"id": "node_brahmagiri", "name": "Brahmagiri West Station", "location": [85.6420, 19.8050], "assigned_units": 1},
            {"id": "node_konark_sun_temple", "name": "Konark Marine Station", "location": [86.0945, 19.8876], "assigned_units": 1},
            {"id": "node_gop", "name": "Gop Regional Station", "location": [86.0020, 19.9980], "assigned_units": 1}
        ]

        return FullSystemState(
            scenario_id=self.active_scenario_id,
            active_step_id=step_id,
            step_index=self.active_step_index,
            total_steps=len(steps),
            simulation_time_label=time_label,
            forecast=forecast,
            road_edges=active_edges,
            hospitals=active_hospitals,
            ambulances=self.ambulances,
            shelters=self.shelters,
            temporary_resources=self.temporary_resources,
            emergency_calls=current_calls,
            risk_grid=risk_cells,
            staged_stations=staged_stations,
            active_road_closures=[e.id for e in active_edges if e.is_closed],
            system_metrics={
                "total_ambulances": len(self.ambulances),
                "available_ambulances": sum(1 for a in self.ambulances if a.status == "Available"),
                "total_hospital_beds": sum(h.usable_beds for h in active_hospitals),
                "free_icu_beds": sum(h.free_icu_beds for h in active_hospitals),
                "derated_hospitals_count": sum(1 for h in active_hospitals if h.derated_capacity_ratio < 1.0 or not h.has_power or not h.has_comms),
                "closed_edges_count": sum(1 for e in active_edges if e.is_closed),
                "pending_calls_count": len(current_calls)
            },
            offline_mode=True,
            last_updated=datetime.now(timezone.utc).isoformat()
        )

    def add_emergency_call(self, call: EmergencyCall):
        self.pending_calls.append(call)

    def update_call_status(self, call_id: str, status: Optional[str] = None, vehicle_id: Optional[str] = None, hospital_id: Optional[str] = None):
        if call_id not in self.call_status_overrides:
            self.call_status_overrides[call_id] = {}
        if status:
            self.call_status_overrides[call_id]["status"] = status
        if vehicle_id:
            self.call_status_overrides[call_id]["assigned_ambulance_id"] = vehicle_id
        if hospital_id:
            self.call_status_overrides[call_id]["assigned_hospital_id"] = hospital_id
        
        for c in self.pending_calls:
            if c.id == call_id or call_id in c.id or c.id in call_id:
                if status: c.status = status
                if vehicle_id: c.assigned_ambulance_id = vehicle_id
                if hospital_id: c.assigned_hospital_id = hospital_id
