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

export interface Discovery {
  id: number;
  user_id: number;
  track_id: string;
  environment_tag: string | null;
  discovered_at: string;
}

export interface UserProfile {
  id: number;
  spotify_id: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
  last_login: string;
  discoveries: Discovery[];
}
