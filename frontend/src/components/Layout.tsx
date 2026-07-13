import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { decisionService } from '../services/api';
import type { Decision } from '../services/api';
import { 
  Compass, 
  History, 
  LogOut, 
  Menu, 
  X, 
  Plus, 
  Star, 
  Search, 
  ChevronRight,
  BookOpen
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [history, setHistory] = useState<Decision[]>([]);
  const [search, setSearch] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchHistory = async () => {
    if (!user) return;
    setLoadingHistory(true);
    try {
      const data = await decisionService.getHistory();
      setHistory(data);
    } catch (err) {
      console.error('Failed to load decision history in layout:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [user, location.pathname]); // Re-fetch on navigate/mount

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const filteredHistory = history.filter(item => 
    item.query.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background grid-bg text-zinc-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg border border-zinc-800 hover:bg-zinc-900 transition-colors md:block hidden"
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          
          <div 
            onClick={() => navigate('/')} 
            className="flex items-center gap-2 cursor-pointer select-none group"
          >
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-white font-display font-bold text-lg shadow-[0_0_15px_rgba(37,99,235,0.4)] group-hover:scale-105 transition-transform">
              Ω
            </div>
            <span className="font-display font-bold text-xl tracking-wider text-white">ORACLE</span>
          </div>
        </div>

        <nav className="flex items-center gap-6">
          <button 
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-900 transition-all border border-transparent hover:border-zinc-800"
          >
            <Plus size={16} />
            <span>New Decision</span>
          </button>
          
          <button 
            onClick={() => navigate('/history')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-900 transition-all border border-transparent hover:border-zinc-800"
          >
            <History size={16} />
            <span>History</span>
          </button>

          {/* User Section */}
          <div className="h-5 w-[1px] bg-zinc-800"></div>

          <div className="flex items-center gap-3">
            <div className="md:flex hidden flex-col text-right">
              <span className="text-sm font-medium text-zinc-200">{user?.name || user?.email}</span>
              <span className="text-[10px] text-zinc-500 font-mono">Premium Analyst</span>
            </div>
            
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-zinc-400 hover:text-danger hover:bg-danger/10 transition-all border border-zinc-800/50 hover:border-danger/30"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </nav>
      </header>

      {/* Main Drawer Frame */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Navigation */}
        <aside 
          className={`border-r border-zinc-800/80 bg-zinc-950/60 transition-all duration-300 flex flex-col shrink-0 ${
            sidebarOpen ? 'w-80' : 'w-0 overflow-hidden border-r-0'
          } md:flex hidden`}
        >
          {/* History Search bar */}
          <div className="p-4 border-b border-zinc-800/50">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-zinc-500" size={16} />
              <input
                type="text"
                placeholder="Search past simulations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-zinc-900/60 border border-zinc-800 rounded-lg py-2 pl-9 pr-4 text-xs text-zinc-300 placeholder-zinc-500 focus:outline-none focus:border-zinc-700 transition-colors"
              />
            </div>
          </div>

          {/* Dynamic Sidebar Decisions List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            <div className="px-3 py-1.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest flex items-center justify-between">
              <span>Simulations</span>
              {loadingHistory && <div className="h-2 w-2 rounded-full bg-primary animate-ping"></div>}
            </div>

            {filteredHistory.length === 0 ? (
              <div className="text-center py-8 px-4">
                <Compass className="mx-auto text-zinc-700 mb-2" size={24} />
                <p className="text-xs text-zinc-500">No simulations recorded.</p>
                <button 
                  onClick={() => navigate('/dashboard')}
                  className="mt-3 text-xs text-primary hover:underline font-medium"
                >
                  Create one now
                </button>
              </div>
            ) : (
              filteredHistory.map((item) => {
                const isActive = location.pathname.includes(`/history/${item.id}`);
                return (
                  <div
                    key={item.id}
                    onClick={() => navigate(`/history/${item.id}`)}
                    className={`group w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
                      isActive 
                        ? 'bg-primary/10 border-l-2 border-primary text-white font-medium' 
                        : 'hover:bg-zinc-900/50 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <BookOpen size={13} className={isActive ? 'text-primary' : 'text-zinc-500'} />
                      <span className="truncate text-xs">{item.query}</span>
                    </div>
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.is_favorite && (
                        <Star size={12} className="text-warning fill-warning" />
                      )}
                      <ChevronRight size={12} className="text-zinc-600" />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="p-4 border-t border-zinc-800/50 bg-zinc-950/20 text-center">
            <span className="text-[10px] font-mono text-zinc-600">ORACLE INTELLIGENCE ENGINE V1.0</span>
          </div>
        </aside>

        {/* Inner Content Area */}
        <main className="flex-1 overflow-y-auto bg-background/40 relative">
          <div className="glow-effect top-10 left-10 opacity-30"></div>
          <div className="glow-effect bottom-20 right-20 opacity-20 bg-accent/10"></div>
          <div className="p-8 max-w-7xl mx-auto w-full relative z-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
