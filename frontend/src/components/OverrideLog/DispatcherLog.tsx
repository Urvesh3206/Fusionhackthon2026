import React from 'react';
import { History, X, CheckCircle, Edit3, XCircle } from 'lucide-react';
import { useEmergencyStore } from '../../stores/useEmergencyStore';

export const DispatcherLog: React.FC = () => {
  const { overrides, showLogModal, setShowLogModal } = useEmergencyStore();

  if (!showLogModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-base text-slate-100">Dispatcher Decision & Override Audit Log</h3>
          </div>
          <button
            onClick={() => setShowLogModal(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {overrides.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              No dispatcher overrides logged yet. Every accepted, edited, or rejected decision will be recorded here with an operational audit trail.
            </div>
          ) : (
            overrides.map((entry) => (
              <div
                key={entry.id}
                className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-bold">
                    {entry.action === 'ACCEPT' && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                    {entry.action === 'EDIT' && <Edit3 className="w-4 h-4 text-amber-400" />}
                    {entry.action === 'REJECT' && <XCircle className="w-4 h-4 text-rose-400" />}
                    <span className={
                      entry.action === 'ACCEPT' ? 'text-emerald-300' : entry.action === 'EDIT' ? 'text-amber-300' : 'text-rose-300'
                    }>
                      {entry.action} - {entry.recommendation_type}
                    </span>
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">{entry.timestamp}</span>
                </div>

                <div className="text-slate-300">
                  <p><strong className="text-slate-400">Chosen Target:</strong> {entry.dispatcher_chosen_id}</p>
                  <p className="mt-1"><strong className="text-slate-400">Dispatcher Justification:</strong> {entry.justification_reason}</p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={() => setShowLogModal(false)}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold"
          >
            Close Audit Log
          </button>
        </div>
      </div>
    </div>
  );
};
