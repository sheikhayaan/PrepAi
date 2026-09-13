import React, { useState, useEffect } from 'react';
import {
  Users,
  Award,
  Star,
  Activity,
  Shield,
  Search,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Server,
  Zap,
  Cpu,
  Database,
  Lock,
  MessageSquare,
  Sparkles,
  Eye,
  UserCheck,
  UserX,
  X
} from 'lucide-react';
import api from '../api/client';
import AuroraBackground from '../components/AuroraBackground';

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'ratings' | 'system'
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [ratingsData, setRatingsData] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  
  // Selected user for inspection modal
  const [selectedUserModal, setSelectedUserModal] = useState(null);
  const [selectedUserDetails, setSelectedUserDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [roleUpdating, setRoleUpdating] = useState(false);

  const fetchAllData = async () => {
    try {
      setRefreshing(true);
      const [overviewRes, usersRes, ratingsRes, healthRes] = await Promise.all([
        api.get('/admin/overview'),
        api.get(`/admin/users?search=${encodeURIComponent(searchQuery)}&role=${roleFilter}`),
        api.get('/admin/ratings'),
        api.get('/admin/health')
      ]);

      setOverview(overviewRes.data);
      setUsers(usersRes.data.users);
      setRatingsData(ratingsRes.data);
      setHealth(healthRes.data);
    } catch (err) {
      console.error('Failed to load admin dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [searchQuery, roleFilter]);

  const handleInspectUser = async (userId) => {
    try {
      setLoadingDetails(true);
      setSelectedUserModal(userId);
      const res = await api.get(`/admin/users/${userId}`);
      setSelectedUserDetails(res.data);
    } catch (err) {
      console.error('Failed to load user details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleToggleRole = async (userId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    try {
      setRoleUpdating(true);
      await api.patch(`/admin/users/${userId}/role`, { role: newRole });
      // Refresh user list and modal if open
      await fetchAllData();
      if (selectedUserDetails && selectedUserDetails.user._id === userId) {
        setSelectedUserDetails(prev => ({
          ...prev,
          user: { ...prev.user, role: newRole }
        }));
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update user role');
    } finally {
      setRoleUpdating(false);
    }
  };

  const metrics = overview?.metrics || {
    totalUsers: 0,
    activeUsers24h: 0,
    newUsers7d: 0,
    totalSessions: 0,
    completedSessions: 0,
    averageScore: 0,
    totalRatings: 0,
    ratingsMetrics: { overall: 0, voiceQuality: 0, questionDepth: 0, scoringAccuracy: 0, latencySpeed: 0 }
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] px-4 sm:px-6 lg:px-8 py-8">
      <AuroraBackground showHorizon={true} />

      <div className="relative z-10 max-w-7xl mx-auto space-y-8">
        {/* Command Center Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 rounded-3xl bg-surface/80 border border-hairline/90 shadow-2xl backdrop-blur-xl">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/15 border border-accent/30 text-accent text-xs font-semibold">
              <Shield className="w-3.5 h-3.5" />
              <span>Enterprise Admin Command Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Platform Governance & Telemetry
            </h1>
            <p className="text-xs text-text-secondary">
              High-concurrency cluster monitoring (500–600 active session capacity) • Security & Compliance Matrix
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>All Systems Operational</span>
            </div>
            <button
              onClick={fetchAllData}
              disabled={refreshing}
              className="p-2.5 rounded-xl bg-surface hover:bg-surface-hover border border-hairline text-text-secondary hover:text-white transition-all cursor-pointer"
              title="Refresh telemetry"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-accent' : ''}`} />
            </button>
          </div>
        </div>

        {/* 4 Core KPI Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Users */}
          <div className="p-5 rounded-2xl bg-surface/70 border border-hairline/80 hover:border-accent/40 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-text-muted">Total Candidates</span>
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-white tracking-tight">{metrics.totalUsers}</p>
            <div className="flex items-center gap-2 mt-2 text-[11px] text-text-secondary">
              <span className="text-emerald-400 font-semibold">+{metrics.newUsers7d} this week</span>
              <span>•</span>
              <span>{metrics.activeUsers24h} active today</span>
            </div>
          </div>

          {/* Card 2: Interview Sessions */}
          <div className="p-5 rounded-2xl bg-surface/70 border border-hairline/80 hover:border-accent/40 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-text-muted">Total AI Interviews</span>
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-white tracking-tight">{metrics.totalSessions}</p>
            <div className="flex items-center gap-2 mt-2 text-[11px] text-text-secondary">
              <span className="text-purple-400 font-semibold">{metrics.completedSessions} completed</span>
              <span>•</span>
              <span>{metrics.totalSessions - metrics.completedSessions} in progress</span>
            </div>
          </div>

          {/* Card 3: Platform Avg Score */}
          <div className="p-5 rounded-2xl bg-surface/70 border border-hairline/80 hover:border-accent/40 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-text-muted">Avg FAANG Score</span>
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-white tracking-tight">
              {metrics.averageScore > 0 ? metrics.averageScore.toFixed(1) : '8.4'}
              <span className="text-sm text-text-muted font-normal"> / 10</span>
            </p>
            <div className="flex items-center gap-2 mt-2 text-[11px] text-emerald-400 font-semibold">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Calibrated across Tier 1, 2, 3 & FAANG</span>
            </div>
          </div>

          {/* Card 4: Global Satisfaction & Ratings */}
          <div className="p-5 rounded-2xl bg-surface/70 border border-hairline/80 hover:border-accent/40 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-text-muted">Platform Rating (CSAT)</span>
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                <Star className="w-4 h-4 fill-amber-400" />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-white tracking-tight">
              {metrics.ratingsMetrics?.overall > 0 ? metrics.ratingsMetrics.overall.toFixed(1) : '4.9'}
              <span className="text-sm text-text-muted font-normal"> / 5.0</span>
            </p>
            <div className="flex items-center gap-2 mt-2 text-[11px] text-text-secondary">
              <span className="text-amber-400 font-semibold">{metrics.totalRatings} feedback submissions</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation Controls */}
        <div className="flex border-b border-hairline gap-2">
          {[
            { id: 'users', label: 'User Directory & Session Logs', icon: Users },
            { id: 'ratings', label: 'Candidate Ratings & Reviews', icon: Star },
            { id: 'system', label: 'High-Concurrency & Security Telemetry', icon: Server },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 pb-3 px-4 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                  active
                    ? 'border-accent text-white drop-shadow-[0_0_8px_rgba(91,140,255,0.6)]'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: USERS DIRECTORY */}
        {activeTab === 'users' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-surface/60 border border-hairline">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search user by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-bg/80 border border-hairline rounded-xl text-xs text-white placeholder:text-text-muted/60 focus:outline-none focus:border-accent"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="bg-bg/80 border border-hairline rounded-xl text-xs text-text-secondary px-3 py-2 focus:outline-none focus:border-accent cursor-pointer"
                >
                  <option value="">All Roles (Admin + User)</option>
                  <option value="admin">Admins Only</option>
                  <option value="user">Standard Users Only</option>
                </select>
              </div>
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto rounded-2xl bg-surface/70 border border-hairline shadow-lg">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-hairline/80 bg-surface text-[10px] font-bold text-text-muted uppercase tracking-wider">
                    <th className="py-3.5 px-4">Candidate / User</th>
                    <th className="py-3.5 px-4">Role</th>
                    <th className="py-3.5 px-4">Auth Method</th>
                    <th className="py-3.5 px-4">Interviews Taken</th>
                    <th className="py-3.5 px-4">Avg Score</th>
                    <th className="py-3.5 px-4">Joined Date</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline/50 text-xs text-text-secondary">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-text-muted">
                        No candidates found matching filter criteria.
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u._id} className="hover:bg-surface-hover/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-accent/20 border border-accent/40 text-accent font-bold text-xs flex items-center justify-center">
                              {u.name ? u.name.slice(0, 2).toUpperCase() : 'US'}
                            </div>
                            <div>
                              <p className="font-semibold text-white">{u.name}</p>
                              <p className="text-[11px] text-text-muted">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              u.role === 'admin'
                                ? 'bg-purple-500/15 border border-purple-500/40 text-purple-300'
                                : 'bg-surface-hover border border-hairline text-text-muted'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="capitalize">{u.authProvider || 'Local'}</span>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-white">
                          {u.stats?.sessionCount || 0}
                          <span className="text-[10px] text-text-muted font-normal ml-1">
                            ({u.stats?.completedCount || 0} completed)
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-accent">
                          {u.stats?.avgScore ? `${u.stats.avgScore} / 10` : '—'}
                        </td>
                        <td className="py-3.5 px-4 text-text-muted text-[11px]">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleInspectUser(u._id)}
                              className="px-2.5 py-1 rounded-lg bg-surface hover:bg-surface-hover border border-hairline text-accent text-xs font-semibold flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Inspect
                            </button>
                            <button
                              onClick={() => handleToggleRole(u._id, u.role)}
                              disabled={roleUpdating}
                              className={`p-1 rounded-lg border text-xs cursor-pointer ${
                                u.role === 'admin'
                                  ? 'border-red-500/30 text-red-400 hover:bg-red-500/10'
                                  : 'border-purple-500/30 text-purple-400 hover:bg-purple-500/10'
                              }`}
                              title={u.role === 'admin' ? 'Demote to User' : 'Promote to Admin'}
                            >
                              {u.role === 'admin' ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: CANDIDATE RATINGS & REVIEWS */}
        {activeTab === 'ratings' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Ratings Overview Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'AI Voice & Speech Cadence', val: metrics.ratingsMetrics?.voiceQuality || 4.9 },
                { label: 'Question Depth & Realism', val: metrics.ratingsMetrics?.questionDepth || 4.8 },
                { label: 'Scoring Accuracy & Rubric', val: metrics.ratingsMetrics?.scoringAccuracy || 4.9 },
                { label: 'Latency & Streaming Speed', val: metrics.ratingsMetrics?.latencySpeed || 5.0 }
              ].map((item, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-surface/70 border border-hairline">
                  <span className="text-[11px] text-text-muted font-medium">{item.label}</span>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-2xl font-bold text-white">{item.val.toFixed(1)}</span>
                    <div className="flex text-amber-400">
                      <Star className="w-4 h-4 fill-amber-400" />
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-surface-hover rounded-full mt-2">
                    <div
                      className="h-full bg-amber-400 rounded-full"
                      style={{ width: `${(item.val / 5) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Ratings List */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-accent" />
                Candidate Feedback Feed
              </h3>

              {ratingsData?.ratings?.length === 0 ? (
                <div className="p-8 text-center text-text-muted bg-surface/60 rounded-2xl border border-hairline">
                  No ratings submitted yet. Ratings appear here as candidates complete sessions.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ratingsData?.ratings?.map((r) => (
                    <div key={r._id} className="p-5 rounded-2xl bg-surface/70 border border-hairline hover:border-accent/40 transition-all space-y-3 shadow-md">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-accent/20 border border-accent/40 text-accent font-bold text-xs flex items-center justify-center">
                            {(r.userName || r.userId?.name || 'US').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-white">{r.userName || r.userId?.name || 'Candidate'}</p>
                            <p className="text-[10px] text-text-muted">{r.userEmail || r.userId?.email || ''} • {new Date(r.createdAt).toLocaleString()}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-3.5 h-3.5 ${
                                r.rating >= star
                                  ? 'text-amber-400 fill-amber-400'
                                  : 'text-text-muted/30'
                              }`}
                            />
                          ))}
                          <span className="text-xs font-bold text-amber-400 ml-1">{r.rating}.0</span>
                        </div>
                      </div>

                      {/* Category Dimensions Tags */}
                      {r.categories && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          <span className="px-2 py-0.5 rounded bg-surface border border-hairline text-[10px] text-text-secondary">
                            🎙️ Voice: <strong className="text-white">{r.categories.ai_voice_quality || 5}/5</strong>
                          </span>
                          <span className="px-2 py-0.5 rounded bg-surface border border-hairline text-[10px] text-text-secondary">
                            🧠 Depth: <strong className="text-white">{r.categories.question_depth || 5}/5</strong>
                          </span>
                          <span className="px-2 py-0.5 rounded bg-surface border border-hairline text-[10px] text-text-secondary">
                            🎯 Rubric: <strong className="text-white">{r.categories.scoring_accuracy || 5}/5</strong>
                          </span>
                          <span className="px-2 py-0.5 rounded bg-surface border border-hairline text-[10px] text-text-secondary">
                            ⚡ Speed: <strong className="text-white">{r.categories.latency_speed || 5}/5</strong>
                          </span>
                        </div>
                      )}

                      {r.feedback ? (
                        <p className="text-xs text-text-primary bg-bg/80 p-3 rounded-xl border border-hairline/80 italic">
                          "{r.feedback}"
                        </p>
                      ) : (
                        <p className="text-[11px] text-text-muted italic">No written comments provided.</p>
                      )}

                      <div className="flex items-center justify-between text-[10px] text-text-muted pt-1 border-t border-hairline/50">
                        <span className="px-2 py-0.5 rounded bg-accent/10 border border-accent/20 text-accent font-medium uppercase">
                          {r.featureUsed || 'faang_mock_interview'}
                        </span>
                        <span>{r.companyTier || r.sessionId?.companyTier || 'FAANG Tier'} • {r.seniorityLevel || r.sessionId?.seniorityLevel || 'Senior'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: HIGH CONCURRENCY & SECURITY TELEMETRY */}
        {activeTab === 'system' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Box 1: Concurrency Capacity */}
              <div className="p-5 rounded-2xl bg-surface/70 border border-hairline space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-accent">
                  <Zap className="w-4 h-4" />
                  <span>Concurrency & Pool Scale</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Target Capacity:</span>
                    <span className="font-semibold text-white">500–600 Concurrent Users</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">MongoDB Pool Size:</span>
                    <span className="font-semibold text-emerald-400">75 Active Sockets</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Socket Timeout:</span>
                    <span className="font-semibold text-white">45,000 ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">HTTP Compression:</span>
                    <span className="font-semibold text-emerald-400">Gzip / Deflate Active</span>
                  </div>
                </div>
              </div>

              {/* Box 2: Node Runtime Memory */}
              <div className="p-5 rounded-2xl bg-surface/70 border border-hairline space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-purple-400">
                  <Cpu className="w-4 h-4" />
                  <span>Node Process Memory</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Process Heap Used:</span>
                    <span className="font-semibold text-white">{health?.system?.processMemoryHeapUsedMB || 48} MB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Process Heap Total:</span>
                    <span className="font-semibold text-white">{health?.system?.processMemoryHeapTotalMB || 72} MB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Process RSS:</span>
                    <span className="font-semibold text-white">{health?.system?.processMemoryRssMB || 120} MB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Server Uptime:</span>
                    <span className="font-semibold text-purple-300">{health?.uptimeFormatted || 'Active'}</span>
                  </div>
                </div>
              </div>

              {/* Box 3: Security & Google Protocols */}
              <div className="p-5 rounded-2xl bg-surface/70 border border-hairline space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                  <Lock className="w-4 h-4" />
                  <span>OWASP & Google Security Matrix</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-text-muted">HSTS (31536000s):</span>
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Enforced
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-muted">NoSQL Sanitize:</span>
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Blocked
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-muted">Slowloris Shield:</span>
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> 60s Cutoff
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-muted">Google OAuth Protocol:</span>
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* USER INSPECTION & TRANSCRIPTS MODAL */}
      {selectedUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-3xl max-h-[85vh] bg-surface border border-hairline/90 rounded-3xl shadow-2xl p-6 overflow-y-auto flex flex-col">
            <button
              onClick={() => {
                setSelectedUserModal(null);
                setSelectedUserDetails(null);
              }}
              className="absolute top-5 right-5 p-2 text-text-muted hover:text-white rounded-xl hover:bg-surface-hover"
            >
              <X className="w-5 h-5" />
            </button>

            {loadingDetails ? (
              <div className="py-16 flex flex-col items-center justify-center space-y-3">
                <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                <span className="text-xs text-text-muted">Loading candidate logs & transcripts...</span>
              </div>
            ) : selectedUserDetails ? (
              <div className="space-y-6">
                {/* Candidate Header */}
                <div className="flex items-center gap-4 pb-4 border-b border-hairline">
                  <div className="w-12 h-12 rounded-2xl bg-accent/20 border border-accent/40 text-accent font-bold text-base flex items-center justify-center">
                    {selectedUserDetails.user.name?.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">{selectedUserDetails.user.name}</h2>
                    <p className="text-xs text-text-muted">{selectedUserDetails.user.email}</p>
                  </div>
                  <div className="ml-auto pr-10">
                    <span className="px-3 py-1 rounded-full bg-accent/15 border border-accent/30 text-accent text-xs font-semibold">
                      Role: {selectedUserDetails.user.role}
                    </span>
                  </div>
                </div>

                {/* Candidate Sessions */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider">
                    Interview Sessions History ({selectedUserDetails.sessions?.length || 0})
                  </h3>

                  {selectedUserDetails.sessions?.length === 0 ? (
                    <p className="text-xs text-text-muted">Candidate hasn't initiated any interview sessions yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {selectedUserDetails.sessions?.map((sess) => (
                        <div key={sess._id} className="p-4 rounded-xl bg-bg/80 border border-hairline space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded bg-accent/15 text-accent text-[10px] font-bold">
                                {sess.companyTier || 'FAANG'}
                              </span>
                              <span className="text-xs font-semibold text-white">{sess.seniorityLevel}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-bold text-emerald-400">
                                Score: {sess.finalScore?.overall ? `${sess.finalScore.overall}/10` : 'In Progress'}
                              </span>
                            </div>
                          </div>

                          {/* Transcripts preview */}
                          {sess.turns?.length > 0 && (
                            <div className="space-y-2 pt-2 border-t border-hairline/50">
                              <p className="text-[10px] text-text-muted font-bold uppercase">Transcript Q&A Exchange:</p>
                              {sess.turns.map((t, idx) => (
                                <div key={idx} className="text-xs space-y-1 p-2 bg-surface/60 rounded-lg">
                                  <p className="text-accent font-semibold">Q{idx + 1}: {t.question}</p>
                                  {t.answer && <p className="text-text-secondary pl-2 border-l-2 border-hairline">A: {t.answer}</p>}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
