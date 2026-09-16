/// <reference types="spotify-web-playback-sdk" />
import { useState, useEffect, useRef } from 'react';

declare global {
  interface Window {
    Spotify: typeof Spotify;
    onSpotifyWebPlaybackSDKReady: () => void;
  }
}

export function useSpotifyPlayer(token: string | null) {
  const [player, setPlayer] = useState<Spotify.Player | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [playbackState, setPlaybackState] = useState<Spotify.PlaybackState | null>(null);
  
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!token || hasInitialized.current) return;
    
    // Add the Spotify Web Playback SDK script to the document if not present
    if (!document.getElementById('spotify-player-sdk')) {
      const script = document.createElement('script');
      script.id = 'spotify-player-sdk';
      script.src = 'https://sdk.scdn.co/spotify-player.js';
      script.async = true;
      document.body.appendChild(script);
    }

    const initializePlayer = () => {
      const playerInstance = new window.Spotify.Player({
        name: 'Overworld Contextual Engine',
        getOAuthToken: (cb: (token: string) => void) => { cb(token); },
        volume: 0.5
      });

      playerInstance.addListener('ready', ({ device_id }: { device_id: string }) => {
        console.log('Ready with Device ID', device_id);
        setIsReady(true);
        setDeviceId(device_id);
      });

      playerInstance.addListener('not_ready', ({ device_id }: { device_id: string }) => {
        console.log('Device ID has gone offline', device_id);
        setIsReady(false);
      });

      playerInstance.addListener('player_state_changed', (state: Spotify.PlaybackState | null) => {
        if (!state) return;
        setPlaybackState(state);
      });
      
      playerInstance.addListener('initialization_error', ({ message }: { message: string }) => {
        console.error('Initialization Error:', message);
      });

      playerInstance.addListener('authentication_error', ({ message }: { message: string }) => {
        console.error('Authentication Error:', message);
        // Clear invalid token
        localStorage.removeItem('spotify_access_token');
        window.location.reload();
      });
      
      playerInstance.addListener('account_error', ({ message }: { message: string }) => {
        console.error('Account Error:', message);
        alert('Spotify Premium is required for Web Playback SDK.');
      });

      playerInstance.connect().then((success: boolean) => {
        if (success) {
          console.log('The Web Playback SDK successfully connected to Spotify!');
        }
      });
      
      setPlayer(playerInstance);
      hasInitialized.current = true;
    };

    if (window.Spotify) {
      initializePlayer();
    } else {
      window.onSpotifyWebPlaybackSDKReady = initializePlayer;
    }

    return () => {
      if (player) {
        player.disconnect();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return { player, isReady, deviceId, playbackState };
}

