import logging
import time
from contextlib import asynccontextmanager
from uuid import uuid4

import requests
from fastapi import BackgroundTasks, FastAPI, HTTPException
from starlette.requests import Request
from starlette.responses import Response

from background import BackgroundTaskManager
from catalog import TrackCatalog
from config import settings
from geolocation import reverse_geocode_environment, get_environment_vector
from pipeline import MLPrepPipeline
from schemas import (
    Coordinates,
    EmbeddingGenerationResponse,
    HealthResponse,
    LocationRecommendationRequest,
    RecommendationRequest,
    TrackCreate,
    TrackValidationRequest,
    ValidationResponse,
    RecommendationResponse,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s - %(message)s")
logger = logging.getLogger(__name__)

catalog = TrackCatalog()
pipeline = MLPrepPipeline(catalog=catalog)
task_manager = BackgroundTaskManager()


def bootstrap_catalog() -> None:
    """Load and validate catalog data for application startup."""
    logger.info("Bootstrapping catalog on startup")
    pipeline.ensure_seed_data()
    catalog.load()
    validation_errors = catalog.validate_tracks()
    if validation_errors:
        logger.warning("Catalog validation found %d issue(s): %s", len(validation_errors), validation_errors)
    logger.info("Catalog bootstrap complete: %s", catalog.summary())


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Start the catalog bootstrap job and allow the app to serve."""
    def _bootstrap() -> None:
        try:
            bootstrap_catalog()
        except Exception:
            logger.exception("Catalog bootstrap failed")

    task_manager.run_async("bootstrap_catalog", _bootstrap)
    yield


app = FastAPI(
    title="Overworld API",
    description="Contextual Audio Recommendation Engine using vector similarity matching.",
    version="1.0.0",
    lifespan=lifespan,
)


@app.middleware("http")
async def request_logging_middleware(request: Request, call_next) -> Response:
    request_id = request.headers.get("X-Request-ID", str(uuid4()))
    started = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = (time.perf_counter() - started) * 1000
    response.headers["X-Request-ID"] = request_id
    logger.info("request_id=%s method=%s path=%s status=%s duration_ms=%.2f", request_id, request.method, request.url.path, response.status_code, elapsed_ms)
    return response

@app.get("/")
async def root():
    return {
        "status": "online",
        "system": "Overworld Contextual Audio Engine",
        "endpoints": ["/docs", "/health", "/recommend"]
    }

@app.get("/health", response_model=HealthResponse)
async def health_check():
    return {
        "status": "healthy",
        "catalog": catalog.summary(),
        "background": task_manager.status(),
    }


@app.get("/catalog/summary")
async def catalog_summary():
    return catalog.summary()


@app.get("/catalog/tracks")
async def list_tracks():
    return {"tracks": catalog.list_tracks()}


@app.get("/catalog/validate", response_model=ValidationResponse)
async def validate_catalog():
    errors = catalog.validate_tracks()
    return {"valid": len(errors) == 0, "errors": errors}


@app.post("/catalog/validate-track", response_model=ValidationResponse)
async def validate_track(track: TrackValidationRequest):
    errors = catalog.validate_track_record(track.model_dump())
    return {"valid": len(errors) == 0, "errors": errors}


@app.post("/catalog/tracks")
async def add_track(track: TrackCreate):
    try:
        return {"track": catalog.add_track(track)}
    except ValueError as exc:
        raise HTTPException(status_code=409 if "already exists" in str(exc) else 400, detail=str(exc)) from exc


@app.post("/catalog/reload")
async def reload_catalog(background_tasks: BackgroundTasks):
    background_tasks.add_task(catalog.reload)
    return {"status": "reload_scheduled"}


@app.post("/pipeline/prepare")
async def prepare_pipeline():
    return pipeline.prepare()


@app.post("/pipeline/export")
async def export_pipeline_snapshot():
    export_path = catalog.index_path.with_name("tracks_export.csv")
    pipeline.export_csv(export_path)
    return {"status": "exported", "path": str(export_path)}


@app.post("/pipeline/generate-embeddings", response_model=EmbeddingGenerationResponse)
async def regenerate_embeddings():
    try:
        return pipeline.generate_embeddings()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Embedding regeneration failed")
        raise HTTPException(status_code=500, detail="Embedding regeneration failed") from exc


@app.get("/tasks/status")
async def tasks_status():
    return task_manager.status()

@app.post("/recommend", response_model=RecommendationResponse)
async def get_spatial_recommendations(coords: Coordinates):
    try:
        location = reverse_geocode_environment(coords.latitude, coords.longitude)
    except requests.RequestException as exc:
        raise HTTPException(status_code=503, detail="Geolocation provider unavailable") from exc
    except Exception as exc:
        logger.exception("Failed to resolve location for coordinates")
        raise HTTPException(status_code=500, detail="Failed to resolve environment") from exc

    try:
        environment = location["environment"]
        target_vector = get_environment_vector(environment)
        recommendations = catalog.recommend(target_vector, top_k=settings.default_top_k, environment=environment)
    except Exception as exc:
        logger.exception("Recommendation generation failed")
        raise HTTPException(status_code=500, detail="Recommendation generation failed") from exc

    return {
        "input_coordinates": {"lat": coords.latitude, "lon": coords.longitude},
        "resolved_environment": environment,
        "resolved_location": location["display_name"],
        "recommendations": recommendations,
    }


@app.post("/recommend/vector", response_model=RecommendationResponse)
async def recommend_by_vector(request: RecommendationRequest):
    try:
        recommendations = catalog.recommend(request.target_vector, top_k=request.top_k, environment=request.environment)
    except Exception as exc:
        logger.exception("Vector recommendation failed")
        raise HTTPException(status_code=500, detail="Vector recommendation failed") from exc

    return {
        "target_vector": request.target_vector,
        "environment": request.environment,
        "recommendations": recommendations,
    }


@app.post("/recommend/location", response_model=RecommendationResponse)
async def recommend_by_location(request: LocationRecommendationRequest):
    try:
        location = reverse_geocode_environment(request.latitude, request.longitude)
    except requests.RequestException as exc:
        raise HTTPException(status_code=503, detail="Geolocation provider unavailable") from exc
    except Exception as exc:
        logger.exception("Location recommendation failed before ranking")
        raise HTTPException(status_code=500, detail="Failed to resolve environment") from exc

    try:
        environment = location["environment"]
        target_vector = get_environment_vector(environment)
        recommendations = catalog.recommend(target_vector, top_k=request.top_k, environment=environment)
    except Exception as exc:
        logger.exception("Location recommendation ranking failed")
        raise HTTPException(status_code=500, detail="Location recommendation failed") from exc

    return {
        "input_coordinates": {"lat": request.latitude, "lon": request.longitude},
        "resolved_environment": environment,
        "resolved_location": location["display_name"],
        "recommendations": recommendations,
    }