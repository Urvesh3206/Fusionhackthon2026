import React, { useState, useEffect } from 'react';
import { FileText, Download, Search, Shield, Filter } from 'lucide-react';
import { fetchAuditLogs, exportAuditLogsCSVUrl } from '../services/api';
import { AuditLogEntryModel } from '../types';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntryModel[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchAuditLogs()
      .then(setLogs)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = logs.filter(l => 
    l.action_type.toLowerCase().includes(search.toLowerCase()) ||
    l.actor_name.toLowerCase().includes(search.toLowerCase()) ||
    l.entity_id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100">Audit Logs & Dispatch Decision Ledger</h2>
          <p className="text-xs text-slate-400">
            Tamper-evident operational audit trail of dispatch decisions, overrides, and resource allocations
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <a
            href={exportAuditLogsCSVUrl()}
            download
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center space-x-1.5 transition shadow"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Audit Ledger CSV</span>
          </a>
        </div>
      </div>

      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by actor, action type, or entity ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800 tracking-wider">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Actor / Role</th>
                <th className="px-4 py-3">Action Type</th>
                <th className="px-4 py-3">Entity ID</th>
                <th className="px-4 py-3">Justification / Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-500 font-sans">
                    No audit records recorded yet.
                  </td>
                </tr>
              ) : (
                filtered.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-800/40 transition font-sans">
                    <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">{l.timestamp}</td>
                    <td className="px-4 py-3 font-semibold text-slate-200">
                      <span>{l.actor_name}</span>
                      <span className="text-[10px] text-slate-500 block uppercase">{l.actor_role}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        {l.action_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-300">{l.entity_id}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {l.justification || JSON.stringify(l.details)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
