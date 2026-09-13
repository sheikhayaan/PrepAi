import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useInterviewStore } from '../store/useInterviewStore';
import {
  Database,
  Search,
  Building2,
  Award,
  Layers,
  Sparkles,
  ArrowRight,
  Filter,
  Cpu,
  Server,
  Users,
  ShieldCheck,
  DollarSign,
  Briefcase,
  Play,
  RotateCcw,
} from 'lucide-react';

const COMPANIES = ['All', 'Google', 'Meta', 'Amazon', 'Stripe', 'Microsoft', 'Uber', 'Apple', 'Netflix', 'Airbnb'];
const LEVELS = ['All', 'L3', 'L4', 'L5', 'L6+'];
const DIFFICULTIES = ['All', 'Easy', 'Medium', 'Hard'];
const TYPES = [
  { id: 'All', label: 'All Tracks' },
  { id: 'dsa', label: 'DSA & Coding' },
  { id: 'system_design', label: 'System Design' },
  { id: 'behavioral', label: 'Behavioral' },
  { id: 'hr_round', label: 'HR / Culture' },
  { id: 'case_study', label: 'Case Study' },
  { id: 'product_management', label: 'Product (PM)' },
  { id: 'sales_pitch', label: 'Sales Pitch' },
  { id: 'managerial', label: 'Managerial' },
];

export default function QuestionBankExplorer() {
  const navigate = useNavigate();
  const { startInterview, loading: startingSession } = useInterviewStore();

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter states
  const [selectedCompany, setSelectedCompany] = useState('All');
  const [selectedLevel, setSelectedLevel] = useState('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [selectedType, setSelectedType] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Active question modal or launch state
  const [selectedQuestion, setSelectedQuestion] = useState(null);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {};
      if (selectedCompany !== 'All') params.company = selectedCompany;
      if (selectedLevel !== 'All') params.level = selectedLevel;
      if (selectedDifficulty !== 'All') params.difficulty = selectedDifficulty;
      if (selectedType !== 'All') params.type = selectedType;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await api.get('/interviews/questions', { params });
      setQuestions(res.data.questions || []);
    } catch (err) {
      console.error('Failed to load questions:', err);
      setError('Unable to load question bank. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [selectedCompany, selectedLevel, selectedDifficulty, selectedType]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchQuestions();
  };

  const handleResetFilters = () => {
    setSelectedCompany('All');
    setSelectedLevel('All');
    setSelectedDifficulty('All');
    setSelectedType('All');
    setSearchQuery('');
  };

  const handlePracticeQuestion = async (q) => {
    const res = await startInterview(q.type || 'dsa', {
      targetCompany: (q.companyTags && q.companyTags[0]) || 'FAANG Enterprise',
      seniorityLevel: q.level ? `${q.level} Engineer` : 'L5 (Senior)',
      targetPackage: q.level === 'L6+' ? '$450k+' : q.level === 'L5' ? '$320k' : '$190k',
    });

    if (res.success && res.session) {
      navigate(`/interview/${res.session._id}`);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'system_design': return Server;
      case 'behavioral': return Users;
      case 'hr_round': return ShieldCheck;
      case 'case_study': return Sparkles;
      case 'product_management': return Award;
      case 'sales_pitch': return DollarSign;
      case 'managerial': return Briefcase;
      case 'dsa':
      default: return Cpu;
    }
  };

  const getDifficultyBadge = (diff) => {
    switch (diff?.toLowerCase()) {
      case 'easy':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'medium':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'hard':
        return 'bg-red-500/10 text-red-400 border-red-500/30';
      default:
        return 'bg-accent/10 text-accent border-accent/30';
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-bg py-8 px-4 sm:px-6 relative">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-hairline">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-semibold uppercase tracking-wider mb-2">
              <Database className="w-3.5 h-3.5" />
              Company-Calibrated Problem Bank
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Curated Interview Questions
            </h1>
            <p className="text-xs sm:text-sm text-text-secondary mt-1 max-w-2xl">
              Explore original algorithmic challenges, system design scenarios, and case studies tagged by target company (Google, Meta, Stripe) and seniority level (L3–L6+).
            </p>
          </div>

          <button
            onClick={handleResetFilters}
            className="self-start md:self-auto px-4 py-2 rounded-xl bg-surface border border-hairline text-xs font-medium text-text-secondary hover:text-white hover:bg-surface-hover flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Filters
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div className="glass-window p-5 rounded-2xl border border-hairline space-y-5">
          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search problem keywords (e.g. rate limiter, binary tree, LRU cache, hypothesis)..."
                className="w-full pl-10 pr-4 py-2.5 bg-surface border border-hairline rounded-xl text-xs text-white placeholder:text-text-muted focus:outline-none focus:border-accent"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Search
            </button>
          </form>

          {/* Company Filter Chips */}
          <div>
            <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-text-primary">
              <Building2 className="w-3.5 h-3.5 text-accent" />
              Company Tags:
            </div>
            <div className="flex flex-wrap gap-2">
              {COMPANIES.map((company) => (
                <button
                  key={company}
                  onClick={() => setSelectedCompany(company)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                    selectedCompany === company
                      ? 'bg-accent text-white border-accent shadow-[0_0_10px_rgba(91,140,255,0.4)] font-semibold'
                      : 'bg-surface/60 text-text-secondary border-hairline hover:text-white hover:bg-surface-hover'
                  }`}
                >
                  {company}
                </button>
              ))}
            </div>
          </div>

          {/* Level & Difficulty & Track Chips */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-hairline">
            {/* Level Chips */}
            <div>
              <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-text-primary">
                <Award className="w-3.5 h-3.5 text-accent" />
                Seniority Level:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {LEVELS.map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setSelectedLevel(lvl)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all cursor-pointer ${
                      selectedLevel === lvl
                        ? 'bg-accent/20 text-white border-accent font-semibold'
                        : 'bg-surface text-text-secondary border-hairline hover:text-white'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty Chips */}
            <div>
              <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-text-primary">
                <Layers className="w-3.5 h-3.5 text-accent" />
                Difficulty:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {DIFFICULTIES.map((diff) => (
                  <button
                    key={diff}
                    onClick={() => setSelectedDifficulty(diff)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all cursor-pointer ${
                      selectedDifficulty === diff
                        ? 'bg-accent/20 text-white border-accent font-semibold'
                        : 'bg-surface text-text-secondary border-hairline hover:text-white'
                    }`}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>

            {/* Track Selector */}
            <div>
              <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-text-primary">
                <Filter className="w-3.5 h-3.5 text-accent" />
                Track Type:
              </div>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3 py-1.5 bg-surface border border-hairline rounded-lg text-xs text-white focus:outline-none focus:border-accent"
              >
                {TYPES.map((t) => (
                  <option key={t.id} value={t.id} className="bg-elevated text-white">
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results Count & Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>
              Showing <strong className="text-white">{questions.length}</strong> questions matching criteria
            </span>
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
              <p className="text-xs text-text-muted">Loading question bank...</p>
            </div>
          ) : error ? (
            <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/30 text-center space-y-2">
              <p className="text-xs text-red-400 font-medium">{error}</p>
              <button
                onClick={fetchQuestions}
                className="px-4 py-2 rounded-xl bg-surface border border-hairline text-xs font-semibold text-white hover:bg-surface-hover cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : questions.length === 0 ? (
            <div className="glass-window p-12 rounded-2xl border border-hairline text-center space-y-3">
              <Database className="w-10 h-10 text-text-muted mx-auto" />
              <p className="text-sm font-semibold text-white">No questions match your filter combination</p>
              <p className="text-xs text-text-muted max-w-sm mx-auto">
                Try selecting "All" companies or levels to expand your question bank results.
              </p>
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-accent-hover cursor-pointer"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {questions.map((q) => {
                const Icon = getTypeIcon(q.type);
                return (
                  <div
                    key={q._id}
                    className="glass-window p-5 rounded-2xl border border-hairline hover:border-accent/50 transition-all flex flex-col justify-between group relative shadow-lg hover:shadow-[0_0_25px_rgba(91,140,255,0.15)]"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {q.companyTags && q.companyTags.length > 0 ? (
                            q.companyTags.map((tag) => (
                              <span
                                key={tag}
                                className="px-2 py-0.5 rounded-md bg-accent/15 text-accent border border-accent/25 text-[10px] font-bold tracking-wide"
                              >
                                {tag}
                              </span>
                            ))
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-surface border border-hairline text-text-muted text-[10px] font-medium">
                              General FAANG
                            </span>
                          )}

                          {q.level && (
                            <span className="px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-300 border border-purple-500/25 text-[10px] font-bold">
                              {q.level}
                            </span>
                          )}
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded-md border text-[10px] font-semibold ${getDifficultyBadge(
                            q.difficulty
                          )}`}
                        >
                          {q.difficulty || 'Medium'}
                        </span>
                      </div>

                      {/* Track Type Indicator */}
                      <div className="flex items-center gap-1.5 text-[11px] text-text-muted mb-2">
                        <Icon className="w-3.5 h-3.5 text-accent" />
                        <span className="capitalize font-medium">
                          {q.type?.replace('_', ' ')}
                        </span>
                      </div>

                      {/* Question Prompt */}
                      <p className="text-xs text-text-secondary group-hover:text-white transition-colors leading-relaxed line-clamp-4">
                        {q.prompt}
                      </p>
                    </div>

                    {/* Footer Action */}
                    <div className="pt-4 mt-4 border-t border-hairline flex items-center justify-between">
                      <span className="text-[10px] text-text-muted">
                        Simulated AI Interview
                      </span>
                      <button
                        onClick={() => handlePracticeQuestion(q)}
                        disabled={startingSession}
                        className="px-3.5 py-1.5 rounded-lg bg-accent/20 hover:bg-accent text-accent hover:text-white border border-accent/40 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm group-hover:shadow-[0_0_10px_rgba(91,140,255,0.4)]"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        Practice This
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
