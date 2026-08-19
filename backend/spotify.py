"""Spotify utility endpoints — fetch track metadata (album art, etc.) server-side."""

from __future__ import annotations

import base64
from typing import List

import requests
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from config import settings

router = APIRouter(prefix="/spotify", tags=["spotify"])


def _get_client_token() -> str:
    """Get a Spotify client-credentials token (no user login needed for metadata)."""
    if not settings.spotify_client_id or not settings.spotify_client_secret:
        raise HTTPException(status_code=500, detail="Spotify credentials not configured.")

    auth_header = base64.b64encode(
        f"{settings.spotify_client_id}:{settings.spotify_client_secret}".encode()
    ).decode()

    resp = requests.post(
        "https://accounts.spotify.com/api/token",
        headers={"Authorization": f"Basic {auth_header}", "Content-Type": "application/x-www-form-urlencoded"},
        data={"grant_type": "client_credentials"},
        timeout=5,
    )
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail="Failed to get Spotify client token.")
    return resp.json()["access_token"]


class TrackInfoRequest(BaseModel):
    spotify_ids: List[str]


@router.post("/track-info")
async def get_track_info(request: TrackInfoRequest):
    """
    Batch-fetch Spotify track metadata (name, artist, album art) for up to 50 track IDs.
    Uses client credentials — no user login required.
    """
    if not request.spotify_ids:
        return {"tracks": []}

    # Spotify's /tracks endpoint accepts up to 50 IDs at once
    ids = request.spotify_ids[:50]
    token = _get_client_token()

    resp = requests.get(
        "https://api.spotify.com/v1/tracks",
        params={"ids": ",".join(ids)},
        headers={"Authorization": f"Bearer {token}"},
        timeout=8,
    )

    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Spotify API error: {resp.text}")

    tracks_raw = resp.json().get("tracks", [])

    result = []
    for t in tracks_raw:
        if t is None:
            result.append(None)
            continue
        images = t.get("album", {}).get("images", [])
        album_art = images[0]["url"] if images else None
        result.append({
            "spotify_id": t["id"],
            "name": t["name"],
            "artist": ", ".join(a["name"] for a in t.get("artists", [])),
            "album": t.get("album", {}).get("name"),
            "album_art": album_art,
            "duration_ms": t.get("duration_ms"),
            "external_url": t.get("external_urls", {}).get("spotify"),
            "preview_url": t.get("preview_url"),
        })

    return {"tracks": result}
