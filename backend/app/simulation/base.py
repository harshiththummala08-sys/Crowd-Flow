from abc import ABC, abstractmethod

from app.schemas import Road


class TrafficSimulationProvider(ABC):
    @abstractmethod
    def step(self, roads: dict[str, Road], tick: int) -> float:
        raise NotImplementedError

