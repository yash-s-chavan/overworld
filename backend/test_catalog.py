from catalog import TrackCatalog
from schemas import TrackCreate


def test_add_track_updates_index(tmp_path):
    catalog = TrackCatalog(
        catalog_path=tmp_path / "tracks.json",
        seed_path=tmp_path / "seed.json",
        index_path=tmp_path / "index.json",
    )
    catalog.state.tracks = [
        {
            "track_id": "base-001",
            "title": "Base",
            "artist": "Seed",
            "album": "Demo",
            "environment_tags": ["calm"],
            "feature_vector": [0.5, 0.5, 0.5, 0.5],
            "source": "test",
        }
    ]
    catalog._persist()
    catalog.load()

    new_track = TrackCreate(
        track_id="test-001",
        title="Test Track",
        artist="Test Artist",
        album="Test Album",
        environment_tags=["urban"],
        feature_vector=[0.8, 0.2, 0.2, 0.8],
        source="test",
    )

    initial_count = len(catalog.state.tracks)
    catalog.add_track(new_track)

    assert len(catalog.state.tracks) == initial_count + 1
    assert catalog.state.index_matrix is not None
    assert catalog.state.index_matrix.shape[1] == 4


def test_recommend_respects_top_k_and_dedupes():
    catalog = TrackCatalog()
    catalog.load()

    recs = catalog.recommend([0.5, 0.5, 0.5, 0.5], top_k=5, environment="forest")
    assert len(recs) == 5
    assert len({item.track_id for item in recs}) == len(recs)
    assert recs[0].rank == 1


def test_recommend_handles_top_k_larger_than_catalog():
    catalog = TrackCatalog()
    catalog.load()

    track_count = len(catalog.state.tracks)
    recs = catalog.recommend([0.5, 0.5, 0.5, 0.5], top_k=track_count + 10)
    assert len(recs) == track_count


def test_recommend_scores_are_normalized():
    catalog = TrackCatalog()
    catalog.load()

    recs = catalog.recommend([0.5, 0.5, 0.5, 0.5], top_k=10)
    for rec in recs:
        assert 0.0 <= rec.score <= 1.0


def test_validate_tracks_reports_invalid_vectors(tmp_path):
    catalog = TrackCatalog(
        catalog_path=tmp_path / "bad_tracks.json",
        seed_path=tmp_path / "bad_seed.json",
        index_path=tmp_path / "bad_index.json",
    )
    catalog.state.tracks = [
        {
            "track_id": "bad-001",
            "title": "Bad",
            "artist": "Data",
            "feature_vector": [1.2, 0.3, 0.4, 0.5],
        },
        {
            "track_id": "bad-002",
            "title": "Bad Length",
            "artist": "Data",
            "feature_vector": [0.1, 0.2],
        },
    ]

    errors = catalog.validate_tracks()
    assert len(errors) >= 2


def test_add_track_rejects_duplicate_id():
    catalog = TrackCatalog()
    catalog.load()
    existing = catalog.state.tracks[0]
    duplicate = TrackCreate(
        track_id=existing["track_id"],
        title="Duplicate",
        artist="Test Artist",
        feature_vector=[0.5, 0.5, 0.5, 0.5],
    )

    try:
        catalog.add_track(duplicate)
    except ValueError as exc:
        assert "already exists" in str(exc)
    else:
        raise AssertionError("duplicate track ID should be rejected")


def test_regenerate_embeddings_adds_lifecycle_metadata(tmp_path):
    catalog = TrackCatalog(
        catalog_path=tmp_path / "tracks.json",
        seed_path=tmp_path / "seed.json",
        index_path=tmp_path / "index.json",
    )
    catalog.state.tracks = [{
        "track_id": "test-001",
        "title": "Forest Test",
        "artist": "Test",
        "environment_tags": ["forest", "serene"],
        "feature_vector": [0.5, 0.5, 0.5, 0.5],
    }]

    result = catalog.regenerate_feature_vectors(lambda _track: [0.2, 0.8, 0.8, 0.2])
    track = catalog.state.tracks[0]
    assert result["updated"] == 1
    assert track["embedding_model_version"]
    assert track["embedding_generated_at"]


