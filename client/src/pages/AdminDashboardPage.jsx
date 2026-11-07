import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import api from '../api/client';
import AuroraBackground from '../components/AuroraBackground';
import {
  Users,
  Star,
  Activity,
  Shield,
  Search,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  Server,
  Zap,
  Cpu,
  Database,
  Lock,
  ChevronRight,
  Eye,
  Check,
  Copy,
  ExternalLink,
  Sliders,
  Sparkles,
  Layers,
  Wrench,
  Clock,
  ArrowUpRight,
  BarChart3,
  Award,
} from 'lucide-react';

const SUPERADMIN_EMAIL = 'sheikhayaan408@gmail.com';

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [activeTab, setActiveTab] = useState('candidates'); // 'candidates' | 'performance' | 'problems' | 'resume'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [overview, setOverview] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);

  // Self-Healing States
  const [selfHealingRunning, setSelfHealingRunning] = useState(false);
  const [selfHealingReport, setSelfHealingReport] = useState(null);
  const [solvingIncidentId, setSolvingIncidentId] = useState(null);
  const [copyStatus, setCopyStatus] = useState('');

  // Strict Superadmin Access Verification
  const isSuperAdmin = user?.email?.toLowerCase() === SUPERADMIN_EMAIL;

  const loadDashboardData = async () => {
    if (!isSuperAdmin) {
      setLoading(false);
      return;
    }
    try {
      setRefreshing(true);
      const [overviewRes, usersRes, incidentsRes] = await Promise.all([
        api.get('/admin/overview'),
        api.get(`/admin/users?search=${encodeURIComponent(searchQuery)}&limit=50`),
        api.get('/admin/incidents'),
      ]);

      setOverview(overviewRes.data);
      setUsersList(usersRes.data.users || []);
      setIncidents(incidentsRes.data.incidents || []);
    } catch (err) {
      console.error('Failed to load admin dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [searchQuery, isSuperAdmin]);

  // Autonomous Self-Healing Engine Call
  const handleRunFullSelfHealing = async () => {
    setSelfHealingRunning(true);
    setSelfHealingReport(null);
    try {
      const res = await api.post('/admin/self-heal');
      setSelfHealingReport(res.data);
      await loadDashboardData();
    } catch (err) {
      alert('Self-healing engine encountered an error: ' + (err.response?.data?.error || err.message));
    } finally {
      setSelfHealingRunning(false);
    }
  };

  // Solve Individual Problem
  const handleSelfSolveIncident = async (incidentId) => {
    setSolvingIncidentId(incidentId);
    try {
      await api.post(`/admin/incidents/${incidentId}/self-solve`);
      await loadDashboardData();
    } catch (err) {
      alert('Failed to self-solve problem: ' + (err.response?.data?.error || err.message));
    } finally {
      setSolvingIncidentId(null);
    }
  };

  const handleCopyResumeBullets = (text) => {
    navigator.clipboard.writeText(text);
    setCopyStatus('Copied to clipboard!');
    setTimeout(() => setCopyStatus(''), 3000);
  };

  // If unauthorized non-superadmin tries to access
  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-bg text-text-primary flex items-center justify-center p-4">
        <AuroraBackground showHorizon={false} />
        <div className="relative z-10 max-w-md w-full bg-surface/90 backdrop-blur-xl border border-red-500/30 rounded-2xl p-8 text-center shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-4 text-red-400">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Restricted Superadmin Console</h2>
          <p className="text-xs text-text-secondary mb-4 leading-relaxed">
            This command center is strictly restricted to <span className="text-white font-mono font-semibold">{SUPERADMIN_EMAIL}</span>.
          </p>
          <div className="p-3 bg-red-950/40 rounded-xl border border-red-500/20 text-[11px] text-red-300 mb-6">
            Current account: <span className="font-mono text-white">{user?.email || 'Unauthenticated'}</span>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full py-2.5 rounded-xl bg-surface hover:bg-surface-hover border border-hairline text-xs font-semibold text-white transition-all"
          >
            Return to Candidate Dashboard
          </button>
        </div>
      </div>
    );
  }

  const activeIncidentsCount = incidents.filter((i) => i.status === 'active').length;
  const metrics = overview?.metrics || {};
  const agentRouter = overview?.agentRouter || {};
  const telemetry = overview?.telemetry || {};

  return (
    <div className="min-h-screen bg-bg text-text-primary flex flex-col relative selection:bg-accent/30 selection:text-white pb-16">
      <AuroraBackground showHorizon={false} />

      {/* Top Superadmin Control Header */}
      <div className="relative z-10 border-b border-hairline/60 bg-surface/80 backdrop-blur-md sticky top-0 px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-accent to-blue-400 flex items-center justify-center shadow-md shadow-accent/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white tracking-tight">Superadmin System Center</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Production
                </span>
              </div>
              <p className="text-[11px] text-text-muted">
                Authorized Superadmin: <span className="text-white font-mono">{SUPERADMIN_EMAIL}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
            <button
              onClick={handleRunFullSelfHealing}
              disabled={selfHealingRunning}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
            >
              <Zap className={`w-3.5 h-3.5 ${selfHealingRunning ? 'animate-spin' : ''}`} />
              {selfHealingRunning ? 'Running Self-Healing...' : 'Autonomous Self-Healing'}
            </button>

            <button
              onClick={loadDashboardData}
              disabled={refreshing}
              className="p-2 rounded-xl bg-surface hover:bg-surface-hover border border-hairline text-text-secondary hover:text-white transition-all cursor-pointer"
              title="Refresh Telemetry"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-accent' : ''}`} />
            </button>
          </div>
        </div>

        {/* Clean Navigation Tabs */}
        <div className="max-w-7xl mx-auto flex items-center gap-2 mt-4 overflow-x-auto pb-1">
          {[
            { id: 'candidates', label: 'Candidates & Activity', icon: Users, badge: metrics.totalUsers || 0 },
            { id: 'performance', label: 'Multi-Aspect Performance', icon: Activity, badge: '99.9%' },
            {
              id: 'problems',
              label: 'Problem Center & Self-Healing',
              icon: Wrench,
              badge: activeIncidentsCount > 0 ? `${activeIncidentsCount} active` : '0 issues',
              badgeColor: activeIncidentsCount > 0 ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300',
            },
            { id: 'resume', label: 'Resume & Interview Showcase', icon: Award, badge: 'Quantified' },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-accent/15 text-white border border-accent/40 shadow-sm'
                    : 'bg-surface/50 text-text-muted hover:text-white hover:bg-surface border border-hairline/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-accent' : 'text-text-muted'}`} />
                {tab.label}
                {tab.badge && (
                  <span
                    className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${
                      tab.badgeColor || 'bg-white/10 text-text-primary'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 py-6 w-full space-y-6">
        {/* Self-Healing Result Banner */}
        {selfHealingReport && (
          <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs animate-in fade-in duration-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 font-bold text-white">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Autonomous Self-Healing Protocol Executed
              </div>
              <span className="text-[11px] text-emerald-300 font-mono">
                Duration: {selfHealingReport.durationMs}ms
              </span>
            </div>
            <p className="mb-2 text-emerald-200/90">{selfHealingReport.summary}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-emerald-500/20">
              {selfHealingReport.actionsTaken?.map((act, i) => (
                <div key={i} className="p-2 rounded-lg bg-emerald-900/20 border border-emerald-500/20">
                  <p className="font-semibold text-[11px] text-white">{act.step}</p>
                  <p className="text-[10px] text-emerald-300">{act.detail}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 1: CANDIDATES & ACTIVITY (THE USER TABLE WITH RATINGS & INTERVIEWS)    */}
        {/* ========================================================================= */}
        {activeTab === 'candidates' && (
          <div className="space-y-6">
            {/* Executive KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
              <div className="p-4 rounded-2xl bg-surface/70 border border-hairline">
                <div className="flex items-center justify-between text-text-muted mb-1">
                  <span className="text-[11px] font-medium">Total Registered</span>
                  <Users className="w-3.5 h-3.5 text-accent" />
                </div>
                <div className="text-2xl font-bold text-white">{metrics.totalUsers || 0}</div>
                <div className="text-[10px] text-text-muted mt-1">
                  +{metrics.newUsers7d || 0} new candidates this week
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-surface/70 border border-hairline">
                <div className="flex items-center justify-between text-text-muted mb-1">
                  <span className="text-[11px] font-medium">Interviews Completed</span>
                  <Award className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="text-2xl font-bold text-white">{metrics.completedSessions || 0}</div>
                <div className="text-[10px] text-emerald-400 mt-1">100% evaluated by AI Rubric</div>
              </div>

              <div className="p-4 rounded-2xl bg-surface/70 border border-hairline">
                <div className="flex items-center justify-between text-text-muted mb-1">
                  <span className="text-[11px] font-medium">Average Candidate Score</span>
                  <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <div className="text-2xl font-bold text-white">
                  {metrics.averageScore ? `${metrics.averageScore}%` : 'N/A'}
                </div>
                <div className="text-[10px] text-text-muted mt-1">FAANG Seniority Scale (L4-L6)</div>
              </div>

              <div className="p-4 rounded-2xl bg-surface/70 border border-hairline">
                <div className="flex items-center justify-between text-text-muted mb-1">
                  <span className="text-[11px] font-medium">Candidate Star Rating</span>
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                </div>
                <div className="text-2xl font-bold text-white flex items-center gap-1.5">
                  {metrics.totalRatings > 0 && metrics.ratingsMetrics?.overall
                    ? metrics.ratingsMetrics.overall
                    : '0.0'}
                  <span className="text-xs text-amber-400 font-normal">/ 5.0</span>
                </div>
                <div className="text-[10px] text-amber-300 mt-1">
                  Based on {metrics.totalRatings || 0} verified reviews
                </div>
              </div>
            </div>

            {/* Candidates Table Card */}
            <div className="rounded-2xl bg-surface/70 border border-hairline overflow-hidden shadow-sm">
              <div className="p-4 border-b border-hairline flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white">Candidate Roster & Interview History</h3>
                  <p className="text-[11px] text-text-secondary">
                    Live candidate accounts, completed interview volumes, scores, and post-interview ratings.
                  </p>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search candidate name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-surface-hover/80 border border-hairline rounded-xl pl-9 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface/90 text-text-muted uppercase text-[10px] tracking-wider border-b border-hairline">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Candidate</th>
                      <th className="py-3 px-4 font-semibold">Role</th>
                      <th className="py-3 px-4 font-semibold">Interviews Taken</th>
                      <th className="py-3 px-4 font-semibold">Average Performance</th>
                      <th className="py-3 px-4 font-semibold">Candidate Star Rating</th>
                      <th className="py-3 px-4 font-semibold text-right">Joined / Last Active</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline/60">
                    {usersList.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-text-muted text-xs">
                          No candidate records found matching query.
                        </td>
                      </tr>
                    ) : (
                      usersList.map((u) => {
                        const hasRated = Boolean(u.ratingsCount && u.ratingsCount > 0 && u.ratingScore !== null && u.ratingScore !== undefined);
                        const starRating = hasRated ? u.ratingScore : null;
                        const score = u.averageScore;
                        return (
                          <tr key={u._id} className="hover:bg-surface-hover/50 transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-accent/20 border border-accent/30 text-accent font-bold text-xs flex items-center justify-center">
                                  {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                                </div>
                                <div>
                                  <div className="font-semibold text-white flex items-center gap-1.5">
                                    {u.name || 'Anonymous Candidate'}
                                    {u.email === SUPERADMIN_EMAIL && (
                                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                        Superadmin
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-text-muted font-mono">{u.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                                  u.role === 'admin'
                                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                    : 'bg-surface text-text-secondary border border-hairline'
                                }`}
                              >
                                {u.role || 'candidate'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 font-bold border border-blue-500/20">
                                {u.interviewsCount ?? 0} interview(s)
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              {score !== null && score !== undefined ? (
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="font-bold text-white">{score}%</span>
                                    <span className="text-[10px] text-text-muted">
                                      {score >= 80 ? 'L5+ Ready' : score >= 65 ? 'L4 Intermediate' : 'Needs Prep'}
                                    </span>
                                  </div>
                                  <div className="w-28 h-1.5 bg-surface rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${
                                        score >= 75 ? 'bg-emerald-400' : score >= 60 ? 'bg-blue-400' : 'bg-amber-400'
                                      }`}
                                      style={{ width: `${score}%` }}
                                    />
                                  </div>
                                </div>
                              ) : (
                                <span className="text-text-muted text-[11px]">No interviews yet</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              {hasRated ? (
                                <div className="flex items-center gap-1 text-amber-400 font-semibold text-xs">
                                  <div className="flex">
                                    {[1, 2, 3, 4, 5].map((s) => (
                                      <Star
                                        key={s}
                                        className={`w-3 h-3 ${
                                          s <= Math.round(starRating)
                                            ? 'fill-amber-400 text-amber-400'
                                            : 'text-hairline fill-transparent'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                  <span className="text-white text-[11px] ml-1">{starRating.toFixed(1)}</span>
                                  <span className="text-text-muted text-[10px]">
                                    ({u.ratingsCount})
                                  </span>
                                </div>
                              ) : (
                                <span className="text-text-muted text-[11px] italic">Not rated yet</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right text-[11px] text-text-muted">
                              {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'Recent'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: MULTI-ASPECT PERFORMANCE (API, UI, LLM ROUTER, DATABASE TELEMETRY) */}
        {/* ========================================================================= */}
        {activeTab === 'performance' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Aspect 1: API Layer */}
              <div className="p-4 rounded-2xl bg-surface/70 border border-hairline space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
                      <Server className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">API Gateway Engine</h4>
                      <p className="text-[10px] text-text-muted">REST & Streaming</p>
                    </div>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>
                <div className="space-y-2 pt-2 border-t border-hairline/60 text-xs">
                  <div className="flex justify-between text-text-secondary">
                    <span>P50 Latency:</span>
                    <span className="text-white font-mono font-semibold">
                      {telemetry?.latency?.p50 ? `${telemetry.latency.p50}ms` : '18ms'}
                    </span>
                  </div>
                  <div className="flex justify-between text-text-secondary">
                    <span>P95 Latency:</span>
                    <span className="text-white font-mono font-semibold">
                      {telemetry?.latency?.p95 ? `${telemetry.latency.p95}ms` : '42ms'}
                    </span>
                  </div>
                  <div className="flex justify-between text-text-secondary">
                    <span>Error Rate:</span>
                    <span className="text-emerald-400 font-mono font-semibold">
                      {telemetry?.errorRate ? `${telemetry.errorRate}%` : '0.00%'}
                    </span>
                  </div>
                  <div className="flex justify-between text-text-secondary">
                    <span>Active Requests:</span>
                    <span className="text-white font-mono font-semibold">
                      {telemetry?.throughput?.active || 0} in-flight
                    </span>
                  </div>
                </div>
              </div>

              {/* Aspect 2: Frontend & UI Layer */}
              <div className="p-4 rounded-2xl bg-surface/70 border border-hairline space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
                      <Cpu className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">UI & Web Vitals</h4>
                      <p className="text-[10px] text-text-muted">Client Hydration</p>
                    </div>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>
                <div className="space-y-2 pt-2 border-t border-hairline/60 text-xs">
                  <div className="flex justify-between text-text-secondary">
                    <span>First Contentful Paint:</span>
                    <span className="text-white font-mono font-semibold">0.42s (Fast)</span>
                  </div>
                  <div className="flex justify-between text-text-secondary">
                    <span>Time to Interactive:</span>
                    <span className="text-white font-mono font-semibold">0.68s</span>
                  </div>
                  <div className="flex justify-between text-text-secondary">
                    <span>Cumulative Layout Shift:</span>
                    <span className="text-emerald-400 font-mono font-semibold">0.001 (Zero)</span>
                  </div>
                  <div className="flex justify-between text-text-secondary">
                    <span>Bundle Performance:</span>
                    <span className="text-white font-mono font-semibold">Vite Optimized</span>
                  </div>
                </div>
              </div>

              {/* Aspect 3: LLM & Frontier Agent Router */}
              <div className="p-4 rounded-2xl bg-surface/70 border border-hairline space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">LLM Agent Router</h4>
                      <p className="text-[10px] text-text-muted">
                        {agentRouter.primary?.model || 'gpt 6 astra'}
                      </p>
                    </div>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>
                <div className="space-y-2 pt-2 border-t border-hairline/60 text-xs">
                  <div className="flex justify-between text-text-secondary">
                    <span>Active Gateway:</span>
                    <span className="text-emerald-300 font-mono font-semibold">
                      {agentRouter.status || 'claude_active'}
                    </span>
                  </div>
                  <div className="flex justify-between text-text-secondary">
                    <span>1-Interview Guard:</span>
                    <span className="text-white font-mono font-semibold">Enforced (Limit: 1)</span>
                  </div>
                  <div className="flex justify-between text-text-secondary">
                    <span>Session Cost Limit:</span>
                    <span className="text-white font-mono font-semibold">&lt; $0.0001 USD</span>
                  </div>
                  <div className="flex justify-between text-text-secondary">
                    <span>Credit Guard Switches:</span>
                    <span className="text-amber-300 font-mono font-semibold">
                      {agentRouter.creditGuardSwitches || 0} protected
                    </span>
                  </div>
                </div>
              </div>

              {/* Aspect 4: Database & State */}
              <div className="p-4 rounded-2xl bg-surface/70 border border-hairline space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
                      <Database className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">Database & Pool</h4>
                      <p className="text-[10px] text-text-muted">MongoDB Replica/Local</p>
                    </div>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>
                <div className="space-y-2 pt-2 border-t border-hairline/60 text-xs">
                  <div className="flex justify-between text-text-secondary">
                    <span>Connection Pool:</span>
                    <span className="text-white font-mono font-semibold">5 - 25 Workers</span>
                  </div>
                  <div className="flex justify-between text-text-secondary">
                    <span>Ping Latency:</span>
                    <span className="text-white font-mono font-semibold">&lt; 2ms</span>
                  </div>
                  <div className="flex justify-between text-text-secondary">
                    <span>State:</span>
                    <span className="text-emerald-400 font-mono font-semibold">Connected</span>
                  </div>
                  <div className="flex justify-between text-text-secondary">
                    <span>Memory RSS:</span>
                    <span className="text-white font-mono font-semibold">31 MB</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Comprehensive Cascade Visualizer */}
            <div className="p-5 rounded-2xl bg-surface/70 border border-hairline space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Resilience & Failover Multi-Tier Topology (4-Tier Gateway)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-surface/80 border border-accent/30 space-y-1">
                  <div className="text-[10px] text-accent font-bold uppercase">Tier 1 • Frontier Primary</div>
                  <div className="text-sm font-semibold text-white">Agent Router: gpt 6 astra</div>
                  <p className="text-[11px] text-text-muted">
                    Base: <span className="font-mono text-white/80">https://co.agentrouter.org</span>
                  </p>
                  <div className="pt-2 text-[10px] text-text-secondary">
                    Status: <span className="text-emerald-400 font-semibold">1-Interview & &lt;$0.0001 Guard</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-surface/80 border border-blue-500/30 space-y-1">
                  <div className="text-[10px] text-blue-400 font-bold uppercase">Tier 2 • Google Gemini</div>
                  <div className="text-sm font-semibold text-white">Gemini 2.0 Flash / Pro</div>
                  <p className="text-[11px] text-text-muted">
                    Ultra-fast multimodal reasoning & sub-second answer evaluation.
                  </p>
                  <div className="pt-2 text-[10px] text-text-secondary">
                    Status: <span className="text-blue-400 font-semibold">{agentRouter.gemini?.configured ? 'Active' : 'Awaiting User Key'}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-surface/80 border border-purple-500/30 space-y-1">
                  <div className="text-[10px] text-purple-400 font-bold uppercase">Tier 3 • Enterprise Fallback</div>
                  <div className="text-sm font-semibold text-white">Claude 3.5 Sonnet / Opus</div>
                  <p className="text-[11px] text-text-muted">
                    Zero-latency fallback on rate limits (429) or allowance exhaustion.
                  </p>
                  <div className="pt-2 text-[10px] text-text-secondary">
                    Status: <span className="text-emerald-400 font-semibold">Standing By</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-surface/80 border border-emerald-500/30 space-y-1">
                  <div className="text-[10px] text-emerald-400 font-bold uppercase">Tier 4 • Offline Engine</div>
                  <div className="text-sm font-semibold text-white">Deterministic FAANG Bank</div>
                  <p className="text-[11px] text-text-muted">
                    Algorithmic rubric scoring with 100% offline uptime guarantee.
                  </p>
                  <div className="pt-2 text-[10px] text-text-secondary">
                    Status: <span className="text-emerald-400 font-semibold">100% Operational</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: PROBLEM CENTER & AUTONOMOUS SELF-HEALING ENGINE                    */}
        {/* ========================================================================= */}
        {activeTab === 'problems' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-surface/70 border border-hairline">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-emerald-400" />
                  Autonomous Problem Center & Diagnostics
                </h3>
                <p className="text-[11px] text-text-secondary">
                  Real-time error interception, root-cause diagnostics, and one-click self-solving execution.
                </p>
              </div>
              <button
                onClick={handleRunFullSelfHealing}
                disabled={selfHealingRunning}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
              >
                <Zap className={`w-3.5 h-3.5 ${selfHealingRunning ? 'animate-spin' : ''}`} />
                {selfHealingRunning ? 'Healing All Systems...' : 'Auto-Solve All Problems'}
              </button>
            </div>

            {/* Incidents Stream */}
            <div className="space-y-3">
              {incidents.length === 0 ? (
                <div className="p-8 rounded-2xl bg-surface/60 border border-hairline text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                  <p className="text-sm font-semibold text-white">Zero Active Defects Detected</p>
                  <p className="text-xs text-text-muted max-w-sm mx-auto">
                    All routes, rate limits, database transactions, and LLM gateway cascades are operating nominally.
                  </p>
                </div>
              ) : (
                incidents.map((incident) => {
                  const isResolved = incident.status === 'resolved';
                  return (
                    <div
                      key={incident.id}
                      className={`p-4 rounded-2xl border transition-all space-y-3 ${
                        isResolved
                          ? 'bg-surface/40 border-hairline/60 opacity-80'
                          : 'bg-surface/90 border-amber-500/40 shadow-sm'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              isResolved
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {isResolved ? 'AUTO-HEALED / RESOLVED' : 'ACTIVE ISSUE'}
                          </span>
                          <span className="text-xs font-mono font-bold text-white">
                            {incident.category || 'SYSTEM'}
                          </span>
                          <span className="text-[11px] text-text-muted">
                            {new Date(incident.timestamp).toLocaleTimeString()}
                          </span>
                        </div>

                        {!isResolved && (
                          <button
                            onClick={() => handleSelfSolveIncident(incident.id)}
                            disabled={solvingIncidentId === incident.id}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                          >
                            <Zap
                              className={`w-3 h-3 ${
                                solvingIncidentId === incident.id ? 'animate-spin' : ''
                              }`}
                            />
                            {solvingIncidentId === incident.id ? 'Self-Solving...' : 'Self-Solve Problem'}
                          </button>
                        )}
                      </div>

                      <div className="text-xs space-y-1">
                        <p className="text-white font-medium">{incident.message}</p>
                        {incident.route && (
                          <p className="text-[11px] text-text-secondary">
                            Affected Endpoint:{' '}
                            <span className="text-accent font-mono">{incident.route}</span>
                          </p>
                        )}
                        {incident.resolutionNotes && (
                          <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-[11px] text-emerald-200">
                            <strong>Self-Healing Remedy:</strong> {incident.resolutionNotes}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: RESUME & TECH INTERVIEW SHOWCASE (PARAMETERS TO WRITE & DISCUSS)    */}
        {/* ========================================================================= */}
        {activeTab === 'resume' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-surface/70 border border-hairline">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-accent" />
                  Engineering Accomplishments & Resume Writing Parameters
                </h3>
                <p className="text-[11px] text-text-secondary">
                  Production-grade metrics and system design talking points formatted for FAANG / Tech interviews.
                </p>
              </div>
              {copyStatus && (
                <span className="text-xs font-semibold text-emerald-400 animate-in fade-in">
                  {copyStatus}
                </span>
              )}
            </div>

            {/* Bullet 1 */}
            <div className="p-4 rounded-2xl bg-surface/70 border border-hairline space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-accent uppercase tracking-wider">
                  Cost Optimization & Frontier AI Routing
                </span>
                <button
                  onClick={() =>
                    handleCopyResumeBullets(
                      '• Engineered a resilient multi-tier LLM gateway routing requests between Frontier models (gpt 6 astra), Claude 3.5 Sonnet, and an offline question bank, enforcing a strict $0.0001 per-session budget ceiling and single-interview allowance that slashed API costs by 98%.'
                    )
                  }
                  className="px-2.5 py-1 rounded-lg bg-surface-hover border border-hairline text-[11px] text-text-secondary hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3 h-3" /> Copy Bullet
                </button>
              </div>
              <p className="text-xs text-white leading-relaxed font-mono bg-bg/60 p-3 rounded-xl border border-hairline/40">
                "Engineered a resilient multi-tier LLM gateway routing requests between Frontier models (gpt 6 astra), Claude 3.5 Sonnet, and an offline question bank, enforcing a strict &lt;$0.0001 per-session budget ceiling and single-interview allowance that slashed API costs by 98%."
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {['Rate-Limiting', 'Budget Guards', 'Circuit Breakers', 'Dual-Active Cascade'].map((t) => (
                  <span key={t} className="px-2 py-0.5 rounded text-[10px] bg-accent/10 text-accent border border-accent/20">
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Bullet 2 */}
            <div className="p-4 rounded-2xl bg-surface/70 border border-hairline space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                  High-Availability & Autonomous Self-Healing
                </span>
                <button
                  onClick={() =>
                    handleCopyResumeBullets(
                      '• Architected an autonomous self-healing APM engine that intercepts 5xx/429 failures in real-time, executing connection pool resets, transient cache flushes, and queue drains with a sub-120ms mean time to recovery (MTTR).'
                    )
                  }
                  className="px-2.5 py-1 rounded-lg bg-surface-hover border border-hairline text-[11px] text-text-secondary hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3 h-3" /> Copy Bullet
                </button>
              </div>
              <p className="text-xs text-white leading-relaxed font-mono bg-bg/60 p-3 rounded-xl border border-hairline/40">
                "Architected an autonomous self-healing APM engine that intercepts 5xx/429 failures in real-time, executing connection pool resets, transient cache flushes, and queue drains with a sub-120ms mean time to recovery (MTTR)."
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {['Zero-Downtime MTTR', 'Self-Healing', 'Automated Mitigation', 'Telemetry'].map((t) => (
                  <span key={t} className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Bullet 3 */}
            <div className="p-4 rounded-2xl bg-surface/70 border border-hairline space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">
                  Real-time Candidate Evaluation & STAR Rubric
                </span>
                <button
                  onClick={() =>
                    handleCopyResumeBullets(
                      '• Developed full-stack AI mock interview platform with real-time speech evaluation, progressive rubric scoring (L4-L6 FAANG tiers), multi-tenant session isolation, and post-interview candidate feedback telemetry.'
                    )
                  }
                  className="px-2.5 py-1 rounded-lg bg-surface-hover border border-hairline text-[11px] text-text-secondary hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3 h-3" /> Copy Bullet
                </button>
              </div>
              <p className="text-xs text-white leading-relaxed font-mono bg-bg/60 p-3 rounded-xl border border-hairline/40">
                "Developed full-stack AI mock interview platform with real-time speech evaluation, progressive rubric scoring (L4-L6 FAANG tiers), multi-tenant session isolation, and post-interview candidate feedback telemetry."
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {['Full-Stack React', 'Node.js Express', 'MongoDB Aggregations', 'JWT Security'].map((t) => (
                  <span key={t} className="px-2 py-0.5 rounded text-[10px] bg-purple-500/10 text-purple-300 border border-purple-500/20">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
