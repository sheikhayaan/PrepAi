import React, { useState } from 'react';
import { GitBranch, CornerDownRight, CheckCircle, AlertCircle, HelpCircle, ArrowRight } from 'lucide-react';

export default function TreeAnimation() {
  const [selectedPath, setSelectedPath] = useState('optimal'); // 'optimal' | 'partial' | 'alternative'

  const treePaths = {
    optimal: {
      candidateAnswer: 'I used a HashMap to store complements in O(n) time and O(n) space complexity.',
      aiEvaluation: 'High Clarity & Optimal Complexity',
      branches: [
        {
          label: 'Adaptive Deep Dive: Concurrency & Streaming',
          question: 'What if the integer array is too large to fit in RAM and is streamed over a network socket?',
          type: 'Hard Scale Follow-up',
          scoreBonus: '+1.5 System Depth',
        },
        {
          label: 'Edge-Case Probe: Duplicates & Overflows',
          question: 'How do you prevent 32-bit signed integer overflow when target is close to INT_MAX?',
          type: 'Edge Case Verification',
          scoreBonus: '+1.0 Robustness',
        },
      ],
    },
    partial: {
      candidateAnswer: 'I iterated through nested loops comparing each pair with O(n²) time complexity.',
      aiEvaluation: 'Brute Force Identified — Probing Optimization',
      branches: [
        {
          label: 'Guiding Hint: Space-Time Trade-off',
          question: 'Could we trade auxiliary memory for faster lookup time? How does a Hash Table help?',
          type: 'Adaptive Coaching Follow-up',
          scoreBonus: '+0.5 Recovery',
        },
        {
          label: 'Sorting Approach Inquiry',
          question: 'If the array was pre-sorted, how would a two-pointer approach work in O(1) extra space?',
          type: 'Conceptual Branch',
          scoreBonus: '+0.8 Algorithmic Thinking',
        },
      ],
    },
    alternative: {
      candidateAnswer: 'I sorted the array first (O(n log n)) and used two pointers with O(1) space.',
      aiEvaluation: 'Trade-off Choice: Space Optimization Over Raw O(n) Time',
      branches: [
        {
          label: 'Trade-off Defense',
          question: 'When is O(n log n) with O(1) space preferable to O(n) time with O(n) space in production?',
          type: 'Engineering Judgment',
          scoreBonus: '+1.2 Practical Architecture',
        },
      ],
    },
  };

  const current = treePaths[selectedPath];

  return (
    <div className="w-full py-10">
      <div className="glass-window rounded-2xl p-6 sm:p-8 border border-white/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8),0_0_35px_rgba(59,130,246,0.2)]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-hairline">
          <div>
            <span className="text-[11px] font-bold tracking-[0.2em] text-accent uppercase flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5" />
              ADAPTIVE STATE MACHINE DECISION TREE
            </span>
            <h3 className="text-xl sm:text-2xl font-bold text-white mt-1">
              Live Question Branching Simulator
            </h3>
            <p className="text-xs text-text-secondary mt-1">
              See how PrepAI dynamically recalibrates follow-up questions in real time based on candidate answers
            </p>
          </div>
        </div>

        {/* Path Selection Tabs */}
        <div className="flex flex-wrap gap-2.5 my-6">
          {[
            { id: 'optimal', label: 'Candidate: Optimal O(n) Hash Approach', tag: 'Optimal Path' },
            { id: 'partial', label: 'Candidate: Brute-Force O(n²) Approach', tag: 'Coaching Path' },
            { id: 'alternative', label: 'Candidate: Sorted Two-Pointer O(n log n)', tag: 'Trade-off Path' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedPath(tab.id)}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-2 ${
                selectedPath === tab.id
                  ? 'bg-accent/20 border-accent text-white shadow-[0_0_15px_rgba(91,140,255,0.4)]'
                  : 'bg-surface/60 border-hairline text-text-secondary hover:text-white hover:bg-surface-hover'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${selectedPath === tab.id ? 'bg-accent animate-ping' : 'bg-text-muted'}`} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tree Visualizer Stage */}
        <div className="space-y-4">
          {/* Root Node: Base Question */}
          <div className="p-4 rounded-xl bg-surface/90 border border-hairline relative">
            <div className="flex items-center justify-between text-[10px] text-text-muted font-mono mb-1">
              <span>ROOT QUESTION NODE</span>
              <span className="text-accent font-semibold">QUESTION BANK SEED</span>
            </div>
            <p className="text-sm font-semibold text-white">
              "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target."
            </p>
          </div>

          {/* Branch Down Arrow */}
          <div className="flex justify-center -my-2">
            <div className="w-0.5 h-6 bg-gradient-to-b from-hairline to-accent" />
          </div>

          {/* Candidate Response Node */}
          <div className="p-4 rounded-xl bg-accent/15 border border-accent/40 relative shadow-[0_0_15px_rgba(91,140,255,0.15)]">
            <div className="flex items-center justify-between text-[10px] text-text-muted font-mono mb-1">
              <span className="text-accent font-bold">CANDIDATE ANSWER INPUT</span>
              <span className="text-emerald-400 font-semibold">{current.aiEvaluation}</span>
            </div>
            <p className="text-xs sm:text-sm text-text-primary italic">
              "{current.candidateAnswer}"
            </p>
          </div>

          {/* Branch Split Visualizer */}
          <div className="flex justify-center -my-2">
            <div className="w-0.5 h-6 bg-gradient-to-b from-accent to-emerald-400" />
          </div>

          {/* Adaptive Child Nodes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {current.branches.map((branch, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-surface/80 border border-emerald-500/30 hover:border-emerald-500/60 transition-all space-y-2 shadow-lg"
              >
                <div className="flex items-center justify-between text-[10px]">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/30">
                    {branch.type}
                  </span>
                  <span className="font-mono text-accent font-semibold">{branch.scoreBonus}</span>
                </div>
                <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <CornerDownRight className="w-3.5 h-3.5 text-accent shrink-0" />
                  {branch.label}
                </h5>
                <p className="text-xs text-text-secondary leading-relaxed pl-5">
                  "{branch.question}"
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
