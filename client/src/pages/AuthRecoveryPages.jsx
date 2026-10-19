import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Mail, Lock, ArrowRight, ShieldCheck, MailCheck, MailWarning } from 'lucide-react';
import api from '../api/client';
import AuroraBackground from '../components/AuroraBackground';

/**
 * Shared shell for the three unauthenticated email flows. Keeping the layout in
 * one place stops the recovery pages from drifting away from the login design.
 */
function Shell({ icon: Icon, title, subtitle, children }) {
  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <AuroraBackground showHorizon={false} />
      <div className="relative z-10 w-full max-w-[420px] flex flex-col items-center">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-blue-400 flex items-center justify-center shadow-[0_0_25px_rgba(59,130,246,0.7)] mb-3">
            <Icon className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">PrepAI</span>
        </div>
        <h1 className="text-3xl font-bold text-white text-center tracking-tight mb-2">{title}</h1>
        <p className="text-text-secondary text-sm text-center mb-8">{subtitle}</p>
        <div className="w-full">{children}</div>
      </div>
    </div>
  );
}

function Notice({ tone = 'info', children }) {
  const tones = {
    info: 'bg-blue-900/20 border-blue-500/40 text-blue-100',
    error: 'bg-red-900/30 border-red-500/50 text-red-200',
    success: 'bg-emerald-900/25 border-emerald-500/50 text-emerald-100',
  };
  return <div className={`w-full mb-6 p-3 border rounded-lg text-xs text-center ${tones[tone]}`}>{children}</div>;
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [devToken, setDevToken] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setStatus('loading');
    setMessage('');
    try {
      const res = await api.post('/auth/forgot-password', { email });
      setStatus('sent');
      setMessage(res.data?.message || 'If an account exists, a reset link is on its way.');
      // Non-production responses include the raw token so the flow is testable
      // without a mail provider. Production never returns it.
      if (res.data?.debugResetToken) setDevToken(res.data.debugResetToken);
    } catch (err) {
      setStatus('error');
      setMessage(err.response?.data?.error || 'Could not start the reset flow.');
    }
  };

  return (
    <Shell icon={Mail} title="Reset your password" subtitle="We will email you a single-use link that expires in 60 minutes.">
      {message && <Notice tone={status === 'error' ? 'error' : 'success'}>{message}</Notice>}
      {devToken && (
        <Notice>
          Dev mode:{' '}
          <Link className="underline" to={`/reset-password?token=${encodeURIComponent(devToken)}`}>
            open the reset link
          </Link>
        </Notice>
      )}
      <form onSubmit={submit} className="space-y-4">
        <div className="input-glow-focus rounded-xl px-4 py-3.5 flex items-center gap-3">
          <Mail className="w-5 h-5 text-text-muted shrink-0" />
          <div className="flex-1 flex flex-col justify-center">
            <label className="text-[10px] text-text-muted font-medium tracking-wide">Email address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-muted/60 focus:outline-none"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={status === 'loading'}
          className="w-full h-12 rounded-xl bg-accent text-white font-semibold text-sm flex items-center justify-center gap-2 hover:brightness-110 disabled:opacity-60 transition"
        >
          {status === 'loading' ? 'Sending…' : 'Send reset link'}
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>
      <p className="text-center text-xs text-text-muted mt-6">
        <Link to="/login" className="text-accent hover:underline">Back to sign in</Link>
      </p>
    </Shell>
  );
}

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    if (password.length < 10) return setMessage('Password must be at least 10 characters long.');
    if (password !== confirm) return setMessage('Passwords do not match.');
    setStatus('loading');
    setMessage('');
    try {
      await api.post('/auth/reset-password', { token, newPassword: password });
      setStatus('done');
      setMessage('Password updated. Sign in with your new password.');
    } catch (err) {
      setStatus('error');
      setMessage(err.response?.data?.error || 'Reset failed. Request a new link.');
    }
  };

  if (!token) {
    return (
      <Shell icon={ShieldCheck} title="Invalid reset link" subtitle="This link is missing its token.">
        <Notice tone="error">Request a fresh password reset link.</Notice>
        <Link to="/forgot-password" className="block text-center text-sm text-accent hover:underline">Request a new link</Link>
      </Shell>
    );
  }

  return (
    <Shell icon={Lock} title="Choose a new password" subtitle="Use at least 10 characters. Every other session will be signed out.">
      {message && <Notice tone={status === 'done' ? 'success' : status === 'error' ? 'error' : 'info'}>{message}</Notice>}
      {status === 'done' ? (
        <Link to="/login" className="block text-center text-sm text-accent hover:underline">Go to sign in</Link>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {[
            { label: 'New password', value: password, set: setPassword },
            { label: 'Confirm password', value: confirm, set: setConfirm },
          ].map((field) => (
            <div key={field.label} className="input-glow-focus rounded-xl px-4 py-3.5 flex items-center gap-3">
              <Lock className="w-5 h-5 text-text-muted shrink-0" />
              <div className="flex-1 flex flex-col justify-center">
                <label className="text-[10px] text-text-muted font-medium tracking-wide">{field.label}</label>
                <input
                  type="password"
                  required
                  value={field.value}
                  onChange={(e) => field.set(e.target.value)}
                  placeholder="••••••••••"
                  className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-muted/60 focus:outline-none"
                />
              </div>
            </div>
          ))}
          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full h-12 rounded-xl bg-accent text-white font-semibold text-sm flex items-center justify-center gap-2 hover:brightness-110 disabled:opacity-60 transition"
          >
            {status === 'loading' ? 'Updating…' : 'Update password'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      )}
    </Shell>
  );
}

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [status, setStatus] = useState(token ? 'loading' : 'error');
  const [message, setMessage] = useState(token ? '' : 'This verification link has no token.');

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    api
      .post('/auth/verify-email', { token })
      .then((res) => {
        if (cancelled) return;
        setStatus('done');
        setMessage(res.data?.message || 'Email verified.');
      })
      .catch((err) => {
        if (cancelled) return;
        setStatus('error');
        setMessage(err.response?.data?.error || 'This link is invalid or has expired.');
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const icon = status === 'done' ? MailCheck : status === 'error' ? MailWarning : Mail;

  return (
    <Shell
      icon={icon}
      title={status === 'done' ? 'Email verified' : status === 'error' ? 'Verification failed' : 'Verifying your email'}
      subtitle={status === 'loading' ? 'One moment while we confirm your address.' : 'Email confirmation keeps your account recoverable.'}
    >
      {message && <Notice tone={status === 'done' ? 'success' : status === 'error' ? 'error' : 'info'}>{message}</Notice>}
      {status !== 'loading' && (
        <div className="space-y-3 text-center text-sm">
          <Link to={status === 'done' ? '/login' : '/dashboard'} className="block text-accent hover:underline">
            {status === 'done' ? 'Sign in' : 'Go to dashboard'}
          </Link>
          {status === 'error' && (
            <p className="text-xs text-text-muted">Signed in? Request a new link from your profile, or sign in and try again.</p>
          )}
        </div>
      )}
    </Shell>
  );
}

export default ForgotPasswordPage;
