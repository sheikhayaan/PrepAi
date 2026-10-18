import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import AuroraBackground from '../components/AuroraBackground';

export default function ForbiddenPage() {
  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <AuroraBackground showHorizon={true} />
      <div className="relative z-10 max-w-md w-full p-8 rounded-3xl bg-slate-900/80 border border-purple-500/30 backdrop-blur-xl shadow-2xl text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center mx-auto text-purple-400 shadow-[0_0_30px_rgba(168,85,247,0.3)]">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="text-[10px] font-bold tracking-[0.25em] text-purple-400 uppercase">
            ERROR 403 • ACCESS FORBIDDEN
          </span>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Restricted Territory
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            You do not have the required administrative role or permissions to view this resource.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            to="/dashboard"
            className="btn-primary-glow px-6 py-2.5 rounded-xl text-xs font-semibold text-white flex items-center gap-2 shadow-glow-accent"
          >
            <Home className="w-3.5 h-3.5" />
            Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
