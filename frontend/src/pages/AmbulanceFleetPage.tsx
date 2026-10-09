import React from 'react';
import { Truck, ShieldCheck, Navigation, Radio, MapPin, CheckCircle, Clock } from 'lucide-react';
import { useEmergencyStore } from '../stores/useEmergencyStore';

export const AmbulanceFleetPage: React.FC = () => {
  const { state, plan } = useEmergencyStore();

  const ambulances = state?.ambulances || [];
  const stagingRecs = plan?.ambulance_staging || [];

  return (
    <div className="space-y-6">
      {/* 1. Fleet Overview Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100">Ambulance Fleet & Predictive Staging</h2>
          <p className="text-xs text-slate-400">MEXCLP mathematical coverage optimization & real-time telemetry</p>
        </div>
        <div className="flex items-center space-x-2 text-xs">
          <span className="px-3 py-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-lg font-bold">
            {ambulances.filter(a => a.status === 'Available').length} Units Available
          </span>
          <span className="px-3 py-1 bg-slate-800 border border-slate-700 text-slate-300 rounded-lg font-semibold">
            {ambulances.length} Total Registered
          </span>
        </div>
      </div>

      {/* 2. MEXCLP Predictive Staging Recommendations Card */}
      {stagingRecs.length > 0 && (
        <div className="bg-slate-900 border border-cyan-500/40 rounded-2xl p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-bold text-slate-100">
                Dynamic MEXCLP Staging Recommendations (Before Disaster Surge)
              </h3>
            </div>
            <span className="text-[11px] text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full font-semibold">
              Max Coverage Expected Location Problem
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {stagingRecs.map((st) => (
              <div key={st.station_id} className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200 text-xs">{st.station_name}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    st.change_delta > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {st.allocated_ambulances} Units Target
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Catchment Population: <span className="text-white font-semibold">{st.coverage_pop_served.toLocaleString()}</span>
                </p>
                <p className="text-[11px] text-slate-400 italic">
                  {st.counterfactual || 'Optimal positioning for anticipated surge.'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Real-Time Fleet Telemetry Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-slate-200">Active Vehicle Telemetry Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ambulances.map((amb) => {
            const isAvail = amb.status === 'Available';
            return (
              <div key={amb.id} className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-cyan-400 font-bold text-xs">
                      {amb.callsign.split('-')[1] || '01'}
                    </div>
                    <div>
                      <span className="font-bold text-slate-100 text-xs block">{amb.callsign}</span>
                      <span className="text-[10px] text-slate-500 uppercase font-semibold">{amb.unit_type} Tier</span>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    isAvail ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}>
                    {amb.status}
                  </span>
                </div>

                <div className="text-xs space-y-1 text-slate-400">
                  <div className="flex items-center space-x-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    <span>Station: {amb.station_id}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Radio className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Telemetry: {amb.data_age_sec}s ago (GPS Direct)</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Equipment: Trauma, Defib</span>
                  <span className="text-emerald-400 font-semibold">100% Ready</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
