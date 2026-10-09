import React from 'react';
import { Clock } from 'lucide-react';

interface DataAgeBadgeProps {
  ageSec: number;
  className?: string;
}

export const DataAgeBadge: React.FC<DataAgeBadgeProps> = ({ ageSec, className = "" }) => {
  let badgeColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
  let label = `${ageSec}s ago`;

  if (ageSec > 600) {
    // Stale > 10 min
    badgeColor = "bg-rose-500/20 text-rose-300 border-rose-500/50 animate-pulse";
    const mins = Math.floor(ageSec / 60);
    label = `${mins}m ago (STALE)`;
  } else if (ageSec > 120) {
    // Moderately aged
    badgeColor = "bg-amber-500/20 text-amber-300 border-amber-500/40";
    const mins = Math.floor(ageSec / 60);
    label = `${mins}m ago`;
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono border ${badgeColor} ${className}`}
      title={`Telemetry update age: ${ageSec} seconds. Stale data triggers routing & assignment risk penalties.`}
    >
      <Clock className="w-3 h-3" />
      {label}
    </span>
  );
};
