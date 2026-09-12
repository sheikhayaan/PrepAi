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
  LayoutDashboard,
  Code2,
  LineChart,
  Bot,
  TrendingUp,
  Settings,
  Sparkles,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('Last 6 months');
  const [showTierModal, setShowTierModal] = useState(false);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const res = await api.get('/analytics');
        setAnalyticsData(res.data);
      } catch (err) {
        console.error('Failed to fetch analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  const trendData = analyticsData?.performanceTrend || [
    { month: 'Jan', score: 48 },
    { month: 'Feb', score: 55 },
    { month: 'Mar', score: 62 },
    { month: 'Apr', score: 68 },
    { month: 'May', score: 72 },
    { month: 'Jun', score: 75 },
    { month: 'Jul', score: 82 },
    { month: 'Aug', score: 88 },
  ];

  const strongestTopics = analyticsData?.strongestTopics || [
    { topic: 'Data Structures', score: 92 },
    { topic: 'Algorithms', score: 88 },
    { topic: 'System Design', score: 76 },
    { topic: 'Behavioral', score: 72 },
  ];

  const areasToImprove = analyticsData?.areasToImprove || [
    { topic: 'Dynamic Programming', score: 54 },
    { topic: 'System Design', score: 62 },
    { topic: 'Operating Systems', score: 68 },
  ];

  return (
    <div className="relative min-h-[calc(100vh-4rem)] px-4 sm:px-6 lg:px-8 py-10 overflow-hidden">
      <AuroraBackground showHorizon={false} />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Main Grid: Left Pitch / CTA, Right 3D Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column */}
          <div className="lg:col-span-5 flex flex-col space-y-8">
            <div>
              <span className="text-[11px] font-bold tracking-[0.2em] text-accent uppercase">
                YOUR PROGRESS, AMPLIFIED
              </span>
              <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight mt-2 leading-[1.15]">
                Watch yourself <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-blue-200 to-indigo-300">
                  get sharper.
                </span>
              </h1>
              <p className="text-text-secondary text-base sm:text-lg mt-4 leading-relaxed max-w-md">
                Track your performance, identify weak spots, and calibrate mock interviews for FAANG & Tier-1 unicorns.
              </p>
            </div>

            {/* Feature Points */}
            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(91,140,255,0.3)]">
                  <BarChart3 className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Real insights</h3>
                  <p className="text-xs text-text-secondary mt-0.5">
                    See what’s working and what to improve.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(91,140,255,0.3)]">
                  <Target className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Personalized recommendations</h3>
                  <p className="text-xs text-text-secondary mt-0.5">
                    AI suggests questions tailored to you.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(91,140,255,0.3)]">
                  <Zap className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Consistent growth</h3>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Turn practice into confidence.
                  </p>
                </div>
              </div>
            </div>

            {/* Call to Actions */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={() => setShowTierModal(true)}
                className="btn-primary-glow px-6 py-3.5 rounded-full text-sm font-semibold text-white flex items-center gap-2 cursor-pointer shadow-glow-accent"
              >
                Launch Targeted FAANG Mock
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowTierModal(true)}
                className="px-5 py-3.5 rounded-full bg-surface/80 hover:bg-surface-hover border border-hairline text-sm font-medium text-text-primary flex items-center gap-2 transition-all cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current text-accent" />
                See a live demo
              </button>
            </div>
          </div>

          {/* Right Column: 3D Perspective Glass Dashboard Preview */}
          <div className="lg:col-span-7 perspective-container">
            <div className="tilted-dashboard glass-window rounded-2xl p-5 border border-white/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8),0_0_40px_rgba(59,130,246,0.2)]">
              {/* Dashboard Inner Container */}
              <div className="grid grid-cols-12 gap-4">
                {/* Micro Left Sidebar */}
                <div className="col-span-3 border-r border-hairline/60 pr-3 flex flex-col justify-between">
                  <div className="space-y-4">
                    {/* Logo inside dashboard */}
                    <div className="flex items-center gap-2 px-2 py-1">
                      <div className="w-6 h-6 rounded bg-gradient-to-tr from-blue-600 to-blue-400 flex items-center justify-center shadow-[0_0_10px_rgba(59,130,246,0.6)]">
                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-white fill-current">
                          <path d="M12 3L2 19h7l3-6 3 6h7L12 3z" />
                        </svg>
                      </div>
                      <span className="font-semibold text-xs text-white">PrepAI</span>
                    </div>

                    {/* Nav tabs */}
                    <nav className="space-y-1">
                      <button className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-accent/20 border border-accent/30 text-accent text-[11px] font-medium text-left shadow-[0_0_12px_rgba(91,140,255,0.2)]">
                        <LayoutDashboard className="w-3.5 h-3.5" />
                        Dashboard
                      </button>
                      <button
                        onClick={() => setShowTierModal(true)}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-hover text-[11px] font-medium text-left transition-colors cursor-pointer"
                      >
                        <Code2 className="w-3.5 h-3.5" />
                        Practice
                      </button>
                      <button className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-hover text-[11px] font-medium text-left transition-colors">
                        <LineChart className="w-3.5 h-3.5" />
                        Analytics
                      </button>
                      <button
                        onClick={() => setShowTierModal(true)}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-hover text-[11px] font-medium text-left transition-colors cursor-pointer"
                      >
                        <Bot className="w-3.5 h-3.5" />
                        Mock Interviews
                      </button>
                      <button className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-hover text-[11px] font-medium text-left transition-colors">
                        <TrendingUp className="w-3.5 h-3.5" />
                        Progress
                      </button>
                      <button className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-hover text-[11px] font-medium text-left transition-colors">
                        <Settings className="w-3.5 h-3.5" />
                        Settings
                      </button>
                    </nav>
                  </div>

                  {/* Pro Tip Card */}
                  <div className="p-2.5 rounded-lg bg-surface/90 border border-hairline mt-6">
                    <p className="text-[10px] text-accent font-semibold flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      FAANG Target
                    </p>
                    <p className="text-[9px] text-text-muted mt-1 leading-tight">
                      3 sessions away from your monthly target!
                    </p>
                  </div>
                </div>

                {/* Dashboard Main Area */}
                <div className="col-span-9 space-y-4">
                  {/* Top Bar: Search & Time Filter */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                      <input
                        type="text"
                        placeholder="Search for topics, questions...  ⌘K"
                        className="w-full bg-surface/60 border border-hairline/70 rounded-lg pl-8 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50"
                        readOnly
                      />
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-surface/60 border border-hairline/70 rounded-lg text-xs text-text-secondary">
                      <span>{timeRange}</span>
                      <ChevronDown className="w-3 h-3 text-text-muted" />
                    </div>
                  </div>

                  {/* Hero Performance Chart & Floating Cards Row */}
                  <div className="grid grid-cols-12 gap-3">
                    {/* Performance Overview Chart Panel */}
                    <div className="col-span-8 p-3.5 rounded-xl bg-surface/70 border border-hairline/80 relative">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-xs font-semibold text-white">Performance Overview</h4>
                          <p className="text-[10px] text-text-muted">
                            Your interview readiness is trending up. Keep going!
                          </p>
                        </div>
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-semibold">
                          <TrendingUp className="w-2.5 h-2.5" />
                          +12% from last week
                        </div>
                      </div>

                      {/* Recharts Area Chart */}
                      <div className="h-36 mt-2 -ml-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={trendData}>
                            <defs>
                              <linearGradient id="scoreGlow" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.6} />
                                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                              </linearGradient>
                            </defs>
                            <XAxis
                              dataKey="month"
                              stroke="#5F687A"
                              fontSize={9}
                              tickLine={false}
                              axisLine={false}
                            />
                            <YAxis
                              stroke="#5F687A"
                              fontSize={9}
                              tickLine={false}
                              axisLine={false}
                              domain={[30, 100]}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#171A21',
                                border: '1px solid #232833',
                                borderRadius: '6px',
                                fontSize: '11px',
                                color: '#EDEFF2',
                              }}
                            />
                            <Area
                              type="monotone"
                              dataKey="score"
                              stroke="#5B8CFF"
                              strokeWidth={2.5}
                              fillOpacity={1}
                              fill="url(#scoreGlow)"
                              dot={{ r: 3, fill: '#60A5FA', stroke: '#1E40AF', strokeWidth: 1.5 }}
                              activeDot={{ r: 5, fill: '#93C5FD', stroke: '#3B82F6', strokeWidth: 2 }}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Floating Side Stat Cards */}
                    <div className="col-span-4 flex flex-col gap-2.5">
                      {/* Total Practice Time Card */}
                      <div className="glass-card-floating p-3 rounded-xl">
                        <div className="flex items-center justify-between text-text-muted">
                          <span className="text-[10px] font-medium flex items-center gap-1">
                            <Clock className="w-3 h-3 text-accent" />
                            Total Practice Time
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between mt-1">
                          <p className="text-lg font-bold text-white tracking-tight">
                            {analyticsData?.overview?.totalPracticeHours || '24.5'}{' '}
                            <span className="text-xs font-normal text-text-muted">hrs</span>
                          </p>
                          <span className="text-[10px] font-medium text-emerald-400">↑ 42%</span>
                        </div>
                        {/* Mini bar sparkline */}
                        <div className="flex items-end gap-1 h-5 mt-1.5">
                          {[30, 45, 60, 80, 50, 95].map((h, i) => (
                            <div
                              key={i}
                              className="flex-1 bg-accent/30 rounded-t hover:bg-accent transition-all"
                              style={{ height: `${h}%` }}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Questions Solved Card */}
                      <div className="glass-card-floating p-3 rounded-xl">
                        <div className="flex items-center justify-between text-text-muted">
                          <span className="text-[10px] font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-accent" />
                            Questions Solved
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between mt-1">
                          <p className="text-lg font-bold text-white tracking-tight">
                            {analyticsData?.overview?.totalQuestionsAnswered || '1,248'}
                          </p>
                          <span className="text-[10px] font-medium text-emerald-400">↑ 28%</span>
                        </div>
                        {/* Mini bar sparkline */}
                        <div className="flex items-end gap-1 h-5 mt-1.5">
                          {[40, 55, 70, 60, 85, 100].map((h, i) => (
                            <div
                              key={i}
                              className="flex-1 bg-accent/40 rounded-t hover:bg-accent transition-all"
                              style={{ height: `${h}%` }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Lower Row: Accuracy Radial & Topics Bars */}
                  <div className="grid grid-cols-12 gap-3">
                    {/* Accuracy Rate */}
                    <div className="col-span-4 p-3 rounded-xl bg-surface/70 border border-hairline/80 flex flex-col items-center justify-center">
                      <span className="text-[10px] font-medium text-text-muted self-start">Accuracy Rate</span>
                      <div className="relative w-20 h-20 my-1 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                          <path
                            className="text-surface-hover"
                            strokeWidth="3.5"
                            stroke="currentColor"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                          <path
                            className="text-accent drop-shadow-[0_0_8px_rgba(91,140,255,0.7)]"
                            strokeDasharray="78, 100"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            stroke="currentColor"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                        </svg>
                        <div className="absolute text-center">
                          <span className="text-base font-bold text-white">78%</span>
                        </div>
                      </div>
                      <span className="text-[9px] text-emerald-400 font-medium">↑ 12% vs last month</span>
                    </div>

                    {/* Strongest Topics */}
                    <div className="col-span-4 p-3 rounded-xl bg-surface/70 border border-hairline/80">
                      <span className="text-[10px] font-semibold text-white">Strongest Topics</span>
                      <div className="space-y-2 mt-2">
                        {strongestTopics.map((t, idx) => (
                          <div key={idx}>
                            <div className="flex justify-between text-[9px] mb-0.5">
                              <span className="text-text-secondary">{t.topic}</span>
                              <span className="text-text-primary font-medium">{t.score}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-surface-hover rounded-full overflow-hidden">
                              <div
                                className="h-full bg-accent rounded-full shadow-[0_0_6px_rgba(91,140,255,0.6)]"
                                style={{ width: `${t.score}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Areas to Improve */}
                    <div className="col-span-4 p-3 rounded-xl bg-surface/70 border border-hairline/80">
                      <span className="text-[10px] font-semibold text-white">Areas to Improve</span>
                      <div className="space-y-2 mt-2">
                        {areasToImprove.map((t, idx) => (
                          <div key={idx}>
                            <div className="flex justify-between text-[9px] mb-0.5">
                              <span className="text-text-secondary">{t.topic}</span>
                              <span className="text-text-primary font-medium">{t.score}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-surface-hover rounded-full overflow-hidden">
                              <div
                                className="h-full bg-amber-500/80 rounded-full shadow-[0_0_6px_rgba(245,158,11,0.5)]"
                                style={{ width: `${t.score}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* AI Insight Bar */}
                  <div className="p-3 rounded-xl bg-gradient-to-r from-accent/15 via-blue-900/10 to-transparent border border-accent/25 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-accent shrink-0" />
                      <p className="text-[10px] text-text-secondary">
                        <strong className="text-white">AI Insight:</strong> You're 32% more consistent this month. Focus on System Design to see the biggest improvement.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowTierModal(true)}
                      className="text-[10px] font-semibold text-accent hover:text-accent-hover flex items-center gap-1 shrink-0 ml-2 cursor-pointer"
                    >
                      Calibrate Next Session
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Target Company & Tier Setup Wizard Modal */}
        <CompanyTierModal
          isOpen={showTierModal}
          onClose={() => setShowTierModal(false)}
        />
      </div>
    </div>
  );
}
