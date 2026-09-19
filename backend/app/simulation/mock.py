import math

from app.schemas import Road, SignalState
from app.simulation.base import TrafficSimulationProvider


class MockSimulationProvider(TrafficSimulationProvider):
    def step(self, roads: dict[str, Road], tick: int) -> float:
        throughput = 0.0
        for index, road in enumerate(roads.values()):
            arrival = 2.2 + 1.1 * math.sin((tick + index * 3) / 7) + (0.7 if road.road_id in {"R2", "R6"} else 0)
            is_green = road.signal_state in {SignalState.GREEN, SignalState.EMERGENCY_GREEN}
            is_yellow = road.signal_state == SignalState.YELLOW
            departures = min(road.queue_length + road.vehicle_count * 0.08, 6.2 if is_green else 1.8 if is_yellow else 0.35)
            throughput += departures
            road.vehicle_count = max(0, road.vehicle_count + arrival - departures)
            if is_green:
                road.queue_length = max(0, road.queue_length + arrival * 0.15 - departures * 0.85)
                road.waiting_time = max(0, road.waiting_time - 7 + road.queue_length * 0.06)
                road.average_speed = min(50, road.average_speed + 3.2)
            elif is_yellow:
                road.queue_length = min(road.capacity, road.queue_length + arrival * 0.7)
                road.waiting_time += 2.2 + road.queue_length * 0.04
                road.average_speed = max(10, road.average_speed - 1.7)
            else:
                road.queue_length = min(road.capacity, road.queue_length + arrival * 0.88)
                road.waiting_time += 3.4 + road.queue_length * 0.055
                road.average_speed = max(4, road.average_speed - 2.5)
            road.vehicle_count = round(min(road.vehicle_count, road.capacity * 1.35), 1)
            road.queue_length = round(min(road.queue_length, road.capacity), 1)
            road.waiting_time = round(min(road.waiting_time, 220), 1)
            road.average_speed = round(road.average_speed, 1)
        return throughput

