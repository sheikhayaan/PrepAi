import React, { useState, useEffect } from 'react';
import {
  Mic,
  Zap,
  Cpu,
  Layers,
  Sparkles,
  Database,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  Maximize2,
} from 'lucide-react';

export default function Scrollytelling() {
  const [activeLayer, setActiveLayer] = useState(2); // Default to Neural Evaluator layer
  const [exploded, setExploded] = useState(true);

  const layers = [
    {
      id: 0,
      name: 'Layer 1: Real-Time Audio & Web Speech Interface',
      tag: 'CANDIDATE INTERACTION',
      tech: 'Web Speech API • Audio Waveform Synthesis',
      color: '#3B82F6',
      summary: 'Captures candidate voice responses natively with zero third-party latency. Performs real-time audio amplitude modulation into dynamic waveform bars and feeds stream to browser state.',
      stats: { latency: '< 15ms', accuracy: '99.4%', mode: 'Bidirectional Voice/Text' },
    },
    {
      id: 1,
      name: 'Layer 2: Unidirectional SSE Stream Multiplexer',
      tag: 'STREAMING PIPELINE',
      tech: 'Server-Sent Events (SSE) • HTTP/2 Connection Pipe',
      color: '#60A5FA',
      summary: 'Streams token-by-token interviewer dialogue directly to the client canvas. Bypasses bulky WebSocket framing overhead while maintaining persistent connection resilience.',
      stats: { throughput: '120 tokens/sec', transport: 'HTTP EventStream', reconnections: 'Instant Auto-Resume' },
    },
    {
      id: 2,
      name: 'Layer 3: Multi-Turn Neural Evaluator & State Machine',
      tag: 'CORE INTELLIGENCE',
      tech: 'Claude 3.5 Sonnet • Adaptive State Tree',
      color: '#818CF8',
      summary: 'Maintains complete session transcript memory. Evaluates algorithmic trade-offs, detects brute-force gaps, and dynamically branches into deep follow-up probes.',
      stats: { contextMemory: '200k tokens', model: 'Claude Sonnet 3.5', branchingRate: 'Adaptive Real-Time' },
    },
    {
      id: 3,
      name: 'Layer 4: High-Throughput BullMQ Worker Cluster',
      tag: 'ASYNC JOB QUEUE',
      tech: 'BullMQ • Redis In-Memory Worker',
      color: '#A78BFA',
      summary: 'Deliberate asynchronous architecture isolates compute-heavy scoring from HTTP request cycles. Retries failed tasks with exponential backoff.',
      stats: { concurrency: '100+ Jobs/sec', queueEngine: 'Redis BullMQ', isolation: 'Non-blocking I/O' },
    },
    {
      id: 4,
      name: 'Layer 5: Distributed Aggregation & Competency Matrix',
      tag: 'DATA PERSISTENCE',
      tech: 'MongoDB Aggregation Pipelines • Recharts',
      color: '#34D399',
      summary: 'Executes multi-stage aggregation pipelines to calculate monthly percentile trajectories, topic mastery heatmaps, and target package leveling benchmarks.',
      stats: { pipelineStages: '7 Aggregations', latency: '< 8ms DB Query', metrics: '45 Diagnostic Points' },
    },
  ];

  return (
    <section className="relative z-10 py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
        <span className="text-[11px] font-bold tracking-[0.25em] text-accent uppercase flex items-center justify-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          SCROLLYTELLING: CINEMATIC ARCHITECTURE DECONSTRUCTION
        </span>
        <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
          Deconstructing the Engine <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-200 to-emerald-300">
            Layer by Layer.
          </span>
        </h2>
        <p className="text-xs sm:text-sm text-text-secondary max-w-xl mx-auto leading-relaxed">
          Hover and inspect each physical layer of PrepAI's execution pipeline as it smoothly disassembles in 3D space.
        </p>

        {/* Explosion Toggle */}
        <div className="pt-2 flex justify-center">
          <button
            onClick={() => setExploded(!exploded)}
            className="px-4 py-1.5 rounded-full bg-surface border border-hairline hover:border-accent text-xs font-semibold text-text-secondary hover:text-white transition-all flex items-center gap-2 cursor-pointer shadow-float"
          >
            <Maximize2 className="w-3.5 h-3.5 text-accent" />
            {exploded ? 'Collapse Stack' : 'Explode 3D Stack'}
          </button>
        </div>
      </div>

      {/* 3D Exploded Stack Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        {/* Left Side: Interactive 3D Exploded Layer Stack */}
        <div className="lg:col-span-6 perspective-container py-8">
          <div className="relative flex flex-col items-center justify-center space-y-4">
            {layers.map((layer, idx) => {
              const isSelected = activeLayer === idx;
              const offsetY = exploded ? (idx - 2) * 28 : 0;
              const rotateX = exploded ? 24 : 10;
              const rotateZ = exploded ? -12 : -4;

              return (
                <div
                  key={layer.id}
                  onClick={() => setActiveLayer(idx)}
                  className={`w-full max-w-md p-4 rounded-2xl border transition-all duration-500 cursor-pointer relative ${
                    isSelected
                      ? 'bg-surface/95 border-accent shadow-[0_20px_50px_rgba(59,130,246,0.4),0_0_20px_rgba(91,140,255,0.6)] scale-[1.05]'
                      : 'bg-surface/60 border-hairline/70 hover:border-accent/40 opacity-75 hover:opacity-100'
                  }`}
                  style={{
                    transform: `rotateX(${rotateX}deg) rotateZ(${rotateZ}deg) translateY(${offsetY}px)`,
                    boxShadow: isSelected
                      ? `0 20px 40px -10px ${layer.color}50, 0 0 25px ${layer.color}40`
                      : '0 10px 25px -5px rgba(0,0,0,0.5)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-mono text-xs font-bold"
                        style={{ backgroundColor: layer.color }}
                      >
                        0{idx + 1}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white tracking-tight">{layer.name.split(':')[1]}</h4>
                        <span className="text-[10px] text-text-muted font-mono">{layer.tag}</span>
                      </div>
                    </div>
                    {isSelected && (
                      <span className="w-2.5 h-2.5 rounded-full bg-accent animate-ping" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Deep Layer Inspector Card */}
        <div className="lg:col-span-6">
          <div className="glass-window rounded-3xl p-6 sm:p-8 border border-white/15 shadow-[0_30px_90px_rgba(0,0,0,0.9),0_0_40px_rgba(91,140,255,0.25)] relative overflow-hidden">
            {/* Top Accent Rim */}
            <div
              className="absolute top-0 inset-x-0 h-1.5 transition-all duration-300"
              style={{ backgroundColor: layers[activeLayer].color, boxShadow: `0 0 15px ${layers[activeLayer].color}` }}
            />

            <div className="flex items-center justify-between pb-4 border-b border-hairline">
              <span
                className="px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border"
                style={{
                  backgroundColor: `${layers[activeLayer].color}15`,
                  borderColor: `${layers[activeLayer].color}40`,
                  color: layers[activeLayer].color,
                }}
              >
                {layers[activeLayer].tag}
              </span>
              <span className="text-xs font-mono text-text-muted">
                LAYER 0{activeLayer + 1} OF 05
              </span>
            </div>

            <div className="my-6 space-y-3">
              <h3 className="text-2xl font-bold text-white leading-snug">
                {layers[activeLayer].name}
              </h3>
              <p className="text-xs font-semibold text-accent font-mono">
                {layers[activeLayer].tech}
              </p>
              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed pt-2">
                {layers[activeLayer].summary}
              </p>
            </div>

            {/* Performance Metrics Row */}
            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-hairline">
              {Object.entries(layers[activeLayer].stats).map(([k, v], i) => (
                <div key={i} className="p-3 rounded-xl bg-surface/70 border border-hairline/60">
                  <p className="text-[9px] text-text-muted uppercase font-mono">{k}</p>
                  <p className="text-xs sm:text-sm font-bold text-white mt-0.5 truncate">{v}</p>
                </div>
              ))}
            </div>

            {/* Navigation controls between layers */}
            <div className="flex items-center justify-between pt-6 mt-6 border-t border-hairline">
              <button
                onClick={() => setActiveLayer((prev) => (prev > 0 ? prev - 1 : layers.length - 1))}
                className="text-xs font-semibold text-text-secondary hover:text-white transition-colors cursor-pointer"
              >
                ← Previous Layer
              </button>

              <div className="flex gap-1.5">
                {layers.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveLayer(i)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      activeLayer === i ? 'w-6 bg-accent' : 'bg-hairline'
                    }`}
                  />
                ))}
              </div>

              <button
                onClick={() => setActiveLayer((prev) => (prev < layers.length - 1 ? prev + 1 : 0))}
                className="text-xs font-semibold text-accent hover:text-accent-hover transition-colors cursor-pointer flex items-center gap-1"
              >
                Next Layer →
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
