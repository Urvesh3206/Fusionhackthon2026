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
  const { state, setState, setPlan, uiThemeMode } = useEmergencyStore();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const isFriendly = uiThemeMode === 'user-friendly';

  const handleTriggerLandfall = async () => {
    setLoadingAction('landfall');
    try {
      const nextState = await advanceScenarioStep(3); // Step 3 = Landfall Peak
      setState(nextState);
      const plan = await runOptimizationReplan();
      setPlan(plan);
      onShowToast('🌊 Cyclone Landfall Activated! High winds & storm surge simulated.');
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
      onShowToast('🚨 Bridge Closed! Ambulances automatically rerouted to safe paths.');
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
      onShowToast('🔄 System Reset! Operational status returned to baseline.');
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className={`p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs transition-colors ${
      isFriendly
        ? 'bg-white border border-slate-200 shadow-sm text-slate-800'
        : 'bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-950 border border-cyan-500/30 shadow-xl'
    }`}>
      <div className="flex items-center space-x-2.5">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
          isFriendly 
            ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' 
            : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
        }`}>
          <Sparkles className="w-4 h-4" />
        </div>
        <div>
          <span className={`font-bold text-xs block ${isFriendly ? 'text-slate-900' : 'text-slate-100'}`}>
            Quick Test Scenarios
          </span>
          <span className={`text-[11px] ${isFriendly ? 'text-slate-500' : 'text-slate-400'}`}>
            Test real-time emergency routing and responses with 1 click
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Trigger Landfall */}
        <button
          onClick={handleTriggerLandfall}
          disabled={loadingAction !== null}
          className={`px-3.5 py-2 font-semibold rounded-xl shadow-xs transition flex items-center space-x-1.5 ${
            isFriendly
              ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
              : 'bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-500 hover:to-red-500 text-white font-bold'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>{loadingAction === 'landfall' ? 'Simulating...' : '🌊 Simulate Storm'}</span>
        </button>

        {/* Trigger Road Flood */}
        <button
          onClick={handleTriggerClosure}
          disabled={loadingAction !== null}
          className={`px-3.5 py-2 font-semibold rounded-xl transition flex items-center space-x-1.5 ${
            isFriendly
              ? 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>{loadingAction === 'closure' ? 'Closing...' : '⚡ Close Bridge'}</span>
        </button>

        {/* Auto Dispatch */}
        <button
          onClick={() => navigate('/dispatch')}
          className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-xs transition flex items-center space-x-1.5"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Open Dispatcher</span>
        </button>

        {/* Reset State */}
        <button
          onClick={handleReset}
          disabled={loadingAction !== null}
          className={`px-3 py-2 font-medium rounded-xl border transition flex items-center space-x-1 ${
            isFriendly
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-700'
          }`}
          title="Reset back to step 1"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>

        {/* Help Tour */}
        <button
          onClick={onOpenGuide}
          className={`px-3 py-2 font-semibold rounded-xl border transition flex items-center space-x-1 ${
            isFriendly
              ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
              : 'bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border-cyan-500/30'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>User Guide</span>
        </button>
      </div>
    </div>
  );
};
