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

export const useEmergencyStore = create<EmergencyStore>((set) => ({
  currentUser: DEMO_USER_PROFILES.admin,
  state: null,
  plan: null,
  overrides: [],
  isConnected: false,
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
