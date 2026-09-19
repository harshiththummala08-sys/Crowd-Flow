from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field


class SignalState(str, Enum):
    RED = "RED"
    GREEN = "GREEN"
    YELLOW = "YELLOW"
    ALL_RED = "ALL_RED"
    EMERGENCY_GREEN = "EMERGENCY_GREEN"


class Mode(str, Enum):
    FIXED = "FIXED"
    ADAPTIVE = "ADAPTIVE"


class Road(BaseModel):
    road_id: str
    source_intersection: str
    destination_intersection: str
    vehicle_count: float
    queue_length: float
    waiting_time: float
    average_speed: float
    capacity: int
    predicted_vehicle_count: float = 0
    congestion_score: float = 0
    congestion_level: Literal["LOW", "MEDIUM", "HIGH"] = "LOW"
    green_time: int = 30
    signal_state: SignalState = SignalState.RED
    emergency_status: bool = False
    waiting_since: float = 0
    priority_score: float = 0
    fairness_active: bool = False
    downstream_penalty: float = 0
    priority_components: dict[str, float] = Field(default_factory=dict)


class Intersection(BaseModel):
    intersection_id: str
    x: float
    y: float
    connected_roads: list[str]
    current_phase: str = "normal"
    phase_time_remaining: int = 30


class Metrics(BaseModel):
    vehicles: float
    average_waiting_time: float
    average_queue_length: float
    average_speed: float
    congestion_score: float
    throughput: float
    maximum_waiting_time: float
    emergency_status: str


class Decision(BaseModel):
    road_id: str
    selected_road: str
    mode: Mode
    recommended_green_time: int
    explanation: list[str]
    priority_components: dict[str, float]
    fairness_status: str
    emergency_status: str


class SimulationStatus(BaseModel):
    running: bool
    mode: Mode
    simulation_time: int
    prediction_source: str
    provider: str


class NetworkState(BaseModel):
    roads: list[Road]
    intersections: list[Intersection]
    metrics: Metrics
    decisions: list[Decision]
    status: SimulationStatus
    history: list[dict]
    emergency_route: list[str]


class TrafficAdjustment(BaseModel):
    road_id: str
    delta: int


class EmergencyRequest(BaseModel):
    road_id: str


class ModeRequest(BaseModel):
    mode: Mode


class ExperimentRequest(BaseModel):
    duration_ticks: int = Field(default=40, ge=5, le=240)
    scenario: str = "rush_hour"

