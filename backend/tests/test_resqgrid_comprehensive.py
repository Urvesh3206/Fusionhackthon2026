"""
Comprehensive Test Suite for ResQGrid AI Platform.
Tests algorithmic constraints, optimization engines, data export sanitization, and API endpoints.
"""

import pytest
from app.simulation.scenario_engine import ScenarioEngine
from app.optimization.routing import TimeDependentRouter
from app.optimization.hospital_assignment import HospitalAssignmentOptimizer
from app.optimization.evacuation_planner import EvacuationPlanner
from app.forecasting.demand_forecaster import EmergencyDemandForecaster
from app.export.reports import sanitize_csv_cell, export_incidents_to_csv
from app.security.auth import DEMO_USERS, verify_token

def test_csv_formula_injection_prevention():
    """Verify cells starting with =, +, -, @ are escaped with a single quote."""
    assert sanitize_csv_cell("=SUM(A1:A10)") == "'=SUM(A1:A10)"
    assert sanitize_csv_cell("+12345") == "'+12345"
    assert sanitize_csv_cell("-cmd|' /C calc'!A0") == "'-cmd|' /C calc'!A0"
    assert sanitize_csv_cell("@username") == "'@username"
    assert sanitize_csv_cell("Normal Text") == "Normal Text"
    assert sanitize_csv_cell(None) == ""

def test_demand_forecasting_horizons():
    """Verify 15, 30, and 60 min horizons are computed with positive bounds."""
    zones = [{"id": "z1", "name": "Zone 1", "population": 50000, "vulnerability": 0.7}]
    incidents = [{"district_zone": "Zone 1"}]
    weather = {"rain_rate_mmh": 40.0, "wind_speed_kmh": 90.0, "apparent_temp_c": 32.0, "wet_bulb_temp_c": 28.0}
    
    forecasts = EmergencyDemandForecaster.forecast_demand(zones, incidents, weather)
    assert len(forecasts) == 3
    horizons = [f.horizon_min for f in forecasts]
    assert horizons == [15, 30, 60]
    
    for f in forecasts:
        assert f.predicted_call_rate > 0
        assert f.upper_bound_95ci >= f.predicted_call_rate
        assert f.lower_bound_95ci <= f.predicted_call_rate
        assert len(f.key_drivers) > 0

def test_evacuation_planning_capacity_constraint():
    """Verify assigned population never exceeds total shelter capacity."""
    engine = ScenarioEngine(replay_mode=True)
    router = TimeDependentRouter(engine)
    planner = EvacuationPlanner(engine, router)
    
    plan = planner.generate_evacuation_plan()
    assert plan.total_zones > 0
    assert plan.total_at_risk_population > 0
    assert plan.assigned_population <= plan.total_at_risk_population
    
    for util in plan.shelter_utilization:
        assert util["final_occupancy"] <= util["total_capacity"]

def test_role_based_auth_tokens():
    """Verify demo accounts have appropriate permissions."""
    admin = DEMO_USERS["admin"]
    assert admin.role == "admin"
    assert "*" in admin.permissions
    
    disp = DEMO_USERS["dispatcher"]
    assert disp.role == "dispatcher"
    assert "vehicles:dispatch" in disp.permissions
    
    user = verify_token("Bearer token_dispatcher")
    assert user.username == "dispatcher"

def test_hospital_matching_power_derating():
    """Verify hospital that loses power and ICU beds is heavily penalized."""
    engine = ScenarioEngine(replay_mode=True)
    router = TimeDependentRouter(engine)
    opt = HospitalAssignmentOptimizer(engine, router)
    
    # At landfall, coastal ID hospital loses power
    engine.set_scenario("cyclone_fani")
    engine.advance_step(3) # Landfall step
    state = engine.get_current_state()
    
    coastal_hosp = next(h for h in state.hospitals if h.id == "hosp_puri_coastal_id")
    assert coastal_hosp.has_power is False
    assert coastal_hosp.free_icu_beds == 0
