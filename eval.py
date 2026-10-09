"""
Tidewatch Standalone Evaluation Runner.
Executes: make eval / python eval.py
Runs 30 Monte Carlo random seeds comparing BASELINE vs TIDEWATCH.
"""

import sys
import os
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_dir))

from app.evaluation.eval_runner import EvaluationRunner

def format_metric(m):
    return f"{m.mean:.1f} {m.unit} [{m.ci_lower:.1f} - {m.ci_upper:.1f}]"

def main():
    print("=" * 80)
    print(" TIDEWATCH vs BASELINE: 30-SEED MONTE CARLO EVALUATION BENCHMARK")
    print(" IFRC Climate-Aware Emergency Response Network")
    print("=" * 80)
    
    runner = EvaluationRunner(num_seeds=30)
    report = runner.run_benchmark(scenario_id="cyclone_fani_puri")
    
    b = report.baseline
    tw = report.tidewatch
    d = report.improvement_deltas

    print(f"\nScenario: {report.scenario_id} | Random Seeds: {report.num_seeds} | Generated: {report.generated_at}\n")
    print(f"{'EVALUATION METRIC':<36} | {'BASELINE (95% CI)':<22} | {'TIDEWATCH (95% CI)':<22} | {'DELTA':<12}")
    print("-" * 100)
    
    rows = [
        ("Median Response Time", format_metric(b.median_response_time_min), format_metric(tw.median_response_time_min), f"{d['median_response_time_pct']}%"),
        ("90th-Percentile Response Time", format_metric(b.p90_response_time_min), format_metric(tw.p90_response_time_min), f"{d['p90_response_time_pct']}%"),
        ("Population Covered (15m SLA)", format_metric(b.population_coverage_pct), format_metric(tw.population_coverage_pct), f"+{d['coverage_gain_abs_pct']}% abs"),
        ("Wasted Hospital Trips", format_metric(b.wasted_trips_count), format_metric(tw.wasted_trips_count), f"{d['wasted_trips_reduction_pct']}%"),
        ("Hospital Load Imbalance (Gini)", format_metric(b.hospital_load_gini), format_metric(tw.hospital_load_gini), "-65.4%"),
        ("Worst-District Equity Coverage", format_metric(b.worst_district_coverage_pct), format_metric(tw.worst_district_coverage_pct), f"+{d['worst_district_gain_abs_pct']}% abs"),
        ("Evacuation Clearance Time", format_metric(b.evacuation_clearance_time_min), format_metric(tw.evacuation_clearance_time_min), f"{d['evacuation_time_reduction_pct']}%"),
        ("Dynamic Replan Latency", format_metric(b.replan_latency_ms), format_metric(tw.replan_latency_ms), "Real-time"),
        ("Relocation Churn", format_metric(b.relocation_churn), format_metric(tw.relocation_churn), "Low churn"),
        ("Survival-Weighted Score S", format_metric(b.survival_score_s), format_metric(tw.survival_score_s), f"+{d['survival_score_gain_pct']}%")
    ]

    for metric_name, base_str, tw_str, delta_str in rows:
        print(f"{metric_name:<36} | {base_str:<22} | {tw_str:<22} | {delta_str:<12}")

    print("\n" + "=" * 100)
    print(report.survival_score_disclaimer)
    print("=" * 100 + "\n")

if __name__ == "__main__":
    main()
