"""Spotify-backed embedding model for Overworld.

Maps Spotify audio features to the 4D [Energy, Serenity, Acousticness, Tempo]
feature vector used by the recommendation engine.

Spotify feature → Overworld dimension mapping
----------------------------------------------
Energy       → energy          (Spotify 0–1, used directly)
Serenity     → valence * (1 - energy)   (high valence + low energy ≈ calm & pleasant)
Acousticness → acousticness    (Spotify 0–1, used directly)
Tempo        → (tempo_bpm - MIN_BPM) / (MAX_BPM - MIN_BPM) clamped to [0,1]
               MIN_BPM = 40, MAX_BPM = 220
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from spotify_client import SpotifyClient, SpotifyAuthError

logger = logging.getLogger(__name__)

# Tempo normalisation bounds (BPM)
_MIN_BPM: float = 40.0
_MAX_BPM: float = 220.0

MODEL_VERSION = "spotify-audio-features-v1"


def _normalize_tempo(bpm: float) -> float:
    """Map raw BPM to [0, 1]."""
    return max(0.0, min(1.0, (bpm - _MIN_BPM) / (_MAX_BPM - _MIN_BPM)))


def audio_features_to_vector(features: Dict[str, Any]) -> List[float]:
    """Convert a Spotify audio-features dict to a 4D Overworld feature vector.

    Args:
        features: Raw dict from ``GET /audio-features/{id}``.

    Returns:
        [energy, serenity, acousticness, tempo] each in [0, 1].
    """
    energy: float = float(features.get("energy") or 0.0)
    valence: float = float(features.get("valence") or 0.0)
    acousticness: float = float(features.get("acousticness") or 0.0)
    tempo: float = float(features.get("tempo") or 120.0)

    serenity = valence * (1.0 - energy)

    return [
        round(energy, 4),
        round(serenity, 4),
        round(acousticness, 4),
        round(_normalize_tempo(tempo), 4),
    ]


class SpotifyEmbeddingModel:
    """Generates 4D feature vectors by querying the Spotify Web API.

    Falls back to None for tracks it cannot find so the caller can decide
    what to do (skip, keep old vector, use SimpleEmbeddingModel, etc.).
    """

    version = MODEL_VERSION

    def __init__(self, client: Optional[SpotifyClient] = None) -> None:
        self._client = client or SpotifyClient()

    def generate_vector(self, track: Dict[str, Any]) -> Optional[List[float]]:
        """Return a 4D feature vector for *track*, or None on lookup failure.

        Args:
            track: A catalog track dict with at least ``title`` and ``artist``.

        Returns:
            List[float] of length 4, or None if Spotify has no data for the track.
        """
        title = str(track.get("title") or "")
        artist = str(track.get("artist") or "")
        if not title or not artist:
            logger.warning("SpotifyEmbeddingModel: skipping track with missing title/artist")
            return None

        result = self._client.fetch_features_for_track(title, artist)
        if result is None:
            return None

        features = result.get("audio_features") or {}
        vector = audio_features_to_vector(features)

        # Attach Spotify metadata back onto the track dict so callers can persist it
        track["spotify_id"] = result.get("spotify_id")
        track["spotify_preview_url"] = result.get("preview_url")
        track["spotify_external_url"] = result.get("external_url")

        logger.info(
            "SpotifyEmbeddingModel: '%s' by '%s' → vector=%s (spotify_id=%s)",
            title,
            artist,
            vector,
            result.get("spotify_id"),
        )
        return vector
