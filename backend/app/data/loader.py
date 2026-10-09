"""
Data loader module for Tidewatch.
Loads road networks, hospitals, population grids, shelters, and scenario timelines.
Guarantees zero-network deterministic execution when REPLAY=1 or when offline.
"""

import os
import json
from pathlib import Path
from typing import Dict, List, Any, Optional

from app.models.state import (
    RoadEdge, Hospital, Ambulance, Shelter, TemporaryResource,
    RiskGridCell, HazardForecast, EmergencyCall
)
from app.config import DEFAULT_REGION, CYCLONE_SCENARIO_TIMELINE, HEATWAVE_SCENARIO_TIMELINE

SNAPSHOTS_DIR = Path(__file__).parent / "snapshots"

class DataLoader:
    def __init__(self, replay_mode: bool = False):
        self.replay_mode = replay_mode or os.getenv("REPLAY", "1") == "1"
        self.snapshots_dir = SNAPSHOTS_DIR

    def load_road_network(self) -> Dict[str, Any]:
        snapshot_path = self.snapshots_dir / "puri_network_snapshot.json"
        with open(snapshot_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        edges = []
        for e in data["edges"]:
            edges.append(RoadEdge(
                id=e["id"],
                name=e["name"],
                source_node=e["source_node"],
                target_node=e["target_node"],
                length_m=e["length_m"],
                speed_kmh=e["speed_kmh"],
                base_travel_time_sec=e["base_travel_time_sec"],
                elevation_m=e["elevation_m"],
                river_distance_m=e["river_distance_m"],
                failure_prob=0.0,
                is_closed=False,
                closure_reason=None,
                geometry=e["geometry"],
                simulated=True,
                data_age_sec=12
            ))
        
        return {
            "nodes": data["nodes"],
            "edges": edges
        }

    def load_hospitals(self) -> List[Hospital]:
        snapshot_path = self.snapshots_dir / "puri_hospitals_snapshot.json"
        with open(snapshot_path, "r", encoding="utf-8") as f:
            raw_hospitals = json.load(f)
        
        hospitals = []
        for h in raw_hospitals:
            hospitals.append(Hospital(
                id=h["id"],
                name=h["name"],
                specialties=h["specialties"],
                total_beds=h["total_beds"],
                usable_beds=h["usable_beds"],
                occupied_beds=h["occupied_beds"],
                free_icu_beds=h["free_icu_beds"],
                has_power=h["has_power"],
                has_comms=h["has_comms"],
                derated_capacity_ratio=h.get("derated_capacity_ratio", 1.0),
                status_reason=h.get("status_reason", "Normal operation"),
                location=h["location"],
                simulated=True,
                data_age_sec=h.get("data_age_sec", 45)
            ))
        return hospitals

    def load_population_grid(self) -> List[Dict[str, Any]]:
        snapshot_path = self.snapshots_dir / "puri_population_grid_snapshot.json"
        with open(snapshot_path, "r", encoding="utf-8") as f:
            return json.load(f)

    def load_shelters(self) -> List[Shelter]:
        # Cyclone Multipurpose Shelters along Puri Coast
        return [
            Shelter(
                id="shelter_baliapanda",
                name="Baliapanda Cyclone Multipurpose Shelter",
                capacity=1500,
                current_occupancy=420,
                location=[85.8040, 19.7910],
                is_accessible=True,
                simulated=True
            ),
            Shelter(
                id="shelter_konark",
                name="Konark Marine Shelter & Relief Hub",
                capacity=2000,
                current_occupancy=650,
                location=[86.0920, 19.8850],
                is_accessible=True,
                simulated=True
            ),
            Shelter(
                id="shelter_brahmagiri",
                name="Brahmagiri Community Cyclone Shelter",
                capacity=1200,
                current_occupancy=310,
                location=[85.6400, 19.8030],
                is_accessible=True,
                simulated=True
            ),
            Shelter(
                id="shelter_astaranga",
                name="Astaranga Coastal High School Shelter",
                capacity=1000,
                current_occupancy=280,
                location=[86.2600, 19.9800],
                is_accessible=True,
                simulated=True
            ),
            Shelter(
                id="shelter_satyabadi",
                name="Satyabadi High School Relief Camp",
                capacity=1800,
                current_occupancy=390,
                location=[85.8260, 19.9500],
                is_accessible=True,
                simulated=True
            )
        ]

    def load_initial_ambulances(self) -> List[Ambulance]:
        # Fleet of 8 ambulances distributed across stations
        return [
            Ambulance(
                id="amb_puri_01",
                callsign="PURI-ALS-01",
                unit_type="ALS",
                status="Available",
                station_id="node_puri_center",
                location=[85.8285, 19.8080],
                simulated=True,
                data_age_sec=15
            ),
            Ambulance(
                id="amb_puri_02",
                callsign="PURI-BLS-02",
                unit_type="BLS",
                status="Available",
                station_id="node_puri_center",
                location=[85.8290, 19.8090],
                simulated=True,
                data_age_sec=22
            ),
            Ambulance(
                id="amb_coastal_03",
                callsign="SWARG-ALS-03",
                unit_type="ALS",
                status="Available",
                station_id="node_swargadwar",
                location=[85.8175, 19.7960],
                simulated=True,
                data_age_sec=30
            ),
            Ambulance(
                id="amb_satyabadi_04",
                callsign="SATYA-BLS-04",
                unit_type="BLS",
                status="Available",
                station_id="node_satyabadi",
                location=[85.8270, 19.9510],
                simulated=True,
                data_age_sec=18
            ),
            Ambulance(
                id="amb_pipili_05",
                callsign="PIPLI-ALS-05",
                unit_type="ALS",
                status="Available",
                station_id="node_pipili",
                location=[85.8330, 20.1150],
                simulated=True,
                data_age_sec=40
            ),
            Ambulance(
                id="amb_brahmagiri_06",
                callsign="BRAHMA-BLS-06",
                unit_type="BLS",
                status="Available",
                station_id="node_brahmagiri",
                location=[85.6420, 19.8050],
                simulated=True,
                data_age_sec=55
            ),
            Ambulance(
                id="amb_konark_07",
                callsign="KONARK-ALS-07",
                unit_type="ALS",
                status="Available",
                station_id="node_konark_sun_temple",
                location=[86.0945, 19.8876],
                simulated=True,
                data_age_sec=28
            ),
            Ambulance(
                id="amb_gop_08",
                callsign="GOP-BLS-08",
                unit_type="BLS",
                status="Available",
                station_id="node_gop",
                location=[86.0020, 19.9980],
                simulated=True,
                data_age_sec=35
            )
        ]

    def load_scenario_data(self, scenario_id: str = "cyclone_fani_puri") -> Dict[str, Any]:
        filename = "cyclone_fani_snapshot.json" if scenario_id == "cyclone_fani_puri" else "heatwave_snapshot.json"
        snapshot_path = self.snapshots_dir / filename
        with open(snapshot_path, "r", encoding="utf-8") as f:
            return json.load(f)
