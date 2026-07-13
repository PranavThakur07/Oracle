import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { ArrowRight, Play, GitFork, Sparkles, TrendingUp, ShieldAlert, HeartHandshake } from 'lucide-react';

export const Landing: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isExiting, setIsExiting] = useState(false);
  const [hoveredBranch, setHoveredBranch] = useState<'A' | 'B' | 'C' | null>(null);

  const handleStart = () => {
    setIsExiting(true);
    setTimeout(() => {
      if (user) {
        navigate('/dashboard');
      } else {
        navigate('/login');
      }
    }, 800); // Wait for transition animation
  };

  const handleDemo = () => {
    setIsExiting(true);
    setTimeout(() => {
      navigate('/dashboard?demo=true');
    }, 800);
  };

  return (
    <div className="min-h-screen bg-background grid-bg text-zinc-100 flex flex-col font-sans overflow-hidden relative">
      {/* Immersive Dark overlay transition */}
      <AnimatePresence>
        {isExiting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background z-50 flex items-center justify-center pointer-events-none"
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.15 }}
              className="h-96 w-96 rounded-full bg-primary blur-[120px]"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="px-8 py-6 flex items-center justify-between border-b border-zinc-900/40 backdrop-blur-md bg-zinc-950/10 sticky top-0 z-40">
        <div className="flex items-center gap-2.5 select-none cursor-pointer" onClick={() => navigate('/')}>
          <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center text-white font-display font-bold text-base shadow-[0_0_15px_rgba(37,99,235,0.4)]">
            Ω
          </div>
          <span className="font-display font-bold text-lg tracking-wider text-white">ORACLE</span>
        </div>
        <div>
          <button 
            onClick={handleStart}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800/80 text-zinc-300 hover:text-white transition-all duration-300 cursor-pointer"
          >
            {user ? 'Go to Workspace' : 'Sign In'}
          </button>
        </div>
      </header>

      {/* Hero Content Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative max-w-5xl mx-auto w-full z-10">
        {/* Glow behind title */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="text-center space-y-6 max-w-3xl relative">
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-800/80 bg-zinc-900/30 backdrop-blur-sm text-[10px] text-zinc-400 font-mono"
          >
            <GitFork size={12} className="text-primary animate-pulse" />
            <span>AI OPERATING SYSTEM FOR DECISION INTELLIGENCE</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="font-display text-4xl sm:text-6xl font-bold tracking-tight text-white leading-tight"
          >
            Every Decision Has <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-emerald-400 text-glow-primary">
              Multiple Futures.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="text-sm sm:text-base text-zinc-450 max-w-xl mx-auto leading-relaxed"
          >
            Stop guessing. Map critical choices to simulated paths. Analyze growth potential, evaluate trade-offs, and visualize compound opportunity costs before you decide.
          </motion.p>

          {/* Action Call-to-Actions */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4"
          >
            <button
              onClick={handleStart}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-primary hover:bg-blue-600 text-xs font-semibold text-white shadow-[0_4px_25px_rgba(37,99,235,0.4)] hover:shadow-[0_4px_30px_rgba(37,99,235,0.6)] transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              <span>Try Oracle</span>
              <ArrowRight size={14} />
            </button>
            <button
              onClick={handleDemo}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 text-xs font-semibold text-zinc-300 hover:text-white transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              <Play size={12} fill="currentColor" />
              <span>Explore Interactive Demo</span>
            </button>
          </motion.div>
        </div>

        {/* Dynamic Branching Decision Tree Visualization */}
        <div className="w-full max-w-2xl h-80 mt-12 relative flex items-center justify-center">
          {/* Branch Preview Popup Card */}
          <AnimatePresence>
            {hoveredBranch && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: -45 }}
                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                className="absolute top-0 z-30 w-72 p-4 rounded-xl border border-zinc-800 bg-zinc-950/95 backdrop-blur-md shadow-2xl space-y-3 font-sans"
              >
                {hoveredBranch === 'A' && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/35 text-[9px] font-mono font-bold text-blue-400">
                        ACCELERATED GROWTH
                      </span>
                      <TrendingUp size={14} className="text-blue-400" />
                    </div>
                    <p className="text-xs text-zinc-300 font-medium">Aggressive Career Leap</p>
                    <p className="text-[11px] text-zinc-500 leading-relaxed">
                      Maximizes high earnings and startup capital, trading short-term work-life balance for long-term equity potential.
                    </p>
                    <div className="flex justify-between text-[10px] text-zinc-400 pt-1 font-mono">
                      <span>Risk: High</span>
                      <span>Growth Index: 9.2</span>
                    </div>
                  </>
                )}

                {hoveredBranch === 'B' && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/35 text-[9px] font-mono font-bold text-emerald-400">
                        BALANCED PATHWAY
                      </span>
                      <HeartHandshake size={14} className="text-emerald-400" />
                    </div>
                    <p className="text-xs text-zinc-300 font-medium">Sustainable Development</p>
                    <p className="text-[11px] text-zinc-500 leading-relaxed">
                      Prioritizes steady learning, moderate risk, and stable income to avoid burnout while building core mastery.
                    </p>
                    <div className="flex justify-between text-[10px] text-zinc-400 pt-1 font-mono">
                      <span>Risk: Low</span>
                      <span>Work-Life: 8.5</span>
                    </div>
                  </>
                )}

                {hoveredBranch === 'C' && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/35 text-[9px] font-mono font-bold text-purple-400">
                        DEFENSIVE PIVOT
                      </span>
                      <ShieldAlert size={14} className="text-purple-400" />
                    </div>
                    <p className="text-xs text-zinc-300 font-medium">Alternative Hedge</p>
                    <p className="text-[11px] text-zinc-500 leading-relaxed">
                      Mitigates downside risk completely. Sacrifices immediate salary gains to hedge against market volatility.
                    </p>
                    <div className="flex justify-between text-[10px] text-zinc-400 pt-1 font-mono">
                      <span>Risk: Minimal</span>
                      <span>Cost Score: 2.0</span>
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <svg className="w-full h-full" viewBox="0 0 600 240" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Base Choice Line */}
            <motion.path
              d="M 60 120 L 220 120"
              stroke="#27272A"
              strokeWidth="2.5"
              strokeDasharray="4 4"
            />
            
            {/* Core Decision Node */}
            <motion.circle
              cx="220"
              cy="120"
              r="6"
              fill="#2563EB"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5 }}
              className="shadow-[0_0_15px_rgba(37,99,235,0.8)]"
            />
            <text x="220" y="105" fill="#71717A" fontSize="9" fontFamily="sans-serif" textAnchor="middle" className="font-mono">
              Decision Point
            </text>

            {/* Path A (Top Branch) */}
            <motion.path
              d="M 220 120 C 295 120, 320 50, 420 50 L 510 50"
              stroke={hoveredBranch === 'A' ? '#3B82F6' : '#27272A'}
              strokeWidth={hoveredBranch === 'A' ? '3' : '2'}
              className="transition-all duration-300"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.2, delay: 0.6 }}
            />
            <motion.circle
              cx="510"
              cy="50"
              r="5"
              fill={hoveredBranch === 'A' ? '#3B82F6' : '#27272A'}
              onMouseEnter={() => setHoveredBranch('A')}
              onMouseLeave={() => setHoveredBranch(null)}
              className="cursor-pointer transition-all duration-300"
              whileHover={{ scale: 1.8 }}
            />

            {/* Path B (Middle Branch) */}
            <motion.path
              d="M 220 120 L 510 120"
              stroke={hoveredBranch === 'B' ? '#10B981' : '#27272A'}
              strokeWidth={hoveredBranch === 'B' ? '3' : '2'}
              className="transition-all duration-300"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.2, delay: 0.6 }}
            />
            <motion.circle
              cx="510"
              cy="120"
              r="5"
              fill={hoveredBranch === 'B' ? '#10B981' : '#27272A'}
              onMouseEnter={() => setHoveredBranch('B')}
              onMouseLeave={() => setHoveredBranch(null)}
              className="cursor-pointer transition-all duration-300"
              whileHover={{ scale: 1.8 }}
            />

            {/* Path C (Bottom Branch) */}
            <motion.path
              d="M 220 120 C 295 120, 320 190, 420 190 L 510 190"
              stroke={hoveredBranch === 'C' ? '#8B5CF6' : '#27272A'}
              strokeWidth={hoveredBranch === 'C' ? '3' : '2'}
              className="transition-all duration-300"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.2, delay: 0.6 }}
            />
            <motion.circle
              cx="510"
              cy="190"
              r="5"
              fill={hoveredBranch === 'C' ? '#8B5CF6' : '#27272A'}
              onMouseEnter={() => setHoveredBranch('C')}
              onMouseLeave={() => setHoveredBranch(null)}
              className="cursor-pointer transition-all duration-300"
              whileHover={{ scale: 1.8 }}
            />

            {/* Dynamic Interactive Node labels */}
            <text x="530" y="54" fill={hoveredBranch === 'A' ? '#3B82F6' : '#52525B'} fontSize="9" className="font-mono font-medium transition-colors duration-300">
              Future Alpha
            </text>
            <text x="530" y="124" fill={hoveredBranch === 'B' ? '#10B981' : '#52525B'} fontSize="9" className="font-mono font-medium transition-colors duration-300">
              Future Beta
            </text>
            <text x="530" y="194" fill={hoveredBranch === 'C' ? '#8B5CF6' : '#52525B'} fontSize="9" className="font-mono font-medium transition-colors duration-300">
              Future Gamma
            </text>
          </svg>
        </div>
      </main>

      {/* Ultra Minimal Footer */}
      <footer className="border-t border-zinc-900/60 py-6 px-8 flex flex-col sm:flex-row items-center justify-between text-[10px] text-zinc-600 font-mono relative z-10 bg-zinc-950/20">
        <span>© 2026 ORACLE INC. ALL RIGHTS RESERVED.</span>
        <span className="flex items-center gap-1">
          <Sparkles size={11} className="text-zinc-500" />
          <span>DECISION INTELLIGENCE SUITE V1.0</span>
        </span>
      </footer>
    </div>
  );
};
