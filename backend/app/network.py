from app.schemas import Intersection, Road, SignalState


def build_intersections() -> dict[str, Intersection]:
    return {
        "I1": Intersection(intersection_id="I1", x=18, y=22, connected_roads=[]),
        "I2": Intersection(intersection_id="I2", x=50, y=22, connected_roads=[]),
        "I3": Intersection(intersection_id="I3", x=82, y=22, connected_roads=[]),
        "I4": Intersection(intersection_id="I4", x=18, y=66, connected_roads=[]),
        "I5": Intersection(intersection_id="I5", x=50, y=66, connected_roads=[]),
        "I6": Intersection(intersection_id="I6", x=82, y=66, connected_roads=[]),
    }


def build_roads() -> dict[str, Road]:
    roads = {
        "R1": Road(road_id="R1", source_intersection="I1", destination_intersection="I2", vehicle_count=32, queue_length=7, waiting_time=28, average_speed=35, capacity=80, signal_state=SignalState.GREEN),
        "R2": Road(road_id="R2", source_intersection="I2", destination_intersection="I3", vehicle_count=46, queue_length=13, waiting_time=42, average_speed=27, capacity=85, signal_state=SignalState.RED),
        "R3": Road(road_id="R3", source_intersection="I4", destination_intersection="I5", vehicle_count=35, queue_length=10, waiting_time=35, average_speed=30, capacity=75, signal_state=SignalState.RED),
        "R4": Road(road_id="R4", source_intersection="I5", destination_intersection="I6", vehicle_count=28, queue_length=5, waiting_time=24, average_speed=38, capacity=70, signal_state=SignalState.RED),
        "R5": Road(road_id="R5", source_intersection="I1", destination_intersection="I4", vehicle_count=22, queue_length=4, waiting_time=19, average_speed=41, capacity=65, signal_state=SignalState.RED),
        "R6": Road(road_id="R6", source_intersection="I2", destination_intersection="I5", vehicle_count=52, queue_length=18, waiting_time=54, average_speed=22, capacity=80, signal_state=SignalState.RED),
        "R7": Road(road_id="R7", source_intersection="I3", destination_intersection="I6", vehicle_count=31, queue_length=8, waiting_time=30, average_speed=32, capacity=70, signal_state=SignalState.RED),
        "R8": Road(road_id="R8", source_intersection="I2", destination_intersection="I4", vehicle_count=20, queue_length=5, waiting_time=22, average_speed=37, capacity=60, signal_state=SignalState.RED),
        "R9": Road(road_id="R9", source_intersection="I3", destination_intersection="I5", vehicle_count=25, queue_length=6, waiting_time=26, average_speed=34, capacity=65, signal_state=SignalState.RED),
        "R10": Road(road_id="R10", source_intersection="I4", destination_intersection="I2", vehicle_count=29, queue_length=9, waiting_time=33, average_speed=31, capacity=70, signal_state=SignalState.RED),
        "R11": Road(road_id="R11", source_intersection="I5", destination_intersection="I2", vehicle_count=34, queue_length=11, waiting_time=37, average_speed=29, capacity=70, signal_state=SignalState.RED),
        "R12": Road(road_id="R12", source_intersection="I6", destination_intersection="I3", vehicle_count=19, queue_length=4, waiting_time=18, average_speed=42, capacity=60, signal_state=SignalState.RED),
    }
    return roads


def attach_roads(intersections: dict[str, Intersection], roads: dict[str, Road]) -> dict[str, Intersection]:
    for road in roads.values():
        intersections[road.source_intersection].connected_roads.append(road.road_id)
        intersections[road.destination_intersection].connected_roads.append(road.road_id)
    return intersections


def road_coordinates(intersections: dict[str, Intersection], road: Road) -> tuple[tuple[float, float], tuple[float, float]]:
    source = intersections[road.source_intersection]
    dest = intersections[road.destination_intersection]
    return (source.x, source.y), (dest.x, dest.y)
