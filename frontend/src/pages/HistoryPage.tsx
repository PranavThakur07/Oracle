import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { decisionService } from '../services/api';
import type { Decision } from '../services/api';
import { 
  Search, 
  Star, 
  Trash2, 
  Calendar, 
  BookOpen, 
  RefreshCw,
  GitFork,
  ArrowRight
} from 'lucide-react';

export const HistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Search & Filter State
  const [search, setSearch] = useState('');
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await decisionService.getHistory(
        search || undefined,
        showOnlyFavorites ? true : undefined
      );
      setDecisions(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to retrieve simulation history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [showOnlyFavorites]); // Refetch on filter toggle

  // Debounced search trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchHistory();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleFavoriteToggle = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation(); // Avoid card navigation click
    try {
      const updated = await decisionService.toggleFavorite(id);
      setDecisions(prev => 
        prev.map(d => d.id === id ? { ...d, is_favorite: updated.is_favorite } : d)
      );
      // If we are currently displaying only favorites, remove it
      if (showOnlyFavorites && !updated.is_favorite) {
        setDecisions(prev => prev.filter(d => d.id !== id));
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this simulation? This action is irreversible.')) return;

    try {
      await decisionService.deleteDecision(id);
      setDecisions(prev => prev.filter(d => d.id !== id));
    } catch (err) {
      console.error('Failed to delete simulation:', err);
      alert('Failed to delete simulation.');
    }
  };

  return (
    <div className="space-y-8 font-sans pb-16">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-display font-bold text-white tracking-tight">Simulations History</h1>
          <p className="text-sm text-zinc-400">Review past analytical decision projections and comparisons.</p>
        </div>

        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-lg bg-primary hover:bg-blue-600 text-white transition-all transform hover:-translate-y-0.5"
        >
          <Plus size={14} className="text-white" />
          <span>New Simulation</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-zinc-950/40 p-4 rounded-xl border border-zinc-900">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 text-zinc-500" size={16} />
          <input
            type="text"
            placeholder="Search decisions by query name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-900/60 border border-zinc-800 rounded-lg py-2.5 pl-10 pr-4 text-xs text-zinc-300 placeholder-zinc-500 focus:outline-none focus:border-zinc-700 transition-colors"
          />
        </div>

        {/* Favorite toggle */}
        <button
          onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-xs font-semibold w-full sm:w-auto justify-center transition-all ${
            showOnlyFavorites 
              ? 'bg-warning/10 border-warning/30 text-warning' 
              : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Star size={14} className={showOnlyFavorites ? 'fill-warning' : ''} />
          <span>{showOnlyFavorites ? 'Showing Favorites' : 'Show Favorites Only'}</span>
        </button>
      </div>

      {/* History Grid Container */}
      <AnimatePresence mode="wait">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <RefreshCw className="text-primary animate-spin" size={28} />
            <span className="text-xs text-zinc-500 font-mono">Querying history database...</span>
          </div>
        ) : error ? (
          <div className="p-4 bg-danger/10 border border-danger/20 rounded-xl text-center text-xs text-danger max-w-md mx-auto">
            {error}
          </div>
        ) : decisions.length === 0 ? (
          <div className="text-center py-20 bg-zinc-950/20 border border-zinc-900 rounded-2xl p-8 max-w-md mx-auto space-y-4">
            <BookOpen className="text-zinc-700 mx-auto" size={40} />
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-white">No simulations found</h3>
              <p className="text-xs text-zinc-500">
                {showOnlyFavorites 
                  ? "You don't have any favorited simulations in this category." 
                  : "Type a decision prompt in the workspace to launch your first projection."}
              </p>
            </div>
            {!showOnlyFavorites && (
              <button 
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2 text-xs font-semibold rounded bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white"
              >
                Go to Workspace
              </button>
            )}
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {decisions.map((d) => {
              const dateStr = new Date(d.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              });
              const scenariosCount = d.response_json?.scenarios?.length || 0;

              return (
                <motion.div
                  key={d.id}
                  onClick={() => navigate(`/history/${d.id}`)}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  className="p-5 rounded-2xl glass-card bg-zinc-950/20 relative space-y-4 cursor-pointer flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        <span>{dateStr}</span>
                      </span>
                      <span className="flex items-center gap-1 text-primary">
                        <GitFork size={12} />
                        <span>{scenariosCount} Scenarios</span>
                      </span>
                    </div>

                    <h3 className="font-display font-semibold text-sm text-white line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                      {d.query}
                    </h3>

                    {/* Small preview pills for active scenarios */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {d.response_json?.scenarios?.map(s => (
                        <span 
                          key={s.id} 
                          className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-850 text-[9px] text-zinc-400"
                        >
                          {s.id}: {s.title.split(':')[1]?.trim() || s.title}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions bar */}
                  <div className="flex items-center justify-between pt-4 border-t border-zinc-900/60 mt-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => handleFavoriteToggle(e, d.id)}
                        className="p-1.5 rounded hover:bg-zinc-900 text-zinc-500 hover:text-warning transition-colors"
                      >
                        <Star size={14} className={d.is_favorite ? 'text-warning fill-warning' : ''} />
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, d.id)}
                        className="p-1.5 rounded hover:bg-zinc-900 text-zinc-500 hover:text-danger transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <span className="text-[10px] font-semibold text-zinc-400 flex items-center gap-1 hover:text-white transition-colors">
                      <span>View analysis</span>
                      <ArrowRight size={12} />
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Add dummy export to make typechecker happy if needed
const Plus: React.FC<{ size: number; className?: string }> = ({ size, className }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);
