import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInterviewStore } from '../store/useInterviewStore';
import {
  Sliders,
  Building2,
  Briefcase,
  Globe2,
  DollarSign,
  Zap,
  ArrowRight,
  Sparkles,
  Server,
  Cpu,
  Users,
  ShieldCheck,
  Award,
  HelpCircle,
} from 'lucide-react';

const INTERVIEW_TRACKS = [
  {
    id: 'dsa',
    name: 'DSA & Algorithms',
    icon: Cpu,
    category: 'Technical',
    desc: 'Algorithmic problem solving, data structures, complexity & edge cases',
  },
  {
    id: 'system_design',
    name: 'System Design',
    icon: Server,
    category: 'Technical',
    desc: 'High-throughput architectures, distributed systems & scalability trade-offs',
  },
  {
    id: 'behavioral',
    name: 'Behavioral & Leadership',
    icon: Users,
    category: 'Leadership',
    desc: 'STAR method responses, bar-raiser competencies & ownership principles',
  },
  {
    id: 'hr_round',
    name: 'HR & Culture Fit',
    icon: ShieldCheck,
    category: 'Non-Technical',
    desc: 'Cultural alignment, ethics, motivation, retention & team dynamics',
  },
  {
    id: 'case_study',
    name: 'Consulting & Case Study',
    icon: Sparkles,
    category: 'Non-Technical',
    desc: 'Structured problem decomposition, hypothesis testing & quantitative analysis',
  },
  {
    id: 'product_management',
    name: 'Product Management (PM)',
    icon: Award,
    category: 'Non-Technical',
    desc: 'User empathy, product teardowns, prioritization frameworks & metrics',
  },
  {
    id: 'sales_pitch',
    name: 'Sales Pitch & Revenue',
    icon: DollarSign,
    category: 'Non-Technical',
    desc: 'Enterprise objection handling, discovery calls & value propositions',
  },
  {
    id: 'managerial',
    name: 'Engineering Management',
    icon: Briefcase,
    category: 'Leadership',
    desc: 'Conflict resolution, delegation strategies, hiring bars & team scaling',
  },
];

export default function CustomInterviewSetup() {
  const navigate = useNavigate();
  const { startInterview, loading, error } = useInterviewStore();

  const [role, setRole] = useState('Senior Full Stack Engineer');
  const [targetCompany, setTargetCompany] = useState('Stripe');
  const [region, setRegion] = useState('india'); // 'india' | 'us'
  const [targetSalary, setTargetSalary] = useState('32');
  const [selectedType, setSelectedType] = useState('dsa');
  const [validationError, setValidationError] = useState('');

  const currency = region === 'india' ? 'INR' : 'USD';
  const currencyLabel = region === 'india' ? '₹ LPA (Lakhs per Annum)' : '$ /year (Annual USD)';
  const salaryPlaceholder = region === 'india' ? 'e.g. 25, 45, 80' : 'e.g. 150000, 220000, 350000';

  const handleRegionChange = (newRegion) => {
    setRegion(newRegion);
    if (newRegion === 'india' && Number(targetSalary) > 300) {
      setTargetSalary('35');
    } else if (newRegion === 'us' && Number(targetSalary) < 500) {
      setTargetSalary('180000');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');

    if (!role.trim()) {
      setValidationError('Please specify a target role.');
      return;
    }
    if (!targetCompany.trim()) {
      setValidationError('Please specify a target company.');
      return;
    }
    const numSalary = Number(targetSalary);
    if (!numSalary || numSalary <= 0) {
      setValidationError('Please enter a valid target compensation.');
      return;
    }

    const customConfig = {
      role: role.trim(),
      targetCompany: targetCompany.trim(),
      region,
      targetSalary: numSalary,
      currency,
    };

    const res = await startInterview(selectedType, {
      customConfig,
      targetCompany: targetCompany.trim(),
      seniorityLevel: role.trim(),
    });

    if (res.success && res.session) {
      navigate(`/interview/${res.session._id}`);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-bg py-10 px-4 sm:px-6 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-accent/10 rounded-full blur-[140px] pointer-events-none -z-10" />

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-semibold tracking-wide uppercase">
            <Sliders className="w-3.5 h-3.5" />
            Custom Interview Builder
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Tailor Your Mock Interview
          </h1>
          <p className="text-sm sm:text-base text-text-secondary">
            Configure custom role expectations, target company context, regional market CTC benchmarks, and specialized evaluation rubrics.
          </p>
        </div>

        {/* Builder Form Card */}
        <form onSubmit={handleSubmit} className="glass-window p-6 sm:p-8 rounded-2xl border border-hairline space-y-8 shadow-2xl">
          {(validationError || error) && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium animate-in fade-in duration-200">
              {validationError || error}
            </div>
          )}

          {/* Grid 1: Role & Company */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Target Role */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-accent" />
                Target Role / Title
              </label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Lead Full Stack Architect, VP Growth, Staff SRE"
                className="w-full px-4 py-3 bg-surface border border-hairline rounded-xl text-sm text-white placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                required
                maxLength={100}
              />
              <p className="text-[11px] text-text-muted">
                Claude calibrates seniority depth and questioning ambiguity to this title.
              </p>
            </div>

            {/* Target Company */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-accent" />
                Target Company
              </label>
              <input
                type="text"
                value={targetCompany}
                onChange={(e) => setTargetCompany(e.target.value)}
                placeholder="e.g. Bain & Company, Zomato, Databricks, Stripe"
                className="w-full px-4 py-3 bg-surface border border-hairline rounded-xl text-sm text-white placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                required
                maxLength={100}
              />
              <p className="text-[11px] text-text-muted">
                Tailors company-specific values, architectural patterns, or business models.
              </p>
            </div>
          </div>

          {/* Grid 2: Region & Compensation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-hairline">
            {/* Region Toggle */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                <Globe2 className="w-3.5 h-3.5 text-accent" />
                Target Market / Region
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleRegionChange('india')}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                    region === 'india'
                      ? 'bg-accent/20 border-accent text-white shadow-[0_0_15px_rgba(91,140,255,0.3)]'
                      : 'bg-surface border-hairline text-text-secondary hover:text-white hover:bg-surface-hover'
                  }`}
                >
                  <span className="text-2xl">🇮🇳</span>
                  <div>
                    <p className="text-xs font-bold text-white">India Market</p>
                    <p className="text-[10px] text-text-muted">₹ LPA Benchmarks</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleRegionChange('us')}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                    region === 'us'
                      ? 'bg-accent/20 border-accent text-white shadow-[0_0_15px_rgba(91,140,255,0.3)]'
                      : 'bg-surface border-hairline text-text-secondary hover:text-white hover:bg-surface-hover'
                  }`}
                >
                  <span className="text-2xl">🇺🇸</span>
                  <div>
                    <p className="text-xs font-bold text-white">US / Global</p>
                    <p className="text-[10px] text-text-muted">$ USD Benchmarks</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Target Compensation */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-accent" />
                  Target Compensation ({currencyLabel})
                </label>
                <span className="text-[11px] font-semibold text-accent px-2 py-0.5 rounded bg-accent/10 border border-accent/20">
                  {region === 'india' ? `₹${targetSalary || '0'} LPA` : `$${Number(targetSalary || 0).toLocaleString()} /yr`}
                </span>
              </div>
              <input
                type="number"
                value={targetSalary}
                onChange={(e) => setTargetSalary(e.target.value)}
                placeholder={salaryPlaceholder}
                className="w-full px-4 py-3 bg-surface border border-hairline rounded-xl text-sm text-white placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all font-mono"
                required
                min={1}
              />
              <p className="text-[11px] text-text-muted">
                {region === 'india'
                  ? 'Native Indian CTC benchmark (e.g. 18 LPA is mid-tier, 45+ LPA is Senior/Staff FAANG).'
                  : 'Native US market total compensation benchmark (e.g. $180k is mid-tier, $350k+ is Senior/Staff).'}
              </p>
            </div>
          </div>

          {/* Section 3: Interview Type Selection (All 8 Tracks) */}
          <div className="space-y-3 pt-4 border-t border-hairline">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-accent" />
                Select Interview Track & Rubric
              </label>
              <span className="text-[11px] text-text-muted">8 specialized evaluation formats</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {INTERVIEW_TRACKS.map((track) => {
                const Icon = track.icon;
                const isSelected = selectedType === track.id;
                return (
                  <button
                    key={track.id}
                    type="button"
                    onClick={() => setSelectedType(track.id)}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-accent/20 border-accent text-white shadow-[0_0_20px_rgba(91,140,255,0.3)] ring-1 ring-accent'
                        : 'bg-surface/80 border-hairline text-text-secondary hover:text-white hover:bg-surface-hover'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className={`p-2 rounded-lg ${isSelected ? 'bg-accent text-white' : 'bg-surface-hover text-accent'}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-surface border border-hairline text-text-muted">
                          {track.category}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-white mb-1">{track.name}</p>
                      <p className="text-[10px] text-text-muted leading-relaxed line-clamp-3">{track.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-6 border-t border-hairline flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <HelpCircle className="w-4 h-4 text-accent shrink-0" />
              <span>
                Simulates real interviewer strictness calibrated to {targetCompany || 'target company'} & {role || 'target role'}.
              </span>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary-glow w-full sm:w-auto px-8 py-3.5 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 cursor-pointer shadow-glow-accent disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Calibrating Session...
                </>
              ) : (
                <>
                  Launch Custom Mock Session
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
