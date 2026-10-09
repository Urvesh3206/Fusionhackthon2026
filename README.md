# ResQGrid AI — Climate-Aware Emergency Response Network

> **Organization:** International Federation of Red Cross and Red Crescent Societies (IFRC)  
> **Region of Deployment:** Puri District, Odisha, India (Coastal Cyclone, Storm Surge, and Extreme Heat Risk Zone)  
> **Version:** 2.0.0

---

## 1. System Overview

**ResQGrid AI** is an explainable, hazard-aware humanitarian emergency-response and dispatch optimization platform. During severe climate disasters (tropical cyclones, flash flooding, river crest surges, and extreme heatwaves), emergency response networks face compound failures: road infrastructure submerges at variable arrival times, hospital power grids trip, intensive care units overfill, and emergency demand surges unpredictably.

ResQGrid AI continuously ingests meteorological telemetry (Open-Meteo, GloFAS river gauges, GDACS tracks) and HMIS hospital telemetry to dynamically optimize:
1. **Hazard-Aware Emergency Vehicle Routing:** Evaluates road edge failure probabilities at the vehicle's arrival time, bypassing flooded bridges and fallen debris.
2. **Predictive Ambulance Staging (MEXCLP):** Solves the Maximum Expected Coverage Location Problem to reposition vehicles before anticipated surge.
3. **Cascading Derated Hospital Matching:** Penalizes hospitals experiencing electrical outages or ICU shortages, providing counterfactual explanations for dispatch decisions.
4. **MCLP Medical Resource & Temporary Clinic Placement:** Determines high-elevation sites for inflatable clinics and cooling centers without over-allocation.
5. **Capacity-Constrained Evacuation Planning:** Allocates civilian populations to designated cyclone shelters while keeping routes under strict safety risk thresholds (< 0.20).
6. **Poisson Demand Forecasting:** Forecasts zone emergency call rate across 15, 30, and 60-minute horizons with 95% confidence intervals.

---

## 2. Architecture & Technology Stack

```
                                  ┌───────────────────────────────┐
                                  │   Open-Meteo / GDACS / HMIS   │
                                  └───────────────┬───────────────┘
                                                  │ (Live / Caching)
                                                  ▼
┌──────────────────────────────┐        ┌───────────────────────────────┐
│     ResQGrid React Client    │◄──────►│       FastAPI Backend         │
│  - React 18 & TypeScript     │  REST  │  - Python 3.11+ / Uvicorn     │
│  - React Router (16 routes)  │  & WS  │  - Pydantic v2 & NetworkX     │
│  - Leaflet & React Leaflet   │        │  - PuLP / OR-Tools MIP Solver │
│  - Tailwind CSS & Recharts   │        │  - Scipy & NumPy Analytics    │
└──────────────────────────────┘        └───────────────────────────────┘
```

### Frontend
- **Framework:** React 18, TypeScript (Strict Type Checking), Vite
- **Styling:** Tailwind CSS, JetBrains Mono & Plus Jakarta Sans typography
- **Mapping:** Leaflet & React-Leaflet with CARTO DarkMatter basemaps and custom SVG markers
- **Charts:** Recharts (Area, Bar, Multi-series trends)
- **Routing:** React Router v6 with 16 dedicated operational pages
- **State Management:** Zustand with WebSocket live streaming

### Backend
- **Framework:** FastAPI, Uvicorn, Pydantic v2, HTTPX
- **Optimization:** NetworkX (Time-Dependent Dijkstra / A*), PuLP (Linear Programming for MEXCLP & MCLP)
- **Testing:** Pytest (14 passing algorithmic and integration test suites)
- **Security:** Token authentication with Role-Based Access Control (RBAC) & CSV formula injection sanitization

---

## 3. Implemented Pages & Routes

| Route | Page Name | Primary Operational Function |
|---|---|---|
| `/login` | Authentication Portal | Role switcher for Admin, Coordinator, Dispatcher, CMO, and Analyst |
| `/` or `/dashboard` | Operations Dashboard | Real-time KPIs, spatial telemetry map, response time trends & hospital load charts |
| `/map` | Live Disaster Map | Fullscreen tactical Leaflet map with layer toggles (Hazards, Fleet, Hospitals, Shelters, Closures) |
| `/hazards` | Hazard Intelligence | Cyclone cone polygon, river discharge gauges, rainfall rates, explainable risk formula |
| `/incidents` | Emergency Incidents | Incident triage table, priority filtering (Critical, High, Medium), CSV export, new call filing |
| `/dispatch` | Emergency Dispatch | 10-step dispatch solver, vehicle candidate rankings, ETA predictions, justification overrides |
| `/fleet` | Ambulance Fleet | ALS/BLS fleet telemetry, MEXCLP predictive staging recommendations & catchment population |
| `/hospitals` | Hospital Management | Bed occupancy meters, free ICU beds, cascading power trip simulator & status toggles |
| `/resources` | Medical Resources | Supply inventory tracking, MCLP temporary clinic ranking & inventory allocation modal |
| `/evacuation` | Evacuation Planning | Population-to-shelter matching, structural capacity limit enforcement, safe corridor routing |
| `/simulation` | Disaster Simulation | Deterministic timeline player (T-48h to T+6h), bridge washout injection, before/after metrics |
| `/analytics` | Analytics & Reports | 30-seed Monte Carlo benchmarks, Gini equity coefficient, Poisson demand forecasting |
| `/alerts` | Alert Center | Real-time notifications for critical hazards, road closures, and facility deratings |
| `/settings` | System Settings | SLA target sliders, routing safety vs speed weights, risk formula coefficient sliders |
| `/audit-logs` | Audit Logs | Tamper-evident ledger of dispatcher decisions, overrides, and resource allocations with CSV export |
| `*` | 404 Sector Unreachable | Helpful navigation fallback to operations console |

---

## 4. Key Optimization Algorithms

### A. Arrival-Time Road Failure Routing
Instead of judging road passability at the current instant $t_0$, ResQGrid computes:
$$P_{\text{fail}}(e, t) = f(\text{elevation}, \text{river\_dist}, \text{discharge}(t), \text{rain}(t))$$
Where $t = t_0 + \Delta t_{\text{travel}}$. Road edges exceeding threshold ($P_{\text{fail}} \ge 0.50$) at the arrival time are excluded from the Dijkstra shortest-path graph.

### B. Cascading Derated Hospital Scoring
$$C(h, c) = \text{ETA}(h) + \text{SpecPenalty} + \text{ICUPenalty} + \lambda_{\text{occ}} \left(\frac{\text{Occupied}}{\text{Usable}}\right)^2 + \text{PowerPenalty} + \text{StalePenalty}$$
- Automatically bypasses hospitals with 0 ICU beds or generator failure, even if geographically closer, providing plain-language counterfactual explanations to dispatchers.

### C. Maximum Expected Coverage Ambulance Staging (MEXCLP)
Maximizes expected population served within 15-minute response SLA given vehicle busy probability $q = 0.30$:
$$\max \sum_{i \in I} \sum_{k=1}^K w_i (1-q) q^{k-1} y_{ik}$$
Subject to minimum equity constraints ensuring rural districts receive at least 65% of the regional average coverage.

---

## 5. Getting Started & Running Locally

### Prerequisites
- Python 3.11+
- Node.js 18+ & npm

### Backend Setup
```bash
# 1. Navigate to backend
cd backend

# 2. Create and activate virtual environment
python -m venv venv
.\venv\Scripts\activate   # Windows
# source venv/bin/activate # Linux/Mac

# 3. Install requirements
pip install -r requirements.txt

# 4. Run backend server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend Setup
```bash
# 1. Navigate to frontend
cd frontend

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

### Running with Docker Compose
```bash
docker-compose up --build
```

---

## 6. Testing & Evaluation

### Run Backend Unit & Optimization Tests
```bash
.\backend\venv\Scripts\python -m pytest
```
*Result: 14 passing test suites (100% pass rate).*

### Run 30-Seed Monte Carlo Evaluation Benchmark
```bash
.\backend\venv\Scripts\python eval.py
```

### Build Production Bundle
```bash
cd frontend && npm run build
```
*Result: Clean compilation and minification (built in 21.5s).*

---

## 7. Security & Privacy

- **Formula Injection Prevention:** All CSV exports sanitize input cells prepended with `=`, `+`, `-`, or `@` by escaping with a single quote `'`.
- **Role-Based Access Control:** Pre-configured authorization for Administrators, Emergency Coordinators, Dispatchers, Chief Medical Officers, and Analysts.
- **Zero Secrets Committed:** Environment configuration separated into `.env.example`.
