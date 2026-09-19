from pathlib import Path


def main() -> None:
    Path("data/processed").mkdir(parents=True, exist_ok=True)
    print("No external dataset is required for the Round 3 mock simulation.")
    print("Processed data directory is ready for optional METR-LA, OSM, SUMO, or vision preprocessing.")


if __name__ == "__main__":
    main()

