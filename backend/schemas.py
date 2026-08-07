"""Shared Pydantic models for the Overworld backend."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator


class Coordinates(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)


class TrackBase(BaseModel):
    track_id: str = Field(..., min_length=1)
    title: str = Field(..., min_length=1)
    artist: str = Field(..., min_length=1)
    album: Optional[str] = None
    environment_tags: List[str] = Field(default_factory=list)
    feature_vector: List[float] = Field(...)
    source: Optional[str] = None
    spotify_id: Optional[str] = None
    spotify_preview_url: Optional[str] = None
    spotify_external_url: Optional[str] = None


class TrackCreate(TrackBase):
    """Payload used when adding a track to the catalog."""


class TrackValidationRequest(BaseModel):
    track_id: str = ""
    title: str = ""
    artist: str = ""
    album: Optional[str] = None
    environment_tags: List[str] = Field(default_factory=list)
    feature_vector: List[float] = Field(default_factory=list)
    source: Optional[str] = None


class RecommendationRequest(BaseModel):
    target_vector: List[float] = Field(...)
    top_k: int = Field(default=10, ge=1, le=50)
    environment: Optional[str] = None

class LocationRecommendationRequest(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    top_k: int = Field(default=10, ge=1, le=50)


class RecommendationItem(BaseModel):
    rank: int
    track_id: str
    title: str
    artist: str
    album: Optional[str] = None
    score: float
    environment_tags: List[str] = Field(default_factory=list)
    feature_vector: List[float] = Field(default_factory=list)
    embedding_model_version: Optional[str] = None
    embedding_generated_at: Optional[str] = None
    spotify_id: Optional[str] = None
    spotify_preview_url: Optional[str] = None
    spotify_external_url: Optional[str] = None


class CatalogSummary(BaseModel):
    track_count: int
    catalog_path: str
    seed_path: str
    index_ready: bool
    loaded_from: Optional[str] = None


class HealthResponse(BaseModel):
    status: str
    catalog: CatalogSummary
    background: Dict[str, Any]


class ValidationResponse(BaseModel):
    valid: bool
    errors: List[str]


class EmbeddingGenerationResponse(BaseModel):
    status: str
    updated: int
    track_count: int
    embedding_model_version: str
    embedding_generated_at: str


class ErrorResponse(BaseModel):
    detail: str


class RecommendationResponse(BaseModel):
    target_vector: Optional[List[float]] = None
    environment: Optional[str] = None
    input_coordinates: Optional[Dict[str, float]] = None
    resolved_environment: Optional[str] = None
    resolved_location: Optional[str] = None
    recommendations: List[RecommendationItem]

