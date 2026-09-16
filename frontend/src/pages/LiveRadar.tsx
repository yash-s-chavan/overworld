import { MapPin, Target, Compass, Play } from 'lucide-react';
import type { RecommendationItem, SpotifyTrackMeta } from '../types';

interface LiveRadarProps {
  isFetching: boolean;
  resolvedLocation: string;
  resolvedEnv: string;
  recommendations: RecommendationItem[];
  spotifyMeta: Record<string, SpotifyTrackMeta>;
  isReady: boolean;
  simulateLocation: (lat: number, lon: number) => void;
  playTrack: (id: string) => void;
  caughtCount: number;
  seenCount: number;
}

const FALLBACK_COLORS = ['bg-[#ffb7c5]', 'bg-[#aeedd5]', 'bg-[#a2d2e2]', 'bg-[#ffd9df]', 'bg-[#b1efd8]'];

export function LiveRadar({
  isFetching, resolvedLocation, resolvedEnv, recommendations, 
  spotifyMeta, isReady, simulateLocation, playTrack, caughtCount, seenCount
}: LiveRadarProps) {
  
  const caughtPct = seenCount > 0 ? (caughtCount / seenCount) * 100 : 0;

  return (
    <div className="flex flex-col gap-8">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="font-display text-3xl font-bold text-[#2f3542]">Live Radar</h2>
          <div className="flex items-center gap-2 mt-2 text-[#747d8c] font-medium">
            <Compass size={18} className={isFetching ? 'animate-spin text-[#ff4757]' : ''} />
            <span>{resolvedLocation || 'Awaiting location signal...'}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={() => simulateLocation(40.7588, -73.9851)}
            disabled={isFetching}
            className="px-4 py-2 bg-white rounded-lg shadow-sm border border-[#dfe4ea] text-[#2f3542] hover:bg-[#f8f9fa] hover:border-[#ff4757] transition-all font-medium text-sm disabled:opacity-50 flex items-center gap-2"
          >
            <MapPin size={16} /> Times Sq.
          </button>
          <button 
            onClick={() => simulateLocation(44.4280, -110.5885)}
            disabled={isFetching}
            className="px-4 py-2 bg-white rounded-lg shadow-sm border border-[#dfe4ea] text-[#2f3542] hover:bg-[#f8f9fa] hover:border-[#2ed573] transition-all font-medium text-sm disabled:opacity-50 flex items-center gap-2"
          >
            <MapPin size={16} /> Yellowstone
          </button>
          <button 
            onClick={() => simulateLocation(25.7617, -80.1918)}
            disabled={isFetching}
            className="px-4 py-2 bg-white rounded-lg shadow-sm border border-[#dfe4ea] text-[#2f3542] hover:bg-[#f8f9fa] hover:border-[#3742fa] transition-all font-medium text-sm disabled:opacity-50 flex items-center gap-2"
          >
            <MapPin size={16} /> Miami Beach
          </button>
        </div>
      </div>

      {/* Main Radar Display & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Radar Map Diorama */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-4 shadow-sm border border-[#dfe4ea] relative overflow-hidden group">
          <div className="aspect-[21/9] rounded-xl overflow-hidden relative bg-[#2f3542]">
            <img
              alt="Diorama"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAtBI2HEg9XHXgY5-7r1X36NdH5YCTT6HhOnl-gIY8glSEStnEtercrZPQ0dsuwFsCVrgyZQopfEeELuQS_MScPXHmSPpTVjT0yCGcDyq9xm1C8Gbz-2DWov4n0i0ixZwlOf0cMUWTv5sUhKssyov9-59cmD_ZXwdU24lakZYocdSSPCLRH7OBZ9GBPy0m8akWEJjaD4fKELAUxxUNt3JIuAyhMTVeB-JkGG6j4vPB-qbXN-cE8v_eE"
              className={`w-full h-full object-cover transition-all duration-700 ${isFetching ? 'scale-110 opacity-40 blur-sm' : 'opacity-90'}`}
            />
            {isFetching && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-10">
                <Target size={48} className="animate-ping text-[#ff4757] mb-4" />
                <span className="font-display font-bold text-xl tracking-wider">SCANNING AREA</span>
              </div>
            )}
            {!isFetching && resolvedEnv && (
              <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-md px-4 py-2 rounded-lg shadow-lg">
                <span className="font-display font-bold text-[#ff4757] uppercase tracking-wider text-sm flex items-center gap-2">
                  <Target size={16} /> {resolvedEnv} Zone
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Progress Stats */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#dfe4ea] flex flex-col justify-center gap-6">
          <h3 className="font-display font-bold text-xl text-[#2f3542]">Dex Progress</h3>
          
          <div className="space-y-2">
            <div className="flex justify-between items-end">
              <span className="text-sm font-medium text-[#747d8c]">Discovered</span>
              <span className="font-display font-bold text-2xl text-[#2ed573]">{caughtCount}</span>
            </div>
            <div className="h-3 bg-[#f1f2f6] rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#2ed573] transition-all duration-1000 ease-out" 
                style={{ width: `${Math.max(caughtPct, 2)}%` }} 
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-end">
              <span className="text-sm font-medium text-[#747d8c]">Total Known</span>
              <span className="font-display font-bold text-2xl text-[#2f3542]">{seenCount}</span>
            </div>
            <div className="h-3 bg-[#f1f2f6] rounded-full overflow-hidden">
              <div className="h-full bg-[#2f3542] w-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations Grid */}
      {recommendations.length > 0 ? (
        <div className="mt-4">
          <h3 className="font-display text-2xl font-bold text-[#2f3542] mb-6 flex items-center gap-2">
            Wild Tracks Appeared!
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {recommendations.map((rec, i) => {
              const meta = rec.spotify_id ? spotifyMeta[rec.spotify_id] : null;
              const artUrl = meta?.album_art;
              const fallbackColor = FALLBACK_COLORS[i % FALLBACK_COLORS.length];
              const canPlay = rec.spotify_id && isReady;

              return (
                <div 
                  key={rec.track_id}
                  onClick={() => canPlay && playTrack(rec.spotify_id!)}
                  className={`bg-white rounded-2xl p-4 shadow-sm border border-[#dfe4ea] transition-all group ${canPlay ? 'cursor-pointer hover:shadow-md hover:border-[#ff4757] hover:-translate-y-1' : 'opacity-70 cursor-not-allowed'}`}
                >
                  <div className={`aspect-square rounded-xl mb-4 overflow-hidden relative ${!artUrl ? fallbackColor : ''} flex items-center justify-center`}>
                    {artUrl ? (
                      <img src={artUrl} alt={rec.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <Play size={32} className="text-white/50" />
                    )}
                    
                    <div className="absolute top-2 left-2 bg-[#ff4757] text-white text-xs font-bold px-2 py-1 rounded-md shadow-sm">
                      #{rec.rank}
                    </div>

                    {canPlay && (
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                        <div className="w-12 h-12 bg-[#ff4757] rounded-full flex items-center justify-center text-white shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                          <Play size={24} className="fill-current ml-1" />
                        </div>
                      </div>
                    )}
                  </div>
                  <h4 className="font-display font-semibold text-[#2f3542] truncate">{rec.title}</h4>
                  <p className="text-sm text-[#747d8c] truncate mt-0.5">{meta?.artist || rec.artist}</p>
                  {rec.score && (
                    <p className="text-xs font-bold text-[#2ed573] mt-2 bg-[#2ed573]/10 w-fit px-2 py-1 rounded-md">
                      {(rec.score * 100).toFixed(0)}% Match
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : !isFetching ? (
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center bg-white rounded-2xl border border-[#dfe4ea] border-dashed">
          <MapPin size={48} className="text-[#dfe4ea] mb-4" />
          <h3 className="font-display text-xl font-bold text-[#747d8c]">No Tracks Found</h3>
          <p className="text-[#747d8c] mt-2">Pick a location on the radar to discover tracks.</p>
        </div>
      ) : null}
    </div>
  );
}
