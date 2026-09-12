import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { Bell, LogOut, Sparkles, ChevronDown } from 'lucide-react';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Hidden during active interview screen per DESIGN.md Section 3 Layout rules
  if (location.pathname.startsWith('/interview/')) {
    return null;
  }

  const navLinks = [
    { name: 'Features', path: '/features' },
    { name: 'How it works', path: '/how-it-works' },
    { name: 'Pricing', path: '/pricing' },
    { name: 'Blog', path: '/blog' },
    { name: 'Dashboard', path: '/dashboard', authRequired: true },
  ];

  const handleLogout = async () => {
    await logout();
    setDropdownOpen(false);
    navigate('/');
  };

  const getInitials = (name) => {
    if (!name) return 'AI';
    const parts = name.split(' ');
    return parts.length > 1 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : name.slice(0, 2).toUpperCase();
  };

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-bg/80 border-b border-hairline/80 transition-all duration-200">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-blue-400 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.6)] group-hover:shadow-[0_0_22px_rgba(59,130,246,0.8)] transition-all">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-white fill-current">
              <path d="M12 3L2 19h7l3-6 3 6h7L12 3z" opacity="0.9" />
              <path d="M12 9l-3 6h6l-3-6z" fill="#93C5FD" />
            </svg>
          </div>
          <span className="font-semibold text-lg tracking-tight text-text-primary">
            Prep<span className="text-accent">AI</span>
          </span>
        </Link>

        {/* Navigation Destinations */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => {
            if (link.authRequired && !user) return null;
            const isActive = location.pathname === link.path;

            return (
              <Link
                key={link.name}
                to={link.path}
                className={`relative py-1 text-sm font-medium transition-colors duration-120 ${
                  isActive ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {link.name}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent rounded-full shadow-[0_0_8px_rgba(91,140,255,0.8)]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right side controls */}
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4">
              <button
                className="p-2 text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded-full transition-colors"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
              </button>

              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2.5 p-1.5 rounded-full hover:bg-surface-hover border border-transparent hover:border-hairline transition-all cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full bg-accent/20 border border-accent/40 text-accent font-semibold text-xs flex items-center justify-center">
                    {getInitials(user.name)}
                  </div>
                  <div className="hidden lg:flex flex-col text-left">
                    <span className="text-xs text-text-muted">Good evening,</span>
                    <span className="text-xs font-medium text-text-primary">{user.name.split(' ')[0]}</span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-text-secondary" />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 py-1 bg-elevated border border-hairline rounded-md shadow-float z-50 animate-in fade-in zoom-in-95 duration-120">
                    <div className="px-4 py-2 border-b border-hairline">
                      <p className="text-xs font-semibold text-text-primary">{user.name}</p>
                      <p className="text-xs text-text-muted truncate">{user.email}</p>
                    </div>
                    <Link
                      to="/dashboard"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-hover"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-accent" />
                      Dashboard
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2 text-xs text-red-400 hover:bg-surface-hover text-left cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="text-sm font-medium text-text-secondary hover:text-text-primary px-3 py-1.5 transition-colors"
              >
                Sign in
              </Link>
              <Link
                to="/register"
                className="btn-primary-glow px-4 py-2 rounded-full text-xs font-semibold text-white tracking-wide flex items-center gap-1.5 cursor-pointer"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
