# Overworld

Overworld is a contextual audio recommendation engine.

## Current backend scaffold

- `backend/main.py` — API routes and startup wiring
- `backend/geolocation.py` — reverse-geocoding helper
- `backend/catalog.py` — track catalog and cosine-similarity ranking
- `backend/pipeline.py` — data preparation helpers
- `backend/background.py` — small background task manager
- `backend/schemas.py` — request/response models
- `backend/data/tracks_seed.json` — starter track data

## Good next ML steps

1. Replace the seed vectors with your own embeddings.
2. Add a script that generates vectors from metadata.
3. Train or tune a model that maps environments to feature vectors.
4. Expand the dataset beyond the starter Pokémon tracks.

