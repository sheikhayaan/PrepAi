import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInterviewStore } from '../store/useInterviewStore';
import { useAuthStore } from '../store/useAuthStore';
import {
  Building2,
  Award,
  DollarSign,
  Cpu,
  Server,
  Users,
  ArrowRight,
  X,
  Sparkles,
  ShieldCheck,
  Zap,
  AlertCircle,
  LogIn,
} from 'lucide-react';

export default function CompanyTierModal({ isOpen = true, onClose }) {
  const navigate = useNavigate();
  const { startInterview, loading } = useInterviewStore();
  const { user } = useAuthStore();

  const [companyTier, setCompanyTier] = useState('faang');
  const [targetCompany, setTargetCompany] = useState('Google');
  const [seniorityLevel, setSeniorityLevel] = useState('L5 (Senior)');
  const [targetPackage, setTargetPackage] = useState('$250k - $380k');
  const [selectedType, setSelectedType] = useState('system_design');
  const [errorMessage, setErrorMessage] = useState(null);

  // Close on Escape key and lock background scroll
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (isOpen === false) return null;

  const faangCompanies = ['Google', 'Meta', 'Amazon', 'Apple', 'Netflix', 'Microsoft'];
  const tier1Companies = ['Stripe', 'Uber', 'Airbnb', 'Databricks', 'Snowflake', 'Coinbase'];
  const tier2Companies = ['Atlassian', 'Shopify', 'Twilio', 'Salesforce', 'HubSpot'];
  const startupCompanies = ['Y Combinator AI', 'Series B Unicorn', 'Seed Stage Stealth'];

  const getCompanyList = () => {
    if (companyTier === 'faang') return faangCompanies;
    if (companyTier === 'tier1') return tier1Companies;
    if (companyTier === 'tier2') return tier2Companies;
    return startupCompanies;
  };

  const handleStart = async () => {
    setErrorMessage(null);
    if (!user) {
      if (onClose) onClose();
      navigate('/login');
      return;
    }

    const res = await startInterview(selectedType, {
      companyTier,
      targetCompany,
      seniorityLevel,
      targetPackage,
    });
    if (res.success && res.session) {
      if (onClose) onClose();
      navigate(`/interview/${res.session._id}`);
    } else {
      setErrorMessage(res.error || 'Failed to start interview session. Please try again.');
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 pointer-events-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass-window max-w-2xl w-full rounded-2xl p-5 sm:p-7 border border-white/10 shadow-[0_30px_90px_rgba(0,0,0,0.9),0_0_60px_rgba(59,130,246,0.35)] relative flex flex-col max-h-[90vh] overflow-y-auto pointer-events-auto overscroll-contain"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-text-muted hover:text-white hover:bg-surface-hover transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="space-y-1.5 pb-5 border-b border-hairline">
          <div className="flex items-center gap-2 text-accent text-xs font-bold tracking-wider uppercase">
            <Sparkles className="w-4 h-4" />
            REAL FAANG CALIBRATION WIZARD
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Targeted Mock Interview Setup
          </h2>
          <p className="text-xs text-text-secondary">
            PrepAI customizes question difficulty, interviewer strictness, and evaluation rubrics to your target company & package tier.
          </p>
        </div>

        <div className="space-y-6 pt-5">
          {/* 1. Company Tier Selector */}
          <div>
            <label className="text-xs font-semibold text-white mb-2.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-accent" />
              1. Select Company Tier & Target
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3">
              {[
                { id: 'faang', label: 'FAANG / Big Tech', desc: 'Google, Meta, Apple' },
                { id: 'tier1', label: 'Tier-1 Unicorns', desc: 'Stripe, Uber, Airbnb' },
                { id: 'tier2', label: 'Tier-2 Tech', desc: 'Shopify, Atlassian' },
                { id: 'startup', label: 'High Velocity', desc: 'YC Series A/B' },
              ].map((tier) => (
                <button
                  key={tier.id}
                  onClick={() => {
                    setCompanyTier(tier.id);
                    if (tier.id === 'faang') setTargetCompany('Google');
                    else if (tier.id === 'tier1') setTargetCompany('Stripe');
                    else if (tier.id === 'tier2') setTargetCompany('Shopify');
                    else setTargetCompany('Y Combinator AI');
                  }}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    companyTier === tier.id
                      ? 'bg-accent/20 border-accent text-white shadow-[0_0_15px_rgba(91,140,255,0.3)]'
                      : 'bg-surface/60 border-hairline text-text-secondary hover:text-white hover:bg-surface-hover'
                  }`}
                >
                  <p className="text-xs font-bold text-white">{tier.label}</p>
                  <p className="text-[10px] text-text-muted mt-0.5">{tier.desc}</p>
                </button>
              ))}
            </div>

            {/* Company Pills */}
            <div className="flex flex-wrap gap-2">
              {getCompanyList().map((comp) => (
                <button
                  key={comp}
                  onClick={() => setTargetCompany(comp)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                    targetCompany === comp
                      ? 'bg-accent text-white border-accent shadow-[0_0_10px_rgba(91,140,255,0.5)] font-semibold'
                      : 'bg-surface/80 text-text-secondary border-hairline hover:text-white'
                  }`}
                >
                  {comp}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Seniority & Compensation Package */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Seniority Level */}
            <div>
              <label className="text-xs font-semibold text-white mb-2 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-accent" />
                2. Target Seniority Level
              </label>
              <div className="space-y-2">
                {[
                  { id: 'L3/L4 (Junior/Mid)', label: 'L3/L4 — Junior / Mid Engineer', desc: 'Focus on coding speed & correctness' },
                  { id: 'L5 (Senior)', label: 'L5 — Senior Software Engineer', desc: 'Focus on scaling, trade-offs & leadership' },
                  { id: 'L6+ (Staff/Principal)', label: 'L6+ — Staff / Principal Engineer', desc: 'Focus on cross-org architecture & ambiguity' },
                ].map((lvl) => (
                  <button
                    key={lvl.id}
                    onClick={() => setSeniorityLevel(lvl.id)}
                    className={`w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      seniorityLevel === lvl.id
                        ? 'bg-accent/20 border-accent text-white shadow-[0_0_12px_rgba(91,140,255,0.25)]'
                        : 'bg-surface/60 border-hairline text-text-secondary hover:text-white'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-bold text-white">{lvl.label}</p>
                      <p className="text-[9px] text-text-muted">{lvl.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Compensation Band */}
            <div>
              <label className="text-xs font-semibold text-white mb-2 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-accent" />
                3. Target Compensation Band
              </label>
              <div className="space-y-2">
                {[
                  { id: '$150k - $220k', label: '$150k - $220k Total Comp', desc: 'Standard Tier-2 / Mid-Market Band' },
                  { id: '$250k - $380k', label: '$250k - $380k Total Comp', desc: 'Standard FAANG L4/L5 Senior Band' },
                  { id: '$450k - $750k+', label: '$450k - $750k+ Total Comp', desc: 'Top FAANG L6+ / Staff Band' },
                ].map((pkg) => (
                  <button
                    key={pkg.id}
                    onClick={() => setTargetPackage(pkg.id)}
                    className={`w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      targetPackage === pkg.id
                        ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-[0_0_12px_rgba(52,211,153,0.25)]'
                        : 'bg-surface/60 border-hairline text-text-secondary hover:text-white'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-bold text-white">{pkg.label}</p>
                      <p className="text-[9px] text-text-muted">{pkg.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 3. Track Selection */}
          <div>
            <label className="text-xs font-semibold text-white mb-2 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-accent" />
              4. Interview Track
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { id: 'system_design', name: 'System Design', icon: Server, desc: 'Architecture & distributed scaling' },
                { id: 'dsa', name: 'DSA & Coding', icon: Cpu, desc: 'Algorithms, complexity & edge cases' },
                { id: 'behavioral', name: 'Behavioral', icon: Users, desc: 'STAR stories & bar-raiser ownership' },
                { id: 'hr_round', name: 'HR / Culture', icon: ShieldCheck, desc: 'Culture fit, alignment & ethics' },
                { id: 'case_study', name: 'Case Study', icon: Sparkles, desc: 'Hypothesis, structuring & math' },
                { id: 'product_management', name: 'Product (PM)', icon: Award, desc: 'User empathy & prioritization' },
                { id: 'sales_pitch', name: 'Sales Pitch', icon: DollarSign, desc: 'Objection handling & persuasion' },
                { id: 'managerial', name: 'Managerial', icon: Building2, desc: 'Conflict, delegation & judgment' },
              ].map((track) => {
                const Icon = track.icon;
                const isSelected = selectedType === track.id;
                return (
                  <button
                    key={track.id}
                    onClick={() => setSelectedType(track.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-accent/20 border-accent text-white shadow-[0_0_15px_rgba(91,140,255,0.3)]'
                        : 'bg-surface/60 border-hairline text-text-secondary hover:text-white hover:bg-surface-hover'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Icon className="w-3.5 h-3.5 text-accent shrink-0" />
                      <span className="text-xs font-bold text-white truncate">{track.name}</span>
                    </div>
                    <p className="text-[10px] text-text-muted leading-tight line-clamp-2">{track.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Error or Guest Alert */}
        {errorMessage && (
          <div className="mt-4 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-xs text-red-200 flex items-center justify-between gap-2 animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            {!user && (
              <button
                onClick={() => {
                  if (onClose) onClose();
                  navigate('/login');
                }}
                className="px-3 py-1 bg-red-500/30 hover:bg-red-500/50 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all shrink-0 cursor-pointer"
              >
                <LogIn className="w-3 h-3" />
                Sign In
              </button>
            )}
          </div>
        )}

        {/* Guest Warning if not signed in */}
        {!user && !errorMessage && (
          <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-200 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Sign in required to record telemetry and save your AI scoring report.</span>
            </div>
            <button
              onClick={() => {
                if (onClose) onClose();
                navigate('/login');
              }}
              className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-100 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all shrink-0 cursor-pointer"
            >
              Sign In
            </button>
          </div>
        )}

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-6 border-t border-hairline mt-6">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-hairline text-xs font-semibold text-text-secondary hover:text-white hover:bg-surface cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleStart}
            disabled={loading}
            className="btn-primary-glow px-7 py-2.5 rounded-xl text-xs font-semibold text-white flex items-center gap-2 cursor-pointer shadow-glow-accent"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                Launch {targetCompany} Interview
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
