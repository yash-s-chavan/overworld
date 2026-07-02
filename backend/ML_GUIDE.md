"""
ML Integration Guide for Overworld

The backend is now fully scaffolded for your ML work. Here's where to focus:

========================================
1. TRACK DATA & FEATURE VECTORS
========================================

Location: backend/data/tracks_seed.json

Current structure:
{
  "track_id": "pkm-001",
  "title": "Pallet Town",
  "artist": "Game Freak",
  "album": "Pokémon Red/Blue",
  "environment_tags": ["residential", "calm", "nostalgic"],
  "feature_vector": [0.25, 0.85, 0.65, 0.2],  <- YOUR ML WORK HERE
  "source": "seed"
}

The feature_vector is a 4-dimensional embedding representing:
  [Energy, Serenity, Acousticness, Tempo]

You can:
- Replace these with real embeddings from audio analysis
- Use a pre-trained model (e.g., Spotify API features, MusicNet)
- Train your own embedding model

========================================
2. ENVIRONMENT FEATURE MAPPING
========================================

File: backend/geolocation.py

Current: Hard-coded environment tags (urban, park, beach, forest, etc.)

Next step: Map environments to feature vectors just like tracks.

Example function to add:
  def get_environment_vector(environment_name: str) -> List[float]:
    # Map "park" -> [0.3, 0.9, 0.8, 0.2]
    # Map "urban" -> [0.8, 0.3, 0.2, 0.7]
    ...

========================================
3. RECOMMENDATION ALGORITHM
========================================

File: backend/catalog.py, method: recommend()

Current: Cosine similarity ranking using scikit-learn

You can extend this to:
- Add weighting or custom distance metrics
- Implement filtering by tags or metadata
- Add personalization or A/B testing

The cosine_similarity call is here:
  scores = cosine_similarity(vector, matrix)[0]

========================================
4. BATCH VECTOR GENERATION
========================================

File: backend/pipeline.py

Add a method to generate vectors in bulk:
  def generate_embeddings(self, tracks: List[Dict]) -> List[Dict]:
    # Call your embedding model
    # Return tracks with updated feature_vector
    ...

Then expose it as an endpoint in main.py:
  @app.post("/pipeline/generate-embeddings")
  async def generate_embeddings(source: str = "spotify"):
    ...

========================================
5. TESTING YOUR CHANGES
========================================

Quick test after changes:
  cd backend
  python3 -c "
    from catalog import TrackCatalog
    catalog = TrackCatalog()
    catalog.load()
    recs = catalog.recommend([0.5, 0.5, 0.5, 0.5], top_k=5)
    for r in recs:
        print(r.title, r.score)
  "

========================================
6. ENDPOINTS YOU CAN CALL
========================================

GET /health
  - Check catalog and background task status

GET /catalog/summary
  - Track count, index readiness

GET /catalog/tracks
  - List all loaded tracks

POST /catalog/tracks
  - Add a single track

POST /pipeline/prepare
  - Load and prepare the catalog

POST /recommend/vector
  - Pass a raw feature vector [e1, e2, e3, e4]
  - Returns top 10 similar tracks

POST /recommend/location
  - Pass lat/lon
  - Returns recommendations for that location

========================================
7. NEXT IMMEDIATE STEPS
========================================

1. Decide on your feature vector source:
   - Audio features (Spotify, MusicNet, librosa)
   - Manual annotation (Pokémon music qualities)
   - LLM-based (semantic similarity)

2. Generate real vectors for the seed tracks

3. Test recommendations with different vectors

4. Add environment-to-vector mapping

5. Expand the catalog beyond 5 tracks

Good luck!
"""

