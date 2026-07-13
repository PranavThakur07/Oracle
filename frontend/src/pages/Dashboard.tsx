import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { decisionService } from '../services/api';
import { 
  GitFork, 
  ChevronDown, 
  ChevronUp, 
  Terminal, 
  Check, 
  Sparkles, 
  ArrowRight,
  User,
  DollarSign,
  Globe,
  Gauge,
  Calendar,
  Briefcase
} from 'lucide-react';

interface LoadingStep {
  id: number;
  label: string;
  duration: number;
}

const LOADING_STEPS: LoadingStep[] = [
  { id: 1, label: "Extracting goals and core parameters...", duration: 1500 },
  { id: 2, label: "Identifying constraints and starting assumptions...", duration: 1500 },
  { id: 3, label: "Simulating potential scenario futures (A, B, C)...", duration: 1500 },
  { id: 4, label: "Calculating opportunity costs and risk tradeoffs...", duration: 1500 },
  { id: 5, label: "Synthesizing visual comparisons and metrics...", duration: 1500 }
];

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [query, setQuery] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Context parameters
  const [age, setAge] = useState('');
  const [salary, setSalary] = useState('');
  const [budget, setBudget] = useState('');
  const [country, setCountry] = useState('');
  const [goals, setGoals] = useState('');
  const [riskAppetite, setRiskAppetite] = useState('Medium');
  const [timeHorizon, setTimeHorizon] = useState('5 Years');
  
  // Loading & Flow State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [error, setError] = useState('');

  // Handle Demo Mode query trigger (?demo=true)
  useEffect(() => {
    const demo = searchParams.get('demo');
    if (demo === 'true') {
      setQuery("Should I pursue an MBA after MCA?");
      setAge("23");
      setSalary("$0 (Student)");
      setBudget("$20,000");
      setCountry("India");
      setGoals("Become a high-level Product Manager or Tech Lead in a global startup");
      setRiskAppetite("Medium");
      setTimeHorizon("5 Years");
      setShowAdvanced(true);
      
      // Auto-submit after small delay to show values
      const timer = setTimeout(() => {
        triggerSimulation({
          query_val: "Should I pursue an MBA after MCA?",
          age_val: "23",
          salary_val: "$0 (Student)",
          budget_val: "$20,000",
          country_val: "India",
          goals_val: "Become a high-level Product Manager or Tech Lead in a global startup",
          risk_val: "Medium",
          time_val: "5 Years"
        });
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  const triggerSimulation = async (demoVals?: {
    query_val: string;
    age_val: string;
    salary_val: string;
    budget_val: string;
    country_val: string;
    goals_val: string;
    risk_val: string;
    time_val: string;
  }) => {
    setError('');
    setIsSubmitting(true);
    setCurrentStepIndex(0);

    const q = demoVals ? demoVals.query_val : query;
    const context = {
      age: demoVals ? demoVals.age_val : age,
      current_salary: demoVals ? demoVals.salary_val : salary,
      budget: demoVals ? demoVals.budget_val : budget,
      country: demoVals ? demoVals.country_val : country,
      career_goals: demoVals ? demoVals.goals_val : goals,
      risk_appetite: demoVals ? demoVals.risk_val : riskAppetite,
      time_horizon: demoVals ? demoVals.time_val : timeHorizon
    };

    if (!q.trim()) {
      setError("Please enter a decision question.");
      setIsSubmitting(false);
      return;
    }

    // Step-by-step loading animation timers
    const stepIntervals: number[] = [];
    let completedSteps = 0;

    const startStepAnimation = (index: number) => {
      if (index >= LOADING_STEPS.length) return;
      
      const timer = window.setTimeout(() => {
        completedSteps++;
        setCurrentStepIndex(completedSteps);
        startStepAnimation(completedSteps);
      }, LOADING_STEPS[index].duration);
      
      stepIntervals.push(timer);
    };

    startStepAnimation(0);

    try {
      // Call API
      const result = await decisionService.analyze(q, context);
      
      // Calculate total minimum animation duration
      const totalAnimDuration = LOADING_STEPS.reduce((sum, s) => sum + s.duration, 0);
      
      // Wait for animations to finish to provide an intelligent loading feel
      setTimeout(() => {
        // Clear any leftover timers
        stepIntervals.forEach(clearTimeout);
        navigate(`/history/${result.id}`);
      }, totalAnimDuration + 500);

    } catch (err: any) {
      stepIntervals.forEach(clearTimeout);
      setIsSubmitting(false);
      setError(err.response?.data?.detail || "An unexpected error occurred during simulation. Please try again.");
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    triggerSimulation();
  };

  return (
    <div className="space-y-8 font-sans pb-16">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-display font-bold text-white tracking-tight">Decision Workspace</h1>
        <p className="text-sm text-zinc-400">Define your critical crossroads and model potential futures.</p>
      </div>

      <AnimatePresence mode="wait">
        {!isSubmitting ? (
          <motion.div
            key="input-form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full max-w-3xl mx-auto"
          >
            <form onSubmit={handleFormSubmit} className="space-y-6">
              {/* Primary Prompt Card */}
              <div className="p-6 rounded-2xl glass-panel border border-zinc-800/80 space-y-4 shadow-[0_15px_30px_rgba(0,0,0,0.3)]">
                <div className="flex items-center gap-2 text-primary">
                  <Sparkles size={18} />
                  <span className="text-xs font-mono font-semibold tracking-wider uppercase">Oracle Intelligence Input</span>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-200">What major decision are you facing?</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Should I pursue an MBA after MCA? Or should I relocate to Europe for a job?"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full bg-zinc-900/40 border border-zinc-800 hover:border-zinc-700 focus:border-primary/60 transition-colors rounded-xl p-4 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none resize-none leading-relaxed"
                  />
                  <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono">
                    <span>* Try to ask complex, branched queries</span>
                    <span>Example: "Startup vs Big Tech Job"</span>
                  </div>
                </div>

                {error && (
                  <div className="p-3 text-xs text-danger bg-danger/10 border border-danger/25 rounded-lg">
                    {error}
                  </div>
                )}

                {/* Collapsible Advanced Parameters */}
                <div className="border-t border-zinc-900 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center justify-between w-full text-zinc-400 hover:text-zinc-200 text-xs font-semibold py-1 focus:outline-none transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <GitFork size={13} />
                      <span>{showAdvanced ? 'Hide Advanced Context' : 'Add Decision Context (Recommended)'}</span>
                    </span>
                    {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>

                  <AnimatePresence>
                    {showAdvanced && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 pb-2">
                          {/* Age */}
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1">
                              <User size={12} className="text-zinc-500" />
                              <span>Age</span>
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. 24"
                              value={age}
                              onChange={(e) => setAge(e.target.value)}
                              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-zinc-700"
                            />
                          </div>

                          {/* Salary */}
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1">
                              <DollarSign size={12} className="text-zinc-500" />
                              <span>Current Income / Salary</span>
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. $45,000 / Student"
                              value={salary}
                              onChange={(e) => setSalary(e.target.value)}
                              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-zinc-700"
                            />
                          </div>

                          {/* Budget */}
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1">
                              <DollarSign size={12} className="text-zinc-500" />
                              <span>Investment Budget</span>
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. $15,000"
                              value={budget}
                              onChange={(e) => setBudget(e.target.value)}
                              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-zinc-700"
                            />
                          </div>

                          {/* Country */}
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1">
                              <Globe size={12} className="text-zinc-500" />
                              <span>Location (Country)</span>
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. India"
                              value={country}
                              onChange={(e) => setCountry(e.target.value)}
                              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-zinc-700"
                            />
                          </div>

                          {/* Risk Appetite */}
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1">
                              <Gauge size={12} className="text-zinc-500" />
                              <span>Risk Appetite</span>
                            </label>
                            <select
                              value={riskAppetite}
                              onChange={(e) => setRiskAppetite(e.target.value)}
                              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-300 focus:outline-none focus:border-zinc-700"
                            >
                              <option>Low</option>
                              <option>Medium</option>
                              <option>High</option>
                            </select>
                          </div>

                          {/* Time Horizon */}
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1">
                              <Calendar size={12} className="text-zinc-500" />
                              <span>Time Horizon</span>
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. 5 Years"
                              value={timeHorizon}
                              onChange={(e) => setTimeHorizon(e.target.value)}
                              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-zinc-700"
                            />
                          </div>

                          {/* Career Goals */}
                          <div className="space-y-1 md:col-span-2">
                            <label className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1">
                              <Briefcase size={12} className="text-zinc-500" />
                              <span>Career/Life Goals</span>
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Build an AI startup / Secure remote software architect role"
                              value={goals}
                              onChange={(e) => setGoals(e.target.value)}
                              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-zinc-700"
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/history')}
                  className="px-6 py-2.5 rounded-xl border border-zinc-800 text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all"
                >
                  View Saved Simulations
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary hover:bg-blue-600 text-xs font-semibold text-white shadow-[0_4px_15px_rgba(37,99,235,0.25)] transition-all transform hover:-translate-y-0.5"
                >
                  <span>Simulate Futures</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </form>
          </motion.div>
        ) : (
          /* Intelligent Step-by-Step Loading Terminal Screen */
          <motion.div
            key="loading-screen"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-xl mx-auto p-6 rounded-2xl border border-zinc-800/80 bg-zinc-950/90 shadow-[0_25px_60px_rgba(0,0,0,0.55)] space-y-6 font-mono"
          >
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <div className="flex items-center gap-2 text-zinc-500">
                <Terminal size={14} />
                <span className="text-xs font-semibold uppercase tracking-wider">Oracle Logic Engine</span>
              </div>
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-danger/55"></div>
                <div className="w-2 h-2 rounded-full bg-warning/55"></div>
                <div className="w-2 h-2 rounded-full bg-success/55"></div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="text-zinc-400 text-xs flex flex-col gap-1">
                <span className="text-zinc-500 text-[10px]">&gt; Initializing analytical model context...</span>
                <span className="text-zinc-300">&gt; Query: "{query}"</span>
              </div>

              {/* Progress Steps List */}
              <div className="space-y-2.5 pt-2">
                {LOADING_STEPS.map((step, idx) => {
                  const isDone = currentStepIndex > idx;
                  const isActive = currentStepIndex === idx;

                  return (
                    <div 
                      key={step.id} 
                      className={`flex items-center justify-between text-xs transition-colors duration-300 ${
                        isDone ? 'text-success' : isActive ? 'text-primary font-semibold' : 'text-zinc-600'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isDone ? (
                          <div className="h-4.5 w-4.5 rounded-full bg-success/15 border border-success/35 flex items-center justify-center text-success text-[10px] shrink-0">
                            <Check size={10} />
                          </div>
                        ) : isActive ? (
                          <div className="h-4.5 w-4.5 rounded-full bg-primary/10 border border-primary/40 flex items-center justify-center shrink-0">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-ping"></span>
                          </div>
                        ) : (
                          <div className="h-4.5 w-4.5 rounded-full border border-zinc-800 flex items-center justify-center shrink-0">
                            <span className="text-[9px] text-zinc-700">{step.id}</span>
                          </div>
                        )}
                        <span>{step.label}</span>
                      </div>
                      
                      {isActive && (
                        <span className="text-[10px] font-semibold text-primary animate-pulse">
                          RUNNING
                        </span>
                      )}
                      {isDone && (
                        <span className="text-[10px] font-semibold text-success">
                          COMPLETE
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Simulated terminal feedback log */}
            <div className="p-3 bg-zinc-900/40 border border-zinc-900 rounded-lg text-[10px] text-zinc-500 leading-relaxed font-mono flex flex-col gap-1">
              <span>PROJECTION CONFIG: GEMINI-2.5-FLASH</span>
              <span>SCHEMA TARGET: MULTI-SCENARIO SCALES [2..4]</span>
              <span>TEMPERATURE: 0.3 | DISCLAIMERS: TRUE</span>
              {currentStepIndex >= 3 && (
                <span className="text-accent animate-pulse-slow">
                  &gt;&gt; LOG: Model simulating scenario branches. Compiling timelines...
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
