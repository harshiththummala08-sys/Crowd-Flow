from app.schemas import Road

WEIGHTS = {
    "density": 0.30,
    "queue": 0.25,
    "waiting": 0.20,
    "speed": 0.15,
    "prediction": 0.10,
}


def clamp(value: float, low: float = 0, high: float = 1) -> float:
    return max(low, min(high, value))


def classify(score: float) -> str:
    if score < 0.30:
        return "LOW"
    if score < 0.60:
        return "MEDIUM"
    return "HIGH"


def calculate_congestion(road: Road) -> float:
    density = clamp(road.vehicle_count / road.capacity)
    queue = clamp(road.queue_length / max(road.capacity * 0.45, 1))
    waiting = clamp(road.waiting_time / 150)
    speed_factor = clamp(1 - road.average_speed / 50)
    prediction = clamp(road.predicted_vehicle_count / road.capacity)
    return clamp(
        WEIGHTS["density"] * density
        + WEIGHTS["queue"] * queue
        + WEIGHTS["waiting"] * waiting
        + WEIGHTS["speed"] * speed_factor
        + WEIGHTS["prediction"] * prediction
    )


def update_congestion(road: Road) -> Road:
    road.congestion_score = round(calculate_congestion(road), 3)
    road.congestion_level = classify(road.congestion_score)
    return road

