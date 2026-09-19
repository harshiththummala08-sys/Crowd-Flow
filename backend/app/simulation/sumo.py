from app.simulation.mock import MockSimulationProvider


class SUMOSimulationProvider(MockSimulationProvider):
    """Prototype-safe placeholder. The app falls back to mock simulation when SUMO is not configured."""

