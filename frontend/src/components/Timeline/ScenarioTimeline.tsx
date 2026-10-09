import React, { useState, useEffect } from 'react';
import { Play, Pause, SkipForward, SkipBack, Wind, Flame, RefreshCw } from 'lucide-react';
import { useEmergencyStore } from '../../stores/useEmergencyStore';
import { advanceScenarioStep } from '../../services/api';

export const ScenarioTimeline: React.FC = () => {
  const { state, setState, setLoading, isLoading, setPlan } = useEmergencyStore();
  const [isPlaying, setIsPlaying] = useState(false);

  const scenarioId = state?.scenario_id || 'cyclone_fani_puri';
  const activeStep = state?.step_index || 0;
  const totalSteps = state?.total_steps || 5;

  const cycloneSteps = [
    { label: "T-48h", title: "Cone Appears", sub: "Discharge: 140 m³/s" },
    { label: "T-24h", title: "Cone Narrows", sub: "Surge & Rain Watch" },
    { label: "T-6h", title: "Bridges Flood", sub: "2 Low Bridges Overtopped" },
    { label: "Landfall", title: "Eye Crosses Coast", sub: "Power & Comms Down" },
    { label: "T+6h", title: "Highway Debris", sub: "NH-316 Blocked" }
  ];

  const heatwaveSteps = [
    { label: "Day 1", title: "Heat Advisory", sub: "Apparent Temp: 43.5°C" },
    { label: "Day 2", title: "Peak Thermal Stress", sub: "Wet Bulb: 32.5°C" },
    { label: "Day 3", title: "Substation Overload", sub: "Gop CHC Power Tripped" }
  ];

  const currentSteps = scenarioId === 'cyclone_fani_puri' ? cycloneSteps : heatwaveSteps;

  const handleStepChange = async (targetIndex: number) => {
    setLoading(true);
    try {
      const newState = await advanceScenarioStep(targetIndex, scenarioId);
      setState(newState);
      // Reset plan so dispatcher can trigger replan on new state
      setPlan(null as any);
    } catch (err) {
      console.error("Step change error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleScenarioSwitch = async (newScenarioId: string) => {
    if (newScenarioId === scenarioId) return;
    setLoading(true);
    try {
      const newState = await advanceScenarioStep(0, newScenarioId);
      setState(newState);
      setPlan(null as any);
    } catch (err) {
      console.error("Scenario switch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let timer: any = null;
    if (isPlaying) {
      timer = setInterval(() => {
        const nextIdx = (activeStep + 1) % totalSteps;
        handleStepChange(nextIdx);
      }, 5000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, activeStep, totalSteps, scenarioId]);

  return (
    <div className="bg-slate-900/95 border-b border-slate-800 px-4 py-3 shadow-xl backdrop-blur">
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Scenario Selector & Controls */}
        <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-start">
          <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => handleScenarioSwitch('cyclone_fani_puri')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                scenarioId === 'cyclone_fani_puri'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Wind className="w-3.5 h-3.5" />
              Cyclone Fani
            </button>
            <button
              onClick={() => handleScenarioSwitch('heatwave_odisha')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                scenarioId === 'heatwave_odisha'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              Heatwave Vulnerability
            </button>
          </div>

          <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
            <button
              disabled={isLoading || activeStep === 0}
              onClick={() => handleStepChange(Math.max(0, activeStep - 1))}
              className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 rounded hover:bg-slate-800"
              title="Previous Step"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              disabled={isLoading}
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-1.5 text-blue-400 hover:text-blue-300 rounded hover:bg-slate-800"
              title={isPlaying ? "Pause Scenario Playback" : "Auto-play Timeline"}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
            </button>
            <button
              disabled={isLoading || activeStep === totalSteps - 1}
              onClick={() => handleStepChange(Math.min(totalSteps - 1, activeStep + 1))}
              className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 rounded hover:bg-slate-800"
              title="Next Step"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Milestone Stepper */}
        <div className="flex items-center gap-2 overflow-x-auto w-full lg:w-auto py-1">
          {currentSteps.map((step, idx) => {
            const isActive = idx === activeStep;
            const isPassed = idx < activeStep;
            return (
              <button
                key={step.label}
                onClick={() => handleStepChange(idx)}
                className={`flex flex-col items-start px-3 py-1.5 rounded-lg border text-left transition-all min-w-[130px] ${
                  isActive
                    ? 'bg-blue-600/20 border-blue-500 shadow-sm text-blue-200'
                    : isPassed
                    ? 'bg-slate-950/60 border-slate-700 text-slate-300 hover:border-slate-600'
                    : 'bg-slate-950/30 border-slate-800/80 text-slate-500 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={`text-[11px] font-bold font-mono ${isActive ? 'text-blue-400' : 'text-slate-400'}`}>
                    {step.label}
                  </span>
                  {isActive && <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />}
                </div>
                <span className="text-xs font-semibold truncate w-full text-slate-200">{step.title}</span>
                <span className="text-[10px] text-slate-400 truncate w-full">{step.sub}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
