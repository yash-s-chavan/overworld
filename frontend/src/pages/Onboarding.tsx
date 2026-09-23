import React, { useState, useEffect } from 'react';


export function Onboarding({ API, token, onComplete }: { API: string; token: string; onComplete: () => void }) {
  const [displayName, setDisplayName] = useState('');
  const [favoriteRegion, setFavoriteRegion] = useState('Kanto');
  const [timezone, setTimezone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [favoritePokemon, setFavoritePokemon] = useState('');
  const [themeColor, setThemeColor] = useState('#ff4757');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API}/users/me/onboarding`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          display_name: displayName,
          favorite_region: favoriteRegion,
          timezone,
          avatar_url: avatarUrl,
          favorite_pokemon: favoritePokemon,
          theme_color: themeColor
        })
      });
      if (res.ok) {
        onComplete();
      } else {
        console.error('Failed to submit onboarding data');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#faf9f6] p-4 font-sans text-[#1a1c1a]">
      <div 
        className="rounded-3xl p-8 relative overflow-hidden flex flex-col items-center max-w-md w-full"
        style={{
          backgroundColor: '#faf9f6',
          boxShadow: '-10px -10px 20px rgba(255, 255, 255, 0.8), 10px 10px 20px rgba(131, 115, 117, 0.15)'
        }}
      >
        <h1 className="font-bold text-2xl text-[#2f3542] text-center mb-2">Trainer Registration</h1>
        <p className="text-[#747d8c] text-center mb-6">Customize your Overworld experience</p>
        
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-bold text-[#2f3542] ml-2">Trainer Name</label>
            <input 
              type="text" 
              required
              value={displayName} 
              onChange={e => setDisplayName(e.target.value)}
              className="w-full h-12 px-4 rounded-xl outline-none text-[#2f3542] transition-all bg-[#faf9f6]"
              style={{
                boxShadow: 'inset 5px 5px 10px rgba(131, 115, 117, 0.15), inset -5px -5px 10px rgba(255, 255, 255, 0.8)'
              }}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-bold text-[#2f3542] ml-2">Favorite Region</label>
            <select 
              value={favoriteRegion}
              onChange={e => setFavoriteRegion(e.target.value)}
              className="w-full h-12 px-4 rounded-xl outline-none text-[#2f3542] transition-all bg-[#faf9f6] appearance-none"
              style={{
                boxShadow: 'inset 5px 5px 10px rgba(131, 115, 117, 0.15), inset -5px -5px 10px rgba(255, 255, 255, 0.8)'
              }}
            >
              {['Kanto', 'Johto', 'Hoenn', 'Sinnoh', 'Unova', 'Kalos', 'Alola', 'Galar', 'Paldea'].map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-bold text-[#2f3542] ml-2">Timezone</label>
            <input 
              type="text" 
              value={timezone} 
              onChange={e => setTimezone(e.target.value)}
              className="w-full h-12 px-4 rounded-xl outline-none text-[#2f3542] transition-all bg-[#faf9f6]"
              style={{
                boxShadow: 'inset 5px 5px 10px rgba(131, 115, 117, 0.15), inset -5px -5px 10px rgba(255, 255, 255, 0.8)'
              }}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-bold text-[#2f3542] ml-2">Profile Pic URL</label>
            <input 
              type="text" 
              value={avatarUrl} 
              onChange={e => setAvatarUrl(e.target.value)}
              className="w-full h-12 px-4 rounded-xl outline-none text-[#2f3542] transition-all bg-[#faf9f6]"
              style={{
                boxShadow: 'inset 5px 5px 10px rgba(131, 115, 117, 0.15), inset -5px -5px 10px rgba(255, 255, 255, 0.8)'
              }}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-bold text-[#2f3542] ml-2">Favorite Pokemon</label>
            <input 
              type="text" 
              value={favoritePokemon} 
              onChange={e => setFavoritePokemon(e.target.value)}
              className="w-full h-12 px-4 rounded-xl outline-none text-[#2f3542] transition-all bg-[#faf9f6]"
              style={{
                boxShadow: 'inset 5px 5px 10px rgba(131, 115, 117, 0.15), inset -5px -5px 10px rgba(255, 255, 255, 0.8)'
              }}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-bold text-[#2f3542] ml-2">Theme Color</label>
            <input 
              type="color" 
              value={themeColor} 
              onChange={e => setThemeColor(e.target.value)}
              className="w-full h-12 rounded-xl outline-none bg-[#faf9f6] p-2 cursor-pointer"
              style={{
                boxShadow: 'inset 5px 5px 10px rgba(131, 115, 117, 0.15), inset -5px -5px 10px rgba(255, 255, 255, 0.8)'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-14 rounded-xl flex items-center justify-center gap-3 font-bold text-lg text-white transition-all duration-200 mt-4"
            style={{
              backgroundColor: 'var(--primary-color)',
              boxShadow: '-5px -5px 10px rgba(255, 255, 255, 0.8), 5px 5px 10px rgba(131, 115, 117, 0.2)'
            }}
          >
            {isSubmitting ? 'Saving...' : 'Start Adventure'}
          </button>
        </form>
      </div>
    </div>
  );
}
