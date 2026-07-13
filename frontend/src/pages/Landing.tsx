import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { ArrowRight, Play, Shield, Zap, TrendingUp, GitFork } from 'lucide-react';

export const Landing: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleStart = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  const handleDemo = () => {
    // Navigate to dashboard with demo state pre-filled
    navigate('/dashboard?demo=true');
  };

  return (
    <div className="min-h-screen bg-background grid-bg text-zinc-100 flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <header className="px-8 py-6 flex items-center justify-between border-b border-zinc-900/50 backdrop-blur-md bg-zinc-950/20 sticky top-0 z-50">
        <div className="flex items-center gap-2 select-none">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-white font-display font-bold text-lg shadow-[0_0_15px_rgba(37,99,235,0.4)]">
            Ω
          </div>
          <span className="font-display font-bold text-xl tracking-wider text-white">ORACLE</span>
        </div>
        <div>
          <button 
            onClick={handleStart}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 hover:text-white transition-all"
          >
            {user ? 'Dashboard' : 'Sign In'}
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 relative max-w-6xl mx-auto w-full">
        {/* Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] height-[500px] bg-primary/10 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="text-center space-y-6 max-w-4xl relative z-10">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-zinc-800/80 bg-zinc-900/40 backdrop-blur-sm text-xs text-zinc-400 font-mono"
          >
            <GitFork size={13} className="text-primary" />
            <span>AI-POWERED DECISION INTELLIGENCE</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="font-display text-5xl md:text-7xl font-bold tracking-tight text-white leading-tight"
          >
            Every Decision Has <br className="hidden md:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-emerald-400">
              Multiple Futures.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto font-sans leading-relaxed"
          >
            Stop asking AI what to do. Start exploring every possibility. Simulate outcomes, compare tradeoffs, and map opportunity costs.
          </motion.p>

          {/* Action CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
          >
            <button
              onClick={handleStart}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-primary hover:bg-blue-600 text-white font-medium shadow-[0_4px_20px_rgba(37,99,235,0.35)] transition-all transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <span>Try Oracle</span>
              <ArrowRight size={18} />
            </button>
            <button
              onClick={handleDemo}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white transition-all transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <Play size={15} fill="currentColor" />
              <span>Explore Demo</span>
            </button>
          </motion.div>
        </div>

        {/* Animated SVGs: Branching Illustration */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, delay: 0.5 }}
          className="w-full max-w-2xl h-64 mt-16 relative flex items-center justify-center"
        >
          <svg className="w-full h-full" viewBox="0 0 600 240" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Base Choice Line */}
            <motion.path
              d="M 50 120 L 220 120"
              stroke="#3F3F46"
              strokeWidth="3"
              strokeDasharray="4 4"
            />
            
            {/* Core Decision Node */}
            <motion.circle
              cx="220"
              cy="120"
              r="7"
              fill="#2563EB"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 1 }}
              className="shadow-[0_0_10px_rgba(37,99,235,0.8)]"
            />

            {/* Scenario A Path: Continue Working */}
            <motion.path
              d="M 220 120 C 290 120, 320 40, 420 40 L 520 40"
              stroke="#EF4444"
              strokeWidth="3"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.5, delay: 1.2 }}
            />
            
            {/* Scenario B Path: MBA Studies */}
            <motion.path
              d="M 220 120 L 520 120"
              stroke="#2563EB"
              strokeWidth="3"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.5, delay: 1.2 }}
            />

            {/* Scenario C Path: Startup */}
            <motion.path
              d="M 220 120 C 290 120, 320 200, 420 200 L 520 200"
              stroke="#10B981"
              strokeWidth="3"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.5, delay: 1.2 }}
            />

            {/* Labels at the end of the paths */}
            <motion.g
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 2.2 }}
            >
              <rect x="440" y="20" width="130" height="30" rx="6" fill="#121214" stroke="#EF4444" strokeWidth="1"/>
              <text x="505" y="38" fill="#F4F4F5" fontSize="10" fontFamily="sans-serif" textAnchor="middle">Scenario A: Status Quo</text>
            </motion.g>

            <motion.g
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 2.2 }}
            >
              <rect x="440" y="105" width="130" height="30" rx="6" fill="#121214" stroke="#2563EB" strokeWidth="1"/>
              <text x="505" y="123" fill="#F4F4F5" fontSize="10" fontFamily="sans-serif" textAnchor="middle">Scenario B: MBA Study</text>
            </motion.g>

            <motion.g
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 2.2 }}
            >
              <rect x="440" y="185" width="130" height="30" rx="6" fill="#121214" stroke="#10B981" strokeWidth="1"/>
              <text x="505" y="203" fill="#F4F4F5" fontSize="10" fontFamily="sans-serif" textAnchor="middle">Scenario C: Build Startup</text>
            </motion.g>

            {/* Question Text above starting path */}
            <text x="135" y="100" fill="#71717A" fontSize="11" fontFamily="sans-serif" textAnchor="middle">Initial Decision Query</text>
          </svg>
        </motion.div>
      </main>

      {/* Feature Grids */}
      <section className="bg-zinc-950 border-t border-zinc-900 py-20 px-8 relative z-25">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 rounded-xl border border-zinc-900 bg-zinc-900/20 space-y-3">
            <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center text-danger border border-red-500/20">
              <Shield size={18} />
            </div>
            <h3 className="font-display font-semibold text-lg text-white">Compare Tradeoffs</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Every scenario evaluates pros, cons, and specific risks side-by-side. Calculate exactly what you gain and what you forfeit.
            </p>
          </div>
          
          <div className="p-6 rounded-xl border border-zinc-900 bg-zinc-900/20 space-y-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-primary border border-blue-500/20">
              <Zap size={18} />
            </div>
            <h3 className="font-display font-semibold text-lg text-white">Dynamic Follow-ups</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Query alternatives inside the active context. Ask "What if my budget is double?" to revise all projections instantly.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-zinc-900 bg-zinc-900/20 space-y-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-success border border-emerald-500/20">
              <TrendingUp size={18} />
            </div>
            <h3 className="font-display font-semibold text-lg text-white">Timeline Comparison</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Explore step-by-step milestones (2026 → 2027 → 2030) side-by-side. Visualize which path yields growth fastest.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-8 px-8 text-center text-xs text-zinc-500 font-mono">
        © 2026 ORACLE INC. ALL RIGHTS RESERVED. SIMULATIONS DO NOT GUARANTEE FUTURE RESULTS.
      </footer>
    </div>
  );
};
