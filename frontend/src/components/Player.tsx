/// <reference types="spotify-web-playback-sdk" />
import { Play, Pause, SkipBack, SkipForward, Music } from 'lucide-react';

const fmtTime = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
};

interface PlayerProps {
  player: Spotify.Player | null;
  playbackState: Spotify.PlaybackState | null;
  isReady: boolean;
  token: string | null;
}

export function Player({ player, playbackState, isReady, token }: PlayerProps) {
  const currentTrack = playbackState?.track_window.current_track;
  const isPlaying = !playbackState?.paused;
  const progressPct = currentTrack && playbackState
    ? (playbackState.position / playbackState.duration) * 100 : 0;

  return (
    <div className="fixed bottom-0 right-0 w-full md:w-[calc(100%-18rem)] z-50 bg-white/90 backdrop-blur-xl border-t border-[#dfe4ea] shadow-lg">
      <div className="absolute top-0 left-0 w-full h-1 bg-[#f1f2f6]">
        <div 
          className="h-full bg-[#ff4757] transition-all duration-300 ease-out"
          style={{ width: `${progressPct}%` }}
        />
      </div>
      
      <div className="flex items-center justify-between px-6 py-4 h-24">
        {/* Track Info */}
        <div className="flex items-center gap-4 w-1/3 min-w-[200px]">
          {currentTrack ? (
            <>
              {currentTrack.album.images[0]?.url ? (
                <img 
                  src={currentTrack.album.images[0].url} 
                  alt="Cover" 
                  className="w-14 h-14 rounded-lg shadow-sm object-cover"
                />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-[#f1f2f6] flex items-center justify-center text-[#747d8c]">
                  <Music size={24} />
                </div>
              )}
              <div className="overflow-hidden">
                <div className="font-semibold text-[#2f3542] truncate font-display">{currentTrack.name}</div>
                <div className="text-sm text-[#747d8c] truncate">{currentTrack.artists.map((a: any) => a.name).join(', ')}</div>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-lg bg-[#f1f2f6] flex items-center justify-center text-[#dfe4ea]">
                <Music size={24} />
              </div>
              <div className="text-sm font-medium text-[#747d8c]">
                {token ? (isReady ? 'Ready to play' : 'Connecting Device...') : 'Not connected'}
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-col items-center flex-1">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => player?.previousTrack()}
              className="text-[#747d8c] hover:text-[#2f3542] transition-colors"
            >
              <SkipBack size={24} />
            </button>
            <button 
              onClick={() => player?.togglePlay()}
              className="w-12 h-12 rounded-full bg-[#2f3542] text-white flex items-center justify-center shadow-md hover:bg-[#ff4757] hover:scale-105 transition-all"
            >
              {isPlaying ? <Pause size={24} className="fill-current" /> : <Play size={24} className="fill-current ml-1" />}
            </button>
            <button 
              onClick={() => player?.nextTrack()}
              className="text-[#747d8c] hover:text-[#2f3542] transition-colors"
            >
              <SkipForward size={24} />
            </button>
          </div>
        </div>

        {/* Timestamp */}
        <div className="w-1/3 flex justify-end text-sm font-medium text-[#747d8c] tabular-nums">
          {currentTrack ? `${fmtTime(playbackState!.position)} / ${fmtTime(playbackState!.duration)}` : '--:-- / --:--'}
        </div>
      </div>
    </div>
  );
}
