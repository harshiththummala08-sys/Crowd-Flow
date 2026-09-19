from pydantic import BaseModel


class Settings(BaseModel):
    simulation_provider: str = "mock"
    tick_seconds: int = 3
    min_green: int = 10
    max_green: int = 60
    max_waiting_threshold: int = 90
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ]


settings = Settings()
