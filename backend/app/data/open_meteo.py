"""
Open-Meteo Weather and GloFAS Flood API Client with disk caching.
CC BY 4.0 Open-Meteo attribution compliance.
"""

import os
import json
import logging
import httpx
from pathlib import Path
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)
CACHE_DIR = Path(__file__).parent / "snapshots" / "cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

class OpenMeteoClient:
    def __init__(self, replay_mode: bool = False):
        self.replay_mode = replay_mode or os.getenv("REPLAY", "1") == "1"
        self.weather_url = "https://api.open-meteo.com/v1/forecast"
        self.flood_url = "https://flood-api.open-meteo.com/v1/flood"

    async def get_forecast(self, lat: float = 19.8135, lon: float = 85.8312) -> Dict[str, Any]:
        cache_file = CACHE_DIR / f"meteo_{lat:.2f}_{lon:.2f}.json"
        
        # If replay mode is active or cache exists and is offline, use cache
        if self.replay_mode and cache_file.exists():
            with open(cache_file, "r", encoding="utf-8") as f:
                return json.load(f)
        
        if not self.replay_mode:
            try:
                async with httpx.AsyncClient(timeout=4.0) as client:
                    resp = await client.get(
                        self.weather_url,
                        params={
                            "latitude": lat,
                            "longitude": lon,
                            "hourly": "apparent_temperature,precipitation,wind_speed_10m",
                            "current": "temperature_2m,apparent_temperature,precipitation,wind_speed_10m"
                        }
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        with open(cache_file, "w", encoding="utf-8") as f:
                            json.dump(data, f)
                        return data
            except Exception as e:
                logger.warning(f"Open-Meteo live call failed ({e}), falling back to disk cache/snapshot.")

        # Fallback snapshot
        return {
            "current": {
                "apparent_temperature": 34.2,
                "precipitation": 12.5,
                "wind_speed_10m": 45.0
            },
            "attribution": "Weather data by Open-Meteo.com (CC BY 4.0)"
        }

    async def get_river_discharge(self, lat: float = 19.8550, lon: float = 85.9600) -> Dict[str, Any]:
        cache_file = CACHE_DIR / f"glofas_{lat:.2f}_{lon:.2f}.json"
        
        if self.replay_mode and cache_file.exists():
            with open(cache_file, "r", encoding="utf-8") as f:
                return json.load(f)
        
        if not self.replay_mode:
            try:
                async with httpx.AsyncClient(timeout=4.0) as client:
                    resp = await client.get(
                        self.flood_url,
                        params={
                            "latitude": lat,
                            "longitude": lon,
                            "daily": "river_discharge"
                        }
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        with open(cache_file, "w", encoding="utf-8") as f:
                            json.dump(data, f)
                        return data
            except Exception as e:
                logger.warning(f"Open-Meteo GloFAS live call failed ({e}), using fallback.")

        return {
            "daily": {
                "river_discharge": [140.0, 490.0, 930.0, 1380.0, 1150.0]
            },
            "attribution": "GloFAS river discharge by Open-Meteo.com (CC BY 4.0)"
        }
