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
  const { setState, setPlan, setConnected, uiThemeMode } = useEmergencyStore();

  const isFriendly = uiThemeMode === 'user-friendly';

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
    <div className={`flex h-screen w-screen overflow-hidden antialiased transition-colors duration-200 ${
      isFriendly 
        ? 'bg-[#f4f5f8] text-slate-800 font-sans' 
        : 'bg-surface text-on-surface font-sans'
    }`}>
      {/* Sidebar Navigation */}
      <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-w-0 h-full overflow-hidden ${
        isFriendly ? 'bg-[#f4f5f8]' : 'bg-surface-container-lowest/50'
      }`}>
        <TopNavigation />
        
        <main className={`flex-1 overflow-y-auto p-3 md:p-5 ${
          isFriendly ? 'bg-[#f4f5f8]' : 'bg-surface'
        }`}>
          <Outlet />
        </main>
      </div>

      {/* Slide-over Notification Alert Center */}
      <NotificationDrawer />
    </div>
  );
};

