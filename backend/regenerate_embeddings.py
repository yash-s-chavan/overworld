#!/usr/bin/env python3
"""Small runner to regenerate embeddings from metadata and print a summary."""

from catalog import TrackCatalog
from pipeline import MLPrepPipeline


def main() -> None:
    catalog = TrackCatalog()
    pipeline = MLPrepPipeline(catalog=catalog)
    catalog.load()
    result = pipeline.generate_embeddings()
    print(result)


if __name__ == "__main__":
    main()

