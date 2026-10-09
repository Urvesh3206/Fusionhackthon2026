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
  const { state, setState } = useEmergencyStore();
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

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
          <h2 className="text-lg font-bold text-slate-100">Emergency Incident Management</h2>
          <p className="text-xs text-slate-400">Track, triage, and assign incoming disaster calls</p>
        </div>

        <div className="flex items-center space-x-3">
          <a
            href={exportIncidentsCSVUrl()}
            download
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center space-x-1.5 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </a>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-cyan-500/20 flex items-center space-x-1.5 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Report New Incident</span>
          </button>
        </div>
      </div>

      {/* 2. Search & Filter Bar */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by ID, condition, or district zone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Priorities</option>
            <option value="Critical">Critical (P1)</option>
            <option value="High">High (P2)</option>
            <option value="Standard">Standard (P3)</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
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
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3">Incident ID</th>
                <th className="px-4 py-3">Condition / Description</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Zone / Location</th>
                <th className="px-4 py-3">Specialty</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500">
                    No incidents match your filter criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((inc) => {
                  const isCrit = inc.priority.includes('Critical') || inc.priority.includes('P1');
                  const isResolved = inc.status === 'Resolved';
                  return (
                    <tr key={inc.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-4 py-3 font-mono font-bold text-slate-200">{inc.id}</td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-100 block">{inc.patient_condition}</span>
                        <span className="text-[10px] text-slate-500">{inc.timestamp}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isCrit ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}>
                          {inc.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-1 text-slate-300">
                          <MapPin className="w-3 h-3 text-slate-500" />
                          <span>{inc.district_zone}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-300">{inc.required_specialty}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          isResolved ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-cyan-300'
                        }`}>
                          {inc.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {!isResolved ? (
                            <>
                              <button
                                onClick={() => navigate('/dispatch')}
                                className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-[11px] font-bold flex items-center space-x-1 transition shadow"
                              >
                                <Send className="w-3 h-3" />
                                <span>Dispatch</span>
                              </button>
                              <button
                                onClick={() => handleResolve(inc.id)}
                                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg text-[11px] font-semibold border border-slate-700 transition"
                              >
                                Resolve
                              </button>
                            </>
                          ) : (
                            <span className="text-[11px] text-emerald-400 flex items-center">
                              <CheckCircle className="w-3.5 h-3.5 mr-1" /> Closed
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Report New Incident Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center">
                <AlertTriangle className="w-5 h-5 text-red-500 mr-2" /> Report Emergency Call
              </h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Incident Title / Patient Condition</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Severe Flood Trauma / Cardiac Arrest"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Incident Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="Flooding Trauma">Flooding Trauma</option>
                    <option value="Heat Stroke">Heat Stroke</option>
                    <option value="Structural Collapse">Structural Collapse</option>
                    <option value="Cardiac Emergency">Cardiac Emergency</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="Critical">Critical (P1)</option>
                    <option value="High">High (P2)</option>
                    <option value="Medium">Medium (P3)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Location Zone Name</label>
                <input
                  type="text"
                  required
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={newLon}
                    onChange={(e) => setNewLon(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={newLat}
                    onChange={(e) => setNewLat(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Required Medical Specialty</label>
                <select
                  value={newSpecialty}
                  onChange={(e) => setNewSpecialty(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                >
                  <option value="Trauma">Trauma Surgery</option>
                  <option value="Cardiac">Cardiology / Cath Lab</option>
                  <option value="Heat">Active Thermal Cooling</option>
                  <option value="General">General Emergency</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-semibold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-bold shadow-lg shadow-cyan-500/20"
                >
                  Confirm & Route Call
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
