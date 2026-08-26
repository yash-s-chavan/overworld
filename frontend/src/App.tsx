import React, { useState, useEffect, useCallback } from 'react';
import { useSpotifyPlayer } from './hooks/useSpotifyPlayer';
import './index.css'; // Use index.css which has tailwind now

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

const FALLBACK_COLORS = ['bg-[#ffb7c5]', 'bg-[#aeedd5]', 'bg-[#a2d2e2]', 'bg-[#ffd9df]', 'bg-[#b1efd8]', 'bg-[#ffb3ba]', 'bg-[#baeafa]'];

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

  const caughtCount = catalog.filter(t => t.spotify_id).length;
  const seenCount = catalog.length;
  const caughtPct = seenCount > 0 ? (caughtCount / seenCount) * 100 : 0;

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
    <div className="bg-surface text-on-surface font-body-md overflow-x-hidden min-h-screen flex flex-col">
      {/* ── Top App Bar (Mobile) ── */}
      <header className="md:hidden bg-surface w-full px-margin-mobile py-4 flex justify-between items-center shadow-[5px_5px_10px_#dbdad7,-5px_-5px_10px_#ffffff] z-40 fixed top-0 h-20">
        <div className="font-headline-lg-mobile text-headline-lg-mobile font-bold text-primary">
          Pokégear Audio
        </div>
        <div className="flex gap-4">
          <button className="w-10 h-10 rounded-full flex items-center justify-center text-primary neu-outer active:neu-inner transition-all">
            <span className="material-symbols-outlined">settings</span>
          </button>
          {!token ? (
            <button className="w-10 h-10 rounded-full flex items-center justify-center text-primary neu-outer active:neu-inner transition-all" onClick={() => window.location.href = `${API}/auth/login`}>
              <span className="material-symbols-outlined">link</span>
            </button>
          ) : (
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-primary neu-inner bg-surface">
              <span className="material-symbols-outlined" style={{ color: isReady ? 'var(--color-secondary)' : '#f59e0b' }}>{isReady ? 'check_circle' : 'hourglass_empty'}</span>
            </div>
          )}
        </div>
      </header>

      {/* ── Top App Bar (Desktop) ── */}
      <header className="hidden md:flex bg-surface w-full px-margin-desktop py-4 justify-between items-center z-40 fixed top-0 h-24 shadow-[5px_5px_10px_#dbdad7,-5px_-5px_10px_#ffffff]">
        <div className="font-headline-lg text-headline-lg font-bold text-primary">
          Pokégear Audio
        </div>
        <div className="flex gap-4 items-center">
          <div className="mr-4 text-sm font-bold flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isReady ? 'bg-secondary' : 'bg-orange-400'} shadow-[0_0_8px_currentColor]`} />
            <span className={isReady ? 'text-secondary' : 'text-orange-400'}>{isReady ? 'Pokégear Synced' : (token ? 'Connecting...' : 'Disconnected')}</span>
          </div>
          {!token && (
             <button className="px-6 py-2 rounded-full font-label-sm text-label-sm bg-surface text-on-surface neu-outer hover:opacity-80 transition-all active:neu-inner" onClick={() => window.location.href = `${API}/auth/login`}>
               Connect Spotify
             </button>
          )}
          <button className="w-12 h-12 rounded-full flex items-center justify-center text-primary neu-outer hover:opacity-80 transition-opacity active:neu-inner">
            <span className="material-symbols-outlined text-2xl">settings</span>
          </button>
          <button className="w-12 h-12 rounded-full flex items-center justify-center text-primary neu-outer hover:opacity-80 transition-opacity active:neu-inner">
            <span className="material-symbols-outlined text-2xl">account_circle</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 pt-20 md:pt-24 pb-32 h-full">
        {/* ── Side Navigation (Desktop) ── */}
        <aside className="hidden md:flex flex-col h-full w-64 left-0 top-0 bg-surface p-card-padding gap-base shadow-[5px_0_10px_#dbdad7] z-30 fixed mt-24">
          <div className="flex flex-col items-center mb-8 gap-4">
            <div className="w-24 h-24 rounded-full neu-outer p-1 flex items-center justify-center bg-surface">
              <img
                className="w-full h-full rounded-full object-cover"
                alt="Trainer Red"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDmaC-VD2KgeKGwFvOgrdu0Rf89k3xzriiRh5CCile2ngBtwL-yGmAyJYyFKTItdO7zpwkh8OROL52NJ1GFsj-xNPcJyzJUg8HsSp2jfKxnQKfdlPEIxs0Wq9NhL_usOoVr9zwDPssKErotDfefSjrPXEuZZJLuyGa76jgYlN34BYX2IT_FNOy9nyVqEkaSEWw7zuTl-ZqUMVWO73pXEcp9MJHW2ZalBypE_zoveAjGJqKB8Tx6Qqdx"
              />
            </div>
            <div className="text-center">
              <h2 className="font-headline-md text-headline-md text-primary">Trainer Red</h2>
              <p className="font-body-md text-on-surface-variant">Elite Collector</p>
            </div>
            <button className="mt-4 px-6 py-2 rounded-full font-label-sm text-label-sm bg-primary text-on-primary shadow-[5px_5px_10px_#dbdad7,-5px_-5px_10px_#ffffff] hover:opacity-80 transition-all active:shadow-[inset_5px_5px_10px_#864e5a33]" onClick={loadCatalog}>
              Sync Gear
            </button>
          </div>

          <nav className="flex flex-col gap-2 flex-grow relative">
            <div className="absolute left-6 top-4 bottom-4 w-1 bg-surface-dim rounded-full neu-inner opacity-50 z-0"></div>
            
            <button 
              className={`relative z-10 flex items-center gap-4 p-4 rounded-xl font-body-lg text-body-lg transition-colors active:scale-95 duration-200 w-full text-left bg-surface ${page === 'dashboard' ? 'text-primary font-bold neu-outer' : 'text-on-surface-variant hover:bg-surface-container-low'}`}
              onClick={() => setPage('dashboard')}
            >
              <span className={`material-symbols-outlined bg-surface rounded-full p-2 ${page === 'dashboard' ? 'neu-inner text-primary' : 'neu-outer'}`}>radar</span>
              <span>Live Radar</span>
            </button>
            
            <button 
              className={`relative z-10 flex items-center gap-4 p-4 rounded-xl font-body-lg text-body-lg transition-colors active:scale-95 duration-200 w-full text-left bg-surface ${page === 'musicdex' ? 'text-secondary font-bold border-r-4 border-secondary neu-outer' : 'text-on-surface-variant hover:bg-surface-container-low'}`}
              onClick={() => setPage('musicdex')}
            >
              <span className={`material-symbols-outlined bg-surface rounded-full p-2 ${page === 'musicdex' ? 'neu-inner text-secondary' : 'neu-outer'}`}>style</span>
              <span>The Music Dex</span>
            </button>
          </nav>
        </aside>

        {/* ── Main Content Canvas ── */}
        <main className="flex-1 px-margin-mobile md:px-margin-desktop md:ml-64 overflow-y-auto w-full">
          <div className="max-w-5xl mx-auto flex flex-col gap-8 pb-12 pt-4">
            
            {/* ── DASHBOARD ── */}
            {page === 'dashboard' && (
              <>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h1 className="font-headline-lg text-headline-lg text-on-surface">Live Radar</h1>
                    {resolvedLocation && (
                      <p className="text-on-surface-variant font-bold text-sm mt-1">📍 {resolvedLocation}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <button className="px-6 py-2 rounded-full neu-outer flex items-center gap-2 text-on-surface-variant hover:opacity-80 active:neu-inner transition-all" onClick={() => simulateLocation(40.7588, -73.9851)} disabled={isFetching}>
                      <span className="material-symbols-outlined">location_city</span> Times Sq.
                    </button>
                    <button className="px-6 py-2 rounded-full neu-outer flex items-center gap-2 text-on-surface-variant hover:opacity-80 active:neu-inner transition-all" onClick={() => simulateLocation(44.4280, -110.5885)} disabled={isFetching}>
                      <span className="material-symbols-outlined">park</span> Yellowstone
                    </button>
                    <button className="px-6 py-2 rounded-full neu-outer flex items-center gap-2 text-on-surface-variant hover:opacity-80 active:neu-inner transition-all" onClick={() => simulateLocation(25.7617, -80.1918)} disabled={isFetching}>
                      <span className="material-symbols-outlined">beach_access</span> Miami
                    </button>
                  </div>
                </div>

                {/* 3D Diorama Container */}
                <div className="w-full rounded-xl neu-outer bg-surface p-4 flex flex-col items-center overflow-hidden relative">
                  <div className="glass-highlight"></div>
                  <div className="w-full aspect-[16/9] md:aspect-[21/9] rounded-lg overflow-hidden neu-inner relative">
                    <img
                      alt="Location Diorama"
                      className="w-full h-full object-cover transition-all duration-500"
                      style={{ filter: isFetching ? 'brightness(0.5)' : 'none' }}
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuAtBI2HEg9XHXgY5-7r1X36NdH5YCTT6HhOnl-gIY8glSEStnEtercrZPQ0dsuwFsCVrgyZQopfEeELuQS_MScPXHmSPpTVjT0yCGcDyq9xm1C8Gbz-2DWov4n0i0ixZwlOf0cMUWTv5sUhKssyov9-59cmD_ZXwdU24lakZYocdSSPCLRH7OBZ9GBPy0m8akWEJjaD4fKELAUxxUNt3JIuAyhMTVeB-JkGG6j4vPB-qbXN-cE8v_eE"
                    />
                    {isFetching && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10">
                        <span className="material-symbols-outlined text-white text-5xl animate-spin">radar</span>
                        <span className="text-white font-bold text-xl">Scanning area…</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-6 mb-2 text-center w-full px-4 relative z-10">
                    <h1 className="font-headline-md text-headline-md text-primary flex items-center justify-center gap-2">
                      {dioramaLabel}
                      <span className="material-symbols-outlined text-secondary">music_note</span>
                    </h1>
                  </div>
                </div>

                {/* Collection Progress Chart */}
                <div className="w-full rounded-xl neu-outer bg-surface p-card-padding flex flex-col gap-6 relative overflow-hidden">
                  <div className="glass-highlight"></div>
                  <h2 className="font-headline-md text-headline-md text-on-surface relative z-10">Collection Progress</h2>
                  
                  <div className="flex flex-col gap-4 relative z-10">
                    <div className="flex items-center justify-between">
                      <span className="font-body-lg text-body-lg text-on-surface-variant flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-secondary"></span> Caught
                      </span>
                      <span className="font-headline-md text-headline-md text-secondary">{caughtCount}</span>
                    </div>
                    <div className="w-full h-8 rounded-full bg-surface neu-inner relative overflow-hidden">
                      <div className="absolute top-0 left-0 h-full bg-secondary rounded-full flex items-center justify-end pr-2 transition-all duration-1000" style={{ width: `${Math.max(caughtPct, 5)}%` }}>
                        <div className="glass-highlight h-full"></div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-4">
                      <span className="font-body-lg text-body-lg text-on-surface-variant flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-primary-container"></span> Seen
                      </span>
                      <span className="font-headline-md text-headline-md text-primary-container text-opacity-80">{seenCount}</span>
                    </div>
                    <div className="w-full h-8 rounded-full bg-surface neu-inner relative overflow-hidden">
                      <div className="absolute top-0 left-0 h-full bg-primary-container rounded-full flex items-center justify-end pr-2 opacity-80 transition-all duration-1000" style={{ width: '100%' }}>
                        <div className="glass-highlight h-full"></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recommendations */}
                {recommendations.length > 0 && (
                  <div className="flex flex-col gap-6">
                    <h2 className="font-headline-md text-headline-md text-on-surface flex items-center gap-3">
                      🎵 Wild Tracks Appeared!
                      <span className="text-sm font-bold text-on-surface-variant uppercase tracking-wider bg-surface-container px-3 py-1 rounded-full neu-inner">
                        {resolvedEnv}
                      </span>
                    </h2>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-gutter">
                      {recommendations.map((rec, i) => {
                        const meta = rec.spotify_id ? spotifyMeta[rec.spotify_id] : null;
                        const artUrl = meta?.album_art;
                        const fallbackColor = FALLBACK_COLORS[i % FALLBACK_COLORS.length];
                        const canPlay = rec.spotify_id && isReady;

                        return (
                          <div 
                            key={rec.track_id} 
                            className={`neu-outer rounded-xl p-4 flex flex-col gap-4 group transition-opacity ${canPlay ? 'cursor-pointer hover:opacity-90' : 'opacity-70 cursor-not-allowed'}`}
                            onClick={() => canPlay && playTrack(rec.spotify_id!)}
                          >
                            <div className="aspect-square rounded-xl overflow-hidden neu-inner relative bg-surface-container">
                              {artUrl ? (
                                <img src={artUrl} alt={rec.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                              ) : (
                                <div className={`w-full h-full ${fallbackColor} flex items-center justify-center group-hover:scale-105 transition-transform duration-500`}>
                                  <span className="material-symbols-outlined text-white text-5xl opacity-80" style={{ fontVariationSettings: "'FILL' 1" }}>music_note</span>
                                </div>
                              )}
                              
                              {canPlay && (
                                <div className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md">
                                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
                                </div>
                              )}
                              
                              <div className="absolute top-2 left-2 bg-primary text-white rounded-full text-xs font-bold px-2 py-1 shadow-sm">
                                #{rec.rank}
                              </div>
                            </div>
                            <div>
                              <h3 className="font-body-lg text-body-lg text-on-surface truncate">{rec.title}</h3>
                              <p className="font-label-sm text-label-sm text-on-surface-variant truncate">{meta?.artist || rec.artist}</p>
                              {rec.score && (
                                <p className="text-xs font-bold text-secondary mt-1">{(rec.score * 100).toFixed(0)}% match</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {recommendations.length === 0 && !isFetching && (
                   <div className="text-center py-16 neu-outer rounded-xl bg-surface">
                     <span className="material-symbols-outlined text-6xl text-surface-dim mb-4">explore</span>
                     <p className="font-headline-md text-on-surface-variant">Pick a location to discover wild tracks!</p>
                   </div>
                )}
              </>
            )}

            {/* ── MUSIC DEX ── */}
            {page === 'musicdex' && (
              <>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
                  <h1 className="font-headline-lg text-headline-lg text-on-surface">The Music Dex</h1>
                  <div className="flex gap-4">
                    <div className="px-6 py-3 rounded-full neu-inner flex items-center gap-2 text-primary font-bold">
                      {caughtCount} / {seenCount} Caught
                    </div>
                  </div>
                </div>

                {catalogLoading ? (
                  <div className="text-center py-24">
                    <span className="material-symbols-outlined text-6xl text-primary animate-spin mb-4">radar</span>
                    <p className="font-headline-md text-on-surface">Loading Music Dex...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-gutter">
                    {catalog.map((track, i) => {
                      const meta = track.spotify_id ? spotifyMeta[track.spotify_id] : null;
                      const artUrl = meta?.album_art;
                      const fallbackColor = FALLBACK_COLORS[i % FALLBACK_COLORS.length];
                      const discovered = !!track.spotify_id;
                      const canPlay = discovered && isReady;

                      return (
                        <div 
                          key={track.track_id}
                          className={`neu-outer rounded-xl p-4 flex flex-col gap-4 group transition-opacity ${discovered ? 'hover:opacity-90' : 'opacity-70'} ${canPlay ? 'cursor-pointer' : ''}`}
                          onClick={() => canPlay && playTrack(track.spotify_id!)}
                        >
                          <div className="aspect-square rounded-xl overflow-hidden neu-inner relative bg-surface-container flex items-center justify-center">
                            {discovered ? (
                              artUrl ? (
                                <img src={artUrl} alt={track.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                              ) : (
                                <div className={`w-full h-full ${fallbackColor} flex items-center justify-center group-hover:scale-105 transition-transform duration-500`}>
                                  <span className="material-symbols-outlined text-white text-5xl opacity-80" style={{ fontVariationSettings: "'FILL' 1" }}>music_note</span>
                                </div>
                              )
                            ) : (
                              <>
                                <span className="material-symbols-outlined absolute text-surface-tint text-5xl opacity-30">lock</span>
                              </>
                            )}
                            
                            {canPlay && (
                              <div className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md">
                                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
                              </div>
                            )}
                          </div>
                          <div>
                            <h3 className={`font-body-lg text-body-lg truncate ${discovered ? 'text-on-surface' : 'text-on-surface-variant'}`}>{discovered ? track.title : '???'}</h3>
                            <p className={`font-label-sm text-label-sm truncate ${discovered ? 'text-on-surface-variant' : 'text-surface-tint'}`}>{discovered ? (meta?.artist || track.artist) : '???'}</p>
                            {discovered && track.environment_tags.length > 0 && (
                              <p className="text-xs font-bold text-tertiary mt-1 capitalize">{track.environment_tags.slice(0, 2).join(' · ')}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
            
          </div>
        </main>
      </div>

      {/* ── Bottom Nav Bar (Player Shell) ── */}
      <nav className="fixed bottom-0 w-full z-50 h-32 md:h-36 rounded-t-xl bg-surface shadow-[0_-5px_10px_#dbdad7] md:w-[calc(100%-16rem)] md:left-64 px-margin-mobile md:px-margin-desktop py-4 flex flex-col items-center justify-center gap-4">
        {/* Progress Bar */}
        <div className="w-full max-w-2xl h-3 md:h-4 bg-surface-container rounded-full neu-inner overflow-hidden relative">
          <div className="h-full bg-primary rounded-full relative transition-all duration-100" style={{ width: `${progressPct}%` }}>
            <div className="absolute top-0 left-0 w-full h-1/2 bg-white opacity-20 rounded-t-full"></div>
          </div>
        </div>
        
        <div className="flex items-center justify-center gap-8 w-full relative">
          
          {/* Now Playing Info (Desktop Only) */}
          <div className="hidden md:flex absolute left-0 items-center gap-4 w-64">
             {currentTrack ? (
               <>
                 {currentTrack.album.images[0]?.url && (
                   <img src={currentTrack.album.images[0].url} alt="Cover" className="w-14 h-14 rounded-full neu-outer border-2 border-surface object-cover" />
                 )}
                 <div className="overflow-hidden">
                   <div className="font-bold text-on-surface truncate">{currentTrack.name}</div>
                   <div className="text-sm font-semibold text-on-surface-variant truncate">{currentTrack.artists.map(a => a.name).join(', ')}</div>
                 </div>
               </>
             ) : (
               <div className="text-sm font-bold text-on-surface-variant">
                 {token ? (isReady ? 'Ready to play' : 'Connecting...') : 'Not connected'}
               </div>
             )}
          </div>

          {/* Controls */}
          <button className="w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center text-on-surface-variant neu-outer hover:shadow-none active:neu-inner transition-all duration-150" onClick={() => player?.previousTrack()}>
            <span className="material-symbols-outlined text-2xl md:text-3xl">skip_previous</span>
          </button>
          
          <button className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center bg-primary-container text-on-primary-container shadow-[inset_5px_5px_10px_#864e5a33] hover:opacity-90 active:neu-inner transition-all duration-150" onClick={() => player?.togglePlay()}>
            <span className="material-symbols-outlined" style={{ fontSize: '36px', fontVariationSettings: "'FILL' 1" }}>
              {isPlaying ? 'pause' : 'play_arrow'}
            </span>
          </button>
          
          <button className="w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center text-on-surface-variant neu-outer hover:shadow-none active:neu-inner transition-all duration-150" onClick={() => player?.nextTrack()}>
            <span className="material-symbols-outlined text-2xl md:text-3xl">skip_next</span>
          </button>
          
          {/* Timestamp (Desktop Only) */}
          <div className="hidden md:flex absolute right-0 font-bold text-on-surface-variant">
            {currentTrack ? `${fmtTime(playbackState!.position)} / ${fmtTime(playbackState!.duration)}` : '--:-- / --:--'}
          </div>
        </div>
      </nav>
    </div>
  );
}
