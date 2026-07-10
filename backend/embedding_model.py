"""Simple metadata-driven embedding generator for tracks."""

from __future__ import annotations

from typing import Dict, List


class SimpleEmbeddingModel:
    """Generate 4D vectors [energy, serenity, acousticness, tempo] from tags."""

    _SIGNALS = {
        "energy": {"high", "energetic", "adventure", "travel", "urban", "upbeat", "fast", "intense"},
        "serenity": {"calm", "serene", "restful", "ambient", "peaceful", "safe", "relax"},
        "acousticness": {"acoustic", "natural", "forest", "park", "waterfront", "organic", "light"},
        "tempo": {"fast", "upbeat", "dance", "driving", "travel", "city", "pulse", "rhythm"},
    }

    def generate_vector(self, track: Dict[str, object]) -> List[float]:
        raw_tags = track.get("environment_tags", [])
        if not isinstance(raw_tags, list):
            raw_tags = []
        tags = [str(tag).lower() for tag in raw_tags]
        text = " ".join(
            [
                str(track.get("title", "")).lower(),
                str(track.get("artist", "")).lower(),
                str(track.get("album", "")).lower(),
                " ".join(tags),
            ]
        )

        scores = []
        for signal_name in ["energy", "serenity", "acousticness", "tempo"]:
            signal_words = self._SIGNALS[signal_name]
            score = sum(1 for word in signal_words if word in text)
            scores.append(min(1.0, max(0.0, score / 3.0)))

        return scores


