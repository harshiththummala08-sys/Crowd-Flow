from app.config import settings
from app.schemas import Road


def fairness_bonus(road: Road) -> float:
    if road.waiting_time <= settings.max_waiting_threshold:
        road.fairness_active = False
        return 0
    road.fairness_active = True
    overage = road.waiting_time - settings.max_waiting_threshold
    return min(0.35, 0.12 + overage / 220)

