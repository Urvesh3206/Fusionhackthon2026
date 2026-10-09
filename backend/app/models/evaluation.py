"""
Evaluation models for Monte Carlo Baseline vs Tidewatch comparison.
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class MetricSummary(BaseModel):
    mean: float
    ci_lower: float
    ci_upper: float
    unit: str
    description: str

class StrategyEvalResult(BaseModel):
    strategy_name: str # "BASELINE" or "TIDEWATCH"
    num_seeds: int
    median_response_time_min: MetricSummary
    p90_response_time_min: MetricSummary
    population_coverage_pct: MetricSummary
    wasted_trips_count: MetricSummary
    hospital_load_gini: MetricSummary # Hospital load balance (Gini coefficient 0=balanced, 1=unequal)
    worst_district_coverage_pct: MetricSummary # Equity metric
    evacuation_clearance_time_min: MetricSummary
    replan_latency_ms: MetricSummary
    relocation_churn: MetricSummary
    survival_score_s: MetricSummary

class FullEvaluationReport(BaseModel):
    scenario_id: str
    generated_at: str
    num_seeds: int
    survival_score_disclaimer: str = (
        "NOTE: Survival score S = sum(w_c * exp(-lambda_c * t)) uses illustrative placeholders "
        "(lambda_trauma=0.08, lambda_cardiac=0.12, lambda_general=0.03), not verified clinical values."
    )
    baseline: StrategyEvalResult
    tidewatch: StrategyEvalResult
    improvement_deltas: Dict[str, Any]
    seed_details: Optional[List[Dict[str, Any]]] = None
