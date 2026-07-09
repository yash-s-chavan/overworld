"""Catalog and recommendation utilities for Overworld."""

import csv
import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence

import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

from schemas import RecommendationItem, TrackBase


DEFAULT_CATALOG_FILE = Path(__file__).with_name("data").joinpath("tracks.json")
DEFAULT_SEED_FILE = Path(__file__).with_name("data").joinpath("tracks_seed.json")
DEFAULT_INDEX_FILE = Path(__file__).with_name("data").joinpath("tracks_index.json")


@dataclass
class CatalogState:
    tracks: List[Dict[str, Any]] = field(default_factory=list)
    index_matrix: Optional[object] = None
    track_ids: List[str] = field(default_factory=list)
    loaded_from: Optional[str] = None


class TrackCatalog:
    """Loads, stores, and searches track feature vectors."""

    def __init__(
        self,
        catalog_path: Path = DEFAULT_CATALOG_FILE,
        seed_path: Path = DEFAULT_SEED_FILE,
        index_path: Path = DEFAULT_INDEX_FILE,
    ) -> None:
        self.catalog_path = Path(catalog_path)
        self.seed_path = Path(seed_path)
        self.index_path = Path(index_path)
        self.state = CatalogState()
        self.catalog_path.parent.mkdir(parents=True, exist_ok=True)

    def load(self) -> CatalogState:
        """Load the catalog from disk, falling back to a seed file or built-in defaults."""
        if self.catalog_path.exists():
            self.state.tracks = self._read_json(self.catalog_path)
            self.state.loaded_from = str(self.catalog_path)
        elif self.seed_path.exists():
            self.state.tracks = self._read_json(self.seed_path)
            self.state.loaded_from = str(self.seed_path)
        else:
            self.state.tracks = self._default_tracks()
            self.state.loaded_from = "builtin_defaults"

        self._refresh_index()
        return self.state

    def reload(self) -> CatalogState:
        return self.load()

    def summary(self) -> Dict[str, Any]:
        return {
            "track_count": len(self.state.tracks),
            "catalog_path": str(self.catalog_path),
            "seed_path": str(self.seed_path),
            "index_ready": self.state.index_matrix is not None,
            "loaded_from": self.state.loaded_from,
        }

    def list_tracks(self) -> List[Dict[str, Any]]:
        return list(self.state.tracks)

    def add_track(self, track: TrackBase) -> Dict[str, Any]:
        record = track.model_dump()
        self.state.tracks.append(record)
        self._persist()
        self._refresh_index()
        return record

    def recommend(
        self,
        target_vector: Sequence[float],
        top_k: int = 10,
        environment: Optional[str] = None,
    ) -> List[RecommendationItem]:
        if not self.state.tracks:
            return []

        vector = np.array(list(target_vector), dtype=float).reshape(1, -1)
        matrix = self.state.index_matrix
        if matrix is None or matrix.size == 0:
            self._refresh_index()
            matrix = self.state.index_matrix
        if matrix is None or matrix.size == 0:
            return []

        scores = cosine_similarity(vector, matrix)[0]
        ranked = np.argsort(scores)[::-1]

        items = []
        seen_track_ids = set()
        if environment:
            for index in ranked:
                track = self.state.tracks[index]
                track_id = track["track_id"]
                if(track_id not in seen_track_ids):
                    if environment in track.get("environment_tags", []):
                        items.append(
                            RecommendationItem(
                                rank=0,
                                track_id=track["track_id"],
                                title=track["title"],
                                artist=track["artist"],
                                album=track.get("album"),
                                score=float(scores[index]),
                                environment_tags=track.get("environment_tags", []),
                                feature_vector=track.get("feature_vector", []),
                            )
                        )
                        seen_track_ids.add(track_id)
                        if len(items) >= top_k:
                            break
        while(len(items) <top_k):
            added = False
            for index in ranked:
                track = self.state.tracks[index]
                track_id = track["track_id"]
                if(track_id not in seen_track_ids):
                    items.append(
                        RecommendationItem(
                            rank=0,
                            track_id=track["track_id"],
                            title=track["title"],
                            artist=track["artist"],
                            album=track.get("album"),
                            score=float(scores[index]),
                            environment_tags=track.get("environment_tags", []),
                            feature_vector=track.get("feature_vector", []),
                        )

                    )
                    added = True
                    seen_track_ids.add(track_id)
                if(len(items) == top_k):
                    break
            if not added:
                break
        for i, item in enumerate(items, start=1):
            item.rank = i
        return items

    def upsert_seed_file(self) -> None:
        """Write a seed file if one does not already exist."""
        if not self.seed_path.exists():
            self.seed_path.parent.mkdir(parents=True, exist_ok=True)
            self.seed_path.write_text(json.dumps(self._default_tracks(), indent=2), encoding="utf-8")

    def export_csv(self, csv_path: Path) -> None:
        csv_path = Path(csv_path)
        csv_path.parent.mkdir(parents=True, exist_ok=True)
        with csv_path.open("w", newline="", encoding="utf-8") as handle:
            writer = csv.writer(handle)
            writer.writerow(["track_id", "title", "artist", "album", "environment_tags", "feature_vector", "source"])
            for track in self.state.tracks:
                writer.writerow([
                    track.get("track_id"),
                    track.get("title"),
                    track.get("artist"),
                    track.get("album"),
                    "|".join(track.get("environment_tags", [])),
                    json.dumps(track.get("feature_vector", [])),
                    track.get("source"),
                ])

    def _refresh_index(self) -> None:
        if not self.state.tracks:
            self.state.index_matrix = None
            self.state.track_ids = []
            return

        vectors = [track["feature_vector"] for track in self.state.tracks]
        self.state.index_matrix = np.array(vectors, dtype=float)
        self.state.track_ids = [track["track_id"] for track in self.state.tracks]
        self._persist_index()

    def _persist(self) -> None:
        self.catalog_path.write_text(json.dumps(self.state.tracks, indent=2), encoding="utf-8")

    def _persist_index(self) -> None:
        payload = {
            "track_ids": self.state.track_ids,
            "matrix": self.state.index_matrix.tolist() if self.state.index_matrix is not None else [],
        }
        self.index_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    @staticmethod
    def _read_json(path: Path) -> List[Dict[str, Any]]:
        data = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(data, dict) and "tracks" in data:
            return list(data["tracks"])
        if isinstance(data, list):
            return list(data)
        raise ValueError("Unsupported catalog format in {0}".format(path))

    @staticmethod
    def _default_tracks() -> List[Dict[str, Any]]:
        return [
            {
                "track_id": "pkm-001",
                "title": "Pallet Town",
                "artist": "Game Freak",
                "album": "Pokémon Red/Blue",
                "environment_tags": ["residential", "calm", "nostalgic"],
                "feature_vector": [0.25, 0.85, 0.65, 0.20],
                "source": "builtin_defaults",
            },
            {
                "track_id": "pkm-002",
                "title": "Viridian Forest",
                "artist": "Game Freak",
                "album": "Pokémon Red/Blue",
                "environment_tags": ["forest", "adventure", "serene"],
                "feature_vector": [0.30, 0.90, 0.80, 0.18],
                "source": "builtin_defaults",
            },
            {
                "track_id": "pkm-003",
                "title": "Surfing Theme",
                "artist": "Game Freak",
                "album": "Pokémon Red/Blue",
                "environment_tags": ["beach", "waterfront", "light"],
                "feature_vector": [0.42, 0.72, 0.55, 0.35],
                "source": "builtin_defaults",
            },
            {
                "track_id": "pkm-004",
                "title": "Pokémon Center",
                "artist": "Game Freak",
                "album": "Pokémon Red/Blue",
                "environment_tags": ["urban", "safe", "restful"],
                "feature_vector": [0.45, 0.78, 0.50, 0.32],
                "source": "builtin_defaults",
            },
            {
                "track_id": "pkm-005",
                "title": "Route 1",
                "artist": "Game Freak",
                "album": "Pokémon Red/Blue",
                "environment_tags": ["travel", "outdoors", "balanced"],
                "feature_vector": [0.55, 0.55, 0.45, 0.55],
                "source": "builtin_defaults",
            },
        ]


