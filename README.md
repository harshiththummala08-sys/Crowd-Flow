# CrowdFlow

**CrowdFlow — AI-Powered Adaptive Traffic Network Optimizer**  
Smarter Traffic. Faster Movement. Adaptive Signals.

CrowdFlow is a software-only hackathon prototype that simulates a connected traffic network and continuously runs:

Traffic State -> Congestion Analysis -> Traffic Prediction -> Priority Calculation -> Fairness Check -> Emergency Check -> Network Coordination -> Dynamic Green-Time Allocation -> Signal Transition -> Updated Traffic -> Metrics -> Explainable Decision -> Dashboard.

## Problem

Fixed signal timing struggles when traffic demand changes, one junction can starve another, and emergency routes need safe priority transitions. CrowdFlow demonstrates how adaptive signal timing, explainability, fairness, and emergency-aware control can be shown in a reliable prototype without needing physical sensors.

## Solution

The app includes a deterministic mock simulator, FastAPI backend, adaptive optimization loop, and React command center. It shows small vehicles moving through a six-intersection network, queues building at red lights, congestion states changing, adaptive green-time decisions, fairness activation, emergency transition, and fixed-vs-adaptive simulation results.

## Features

- 6 intersections and 12 connected roads
- Coherent mock traffic simulation
- Congestion scoring with configurable weights
- Baseline traffic prediction
- Priority scoring with fairness and downstream congestion penalty
- Dynamic green-time allocation
- Safe emergency transition: GREEN -> YELLOW -> ALL_RED -> EMERGENCY_GREEN
- Live dashboard with animated vehicles, queues, signal colors, and emergency route glow
- What-If traffic controls
- Fixed vs CrowdFlow Adaptive experiment runner
- Explainability panel powered by actual road state
- Traffic vision fallback endpoints clearly labeled as optional

## Architecture

```text
backend/app/
  main.py                 FastAPI endpoints
  state.py                Simulation engine and experiment runner
  network.py              Six-intersection road graph
  simulation/mock.py      Coherent traffic dynamics
  intelligence/           Congestion, prediction, priority, optimizer, explainability
  emergency/controller.py Signal safety state machine
  metrics/evaluator.py    Generated prototype metrics
frontend/src/
  App.jsx                 Command center shell
  components/             Network map, panels, charts, animated metrics
  hooks/useCrowdFlow.js   Live polling and actions
  services/api.js         Backend client
```

## Technology Stack

Frontend: React, Vite, Framer Motion, Lucide React, Recharts, Tailwind dependency included for styling compatibility.  
Backend: Python, FastAPI, Pydantic, Uvicorn.  
Data / ML: NumPy, pandas, scikit-learn dependencies included; baseline predictor is active by default.  
Simulation: Mock provider by default; SUMO adapter placeholder for later integration.

## Setup

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://127.0.0.1:5173`.

If port `8000` or `5173` is already in use, run the backend on another port and set the frontend API base:

```bash
cd backend
uvicorn app.main:app --reload --port 8001

cd frontend
$env:VITE_API_BASE="http://127.0.0.1:8001"
npm run dev -- --port 5174
```

## Run Tests

```bash
cd backend
pytest
```

## Dataset Preparation

No external data is required for the demo prototype.

```bash
python scripts/download_data.py
python scripts/prepare_data.py
```

Large raw datasets are intentionally excluded from Git. See `data/README.md` for source and license guidance.

## Demo Flow

1. Start backend and frontend.
2. Open the dashboard.
3. Click **Run Demo**.
4. The app starts fixed mode, increases R2 traffic, switches to adaptive mode, activates fairness pressure, triggers emergency R4, animates the safe transition, and runs a fixed-vs-adaptive experiment.
5. Click any road to inspect the live explainability panel.

## Simulation Methodology

Vehicle arrivals follow deterministic semi-periodic demand. Red lights increase queues and waiting time, green lights clear queues and improve speed, yellow slows flow, and emergency priority uses a safe state machine. Metrics are generated from the current simulated road states.

## Results Methodology

The experiment runner copies one rush-hour scenario, runs it in FIXED mode, then runs the same initial scenario in ADAPTIVE mode. Results are saved to `results/latest_experiment.json` and displayed as simulation results.

## Known Limitations

- This is a prototype simulation, not a real-world deployment.
- Prediction currently uses a baseline moving average rather than a trained ML model.
- Traffic vision endpoints return a clearly labeled fallback until a legal model/data path is configured.
- SUMO integration is represented by an adapter placeholder and can be implemented without changing the core API.

## Repository

GitHub: https://github.com/harshiththummala08-sys/Crowd-Flow
