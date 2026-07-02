from fastapi import BackgroundTasks, FastAPI

from background import BackgroundTaskManager
from catalog import TrackCatalog
from geolocation import reverse_geocode_environment
from pipeline import MLPrepPipeline
from schemas import Coordinates, LocationRecommendationRequest, RecommendationRequest, TrackCreate

app = FastAPI(
    title="Overworld API",
    description="Contextual Audio Recommendation Engine using vector similarity matching.",
    version="1.0.0",
)

catalog = TrackCatalog()
pipeline = MLPrepPipeline(catalog=catalog)
task_manager = BackgroundTaskManager()


@app.on_event("startup")
async def startup_bootstrap_catalog():
    def _bootstrap() -> None:
        pipeline.ensure_seed_data()
        catalog.load()

    task_manager.run_async("bootstrap_catalog", _bootstrap)

@app.get("/")
async def root():
    return {
        "status": "online",
        "system": "Overworld Contextual Audio Engine",
        "endpoints": ["/docs", "/health", "/recommend"]
    }

@app.get("/health")
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


@app.post("/catalog/tracks")
async def add_track(track: TrackCreate):
    return {"track": catalog.add_track(track)}


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


@app.get("/tasks/status")
async def tasks_status():
    return task_manager.status()

@app.post("/recommend")
async def get_spatial_recommendations(coords: Coordinates):
    location = reverse_geocode_environment(coords.latitude, coords.longitude)
    target_vector = [0.5, 0.5, 0.5, 0.5]
    if catalog.state.index_matrix is not None and len(catalog.state.index_matrix) > 0:
        target_vector = catalog.state.index_matrix[0].tolist()
    return {
        "input_coordinates": {"lat": coords.latitude, "lon": coords.longitude},
        "resolved_environment": location["environment"],
        "resolved_location": location["display_name"],
        "recommendations": catalog.recommend(target_vector, top_k=10, environment=location["environment"]),
    }


@app.post("/recommend/vector")
async def recommend_by_vector(request: RecommendationRequest):
    return {
        "target_vector": request.target_vector,
        "environment": request.environment,
        "recommendations": catalog.recommend(request.target_vector, top_k=request.top_k, environment=request.environment),
    }


@app.post("/recommend/location")
async def recommend_by_location(request: LocationRecommendationRequest):
    location = reverse_geocode_environment(request.latitude, request.longitude)
    recommendations = catalog.recommend([0.5, 0.5, 0.5, 0.5], top_k=request.top_k, environment=location["environment"])
    return {
        "input_coordinates": {"lat": request.latitude, "lon": request.longitude},
        "resolved_environment": location["environment"],
        "resolved_location": location["display_name"],
        "recommendations": recommendations,
    }