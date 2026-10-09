import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, Compass, Send, Activity, Users, Shield, 
  ArrowRight, CheckCircle2, Sparkles, Play 
} from 'lucide-react';

interface QuickStartGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRunLandfallDemo?: () => void;
}

export const QuickStartGuideModal: React.FC<QuickStartGuideModalProps> = ({
  isOpen,
  onClose,
  onRunLandfallDemo
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const steps = [
    {
      number: '1',
      title: 'Interactive Disaster Map',
      badge: 'Step 1',
      icon: Compass,
      color: 'from-cyan-500 to-blue-600',
      description: 'View real-time ambulances, district hospitals, road closures, and flood hazard storm cones on the live tactical Leaflet map.',
      actionLabel: 'Open Live Map',
      action: () => {
        onClose();
        navigate('/map');
      }
    },
    {
      number: '2',
      title: 'Step Through Cyclone Milestones',
      badge: 'Step 2',
      icon: Activity,
      color: 'from-purple-500 to-indigo-600',
      description: 'Use the Timeline Stepper (T-48h to Landfall) to see how floods rise, bridges submerge, and the AI reroutes traffic in real time.',
      actionLabel: 'Launch Simulation',
      action: () => {
        onClose();
        navigate('/simulation');
      }
    },
    {
      number: '3',
      title: '1-Click Hazard-Aware Dispatch',
      badge: 'Step 3',
      icon: Send,
      color: 'from-emerald-500 to-teal-600',
      description: 'The optimization engine automatically matches the fastest available ambulance and destination hospital while avoiding flooded bridges.',
      actionLabel: 'Go to Dispatch',
      action: () => {
        onClose();
        navigate('/dispatch');
      }
    },
    {
      number: '4',
      title: 'Shelters & Civilian Evacuation',
      badge: 'Step 4',
      icon: Users,
      color: 'from-amber-500 to-orange-600',
      description: 'Generate structural capacity-constrained evacuation plans for coastal wards along verified safe corridors.',
      actionLabel: 'Evacuation Planner',
      action: () => {
        onClose();
        navigate('/evacuation');
      }
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-3xl p-6 md:p-8 shadow-2xl space-y-6 text-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-black text-white flex items-center gap-2">
                <span>Welcome to ResQGrid AI</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
                  Quick-Start Tour
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                4 easy steps to master the climate-aware emergency response & dispatch platform
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4 Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.number}
                className="p-4 bg-slate-950/80 border border-slate-800/90 rounded-2xl flex flex-col justify-between hover:border-slate-700 transition space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${step.color} flex items-center justify-center text-white font-bold text-xs shadow-md`}>
                        {step.number}
                      </div>
                      <span className="font-bold text-sm text-slate-100">{step.title}</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {step.description}
                  </p>
                </div>

                <button
                  onClick={step.action}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center justify-center space-x-1.5 transition"
                >
                  <span>{step.actionLabel}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Instant Interactive Action Button */}
        <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2 text-slate-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Deterministic Demo Data &bull; Zero external API keys needed</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/25 transition"
            >
              Start Exploring Console
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
