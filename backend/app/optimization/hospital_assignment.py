"""
Capacity-Constrained Hospital Assignment & Cascading Derating Engine.
Implements Feature 2: Hospital derating from cascading failure,
convex occupancy penalty, and counterfactual explanation generation.
"""

import time
from typing import List, Dict, Any, Optional, Tuple
from app.models.state import Hospital, EmergencyCall, Ambulance
from app.models.optimization import (
    CandidateOption, Recommendation, OptimizationPlanResponse,
    AmbulanceStagingRecommendation
)
from app.config import ASSUMPTIONS

class HospitalAssignmentOptimizer:
    def __init__(self, scenario_engine, router):
        self.scenario_engine = scenario_engine
        self.router = router

    def score_hospital_candidate(
        self,
        hospital: Hospital,
        call: EmergencyCall,
        route_result: Dict[str, Any],
        caution_factor: float = 1.0
    ) -> Tuple[float, Dict[str, Any]]:
        """
        Calculates penalty score for assigning a patient call to a hospital.
        Lower score = better match.
        """
        if not route_result or not route_result.get("is_feasible", False):
            return 99999.0, {"reason": "Hospital unreachable due to flooded road corridors"}

        travel_time_min = route_result["total_time_min"]
        
        # 1. Base travel time cost
        cost = travel_time_min

        # 2. Specialty matching penalty
        req_specialty = call.required_specialty
        specialty_match = req_specialty in hospital.specialties or req_specialty == "General"
        if not specialty_match:
            cost += 500.0 # Heavy penalty for missing trauma/cardiac specialty

        # 3. ICU Availability constraint for critical patients
        is_critical = call.priority in ["P1_Critical", "P1"]
        icu_penalty = 0.0
        if is_critical and hospital.free_icu_beds <= 0:
            cost += 1000.0 # Extreme penalty for critical patient with no free ICU bed
            icu_penalty = 1000.0

        # 4. Usable Capacity & Convex Occupancy Penalty
        usable = max(1, hospital.usable_beds)
        occupied = hospital.occupied_beds
        occupancy_ratio = min(1.2, occupied / usable)
        
        # Convex penalty: lambda_occ * (occupancy_ratio)^2
        convex_occ_penalty = ASSUMPTIONS["CONVEX_OCCUPANCY_PENALTY_FACTOR"] * (occupancy_ratio ** 2)
        cost += convex_occ_penalty

        # 5. Cascading Derating & Power Loss Penalty
        derate_penalty = 0.0
        if not hospital.has_power:
            cost += 200.0
            derate_penalty += 200.0
        if not hospital.has_comms:
            cost += 100.0
            derate_penalty += 100.0

        # 6. Telemetry Data-Age Penalty (Pessimism / Caution)
        data_age_min = hospital.data_age_sec / 60.0
        stale_penalty = (data_age_min * ASSUMPTIONS["STALE_DATA_PENALTY_PER_MIN"]) * caution_factor
        cost += stale_penalty

        details = {
            "travel_time_min": travel_time_min,
            "specialty_match": specialty_match,
            "free_icu_beds": hospital.free_icu_beds,
            "occupancy_ratio": round(occupancy_ratio, 2),
            "convex_occ_penalty": round(convex_occ_penalty, 1),
            "derate_penalty": derate_penalty,
            "stale_penalty": round(stale_penalty, 1),
            "has_power": hospital.has_power,
            "has_comms": hospital.has_comms
        }

        return round(cost, 2), details

    def select_best_hospital_for_call(
        self,
        call: EmergencyCall,
        safety_weight: float = 0.50,
        caution_factor: float = 1.0
    ) -> Recommendation:
        state = self.scenario_engine.get_current_state()
        call_node = self.router.find_nearest_node(call.location)
        
        candidates: List[Tuple[float, Hospital, Dict[str, Any], Dict[str, Any]]] = []

        for h in state.hospitals:
            h_node = self.router.find_nearest_node(h.location)
            route = self.router.find_route(
                origin_node=call_node,
                target_node=h_node,
                safety_weight=safety_weight,
                caution_factor=caution_factor
            )
            
            score, details = self.score_hospital_candidate(h, call, route, caution_factor)
            candidates.append((score, h, route, details))

        # Sort candidates by total score (ascending)
        candidates.sort(key=lambda x: x[0])

        top_score, top_h, top_route, top_details = candidates[0]
        runner_up = candidates[1] if len(candidates) > 1 else None

        # Build Primary Option
        primary_opt = CandidateOption(
            option_id=top_h.id,
            label=top_h.name,
            eta_min=top_route.get("total_time_min", 999.0),
            capacity_available=max(0, top_h.usable_beds - top_h.occupied_beds),
            icu_available=top_h.free_icu_beds,
            specialty_match=top_details.get("specialty_match", False),
            risk_score=top_route.get("average_risk", 0.0),
            data_age_sec=top_h.data_age_sec,
            score=top_score,
            details=top_details
        )

        # Find if there was a geographically closer hospital that was bypassed due to deratings/ICU
        bypassed_closer = None
        for score, cand_h, cand_route, cand_details in candidates:
            if cand_h.id != top_h.id:
                cand_eta = cand_route.get("total_time_min", 999.0)
                if cand_eta < primary_opt.eta_min or (not cand_h.has_power or cand_h.free_icu_beds == 0):
                    if not cand_h.has_power or cand_h.free_icu_beds == 0 or not cand_h.has_comms or not cand_route.get("is_feasible", False):
                        bypassed_closer = (cand_h, cand_route, cand_details)
                        break

        runner_up_opt = None
        counterfactual = "Optimal clinical assignment; no viable alternative within safe transit window."

        if bypassed_closer and (not bypassed_closer[0].has_power or bypassed_closer[0].free_icu_beds == 0 or not bypassed_closer[1].get("is_feasible", False)):
            b_h, b_route, b_details = bypassed_closer
            b_eta = b_route.get("total_time_min", 999.0)
            diff_str = f"{abs(primary_opt.eta_min - b_eta):.1f} min longer" if b_eta < primary_opt.eta_min else f"{abs(primary_opt.eta_min - b_eta):.1f} min difference"
            
            if not b_route.get("is_feasible", False):
                counterfactual = f"{primary_opt.label}: {b_h.name} is closer, but road access is flooded/cut-off."
            elif not b_h.has_power and b_h.free_icu_beds == 0:
                counterfactual = (
                    f"{primary_opt.label}: {diff_str} than {b_h.name}, "
                    f"but {b_h.name} suffered total power outage and has 0 free ICU beds (data {b_h.data_age_sec // 60} min old)."
                )
            elif b_h.free_icu_beds == 0 and call.priority in ["P1_Critical", "P1"]:
                counterfactual = (
                    f"{primary_opt.label}: {diff_str} than {b_h.name}, "
                    f"but {b_h.name} has 0 free ICU beds for critical triage."
                )
            else:
                counterfactual = f"{primary_opt.label}: bypassed {b_h.name} due to active facility derating ({b_h.status_reason})."

            runner_up_opt = CandidateOption(
                option_id=b_h.id,
                label=b_h.name,
                eta_min=b_eta,
                capacity_available=max(0, b_h.usable_beds - b_h.occupied_beds),
                icu_available=b_h.free_icu_beds,
                specialty_match=b_details.get("specialty_match", False),
                risk_score=b_route.get("average_risk", 0.0),
                data_age_sec=b_h.data_age_sec,
                score=b_details.get("score", 999.0),
                details=b_details
            )
        elif runner_up:
            r_score, r_h, r_route, r_details = runner_up
            runner_up_opt = CandidateOption(
                option_id=r_h.id,
                label=r_h.name,
                eta_min=r_route.get("total_time_min", 999.0),
                capacity_available=max(0, r_h.usable_beds - r_h.occupied_beds),
                icu_available=r_h.free_icu_beds,
                specialty_match=r_details.get("specialty_match", False),
                risk_score=r_route.get("average_risk", 0.0),
                data_age_sec=r_h.data_age_sec,
                score=r_score,
                details=r_details
            )

            # Generate natural explainable counterfactual comparison (Feature 4)
            time_delta = primary_opt.eta_min - runner_up_opt.eta_min
            if not top_h.has_power:
                counterfactual = f"{primary_opt.label} chosen over {runner_up_opt.label} despite emergency generator mode."
            elif not runner_up_opt.details.get("has_power", True):
                counterfactual = (
                    f"{primary_opt.label}: {abs(time_delta):.1f} min longer than {runner_up_opt.label}, "
                    f"but {runner_up_opt.label} suffered power loss and backup generator failure."
                )
            elif call.priority in ["P1_Critical", "P1"] and runner_up_opt.icu_available <= 0:
                counterfactual = (
                    f"{primary_opt.label}: {abs(time_delta):.1f} min longer than {runner_up_opt.label}, "
                    f"but {runner_up_opt.label} has NO free ICU beds (data {runner_up_opt.data_age_sec // 60} min old)."
                )
            elif not runner_up_opt.specialty_match:
                counterfactual = (
                    f"{primary_opt.label}: matched required specialty ({call.required_specialty}), "
                    f"whereas {runner_up_opt.label} lacks specialized trauma/cardiac staff."
                )
            elif runner_up_opt.eta_min > primary_opt.eta_min:
                counterfactual = (
                    f"{primary_opt.label}: {abs(time_delta):.1f} min faster transit time and lower corridor flood risk."
                )
            else:
                counterfactual = (
                    f"{primary_opt.label}: better bed buffer capacity ({primary_opt.capacity_available} free beds) "
                    f"vs overloaded {runner_up_opt.label}."
                )

        # Reasons list
        reasons = [
            f"Estimated transit time: {primary_opt.eta_min:.1f} min via passable corridors.",
            f"Usable capacity: {primary_opt.capacity_available} beds ({primary_opt.icu_available} ICU beds available).",
            f"Specialty match: {'Confirmed for ' + call.required_specialty if primary_opt.specialty_match else 'General Emergency'}.",
            f"Facility operational status: {'Stable grid power & comms' if top_h.has_power and top_h.has_comms else top_h.status_reason}."
        ]

        assumptions = [
            f"ROUTE_BLOCK_THRESHOLD = {ASSUMPTIONS['ROUTE_BLOCK_THRESHOLD']}",
            f"CONVEX_OCCUPANCY_PENALTY_FACTOR = {ASSUMPTIONS['CONVEX_OCCUPANCY_PENALTY_FACTOR']}",
            f"STALE_DATA_PENALTY = {ASSUMPTIONS['STALE_DATA_PENALTY_PER_MIN']} min/min age",
            f"Pessimism Caution Factor = {caution_factor}x"
        ]

        return Recommendation(
            id=f"rec_hosp_{call.id}_{int(time.time())}",
            call_id=call.id,
            recommendation_type="HOSPITAL_CHOICE",
            title=f"Destination Hospital: {call.patient_condition}",
            choice=primary_opt,
            runner_up=runner_up_opt,
            reasons=reasons,
            counterfactual_explanation=counterfactual,
            data_age_sec=top_h.data_age_sec,
            assumptions=assumptions,
            status="PENDING",
            created_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        )

    def generate_full_plan(
        self,
        mexclp_optimizer,
        mclp_optimizer,
        safety_weight: float = 0.50,
        caution_factor: float = 1.0,
        equity_enforced: bool = True
    ) -> OptimizationPlanResponse:
        t0 = time.time()
        state = self.scenario_engine.get_current_state()

        # 1. Hospital Recommendations for pending calls
        recommendations: List[Recommendation] = []
        for call in state.emergency_calls:
            rec = self.select_best_hospital_for_call(
                call=call,
                safety_weight=safety_weight,
                caution_factor=caution_factor
            )
            recommendations.append(rec)

        # 2. MEXCLP Ambulance Staging
        staging_recs, equity_metrics, eff_metrics = mexclp_optimizer.solve_staging(
            equity_enforced=equity_enforced
        )

        # 3. Temporary Resource Placement (MCLP)
        temp_placements = mclp_optimizer.solve_placements()

        computation_time_ms = round((time.time() - t0) * 1000.0, 2)

        return OptimizationPlanResponse(
            timestamp=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            scenario_id=state.scenario_id,
            step_id=state.active_step_id,
            recommendations=recommendations,
            ambulance_staging=staging_recs,
            evacuation_routes=[],
            temporary_resource_placements=temp_placements,
            equity_metrics=equity_metrics,
            efficiency_metrics=eff_metrics,
            computation_time_ms=computation_time_ms
        )
