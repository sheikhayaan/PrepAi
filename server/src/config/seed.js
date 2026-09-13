require('dotenv').config();
const mongoose = require('mongoose');
const QuestionBank = require('../models/QuestionBank');
const connectDB = require('./db');

const questions = [
  // ==========================================
  // 1. DSA QUESTIONS (Company-Tagged & Level-Calibrated)
  // ==========================================
  {
    type: 'dsa',
    difficulty: 'easy',
    level: 'L3',
    companyTags: ['Google', 'Meta', 'Amazon'],
    prompt: 'Given an array of integers nums and an integer target, return the indices of the two numbers such that they add up to target. Explain how a single-pass hash table reduces the time complexity from O(n^2) to O(n).',
    tags: ['array', 'hash-table', 'two-sum', 'core-fundamentals'],
  },
  {
    type: 'dsa',
    difficulty: 'medium',
    level: 'L3',
    companyTags: ['Amazon', 'Microsoft'],
    prompt: 'Given a singly linked list representing customer order checkpoints, reverse the list in-place and return the new head. Compare the memory trade-offs of the iterative vs recursive approaches.',
    tags: ['linked-list', 'in-place', 'pointers'],
  },
  {
    type: 'dsa',
    difficulty: 'medium',
    level: 'L4',
    companyTags: ['Google', 'Meta', 'Stripe'],
    prompt: 'Given a streaming string s of event keys, find the length of the longest continuous substring without duplicate characters using the sliding window pattern. What are the optimal time and space bounds?',
    tags: ['sliding-window', 'strings', 'hash-set'],
  },
  {
    type: 'dsa',
    difficulty: 'medium',
    level: 'L4',
    companyTags: ['Uber', 'Google', 'Amazon'],
    prompt: 'An m x n grid represents a geographical delivery zone where 1s are accessible service zones and 0s are unserviceable areas. Return the total count of connected clusters using BFS or DFS.',
    tags: ['graph', 'bfs', 'dfs', 'matrix-traversal'],
  },
  {
    type: 'dsa',
    difficulty: 'medium',
    level: 'L4',
    companyTags: ['Google', 'Meta', 'Microsoft'],
    prompt: 'You are given an array of transaction intervals [start, end]. Merge all overlapping intervals and return a consolidated schedule. How does sorting by start time eliminate pairwise interval comparisons?',
    tags: ['intervals', 'sorting', 'greedy'],
  },
  {
    type: 'dsa',
    difficulty: 'hard',
    level: 'L5',
    companyTags: ['Google', 'Stripe'],
    prompt: 'Given an unsorted array of transaction IDs containing positive and negative integers, return the smallest missing positive integer in O(n) time and O(1) auxiliary space using in-place index mapping.',
    tags: ['array', 'in-place-hashing', 'hard'],
  },
  {
    type: 'dsa',
    difficulty: 'hard',
    level: 'L5',
    companyTags: ['Amazon', 'Uber', 'Meta'],
    prompt: 'Design and implement an LRU (Least Recently Used) Cache with O(1) average time complexity for both get and put operations. Explain why a Hash Map paired with a Doubly Linked List is the optimal architecture.',
    tags: ['design', 'hash-map', 'doubly-linked-list', 'cache'],
  },
  {
    type: 'dsa',
    difficulty: 'hard',
    level: 'L5',
    companyTags: ['Meta', 'Uber'],
    prompt: 'Given k sorted linked lists representing real-time ride telemetries, merge all lists into one sorted linked list. Compare the min-heap priority queue approach vs divide-and-conquer merge sort.',
    tags: ['heap', 'priority-queue', 'divide-and-conquer'],
  },
  {
    type: 'dsa',
    difficulty: 'hard',
    level: 'L6+',
    companyTags: ['Google', 'Stripe', 'Meta'],
    prompt: 'Given a sliding window of size k moving over an array of size n, output the maximum value in each window position in O(n) total time using a monotonically decreasing deque.',
    tags: ['monotonic-deque', 'sliding-window', 'staff-level'],
  },
  {
    type: 'dsa',
    difficulty: 'medium',
    level: 'L4',
    companyTags: ['Amazon', 'Google'],
    prompt: 'Given an array of words, return the top k most frequently occurring terms. How do you implement this in O(n log k) time using a Min-Heap instead of full sorting?',
    tags: ['top-k', 'min-heap', 'hash-map'],
  },

  // ==========================================
  // 2. SYSTEM DESIGN QUESTIONS
  // ==========================================
  {
    type: 'system_design',
    difficulty: 'medium',
    level: 'L4',
    companyTags: ['Google', 'Meta', 'Stripe'],
    prompt: 'Design a scalable URL shortening service like bit.ly capable of handling 500 million redirects per day with under 10ms read latency. How do you generate unique 7-character base62 tokens without collisions?',
    tags: ['url-shortener', 'base62', 'caching', 'scalability'],
  },
  {
    type: 'system_design',
    difficulty: 'hard',
    level: 'L5',
    companyTags: ['Stripe', 'Uber', 'Google'],
    prompt: 'Design an API Gateway distributed Rate Limiter handling 1,000,000 requests per second across multiple regional edge nodes. Compare Sliding Window Counter with Token Bucket in Redis.',
    tags: ['rate-limiter', 'redis', 'sliding-window', 'concurrency'],
  },
  {
    type: 'system_design',
    difficulty: 'hard',
    level: 'L5',
    companyTags: ['Meta', 'Slack'],
    prompt: 'Design a distributed real-time messaging architecture supporting 1-on-1 chats and group channels with read receipts and offline message synchronization at 500k concurrent WebSocket connections.',
    tags: ['chat', 'websockets', 'database-partitioning', 'consistency'],
  },
  {
    type: 'system_design',
    difficulty: 'hard',
    level: 'L6+',
    companyTags: ['Amazon', 'Stripe'],
    prompt: 'Design a high-concurrency payment settlement and ledger system with exactly-once processing, idempotent webhooks, and distributed transaction rollback across banking partners.',
    tags: ['fintech', 'idempotency', 'distributed-transactions', 'ledger'],
  },

  // ==========================================
  // 3. BEHAVIORAL QUESTIONS
  // ==========================================
  {
    type: 'behavioral',
    difficulty: 'easy',
    level: 'L3',
    companyTags: ['Google', 'Amazon', 'Meta'],
    prompt: 'Tell me about a time you hit a serious technical bottleneck under a tight release deadline. How did you break down the problem, communicate with leads, and deliver results?',
    tags: ['star-method', 'resilience', 'problem-solving'],
  },
  {
    type: 'behavioral',
    difficulty: 'medium',
    level: 'L5',
    companyTags: ['Meta', 'Amazon', 'Google'],
    prompt: 'Describe a situation where you had a deep architectural disagreement with a Tech Lead or Principal Engineer. How did you utilize quantitative benchmarking and consensus building to resolve it?',
    tags: ['disagreement', 'data-driven', 'leadership'],
  },
  {
    type: 'behavioral',
    difficulty: 'hard',
    level: 'L6+',
    companyTags: ['Stripe', 'Google'],
    prompt: 'Tell me about a major production outage or data integrity incident you owned. Walk me through the live incident response, stakeholder communication, and the blameless post-mortem actions you led.',
    tags: ['incident-response', 'ownership', 'blameless-culture'],
  },

  // ==========================================
  // 4. HR ROUND QUESTIONS (Feature 1)
  // ==========================================
  {
    type: 'hr_round',
    difficulty: 'easy',
    level: 'L3',
    companyTags: ['Google', 'Meta', 'Amazon', 'Stripe'],
    prompt: 'Walk me through your professional trajectory, the core motivations behind your recent career transition, and what specifically about our engineering culture and product vision resonated with you.',
    tags: ['career-story', 'motivation', 'culture-fit'],
  },
  {
    type: 'hr_round',
    difficulty: 'medium',
    level: 'L4',
    companyTags: ['Amazon', 'Microsoft', 'Uber'],
    prompt: 'Our company operates with high autonomy and fast-paced ambiguity. Can you share an example of how you adapted to shifting organizational priorities without compromising quality or morale?',
    tags: ['adaptability', 'work-style', 'autonomy'],
  },
  {
    type: 'hr_round',
    difficulty: 'medium',
    level: 'L5',
    companyTags: ['Google', 'Stripe'],
    prompt: 'How do you establish healthy work-life boundaries while maintaining high velocity on mission-critical initiatives, and how do you support teammates showing early signs of burnout?',
    tags: ['sustainability', 'team-support', 'values'],
  },
  {
    type: 'hr_round',
    difficulty: 'medium',
    level: 'L4',
    companyTags: ['Meta', 'Uber'],
    prompt: 'Tell me about a time when company or team leadership made a strategic decision you initially disagreed with. How did you commit to the direction and motivate your peers to execute effectively?',
    tags: ['disagree-and-commit', 'alignment', 'integrity'],
  },
  {
    type: 'hr_round',
    difficulty: 'hard',
    level: 'L6+',
    companyTags: ['Google', 'Amazon', 'Stripe'],
    prompt: 'What are your compensation expectations and non-negotiable criteria when evaluating a multi-year executive leadership commitment with our team?',
    tags: ['expectations', 'transparency', 'long-term-vision'],
  },

  // ==========================================
  // 5. CASE STUDY QUESTIONS (Feature 1)
  // ==========================================
  {
    type: 'case_study',
    difficulty: 'medium',
    level: 'L4',
    companyTags: ['McKinsey', 'BCG', 'Google', 'Uber'],
    prompt: 'A Tier-1 ride-sharing platform is experiencing a 25% drop in driver retention in Tier-2 Indian cities despite offering 15% higher introductory bonuses. How would you structure a diagnostic issue tree to isolate root causes?',
    tags: ['issue-tree', 'retention', 'market-dynamics'],
  },
  {
    type: 'case_study',
    difficulty: 'hard',
    level: 'L5',
    companyTags: ['Amazon', 'Stripe', 'Bain'],
    prompt: 'An enterprise SaaS client with $80M ARR is considering unbundling their all-in-one suite into 3 modular offerings. Walk me through the unit economics, cannibalization risks, and your pricing recommendation framework.',
    tags: ['pricing-strategy', 'saas-metrics', 'unit-economics'],
  },
  {
    type: 'case_study',
    difficulty: 'hard',
    level: 'L5',
    companyTags: ['Google', 'Meta'],
    prompt: 'Estimate the total annual market size (TAM) for AI-powered mock interview platforms in the US and India, and present 3 prioritized expansion vectors based on willingness-to-pay and acquisition cost.',
    tags: ['market-sizing', 'tam-estimation', 'growth-strategy'],
  },
  {
    type: 'case_study',
    difficulty: 'medium',
    level: 'L4',
    companyTags: ['Uber', 'Amazon'],
    prompt: 'A quick-commerce grocery delivery company has negative contribution margins (-$1.80 per order) due to last-mile fulfillment costs. Formulate and prioritize 3 hypothesis-driven operational turnaround levers.',
    tags: ['profitability', 'last-mile', 'operational-efficiency'],
  },
  {
    type: 'case_study',
    difficulty: 'hard',
    level: 'L6+',
    companyTags: ['McKinsey', 'Google', 'Stripe'],
    prompt: 'A global fintech unicorn wants to enter cross-border B2B remittances. Would you recommend building in-house, acquiring a local regulated entity, or partnering with regional banks? Structure your decision matrix.',
    tags: ['build-vs-buy', 'market-entry', 'fintech-strategy'],
  },

  // ==========================================
  // 6. PRODUCT MANAGEMENT QUESTIONS (Feature 1)
  // ==========================================
  {
    type: 'product_management',
    difficulty: 'medium',
    level: 'L4',
    companyTags: ['Google', 'Meta', 'Uber'],
    prompt: 'How would you redesign the onboarding experience for Spotify to improve day-7 playlist creation among first-time mobile users? Walk me through persona segmentation, pain points, and MVP solutions.',
    tags: ['product-design', 'circles-framework', 'user-empathy'],
  },
  {
    type: 'product_management',
    difficulty: 'hard',
    level: 'L5',
    companyTags: ['Meta', 'Google'],
    prompt: 'Instagram Reels user watch time increased by 18%, but direct message sharing dropped by 12% following a feed ranking algorithm update. How do you investigate this trade-off and decide whether to roll back?',
    tags: ['trade-off-analysis', 'metrics-degradation', 'root-cause'],
  },
  {
    type: 'product_management',
    difficulty: 'medium',
    level: 'L4',
    companyTags: ['Amazon', 'Stripe'],
    prompt: 'You have engineering capacity for only 2 out of 5 proposed features this quarter: One-Click Checkout, AI Product Recommendations, Subscription Billing, Crypto Payments, and Fraud Shield. Apply the RICE framework to prioritize.',
    tags: ['prioritization', 'rice-framework', 'roadmap'],
  },
  {
    type: 'product_management',
    difficulty: 'hard',
    level: 'L5',
    companyTags: ['Stripe', 'Google'],
    prompt: 'Define the North Star metric and 3 counter-metrics for an AI coding assistant IDE plugin. How would you structure a 4-week randomized controlled A/B test to measure developer productivity gains?',
    tags: ['north-star', 'ab-testing', 'counter-metrics'],
  },
  {
    type: 'product_management',
    difficulty: 'hard',
    level: 'L6+',
    companyTags: ['Uber', 'Google', 'Amazon'],
    prompt: 'Imagine you are VP of Product for a ride-hailing company launching Autonomous Robotaxis. What are your launch go/no-go safety metrics, rider trust features, and multi-tier pricing strategy?',
    tags: ['vision', 'zero-to-one', 'pricing-strategy'],
  },

  // ==========================================
  // 7. SALES PITCH QUESTIONS (Feature 1)
  // ==========================================
  {
    type: 'sales_pitch',
    difficulty: 'medium',
    level: 'L4',
    companyTags: ['Salesforce', 'Stripe', 'HubSpot'],
    prompt: 'Pitch our Enterprise AI Mock Interview platform to a Chief Talent Officer who says: "Our recruiting team already conducts manual screening interviews and we do not trust automated AI grading." Deliver your rebuttal.',
    tags: ['objection-handling', 'value-proposition', 'executive-pitch'],
  },
  {
    type: 'sales_pitch',
    difficulty: 'hard',
    level: 'L5',
    companyTags: ['Stripe', 'AWS', 'Datadog'],
    prompt: 'You are presenting a $250k ARR cloud infrastructure observability contract to a CFO who insists on cutting all vendor budgets by 20%. How do you reframe the cost of system outages into an undeniable ROI business case?',
    tags: ['roi-modeling', 'cfo-negotiation', 'value-selling'],
  },
  {
    type: 'sales_pitch',
    difficulty: 'medium',
    level: 'L4',
    companyTags: ['Salesforce', 'Google Cloud'],
    prompt: 'Walk me through a 2-minute cold elevator pitch to a VP of Engineering at a fast-growing unicorn explaining why their team needs an enterprise developer productivity analytics platform.',
    tags: ['elevator-pitch', 'brevity', 'hook-story-offer'],
  },
  {
    type: 'sales_pitch',
    difficulty: 'hard',
    level: 'L5',
    companyTags: ['Microsoft', 'CrowdStrike', 'Palo Alto Networks'],
    prompt: 'A prospect is currently locked into a 3-year contract with our primary competitor and claims they are completely satisfied. How do you discover latent dissatisfaction and secure a proof-of-concept pilot?',
    tags: ['competitor-displacement', 'discovery', 'spin-selling'],
  },
  {
    type: 'sales_pitch',
    difficulty: 'hard',
    level: 'L6+',
    companyTags: ['AWS', 'Snowflake', 'Stripe'],
    prompt: 'You are closing an enterprise multi-year agreement at quarter-end, and procurement introduces aggressive last-minute discount demands (40% off). How do you protect contract value while closing on time?',
    tags: ['deal-closing', 'procurement-negotiation', 'margin-protection'],
  },

  // ==========================================
  // 8. MANAGERIAL QUESTIONS (Feature 1)
  // ==========================================
  {
    type: 'managerial',
    difficulty: 'medium',
    level: 'L5',
    companyTags: ['Google', 'Meta', 'Amazon'],
    prompt: 'A high-performing Senior Engineer on your team has become toxic in code reviews, alienating junior developers and dismissing cross-functional input. Walk me through your 1-on-1 coaching framework and corrective plan.',
    tags: ['coaching', 'culture', 'difficult-conversations'],
  },
  {
    type: 'managerial',
    difficulty: 'hard',
    level: 'L5',
    companyTags: ['Amazon', 'Microsoft', 'Uber'],
    prompt: 'Your engineering team of 8 has committed to 4 major quarterly roadmap deliverables, but two key engineers abruptly resign mid-quarter. How do you re-evaluate sprint capacity, communicate with VP stakeholders, and protect team morale?',
    tags: ['capacity-planning', 'stakeholder-management', 'crisis-leadership'],
  },
  {
    type: 'managerial',
    difficulty: 'hard',
    level: 'L6+',
    companyTags: ['Google', 'Stripe', 'Meta'],
    prompt: 'Two engineering managers reporting to you have overlapping ownership over an authentication microservice, causing friction, duplicated PRs, and architectural stalemates. How do you resolve team boundaries and drive lasting alignment?',
    tags: ['org-design', 'conflict-resolution', 'boundary-setting'],
  },
  {
    type: 'managerial',
    difficulty: 'medium',
    level: 'L5',
    companyTags: ['Meta', 'Stripe'],
    prompt: 'How do you approach annual performance calibrations to ensure equitable evaluation across introverted and extroverted engineers, and how do you deliver a "Does Not Meet Expectations" rating constructively?',
    tags: ['performance-management', 'equity', 'constructive-feedback'],
  },
  {
    type: 'managerial',
    difficulty: 'hard',
    level: 'L6+',
    companyTags: ['Google', 'Amazon', 'Uber'],
    prompt: 'Walk me through your framework for scaling an engineering organization from 15 to 60 engineers over 18 months. How do you design team topologies, career progression ladders, and hiring committee standards?',
    tags: ['org-scaling', 'team-topology', 'hiring-bar'],
  },
];

const seedQuestions = async () => {
  try {
    await connectDB();
    console.log('Clearing existing QuestionBank...');
    await QuestionBank.deleteMany();

    console.log(`Seeding ${questions.length} questions across all 8 interview types...`);
    await QuestionBank.insertMany(questions);

    console.log('✅ QuestionBank successfully seeded with company tags & all 8 interview tracks!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding questions:', error.message);
    process.exit(1);
  }
};

if (require.main === module) {
  seedQuestions();
}

module.exports = { questions, seedQuestions };
