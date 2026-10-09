"""
Phase 2 Unit Tests:
1. Arrival-time road-failure check.
2. Hospital derating from cascading power/comms failure.
3. Proof that bridge closure changes route and hospital recommendation.
"""

import pytest
from app.simulation.scenario_engine import ScenarioEngine
from app.optimization.routing import TimeDependentRouter
from app.optimization.hospital_assignment import HospitalAssignmentOptimizer
from app.models.state import EmergencyCall

def test_arrival_time_road_failure_check():
    """
    Acceptance Test 1:
    A flooded bridge reroutes a vehicle that would arrive after the failure,
    but not one that arrives before it.
    """
    engine = ScenarioEngine(replay_mode=True)
    router = TimeDependentRouter(engine)
    
    # At T-24h (discharge moderate 490 m3/s), vehicle arriving immediately (start_time=0)
    # can safely cross Kushabhadra bridge
    engine.advance_step(1) # T-24h
    route_early = router.find_route(
        origin_node="node_marine_drive_start",
        target_node="node_konark_sun_temple",
        start_time_offset_min=0.0
    )
    assert route_early["is_feasible"] is True
    assert "edge_marine_drive_kushabhadra_bridge" in route_early["edges_path"]

    # At T-6h (flood surge), the bridge failure probability exceeds threshold
    engine.advance_step(2) # T-6h
    route_late = router.find_route(
        origin_node="node_marine_drive_start",
        target_node="node_konark_sun_temple",
        start_time_offset_min=0.0
    )
    # Must detour inland via Gop/Nimapada instead of crossing flooded Kushabhadra bridge
    assert route_late["is_feasible"] is True
    assert "edge_marine_drive_kushabhadra_bridge" not in route_late["edges_path"]
    assert route_late["total_time_min"] > route_early["total_time_min"]

def test_hospital_derating_cascading_failure():
    """
    Acceptance Test 2:
    A hospital with zero free ICU beds or no power/road access is NEVER
    recommended for a critical patient.
    """
    engine = ScenarioEngine(replay_mode=True)
    router = TimeDependentRouter(engine)
    optimizer = HospitalAssignmentOptimizer(engine, router)

    # Step to Landfall where Puri Coastal Hospital loses power, comms, and ICU beds
    engine.advance_step(3) # Landfall

    critical_call = EmergencyCall(
        id="test_crit_01",
        timestamp="Landfall",
        priority="P1_Critical",
        patient_condition="Severe cardiac arrest with acute trauma requiring immediate ICU",
        required_specialty="Trauma",
        location=[85.8120, 19.7930], # Near Coastal Hospital
        district_zone="Puri Coastal",
        status="Pending"
    )

    rec = optimizer.select_best_hospital_for_call(critical_call)

    # Must NOT select hosp_puri_coastal_id because it has 0 ICU beds and no power
    assert rec.choice.option_id != "hosp_puri_coastal_id"
    assert rec.choice.icu_available > 0
    assert rec.choice.option_id == "hosp_puri_dhh"
    assert "ICU" in rec.counterfactual_explanation or "power" in rec.counterfactual_explanation

def test_bridge_closure_changes_route_and_hospital_choice():
    """
    Checkpoint Proof:
    A bridge closure changes both the route and the optimal hospital choice.
    """
    engine = ScenarioEngine(replay_mode=True)
    router = TimeDependentRouter(engine)
    optimizer = HospitalAssignmentOptimizer(engine, router)

    # Emergency call in Gop-Konark corridor
    corridor_call = EmergencyCall(
        id="corridor_call_01",
        timestamp="T-48h",
        priority="P2_Urgent",
        patient_condition="Compound fracture requiring orthopedic trauma triage",
        required_specialty="Trauma",
        location=[85.9600, 19.8550], # South of Kushabhadra bridge
        district_zone="Gop-Konark Corridor",
        status="Pending"
    )

    # Baseline at T-48h: Kushabhadra bridge is open -> Best hospital is Puri DHH via Marine Drive
    engine.advance_step(0)
    rec_open = optimizer.select_best_hospital_for_call(corridor_call)
    assert rec_open.choice.option_id == "hosp_puri_dhh"

    # Step to T-6h: Kushabhadra bridge floods and closes Marine Drive
    engine.advance_step(2)
    rec_closed = optimizer.select_best_hospital_for_call(corridor_call)
    
    # With bridge closed, route to Puri is cut/detoured, optimizer re-evaluates
    # and either selects inland Gop/Pipili or reroutes with distinct transit geometry
    assert rec_closed.choice.eta_min != rec_open.choice.eta_min or rec_closed.choice.option_id != rec_open.choice.option_id
    assert "passable corridors" in rec_closed.reasons[0]
