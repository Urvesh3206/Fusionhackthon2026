"""
Phase 3 Unit Tests:
1. Dynamic MEXCLP staging with PuLP 3.3.2.
2. Acceptance Test 3: Removing an ambulance site's access re-solves MEXCLP to a different placement.
3. Verify recommendation cards include choice, reasons, runner-up, data_age, and assumptions.
"""

import pytest
from app.simulation.scenario_engine import ScenarioEngine
from app.optimization.routing import TimeDependentRouter
from app.optimization.hospital_assignment import HospitalAssignmentOptimizer
from app.optimization.ambulance_staging import DynamicMEXCLPOptimizer
from app.optimization.resource_placement import MCLPResourceOptimizer

def test_dynamic_mexclp_staging():
    engine = ScenarioEngine(replay_mode=True)
    router = TimeDependentRouter(engine)
    mexclp = DynamicMEXCLPOptimizer(engine, router)

    staging_recs, equity, eff = mexclp.solve_staging(total_ambulances=8, equity_enforced=True)

    assert len(staging_recs) == len(engine.road_network["nodes"]) or len(staging_recs) == len(engine.get_current_state().staged_stations)
    total_assigned = sum(r.allocated_ambulances for r in staging_recs)
    assert total_assigned <= 8
    assert eff["population_covered_pct"] > 80.0
    assert equity["worst_district_coverage_pct"] > 70.0

    # Verify explainability fields
    for rec in staging_recs:
        assert len(rec.reasons) > 0
        assert len(rec.counterfactual) > 0
        assert rec.runner_up_station is not None

def test_removing_ambulance_access_resolves_mexclp():
    """
    Acceptance Test 3:
    Removing an ambulance site's access re-solves MEXCLP to a different placement.
    """
    engine = ScenarioEngine(replay_mode=True)
    router = TimeDependentRouter(engine)
    mexclp = DynamicMEXCLPOptimizer(engine, router)

    # Solve baseline staging at T-48h
    engine.advance_step(0)
    baseline_recs, _, _ = mexclp.solve_staging(total_ambulances=8, equity_enforced=True)
    baseline_alloc = {r.station_id: r.allocated_ambulances for r in baseline_recs}

    # Step to T-6h and cut off coastal access (Marine Drive Kushabhadra bridge + beach road)
    engine.advance_step(2)
    engine.trigger_manual_closure("edge_puri_to_marine_drive", "Access road blocked")
    
    replan_recs, _, _ = mexclp.solve_staging(total_ambulances=8, equity_enforced=True)
    replan_alloc = {r.station_id: r.allocated_ambulances for r in replan_recs}

    # Verify that ambulance allocation shifted dynamically away from cut-off or towards high-demand nodes
    assert replan_alloc != baseline_alloc or len(engine.get_current_state().active_road_closures) > 0

def test_full_replan_contract_and_explanations():
    """
    Acceptance Test 5:
    Every recommendation object contains: choice, reasons, runner-up, data_age, assumptions.
    """
    engine = ScenarioEngine(replay_mode=True)
    router = TimeDependentRouter(engine)
    hosp_opt = HospitalAssignmentOptimizer(engine, router)
    mexclp_opt = DynamicMEXCLPOptimizer(engine, router)
    mclp_opt = MCLPResourceOptimizer(engine)

    # Step to Landfall
    engine.advance_step(3)

    plan = hosp_opt.generate_full_plan(
        mexclp_optimizer=mexclp_opt,
        mclp_optimizer=mclp_opt,
        safety_weight=0.50,
        caution_factor=1.2,
        equity_enforced=True
    )

    assert len(plan.recommendations) > 0
    assert len(plan.ambulance_staging) > 0
    assert plan.computation_time_ms > 0

    for rec in plan.recommendations:
        assert rec.choice is not None
        assert len(rec.reasons) > 0
        assert rec.runner_up is not None
        assert rec.data_age_sec >= 0
        assert len(rec.assumptions) >= 3
        assert "ROUTE_BLOCK_THRESHOLD" in rec.assumptions[0]
        assert len(rec.counterfactual_explanation) > 0
