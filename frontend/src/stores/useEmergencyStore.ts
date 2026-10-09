import { create } from 'zustand';
import { FullSystemState, OptimizationPlanResponse, OverrideLogEntry, User, UserRole } from '../types';

export const DEMO_USER_PROFILES: Record<UserRole, User> = {
  admin: {
    id: "usr_admin_01",
    username: "admin",
    full_name: "Dr. Elena Vance (EOC Director)",
    role: "admin",
    organization: "IFRC - Odisha Disaster Response",
    email: "elena.vance@ifrc-odisha.org",
    permissions: ["*"],
    is_active: true
  },
  emergency_coordinator: {
    id: "usr_coord_01",
    username: "coordinator",
    full_name: "Rajesh Mohapatra (Disaster Coordinator)",
    role: "emergency_coordinator",
    organization: "IFRC - Odisha Disaster Response",
    email: "rajesh.m@ifrc-odisha.org",
    permissions: ["scenarios:control", "evacuation:manage", "resources:allocate", "alerts:manage"],
    is_active: true
  },
  dispatcher: {
    id: "usr_disp_01",
    username: "dispatcher",
    full_name: "Ananya Patnaik (Senior Dispatcher)",
    role: "dispatcher",
    organization: "108 Ambulance Dispatch Center",
    email: "ananya.p@108-dispatch.gov.in",
    permissions: ["incidents:write", "vehicles:dispatch", "overrides:create"],
    is_active: true
  },
  medical_coordinator: {
    id: "usr_med_01",
    username: "medical",
    full_name: "Dr. Subrat Mishra (Chief Medical Officer)",
    role: "medical_coordinator",
    organization: "Puri District Headquarters Hospital",
    email: "subrat.mishra@dhh-puri.gov.in",
    permissions: ["hospitals:update", "resources:manage", "triage:override"],
    is_active: true
  },
  analyst: {
    id: "usr_analyst_01",
    username: "analyst",
    full_name: "Kavita Das (Geospatial Analyst)",
    role: "analyst",
    organization: "IFRC Analytics Division",
    email: "kavita.das@ifrc-analytics.org",
    permissions: ["reports:read", "simulation:view", "analytics:export"],
    is_active: true
  }
};

interface EmergencyStore {
  currentUser: User;
  state: FullSystemState | null;
  plan: OptimizationPlanResponse | null;
  overrides: OverrideLogEntry[];
  isConnected: boolean;
  isLoading: boolean;
  activeScenarioId: string;
  activeStepIndex: number;
  safetySlider: number; // 0 (speed) to 1 (safety)
  cautionSlider: number; // 1.0 (optimistic) to 3.0 (pessimistic)
  equityEnforced: boolean;
  selectedEdgeId: string | null;
  selectedHospitalId: string | null;
  selectedAmbulanceId: string | null;
  selectedCallId: string | null;
  showEvalModal: boolean;
  showLogModal: boolean;
  showAssumptionsModal: boolean;
  showNotificationsDrawer: boolean;
  globalSearchQuery: string;
  
  // Actions
  setCurrentUser: (user: User) => void;
  switchRole: (role: UserRole) => void;
  setState: (state: FullSystemState) => void;
  setPlan: (plan: OptimizationPlanResponse) => void;
  setConnected: (connected: boolean) => void;
  setLoading: (loading: boolean) => void;
  setScenario: (scenarioId: string) => void;
  setStepIndex: (index: number) => void;
  setSafetySlider: (val: number) => void;
  setCautionSlider: (val: number) => void;
  setEquityEnforced: (enforced: boolean) => void;
  setSelectedEdge: (id: string | null) => void;
  setSelectedHospital: (id: string | null) => void;
  setSelectedAmbulance: (id: string | null) => void;
  setSelectedCall: (id: string | null) => void;
  setShowEvalModal: (show: boolean) => void;
  setShowLogModal: (show: boolean) => void;
  setShowAssumptionsModal: (show: boolean) => void;
  setShowNotificationsDrawer: (show: boolean) => void;
  setGlobalSearchQuery: (query: string) => void;
  addOverride: (entry: OverrideLogEntry) => void;
  setOverrides: (logs: OverrideLogEntry[]) => void;
}

export const DEFAULT_FALLBACK_STATE: FullSystemState = {
  scenario_id: 'cyclone_fani_puri',
  active_step_id: 'step_0',
  step_index: 0,
  total_steps: 5,
  simulation_time_label: 'T-48h Pre-Landfall Warning',
  forecast: {
    scenario_id: 'cyclone_fani_puri',
    step_id: 'step_0',
    hazard_type: 'cyclone',
    wind_speed_kmh: 125,
    rain_rate_mmh: 45,
    river_discharge_m3s: 920,
    apparent_temp_c: 34,
    wet_bulb_temp_c: 29,
    summary_text: 'Cyclone Fani Category-4 storm system tracking towards Puri District coastline.',
    cone_polygon: [
      [85.78, 19.75],
      [85.88, 19.78],
      [85.92, 19.88],
      [85.82, 19.92],
      [85.75, 19.84],
      [85.78, 19.75]
    ]
  },
  ambulances: [
    { id: 'amb_01', callsign: 'AMB-01 (ALS Emergency)', unit_type: 'ALS', status: 'Available', station_id: 'st_puri_north', location: [85.8150, 19.8350], assigned_call_id: null, target_destination: null, simulated: true, data_age_sec: 12 },
    { id: 'amb_02', callsign: 'AMB-02 (ALS Intensive)', unit_type: 'ALS', status: 'Available', station_id: 'st_puri_east', location: [85.8550, 19.8050], assigned_call_id: null, target_destination: null, simulated: true, data_age_sec: 8 },
    { id: 'amb_03', callsign: 'AMB-03 (BLS Rapid)', unit_type: 'BLS', status: 'Available', station_id: 'st_puri_southwest', location: [85.7600, 19.7900], assigned_call_id: null, target_destination: null, simulated: true, data_age_sec: 15 },
    { id: 'amb_04', callsign: 'AMB-04 (ALS Trauma)', unit_type: 'ALS', status: 'Dispatched', station_id: 'st_brahmagiri', location: [85.6950, 19.8150], assigned_call_id: null, target_destination: null, simulated: true, data_age_sec: 5 },
    { id: 'amb_05', callsign: 'AMB-05 (BLS Transport)', unit_type: 'BLS', status: 'Available', station_id: 'st_konark', location: [86.0350, 19.9100], assigned_call_id: null, target_destination: null, simulated: true, data_age_sec: 20 },
    { id: 'amb_06', callsign: 'AMB-06 (ALS Critical)', unit_type: 'ALS', status: 'Available', station_id: 'st_nh316_staging', location: [85.8200, 19.9200], assigned_call_id: null, target_destination: null, simulated: true, data_age_sec: 10 },
  ],
  hospitals: [
    { id: 'hosp_dhh_puri', name: 'Puri District Headquarters Hospital (DHH)', specialties: ['Trauma', 'ICU', 'Pediatric', 'Infectious'], total_beds: 350, usable_beds: 310, occupied_beds: 240, free_icu_beds: 14, has_power: true, has_comms: true, derated_capacity_ratio: 1.0, status_reason: 'Operating under normal multi-specialty capacity', location: [85.8315, 19.8180], simulated: true, data_age_sec: 10 },
    { id: 'hosp_coastal_id', name: 'Coastal Infectious Disease Hospital', specialties: ['Infectious', 'General Medicine', 'Trauma'], total_beds: 140, usable_beds: 120, occupied_beds: 88, free_icu_beds: 6, has_power: true, has_comms: true, derated_capacity_ratio: 1.0, status_reason: 'East Coastal Sector Active', location: [85.8750, 19.8280], simulated: true, data_age_sec: 15 },
    { id: 'hosp_chc_brahmagiri', name: 'Community Health Centre Brahmagiri', specialties: ['Emergency Triage', 'Maternity', 'General'], total_beds: 80, usable_beds: 70, occupied_beds: 48, free_icu_beds: 3, has_power: true, has_comms: true, derated_capacity_ratio: 1.0, status_reason: 'West Sector Hub Operational', location: [85.6800, 19.8020], simulated: true, data_age_sec: 12 },
    { id: 'hosp_chc_gop', name: 'Community Health Centre Gop', specialties: ['Emergency Triage', 'General Medicine', 'Pediatric'], total_beds: 90, usable_beds: 80, occupied_beds: 54, free_icu_beds: 4, has_power: true, has_comms: true, derated_capacity_ratio: 1.0, status_reason: 'North-East Sector Active', location: [86.0050, 19.9950], simulated: true, data_age_sec: 8 },
    { id: 'hosp_konark_trauma', name: 'Konark Emergency & Trauma Care Center', specialties: ['Trauma', 'Emergency Surgery'], total_beds: 110, usable_beds: 95, occupied_beds: 62, free_icu_beds: 5, has_power: true, has_comms: true, derated_capacity_ratio: 1.0, status_reason: 'Sun Coast Emergency Hub Ready', location: [86.0950, 19.8850], simulated: true, data_age_sec: 14 },
    { id: 'hosp_pipili_regional', name: 'Pipili Regional Trauma Hospital', specialties: ['Trauma', 'ICU', 'Cardiology'], total_beds: 160, usable_beds: 140, occupied_beds: 96, free_icu_beds: 7, has_power: true, has_comms: true, derated_capacity_ratio: 1.0, status_reason: 'Northern Highway Corridor Stationed', location: [85.8350, 20.0800], simulated: true, data_age_sec: 9 },
  ],
  emergency_calls: [
    { id: 'call_101', timestamp: new Date().toISOString(), priority: 'P1 - Critical', patient_condition: 'Crush Injury & Severe Respiratory Distress', required_specialty: 'Trauma', location: [85.8020, 19.8120], district_zone: 'Puri West Sector', status: 'Pending', simulated: true },
    { id: 'call_102', timestamp: new Date().toISOString(), priority: 'P2 - Urgent', patient_condition: 'Compound Fracture / Flood Debris', required_specialty: 'Orthopedics', location: [85.8850, 19.8400], district_zone: 'Baliguali Junction', status: 'Pending', simulated: true },
    { id: 'call_103', timestamp: new Date().toISOString(), priority: 'P1 - Critical', patient_condition: 'Cardiac Arrest / Inundated Building', required_specialty: 'ICU', location: [85.7400, 19.7950], district_zone: 'South Coast Corridor', status: 'Pending', simulated: true },
  ],
  shelters: [
    { id: 'shelter_puri_town', name: 'Swargadwar Cyclone Multipurpose Shelter', capacity: 1500, current_occupancy: 920, location: [85.8180, 19.7950], is_accessible: true, simulated: true },
    { id: 'shelter_brahmagiri', name: 'Brahmagiri High School Disaster Center', capacity: 800, current_occupancy: 450, location: [85.6400, 19.8030], is_accessible: true, simulated: true },
    { id: 'shelter_konark', name: 'Konark Coastal Cyclone Relief Hub', capacity: 1200, current_occupancy: 610, location: [86.0920, 19.8850], is_accessible: true, simulated: true },
  ],
  temporary_resources: [],
  road_edges: [
    { id: 'edge_nh316_puri', name: 'NH-316 Puri Bypass Arterial', source_node: 'n_nh316_1', target_node: 'n_nh316_2', length_m: 4800, speed_kmh: 45, base_travel_time_sec: 384, elevation_m: 4.5, river_distance_m: 1200, failure_prob: 0.12, is_closed: false, closure_reason: null, geometry: [[85.8200, 19.8100], [85.8300, 19.8150], [85.8450, 19.8250]], simulated: true, data_age_sec: 5 },
    { id: 'edge_grand_road', name: 'Grand Road Bada Danda Corridor', source_node: 'n_grand_1', target_node: 'n_grand_2', length_m: 2400, speed_kmh: 30, base_travel_time_sec: 288, elevation_m: 5.2, river_distance_m: 2400, failure_prob: 0.08, is_closed: false, closure_reason: null, geometry: [[85.8310, 19.8050], [85.8315, 19.8150], [85.8320, 19.8220]], simulated: true, data_age_sec: 10 },
    { id: 'edge_marine_drive', name: 'Marine Drive Coastal Causeway', source_node: 'n_marine_1', target_node: 'n_marine_2', length_m: 6200, speed_kmh: 10, base_travel_time_sec: 2232, elevation_m: 1.2, river_distance_m: 300, failure_prob: 0.78, is_closed: true, closure_reason: 'Sea surge breached coastal sea wall by +1.4m', geometry: [[85.8450, 19.7980], [85.8600, 19.8050], [85.8800, 19.8180]], simulated: true, data_age_sec: 3 },
  ],
  risk_grid: [],
  staged_stations: [
    { id: 'st_puri_central', name: 'Puri Central Station', location: [85.8312, 19.8135], assigned_units: 3 },
    { id: 'st_brahmagiri', name: 'Brahmagiri Outpost', location: [85.7500, 19.8000], assigned_units: 2 },
  ],
  active_road_closures: ['edge_marine_drive'],
  system_metrics: {
    total_ambulances: 6,
    available_ambulances: 5,
    total_hospital_beds: 560,
    free_icu_beds: 16,
    derated_hospitals_count: 0,
    closed_edges_count: 1,
    pending_calls_count: 3
  },
  offline_mode: false,
  last_updated: new Date().toISOString()
};

export const useEmergencyStore = create<EmergencyStore>((set) => ({
  currentUser: DEMO_USER_PROFILES.admin,
  state: DEFAULT_FALLBACK_STATE,
  plan: null,
  overrides: [],
  isConnected: true,
  isLoading: false,
  activeScenarioId: 'cyclone_fani_puri',
  activeStepIndex: 0,
  safetySlider: 0.5,
  cautionSlider: 1.0,
  equityEnforced: true,
  selectedEdgeId: null,
  selectedHospitalId: null,
  selectedAmbulanceId: null,
  selectedCallId: null,
  showEvalModal: false,
  showLogModal: false,
  showAssumptionsModal: false,
  showNotificationsDrawer: false,
  globalSearchQuery: '',

  setCurrentUser: (currentUser) => set({ currentUser }),
  switchRole: (role) => {
    const profile = DEMO_USER_PROFILES[role] || DEMO_USER_PROFILES.admin;
    localStorage.setItem('resqgrid_token', `token_${profile.username}`);
    set({ currentUser: profile });
  },
  setState: (state) => set({
    state,
    activeScenarioId: state.scenario_id,
    activeStepIndex: state.step_index
  }),
  setPlan: (plan) => set({ plan }),
  setConnected: (isConnected) => set({ isConnected }),
  setLoading: (isLoading) => set({ isLoading }),
  setScenario: (scenarioId) => set({ activeScenarioId: scenarioId }),
  setStepIndex: (index) => set({ activeStepIndex: index }),
  setSafetySlider: (safetySlider) => set({ safetySlider }),
  setCautionSlider: (cautionSlider) => set({ cautionSlider }),
  setEquityEnforced: (equityEnforced) => set({ equityEnforced }),
  setSelectedEdge: (selectedEdgeId) => set({ selectedEdgeId }),
  setSelectedHospital: (selectedHospitalId) => set({ selectedHospitalId }),
  setSelectedAmbulance: (selectedAmbulanceId) => set({ selectedAmbulanceId }),
  setSelectedCall: (selectedCallId) => set({ selectedCallId }),
  setShowEvalModal: (showEvalModal) => set({ showEvalModal }),
  setShowLogModal: (showLogModal) => set({ showLogModal }),
  setShowAssumptionsModal: (showAssumptionsModal) => set({ showAssumptionsModal }),
  setShowNotificationsDrawer: (showNotificationsDrawer) => set({ showNotificationsDrawer }),
  setGlobalSearchQuery: (globalSearchQuery) => set({ globalSearchQuery }),
  addOverride: (entry) => set((s) => ({ overrides: [entry, ...s.overrides] })),
  setOverrides: (overrides) => set({ overrides })
}));
