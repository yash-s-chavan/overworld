"""Spotify Web API client for the Overworld backend.

Uses the Client Credentials OAuth2 flow — no user login required.
Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in the environment
(or a .env file) before using this module.
"""

from __future__ import annotations

import logging
import time
from typing import Any, Dict, List, Optional

import requests

from config import settings

logger = logging.getLogger(__name__)

_TOKEN_URL = "https://accounts.spotify.com/api/token"
_API_BASE = "https://api.spotify.com/v1"


class SpotifyAuthError(Exception):
    """Raised when Spotify credentials are missing or the token request fails."""


class SpotifyClient:
    """Thin wrapper around the Spotify Web API with automatic token refresh."""

    def __init__(
        self,
        client_id: Optional[str] = None,
        client_secret: Optional[str] = None,
        timeout: int = 10,
    ) -> None:
        self.client_id = client_id or settings.spotify_client_id
        self.client_secret = client_secret or settings.spotify_client_secret
        self.timeout = timeout
        self._access_token: Optional[str] = None
        self._token_expires_at: float = 0.0

        if not self.client_id or not self.client_secret:
            raise SpotifyAuthError(
                "Spotify credentials not configured. "
                "Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET environment variables."
            )

    # ------------------------------------------------------------------
    # Auth
    # ------------------------------------------------------------------

    def _refresh_token(self) -> None:
        """Fetch a new Client Credentials access token."""
        response = requests.post(
            _TOKEN_URL,
            data={"grant_type": "client_credentials"},
            auth=(self.client_id, self.client_secret),
            timeout=self.timeout,
        )
        response.raise_for_status()
        data = response.json()
        self._access_token = data["access_token"]
        # Subtract 30 s buffer so we refresh before actual expiry
        self._token_expires_at = time.monotonic() + data.get("expires_in", 3600) - 30
        logger.debug("Spotify access token refreshed; expires in ~%ds", data.get("expires_in"))

    def _token(self) -> str:
        """Return a valid access token, refreshing if necessary."""
        if self._access_token is None or time.monotonic() >= self._token_expires_at:
            self._refresh_token()
        return self._access_token  # type: ignore[return-value]

    def _get(self, path: str, params: Optional[Dict[str, Any]] = None) -> Any:
        """Authenticated GET against the Spotify API."""
        url = f"{_API_BASE}/{path.lstrip('/')}"
        headers = {"Authorization": f"Bearer {self._token()}"}
        response = requests.get(url, headers=headers, params=params or {}, timeout=self.timeout)
        response.raise_for_status()
        return response.json()

    # ------------------------------------------------------------------
    # Track search
    # ------------------------------------------------------------------

    def search_track(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Search Spotify by free-text query and return simplified track dicts.

        Each item has: spotify_id, title, artist, album, preview_url, external_url.
        """
        data = self._get("search", params={"q": query, "type": "track", "limit": limit})
        items = data.get("tracks", {}).get("items", [])
        return [_simplify_track(item) for item in items if item]

    def search_track_by_title_artist(self, title: str, artist: str) -> Optional[Dict[str, Any]]:
        """Search Spotify for a specific title + artist, returning the best match or None."""
        query = f"track:{title} artist:{artist}"
        results = self.search_track(query, limit=1)
        return results[0] if results else None

    # ------------------------------------------------------------------
    # Audio features
    # ------------------------------------------------------------------

    def get_audio_features(self, spotify_id: str) -> Optional[Dict[str, Any]]:
        """Fetch audio features for a single Spotify track ID.

        Returns the raw Spotify audio-features dict, or None if unavailable.
        """
        try:
            data = self._get(f"audio-features/{spotify_id}")
            return data if data and data.get("id") else None
        except requests.HTTPError as exc:
            if exc.response is not None and exc.response.status_code == 404:
                logger.warning("No audio features found for Spotify ID %s", spotify_id)
                return None
            raise

    def get_audio_features_batch(self, spotify_ids: List[str]) -> Dict[str, Optional[Dict[str, Any]]]:
        """Fetch audio features for up to 100 Spotify track IDs in one request.

        Returns a mapping of spotify_id → audio features dict (or None if missing).
        """
        if not spotify_ids:
            return {}
        # Spotify caps batch at 100
        results: Dict[str, Optional[Dict[str, Any]]] = {}
        for chunk_start in range(0, len(spotify_ids), 100):
            chunk = spotify_ids[chunk_start : chunk_start + 100]
            data = self._get("audio-features", params={"ids": ",".join(chunk)})
            for item in data.get("audio_features") or []:
                if item and item.get("id"):
                    results[item["id"]] = item
        # Fill in any IDs that came back as null
        for sid in spotify_ids:
            results.setdefault(sid, None)
        return results

    # ------------------------------------------------------------------
    # Combined helpers
    # ------------------------------------------------------------------

    def fetch_features_for_track(
        self, title: str, artist: str
    ) -> Optional[Dict[str, Any]]:
        """Search Spotify for a track and return its audio features in one call.

        Returns a dict with both simplified track metadata and audio features,
        or None if the track cannot be found on Spotify.
        """
        match = self.search_track_by_title_artist(title, artist)
        if match is None:
            logger.info("Spotify: no match for '%s' by '%s'", title, artist)
            return None
        features = self.get_audio_features(match["spotify_id"])
        if features is None:
            logger.info("Spotify: no audio features for '%s' (id=%s)", title, match["spotify_id"])
            return None
        return {**match, "audio_features": features}


# ------------------------------------------------------------------
# Internal helpers
# ------------------------------------------------------------------

def _simplify_track(item: Dict[str, Any]) -> Dict[str, Any]:
    """Extract the fields we care about from a raw Spotify track object."""
    artists = item.get("artists") or []
    artist_name = artists[0]["name"] if artists else "Unknown"
    album = item.get("album") or {}
    return {
        "spotify_id": item.get("id", ""),
        "title": item.get("name", ""),
        "artist": artist_name,
        "album": album.get("name"),
        "preview_url": item.get("preview_url"),
        "external_url": (item.get("external_urls") or {}).get("spotify"),
    }
