"""Environment-backed runtime settings for the Overworld backend."""

from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    environment: str = os.getenv("ENVIRONMENT", "development")
    nominatim_url: str = os.getenv("NOMINATIM_URL", "https://nominatim.openstreetmap.org/reverse")
    geocoding_timeout: int = int(os.getenv("GEOCODING_TIMEOUT", "5"))
    user_agent: str = os.getenv("GEOCODING_USER_AGENT", "Overworld-CARE/1.0")
    default_top_k: int = int(os.getenv("DEFAULT_TOP_K", "10"))
    embedding_model_version: str = os.getenv("EMBEDDING_MODEL_VERSION", "simple-tags-v1")
    spotify_client_id: str = os.getenv("SPOTIFY_CLIENT_ID", "")
    spotify_client_secret: str = os.getenv("SPOTIFY_CLIENT_SECRET", "")
    spotify_redirect_uri: str = os.getenv("SPOTIFY_REDIRECT_URI", "http://127.0.0.1:8000/auth/callback")
    frontend_url: str = os.getenv("FRONTEND_URL", "http://localhost:5173")


settings = Settings()
