"""
Phase 1 automated tests: data loader, scenario engine, replay mode, state contract.
"""

import pytest
from app.simulation.scenario_engine import ScenarioEngine

def test_data_loader_and_scenario_engine():
    engine = ScenarioEngine(replay_mode=True)
    state = engine.get_current_state()
    
    assert state.scenario_id == "cyclone_fani_puri"
    assert state.active_step_id == "T-48h"
    assert len(state.road_edges) > 10
    assert len(state.hospitals) >= 6
    assert len(state.ambulances) >= 8
    assert state.offline_mode is True
    
    # Check simulated flags
    for e in state.road_edges:
        assert e.simulated is True
        assert e.data_age_sec >= 0
    
    for h in state.hospitals:
        assert h.simulated is True
        assert h.data_age_sec >= 0

def test_scenario_step_progression():
    engine = ScenarioEngine(replay_mode=True)
    
    # Advance to T-24h
    state_24h = engine.advance_step(1)
    assert state_24h.active_step_id == "T-24h"
    assert state_24h.forecast.wind_speed_kmh >= 100.0
    
    # Advance to T-6h (Bridges flood)
    state_6h = engine.advance_step(2)
    assert state_6h.active_step_id == "T-6h"
    closed_edges = [e.id for e in state_6h.road_edges if e.is_closed]
    assert "edge_marine_drive_kushabhadra_bridge" in closed_edges
    assert "edge_nh316_bhargavi_bridge" in closed_edges
    
    # Advance to Landfall (Hospital derating)
    state_landfall = engine.advance_step(3)
    assert state_landfall.active_step_id == "Landfall"
    coastal_hosp = next(h for h in state_landfall.hospitals if h.id == "hosp_puri_coastal_id")
    assert coastal_hosp.has_power is False
    assert coastal_hosp.free_icu_beds == 0
    assert coastal_hosp.derated_capacity_ratio < 1.0

def test_live_manual_road_closure():
    engine = ScenarioEngine(replay_mode=True)
    state = engine.trigger_manual_closure("edge_grand_road", "Field police emergency barrier")
    grand_road = next(e for e in state.road_edges if e.id == "edge_grand_road")
    assert grand_road.is_closed is True
    assert "Field police" in (grand_road.closure_reason or "")
    
    # Clear manual closure
    state_cleared = engine.clear_manual_closures()
    grand_road_cleared = next(e for e in state_cleared.road_edges if e.id == "edge_grand_road")
    assert grand_road_cleared.is_closed is False
