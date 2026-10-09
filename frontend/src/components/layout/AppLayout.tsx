import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNavigation } from './TopNavigation';
import { NotificationDrawer } from './NotificationDrawer';
import { useEmergencyStore } from '../../stores/useEmergencyStore';
import { fetchCurrentState, runOptimizationReplan } from '../../services/api';
import { initWebSocket } from '../../services/websocket';

export const AppLayout: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { setState, setPlan, setConnected } = useEmergencyStore();

  useEffect(() => {
    // Initial fetch of system state
    fetchCurrentState()
      .then((s) => {
        setState(s);
        setConnected(true);
      })
      .catch((err) => {
        console.error('Failed to load initial state:', err);
        setConnected(false);
      });

    // Initial replan
    runOptimizationReplan()
      .then((p) => setPlan(p))
      .catch((err) => console.error('Failed initial replan:', err));

    // Connect WebSocket
    const ws = initWebSocket();
    return () => {
      ws.disconnect();
    };
  }, [setState, setPlan, setConnected]);

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-slate-900/50">
        <TopNavigation />
        
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-950/40">
          <Outlet />
        </main>
      </div>

      {/* Slide-over Notification Alert Center */}
      <NotificationDrawer />
    </div>
  );
};
