import React, { useState } from 'react';
import { ShieldAlert, AlertOctagon, RotateCcw, Check } from 'lucide-react';
import { useEmergencyStore } from '../../stores/useEmergencyStore';
import { triggerRoadClosure, resetRoadClosures } from '../../services/api';

export const RoadClosureTrigger: React.FC = () => {
  const { state, setState, setLoading, isLoading, setPlan } = useEmergencyStore();
  const [selectedEdge, setSelectedEdge] = useState<string>('edge_grand_road');
  const [customReason, setCustomReason] = useState<string>('Downed high-voltage power lines & fallen banyan trees');
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const openEdges = state?.road_edges.filter(e => !e.is_closed) || [];

  const handleCloseRoad = async () => {
    if (!selectedEdge) return;
    setLoading(true);
    try {
      const newState = await triggerRoadClosure(selectedEdge, customReason);
      setState(newState);
      setPlan(null as any);
      setIsOpen(false);
    } catch (err) {
      console.error("Closure error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setLoading(true);
    try {
      const newState = await resetRoadClosures();
      setState(newState);
      setPlan(null as any);
    } catch (err) {
      console.error("Reset closures error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600/90 hover:bg-rose-500 text-white rounded-lg text-xs font-bold shadow-md shadow-rose-950/50 border border-rose-400/30 transition-all"
        >
          <AlertOctagon className="w-3.5 h-3.5" />
          Trigger Road Closure
        </button>

        {state?.active_road_closures && state.active_road_closures.length > 0 && (
          <button
            onClick={handleReset}
            disabled={isLoading}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold border border-slate-700 transition-all"
            title="Reset all dynamic and manual road closures"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset ({state.active_road_closures.length})
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-rose-500/50 rounded-xl shadow-2xl p-4 z-50 backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              Live Edge Closure Injection
            </span>
            <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-white text-xs">✕</button>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Select Open Road Segment:</label>
              <select
                value={selectedEdge}
                onChange={(e) => setSelectedEdge(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-rose-500"
              >
                {openEdges.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.name} (Elev: {e.elevation_m}m)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Closure Reason / Hazard:</label>
              <input
                type="text"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="e.g. Flash flood debris or powerline hazard"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setIsOpen(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCloseRoad}
                disabled={isLoading}
                className="flex items-center gap-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold shadow"
              >
                <Check className="w-3.5 h-3.5" />
                Close Segment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
