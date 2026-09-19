from app.emergency.controller import EmergencyController
from app.intelligence.congestion import calculate_congestion
from app.intelligence.optimizer import recommended_green
from app.intelligence.priority import priority_score
from app.network import build_roads
from app.schemas import SignalState


def test_congestion_increases_with_queue():
    roads = build_roads()
    low = roads["R1"]
    high = roads["R2"]
    high.vehicle_count = 80
    high.queue_length = 45
    high.waiting_time = 120
    high.average_speed = 8
    high.predicted_vehicle_count = 95
    assert calculate_congestion(high) > calculate_congestion(low)


def test_green_time_grows_with_priority():
    assert recommended_green(0.15) < recommended_green(0.85)
    assert 10 <= recommended_green(0.0) <= 60
    assert 10 <= recommended_green(1.0) <= 60


def test_fairness_raises_priority_when_waiting_threshold_exceeded():
    road = build_roads()["R3"]
    road.congestion_score = 0.5
    road.predicted_vehicle_count = 40
    road.waiting_time = 140
    priority_score(road)
    assert road.fairness_active is True
    assert road.priority_components["fairness"] > 0


def test_emergency_state_machine_uses_safe_transition():
    roads = build_roads()
    roads["R1"].signal_state = SignalState.GREEN
    controller = EmergencyController()
    controller.trigger("R4")
    controller.apply(roads)
    assert any(road.signal_state == SignalState.YELLOW for road in roads.values())
    controller.apply(roads)
    controller.apply(roads)
    assert all(road.signal_state == SignalState.ALL_RED for road in roads.values())
    controller.apply(roads)
    controller.apply(roads)
    assert roads["R4"].signal_state == SignalState.EMERGENCY_GREEN

