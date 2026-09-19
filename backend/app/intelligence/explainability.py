from app.schemas import Decision, Mode, Road


def build_decision(road: Road, selected_road: str, mode: Mode) -> Decision:
    reasons: list[str] = []
    if road.road_id == selected_road:
        reasons.append(f"{road.road_id} is receiving {road.signal_state.value} because its priority score is {road.priority_score:.2f}.")
    else:
        reasons.append(f"{road.road_id} is being held while {selected_road} receives the active phase.")
    if road.congestion_level == "HIGH":
        reasons.append(f"Congestion is HIGH with {road.vehicle_count:.0f} vehicles and {road.queue_length:.0f} queued.")
    elif road.congestion_level == "MEDIUM":
        reasons.append("Congestion is MEDIUM, so the optimizer keeps monitoring the approach.")
    else:
        reasons.append("Congestion is LOW and does not need extended green time yet.")
    if road.fairness_active:
        reasons.append("Waiting-time threshold exceeded, so anti-starvation fairness increased this road's priority.")
    if road.emergency_status:
        reasons.append("Emergency vehicle detected. Safe transition control is prioritizing this route.")
    if road.downstream_penalty > 0:
        reasons.append("Green time was reduced because downstream congestion is already elevated.")
    reasons.append(f"Predicted demand is {road.predicted_vehicle_count:.0f} vehicles using the baseline predictor.")
    return Decision(
        road_id=road.road_id,
        selected_road=selected_road,
        mode=mode,
        recommended_green_time=road.green_time,
        explanation=reasons,
        priority_components=road.priority_components,
        fairness_status="FAIRNESS ACTIVE" if road.fairness_active else "Normal",
        emergency_status="EMERGENCY PRIORITY ACTIVE" if road.emergency_status else "None",
    )

