import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AlertTriangle, Plus, Search, Filter, Download, 
  Send, CheckCircle, Clock, MapPin, X
} from 'lucide-react';
import { useEmergencyStore } from '../stores/useEmergencyStore';
import { createIncident, exportIncidentsCSVUrl, updateIncidentStatus } from '../services/api';
import { EmergencyCall } from '../types';

export const IncidentsPage: React.FC = () => {
  const navigate = useNavigate();
  const { state, setState, uiThemeMode } = useEmergencyStore();
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const isFriendly = uiThemeMode === 'user-friendly';

  // New incident form state
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState('Flooding Trauma');
  const [newPriority, setNewPriority] = useState('Critical');
  const [newLocation, setNewLocation] = useState('Puri Marine Drive Ward');
  const [newLon, setNewLon] = useState(85.83);
  const [newLat, setNewLat] = useState(19.80);
  const [newSpecialty, setNewSpecialty] = useState('Trauma');

  const incidents = state?.emergency_calls || [];

  const filtered = incidents.filter((inc) => {
    const matchSearch = inc.patient_condition.toLowerCase().includes(search.toLowerCase()) ||
      inc.district_zone.toLowerCase().includes(search.toLowerCase()) ||
      inc.id.toLowerCase().includes(search.toLowerCase());
    const matchPri = priorityFilter === 'ALL' || inc.priority.toLowerCase().includes(priorityFilter.toLowerCase());
    const matchStat = statusFilter === 'ALL' || inc.status.toLowerCase() === statusFilter.toLowerCase();
    return matchSearch && matchPri && matchStat;
  });

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await createIncident({
        title: newTitle,
        incident_type: newType,
        priority: newPriority,
        location_name: newLocation,
        coordinates: [Number(newLon), Number(newLat)],
        required_specialty: newSpecialty,
        affected_population: 1,
        description: `Emergency Call: ${newTitle} at ${newLocation}`
      });
      setIsCreateOpen(false);
      setNewTitle('');
      if (state) {
        setState({
          ...state,
          emergency_calls: [created, ...state.emergency_calls]
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleResolve = async (id: string) => {
    try {
      await updateIncidentStatus(id, 'Resolved');
      if (state) {
        setState({
          ...state,
          emergency_calls: state.emergency_calls.map(c => c.id === id ? { ...c, status: 'Resolved' } : c)
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className={`text-lg font-bold ${isFriendly ? 'text-slate-900' : 'text-slate-100'}`}>
            Emergency Incident Management
          </h2>
          <p className={`text-xs ${isFriendly ? 'text-slate-500' : 'text-slate-400'}`}>
            View, triage, and dispatch responders for incoming emergency calls
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <a
            href={exportIncidentsCSVUrl()}
            download
            className={`px-3.5 py-2 text-xs font-semibold rounded-xl border flex items-center space-x-1.5 transition ${
              isFriendly
                ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-xs'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </a>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm flex items-center space-x-1.5 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Report Incident</span>
          </button>
        </div>
      </div>

      {/* 2. Search & Filter Bar */}
      <div className={`p-4 rounded-2xl border flex flex-wrap items-center gap-3 transition-colors ${
        isFriendly
          ? 'bg-white border-slate-200 shadow-sm'
          : 'bg-slate-900 border-slate-800'
      }`}>
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search incidents by name, description, or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full rounded-xl pl-9 pr-4 py-2 text-xs transition ${
              isFriendly
                ? 'bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500'
                : 'bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500'
            }`}
          />
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className={`rounded-xl px-3 py-2 text-xs focus:outline-none ${
              isFriendly
                ? 'bg-slate-50 border border-slate-200 text-slate-700'
                : 'bg-slate-950 border border-slate-800 text-slate-200'
            }`}
          >
            <option value="ALL">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Standard">Standard</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`rounded-xl px-3 py-2 text-xs focus:outline-none ${
              isFriendly
                ? 'bg-slate-50 border border-slate-200 text-slate-700'
                : 'bg-slate-950 border border-slate-800 text-slate-200'
            }`}
          >
            <option value="ALL">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Dispatched">Dispatched</option>
            <option value="Transporting">Transporting</option>
            <option value="Resolved">Resolved</option>
          </select>
        </div>
      </div>

      {/* 3. Incidents Table */}
      <div className={`rounded-2xl border shadow-sm overflow-hidden transition-colors ${
        isFriendly
          ? 'bg-white border-slate-200'
          : 'bg-slate-900 border-slate-800'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className={`font-semibold border-b uppercase text-[10px] tracking-wider ${
              isFriendly
                ? 'bg-slate-50 text-slate-500 border-slate-200'
                : 'bg-slate-950 text-slate-400 border-slate-800'
            }`}>
              <tr>
                <th className="px-4 py-3">Incident ID</th>
                <th className="px-4 py-3">Condition</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Zone / Location</th>
                <th className="px-4 py-3">Specialty</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isFriendly ? 'divide-slate-100 text-slate-700' : 'divide-slate-800/60 text-slate-300'}`}>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    No incidents match your filter criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((inc) => {
                  const isCrit = inc.priority.includes('Critical') || inc.priority.includes('P1');
                  const isResolved = inc.status === 'Resolved';
                  return (
                    <tr key={inc.id} className={`transition ${isFriendly ? 'hover:bg-slate-50/80' : 'hover:bg-slate-800/40'}`}>
                      <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-slate-200">{inc.id}</td>
                      <td className="px-4 py-3">
                        <span className="font-semibold block">{inc.patient_condition}</span>
                        <span className="text-[10px] text-slate-400">{inc.timestamp}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isCrit 
                            ? 'bg-rose-100 text-rose-700' 
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {inc.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{inc.district_zone}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium">{inc.required_specialty}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          isResolved 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-indigo-50 text-indigo-700'
                        }`}>
                          {inc.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        {!isResolved && (
                          <button
                            onClick={() => handleResolve(inc.id)}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[11px] font-semibold transition"
                          >
                            Mark Resolved
                          </button>
                        )}
                        <button
                          onClick={() => navigate('/dispatch')}
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-semibold transition"
                        >
                          Dispatch &rarr;
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Create Incident Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4 ${
            isFriendly ? 'bg-white text-slate-800' : 'bg-slate-900 text-slate-100 border border-slate-800'
          }`}>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-base">Report New Incident</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold block mb-1">Incident Condition / Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Trapped citizen, high water level"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none"
                  >
                    <option value="Critical">Critical (P1)</option>
                    <option value="High">High (P2)</option>
                    <option value="Standard">Standard (P3)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold block mb-1">Specialty Needed</label>
                  <select
                    value={newSpecialty}
                    onChange={(e) => setNewSpecialty(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none"
                  >
                    <option value="Trauma">Trauma</option>
                    <option value="Cardiac">Cardiac</option>
                    <option value="Pediatric">Pediatric</option>
                    <option value="Burn">Burn & Surge</option>
                    <option value="General">General</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Location Name</label>
                <input
                  type="text"
                  required
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl"
                >
                  Create Incident
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
