import React, { useState } from 'react';
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
} from 'lucide-react';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showTierModal, setShowTierModal] = useState(false);

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
    ...(user?.role === 'admin'
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
      <div className="sticky top-0 z-40 w-full pt-2 pb-1 px-3 sm:px-6 pointer-events-none transition-all">
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

      {/* User dropdown menu if logged in */}
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
                {user.role === 'admin' && (
                  <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[9px] font-bold">ADMIN</span>
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
            {user.role === 'admin' && (
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
