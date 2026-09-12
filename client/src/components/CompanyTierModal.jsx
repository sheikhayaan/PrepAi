import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInterviewStore } from '../store/useInterviewStore';
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
} from 'lucide-react';

export default function CompanyTierModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { startInterview, loading } = useInterviewStore();

  const [companyTier, setCompanyTier] = useState('faang');
  const [targetCompany, setTargetCompany] = useState('Google');
  const [seniorityLevel, setSeniorityLevel] = useState('L5 (Senior)');
  const [targetPackage, setTargetPackage] = useState('$250k - $380k');
  const [selectedType, setSelectedType] = useState('system_design');

  if (!isOpen) return null;

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
    const res = await startInterview(selectedType, {
      companyTier,
      targetCompany,
      seniorityLevel,
      targetPackage,
    });
    if (res.success && res.session) {
      onClose();
      navigate(`/interview/${res.session._id}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="glass-window max-w-2xl w-full rounded-2xl p-6 sm:p-8 border border-white/10 shadow-[0_30px_90px_rgba(0,0,0,0.9),0_0_60px_rgba(59,130,246,0.35)] relative flex flex-col max-h-[90vh] overflow-y-auto">
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

          {/* 3. Technical Track Selection */}
          <div>
            <label className="text-xs font-semibold text-white mb-2 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-accent" />
              4. Technical Track
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'system_design', name: 'System Design', icon: Server, desc: 'High-throughput distributed systems' },
                { id: 'dsa', name: 'DSA & Algorithms', icon: Cpu, desc: 'Coding, complexity & edge cases' },
                { id: 'behavioral', name: 'Behavioral & Leadership', icon: Users, desc: 'STAR stories & bar-raiser ownership' },
              ].map((track) => {
                const Icon = track.icon;
                const isSelected = selectedType === track.id;
                return (
                  <button
                    key={track.id}
                    onClick={() => setSelectedType(track.id)}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-accent/20 border-accent text-white shadow-[0_0_15px_rgba(91,140,255,0.3)]'
                        : 'bg-surface/60 border-hairline text-text-secondary hover:text-white hover:bg-surface-hover'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-4 h-4 text-accent" />
                      <span className="text-xs font-bold text-white">{track.name}</span>
                    </div>
                    <p className="text-[10px] text-text-muted leading-relaxed">{track.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

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
