"""
Risk Grid Engine.
Implements Noisy-OR multi-hazard fusion (Flood + Cyclone + Heat)
scaled by Exposure (Population Density) and Vulnerability (Age 65+ Demographic).
"""

from typing import List, Dict, Any
from app.models.state import RiskGridCell, HazardForecast

class RiskGridCalculator:
    @staticmethod
    def compute_noisy_or_hazard(p_flood: float, p_cyclone: float, p_heat: float) -> float:
        """
        Noisy-OR model: P(Hazard) = 1 - (1 - p_flood) * (1 - p_cyclone) * (1 - p_heat)
        """
        p_f = max(0.0, min(1.0, p_flood))
        p_c = max(0.0, min(1.0, p_cyclone))
        p_h = max(0.0, min(1.0, p_heat))
        return round(1.0 - ((1.0 - p_f) * (1.0 - p_c) * (1.0 - p_h)), 4)

    @classmethod
    def evaluate_cell_risk(
        cls,
        cell_data: Dict[str, Any],
        forecast: HazardForecast
    ) -> RiskGridCell:
        pop = cell_data.get("population", 0)
        elderly = cell_data.get("elderly_population", 0)
        elev = cell_data.get("elevation_m", 5.0)

        if forecast.hazard_type == "cyclone":
            p_flood = min(1.0, max(0.02, (forecast.river_discharge_m3s / 1400.0) * (6.0 / max(1.5, elev)) * (forecast.rain_rate_mmh / 100.0)))
            p_cyclone = min(1.0, max(0.05, forecast.wind_speed_kmh / 215.0))
            p_heat = 0.05
        else: # heatwave
            p_flood = 0.02
            p_cyclone = 0.02
            p_heat = min(1.0, max(0.15, (forecast.apparent_temp_c - 35.0) / 14.0))

        combined_hazard = cls.compute_noisy_or_hazard(p_flood, p_cyclone, p_heat)

        # Vulnerability = elderly ratio + baseline social vulnerability
        elderly_ratio = elderly / max(1, pop)
        vulnerability = round(min(1.0, 0.4 + (elderly_ratio * 3.0)), 3)

        # Exposure = normalized population weight
        exposure = min(1.0, pop / 10000.0)

        # Total Risk = Hazard x Exposure x Vulnerability
        combined_risk = round(combined_hazard * (0.3 + 0.7 * exposure) * (0.5 + 0.5 * vulnerability), 4)

        return RiskGridCell(
            id=cell_data.get("id", "cell_unknown"),
            lon=cell_data["lon"],
            lat=cell_data["lat"],
            hazard_flood=round(p_flood, 3),
            hazard_cyclone=round(p_cyclone, 3),
            hazard_heat=round(p_heat, 3),
            combined_hazard=combined_hazard,
            population=pop,
            elderly_population=elderly,
            vulnerability_score=vulnerability,
            combined_risk=combined_risk
        )
