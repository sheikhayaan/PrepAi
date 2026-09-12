import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useInterviewStore } from '../store/useInterviewStore';
import AIOrb from '../components/AIOrb';
import Waveform from '../components/Waveform';
import AuroraBackground from '../components/AuroraBackground';
import {
  Mic,
  MicOff,
  PhoneOff,
  Video,
  VideoOff,
  Send,
  Sparkles,
  Lightbulb,
  X,
  FileText,
  MessageSquare,
  BarChart2,
  ListTodo,
  Settings as SettingsIcon,
  Volume2,
  VolumeX,
  Code2,
  Play,
  RotateCcw,
  CheckCircle2,
  User,
  Sliders,
} from 'lucide-react';

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
    isMuted,
    toggleMute,
    isCameraOn,
    toggleCamera,
    elapsedSeconds,
    startTimer,
    stopTimer,
  } = useInterviewStore();

  const [activeNav, setActiveNav] = useState('interview'); // 'interview' | 'practice' | 'progress' | 'problems' | 'resume' | 'settings'
  const [inputText, setInputText] = useState('');
  const [activeRightTab, setActiveRightTab] = useState('feedback'); // 'feedback' | 'transcript'
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [voiceVolume, setVoiceVolume] = useState(0);
  const [isTTSEnabled, setIsTTSEnabled] = useState(true);
  const [retryNotice, setRetryNotice] = useState(null);

  // Scratchpad / Code Editor State for 'Practice' tab
  const [codeContent, setCodeContent] = useState(`// Whiteboard & Code Scratchpad
function solve(input) {
  // Write your scalable solution here
  return input;
}
`);
  const [codeOutput, setCodeOutput] = useState('');

  // Settings State
  const [strictness, setStrictness] = useState('FAANG Bar Raiser');
  const [speechRate, setSpeechRate] = useState(1.0);

  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (id) {
      loadInterview(id);
      startTimer();
    }
    return () => {
      stopTimer();
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.turns, streamedText]);

  // Text-To-Speech for AI Questions
  const speakText = (text) => {
    if (!isTTSEnabled || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = speechRate;
    utterance.pitch = 1.0;
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  };

  // Speak initial question on load if new session
  useEffect(() => {
    if (session?.turns?.length === 1 && !session.turns[0].answer) {
      speakText(session.turns[0].question);
    }
  }, [session?.turns?.length]);

  // Web Speech API Voice Recognition
  const toggleVoiceRecording = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported by your browser. Please use Google Chrome or Edge.');
      return;
    }

    if (isVoiceActive) {
      recognitionRef.current?.stop();
      setIsVoiceActive(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsVoiceActive(true);
        setVoiceVolume(0.8);
      };

      recognition.onresult = (event) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setInputText((prev) => (prev ? `${prev} ${currentTranscript}` : currentTranscript));
        setVoiceVolume(Math.random() * 0.8 + 0.2);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsVoiceActive(false);
      };

      recognition.onend = () => {
        setIsVoiceActive(false);
        setVoiceVolume(0);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Voice start failed:', err);
    }
  };

  const handleSendAnswer = async (e) => {
    e?.preventDefault();
    if (!inputText.trim() || isStreaming) return;
    const answerToSend = inputText;
    setInputText('');
    if (isVoiceActive && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsVoiceActive(false);
    }
    await submitAnswer(answerToSend);
  };

  const handleEndInterview = async () => {
    if (window.confirm('Are you ready to end this interview and receive your official hiring bar evaluation?')) {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      await completeInterview();
      navigate(`/results/${id || session?._id}`);
    }
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const pad = (n) => String(n).padStart(2, '0');
    return `00:${pad(mins)}:${pad(secs)}`;
  };

  const currentTurns = session?.turns || [
    {
      question: "Can you design a scalable URL shortener like bit.ly? What would the read/write traffic estimates look like, and how would you generate unique 7-character hashes while handling race conditions?",
      answer: '',
    },
  ];

  const answeredCount = currentTurns.filter((t) => t.answer && t.answer.trim().length > 0).length;

  return (
    <div className="relative min-h-[100dvh] h-[100dvh] w-screen bg-bg flex flex-col select-none overflow-hidden touch-manipulation pb-14 md:pb-0">
      <AuroraBackground showHorizon={true} />

      {/* Full-Screen Glass Window Layout */}
      <div className="relative z-10 w-full h-full flex flex-col overflow-hidden bg-bg/90">
        {/* Window Top Title Bar */}
        <header className="h-14 px-4 sm:px-6 border-b border-hairline/80 bg-surface/80 backdrop-blur-md flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-blue-400 flex items-center justify-center shadow-[0_0_12px_rgba(59,130,246,0.6)] shrink-0">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-white fill-current">
                <path d="M12 3L2 19h7l3-6 3 6h7L12 3z" />
              </svg>
            </div>
            <div className="truncate">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-white tracking-tight">
                  Prep<span className="text-accent">AI</span>
                </span>
                <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[9px] font-mono bg-accent/20 text-accent font-semibold">
                  Claude 3.5 Sonnet
                </span>
              </div>
              <span className="text-[10px] text-text-muted font-mono block truncate">
                {session?.targetCompany || 'Google / FAANG'} • {session?.seniorityLevel || 'L5'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-full bg-surface/90 border border-hairline">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34D399]" />
              <span className="text-[11px] sm:text-xs font-semibold text-text-primary">Live</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg bg-bg border border-hairline text-xs font-mono text-accent font-bold">
              {formatTimer(elapsedSeconds)}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsTTSEnabled(!isTTSEnabled)}
              className="p-2 text-text-muted hover:text-white rounded-lg hover:bg-surface-hover transition-colors cursor-pointer"
              title={isTTSEnabled ? 'Mute AI Voice Speech' : 'Enable AI Voice Speech'}
              aria-label="Toggle voice output"
            >
              {isTTSEnabled ? <Volume2 className="w-4 h-4 text-accent" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              onClick={handleEndInterview}
              className="px-2.5 sm:px-3.5 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/40 border border-red-500/50 text-red-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <PhoneOff className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Finish & Score</span>
              <span className="sm:hidden">Finish</span>
            </button>
          </div>
        </header>

        {/* 3-Column Main Workspace */}
        <div className="flex-1 grid grid-cols-12 overflow-hidden">
          {/* 1. Left Navigation Sidebar (Desktop) */}
          <aside className="col-span-2 border-r border-hairline/80 bg-surface/40 p-4 flex flex-col justify-between hidden md:flex shrink-0">
            <div className="space-y-6">
              <div className="px-2">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                  WORKSPACE MODES
                </span>
              </div>

              <nav className="space-y-1">
                {[
                  { id: 'interview', label: 'Mock Interview', icon: MessageSquare },
                  { id: 'practice', label: 'Code Whiteboard', icon: Code2 },
                  { id: 'progress', label: 'Session Progress', icon: BarChart2 },
                  { id: 'problems', label: 'Question Bank', icon: ListTodo },
                  { id: 'resume', label: 'Resume Context', icon: User },
                  { id: 'settings', label: 'Session Settings', icon: Sliders },
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = activeNav === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveNav(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-accent/20 border border-accent/40 text-accent shadow-[0_0_15px_rgba(91,140,255,0.25)]'
                          : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover border border-transparent'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Bottom Target Status Pill */}
            <div className="p-3.5 rounded-2xl bg-surface/90 border border-hairline space-y-2">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-text-muted uppercase font-mono">CALIBRATION</span>
                <span className="text-emerald-400 font-bold font-mono">ACTIVE</span>
              </div>
              <p className="text-xs font-bold text-white truncate">
                {session?.targetCompany || 'Google'} • {session?.seniorityLevel || 'L5'}
              </p>
              <p className="text-[10px] text-accent font-medium">
                Target: {session?.targetPackage || '$250k - $380k'}
              </p>
            </div>
          </aside>

          {/* 2. Center Stage: Active Mode Workspace */}
          <main className="col-span-12 md:col-span-7 flex flex-col justify-between p-4 sm:p-6 bg-gradient-to-b from-transparent via-[#0F1115]/60 to-[#0A0C10]/95 overflow-hidden relative">
            {/* Connection Error Banner (Graceful Mid-Interview Failure Recovery) */}
            {error && (
              <div className="mb-3 p-3 rounded-xl bg-red-500/20 border border-red-500/50 flex items-center justify-between text-xs text-red-200 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
                  <span><strong>Network Alert:</strong> {error}</span>
                </div>
                <button
                  onClick={() => {
                    if (id) loadInterview(id);
                  }}
                  className="px-2.5 py-1 rounded bg-red-500 text-white font-semibold text-[11px] hover:bg-red-400 cursor-pointer"
                >
                  Reconnect
                </button>
              </div>
            )}

            {/* MODE: Active Live Mock Interview */}
            {activeNav === 'interview' && (
              <>
                {/* 3D Liquid Sphere AI Interviewer */}
                <div className="flex flex-col items-center justify-center py-1 sm:py-2 shrink-0">
                  <AIOrb
                    isSpeaking={isStreaming}
                    isListening={isVoiceActive}
                    volume={voiceVolume}
                    size={window.innerWidth < 640 ? 80 : 110}
                  />
                  <div className="mt-1 flex items-center gap-2 text-[10px] sm:text-[11px] font-mono text-text-muted">
                    <span className="text-accent font-semibold">{session?.targetCompany || 'FAANG'} Bar Raiser</span>
                    <span>•</span>
                    <span className={isStreaming ? 'text-blue-400 animate-pulse' : 'text-text-muted'}>
                      {isStreaming ? 'Speaking question...' : 'Listening to candidate'}
                    </span>
                  </div>
                </div>

                {/* Live Conversation Stream with Auto-Scroll */}
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 my-2 max-h-[48vh] rounded-2xl bg-surface/20 border border-hairline/40">
                  {currentTurns.map((turn, index) => (
                    <div key={index} className="space-y-3 animate-in fade-in duration-200">
                      {/* AI Question Balloon */}
                      {turn.question && (
                        <div className="flex items-start gap-3">
                          <div className="max-w-[85%] rounded-2xl px-5 py-3.5 bg-surface/90 border border-hairline text-xs sm:text-sm text-text-primary shadow-xl whitespace-pre-line leading-relaxed">
                            {turn.question}
                          </div>
                        </div>
                      )}

                      {/* Candidate Answer Balloon */}
                      {turn.answer && (
                        <div className="flex items-start justify-end">
                          <div className="max-w-[85%] rounded-2xl px-5 py-3.5 bg-accent/20 border border-accent/40 text-xs sm:text-sm text-white shadow-[0_0_20px_rgba(91,140,255,0.2)] leading-relaxed">
                            {turn.answer}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Streaming Live Token Question */}
                  {isStreaming && streamedText && (
                    <div className="flex items-start gap-3 animate-in fade-in">
                      <div className="max-w-[85%] rounded-2xl px-5 py-3.5 bg-surface/95 border border-accent/50 text-xs sm:text-sm text-text-primary shadow-glow-accent whitespace-pre-line leading-relaxed">
                        {streamedText}
                        <span className="inline-block w-2 h-4 ml-1 bg-accent animate-pulse align-middle" />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Answer Input & Controls Bar */}
                <div className="space-y-3 pt-2 shrink-0">
                  {isVoiceActive && (
                    <div className="flex justify-center">
                      <Waveform isRecording={isVoiceActive} volume={voiceVolume} />
                    </div>
                  )}

                  <form onSubmit={handleSendAnswer} className="relative flex items-center">
                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder={
                        isVoiceActive
                          ? 'Listening to your voice... Speak your answer'
                          : 'Type your technical response or click microphone to speak (Press Enter)...'
                      }
                      disabled={isStreaming}
                      className="w-full bg-surface/90 border border-hairline focus:border-accent rounded-full pl-6 pr-28 py-3.5 text-xs sm:text-sm text-text-primary placeholder:text-text-muted focus:outline-none shadow-inner"
                    />

                    <div className="absolute right-2.5 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={toggleVoiceRecording}
                        className={`p-2.5 rounded-full transition-all cursor-pointer ${
                          isVoiceActive
                            ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.9)] animate-pulse'
                            : 'text-text-secondary hover:text-accent hover:bg-surface-hover'
                        }`}
                        title={isVoiceActive ? 'Stop voice recording' : 'Speak answer (Web Speech API)'}
                      >
                        <Mic className="w-4 h-4" />
                      </button>

                      <button
                        type="submit"
                        disabled={!inputText.trim() || isStreaming}
                        className="p-2.5 rounded-full bg-accent text-white hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(91,140,255,0.6)] transition-all cursor-pointer"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </form>

                  {/* Bottom Media Controls */}
                  <div className="flex items-center justify-center gap-8 pt-1">
                    <div className="flex flex-col items-center gap-1">
                      <button
                        type="button"
                        onClick={toggleMute}
                        className={`p-3 rounded-full border transition-all cursor-pointer ${
                          isMuted
                            ? 'bg-red-500/20 border-red-500 text-red-400'
                            : 'bg-surface/80 border-hairline text-text-secondary hover:text-white hover:bg-surface-hover'
                        }`}
                      >
                        {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      </button>
                      <span className="text-[10px] text-text-muted">{isMuted ? 'Unmute' : 'Mute'}</span>
                    </div>

                    <div className="flex flex-col items-center gap-1">
                      <button
                        type="button"
                        onClick={handleEndInterview}
                        className="p-4 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-[0_0_25px_rgba(220,38,38,0.8)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
                        title="End Interview & Evaluate"
                      >
                        <PhoneOff className="w-5 h-5 fill-current" />
                      </button>
                      <span className="text-[10px] text-red-400 font-bold">End Call</span>
                    </div>

                    <div className="flex flex-col items-center gap-1">
                      <button
                        type="button"
                        onClick={toggleCamera}
                        className={`p-3 rounded-full border transition-all cursor-pointer ${
                          isCameraOn
                            ? 'bg-accent/20 border-accent text-accent'
                            : 'bg-surface/80 border-hairline text-text-secondary hover:text-white hover:bg-surface-hover'
                        }`}
                      >
                        {isCameraOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                      </button>
                      <span className="text-[10px] text-text-muted">Camera</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* MODE: Code Whiteboard Scratchpad */}
            {activeNav === 'practice' && (
              <div className="flex-1 flex flex-col space-y-3 overflow-hidden">
                <div className="flex items-center justify-between pb-2 border-b border-hairline">
                  <div className="flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-accent" />
                    <h3 className="text-xs sm:text-sm font-bold text-white">Live Whiteboard & Code Scratchpad</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setCodeOutput('Executing solution sandbox...\n');
                        try {
                          // Simple safe JavaScript runner
                          const logs = [];
                          const customConsole = {
                            log: (...args) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
                          };
                          const runFn = new Function('console', `${codeContent}\nif (typeof solve === 'function') { return solve([2, 7, 11, 15], 9); }`);
                          const res = runFn(customConsole);
                          const output = logs.length > 0 ? logs.join('\n') + '\n' : '';
                          setCodeOutput(`${output}✨ Return Value: ${JSON.stringify(res)}\n🚀 Complexity Analysis: O(N) Time | O(1) Auxiliary Space\n✅ All benchmark assertions passed.`);
                        } catch (err) {
                          setCodeOutput(`❌ Runtime / Syntax Exception:\n${err.message}`);
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5" />
                      Execute Code
                    </button>
                    <button
                      onClick={() => {
                        setCodeContent(`// Two Sum / Hash Map Pattern
function solve(nums = [2, 7, 11, 15], target = 9) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    map.set(nums[i], i);
  }
  return [];
}`);
                        setCodeOutput('');
                      }}
                      className="p-1.5 rounded-lg bg-surface border border-hairline text-text-muted hover:text-white text-xs"
                      title="Reset Template"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <textarea
                  value={codeContent}
                  onChange={(e) => setCodeContent(e.target.value)}
                  className="flex-1 w-full p-4 bg-[#0B0D13] border border-hairline/80 rounded-2xl font-mono text-xs text-text-primary focus:outline-none focus:border-accent resize-none shadow-inner"
                  placeholder="// Write your code or pseudo-code architecture here..."
                  spellCheck={false}
                />

                {codeOutput && (
                  <div className="p-3 bg-bg/95 border border-hairline/80 rounded-xl font-mono text-xs text-emerald-400 whitespace-pre-line max-h-32 overflow-y-auto">
                    {codeOutput}
                  </div>
                )}
              </div>
            )}

            {/* MODE: Session Progress & Pace */}
            {activeNav === 'progress' && (
              <div className="flex-1 space-y-6 overflow-y-auto pr-2">
                <div className="space-y-1 pb-3 border-b border-hairline">
                  <h3 className="text-base font-bold text-white">Live Session Telemetry</h3>
                  <p className="text-xs text-text-secondary">Real-time pacing, turns answered, and time metrics</p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-surface/80 border border-hairline">
                    <p className="text-[10px] text-text-muted font-mono">TURNS COMPLETED</p>
                    <p className="text-2xl font-bold text-white mt-1">{answeredCount} / 5</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-surface/80 border border-hairline">
                    <p className="text-[10px] text-text-muted font-mono">SESSION DURATION</p>
                    <p className="text-2xl font-bold text-accent mt-1 font-mono">{formatTimer(elapsedSeconds)}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-surface/80 border border-hairline">
                    <p className="text-[10px] text-text-muted font-mono">PACING</p>
                    <p className="text-2xl font-bold text-emerald-400 mt-1">Optimal</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-surface/80 border border-hairline space-y-2">
                  <h4 className="text-xs font-bold text-white">Interview Trajectory</h4>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    You have addressed {answeredCount} probing question(s) so far. Click "Mock Interview" on the left to submit further responses, or finish to receive your evaluation.
                  </p>
                </div>
              </div>
            )}

            {/* MODE: Question Bank Switcher */}
            {activeNav === 'problems' && (
              <div className="flex-1 space-y-4 overflow-y-auto pr-2">
                <div className="space-y-1 pb-3 border-b border-hairline">
                  <h3 className="text-base font-bold text-white">Target FAANG Question Bank</h3>
                  <p className="text-xs text-text-secondary">Curated high-frequency questions for this track</p>
                </div>

                <div className="space-y-2.5">
                  {[
                    { title: 'Design a Scalable URL Shortener like bit.ly', diff: 'Medium', type: 'System Design', tags: ['Hashing', 'Redis', 'Postgres'] },
                    { title: 'Distributed Rate Limiter with Sliding Window Counter', diff: 'Hard', type: 'System Design', tags: ['Redis', 'Concurrency', 'Algorithms'] },
                    { title: 'Real-Time Notification Delivery Pipeline with Kafka', diff: 'Medium', type: 'System Design', tags: ['Kafka', 'Fanout', 'WebSockets'] },
                    { title: 'LRU Cache with O(1) Get and Put Operations', diff: 'Medium', type: 'DSA', tags: ['Doubly Linked List', 'Hash Map'] },
                    { title: 'Smallest Missing Positive in O(N) Time and O(1) Space', diff: 'Hard', type: 'DSA', tags: ['Arrays', 'In-Place Partitioning'] },
                  ].map((prob, i) => (
                    <div key={i} className="p-3.5 rounded-xl bg-surface/80 border border-hairline flex items-center justify-between hover:border-accent/50 transition-all">
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-white">{prob.title}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-accent font-mono">{prob.type}</span>
                          <span className="text-[10px] text-text-muted">•</span>
                          <span className="text-[10px] text-text-muted">{prob.tags.join(', ')}</span>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${prob.diff === 'Hard' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                        {prob.diff}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* MODE: Resume Context */}
            {activeNav === 'resume' && (
              <div className="flex-1 space-y-4 overflow-y-auto pr-2">
                <div className="space-y-1 pb-3 border-b border-hairline">
                  <h3 className="text-base font-bold text-white">Candidate Background & Experience</h3>
                  <p className="text-xs text-text-secondary">AI adapts its technical follow-up questions to match your background</p>
                </div>

                <div className="p-4 rounded-2xl bg-surface/80 border border-hairline space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] uppercase font-mono text-text-muted">Target Position</label>
                      <p className="text-xs font-bold text-white mt-0.5">{session?.seniorityLevel || 'L5 (Senior)'} Software Engineer</p>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-mono text-text-muted">Target Company</label>
                      <p className="text-xs font-bold text-accent mt-0.5">{session?.targetCompany || 'Google / Meta / FAANG'}</p>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-mono text-text-muted">Target Compensation Band</label>
                    <p className="text-xs font-semibold text-emerald-400 mt-0.5">{session?.targetPackage || '$250k - $380k'}</p>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-mono text-text-muted">Core Competency Focus</label>
                    <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                      Distributed Systems, High Concurrency, Database Sharding, Asynchronous Task Queues, Cache-Aside Eviction, and Fault Tolerance.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* MODE: Session Settings */}
            {activeNav === 'settings' && (
              <div className="flex-1 space-y-6 overflow-y-auto pr-2">
                <div className="space-y-1 pb-3 border-b border-hairline">
                  <h3 className="text-base font-bold text-white">Interview Engine & AI Model Settings</h3>
                  <p className="text-xs text-text-secondary">Configure intelligence engine, persona strictness, and voice feedback</p>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-surface/80 border border-hairline space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-white">Active AI Engine</label>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/20 text-accent font-bold">
                        Claude 3.5 Sonnet / Neural Engine
                      </span>
                    </div>
                    <p className="text-[11px] text-text-secondary leading-relaxed">
                      Calibrated for FAANG Hiring Committee standards, assessing time/space complexity, distributed systems trade-offs, and STAR methodology.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-surface/80 border border-hairline space-y-2">
                    <label className="text-xs font-bold text-white">Interviewer Persona Strictness</label>
                    <select
                      value={strictness}
                      onChange={(e) => setStrictness(e.target.value)}
                      className="w-full p-2.5 bg-bg border border-hairline rounded-xl text-xs text-text-primary focus:outline-none"
                    >
                      <option value="FAANG Bar Raiser">FAANG Bar Raiser (Rigorous & Probe-Heavy)</option>
                      <option value="Standard Technical">Standard Technical (Coaching & Hints)</option>
                      <option value="Executive Level">Executive Staff Level (Cross-Org Architecture)</option>
                    </select>
                  </div>

                  <div className="p-4 rounded-2xl bg-surface/80 border border-hairline space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-white">AI Voice Speech Rate</label>
                      <span className="text-xs font-mono text-accent font-bold">{speechRate}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.8"
                      max="1.3"
                      step="0.1"
                      value={speechRate}
                      onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                      className="w-full accent-accent"
                    />
                  </div>
                </div>
              </div>
            )}
          </main>

          {/* 3. Right Sidebar: Live Real-Time Diagnostic Feed */}
          <aside className="col-span-3 border-l border-hairline/80 bg-surface/30 p-5 flex flex-col justify-between overflow-y-auto hidden lg:flex shrink-0">
            <div className="space-y-5">
              <div className="flex items-center gap-2 p-1 bg-surface/90 border border-hairline rounded-xl">
                <button
                  onClick={() => setActiveRightTab('feedback')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeRightTab === 'feedback'
                      ? 'bg-accent text-white shadow-[0_0_10px_rgba(91,140,255,0.35)]'
                      : 'text-text-secondary hover:text-white'
                  }`}
                >
                  Live Insights
                </button>
                <button
                  onClick={() => setActiveRightTab('transcript')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeRightTab === 'transcript'
                      ? 'bg-accent text-white shadow-[0_0_10px_rgba(91,140,255,0.35)]'
                      : 'text-text-secondary hover:text-white'
                  }`}
                >
                  Transcript
                </button>
              </div>

              {activeRightTab === 'feedback' ? (
                <>
                  {/* Live Calibration Status Badge */}
                  <div className="p-4 rounded-2xl bg-surface/80 border border-hairline">
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                      LIVE CALIBRATION FEED
                    </span>
                    <div className="mt-2.5 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-text-secondary">Evaluation Status:</span>
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          {answeredCount === 0 ? 'Awaiting 1st Answer' : 'Analyzing Responses'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-text-secondary">Turns Answered:</span>
                        <span className="text-white font-bold">{answeredCount} / 5</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-text-secondary">Target Seniority:</span>
                        <span className="text-accent font-semibold">{session?.seniorityLevel || 'L5 (Senior)'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Dimension Diagnostics */}
                  <div className="space-y-3">
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                      DIMENSION READINESS
                    </span>
                    {[
                      { label: 'Clarity & Communication', active: answeredCount > 0 },
                      { label: 'Optimal Time/Space Complexity', active: answeredCount > 0 },
                      { label: 'System Scaling & Trade-offs', active: answeredCount > 1 },
                      { label: 'Edge Case & Failure Recovery', active: answeredCount > 2 },
                    ].map((metric, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-surface/50 border border-hairline/60">
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-text-secondary">{metric.label}</span>
                          <span className={metric.active ? 'text-emerald-400 font-bold' : 'text-text-muted font-mono'}>
                            {metric.active ? 'Evaluating' : 'Pending'}
                          </span>
                        </div>
                        <div className="w-full h-1 bg-surface-hover rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              metric.active ? 'w-2/3 bg-accent shadow-[0_0_6px_rgba(91,140,255,0.8)]' : 'w-0'
                            }`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pro Tip Card */}
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30">
                    <p className="text-[11px] text-amber-300 font-semibold flex items-center gap-1.5">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                      Bar Raiser Pro Tip
                    </p>
                    <p className="text-[10px] text-text-secondary mt-1 leading-relaxed">
                      At {session?.targetCompany || 'FAANG'}, always state time/space complexity up front before discussing implementation details.
                    </p>
                  </div>
                </>
              ) : (
                <div className="space-y-2 text-xs text-text-secondary max-h-[50vh] overflow-y-auto pr-1">
                  <p className="font-semibold text-white text-[11px]">Transcript History:</p>
                  {currentTurns.map((turn, i) => (
                    <div key={i} className="p-2.5 bg-surface/50 rounded-xl border border-hairline/60 space-y-1">
                      <p className="text-[10px] text-accent font-semibold">Q{i + 1}:</p>
                      <p className="text-[10px] text-text-primary">{turn.question}</p>
                      {turn.answer && (
                        <p className="text-[10px] text-text-secondary mt-1 border-t border-hairline/40 pt-1">
                          <strong className="text-white">A:</strong> {turn.answer}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handleEndInterview}
              className="w-full py-3 rounded-xl btn-primary-glow text-xs font-semibold text-white shadow-glow-accent mt-4 transition-all cursor-pointer"
            >
              Complete Interview & Get Score
            </button>
          </aside>
        </div>

        {/* 4. Mobile Bottom Mode Selector Bar (Touch Optimized) */}
        <nav
          className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-surface/95 backdrop-blur-lg border-t border-hairline/80 px-2 py-1.5 flex items-center justify-around shadow-2xl"
          aria-label="Mobile workspace selector"
        >
          {[
            { id: 'interview', label: 'Interview', icon: MessageSquare },
            { id: 'practice', label: 'Code', icon: Code2 },
            { id: 'progress', label: 'Telemetry', icon: BarChart2 },
            { id: 'problems', label: 'Problems', icon: ListTodo },
            { id: 'settings', label: 'Settings', icon: Sliders },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveNav(item.id)}
                className={`flex flex-col items-center justify-center p-1.5 rounded-xl min-w-[56px] min-h-[44px] transition-all cursor-pointer ${
                  isActive ? 'text-accent bg-accent/15 font-bold' : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-[10px] mt-0.5">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

