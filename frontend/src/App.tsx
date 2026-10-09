import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { DisasterMapPage } from './pages/DisasterMapPage';
import { HazardIntelligencePage } from './pages/HazardIntelligencePage';
import { IncidentsPage } from './pages/IncidentsPage';
import { DispatchPage } from './pages/DispatchPage';
import { AmbulanceFleetPage } from './pages/AmbulanceFleetPage';
import { HospitalManagementPage } from './pages/HospitalManagementPage';
import { MedicalResourcesPage } from './pages/MedicalResourcesPage';
import { EvacuationPlanningPage } from './pages/EvacuationPlanningPage';
import { DisasterSimulationPage } from './pages/DisasterSimulationPage';
import { AnalyticsReportsPage } from './pages/AnalyticsReportsPage';
import { AlertsPage } from './pages/AlertsPage';
import { SettingsPage } from './pages/SettingsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { ProfilePage } from './pages/ProfilePage';
import { OfflineRadioSOSPage } from './pages/OfflineRadioSOSPage';
import { MultiChannelCommsPage } from './pages/MultiChannelCommsPage';
import { NotFoundPage } from './pages/NotFoundPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="dashboard" element={<Navigate to="/" replace />} />
          <Route path="map" element={<DisasterMapPage />} />
          <Route path="field-map-node-grid" element={<Navigate to="/map" replace />} />
          <Route path="comms" element={<MultiChannelCommsPage />} />
          <Route path="multi-channel-comms" element={<Navigate to="/comms" replace />} />
          <Route path="live-mission-comms-hub" element={<Navigate to="/comms" replace />} />
          <Route path="channel-telemetry-diagnostics" element={<Navigate to="/comms" replace />} />
          <Route path="incident-dispatch-outbox" element={<Navigate to="/comms" replace />} />
          <Route path="radio-sos" element={<OfflineRadioSOSPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="hazards" element={<HazardIntelligencePage />} />
          <Route path="incidents" element={<IncidentsPage />} />
          <Route path="dispatch" element={<DispatchPage />} />
          <Route path="fleet" element={<AmbulanceFleetPage />} />
          <Route path="hospitals" element={<HospitalManagementPage />} />
          <Route path="resources" element={<MedicalResourcesPage />} />
          <Route path="evacuation" element={<EvacuationPlanningPage />} />
          <Route path="simulation" element={<DisasterSimulationPage />} />
          <Route path="analytics" element={<AnalyticsReportsPage />} />
          <Route path="alerts" element={<AlertsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="audit-logs" element={<AuditLogsPage />} />
          <Route path="audit-logs-security" element={<Navigate to="/audit-logs" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
