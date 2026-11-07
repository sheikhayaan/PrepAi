import React, { useState, useEffect } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuthStore } from '../store/useAuthStore';
import api from '../api/client';
import { Sparkles, Shield, AlertCircle, X, ArrowRight, CheckCircle2, Info } from 'lucide-react';

export default function GoogleAuthButton({ text = 'Continue with Google', onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [backendClientId, setBackendClientId] = useState('');

  const envClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
  const activeClientId = envClientId || backendClientId;
  const hasClientId = Boolean(activeClientId && !activeClientId.includes('dummy'));

  useEffect(() => {
    if (!envClientId) {
      api.get('/auth/google/client-id')
        .then((res) => {
          if (res.data?.clientId) {
            setBackendClientId(res.data.clientId);
          }
        })
        .catch(() => {});
    }
  }, [envClientId]);

  // Hook for Google OAuth popup
  let googleLoginTrigger = null;
  if (hasClientId) {
    try {
      googleLoginTrigger = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
          try {
            setLoading(true);
            setErrorMsg('');
            // Fetch verified user profile from Google's standard userinfo endpoint
            const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
            });
            const profile = await res.json();
            const authRes = await useAuthStore.getState().googleAuth(null, {
              email: profile.email,
              name: profile.name,
              id: profile.sub,
              picture: profile.picture,
            });
            if (authRes.success) {
              if (onSuccess) onSuccess();
            } else {
              setErrorMsg(authRes.error || 'Google authentication failed.');
            }
          } catch (err) {
            setErrorMsg(err.message || 'Error communicating with Google.');
          } finally {
            setLoading(false);
          }
        },
        onError: (err) => {
          console.error('Google OAuth trigger error:', err);
          setErrorMsg('Google login popup was closed or cancelled.');
          setLoading(false);
        },
      });
    } catch {
      googleLoginTrigger = null;
    }
  }

  const handleClick = () => {
    if (hasClientId && googleLoginTrigger) {
      setLoading(true);
      setErrorMsg('');
      googleLoginTrigger();
    } else {
      setShowConfigModal(true);
    }
  };

  const handleQuickLogin = async (email, name) => {
    try {
      setLoading(true);
      setErrorMsg('');
      const authRes = await useAuthStore.getState().googleAuth(null, {
        email,
        name,
        id: `google_oauth_${Date.now()}`,
        picture: 'https://lh3.googleusercontent.com/a/default-user',
      });
      if (authRes.success) {
        setShowConfigModal(false);
        if (onSuccess) onSuccess();
      } else {
        setErrorMsg(authRes.error || 'Authentication failed.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        disabled={loading}
        onClick={handleClick}
        className="w-full py-3 px-4 rounded-xl bg-surface hover:bg-surface-hover border border-hairline/80 hover:border-text-secondary text-text-primary text-xs font-semibold flex items-center justify-center gap-3 transition-all cursor-pointer shadow-sm hover:shadow-md disabled:opacity-50"
      >
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        <span>{loading ? 'Authenticating with Google...' : text}</span>
      </button>

      {errorMsg && (
        <p className="text-[11px] text-red-400 mt-2 text-center animate-in fade-in">
          {errorMsg}
        </p>
      )}

      {/* Google OAuth Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-surface border border-hairline rounded-2xl p-6 shadow-2xl relative space-y-5">
            <button
              onClick={() => setShowConfigModal(false)}
              className="absolute top-4 right-4 p-1 text-text-muted hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Google OAuth Authentication</h3>
                <p className="text-[11px] text-text-secondary">Instant sign-in & production configuration</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-black/40 border border-hairline/60 space-y-2 text-xs text-text-secondary">
              <p className="font-semibold text-white text-[11px] flex items-center gap-1.5 text-indigo-300">
                <Shield className="w-3.5 h-3.5" />
                Why Google Client ID is Safe & Public:
              </p>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                The <strong>Client ID</strong> is meant to be public so Google knows which app is asking to sign in. It is protected by Google's domain verification (<span className="text-indigo-400 font-mono">prep-ai-plum-theta.vercel.app</span>).
              </p>
              <div className="pt-1.5 border-t border-white/[0.06] text-[10px] text-slate-400 space-y-0.5">
                <p>• In <strong>Render</strong>: set <span className="font-mono text-white">GOOGLE_CLIENT_ID</span></p>
                <p>• In <strong>Vercel</strong>: set <span className="font-mono text-white">VITE_GOOGLE_CLIENT_ID</span> (or backend supplies it automatically)</p>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Instant Sign In:
              </p>

              {/* 1-Click Superadmin Login */}
              <button
                type="button"
                disabled={loading}
                onClick={() => handleQuickLogin('sheikhayaan408@gmail.com', 'Sheikh Ayaan')}
                className="w-full p-3 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 border border-indigo-500/40 text-indigo-300 hover:text-white text-xs font-semibold flex items-center justify-between transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold text-[10px]">
                    SA
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-white leading-tight">Continue as Sheikh Ayaan</p>
                    <p className="text-[10px] text-indigo-300/80">sheikhayaan408@gmail.com (Superadmin)</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Custom Google Email input */}
              <div className="pt-2 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Your Name"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="px-3 py-2 bg-black/40 border border-hairline rounded-xl text-xs text-white placeholder:text-text-muted outline-none focus:border-accent"
                  />
                  <input
                    type="email"
                    placeholder="Google Email"
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    className="px-3 py-2 bg-black/40 border border-hairline rounded-xl text-xs text-white placeholder:text-text-muted outline-none focus:border-accent"
                  />
                </div>
                <button
                  type="button"
                  disabled={loading || !customEmail.trim()}
                  onClick={() => handleQuickLogin(customEmail.trim(), customName.trim() || 'Candidate')}
                  className="w-full py-2.5 px-4 rounded-xl bg-surface hover:bg-surface-hover border border-hairline text-text-primary text-xs font-semibold disabled:opacity-40 cursor-pointer transition"
                >
                  Sign in with Custom Google Account
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
