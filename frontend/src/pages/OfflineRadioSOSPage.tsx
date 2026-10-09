import React, { useState } from 'react';
import { User, ShieldAlert, Radio, Activity, BookOpen, Heart, Cpu } from 'lucide-react';
import { UserSOSInterface } from '../components/sos/UserSOSInterface';
import { AdminSOSInterface } from '../components/sos/AdminSOSInterface';
import { useEmergencyStore } from '../stores/useEmergencyStore';

type SOSTab = 'user-victim' | 'admin-dispatch';

export const OfflineRadioSOSPage: React.FC = () => {
  const { currentUser } = useEmergencyStore();
  
  // Default to admin if user role is dispatcher/paramedic/doctor, else user-victim
  const isDefaultAdmin = currentUser.role.includes('DISPATCHER') || currentUser.role.includes('PARAMEDIC') || currentUser.role.includes('DIRECTOR');
  const [activeTab, setActiveTab] = useState<SOSTab>(isDefaultAdmin ? 'admin-dispatch' : 'user-victim');

  return (
    <div className="space-y-4">
      {/* Profile Selector Tab Bar */}
      <div className="p-2 bg-slate-900 border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('user-victim')}
            className={`px-4 py-2 rounded-xl font-bold flex items-center space-x-2 transition ${
              activeTab === 'user-victim'
                ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-lg shadow-rose-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>1. User Profile (Patient / Victim SOS)</span>
          </button>

          <button
            onClick={() => setActiveTab('admin-dispatch')}
            className={`px-4 py-2 rounded-xl font-bold flex items-center space-x-2 transition ${
              activeTab === 'admin-dispatch'
                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>2. Admin Profile (Doctor / Ambulance / Dispatch)</span>
          </button>
        </div>

        <div className="text-[11px] text-slate-400 font-mono hidden md:block">
          Bluetooth Low Energy (BLE) & Wi-Fi Direct Mesh Simulation Active
        </div>
      </div>

      {/* Profile Content */}
      {activeTab === 'user-victim' ? (
        <UserSOSInterface />
      ) : (
        <AdminSOSInterface />
      )}
    </div>
  );
};
