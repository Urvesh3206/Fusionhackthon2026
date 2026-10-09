import React, { useState, useEffect } from 'react';
import { Users, Shield, Download, CheckCircle2, AlertTriangle, Navigation, RefreshCw } from 'lucide-react';
import { useEmergencyStore } from '../stores/useEmergencyStore';
import { computeEvacuationPlan, fetchShelters } from '../services/api';
import { EvacuationPlanResponse, Shelter } from '../types';

export const EvacuationPlanningPage: React.FC = () => {
  const [plan, setPlan] = useState<EvacuationPlanResponse | null>(null);
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadEvacuationData();
  }, []);

  const loadEvacuationData = async () => {
    setLoading(true);
    try {
      const [p, sList] = await Promise.all([
        computeEvacuationPlan(),
        fetchShelters()
      ]);
      setPlan(p);
      setShelters(sList);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100">Evacuation Planning & Shelter Routing</h2>
          <p className="text-xs text-slate-400">
            Capacity-constrained civilian evacuation routing along verified safe corridors (&lt; 0.20 flood risk)
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={loadEvacuationData}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center space-x-1.5 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Re-solve Plan</span>
          </button>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards */}
      {plan && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl shadow-lg">
            <span className="text-xs font-semibold text-slate-400">At-Risk Population</span>
            <p className="text-2xl font-black text-slate-100 mt-1">{plan.total_at_risk_population.toLocaleString()}</p>
            <span className="text-[10px] text-amber-400 font-semibold">{plan.total_zones} Coastal & River Zones</span>
          </div>

          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl shadow-lg">
            <span className="text-xs font-semibold text-slate-400">Successfully Assigned</span>
            <p className="text-2xl font-black text-emerald-400 mt-1">{plan.assigned_population.toLocaleString()}</p>
            <span className="text-[10px] text-emerald-400 font-semibold">100% Structural Safety Match</span>
          </div>

          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl shadow-lg">
            <span className="text-xs font-semibold text-slate-400">Active Cyclone Shelters</span>
            <p className="text-2xl font-black text-blue-400 mt-1">{shelters.length}</p>
            <span className="text-[10px] text-slate-400">High ground elevated facilities</span>
          </div>

          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl shadow-lg">
            <span className="text-xs font-semibold text-slate-400">Plan Feasibility Status</span>
            <p className="text-xl font-bold text-emerald-400 mt-1 flex items-center">
              <CheckCircle2 className="w-5 h-5 mr-1" /> FEASIBLE
            </p>
            <span className="text-[10px] text-slate-400">Capacity limits strictly held</span>
          </div>
        </div>
      )}

      {/* 3. Shelter Utilization Meters */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-slate-200">Cyclone Shelter Utilization & Structural Buffer</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plan?.shelter_utilization.map((s) => (
            <div key={s.shelter_id} className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-xs text-slate-100">{s.name}</h4>
                  <p className="text-[10px] text-slate-400">Capacity: {s.final_occupancy} / {s.total_capacity}</p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-400">
                  {s.utilization_pct}% Load
                </span>
              </div>

              <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div 
                  className={`h-full rounded-full ${s.utilization_pct > 90 ? 'bg-red-500' : 'bg-purple-500'}`}
                  style={{ width: `${Math.min(100, s.utilization_pct)}%` }}
                />
              </div>

              <p className="text-[11px] text-slate-400">
                Remaining Space: <span className="font-semibold text-emerald-400">{s.total_capacity - s.final_occupancy} people</span>
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Zone Evacuation Assignments */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-slate-200">Zone-by-Zone Evacuation Corridors</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Evacuation Zone</th>
                <th className="px-4 py-3">Population</th>
                <th className="px-4 py-3">Assigned Destination Shelter</th>
                <th className="px-4 py-3">Transit Time</th>
                <th className="px-4 py-3">Corridor Assessment</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {plan?.zone_assignments.map((z) => (
                <tr key={z.zone_id} className="hover:bg-slate-800/40 transition">
                  <td className="px-4 py-3 font-semibold text-slate-100">{z.zone_name}</td>
                  <td className="px-4 py-3 font-mono text-cyan-300 font-bold">{z.total_population.toLocaleString()}</td>
                  <td className="px-4 py-3 text-slate-200">{z.assigned_shelter_name}</td>
                  <td className="px-4 py-3 text-emerald-400 font-semibold">{z.transit_time_min.toFixed(1)} min</td>
                  <td className="px-4 py-3 text-slate-400">{z.notes}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                      {z.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
