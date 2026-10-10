import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, Navigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNavigation } from './TopNavigation';
import { NotificationDrawer } from './NotificationDrawer';
import { useEmergencyStore } from '../../stores/useEmergencyStore';
import { fetchCurrentState, runOptimizationReplan } from '../../services/api';
import { initWebSocket } from '../../services/websocket';

import { LiveToastAlert } from './LiveToastAlert';
import { PWAInstallBanner } from '../pwa/PWAInstallBanner';
import { SWUpdateBanner } from '../pwa/SWUpdateBanner';
import { DeviceServicesHub } from '../pwa/DeviceServicesHub';

export const AppLayout: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { 
    setState, setPlan, setConnected, uiThemeMode, currentUser,
    showDeviceServicesModal, setShowDeviceServicesModal 
  } = useEmergencyStore();
  const location = useLocation();

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

  // Role-Based Route Navigation
  const currentPath = location.pathname;
  if (currentUser.role === 'citizen') {
    const allowedCitizenRoutes = ['/', '/dashboard', '/radio-sos', '/map', '/profile', '/comms', '/hazards', '/alerts'];
    if (!allowedCitizenRoutes.includes(currentPath)) {
      return <Navigate to="/radio-sos" replace />;
    }
  } else if (currentUser.role === 'doctor' || currentUser.role === 'medical_coordinator') {
    const allowedDoctorRoutes = ['/', '/dashboard', '/radio-sos', '/hospitals', '/fleet', '/resources', '/dispatch', '/incidents', '/map', '/profile', '/alerts'];
    if (!allowedDoctorRoutes.includes(currentPath)) {
      return <Navigate to="/radio-sos" replace />;
    }
  }

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

      {/* Real-Time Live Toast Notification Popup */}
      <LiveToastAlert />

      {/* PWA Floating Install Prompt & iOS Guide */}
      <PWAInstallBanner />

      {/* Service Worker Update Toast */}
      <SWUpdateBanner />

      {/* Device Hardware & PWA Services Hub Modal */}
      <DeviceServicesHub 
        isOpen={showDeviceServicesModal} 
        onClose={() => setShowDeviceServicesModal(false)} 
      />
    </div>
  );
};

