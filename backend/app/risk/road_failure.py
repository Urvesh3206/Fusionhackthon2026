"""
Time-Dependent Road Failure Model.
Calculates failure probability P_fail(e, t) for an edge at arrival time t
based on elevation above river, rainfall intensity, and GloFAS discharge forecasts.
"""

from typing import Dict, Any, Optional
from app.models.state import RoadEdge, HazardForecast
from app.config import ASSUMPTIONS

class RoadFailureModel:
    @staticmethod
    def calculate_failure_probability(
        edge: RoadEdge,
        forecast: HazardForecast,
        time_offset_min: float = 0.0,
        caution_factor: float = 1.0
    ) -> float:
        """
        Calculates the probability that edge `edge` is impassable/failed
        at arrival time `t = current_time + time_offset_min`.
        """
        if edge.is_closed:
            return 1.0

        elev = edge.elevation_m
        dist_river = edge.river_distance_m
        rain = forecast.rain_rate_mmh
        discharge = forecast.river_discharge_m3s

        # If time is advancing towards peak storm surge / river crest (e.g. at T-6h or Landfall)
        # river discharge ramps up over time
        effective_discharge = discharge + (time_offset_min * 1.5)
        effective_rain = rain + (time_offset_min * 0.1)

        # 1. Hydraulic overtopping component (for bridges and low river approaches)
        if dist_river < 50 and elev < 3.0:
            # Low bridge directly over river
            discharge_ratio = effective_discharge / 900.0 # Critical threshold 900 m3/s
            overtopping_prob = 1.0 / (1.0 + 2.718 ** (-4.5 * (discharge_ratio - 0.95)))
        else:
            overtopping_prob = max(0.01, (effective_discharge / 2500.0) * (3.0 / max(2.0, elev)))

        # 2. Localized pluvial surface flooding component
        pluvial_prob = min(0.6, (effective_rain / 120.0) * (5.0 / max(2.0, elev)))

        # Combined edge failure probability
        raw_prob = min(1.0, max(0.02, overtopping_prob + pluvial_prob * 0.4))

        # Apply caution factor for stale edge data
        if edge.data_age_sec > 300: # Stale data penalty
            raw_prob = min(1.0, raw_prob * (1.0 + (caution_factor - 1.0) * 0.5))

        return round(raw_prob, 4)

    @classmethod
    def is_edge_passable_at_arrival(
        cls,
        edge: RoadEdge,
        forecast: HazardForecast,
        arrival_time_min: float,
        block_threshold: float = ASSUMPTIONS["ROUTE_BLOCK_THRESHOLD"],
        caution_factor: float = 1.0
    ) -> bool:
        """
        Feature 1: Arrival-Time Road-Failure Check.
        Judges the edge on the forecast state when the vehicle ARRIVES, not now.
        """
        p_fail = cls.calculate_failure_probability(
            edge=edge,
            forecast=forecast,
            time_offset_min=arrival_time_min,
            caution_factor=caution_factor
        )
        return p_fail < block_threshold
