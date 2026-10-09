"""
Telemetry Simulators for Emergency State:
Simulates dynamic occupancy drift, ambulance battery/fuel telemetry, and telemetry data-age badges.
"""

import random
import time
from typing import List
from app.models.state import Hospital, Ambulance

class TelemetrySimulator:
    def __init__(self):
        self.last_sync = time.time()

    def simulate_telemetry_drift(self, hospitals: List[Hospital], ambulances: List[Ambulance]):
        current_time = time.time()
        elapsed = current_time - self.last_sync
        self.last_sync = current_time

        for h in hospitals:
            if h.has_comms:
                # Random slight drift of occupied beds
                if random.random() < 0.3:
                    delta = random.choice([-1, 0, 1])
                    h.occupied_beds = max(0, min(h.usable_beds, h.occupied_beds + delta))
                h.data_age_sec = int(elapsed % 45) + 5
            else:
                h.data_age_sec += int(elapsed)

        for amb in ambulances:
            amb.data_age_sec = int(elapsed % 20) + 2
