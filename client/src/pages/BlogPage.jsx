import React, { useState } from 'react';
import AuroraBackground from '../components/AuroraBackground';
import {
  BookOpen,
  Search,
  Clock,
  Tag,
  ArrowRight,
  X,
  Sparkles,
  Share2,
  Bookmark,
} from 'lucide-react';

export default function BlogPage() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArticle, setSelectedArticle] = useState(null);

  const articles = [
    {
      id: 1,
      title: 'How Senior Engineers Approach System Design in 45 Minutes',
      category: 'System Design',
      readTime: '6 min read',
      date: 'Aug 28, 2026',
      summary: 'Learn the structured 4-step framework top candidates use to navigate ambiguity, capacity estimations, and database partitioning without getting lost in the weeds.',
      content: `System design interviews evaluate your ability to architect scalable, resilient distributed systems under tight time constraints.

### 1. Scope the Problem & Establish Non-Functional Requirements
Never jump immediately into drawing database boxes. Spend the first 5 minutes clarifying read-to-write ratios, latency expectations (p99 < 100ms), and availability vs. consistency trade-offs (CAP theorem).

### 2. High-Level Architecture
Sketch the client entry point, API Gateway, primary microservices, and database layers. Explicitly discuss:
- Stateless application servers behind load balancers.
- Relational vs. NoSQL choice based on query patterns.
- Read replicas and write master replication strategies.

### 3. Deep Dive into Bottlenecks
Address single points of failure (SPOFs), caching strategies (Redis with LRU eviction and cache-aside pattern), and rate limiting to protect downstream services from cascading failure.`,
      tags: ['System Design', 'Distributed Systems', 'Scalability'],
    },
    {
      id: 2,
      title: 'Mastering the Dynamic Programming State Machine Pattern',
      category: 'DSA',
      readTime: '8 min read',
      date: 'Aug 20, 2026',
      summary: 'Demystifying multi-state transitions in DP problems like stock trading with cool-downs and regular expression matching using clean tabular representations.',
      content: `Dynamic Programming is fundamentally about identifying overlapping subproblems and optimal substructure.

### Transforming Complex Word Problems into Finite State Machines
When solving complex DP problems (e.g. Best Time to Buy and Sell Stock with Cooldown), map the system to discrete states:
- State 0: Holding a stock (can sell or hold)
- State 1: Sold (mandatory cooldown next)
- State 2: Empty/Rest (can buy or rest)

By expressing state transitions as recurrence relations:
dp[i][0] = max(dp[i-1][0], dp[i-1][2] - prices[i])
dp[i][1] = dp[i-1][0] + prices[i]
dp[i][2] = max(dp[i-1][2], dp[i-1][1])

You can reduce O(2^n) exponential search spaces to clean O(n) linear scans with O(1) space optimization!`,
      tags: ['DSA', 'Dynamic Programming', 'Algorithms'],
    },
    {
      id: 3,
      title: 'The STAR Method vs. What AI Evaluators Actually Score For',
      category: 'Behavioral',
      readTime: '5 min read',
      date: 'Aug 14, 2026',
      summary: 'Why generic STAR stories fail to impress hiring committees, and how focusing on technical metrics and conflict ownership unlocks L5+ leveling.',
      content: `Behavioral interviews are not a personality contest — they are structured evaluations of risk management, technical ownership, and team leverage.

### Moving Beyond Generic STAR
Most candidates spend 80% of their time describing the Situation and Task, and only 20% on Action and Result.

High-performing candidates invert this ratio:
- 15% Situation & Constraint
- 10% Core Conflict or Technical Hurdle
- 50% Explicit Personal Actions, trade-offs made, and dissent management
- 25% Quantified Business & System Impact (e.g., "Reduced p99 checkout latency by 34% and prevented $120k monthly compute waste")`,
      tags: ['Behavioral', 'Leadership', 'STAR Method'],
    },
    {
      id: 4,
      title: 'Why Server-Sent Events (SSE) Beat WebSockets for AI Streaming',
      category: 'Engineering',
      readTime: '7 min read',
      date: 'Aug 05, 2026',
      summary: 'A deep dive into HTTP/2 connection multiplexing, automatic reconnection, and why unidirectional SSE is the optimal architecture for token streaming.',
      content: `When building modern AI interfaces, streaming tokens in real time creates an immediate, snappy user experience.

### SSE vs. WebSockets: Architectural Comparison
- **Unidirectional vs Bidirectional**: LLM generation is inherently a response stream to a client request. We don't need continuous client-to-server data framing during response generation.
- **Protocol Overhead**: SSE runs over standard HTTP/1.1 or HTTP/2, automatically traversing corporate proxies and firewall filters that frequently disrupt WebSocket handshakes.
- **Native Reconnection**: Browser \`EventSource\` natively implements exponential backoff reconnection without complex heartbeat protocols.`,
      tags: ['Engineering', 'Architecture', 'SSE', 'Node.js'],
    },
  ];

  const categories = ['All', 'System Design', 'DSA', 'Behavioral', 'Engineering'];

  const filteredArticles = articles.filter((article) => {
    const matchesCat = selectedCategory === 'All' || article.category === selectedCategory;
    const matchesSearch =
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  return (
    <div className="relative min-h-screen bg-bg text-text-primary px-4 sm:px-6 lg:px-8 py-16 overflow-hidden">
      <AuroraBackground showHorizon={true} />

      <div className="max-w-7xl mx-auto relative z-10 space-y-12">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <span className="text-[11px] font-bold tracking-[0.25em] text-accent uppercase">
            PREPAI ENGINEERING & INTERVIEW INSIGHTS
          </span>
          <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-[1.1]">
            The Interviewer’s <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-blue-200 to-indigo-300">
              Playbook.
            </span>
          </h1>
          <p className="text-sm sm:text-base text-text-secondary leading-relaxed">
            In-depth guides on distributed systems, algorithm patterns, and AI-driven mock interview strategies.
          </p>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-2 rounded-2xl bg-surface/70 border border-hairline max-w-4xl mx-auto">
          {/* Categories */}
          <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-accent text-white shadow-[0_0_12px_rgba(91,140,255,0.5)]'
                    : 'text-text-secondary hover:text-white hover:bg-surface-hover'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search articles & topics..."
              className="w-full bg-bg/80 border border-hairline/80 focus:border-accent rounded-xl pl-9 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none"
            />
          </div>
        </div>

        {/* Article Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {filteredArticles.map((article) => (
            <div
              key={article.id}
              onClick={() => setSelectedArticle(article)}
              className="glass-panel rounded-2xl p-6 sm:p-8 border border-white/10 hover:border-accent/50 transition-all flex flex-col justify-between cursor-pointer group shadow-lg hover:shadow-[0_20px_50px_rgba(59,130,246,0.2)]"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-text-muted">
                  <span className="px-2.5 py-0.5 rounded-full bg-accent/15 border border-accent/30 text-accent font-semibold text-[10px]">
                    {article.category}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {article.readTime}
                    </span>
                    <span>{article.date}</span>
                  </div>
                </div>

                <h3 className="text-xl font-bold text-white group-hover:text-accent transition-colors leading-snug">
                  {article.title}
                </h3>

                <p className="text-xs sm:text-sm text-text-secondary leading-relaxed line-clamp-3">
                  {article.summary}
                </p>
              </div>

              <div className="pt-6 border-t border-hairline/50 flex items-center justify-between mt-6">
                <div className="flex flex-wrap gap-1.5">
                  {article.tags.map((tag, tIdx) => (
                    <span key={tIdx} className="text-[10px] text-text-muted bg-surface px-2 py-0.5 rounded">
                      #{tag}
                    </span>
                  ))}
                </div>

                <span className="text-xs font-semibold text-accent flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Read Article
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Full Article Reader Modal */}
        {selectedArticle && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
            <div className="glass-window max-w-3xl w-full max-h-[85vh] rounded-2xl p-6 sm:p-10 border border-white/10 shadow-2xl flex flex-col overflow-hidden relative">
              <button
                onClick={() => setSelectedArticle(null)}
                className="absolute top-6 right-6 p-2 rounded-full text-text-muted hover:text-white hover:bg-surface-hover transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="overflow-y-auto pr-2 space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-xs text-text-muted">
                    <span className="px-2.5 py-0.5 rounded-full bg-accent/20 text-accent font-semibold text-[10px]">
                      {selectedArticle.category}
                    </span>
                    <span>{selectedArticle.readTime}</span>
                    <span>{selectedArticle.date}</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
                    {selectedArticle.title}
                  </h2>
                </div>

                <div className="prose prose-invert max-w-none text-xs sm:text-sm text-text-secondary leading-relaxed space-y-4 whitespace-pre-line border-t border-hairline pt-4">
                  {selectedArticle.content}
                </div>

                <div className="pt-6 border-t border-hairline flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-muted">Share:</span>
                    <button
                      onClick={() => alert('Article link copied to clipboard!')}
                      className="p-1.5 rounded-lg bg-surface hover:bg-surface-hover border border-hairline text-text-secondary hover:text-white transition-colors"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <button
                    onClick={() => setSelectedArticle(null)}
                    className="btn-primary-glow px-6 py-2 rounded-xl text-xs font-semibold text-white"
                  >
                    Close Article
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
