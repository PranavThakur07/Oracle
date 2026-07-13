import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { decisionService } from '../services/api';
import type { DecisionDetails } from '../services/api';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as ReChartsTooltip,
  Legend,
  CartesianGrid,
  ReferenceLine
} from 'recharts';
import { 
  ArrowLeft, 
  Download, 
  Star, 
  Send, 
  AlertTriangle, 
  Info,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Rocket,
  Scale,
  Anchor,
  HelpCircle,
  X,
  Gauge,
  TrendingUp,
  Brain,
  Layers,
  Check
} from 'lucide-react';


const SCENARIO_COLORS: Record<string, string> = {
  A: '#3B82F6', // Blue (Accelerated)
  B: '#10B981', // Emerald (Balanced)
  C: '#8B5CF6', // Purple (Defensive)
  D: '#F59E0B'  // Amber (Wildcard)
};

const SCENARIO_IDENTITIES: Record<string, { title: string; philosophy: string; icon: any; color: string; desc: string }> = {
  A: {
    title: "Accelerated Growth",
    philosophy: "Aggressive Leap / High Risk, High Reward",
    icon: Rocket,
    color: "#3B82F6",
    desc: "Maximizes rapid career climbs and capital accumulation at the expense of stability."
  },
  B: {
    title: "Balanced Path",
    philosophy: "Sustainable & Consistent Development",
    icon: Scale,
    color: "#10B981",
    desc: "Maintains standard growth pace and preserves personal time, avoiding cognitive burnout."
  },
  C: {
    title: "Defensive Hedge",
    philosophy: "Downside Risk Mitigation & Safety First",
    icon: Anchor,
    color: "#8B5CF6",
    desc: "Guarantees alternative security paths and safeguards present assets against downturns."
  },
  D: {
    title: "Creative Outlier",
    philosophy: "High Innovation / Unconventional Pivot",
    icon: Sparkles,
    color: "#F59E0B",
    desc: "Takes non-linear, experimental paths to uncover unique, high-value opportunities."
  }
};

export const SimulationDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [data, setData] = useState<DecisionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Interactive UI State
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
  const [selectedPriority, setSelectedPriority] = useState<string | null>(null);
  const [expandedScenarioId, setExpandedScenarioId] = useState<string | null>(null);
  
  // Timeline Scrubber State
  const [timelineYears, setTimelineYears] = useState<string[]>(['2026', '2027', '2028', '2030']);
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  
  // Explainability Panel State
  const [explainingMetric, setExplainingMetric] = useState<{
    scenarioId: string;
    scenarioTitle: string;
    metricName: string;
    score: number;
    explanation: string;
  } | null>(null);

  // Follow-up Chat State
  const [chatQuery, setChatQuery] = useState('');
  const [submittingChat, setSubmittingChat] = useState(false);
  
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const fetchDetails = async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const details = await decisionService.getDetails(Number(id));
      setData(details);
      
      // Auto-extract years from timelines
      if (details.response_json?.scenarios?.length > 0) {
        const yearsSet = new Set<string>();
        details.response_json.scenarios.forEach(s => {
          s.timeline.forEach(t => {
            if (t.year && t.year.trim()) {
              yearsSet.add(t.year.trim());
            }
          });
        });
        const sortedYears = Array.from(yearsSet).sort((a, b) => parseInt(a) - parseInt(b));
        if (sortedYears.length > 0) {
          setTimelineYears(sortedYears);
          setSelectedYear(sortedYears[0]);
        }
        
        setActiveScenarioId(details.response_json.scenarios[0].id);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load simulation details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [data?.follow_ups, submittingChat]);

  const handleFavoriteToggle = async () => {
    if (!data) return;
    try {
      const updated = await decisionService.toggleFavorite(data.id);
      setData(prev => prev ? { ...prev, is_favorite: updated.is_favorite } : null);
    } catch (err) {
      console.error('Failed to toggle favorite status:', err);
    }
  };

  const handlePriorityClick = (priority: string, scenarioId: string) => {
    setSelectedPriority(priority);
    setActiveScenarioId(scenarioId);
    
    const cardEl = cardRefs.current[scenarioId];
    if (cardEl) {
      cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleDownloadPdf = async () => {
    if (!data) return;
    try {
      await decisionService.downloadPdfDirect(data.id, `oracle_report_${data.id}.pdf`);
    } catch (err) {
      alert('Failed to download PDF report. Please try again.');
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data || !chatQuery.trim() || submittingChat) return;

    const queryText = chatQuery;
    setChatQuery('');
    setSubmittingChat(true);

    try {
      const newFollowUp = await decisionService.addFollowUp(data.id, queryText);
      
      setData(prev => {
        if (!prev) return null;
        
        const updatedFollowups = [...prev.follow_ups, newFollowUp];
        let updatedResponseJson = { ...prev.response_json };
        
        if (newFollowUp.response_json?.updated_scenarios) {
          updatedResponseJson.scenarios = newFollowUp.response_json.updated_scenarios;
          
          if (newFollowUp.response_json.updated_comparison_metrics) {
            updatedResponseJson.comparison_metrics = newFollowUp.response_json.updated_comparison_metrics;
          }
          if (newFollowUp.response_json.updated_recommendations) {
            updatedResponseJson.recommendations = newFollowUp.response_json.updated_recommendations;
          }
        }
        
        return {
          ...prev,
          response_json: updatedResponseJson,
          follow_ups: updatedFollowups
        };
      });

    } catch (err) {
      console.error('Followup generation failed:', err);
      alert('Failed to get response from simulation model.');
    } finally {
      setSubmittingChat(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <RefreshCw className="text-primary animate-spin" size={32} />
        <span className="text-xs text-zinc-500 font-mono">Exploring alternate futures...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 rounded-xl border border-danger/25 bg-danger/10 text-center max-w-xl mx-auto space-y-4">
        <AlertTriangle className="text-danger mx-auto" size={32} />
        <p className="text-sm font-semibold text-white">{error || 'Simulation not found'}</p>
        <button onClick={() => navigate('/dashboard')} className="px-4 py-2 text-xs font-semibold rounded bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white">
          Return to Workspace
        </button>
      </div>
    );
  }

  const { query, context, response_json, is_favorite } = data;
  const { scenarios, assumptions, disclaimer, recommendations, comparison_metrics } = response_json;

  // Radar Chart Data compiling
  const metricsKeys = ['risk', 'cost', 'growth', 'learning', 'work_life_balance'];
  const metricLabels: Record<string, string> = {
    risk: 'Risk Index',
    cost: 'Investment Cost',
    growth: 'Career Growth',
    learning: 'Learning Potential',
    work_life_balance: 'Work-Life Balance'
  };

  const radarData = metricsKeys.map(key => {
    const row: Record<string, any> = { subject: metricLabels[key] };
    scenarios.forEach(s => {
      row[s.id] = comparison_metrics[s.id]?.[key] || 0;
    });
    return row;
  });

  // Calculate salary projections for dynamic timeline scrubbing
  const getProjectedSalary = (scenarioId: string, yearStr: string) => {
    const baseSalaryStr = context.current_salary || "$50,000";
    const numericSalary = parseInt(baseSalaryStr.replace(/[^0-9]/g, '')) || 50000;
    const currentYear = parseInt(yearStr) || 2026;
    const startYear = parseInt(timelineYears[0]) || 2026;
    const yearsDiff = Math.max(0, currentYear - startYear);
    
    let multiplier = 1.05; // 5% baseline
    if (scenarioId === 'A') multiplier = 1.22; // Accelerated: 22% compound growth
    if (scenarioId === 'B') multiplier = 1.10; // Balanced: 10% compound growth
    if (scenarioId === 'C') multiplier = 1.03; // Defensive: 3% compound growth
    if (scenarioId === 'D') multiplier = 1.15; // Wildcard: 15% compound growth

    const projected = numericSalary * Math.pow(multiplier, yearsDiff);
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(projected);
  };

  // Compile Line Chart data across all timeline years
  const lineChartData = timelineYears.map(year => {
    const row: Record<string, any> = { name: year };
    scenarios.forEach(s => {
      const salaryStr = getProjectedSalary(s.id, year);
      row[s.id] = parseInt(salaryStr.replace(/[^0-9]/g, '')) || 0;
    });
    return row;
  });

  const getMetricExplanation = (scenarioId: string, metric: string, score: number) => {
    const scenario = scenarios.find(s => s.id === scenarioId);
    if (!scenario) return "No explanation available.";
    
    if (metric === 'risk') {
      return `Oracle calculated a Risk Index of ${score}/10 because this pathway involves key risks such as: ${scenario.risks.join(', ')}. The confidence level in this risk simulation is ${scenario.confidence_level}%.`;
    }
    if (metric === 'growth') {
      return `The Career Growth rating of ${score}/10 is backed by the expected benefits: "${scenario.expected_benefits}". Over a multi-year horizon, this yields compound advancement.`;
    }
    if (metric === 'cost') {
      return `The Investment Cost of ${score}/10 corresponds to the estimated financial layout: "${scenario.estimated_costs}".`;
    }
    return `This score of ${score}/10 is computed using user constraints, starting assumptions (${assumptions[0]}), and scenario parameters: "${scenario.summary}".`;
  };

  return (
    <div className="space-y-12 font-sans pb-24 relative">
      
      {/* Title bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-6">
        <div className="space-y-2">
          <button 
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 text-xs text-zinc-550 hover:text-zinc-350 transition-colors focus:outline-none cursor-pointer"
          >
            <ArrowLeft size={12} />
            <span>Workspace Composer</span>
          </button>
          
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <span>{query}</span>
            <button 
              onClick={handleFavoriteToggle} 
              className="text-zinc-550 hover:text-warning transition-colors cursor-pointer"
            >
              <Star size={18} className={is_favorite ? 'text-warning fill-warning' : ''} />
            </button>
          </h2>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-zinc-500 font-mono">
            {context.age && <span>Age: {context.age}</span>}
            {context.budget && <span>Budget: {context.budget}</span>}
            {context.country && <span>Location: {context.country}</span>}
            {context.risk_appetite && <span>Risk Appetite: {context.risk_appetite}</span>}
            {context.time_horizon && <span>Horizon: {context.time_horizon}</span>}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleDownloadPdf}
            className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 text-zinc-300 hover:text-white transition-all cursor-pointer"
          >
            <Download size={13} />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* AI Transparency Banner */}
      <div className="p-5 rounded-2xl border border-zinc-900 bg-zinc-950/40 space-y-4">
        <div className="flex items-center gap-2 text-[10px] font-semibold text-zinc-500 tracking-wider uppercase font-mono">
          <Brain size={14} className="text-primary" />
          <span>AI Simulation Parameters & Transparency Report</span>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed max-w-4xl">
          <strong>Important Notice:</strong> This simulation is generated using your inputs, assumptions, and AI reasoning. It is designed to help you evaluate trade-offs, compare scenarios, and map opportunity costs. Oracle does not predict the future; it models possibilities.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-zinc-900/60">
          <div className="space-y-1.5">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block font-mono">Primary Factors Considered</span>
            <ul className="text-xs text-zinc-450 space-y-1 list-disc pl-4 font-sans">
              {assumptions.slice(0, 3).map((ass, i) => <li key={i}>{ass}</li>)}
            </ul>
          </div>
          <div className="space-y-1.5">
            <span className="text-[9px] font-bold text-danger/80 uppercase tracking-widest block font-mono">Model Limits</span>
            <p className="text-xs text-zinc-500 italic leading-relaxed">
              {disclaimer}
            </p>
          </div>
        </div>
      </div>

      {/* Recommendation Engine Tabs */}
      <div className="space-y-3">
        <span className="text-[10px] font-semibold text-zinc-555 tracking-wider uppercase font-mono block">
          Filters & Priority Focus
        </span>
        <div className="flex flex-wrap gap-2">
          {Object.entries(recommendations).map(([priority, scenarioId]) => {
            const isSelected = selectedPriority === priority;
            const config = SCENARIO_IDENTITIES[scenarioId] || { color: '#3B82F6' };
            return (
              <button
                key={priority}
                onClick={() => handlePriorityClick(priority, scenarioId)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all duration-300 cursor-pointer ${
                  isSelected 
                    ? 'bg-primary/20 border-primary text-white shadow-[0_0_12px_rgba(37,99,235,0.2)]' 
                    : 'bg-zinc-950/40 border-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                {priority} → <span style={{ color: config.color }}>{SCENARIO_IDENTITIES[scenarioId]?.title || `Scenario ${scenarioId}`}</span>
              </button>
            );
          })}
          {selectedPriority && (
            <button 
              onClick={() => setSelectedPriority(null)}
              className="text-[10px] text-zinc-500 hover:text-zinc-300 font-mono self-center ml-2 cursor-pointer"
            >
              Clear filter
            </button>
          )}
        </div>
      </div>

      {/* Dynamic Scenario Projections Grid */}
      <div className="space-y-6">
        <span className="text-[10px] font-semibold text-zinc-555 tracking-wider uppercase font-mono block">
          Scenario Personalities & Projections
        </span>
        
        <div className={`grid grid-cols-1 gap-6 ${
          scenarios.length === 2 ? 'md:grid-cols-2' : scenarios.length === 4 ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-3'
        }`}>
          {scenarios.map((s) => {
            const isHighlighted = selectedPriority && recommendations[selectedPriority] === s.id;
            const config = SCENARIO_IDENTITIES[s.id] || { title: s.title, philosophy: "Custom Pathway", icon: Sparkles, color: '#71717A', desc: s.summary };
            const IconComponent = config.icon;
            const metricsObj = comparison_metrics[s.id] || {};
            const isExpanded = expandedScenarioId === s.id;
            const isActiveCard = activeScenarioId === s.id;

            return (
              <div
                key={s.id}
                ref={el => { cardRefs.current[s.id] = el; }}
                onClick={() => setActiveScenarioId(s.id)}
                className={`p-6 rounded-2xl glass-card relative flex flex-col justify-between cursor-pointer transition-all duration-300 ${
                  isHighlighted 
                    ? 'ring-2 ring-primary border-transparent bg-zinc-900/90 shadow-[0_15px_40px_rgba(37,99,235,0.15)]' 
                    : isActiveCard
                      ? 'ring-1 ring-zinc-700 border-transparent bg-zinc-900/40 shadow-lg'
                      : 'bg-zinc-950/20'
                }`}
              >
                {isHighlighted && (
                  <span className="absolute -top-2.5 left-6 px-2.5 py-0.5 rounded bg-primary text-[8px] font-mono font-bold text-white uppercase tracking-widest shadow">
                    Aligned Scenario
                  </span>
                )}

                <div className="space-y-4">
                  {/* Persona Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span 
                          className="h-2 w-2 rounded-full" 
                          style={{ backgroundColor: config.color }}
                        ></span>
                        <span className="text-[10px] font-bold font-mono tracking-wider uppercase text-zinc-500">
                          Future {s.id}
                        </span>
                      </div>
                      <h3 className="font-display font-bold text-lg text-white leading-tight">
                        {config.title}
                      </h3>
                      <p className="text-[10px] text-zinc-500 font-mono font-semibold" style={{ color: config.color }}>
                        {config.philosophy}
                      </p>
                    </div>
                    <div 
                      className="h-10 w-10 rounded-xl flex items-center justify-center border shrink-0"
                      style={{ backgroundColor: `${config.color}0a`, borderColor: `${config.color}25`, color: config.color }}
                    >
                      <IconComponent size={18} />
                    </div>
                  </div>

                  <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                    {s.summary}
                  </p>

                  {/* Dynamic Sliders representing stats */}
                  <div className="space-y-3.5 border-t border-zinc-900 pt-4 font-mono text-[10px]">
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-zinc-400">
                        <span className="flex items-center gap-1">
                          <Gauge size={11} className="text-zinc-550" />
                          <span>Risk Index</span>
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-zinc-200">{metricsObj.risk}/10</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExplainingMetric({
                                scenarioId: s.id,
                                scenarioTitle: config.title,
                                metricName: 'Risk Index',
                                score: metricsObj.risk,
                                explanation: getMetricExplanation(s.id, 'risk', metricsObj.risk)
                              });
                            }}
                            className="text-zinc-650 hover:text-zinc-400 transition-colors p-0.5 cursor-pointer"
                            title="Why this rating?"
                          >
                            <HelpCircle size={10} />
                          </button>
                        </div>
                      </div>
                      <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500" 
                          style={{ width: `${(metricsObj.risk || 0) * 10}%`, backgroundColor: SCENARIO_COLORS.C }}
                        ></div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-zinc-400">
                        <span className="flex items-center gap-1">
                          <TrendingUp size={11} className="text-zinc-555" />
                          <span>Growth Score</span>
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-zinc-200">{metricsObj.growth}/10</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExplainingMetric({
                                scenarioId: s.id,
                                scenarioTitle: config.title,
                                metricName: 'Growth Score',
                                score: metricsObj.growth,
                                explanation: getMetricExplanation(s.id, 'growth', metricsObj.growth)
                              });
                            }}
                            className="text-zinc-650 hover:text-zinc-400 transition-colors p-0.5 cursor-pointer"
                            title="Why this rating?"
                          >
                            <HelpCircle size={10} />
                          </button>
                        </div>
                      </div>
                      <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500" 
                          style={{ width: `${(metricsObj.growth || 0) * 10}%`, backgroundColor: SCENARIO_COLORS.B }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Summary list of costs/limits */}
                  <div className="space-y-2 text-xs pt-2 border-t border-zinc-900 font-sans">
                    <div className="text-zinc-450 leading-normal">
                      <span className="font-semibold text-zinc-300">Investment Cost: </span>
                      <span>{s.estimated_costs}</span>
                    </div>
                    <div className="text-zinc-450 leading-normal">
                      <span className="font-semibold text-zinc-300">Opportunity Cost: </span>
                      <span className="italic">"{s.opportunity_cost}"</span>
                    </div>
                  </div>
                </div>

                {/* Collapsible Details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden space-y-4 pt-4 border-t border-zinc-900 text-xs font-sans"
                    >
                      <div className="space-y-1">
                        <span className="font-bold text-success flex items-center gap-1">
                          <Check size={11} />
                          <span>Pros</span>
                        </span>
                        <ul className="list-disc pl-4 text-zinc-400 space-y-1 leading-relaxed">
                          {s.pros.slice(0, 3).map((pro, i) => <li key={i}>{pro}</li>)}
                        </ul>
                      </div>
                      
                      <div className="space-y-1">
                        <span className="font-bold text-danger flex items-center gap-1">
                          <X size={11} />
                          <span>Cons</span>
                        </span>
                        <ul className="list-disc pl-4 text-zinc-400 space-y-1 leading-relaxed">
                          {s.cons.slice(0, 3).map((con, i) => <li key={i}>{con}</li>)}
                        </ul>
                      </div>

                      <div className="space-y-1">
                        <span className="font-bold text-white flex items-center gap-1.5">
                          <Layers size={11} />
                          <span>Required Skills</span>
                        </span>
                        <div className="flex flex-wrap gap-1 pt-1">
                          {s.skills_required.map((skill, i) => (
                            <span key={i} className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-400 font-mono">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="font-bold text-primary flex items-center gap-1">
                          <ArrowRight size={11} />
                          <span>Next Steps</span>
                        </span>
                        <ol className="list-decimal pl-4 text-zinc-400 space-y-1 leading-relaxed">
                          {s.next_steps.slice(0, 2).map((step, i) => <li key={i}>{step}</li>)}
                        </ol>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedScenarioId(isExpanded ? null : s.id);
                  }}
                  className="mt-5 w-full py-2 bg-zinc-900/60 border border-zinc-850 hover:bg-zinc-800 text-xs font-semibold rounded-xl text-zinc-300 hover:text-white transition-all cursor-pointer"
                >
                  {isExpanded ? 'Hide Details' : 'Explore Tradeoffs'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Signature Feature: Interactive Scrubber Timeline */}
      <div className="p-6 rounded-2xl border border-zinc-800/80 bg-zinc-950/40 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="font-display font-bold text-lg text-white">Interactive Decision Timeline</h3>
            <p className="text-xs text-zinc-550 font-mono">Scrub years to simulate outcomes, milestones, and compound career income growth.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-zinc-500 font-semibold uppercase">Currently Simulating:</span>
            <span className="px-3 py-1 bg-primary/10 border border-primary/25 rounded-lg text-xs font-mono font-bold text-primary animate-pulse-slow">
              Year {selectedYear}
            </span>
          </div>
        </div>

        {/* Timeline Slider Scrubber */}
        <div className="space-y-4 max-w-2xl mx-auto py-2">
          <input
            type="range"
            min={0}
            max={timelineYears.length - 1}
            value={timelineYears.indexOf(selectedYear)}
            onChange={(e) => setSelectedYear(timelineYears[parseInt(e.target.value)])}
            className="w-full h-1.5 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <div className="flex justify-between text-[11px] font-mono font-bold text-zinc-500 px-1">
            {timelineYears.map(yr => (
              <span 
                key={yr} 
                className={`cursor-pointer transition-colors ${selectedYear === yr ? 'text-primary' : 'hover:text-zinc-300'}`}
                onClick={() => setSelectedYear(yr)}
              >
                {yr}
              </span>
            ))}
          </div>
        </div>

        {/* Dynamic Timeline Milestones Display */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-zinc-900/60">
          {scenarios.map(s => {
            const config = SCENARIO_IDENTITIES[s.id] || { title: s.title, color: '#3B82F6' };
            const node = s.timeline.find(t => t.year === selectedYear) || { title: "Stability Period", description: "Consolidating gains, continuing previous year milestones." };
            const projectedIncome = getProjectedSalary(s.id, selectedYear);
            
            return (
              <div 
                key={s.id} 
                className={`p-5 rounded-xl border transition-all duration-300 space-y-4 ${
                  activeScenarioId === s.id 
                    ? 'border-zinc-800 bg-zinc-900/20' 
                    : 'border-zinc-900/50 bg-zinc-950/10 opacity-70'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold font-mono tracking-wider" style={{ color: config.color }}>
                    {config.title}
                  </span>
                  <span className="text-[10px] font-mono font-semibold text-zinc-500">
                    Confidence: {s.confidence_level}%
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-zinc-550 uppercase tracking-widest block font-mono">Projected Salary Rate</span>
                  <p className="text-xl font-display font-bold text-white text-glow-primary">
                    {projectedIncome}
                  </p>
                </div>

                <div className="space-y-1 border-t border-zinc-900 pt-3">
                  <span className="text-[9px] font-bold text-zinc-550 uppercase tracking-widest block font-mono">Active Milestone ({selectedYear})</span>
                  <h4 className="text-xs font-bold text-white">{node.title}</h4>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">{node.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Visual Analytics Charts (Radar & Line Chart) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Interactive Radar Charts */}
        <div className="p-6 rounded-2xl border border-zinc-800/80 bg-zinc-950/40 space-y-4">
          <div>
            <h3 className="font-display font-bold text-lg text-white">Dimension Comparison Matrix</h3>
            <p className="text-xs text-zinc-500 font-mono">Weighted score values out of 10 across key variables.</p>
          </div>
          
          <div className="h-80 w-full flex items-center justify-center font-mono text-[10px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                <PolarGrid stroke="#27272A" />
                <PolarAngleAxis dataKey="subject" stroke="#71717A" />
                <PolarRadiusAxis angle={30} domain={[0, 10]} stroke="#27272A" />
                {scenarios.map(s => (
                  <Radar
                    key={s.id}
                    name={SCENARIO_IDENTITIES[s.id]?.title || `Scenario ${s.id}`}
                    dataKey={s.id}
                    stroke={SCENARIO_COLORS[s.id]}
                    fill={SCENARIO_COLORS[s.id]}
                    fillOpacity={0.15}
                  />
                ))}
                <Legend wrapperStyle={{ color: '#F4F4F5' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Animated Line Charts (Salary Trajectory) */}
        <div className="p-6 rounded-2xl border border-zinc-800/80 bg-zinc-950/40 space-y-4">
          <div>
            <h3 className="font-display font-bold text-lg text-white">Projected Income Trajectory</h3>
            <p className="text-xs text-zinc-500 font-mono">Compound salary expectations simulated across timeline years.</p>
          </div>

          <div className="h-80 w-full font-mono text-[10px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#18181B" />
                <XAxis dataKey="name" stroke="#71717A" />
                <YAxis stroke="#71717A" tickFormatter={v => `$${v/1000}k`} />
                <ReChartsTooltip 
                  contentStyle={{ backgroundColor: '#121214', borderColor: '#27272A', color: '#F4F4F5' }} 
                  itemStyle={{ color: '#F4F4F5' }}
                  formatter={(v: any) => [`$${(Number(v)).toLocaleString()}`, 'Projected Income']}
                />
                <Legend />
                {scenarios.map(s => (
                  <Line
                    key={s.id}
                    type="monotone"
                    dataKey={s.id}
                    name={SCENARIO_IDENTITIES[s.id]?.title || `Scenario ${s.id}`}
                    stroke={SCENARIO_COLORS[s.id]}
                    strokeWidth={2}
                    activeDot={{ r: 6 }}
                  />
                ))}
                {/* Vertical line matching the scrubber year */}
                <ReferenceLine x={selectedYear} stroke="#2563EB" strokeDasharray="3 3" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Follow-up refinement chat console */}
      <div className="p-6 rounded-2xl border border-zinc-800/80 bg-zinc-950/60 space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
          <Sparkles size={80} className="text-primary" />
        </div>

        <div className="border-b border-zinc-900 pb-3 flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="font-display font-bold text-lg text-white">Dynamic Scenario Refinement</h3>
            <p className="text-xs text-zinc-550 font-mono">Simulate modifications to inputs, ask comparatives, or query constraints.</p>
          </div>
          <span className="px-2.5 py-0.5 bg-zinc-900 border border-zinc-800 text-[9px] font-mono text-zinc-500 rounded">
            Context Intact
          </span>
        </div>

        {/* Chat Logs */}
        <div className="max-h-96 overflow-y-auto space-y-4 pr-2 font-sans">
          {data.follow_ups.length === 0 ? (
            <div className="text-center py-12 text-zinc-600 text-xs space-y-2">
              <p>No refinement prompts entered. Challenge Oracle with follow-up scenarios.</p>
              <div className="flex justify-center gap-2 max-w-md mx-auto pt-2">
                <button 
                  onClick={() => setChatQuery("What if we assume a higher risk tolerance?")}
                  className="px-2.5 py-1.5 rounded-lg border border-zinc-850 bg-zinc-900/30 text-[10px] hover:border-zinc-700 hover:text-zinc-300 text-left cursor-pointer"
                >
                  "What if we assume higher risk?"
                </button>
                <button 
                  onClick={() => setChatQuery("Explain Scenario A opportunity costs in detail.")}
                  className="px-2.5 py-1.5 rounded-lg border border-zinc-850 bg-zinc-900/30 text-[10px] hover:border-zinc-700 hover:text-zinc-300 text-left cursor-pointer"
                >
                  "Detail A opportunity costs..."
                </button>
              </div>
            </div>
          ) : (
            data.follow_ups.map((msg, i) => (
              <div key={msg.id || i} className="space-y-3">
                <div className="flex justify-end">
                  <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-850 text-xs text-zinc-200 max-w-lg leading-relaxed shadow-sm">
                    {msg.query}
                  </div>
                </div>

                <div className="flex justify-start">
                  <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 text-xs text-zinc-300 max-w-2xl leading-relaxed shadow-sm space-y-3">
                    <span className="text-[10px] font-mono font-bold text-primary flex items-center gap-1">
                      <Sparkles size={11} className="animate-spin-slow" />
                      <span>Oracle Response</span>
                    </span>
                    <p>{msg.response_json.response_text}</p>
                    
                    {msg.response_json.updated_scenarios && (
                      <div className="flex items-center gap-1.5 p-2 rounded bg-primary/10 text-[10px] text-primary border border-primary/20">
                        <Info size={12} />
                        <span>Interactive Dashboard scores updated to reflect new parameters.</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}

          {submittingChat && (
            <div className="flex justify-start">
              <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800 text-xs text-zinc-500 max-w-md flex items-center gap-3">
                <RefreshCw size={14} className="animate-spin text-primary" />
                <span className="font-mono text-[10px]">Re-mapping scenario timelines...</span>
              </div>
            </div>
          )}
          <div ref={chatBottomRef}></div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleChatSubmit} className="flex gap-3 pt-2">
          <input
            type="text"
            required
            disabled={submittingChat}
            value={chatQuery}
            onChange={(e) => setChatQuery(e.target.value)}
            placeholder="Introduce parameters... (e.g. 'What if my budget drops by half?' or 'Detail the cons of Scenario C')"
            className="flex-1 bg-zinc-900/60 border border-zinc-800 hover:border-zinc-750 focus:border-primary/60 transition-colors rounded-xl py-3 px-4 text-xs text-zinc-250 focus:outline-none placeholder-zinc-600 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={submittingChat || !chatQuery.trim()}
            className="px-4 py-3 rounded-xl bg-primary hover:bg-blue-600 text-white shadow transition-all disabled:opacity-30 flex items-center justify-center shrink-0 cursor-pointer"
          >
            <Send size={14} />
          </button>
        </form>
      </div>

      {/* Floating Slide-over Explainability Panel */}
      <AnimatePresence>
        {explainingMetric && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
            {/* Click outside to close */}
            <div className="absolute inset-0 cursor-pointer" onClick={() => setExplainingMetric(null)} />
            
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 20 }}
              className="w-full max-w-md bg-zinc-950 border-l border-zinc-900 h-full p-6 flex flex-col justify-between shadow-2xl relative z-10 font-sans"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
                  <div className="flex items-center gap-2">
                    <Brain size={16} className="text-primary" />
                    <h3 className="font-display font-bold text-lg text-white">Score Explanation</h3>
                  </div>
                  <button 
                    onClick={() => setExplainingMetric(null)}
                    className="p-1 rounded-lg hover:bg-zinc-900 text-zinc-550 hover:text-white transition-colors cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] font-bold font-mono tracking-widest text-zinc-500 uppercase block">Scenario</span>
                    <p className="text-sm font-semibold text-white pt-0.5">{explainingMetric.scenarioTitle}</p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold font-mono tracking-widest text-zinc-500 uppercase block">Metric evaluated</span>
                    <p className="text-sm font-semibold text-white pt-0.5">{explainingMetric.metricName}</p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold font-mono tracking-widest text-zinc-500 uppercase block">Assigned Score</span>
                    <div className="flex items-center gap-2 pt-1">
                      <span className="px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 text-xs font-mono font-bold text-primary text-glow-primary">
                        {explainingMetric.score} / 10
                      </span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <span className="text-[10px] font-bold font-mono tracking-widest text-zinc-500 uppercase block mb-1.5">Logic & Methodology</span>
                    <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-850 text-xs text-zinc-350 leading-relaxed font-sans">
                      {explainingMetric.explanation}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-zinc-900">
                <button
                  onClick={() => setExplainingMetric(null)}
                  className="w-full py-3 rounded-xl bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer text-center"
                >
                  Dismiss Panel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
