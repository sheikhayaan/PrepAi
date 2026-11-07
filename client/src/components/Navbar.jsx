import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { AnimatedTopDock } from '../shaders/animated-top-dock/AnimatedTopDock';
import CompanyTierModal from './CompanyTierModal';
import '../shaders/threeui.css';
import {
  Sparkles,
  Database,
  Sliders,
  Shield,
  Menu,
  X,
  Play,
  Home,
  Layers,
  HelpCircle,
  CreditCard,
  LogOut,
  ArrowRight,
} from 'lucide-react';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showTierModal, setShowTierModal] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setDropdownOpen(false);
  }, [location.pathname]);

  // Hidden during active interview screen per DESIGN.md Section 3 Layout rules
  if (location.pathname.match(/^\/interview\/[a-zA-Z0-9_-]+$/)) {
    return null;
  }

  const navItems = [
    {
      id: 'features',
      label: 'Features',
      path: '/features',
      icon: <path d="M8 1.9 14.1 5v6L8 14.1 1.9 11V5z M1.9 5 8 8.1 14.1 5 M8 8.1v6" />,
    },
    {
      id: 'how-it-works',
      label: 'How It Works',
      path: '/how-it-works',
      icon: <><circle cx="8" cy="8" r="5.9" /><path d="M8 4.6V8l2.4 1.5" /></>,
    },
    {
      id: 'questions',
      label: 'Questions',
      path: '/questions',
      authRequired: true,
      icon: <path d="M8 1.9 14.4 5.6 8 9.3 1.6 5.6z m2.6 8 5.4 3.1L13.4 8 M2.6 10.7 8 13.8l5.4-3.1" />,
    },
    {
      id: 'custom-mock',
      label: 'Custom Mock',
      path: '/custom-interview',
      authRequired: true,
      icon: <path d="M3.4 2.4h5.4l3.8 3.8v7.4H3.4z M8.8 2.4v3.8h3.8 M5.9 9h4.2 M5.9 11.2h3" />,
    },
    {
      id: 'pricing',
      label: 'Pricing',
      path: '/pricing',
      icon: <><path d="M8.6 2.2H13v4.4l-6.6 6.6a1.2 1.2 0 0 1-1.7 0L2.2 10.5a1.2 1.2 0 0 1 0-1.7z" /><circle cx="10.6" cy="4.6" r=".9" /></>,
    },
    ...(user
      ? [
          {
            id: 'dashboard',
            label: 'Dashboard',
            path: '/dashboard',
            icon: <><circle cx="8" cy="8" r="5.9" /><path d="M8 4.6V8l2.4 1.5" /></>,
          },
        ]
      : []),
    ...(user?.email?.toLowerCase() === 'sheikhayaan408@gmail.com'
      ? [
          {
            id: 'admin',
            label: 'Admin',
            path: '/admin',
            icon: <path d="M8 1.5l6 2.5v4.5c0 4-2.5 7-6 8.5-3.5-1.5-6-4.5-6-8.5v-4.5l6-2.5z" />,
          },
        ]
      : []),
  ];

  const activeNav = navItems.find((item) => item.path === location.pathname)?.id || '';

  const handleItemSelect = (id) => {
    const item = navItems.find((n) => n.id === id);
    if (item?.path) {
      navigate(item.path);
    }
  };

  const handleLogout = async () => {
    await logout();
    setDropdownOpen(false);
    navigate('/');
  };

  const brandElement = (
    <a
      className="atd-modern__brand cursor-pointer"
      href="/"
      onClick={(e) => {
        e.preventDefault();
        navigate('/');
      }}
    >
      <span className="atd-modern__mark" aria-hidden="true">
        <svg viewBox="0 0 24 24" className="w-full h-full">
          <rect width="24" height="24" rx="4.5" fill="#3B82F6" />
          <path d="M12 3L2 19h7l3-6 3 6h7L12 3z" fill="#FFFFFF" />
          <path d="M12 9l-3 6h6l-3-6z" fill="#93C5FD" />
        </svg>
      </span>
      <span className="atd-modern__word font-bold tracking-tight">
        Prep<span className="text-blue-400">AI</span>
      </span>
    </a>
  );

  return (
    <>
      {/* ─────────────────────────────────────────────────────────────
          1. MOBILE TOP BAR (< 768px viewport)
      ───────────────────────────────────────────────────────────── */}
      <div className="md:hidden sticky top-0 z-40 w-full px-4 py-3 bg-[#07090e]/90 backdrop-blur-xl border-b border-white/10 pointer-events-auto transition-all">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          {/* Mobile Brand */}
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              setMobileMenuOpen(false);
              navigate('/');
            }}
            className="flex items-center gap-2 cursor-pointer"
          >
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center p-1 shadow-md shadow-blue-500/20">
              <svg viewBox="0 0 24 24" className="w-full h-full">
                <path d="M12 3L2 19h7l3-6 3 6h7L12 3z" fill="#FFFFFF" />
                <path d="M12 9l-3 6h6l-3-6z" fill="#93C5FD" />
              </svg>
            </div>
            <span className="font-extrabold text-base tracking-tight text-white">
              Prep<span className="text-blue-400">AI</span>
            </span>
          </a>

          {/* Mobile Right Controls */}
          <div className="flex items-center gap-2">
            {user ? (
              <button
                onClick={() => setShowTierModal(true)}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Mock</span>
              </button>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Sign In
              </button>
            )}

            {/* Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-blue-400" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. MOBILE MENU DRAWER (< 768px viewport)
      ───────────────────────────────────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col bg-[#07090e]/95 backdrop-blur-2xl animate-in fade-in duration-150">
          {/* Drawer Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center p-1">
                <svg viewBox="0 0 24 24" className="w-full h-full">
                  <path d="M12 3L2 19h7l3-6 3 6h7L12 3z" fill="#FFFFFF" />
                  <path d="M12 9l-3 6h6l-3-6z" fill="#93C5FD" />
                </svg>
              </div>
              <span className="font-extrabold text-base tracking-tight text-white">
                Prep<span className="text-blue-400">AI</span>
              </span>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {/* User Profile Badge (if logged in) */}
            {user && (
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-white truncate">{user.name}</p>
                  {user?.email?.toLowerCase() === 'sheikhayaan408@gmail.com' ? (
                    <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[9px] font-extrabold uppercase border border-purple-500/30">
                      SUPERADMIN
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[9px] font-bold">
                      PRO CANDIDATE
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
              </div>
            )}

            {/* Navigation Links */}
            <div className="space-y-1 font-medium text-sm">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/');
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 text-left transition-colors cursor-pointer"
              >
                <Home className="w-4 h-4 text-blue-400" />
                <span>Home</span>
              </button>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/features');
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 text-left transition-colors cursor-pointer"
              >
                <Layers className="w-4 h-4 text-blue-400" />
                <span>Features</span>
              </button>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/how-it-works');
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 text-left transition-colors cursor-pointer"
              >
                <HelpCircle className="w-4 h-4 text-blue-400" />
                <span>How It Works</span>
              </button>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/questions');
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Database className="w-4 h-4 text-blue-400" />
                  <span>500+ Question Bank</span>
                </div>
                <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-bold">500 Qs</span>
              </button>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/custom-interview');
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 text-left transition-colors cursor-pointer"
              >
                <Sliders className="w-4 h-4 text-blue-400" />
                <span>Custom Mock Builder</span>
              </button>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/pricing');
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 text-left transition-colors cursor-pointer"
              >
                <CreditCard className="w-4 h-4 text-blue-400" />
                <span>Pricing Plans</span>
              </button>

              {user && (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate('/dashboard');
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 text-left transition-colors cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span>My Dashboard</span>
                </button>
              )}

              {user?.email?.toLowerCase() === 'sheikhayaan408@gmail.com' && (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate('/admin');
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-purple-300 hover:text-purple-200 hover:bg-purple-500/10 text-left font-semibold transition-colors cursor-pointer"
                >
                  <Shield className="w-4 h-4 text-purple-400" />
                  <span>Admin Command Center</span>
                </button>
              )}
            </div>

            {/* Direct Mock CTA */}
            <div className="pt-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  if (user) {
                    setShowTierModal(true);
                  } else {
                    navigate('/register');
                  }
                }}
                className="w-full btn-primary-glow py-3 rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{user ? 'Start FAANG Mock Interview' : 'Get Started Free'}</span>
              </button>
            </div>
          </div>

          {/* Drawer Footer */}
          <div className="p-5 border-t border-white/10 bg-black/20">
            {user ? (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-red-400 hover:text-red-300 bg-red-500/10 border border-red-500/20 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out ({user.name.split(' ')[0]})</span>
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate('/login');
                  }}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-slate-200 bg-white/5 border border-white/10 hover:bg-white/10 text-center transition-colors cursor-pointer"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate('/register');
                  }}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 text-center transition-colors cursor-pointer"
                >
                  Create Account
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          3. DESKTOP ANIMATED TOP DOCK (>= 768px viewport)
      ───────────────────────────────────────────────────────────── */}
      <div className="hidden md:block sticky top-0 z-40 w-full pt-2 pb-1 px-3 sm:px-6 pointer-events-none transition-all">
        <div className="pointer-events-auto max-w-7xl mx-auto flex justify-center">
          <AnimatedTopDock
            variant="modern"
            proximity={122}
            spring={0.19}
            damping={0.70}
            widthGrowth={17}
            heightGrowth={16}
            drop={3.5}
            showStage={false}
            showCaption={false}
            customBrand={brandElement}
            customItems={navItems}
            activeId={activeNav}
            onItemClick={handleItemSelect}
            signInLabel={user ? user.name.split(' ')[0] : 'Sign in'}
            onSignInClick={() => {
              if (user) {
                setDropdownOpen((prev) => !prev);
              } else {
                navigate('/login');
              }
            }}
            ctaLabel={user ? 'Mock Interview' : 'Start Free'}
            onCtaClick={() => {
              if (user) {
                setShowTierModal(true);
              } else {
                navigate('/register');
              }
            }}
          />
        </div>
      </div>

      {/* Target Company & Tier Setup Wizard Modal */}
      {showTierModal && (
        <CompanyTierModal
          isOpen={showTierModal}
          onClose={() => setShowTierModal(false)}
        />
      )}

      {/* User dropdown menu if logged in (Desktop) */}
      {dropdownOpen && user && (
        <>
          {/* Backdrop overlay to close dropdown */}
          <div
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setDropdownOpen(false)}
          />
          <div className="fixed top-20 right-8 md:right-24 w-52 py-2 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-50 pointer-events-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="px-4 py-2 border-b border-white/10">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-white truncate">{user.name}</p>
                {user?.email?.toLowerCase() === 'sheikhayaan408@gmail.com' && (
                  <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[9px] font-bold">SUPERADMIN</span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
            </div>
            <button
              onClick={() => {
                setDropdownOpen(false);
                navigate('/dashboard');
              }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-slate-300 hover:text-white hover:bg-white/5 text-left transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              Dashboard
            </button>
            <button
              onClick={() => {
                setDropdownOpen(false);
                navigate('/questions');
              }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-slate-300 hover:text-white hover:bg-white/5 text-left transition-colors cursor-pointer"
            >
              <Database className="w-3.5 h-3.5 text-blue-400" />
              Question Bank
            </button>
            <button
              onClick={() => {
                setDropdownOpen(false);
                navigate('/custom-interview');
              }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-slate-300 hover:text-white hover:bg-white/5 text-left transition-colors cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-blue-400" />
              Custom Builder
            </button>
            {user?.email?.toLowerCase() === 'sheikhayaan408@gmail.com' && (
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  navigate('/admin');
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-purple-300 hover:text-purple-200 hover:bg-white/5 text-left font-semibold transition-colors cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5 text-purple-400" />
                Admin Portal
              </button>
            )}
            <div className="border-t border-white/10 mt-1 pt-1">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-white/5 text-left transition-colors cursor-pointer"
              >
                Sign out
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
