import React, { useState, useEffect, useCallback } from 'react';
import { useSpotifyPlayer } from './hooks/useSpotifyPlayer';
import './App.css';

const API = 'http://127.0.0.1:8000';

// ── Types ──────────────────────────────────────────────────
interface SpotifyTrackMeta {
  spotify_id: string;
  name: string;
  artist: string;
  album: string;
  album_art: string | null;
  duration_ms: number;
  external_url: string;
  preview_url: string | null;
}

interface CatalogTrack {
  track_id: string;
  title: string;
  artist: string;
  album: string | null;
  environment_tags: string[];
  spotify_id: string | null;
  // enriched after fetching from Spotify
  album_art?: string | null;
}

interface RecommendationItem {
  rank: number;
  track_id: string;
  title: string;
  artist: string;
  album: string | null;
  score: number;
  environment_tags: string[];
  spotify_id: string | null;
}

type Page = 'dashboard' | 'musicdex';

// ── Helpers ────────────────────────────────────────────────
const fmtTime = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
};

// Fallback art - a simple coloured gradient when no art is available
const FALLBACK_ART = (title: string) => {
  const colours = ['#ffb7c5', '#aeedd5', '#a2d2e2', '#ffd9df', '#b1efd8'];
  const idx = title.charCodeAt(0) % colours.length;
  return null; // We'll render a div instead
};
const FALLBACK_COLORS = ['#ffb7c5', '#aeedd5', '#a2d2e2', '#ffd9df', '#b1efd8', '#ffb3ba', '#baeafa'];

// ── Component ──────────────────────────────────────────────
export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const { player, isReady, deviceId, playbackState } = useSpotifyPlayer(token);

  const [page, setPage] = useState<Page>('dashboard');

  // Catalog (Music Dex)
  const [catalog, setCatalog] = useState<CatalogTrack[]>([]);
  const [spotifyMeta, setSpotifyMeta] = useState<Record<string, SpotifyTrackMeta>>({});
  const [catalogLoading, setCatalogLoading] = useState(true);

  // Dashboard state
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [resolvedEnv, setResolvedEnv] = useState<string>('');
  const [resolvedLocation, setResolvedLocation] = useState<string>('');
  const [isFetching, setIsFetching] = useState(false);

  // ── Auth ──────────────────────────────────────────────────
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.substring(1));
      const at = params.get('access_token');
      if (at) {
        setToken(at);
        localStorage.setItem('spotify_access_token', at);
        window.history.replaceState(null, '', window.location.pathname);
        return;
      }
    }
    const stored = localStorage.getItem('spotify_access_token');
    if (stored) setToken(stored);
  }, []);

  // ── Load catalog + enrich with Spotify metadata ───────────
  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    try {
      const res = await fetch(`${API}/catalog/tracks`);
      const data = await res.json();
      const tracks: CatalogTrack[] = data.tracks || [];
      setCatalog(tracks);

      // Batch-fetch Spotify metadata for tracks that have a spotify_id
      const ids = tracks.map(t => t.spotify_id).filter(Boolean) as string[];
      if (ids.length > 0) {
        const metaRes = await fetch(`${API}/spotify/track-info`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ spotify_ids: ids }),
        });
        const metaData = await metaRes.json();
        const metaMap: Record<string, SpotifyTrackMeta> = {};
        (metaData.tracks || []).forEach((t: SpotifyTrackMeta | null) => {
          if (t) metaMap[t.spotify_id] = t;
        });
        setSpotifyMeta(metaMap);
      }
    } catch (e) {
      console.error('Failed to load catalog', e);
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  useEffect(() => { loadCatalog(); }, [loadCatalog]);

  // ── Playback ───────────────────────────────────────────────
  const playTrack = useCallback(async (spotifyId: string) => {
    if (!token || !deviceId) return;
    try {
      await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: 'PUT',
        body: JSON.stringify({ uris: [`spotify:track:${spotifyId}`] }),
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
    } catch (e) { console.error('Failed to play track', e); }
  }, [token, deviceId]);

  // ── Location Simulation ────────────────────────────────────
  const simulateLocation = useCallback(async (lat: number, lon: number) => {
    setIsFetching(true);
    setRecommendations([]);
    try {
      const res = await fetch(`${API}/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: lat, longitude: lon }),
      });
      const data = await res.json();
      setResolvedEnv(data.resolved_environment || '');
      setResolvedLocation(data.resolved_location || '');
      const recs: RecommendationItem[] = data.recommendations || [];
      setRecommendations(recs);

      // Enrich recommendations with Spotify meta if not already fetched
      const missingIds = recs
        .map((r: RecommendationItem) => r.spotify_id)
        .filter((id): id is string => !!id && !spotifyMeta[id]);
      if (missingIds.length > 0) {
        const metaRes = await fetch(`${API}/spotify/track-info`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ spotify_ids: missingIds }),
        });
        const metaData = await metaRes.json();
        setSpotifyMeta(prev => {
          const updated = { ...prev };
          (metaData.tracks || []).forEach((t: SpotifyTrackMeta | null) => {
            if (t) updated[t.spotify_id] = t;
          });
          return updated;
        });
      }

      // Auto-play top track with a Spotify ID
      if (isReady) {
        const topWithId = recs.find((r: RecommendationItem) => r.spotify_id);
        if (topWithId?.spotify_id) await playTrack(topWithId.spotify_id);
      }
    } catch (e) { console.error('Recommendation failed', e); }
    finally { setIsFetching(false); }
  }, [spotifyMeta, isReady, playTrack]);

  // ── Derived UI state ───────────────────────────────────────
  const currentTrack = playbackState?.track_window.current_track;
  const isPlaying = !playbackState?.paused;
  const progressPct = currentTrack && playbackState
    ? (playbackState.position / playbackState.duration) * 100 : 0;

  // Stats for collection bars
  const caughtCount = catalog.filter(t => t.spotify_id).length;
  const seenCount = catalog.length;
  const caughtPct = seenCount > 0 ? (caughtCount / seenCount) * 100 : 0;

  // Env label → Pokémon location name mapping
  const envToLocation: Record<string, string> = {
    urban: 'Saffron City',
    park: 'National Park (Johto)',
    forest: 'Viridian Forest',
    beach: 'Cinnabar Island',
    mountain: 'Mt. Silver',
    waterfront: 'Cerulean Cape',
    unknown: 'Unknown Road',
  };

  const dioramaLabel = resolvedEnv
    ? `Now Playing: ${envToLocation[resolvedEnv] || resolvedEnv}`
    : 'Scan a location to begin';

  return (
    <div className="app-shell">

      {/* ── Sidebar ───────────────────────────────────────── */}
      <aside className="sidebar">
        <div className="brand-title">Pokégear Audio</div>

        {/* Trainer Card */}
        <div className="trainer-card">
          <div className="trainer-avatar-wrap">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDmaC-VD2KgeKGwFvOgrdu0Rf89k3xzriiRh5CCile2ngBtwL-yGmAyJYyFKTItdO7zpwkh8OROL52NJ1GFsj-xNPcJyzJUg8HsSp2jfKxnQKfdlPEIxs0Wq9NhL_usOoVr9zwDPssKErotDfefSjrPXEuZZJLuyGa76jgYlN34BYX2IT_FNOy9nyVqEkaSEWw7zuTl-ZqUMVWO73pXEcp9MJHW2ZalBypE_zoveAjGJqKB8Tx6Qqdx"
              alt="Trainer"
            />
          </div>
          <div className="trainer-name">Trainer Red</div>
          <div className="trainer-rank">Elite Collector</div>
        </div>

        {/* Nav */}
        <ul className="nav-links">
          <li>
            <button className={`nav-link ${page === 'dashboard' ? 'active' : ''}`} onClick={() => setPage('dashboard')}>
              <span className="material-symbols-outlined">radar</span> Live Radar
            </button>
          </li>
          <li>
            <button className={`nav-link ${page === 'musicdex' ? 'active' : ''}`} onClick={() => setPage('musicdex')}>
              <span className="material-symbols-outlined">style</span> The Music Dex
            </button>
          </li>
        </ul>

        {/* Spotify Status */}
        {!token ? (
          <button className="connect-btn" onClick={() => { window.location.href = `${API}/auth/login`; }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--secondary)' }}>link</span>
            Connect Spotify
          </button>
        ) : (
          <div className="spotify-status">
            <div className="spotify-status-dot" style={{ background: isReady ? 'var(--secondary)' : '#f59e0b' }} />
            {isReady ? 'Pokégear Synced' : 'Connecting…'}
          </div>
        )}

        <button className="sync-btn" onClick={loadCatalog}>Sync Gear</button>
      </aside>

      {/* ── Main Canvas ───────────────────────────────────── */}
      <main className="main-canvas">

        {/* ── DASHBOARD ──────────────────────────────────── */}
        {page === 'dashboard' && (
          <>
            <div className="page-header">
              <div>
                <h1 className="page-title">Live Radar</h1>
                {resolvedLocation && (
                  <p style={{ color: 'var(--on-surface-variant)', fontSize: '14px', marginTop: '4px', fontWeight: 600 }}>
                    📍 {resolvedLocation}
                  </p>
                )}
              </div>
              <div className="filter-bar">
                <button className="filter-btn" onClick={() => simulateLocation(40.7588, -73.9851)} disabled={isFetching}>
                  <span className="material-symbols-outlined">location_city</span>
                  Times Sq.
                </button>
                <button className="filter-btn" onClick={() => simulateLocation(44.4280, -110.5885)} disabled={isFetching}>
                  <span className="material-symbols-outlined">park</span>
                  Yellowstone
                </button>
                <button className="filter-btn" onClick={() => simulateLocation(25.7617, -80.1918)} disabled={isFetching}>
                  <span className="material-symbols-outlined">beach_access</span>
                  Miami Beach
                </button>
              </div>
            </div>

            {/* Diorama */}
            <div className="diorama-container">
              <div className="diorama-viewport">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAtBI2HEg9XHXgY5-7r1X36NdH5YCTT6HhOnl-gIY8glSEStnEtercrZPQ0dsuwFsCVrgyZQopfEeELuQS_MScPXHmSPpTVjT0yCGcDyq9xm1C8Gbz-2DWov4n0i0ixZwlOf0cMUWTv5sUhKssyov9-59cmD_ZXwdU24lakZYocdSSPCLRH7OBZ9GBPy0m8akWEJjaD4fKELAUxxUNt3JIuAyhMTVeB-JkGG6j4vPB-qbXN-cE8v_eE"
                  alt="Location diorama"
                  style={{ filter: isFetching ? 'brightness(0.6)' : 'none', transition: 'filter 0.4s ease' }}
                />
                {isFetching && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'white', animation: 'spin 1s linear infinite' }}>radar</span>
                    <span style={{ color: 'white', fontWeight: 700, fontSize: '18px' }}>Scanning area…</span>
                  </div>
                )}
              </div>
              <div className="diorama-label">
                {dioramaLabel}
                <span className="material-symbols-outlined" style={{ color: 'var(--secondary)', fontSize: '20px' }}>music_note</span>
              </div>
            </div>

            {/* Collection Progress */}
            <div className="collection-card">
              <div className="collection-title">Collection Progress</div>
              <div className="collection-stat-row">
                <span className="collection-label">
                  <span className="dot" style={{ background: 'var(--secondary)' }} /> Caught
                </span>
                <span className="collection-count" style={{ color: 'var(--secondary)' }}>{caughtCount}</span>
              </div>
              <div className="hp-bar-track">
                <div className="hp-bar-fill caught" style={{ width: `${caughtPct}%` }} />
              </div>
              <div className="collection-stat-row" style={{ marginTop: '8px' }}>
                <span className="collection-label">
                  <span className="dot" style={{ background: 'var(--primary-container)' }} /> Seen
                </span>
                <span className="collection-count" style={{ color: 'var(--primary)' }}>{seenCount}</span>
              </div>
              <div className="hp-bar-track">
                <div className="hp-bar-fill seen" style={{ width: '100%' }} />
              </div>
            </div>

            {/* Recommendations */}
            {recommendations.length > 0 && (
              <>
                <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--on-surface)', marginBottom: '24px' }}>
                  🎵 Wild Tracks Appeared!
                  <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--on-surface-variant)', marginLeft: '12px', textTransform: 'capitalize' }}>
                    Environment: {resolvedEnv}
                  </span>
                </h2>
                <div className="dex-grid">
                  {recommendations.map((rec, i) => {
                    const meta = rec.spotify_id ? spotifyMeta[rec.spotify_id] : null;
                    const artUrl = meta?.album_art;
                    const fallbackColor = FALLBACK_COLORS[i % FALLBACK_COLORS.length];
                    return (
                      <div
                        key={rec.track_id}
                        className="dex-card"
                        onClick={() => rec.spotify_id && isReady && playTrack(rec.spotify_id)}
                        title={rec.spotify_id ? '' : 'No Spotify ID — cannot play'}
                        style={{ opacity: rec.spotify_id ? 1 : 0.7, cursor: rec.spotify_id && isReady ? 'pointer' : 'default' }}
                      >
                        <div className="dex-card-art">
                          {artUrl ? (
                            <img src={artUrl} alt={rec.title} />
                          ) : (
                            <div style={{ width: '100%', height: '100%', background: fallbackColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'white', opacity: 0.8, fontVariationSettings: "'FILL' 1" }}>music_note</span>
                            </div>
                          )}
                          {rec.spotify_id && isReady && (
                            <button className="dex-play-btn">
                              <span className="material-symbols-outlined" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
                            </button>
                          )}
                          <div style={{ position: 'absolute', top: '8px', left: '8px', background: 'var(--primary)', color: 'white', borderRadius: '999px', fontSize: '11px', fontWeight: 700, padding: '2px 8px' }}>
                            #{rec.rank}
                          </div>
                        </div>
                        <div className="dex-card-track">{rec.title}</div>
                        <div className="dex-card-artist">{meta?.artist || rec.artist}</div>
                        {rec.score !== undefined && (
                          <div style={{ fontSize: '11px', color: 'var(--secondary)', fontWeight: 700, letterSpacing: '0.05em' }}>
                            {(rec.score * 100).toFixed(0)}% match
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {recommendations.length === 0 && !isFetching && (
              <div style={{ textAlign: 'center', padding: '48px', color: 'var(--on-surface-variant)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '64px', display: 'block', marginBottom: '16px', opacity: 0.4 }}>explore</span>
                <p style={{ fontSize: '18px', fontWeight: 600 }}>Pick a location above to discover wild tracks!</p>
              </div>
            )}
          </>
        )}

        {/* ── MUSIC DEX ──────────────────────────────────── */}
        {page === 'musicdex' && (
          <>
            <div className="page-header">
              <h1 className="page-title">The Music Dex</h1>
              <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--on-surface-variant)' }}>
                {caughtCount} / {seenCount} Caught
              </div>
            </div>

            {catalogLoading ? (
              <div style={{ textAlign: 'center', padding: '48px', color: 'var(--on-surface-variant)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '48px', display: 'block', marginBottom: '16px', opacity: 0.5, animation: 'spin 1s linear infinite' }}>radar</span>
                <p style={{ fontWeight: 600 }}>Loading Music Dex…</p>
              </div>
            ) : (
              <div className="dex-grid">
                {catalog.map((track, i) => {
                  const meta = track.spotify_id ? spotifyMeta[track.spotify_id] : null;
                  const artUrl = meta?.album_art;
                  const fallbackColor = FALLBACK_COLORS[i % FALLBACK_COLORS.length];
                  const discovered = !!track.spotify_id;

                  return (
                    <div
                      key={track.track_id}
                      className={`dex-card ${discovered ? '' : 'undiscovered'}`}
                      onClick={() => track.spotify_id && isReady && playTrack(track.spotify_id)}
                      style={{ cursor: track.spotify_id && isReady ? 'pointer' : 'default' }}
                    >
                      <div className="dex-card-art">
                        {discovered ? (
                          artUrl ? (
                            <img src={artUrl} alt={track.title} />
                          ) : (
                            <div style={{ width: '100%', height: '100%', background: fallbackColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span className="material-symbols-outlined" style={{ fontSize: '40px', color: 'white', opacity: 0.8, fontVariationSettings: "'FILL' 1" }}>music_note</span>
                            </div>
                          )
                        ) : (
                          <div style={{ width: '100%', height: '100%', background: '#e3e2e0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '40px', color: 'var(--primary)', opacity: 0.5 }}>lock</span>
                          </div>
                        )}
                        {discovered && isReady && (
                          <button className="dex-play-btn">
                            <span className="material-symbols-outlined" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
                          </button>
                        )}
                      </div>
                      <div className="dex-card-track">{discovered ? track.title : '???'}</div>
                      <div className="dex-card-artist">{discovered ? (meta?.artist || track.artist) : '???'}</div>
                      {discovered && track.environment_tags.length > 0 && (
                        <div style={{ fontSize: '11px', color: 'var(--tertiary)', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'capitalize' }}>
                          {track.environment_tags.slice(0, 2).join(' · ')}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      {/* ── Pokégear Player Bar ───────────────────────────── */}
      <footer className="player-bar">
        <div className="player-progress-track">
          <div className="player-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>

        <div className="player-controls">
          <button className="player-ctrl-btn" onClick={() => player?.previousTrack()}>
            <span className="material-symbols-outlined">skip_previous</span>
          </button>
          <button className="player-play-btn" onClick={() => player?.togglePlay()}>
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1", fontSize: '36px' }}>
              {isPlaying ? 'pause' : 'play_arrow'}
            </span>
          </button>
          <button className="player-ctrl-btn" onClick={() => player?.nextTrack()}>
            <span className="material-symbols-outlined">skip_next</span>
          </button>

          {currentTrack ? (
            <>
              {currentTrack.album.images[0]?.url && (
                <img
                  src={currentTrack.album.images[0].url}
                  alt="Now playing"
                  style={{ width: '44px', height: '44px', borderRadius: '50%', boxShadow: 'var(--shadow-outer)', marginLeft: '8px', border: '3px solid var(--surface)' }}
                />
              )}
              <div style={{ marginLeft: '12px' }}>
                <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--on-surface)' }}>{currentTrack.name}</div>
                <div style={{ fontSize: '13px', color: 'var(--on-surface-variant)', fontWeight: 600 }}>{currentTrack.artists.map(a => a.name).join(', ')}</div>
              </div>
              <div style={{ marginLeft: 'auto', fontSize: '13px', fontWeight: 700, color: 'var(--on-surface-variant)' }}>
                {fmtTime(playbackState!.position)} / {fmtTime(playbackState!.duration)}
              </div>
            </>
          ) : (
            <span style={{ marginLeft: '12px', fontSize: '14px', color: 'var(--on-surface-variant)', fontWeight: 600 }}>
              {token ? (isReady ? 'Pick a location to start playing' : 'Connecting to Spotify…') : 'Connect Spotify to play music'}
            </span>
          )}
        </div>
      </footer>

      {/* Spinning keyframe */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
