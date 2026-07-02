"""Reverse-geocoding helpers for turning coordinates into simple environment tags."""

from __future__ import annotations

from typing import Any, Dict

import requests


NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse"


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


def reverse_geocode_environment(latitude: float, longitude: float, timeout: int = 5) -> Dict[str, Any]:
	"""Reverse-geocode coordinates and return a simple environment label."""
	response = requests.get(
		NOMINATIM_REVERSE_URL,
		params={"format": "json", "lat": latitude, "lon": longitude, "zoom": 18, "addressdetails": 1},
		headers={"User-Agent": "Overworld-CARE/1.0"},
		timeout=timeout,
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

