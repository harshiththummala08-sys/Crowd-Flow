from app.config import settings
from app.schemas import Mode, Road, SignalState


def recommended_green(priority: float) -> int:
    span = settings.max_green - settings.min_green
    return round(settings.min_green + span * min(priority, 1))


def choose_green_road(roads: dict[str, Road], mode: Mode, tick: int) -> str:
    if mode == Mode.FIXED:
        road_ids = list(roads.keys())[:6]
        return road_ids[(tick // 10) % len(road_ids)]
    return max(roads.values(), key=lambda road: road.priority_score).road_id


def apply_signal_plan(roads: dict[str, Road], selected_road_id: str, mode: Mode) -> None:
    selected = roads[selected_road_id]
    for road in roads.values():
        road.green_time = 30 if mode == Mode.FIXED else recommended_green(road.priority_score)
        road.signal_state = SignalState.GREEN if road.road_id == selected_road_id else SignalState.RED
    selected.green_time = 30 if mode == Mode.FIXED else recommended_green(selected.priority_score)

