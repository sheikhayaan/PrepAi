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

        {/* Dynamic Curved Luminous Bezier Connector & 3 Cards */}
        <div className="relative mt-8">
          {/* Luminous Glowing Wave Path (SVG) */}
          <div className="absolute top-20 left-0 right-0 hidden md:block pointer-events-none">
            <svg className="w-full h-32" viewBox="0 0 1000 120" fill="none" preserveAspectRatio="none">
              <path
                d="M 100 60 Q 280 10, 500 70 T 900 40"
                stroke="url(#waveGlowPage)"
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
                <linearGradient id="waveGlowPage" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.2" />
                  <stop offset="50%" stopColor="#60A5FA" stopOpacity="1" />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.2" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* 3 Steps Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 relative z-10">
            {/* Step 01 */}
            <div className="flex flex-col items-start space-y-4 p-6 rounded-2xl bg-surface/50 border border-hairline hover:border-accent/50 transition-all">
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
                Choose your target role, tech stack, and experience level. We tailor everything to you.
              </p>
              <div className="pt-2 flex items-center gap-2">
                <span className="w-4 h-[1px] bg-accent" />
                <span className="text-[10px] font-bold tracking-[0.15em] text-text-muted uppercase">
                  PERSONALIZED SETUP
                </span>
              </div>
            </div>

            {/* Step 02 */}
            <div className="flex flex-col items-start space-y-4 p-6 rounded-2xl bg-surface/50 border border-hairline hover:border-accent/50 transition-all">
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
                Get realistic, adaptive interview questions with instant feedback and detailed explanations.
              </p>
              <div className="pt-2 flex items-center gap-2">
                <span className="w-4 h-[1px] bg-accent" />
                <span className="text-[10px] font-bold tracking-[0.15em] text-text-muted uppercase">
                  REAL CONVERSATIONS
                </span>
              </div>
            </div>

            {/* Step 03 */}
            <div className="flex flex-col items-start space-y-4 p-6 rounded-2xl bg-surface/50 border border-hairline hover:border-accent/50 transition-all">
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
                See your strengths, fix your weak points, and watch your confidence grow over time.
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
