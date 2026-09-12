import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import AuroraBackground from '../components/AuroraBackground';
import FlowchartAnimation from '../components/FlowchartAnimation';
import TreeAnimation from '../components/TreeAnimation';
import {
  Cpu,
  Mic,
  BarChart3,
  GitBranch,
  ShieldCheck,
  Zap,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Lock,
  Layers,
  Code2,
} from 'lucide-react';

export default function FeaturesPage() {
  const [activeTab, setActiveTab] = useState('pipeline'); // 'pipeline' | 'tree' | 'comparison'

  return (
    <div className="relative min-h-screen bg-bg text-text-primary px-4 sm:px-6 lg:px-8 py-16 overflow-hidden">
      <AuroraBackground showHorizon={true} />

      <div className="max-w-7xl mx-auto relative z-10 space-y-16">
        {/* Hero Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <span className="text-[11px] font-bold tracking-[0.25em] text-accent uppercase">
            NEXT-GEN INTERVIEW INTELLIGENCE
          </span>
          <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-[1.1]">
            Engineered for <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-blue-200 to-indigo-300">
              engineering excellence.
            </span>
          </h1>
          <p className="text-sm sm:text-base text-text-secondary leading-relaxed max-w-xl mx-auto">
            Explore the multi-turn state machine, asynchronous evaluation queue, and real-time streaming architecture behind PrepAI.
          </p>
        </div>

        {/* Feature Interactive View Selector */}
        <div className="flex justify-center">
          <div className="inline-flex p-1.5 rounded-2xl bg-surface/90 border border-hairline/80 shadow-float">
            <button
              onClick={() => setActiveTab('pipeline')}
              className={`px-5 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                activeTab === 'pipeline'
                  ? 'bg-accent text-white shadow-[0_0_15px_rgba(91,140,255,0.5)]'
                  : 'text-text-secondary hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              Architecture Flowchart
            </button>

            <button
              onClick={() => setActiveTab('tree')}
              className={`px-5 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                activeTab === 'tree'
                  ? 'bg-accent text-white shadow-[0_0_15px_rgba(91,140,255,0.5)]'
                  : 'text-text-secondary hover:text-white'
              }`}
            >
              <GitBranch className="w-3.5 h-3.5" />
              Adaptive Decision Tree
            </button>

            <button
              onClick={() => setActiveTab('comparison')}
              className={`px-5 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                activeTab === 'comparison'
                  ? 'bg-accent text-white shadow-[0_0_15px_rgba(91,140,255,0.5)]'
                  : 'text-text-secondary hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Feature Comparison
            </button>
          </div>
        </div>

        {/* Active Tab Component Render */}
        <div className="transition-all duration-300">
          {activeTab === 'pipeline' && <FlowchartAnimation />}
          {activeTab === 'tree' && <TreeAnimation />}
          {activeTab === 'comparison' && (
            <div className="glass-window rounded-2xl p-6 sm:p-10 border border-white/10 shadow-2xl">
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-6">
                Why PrepAI Outperforms Static Question Banks
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-hairline text-text-muted font-mono uppercase text-[11px]">
                      <th className="py-4 px-4">Capability</th>
                      <th className="py-4 px-4 text-accent font-bold">PrepAI Engine</th>
                      <th className="py-4 px-4 text-text-muted">Generic Chatbot</th>
                      <th className="py-4 px-4 text-text-muted">Static Quiz Sites</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline/60 text-text-secondary">
                    <tr>
                      <td className="py-4 px-4 font-semibold text-white">Adaptive Follow-ups</td>
                      <td className="py-4 px-4 text-emerald-400 font-semibold flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" /> Multi-turn State Machine
                      </td>
                      <td className="py-4 px-4 text-text-muted">Unstructured Rambling</td>
                      <td className="py-4 px-4 text-red-400">None (Static)</td>
                    </tr>
                    <tr>
                      <td className="py-4 px-4 font-semibold text-white">Streaming Q&A Delivery</td>
                      <td className="py-4 px-4 text-emerald-400 font-semibold">Server-Sent Events (SSE)</td>
                      <td className="py-4 px-4">Basic WebSocket/HTTP</td>
                      <td className="py-4 px-4 text-red-400">Page Reload</td>
                    </tr>
                    <tr>
                      <td className="py-4 px-4 font-semibold text-white">Scoring Method</td>
                      <td className="py-4 px-4 text-emerald-400 font-semibold">Structured Tool Schema (BullMQ)</td>
                      <td className="py-4 px-4">Regex Prompt Parsing</td>
                      <td className="py-4 px-4">Simple Binary Answer</td>
                    </tr>
                    <tr>
                      <td className="py-4 px-4 font-semibold text-white">Voice Recognition</td>
                      <td className="py-4 px-4 text-emerald-400 font-semibold">Native Web Speech API</td>
                      <td className="py-4 px-4">Paid 3rd party Whisper</td>
                      <td className="py-4 px-4 text-red-400">None</td>
                    </tr>
                    <tr>
                      <td className="py-4 px-4 font-semibold text-white">Security & Tokens</td>
                      <td className="py-4 px-4 text-emerald-400 font-semibold">httpOnly Cookies + JWT</td>
                      <td className="py-4 px-4 text-amber-400">localStorage Tokens</td>
                      <td className="py-4 px-4">Session storage</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* 4 Pillars Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-10">
          {[
            {
              title: 'Multi-Turn State Machine',
              desc: 'Conversations persist across full interview trajectories with historical context aware probing.',
              icon: Layers,
            },
            {
              title: 'Async BullMQ Workers',
              desc: 'Evaluation runs on isolated background queues so scoring never blocks active HTTP streams.',
              icon: Cpu,
            },
            {
              title: 'Voice-to-Text Native',
              desc: 'Speak naturally to practice real verbal fluency under realistic timed interview conditions.',
              icon: Mic,
            },
            {
              title: 'Aggregation Pipelines',
              desc: 'MongoDB pipelines aggregate historical trends, topic mastery, and weak-point diagnostics.',
              icon: BarChart3,
            },
          ].map((card, idx) => (
            <div
              key={idx}
              className="p-6 rounded-2xl bg-surface/70 border border-hairline hover:border-accent/50 hover:bg-surface-hover transition-all space-y-3 shadow-lg group"
            >
              <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent group-hover:scale-110 transition-transform">
                <card.icon className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-white">{card.title}</h4>
              <p className="text-xs text-text-secondary leading-relaxed">{card.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA Card */}
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-blue-900/30 via-surface to-accent/10 border border-accent/30 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl">
          <div>
            <h3 className="text-2xl sm:text-3xl font-bold text-white">Ready to sharpen your skills?</h3>
            <p className="text-xs sm:text-sm text-text-secondary mt-1">Start practicing with our adaptive AI interviewer in seconds.</p>
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
