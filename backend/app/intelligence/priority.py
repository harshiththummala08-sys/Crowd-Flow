from app.intelligence.fairness import fairness_bonus
from app.schemas import Road


def priority_score(road: Road) -> Road:
    waiting_component = min(1, road.waiting_time / 140)
    prediction_component = min(1, road.predicted_vehicle_count / max(road.capacity, 1))
    fairness_component = fairness_bonus(road)
    emergency_component = 1 if road.emergency_status else 0
    downstream_penalty = road.downstream_penalty
    score = (
        0.40 * road.congestion_score
        + 0.24 * waiting_component
        + 0.18 * prediction_component
        + fairness_component
        + 0.55 * emergency_component
        - downstream_penalty
    )
    road.priority_components = {
        "congestion": round(road.congestion_score, 2),
        "waiting": round(waiting_component, 2),
        "prediction": round(prediction_component, 2),
        "fairness": round(fairness_component, 2),
        "emergency": round(emergency_component, 2),
        "downstream_penalty": round(downstream_penalty, 2),
    }
    road.priority_score = round(max(0, min(1.5, score)), 3)
    return road

