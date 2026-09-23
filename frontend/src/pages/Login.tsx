import { LogIn, UserPlus } from 'lucide-react';
import { useState } from 'react';

interface LoginProps {
  API: string;
  setToken: (t: string) => void;
}

export function Login({ API, setToken }: LoginProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const endpoint = isLogin ? '/auth/login/local' : '/auth/register';
    try {
      const res = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || 'An error occurred');
        return;
      }
      setToken(data.session_token);
      localStorage.setItem('overworld_token', data.session_token);
    } catch (err) {
      setError('Failed to connect to server');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#faf9f6] p-4 md:p-12 font-sans text-[#1a1c1a] selection:bg-[var(--primary-color)] selection:text-white relative overflow-hidden">
      <div className="absolute -top-12 -left-12 w-32 h-32 rounded-full bg-[#faf9f6] shadow-[inset_5px_5px_10px_rgba(131,115,117,0.1),inset_-5px_-5px_10px_rgba(255,255,255,0.8)] opacity-60 pointer-events-none"></div>
      <div className="absolute -bottom-16 -right-16 w-48 h-48 rounded-full bg-[#faf9f6] shadow-[inset_5px_5px_10px_rgba(131,115,117,0.1),inset_-5px_-5px_10px_rgba(255,255,255,0.8)] opacity-60 pointer-events-none"></div>
      
      <main className="w-full max-w-md relative z-10">
        <div 
          className="rounded-3xl p-8 md:p-12 relative overflow-hidden flex flex-col items-center"
          style={{
            backgroundColor: '#faf9f6',
            boxShadow: '-10px -10px 20px rgba(255, 255, 255, 0.8), 10px 10px 20px rgba(131, 115, 117, 0.15)'
          }}
        >
          <div 
            className="absolute inset-0 rounded-3xl pointer-events-none"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 40%)'
            }}
          ></div>

          <div 
            className="w-24 h-24 mb-8 rounded-full flex items-center justify-center text-[var(--primary-color)] relative"
            style={{
              backgroundColor: '#faf9f6',
              boxShadow: '-5px -5px 10px rgba(255,255,255,1), 5px 5px 10px rgba(131,115,117,0.2)'
            }}
          >
            <div className="w-12 h-12 bg-[var(--primary-color)] rounded-xl flex items-center justify-center text-white shadow-md">
               {isLogin ? <LogIn size={28} /> : <UserPlus size={28} />}
            </div>
          </div>

          <h1 className="font-bold text-3xl text-[#2f3542] text-center mb-4 font-display">
            {isLogin ? 'Login to Overworld' : 'Create Account'}
          </h1>

          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
            <input 
              type="text" 
              placeholder="Username" 
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#faf9f6] outline-none"
              style={{
                boxShadow: 'inset 5px 5px 10px rgba(131, 115, 117, 0.1), inset -5px -5px 10px rgba(255, 255, 255, 0.8)'
              }}
            />
            <input 
              type="password" 
              placeholder="Password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#faf9f6] outline-none"
              style={{
                boxShadow: 'inset 5px 5px 10px rgba(131, 115, 117, 0.1), inset -5px -5px 10px rgba(255, 255, 255, 0.8)'
              }}
            />
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <button
              type="submit"
              className="w-full h-14 mt-4 rounded-xl flex items-center justify-center gap-3 font-bold text-lg text-white transition-all duration-200 relative overflow-hidden group"
              style={{
                backgroundColor: '#2ed573',
                boxShadow: '-5px -5px 10px rgba(255, 255, 255, 0.8), 5px 5px 10px rgba(131, 115, 117, 0.2)'
              }}
            >
              {isLogin ? 'Login' : 'Sign Up'}
            </button>
          </form>

          <button 
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            className="text-sm text-[#747d8c] mt-6 hover:text-[#2f3542] transition-colors"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Login"}
          </button>
        </div>
      </main>
    </div>
  );
}
