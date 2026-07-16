"""Reverse-geocoding helpers for turning coordinates into simple environment tags."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

import requests

from config import settings

NOMINATIM_REVERSE_URL = settings.nominatim_url


def _environment_from_address(address: Dict[str, Any], place_type: str) -> str:
    """Map Nominatim address data to a simple environment tag."""
    text = " ".join(str(value).lower() for value in address.values())
    place_type = (place_type or "").lower()

    if any(keyword in text for keyword in ["beach", "coast", "shore"]):
        return "beach"
    if any(keyword in text for keyword in ["park", "garden", "green"]):
        return "park"
    if any(keyword in text for keyword in ["forest", "wood", "woods"]):
        return "forest"
    if any(keyword in text for keyword in ["mountain", "hill", "peak"]):
        return "mountain"
    if any(keyword in text for keyword in ["river", "lake", "water", "harbor", "harbour"]):
        return "waterfront"
    if place_type in {"city", "town", "village"} or any(
        keyword in text for keyword in ["city", "town", "suburb"]
    ):
        return "urban"

    return "unknown"


def get_environment_vector(environment: str) -> List[float]:
    """Map normalized environment labels to 4D recommendation vectors."""
    environment = (environment or "unknown").lower()
    vector_map = {
        "beach": [0.6, 0.8, 0.9, 0.5],
        "park": [0.4, 0.7, 0.7, 0.4],
        "forest": [0.3, 0.9, 1.0, 0.2],
        "mountain": [0.7, 0.8, 0.9, 0.6],
        "waterfront": [0.5, 0.6, 0.5, 0.5],
        "urban": [0.9, 0.1, 0.1, 0.9],
        "unknown": [0.5, 0.5, 0.5, 0.5],
    }
    return vector_map.get(environment, vector_map["unknown"])


def reverse_geocode_environment(latitude: float, longitude: float, timeout: Optional[int] = None) -> Dict[str, Any]:
    """Reverse-geocode coordinates and return a simple environment label."""
    response = requests.get(
        NOMINATIM_REVERSE_URL,
        params={"format": "json", "lat": latitude, "lon": longitude, "zoom": 18, "addressdetails": 1},
        headers={"User-Agent": settings.user_agent},
        timeout=timeout if timeout is not None else settings.geocoding_timeout,
    )
    response.raise_for_status()

    data = response.json()
    address = data.get("address", {})
    environment = _environment_from_address(address, data.get("type", ""))

    return {
        "environment": environment,
        "display_name": data.get("display_name", "Unknown location"),
        "raw": data,
    }

