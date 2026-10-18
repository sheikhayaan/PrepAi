import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, ArrowLeft, Home } from 'lucide-react';
import AuroraBackground from '../components/AuroraBackground';

export default function NotFoundPage() {
  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <AuroraBackground showHorizon={true} />
      <div className="relative z-10 max-w-md w-full p-8 rounded-3xl bg-slate-900/80 border border-white/10 backdrop-blur-xl shadow-2xl text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mx-auto text-blue-400 shadow-[0_0_30px_rgba(59,130,246,0.3)]">
          <Compass className="w-8 h-8 animate-spin-slow" />
        </div>

        <div className="space-y-2">
          <span className="text-[10px] font-bold tracking-[0.25em] text-blue-400 uppercase">
            ERROR 404 • PAGE NOT FOUND
          </span>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Off the Radar
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            The page or problem you're looking for doesn't exist or has been moved to a new destination.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            to="/"
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-xs font-semibold text-white flex items-center gap-2 transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Home
          </Link>
          <Link
            to="/dashboard"
            className="btn-primary-glow px-6 py-2.5 rounded-xl text-xs font-semibold text-white flex items-center gap-2 shadow-glow-accent"
          >
            <Home className="w-3.5 h-3.5" />
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
