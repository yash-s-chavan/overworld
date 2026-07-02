"""Shared Pydantic models for the Overworld backend."""

from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field


class Coordinates(BaseModel):
    latitude: float
    longitude: float


class TrackBase(BaseModel):
    track_id: str = Field(..., min_length=1)
    title: str = Field(..., min_length=1)
    artist: str = Field(..., min_length=1)
    album: Optional[str] = None
    environment_tags: List[str] = Field(default_factory=list)
    feature_vector: List[float] = Field(..., min_length=4, max_length=4)
    source: Optional[str] = None


class TrackCreate(TrackBase):
    """Payload used when adding a track to the catalog."""


class RecommendationRequest(BaseModel):
    target_vector: List[float] = Field(..., min_length=4, max_length=4)
    top_k: int = Field(default=10, ge=1, le=50)
    environment: Optional[str] = None


class LocationRecommendationRequest(BaseModel):
    latitude: float
    longitude: float
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


class CatalogSummary(BaseModel):
    track_count: int
    catalog_path: str
    seed_path: str
    index_ready: bool

