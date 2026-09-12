import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import AIOrb from '../components/AIOrb';
import AuroraBackground from '../components/AuroraBackground';
import Scrollytelling from '../components/Scrollytelling';
import FlowchartAnimation from '../components/FlowchartAnimation';
import TreeAnimation from '../components/TreeAnimation';
import CompanyTierModal from '../components/CompanyTierModal';
import {
  ArrowRight,
  Play,
  UserCheck,
  MessageSquareCode,
  TrendingUp,
  Sparkles,
  CheckCircle,
  Cpu,
  Layers,
  ShieldCheck,
  Zap,
  Check,
  Clock,
  Building2,
} from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [showTierModal, setShowTierModal] = useState(false);

  const handleStart = () => {
    if (user) {
      setShowTierModal(true);
    } else {
      navigate('/register');
    }
  };

  return (
    <div className="relative min-h-screen bg-bg text-text-primary overflow-hidden">
      <AuroraBackground showHorizon={true} />

      {/* ========================================================================= */}
      {/* 1. HERO SECTION (Screenshot 1: media_1788673440307.png) */}
      {/* ========================================================================= */}
      <section className="relative z-10 pt-16 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Hero Left Content */}
          <div className="lg:col-span-6 space-y-6">
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-bold tracking-[0.25em] text-accent uppercase flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                PRACTICE / IMPROVE / GET HIRED
              </span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-[1.1]">
              Interview practice that <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-blue-200 to-indigo-300">
                adapts to you.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-text-secondary leading-relaxed max-w-lg">
              Real conversations. Calibrated for FAANG & Tier-1 compensation bands ($250k–$750k+). Personalized feedback. A faster path to your dream job.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={handleStart}
                className="btn-primary-glow px-7 py-3.5 rounded-full text-sm font-semibold text-white flex items-center gap-2.5 cursor-pointer shadow-glow-accent-lg"
              >
                Start Practicing Free
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={handleStart}
                className="px-5 py-3.5 rounded-full bg-surface/80 hover:bg-surface-hover border border-hairline text-sm font-medium text-text-primary flex items-center gap-2.5 transition-all cursor-pointer"
              >
                <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center">
                  <Play className="w-3 h-3 fill-current text-accent" />
                </div>
                Launch FAANG Demo
              </button>
            </div>
          </div>

          {/* Hero Right: 3D Perspective Glass Interview Preview */}
          <div className="lg:col-span-6 perspective-container">
            <div className="tilted-dashboard glass-window rounded-2xl p-4 border border-white/10 shadow-[0_30px_90px_rgba(0,0,0,0.9),0_0_50px_rgba(59,130,246,0.3)]">
              {/* Window Header */}
              <div className="flex items-center justify-between pb-3 border-b border-hairline/60">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded bg-gradient-to-tr from-blue-600 to-blue-400 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-white fill-current">
                      <path d="M12 3L2 19h7l3-6 3 6h7L12 3z" />
                    </svg>
                  </div>
                  <span className="font-semibold text-xs text-white">PrepAI • Google L5 Bar</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface border border-hairline text-[10px] text-text-primary">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Live Interview
                  </div>
                  <span className="text-[10px] font-mono text-text-muted">00:12:34</span>
                </div>
              </div>

              {/* Window Content Grid */}
              <div className="grid grid-cols-12 gap-3 pt-3">
                {/* Micro Left Navigation */}
                <div className="col-span-3 border-r border-hairline/60 pr-2 flex flex-col justify-between hidden sm:flex">
                  <div className="space-y-1.5">
                    <div className="px-2 py-1 rounded bg-accent/20 border border-accent/40 text-accent text-[10px] font-semibold">
                      Mock Interview
                    </div>
                    <div className="px-2 py-1 text-text-muted text-[10px]">Practice</div>
                    <div className="px-2 py-1 text-text-muted text-[10px]">Progress</div>
                    <div className="px-2 py-1 text-text-muted text-[10px]">Problems</div>
                    <div className="px-2 py-1 text-text-muted text-[10px]">Resume</div>
                  </div>
                  <div className="p-2 bg-surface/70 rounded-lg border border-hairline mt-4">
                    <p className="text-[9px] font-semibold text-white">Keep going</p>
                    <p className="text-[8px] text-text-muted">3 interviews to goal</p>
                  </div>
                </div>

                {/* Center AI Question Simulation */}
                <div className="col-span-12 sm:col-span-6 flex flex-col items-center justify-between py-1">
                  <div className="scale-75 -my-2">
                    <AIOrb isSpeaking={true} size={85} />
                  </div>
                  <div className="space-y-2 w-full my-2">
                    <div className="p-2.5 rounded-xl bg-surface/90 border border-hairline text-[11px] text-text-primary leading-relaxed shadow-md">
                      Great! Let's start with a question.
                    </div>
                    <div className="p-2.5 rounded-xl bg-surface/90 border border-hairline text-[11px] text-text-primary leading-relaxed shadow-md">
                      Can you design a scalable URL shortener like bit.ly?
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pt-1">
                    <div className="p-2 rounded-full bg-surface border border-hairline text-text-muted text-[10px]">
                      Mute
                    </div>
                    <div className="p-2 px-3 rounded-full bg-red-600 text-white text-[10px] font-bold shadow-[0_0_12px_rgba(220,38,38,0.7)]">
                      End
                    </div>
                    <div className="p-2 rounded-full bg-surface border border-hairline text-text-muted text-[10px]">
                      Camera
                    </div>
                  </div>
                </div>

                {/* Right AI Feedback Mini-Card */}
                <div className="col-span-3 border-l border-hairline/60 pl-2 space-y-2.5 hidden sm:block">
                  <div className="flex items-center justify-between text-[10px] font-semibold text-text-secondary pb-1 border-b border-hairline/50">
                    <span className="text-accent">AI Feedback</span>
                    <span>Transcript</span>
                  </div>
                  <div className="p-2 rounded-lg bg-surface/80 border border-hairline">
                    <span className="text-[8px] text-text-muted">Overall Score</span>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-8 h-8 rounded-full border-2 border-emerald-400 flex items-center justify-center text-[10px] font-bold text-white shadow-[0_0_8px_#34D399]">
                        8.5
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-white">Top 8% Fit</p>
                        <p className="text-[7px] text-text-muted">L5 Senior Ready</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1 text-[8px]">
                    <div className="flex justify-between text-text-muted">
                      <span>Communication</span>
                      <span>9/10</span>
                    </div>
                    <div className="w-full h-1 bg-surface-hover rounded-full">
                      <div className="w-[90%] h-full bg-accent rounded-full" />
                    </div>
                    <div className="flex justify-between text-text-muted pt-1">
                      <span>System Design</span>
                      <span>8/10</span>
                    </div>
                    <div className="w-full h-1 bg-surface-hover rounded-full">
                      <div className="w-[80%] h-full bg-accent rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Company Logos Banner (Screenshot 1 Bottom) */}
        <div className="pt-20 border-t border-hairline/40 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] text-text-muted uppercase">
              TRUSTED BY ASPIRING ENGINEERS AT
            </p>
            <div className="flex flex-wrap items-center gap-8 sm:gap-12 mt-4 opacity-70">
              <span className="text-base sm:text-lg font-bold tracking-tight text-white/90">Google</span>
              <span className="text-base sm:text-lg font-bold tracking-tight text-white/90">Microsoft</span>
              <span className="text-base sm:text-lg font-bold tracking-tight text-white/90">amazon</span>
              <span className="text-base sm:text-lg font-bold tracking-tight text-white/90">∞ Meta</span>
              <span className="text-base sm:text-lg font-bold tracking-tight text-white/90">Apple</span>
              <span className="text-base sm:text-lg font-bold tracking-tight text-white/90 tracking-widest text-red-500/90 font-mono">NETFLIX</span>
            </div>
          </div>

          <div className="text-right hidden md:block">
            <span className="text-[11px] tracking-[0.2em] text-text-muted uppercase font-medium">
              BETTER INTERVIEWS. <br /> BRIGHTER TOMORROWS.
            </span>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. CINEMATIC SCROLLYTELLING ARCHITECTURE SECTION */}
      {/* ========================================================================= */}
      <Scrollytelling />

      {/* ========================================================================= */}
      {/* 3. HOW IT WORKS SECTION (Screenshot 5: media_1788673440472.png) */}
      {/* ========================================================================= */}
      <section id="how-it-works" className="relative z-10 pt-20 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-[11px] font-bold tracking-[0.25em] text-accent uppercase">
            SIMPLE. POWERFUL. PERSONAL.
          </span>
          <h2 className="text-4xl sm:text-6xl font-normal tracking-tight text-white font-serif-heading">
            How it works
          </h2>
          <p className="text-sm sm:text-base text-text-secondary leading-relaxed pt-2">
            Go from unsure to interview-ready in three simple steps. <br />
            A personalized experience, calibrated around you.
          </p>
        </div>

        {/* Dynamic Curved Luminous Bezier Connector & 3 Cards */}
        <div className="relative mt-20">
          <div className="absolute top-20 left-0 right-0 hidden md:block pointer-events-none">
            <svg className="w-full h-32" viewBox="0 0 1000 120" fill="none" preserveAspectRatio="none">
              <path
                d="M 100 60 Q 280 10, 500 70 T 900 40"
                stroke="url(#waveGlowMain)"
                strokeWidth="2.5"
                strokeDasharray="6 4"
                className="animate-pulse"
              />
              <path
                d="M 100 60 Q 280 10, 500 70 T 900 40"
                stroke="#5B8CFF"
                strokeWidth="1.5"
                opacity="0.8"
              />
              <defs>
                <linearGradient id="waveGlowMain" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.2" />
                  <stop offset="50%" stopColor="#60A5FA" stopOpacity="1" />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.2" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 relative z-10">
            {/* Step 01 */}
            <div className="flex flex-col items-start space-y-4">
              <div className="relative">
                <span className="text-7xl font-extrabold text-white/5 select-none absolute -top-8 -left-2 font-mono">
                  01
                </span>
                <div className="relative w-12 h-12 rounded-xl bg-surface/90 border border-accent/50 flex items-center justify-center text-accent shadow-[0_0_20px_rgba(91,140,255,0.4)]">
                  <UserCheck className="w-6 h-6" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-white">Tell us your goals</h3>
              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                Choose your target company tier (FAANG / Unicorn), seniority level, and target package. We tailor everything to you.
              </p>
              <div className="pt-2 flex items-center gap-2">
                <span className="w-4 h-[1px] bg-accent" />
                <span className="text-[10px] font-bold tracking-[0.15em] text-text-muted uppercase">
                  PERSONALIZED SETUP
                </span>
              </div>
            </div>

            {/* Step 02 */}
            <div className="flex flex-col items-start space-y-4">
              <div className="relative">
                <span className="text-7xl font-extrabold text-white/5 select-none absolute -top-8 -left-2 font-mono">
                  02
                </span>
                <div className="relative w-12 h-12 rounded-xl bg-surface/90 border border-accent/50 flex items-center justify-center text-accent shadow-[0_0_20px_rgba(91,140,255,0.4)]">
                  <MessageSquareCode className="w-6 h-6" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-white">Practice with AI</h3>
              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                Get realistic, adaptive interview questions with instant voice audio responses, follow-up probes, and detailed explanations.
              </p>
              <div className="pt-2 flex items-center gap-2">
                <span className="w-4 h-[1px] bg-accent" />
                <span className="text-[10px] font-bold tracking-[0.15em] text-text-muted uppercase">
                  REAL CONVERSATIONS
                </span>
              </div>
            </div>

            {/* Step 03 */}
            <div className="flex flex-col items-start space-y-4">
              <div className="relative">
                <span className="text-7xl font-extrabold text-white/5 select-none absolute -top-8 -left-2 font-mono">
                  03
                </span>
                <div className="relative w-12 h-12 rounded-xl bg-surface/90 border border-accent/50 flex items-center justify-center text-accent shadow-[0_0_20px_rgba(91,140,255,0.4)]">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-white">Track your progress</h3>
              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                See your concrete strong points, fix your diagnostic weak spots, and watch your confidence grow over time.
              </p>
              <div className="pt-2 flex items-center gap-2">
                <span className="w-4 h-[1px] bg-accent" />
                <span className="text-[10px] font-bold tracking-[0.15em] text-text-muted uppercase">
                  MEASURABLE IMPROVEMENT
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. INTERACTIVE DECISION TREE & FLOWCHART SECTIONS */}
      {/* ========================================================================= */}
      <section id="features" className="relative z-10 py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16">
        <TreeAnimation />
        <FlowchartAnimation />
      </section>

      {/* ========================================================================= */}
      {/* 5. PRICING PREVIEW */}
      {/* ========================================================================= */}
      <section id="pricing" className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
          <span className="text-[11px] font-bold tracking-[0.25em] text-accent uppercase">
            MEMBERSHIP PLANS
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Level up your practice today
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary">
            Flexible plans for aspiring software engineers, senior architects, and university cohorts.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl glass-panel border border-white/10 flex flex-col justify-between">
            <div>
              <h4 className="text-base font-bold text-white">Starter</h4>
              <p className="text-xs text-text-secondary mt-1">5 Mock Sessions / month</p>
              <p className="text-3xl font-extrabold text-white mt-4">$0 <span className="text-xs text-text-muted font-normal">/ mo</span></p>
            </div>
            <Link to="/register" className="w-full mt-6 py-2.5 rounded-xl border border-hairline text-center text-xs font-semibold text-text-primary hover:text-white hover:bg-surface">
              Start Free
            </Link>
          </div>

          <div className="p-6 rounded-2xl glass-window border-accent shadow-glow-accent-lg flex flex-col justify-between relative">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-400 to-accent" />
            <div>
              <div className="flex justify-between items-center">
                <h4 className="text-base font-bold text-white">Pro Engineer</h4>
                <span className="text-[9px] font-bold text-accent px-2 py-0.5 rounded bg-accent/20">POPULAR</span>
              </div>
              <p className="text-xs text-text-secondary mt-1">Unlimited sessions & deep scoring</p>
              <p className="text-3xl font-extrabold text-white mt-4">$18 <span className="text-xs text-text-muted font-normal">/ mo</span></p>
            </div>
            <Link to="/pricing" className="w-full mt-6 btn-primary-glow py-2.5 rounded-xl text-center text-xs font-semibold text-white">
              Upgrade to Pro
            </Link>
          </div>

          <div className="p-6 rounded-2xl glass-panel border border-white/10 flex flex-col justify-between">
            <div>
              <h4 className="text-base font-bold text-white">Enterprise</h4>
              <p className="text-xs text-text-secondary mt-1">Cohorts & custom rubric API</p>
              <p className="text-3xl font-extrabold text-white mt-4">$52 <span className="text-xs text-text-muted font-normal">/ mo</span></p>
            </div>
            <Link to="/pricing" className="w-full mt-6 py-2.5 rounded-xl border border-hairline text-center text-xs font-semibold text-text-primary hover:text-white hover:bg-surface">
              View Enterprise
            </Link>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. BLOG PREVIEW */}
      {/* ========================================================================= */}
      <section id="blog" className="relative z-10 py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-hairline/40">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10">
          <div>
            <span className="text-[11px] font-bold tracking-[0.25em] text-accent uppercase">
              LATEST ARTICLES
            </span>
            <h2 className="text-2xl sm:text-4xl font-bold text-white mt-1">
              Engineering Interview Insights
            </h2>
          </div>
          <Link to="/blog" className="text-xs font-semibold text-accent hover:text-accent-hover flex items-center gap-1">
            View All Articles <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link to="/blog" className="p-6 rounded-2xl glass-panel border border-white/10 hover:border-accent/40 transition-all group">
            <span className="text-[10px] text-accent font-semibold px-2 py-0.5 rounded bg-accent/15">System Design</span>
            <h3 className="text-lg font-bold text-white mt-3 group-hover:text-accent transition-colors">
              How Senior Engineers Approach System Design in 45 Minutes
            </h3>
            <p className="text-xs text-text-secondary mt-2 line-clamp-2">
              Learn the 4-step framework top candidates use to navigate capacity estimations, database partitioning, and caching.
            </p>
          </Link>

          <Link to="/blog" className="p-6 rounded-2xl glass-panel border border-white/10 hover:border-accent/40 transition-all group">
            <span className="text-[10px] text-accent font-semibold px-2 py-0.5 rounded bg-accent/15">DSA</span>
            <h3 className="text-lg font-bold text-white mt-3 group-hover:text-accent transition-colors">
              Mastering the Dynamic Programming State Machine Pattern
            </h3>
            <p className="text-xs text-text-secondary mt-2 line-clamp-2">
              Demystifying multi-state transitions in DP problems like stock trading with cool-downs and regular expression matching.
            </p>
          </Link>
        </div>
      </section>

      {/* Bottom Horizon Tagline */}
      <div className="py-20 text-center relative z-10">
        <p className="text-[11px] font-semibold tracking-[0.25em] text-text-muted uppercase">
          — PRACTICE TODAY. A BRIGHTER TOMORROW. —
        </p>
      </div>

      {/* Target Company & Tier Setup Wizard Modal */}
      <CompanyTierModal
        isOpen={showTierModal}
        onClose={() => setShowTierModal(false)}
      />
    </div>
  );
}
