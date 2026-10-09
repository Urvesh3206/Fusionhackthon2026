"""
Tidewatch Configuration & Assumptions
All thresholds and model constants are explicitly documented here.
"""

from typing import Dict, Any

# Target Area: Puri District, Odisha, India
DEFAULT_REGION = {
    "name": "Puri District, Odisha, India",
    "center": [85.8312, 19.8135],  # [lon, lat]
    "bounds": [85.60, 19.70, 86.15, 20.15], # [min_lon, min_lat, max_lon, max_lat]
    "zoom": 11
}

# Thresholds and Operational Assumptions (All documented as ASSUMPTIONS)
ASSUMPTIONS = {
    "ROUTE_BLOCK_THRESHOLD": 0.50,         # Road edge closed if failure probability >= 0.50
    "EVACUATION_ROUTE_BLOCK_THRESHOLD": 0.20,# Evacuation requires stricter safety margin (<0.20)
    "HOSPITAL_BASELINE_OCCUPANCY_MIN": 0.70,# Normal hospital bed occupancy lower bound
    "HOSPITAL_BASELINE_OCCUPANCY_MAX": 0.85,# Normal hospital bed occupancy upper bound
    "MEXCLP_BUSY_PROBABILITY": 0.30,        # Ambulance unit busy probability (q = 0.30)
    "MEXCLP_URBAN_RADIUS_KM": 8.0,          # Urban ambulance coverage radius
    "MEXCLP_RURAL_RADIUS_KM": 15.0,         # Rural ambulance coverage radius
    "TARGET_RESPONSE_TIME_MIN": 15.0,       # Emergency dispatch target SLA
    "MAX_MIN_EQUITY_RATIO": 0.65,           # Worst-district coverage must be >= 65% of regional avg
    "CONVEX_OCCUPANCY_PENALTY_FACTOR": 10.0,# Convex penalty scaling factor for hospital occupancy
    "STALE_DATA_PENALTY_PER_MIN": 0.5,      # Time penalty added per minute of telemetry age
    "POWER_LOSS_CAPACITY_DERATING": 0.50,   # Usable bed capacity reduced by 50% on power loss
    # Survival Curve Placeholders (Explicitly not clinical values, used for OR score benchmarking)
    "LAMBDA_TRAUMA": 0.08,                  # Survival decay per min for trauma
    "LAMBDA_CARDIAC": 0.12,                 # Survival decay per min for cardiac
    "LAMBDA_GENERAL": 0.03,                 # Survival decay per min for general emergency
}

# Scenario Timeline Steps for Cyclone Fani Landfall
CYCLONE_SCENARIO_TIMELINE = [
    {
        "step_id": "T-48h",
        "label": "T-48h: Cyclone Cone Appears",
        "description": "IMD/GDACS cone of uncertainty reaches Bay of Bengal off Odisha coast. Cloud bands increasing. River discharge normal (120 m³/s).",
        "hazard_level": "low",
        "cone_radius_km": 120.0,
        "wind_speed_kmh": 65.0,
        "rain_rate_mmh": 10.0,
        "river_discharge_m3s": 140.0,
        "flooded_edges": [],
        "debris_edges": [],
        "hospital_status_override": {}
    },
    {
        "step_id": "T-24h",
        "label": "T-24h: Cone Narrows & River Discharge Rises",
        "description": "Cone narrows towards Puri coast. Heavy feeder bands cause rainfall. GloFAS discharge jumps to 480 m³/s. Surge warning issued.",
        "hazard_level": "moderate",
        "cone_radius_km": 60.0,
        "wind_speed_kmh": 110.0,
        "rain_rate_mmh": 35.0,
        "river_discharge_m3s": 490.0,
        "flooded_edges": [],
        "debris_edges": [],
        "hospital_status_override": {}
    },
    {
        "step_id": "T-6h",
        "label": "T-6h: Two Low Bridges Flood Risk Exceeded",
        "description": "Kushabhadra River Bridge (Marine Drive) and Bhargavi River Bridge (NH-316 link) submerge as river overflows banks. Failure prob > 0.85.",
        "hazard_level": "severe",
        "cone_radius_km": 30.0,
        "wind_speed_kmh": 160.0,
        "rain_rate_mmh": 75.0,
        "river_discharge_m3s": 920.0,
        "flooded_edges": ["edge_marine_drive_kushabhadra_bridge", "edge_nh316_bhargavi_bridge"],
        "debris_edges": [],
        "hospital_status_override": {}
    },
    {
        "step_id": "Landfall",
        "label": "Landfall: Coastal Hospital Power & Comms Outage",
        "description": "Cyclone eye makes landfall near Puri. Coastal Infectious Disease Hospital loses grid power, backup generator flooded, comms down. ICU unusable.",
        "hazard_level": "critical",
        "cone_radius_km": 15.0,
        "wind_speed_kmh": 215.0,
        "rain_rate_mmh": 120.0,
        "river_discharge_m3s": 1350.0,
        "flooded_edges": ["edge_marine_drive_kushabhadra_bridge", "edge_nh316_bhargavi_bridge", "edge_coastal_beach_road"],
        "debris_edges": [],
        "hospital_status_override": {
            "hosp_puri_coastal_id": {
                "has_power": False,
                "has_comms": False,
                "free_icu_beds": 0,
                "derated_capacity_ratio": 0.20,
                "status_reason": "Grid failure + flooded backup generator + telecom tower down."
            }
        }
    },
    {
        "step_id": "T+6h",
        "label": "T+6h: Debris Blocks Highway Segment",
        "description": "Fallen trees and uprooted power pylons block NH-316 between Satyabadi and Pipili. Marine Drive still inundated. Emergency calls surge.",
        "hazard_level": "recovery",
        "cone_radius_km": 40.0,
        "wind_speed_kmh": 120.0,
        "rain_rate_mmh": 45.0,
        "river_discharge_m3s": 1100.0,
        "flooded_edges": ["edge_marine_drive_kushabhadra_bridge", "edge_nh316_bhargavi_bridge", "edge_coastal_beach_road"],
        "debris_edges": ["edge_nh316_satyabadi_pipili"],
        "hospital_status_override": {
            "hosp_puri_coastal_id": {
                "has_power": False,
                "has_comms": False,
                "free_icu_beds": 0,
                "derated_capacity_ratio": 0.20,
                "status_reason": "Grid failure + flooded backup generator + telecom tower down."
            }
        }
    }
]

# Heatwave Scenario
HEATWAVE_SCENARIO_TIMELINE = [
    {
        "step_id": "HW-Day1-10AM",
        "label": "Day 1 - 10:00 AM: Heat Advisory Issued",
        "description": "Northwesterly dry winds push ambient temperatures to 41°C. Wet bulb 28°C. IMD issues yellow warning.",
        "hazard_level": "moderate",
        "apparent_temperature": 43.5,
        "wet_bulb_temperature": 28.2,
        "older_adult_risk_multiplier": 1.4,
        "flooded_edges": [],
        "debris_edges": [],
        "hospital_status_override": {}
    },
    {
        "step_id": "HW-Day2-02PM",
        "label": "Day 2 - 02:00 PM: Extreme Heat Peak",
        "description": "Severe heatwave. Apparent temperature 48.2°C, wet bulb 32.5°C. High heat-stroke vulnerability among elderly in dense urban wards.",
        "hazard_level": "critical",
        "apparent_temperature": 48.2,
        "wet_bulb_temperature": 32.5,
        "older_adult_risk_multiplier": 3.2,
        "flooded_edges": [],
        "debris_edges": [],
        "hospital_status_override": {}
    },
    {
        "step_id": "HW-Day3-04PM",
        "label": "Day 3 - 04:00 PM: Sustained Thermal Stress & Transformer Trips",
        "description": "Grid overload causes localized power trips at Gop CHC. Cooling points deployed at high-density elderly zones.",
        "hazard_level": "severe",
        "apparent_temperature": 46.0,
        "wet_bulb_temperature": 31.0,
        "older_adult_risk_multiplier": 2.6,
        "flooded_edges": [],
        "debris_edges": [],
        "hospital_status_override": {
            "hosp_gop_chc": {
                "has_power": False,
                "has_comms": True,
                "free_icu_beds": 0,
                "derated_capacity_ratio": 0.50,
                "status_reason": "Substation transformer overload trip; auxiliary fans running on generator."
            }
        }
    }
]
