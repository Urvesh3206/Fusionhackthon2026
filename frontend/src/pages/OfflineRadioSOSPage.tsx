import React from 'react';
import { PatientSOSDashboard } from '../components/sos/PatientSOSDashboard';
import { AdminTriageMap } from '../components/sos/AdminTriageMap';
import { useEmergencyStore } from '../stores/useEmergencyStore';

export const OfflineRadioSOSPage: React.FC = () => {
  const { currentUser } = useEmergencyStore();

  // If the active profile is User / Citizen (Patient), directly render Patient SOS Interface
  if (currentUser.role === 'citizen') {
    return <PatientSOSDashboard />;
  }

  // If active profile is Doctor or Admin, directly render Admin/Doctor Triage Map
  return <AdminTriageMap />;
};
