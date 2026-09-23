import { Menu, LogIn, Map } from 'lucide-react';

interface HeaderProps {
  token: string | null;
  isReady: boolean;
  API: string;
}

export function Header({ token, isReady, API }: HeaderProps) {
  return (
    <header className="md:hidden flex items-center justify-between px-6 py-4 bg-white border-b border-[#dfe4ea] fixed top-0 w-full z-40">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-[var(--primary-color)] rounded-lg flex items-center justify-center text-white">
          <Map size={18} />
        </div>
        <h1 className="font-display font-bold text-lg text-[#2f3542]">Overworld</h1>
      </div>
      
      <div className="flex items-center gap-4">
        {!token ? (
          <button 
            onClick={() => window.location.href = `${API}/auth/login`}
            className="text-[var(--primary-color)] font-medium text-sm flex items-center gap-1"
          >
            <LogIn size={18} /> Login
          </button>
        ) : (
          <div className="flex items-center gap-2 text-sm font-medium">
            <div className={`w-2 h-2 rounded-full ${isReady ? 'bg-[#2ed573]' : 'bg-[#feca57] animate-pulse'}`} />
            <span className={isReady ? 'text-[#2ed573]' : 'text-[#feca57]'}>{isReady ? 'Synced' : 'Syncing...'}</span>
          </div>
        )}
        <button className="text-[#747d8c]">
          <Menu size={24} />
        </button>
      </div>
    </header>
  );
}
