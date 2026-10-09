import { 
  FullSystemState, OptimizationPlanResponse, OverrideLogEntry,
  HazardRecord, HazardRefreshResponse, RiskScoreBreakdown,
  MedicalResourceItem, ClinicCandidate, EvacuationPlanResponse,
  DemandForecastPoint, AlertRecord, AuditLogEntryModel, SystemSettings,
  User, Hospital, Ambulance, EmergencyCall, Shelter
} from '../types';

const API_BASE = '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('resqgrid_token') || 'token_admin';
  return { 'Authorization': `Bearer ${token}` };
}

export async function loginUser(username: string, password: string):Promise<{ token: string; user: User }> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  if (!res.ok) throw new Error(`Login failed: ${res.statusText}`);
  return res.json();
}

export async function fetchCurrentUser(): Promise<User> {
  const res = await fetch(`${API_BASE}/auth/me`, { headers: getAuthHeader() });
  if (!res.ok) throw new Error('Failed to fetch user');
  return res.json();
}

export async function fetchCurrentState(): Promise<FullSystemState> {
  const res = await fetch(`${API_BASE}/state`, { headers: getAuthHeader() });
  if (!res.ok) throw new Error(`Failed to fetch state: ${res.statusText}`);
  return res.json();
}

export async function fetchSystemStatus(): Promise<any> {
  const res = await fetch(`${API_BASE}/system/status`, { headers: getAuthHeader() });
  if (!res.ok) throw new Error('Failed to fetch system status');
  return res.json();
}

// ---------------- Incidents ----------------
export async function fetchIncidents(): Promise<EmergencyCall[]> {
  const res = await fetch(`${API_BASE}/incidents`, { headers: getAuthHeader() });
  if (!res.ok) throw new Error('Failed to fetch incidents');
  return res.json();
}

export async function createIncident(data: any): Promise<EmergencyCall> {
  const res = await fetch(`${API_BASE}/incidents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to create incident');
  return res.json();
}

export async function assignIncident(incidentId: string, vehicleId: string, hospitalId?: string): Promise<any> {
  const url = new URL(`${API_BASE}/incidents/${incidentId}/assign`, window.location.origin);
  url.searchParams.append('vehicle_id', vehicleId);
  if (hospitalId) url.searchParams.append('hospital_id', hospitalId);
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: getAuthHeader()
  });
  if (!res.ok) throw new Error('Failed to assign incident');
  return res.json();
}

export async function updateIncidentStatus(incidentId: string, status: string): Promise<any> {
  const url = new URL(`${API_BASE}/incidents/${incidentId}/status`, window.location.origin);
  url.searchParams.append('status', status);
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: getAuthHeader()
  });
  if (!res.ok) throw new Error('Failed to update incident status');
  return res.json();
}

export async function acknowledgeIncident(incidentId: string, adminId: string = "usr_admin_01"): Promise<any> {
  const url = new URL(`${API_BASE}/incidents/${incidentId}/acknowledge`, window.location.origin);
  url.searchParams.append('admin_id', adminId);
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: getAuthHeader()
  });
  if (!res.ok) throw new Error('Failed to acknowledge incident');
  return res.json();
}

export async function resolveIncident(incidentId: string, resolutionSummary?: string): Promise<any> {
  const url = new URL(`${API_BASE}/incidents/${incidentId}/resolve`, window.location.origin);
  if (resolutionSummary) url.searchParams.append('resolution_summary', resolutionSummary);
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: getAuthHeader()
  });
  if (!res.ok) throw new Error('Failed to resolve incident');
  return res.json();
}

export function exportIncidentsCSVUrl(): string {
  return `${API_BASE}/incidents/export`;
}

// ---------------- Vehicles & Dispatch ----------------
export async function fetchVehicles(): Promise<Ambulance[]> {
  const res = await fetch(`${API_BASE}/vehicles`, { headers: getAuthHeader() });
  if (!res.ok) throw new Error('Failed to fetch vehicles');
  return res.json();
}

export async function fetchDispatchRecommendation(incidentId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/dispatch/recommendations/${incidentId}`, { headers: getAuthHeader() });
  if (!res.ok) throw new Error('Failed to fetch dispatch recommendation');
  return res.json();
}

// ---------------- Hospitals ----------------
export async function fetchHospitals(): Promise<Hospital[]> {
  const res = await fetch(`${API_BASE}/hospitals`, { headers: getAuthHeader() });
  if (!res.ok) throw new Error('Failed to fetch hospitals');
  return res.json();
}

export async function updateHospitalCapacity(hospitalId: string, data: { occupied_beds?: number; free_icu_beds?: number; has_power?: boolean; has_comms?: boolean }): Promise<Hospital> {
  const url = new URL(`${API_BASE}/hospitals/${hospitalId}/capacity`, window.location.origin);
  if (data.occupied_beds !== undefined) url.searchParams.append('occupied_beds', data.occupied_beds.toString());
  if (data.free_icu_beds !== undefined) url.searchParams.append('free_icu_beds', data.free_icu_beds.toString());
  if (data.has_power !== undefined) url.searchParams.append('has_power', data.has_power.toString());
  if (data.has_comms !== undefined) url.searchParams.append('has_comms', data.has_comms.toString());

  const res = await fetch(url.toString(), {
    method: 'PUT',
    headers: getAuthHeader()
  });
  if (!res.ok) throw new Error('Failed to update hospital');
  return res.json();
}

// ---------------- Medical Resources & Clinics ----------------
export async function fetchMedicalResources(): Promise<MedicalResourceItem[]> {
  const res = await fetch(`${API_BASE}/resources`, { headers: getAuthHeader() });
  if (!res.ok) throw new Error('Failed to fetch resources');
  return res.json();
}

export async function allocateResource(data: { resource_id: string; target_site_id: string; quantity: number; notes?: string }): Promise<any> {
  const res = await fetch(`${API_BASE}/resources/allocate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to allocate resource');
  return res.json();
}

export async function recommendClinics(): Promise<ClinicCandidate[]> {
  const res = await fetch(`${API_BASE}/resources/recommend-clinics`, { headers: getAuthHeader() });
  if (!res.ok) throw new Error('Failed to fetch clinic recommendations');
  return res.json();
}

// ---------------- Shelters & Evacuation ----------------
export async function fetchShelters(): Promise<Shelter[]> {
  const res = await fetch(`${API_BASE}/shelters`, { headers: getAuthHeader() });
  if (!res.ok) throw new Error('Failed to fetch shelters');
  return res.json();
}

export async function computeEvacuationPlan(): Promise<EvacuationPlanResponse> {
  const res = await fetch(`${API_BASE}/evacuation/plan`, {
    method: 'POST',
    headers: getAuthHeader()
  });
  if (!res.ok) throw new Error('Failed to compute evacuation plan');
  return res.json();
}

// ---------------- Hazards & Intelligence ----------------
export async function fetchHazards(): Promise<HazardRecord[]> {
  const res = await fetch(`${API_BASE}/hazards`, { headers: getAuthHeader() });
  if (!res.ok) throw new Error('Failed to fetch hazards');
  return res.json();
}

export async function refreshHazards(): Promise<HazardRefreshResponse> {
  const res = await fetch(`${API_BASE}/hazards/refresh`, {
    method: 'POST',
    headers: getAuthHeader()
  });
  if (!res.ok) throw new Error('Failed to refresh hazards');
  return res.json();
}

export async function fetchRiskFormula(): Promise<RiskScoreBreakdown> {
  const res = await fetch(`${API_BASE}/hazards/risk-score-formula`, { headers: getAuthHeader() });
  if (!res.ok) throw new Error('Failed to fetch risk score formula');
  return res.json();
}

// ---------------- Demand Forecasting ----------------
export async function fetchDemandForecast(): Promise<DemandForecastPoint[]> {
  const res = await fetch(`${API_BASE}/forecast/demand`, { headers: getAuthHeader() });
  if (!res.ok) throw new Error('Failed to fetch demand forecast');
  return res.json();
}

// ---------------- Routing ----------------
export async function calculateRoute(origin: [number, number], destination: [number, number], safetyWeight: number = 0.5): Promise<any> {
  const res = await fetch(`${API_BASE}/routes/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify({ origin, destination, safety_weight: safetyWeight })
  });
  if (!res.ok) throw new Error('Failed to calculate route');
  return res.json();
}

export async function compareRoutes(origin: [number, number], destination: [number, number]): Promise<any> {
  const res = await fetch(`${API_BASE}/routes/compare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify({ origin, destination })
  });
  if (!res.ok) throw new Error('Failed to compare routes');
  return res.json();
}

// ---------------- Simulation & Scenarios ----------------
export async function fetchScenarios(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/simulation/scenarios`, { headers: getAuthHeader() });
  if (!res.ok) throw new Error('Failed to fetch scenarios');
  return res.json();
}

export async function advanceScenarioStep(stepIndex?: number, scenarioId?: string): Promise<FullSystemState> {
  const res = await fetch(`${API_BASE}/simulation/step`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify({ step_index: stepIndex, scenario_id: scenarioId })
  });
  if (!res.ok) throw new Error(`Failed to step scenario: ${res.statusText}`);
  return res.json();
}

export async function resetSimulation(): Promise<FullSystemState> {
  const res = await fetch(`${API_BASE}/simulation/reset`, {
    method: 'POST',
    headers: getAuthHeader()
  });
  if (!res.ok) throw new Error('Failed to reset simulation');
  return res.json();
}

export async function triggerRoadClosure(edgeId: string, reason?: string): Promise<FullSystemState> {
  const res = await fetch(`${API_BASE}/scenario/closure`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify({ edge_id: edgeId, reason })
  });
  if (!res.ok) throw new Error(`Failed to close road edge: ${res.statusText}`);
  return res.json();
}

export async function resetRoadClosures(): Promise<FullSystemState> {
  const res = await fetch(`${API_BASE}/scenario/reset_closures`, {
    method: 'POST',
    headers: getAuthHeader()
  });
  if (!res.ok) throw new Error(`Failed to reset closures: ${res.statusText}`);
  return res.json();
}

// ---------------- Alerts ----------------
export async function fetchAlerts(severity?: string): Promise<AlertRecord[]> {
  const url = new URL(`${API_BASE}/alerts`, window.location.origin);
  if (severity) url.searchParams.append('severity', severity);
  const res = await fetch(url.toString(), { headers: getAuthHeader() });
  if (!res.ok) throw new Error('Failed to fetch alerts');
  return res.json();
}

export async function acknowledgeAlert(alertId: string): Promise<AlertRecord> {
  const res = await fetch(`${API_BASE}/alerts/${alertId}/ack`, {
    method: 'POST',
    headers: getAuthHeader()
  });
  if (!res.ok) throw new Error('Failed to acknowledge alert');
  return res.json();
}

// ---------------- Audit Logs & Overrides ----------------
export async function fetchAuditLogs(): Promise<AuditLogEntryModel[]> {
  const res = await fetch(`${API_BASE}/audit-logs`, { headers: getAuthHeader() });
  if (!res.ok) throw new Error('Failed to fetch audit logs');
  return res.json();
}

export function exportAuditLogsCSVUrl(): string {
  return `${API_BASE}/audit-logs/export`;
}

export async function submitOverride(
  recommendationId: string,
  chosenOptionId: string,
  action: string,
  justification: string,
  notes?: string
): Promise<OverrideLogEntry> {
  const res = await fetch(`${API_BASE}/override`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify({
      recommendation_id: recommendationId,
      chosen_option_id: chosenOptionId,
      action,
      justification_reason: justification,
      custom_notes: notes,
      dispatcher_id: 'usr_disp_01'
    })
  });
  if (!res.ok) throw new Error(`Failed to log override: ${res.statusText}`);
  return res.json();
}

// ---------------- Settings ----------------
export async function fetchSettings(): Promise<SystemSettings> {
  const res = await fetch(`${API_BASE}/settings`, { headers: getAuthHeader() });
  if (!res.ok) throw new Error('Failed to fetch settings');
  return res.json();
}

export async function updateSettings(settings: SystemSettings): Promise<SystemSettings> {
  const res = await fetch(`${API_BASE}/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify(settings)
  });
  if (!res.ok) throw new Error('Failed to update settings');
  return res.json();
}

// ---------------- Evaluation & Replan ----------------
export async function runOptimizationReplan(
  safetyWeight: number = 0.5,
  cautionFactor: number = 1.0,
  equityEnforced: boolean = true
): Promise<OptimizationPlanResponse> {
  const res = await fetch(`${API_BASE}/replan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify({
      safety_weight: safetyWeight,
      caution_factor: cautionFactor,
      equity_enforced: equityEnforced
    })
  });
  if (!res.ok) throw new Error(`Replan failed: ${res.statusText}`);
  return res.json();
}

export async function fetchEvaluationReport(numSeeds: number = 30): Promise<any> {
  const res = await fetch(`${API_BASE}/evaluation?num_seeds=${numSeeds}`, { headers: getAuthHeader() });
  if (!res.ok) throw new Error('Failed to fetch evaluation report');
  return res.json();
}
