import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Zap, Send, Flame, RotateCcw, HelpCircle, 
  Sparkles, Check, ArrowRight 
} from 'lucide-react';
import { useEmergencyStore } from '../../stores/useEmergencyStore';
import { advanceScenarioStep, triggerRoadClosure, resetSimulation, runOptimizationReplan } from '../../services/api';

interface QuickActionBarProps {
  onOpenGuide: () => void;
  onShowToast: (msg: string) => void;
}

export const QuickActionBar: React.FC<QuickActionBarProps> = ({ onOpenGuide, onShowToast }) => {
  const navigate = useNavigate();
  const { state, setState, setPlan } = useEmergencyStore();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const handleTriggerLandfall = async () => {
    setLoadingAction('landfall');
    try {
      const nextState = await advanceScenarioStep(3); // Step 3 = Landfall Peak
      setState(nextState);
      const plan = await runOptimizationReplan();
      setPlan(plan);
      onShowToast('🌊 Cyclone Landfall Activated! 215 km/h winds, Kushabhadra Bridge submerged, hospital power derated.');
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleTriggerClosure = async () => {
    setLoadingAction('closure');
    try {
      const nextState = await triggerRoadClosure('edge_marine_drive_kushabhadra_bridge', 'Simulated Live Surge Overtopping');
      setState(nextState);
      onShowToast('🚨 Kushabhadra Bridge Closed! Routing engine rerouting ambulances via NH-316 arterial corridor.');
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleReset = async () => {
    setLoadingAction('reset');
    try {
      const nextState = await resetSimulation();
      setState(nextState);
      const plan = await runOptimizationReplan();
      setPlan(plan);
      onShowToast('🔄 Simulation Reset! Operational state returned to baseline.');
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="p-4 bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-950 border border-cyan-500/30 rounded-2xl shadow-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
      <div className="flex items-center space-x-2.5">
        <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-bold">
          <Sparkles className="w-4 h-4" />
        </div>
        <div>
          <span className="font-bold text-slate-100 text-xs block">1-Click Interactive Scenarios</span>
          <span className="text-[11px] text-slate-400">Click any action below to test real-time AI adaptation</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Trigger Landfall */}
        <button
          onClick={handleTriggerLandfall}
          disabled={loadingAction !== null}
          className="px-3.5 py-2 bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-500 hover:to-red-500 text-white font-bold rounded-xl shadow-md transition flex items-center space-x-1.5"
        >
          <Flame className="w-3.5 h-3.5" />
          <span>{loadingAction === 'landfall' ? 'Simulating...' : '🌊 Trigger Cyclone Landfall'}</span>
        </button>

        {/* Trigger Road Flood */}
        <button
          onClick={handleTriggerClosure}
          disabled={loadingAction !== null}
          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl border border-slate-700 transition flex items-center space-x-1.5"
        >
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>{loadingAction === 'closure' ? 'Closing...' : '⚡ Inundate Low Bridge'}</span>
        </button>

        {/* Auto Dispatch */}
        <button
          onClick={() => navigate('/dispatch')}
          className="px-3.5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl shadow-md transition flex items-center space-x-1.5"
        >
          <Send className="w-3.5 h-3.5" />
          <span>🚑 Open AI Dispatcher</span>
        </button>

        {/* Reset State */}
        <button
          onClick={handleReset}
          disabled={loadingAction !== null}
          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 font-semibold rounded-xl border border-slate-700 transition flex items-center space-x-1"
          title="Reset back to step 1"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>

        {/* Help Tour */}
        <button
          onClick={onOpenGuide}
          className="px-3 py-2 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 font-bold rounded-xl border border-cyan-500/30 transition flex items-center space-x-1"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>User Guide</span>
        </button>
      </div>
    </div>
  );
};
