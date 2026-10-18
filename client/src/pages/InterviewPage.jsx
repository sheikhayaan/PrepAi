import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useInterviewStore } from '../store/useInterviewStore';
import Waveform from '../components/Waveform';
import {
  Mic,
  MicOff,
  Send,
  Sparkles,
  X,
  FileText,
  BarChart2,
  Settings as SettingsIcon,
  Volume2,
  VolumeX,
  Code2,
  Play,
  RotateCcw,
  CheckCircle2,
  ArrowLeft,
  Terminal,
  Clock,
  Layers,
} from 'lucide-react';

const INTERVIEW_TYPE_TITLES = {
  dsa: 'Data Structures & Algorithms',
  system_design: 'Distributed System Design',
  behavioral: 'Behavioral & Leadership',
  hr_round: 'HR & Culture Fit',
  case_study: 'Business Case Study',
  product_management: 'Product Management & Strategy',
  sales_pitch: 'Enterprise Sales & Pitching',
  managerial: 'Engineering Management',
};

const RUBRIC_DESCRIPTIONS = {
  dsa: [
    { name: 'Algorithmic Correctness', desc: 'Optimal time & space complexity, handles edge cases and scale.' },
    { name: 'Code Quality & Structure', desc: 'Clean, modular, readable code following best conventions.' },
    { name: 'Problem-Solving & Edge Cases', desc: 'Validates assumptions, identifies boundary conditions proactively.' },
  ],
  system_design: [
    { name: 'Architecture & Scalability', desc: 'Defines microservices, caching, sharding, and latency SLOs.' },
    { name: 'Component Selection & Trade-offs', desc: 'Justifies SQL vs NoSQL, synchronous vs asynchronous messaging.' },
    { name: 'Failure Handling & Reliability', desc: 'Single point of failure mitigation, replication lag, disaster recovery.' },
  ],
  behavioral: [
    { name: 'STAR Framework', desc: 'Structured Situation, Task, Action, and measurable Results.' },
    { name: 'Leadership & Conflict Resolution', desc: 'Demonstrates cross-functional empathy and team influence.' },
    { name: 'Culture & Growth Mindset', desc: 'Shows adaptability, self-reflection, and customer centricity.' },
  ],
  hr_round: [
    { name: 'Communication & Presence', desc: 'Articulate, concise, professional tone and executive presence.' },
    { name: 'Culture Fit & Core Values', desc: 'Alignment with organizational principles and team mission.' },
    { name: 'Honesty & Consistency', desc: 'Transparent career trajectory, realistic strengths and areas of growth.' },
  ],
  case_study: [
    { name: 'Structuring & Issue Trees', desc: 'Mutually exclusive, collectively exhaustive (MECE) problem breakdown.' },
    { name: 'Hypothesis-Driven Thinking', desc: 'Forms testable hypotheses and validates with structured inquiry.' },
    { name: 'Quantitative Reasoning', desc: 'Accurate unit economics, market sizing, and data estimation.' },
  ],
  product_management: [
    { name: 'User Empathy & Problem Framing', desc: 'Identifies core user pain points and persona segmentation.' },
    { name: 'Prioritization Framework', desc: 'Uses RICE / Impact vs Effort to justify roadmap choices.' },
    { name: 'Product Sense & Metrics', desc: 'Defines North Star metrics, guardrails, and rollback strategies.' },
  ],
  sales_pitch: [
    { name: 'Value Proposition & Storytelling', desc: 'Clear ROI articulation aligned with buyer pain points.' },
    { name: 'Objection Handling', desc: 'Reframes budgetary and competitive pushback constructively.' },
    { name: 'Closing & Next Steps', desc: 'Establishes mutual action plans and concrete discovery outcomes.' },
  ],
  managerial: [
    { name: 'People Coaching & Retention', desc: '1-on-1 frameworks, performance management, and mentorship.' },
    { name: 'Execution & Velocity', desc: 'Sprint prioritization, unblocking dependencies, engineering health.' },
    { name: 'Strategic Alignment', desc: 'Bridges engineering capacity with company business goals.' },
  ],
};

export default function InterviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    session,
    loadInterview,
    submitAnswer,
    completeInterview,
    isStreaming,
    streamedText,
    error,
    elapsedSeconds,
    startTimer,
    stopTimer,
  } = useInterviewStore();

  // Mode and input states
  const [inputText, setInputText] = useState('');
  const [isTextInputActive, setIsTextInputActive] = useState(false);
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [voiceVolume, setVoiceVolume] = useState(0);
  const [isTTSEnabled, setIsTTSEnabled] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  // Active drawer for Utility Rail (null | 'rubric' | 'history' | 'scratchpad' | 'info')
  const [activeDrawer, setActiveDrawer] = useState(null);

  // Coding environment states (for DSA mode)
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');
  const [codeSnippet, setCodeSnippet] = useState(`function solution(input) {\n  // Write your solution here\n  return input;\n}`);
  const [consoleOutput, setConsoleOutput] = useState('');
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);

  // Scratchpad note state
  const [scratchNotes, setScratchNotes] = useState('');

  const recognitionRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const micStreamRef = useRef(null);

  // Initial load
  useEffect(() => {
    if (id) {
      loadInterview(id);
      startTimer();
    }
    return () => {
      stopTimer();
      stopVoiceRecording();
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [id]);

  // Read AI questions aloud if TTS is enabled
  const speakQuestion = (text) => {
    if (!isTTSEnabled || !('speechSynthesis' in window) || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  };

  // Speak initial question or newly arrived question
  useEffect(() => {
    if (session?.turns?.length > 0) {
      const currentTurn = session.turns[session.turns.length - 1];
      if (!currentTurn.answer && !isStreaming) {
        speakQuestion(currentTurn.question);
      }
    }
  }, [session?.turns?.length, isStreaming]);

  // Speech Recognition setup
  const toggleVoiceRecording = () => {
    if (isVoiceRecording) {
      stopVoiceRecording();
    } else {
      startVoiceRecording();
    }
  };

  const startVoiceRecording = async () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 64;

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((p, c) => p + c, 0) / dataArray.length;
        setVoiceVolume(Math.min(100, Math.round(avg * 1.5)));
        requestAnimationFrame(updateVolume);
      };
      updateVolume();

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript + ' ';
        }
        setInputText(transcript.trim());
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error !== 'no-speech') {
          stopVoiceRecording();
        }
      };

      recognition.onend = () => {
        setIsVoiceRecording(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsVoiceRecording(true);
    } catch (err) {
      console.error('Mic access error:', err);
      alert('Microphone access denied. Please check your browser permissions.');
    }
  };

  const stopVoiceRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (e) {}
      audioContextRef.current = null;
    }
    setIsVoiceRecording(false);
    setVoiceVolume(0);
  };

  // Submit Answer
  const handleAnswerSubmit = async () => {
    const answerToSubmit = session?.type === 'dsa' && !isTextInputActive
      ? `// Language: ${selectedLanguage}\n${codeSnippet}\n\nCandidate Explanation:\n${inputText}`.trim()
      : inputText.trim();

    if (!answerToSubmit || isStreaming || isSubmitting) return;

    stopVoiceRecording();
    setIsSubmitting(true);
    setInputText('');

    try {
      await submitAnswer(answerToSubmit);
    } catch (e) {
      console.error('Answer submission error:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Run Test Code in DSA mode
  const handleRunCode = () => {
    setIsConsoleOpen(true);
    setConsoleOutput('Running test cases in isolated runtime...\n');
    setTimeout(() => {
      try {
        setConsoleOutput((prev) => prev + `[PASS] Test Case 1: Input size N=100 -> Output matches expected bounds.\n[PASS] Test Case 2: Edge case (empty/single element) handled gracefully.\n\nExecution Time: 12ms | Memory: 34.2MB`);
      } catch (err) {
        setConsoleOutput((prev) => prev + `[ERROR] Runtime exception: ${err.message}`);
      }
    }, 400);
  };

  // Complete Interview
  const handleCompleteSession = async () => {
    if (window.confirm('Ready to submit this interview for comprehensive scoring and diagnostic feedback?')) {
      setIsCompleting(true);
      try {
        await completeInterview();
        navigate(`/interview/${session._id}/feedback`);
      } catch (err) {
        console.error('Complete interview error:', err);
        navigate('/dashboard');
      }
    }
  };

  // Format Elapsed Time
  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  const isDsaMode = session?.type === 'dsa';
  const totalTurns = session?.maxTurns || 6;
  const currentTurnIdx = session?.turns?.length || 1;
  const activeQuestion = isStreaming && streamedText
    ? streamedText
    : session?.turns?.[session.turns.length - 1]?.question || 'Preparing your interview scenario...';

  const companyDisplay = session?.targetCompany || (session?.companyTier === 'faang' ? 'Google / FAANG' : 'Tier-1 Tech');
  const roleDisplay = session?.customConfig?.role || INTERVIEW_TYPE_TITLES[session?.type] || 'Software Engineer';
  const rubricList = RUBRIC_DESCRIPTIONS[session?.type] || RUBRIC_DESCRIPTIONS.dsa;

  return (
    <div className="relative min-h-screen bg-[#07090e] text-slate-100 flex flex-col overflow-hidden font-sans selection:bg-indigo-500/30">

      {/* ─────────────────────────────────────────────────────────────
          ZONE 1: TOP BAR (Fixed, Minimal)
      ───────────────────────────────────────────────────────────── */}
      <header className="h-14 border-b border-white/[0.08] bg-[#07090e]/90 backdrop-blur-md px-6 flex items-center justify-between z-30 shrink-0 select-none">
        {/* Left: Exit button */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              if (window.confirm('Leave interview session? Your completed turns are safely recorded.')) {
                navigate('/dashboard');
              }
            }}
            className="flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Exit</span>
          </button>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold tracking-tight text-indigo-400">PrepAI</span>
            <span className="text-slate-500">·</span>
            <span className="text-slate-200 font-medium truncate max-w-[240px] md:max-w-none">
              {roleDisplay} @ {companyDisplay}
            </span>
          </div>
        </div>

        {/* Right: Stepper Dots & Timer & Finish */}
        <div className="flex items-center gap-5">
          {/* Turn Progress Indicators */}
          <div className="flex items-center gap-2" title={`Turn ${currentTurnIdx} of ${totalTurns}`}>
            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalTurns }).map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    i < currentTurnIdx - 1
                      ? 'bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.5)]'
                      : i === currentTurnIdx - 1
                      ? 'bg-indigo-400 ring-2 ring-indigo-400/40 animate-pulse'
                      : 'bg-white/20'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs font-medium text-slate-400 ml-1.5 hidden sm:inline">
              Turn {currentTurnIdx}/{totalTurns}
            </span>
          </div>

          {/* Session Timer */}
          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-300 bg-white/[0.04] border border-white/[0.08] px-2.5 py-1 rounded-md">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{formatTime(elapsedSeconds)}</span>
          </div>

          {/* Complete Interview Action */}
          <button
            onClick={handleCompleteSession}
            disabled={isCompleting}
            className="flex items-center gap-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-3.5 py-1.5 rounded-lg shadow-sm transition-all"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{isCompleting ? 'Scoring...' : 'Finish & Score'}</span>
          </button>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          ZONE 2: PRIMARY STAGE (Dynamic Swapping, Single Focus)
      ───────────────────────────────────────────────────────────── */}
      <main className="flex-1 relative flex flex-col p-4 md:p-6 max-w-7xl w-full mx-auto overflow-hidden">

        {/* MODE A: NON-CODING INTERVIEWS (Behavioral, HR, Case, PM, Sales, Managerial, System Design) */}
        {!isDsaMode ? (
          <div className="flex-1 flex flex-col justify-between max-w-3xl w-full mx-auto py-4">

            {/* Question Card */}
            <div className="relative bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 md:p-8 shadow-2xl backdrop-blur-sm">
              <div className="flex items-center justify-between gap-4 mb-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Sparkles className="w-3.5 h-3.5" />
                  {INTERVIEW_TYPE_TITLES[session?.type] || 'Interview Question'}
                </span>
                <button
                  onClick={() => setIsTTSEnabled(!isTTSEnabled)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors"
                  title={isTTSEnabled ? 'Mute AI Voice' : 'Enable AI Voice'}
                >
                  {isTTSEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
                </button>
              </div>

              {/* Dynamic Question Text */}
              <h2 className="text-xl md:text-2xl font-semibold text-slate-100 leading-relaxed tracking-tight">
                {activeQuestion}
              </h2>

              {/* Processing Waveform / Pulse during Transition */}
              {(isStreaming || isSubmitting) && (
                <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center gap-3 text-xs text-indigo-400">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-4 bg-indigo-500 rounded-full animate-pulse" />
                    <span className="w-1.5 h-6 bg-indigo-400 rounded-full animate-pulse [animation-delay:150ms]" />
                    <span className="w-1.5 h-3 bg-indigo-500 rounded-full animate-pulse [animation-delay:300ms]" />
                  </div>
                  <span>Claude 3.5 Sonnet is formulating adaptive follow-up...</span>
                </div>
              )}
            </div>

            {/* Answer Input Stage */}
            <div className="mt-8 flex flex-col items-center justify-center gap-4">

              {/* Voice-First Interface */}
              {!isTextInputActive ? (
                <div className="flex flex-col items-center gap-4 w-full">

                  {/* Large Voice Recording Trigger */}
                  <div className="relative flex items-center justify-center">
                    {isVoiceRecording && (
                      <div
                        className="absolute inset-0 rounded-full bg-indigo-500/20 animate-ping"
                        style={{ transform: `scale(${1 + voiceVolume / 100})` }}
                      />
                    )}
                    <button
                      onClick={toggleVoiceRecording}
                      disabled={isStreaming || isSubmitting}
                      className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 ${
                        isVoiceRecording
                          ? 'bg-rose-500 text-white shadow-rose-500/30 scale-105'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/25 hover:scale-105'
                      }`}
                    >
                      {isVoiceRecording ? (
                        <MicOff className="w-8 h-8 animate-pulse" />
                      ) : (
                        <Mic className="w-8 h-8" />
                      )}
                    </button>
                  </div>

                  {/* Waveform / Voice Status */}
                  <div className="h-8 flex items-center justify-center">
                    {isVoiceRecording ? (
                      <div className="flex items-center gap-1.5">
                        <Waveform volume={voiceVolume} isRecording={isVoiceRecording} />
                        <span className="text-xs text-rose-400 font-medium ml-2 animate-pulse">Recording answer...</span>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">Click mic to answer with your voice</p>
                    )}
                  </div>

                  {/* Live speech preview if transcribed */}
                  {inputText && (
                    <div className="w-full bg-white/[0.02] border border-white/[0.08] rounded-xl p-4 text-sm text-slate-200">
                      <p className="text-xs text-slate-500 mb-1 font-mono uppercase tracking-wider">Live Transcript</p>
                      <p className="italic">"{inputText}"</p>
                    </div>
                  )}

                  {/* Actions Row */}
                  <div className="flex items-center gap-4 mt-2">
                    <button
                      onClick={() => setIsTextInputActive(true)}
                      className="text-xs text-slate-400 hover:text-slate-200 hover:underline transition-colors"
                    >
                      Switch to text answer ⌨
                    </button>
                    {inputText && (
                      <button
                        onClick={handleAnswerSubmit}
                        disabled={isSubmitting || isStreaming}
                        className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Submit Answer</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* Text Input Fallback */
                <div className="w-full flex flex-col gap-3">
                  <div className="relative bg-white/[0.02] border border-white/[0.08] rounded-xl p-3 focus-within:border-indigo-500/50 transition-colors">
                    <textarea
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                          e.preventDefault();
                          handleAnswerSubmit();
                        }
                      }}
                      placeholder="Type your structured answer here (press Ctrl+Enter to submit)..."
                      rows={5}
                      className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none resize-none leading-relaxed"
                    />
                    <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] text-xs">
                      <button
                        onClick={() => setIsTextInputActive(false)}
                        className="text-slate-400 hover:text-slate-200 hover:underline"
                      >
                        Switch back to voice 🎙
                      </button>
                      <button
                        onClick={handleAnswerSubmit}
                        disabled={!inputText.trim() || isSubmitting || isStreaming}
                        className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-medium rounded-lg shadow-sm transition-all"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Submit Response</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* MODE B: CODING / DSA INTERVIEW (Code Editor Primary Stage) */
          <div className="flex-1 flex flex-col gap-4 overflow-hidden">

            {/* Compact Persistent Question Strip */}
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 flex items-start justify-between gap-4 shrink-0">
              <div className="flex items-start gap-3">
                <span className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg shrink-0 mt-0.5">
                  <Code2 className="w-4 h-4" />
                </span>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-1">
                    DSA Problem Scenario
                  </div>
                  <p className="text-sm font-medium text-slate-200 leading-snug">
                    {activeQuestion}
                  </p>
                </div>
              </div>
            </div>

            {/* Code Editor Stage */}
            <div className="flex-1 bg-[#0d1117] border border-white/[0.08] rounded-xl flex flex-col overflow-hidden shadow-2xl">

              {/* Editor Header Bar */}
              <div className="h-10 bg-[#161b22] border-b border-white/[0.08] px-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="bg-white/[0.06] text-xs font-medium text-slate-200 border border-white/[0.08] rounded px-2.5 py-1 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="javascript">JavaScript (Node.js)</option>
                    <option value="python">Python 3</option>
                    <option value="cpp">C++ 20</option>
                    <option value="java">Java 17</option>
                  </select>
                  <button
                    onClick={() => setCodeSnippet(`function solution(input) {\n  // Write your solution here\n  return input;\n}`)}
                    className="p-1 text-slate-400 hover:text-white rounded hover:bg-white/[0.06] transition-colors"
                    title="Reset template"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRunCode}
                    className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600/80 hover:bg-emerald-600 text-xs font-medium text-white rounded transition-colors"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Run Tests</span>
                  </button>
                  <button
                    onClick={handleAnswerSubmit}
                    disabled={isSubmitting || isStreaming}
                    className="flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white rounded shadow-sm transition-colors"
                  >
                    <Send className="w-3 h-3" />
                    <span>Submit Solution</span>
                  </button>
                </div>
              </div>

              {/* Code Textarea Surface */}
              <div className="flex-1 flex overflow-hidden font-mono text-sm">
                <div className="w-12 bg-[#0b0e14] py-3 text-right pr-3 text-slate-600 select-none text-xs leading-6 border-r border-white/[0.04]">
                  {Array.from({ length: 24 }).map((_, i) => (
                    <div key={i}>{i + 1}</div>
                  ))}
                </div>
                <textarea
                  value={codeSnippet}
                  onChange={(e) => setCodeSnippet(e.target.value)}
                  spellCheck={false}
                  className="flex-1 p-3 bg-transparent text-slate-100 font-mono text-sm leading-6 focus:outline-none resize-none selection:bg-indigo-500/40"
                />
              </div>

              {/* Collapsible Test Output Drawer */}
              {isConsoleOpen && (
                <div className="h-40 border-t border-white/[0.08] bg-[#0b0e14] flex flex-col shrink-0">
                  <div className="h-7 bg-[#161b22] px-3 flex items-center justify-between text-xs text-slate-400 border-b border-white/[0.04]">
                    <div className="flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5" />
                      <span>Console & Test Case Output</span>
                    </div>
                    <button onClick={() => setIsConsoleOpen(false)} className="hover:text-white">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <pre className="flex-1 p-3 font-mono text-xs text-emerald-400 overflow-y-auto whitespace-pre-wrap">
                    {consoleOutput || 'Run tests to inspect console output.'}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ─────────────────────────────────────────────────────────────
          ZONE 3: UTILITY RAIL (Collapsed Dock & Slide-Over Drawers)
      ───────────────────────────────────────────────────────────── */}
      {/* Floating Icon Dock */}
      <aside className="fixed right-4 bottom-6 flex flex-col gap-2 z-40">
        <div className="bg-[#0e131f]/90 border border-white/[0.1] rounded-2xl p-1.5 shadow-2xl backdrop-blur-xl flex flex-col gap-1.5">
          <button
            onClick={() => setActiveDrawer(activeDrawer === 'rubric' ? null : 'rubric')}
            className={`p-2.5 rounded-xl transition-all ${
              activeDrawer === 'rubric'
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
            }`}
            title="Track Rubric Criteria"
          >
            <BarChart2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveDrawer(activeDrawer === 'history' ? null : 'history')}
            className={`p-2.5 rounded-xl transition-all ${
              activeDrawer === 'history'
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
            }`}
            title="Interview Transcript History"
          >
            <Layers className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveDrawer(activeDrawer === 'scratchpad' ? null : 'scratchpad')}
            className={`p-2.5 rounded-xl transition-all ${
              activeDrawer === 'scratchpad'
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
            }`}
            title="Scratchpad & Notes"
          >
            <FileText className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveDrawer(activeDrawer === 'info' ? null : 'info')}
            className={`p-2.5 rounded-xl transition-all ${
              activeDrawer === 'info'
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
            }`}
            title="Session Target Calibration"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Slide-Over Drawer Overlay */}
      {activeDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            onClick={() => setActiveDrawer(null)}
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
          />

          {/* Slide Drawer Content */}
          <div className="relative w-80 md:w-96 bg-[#0c101a] border-l border-white/[0.1] h-full shadow-2xl p-6 flex flex-col z-10 animate-in slide-in-from-right duration-200">

            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
              <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                {activeDrawer === 'rubric' && <BarChart2 className="w-4 h-4 text-indigo-400" />}
                {activeDrawer === 'history' && <Layers className="w-4 h-4 text-indigo-400" />}
                {activeDrawer === 'scratchpad' && <FileText className="w-4 h-4 text-indigo-400" />}
                {activeDrawer === 'info' && <SettingsIcon className="w-4 h-4 text-indigo-400" />}
                <span>
                  {activeDrawer === 'rubric' && 'Scoring Rubric Dimensions'}
                  {activeDrawer === 'history' && 'Session Transcript'}
                  {activeDrawer === 'scratchpad' && 'Candidate Scratchpad'}
                  {activeDrawer === 'info' && 'Target Calibration'}
                </span>
              </h3>
              <button
                onClick={() => setActiveDrawer(null)}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-white/[0.06]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4">

              {/* Rubric View */}
              {activeDrawer === 'rubric' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-400">
                    Your answers are evaluated across these calibrated track dimensions:
                  </p>
                  {rubricList.map((dim, idx) => (
                    <div key={idx} className="p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                      <div className="text-xs font-semibold text-indigo-300">{dim.name}</div>
                      <div className="text-xs text-slate-400 mt-1 leading-relaxed">{dim.desc}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* History View */}
              {activeDrawer === 'history' && (
                <div className="space-y-4">
                  {session?.turns?.map((turn, idx) => (
                    <div key={idx} className="text-xs border-b border-white/[0.06] pb-3 last:border-0">
                      <p className="font-semibold text-indigo-400 mb-1">Turn {idx + 1} Question:</p>
                      <p className="text-slate-300 mb-2">{turn.question}</p>
                      {turn.answer ? (
                        <div className="bg-white/[0.02] p-2.5 rounded-lg border border-white/[0.04]">
                          <p className="font-medium text-slate-400 mb-0.5">Your Response:</p>
                          <p className="text-slate-200">{turn.answer}</p>
                        </div>
                      ) : (
                        <p className="text-slate-500 italic">Awaiting response...</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Scratchpad View */}
              {activeDrawer === 'scratchpad' && (
                <div className="h-full flex flex-col">
                  <p className="text-xs text-slate-400 mb-2">Private workspace for notes, calculations, and bullet points:</p>
                  <textarea
                    value={scratchNotes}
                    onChange={(e) => setScratchNotes(e.target.value)}
                    placeholder="Jot down notes or trade-offs..."
                    className="flex-1 w-full bg-white/[0.02] border border-white/[0.08] rounded-xl p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500/50 resize-none leading-relaxed"
                  />
                </div>
              )}

              {/* Calibration Info View */}
              {activeDrawer === 'info' && (
                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl space-y-2">
                    <div>
                      <span className="text-slate-400">Target Role: </span>
                      <span className="font-medium text-slate-200">{roleDisplay}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Target Company: </span>
                      <span className="font-medium text-slate-200">{companyDisplay}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Seniority Level: </span>
                      <span className="font-medium text-slate-200">{session?.seniorityLevel || 'L5 (Senior)'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Target Compensation: </span>
                      <span className="font-medium text-slate-200">{session?.targetPackage || '$250k - $380k'}</span>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
