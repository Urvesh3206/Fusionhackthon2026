import React from 'react';
import {
  Sparkles, CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck,
  Clock, Check, X, Edit3, Truck, Tent, Sun, Scale
} from 'lucide-react';
import { useEmergencyStore } from '../../stores/useEmergencyStore';
import { SimulatedTag } from '../Metrics/SimulatedTag';
import { DataAgeBadge } from '../Metrics/DataAgeBadge';
import { submitOverride } from '../../services/api';

export const RecommendationList: React.FC = () => {
  const { plan, state, addOverride } = useEmergencyStore();

  const handleAction = async (recId: string, choiceId: string, action: 'ACCEPT' | 'EDIT' | 'REJECT', reason: string) => {
    try {
      const entry = await submitOverride(recId, choiceId, action, reason);
      addOverride(entry);
    } catch (err) {
      console.error("Override submission error:", err);
    }
  };

  const recommendations = plan?.recommendations || [];
  const staging = plan?.ambulance_staging || [];
  const tempResources = plan?.temporary_resource_placements || [];

  return (
    <div className="space-y-4">
      {/* Header with computation time */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-400" />
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-200">
            Dispatch Plan
          </h3>
        </div>
        {plan && (
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
            Computed in {plan.computation_time_ms.toFixed(1)}ms
          </span>
        )}
      </div>

      {!plan ? (
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-6 text-center text-slate-400">
          <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-slate-600" />
          <p className="text-xs font-medium text-slate-300">No active replan computed yet.</p>
          <p className="text-[11px] text-slate-500 mt-1">
            Click <strong className="text-blue-400">"Replan Dispatch"</strong> in the top header or advance the timeline to trigger full multi-objective optimization.
          </p>
        </div>
      ) : (
        <>
          {/* Equity vs Efficiency KPI Summary */}
          {plan.equity_metrics && plan.efficiency_metrics && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                <span className="flex items-center gap-1 text-blue-400">
                  <Scale className="w-3.5 h-3.5" />
                  Equity vs Efficiency Score
                </span>
                <span className="text-emerald-400 font-mono">
                  {plan.efficiency_metrics.population_covered_pct}% Covered
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 font-mono bg-slate-900/80 p-2 rounded-lg">
                <div>
                  <span>Worst-District Equity:</span>{' '}
                  <strong className="text-blue-300">{plan.equity_metrics.worst_district_coverage_pct}%</strong>
                </div>
                <div>
                  <span>Mean Response:</span>{' '}
                  <strong className="text-emerald-300">{plan.efficiency_metrics.mean_response_time_min} min</strong>
                </div>
              </div>
            </div>
          )}

          {/* 1. Dynamic MEXCLP Ambulance Staging Section */}
          {staging.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5 text-blue-400" />
                  MEXCLP Fleet Staging ({staging.length} Stations)
                </span>
                <SimulatedTag realDataSource="PuLP 3.3.2 CBC Solver" />
              </div>

              <div className="space-y-2">
                {staging.map((st) => (
                  <div
                    key={st.station_id}
                    className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200">{st.station_name}</span>
                      <span className="font-mono font-bold text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800/40">
                        {st.allocated_ambulances} Units
                        {st.change_delta !== 0 && (
                          <span className={st.change_delta > 0 ? "text-emerald-400 ml-1" : "text-rose-400 ml-1"}>
                            ({st.change_delta > 0 ? `+${st.change_delta}` : st.change_delta})
                          </span>
                        )}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-tight italic">
                      "{st.counterfactual}"
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. Temporary Resource Placement (MCLP) */}
          {tempResources.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1">
                  <Tent className="w-3.5 h-3.5 text-emerald-400" />
                  Cut-Off / Thermal Resources ({tempResources.length})
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">MCLP</span>
              </div>

              <div className="space-y-2">
                {tempResources.map((res: any) => (
                  <div
                    key={res.id}
                    className="bg-slate-950 border border-emerald-800/40 rounded-xl p-2.5 space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-300">{res.name}</span>
                      <span className="text-[10px] font-mono text-slate-400">Cap: {res.capacity}</span>
                    </div>
                    <p className="text-[11px] text-slate-300">{res.justification}</p>
                    <span className="text-[10px] text-slate-400 italic">Target: {res.target_demographic}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Patient Destination Hospital Recommendations */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Patient Hospital Recommendations ({recommendations.length})
            </span>

            {recommendations.map((rec) => (
              <div
                key={rec.id}
                className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-3 space-y-2.5 shadow-lg hover:border-slate-600 transition-all"
              >
                {/* Card Title & Type */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-xs text-slate-100">{rec.title}</h4>
                  </div>
                  <DataAgeBadge ageSec={rec.data_age_sec} />
                </div>

                {/* Primary Choice */}
                <div className="bg-emerald-950/40 border border-emerald-600/40 rounded-lg p-2.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      RECOMMENDED: {rec.choice.label}
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-200">
                      ETA: {rec.choice.eta_min.toFixed(1)} min
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-slate-300">
                    <span>Avail Beds: <strong className="text-emerald-400">{rec.choice.capacity_available}</strong></span>
                    <span>Free ICU: <strong className="text-emerald-400">{rec.choice.icu_available}</strong></span>
                    <span>Specialty: <strong className="text-emerald-400">{rec.choice.specialty_match ? "Matched" : "General"}</strong></span>
                  </div>
                </div>

                {/* Reasons */}
                <div className="space-y-0.5">
                  <ul className="text-[11px] text-slate-300 space-y-0.5 list-disc list-inside">
                    {rec.reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>

                {/* Counterfactual Explanation */}
                {rec.runner_up && (
                  <div className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs space-y-1">
                    <div className="flex items-center justify-between text-slate-400 font-semibold text-[10px]">
                      <span className="flex items-center gap-1 text-amber-400">
                        <AlertTriangle className="w-3 h-3" />
                        COUNTERFACTUAL vs {rec.runner_up.label}
                      </span>
                      <span className="font-mono text-slate-400">ETA: {rec.runner_up.eta_min.toFixed(1)} min</span>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed italic">
                      "{rec.counterfactual_explanation}"
                    </p>
                  </div>
                )}

                {/* Dispatcher Actions */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">Log decision</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleAction(rec.id, rec.choice.option_id, 'ACCEPT', 'Dispatcher accepted optimizer recommendation')}
                      className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600/90 hover:bg-emerald-500 text-white rounded text-xs font-semibold shadow"
                    >
                      <Check className="w-3 h-3" />
                      Accept
                    </button>
                    {rec.runner_up && (
                      <button
                        onClick={() => handleAction(rec.id, rec.runner_up!.option_id, 'EDIT', `Dispatcher overrode to ${rec.runner_up!.label}`)}
                        className="flex items-center gap-1 px-2 py-1 bg-amber-600/90 hover:bg-amber-500 text-white rounded text-xs font-semibold shadow"
                      >
                        <Edit3 className="w-3 h-3" />
                        Override
                      </button>
                    )}
                    <button
                      onClick={() => handleAction(rec.id, 'REJECTED', 'REJECT', 'Dispatcher rejected recommendation')}
                      className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs"
                    >
                      <X className="w-3 h-3" />
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
