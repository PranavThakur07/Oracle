import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { decisionService } from '../services/api';
import type { Decision } from '../services/api';
import { 
  Terminal, 
  Check, 
  Sparkles, 
  ArrowRight,
  User,
  DollarSign,
  Globe,
  Gauge,
  Calendar,
  Briefcase,
  Mic,
  MicOff,
  History,
  Info,
  ChevronRight
} from 'lucide-react';

interface LoadingStep {
  id: number;
  label: string;
  duration: number;
}

const REASONING_STEPS: LoadingStep[] = [
  { id: 1, label: "Understanding your goal", duration: 1300 },
  { id: 2, label: "Identifying constraints", duration: 1300 },
  { id: 3, label: "Exploring possible paths", duration: 1400 },
  { id: 4, label: "Simulating future outcomes", duration: 1400 },
  { id: 5, label: "Comparing tradeoffs", duration: 1300 },
  { id: 6, label: "Evaluating opportunity costs", duration: 1300 },
  { id: 7, label: "Generating insights", duration: 1300 }
];

const SUGGESTED_PROMPTS = [
  { text: "Should I pursue an MBA after MCA?", icon: "🎓" },
  { text: "Should I relocate to Bangalore?", icon: "📍" },
  { text: "Should I start my own startup?", icon: "🚀" },
  { text: "Should I buy a house or continue renting?", icon: "🏠" }
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
  const [riskAppetite, setRiskAppetite] = useState('');
  const [timeHorizon, setTimeHorizon] = useState('');
  
  // Voice state
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Loading & Flow State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [error, setError] = useState('');
  const [recentDecisions, setRecentDecisions] = useState<Decision[]>([]);
  // Fetch recent decisions for quick access
  useEffect(() => {
    const fetchRecent = async () => {
      try {
        const data = await decisionService.getHistory();
        setRecentDecisions(data.slice(0, 3)); // Show top 3
      } catch (err) {
        console.error("Failed to load recent history in composer:", err);
      }
    };
    fetchRecent();
  }, []);

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
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  // Voice Input Speech-to-Text Handler
  const handleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input is not supported in this browser. Please type your query.");
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const resultText = event.results[0][0].transcript;
      setQuery(prev => prev ? `${prev} ${resultText}` : resultText);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

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
      setError("Please enter a decision query.");
      setIsSubmitting(false);
      return;
    }

    // Sequential steps progress animation
    const stepIntervals: number[] = [];
    let completedSteps = 0;

    const startStepAnimation = (index: number) => {
      if (index >= REASONING_STEPS.length) return;
      
      const timer = window.setTimeout(() => {
        completedSteps++;
        setCurrentStepIndex(completedSteps);
        startStepAnimation(completedSteps);
      }, REASONING_STEPS[index].duration);
      
      stepIntervals.push(timer);
    };

    startStepAnimation(0);

    try {
      const result = await decisionService.analyze(q, context);
      const totalAnimDuration = REASONING_STEPS.reduce((sum, s) => sum + s.duration, 0);
      
      setTimeout(() => {
        stepIntervals.forEach(clearTimeout);
        navigate(`/history/${result.id}`);
      }, totalAnimDuration + 500);

    } catch (err: any) {
      stepIntervals.forEach(clearTimeout);
      setIsSubmitting(false);
      setError(err.response?.data?.detail || "An error occurred during simulation. Please check your API key or try again.");
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    triggerSimulation();
  };

  // Helper check: does the prompt lack parameter details?
  const lacksContextInfo = query.length > 10 && !age && !budget && !country && !goals;

  return (
    <div className="space-y-12 font-sans pb-16 min-h-[calc(100vh-140px)] flex flex-col justify-center relative">
      <AnimatePresence mode="wait">
        {!isSubmitting ? (
          <motion.div
            key="composer-view"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: -12 }}
            className="w-full max-w-3xl mx-auto space-y-8 relative"
          >
            {/* Header branding / intro */}
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-display font-bold text-white tracking-tight text-glow-primary">
                Explore Your Futures
              </h2>
              <p className="text-xs text-zinc-550 max-w-md mx-auto">
                Model decisions, simulate timelines, and visualize tradeoffs in our sandbox environment.
              </p>
            </div>

            {/* Central Decision Composer (Apple spotlight style) */}
            <form onSubmit={handleFormSubmit} className="space-y-6">
              <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.4)] overflow-hidden transition-all duration-300 focus-within:border-zinc-700/60 focus-within:shadow-[0_20px_50px_rgba(37,99,235,0.08)]">
                {/* Composer Text Input Area */}
                <div className="p-5 flex items-start gap-4">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center text-primary shrink-0 mt-0.5">
                    <Sparkles size={16} className="animate-pulse-slow" />
                  </div>
                  
                  <div className="flex-1 space-y-1">
                    <textarea
                      required
                      rows={2}
                      placeholder="What critical crossroad are you facing?"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="w-full bg-transparent border-0 text-zinc-150 placeholder-zinc-600 focus:outline-none focus:ring-0 text-sm sm:text-base leading-relaxed resize-none p-0"
                    />
                  </div>

                  {/* Mic Voice toggle */}
                  <button
                    type="button"
                    onClick={handleVoiceInput}
                    className={`p-2.5 rounded-xl border transition-all duration-300 cursor-pointer ${
                      isListening 
                        ? 'bg-danger/10 border-danger/40 text-danger animate-pulse' 
                        : 'bg-zinc-900 border-zinc-850 text-zinc-500 hover:text-zinc-200 hover:border-zinc-700'
                    }`}
                    title="Voice Input"
                  >
                    {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                  </button>
                </div>

                {/* Inline interactive context assistant prompt */}
                <AnimatePresence>
                  {lacksContextInfo && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="px-5 pb-5 border-t border-zinc-900/60 pt-4"
                    >
                      <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/15 space-y-3">
                        <div className="flex items-center gap-2 text-[10px] font-mono text-primary font-bold uppercase tracking-wider">
                          <Info size={11} />
                          <span>Guiding Context Needed</span>
                        </div>
                        <p className="text-[11px] text-zinc-405 leading-relaxed">
                          Oracle works best when provided with constraints. Add quick parameters below or click simulate to proceed.
                        </p>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-sans">
                          <input
                            type="text"
                            placeholder="Age (e.g. 24)"
                            value={age}
                            onChange={(e) => setAge(e.target.value)}
                            className="bg-zinc-900/80 border border-zinc-850 rounded-lg p-2 text-[11px] text-zinc-300 focus:outline-none focus:border-zinc-700"
                          />
                          <input
                            type="text"
                            placeholder="Budget (e.g. $10k)"
                            value={budget}
                            onChange={(e) => setBudget(e.target.value)}
                            className="bg-zinc-900/80 border border-zinc-850 rounded-lg p-2 text-[11px] text-zinc-300 focus:outline-none focus:border-zinc-700"
                          />
                          <input
                            type="text"
                            placeholder="Country (e.g. US)"
                            value={country}
                            onChange={(e) => setCountry(e.target.value)}
                            className="bg-zinc-900/80 border border-zinc-850 rounded-lg p-2 text-[11px] text-zinc-300 focus:outline-none focus:border-zinc-700"
                          />
                          <button
                            type="button"
                            onClick={() => setShowAdvanced(true)}
                            className="text-[10px] font-semibold text-primary hover:underline text-left pl-2 flex items-center gap-0.5"
                          >
                            <span>More Params</span>
                            <ChevronRight size={10} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Composer Footer Actions */}
                <div className="px-5 py-3 border-t border-zinc-900/80 bg-zinc-950/40 flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                  <span>* Press enter to initiate simulation</span>
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="hover:text-zinc-300 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <span>Advanced context options</span>
                    <span>{showAdvanced ? '[-]' : '[+]'}</span>
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3 text-xs text-danger bg-danger/10 border border-danger/20 rounded-xl max-w-lg mx-auto text-center font-mono">
                  {error}
                </div>
              )}

              {/* Collapsible Advanced parameter panel */}
              <AnimatePresence>
                {showAdvanced && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="p-6 rounded-2xl border border-zinc-850 bg-zinc-950/20 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl mx-auto shadow-lg"
                  >
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                        <User size={11} />
                        <span>Current Age</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 24"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        className="w-full bg-zinc-900/40 border border-zinc-850 rounded-lg p-2 text-xs text-zinc-300 placeholder-zinc-650 focus:outline-none focus:border-zinc-700"
                      />
                      <p className="text-[9px] text-zinc-600">Your current age in years.</p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                        <DollarSign size={11} />
                        <span>Current Income / Salary</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. $50,000 / Student"
                        value={salary}
                        onChange={(e) => setSalary(e.target.value)}
                        className="w-full bg-zinc-900/40 border border-zinc-850 rounded-lg p-2 text-xs text-zinc-300 placeholder-zinc-650 focus:outline-none focus:border-zinc-700"
                      />
                      <p className="text-[9px] text-zinc-600">Your current annual salary or income status.</p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                        <DollarSign size={11} />
                        <span>Available Budget / Capital</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. $15,000"
                        value={budget}
                        onChange={(e) => setBudget(e.target.value)}
                        className="w-full bg-zinc-900/40 border border-zinc-850 rounded-lg p-2 text-xs text-zinc-300 placeholder-zinc-650 focus:outline-none focus:border-zinc-700"
                      />
                      <p className="text-[9px] text-zinc-600">Maximum financial allocation for this decision.</p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                        <Globe size={11} />
                        <span>Geographical Location</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. India"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className="w-full bg-zinc-900/40 border border-zinc-850 rounded-lg p-2 text-xs text-zinc-300 placeholder-zinc-650 focus:outline-none focus:border-zinc-700"
                      />
                      <p className="text-[9px] text-zinc-600">The country or city of origin/target.</p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                        <Gauge size={11} />
                        <span>Risk Tolerance</span>
                      </label>
                      <select
                        value={riskAppetite}
                        onChange={(e) => setRiskAppetite(e.target.value)}
                        className="w-full bg-zinc-900/40 border border-zinc-850 rounded-lg p-2 text-xs text-zinc-300 focus:outline-none focus:border-zinc-700 font-sans"
                      >
                        <option value="">Let AI Evaluate (Auto)</option>
                        <option value="Low">Low (Preserve & Protect)</option>
                        <option value="Medium">Medium (Balanced Growth)</option>
                        <option value="High">High (High Risk / Aggressive)</option>
                      </select>
                      <p className="text-[9px] text-zinc-600">Your comfort level with downside uncertainty.</p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                        <Calendar size={11} />
                        <span>Outlook Timeline</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 5 Years (Let AI decide if empty)"
                        value={timeHorizon}
                        onChange={(e) => setTimeHorizon(e.target.value)}
                        className="w-full bg-zinc-900/40 border border-zinc-850 rounded-lg p-2 text-xs text-zinc-300 placeholder-zinc-650 focus:outline-none focus:border-zinc-700"
                      />
                      <p className="text-[9px] text-zinc-600">Target simulation duration (years or months).</p>
                    </div>

                    <div className="space-y-1 md:col-span-2">
                      <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                        <Briefcase size={11} />
                        <span>Primary Goals / Aspirations</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Secure a leadership role in a tech startup..."
                        value={goals}
                        onChange={(e) => setGoals(e.target.value)}
                        className="w-full bg-zinc-900/40 border border-zinc-850 rounded-lg p-2.5 text-xs text-zinc-300 placeholder-zinc-650 focus:outline-none focus:border-zinc-700"
                      />
                      <p className="text-[9px] text-zinc-600">Your core ambitions or target achievements.</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action Suggestion Pills */}
              <div className="space-y-2 max-w-xl mx-auto">
                <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider block text-center font-mono">
                  Suggested Scenarios
                </span>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {SUGGESTED_PROMPTS.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setQuery(item.text)}
                      className="px-3.5 py-2 rounded-xl bg-zinc-900/60 border border-zinc-850 hover:bg-zinc-800/80 hover:border-zinc-700 text-xs text-zinc-300 hover:text-white transition-all duration-300 flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <span>{item.icon}</span>
                      <span>{item.text}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Workspace Action Buttons */}
              <div className="flex items-center justify-center gap-3 pt-4">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-primary hover:bg-blue-600 text-xs font-semibold text-white shadow-[0_4px_20px_rgba(37,99,235,0.25)] hover:shadow-[0_4px_25px_rgba(37,99,235,0.4)] transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                >
                  <span>Simulate Alternative Futures</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </form>

            {/* Recent simulations dashboard link block */}
            {recentDecisions.length > 0 && (
              <div className="pt-8 border-t border-zinc-900/60 max-w-xl mx-auto space-y-3">
                <div className="flex items-center gap-2 text-[10px] font-semibold text-zinc-600 uppercase tracking-wider font-mono">
                  <History size={12} />
                  <span>Recent Simulations</span>
                </div>
                <div className="space-y-2">
                  {recentDecisions.map((dec) => (
                    <div
                      key={dec.id}
                      onClick={() => navigate(`/history/${dec.id}`)}
                      className="flex items-center justify-between p-3.5 rounded-xl border border-zinc-900 bg-zinc-950/20 hover:border-zinc-800 hover:bg-zinc-900/30 transition-all duration-300 cursor-pointer text-xs"
                    >
                      <span className="text-zinc-300 truncate max-w-md font-medium">{dec.query}</span>
                      <span className="text-[10px] font-mono text-zinc-550 flex items-center gap-0.5 font-semibold">
                        <span>View</span>
                        <ChevronRight size={11} />
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          /* High-end Reasoning Sequence Loader Interface */
          <motion.div
            key="loading-reasoner"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-xl mx-auto p-8 rounded-2xl border border-zinc-850 bg-zinc-950/80 shadow-[0_25px_60px_rgba(0,0,0,0.55)] space-y-8 font-mono"
          >
            {/* Window title bar */}
            <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
              <div className="flex items-center gap-2 text-zinc-550">
                <Terminal size={14} className="text-primary animate-pulse" />
                <span className="text-xs font-semibold uppercase tracking-wider">Oracle Reasoning Engine</span>
              </div>
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-danger/40"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-warning/40"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-success/40"></div>
              </div>
            </div>

            {/* Custom interactive processing graph */}
            <div className="h-28 w-full border border-zinc-900 rounded-xl bg-zinc-950/50 flex items-center justify-center relative overflow-hidden">
              {/* Pulsing center node */}
              <div className="h-6 w-6 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center relative z-10">
                <Sparkles size={11} className="text-white animate-spin-slow" />
                <div className="absolute inset-0 h-full w-full rounded-full bg-primary animate-ping opacity-25"></div>
              </div>
              
              {/* Radial branching wires */}
              <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                {/* Branch A line */}
                <path d="M 288 56 L 150 35 L 70 35" stroke="#2563EB" strokeWidth="1.5" strokeOpacity={currentStepIndex >= 2 ? "0.8" : "0.15"} strokeDasharray={currentStepIndex === 2 ? "3 3" : ""} className="transition-all duration-500" />
                <circle cx="70" cy="35" r="4.5" fill="#2563EB" fillOpacity={currentStepIndex >= 2 ? "1" : "0.1"} className="transition-all duration-550" />

                {/* Branch B line */}
                <path d="M 288 56 L 400 56 L 500 56" stroke="#10B981" strokeWidth="1.5" strokeOpacity={currentStepIndex >= 3 ? "0.8" : "0.15"} strokeDasharray={currentStepIndex === 3 ? "3 3" : ""} className="transition-all duration-500" />
                <circle cx="500" cy="56" r="4.5" fill="#10B981" fillOpacity={currentStepIndex >= 3 ? "1" : "0.1"} className="transition-all duration-550" />

                {/* Branch C line */}
                <path d="M 288 56 L 200 80 L 120 80" stroke="#8B5CF6" strokeWidth="1.5" strokeOpacity={currentStepIndex >= 4 ? "0.8" : "0.15"} strokeDasharray={currentStepIndex === 4 ? "3 3" : ""} className="transition-all duration-500" />
                <circle cx="120" cy="80" r="4.5" fill="#8B5CF6" fillOpacity={currentStepIndex >= 4 ? "1" : "0.1"} className="transition-all duration-550" />
              </svg>
            </div>

            {/* Reasoning Sequential List */}
            <div className="space-y-3.5 pt-2">
              {REASONING_STEPS.map((step, idx) => {
                const isDone = currentStepIndex > idx;
                const isActive = currentStepIndex === idx;

                return (
                  <div 
                    key={step.id} 
                    className={`flex items-center justify-between text-xs transition-colors duration-300 ${
                      isDone ? 'text-success' : isActive ? 'text-primary font-semibold' : 'text-zinc-650'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {isDone ? (
                        <div className="h-5 w-5 rounded-full bg-success/15 border border-success/35 flex items-center justify-center text-success text-[10px] shrink-0 shadow-sm text-glow-success">
                          <Check size={11} />
                        </div>
                      ) : isActive ? (
                        <div className="h-5 w-5 rounded-full bg-primary/10 border border-primary/40 flex items-center justify-center shrink-0 shadow-sm">
                          <span className="h-2 w-2 rounded-full bg-primary animate-ping"></span>
                        </div>
                      ) : (
                        <div className="h-5 w-5 rounded-full border border-zinc-900 flex items-center justify-center shrink-0 text-zinc-700">
                          <span className="text-[10px]">{step.id}</span>
                        </div>
                      )}
                      <span>{step.label}</span>
                    </div>
                    
                    {isActive && (
                      <span className="text-[10px] font-semibold text-primary animate-pulse tracking-widest font-mono">
                        PROCESSING
                      </span>
                    )}
                    {isDone && (
                      <span className="text-[10px] font-semibold text-success font-mono">
                        DONE
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Real-time details console output */}
            <div className="p-4 bg-zinc-900/40 border border-zinc-900 rounded-xl text-[10px] text-zinc-550 leading-relaxed font-mono flex flex-col gap-1.5 shadow-inner">
              <span className="text-zinc-500 font-bold uppercase">MODEL OUTPUT STREAM</span>
              <span>ENGINE: GEMINI-2.5-FLASH-COGNITIVE-DEEP</span>
              {currentStepIndex >= 1 && <span>&gt; Mapping constraints: [Budget: {budget || 'null'}, Salary: {salary || 'null'}, Risk: {riskAppetite}]</span>}
              {currentStepIndex >= 3 && <span className="text-accent">&gt; Timelines matched. Simulating milestone coordinates...</span>}
              {currentStepIndex >= 5 && <span className="text-success">&gt; Calculating compound interest and opportunity costs for branches...</span>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
