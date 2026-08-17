import { useState, useEffect, useRef } from 'react';

export function useSpotifyPlayer(token: string | null) {
  const [player, setPlayer] = useState<Spotify.Player | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [playbackState, setPlaybackState] = useState<Spotify.PlaybackState | null>(null);
  
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!token || hasInitialized.current) return;
    
    // Add the Spotify Web Playback SDK script to the document
    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;
    document.body.appendChild(script);

    window.onSpotifyWebPlaybackSDKReady = () => {
      const playerInstance = new window.Spotify.Player({
        name: 'Overworld Contextual Engine',
        getOAuthToken: (cb) => { cb(token); },
        volume: 0.5
      });

      playerInstance.addListener('ready', ({ device_id }) => {
        console.log('Ready with Device ID', device_id);
        setIsReady(true);
        setDeviceId(device_id);
      });

      playerInstance.addListener('not_ready', ({ device_id }) => {
        console.log('Device ID has gone offline', device_id);
        setIsReady(false);
      });

      playerInstance.addListener('player_state_changed', (state) => {
        if (!state) return;
        setPlaybackState(state);
      });
      
      playerInstance.addListener('initialization_error', ({ message }) => {
        console.error('Initialization Error:', message);
      });

      playerInstance.addListener('authentication_error', ({ message }) => {
        console.error('Authentication Error:', message);
      });
      
      playerInstance.addListener('account_error', ({ message }) => {
        console.error('Account Error:', message);
      });

      playerInstance.connect().then(success => {
        if (success) {
          console.log('The Web Playback SDK successfully connected to Spotify!');
        }
      });
      
      setPlayer(playerInstance);
      hasInitialized.current = true;
    };

    return () => {
      if (player) {
        player.disconnect();
      }
    };
  }, [token]);

  return { player, isReady, deviceId, playbackState };
}
