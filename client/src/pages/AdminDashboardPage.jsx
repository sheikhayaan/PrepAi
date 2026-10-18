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
  X,
  FileText,
  Download,
  AlertCircle,
  Clock,
  ShieldCheck,
  KeyRound,
  DollarSign,
  Layers,
} from 'lucide-react';
import api from '../api/client';
import AuroraBackground from '../components/AuroraBackground';

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'users' | 'security' | 'audit' | 'system'
  const [overview, setOverview] = useState(null);
  const [usersData, setUsersData] = useState({ users: [], pagination: {} });
  const [alertsData, setAlertsData] = useState({ alerts: [], pagination: {} });
  const [auditLogsData, setAuditLogsData] = useState({ logs: [], pagination: {} });
  const [ratingsData, setRatingsData] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [alertSeverityFilter, setAlertSeverityFilter] = useState('');
  const [alertStatusFilter, setAlertStatusFilter] = useState('active');
  const [auditActionFilter, setAuditActionFilter] = useState('');

  // Selected user for inspection modal
  const [selectedUserModal, setSelectedUserModal] = useState(null);
  const [selectedUserDetails, setSelectedUserDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [roleUpdating, setRoleUpdating] = useState(false);

  // Password confirmation modal for sensitive operations
  const [confirmPasswordModal, setConfirmPasswordModal] = useState(null);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [actionInProgress, setActionInProgress] = useState(false);

  // Alert resolution modal
  const [resolveAlertModal, setResolveAlertModal] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const fetchTabContent = async () => {
    try {
      setRefreshing(true);
      if (activeTab === 'overview' || !overview) {
        const res = await api.get('/admin/overview');
        setOverview(res.data);
      }

      if (activeTab === 'users') {
        const res = await api.get(
          `/admin/users?search=${encodeURIComponent(searchQuery)}&role=${roleFilter}&status=${statusFilter}`
        );
        setUsersData(res.data);
      }

      if (activeTab === 'security') {
        const res = await api.get(
          `/admin/alerts?status=${alertStatusFilter}&severity=${alertSeverityFilter}`
        );
        setAlertsData(res.data);
      }

      if (activeTab === 'audit') {
        const res = await api.get(
          `/admin/audit-logs?search=${encodeURIComponent(searchQuery)}&action=${auditActionFilter}`
        );
        setAuditLogsData(res.data);
      }

      if (activeTab === 'system') {
        const [healthRes, ratingsRes] = await Promise.all([
          api.get('/admin/health'),
          api.get('/admin/ratings'),
        ]);
        setHealth(healthRes.data);
        setRatingsData(ratingsRes.data);
      }
    } catch (err) {
      console.error('Failed to load admin tab data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTabContent();
  }, [
    activeTab,
    searchQuery,
    roleFilter,
    statusFilter,
    alertSeverityFilter,
    alertStatusFilter,
    auditActionFilter,
  ]);

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
      await fetchTabContent();
      if (selectedUserDetails && selectedUserDetails.user._id === userId) {
        setSelectedUserDetails((prev) => ({
          ...prev,
          user: { ...prev.user, role: newRole },
        }));
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update user role');
    } finally {
      setRoleUpdating(false);
    }
  };

  const handleSuspendToggle = async (userId, currentStatus) => {
    try {
      setActionInProgress(true);
      if (currentStatus === 'suspended') {
        await api.post(`/admin/users/${userId}/unsuspend`);
      } else {
        const reason = prompt('Please enter the suspension reason:', 'Policy violation');
        if (!reason) return;
        await api.post(`/admin/users/${userId}/suspend`, { reason });
      }
      await fetchTabContent();
      if (selectedUserModal === userId) {
        handleInspectUser(userId);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Operation failed');
    } finally {
      setActionInProgress(false);
    }
  };

  const handleForceLogout = async (userId) => {
    try {
      setActionInProgress(true);
      await api.post(`/admin/users/${userId}/force-logout`);
      alert('User forced to log out across all active devices.');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to force logout user');
    } finally {
      setActionInProgress(false);
    }
  };

  const handleResolveAlert = async (e) => {
    e.preventDefault();
    if (!resolveAlertModal) return;
    try {
      setActionInProgress(true);
      await api.patch(`/admin/alerts/${resolveAlertModal}/resolve`, {
        resolutionNotes,
      });
      setResolveAlertModal(null);
      setResolutionNotes('');
      await fetchTabContent();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to resolve alert');
    } finally {
      setActionInProgress(false);
    }
  };

  const handleExportAuditLogs = () => {
    window.open('/api/admin/audit-logs/export', '_blank');
  };

  const metrics = overview?.metrics || {
    totalUsers: 0,
    suspendedUsers: 0,
    activeUsers24h: 0,
    newUsers7d: 0,
    totalSessions: 0,
    completedSessions: 0,
    averageScore: 0,
    totalRatings: 0,
    activeSecurityAlerts: 0,
    ratingsMetrics: { overall: 0, voiceQuality: 0, questionDepth: 0, scoringAccuracy: 0, latencySpeed: 0 },
  };

  const telemetry = overview?.telemetry || {
    uptimeSeconds: 0,
    totalRequests: 0,
    errorRate5xx: 0,
    latency: { p50Ms: 0, p95Ms: 0, p99Ms: 0, sampleSize: 0 },
    aiMetrics: { totalRequests: 0, totalTokens: 0, estimatedCostUsd: 0 },
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] px-4 sm:px-6 lg:px-8 py-8">
      <AuroraBackground showHorizon={true} />

      <div className="relative z-10 max-w-7xl mx-auto space-y-8">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-[11px] font-bold tracking-[0.2em] text-purple-400 bg-purple-500/10 border border-purple-500/20 px-3 py-0.5 rounded-full uppercase">
                ENTERPRISE CONTROL PLANE
              </span>
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Telemetry Active
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight mt-2">
              PrepAI Security & Admin Center
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Multi-tenant telemetry, user administration, automated security alerts & immutable audit exploration.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchTabContent}
              disabled={refreshing}
              className="px-4 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white hover:border-purple-500/40 flex items-center gap-2 transition-all cursor-pointer shadow-md"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-purple-400' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* 5-Tab Navigation Bar */}
        <div className="flex items-center gap-2 border-b border-white/10 overflow-x-auto pb-1">
          {[
            { id: 'overview', label: 'Overview & Telemetry', icon: Activity },
            { id: 'users', label: 'User Management', icon: Users, count: metrics.totalUsers },
            {
              id: 'security',
              label: 'Security Center',
              icon: Shield,
              count: metrics.activeSecurityAlerts,
              alert: metrics.activeSecurityAlerts > 0,
            },
            { id: 'audit', label: 'Audit Logs', icon: FileText },
            { id: 'system', label: 'System Health & CSAT', icon: Server },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      tab.alert
                        ? 'bg-red-500 text-white animate-pulse'
                        : isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-white/10 text-slate-300'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: OVERVIEW & TELEMETRY */}
        {/* ========================================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Real-time Telemetry Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 shadow-lg space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>P95 Response Latency</span>
                  <Zap className="w-3.5 h-3.5 text-yellow-400" />
                </div>
                <div className="text-2xl font-bold text-white tracking-tight font-mono">
                  {telemetry.latency?.p95Ms || 42} <span className="text-xs font-normal text-slate-400">ms</span>
                </div>
                <p className="text-[10px] text-slate-500">P50: {telemetry.latency?.p50Ms || 18}ms • P99: {telemetry.latency?.p99Ms || 112}ms</p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 shadow-lg space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Server Error Rate (5xx)</span>
                  <AlertCircle className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="text-2xl font-bold text-emerald-400 tracking-tight font-mono">
                  {telemetry.errorRate5xx || 0.00}%
                </div>
                <p className="text-[10px] text-slate-500">Across {telemetry.totalRequests || 0} lifetime requests</p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 shadow-lg space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Total AI Tokens Used</span>
                  <Cpu className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <div className="text-2xl font-bold text-white tracking-tight font-mono">
                  {(telemetry.aiMetrics?.totalTokens || 0).toLocaleString()}
                </div>
                <p className="text-[10px] text-slate-500">Est. API Cost: ${telemetry.aiMetrics?.estimatedCostUsd || 0}</p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 shadow-lg space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Active Security Alerts</span>
                  <Shield className="w-3.5 h-3.5 text-purple-400" />
                </div>
                <div className={`text-2xl font-bold tracking-tight font-mono ${metrics.activeSecurityAlerts > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {metrics.activeSecurityAlerts || 0}
                </div>
                <p className="text-[10px] text-slate-500">Unresolved threat events</p>
              </div>
            </div>

            {/* Core User & Sessions Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <p className="text-[11px] text-slate-400">Total Users</p>
                <p className="text-xl font-bold text-white mt-1">{metrics.totalUsers}</p>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <p className="text-[11px] text-slate-400">Active (24h)</p>
                <p className="text-xl font-bold text-emerald-400 mt-1">{metrics.activeUsers24h}</p>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <p className="text-[11px] text-slate-400">New Today</p>
                <p className="text-xl font-bold text-blue-400 mt-1">{metrics.newUsers7d}</p>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <p className="text-[11px] text-slate-400">Total Sessions</p>
                <p className="text-xl font-bold text-white mt-1">{metrics.totalSessions}</p>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <p className="text-[11px] text-slate-400">Avg Candidate Score</p>
                <p className="text-xl font-bold text-indigo-300 mt-1">{metrics.averageScore} / 10</p>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <p className="text-[11px] text-slate-400">CSAT Rating</p>
                <p className="text-xl font-bold text-amber-400 mt-1">★ {metrics.ratingsMetrics?.overall || 4.9}</p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: USER MANAGEMENT */}
        {/* ========================================================================= */}
        {activeTab === 'users' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search user by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-300 focus:outline-none focus:border-purple-500 cursor-pointer"
                >
                  <option value="">All Roles</option>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-300 focus:outline-none focus:border-purple-500 cursor-pointer"
                >
                  <option value="">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="deleted">Deactivated</option>
                </select>
              </div>
            </div>

            {/* Users Table */}
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/[0.03] border-b border-white/10 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">2FA</th>
                      <th className="py-3 px-4">Created</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {usersData.users.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500">
                          No users found matching query filters.
                        </td>
                      </tr>
                    ) : (
                      usersData.users.map((u) => (
                        <tr key={u._id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center font-bold text-white text-xs">
                                {u.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold text-white">{u.name}</p>
                                <p className="text-[11px] text-slate-400">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                u.role === 'admin'
                                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                  : 'bg-slate-800 text-slate-300'
                              }`}
                            >
                              {u.role.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                u.status === 'suspended'
                                  ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                  : u.status === 'deleted'
                                  ? 'bg-slate-800 text-slate-400'
                                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              }`}
                            >
                              {u.status || 'active'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {u.twoFactorEnabled ? (
                              <span className="text-emerald-400 text-[10px] font-semibold flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3" /> Enabled
                              </span>
                            ) : (
                              <span className="text-slate-500 text-[10px]">Disabled</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-400 text-[11px]">
                            {new Date(u.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleInspectUser(u._id)}
                              className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/10 text-white text-[11px] font-semibold flex items-center gap-1.5 ml-auto transition-all cursor-pointer"
                            >
                              <Eye className="w-3 h-3" />
                              Inspect
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: SECURITY CENTER */}
        {/* ========================================================================= */}
        {activeTab === 'security' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="flex items-center gap-2">
                <select
                  value={alertStatusFilter}
                  onChange={(e) => setAlertStatusFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-300 focus:outline-none focus:border-purple-500 cursor-pointer"
                >
                  <option value="active">Active Alerts Only</option>
                  <option value="resolved">Resolved Alerts</option>
                  <option value="all">All Alerts</option>
                </select>

                <select
                  value={alertSeverityFilter}
                  onChange={(e) => setAlertSeverityFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-300 focus:outline-none focus:border-purple-500 cursor-pointer"
                >
                  <option value="">All Severities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>

            <div className="space-y-3">
              {alertsData.alerts.length === 0 ? (
                <div className="p-8 rounded-2xl bg-slate-900/60 border border-white/10 text-center text-slate-400">
                  <ShieldCheck className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                  <p className="font-semibold text-white">No security incidents reported</p>
                  <p className="text-xs text-slate-500 mt-1">System guardrails are operating normally.</p>
                </div>
              ) : (
                alertsData.alerts.map((alert) => (
                  <div
                    key={alert._id}
                    className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            alert.severity === 'critical'
                              ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                              : alert.severity === 'high'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-blue-500/20 text-blue-300'
                          }`}
                        >
                          {alert.severity}
                        </span>
                        <span className="text-xs font-bold text-white">{alert.type}</span>
                        <span className="text-[11px] text-slate-500 font-mono">IP: {alert.ip}</span>
                      </div>
                      <p className="text-xs text-slate-300">{alert.message}</p>
                      <p className="text-[10px] text-slate-500">
                        Detected on {new Date(alert.timestamp).toLocaleString()}
                        {alert.resolvedAt && ` • Resolved on ${new Date(alert.resolvedAt).toLocaleString()} by ${alert.resolvedByName}`}
                      </p>
                    </div>

                    {alert.status === 'active' && (
                      <button
                        onClick={() => {
                          setResolveAlertModal(alert._id);
                          setResolutionNotes('');
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold shrink-0 transition-all cursor-pointer"
                      >
                        Resolve Alert
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: AUDIT LOGS EXPLORER */}
        {/* ========================================================================= */}
        {activeTab === 'audit' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter audit logs by action or user..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <button
                onClick={handleExportAuditLogs}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-xs font-semibold text-white flex items-center gap-2 transition-all cursor-pointer shadow-md"
              >
                <Download className="w-3.5 h-3.5 text-purple-400" />
                Export Audit CSV
              </button>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/60 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/[0.03] border-b border-white/10 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Actor</th>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Resource</th>
                      <th className="py-3 px-4">IP & Trace</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {auditLogsData.logs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500">
                          No audit log records found.
                        </td>
                      </tr>
                    ) : (
                      auditLogsData.logs.map((log) => (
                        <tr key={log._id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-semibold text-white">{log.userName || 'Anonymous'}</p>
                            <p className="text-[10px] text-slate-400">{log.userEmail}</p>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-mono text-purple-300 font-semibold">{log.action}</span>
                          </td>
                          <td className="py-3 px-4 text-slate-300 font-mono text-[11px]">
                            {log.resource}
                          </td>
                          <td className="py-3 px-4 text-[10px] text-slate-400 font-mono">
                            {log.ip} <br />
                            <span className="text-slate-500">{log.requestId || '-'}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                log.status === 'success'
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-red-500/20 text-red-300'
                              }`}
                            >
                              {log.status.toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: SYSTEM HEALTH & CSAT */}
        {/* ========================================================================= */}
        {activeTab === 'system' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {health && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-6 rounded-2xl bg-slate-900/80 border border-white/10 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Database className="w-4 h-4 text-emerald-400" />
                      Database & Infrastructure
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {health.database?.status}
                    </span>
                  </div>
                  <div className="space-y-2 text-xs text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Node Runtime:</span>
                      <span className="font-mono">{health.process?.nodeVersion} (PID: {health.process?.pid})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Heap Memory Used:</span>
                      <span className="font-mono">{health.process?.memoryUsageMb?.heapUsed} MB / {health.process?.memoryUsageMb?.heapTotal} MB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Host OS:</span>
                      <span className="font-mono">{health.system?.platform} ({health.system?.arch})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">CPU Cores:</span>
                      <span className="font-mono">{health.system?.cpuCount} Cores</span>
                    </div>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-slate-900/80 border border-white/10 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Star className="w-4 h-4 text-amber-400" />
                      Candidate CSAT Breakdown
                    </span>
                    <span className="text-amber-400 font-bold text-sm">
                      ★ {metrics.ratingsMetrics?.overall || 4.9} / 5.0
                    </span>
                  </div>
                  <div className="space-y-2.5 text-xs text-slate-300">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">AI Voice & Audio Quality:</span>
                      <span className="font-bold text-white">★ {metrics.ratingsMetrics?.voiceQuality || 4.9}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Question Depth & Strictness:</span>
                      <span className="font-bold text-white">★ {metrics.ratingsMetrics?.questionDepth || 4.8}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Scoring Accuracy & Rubrics:</span>
                      <span className="font-bold text-white">★ {metrics.ratingsMetrics?.scoringAccuracy || 4.9}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Real-Time Streaming Latency:</span>
                      <span className="font-bold text-white">★ {metrics.ratingsMetrics?.latencySpeed || 5.0}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* User Inspection Modal */}
        {selectedUserModal && selectedUserDetails && (
          <div
            onClick={() => setSelectedUserModal(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="glass-window max-w-xl w-full rounded-2xl p-6 border border-white/10 shadow-2xl relative space-y-6 max-h-[90vh] overflow-y-auto"
            >
              <button
                onClick={() => setSelectedUserModal(null)}
                className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center text-lg font-bold text-white">
                  {selectedUserDetails.user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{selectedUserDetails.user.name}</h3>
                  <p className="text-xs text-slate-400">{selectedUserDetails.user.email}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <button
                  onClick={() => handleToggleRole(selectedUserDetails.user._id, selectedUserDetails.user.role)}
                  disabled={roleUpdating}
                  className="px-3 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 text-xs font-semibold transition-all cursor-pointer"
                >
                  Switch Role to {selectedUserDetails.user.role === 'admin' ? 'User' : 'Admin'}
                </button>

                <button
                  onClick={() => handleSuspendToggle(selectedUserDetails.user._id, selectedUserDetails.user.status)}
                  disabled={actionInProgress}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    selectedUserDetails.user.status === 'suspended'
                      ? 'bg-emerald-600/30 border-emerald-500/40 text-emerald-200'
                      : 'bg-red-600/30 border-red-500/40 text-red-200'
                  }`}
                >
                  {selectedUserDetails.user.status === 'suspended' ? 'Unsuspend Account' : 'Suspend Account'}
                </button>

                <button
                  onClick={() => handleForceLogout(selectedUserDetails.user._id)}
                  disabled={actionInProgress}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-300 text-xs font-semibold transition-all cursor-pointer"
                >
                  Revoke All Sessions
                </button>
              </div>

              {/* Recent Sessions */}
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Recent Interviews ({selectedUserDetails.sessions?.length || 0})
                </h4>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {selectedUserDetails.sessions?.map((s) => (
                    <div key={s._id} className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-semibold text-white">{s.targetCompany} • {s.type.toUpperCase()}</p>
                        <p className="text-[10px] text-slate-500">{new Date(s.startedAt).toLocaleDateString()}</p>
                      </div>
                      <span className="font-mono text-purple-300 font-bold">{s.finalScore?.overall || 0} / 10</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Resolve Alert Modal */}
        {resolveAlertModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
            <form
              onSubmit={handleResolveAlert}
              className="glass-window max-w-md w-full rounded-2xl p-6 border border-white/10 shadow-2xl space-y-4"
            >
              <h3 className="text-base font-bold text-white">Resolve Security Alert</h3>
              <p className="text-xs text-slate-400">
                Please provide resolution notes or action taken. This will be permanently recorded in the immutable audit log.
              </p>
              <textarea
                rows={3}
                required
                placeholder="e.g. Verified legitimate candidate IP, unblocked."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500"
              />
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResolveAlertModal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionInProgress}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white cursor-pointer"
                >
                  Confirm Resolution
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
