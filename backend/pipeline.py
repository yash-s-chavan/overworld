"""Pipeline helpers that prepare data for ML experimentation."""

from __future__ import annotations

from pathlib import Path
from typing import Dict, List, Optional

from catalog import TrackCatalog
from embedding_model import SimpleEmbeddingModel


class MLPrepPipeline:
    """Lightweight orchestration for loading and preparing recommendation data."""

    def __init__(self, catalog: Optional[TrackCatalog] = None) -> None:
        self.catalog = catalog or TrackCatalog()

    def prepare(self) -> Dict[str, object]:
        state = self.catalog.load()
        return {
            "track_count": len(state.tracks),
            "track_ids": state.track_ids,
            "loaded_from": state.loaded_from,
            "index_ready": state.index_matrix is not None,
        }

    def ensure_seed_data(self) -> Path:
        self.catalog.upsert_seed_file()
        return self.catalog.seed_path

    def export_csv(self, csv_path: Path) -> Path:
        self.catalog.export_csv(csv_path)
        return csv_path

    def list_feature_vectors(self) -> List[List[float]]:
        state = self.catalog.load()
        return [track["feature_vector"] for track in state.tracks]

    def generate_embeddings(self) -> Dict[str, object]:
        """Regenerate vectors from metadata tags and return a small summary."""
        model = SimpleEmbeddingModel()
        result = self.catalog.regenerate_feature_vectors(model.generate_vector)
        return {
            "status": "embeddings_regenerated",
            **result,
        }


