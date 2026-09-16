import { useState, useEffect, useCallback } from 'react';
import { useSpotifyPlayer } from './hooks/useSpotifyPlayer';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Player } from './components/Player';
import { LiveRadar } from './pages/LiveRadar';
import { MusicDex } from './pages/MusicDex';
import type { CatalogTrack, RecommendationItem, SpotifyTrackMeta } from './types';
import './index.css';

const API = 'http://127.0.0.1:8000';

type Page = 'dashboard' | 'musicdex';

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const { player, isReady, deviceId, playbackState } = useSpotifyPlayer(token);
  const [page, setPage] = useState<Page>('dashboard');

  // Catalog State
  const [catalog, setCatalog] = useState<CatalogTrack[]>([]);
  const [spotifyMeta, setSpotifyMeta] = useState<Record<string, SpotifyTrackMeta>>({});
  const [catalogLoading, setCatalogLoading] = useState(true);

  // Dashboard State
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [resolvedEnv, setResolvedEnv] = useState<string>('');
  const [resolvedLocation, setResolvedLocation] = useState<string>('');
  const [isFetching, setIsFetching] = useState(false);

  // Auth Handling
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

  // Load Catalog
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

  // Playback
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

  // Location Simulation
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

  // Derived State
  const caughtCount = catalog.filter(t => t.spotify_id).length;
  const seenCount = catalog.length;

  return (
    <div className="min-h-screen bg-[#f1f2f6] text-[#2f3542] font-sans flex flex-col selection:bg-[#ff4757] selection:text-white">
      <Header token={token} isReady={isReady} API={API} />
      
      <div className="flex flex-1 pt-[72px] md:pt-0 pb-24 md:pb-24">
        <Sidebar 
          page={page} 
          setPage={setPage} 
          token={token} 
          loadCatalog={loadCatalog}
          API={API}
        />
        
        <main className="flex-1 px-4 md:px-8 md:ml-72 w-full pt-8 pb-12 overflow-y-auto">
          <div className="max-w-6xl mx-auto">
            {page === 'dashboard' ? (
              <LiveRadar 
                isFetching={isFetching}
                resolvedLocation={resolvedLocation}
                resolvedEnv={resolvedEnv}
                recommendations={recommendations}
                spotifyMeta={spotifyMeta}
                isReady={isReady}
                simulateLocation={simulateLocation}
                playTrack={playTrack}
                caughtCount={caughtCount}
                seenCount={seenCount}
              />
            ) : (
              <MusicDex 
                catalog={catalog}
                spotifyMeta={spotifyMeta}
                catalogLoading={catalogLoading}
                isReady={isReady}
                playTrack={playTrack}
                caughtCount={caughtCount}
                seenCount={seenCount}
              />
            )}
          </div>
        </main>
      </div>

      <Player 
        player={player} 
        playbackState={playbackState} 
        isReady={isReady} 
        token={token}
      />
    </div>
  );
}
