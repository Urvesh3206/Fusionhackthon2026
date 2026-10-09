import React, { useState, useEffect } from 'react';
import { Package, Plus, CheckCircle2, AlertTriangle, ShieldCheck, MapPin, X } from 'lucide-react';
import { fetchMedicalResources, recommendClinics, allocateResource } from '../services/api';
import { MedicalResourceItem, ClinicCandidate } from '../types';

export const MedicalResourcesPage: React.FC = () => {
  const [resources, setResources] = useState<MedicalResourceItem[]>([]);
  const [clinics, setClinics] = useState<ClinicCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRes, setSelectedRes] = useState<MedicalResourceItem | null>(null);
  const [allocQty, setAllocQty] = useState(5);
  const [targetSite, setTargetSite] = useState('site_cand_satyabadi');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rList, cList] = await Promise.all([
        fetchMedicalResources(),
        recommendClinics()
      ]);
      setResources(rList);
      setClinics(cList);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAllocate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRes) return;
    try {
      await allocateResource({
        resource_id: selectedRes.id,
        target_site_id: targetSite,
        quantity: allocQty,
        notes: `Emergency dispatch to candidate site ${targetSite}`
      });
      setSelectedRes(null);
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100">Medical Resources & Temporary Site Allocation</h2>
          <p className="text-xs text-slate-400">
            MCLP mathematical site selection for inflatable field clinics and cooling centers
          </p>
        </div>
      </div>

      {/* 2. MCLP Candidate Site Rankings */}
      <div className="bg-slate-900 border border-cyan-500/30 rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-bold text-slate-100">
              Optimal Temporary Clinic & Cooling Point Site Rankings (MCLP)
            </h3>
          </div>
          <span className="text-[11px] text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full font-semibold">
            Maximal Covering Location Problem
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {clinics.map((site, idx) => (
            <div key={site.site_id} className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Rank #{idx + 1} &bull; Score {site.suitability_score}
                </span>
                <span className="text-emerald-400 text-xs font-semibold flex items-center">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Verified Safe
                </span>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-100">{site.site_name}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Elevation: <span className="text-slate-200 font-semibold">{site.elevation_m}m</span> (Flood Risk: {(site.flood_hazard_score * 100).toFixed(0)}%)
                </p>
                <p className="text-[11px] text-slate-400">
                  Target Capacity: <span className="text-cyan-400 font-semibold">{site.capacity} patients</span>
                </p>
              </div>

              <div className="pt-2 border-t border-slate-800 space-y-1">
                {site.reasoning.map((r, rIdx) => (
                  <p key={rIdx} className="text-[11px] text-slate-400 flex items-start">
                    <span className="text-cyan-400 mr-1.5">&bull;</span>
                    <span>{r}</span>
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Medical Supplies Inventory Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-slate-200">Medical Stock & Inventory Depot</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Resource Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Available / Total</th>
                <th className="px-4 py-3">Allocated</th>
                <th className="px-4 py-3">Depot Location</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {resources.map((res) => (
                <tr key={res.id} className="hover:bg-slate-800/40 transition">
                  <td className="px-4 py-3 font-semibold text-slate-100">{res.name}</td>
                  <td className="px-4 py-3 text-slate-400">{res.category}</td>
                  <td className="px-4 py-3 font-mono font-bold text-emerald-400">
                    {res.available_quantity} / {res.quantity} {res.unit}
                  </td>
                  <td className="px-4 py-3 text-slate-400">{res.allocated_quantity} {res.unit}</td>
                  <td className="px-4 py-3 text-slate-300">{res.location_name}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      res.status === 'Available' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      {res.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setSelectedRes(res)}
                      className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs rounded-lg transition"
                    >
                      Allocate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Allocation Modal */}
      {selectedRes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center">
                <Package className="w-4 h-4 text-cyan-400 mr-2" /> Allocate {selectedRes.name}
              </h3>
              <button onClick={() => setSelectedRes(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAllocate} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Target Field Clinic Site</label>
                <select
                  value={targetSite}
                  onChange={(e) => setTargetSite(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                >
                  {clinics.map((c) => (
                    <option key={c.site_id} value={c.site_id}>
                      {c.site_name} (Capacity: {c.capacity})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Quantity to Dispatch (Max: {selectedRes.available_quantity} {selectedRes.unit})
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedRes.available_quantity}
                  value={allocQty}
                  onChange={(e) => setAllocQty(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedRes(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-bold"
                >
                  Confirm Dispatch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
