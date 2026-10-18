import React from 'react';
import { Link } from 'react-router-dom';
import AuroraBackground from '../components/AuroraBackground';
import TreeAnimation from '../components/TreeAnimation';
import FlowchartAnimation from '../components/FlowchartAnimation';
import {
  UserCheck,
  MessageSquareCode,
  TrendingUp,
  ArrowRight,
  Sparkles,
  Bot,
  Mic,
  BarChart2,
  CheckCircle2,
} from 'lucide-react';

export default function HowItWorksPage() {
  return (
    <div className="relative min-h-screen bg-bg text-text-primary px-4 sm:px-6 lg:px-8 py-16 overflow-hidden">
      <AuroraBackground showHorizon={true} />

      <div className="max-w-7xl mx-auto relative z-10 space-y-20">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <span className="text-[11px] font-bold tracking-[0.25em] text-accent uppercase">
            SIMPLE. POWERFUL. PERSONAL.
          </span>
          <h1 className="text-4xl sm:text-6xl font-normal tracking-tight text-white font-serif-heading">
            How it works
          </h1>
          <p className="text-sm sm:text-base text-text-secondary leading-relaxed max-w-xl mx-auto">
            Go from unsure to interview-ready in three simple steps. A personalized experience, built around you.
          </p>
        </div>

        {/* 3 Step Cards Pipeline */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12 relative z-10">
          {/* Step 01 Card */}
          <div className="group relative p-8 rounded-3xl bg-surface/70 border border-white/10 hover:border-accent/50 backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1.5 shadow-xl hover:shadow-[0_20px_50px_rgba(59,130,246,0.25)] flex flex-col justify-between">
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/10 border border-blue-400/40 flex items-center justify-center text-accent shadow-[0_0_25px_rgba(59,130,246,0.35)] group-hover:scale-110 transition-transform">
                  <UserCheck className="w-7 h-7" />
                </div>
                <span className="text-5xl font-extrabold text-white/10 group-hover:text-accent/30 font-mono transition-colors">
                  01
                </span>
              </div>

              <div>
                <h3 className="text-xl font-bold text-white group-hover:text-blue-300 transition-colors">
                  Calibrate Your Target
                </h3>
                <p className="text-xs sm:text-sm text-text-secondary leading-relaxed mt-2.5">
                  Choose your dream company tier (FAANG, Unicorn, Scale-up), engineering level (L4, L5 Senior, L6 Staff), and target compensation package.
                </p>
              </div>
            </div>

            <div className="pt-6 border-t border-white/5 mt-6 flex items-center justify-between">
              <span className="text-[10px] font-mono font-semibold text-accent uppercase tracking-wider">
                PERSONALIZED SETUP
              </span>
              <span className="w-2 h-2 rounded-full bg-accent/60 group-hover:bg-accent animate-ping" />
            </div>
          </div>

          {/* Step 02 Card */}
          <div className="group relative p-8 rounded-3xl bg-surface/70 border border-accent/40 hover:border-accent backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1.5 shadow-2xl hover:shadow-[0_20px_50px_rgba(59,130,246,0.35)] flex flex-col justify-between">
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/30 to-emerald-500/10 border border-blue-400/50 flex items-center justify-center text-blue-300 shadow-[0_0_25px_rgba(59,130,246,0.45)] group-hover:scale-110 transition-transform">
                  <MessageSquareCode className="w-7 h-7" />
                </div>
                <span className="text-5xl font-extrabold text-white/10 group-hover:text-accent/30 font-mono transition-colors">
                  02
                </span>
              </div>

              <div>
                <h3 className="text-xl font-bold text-white group-hover:text-blue-300 transition-colors">
                  Practice with Voice AI
                </h3>
                <p className="text-xs sm:text-sm text-text-secondary leading-relaxed mt-2.5">
                  Engage in multi-turn voice dialogues with Claude 3.5 Sonnet. The AI probes edge cases, challenges trade-offs, and detects algorithmic brute-force gaps.
                </p>
              </div>
            </div>

            <div className="pt-6 border-t border-white/5 mt-6 flex items-center justify-between">
              <span className="text-[10px] font-mono font-semibold text-emerald-400 uppercase tracking-wider">
                REAL CONVERSATIONS
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
          </div>

          {/* Step 03 Card */}
          <div className="group relative p-8 rounded-3xl bg-surface/70 border border-white/10 hover:border-accent/50 backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1.5 shadow-xl hover:shadow-[0_20px_50px_rgba(59,130,246,0.25)] flex flex-col justify-between">
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/10 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shadow-[0_0_25px_rgba(99,102,241,0.35)] group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-7 h-7" />
                </div>
                <span className="text-5xl font-extrabold text-white/10 group-hover:text-accent/30 font-mono transition-colors">
                  03
                </span>
              </div>

              <div>
                <h3 className="text-xl font-bold text-white group-hover:text-blue-300 transition-colors">
                  Track Your Progress
                </h3>
                <p className="text-xs sm:text-sm text-text-secondary leading-relaxed mt-2.5">
                  Receive an official Hiring Bar score (1.0 to 4.0), diagnostic scorecards for Communication, Complexity, and Architecture, plus line-by-line answer upgrades.
                </p>
              </div>
            </div>

            <div className="pt-6 border-t border-white/5 mt-6 flex items-center justify-between">
              <span className="text-[10px] font-mono font-semibold text-indigo-400 uppercase tracking-wider">
                MEASURABLE IMPROVEMENT
              </span>
              <span className="w-2 h-2 rounded-full bg-indigo-400/80 group-hover:bg-indigo-400" />
            </div>
          </div>
        </div>

        {/* Deep Dive: Adaptive Decision Tree */}
        <TreeAnimation />

        {/* Deep Dive: Architecture Pipeline */}
        <FlowchartAnimation />

        {/* Bottom CTA */}
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-blue-900/30 via-surface to-accent/10 border border-accent/30 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl">
          <div>
            <h3 className="text-2xl sm:text-3xl font-bold text-white">Experience an Adaptive Interview</h3>
            <p className="text-xs sm:text-sm text-text-secondary mt-1">Start practicing DSA, System Design, or Behavioral questions today.</p>
          </div>
          <Link
            to="/register"
            className="btn-primary-glow px-8 py-3.5 rounded-full text-sm font-semibold text-white flex items-center gap-2 shrink-0"
          >
            Start Free Practice
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
