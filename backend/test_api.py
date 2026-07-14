from __future__ import annotations

import requests
from fastapi.testclient import TestClient

import main


client = TestClient(main.app)


def _ensure_catalog_loaded() -> None:
    # Tests should not depend on startup timing from background bootstrap.
    main.catalog.load()


def test_health_returns_expected_shape():
    _ensure_catalog_loaded()

    response = client.get("/health")
    assert response.status_code == 200

    payload = response.json()
    assert payload["status"] == "healthy"
    assert "catalog" in payload
    assert "background" in payload
    assert "track_count" in payload["catalog"]


def test_catalog_validate_returns_contract():
    _ensure_catalog_loaded()

    response = client.get("/catalog/validate")
    assert response.status_code == 200

    payload = response.json()
    assert isinstance(payload.get("valid"), bool)
    assert isinstance(payload.get("errors"), list)


def test_recommend_vector_respects_top_k():
    _ensure_catalog_loaded()

    response = client.post(
        "/recommend/vector",
        json={
            "target_vector": [0.3, 0.9, 0.8, 0.2],
            "top_k": 5,
            "environment": "forest",
        },
    )
    assert response.status_code == 200

    payload = response.json()
    recommendations = payload["recommendations"]
    assert len(recommendations) == 5
    assert len({item["track_id"] for item in recommendations}) == 5


def test_recommend_location_success(monkeypatch):
    _ensure_catalog_loaded()

    def fake_reverse_geocode(lat: float, lon: float):
        return {
            "environment": "forest",
            "display_name": "Mock Forest",
            "raw": {"lat": lat, "lon": lon},
        }

    monkeypatch.setattr(main, "reverse_geocode_environment", fake_reverse_geocode)

    response = client.post(
        "/recommend/location",
        json={"latitude": 37.0, "longitude": -122.0, "top_k": 3},
    )
    assert response.status_code == 200

    payload = response.json()
    assert payload["resolved_environment"] == "forest"
    assert payload["resolved_location"] == "Mock Forest"
    assert len(payload["recommendations"]) == 3


def test_recommend_location_geolocation_unavailable(monkeypatch):
    _ensure_catalog_loaded()

    def failing_reverse_geocode(_lat: float, _lon: float):
        raise requests.RequestException("network down")

    monkeypatch.setattr(main, "reverse_geocode_environment", failing_reverse_geocode)

    response = client.post(
        "/recommend/location",
        json={"latitude": 37.0, "longitude": -122.0, "top_k": 3},
    )
    assert response.status_code == 503
    assert response.json()["detail"] == "Geolocation provider unavailable"


def test_recommend_location_internal_error(monkeypatch):
    _ensure_catalog_loaded()

    def bad_reverse_geocode(_lat: float, _lon: float):
        raise RuntimeError("unexpected failure")

    monkeypatch.setattr(main, "reverse_geocode_environment", bad_reverse_geocode)

    response = client.post(
        "/recommend/location",
        json={"latitude": 37.0, "longitude": -122.0, "top_k": 3},
    )
    assert response.status_code == 500
    assert response.json()["detail"] == "Failed to resolve environment"

