import React, { useState, useEffect } from 'react';
import { Home, Compass, Library, Play, Pause, SkipBack, SkipForward, MapPin, Search, LogIn } from 'lucide-react';
import { useSpotifyPlayer } from './hooks/useSpotifyPlayer';
import './App.css';

// Mock data to use until backend is connected
const MOCK_TRACKS = [
  { id: '1', title: 'Forest Whispers', artist: 'Aether Sounds', albumArt: '/pokemon_album_1.jpg' },
  { id: '2', title: 'Neon Nights', artist: 'Pocket Beats', albumArt: '/pokemon_album_2.jpg' },
  { id: '3', title: 'Tranquil Tide', artist: 'Oceanic', albumArt: '/pokemon_album_3.jpg' },
  { id: '4', title: 'Pallet Town', artist: 'Game Freak', albumArt: '/pokemon_album_1.jpg' },
  { id: '5', title: 'Surfing Theme', artist: 'Game Freak', albumArt: '/pokemon_album_3.jpg' },
  { id: '6', title: 'Gym Battle', artist: 'Game Freak', albumArt: '/pokemon_album_2.jpg' },
];

function App() {
  const [token, setToken] = useState<string | null>(null);
  const { player, isReady, deviceId, playbackState } = useSpotifyPlayer(token);

  useEffect(() => {
    // Check local storage for token first
    const storedToken = localStorage.getItem('spotify_access_token');
    
    // Check URL hash for token
    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get('access_token');
      if (accessToken) {
        setToken(accessToken);
        localStorage.setItem('spotify_access_token', accessToken);
        window.history.replaceState(null, '', window.location.pathname);
      }
    } else if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  const handleLogin = () => {
    window.location.href = 'http://127.0.0.1:8000/auth/login';
  };

  const currentTrack = playbackState?.track_window.current_track;
  const isPlaying = !playbackState?.paused;

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar glass-panel">
        <div className="app-logo">
          <MapPin size={28} />
          Overworld
        </div>
        
        <ul className="nav-links">
          <li className="active">
            <Home size={20} />
            Home
          </li>
          <li>
            <Search size={20} />
            Search
          </li>
          <li>
            <Compass size={20} />
            Discover
          </li>
          <li>
            <Library size={20} />
            Your Library
          </li>
        </ul>

        <div style={{ marginTop: 'auto', padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {!token ? (
            <button className="control-btn" onClick={handleLogin} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 15px', borderRadius: '8px', backgroundColor: '#1DB954', color: 'white', fontWeight: 'bold' }}>
              <LogIn size={20} />
              Connect Spotify
            </button>
          ) : (
             <div style={{ fontSize: '14px', color: '#1DB954', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#1DB954' }}></div>
                {isReady ? 'Spotify Connected' : 'Connecting to Spotify...'}
             </div>
          )}
        </div>

        {/* Current Environment Widget */}
        <div className="location-widget">
          <div className="location-title">Current Environment</div>
          <div className="location-value">
            <MapPin size={16} />
            Mystic Forest
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <div className="header-section">
          <h1 className="header-title">Good Evening</h1>
          <p className="header-subtitle">Music adapted for your current surroundings.</p>
        </div>

        <h2 style={{ marginBottom: '24px', fontSize: '20px' }}>Recommended for you</h2>
        
        <div className="tracks-grid">
          {MOCK_TRACKS.map((track) => (
            <div key={track.id} className="track-card glass-card">
              <div className="track-image-container">
                <img src={track.albumArt} alt={track.title} className="track-image" />
                <div className="play-overlay">
                  <Play fill="white" size={20} />
                </div>
              </div>
              <h3 className="track-title">{track.title}</h3>
              <p className="track-artist">{track.artist}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Bottom Player Bar */}
      <footer className="player-bar glass-panel">
        <div className="player-left">
          {currentTrack ? (
             <img src={currentTrack.album.images[0]?.url || "/pokemon_album_1.jpg"} alt="Now Playing" className="now-playing-img" />
          ) : (
             <div className="now-playing-img" style={{ backgroundColor: '#2a2a2a' }}></div>
          )}
          <div className="now-playing-info">
            <div className="now-playing-title">{currentTrack?.name || 'Nothing playing'}</div>
            <div className="now-playing-artist">{currentTrack?.artists.map(a => a.name).join(', ') || 'Select a track'}</div>
          </div>
        </div>

        <div className="player-center">
          <div className="controls">
            <button className="control-btn" onClick={() => player?.previousTrack()}><SkipBack size={20} fill="currentColor" /></button>
            <button className="control-btn play-btn" onClick={() => player?.togglePlay()}>
              {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
            </button>
            <button className="control-btn" onClick={() => player?.nextTrack()}><SkipForward size={20} fill="currentColor" /></button>
          </div>
          <div className="progress-bar-container">
            <span>{currentTrack ? Math.floor(playbackState.position / 60000) + ":" + ((Math.floor(playbackState.position / 1000) % 60) < 10 ? "0" : "") + (Math.floor(playbackState.position / 1000) % 60) : "0:00"}</span>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: currentTrack && playbackState ? `${(playbackState.position / playbackState.duration) * 100}%` : '0%' }}></div>
            </div>
            <span>{currentTrack ? Math.floor(playbackState.duration / 60000) + ":" + ((Math.floor(playbackState.duration / 1000) % 60) < 10 ? "0" : "") + (Math.floor(playbackState.duration / 1000) % 60) : "0:00"}</span>
          </div>
        </div>

        <div className="player-right">
          {/* Add volume controls here later */}
        </div>
      </footer>
    </div>
  );
}

export default App;
