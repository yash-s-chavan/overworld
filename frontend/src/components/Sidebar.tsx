import { LogIn, Link, Map, Library } from 'lucide-react';
import type { UserProfile } from '../types';

interface SidebarProps {
  page: 'dashboard' | 'musicdex';
  setPage: (p: 'dashboard' | 'musicdex') => void;
  token: string | null;
  loadCatalog: () => void;
  API: string;
  userProfile: UserProfile | null;
}

export function Sidebar({ page, setPage, token, loadCatalog, API, userProfile }: SidebarProps) {
  return (
    <aside className="hidden md:flex flex-col h-full w-72 bg-white border-r border-[#dfe4ea] fixed left-0 top-0 z-40 p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-10 mt-2">
        <div className="w-10 h-10 bg-[var(--primary-color)] rounded-lg flex items-center justify-center text-white shadow-md">
          <Map size={24} />
        </div>
        <h1 className="font-display font-bold text-xl text-[#2f3542]">Overworld</h1>
      </div>
      
      <div className="flex items-center gap-4 mb-10 bg-[#f8f9fa] p-4 rounded-xl border border-[#dfe4ea]">
        <img
          alt="Trainer"
          src={userProfile?.avatar_url || "https://lh3.googleusercontent.com/aida-public/AB6AXuDmaC-VD2KgeKGwFvOgrdu0Rf89k3xzriiRh5CCile2ngBtwL-yGmAyJYyFKTItdO7zpwkh8OROL52NJ1GFsj-xNPcJyzJUg8HsSp2jfKxnQKfdlPEIxs0Wq9NhL_usOoVr9zwDPssKErotDfefSjrPXEuZZJLuyGa76jgYlN34BYX2IT_FNOy9nyVqEkaSEWw7zuTl-ZqUMVWO73pXEcp9MJHW2ZalBypE_zoveAjGJqKB8Tx6Qqdx"}
          className="w-12 h-12 rounded-full object-cover shadow-sm"
        />
        <div className="overflow-hidden">
          <h2 className="font-display font-semibold text-[#2f3542] truncate">
            {userProfile?.display_name || 'Guest Trainer'}
          </h2>
          <p className="text-sm text-[#747d8c] truncate">
            {userProfile ? `Level ${Math.max(1, Math.floor((userProfile.discoveries?.length || 0) / 10))} Explorer` : 'Not Connected'}
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-2">
        <button
          onClick={() => setPage('dashboard')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
            page === 'dashboard' 
              ? 'bg-[var(--primary-color)] text-white shadow-md' 
              : 'text-[#747d8c] hover:bg-[#f1f2f6] hover:text-[#2f3542]'
          }`}
        >
          <Map size={20} />
          <span>Live Radar</span>
        </button>
        <button
          onClick={() => setPage('musicdex')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
            page === 'musicdex' 
              ? 'bg-[var(--primary-color)] text-white shadow-md' 
              : 'text-[#747d8c] hover:bg-[#f1f2f6] hover:text-[#2f3542]'
          }`}
        >
          <Library size={20} />
          <span>The Music Dex</span>
        </button>
      </nav>

      <div className="mt-auto space-y-2">
        {!token ? (
          <button
            onClick={() => window.location.href = `${API}/auth/login`}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white bg-[#2ed573] hover:bg-[#26b360] transition-colors shadow-md font-medium justify-center"
          >
            <LogIn size={20} />
            <span>Connect Spotify</span>
          </button>
        ) : (
          <button
            onClick={loadCatalog}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[#2f3542] bg-[#f1f2f6] hover:bg-[#dfe4ea] transition-colors font-medium justify-center"
          >
            <Link size={20} className="text-[#2ed573]" />
            <span>Sync Catalog</span>
          </button>
        )}
      </div>
    </aside>
  );
}
