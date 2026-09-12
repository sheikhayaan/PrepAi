import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import AuroraBackground from '../components/AuroraBackground';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, error, clearError, loading } = useAuthStore();

  const [email, setEmail] = useState('ayaan@dtu.ac.in');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    const res = await login(email, password);
    if (res.success) {
      navigate(from, { replace: true });
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
          Welcome back
        </h1>
        <p className="text-text-secondary text-sm text-center mb-8">
          Continue your journey to a better you.
        </p>

        {/* Error Alert */}
        {error && (
          <div className="w-full mb-6 p-3 bg-red-900/30 border border-red-500/50 rounded-lg text-red-200 text-xs text-center animate-shake">
            {error}
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="w-full space-y-4">
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
                placeholder="name@company.com"
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
                Sign in
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Switch Link */}
        <p className="mt-8 text-xs text-text-muted text-center">
          Don’t have an account?{' '}
          <Link to="/register" className="text-accent hover:text-accent-hover font-medium underline-offset-4 hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
