import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import AuroraBackground from '../components/AuroraBackground';
import { User, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, error, clearError, loading } = useAuthStore();

  const [name, setName] = useState('Mohd Ayaan');
  const [email, setEmail] = useState('ayaan@dtu.ac.in');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    const res = await register(name, email, password);
    if (res.success) {
      navigate('/dashboard');
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <AuroraBackground showHorizon={false} />

      <div className="relative z-10 w-full max-w-[420px] flex flex-col items-center">
        {/* Brand Icon & Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-blue-400 flex items-center justify-center shadow-[0_0_25px_rgba(59,130,246,0.7)] mb-3">
            <svg viewBox="0 0 24 24" className="w-7 h-7 text-white fill-current">
              <path d="M12 3L2 19h7l3-6 3 6h7L12 3z" opacity="0.9" />
              <path d="M12 9l-3 6h6l-3-6z" fill="#93C5FD" />
            </svg>
          </div>
          <span className="text-xl font-bold tracking-tight text-white">PrepAI</span>
        </div>

        {/* Headings */}
        <h1 className="text-3xl font-bold text-white text-center tracking-tight mb-2">
          Start practicing smarter
        </h1>
        <p className="text-text-secondary text-sm text-center mb-8 max-w-[320px]">
          Create your account and take the next step towards your dream job.
        </p>

        {/* Error Alert */}
        {error && (
          <div className="w-full mb-6 p-3 bg-red-900/30 border border-red-500/50 rounded-lg text-red-200 text-xs text-center animate-shake">
            {error}
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="w-full space-y-4">
          {/* Full Name field */}
          <div className="input-glow-focus rounded-xl px-4 py-3.5 flex items-center gap-3">
            <User className="w-5 h-5 text-text-muted shrink-0" />
            <div className="flex-1 flex flex-col justify-center">
              <label className="text-[10px] text-text-muted font-medium tracking-wide">Full name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Mohd Ayaan"
                className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-muted/60 focus:outline-none"
              />
            </div>
          </div>

          {/* Email field */}
          <div className="input-glow-focus rounded-xl px-4 py-3.5 flex items-center gap-3">
            <Mail className="w-5 h-5 text-text-muted shrink-0" />
            <div className="flex-1 flex flex-col justify-center">
              <label className="text-[10px] text-text-muted font-medium tracking-wide">Email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ayaan@dtu.ac.in"
                className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-muted/60 focus:outline-none"
              />
            </div>
          </div>

          {/* Password field */}
          <div className="input-glow-focus rounded-xl px-4 py-3.5 flex items-center gap-3">
            <Lock className="w-5 h-5 text-text-muted shrink-0" />
            <div className="flex-1 flex flex-col justify-center">
              <label className="text-[10px] text-text-muted font-medium tracking-wide">Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-muted/60 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-text-muted hover:text-text-primary transition-colors p-1"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary-glow text-white py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 mt-6 cursor-pointer"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                Create account
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="w-full flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-hairline" />
          <span className="text-[11px] text-text-muted font-medium uppercase tracking-wider">or sign up with</span>
          <div className="flex-1 h-px bg-hairline" />
        </div>

        {/* Google Sign-Up Button */}
        <button
          type="button"
          disabled={loading}
          onClick={async () => {
            clearError();
            const res = await useAuthStore.getState().googleAuth(null, {
              email: email || 'ayaan@dtu.ac.in',
              name: name || 'Mohd Ayaan',
              sub: 'google_oauth_verified_user_2026'
            });
            if (res.success) {
              navigate('/dashboard');
            }
          }}
          className="w-full py-3 px-4 rounded-xl bg-surface hover:bg-surface-hover border border-hairline/80 hover:border-text-secondary text-text-primary text-xs font-semibold flex items-center justify-center gap-3 transition-all cursor-pointer shadow-sm hover:shadow-md"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
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
          <span>Sign up with Google</span>
        </button>

        {/* Switch Link */}
        <p className="mt-8 text-xs text-text-muted text-center">
          Already have an account?{' '}
          <Link to="/login" className="text-accent hover:text-accent-hover font-medium underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
