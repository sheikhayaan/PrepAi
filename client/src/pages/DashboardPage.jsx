import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import api from '../api/client';
import AuroraBackground from '../components/AuroraBackground';
import CompanyTierModal from '../components/CompanyTierModal';
import {
  BarChart3,
  Target,
  Zap,
  ArrowRight,
  Play,
  Search,
  ChevronDown,
  ChevronUp,
  LayoutDashboard,
  Code2,
  LineChart,
  Bot,
  TrendingUp,
  Settings,
  Sparkles,
  Clock,
  CheckCircle2,
  Database,
  Sliders,
  AlertTriangle,
  Info,
  Calendar,
  Layers,
  Award,
  LogOut,
  Cpu,
  Server,
  Users,
  ShieldCheck,
  DollarSign,
  Briefcase,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const TRACKS_METADATA = [
  { id: 'dsa', name: 'DSA & Algorithms', count: 110, icon: Cpu, desc: 'Arrays, Two Pointers, Trees, Graphs, DP' },
  { id: 'system_design', name: 'System Design', count: 80, icon: Server, desc: 'High-Throughput Systems, Caching, CAP' },
  { id: 'behavioral', name: 'Behavioral & Leadership', count: 75, icon: Users, desc: 'STAR Method, Conflict, Outage Ownership' },
  { id: 'hr_round', name: 'HR & Culture Fit', count: 55, icon: ShieldCheck, desc: 'Motivation, EQ, Long-Term Trajectory' },
  { id: 'case_study', name: 'Consulting & Case Study', count: 50, icon: Sparkles, desc: 'MECE Framework, Sizing, Unit Economics' },
  { id: 'product_management', name: 'Product Management (PM)', count: 50, icon: Award, desc: 'CIRCLES, RICE Prioritization, Metrics' },
  { id: 'sales_pitch', name: 'Sales Pitch & Revenue', count: 40, icon: DollarSign, desc: 'Objection Handling, Value Realization' },
  { id: 'managerial', name: 'Engineering Leadership', count: 40, icon: Briefcase, desc: 'People Coaching, Headcount, Org Health' },
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const [analyticsData, setAnalyticsData] = useState(null);
  const [userSessions, setUserSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTierModal, setShowTierModal] = useState(false);
  const [expandedSessionId, setExpandedSessionId] = useState(null);
  const [showReadinessTooltip, setShowReadinessTooltip] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [analyticsRes, sessionsRes] = await Promise.all([
          api.get('/analytics').catch(() => ({ data: null })),
          api.get('/interviews').catch(() => ({ data: { sessions: [] } })),
        ]);
        setAnalyticsData(analyticsRes.data);
        setUserSessions(sessionsRes.data?.sessions || []);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const hasCompleted = (analyticsData?.overview?.completedSessions || 0) > 0;

  const overview = analyticsData?.overview || {
    totalSessions: userSessions.length,
    completedSessions: userSessions.filter((s) => s.status === 'completed').length,
    totalQuestionsAnswered: 0,
    totalPracticeHours: 0.0,
    readinessComposite: 0,
    readinessBreakdown: {
      technicalScore: 0,
      deliveryScore: 0,
      consistencyScore: 0,
      formula: '50% Technical Rigor + 30% Delivery & Clarity + 20% Practice Consistency',
    },
    trendGrowth: 'Complete 1st interview to calibrate',
  };

  const trendData = analyticsData?.performanceTrend || [];
  const weakTopics = analyticsData?.weakTopics || analyticsData?.areasToImprove || [];
  const strongTopics = analyticsData?.strongTopics || analyticsData?.strongestTopics || [];

  const handlePracticeTopic = (topicName) => {
    navigate(`/custom-interview?topic=${encodeURIComponent(topicName)}`);
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] px-4 sm:px-6 lg:px-8 py-8 overflow-x-hidden bg-[#07090e] text-slate-100 font-sans">
      <AuroraBackground showHorizon={false} />

      <div className="max-w-7xl mx-auto relative z-10 space-y-8">

        {/* Superadmin Command Center Quick Access */}
        {user?.email?.toLowerCase() === 'sheikhayaan408@gmail.com' && (
          <div className="p-4 rounded-2xl bg-purple-900/20 border border-purple-500/40 flex flex-col sm:flex-row items-center justify-between gap-4 backdrop-blur-md shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Logged in as System Administrator ({user.email})</span>
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-200 text-[10px] font-extrabold uppercase">
                    Admin Access
                  </span>
                </p>
                <p className="text-[11px] text-purple-200/70">
                  Inspect candidate transcripts, user CSAT ratings, and system-wide telemetry.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/admin')}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <span>Open Admin Command Center</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            TIER 1: HEADLINE & READINESS COMPOSITE
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="bg-white/[0.02] border border-white/[0.08] rounded-3xl p-6 md:p-8 backdrop-blur-xl shadow-2xl">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-6 border-b border-white/[0.06]">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-full">
                  CALIBRATED DASHBOARD
                </span>
                <span className="text-xs text-slate-400">Welcome back, {user?.name || 'Candidate'}</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mt-2">
                Interview Readiness & Analytics Engine
              </h1>
              <p className="text-xs md:text-sm text-slate-400 mt-1">
                Real-time multi-dimensional scoring benchmarked against FAANG & Tier-1 hiring standards.
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setShowTierModal(true)}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Launch FAANG Mock</span>
              </button>
              <button
                onClick={() => navigate('/custom-interview')}
                className="px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] text-xs font-semibold text-slate-200 flex items-center gap-2 transition-all cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                <span>Custom Builder</span>
              </button>
              <button
                onClick={() => navigate('/questions')}
                className="px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] text-xs font-semibold text-slate-200 flex items-center gap-2 transition-all cursor-pointer"
              >
                <Database className="w-3.5 h-3.5 text-indigo-400" />
                <span>500 Questions Bank</span>
              </button>
              <button
                onClick={async () => {
                  await logout();
                  navigate('/');
                }}
                className="px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-xs font-semibold text-red-400 hover:text-red-300 flex items-center gap-2 transition-all cursor-pointer"
                title="Sign out of PrepAI"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign out</span>
              </button>
            </div>
          </div>

          {/* Metric Cards & Readiness Composite */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">

            {/* Readiness Composite Score */}
            <div className="relative p-5 rounded-2xl bg-gradient-to-br from-indigo-950/40 to-slate-900/60 border border-indigo-500/30 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-indigo-300">Readiness Composite</span>
                <button
                  onClick={() => setShowReadinessTooltip(!showReadinessTooltip)}
                  className="p-1 text-slate-400 hover:text-white rounded transition-colors"
                  title="How is this calculated?"
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Score and Trend badge */}
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-extrabold text-white tracking-tight">
                  {hasCompleted ? `${overview.readinessComposite}%` : 'Uncalibrated'}
                </span>
                {hasCompleted && (
                  <span className="text-xs font-semibold text-emerald-400 flex items-center gap-0.5">
                    <TrendingUp className="w-3 h-3" />
                    +8%
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {hasCompleted
                  ? 'L5 / Senior Technical Hiring Benchmark'
                  : 'Complete your first interview to calibrate'}
              </p>

              {/* Tooltip Card */}
              {showReadinessTooltip && (
                <div className="absolute left-0 right-0 top-full mt-2 p-3.5 rounded-xl bg-slate-900 border border-indigo-500/40 shadow-2xl z-30 text-xs text-slate-300 space-y-1.5 animate-in fade-in">
                  <p className="font-semibold text-white text-[11px] uppercase tracking-wide text-indigo-400">
                    Readiness Calculation Formula
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {overview.readinessBreakdown?.formula || '50% Technical Rigor + 30% Delivery & Clarity + 20% Practice Consistency'}
                  </p>
                  <div className="pt-1.5 border-t border-white/[0.08] space-y-1 text-[10px]">
                    <div className="flex justify-between"><span>Technical Rigor:</span> <span className="font-mono text-indigo-300">{overview.readinessBreakdown?.technicalScore || 0}%</span></div>
                    <div className="flex justify-between"><span>Delivery & Clarity:</span> <span className="font-mono text-indigo-300">{overview.readinessBreakdown?.deliveryScore || 0}%</span></div>
                    <div className="flex justify-between"><span>Session Consistency:</span> <span className="font-mono text-indigo-300">{overview.readinessBreakdown?.consistencyScore || 0}%</span></div>
                  </div>
                </div>
              )}
            </div>

            {/* Total Practice Time */}
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
              <span className="text-xs font-medium text-slate-400">Total Practice Time</span>
              <div className="text-3xl font-extrabold text-white tracking-tight mt-2">
                {overview.totalPracticeHours || 0} <span className="text-base font-normal text-slate-400">hrs</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-500" />
                Across {overview.completedSessions || 0} completed sessions
              </p>
            </div>

            {/* Questions Evaluated */}
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
              <span className="text-xs font-medium text-slate-400">Turns & Questions Answered</span>
              <div className="text-3xl font-extrabold text-white tracking-tight mt-2">
                {overview.totalQuestionsAnswered || 0}
              </div>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                {overview.totalQuestionsAnswered > 0 ? 'Scored with calibrated rubrics' : 'No answers recorded yet'}
              </p>
            </div>

            {/* AI Insight Headline */}
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
              <span className="text-xs font-semibold text-indigo-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                AI Diagnostic Summary
              </span>
              <p className="text-xs font-medium text-slate-200 mt-2 leading-relaxed">
                {analyticsData?.aiInsight?.detail || (hasCompleted
                  ? 'Focus on dynamic programming and distributed caching to maximize score velocity.'
                  : 'Take your first diagnostic mock interview to benchmark your problem decomposition and hiring bar fit.')}
              </p>
            </div>
          </div>

          {/* Performance Trendline */}
          <div className="mt-6 pt-6 border-t border-white/[0.06]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                  Performance Growth Over Time
                </h3>
                <p className="text-[11px] text-slate-400">Monthly interview score trajectory</p>
              </div>
              <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                {overview.trendGrowth}
              </span>
            </div>

            {hasCompleted && trendData.length > 0 ? (
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" stroke="#475569" fontSize={11} tickLine={false} />
                    <YAxis domain={[0, 100]} stroke="#475569" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                      formatter={(value) => [`${value}%`, 'Score']}
                    />
                    <Area type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#scoreGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-36 w-full rounded-2xl bg-white/[0.01] border border-dashed border-white/[0.08] flex flex-col items-center justify-center text-center p-6 space-y-2">
                <LineChart className="w-6 h-6 text-indigo-400/60" />
                <p className="text-xs font-semibold text-slate-300">
                  Performance Graph Calibrates After Your First Completed Interview
                </p>
                <p className="text-[11px] text-slate-500 max-w-md">
                  Your monthly score trajectory, rubric percentile, and consistency index will be plotted dynamically as you complete practice sessions.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            TRACK-BY-TRACK SELECTION & PROBLEM BANK SHOWCASE
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="bg-white/[0.02] border border-white/[0.08] rounded-3xl p-6 md:p-8 backdrop-blur-xl shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-white/[0.06]">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-indigo-400" />
                <span>Curated Interview Tracks (500 Questions Bank)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Practice specialized interview rounds calibrated to Top-Tier tech benchmarks.
              </p>
            </div>
            <button
              onClick={() => navigate('/questions')}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 self-start sm:self-center transition-colors cursor-pointer"
            >
              <span>Browse All 500 Questions</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
            {TRACKS_METADATA.map((track) => {
              const Icon = track.icon;
              return (
                <div
                  key={track.id}
                  onClick={() => navigate(`/custom-interview?topic=${encodeURIComponent(track.name)}`)}
                  className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-indigo-500/40 hover:bg-white/[0.04] transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-slate-400">
                        {track.count} Qs
                      </span>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">
                        {track.name}
                      </h4>
                      <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">
                        {track.desc}
                      </p>
                    </div>
                  </div>
                  <div className="pt-3 mt-3 border-t border-white/[0.04] flex items-center justify-between text-[11px] font-semibold text-indigo-400 group-hover:text-indigo-300">
                    <span>Practice Track</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            TIER 2: WEAK TOPIC BREAKDOWN & PRACTICE THIS PRE-FILL
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Weak Topics Diagnostic Card */}
          <div className="lg:col-span-7 bg-white/[0.02] border border-white/[0.08] rounded-3xl p-6 md:p-8 backdrop-blur-xl shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>Targeted Areas for Improvement</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Ranked by average score across your interview turns.
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              {weakTopics.length === 0 ? (
                <div className="p-8 rounded-2xl bg-white/[0.01] border border-dashed border-white/[0.08] text-center space-y-3">
                  <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
                    Topic diagnostics calibrate dynamically once you complete interview turns. Practice questions directly from the 500-question Problem Bank to uncover areas for improvement.
                  </p>
                  <button
                    onClick={() => navigate('/questions')}
                    className="px-4 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Database className="w-3.5 h-3.5" />
                    <span>Explore Question Bank</span>
                  </button>
                </div>
              ) : (
                weakTopics.map((topicItem, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-indigo-500/40 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  >
                    <div className="flex-1 space-y-1.5 w-full">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-100">{topicItem.topic}</span>
                        <span className="text-xs font-mono font-bold text-amber-400">
                          {topicItem.score}%
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-amber-400 h-full rounded-full transition-all"
                          style={{ width: `${Math.min(100, topicItem.score || 50)}%` }}
                        />
                      </div>

                      <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        <span>Sample size: {topicItem.sampleSize || 1} turn(s)</span>
                        <span>·</span>
                        <span className={topicItem.hasSufficientData ? 'text-slate-400' : 'text-amber-400/80'}>
                          {topicItem.status || (topicItem.hasSufficientData ? 'Calibrated' : 'Calibrating')}
                        </span>
                      </div>
                    </div>

                    {/* Practice Pre-Fill Button */}
                    <button
                      onClick={() => handlePracticeTopic(topicItem.topic)}
                      className="px-3.5 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer"
                    >
                      <span>Practice this</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Strongest Mastery Areas */}
          <div className="lg:col-span-5 bg-white/[0.02] border border-white/[0.08] rounded-3xl p-6 md:p-8 backdrop-blur-xl shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-400" />
                  <span>Strongest Dimensions</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Consistent high performance across senior loops.
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              {strongTopics.length === 0 ? (
                <div className="p-8 rounded-2xl bg-white/[0.01] border border-dashed border-white/[0.08] text-center space-y-3">
                  <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                    Dimensions scored at 75%+ will appear here as your strong points once evaluated.
                  </p>
                  <button
                    onClick={() => setShowTierModal(true)}
                    className="px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-white border border-emerald-500/30 text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Start Mock Interview</span>
                  </button>
                </div>
              ) : (
                strongTopics.map((topicItem, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-100">{topicItem.topic}</span>
                      <span className="text-xs font-mono font-bold text-emerald-400">{topicItem.score}%</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-400 h-full rounded-full transition-all"
                        style={{ width: `${topicItem.score}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Sample size: {topicItem.sampleSize || 1} evaluated turn(s)
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            TIER 3: SESSION HISTORY (Detail on Demand with Turn Breakdown)
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="bg-white/[0.02] border border-white/[0.08] rounded-3xl p-6 md:p-8 backdrop-blur-xl shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>Completed Session History & Turn Diagnostics</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Click any session to expand turn-by-turn prompts, answers, and AI bar raiser reasoning.
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            {userSessions.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-500">
                No past interview sessions recorded yet. Launch your first mock session above!
              </div>
            ) : (
              userSessions.map((sess) => {
                const isExpanded = expandedSessionId === sess._id;
                const rawOverall = sess.finalScore?.overall !== undefined ? Number(sess.finalScore.overall) : null;
                const score = rawOverall !== null ? Math.round(rawOverall * 10) : null;
                const isZeroSession = rawOverall === 0;
                const dateFormatted = new Date(sess.startedAt || Date.now()).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });

                return (
                  <div
                    key={sess._id}
                    className="rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden transition-all"
                  >
                    {/* Session Summary Row */}
                    <div
                      onClick={() => setExpandedSessionId(isExpanded ? null : sess._id)}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">
                          {sess.type?.substring(0, 3).toUpperCase() || 'DSA'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-100">
                              {sess.customConfig?.role || sess.type?.toUpperCase().replace('_', ' ') || 'Software Engineer'}
                            </span>
                            <span className="text-slate-500">·</span>
                            <span className="text-xs text-slate-400">
                              {sess.targetCompany || 'Google / FAANG'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5 font-mono">
                            <Calendar className="w-3 h-3" />
                            <span>{dateFormatted}</span>
                            <span>·</span>
                            <span>{sess.turns?.length || 1} turns</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 self-end sm:self-center">
                        <div className="text-right">
                          {score !== null ? (
                            isZeroSession ? (
                              <>
                                <span className="text-xs font-mono font-bold text-amber-400">0%</span>
                                <span className="text-[10px] text-amber-400/80 block">No Answers</span>
                              </>
                            ) : (
                              <>
                                <span className="text-xs font-mono font-bold text-indigo-400">{score}%</span>
                                <span className="text-[10px] text-slate-500 block">Overall Score</span>
                              </>
                            )
                          ) : (
                            <>
                              <span className="text-xs font-mono font-bold text-slate-400">In Progress</span>
                              <span className="text-[10px] text-slate-500 block">Active</span>
                            </>
                          )}
                        </div>
                        <button className="p-1 text-slate-400 hover:text-white rounded">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Expandable Per-Turn Breakdown */}
                    {isExpanded && (
                      <div className="p-4 bg-black/40 border-t border-white/[0.06] space-y-3 text-xs animate-in fade-in">
                        <p className="font-semibold text-indigo-400 text-[11px] uppercase tracking-wider">
                          Turn-by-Turn Evaluation & Reasoning:
                        </p>
                        {(sess.turns || []).map((turn, tIdx) => (
                          <div key={tIdx} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-slate-200">Question {tIdx + 1}</span>
                              {turn.turnScore?.reasoning && (
                                <span className="text-[10px] text-indigo-300 font-mono">Calibrated Rubric Evaluated</span>
                              )}
                            </div>
                            <p className="text-slate-400">{turn.question}</p>
                            {turn.answer ? (
                              <div className="pl-3 border-l-2 border-indigo-500/40 text-slate-300 italic">
                                "{turn.answer}"
                              </div>
                            ) : (
                              <div className="pl-3 border-l-2 border-amber-500/40 text-amber-400/80 italic text-[11px]">
                                No answer submitted for this turn.
                              </div>
                            )}
                            {turn.turnScore?.reasoning && (
                              <div className="p-2 rounded bg-indigo-950/30 border border-indigo-500/20 text-[11px] text-indigo-200">
                                <strong>AI Evaluation:</strong> {turn.turnScore.reasoning}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* FAANG Modal */}
      {showTierModal && <CompanyTierModal onClose={() => setShowTierModal(false)} />}
    </div>
  );
}
