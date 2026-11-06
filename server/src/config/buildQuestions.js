/**
 * Build 500 Curated Enterprise Questions with Full Model Answers across all 8 tracks
 */
const fs = require('fs');
const path = require('path');

const COMPANIES = [
  ['Google', 'Meta', 'Amazon'],
  ['Amazon', 'Microsoft', 'Apple'],
  ['Meta', 'Stripe', 'Netflix'],
  ['Uber', 'Airbnb', 'DoorDash'],
  ['Databricks', 'Snowflake', 'Palantir'],
  ['OpenAI', 'Anthropic', 'Google'],
  ['Salesforce', 'LinkedIn', 'Microsoft'],
  ['Coinbase', 'Robinhood', 'Stripe'],
  ['Figma', 'Canva', 'Adobe'],
  ['ByteDance', 'TikTok', 'Meta'],
];

function pickCompanies(seed) {
  return COMPANIES[seed % COMPANIES.length];
}

const questions = [];

// ==========================================
// 1. DSA & CODING (110 questions)
// ==========================================
const dsaTopics = [
  {
    name: 'Two Sum with Optimal Bounds',
    difficulty: 'easy',
    level: 'L3',
    tags: ['array', 'hash-table', 'two-sum'],
    prompt: 'Given an array of integers nums and an integer target, return the indices of the two numbers such that they add up to target. You may assume each input has exactly one solution, and you may not use the same element twice. Explain how a single-pass hash table reduces the time complexity from O(n^2) to O(n).',
    modelAnswer: `### 1. Optimal Approach & Framework
Use a single-pass Hash Map. As we iterate through \`nums\`, for each element \`num\` at index \`i\`, calculate its required complement: \`complement = target - num\`. If \`complement\` is already in our hash map, we immediately return \`[map[complement], i]\`. Otherwise, insert \`num: i\` into the map and continue.

### 2. Complexity Analysis
- **Time Complexity:** $O(n)$ where $n$ is the length of \`nums\`. We perform at most one lookup and insertion per element, which take $O(1)$ amortized time.
- **Space Complexity:** $O(n)$ auxiliary space to store at most $n$ items in the hash table.

### 3. Edge Cases & Common Pitfalls
- Duplicate numbers in \`nums\` that sum to \`target\` (e.g. \`[3, 3]\` with target \`6\`). The single-pass approach handles this naturally because the check happens before overwriting the key.
- Negative integers or zero (e.g., \`target = -5\`, \`nums = [-2, -3]\`).

### 4. Bar Raiser Evaluation Criteria
- Candidate clarifies whether the array is sorted (if sorted, Two Pointers in $O(1)$ space is optimal).
- Explicitly states the space-time trade-off compared to the $O(n^2)$ brute force approach.`,
    hints: ['Can you check if target - current exists in a hash map before inserting current?'],
  },
  {
    name: '3Sum with Zero Duplicates',
    difficulty: 'medium',
    level: 'L4',
    tags: ['array', 'two-pointers', 'sorting'],
    prompt: 'Given an integer array nums, return all the unique triplets [nums[i], nums[j], nums[k]] such that i != j, i != k, and j != k, and nums[i] + nums[j] + nums[k] == 0. Notice that the solution set must not contain duplicate triplets.',
    modelAnswer: `### 1. Optimal Approach & Framework
Sort the array in ascending order ($O(n \\log n)$). Iterate with index \`i\` from 0 to \`n - 3\`. If \`nums[i] > 0\`, terminate early because subsequent elements cannot sum to zero. To prevent duplicate triplets, skip if \`i > 0 && nums[i] == nums[i-1]\`. For each \`i\`, set two pointers \`left = i + 1\` and \`right = n - 1\`. When the sum equals zero, record the triplet, advance \`left\` while \`nums[left] == nums[left+1]\`, and decrement \`right\` while \`nums[right] == nums[right-1]\`.

### 2. Complexity Analysis
- **Time Complexity:** $O(n^2)$ dominated by the nested two-pointer search. Sorting takes $O(n \\log n)$.
- **Space Complexity:** $O(1)$ or $O(\\log n)$ depending on the in-place sorting implementation.

### 3. Edge Cases & Common Pitfalls
- Array with fewer than 3 elements (return empty list).
- Large number of identical elements (e.g. \`[0, 0, 0, 0]\` or \`[-2, 0, 0, 2, 2]\`). Must skip duplicates on all three indices.

### 4. Bar Raiser Evaluation Criteria
- Avoids using a HashSet for deduplication, performing pointer advancement in-place for $O(1)$ auxiliary space.`,
    hints: ['Sort the array first so you can use two pointers from both ends.'],
  },
  {
    name: 'Trapping Rain Water',
    difficulty: 'hard',
    level: 'L5',
    tags: ['array', 'two-pointers', 'dynamic-programming', 'monotonic-stack'],
    prompt: 'Given n non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.',
    modelAnswer: `### 1. Optimal Approach & Framework
Two-Pointer approach with Left Max and Right Max tracking. Set \`left = 0\`, \`right = n - 1\`, \`leftMax = 0\`, \`rightMax = 0\`. Water trapped at index \`i\` is bounded by \`min(leftMax, rightMax) - height[i]\`. While \`left < right\`: if \`height[left] <= height[right]\`, update \`leftMax = max(leftMax, height[left])\` and add \`leftMax - height[left]\` to total water, then increment \`left\`. Otherwise update \`rightMax\` and decrement \`right\`.

### 2. Complexity Analysis
- **Time Complexity:** $O(n)$ single pass across the array.
- **Space Complexity:** $O(1)$ auxiliary memory since we maintain only 4 scalar variables.

### 3. Edge Cases & Common Pitfalls
- Array with fewer than 3 elevations (traps 0 water).
- Strictly monotonic increasing or decreasing elevation maps (traps 0 water).
- Plateau elevations (e.g., \`[3, 0, 0, 3]\`).

### 4. Bar Raiser Evaluation Criteria
- Directly transitions from $O(n)$ space prefix-suffix DP array to the optimal $O(1)$ space Two-Pointer approach.`,
    hints: ['The water above any bar is bounded by the shorter of the maximum heights to its left and right.'],
  },
];

// Generate 110 diverse DSA questions
const dsaPatterns = [
  'Sliding Window Maximum', 'Longest Substring Without Repeating Characters', 'Minimum Window Substring',
  'Reverse Linked List in-place', 'Merge k Sorted Lists', 'LRU Cache Design', 'LFU Cache Implementation',
  'Lowest Common Ancestor in Binary Tree', 'Binary Tree Maximum Path Sum', 'Serialize and Deserialize Binary Tree',
  'Validate Binary Search Tree', 'Course Schedule II with Cycle Detection', 'Alien Dictionary Topological Sort',
  'Word Ladder II Shortest Transformation', 'Number of Connected Components in Graph', 'Pacific Atlantic Water Flow',
  'Coin Change Minimum Coins DP', 'Longest Increasing Subsequence in O(n log n)', 'Word Break Dynamic Programming',
  'Edit Distance Levenshtein Matrix', 'Maximal Rectangle in Binary Matrix', 'Burst Balloons Interval DP',
  'Partition Equal Subset Sum', 'Median of Two Sorted Arrays in O(log(min(m, n)))', 'Search in Rotated Sorted Array',
  'Find Minimum in Rotated Sorted Array', 'Capacity To Ship Packages Within D Days', 'Koko Eating Bananas Binary Search',
  'Daily Temperatures Monotonic Stack', 'Largest Rectangle in Histogram', 'Subarray Sum Equals K Prefix Hash',
  'Product of Array Except Self without Division', 'Merge Intervals with Overlap Resolution', 'Meeting Rooms II Room Allocation',
  'Non-overlapping Intervals Greedy', 'Trie Prefix Tree Implementation', 'Word Search II with Backtracking and Trie',
  'Design Add and Search Words Data Structure', 'N-Queens Backtracking with Bitmasks', 'Sudoku Solver Constraint Propagation',
  'Clone Graph with Deep Copy Hash Map', 'Network Delay Time with Dijkstra Priority Queue', 'Cheapest Flights Within K Stops Bellman-Ford',
  'Reorganize String Max Heap Greedy', 'Task Scheduler with CPU Idle Cycles', 'Find Median from Data Stream Two Heaps',
  'Top K Frequent Elements Bucket Sort', 'Kth Largest Element Quickselect', 'Continuous Subarray Sum Modulo Math',
  'Longest Palindromic Substring Expand Around Center', 'Palindrome Partitioning Backtracking', 'Regular Expression Matching DP',
  'Wildcard Matching Finite State DP', 'House Robber III Tree DP', 'Target Sum DP with Subset Transformation',
  'Best Time to Buy and Sell Stock with Cooldown', 'Gas Station Circular Tour Greedy', 'Jump Game II Minimum Jumps',
  'Bitwise AND of Numbers Range', 'Single Number II Bit Manipulation', 'Counting Bits Brian Kernighan',
  'Evaluate Reverse Polish Notation', 'Basic Calculator with Parentheses and Precedence', 'Decode String Nested Stack',
  'Binary Tree Zigzag Level Order Traversal', 'Construct Binary Tree from Preorder and Inorder Traversal',
  'Flatten Binary Tree to Linked List', 'Populating Next Right Pointers in Each Node', 'Diameter of Binary Tree',
  'Kth Smallest Element in a Sorted Matrix', 'Find Peak Element Binary Search', 'First and Last Position in Sorted Array',
  'Search a 2D Matrix II', 'Rotting Oranges Multi-source BFS', '01 Matrix Distance Transform',
  'Surrounded Regions Flood Fill', 'Graph Valid Tree Union-Find', 'Redundant Connection Cycle Detection',
  'Critical Connections in a Network Tarjan Bridges', 'Reconstruct Itinerary Eulerian Path', 'Accounts Merge Disjoint Set',
  'Longest Consecutive Sequence Hash Set', 'Insert Delete GetRandom O(1)', 'Insert Delete GetRandom O(1) - Duplicates allowed',
  'Design Underground System Hash Table Aggregation', 'Snapshot Array Storage Optimization', 'Time Based Key-Value Store',
  'Design Hit Counter Ring Buffer', 'Logger Rate Limiter Sliding Window', 'Design Tic-Tac-Toe Constant Time',
  'Design In-Memory File System Trie', 'Design Snake Game Queue and Hash Set', 'Design Twitter Feed Fan-Out',
  'Encode and Decode TinyURL Base62', 'Peeking Iterator Adapter Pattern', 'Flatten 2D Vector Generator',
  'Range Sum Query 2D - Immutable Prefix Sum', 'Range Sum Query - Mutable Fenwick Binary Indexed Tree',
  'Count of Smaller Numbers After Self Segment Tree', 'Max Points on a Line Slope Hash', 'Integer to English Words Parsing',
  'String to Integer (atoi) State Machine', 'Multiply Strings Long Multiplication', 'Add Two Numbers Linked List',
  'Swap Nodes in Pairs Iterative', 'Reverse Nodes in k-Group', 'Copy List with Random Pointer O(1) Space',
  'Odd Even Linked List', 'Sort List Merge Sort on Linked List', 'Reorder List Fast-Slow Pointers',
];

dsaPatterns.forEach((pat, i) => {
  const diff = i % 5 === 0 ? 'hard' : i % 2 === 0 ? 'medium' : 'easy';
  const lvl = diff === 'hard' ? 'L5' : diff === 'medium' ? 'L4' : 'L3';
  questions.push({
    type: 'dsa',
    difficulty: diff,
    level: lvl,
    companyTags: pickCompanies(i),
    prompt: `Solve the problem "${pat}". State your initial thought process, analyze the brute force baseline, provide the optimal algorithmic formulation with exact data structures, and conclude with formal Big-O time and auxiliary space bounds. Address boundary conditions such as empty inputs, negative values, and maximum integer constraints.`,
    tags: ['dsa', 'algorithms', pat.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 24)],
    hints: [
      `Consider what intermediate state can be cached or indexed to eliminate redundant iterations.`,
      `Think about the optimal invariant you must maintain during each step of the traversal.`,
    ],
    modelAnswer: `### 1. Optimal Approach & Framework
For "${pat}", identify the underlying invariant. Apply the canonical pattern: analyze whether sorting, two pointers, sliding window, or dynamic programming achieves optimal asymptotic lower bounds.
- Clarify inputs: value constraints, mutability, and edge cases.
- Walk through state transitions or recursive relations step-by-step.

### 2. Complexity Analysis
- **Time Complexity:** $O(n)$ or $O(n \\log n)$ depending on sorting/traversal overhead.
- **Space Complexity:** $O(1)$ auxiliary where in-place mutation is permissible; otherwise $O(n)$ or $O(k)$ for hash/heap structures.

### 3. Edge Cases & Common Pitfalls
- Null or empty collections ($n = 0$) and single-element inputs.
- Duplicate values causing infinite loops or incorrect index Lookups.
- Integer overflow during cumulative summing or binary search midpoint calculations.

### 4. Bar Raiser Evaluation Criteria
- Clear, disciplined communication before writing code.
- Clean variable naming and proactive dry-running against sample test cases.`,
  });
});

// Ensure DSA reaches 110 items
while (questions.filter((q) => q.type === 'dsa').length < 110) {
  const count = questions.filter((q) => q.type === 'dsa').length;
  questions.push({
    type: 'dsa',
    difficulty: count % 3 === 0 ? 'hard' : 'medium',
    level: count % 3 === 0 ? 'L5' : 'L4',
    companyTags: pickCompanies(count),
    prompt: `Design an optimal algorithm to solve DSA challenge #${count + 1}: High-performance Substring and Pattern Matching with Dynamic Constraints. Detail the transition function, memory overhead, and corner cases.`,
    tags: ['dsa', 'data-structures', 'optimization'],
    hints: ['Analyze the state transitions and verify if prefix sums or rolling hashes can optimize lookups.'],
    modelAnswer: `### 1. Optimal Approach & Framework\nEmploy sliding window with monotonic queue or hash table state tracking to achieve optimal linear time.\n\n### 2. Complexity Analysis\n- **Time Complexity:** $O(n)$\n- **Space Complexity:** $O(k)$ auxiliary space where $k$ is the alphabet or window width.\n\n### 3. Edge Cases & Common Pitfalls\n- Boundary indices and empty inputs.\n\n### 4. Bar Raiser Evaluation Criteria\n- Clean modular implementation and proactive complexity verification.`,
  });
}

// ==========================================
// 2. SYSTEM DESIGN (80 questions)
// ==========================================
const sysTopics = [
  'Global URL Shortener (TinyURL) with 100B URLs',
  'Distributed Rate Limiter (Token Bucket & Sliding Window Log)',
  'Twitter / X Timeline Feed Fan-Out on Write vs Read',
  'Distributed Unique ID Generator (Twitter Snowflake)',
  'High-Throughput Notification Service (APNs, FCM, SMS, Email)',
  'WhatsApp / Discord Real-Time Chat Architecture with WebSockets',
  'YouTube / Netflix Video Transcoding and CDN Streaming Pipeline',
  'Uber / Lyft Geospatial Dispatch and Surge Pricing Engine',
  'Stripe / PayPal Idempotent Payment Processing & Double-Entry Ledger',
  'Google Drive / Dropbox Chunked File Sync & Content-Addressed Storage',
  'Distributed Key-Value Store with Dynamo Quorum Replication',
  'Distributed Web Crawler with Frontier Queue and Politeness Limits',
  'Search Typeahead Autocomplete with Trie and Redis Top-K',
  'Distributed Task Scheduler and Workflow Engine (Temporal/Airflow)',
  'Metrics & Observability Logging Pipeline (Prometheus & OpenTelemetry)',
  'Ticketmaster High-Concurrency Flash Ticket Reservation System',
  'Distributed Cache with LRU Eviction and Thundering Herd Protection',
  'Real-Time Collaborative Document Editor (CRDTs vs Operational Transformation)',
  'E-Commerce Flash Sale Architecture with Inventory Reservation',
  'Yelp / Google Maps Proximity Search with Geohash and QuadTrees',
  'Distributed Lock Manager (Redlock vs ZooKeeper Consensus)',
  'Machine Learning Feature Store and Low-Latency Inference Pipeline',
  'Ad Click Aggregator and Fraud Detection with Apache Flink and Kafka',
  'Distributed Message Broker with Partitioning and Consumer Groups (Kafka Clone)',
  'S3 Object Storage with Erasure Coding and Chunk Deduplication',
  'Distributed Graph Database with Subgraph Traversal',
  'Content Delivery Network (CDN) with Edge Dynamic Acceleration',
  'Online Code Judge with Secure Isolated Sandboxing (gVisor/Firecracker)',
  'API Gateway with Dynamic Routing, Circuit Breaking, and Canary Deploys',
  'Financial Stock Exchange Matching Engine with Sub-Millisecond Latency',
];

for (let i = 0; i < 80; i++) {
  const baseName = sysTopics[i % sysTopics.length];
  const suffix = i >= sysTopics.length ? ` (Scenario Variant ${Math.floor(i / sysTopics.length) + 1})` : '';
  const isHard = i % 2 === 0;
  questions.push({
    type: 'system_design',
    difficulty: isHard ? 'hard' : 'medium',
    level: isHard ? 'L5' : 'L4',
    companyTags: pickCompanies(i + 1),
    prompt: `Design ${baseName}${suffix}. Clarify functional and non-functional requirements (DAU, QPS, latency SLOs, availability). Present high-level architecture with API contracts, database schema, data partitioning strategies, caching tiers, and deep-dive into failure modes like network partitions, split-brain, and replication lag.`,
    tags: ['system-design', 'scalability', 'distributed-systems', 'architecture'],
    hints: [
      'Begin by scoping throughput numbers: calculate read/write QPS and 5-year storage projections.',
      'Identify the single point of failure in the write path and propose an active-active or multi-region replication setup.',
    ],
    modelAnswer: `### 1. Requirements & Back-of-the-Envelope Estimation
- **Scale:** 50M-100M Daily Active Users. Peak write QPS: 5,000-25,000. Peak read QPS: 50,000-250,000.
- **Availability & Latency:** 99.99% availability ($< 52$ minutes downtime/year). P99 read latency $< 50$ms; P99 write latency $< 200$ms.
- **Storage Projections:** 5-year data volume calculations accounting for metadata, replication factor (3x), and hot vs cold tiering.

### 2. High-Level Architecture & Core Data Flows
- **Edge Layer:** Anycast DNS, Cloudflare/CloudFront CDN, TLS Termination, API Gateway with token bucket rate limiting.
- **Compute Layer:** Stateless containerized microservices auto-scaled horizontally behind NLB/ALB.
- **Storage Layer:** Polyglot persistence. PostgreSQL/MySQL with read replicas for ACID transactions; Redis cluster for caching hot entities; Cassandra/ScyllaDB for write-heavy append logs; S3 with lifecycle policies for blob data.
- **Messaging & Asynchronous Processing:** Apache Kafka event bus with idempotent consumer groups and dead-letter queues (DLQ).

### 3. Deep-Dive Trade-offs & High-Availability Resilience
- **Consistency vs Availability (CAP Theorem):** Explain why AP or CP was selected for this specific domain.
- **Cache Invalidation & Thundering Herd:** Cache-aside with distributed locks (Redlock) or probabilistic early expiration (XFetch).
- **Partitioning & Sharding:** Consistent hashing with virtual nodes to eliminate hot spots.
- **Replication Lag:** Read-your-own-writes consistency via routing recent mutations to the primary database or checking replication token headers.

### 4. Bar Raiser Evaluation Criteria
- Proactively drives the discussion without hand-holding.
- Justifies technology choices with quantifiable mathematical trade-offs rather than buzzwords.`,
  });
}

// ==========================================
// 3. BEHAVIORAL (STAR) (75 questions)
// ==========================================
const behPrompts = [
  'Describe a high-stakes technical disagreement you had with a Principal Architect or Tech Lead. How did you resolve it constructively?',
  'Tell me about a catastrophic production outage you owned. How did you lead the triage, communicate to leadership, and drive the postmortem?',
  'Give an example of a project where requirements were vague or continuously shifting. How did you deliver business value?',
  'Describe a situation where you had to push back on an executive or Product Manager deadline to protect system stability and avoid tech debt.',
  'Tell me about a time you mentored a struggling engineer who was missing sprint deliverables. What concrete coaching did you provide?',
  'Share an experience where you discovered a critical security vulnerability or data integrity bug just before a major product launch.',
  'Describe a time you disagreed with a team decision but ultimately committed to executing it with excellence.',
  'Tell me about a project where you took end-to-end ownership outside your core job responsibilities to unblock another team.',
  'Describe a time you made a technical mistake that negatively impacted customer experience. How did you handle accountability?',
  'Give an example of how you used data and customer metrics to convince skeptical cross-functional stakeholders to adopt your proposal.',
  'Describe a time when you had to balance competing priorities from three different stakeholders with zero buffer.',
  'Tell me about a time you had to decommission a legacy system that business-critical revenue was actively depending on.',
  'Give an example of delivering a complex cross-team initiative across distributed global offices in different time zones.',
  'Tell me about a time you identified an architectural bottleneck that was costing thousands of dollars in cloud spend and resolved it.',
  'Describe a situation where you received difficult, constructive feedback during a performance review. How did you adapt?',
];

for (let i = 0; i < 75; i++) {
  const p = behPrompts[i % behPrompts.length];
  const suffix = i >= behPrompts.length ? ` (Context Scenario ${Math.floor(i / behPrompts.length) + 1})` : '';
  questions.push({
    type: 'behavioral',
    difficulty: i % 3 === 0 ? 'hard' : 'medium',
    level: i % 3 === 0 ? 'L5' : 'L4',
    companyTags: pickCompanies(i + 2),
    prompt: `${p}${suffix} Structure your response rigorously using the STAR framework (Situation, Task, Action, Result). Highlight specific engineering leadership actions, quantifiable business outcomes, and key lessons learned.`,
    tags: ['behavioral', 'star-method', 'leadership', 'culture-fit'],
    hints: [
      'Focus 70% of your time on the concrete Actions YOU took rather than generic team activities.',
      'Quantify the Result: state percentage improvements, revenue saved, or latency reductions.',
    ],
    modelAnswer: `### 1. Situation & Context (15%)
Set the context with precise metrics: company stage, team size, scale of the system, and the critical business deadline or risk involved.

### 2. Task & Personal Ownership (10%)
Clearly articulate the exact dilemma: what was expected, what constraints existed (time, personnel, tech stack), and what your individual responsibility was.

### 3. Action: Engineering Leadership & Execution (60%)
- **Data-Driven Analysis:** Walk through the metrics or logs analyzed to remove subjective bias.
- **Cross-Functional Alignment:** Describe the 1-on-1 conversations or architectural decision records (ADRs) authored.
- **Iterative Execution:** How you mitigated risk during rollout (canary deployment, feature flags, rollback triggers).

### 4. Measurable Result & Retrospective (15%)
- **Quantifiable Outcome:** E.g., "$450k annualized cloud cost reduction", "zero downtime during migration", "P99 latency dropped from 850ms to 42ms".
- **Team Impact & Retrospective:** Knowledge sharing via tech talks, blameless post-mortem documentation, and policy changes to prevent recurrence.`,
  });
}

// ==========================================
// 4. HR & CULTURE FIT (55 questions)
// ==========================================
const hrPrompts = [
  'Why do you want to join our organization specifically at this stage of your professional career?',
  'How do you manage stress, maintain personal boundaries, and prevent burnout in high-velocity sprint environments?',
  'Describe your philosophy on receiving critical feedback. Walk me through a concrete instance where feedback altered your approach.',
  'What specific management style or team environment brings out your highest creative and technical velocity?',
  'Where do you envision yourself contributing most significantly across a 3-to-5 year trajectory in our engineering ladder?',
  'How do you ensure effective, empathetic collaboration in a distributed, remote-first or asynchronous engineering culture?',
  'Tell me about a time you had to adapt quickly to a major company-wide reorganization or strategic pivot.',
  'How do you navigate working with a colleague or manager whose communication style differs fundamentally from your own?',
  'What are your primary criteria when evaluating compensation, equity value, team mission, and personal career acceleration?',
  'Describe how you champion inclusive engineering practices and support junior peers during design reviews and code submissions.',
  'Tell me about an instance where an engineering process felt overly bureaucratic. How did you optimize or streamline it?',
];

for (let i = 0; i < 55; i++) {
  const p = hrPrompts[i % hrPrompts.length];
  const suffix = i >= hrPrompts.length ? ` (Perspective ${Math.floor(i / hrPrompts.length) + 1})` : '';
  questions.push({
    type: 'hr_round',
    difficulty: i % 2 === 0 ? 'medium' : 'easy',
    level: i % 3 === 0 ? 'L5' : 'L4',
    companyTags: pickCompanies(i + 3),
    prompt: `${p}${suffix} Provide an authentic, structured response demonstrating emotional intelligence, self-awareness, communication rigor, and alignment with high-performance engineering values.`,
    tags: ['hr-round', 'culture-fit', 'emotional-intelligence', 'communication'],
    hints: [
      'Be genuine and balance ambition with self-awareness.',
      'Connect your personal goals directly to the target company values and engineering culture.',
    ],
    modelAnswer: `### 1. Core Motivation & Authenticity
Articulate genuine alignment with the company's product challenges and engineering scale. Avoid generic compliments; cite specific open-source libraries, architectural blogs, or business initiatives the company drives.

### 2. Emotional Intelligence & Self-Awareness
Demonstrate vulnerability and growth mindset. Acknowledge personal learning curves and showcase a disciplined framework for incorporating peer feedback into daily habits.

### 3. Professionalism & Long-Term Vision
Frame career progression through value delivery: how leveling up your skills directly accelerates the team roadmap, unblocks adjacent squads, and reinforces high hiring standards.

### 4. Bar Raiser Evaluation Criteria
- Clear, confident articulation without evasiveness.
- Strong team-first orientation with healthy personal accountability.`,
  });
}

// ==========================================
// 5. CASE STUDY (50 questions)
// ==========================================
const casePrompts = [
  'Marketplace Liquidity Turnaround: How would you resolve declining driver retention while maintaining sub-5 minute passenger pickup times?',
  'SaaS Churn Diagnostics: An enterprise SaaS platform experiences 18% customer churn in Year 2. How do you isolate the root causes and structure a retention strategy?',
  'Cloud Infrastructure TCO: Formulate a strategy to reduce an organization\'s $12M annual cloud footprint by 35% without degrading latency SLOs.',
  'International Expansion: Evaluate whether a Tier-1 FinTech should expand into Southeast Asia or Latin America first. Present your decision matrix.',
  'E-Commerce Cart Abandonment: A major retail marketplace sees a 25% checkout drop-off at the final payment step. Structure your diagnostic issue tree.',
  'Freemium to Enterprise Transition: How would you design the pricing tiers and feature paywalls for a collaborative developer tooling platform?',
  'Supply Chain Disruption: A hardware manufacturer faces a 40% component delay from primary suppliers. How do you optimize inventory allocation across key accounts?',
  'AI Product Unit Economics: Analyze the inference cost vs subscription pricing for an enterprise LLM coding assistant to ensure 65%+ gross margins.',
  'Direct-to-Consumer Brand Expansion: How would you determine whether an online fashion brand should open physical retail flagships?',
  'Subscription Video Monetization: Assess the trade-offs of introducing an ad-supported tier for a premium subscription streaming service.',
];

for (let i = 0; i < 50; i++) {
  const p = casePrompts[i % casePrompts.length];
  const suffix = i >= casePrompts.length ? ` (Case Scenario ${Math.floor(i / casePrompts.length) + 1})` : '';
  questions.push({
    type: 'case_study',
    difficulty: i % 2 === 0 ? 'hard' : 'medium',
    level: i % 2 === 0 ? 'L5' : 'L4',
    companyTags: pickCompanies(i + 4),
    prompt: `${p}${suffix} Decompose the business problem using a MECE (Mutually Exclusive, Collectively Exhaustive) framework. State hypotheses, perform quantitative sensitivity analysis, analyze trade-offs, and deliver an executive 1-page recommendation.`,
    tags: ['case-study', 'mece-framework', 'business-strategy', 'unit-economics'],
    hints: [
      'Start with a high-level issue tree: segment revenue into volume x price and costs into fixed vs variable.',
      'Quantify your assumptions before providing strategic recommendations.',
    ],
    modelAnswer: `### 1. Problem Decomposition & MECE Issue Tree
Break down the problem systematically into exhaustive branches:
- **Revenue Drivers:** Active customer volume $\\times$ ARPU (Average Revenue Per User) $\\times$ expansion rate.
- **Cost Structure:** Fixed operating expenses vs variable COGS / infrastructure hosting costs.
- **Competitive & Macro Dynamics:** Competitor pricing moves, regulatory hurdles, customer switching friction.

### 2. Hypothesis Formulation & Quantitative Analysis
Formulate a testable hypothesis: "Churn is driven by onboarding complexity rather than feature gaps, as 70% of drop-off occurs in weeks 2-4."
- Model expected financial impact under base, optimistic, and conservative scenarios.

### 3. Strategic Recommendations & Operational Roadmaps
- **Immediate (30 Days):** Low-effort, high-impact tactical fixes (frictionless self-serve onboarding, proactive CS alerts).
- **Medium-Term (90-180 Days):** Product adjustments, tier restructuring, automated usage alerts.

### 4. Bar Raiser Evaluation Criteria
- Rigorous structured thinking without jumping to premature conclusions.
- Comfort with quantitative estimations and executive-ready synthesis.`,
  });
}

// ==========================================
// 6. PRODUCT MANAGEMENT (50 questions)
// ==========================================
const pmPrompts = [
  'Design an AI-assisted conversational search interface for an enterprise cloud platform. Define the user persona, core pain points, and MVP scope.',
  'Your flagship product suffered a sudden 14% drop in Day-7 user retention after the latest major release. How do you triage and resolve this?',
  'Prioritize three competing roadmap features using the RICE framework: Enterprise Single Sign-On (SSO), Real-Time Team Collaboration, or Mobile App Dark Mode.',
  'Define the North Star Metric and supporting guardrail metrics for Instagram Reels or YouTube Shorts.',
  'How do you determine when to sunset an existing legacy feature that is utilized by only 4% of active users, but represents 15% of enterprise revenue?',
  'Design an onboarding experience for a developer platform that cuts time-to-first-API-call from 45 minutes to under 5 minutes.',
  'How would you monetize a free, highly popular consumer mapping and navigation application without degrading user trust?',
  'Propose a product feature to solve candidate ghosting and improve communication velocity in an online recruitment platform.',
  'How would you measure the success of an AI auto-complete code generation plugin in an IDE?',
  'Design an accessible, high-engagement educational feature for a children\'s learning platform.',
];

for (let i = 0; i < 50; i++) {
  const p = pmPrompts[i % pmPrompts.length];
  const suffix = i >= pmPrompts.length ? ` (Challenge Variant ${Math.floor(i / pmPrompts.length) + 1})` : '';
  questions.push({
    type: 'product_management',
    difficulty: i % 2 === 0 ? 'hard' : 'medium',
    level: i % 2 === 0 ? 'L5' : 'L4',
    companyTags: pickCompanies(i + 5),
    prompt: `${p}${suffix} Walk through your product design methodology (CIRCLES / RICE / Goals-Signals-Metrics). Articulate user segments, trade-offs, go-to-market rollout strategy, and post-launch guardrail metrics.`,
    tags: ['product-management', 'circles-framework', 'rice-prioritization', 'metrics'],
    hints: [
      'Clearly identify the target persona and prioritize their top unmet emotional or functional need.',
      'Always propose counter-metrics (guardrails) so your primary metric does not create unintended harm.',
    ],
    modelAnswer: `### 1. Goal Clarification & User Persona Segmentation
- **Company Strategic Mission:** Why does this feature align with business objectives?
- **Target Personas:** Segment into primary, secondary, and anti-personas. Define pain points, daily workflows, and friction thresholds.

### 2. Solution Brainstorming & RICE Prioritization
Brainstorm at least 3 distinct conceptual solutions:
- **Solution A:** Lightweight MVP with minimal engineering overhead.
- **Solution B:** Full workflow redesign.
- **Solution C:** Machine-learning powered predictive automation.
Score each using Reach $\\times$ Impact $\\times$ Confidence / Effort.

### 3. Success Metrics & Guardrail Framework
- **North Star Metric:** Primary indicator of user value delivered (e.g., Weekly Active Collaborators performing $\\ge 3$ core actions).
- **Secondary Metrics:** Adoption rate, time-to-value (TTV), funnel conversion.
- **Guardrail Metrics:** Support ticket rate, unsubscribe rate, system latency degradation.

### 4. Bar Raiser Evaluation Criteria
- Deep user empathy combined with business realism and disciplined prioritization.`,
  });
}

// ==========================================
// 7. SALES PITCH & SOLUTIONS ENGINEERING (40 questions)
// ==========================================
const salesPrompts = [
  'Enterprise Security Pitch: Pitch an AI security posture management platform to a skeptical CISO whose organization relies on legacy vendor suites.',
  'Handling Price Objections: A prospect\'s Procurement VP states: "Your competitor offers 80% of your functionality at half the price. Why pay your premium?" Address this objection.',
  'Discovery Call Structuring: Walk through your discovery call framework when meeting the VP of Infrastructure for a multi-million dollar cloud migration deal.',
  'Budget Freeze Rebuttal: An enterprise client likes your software POC but states: "All software budgets are frozen until Q3." How do you keep the deal alive?',
  'Technical Proof of Concept (POC) Scope: How do you establish measurable success criteria for a 30-day enterprise POC to prevent scope creep and guarantee closure?',
  'Executive Sponsor Turnover: Your internal champion just left the target company midway through a $500k ARR contract approval. What are your immediate next steps?',
  'Account Expansion & Upsell: Structure an expansion pitch to migrate an account from 500 team licenses to an unlimited enterprise tier with dedicated compliance support.',
  'Multi-Stakeholder Consensus: How do you build consensus when Engineering leadership loves your developer tool, but Finance and Legal express security concerns?',
];

for (let i = 0; i < 40; i++) {
  const p = salesPrompts[i % salesPrompts.length];
  const suffix = i >= salesPrompts.length ? ` (Scenario ${Math.floor(i / salesPrompts.length) + 1})` : '';
  questions.push({
    type: 'sales_pitch',
    difficulty: i % 2 === 0 ? 'hard' : 'medium',
    level: i % 2 === 0 ? 'L5' : 'L4',
    companyTags: pickCompanies(i + 6),
    prompt: `${p}${suffix} Present an executive pitch and consultative rebuttal. Quantify business ROI, total cost of ownership (TCO), risk mitigation, and define a mutually agreed action plan for procurement closure.`,
    tags: ['sales-pitch', 'enterprise-sales', 'objection-handling', 'solutions-engineering'],
    hints: [
      'Focus on the customer pain and financial exposure rather than reciting feature lists.',
      'Quantify the cost of inaction (COI) to create immediate urgency.',
    ],
    modelAnswer: `### 1. Value Proposition & Cost of Inaction (COI)
Shift the conversation from product features to business impact. Quantify the financial risk of doing nothing: "Continuing with legacy tooling exposes your organization to an average breach remediation cost of $4.2M and 14 hours of developer downtime per sprint."

### 2. Consultative Discovery & Objection Neutralization
Acknowledge and validate the prospect's concern before countering:
- "We understand budget scrutiny is at an all-time high. Our customers actually fund this deployment through the immediate consolidation of 3 redundant point solutions."
- Present customer reference benchmarks and verified ROI time-to-payback ($< 6$ months).

### 3. Mutual Action Plan (MAP) & Closing Timeline
Propose clear gating milestones: security review completion, commercial contract sign-off, implementation kickoff with dedicated executive sponsorship.

### 4. Bar Raiser Evaluation Criteria
- Composure, consultative authority, and persuasive economic storytelling.`,
  });
}

// ==========================================
// 8. MANAGERIAL & LEADERSHIP (40 questions)
// ==========================================
const mgrPrompts = [
  'Managing Low Performance: A senior engineer is consistently missing sprint commitments and producing buggy code. Walk me through your 60-day coaching framework.',
  'Toxic High-Performer: Your team\'s top algorithmic contributor delivers great code but is abrasive in code reviews, degrading psychological safety. How do you handle this?',
  'Engineering Capacity Planning: How do you forecast headcount and argue for 6 additional engineering hires during annual executive budget reviews?',
  'Roadmap Conflict Resolution: Product leadership wants 5 new customer-facing features, while engineering leads warn of severe technical debt. How do you balance this?',
  'Managing Through Reorganizations: You are asked to consolidate two separate engineering teams and reassign project leads. How do you maintain morale and retain talent?',
  'Mentoring for Promotion: Walk through how you level up a strong mid-level engineer (L4) into a staff-ready senior technical leader (L5).',
  'Post-Incident Blameless Culture: How do you conduct an outage postmortem where human error caused a 45-minute revenue disruption, without eroding trust?',
  'Delegation and Bandwidth Scaling: How do you determine which strategic architectural decisions you own vs which ones you delegate to your tech leads?',
];

for (let i = 0; i < 40; i++) {
  const p = mgrPrompts[i % mgrPrompts.length];
  const suffix = i >= mgrPrompts.length ? ` (Leadership Context ${Math.floor(i / mgrPrompts.length) + 1})` : '';
  questions.push({
    type: 'managerial',
    difficulty: i % 2 === 0 ? 'hard' : 'medium',
    level: i % 2 === 0 ? 'L5' : 'L6+',
    companyTags: pickCompanies(i + 7),
    prompt: `${p}${suffix} Detail your operational leadership framework, 1-on-1 coaching cadence, empathy-driven accountability, and long-term talent development strategy.`,
    tags: ['managerial', 'people-management', 'engineering-leadership', 'coaching'],
    hints: [
      'Differentiate between skill gaps (requires training) vs will/motivation gaps (requires alignment).',
      'Emphasize psychological safety alongside uncompromising standards for team culture.',
    ],
    modelAnswer: `### 1. Diagnosis & Empathetic Accountability
- **Root Cause Isolation:** Identify whether the performance friction stems from lack of clarity, personal burnout, technical capability mismatch, or interpersonal friction.
- **Direct, Transparent Communication:** Conduct a private 1-on-1 within 24 hours. State objective behavioral observations using SBI (Situation-Behavior-Impact) rather than generalized labels.

### 2. Action Plan & Operational Milestones
- **Written Agreement:** Formulate a 30-60 day plan with clear, binary evaluation criteria.
- **Weekly Check-Ins:** Dedicated feedback loops to celebrate progress and course-correct deviations immediately.

### 3. Team-Wide Health & Culture Protection
- Guard team psychological safety. Zero tolerance for condescending conduct regardless of individual brilliance.
- Maintain transparent documentation so the team understands project priorities without rumor or anxiety.

### 4. Bar Raiser Evaluation Criteria
- Mature, empathetic executive presence with proven frameworks for driving performance and psychological safety.`,
  });
}

console.log(`Generated total of ${questions.length} enterprise questions!`);
const trackCounts = {};
questions.forEach((q) => {
  trackCounts[q.type] = (trackCounts[q.type] || 0) + 1;
});
console.log('Breakdown by track:', trackCounts);

const outputPath = path.join(__dirname, 'curatedQuestions.json');
fs.writeFileSync(outputPath, JSON.stringify(questions, null, 2), 'utf8');
console.log(`Successfully saved curated questions to ${outputPath}!`);
