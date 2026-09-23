import { useState, useEffect, useCallback } from 'react';
import { useSpotifyPlayer } from './hooks/useSpotifyPlayer';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Player } from './components/Player';
import { LiveRadar } from './pages/LiveRadar';
import { MusicDex } from './pages/MusicDex';
import { Login } from './pages/Login';
import { Onboarding } from './pages/Onboarding';
import { LogIn } from 'lucide-react';
import type { CatalogTrack, RecommendationItem, SpotifyTrackMeta, UserProfile } from './types';
import './index.css';

const API = 'http://127.0.0.1:8000';

type Page = 'dashboard' | 'musicdex';

export default function App() {
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [spotifyToken, setSpotifyToken] = useState<string | null>(null);
  
  const { player, isReady, deviceId, playbackState } = useSpotifyPlayer(spotifyToken);
  
  const [page, setPage] = useState<Page>('dashboard');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

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
    if (userProfile?.theme_color) {
      document.documentElement.style.setProperty('--primary-color', userProfile.theme_color);
    }
  }, [userProfile?.theme_color]);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('spotify_linked=true')) {
      window.history.replaceState(null, '', window.location.pathname);
    }
    const stored = localStorage.getItem('overworld_token');
    if (stored) setSessionToken(stored);
  }, []);

  useEffect(() => {
    if (sessionToken) {
      fetch(`${API}/users/me`, {
        headers: { Authorization: `Bearer ${sessionToken}` }
      })
        .then(res => res.json())
        .then(data => {
          if (!data.detail) {
            setUserProfile(data);
            if (data.spotify_linked) {
              fetch(`${API}/auth/spotify/token`, {
                headers: { Authorization: `Bearer ${sessionToken}` }
              })
                .then(res => res.json())
                .then(tokData => {
                  if (tokData.access_token) {
                    setSpotifyToken(tokData.access_token);
                  }
                });
            }
          } else {
            setSessionToken(null);
            localStorage.removeItem('overworld_token');
          }
        })
        .catch(err => console.error("Failed to fetch user profile", err));
    }
  }, [sessionToken, window.location.hash]); // re-fetch if hash changed (spotify linked)

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
    if (!spotifyToken || !deviceId) return;
    try {
      await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: 'PUT',
        body: JSON.stringify({ uris: [`spotify:track:${spotifyId}`] }),
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${spotifyToken}` },
      });
    } catch (e) { console.error('Failed to play track', e); }
  }, [spotifyToken, deviceId]);

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
      const env = data.resolved_environment || '';
      setResolvedEnv(env);
      setResolvedLocation(data.resolved_location || '');
      const recs: RecommendationItem[] = data.recommendations || [];
      setRecommendations(recs);

      // Register discoveries on the backend
      if (sessionToken && recs.length > 0) {
        for (const rec of recs) {
          fetch(`${API}/users/me/discoveries`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${sessionToken}`
            },
            body: JSON.stringify({ track_id: rec.track_id, environment_tag: env })
          })
          .then(res => res.json())
          .then(newDiscovery => {
            if (!newDiscovery.detail) {
              setUserProfile(prev => {
                if (!prev) return prev;
                // Only add if not already in discoveries
                const exists = prev.discoveries.some((d: any) => d.track_id === newDiscovery.track_id);
                if (exists) return prev;
                return { ...prev, discoveries: [...prev.discoveries, newDiscovery] };
              });
            }
          })
          .catch(err => console.error("Failed to save discovery", err));
        }
      }

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
  }, [spotifyMeta, isReady, playTrack, sessionToken]);

  // Derived State
  const caughtCount = userProfile?.discoveries?.length || 0;
  const seenCount = catalog.length;

  if (!sessionToken) {
    return <Login API={API} setToken={setSessionToken} />;
  }

  if (userProfile && !userProfile.onboarded) {
    return <Onboarding API={API} token={sessionToken} onComplete={() => {
      // Re-fetch profile
      fetch(`${API}/users/me`, {
        headers: { Authorization: `Bearer ${sessionToken}` }
      })
      .then(res => res.json())
      .then(data => setUserProfile(data));
    }} />;
  }

  if (userProfile && !userProfile.spotify_linked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#faf9f6] p-4 md:p-12 font-sans text-[#1a1c1a]">
        <div 
          className="rounded-3xl p-8 md:p-12 relative overflow-hidden flex flex-col items-center max-w-md w-full"
          style={{
            backgroundColor: '#faf9f6',
            boxShadow: '-10px -10px 20px rgba(255, 255, 255, 0.8), 10px 10px 20px rgba(131, 115, 117, 0.15)'
          }}
        >
          <div className="w-24 h-24 mb-8 rounded-full flex items-center justify-center text-[#1db954]" style={{ backgroundColor: '#faf9f6', boxShadow: '-5px -5px 10px rgba(255,255,255,1), 5px 5px 10px rgba(131,115,117,0.2)'}}>
            <div className="w-12 h-12 bg-[#1db954] rounded-xl flex items-center justify-center text-white shadow-md">
               <LogIn size={28} />
            </div>
          </div>
          <h1 className="font-bold text-2xl text-[#2f3542] text-center mb-4">Sync Spotify</h1>
          <p className="text-[#747d8c] text-center mb-8">
            You need to link your Spotify account to use Overworld.
          </p>
          <button
            onClick={() => {
              window.location.href = `${API}/auth/login?session_token=${sessionToken}`;
            }}
            className="w-full h-14 rounded-xl flex items-center justify-center gap-3 font-bold text-lg text-white transition-all duration-200"
            style={{
              backgroundColor: '#1db954',
              boxShadow: '-5px -5px 10px rgba(255, 255, 255, 0.8), 5px 5px 10px rgba(131, 115, 117, 0.2)'
            }}
          >
            Connect Spotify
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f1f2f6] text-[#2f3542] font-sans flex flex-col selection:bg-[var(--primary-color)] selection:text-white">
      <Header token={sessionToken} isReady={isReady} API={API} />
      
      <div className="flex flex-1 pt-[72px] md:pt-0 pb-24 md:pb-24">
        <Sidebar 
          page={page} 
          setPage={setPage} 
          token={sessionToken} 
          loadCatalog={loadCatalog}
          API={API}
          userProfile={userProfile}
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
                userProfile={userProfile}
              />
            )}
          </div>
        </main>
      </div>

      <Player 
        player={player} 
        playbackState={playbackState} 
        isReady={isReady} 
        token={spotifyToken}
      />
    </div>
  );
}
