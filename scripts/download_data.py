from pathlib import Path


def main() -> None:
    Path("data/raw").mkdir(parents=True, exist_ok=True)
    print("CrowdFlow data downloader placeholder")
    print("Large public datasets are intentionally not committed.")
    print("Before downloading METR-LA, OSM extracts, or vision datasets, verify source, license, size, and redistribution terms.")


if __name__ == "__main__":
    main()

