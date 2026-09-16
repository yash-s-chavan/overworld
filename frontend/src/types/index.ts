export interface SpotifyTrackMeta {
  spotify_id: string;
  name: string;
  artist: string;
  album: string;
  album_art: string | null;
  duration_ms: number;
  external_url: string;
  preview_url: string | null;
}

export interface CatalogTrack {
  track_id: string;
  title: string;
  artist: string;
  album: string | null;
  environment_tags: string[];
  spotify_id: string | null;
  album_art?: string | null;
}

export interface RecommendationItem {
  rank: number;
  track_id: string;
  title: string;
  artist: string;
  album: string | null;
  score: number;
  environment_tags: string[];
  spotify_id: string | null;
}
