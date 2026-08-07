"""SentenceTransformer-driven embedding generator for tracks."""

from __future__ import annotations

from typing import Dict, List
import logging

try:
    from sentence_transformers import SentenceTransformer
except ImportError:
    SentenceTransformer = None

from config import settings

logger = logging.getLogger(__name__)

class EmbeddingModel:
    """Generate dense embeddings from track metadata using SentenceTransformers."""

    version = settings.embedding_model_version + "-minilm"

    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        if SentenceTransformer is None:
            raise ImportError("sentence-transformers is not installed. Please install it.")
        logger.info(f"Loading SentenceTransformer model: {model_name}")
        self.model = SentenceTransformer(model_name)
    
    def generate_vector(self, track: Dict[str, object]) -> List[float]:
        raw_tags = track.get("environment_tags", [])
        if not isinstance(raw_tags, list):
            raw_tags = []
        tags = [str(tag).lower() for tag in raw_tags]
        
        # Construct a rich text representation of the track
        title = str(track.get("title", "")).strip()
        artist = str(track.get("artist", "")).strip()
        album = str(track.get("album", "")).strip()
        
        parts = []
        if title: parts.append(f"Title: {title}")
        if artist: parts.append(f"Artist: {artist}")
        if album: parts.append(f"Album: {album}")
        if tags: parts.append(f"Tags: {', '.join(tags)}")
        
        text = " | ".join(parts)
        if not text:
            text = "unknown track"
            
        # The encode method returns a numpy array
        embedding = self.model.encode(text)
        # Convert it to a list of Python floats
        return [float(x) for x in embedding.tolist()]

# Alias for backwards compatibility with pipeline.py and other files
SimpleEmbeddingModel = EmbeddingModel
