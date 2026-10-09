"""
Emergency Demand Forecasting Engine for ResQGrid AI.
Provides explainable zone-level emergency demand forecasts across 15, 30, and 60-minute horizons.
Uses Poisson rate modeling incorporating recent incident velocity, population density,
and weather hazard indices (precipitation intensity, wind speed, wet bulb temperature).
"""

import math
from typing import List, Dict, Any
from app.models.system_models import DemandForecastPoint

class EmergencyDemandForecaster:
    @staticmethod
    def forecast_demand(
        zones: List[Dict[str, Any]],
        recent_incidents: List[Dict[str, Any]],
        weather_metrics: Dict[str, Any],
        scenario_id: str = "cyclone_fani"
    ) -> List[DemandForecastPoint]:
        """
        Calculates expected emergency call volume per zone for 15, 30, and 60 min horizons.
        """
        results: List[DemandForecastPoint] = []
        
        rain_rate = weather_metrics.get("rain_rate_mmh", 25.0)
        wind_speed = weather_metrics.get("wind_speed_kmh", 80.0)
        wet_bulb = weather_metrics.get("wet_bulb_temp_c", 28.0)
        apparent_temp = weather_metrics.get("apparent_temp_c", 35.0)

        # Base weather stress multiplier
        is_heatwave = "heatwave" in scenario_id.lower() or apparent_temp > 40.0
        if is_heatwave:
            weather_multiplier = 1.0 + max(0.0, (apparent_temp - 38.0) * 0.15) + max(0.0, (wet_bulb - 29.0) * 0.25)
            primary_driver = f"Severe Thermal Index (Apparent Temp {apparent_temp:.1f}°C, Wet Bulb {wet_bulb:.1f}°C)"
        else:
            weather_multiplier = 1.0 + (rain_rate / 60.0) * 0.8 + (wind_speed / 120.0) * 0.6
            primary_driver = f"Cyclone Inflow (Rain {rain_rate:.0f}mm/h, Wind {wind_speed:.0f}km/h)"

        # Calculate incident counts per zone in the last window
        zone_counts: Dict[str, int] = {}
        for inc in recent_incidents:
            loc = inc.get("district_zone", "Puri Urban")
            zone_counts[loc] = zone_counts.get(loc, 0) + 1

        for z in zones:
            z_id = z.get("id", "z_puri_core")
            z_name = z.get("name", "Puri Urban Ward")
            pop = z.get("population", 50000)
            vuln = z.get("vulnerability", 0.5)
            past_calls = zone_counts.get(z_name, 1)

            # Baseline baseline rate lambda_0 per hour per 10k population
            lambda_base_per_10k_hr = 0.45 * vuln * (1.0 + 0.2 * past_calls)

            for horizon in [15, 30, 60]:
                horizon_fraction_hr = horizon / 60.0
                expected_calls = (pop / 10000.0) * lambda_base_per_10k_hr * weather_multiplier * horizon_fraction_hr
                
                # 95% Confidence Interval based on Poisson variation (approx 1.96 * sqrt(expected))
                margin = 1.96 * math.sqrt(max(0.2, expected_calls))
                lower_ci = max(0.0, round(expected_calls - margin, 1))
                upper_ci = round(expected_calls + margin, 1)
                
                uncertainty = "Low" if horizon == 15 else ("Medium" if horizon == 30 else "High")
                
                results.append(DemandForecastPoint(
                    horizon_min=horizon,
                    zone_id=z_id,
                    zone_name=z_name,
                    predicted_call_rate=round(expected_calls, 2),
                    lower_bound_95ci=lower_ci,
                    upper_bound_95ci=upper_ci,
                    key_drivers=[
                        primary_driver,
                        f"Zone Population Density ({pop:,} residents)",
                        f"Vulnerability Factor ({vuln:.2f})",
                        f"Recent Incident Velocity ({past_calls} recent calls)"
                    ],
                    model_type="Explainable Poisson-Regression Baseline with Weather Covariates",
                    uncertainty_level=uncertainty
                ))

        return results
