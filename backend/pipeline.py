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

    def generate_spotify_embeddings(self) -> Dict[str, object]:
        """Regenerate vectors from Spotify audio features and return a small summary."""
        from spotify_embedding import SpotifyEmbeddingModel
        from spotify_client import SpotifyAuthError

        try:
            spotify_model = SpotifyEmbeddingModel()
        except SpotifyAuthError as exc:
            raise ValueError(str(exc))

        simple_model = SimpleEmbeddingModel()

        def fallback_vector_fn(track: Dict[str, object]) -> List[float]:
            vec = spotify_model.generate_vector(track)
            if vec is None:
                # If Spotify fails, fallback to simple model so we don't break the catalog
                return simple_model.generate_vector(track)
            return vec

        # Assign version so the catalog persists it correctly
        fallback_vector_fn.model_version = spotify_model.version

        result = self.catalog.regenerate_feature_vectors(fallback_vector_fn)
        return {
            "status": "spotify_embeddings_regenerated",
            **result,
        }


