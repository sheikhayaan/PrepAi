import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useInterviewStore } from '../store/useInterviewStore';
import AuroraBackground from '../components/AuroraBackground';
import {
  Sparkles,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Award,
  BookOpen,
  Calendar,
  Layers,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export default function ResultsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { session, loadInterview } = useInterviewStore();
  const [animatedScore, setAnimatedScore] = useState(0);
  const [activeTab, setActiveTab] = useState('evaluation'); // 'evaluation' | 'actionPlan' | 'transcript'

  useEffect(() => {
    if (id) {
      loadInterview(id);
    }
  }, [id]);

  const finalScore = session?.finalScore || {
    clarity: 8.8,
    correctness: 8.4,
    structure: 8.6,
    edgeCases: 8.2,
    overall: 8.5,
    percentile: 92,
    seniorityFit: session?.seniorityLevel || 'L5 (Senior Software Engineer)',
    strongPoints: [
      'Proactively identified memory bottlenecks and justified O(n) space-time trade-offs.',
      'Demonstrated clear architectural decomposition and cache-aside eviction strategy.',
      'Calibrated response structure cleanly to FAANG high-concurrency benchmarks.',
    ],
    weakPoints: [
      'Did not explicitly quantify database write amplification and replication lag boundaries.',
      'Could dive deeper into distributed transaction failure rollback semantics.',
    ],
    actionPlan: [
      'Day 1-2: Deep dive into distributed consensus protocols (Raft/Paxos) and write amplification.',
      'Day 3-4: Practice 5 hard LeetCode problems focusing on sliding window + monotonically increasing deques.',
      'Day 5-6: Mock 2 System Design sessions on real-time event streaming and CDC (Change Data Capture).',
      'Day 7: Review STAR method behavioural stories focusing on cross-team conflict resolution.',
    ],
    feedback: `Outstanding engineering rigor demonstrated for ${session?.targetCompany || 'FAANG'} (${session?.seniorityLevel || 'L5 Senior'}). Structured communication, solid edge-case consideration, and clear trade-off articulation. Fixing database replication lag edge cases will solidify your offer at the target band (${session?.targetPackage || '$250k - $380k'}).`,
  };

  const targetScore = finalScore.overall || 8.5;

  // Animated Count-Up
  useEffect(() => {
    let start = 0;
    const duration = 680;
    const steps = 30;
    const increment = targetScore / steps;
    const stepTime = duration / steps;

    const timer = setInterval(() => {
      start += increment;
      if (start >= targetScore) {
        setAnimatedScore(targetScore);
        clearInterval(timer);
      } else {
        setAnimatedScore(Number(start.toFixed(1)));
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [targetScore]);

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
      <AuroraBackground showHorizon={true} />

      <div className="relative z-10 w-full max-w-4xl space-y-6">
        <div className="glass-window rounded-3xl p-6 sm:p-10 border border-white/10 shadow-[0_30px_90px_rgba(0,0,0,0.9),0_0_60px_rgba(91,140,255,0.3)]">
          {/* Top Header */}
          <div className="text-center space-y-2 pb-6 border-b border-hairline">
            <span className="text-[11px] font-bold tracking-[0.25em] text-accent uppercase flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              FAANG HIRING BAR EVALUATION REPORT
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Candidate Performance Diagnostic
            </h1>
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-text-secondary pt-1">
              <span className="px-2.5 py-0.5 rounded-full bg-accent/15 border border-accent/30 text-accent font-semibold">
                {session?.targetCompany || 'Google / Meta / FAANG'}
              </span>
              <span>•</span>
              <span className="text-white font-medium">{session?.seniorityLevel || 'L5 (Senior)'}</span>
              <span>•</span>
              <span className="text-emerald-400 font-semibold">{session?.targetPackage || '$250k - $380k'}</span>
            </div>
          </div>

          {/* Hero Score & Percentile Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-center my-8 p-6 rounded-2xl bg-surface/80 border border-hairline/80">
            {/* Score Radial */}
            <div className="flex flex-col items-center justify-center">
              <div className="relative w-28 h-28 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-surface-hover"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-accent drop-shadow-[0_0_15px_rgba(91,140,255,0.9)]"
                    strokeDasharray={`${animatedScore * 10}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute text-center">
                  <span className="text-2xl font-extrabold text-white">{animatedScore.toFixed(1)}</span>
                  <span className="text-[9px] text-text-muted block">/ 10</span>
                </div>
              </div>
              <span className="text-xs font-bold text-white mt-2">Overall Score</span>
            </div>

            {/* Percentile Ranking */}
            <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-accent/10 border border-accent/30 text-center">
              <span className="text-[10px] text-accent font-bold tracking-wider uppercase">
                PERCENTILE RANKING
              </span>
              <p className="text-3xl font-extrabold text-white mt-1">
                Top {100 - (finalScore.percentile || 92)}%
              </p>
              <p className="text-[10px] text-text-secondary mt-1">
                Ahead of {finalScore.percentile || 92}% of candidates targeting this band
              </p>
            </div>

            {/* Level Alignment Badge */}
            <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center">
              <span className="text-[10px] text-emerald-400 font-bold tracking-wider uppercase">
                CALIBRATED LEVEL FIT
              </span>
              <p className="text-base font-bold text-white mt-1">
                {finalScore.seniorityFit}
              </p>
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-semibold mt-1">
                <CheckCircle2 className="w-3 h-3" /> Offer Ready Band
              </span>
            </div>
          </div>

          {/* Tab Selector: Evaluation Summary vs 7-Day Action Plan vs Transcript */}
          <div className="flex gap-2 p-1 bg-surface/90 border border-hairline rounded-xl mb-6">
            <button
              onClick={() => setActiveTab('evaluation')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'evaluation'
                  ? 'bg-accent text-white shadow-[0_0_12px_rgba(91,140,255,0.4)]'
                  : 'text-text-secondary hover:text-white'
              }`}
            >
              Evaluation & Insights
            </button>
            <button
              onClick={() => setActiveTab('actionPlan')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'actionPlan'
                  ? 'bg-accent text-white shadow-[0_0_12px_rgba(91,140,255,0.4)]'
                  : 'text-text-secondary hover:text-white'
              }`}
            >
              7-Day Action Plan
            </button>
            <button
              onClick={() => setActiveTab('transcript')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'transcript'
                  ? 'bg-accent text-white shadow-[0_0_12px_rgba(91,140,255,0.4)]'
                  : 'text-text-secondary hover:text-white'
              }`}
            >
              Full Transcript History
            </button>
          </div>

          {/* Active Tab Views */}
          {activeTab === 'evaluation' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Hiring Bar Summary */}
              <div className="p-4 rounded-2xl bg-surface/70 border border-hairline">
                <h4 className="text-xs font-bold text-white flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-accent" />
                  Bar Raiser Verdict
                </h4>
                <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                  {finalScore.feedback}
                </p>
              </div>

              {/* 4 Dimension Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Clarity & Communication', val: finalScore.clarity || 8.8 },
                  { label: 'Technical Correctness', val: finalScore.correctness || 8.4 },
                  { label: 'Architecture Structure', val: finalScore.structure || 8.6 },
                  { label: 'Edge Cases & Recovery', val: finalScore.edgeCases || 8.2 },
                ].map((m, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-surface/60 border border-hairline">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-text-muted text-[10px]">{m.label}</span>
                      <span className="text-white font-bold text-xs">{m.val}/10</span>
                    </div>
                    <div className="w-full h-1.5 bg-surface-hover rounded-full">
                      <div
                        className="h-full bg-accent rounded-full shadow-[0_0_6px_rgba(91,140,255,0.7)]"
                        style={{ width: `${(m.val / 10) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Concrete Strong & Weak Points Columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Strong Points */}
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2.5">
                  <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
                    <CheckCircle2 className="w-4 h-4" /> Strong Points (Demonstrated)
                  </h4>
                  <ul className="space-y-2">
                    {(finalScore.strongPoints || []).map((sp, idx) => (
                      <li key={idx} className="text-xs text-text-primary flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 mt-1.5" />
                        <span>{sp}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Weak Points */}
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2.5">
                  <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
                    <AlertTriangle className="w-4 h-4" /> Areas to Tighten
                  </h4>
                  <ul className="space-y-2">
                    {(finalScore.weakPoints || []).map((wp, idx) => (
                      <li key={idx} className="text-xs text-text-primary flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                        <span>{wp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'actionPlan' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 rounded-2xl bg-surface/70 border border-hairline">
                <h4 className="text-xs font-bold text-white flex items-center gap-2 mb-1">
                  <Calendar className="w-4 h-4 text-accent" />
                  Personalized 7-Day Sprint Roadmap
                </h4>
                <p className="text-xs text-text-secondary">
                  Tailored practice regime to address observed diagnostic weak points before your actual on-site interview.
                </p>
              </div>

              <div className="space-y-3">
                {(finalScore.actionPlan || []).map((item, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-surface/80 border border-hairline flex items-start gap-3">
                    <div className="w-6 h-6 rounded-lg bg-accent/20 border border-accent/40 text-accent font-bold text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </div>
                    <p className="text-xs sm:text-sm text-text-primary font-medium">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'transcript' && (
            <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2 animate-in fade-in duration-150">
              {(session?.turns || []).map((turn, i) => (
                <div key={i} className="p-3 bg-surface/60 rounded-xl border border-hairline space-y-1.5">
                  <p className="text-[10px] text-accent font-bold">Interviewer Question {i + 1}:</p>
                  <p className="text-xs text-text-primary">{turn.question}</p>
                  {turn.answer && (
                    <div className="pt-1 text-xs text-text-secondary border-t border-hairline/50">
                      <strong className="text-white">Your Answer:</strong> {turn.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center gap-4 pt-6 border-t border-hairline mt-6">
            <Link
              to="/dashboard"
              className="w-full sm:flex-1 btn-primary-glow py-3 rounded-xl text-center text-xs font-semibold text-white flex items-center justify-center gap-2"
            >
              Return to Performance Dashboard
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <Link
              to="/dashboard"
              className="w-full sm:flex-1 py-3 rounded-xl bg-surface hover:bg-surface-hover border border-hairline text-center text-xs font-semibold text-text-primary flex items-center justify-center gap-2 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Practice Another Company Target
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
