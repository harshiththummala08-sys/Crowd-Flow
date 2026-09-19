from collections import defaultdict, deque

from app.schemas import Road


class BaselinePredictor:
    def __init__(self) -> None:
        self.history: dict[str, deque[float]] = defaultdict(lambda: deque(maxlen=8))
        self.source = "BASELINE"

    def predict(self, road: Road) -> float:
        values = self.history[road.road_id]
        values.append(road.vehicle_count)
        if not values:
            return road.vehicle_count
        alpha = 0.45
        estimate = values[0]
        for value in list(values)[1:]:
            estimate = alpha * value + (1 - alpha) * estimate
        trend = (values[-1] - values[0]) / max(len(values), 1)
        return round(max(0, estimate + trend * 2), 1)

