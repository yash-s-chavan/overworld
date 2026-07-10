#!/usr/bin/env python3
"""
Integration test for Overworld ML scaffold.
Run this to verify the entire backend is ready for ML work.
"""

def test_imports():
    """Test that all modules import correctly."""
    from main import app, catalog, pipeline, task_manager
    from catalog import TrackCatalog
    from pipeline import MLPrepPipeline
    from background import BackgroundTaskManager
    from geolocation import reverse_geocode_environment, _environment_from_address, get_environment_vector
    from schemas import Coordinates, TrackCreate, RecommendationRequest
    print("✓ All imports successful")


def test_catalog():
    """Test catalog loading and recommendations."""
    from catalog import TrackCatalog
    cat = TrackCatalog()
    state = cat.load()
    assert len(state.tracks) > 0, "No tracks loaded"
    assert state.index_matrix is not None, "Index not built"
    
    recs = cat.recommend([0.5, 0.5, 0.5, 0.5], top_k=3)
    assert len(recs) == 3, f"Expected 3 recommendations, got {len(recs)}"
    assert recs[0].rank == 1, "First recommendation should have rank 1"
    assert recs[0].score <= 1.0, f"Score should be ≤1.0, got {recs[0].score}"
    print("✓ Catalog loading and recommendations work")


def test_pipeline():
    """Test pipeline data preparation."""
    from pipeline import MLPrepPipeline
    from catalog import TrackCatalog
    
    cat = TrackCatalog()
    pipe = MLPrepPipeline(catalog=cat)
    
    prep = pipe.prepare()
    assert prep['track_count'] > 0, "No tracks prepared"
    assert prep['index_ready'], "Index should be ready"
    
    vectors = pipe.list_feature_vectors()
    assert len(vectors) > 0, "No vectors returned"
    assert all(len(v) == 4 for v in vectors), "All vectors should be 4-dimensional"
    print("✓ Pipeline data preparation works")


def test_geolocation():
    """Test environment classification."""
    from geolocation import _environment_from_address, get_environment_vector
    
    assert _environment_from_address({"name": "Central Park"}, "park") == "park"
    assert _environment_from_address({"city": "New York"}, "city") == "urban"
    assert _environment_from_address({"name": "Waikiki Beach"}, "place") == "beach"
    assert get_environment_vector("forest") == [0.3, 0.9, 1.0, 0.2]
    assert len(get_environment_vector("unknown")) == 4
    print("✓ Geolocation classification works")


def test_background():
    """Test background task manager."""
    from background import BackgroundTaskManager
    
    mgr = BackgroundTaskManager()
    assert not mgr.running, "Should not be running initially"
    
    completed = []
    
    def dummy_task():
        completed.append(True)
    
    mgr.run_async("test_task", dummy_task)
    
    import time
    time.sleep(0.2)
    
    status = mgr.status()
    assert len(status['queued_tasks']) > 0, "Task should be queued"
    print("✓ Background task manager works")


def test_app_structure():
    """Test that the FastAPI app has the right routes."""
    from main import app
    
    route_names = [route.path for route in app.routes]
    
    required_routes = [
        "/",
        "/health",
        "/catalog/summary",
        "/catalog/tracks",
        "/catalog/validate",
        "/recommend",
        "/recommend/vector",
        "/recommend/location",
        "/pipeline/prepare",
        "/pipeline/generate-embeddings",
    ]
    
    for route in required_routes:
        assert any(route in r for r in route_names), f"Route {route} not found"
    
    print("✓ FastAPI app has all required routes")


def main():
    """Run all tests."""
    print("=" * 60)
    print("Overworld ML Scaffold Integration Test")
    print("=" * 60)
    
    tests = [
        test_imports,
        test_catalog,
        test_pipeline,
        test_geolocation,
        test_background,
        test_app_structure,
    ]
    
    for test in tests:
        try:
            test()
        except Exception as e:
            print(f"✗ {test.__name__} failed: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    print("=" * 60)
    print("✓ All tests passed! ML scaffold is ready.")
    print("=" * 60)
    return True


if __name__ == "__main__":
    import sys
    sys.exit(0 if main() else 1)


