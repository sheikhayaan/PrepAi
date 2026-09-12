import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import AuroraBackground from '../components/AuroraBackground';
import {
  Check,
  Sparkles,
  Zap,
  Shield,
  ArrowRight,
  ChevronDown,
  HelpCircle,
} from 'lucide-react';

export default function PricingPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [annual, setAnnual] = useState(true);
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (idx) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  const plans = [
    {
      name: 'Starter',
      priceMonthly: 0,
      priceAnnual: 0,
      desc: 'Essential adaptive practice for individual interview preparation.',
      features: [
        '5 AI Mock Interviews per month',
        'Technical DSA & Behavioral tracks',
        'Real-time SSE adaptive follow-ups',
        'Basic structured scoring summary',
        'Web Speech voice input support',
      ],
      cta: 'Start Free',
      highlighted: false,
    },
    {
      name: 'Pro Engineer',
      priceMonthly: 24,
      priceAnnual: 18,
      desc: 'Full access to all tracks, background analytics, and deep score breakdowns.',
      features: [
        'Unlimited AI Mock Interviews',
        'System Design, DSA, & Behavioral tracks',
        'Deep BullMQ background scoring reports',
        'Customizable interviewer strictness',
        'Full MongoDB aggregated dashboard',
        'Voice waveform & recording playback',
        'Targeted weak-spot practice recommendations',
      ],
      cta: 'Upgrade to Pro',
      highlighted: true,
      badge: 'MOST POPULAR',
    },
    {
      name: 'Team & University',
      priceMonthly: 69,
      priceAnnual: 52,
      desc: 'Tailored rubrics, custom question bank seeding, and cohort tracking.',
      features: [
        'Everything in Pro Engineer',
        'Custom company rubric simulations (Amazon LP, Google)',
        'Admin cohort progress analytics',
        'Custom QuestionBank upload API',
        'Dedicated SLA & priority processing',
      ],
      cta: 'Contact Enterprise',
      highlighted: false,
    },
  ];

  const faqs = [
    {
      q: 'How realistic is the AI interviewer compared to human interviewers?',
      a: 'PrepAI utilizes state-of-the-art Claude 3.5 Sonnet with a multi-turn state machine that specifically challenges candidate answers on algorithmic complexities, scalability bottlenecks, and trade-offs rather than just nodding along.',
    },
    {
      q: 'Do I need a credit card to start practicing?',
      a: 'No. You can start practicing immediately with the Starter plan without entering any payment information.',
    },
    {
      q: 'How does the background scoring process work?',
      a: 'When you end an interview, our async BullMQ worker processes your full session transcript against structured tool-use evaluation schemas, generating accurate numerical scores across clarity, correctness, and structure.',
    },
    {
      q: 'Does voice input work on mobile devices?',
      a: 'Yes, PrepAI integrates native Web Speech API support across modern browsers including Chrome, Safari, and Edge on desktop and mobile.',
    },
  ];

  return (
    <div className="relative min-h-screen bg-bg text-text-primary px-4 sm:px-6 lg:px-8 py-16 overflow-hidden">
      <AuroraBackground showHorizon={true} />

      <div className="max-w-7xl mx-auto relative z-10 space-y-16">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <span className="text-[11px] font-bold tracking-[0.25em] text-accent uppercase">
            TRANSPARENT, PERFORMANCE-DRIVEN PRICING
          </span>
          <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-[1.1]">
            Invest in your <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-blue-200 to-indigo-300">
              engineering future.
            </span>
          </h1>
          <p className="text-sm sm:text-base text-text-secondary leading-relaxed">
            Practice unlimited mock interviews, gain deep analytical insights, and unlock top-tier offers.
          </p>

          {/* Billing Switch */}
          <div className="flex items-center justify-center gap-4 pt-4">
            <span className={`text-xs font-semibold ${!annual ? 'text-white' : 'text-text-muted'}`}>
              Monthly
            </span>
            <button
              onClick={() => setAnnual(!annual)}
              className="relative w-12 h-6 rounded-full bg-surface border border-hairline p-0.5 transition-colors"
            >
              <div
                className={`w-5 h-5 rounded-full bg-accent transition-transform shadow-[0_0_10px_rgba(91,140,255,0.7)] ${
                  annual ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
            <span className={`text-xs font-semibold flex items-center gap-1.5 ${annual ? 'text-white' : 'text-text-muted'}`}>
              Annual
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                SAVE 25%
              </span>
            </span>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {plans.map((plan, idx) => {
            const price = annual ? plan.priceAnnual : plan.priceMonthly;

            return (
              <div
                key={idx}
                className={`rounded-2xl p-8 flex flex-col justify-between transition-all relative overflow-hidden ${
                  plan.highlighted
                    ? 'glass-window border-accent/60 shadow-[0_30px_90px_rgba(0,0,0,0.9),0_0_40px_rgba(91,140,255,0.3)] scale-[1.03]'
                    : 'glass-panel border-white/10 hover:border-hairline'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-400 via-accent to-indigo-400 shadow-[0_0_15px_#5B8CFF]" />
                )}

                <div>
                  {/* Badge */}
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                    {plan.badge && (
                      <span className="px-2.5 py-0.5 rounded-full bg-accent/20 border border-accent/40 text-accent text-[10px] font-bold tracking-wider">
                        {plan.badge}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-text-secondary leading-relaxed min-h-[36px]">
                    {plan.desc}
                  </p>

                  {/* Price */}
                  <div className="my-6 flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-white tracking-tight">
                      ${price}
                    </span>
                    <span className="text-xs text-text-muted font-medium">/ month</span>
                    {annual && price > 0 && (
                      <span className="text-[10px] text-text-muted ml-2">billed annually</span>
                    )}
                  </div>

                  {/* Feature Checklist */}
                  <div className="space-y-3 pt-4 border-t border-hairline/60">
                    <p className="text-[11px] font-bold text-white uppercase tracking-wider">
                      Included Capabilities:
                    </p>
                    {plan.features.map((feat, fIdx) => (
                      <div key={fIdx} className="flex items-start gap-2.5 text-xs text-text-secondary">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-8">
                  <button
                    onClick={() => {
                      if (user) navigate('/dashboard');
                      else navigate('/register');
                    }}
                    className={`w-full py-3.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      plan.highlighted
                        ? 'btn-primary-glow text-white'
                        : 'bg-surface hover:bg-surface-hover border border-hairline text-text-primary hover:text-white'
                    }`}
                  >
                    {plan.cta}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* FAQ Section */}
        <div className="pt-16 max-w-3xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h3 className="text-2xl sm:text-3xl font-bold text-white">Frequently Asked Questions</h3>
            <p className="text-xs sm:text-sm text-text-secondary">
              Everything you need to know about PrepAI’s adaptive platform.
            </p>
          </div>

          <div className="space-y-3 pt-6">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="rounded-xl bg-surface/70 border border-hairline overflow-hidden transition-colors"
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-4 text-left flex items-center justify-between text-xs sm:text-sm font-semibold text-white cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-text-muted transition-transform duration-200 ${
                      openFaq === idx ? 'rotate-180 text-accent' : ''
                    }`}
                  />
                </button>
                {openFaq === idx && (
                  <div className="px-4 pb-4 text-xs text-text-secondary leading-relaxed border-t border-hairline/40 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
