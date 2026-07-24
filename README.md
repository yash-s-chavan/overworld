# Overworld

**Overview:** Overworld is a contextual audio recommendation engine that maps real-world GPS coordinates to environmental tags and suggests situationally appropriate music.
  It translates physical environments into 4D audio embeddings to serve hyper-contextual track recommendations.

**Tech Stack:** Python, FastAPI, Scikit-Learn, Spotify Web API, OpenStreetMap (Nominatim API), Docker.

**Key Focus:** Bridging geospatial data and audio analysis by translating real-world locations into musical feature vectors (Energy, Serenity, Acousticness, Tempo) and
  efficiently ranking a music catalog using cosine similarity.

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

