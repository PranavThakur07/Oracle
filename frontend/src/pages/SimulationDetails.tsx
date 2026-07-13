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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as ReChartsTooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import { 
  ArrowLeft, 
  Download, 
  Star, 
  Send, 
  AlertTriangle, 
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  Info,
  Layers,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Plus
} from 'lucide-react';

const SCENARIO_COLORS: Record<string, string> = {
  A: '#3B82F6', // Blue
  B: '#10B981', // Emerald Green
  C: '#8B5CF6', // Purple
  D: '#F59E0B'  // Amber
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
      
      // Auto-select first scenario
      if (details.response_json?.scenarios?.length > 0) {
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
    // Scroll chat bottom on change
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
    
    // Smooth scroll to card
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
      
      // Update local state
      setData(prev => {
        if (!prev) return null;
        
        const updatedFollowups = [...prev.follow_ups, newFollowUp];
        let updatedResponseJson = { ...prev.response_json };
        
        // If the follow-up generated updated scenarios, replace the primary parameters
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
      alert('Failed to get answer from simulation model.');
    } finally {
      setSubmittingChat(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <RefreshCw className="text-primary animate-spin" size={36} />
        <span className="text-xs text-zinc-400 font-mono">Retrieving simulation coordinates...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 rounded-xl border border-danger/25 bg-danger/10 text-center max-w-xl mx-auto space-y-4">
        <AlertCircle className="text-danger mx-auto" size={32} />
        <p className="text-sm font-semibold text-white">{error || 'Simulation not found'}</p>
        <button onClick={() => navigate('/dashboard')} className="px-4 py-2 text-xs font-semibold rounded bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white">
          Return to Workspace
        </button>
      </div>
    );
  }

  const { query, context, response_json, is_favorite } = data;
  const { scenarios, assumptions, disclaimer, recommendations, comparison_metrics } = response_json;

  // Compile Radar Chart Data dynamically based on active scenarios
  const metricsKeys = ['risk', 'cost', 'growth', 'learning', 'work_life_balance'];
  const metricLabels: Record<string, string> = {
    risk: 'Risk Score',
    cost: 'Estimated Cost',
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

  // Compile Bar Chart Data (grouped by scenario)
  const barData = scenarios.map(s => {
    const s_metrics = comparison_metrics[s.id] || {};
    return {
      name: `Scenario ${s.id}`,
      risk: s_metrics.risk || 0,
      cost: s_metrics.cost || 0,
      growth: s_metrics.growth || 0,
      learning: s_metrics.learning || 0,
      workLife: s_metrics.work_life_balance || 0
    };
  });

  return (
    <div className="space-y-10 font-sans pb-24">
      {/* Title bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-6">
        <div className="space-y-2">
          <button 
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors focus:outline-none"
          >
            <ArrowLeft size={13} />
            <span>Workspace</span>
          </button>
          
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <span>{query}</span>
            <button 
              onClick={handleFavoriteToggle} 
              className="text-zinc-500 hover:text-warning transition-colors"
            >
              <Star size={18} className={is_favorite ? 'text-warning fill-warning' : ''} />
            </button>
          </h2>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-zinc-500 font-mono">
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
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 hover:text-white transition-all"
          >
            <Download size={14} />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Disclaimers & Model Assumptions Banner */}
      <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-950/40 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <span className="text-[10px] font-semibold text-zinc-500 tracking-wider uppercase font-mono flex items-center gap-1.5">
            <Info size={12} className="text-primary" />
            <span>Model Analysis Assumptions</span>
          </span>
          <ul className="text-xs text-zinc-400 space-y-1 list-disc pl-4">
            {assumptions.map((ass, i) => (
              <li key={i}>{ass}</li>
            ))}
          </ul>
        </div>
        
        <div className="space-y-2 border-l-0 md:border-l border-zinc-900 md:pl-6">
          <span className="text-[10px] font-semibold text-danger/80 tracking-wider uppercase font-mono flex items-center gap-1.5">
            <AlertTriangle size={12} className="text-danger" />
            <span>Intelligence Disclaimer</span>
          </span>
          <p className="text-xs text-zinc-500 italic leading-relaxed">
            {disclaimer}
          </p>
        </div>
      </div>

      {/* Recommendation Engine Tabs */}
      <div className="space-y-3">
        <span className="text-[10px] font-semibold text-zinc-500 tracking-wider uppercase font-mono">
          Alignment Engine (Highlight by Priority)
        </span>
        <div className="flex flex-wrap gap-2">
          {Object.entries(recommendations).map(([priority, scenarioId]) => {
            const isSelected = selectedPriority === priority;
            return (
              <button
                key={priority}
                onClick={() => handlePriorityClick(priority, scenarioId)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  isSelected 
                    ? 'bg-primary/20 border-primary text-white shadow-[0_0_10px_rgba(37,99,235,0.25)]' 
                    : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
              >
                {priority} → <span className="font-semibold text-primary">{scenarioId}</span>
              </button>
            );
          })}
          {selectedPriority && (
            <button 
              onClick={() => { setSelectedPriority(null); }}
              className="text-[10px] text-zinc-500 hover:text-zinc-300 font-mono"
            >
              Clear Highlight
            </button>
          )}
        </div>
      </div>

      {/* Simulated Outcomes - Scenario Grid */}
      <div className="space-y-4">
        <span className="text-[10px] font-semibold text-zinc-500 tracking-wider uppercase font-mono">
          Simulated Scenario Projections
        </span>
        
        <div className={`grid grid-cols-1 gap-6 ${
          scenarios.length === 2 ? 'md:grid-cols-2' : scenarios.length === 4 ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-3'
        }`}>
          {scenarios.map((s) => {
            const isHighlighted = selectedPriority && recommendations[selectedPriority] === s.id;
            const color = SCENARIO_COLORS[s.id] || '#71717A';
            const metricsObj = comparison_metrics[s.id] || {};
            const isExpanded = expandedScenarioId === s.id;
            const isActiveCard = activeScenarioId === s.id;

            return (
              <div
                key={s.id}
                ref={el => { cardRefs.current[s.id] = el; }}
                onClick={() => setActiveScenarioId(s.id)}
                className={`p-6 rounded-2xl glass-card relative space-y-6 flex flex-col justify-between cursor-pointer ${
                  isHighlighted 
                    ? 'ring-2 ring-primary border-transparent bg-zinc-900/90 shadow-[0_15px_40px_rgba(37,99,235,0.18)]' 
                    : isActiveCard
                      ? 'ring-1 ring-zinc-700 border-transparent bg-zinc-900/50'
                      : 'bg-zinc-950/20'
                }`}
              >
                {isHighlighted && (
                  <span className="absolute -top-2.5 left-6 px-2 py-0.5 rounded bg-primary text-[9px] font-mono font-bold text-white uppercase tracking-wider shadow">
                    Aligned Priority Focus
                  </span>
                )}

                {/* Scenario Header */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span 
                      className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold text-white shadow-sm"
                      style={{ backgroundColor: color }}
                    >
                      Scenario {s.id}
                    </span>
                    <span className="text-[10px] font-semibold font-mono text-zinc-500">
                      Model Conf: {s.confidence_level}%
                    </span>
                  </div>
                  
                  <h3 className="font-display font-bold text-lg text-white leading-tight">{s.title}</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">{s.summary}</p>
                </div>

                {/* Dimension Meters (Risk, Cost, Growth) */}
                <div className="space-y-2.5 border-y border-zinc-900 py-4 font-mono text-[10px]">
                  <div className="space-y-1">
                    <div className="flex justify-between text-zinc-400">
                      <span>Risk Index</span>
                      <span className="text-zinc-200">{metricsObj.risk}/10</span>
                    </div>
                    <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-danger rounded-full" 
                        style={{ width: `${(metricsObj.risk || 0) * 10}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-zinc-400">
                      <span>Fin Investment</span>
                      <span className="text-zinc-200">{metricsObj.cost}/10</span>
                    </div>
                    <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-warning rounded-full" 
                        style={{ width: `${(metricsObj.cost || 0) * 10}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-zinc-400">
                      <span>Growth Index</span>
                      <span className="text-zinc-200">{metricsObj.growth}/10</span>
                    </div>
                    <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-success rounded-full" 
                        style={{ width: `${(metricsObj.growth || 0) * 10}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Mini details list */}
                <div className="space-y-2 text-xs">
                  <div className="text-zinc-400">
                    <span className="font-semibold text-zinc-300">Financial Cost: </span>
                    <span>{s.estimated_costs}</span>
                  </div>
                  <div className="text-zinc-400">
                    <span className="font-semibold text-zinc-300">Opportunity Cost: </span>
                    <span className="italic">{s.opportunity_cost}</span>
                  </div>
                </div>

                {/* Collapsible Details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden space-y-4 pt-4 border-t border-zinc-900 text-xs"
                    >
                      <div>
                        <span className="font-semibold text-success flex items-center gap-1 mb-1">
                          <ThumbsUp size={11} />
                          <span>Pros</span>
                        </span>
                        <ul className="list-disc pl-4 text-zinc-400 space-y-0.5">
                          {s.pros.map((pro, i) => <li key={i}>{pro}</li>)}
                        </ul>
                      </div>
                      
                      <div>
                        <span className="font-semibold text-danger flex items-center gap-1 mb-1">
                          <ThumbsDown size={11} />
                          <span>Cons</span>
                        </span>
                        <ul className="list-disc pl-4 text-zinc-400 space-y-0.5">
                          {s.cons.map((con, i) => <li key={i}>{con}</li>)}
                        </ul>
                      </div>

                      <div>
                        <span className="font-semibold text-warning flex items-center gap-1 mb-1">
                          <AlertTriangle size={11} />
                          <span>Key Risks</span>
                        </span>
                        <ul className="list-disc pl-4 text-zinc-400 space-y-0.5">
                          {s.risks.map((risk, i) => <li key={i}>{risk}</li>)}
                        </ul>
                      </div>

                      <div>
                        <span className="font-semibold text-white flex items-center gap-1 mb-1">
                          <Layers size={11} />
                          <span>Skills Required</span>
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {s.skills_required.map((skill, i) => (
                            <span key={i} className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-400">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <span className="font-semibold text-primary flex items-center gap-1 mb-1">
                          <ArrowRight size={11} />
                          <span>Immediate Next Steps</span>
                        </span>
                        <ol className="list-decimal pl-4 text-zinc-400 space-y-0.5">
                          {s.next_steps.map((step, i) => <li key={i}>{step}</li>)}
                        </ol>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  onClick={() => setExpandedScenarioId(isExpanded ? null : s.id)}
                  className="mt-4 w-full py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-xs font-semibold rounded-xl text-zinc-300 hover:text-white transition-colors focus:outline-none"
                >
                  {isExpanded ? 'Show Less' : 'Explore Tradeoffs'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Visual Analytics Block (Radar & Bar Chart) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Radar Chart */}
        <div className="p-6 rounded-2xl border border-zinc-800/80 bg-zinc-950/40 space-y-4">
          <div>
            <h3 className="font-display font-bold text-lg text-white">Dimension Comparison</h3>
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
                    name={`Scenario ${s.id}`}
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

        {/* Bar Chart */}
        <div className="p-6 rounded-2xl border border-zinc-800/80 bg-zinc-950/40 space-y-4">
          <div>
            <h3 className="font-display font-bold text-lg text-white">Scenario Metric Distributions</h3>
            <p className="text-xs text-zinc-500 font-mono">Grouped distribution of scores mapped side-by-side.</p>
          </div>

          <div className="h-80 w-full font-mono text-[10px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#18181B" />
                <XAxis dataKey="name" stroke="#71717A" />
                <YAxis domain={[0, 10]} stroke="#71717A" />
                <ReChartsTooltip 
                  contentStyle={{ backgroundColor: '#121214', borderColor: '#27272A', color: '#F4F4F5' }} 
                  itemStyle={{ color: '#F4F4F5' }}
                />
                <Legend />
                <Bar dataKey="growth" name="Growth" fill="#10B981" />
                <Bar dataKey="risk" name="Risk Index" fill="#EF4444" />
                <Bar dataKey="cost" name="Investment Cost" fill="#F59E0B" />
                <Bar dataKey="learning" name="Learning" fill="#3B82F6" />
                <Bar dataKey="workLife" name="Work-Life Balance" fill="#8B5CF6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Stacked Comparative Milestones Timeline */}
      <div className="p-6 rounded-2xl border border-zinc-800/80 bg-zinc-950/40 space-y-6">
        <div>
          <h3 className="font-display font-bold text-lg text-white">Interactive Timeline Comparison</h3>
          <p className="text-xs text-zinc-500 font-mono">Side-by-side milestone progressions mapped chronologically.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {scenarios.map(s => {
            const color = SCENARIO_COLORS[s.id] || '#71717A';
            return (
              <div key={s.id} className="p-4 rounded-xl bg-zinc-900/30 border border-zinc-900 space-y-4">
                <span className="text-xs font-mono font-bold text-zinc-400 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }}></span>
                  <span>Scenario {s.id} Timeline</span>
                </span>

                <div className="relative border-l-2 border-zinc-800/80 ml-2.5 pl-6 space-y-5 pb-2">
                  {s.timeline.map((node, i) => (
                    <div key={i} className="relative">
                      {/* Timeline Year Indicator Badge */}
                      <span 
                        className="absolute -left-[35px] top-0 h-4.5 w-4.5 rounded-full border-2 border-zinc-950 flex items-center justify-center shadow"
                        style={{ backgroundColor: color }}
                      ></span>
                      
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono font-bold" style={{ color: color }}>
                          {node.year}
                        </span>
                        <h4 className="text-xs font-semibold text-white leading-tight">{node.title}</h4>
                        <p className="text-[11px] text-zinc-400 leading-relaxed">{node.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Follow-up Conversations Chat Console */}
      <div className="p-6 rounded-2xl border border-zinc-800/80 bg-zinc-950/60 space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
          <Sparkles size={80} className="text-primary" />
        </div>

        <div className="border-b border-zinc-900 pb-3 flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="font-display font-bold text-lg text-white">Dynamic Scenario refinement</h3>
            <p className="text-xs text-zinc-500 font-mono">Ask follow-up questions to query details or refine the scenario parameters.</p>
          </div>
          <span className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 text-[9px] font-mono text-zinc-500 rounded">
            Session Context Preserved
          </span>
        </div>

        {/* Chat Message Logs */}
        <div className="max-h-96 overflow-y-auto space-y-4 pr-2 font-sans">
          {data.follow_ups.length === 0 ? (
            <div className="text-center py-12 text-zinc-600 text-xs space-y-2">
              <p>No questions asked yet. Challenge Oracle with follow-up scenarios.</p>
              <div className="flex justify-center gap-2 max-w-md mx-auto pt-2">
                <button 
                  onClick={() => setChatQuery("What if I double the investment budget?")}
                  className="px-2.5 py-1.5 rounded-lg border border-zinc-850 bg-zinc-900/30 text-[10px] hover:border-zinc-700 hover:text-zinc-300 text-left"
                >
                  "What if I double the budget?"
                </button>
                <button 
                  onClick={() => setChatQuery("Compare Scenario A and C side-by-side in terms of learning.")}
                  className="px-2.5 py-1.5 rounded-lg border border-zinc-850 bg-zinc-900/30 text-[10px] hover:border-zinc-700 hover:text-zinc-300 text-left"
                >
                  "Compare only A and C..."
                </button>
              </div>
            </div>
          ) : (
            data.follow_ups.map((msg, i) => (
              <div key={msg.id || i} className="space-y-3">
                {/* User Message */}
                <div className="flex justify-end">
                  <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-850 text-xs text-zinc-200 max-w-lg leading-relaxed shadow-sm">
                    {msg.query}
                  </div>
                </div>

                {/* AI Response Message */}
                <div className="flex justify-start">
                  <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 text-xs text-zinc-300 max-w-2xl leading-relaxed shadow-sm space-y-3">
                    <span className="text-[10px] font-mono font-bold text-primary flex items-center gap-1">
                      <Sparkles size={11} />
                      <span>Oracle Response</span>
                    </span>
                    <p>{msg.response_json.response_text}</p>
                    
                    {/* Visual notice if scenarios updated */}
                    {msg.response_json.updated_scenarios && (
                      <div className="flex items-center gap-1.5 p-2 rounded bg-primary/10 text-[10px] text-primary border border-primary/20">
                        <Plus size={12} />
                        <span>Interactive Dashboard values updated to reflect revised constraints.</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}

          {/* AI Reasoning Loading Bubble */}
          {submittingChat && (
            <div className="flex justify-start">
              <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800 text-xs text-zinc-500 max-w-md flex items-center gap-3">
                <RefreshCw size={14} className="animate-spin text-primary" />
                <span className="font-mono text-[10px]">Evaluating parameters & simulating futures...</span>
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
            placeholder="Ask follow-up questions... (e.g., 'What if we add a startup path?' or 'Why is Scenario B risk index high?')"
            className="flex-1 bg-zinc-900/60 border border-zinc-800 hover:border-zinc-750 focus:border-primary/60 transition-colors rounded-xl py-3 px-4 text-xs text-zinc-200 focus:outline-none placeholder-zinc-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={submittingChat || !chatQuery.trim()}
            className="px-4 py-3 rounded-xl bg-primary hover:bg-blue-600 text-white shadow transition-all disabled:opacity-30 flex items-center justify-center shrink-0"
          >
            <Send size={15} />
          </button>
        </form>
      </div>
    </div>
  );
};
