import React, { useState } from 'react';
import { Hospital, Zap, Radio, AlertTriangle, CheckCircle2, RefreshCw, Activity } from 'lucide-react';
import { useEmergencyStore } from '../stores/useEmergencyStore';
import { updateHospitalCapacity } from '../services/api';

export const HospitalManagementPage: React.FC = () => {
  const { state, setState } = useEmergencyStore();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const hospitals = state?.hospitals || [];

  const handleTogglePower = async (hospitalId: string, currentPower: boolean) => {
    setUpdatingId(hospitalId);
    try {
      const updated = await updateHospitalCapacity(hospitalId, {
        has_power: !currentPower,
        free_icu_beds: !currentPower ? 2 : 0
      });
      if (state) {
        setState({
          ...state,
          hospitals: state.hospitals.map(h => h.id === hospitalId ? updated : h)
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100">Hospital Capacity & Cascading Deratings</h2>
          <p className="text-xs text-slate-400">
            Real-time HMIS telemetry, ICU availability buffers, power grid dependencies & counterfactual selection
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {hospitals.map((hosp) => {
          const isDerated = !hosp.has_power || hosp.free_icu_beds === 0;
          const availableBeds = Math.max(0, hosp.usable_beds - hosp.occupied_beds);
          const occPct = Math.round((hosp.occupied_beds / Math.max(1, hosp.usable_beds)) * 100);

          return (
            <div 
              key={hosp.id} 
              className={`p-5 rounded-2xl border transition-all shadow-xl space-y-4 ${
                isDerated 
                  ? 'bg-slate-900 border-rose-500/50 shadow-rose-500/5' 
                  : 'bg-slate-900 border-slate-800'
              }`}
            >
              {/* Facility Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                    isDerated ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  }`}>
                    <Hospital className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-100">{hosp.name}</h3>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                      {hosp.facility_type || 'District Healthcare Facility'}
                    </p>
                  </div>
                </div>

                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  isDerated ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
                }`}>
                  {isDerated ? 'Derated' : 'Normal'}
                </span>
              </div>

              {/* Bed Occupancy Meter */}
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>Occupancy: {occPct}%</span>
                  <span>{hosp.occupied_beds} / {hosp.usable_beds} Beds</span>
                </div>
                <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div 
                    className={`h-full rounded-full ${occPct > 85 ? 'bg-red-500' : occPct > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(100, occPct)}%` }}
                  />
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Free ICU Beds</span>
                  <span className={`text-base font-bold ${hosp.free_icu_beds > 0 ? 'text-blue-400' : 'text-red-400'}`}>
                    {hosp.free_icu_beds} Beds
                  </span>
                </div>

                <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Power Status</span>
                  <span className={`text-xs font-bold flex items-center mt-1 ${hosp.has_power ? 'text-emerald-400' : 'text-rose-400'}`}>
                    <Zap className="w-3.5 h-3.5 mr-1" />
                    {hosp.has_power ? 'Grid Active' : 'OUTAGE / TRIP'}
                  </span>
                </div>
              </div>

              {/* Derating Reason Callout */}
              {isDerated && (
                <div className="p-2.5 bg-rose-950/20 border border-rose-500/30 rounded-xl text-xs text-rose-300">
                  <span className="font-bold flex items-center mb-0.5">
                    <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Active Facility Derating:
                  </span>
                  <p className="text-[11px] text-rose-200/80">{hosp.status_reason}</p>
                </div>
              )}

              {/* Power Injection Toggle Button */}
              <button
                onClick={() => handleTogglePower(hosp.id, hosp.has_power)}
                disabled={updatingId === hosp.id}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition flex items-center justify-center space-x-2"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  {updatingId === hosp.id ? 'Simulating...' : hosp.has_power ? 'Trigger Power Outage Test' : 'Restore Grid Power'}
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
