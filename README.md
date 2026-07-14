# Overworld

Overworld is a contextual audio recommendation engine.

## Current backend scaffold

- `backend/main.py` — API routes and startup wiring
- `backend/geolocation.py` — reverse-geocoding helper
- `backend/catalog.py` — track catalog and cosine-similarity ranking
- `backend/pipeline.py` — data preparation helpers
- `backend/embedding_model.py` — simple metadata-to-vector generator
- `backend/background.py` — small background task manager
- `backend/schemas.py` — request/response models
- `backend/data/tracks_seed.json` — expanded seed track data

## Added API utilities

- `GET /catalog/validate` — validates vectors and reports schema/data issues
- `POST /pipeline/generate-embeddings` — regenerates vectors from metadata tags

## Quick checks

```bash
cd /Users/yashchavan/PycharmProjects/overworld/backend
python3 test_scaffold.py
python3 -m pytest -q test_catalog.py
python3 -m pytest -q test_api.py
python3 regenerate_embeddings.py
```

