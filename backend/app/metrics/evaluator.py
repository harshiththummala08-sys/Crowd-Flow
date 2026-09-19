from app.schemas import Metrics, Road


def evaluate(roads: dict[str, Road], throughput: float, emergency_status: str) -> Metrics:
    values = list(roads.values())
    return Metrics(
        vehicles=round(sum(r.vehicle_count for r in values), 1),
        average_waiting_time=round(sum(r.waiting_time for r in values) / len(values), 1),
        average_queue_length=round(sum(r.queue_length for r in values) / len(values), 1),
        average_speed=round(sum(r.average_speed for r in values) / len(values), 1),
        congestion_score=round(sum(r.congestion_score for r in values) / len(values), 3),
        throughput=round(throughput, 1),
        maximum_waiting_time=round(max(r.waiting_time for r in values), 1),
        emergency_status=emergency_status,
    )

