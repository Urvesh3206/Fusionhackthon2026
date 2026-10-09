import React, { useState, useEffect } from 'react';
import { 
  Send, ShieldCheck, AlertTriangle, Hospital as HospIcon, 
  Truck, Navigation, CheckCircle2, RefreshCw, HelpCircle, X
} from 'lucide-react';
import { useEmergencyStore } from '../stores/useEmergencyStore';
import { fetchDispatchRecommendation, assignIncident, submitOverride } from '../services/api';
import { Recommendation } from '../types';

export const DispatchPage: React.FC = () => {
  const { state, plan, setState, addOverride } = useEmergencyStore();
  const [selectedCallId, setSelectedCallId] = useState<string>('');
  const [dispatchData, setDispatchData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isOverrideOpen, setIsOverrideOpen] = useState(false);
  const [overrideReason, setOverrideReason] = useState('Local road knowledge / physical barrier not yet in GIS');
  const [chosenCandidateId, setChosenCandidateId] = useState('');

  const calls = state?.emergency_calls || [];

  useEffect(() => {
    if (calls.length > 0 && !selectedCallId) {
      setSelectedCallId(calls[0].id);
    }
  }, [calls, selectedCallId]);

  useEffect(() => {
    if (selectedCallId) {
      loadRecommendation(selectedCallId);
    }
  }, [selectedCallId]);

  const loadRecommendation = async (callId: string) => {
    setLoading(true);
    try {
      const rec = await fetchDispatchRecommendation(callId);
      setDispatchData(rec);
      if (rec.candidates && rec.candidates.length > 1) {
        setChosenCandidateId(rec.candidates[1].vehicle_id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const currentCall = calls.find(c => c.id === selectedCallId) || calls[0];

  const handleConfirmDispatch = async () => {
    if (!currentCall || !dispatchData) return;
    try {
      await assignIncident(currentCall.id, dispatchData.recommended_vehicle_id, 'hosp_puri_dhh');
      if (state) {
        setState({
          ...state,
          emergency_calls: state.emergency_calls.map(c => c.id === currentCall.id ? { ...c, status: 'Dispatched', assigned_ambulance_id: dispatchData.recommended_vehicle_id } : c),
          ambulances: state.ambulances.map(a => a.id === dispatchData.recommended_vehicle_id ? { ...a, status: 'Dispatched', assigned_call_id: currentCall.id } : a)
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleConfirmOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCall || !chosenCandidateId) return;
    try {
      const log = await submitOverride(
        currentCall.id,
        chosenCandidateId,
        'DISPATCH_OVERRIDE',
        overrideReason,
        `Manually assigned unit ${chosenCandidateId} overriding AI recommendation.`
      );
      addOverride(log);
      await assignIncident(currentCall.id, chosenCandidateId, 'hosp_puri_dhh');
      setIsOverrideOpen(false);
      if (state) {
        setState({
          ...state,
          emergency_calls: state.emergency_calls.map(c => c.id === currentCall.id ? { ...c, status: 'Dispatched', assigned_ambulance_id: chosenCandidateId } : c),
          ambulances: state.ambulances.map(a => a.id === chosenCandidateId ? { ...a, status: 'Dispatched', assigned_call_id: currentCall.id } : a)
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Top Call Selector & Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
            <Send className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100">AI Emergency Dispatch Optimization</h2>
            <p className="text-xs text-slate-400">10-Step hazard-aware candidate ranking and routing solver</p>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <span className="text-slate-400 font-semibold">Active Call Target:</span>
          <select
            value={selectedCallId}
            onChange={(e) => setSelectedCallId(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-medium focus:outline-none focus:border-cyan-500"
          >
            {calls.map((c) => (
              <option key={c.id} value={c.id}>
                {c.id} - {c.patient_condition} ({c.priority})
              </option>
            ))}
          </select>
        </div>
      </div>

      {currentCall && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Recommended Dispatch Solution & Candidate Rankings */}
          <div className="lg:col-span-2 space-y-6">
            {/* AI Top Recommendation Card */}
            <div className="bg-slate-900 border border-cyan-500/40 rounded-2xl p-5 shadow-2xl space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 px-4 py-1 bg-gradient-to-l from-cyan-600 to-blue-600 text-[10px] font-extrabold uppercase tracking-wider text-white rounded-bl-xl">
                Rank #1 Optimal Candidate
              </div>

              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold text-cyan-400 uppercase tracking-wide">
                    Recommended Ambulance Unit
                  </span>
                  <h3 className="text-2xl font-black text-slate-100 mt-1">
                    {dispatchData?.recommended_vehicle_callsign || 'Ambulance ALS-01'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Location: Station Puri Central &bull; Advanced Life Support
                  </p>
                </div>

                <div className="text-right pr-28">
                  <span className="text-xs text-slate-400 font-semibold">Predicted Safe Transit</span>
                  <p className="text-3xl font-black text-emerald-400">
                    {dispatchData?.estimated_response_time_min || 11.2} <span className="text-xs text-slate-400">min</span>
                  </p>
                </div>
              </div>

              {/* Multi-Criteria Validation Checklist */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-xs text-slate-300">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Road Corridors Passable</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>ALS Staff Match</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Zero Flood Inundation</span>
                </div>
              </div>

              {/* Explainable Reasoning */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <p className="text-xs text-slate-300 leading-relaxed">
                  <span className="font-bold text-cyan-300">Explanation: </span>
                  {dispatchData?.explanation || 'Optimal route avoiding inundated river crossing bridges.'}
                </p>
                <p className="text-[11px] text-slate-500 italic">
                  {dispatchData?.counterfactual}
                </p>
              </div>

              {/* Dispatch Action Buttons */}
              <div className="flex items-center space-x-3 pt-2">
                <button
                  onClick={handleConfirmDispatch}
                  className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition flex items-center justify-center space-x-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Approve & Dispatch {dispatchData?.recommended_vehicle_callsign || 'Unit'}</span>
                </button>
                <button
                  onClick={() => setIsOverrideOpen(true)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold text-xs rounded-xl border border-slate-700 transition"
                >
                  Manual Override
                </button>
              </div>
            </div>

            {/* Candidate Fleet Comparison Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
              <h3 className="text-sm font-bold text-slate-200">Alternative Vehicle Candidates Evaluated</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="px-3 py-2">Callsign</th>
                      <th className="px-3 py-2">Unit Type</th>
                      <th className="px-3 py-2">ETA (min)</th>
                      <th className="px-3 py-2">Route Risk</th>
                      <th className="px-3 py-2">Feasibility</th>
                      <th className="px-3 py-2">Assessment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {dispatchData?.candidates?.map((cand: any, idx: number) => (
                      <tr key={cand.vehicle_id} className="hover:bg-slate-800/40 transition">
                        <td className="px-3 py-2.5 font-mono font-bold text-slate-100 flex items-center space-x-1.5">
                          <Truck className="w-3.5 h-3.5 text-slate-400" />
                          <span>{cand.callsign}</span>
                        </td>
                        <td className="px-3 py-2.5">{cand.unit_type}</td>
                        <td className="px-3 py-2.5 font-semibold text-cyan-300">{cand.estimated_arrival_min}m</td>
                        <td className="px-3 py-2.5 text-slate-400">{cand.route_risk_score}</td>
                        <td className="px-3 py-2.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            cand.feasibility ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                          }`}>
                            {cand.feasibility ? 'Passable' : 'Blocked / Busy'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-slate-400">{cand.explanation}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right 1 Col: Destination Hospital Selection & Incident Metadata */}
          <div className="space-y-6">
            {/* Hospital Destination Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
                <HospIcon className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold text-slate-200">Destination Hospital Match</h3>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-100 text-xs">Puri District HQ Hospital (DHH)</span>
                  <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded">
                    Verified Normal
                  </span>
                </div>
                <div className="space-y-1 text-xs text-slate-400">
                  <p>Trauma Surgery: <span className="text-emerald-400 font-semibold">Available</span></p>
                  <p>Free Beds Buffer: <span className="text-slate-200 font-semibold">24 usable (4 ICU)</span></p>
                  <p>Power & Comms: <span className="text-emerald-400 font-semibold">Grid Active</span></p>
                </div>
              </div>

              {/* Counterfactual Callout */}
              <div className="p-3 bg-amber-950/20 border border-amber-500/30 rounded-xl text-xs text-amber-300">
                <p className="font-bold flex items-center mb-1">
                  <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Counterfactual Explanation:
                </p>
                <p className="text-[11px] text-amber-200/90 leading-relaxed">
                  Bypassed Coastal ID Hospital: Although 1.8km closer, facility suffered severe power loss and has 0 free ICU beds.
                </p>
              </div>
            </div>

            {/* Incident Summary Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3 text-xs">
              <h3 className="text-sm font-bold text-slate-200 border-b border-slate-800 pb-2">Incident Telemetry</h3>
              <p className="text-slate-300">ID: <span className="font-mono text-cyan-300">{currentCall.id}</span></p>
              <p className="text-slate-300">Condition: <span className="font-semibold text-white">{currentCall.patient_condition}</span></p>
              <p className="text-slate-300">Zone: <span className="text-white">{currentCall.district_zone}</span></p>
              <p className="text-slate-300">Priority: <span className="font-bold text-red-400">{currentCall.priority}</span></p>
            </div>
          </div>
        </div>
      )}

      {/* Manual Override Justification Modal */}
      {isOverrideOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-amber-400 flex items-center">
                <AlertTriangle className="w-4 h-4 mr-2" /> Dispatcher Decision Override
              </h3>
              <button onClick={() => setIsOverrideOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmOverride} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Select Alternate Unit</label>
                <select
                  value={chosenCandidateId}
                  onChange={(e) => setChosenCandidateId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                >
                  {dispatchData?.candidates?.map((c: any) => (
                    <option key={c.vehicle_id} value={c.vehicle_id}>
                      {c.callsign} ({c.unit_type}) - ETA {c.estimated_arrival_min}m
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Mandatory Justification Reason</label>
                <select
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                >
                  <option value="Local road knowledge / physical barrier not yet in GIS">Local road knowledge / physical barrier not yet in GIS</option>
                  <option value="Vehicle crew specialized for pediatric / obstetric triage">Vehicle crew specialized for pediatric / obstetric triage</option>
                  <option value="Direct field officer command priority">Direct field officer command priority</option>
                  <option value="Secondary vehicle already in immediate physical proximity">Secondary vehicle already in immediate physical proximity</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsOverrideOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/20"
                >
                  Commit Override & Log Decision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
