from app.schemas import Road, SignalState


class EmergencyController:
    def __init__(self) -> None:
        self.active_road_id: str | None = None
        self.route: list[str] = []
        self.stage = "IDLE"
        self.stage_ticks = 0
        self.response_time = 0

    def trigger(self, road_id: str) -> None:
        self.active_road_id = road_id
        self.route = [road_id, "R4", "R7"] if road_id != "R4" else ["R4", "R7", "R12"]
        self.stage = "YELLOW"
        self.stage_ticks = 0
        self.response_time = 0

    def clear(self, roads: dict[str, Road]) -> None:
        for road in roads.values():
            road.emergency_status = False
        self.active_road_id = None
        self.route = []
        self.stage = "IDLE"
        self.stage_ticks = 0

    def apply(self, roads: dict[str, Road]) -> bool:
        if not self.active_road_id or self.active_road_id not in roads:
            return False
        self.response_time += 3
        self.stage_ticks += 1
        for road in roads.values():
            road.emergency_status = road.road_id in self.route
        if self.stage == "YELLOW":
            for road in roads.values():
                road.signal_state = SignalState.YELLOW if road.signal_state == SignalState.GREEN else SignalState.RED
            if self.stage_ticks >= 2:
                self.stage = "ALL_RED"
                self.stage_ticks = 0
            return True
        if self.stage == "ALL_RED":
            for road in roads.values():
                road.signal_state = SignalState.ALL_RED
            if self.stage_ticks >= 2:
                self.stage = "EMERGENCY_GREEN"
                self.stage_ticks = 0
            return True
        for road in roads.values():
            road.signal_state = SignalState.EMERGENCY_GREEN if road.road_id == self.active_road_id else SignalState.RED
        if self.stage_ticks >= 12:
            self.clear(roads)
        return True

