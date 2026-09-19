import copy
import json
import time
from pathlib import Path

from app.config import settings
from app.emergency.controller import EmergencyController
from app.intelligence.congestion import update_congestion
from app.intelligence.explainability import build_decision
from app.intelligence.optimizer import apply_signal_plan, choose_green_road
from app.intelligence.prediction import BaselinePredictor
from app.intelligence.priority import priority_score
from app.metrics.evaluator import evaluate
from app.network import attach_roads, build_intersections, build_roads
from app.schemas import Decision, Mode, NetworkState, Road, SimulationStatus
from app.simulation.mock import MockSimulationProvider


class SimulationEngine:
    def __init__(self) -> None:
        self.predictor = BaselinePredictor()
        self.provider = MockSimulationProvider()
        self.emergency = EmergencyController()
        self.reset()

    def reset(self) -> None:
        self.roads: dict[str, Road] = build_roads()
        self.intersections = attach_roads(build_intersections(), self.roads)
        self.mode = Mode.ADAPTIVE
        self.running = False
        self.simulation_time = 0
        self.tick_index = 0
        self.throughput = 0.0
        self.selected_road = "R1"
        self.decisions: list[Decision] = []
        self.history: list[dict] = []
        self.last_wall_clock = time.time()
        self._auto_advancing = False
        self._recalculate()

    def _downstream_penalties(self) -> None:
        destination_scores = {}
        for road in self.roads.values():
            destination_scores.setdefault(road.destination_intersection, []).append(road.congestion_score)
        avg = {key: sum(values) / len(values) for key, values in destination_scores.items()}
        for road in self.roads.values():
            road.downstream_penalty = round(max(0, avg.get(road.destination_intersection, 0) - 0.62) * 0.18, 3)

    def _recalculate(self) -> None:
        for road in self.roads.values():
            road.predicted_vehicle_count = self.predictor.predict(road)
            update_congestion(road)
        self._downstream_penalties()
        for road in self.roads.values():
            priority_score(road)
        self.selected_road = choose_green_road(self.roads, self.mode, self.tick_index)
        if not self.emergency.active_road_id:
            apply_signal_plan(self.roads, self.selected_road, self.mode)
        self.decisions = [build_decision(road, self.selected_road, self.mode) for road in self.roads.values()]

    def advance_if_running(self) -> None:
        if not self.running or self._auto_advancing:
            return
        now = time.time()
        elapsed_ticks = int((now - self.last_wall_clock) // settings.tick_seconds)
        if elapsed_ticks <= 0:
            return
        self._auto_advancing = True
        try:
            for _ in range(min(elapsed_ticks, 5)):
                self.tick()
        finally:
            self.last_wall_clock = now
            self._auto_advancing = False

    def tick(self) -> NetworkState:
        self.tick_index += 1
        self.simulation_time += settings.tick_seconds
        emergency_applied = self.emergency.apply(self.roads)
        self.throughput = self.provider.step(self.roads, self.tick_index)
        self._recalculate()
        if emergency_applied:
            self.emergency.apply(self.roads)
            self.decisions = [build_decision(road, self.emergency.active_road_id or self.selected_road, self.mode) for road in self.roads.values()]
        metrics = self.metrics()
        self.history.append({"time": self.simulation_time, **metrics.model_dump()})
        self.history = self.history[-80:]
        return self.state()

    def metrics(self):
        emergency_status = "ACTIVE" if self.emergency.active_road_id else "CLEAR"
        return evaluate(self.roads, self.throughput, emergency_status)

    def set_mode(self, mode: Mode) -> None:
        self.mode = mode
        self._recalculate()

    def adjust_traffic(self, road_id: str, delta: int) -> None:
        road = self.roads[road_id]
        road.vehicle_count = max(0, min(road.capacity * 1.35, road.vehicle_count + delta))
        road.queue_length = max(0, min(road.capacity, road.queue_length + max(delta * 0.45, delta * 0.15)))
        road.waiting_time = max(0, min(220, road.waiting_time + max(delta, 0) * 0.8))
        road.average_speed = max(4, min(50, road.average_speed - max(delta, 0) * 0.22))
        self._recalculate()

    def trigger_emergency(self, road_id: str) -> None:
        self.emergency.trigger(road_id)
        self.running = True
        self.last_wall_clock = time.time()

    def state(self) -> NetworkState:
        self.advance_if_running()
        status = SimulationStatus(
            running=self.running,
            mode=self.mode,
            simulation_time=self.simulation_time,
            prediction_source=self.predictor.source,
            provider=settings.simulation_provider,
        )
        return NetworkState(
            roads=list(self.roads.values()),
            intersections=list(self.intersections.values()),
            metrics=self.metrics(),
            decisions=self.decisions,
            status=status,
            history=self.history,
            emergency_route=self.emergency.route,
        )

    def clone_for_experiment(self, mode: Mode) -> "SimulationEngine":
        clone = SimulationEngine()
        clone.roads = copy.deepcopy(self.roads)
        clone.intersections = copy.deepcopy(self.intersections)
        clone.mode = mode
        clone.running = False
        clone.simulation_time = 0
        clone.tick_index = 0
        clone._recalculate()
        return clone

    def run_experiment(self, duration_ticks: int, scenario: str) -> dict:
        baseline_roads = copy.deepcopy(self.roads)
        if scenario == "rush_hour":
            for road_id in ["R2", "R6", "R10"]:
                baseline_roads[road_id].vehicle_count += 18
                baseline_roads[road_id].queue_length += 12
                baseline_roads[road_id].waiting_time += 30
        results = {}
        for mode in [Mode.FIXED, Mode.ADAPTIVE]:
            runner = SimulationEngine()
            runner.roads = copy.deepcopy(baseline_roads)
            runner.mode = mode
            runner._recalculate()
            for _ in range(duration_ticks):
                runner.tick()
            results[mode.value] = runner.metrics().model_dump()
        comparison = {
            "scenario": scenario,
            "duration_ticks": duration_ticks,
            "fixed": results["FIXED"],
            "adaptive": results["ADAPTIVE"],
        }
        Path("results").mkdir(exist_ok=True)
        Path("results/latest_experiment.json").write_text(json.dumps(comparison, indent=2), encoding="utf-8")
        return comparison


engine = SimulationEngine()
