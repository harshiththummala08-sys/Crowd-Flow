from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.schemas import EmergencyRequest, ExperimentRequest, ModeRequest, TrafficAdjustment
from app.state import engine

app = FastAPI(title="CrowdFlow API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"name": "CrowdFlow", "status": "SYSTEM ONLINE"}


@app.get("/api/network")
def network():
    return engine.state()


@app.get("/api/traffic")
def traffic():
    return {"roads": engine.state().roads}


@app.get("/api/intersections")
def intersections():
    return {"intersections": engine.state().intersections}


@app.get("/api/signals")
def signals():
    return {road.road_id: road.signal_state for road in engine.state().roads}


@app.get("/api/metrics")
def metrics():
    return engine.state().metrics


@app.get("/api/predictions")
def predictions():
    state = engine.state()
    return {"source": state.status.prediction_source, "predictions": {r.road_id: r.predicted_vehicle_count for r in state.roads}}


@app.get("/api/decisions")
def decisions():
    return {"decisions": engine.state().decisions}


@app.get("/api/explainability/{road_id}")
def explainability(road_id: str):
    for decision in engine.state().decisions:
        if decision.road_id == road_id:
            return decision
    raise HTTPException(status_code=404, detail="Road not found")


@app.get("/api/comparison")
def comparison():
    return engine.run_experiment(duration_ticks=30, scenario="rush_hour")


@app.get("/api/simulation/status")
def simulation_status():
    return engine.state().status


@app.post("/api/simulation/start")
def start():
    engine.running = True
    return engine.state()


@app.post("/api/simulation/stop")
def stop():
    engine.running = False
    return engine.state()


@app.post("/api/simulation/reset")
def reset():
    engine.reset()
    return engine.state()


@app.post("/api/simulation/tick")
def tick():
    return engine.tick()


@app.post("/api/simulation/traffic")
def adjust_traffic(request: TrafficAdjustment):
    if request.road_id not in engine.roads:
        raise HTTPException(status_code=404, detail="Road not found")
    engine.adjust_traffic(request.road_id, request.delta)
    return engine.state()


@app.post("/api/simulation/mode")
def set_mode(request: ModeRequest):
    engine.set_mode(request.mode)
    return engine.state()


@app.post("/api/emergency")
def emergency(request: EmergencyRequest):
    if request.road_id not in engine.roads:
        raise HTTPException(status_code=404, detail="Road not found")
    engine.trigger_emergency(request.road_id)
    return engine.state()


@app.post("/api/optimization/run")
def optimize():
    engine._recalculate()
    return {"selected_road": engine.selected_road, "decisions": engine.state().decisions}


@app.post("/api/experiments/run")
def run_experiment(request: ExperimentRequest):
    return engine.run_experiment(request.duration_ticks, request.scenario)


@app.post("/api/vision/image")
def vision_image():
    return {
        "status": "fallback",
        "message": "Vision model unavailable in the lightweight prototype. Demo mode estimates density from uploaded scenes.",
        "counts": {"car": 0, "bus": 0, "truck": 0, "motorcycle": 0},
    }


@app.post("/api/vision/video")
def vision_video():
    return {
        "status": "fallback",
        "message": "Video tracking is optional for Round 3 and is exposed as a safe fallback endpoint.",
        "trend": [],
    }

