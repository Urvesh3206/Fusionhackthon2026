import React from 'react';

interface SimulatedTagProps {
  realDataSource?: string;
  className?: string;
}

export const SimulatedTag: React.FC<SimulatedTagProps> = ({
  realDataSource = "Real API / IoT Telemetry Feed",
  className = ""
}) => {
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40 tracking-wider select-none ${className}`}
      title={`SIMULATED: In production, this value is ingested from ${realDataSource}`}
    >
      SIMULATED
    </span>
  );
};
