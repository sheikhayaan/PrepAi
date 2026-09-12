import React, { useState, useEffect } from 'react';
import {
  Mic,
  MessageSquare,
  Cpu,
  Layers,
  Database,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Zap,
} from 'lucide-react';

export default function FlowchartAnimation() {
  const [activeStep, setActiveStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  const steps = [
    {
      id: 'input',
      title: '1. Candidate Input',
      desc: 'Voice (Web Speech API) or Text input captured in real time with audio waveform analysis.',
      icon: Mic,
      tech: 'React 18 + Web Speech API',
      color: '#3B82F6',
    },
    {
      id: 'sse',
      title: '2. Real-Time Streaming',
      desc: 'SSE (Server-Sent Events) connects candidate to Express with token-by-token low-latency streaming.',
      icon: Zap,
      tech: 'Express SSE + EventStream',
      color: '#60A5FA',
    },
    {
      id: 'ai',
      title: '3. Adaptive AI Engine',
      desc: 'Claude 3.5 Sonnet analyzes transcript history to branch questions or probe trade-offs.',
      icon: Cpu,
      tech: 'Anthropic Claude SDK',
      color: '#818CF8',
    },
    {
      id: 'queue',
      title: '4. Async BullMQ Queue',
      desc: 'Non-blocking background job enqueued to Redis for deep multi-dimensional evaluation.',
      icon: Layers,
      tech: 'BullMQ + Redis Worker',
      color: '#A78BFA',
    },
    {
      id: 'tool',
      title: '5. Structured Tool Scoring',
      desc: 'Mandatory tool-use schema outputs JSON metrics across Clarity, Correctness, and Structure.',
      icon: Sparkles,
      tech: 'Tool Calling / JSON Schema',
      color: '#34D399',
    },
    {
      id: 'db',
      title: '6. Aggregation & Analytics',
      desc: 'MongoDB aggregation pipelines compute performance trends, accuracy rates, and skill graphs.',
      icon: Database,
      tech: 'MongoDB Aggregation Pipeline',
      color: '#F472B6',
    },
  ];

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 3200);
    return () => clearInterval(interval);
  }, [isPlaying, steps.length]);

  return (
    <div className="w-full py-10">
      <div className="glass-window rounded-2xl p-6 sm:p-8 border border-white/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8),0_0_35px_rgba(59,130,246,0.2)]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-hairline">
          <div>
            <span className="text-[11px] font-bold tracking-[0.2em] text-accent uppercase flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              SYSTEM ARCHITECTURE & DATA FLOW
            </span>
            <h3 className="text-xl sm:text-2xl font-bold text-white mt-1">
              End-to-End Execution Pipeline
            </h3>
            <p className="text-xs text-text-secondary mt-1">
              Watch real-time data packets traverse the state machine from input to structured scoring
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-hover border border-hairline text-xs font-medium text-text-secondary hover:text-white transition-colors"
            >
              {isPlaying ? 'Pause Animation' : 'Resume Animation'}
            </button>
          </div>
        </div>

        {/* Interactive Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3.5 my-8">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isActive = activeStep === idx;
            const isPassed = activeStep > idx;

            return (
              <button
                key={step.id}
                onClick={() => {
                  setActiveStep(idx);
                  setIsPlaying(false);
                }}
                className={`p-3.5 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between min-h-[140px] cursor-pointer ${
                  isActive
                    ? 'bg-accent/15 border-accent shadow-[0_0_20px_rgba(91,140,255,0.35)] scale-[1.03]'
                    : isPassed
                    ? 'bg-surface/70 border-hairline/80 opacity-90'
                    : 'bg-surface/40 border-hairline/50 opacity-60 hover:opacity-100 hover:border-hairline'
                }`}
              >
                {/* Active Indicator Top Glow */}
                {isActive && (
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-400 to-indigo-400 shadow-[0_0_10px_#60A5FA]" />
                )}

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{
                        backgroundColor: isActive ? step.color : 'rgba(255,255,255,0.06)',
                        color: isActive ? '#FFFFFF' : step.color,
                        boxShadow: isActive ? `0 0 15px ${step.color}` : 'none',
                      }}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-mono text-text-muted">0{idx + 1}</span>
                  </div>
                  <h4 className="text-xs font-bold text-white tracking-tight">{step.title}</h4>
                </div>

                <div className="mt-3 pt-2 border-t border-hairline/50">
                  <span className="text-[9px] font-medium text-accent truncate block">
                    {step.tech}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Animated Connector Visualizer with Live Particles */}
        <div className="relative p-5 rounded-xl bg-surface/80 border border-hairline/90 overflow-hidden">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0 transition-all duration-300 shadow-lg"
                style={{
                  backgroundColor: steps[activeStep].color,
                  boxShadow: `0 0 25px ${steps[activeStep].color}80`,
                }}
              >
                {React.createElement(steps[activeStep].icon, { className: 'w-6 h-6' })}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-accent uppercase">
                    Currently Executing: Step {activeStep + 1} of 6
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                </div>
                <h4 className="text-base font-bold text-white mt-0.5">
                  {steps[activeStep].title}
                </h4>
                <p className="text-xs text-text-secondary mt-1 max-w-xl">
                  {steps[activeStep].desc}
                </p>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-3">
              <div className="px-3 py-1.5 rounded-lg bg-bg border border-hairline text-right">
                <p className="text-[9px] text-text-muted font-mono">FRAMEWORK COMPONENT</p>
                <p className="text-xs font-bold text-white font-mono">{steps[activeStep].tech}</p>
              </div>
            </div>
          </div>

          {/* Flow Progress Bar with glowing particle */}
          <div className="w-full h-1.5 bg-surface-hover rounded-full overflow-hidden mt-6 relative">
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 transition-all duration-500 rounded-full"
              style={{ width: `${((activeStep + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
