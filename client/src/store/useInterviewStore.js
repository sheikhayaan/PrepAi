import { create } from 'zustand';
import api from '../api/client';

export const useInterviewStore = create((set, get) => ({
  session: null,
  loading: false,
  error: null,
  isStreaming: false,
  streamedText: '',
  isRecording: false,
  voiceVolume: 0,
  isMuted: false,
  isCameraOn: false,
  elapsedSeconds: 0,
  timerInterval: null,

  // Start a new interview with FAANG calibration parameters
  startInterview: async (type = 'dsa', options = {}) => {
    try {
      set({ loading: true, error: null, streamedText: '', elapsedSeconds: 0 });
      const res = await api.post('/interviews/start', {
        type,
        companyTier: options.companyTier || 'faang',
        targetCompany: options.targetCompany || 'Google / Meta / FAANG',
        seniorityLevel: options.seniorityLevel || 'L5 (Senior)',
        targetPackage: options.targetPackage || '$250k - $380k',
      });
      set({ session: res.data.session, loading: false });
      get().startTimer();
      return { success: true, session: res.data.session };
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to start interview session.';
      set({ loading: false, error: errorMsg });
      return { success: false, error: errorMsg };
    }
  },

  // Load existing interview
  loadInterview: async (id) => {
    try {
      set({ loading: true, error: null });
      const res = await api.get(`/interviews/${id}`);
      set({ session: res.data.session, loading: false });
      return { success: true, session: res.data.session };
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to load interview.';
      set({ loading: false, error: errorMsg });
      return { success: false, error: errorMsg };
    }
  },

  // Submit candidate answer & handle SSE streaming response
  submitAnswer: async (answerText) => {
    const { session } = get();
    if (!session || !answerText.trim()) return;

    try {
      set({ isStreaming: true, streamedText: '', error: null });

      // Update current session turn answer optimistically
      const updatedTurns = [...session.turns];
      const currentIdx = updatedTurns.length - 1;
      if (currentIdx >= 0) {
        updatedTurns[currentIdx].answer = answerText;
      }
      set({ session: { ...session, turns: updatedTurns } });

      const response = await fetch(`/api/interviews/${session._id}/answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ answer: answerText }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to submit answer');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedQuestion = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const textChunk = decoder.decode(value, { stream: true });
        const lines = textChunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'chunk') {
                accumulatedQuestion += data.text;
                set({ streamedText: accumulatedQuestion });
              } else if (data.type === 'done') {
                // Final turn received
                const newTurns = [
                  ...get().session.turns,
                  {
                    question: data.fullQuestion,
                    answer: '',
                    followUp: true,
                    timestamp: new Date(),
                  },
                ];
                set({
                  session: { ...get().session, turns: newTurns },
                  streamedText: '',
                  isStreaming: false,
                });
              } else if (data.type === 'error') {
                set({ error: data.error, isStreaming: false });
              }
            } catch (jsonErr) {
              // Non-JSON SSE event fragment
            }
          }
        }
      }

      set({ isStreaming: false });
    } catch (err) {
      console.error('Submit answer error in store:', err);
      set({ isStreaming: false, error: err.message });
    }
  },

  // Complete interview session & poll for structured background score
  completeInterview: async () => {
    const { session, stopTimer } = get();
    if (!session) return;

    try {
      stopTimer();
      set({ loading: true });
      const res = await api.post(`/interviews/${session._id}/complete`);
      set({ session: res.data.session, loading: false });

      // Poll up to 5 times for finalScore if still generating
      let attempts = 0;
      const pollScore = async () => {
        if (attempts > 8) return;
        attempts++;
        try {
          const checkRes = await api.get(`/interviews/${session._id}`);
          if (checkRes.data.session?.finalScore) {
            set({ session: checkRes.data.session });
            return;
          }
          setTimeout(pollScore, 1200);
        } catch (e) {
          // ignore poll error
        }
      };
      setTimeout(pollScore, 1000);

      return { success: true, session: res.data.session };
    } catch (err) {
      set({ loading: false, error: err.message });
      return { success: false, error: err.message };
    }
  },

  // Timer controls
  startTimer: () => {
    get().stopTimer();
    const interval = setInterval(() => {
      set((state) => ({ elapsedSeconds: state.elapsedSeconds + 1 }));
    }, 1000);
    set({ timerInterval: interval });
  },

  stopTimer: () => {
    const { timerInterval } = get();
    if (timerInterval) {
      clearInterval(timerInterval);
      set({ timerInterval: null });
    }
  },

  // Media Controls
  toggleMute: () => set((s) => ({ isMuted: !s.isMuted })),
  toggleCamera: () => set((s) => ({ isCameraOn: !s.isCameraOn })),
  setRecording: (isRec) => set({ isRecording: isRec }),
  setVoiceVolume: (vol) => set({ voiceVolume: vol }),
}));
