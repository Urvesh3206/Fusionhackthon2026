export type UserRole = "citizen" | "doctor" | "admin" | "emergency_coordinator" | "dispatcher" | "medical_coordinator" | "analyst";

export interface User {
  id: string;
  username: string;
  full_name: string;
  role: UserRole;
  organization: string;
  email: string;
  permissions: string[];
  is_active: boolean;
}

export interface RoadEdge {
  id: string;
  name: string;
  source_node: string;
  target_node: string;
  length_m: number;
  speed_kmh: number;
  base_travel_time_sec: number;
  elevation_m: number;
  river_distance_m: number;
  failure_prob: number;
  is_closed: boolean;
  closure_reason: string | null;
  geometry: [number, number][];
  simulated: boolean;
  data_age_sec: number;
}

export interface Hospital {
  id: string;
  name: string;
  facility_type?: string;
  specialties: string[];
  total_beds: number;
  usable_beds: number;
  occupied_beds: number;
  free_icu_beds: number;
  has_power: boolean;
  has_comms: boolean;
  derated_capacity_ratio: number;
  status_reason: string;
  location: [number, number];
  simulated: boolean;
  data_age_sec: number;
}

export interface Ambulance {
  id: string;
  callsign: string;
  unit_type: string;
  status: string;
  station_id: string;
  station_name?: string;
  location: [number, number];
  assigned_call_id: string | null;
  target_destination: [number, number] | null;
  route_polyline?: [number, number][];
  capabilities?: string[];
  simulated: boolean;
  data_age_sec: number;
}

export interface Shelter {
  id: string;
  name: string;
  shelter_type?: string;
  capacity: number;
  current_occupancy: number;
  location: [number, number];
  is_accessible: boolean;
  elevation_m?: number;
  simulated: boolean;
}

export interface TemporaryResource {
  id: string;
  name: string;
  resource_type: string;
  location: [number, number];
  capacity: number;
  status: string;
  target_demographic: string;
  simulated: boolean;
}

export interface EmergencyCall {
  id: string;
  timestamp: string;
  priority: string;
  patient_condition: string;
  required_specialty: string;
  location: [number, number];
  district_zone: string;
  status: string;
  assigned_ambulance_id?: string;
  assigned_hospital_id?: string;
  simulated: boolean;
}

export interface RiskGridCell {
  id: string;
  lon: number;
  lat: number;
  hazard_flood: number;
  hazard_cyclone: number;
  hazard_heat: number;
  combined_hazard: number;
  population: number;
  elderly_population: number;
  vulnerability_score: number;
  combined_risk: number;
}

export interface HazardForecast {
  scenario_id: string;
  step_id: string;
  hazard_type: string;
  cone_polygon?: [number, number][];
  wind_speed_kmh: number;
  rain_rate_mmh: number;
  river_discharge_m3s: number;
  apparent_temp_c: number;
  wet_bulb_temp_c: number;
  summary_text: string;
}

export interface FullSystemState {
  scenario_id: string;
  active_step_id: string;
  step_index: number;
  total_steps: number;
  simulation_time_label: string;
  forecast: HazardForecast;
  road_edges: RoadEdge[];
  hospitals: Hospital[];
  ambulances: Ambulance[];
  shelters: Shelter[];
  temporary_resources: TemporaryResource[];
  emergency_calls: EmergencyCall[];
  risk_grid: RiskGridCell[];
  staged_stations: Array<{ id: string; name: string; location: [number, number]; assigned_units: number }>;
  active_road_closures: string[];
  system_metrics: {
    total_ambulances: number;
    available_ambulances: number;
    total_hospital_beds: number;
    free_icu_beds: number;
    derated_hospitals_count: number;
    closed_edges_count: number;
    pending_calls_count: number;
  };
  offline_mode: boolean;
  last_updated: string;
}

export interface CandidateOption {
  option_id: string;
  label: string;
  eta_min: number;
  capacity_available: number;
  icu_available: number;
  specialty_match: boolean;
  risk_score: number;
  data_age_sec: number;
  score: number;
  details: Record<string, any>;
}

export interface Recommendation {
  id: string;
  call_id?: string;
  recommendation_type: string;
  title: string;
  choice: CandidateOption;
  runner_up?: CandidateOption;
  reasons: string[];
  counterfactual_explanation: string;
  data_age_sec: number;
  assumptions: string[];
  status: string;
  created_at: string;
}

export interface AmbulanceStagingRecommendation {
  station_id: string;
  station_name: string;
  location: [number, number];
  allocated_ambulances: number;
  change_delta: number;
  coverage_pop_served: number;
  reasons: string[];
  runner_up_station?: string;
  counterfactual: string;
}

export interface OptimizationPlanResponse {
  timestamp: string;
  scenario_id: string;
  step_id: string;
  recommendations: Recommendation[];
  ambulance_staging: AmbulanceStagingRecommendation[];
  evacuation_routes: any[];
  temporary_resource_placements: any[];
  equity_metrics: Record<string, any>;
  efficiency_metrics: Record<string, any>;
  computation_time_ms: number;
}

export interface OverrideLogEntry {
  id: string;
  recommendation_id: string;
  recommendation_type: string;
  timestamp: string;
  dispatcher_id: string;
  action: string;
  system_recommended_id: string;
  dispatcher_chosen_id: string;
  justification_reason: string;
  custom_notes?: string;
}

export interface HazardRecord {
  id: string;
  hazard_type: string;
  title: string;
  severity: string;
  risk_score: number;
  affected_area_name: string;
  coordinates_center: [number, number];
  observation_time: string;
  forecast_time: string;
  source: string;
  confidence: number;
  last_updated: string;
  verification_status: string;
  expiration_time: string;
  metrics: Record<string, any>;
  simulated: boolean;
}

export interface HazardRefreshResponse {
  timestamp: string;
  status: string;
  source: string;
  records_count: number;
  data_freshness_sec: number;
  is_cached: boolean;
  live_hazards: HazardRecord[];
}

export interface RiskScoreBreakdown {
  hazard_severity: number;
  population_exposure: number;
  vulnerability_index: number;
  infrastructure_criticality: number;
  final_risk_score: number;
  formula_explanation: string;
  weights_applied: Record<string, number>;
}

export interface TriangulationNode {
  node_id: string;
  node_name: string;
  node_type: 'HOSPITAL_TOWER' | 'AMBULANCE_MOBILE_DF' | 'SHELTER_RELAY';
  location: [number, number];
  bearing_deg: number;
  rssi_dbm: number;
  distance_estimate_m: number;
  signal_quality_pct: number;
}

export interface RadioSOSBeacon {
  id: string;
  beacon_code: string;
  frequency_mhz: number;
  channel_name: string;
  modulation: 'AFSK_1200' | 'LORA_CHIRP' | 'VHF_FM' | 'CW_MORSE';
  timestamp: string;
  sender_name: string;
  sender_role: string;
  location: [number, number];
  estimated_accuracy_m: number;
  rssi_dbm: number;
  snr_db: number;
  battery_level_pct: number;
  priority: 'CRITICAL_RED' | 'URGENT_YELLOW' | 'STANDARD_GREEN';
  emergency_type: 'FLOOD_TRAPPED' | 'MEDICAL_TRAUMA' | 'POWER_GRID_OUTAGE' | 'STRUCTURE_COLLAPSE';
  status: 'BROADCASTING' | 'TRIANGULATING' | 'AMBULANCE_DISPATCHED' | 'RESCUED';
  triangulation_nodes: TriangulationNode[];
  assumed_location: [number, number];
  triangulation_confidence_pct: number;
  assigned_ambulance_id?: string;
  notes?: string;
}

export interface MedicalResourceItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  location_name: string;
  coordinates: [number, number];
  available_quantity: number;
  allocated_quantity: number;
  status: string;
  last_updated: string;
  data_source: string;
  simulated: boolean;
}

export interface ClinicCandidate {
  site_id: string;
  site_name: string;
  coordinates: [number, number];
  elevation_m: number;
  flood_hazard_score: number;
  population_density_score: number;
  accessibility_score: number;
  nearest_hospital_dist_km: number;
  suitability_score: number;
  recommended_resource_type: string;
  capacity: number;
  reasoning: string[];
  is_safe: boolean;
}

export interface EvacuationPlanResponse {
  timestamp: string;
  total_zones: number;
  total_at_risk_population: number;
  assigned_population: number;
  unassigned_population: number;
  shelter_utilization: Array<{
    shelter_id: string;
    name: string;
    total_capacity: number;
    assigned_population: number;
    final_occupancy: number;
    utilization_pct: number;
    is_accessible: boolean;
  }>;
  zone_assignments: Array<{
    zone_id: string;
    zone_name: string;
    total_population: number;
    evacuated_population: number;
    assigned_shelter_id: string | null;
    assigned_shelter_name: string;
    status: string;
    transit_time_min: number;
    safe_evac_route: [number, number][];
    notes: string;
  }>;
  assumptions_and_limitations: string[];
  is_feasible: boolean;
}

export interface DemandForecastPoint {
  horizon_min: number;
  zone_id: string;
  zone_name: string;
  predicted_call_rate: number;
  lower_bound_95ci: number;
  upper_bound_95ci: number;
  key_drivers: string[];
  model_type: string;
  uncertainty_level: string;
}

export interface AlertRecord {
  id: string;
  title: string;
  severity: "Critical" | "High" | "Medium" | "Low" | "Info";
  category: string;
  message: string;
  location_name?: string;
  coordinates?: [number, number];
  created_at: string;
  is_acknowledged: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
  source: string;
}

export interface AuditLogEntryModel {
  id: string;
  timestamp: string;
  actor_id: string;
  actor_name: string;
  actor_role: string;
  action_type: string;
  entity_id: string;
  entity_type: string;
  details: Record<string, any>;
  justification?: string;
  system_recommendation?: string;
  chosen_action?: string;
}

export interface SystemSettings {
  region_name: string;
  target_response_time_min: number;
  safety_weight: number;
  caution_factor: number;
  route_block_threshold: number;
  evac_block_threshold: number;
  refresh_interval_sec: number;
  forecast_horizon_min: number;
  auto_dispatch_ai: boolean;
  offline_demo_mode: boolean;
  weights: Record<string, number>;
}
