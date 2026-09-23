import { Library, Lock, Play } from 'lucide-react';
import type { CatalogTrack, SpotifyTrackMeta, UserProfile } from '../types';

interface MusicDexProps {
  catalog: CatalogTrack[];
  spotifyMeta: Record<string, SpotifyTrackMeta>;
  catalogLoading: boolean;
  isReady: boolean;
  playTrack: (id: string) => void;
  caughtCount: number;
  seenCount: number;
  userProfile: UserProfile | null;
}

const FALLBACK_COLORS = ['bg-[#ffb7c5]', 'bg-[#aeedd5]', 'bg-[#a2d2e2]', 'bg-[#ffd9df]', 'bg-[#b1efd8]'];

export function MusicDex({
  catalog, spotifyMeta, catalogLoading, isReady, playTrack, caughtCount, seenCount, userProfile
}: MusicDexProps) {
  
  // Create a set of discovered track IDs for fast lookup
  const discoveredTrackIds = new Set(userProfile?.discoveries?.map(d => d.track_id) || []);

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#dfe4ea] pb-6">
        <div>
          <h2 className="font-display text-3xl font-bold text-[#2f3542] flex items-center gap-3">
            <Library className="text-[var(--primary-color)]" size={32} />
            The Music Dex
          </h2>
          <p className="text-[#747d8c] mt-2 font-medium">Your collection of discovered contextual tracks.</p>
        </div>
        <div className="bg-white px-5 py-3 rounded-xl shadow-sm border border-[#dfe4ea] flex items-center gap-4">
          <div className="text-sm font-medium text-[#747d8c]">Completion</div>
          <div className="font-display font-bold text-[var(--primary-color)] text-xl bg-[var(--primary-color)]/10 px-3 py-1 rounded-lg">
            {caughtCount} / {seenCount}
          </div>
        </div>
      </div>

      {catalogLoading ? (
        <div className="flex flex-col items-center justify-center py-32">
          <Library size={48} className="text-[#dfe4ea] animate-pulse mb-4" />
          <h3 className="font-display text-xl font-bold text-[#747d8c]">Loading Dex Data...</h3>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {catalog.map((track, i) => {
            const meta = track.spotify_id ? spotifyMeta[track.spotify_id] : null;
            const artUrl = meta?.album_art;
            const fallbackColor = FALLBACK_COLORS[i % FALLBACK_COLORS.length];
            // Discovered if it's in the backend DB discoveries list
            const discovered = discoveredTrackIds.has(track.track_id);
            // It can only be played if we know its Spotify ID and the player is ready
            const canPlay = discovered && !!track.spotify_id && isReady;

            return (
              <div 
                key={track.track_id}
                onClick={() => canPlay && playTrack(track.spotify_id!)}
                className={`bg-white rounded-2xl p-4 shadow-sm border border-[#dfe4ea] transition-all group ${discovered ? 'hover:shadow-md hover:border-[#2ed573] hover:-translate-y-1' : 'opacity-60 bg-[#f8f9fa]'} ${canPlay ? 'cursor-pointer' : ''}`}
              >
                <div className={`aspect-square rounded-xl mb-4 overflow-hidden relative flex items-center justify-center ${discovered ? (artUrl ? '' : fallbackColor) : 'bg-[#dfe4ea]'}`}>
                  {discovered ? (
                    artUrl ? (
                      <img src={artUrl} alt={track.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <Play size={32} className="text-white/50" />
                    )
                  ) : (
                    <Lock size={32} className="text-[#a4b0be]" />
                  )}
                  
                  {canPlay && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                      <div className="w-12 h-12 bg-[#2ed573] rounded-full flex items-center justify-center text-white shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                        <Play size={24} className="fill-current ml-1" />
                      </div>
                    </div>
                  )}
                </div>

                <h4 className={`font-display font-semibold truncate ${discovered ? 'text-[#2f3542]' : 'text-[#a4b0be]'}`}>
                  {discovered ? track.title : '???'}
                </h4>
                <p className={`text-sm truncate mt-0.5 ${discovered ? 'text-[#747d8c]' : 'text-[#dfe4ea]'}`}>
                  {discovered ? (meta?.artist || track.artist) : '???'}
                </p>
                
                {discovered && track.environment_tags.length > 0 && (
                  <div className="flex gap-1 mt-3 overflow-hidden">
                    {track.environment_tags.slice(0, 2).map(tag => (
                      <span key={tag} className="text-[10px] font-bold uppercase tracking-wider text-[#747d8c] bg-[#f1f2f6] px-2 py-1 rounded-md">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
