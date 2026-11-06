require('dotenv').config();
const mongoose = require('mongoose');
const QuestionBank = require('../models/QuestionBank');
const connectDB = require('./db');

const questions = [
  {
    "type": "dsa",
    "difficulty": "easy",
    "level": "L3",
    "companyTags": [
      "Google",
      "Meta",
      "Amazon"
    ],
    "prompt": "Given an array of integers nums and an integer target, return the indices of the two numbers such that they add up to target. You may assume each input has exactly one solution, and you may not use the same element twice. Explain how a single-pass hash table reduces the time complexity from O(n^2) to O(n).",
    "tags": [
      "array",
      "hash-table",
      "two-sum",
      "core-fundamentals"
    ],
    "modelAnswer": "### 1. Optimal Approach & Key Strategy\nUse a single-pass Hash Map. As we iterate through `nums`, for each element `num` at index `i`, calculate its required complement: `complement = target - num`. If `complement` is already in our hash map, we immediately return `[map[complement], i]`. Otherwise, insert `num: i` into the map and continue.\n\n### 2. Complexity Analysis\n- **Time Complexity:** $O(n)$ where $n$ is the length of `nums`. We perform at most one lookup and insertion per element, which take $O(1)$ amortized time.\n- **Space Complexity:** $O(n)$ auxiliary space to store at most $n$ items in the hash table.\n\n### 3. Key Edge Cases & Common Pitfalls\n- Duplicate numbers in `nums` that sum to `target` (e.g. `[3, 3]` with target `6`). The single-pass approach handles this naturally because the check happens before overwriting the key.\n- Negative integers or zero (e.g., `target = -5`, `nums = [-2, -3]`).\n- Integer overflow in languages like C++/Java (not an issue in Python/JS, but good to clarify).\n\n### 4. Bar Raiser Rubric Checkpoints\n- Candidate clarifies whether the array is sorted (if sorted, Two Pointers in $O(1)$ space is optimal).\n- Explicitly states the space-time trade-off compared to the $O(n^2)$ brute force approach."
  },
  {
    "type": "dsa",
    "difficulty": "medium",
    "level": "L3",
    "companyTags": [
      "Amazon",
      "Microsoft",
      "Apple"
    ],
    "prompt": "Given a singly linked list representing customer order checkpoints, reverse the list in-place and return the new head. Compare the memory trade-offs of the iterative vs recursive approaches.",
    "tags": [
      "linked-list",
      "in-place",
      "pointers"
    ],
    "modelAnswer": "### 1. Optimal Approach & Key Strategy\nIterative Three-Pointer traversal (`prev`, `curr`, `next`). Initialize `prev = null` and `curr = head`. In a while loop while `curr != null`: save `next = curr.next`, point `curr.next = prev`, advance `prev = curr`, and advance `curr = next`. When the loop finishes, `prev` points to the new head of the reversed list.\n\n### 2. Complexity Analysis\n- **Time Complexity:** $O(n)$ where $n$ is the number of nodes in the linked list. Each node's pointer is modified exactly once.\n- **Space Complexity:** $O(1)$ auxiliary space for the iterative approach. The recursive approach requires $O(n)$ call stack frames, creating stack overflow risk for lists with $n > 10^4$.\n\n### 3. Key Edge Cases & Common Pitfalls\n- Empty list (`head = null`) or single-node list (`head.next = null`).\n- Losing the reference to the rest of the list by overwriting `curr.next` before storing `curr.next` in a temporary variable.\n\n### 4. Bar Raiser Rubric Checkpoints\n- Reversal performed strictly in-place without creating new `ListNode` allocations.\n- Clear articulation of the recursion stack overhead."
  },
  {
    "type": "dsa",
    "difficulty": "medium",
    "level": "L4",
    "companyTags": [
      "Google",
      "Meta",
      "Stripe"
    ],
    "prompt": "Given a streaming string s of event keys, find the length of the longest continuous substring without duplicate characters using the sliding window pattern. What are the optimal time and space bounds?",
    "tags": [
      "sliding-window",
      "strings",
      "hash-set"
    ],
    "modelAnswer": "### 1. Optimal Approach & Key Strategy\nSliding Window with a Hash Map storing the most recent index of each character. Maintain two pointers `left` and `right`. As `right` scans through string `s`: if `s[right]` is already in the map and its recorded index $\\ge$ `left`, jump `left = map[s[right]] + 1`. Update `map[s[right]] = right` and calculate `maxLength = max(maxLength, right - left + 1)`.\n\n### 2. Complexity Analysis\n- **Time Complexity:** $O(n)$ where $n$ is the length of string `s`. By storing the last seen index, `left` jumps directly forward without incremental single-step incrementing.\n- **Space Complexity:** $O(\\min(n, \\Sigma))$ where $\\Sigma$ is the alphabet size (at most 128 for ASCII or 256 for extended ASCII).\n\n### 3. Key Edge Cases & Common Pitfalls\n- Empty string (length 0) and single character string (length 1).\n- Characters repeating after the window has already moved past them (crucial check: `map[char] >= left` before jumping `left`).\n- Strings where all characters are identical (e.g. `\"bbbbb\"` -> length 1).\n\n### 4. Bar Raiser Rubric Checkpoints\n- Candidate optimizes from $O(2n)$ (where both left and right iterate one-by-one) to $O(n)$ via direct index jumps."
  },
  {
    "type": "dsa",
    "difficulty": "medium",
    "level": "L4",
    "companyTags": [
      "Uber",
      "Google",
      "Amazon"
    ],
    "prompt": "An m x n grid represents a geographical delivery zone where 1s are accessible service zones and 0s are unserviceable areas. Return the total count of connected clusters (islands) using BFS or DFS.",
    "tags": [
      "graph",
      "bfs",
      "dfs",
      "matrix-traversal"
    ],
    "modelAnswer": "### 1. Optimal Approach & Key Strategy\nBreadth-First Search (BFS) or Depth-First Search (DFS) connected component counting. Iterate over every cell `(r, c)` in the $m \\times n$ grid. When a cell with value `'1'` is encountered, increment `islandCount` and trigger BFS/DFS to sink the entire island by marking all reachable adjacent `'1'` cells as `'0'` (or recording them in a `visited` set).\n\n### 2. Complexity Analysis\n- **Time Complexity:** $O(m \\times n)$ since every cell is visited at most twice (once in the outer loops and once during BFS/DFS traversal).\n- **Space Complexity:** $O(\\min(m, n))$ for BFS queue in the worst case (diagonal island), or $O(m \\times n)$ recursion stack for DFS on an all-1s grid.\n\n### 3. Key Edge Cases & Common Pitfalls\n- Empty grid or grids with $m=0, n=0$.\n- Grid containing only water (`'0'`s) or entirely land (`'1'`s).\n- Recursion depth limit in Python if using DFS on large matrices ($> 1000 \\times 1000$). Iterative BFS is preferred in production.\n\n### 4. Bar Raiser Rubric Checkpoints\n- Candidate validates bounds `0 <= nr < m` and `0 <= nc < n` cleanly before enqueuing.\n- Explains the in-place modification trade-off vs immutable `visited` set."
  },
  {
    "type": "dsa",
    "difficulty": "medium",
    "level": "L4",
    "companyTags": [
      "Google",
      "Meta",
      "Microsoft"
    ],
    "prompt": "You are given an array of transaction intervals [start, end]. Merge all overlapping intervals and return a consolidated schedule. How does sorting by start time eliminate pairwise interval comparisons?",
    "tags": [
      "intervals",
      "sorting",
      "greedy"
    ],
    "modelAnswer": "### 1. Optimal Approach & Key Strategy\nSort-and-Merge Greedy approach. Sort the intervals array by their `start` time ascending: `intervals.sort(key=lambda x: x[0])`. Initialize an empty `merged` list. For each interval: if `merged` is empty or `current.start > merged[-1].end`, append `current`. Otherwise, there is an overlap, so update the previous interval's end: `merged[-1].end = max(merged[-1].end, current.end)`.\n\n### 2. Complexity Analysis\n- **Time Complexity:** $O(n \\log n)$ dominated by sorting the $n$ intervals. The subsequent linear scan takes $O(n)$ time.\n- **Space Complexity:** $O(n)$ to store the output (or $O(\\log n)$ auxiliary space for in-place sorting).\n\n### 3. Key Edge Cases & Common Pitfalls\n- Intervals touching at boundaries (e.g. `[1, 4]` and `[4, 5]` should merge to `[1, 5]`).\n- One interval completely containing another (e.g. `[1, 10]` and `[2, 6]` -> `[1, 10]`).\n- Unsorted input intervals.\n\n### 4. Bar Raiser Rubric Checkpoints\n- Clear justification for why sorting by `start` guarantees that once an interval is closed, no subsequent interval can overlap with it."
  },
  {
    "type": "dsa",
    "difficulty": "hard",
    "level": "L5",
    "companyTags": [
      "Google",
      "Stripe"
    ],
    "prompt": "Given an unsorted array of transaction IDs containing positive and negative integers, return the smallest missing positive integer in O(n) time and O(1) auxiliary space using in-place index mapping.",
    "tags": [
      "array",
      "in-place-hashing",
      "hard"
    ],
    "modelAnswer": "### 1. Optimal Approach & Key Strategy\nCycle Sort / In-Place Index Mapping. In an array of size $n$, the smallest missing positive integer MUST lie in the range $[1, n + 1]$. Iterate through `nums`: while `1 <= nums[i] <= n` and `nums[nums[i] - 1] != nums[i]`, swap `nums[i]` with `nums[nums[i] - 1]` to place each number $x$ at its correct 0-based index $x - 1$. After placement, perform a second linear pass: the first index `i` where `nums[i] != i + 1` gives the answer `i + 1`. If all match, return `n + 1`.\n\n### 2. Complexity Analysis\n- **Time Complexity:** $O(n)$ total. Although there is a nested while loop, each swap places at least one number in its permanent correct position, so at most $n$ swaps occur across the entire pass.\n- **Space Complexity:** $O(1)$ auxiliary space since modifications are done directly in-place.\n\n### 3. Key Edge Cases & Common Pitfalls\n- Duplicates in array (e.g., `[1, 1]`). The condition `nums[nums[i] - 1] != nums[i]` prevents infinite swapping loops.\n- Negative numbers and numbers larger than $n$, which are simply ignored.\n\n### 4. Bar Raiser Rubric Checkpoints\n- Candidate proves that the while loop does not degrade to $O(n^2)$ using amortized analysis."
  },
  {
    "type": "dsa",
    "difficulty": "hard",
    "level": "L5",
    "companyTags": [
      "Amazon",
      "Uber",
      "Meta"
    ],
    "prompt": "Design and implement an LRU (Least Recently Used) Cache with O(1) average time complexity for both get and put operations. Explain why a Hash Map paired with a Doubly Linked List is the optimal architecture.",
    "tags": [
      "design",
      "hash-map",
      "doubly-linked-list",
      "cache"
    ],
    "modelAnswer": "### 1. Optimal Approach & Key Strategy\nCombine a Hash Map with a Doubly Linked List (DLL) with dummy `head` and `tail` sentinel nodes.\n- **Data Structure:** `map` maps `key -> DLL Node`. Each DLL node contains `key`, `val`, `prev`, `next`.\n- **get(key):** If key not in map, return `-1`. Otherwise, retrieve node, remove it from its current position in the DLL, insert it right after `head` (most recently used), and return `node.val`.\n- **put(key, val):** If key exists, update value and move to head. If key is new: if at capacity, remove least recently used node from right before `tail`, delete its key from map; create new node, insert at head, and insert into map.\n\n### 2. Complexity Analysis\n- **Time Complexity:** $O(1)$ for both `get` and `put`. Hash map lookups and DLL node deletions/insertions with known pointers are strictly $O(1)$.\n- **Space Complexity:** $O(C)$ where $C$ is the capacity limit of the cache.\n\n### 3. Key Edge Cases & Common Pitfalls\n- Capacity = 1.\n- Updating an existing key when cache is already at capacity (should update value without evicting a different key).\n- Concurrency / thread safety: in a multi-threaded system, mutex read/write locks or a segmented cache are necessary.\n\n### 4. Bar Raiser Rubric Checkpoints\n- Candidate uses dummy `head` and `tail` nodes to eliminate null checks during node removal."
  },
  {
    "type": "dsa",
    "difficulty": "hard",
    "level": "L5",
    "companyTags": [
      "Meta",
      "Uber"
    ],
    "prompt": "Given k sorted linked lists representing real-time ride telemetries, merge all lists into one sorted linked list. Compare the min-heap priority queue approach vs divide-and-conquer merge sort.",
    "tags": [
      "heap",
      "priority-queue",
      "divide-and-conquer"
    ],
    "modelAnswer": "### 1. Optimal Approach & Key Strategy\nApproach A (Min-Heap): Insert the head of all $k$ lists into a Min-Heap keyed on `node.val`. Repeatedly extract the minimum node, attach it to our merged list, and if that node has a `next`, push `node.next` into the heap.\nApproach B (Divide & Conquer): Pair up the $k$ lists and merge each pair using standard 2-list merge. Repeat until only 1 list remains.\n\n### 2. Complexity Analysis\n- **Time Complexity:** $O(N \\log k)$ where $N$ is the total number of nodes across all $k$ lists. In each step, extracting/inserting into the heap of size $k$ takes $O(\\log k)$ time.\n- **Space Complexity:** Min-Heap requires $O(k)$ auxiliary space. Divide & Conquer merge requires $O(1)$ space iterative or $O(\\log k)$ stack space.\n\n### 3. Key Edge Cases & Common Pitfalls\n- Empty input list (`lists = []`) or lists containing only empty nodes (`lists = [None, None]`).\n- Comparing custom `ListNode` objects in Python heaps (requires custom comparator or tuple `(node.val, id, node)` to prevent comparison errors on equal values).\n\n### 4. Bar Raiser Rubric Checkpoints\n- Candidate clearly evaluates space complexity: Divide & Conquer achieves $O(1)$ auxiliary space in-place, outperforming Min-Heap's $O(k)$ memory."
  },
  {
    "type": "dsa",
    "difficulty": "hard",
    "level": "L6+",
    "companyTags": [
      "Google",
      "Stripe",
      "Meta"
    ],
    "prompt": "Given a sliding window of size k moving over an array of size n, output the maximum value in each window position in O(n) total time using a monotonically decreasing deque.",
    "tags": [
      "monotonic-deque",
      "sliding-window",
      "staff-level"
    ],
    "modelAnswer": "### 1. Optimal Approach & Key Strategy\nMonotonic Decreasing Deque storing array indices.\nFor each element `nums[i]`:\n1. **Evict out-of-window elements:** While `deque[0] <= i - k`, pop from front.\n2. **Maintain monotonic order:** While deque is non-empty and `nums[deque[-1]] < nums[i]`, pop from back because smaller older elements can never be the maximum again.\n3. Push current index `i` to back of deque.\n4. If `i >= k - 1`, the maximum for the current window is `nums[deque[0]]`.\n\n### 2. Complexity Analysis\n- **Time Complexity:** $O(n)$ amortized. Each index is pushed into the deque exactly once and popped at most once.\n- **Space Complexity:** $O(k)$ auxiliary space for the deque holding at most $k$ indices.\n\n### 3. Key Edge Cases & Common Pitfalls\n- Window size $k = 1$ (result is the array itself) or $k \\ge n$.\n- Strictly decreasing vs non-decreasing comparison (use `<` rather than `<=` if duplicate values occur in the window).\n\n### 4. Bar Raiser Rubric Checkpoints\n- Proof that amortized time per element is $O(1)$ despite the inner while loops."
  },
  {
    "type": "dsa",
    "difficulty": "medium",
    "level": "L4",
    "companyTags": [
      "Amazon",
      "Google"
    ],
    "prompt": "Given an array of words, return the top k most frequently occurring terms. How do you implement this in O(n log k) time using a Min-Heap instead of full sorting?",
    "tags": [
      "top-k",
      "min-heap",
      "hash-map"
    ],
    "modelAnswer": "### 1. Optimal Approach & Key Strategy\nHash Map frequency count paired with a bounded Min-Heap of size $k$.\n1. Build frequency map `counts = Counter(words)` in $O(n)$ time.\n2. Maintain a Min-Heap bounded to size $k$. For each `(word, freq)` pair, push into the heap. If heap size exceeds $k$, pop the minimum.\n3. Elements with equal frequency are tie-broken by reverse alphabetical order of `word`.\n4. Pop all elements from the heap and reverse the result list. Alternatively, QuickSelect can achieve $O(n)$ average time.\n\n### 2. Complexity Analysis\n- **Time Complexity:** $O(n + m \\log k)$ where $n$ is total words and $m$ is unique words. Since $k \\le m \\le n$, this is $O(n \\log k)$.\n- **Space Complexity:** $O(m)$ for the frequency map and $O(k)$ for the heap.\n\n### 3. Key Edge Cases & Common Pitfalls\n- $k$ equals the number of unique words.\n- Lexicographical tie-breaking: when frequencies match, lexicographically smaller words must rank higher.\n\n### 4. Bar Raiser Rubric Checkpoints\n- Candidate explains why Min-Heap of size $k$ is superior to Max-Heap of size $m$ ($O(m \\log k)$ vs $O(m \\log m)$)."
  },
  {
    "type": "dsa",
    "difficulty": "medium",
    "level": "L4",
    "companyTags": [
      "Google",
      "Meta",
      "Amazon"
    ],
    "prompt": "There are a total of numCourses courses you have to take, labeled from 0 to numCourses - 1. You are given an array prerequisites where prerequisites[i] = [ai, bi] indicates that you must take course bi first if you want to take course ai. Return true if you can finish all courses, or false if there is a cycle. Walk through Kahn's algorithm vs DFS cycle detection.",
    "tags": [
      "graph",
      "topological-sort",
      "cycle-detection",
      "kahns-algorithm"
    ],
    "modelAnswer": "### 1. Optimal Approach & Key Strategy\nKahn's Algorithm (BFS Topological Sort with In-Degree tracking):\n1. Build adjacency list `adj` and calculate in-degree array `inDegree` for all $V$ courses.\n2. Enqueue all courses with `inDegree[i] == 0` (courses with no prerequisites).\n3. While queue is not empty, pop course `u`, increment `completedCount`. For each neighbor `v` of `u`, decrement `inDegree[v]`. If `inDegree[v] == 0`, enqueue `v`.\n4. If `completedCount == numCourses`, return `true`; otherwise a cycle exists, return `false`.\n\n### 2. Complexity Analysis\n- **Time Complexity:** $O(V + E)$ where $V = \\text{numCourses}$ and $E = \\text{len(prerequisites)}$. Every vertex and edge is processed once.\n- **Space Complexity:** $O(V + E)$ for adjacency list, in-degree array, and BFS queue.\n\n### 3. Key Edge Cases & Common Pitfalls\n- Self-loops (e.g. `[0, 0]`).\n- Disconnected graph components (courses with no prerequisites must be processed simultaneously).\n\n### 4. Bar Raiser Rubric Checkpoints\n- Compares Kahn's BFS with 3-color DFS (WHITE=unvisited, GRAY=visiting, BLACK=visited) for cycle detection."
  },
  {
    "type": "dsa",
    "difficulty": "hard",
    "level": "L5",
    "companyTags": [
      "Google",
      "Amazon",
      "Meta"
    ],
    "prompt": "Given n non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining. Compare the Two-Pointer O(1) space solution with the Monotonic Stack approach.",
    "tags": [
      "two-pointers",
      "stack",
      "dynamic-programming",
      "trapping-rain-water"
    ],
    "modelAnswer": "### 1. Optimal Approach & Key Strategy\nTwo-Pointer Approach with $O(1)$ auxiliary space.\nMaintain pointers `left = 0`, `right = n - 1` and running maximums `left_max = 0`, `right_max = 0`.\nWhile `left < right`:\n- If `height[left] <= height[right]`:\n  - If `height[left] >= left_max`, update `left_max = height[left]`.\n  - Else water trapped at `left` is `left_max - height[left]`. Increment `left`.\n- Else:\n  - If `height[right] >= right_max`, update `right_max = height[right]`.\n  - Else water trapped at `right` is `right_max - height[right]`. Decrement `right`.\n\n### 2. Complexity Analysis\n- **Time Complexity:** $O(n)$ single pass over the elevation map.\n- **Space Complexity:** $O(1)$ space, vastly superior to the $O(n)$ DP or stack array approaches.\n\n### 3. Key Edge Cases & Common Pitfalls\n- Monotonically increasing or decreasing elevations (trap 0 water).\n- Empty array or arrays with fewer than 3 elements (cannot trap water).\n\n### 4. Bar Raiser Rubric Checkpoints\n- Clear intuitive explanation of why comparing `height[left] <= height[right]` allows water calculation relying strictly on `left_max`."
  },
  {
    "type": "dsa",
    "difficulty": "medium",
    "level": "L4",
    "companyTags": [
      "Meta",
      "Amazon",
      "Apple"
    ],
    "prompt": "Given a string s and a dictionary of strings wordDict, return true if s can be segmented into a space-separated sequence of one or more dictionary words. Explain the DP state transitions and when Trie-based pruning is beneficial.",
    "tags": [
      "dynamic-programming",
      "strings",
      "trie",
      "word-break"
    ],
    "modelAnswer": "### 1. Optimal Approach & Key Strategy\nDynamic Programming with Boolean array `dp` of size $n + 1$.\n- Let `dp[i]` be true if substring `s[0...i]` can be segmented into valid words.\n- Base case: `dp[0] = true`.\n- Transition: For `i` from 1 to $n$, and for each word in `wordDict` of length $L$: if `i >= L` and `dp[i - L] == true` and `s[i - L ... i] == word`, set `dp[i] = true` and break.\n- Optimization: Store `wordDict` in a Trie or Hash Set with maximum word length $M$ to limit inner loop to $\\min(i, M)$.\n\n### 2. Complexity Analysis\n- **Time Complexity:** $O(n \\times M)$ where $n$ is length of string $s$ and $M$ is max word length in dictionary.\n- **Space Complexity:** $O(n)$ for the DP array plus $O(\\sum \\text{len}(w))$ for dictionary hash set.\n\n### 3. Key Edge Cases & Common Pitfalls\n- Entire string is one single word in dictionary.\n- Repeated letters (e.g. `s = \"aaaaaaa\"`, `dict = [\"aaaa\", \"aaa\"]`).\n\n### 4. Bar Raiser Rubric Checkpoints\n- Candidate restricts the inner loop to the maximum word length $M$ rather than scanning all $O(i)$ prefixes."
  },
  {
    "type": "system_design",
    "difficulty": "medium",
    "level": "L4",
    "companyTags": [
      "Google",
      "Meta",
      "Stripe"
    ],
    "prompt": "Design a scalable URL shortening service like bit.ly capable of handling 500 million redirects per day with under 10ms read latency. How do you generate unique 7-character base62 tokens without collisions?",
    "tags": [
      "url-shortener",
      "base62",
      "caching",
      "scalability"
    ],
    "modelAnswer": "### 1. Optimal System Architecture\n- **Traffic Estimations:** 500M reads/day $\\approx$ 6,000 QPS average (peak ~15,000 QPS). Write ratio 100:1 read/write $\\approx$ 60 write QPS.\n- **Token Generation (Base62):** A 7-character Base62 string ($[a-zA-Z0-9]$) yields $62^7 \\approx 3.5 \\text{ Trillion}$ unique URLs.\n- **Collision-free ID Generator:** Use a distributed Range-Based Key Generator (ZooKeeper or Redis ticket service dispensing ranges of 1,000,000 integer IDs to API nodes) or Snowflake 64-bit integer IDs. Convert ID to Base62 via modulo arithmetic.\n- **Storage Layer:** NoSQL Key-Value Store (DynamoDB or Cassandra) partitioned on `short_token` with replication.\n- **Read Cache:** Distributed Redis/Memcached cluster caching the top 20% hottest URLs (80/20 Pareto rule), achieving < 5ms read latency.\n\n### 2. Scaling & Reliability\n- Global Geo-DNS (Route 53) routing requests to nearest edge CDN/PoP.\n- Cache evictions: LRU (Least Recently Used) with 30-day TTL.\n\n### 3. Edge Cases & Bottlenecks\n- Cache stampede / thundering herd on viral links: use Mutex locking / probabilistic early expiration (XFetch).\n- Security: rate-limit writes per API key to prevent link pollution and DDoS."
  },
  {
    "type": "system_design",
    "difficulty": "hard",
    "level": "L5",
    "companyTags": [
      "Stripe",
      "Google",
      "Amazon"
    ],
    "prompt": "Design a distributed rate limiter protecting microservices across multiple data centers. Evaluate Token Bucket, Leaky Bucket, and Sliding Window Counter, and explain how to synchronize counts without Redis latency bottlenecks.",
    "tags": [
      "rate-limiter",
      "token-bucket",
      "distributed-systems",
      "redis"
    ],
    "modelAnswer": "### 1. Algorithm Evaluation & Architecture\n- **Algorithm Choice:** Sliding Window Counter or Token Bucket. Token Bucket allows controlled bursts; Sliding Window Counter prevents double-quota spikes at window boundaries with minimal memory.\n- **Multi-DC Synchronization:**\n  - Avoid cross-region synchronous database writes ($> 70\\text{ms}$ RTT latency).\n  - Use **Local Token Allocation:** A centralized service allocates a token budget (e.g. 1,000 tokens/sec) to local Envoy/proxy instances in each region. Proxies evaluate limits locally in-memory (< 1ms).\n  - If a region exhausts its local budget, it requests an incremental batch from the central cluster asynchronously.\n\n### 2. Storage & Concurrency\n- Local Redis cluster per data center running Lua scripts to atomically execute `EVAL` sliding-window check and increment.\n- Memory: 100M active API keys $\\times$ 32 bytes $\\approx 3.2\\text{ GB}$ RAM (fits comfortably on small Redis cluster).\n\n### 3. Failure Modes\n- Graceful degradation (Fail Open vs Fail Closed): If the rate limiting service fails, default to \"Fail Open\" with alerts to prevent blocking legitimate customer traffic during outages."
  },
  {
    "type": "system_design",
    "difficulty": "hard",
    "level": "L5",
    "companyTags": [
      "Uber",
      "Lyft",
      "DoorDash"
    ],
    "prompt": "Design a real-time ride-matching and geospatial driver tracking platform like Uber. How do you ingest millions of driver GPS updates per second and query available drivers within a 3km radius under 50ms?",
    "tags": [
      "geospatial",
      "uber",
      "h3-spatial-index",
      "kafka",
      "websockets"
    ],
    "modelAnswer": "### 1. Optimal System Architecture\n- **Driver Location Ingestion:** 2M active drivers emitting GPS updates every 4 seconds = 500,000 writes/sec.\n- **Ingestion Pipeline:** WebSocket Gateway $\\rightarrow$ Kafka (partitioned by City/Geo-region) $\\rightarrow$ Location Ingestion Worker $\\rightarrow$ In-Memory Geospatial Store.\n- **Geospatial Indexing (Uber H3 or Google S2):** Hexagonal spatial index (H3 Resolution 8-9: ~100m to ~400m per cell). Hexagons have uniform neighbor distances.\n- **Driver Store:** In-memory Redis cluster or custom Go/Rust actor service holding `H3_Cell_ID -> Set(Driver_ID, Coordinates, Status, Last_Updated)`.\n\n### 2. Ride Matching & Search\n- When a rider requests a pickup: Convert rider coordinates to H3 Cell ID, query that cell and its $k$-ring neighbors (up to 3km radius). Filter for drivers with `status == AVAILABLE`.\n- Send dispatch offers via push notification/WebSocket with 15-second acceptance lease (distributed lock via Redis Redlock).\n\n### 3. Key Bottlenecks & Edge Cases\n- Hotspots: Stadium events or airport surges where 50k users cluster in one cell. Mitigate by dynamically adjusting H3 resolution and shedding non-critical status pings."
  },
  {
    "type": "system_design",
    "difficulty": "hard",
    "level": "L6+",
    "companyTags": [
      "Stripe",
      "PayPal",
      "Square"
    ],
    "prompt": "Design a high-volume, double-entry payment ledger system with zero loss tolerance and strict idempotent transaction guarantees. How do you handle database failovers during an in-flight card transaction?",
    "tags": [
      "fintech",
      "double-entry-ledger",
      "idempotency",
      "acid",
      "distributed-transactions"
    ],
    "modelAnswer": "### 1. Core Principles & Architecture\n- **Double-Entry Bookkeeping:** Every financial transaction must consist of balanced debits and credits: $\\sum \\text{Debits} = \\sum \\text{Credits}$. Balances are never updated in-place; they are calculated as the immutable append-only sum of ledger journal entries.\n- **Idempotency Layer:** Client generates a unique `Idempotency-Key` (UUID v4). An API Gateway / Idempotency Store (PostgreSQL with unique constraint or Redis with 24-hr TTL) inserts the key atomically before processing. If key exists, return the cached prior response or in-flight status.\n- **Storage Engine:** Relational database with strict Serializable / Strict 2-Phase Locking (PostgreSQL with active-passive read replica and synchronous replication).\n\n### 2. Handling In-Flight Failovers & Partial Failures\n- **Two-Phase Commit / Saga Pattern:**\n  1. Authorize: Hold customer funds.\n  2. Capture: Post journal entry in ledger.\n  3. Settle: Batched ACH/wire settlement with bank networks.\n- Reconciler Service: Asynchronous background worker polling payment gateway webhooks and matching them against internal journal records to catch dropped connections.\n\n### 3. Bar Raiser Rubric Checkpoints\n- Candidate never uses floating-point numbers for currency (always 64-bit integer cents/micros).\n- Explains deterministic recovery from split-brain network partitions."
  },
  {
    "type": "system_design",
    "difficulty": "medium",
    "level": "L4",
    "companyTags": [
      "Netflix",
      "YouTube",
      "Meta"
    ],
    "prompt": "Design a globally distributed video streaming and transcoding infrastructure like Netflix. Explain the chunked DASH/HLS delivery pipeline, multi-bitrate video encoding, and CDN edge caching hierarchy.",
    "tags": [
      "video-streaming",
      "hls",
      "transcoding",
      "cdn",
      "caching"
    ],
    "modelAnswer": "### 1. Transcoding & Storage Pipeline\n- **Upload:** Creator uploads raw video to S3 through direct multi-part pre-signed URLs.\n- **Job Orchestration:** Upload event triggers AWS SQS/Kafka job queue consumed by a distributed fleet of GPU transcoders.\n- **Transcoding (DASH / HLS):** Split video into 2-6 second chunks encoded in multiple resolutions (1080p, 720p, 480p, 4K) using H.264/AV1 codecs. Generate manifest file (`.m3u8` or `.mpd`).\n- **Storage:** Cold chunks in S3, hot manifest and popular video chunks replicated to Origin Shield.\n\n### 2. Edge CDN Delivery Hierarchy\n- Three-tier CDN architecture: Origin Shield $\\rightarrow$ Regional CDN $\\rightarrow$ Local Edge PoP / ISP OpenConnect Appliances located inside Internet Service Provider data centers.\n- Adaptive Bitrate Streaming (ABR): Video player dynamically measures network bandwidth per chunk download and requests higher/lower bitrate chunk automatically.\n\n### 3. Bottlenecks & Optimization\n- Cache hit ratio target > 98% for popular releases via predictive cache pre-warming before launch time."
  },
  {
    "type": "behavioral",
    "difficulty": "medium",
    "level": "L4",
    "companyTags": [
      "Amazon",
      "Google",
      "Meta"
    ],
    "prompt": "Describe a situation where you had a fundamental technical disagreement with your Tech Lead or Principal Architect on design choice. How did you advocate for your point of view while remaining collaborative?",
    "tags": [
      "disagree-and-commit",
      "conflict-resolution",
      "communication"
    ],
    "modelAnswer": "### 1. Ideal STAR Framework Structure\n- **Situation:** A critical microservice redesign where the Tech Lead advocated for a complex distributed event-driven architecture, while you believed a synchronous modular monolith was far simpler and sufficient for the team's scale and timeline.\n- **Task:** Build technical alignment without stalling the product roadmap or damaging team dynamics.\n- **Action:**\n  - Avoided emotional or opinion-based arguments; developed a concrete Decision Matrix comparing both approaches on latency, operational maintenance, failure modes, and delivery timeline.\n  - Built a 1-day benchmark prototype measuring latency and throughput under realistic simulated load.\n  - Scheduled a 1-on-1 discussion to actively listen to the Tech Lead's long-term organizational concerns.\n- **Result:** Agreed on a pragmatic phased approach (starting with a clean modular structure with event interfaces). Project shipped 2 weeks ahead of schedule with zero P0 incidents.\n\n### 2. Bar Raiser Rubric Checkpoints\n- Candidate shows humility, data-driven advocacy, and deep adherence to \"Disagree and Commit\"."
  },
  {
    "type": "behavioral",
    "difficulty": "hard",
    "level": "L5",
    "companyTags": [
      "Google",
      "Meta",
      "Stripe"
    ],
    "prompt": "Tell me about a major production outage (P0/P1) caused by your code or your team's release. Walk me through your incident response, stakeholder communication, and post-mortem blameless culture.",
    "tags": [
      "incident-response",
      "production-outage",
      "blameless-postmortem"
    ],
    "modelAnswer": "### 1. Ideal STAR Framework Structure\n- **Situation:** A database migration script deployed during an off-peak release locked the primary PostgreSQL transactions table, causing a 12-minute API outage for checkout services.\n- **Task:** Rapid mitigation, transparent customer communication, and eliminating the vulnerability permanently.\n- **Action:**\n  - **Mitigation First:** Immediately terminated the blocking migration query and rolled back the release (TTM = 4 mins).\n  - **Incident Channel:** Assumed Incident Commander role, posted updates to the status page and executive stakeholders every 5 minutes.\n  - **Blameless Post-Mortem:** Authored a comprehensive 5-Whys root cause analysis. Avoided assigning personal blame; focused on systemic CI/CD guardrails.\n  - Added automated migration linting to detect non-concurrent index additions in PR pipelines.\n- **Result:** MTTR reduced by 40% across the organization, and zero database lock regressions occurred over the next 18 months.\n\n### 2. Bar Raiser Rubric Checkpoints\n- Prioritizes mitigation over debugging during active incident. Demonstrates blameless engineering culture."
  },
  {
    "type": "behavioral",
    "difficulty": "hard",
    "level": "L5",
    "companyTags": [
      "Amazon",
      "Apple",
      "Uber"
    ],
    "prompt": "Give an example of a time when you were handed vague, ambiguous requirements for a critical initiative with an aggressive deadline. How did you structure the problem, define scope, and deliver?",
    "tags": [
      "ambiguity",
      "scope-definition",
      "bias-for-action"
    ],
    "modelAnswer": "### 1. Ideal STAR Framework Structure\n- **Situation:** Product leadership requested \"an AI-powered candidate screening experience\" with no formal PRD, metrics, or technical specifications, slated for launch within 6 weeks.\n- **Task:** Turn a vague vision into an achievable, high-impact MVP.\n- **Action:**\n  - Conducted rapid user interviews with 5 hiring managers and recruiters to isolate the top 2 painful bottlenecks.\n  - Drafted a 1-page PRD defining clear in-scope vs out-of-scope boundaries and 3 core success metrics (time-to-review, candidate completion rate).\n  - Broke delivery into 3 two-week vertical slices, aligning daily with product and design.\n- **Result:** Delivered the MVP on schedule, reducing recruiter manual triage time by 34% with an 88% candidate satisfaction rating.\n\n### 2. Bar Raiser Rubric Checkpoints\n- Proactive ownership; avoids waiting for perfect direction; drives alignment across cross-functional partners."
  },
  {
    "type": "hr_round",
    "difficulty": "medium",
    "level": "L4",
    "companyTags": [
      "Google",
      "Meta",
      "Amazon",
      "Microsoft"
    ],
    "prompt": "Walk me through your professional journey, the primary motivation behind looking for a new role right now, and what specifically about our engineering mission and team resonates with you.",
    "tags": [
      "career-story",
      "motivation",
      "culture-fit"
    ],
    "modelAnswer": "### 1. Ideal Response Blueprint\n- **Hook & Trajectory (90 seconds):** Structured elevator pitch covering early foundational technical growth, transition into leading complex distributed projects, and quantified impact (e.g. scaling traffic 5x or improving developer productivity).\n- **Why Move Now:** Frame departure around seeking greater technical scale, higher ownership, and harder architectural challenges—never speaking negatively of past employers.\n- **Why This Company:** Cite specific engineering blog posts, open-source projects, or architectural challenges unique to this company (e.g. Google's global infra, Stripe's reliability standards).\n\n### 2. Bar Raiser Rubric Checkpoints\n- Concise, confident communication under 2 minutes without rambling."
  },
  {
    "type": "hr_round",
    "difficulty": "medium",
    "level": "L4",
    "companyTags": [
      "Google",
      "Meta",
      "Netflix"
    ],
    "prompt": "How do you handle receiving critical, constructive feedback from managers or peers, and can you share an example where feedback materially changed your approach or working style?",
    "tags": [
      "growth-mindset",
      "feedback-reception",
      "self-awareness"
    ],
    "modelAnswer": "### 1. Ideal Response Blueprint\n- **Mindset:** Welcoming feedback as a diagnostic accelerant for personal and professional growth rather than a personal critique.\n- **Concrete Example:** A manager noted that while your technical solutions were exceptional, your PR descriptions lacked context, leading to slower reviews and friction with junior teammates.\n- **Action Taken:** Developed an automated PR template with architecture diagrams, testing checklists, and benchmark numbers.\n- **Outcome:** Review cycle times dropped by 30% and the template was adopted team-wide."
  },
  {
    "type": "product_management",
    "difficulty": "hard",
    "level": "L5",
    "companyTags": [
      "Meta",
      "Google"
    ],
    "prompt": "Instagram Reels user watch time increased by 18%, but direct message sharing dropped by 12% following a feed ranking algorithm update. How do you investigate this trade-off and decide whether to roll back?",
    "tags": [
      "trade-off-analysis",
      "metrics-degradation",
      "root-cause"
    ],
    "modelAnswer": "### 1. Diagnostic Investigation Framework\n1. **Clarify & Segment:** Is the drop global or isolated to specific cohorts, geographies, app versions, or demographics? Did total DM activity drop, or only Reel-shares?\n2. **Hypothesis Generation:**\n   - Cannibalization: Did immersive video viewing reduce navigation to the direct messaging inbox?\n   - Content Shift: Did the algorithm prioritize passive entertainment (celebrities, comedy) over relatable peer content that prompts personal conversations?\n3. **Data Verification:** Analyze the distribution of shared Reels by creator tier. Check user session lengths and retention.\n4. **Decision Framework:** If 30-day user retention and meaningful social interactions (MSI) are damaged, roll back or retune the objective function to weight shares alongside watch time."
  },
  {
    "type": "product_management",
    "difficulty": "hard",
    "level": "L5",
    "companyTags": [
      "Stripe",
      "Google",
      "OpenAI"
    ],
    "prompt": "Define the North Star metric and 3 counter-metrics for an enterprise AI code generation assistant plugin. How would you prioritize features across junior vs senior developer cohorts?",
    "tags": [
      "north-star-metric",
      "counter-metrics",
      "cohort-prioritization"
    ],
    "modelAnswer": "### 1. Metrics & Prioritization Strategy\n- **North Star Metric:** Daily Active Developers Generating Accepted Code (e.g. `Weekly Accepted Code Lines with 48h Survival Rate`).\n- **Counter-Metrics:**\n  1. Build / Test failure rate in CI (catching hallucinated bugs).\n  2. Latency of code completion suggestions (P95 < 250ms).\n  3. Security vulnerability / CVE insertion rate.\n- **Cohort Prioritization:** Junior engineers benefit from contextual documentation and syntax explanations; Senior engineers prioritize multi-file refactoring, test generation, and architectural consistency."
  },
  {
    "type": "case_study",
    "difficulty": "hard",
    "level": "L5",
    "companyTags": [
      "McKinsey",
      "Google",
      "Amazon"
    ],
    "prompt": "A SaaS platform with $50M ARR is experiencing a sudden increase in net customer churn from 4% to 9% over two quarters. Structure an investigation to isolate the root cause and recommend an operational turnaround plan.",
    "tags": [
      "saas-churn",
      "turnaround",
      "financial-analysis"
    ],
    "modelAnswer": "### 1. Turnaround Investigation Framework\n1. **Segmentation:** Break churn down by customer tier (Enterprise vs Mid-Market vs SMB), tenure (< 90 days vs renewal), and product tier.\n2. **Root Cause Analysis:**\n   - Product: Recent buggy release, missing critical feature integrations.\n   - Pricing: Aggressive price increase or competitor discounting.\n   - Support: Ticket resolution time degradation.\n3. **Turnaround Recommendations:**\n   - Immediate CS intervention on top 20 accounts at risk.\n   - Introduce customer health score telemetry in product analytics.\n   - Restructure customer success compensation around Net Revenue Retention (NRR)."
  },
  {
    "type": "sales_pitch",
    "difficulty": "hard",
    "level": "L5",
    "companyTags": [
      "Stripe",
      "AWS",
      "Datadog"
    ],
    "prompt": "You are presenting a $250k ARR cloud infrastructure observability contract to a CFO who insists on cutting all vendor budgets by 20%. How do you reframe the cost of system outages into an undeniable ROI business case?",
    "tags": [
      "roi-modeling",
      "cfo-negotiation",
      "value-selling"
    ],
    "modelAnswer": "### 1. Executive Pitch & Objection Handling\n- **Acknowledge & Align:** Validate the CFO's fiscal discipline; agree that every dollar spent must generate measurable enterprise returns.\n- **Reframe to Risk & Downtime Cost:**\n  - Quantify client's revenue per hour: e.g. $100M revenue $\\approx$ $11,400/hr. A single 4-hour P0 outage costs $45k in direct revenue plus SLA breach penalties and engineering overtime ($100k+ total).\n  - Show how tool prevents 3 critical outages per year, delivering $350k in saved revenue and engineering hours.\n- **Commercial Flexibility:** Offer a multi-year commitment with back-loaded payment schedules or tiered ingest volume caps to align with immediate budget constraints."
  },
  {
    "type": "managerial",
    "difficulty": "hard",
    "level": "L6+",
    "companyTags": [
      "Google",
      "Amazon",
      "Uber"
    ],
    "prompt": "Walk me through your framework for scaling an engineering organization from 15 to 60 engineers over 18 months. How do you design team topologies, career progression ladders, and hiring committee standards?",
    "tags": [
      "org-scaling",
      "team-topology",
      "hiring-bar"
    ],
    "modelAnswer": "### 1. Organizational Scaling Blueprint\n- **Team Topologies (Two-Pizza Rule):** Segment the single 15-person team into 4-5 focused stream-aligned squads (e.g. Core Platform, Growth, Checkout, Data) with dedicated EMs and Tech Leads.\n- **Engineering Ladder:** Establish unambiguous career competencies (Level 3 to Level 6) across Technical Craft, Execution, Leadership, and Impact.\n- **Hiring Committee Standards:** Decouple hiring decisions from individual managers to prevent bar degradation. Calibrate standard interview loops with strict Bar Raisers.\n- **Communication Architecture:** Shift from informal ad-hoc syncing to written RFCs, OKRs, and weekly demo reviews."
  },
  {
    "type": "managerial",
    "difficulty": "medium",
    "level": "L5",
    "companyTags": [
      "Google",
      "Meta",
      "Amazon"
    ],
    "prompt": "A high-performing Senior Engineer on your team has become toxic in code reviews, alienating junior developers and dismissing cross-functional input. Walk me through your 1-on-1 coaching framework and corrective plan.",
    "tags": [
      "coaching",
      "culture",
      "difficult-conversations"
    ],
    "modelAnswer": "### 1. Coaching & Corrective Framework\n- **Address Promptly:** Never let toxic behavior linger; address it in the very next 1-on-1.\n- **SBI Framework (Situation, Behavior, Impact):**\n  - Situation: \"In yesterday's PR review for the auth migration...\"\n  - Behavior: \"You wrote 'This is garbage code' and unilaterally blocked the release.\"\n  - Impact: \"The author felt demoralized, team velocity slowed, and psychological safety was compromised.\"\n- **Clarify Expectations:** High performance includes elevating teammates; code quality standards can be enforced rigorously with empathy and clear explanation.\n- **Measurable Plan:** Set a 30-day review period with specific check-ins. If behavior continues, escalate to formal PIP."
  },
  {
    "type": "dsa",
    "difficulty": "medium",
    "level": "L4",
    "companyTags": [
      "Google",
      "Microsoft",
      "Amazon"
    ],
    "prompt": "There is an integer array nums sorted in ascending order (with distinct values) that has been rotated at an unknown pivot index. Given the rotated array nums and an integer target, return the index of target if it is in nums, or -1 if it is not. You must write an algorithm with O(log n) runtime complexity.",
    "tags": [
      "binary-search",
      "rotated-array",
      "arrays"
    ],
    "modelAnswer": "### 1. Optimal Approach & Key Strategy\nModified Binary Search. Initialize `left = 0`, `right = n - 1`. In each iteration, compute `mid = (left + right) // 2`. Since the array is rotated at only one pivot, at least one half (`nums[left...mid]` or `nums[mid...right]`) is strictly sorted.\n- If `nums[left] <= nums[mid]` (left half sorted): check if `nums[left] <= target < nums[mid]`. If yes, search left (`right = mid - 1`); else search right (`left = mid + 1`).\n- Else (right half sorted): check if `nums[mid] < target <= nums[right]`. If yes, search right (`left = mid + 1`); else search left (`right = mid - 1`).\n\n### 2. Complexity Analysis\n- **Time Complexity:** $O(\\log n)$ because the search space halves in every iteration.\n- **Space Complexity:** $O(1)$ auxiliary space.\n\n### 3. Key Edge Cases\n- Target is at the pivot or boundaries. Single-element arrays."
  },
  {
    "type": "dsa",
    "difficulty": "hard",
    "level": "L5",
    "companyTags": [
      "Meta",
      "Amazon",
      "Google"
    ],
    "prompt": "A path in a binary tree is a sequence of nodes where each pair of adjacent nodes in the sequence has an edge connecting them. A node can only appear in the sequence at most once. Return the maximum path sum of any non-empty path.",
    "tags": [
      "binary-tree",
      "dfs",
      "recursion",
      "dynamic-programming"
    ],
    "modelAnswer": "### 1. Optimal Approach & Key Strategy\nPost-Order Traversal (DFS with Global Maximum).\nFor each node, compute the maximum gain it can contribute to its parent:\n`max_gain = node.val + max(0, max_gain(left)) + max(0, max_gain(right))`.\nUpdate the global maximum path sum using this candidate path that peaks at `node`.\nReturn to the parent node only the single best branch: `node.val + max(0, max(left_gain, right_gain))`.\n\n### 2. Complexity Analysis\n- **Time Complexity:** $O(n)$ where $n$ is the number of nodes in the binary tree.\n- **Space Complexity:** $O(h)$ where $h$ is tree height ($O(\\log n)$ balanced, $O(n)$ skewed) for recursion stack.\n\n### 3. Key Edge Cases\n- All negative node values: The answer is the single maximum negative node value."
  },
  {
    "type": "dsa",
    "difficulty": "medium",
    "level": "L4",
    "companyTags": [
      "Amazon",
      "Stripe",
      "Meta"
    ],
    "prompt": "You are given an integer array coins representing coins of different denominations and an integer amount representing a total amount of money. Return the fewest number of coins that you need to make up that amount. If that amount of money cannot be made up by any combination of the coins, return -1.",
    "tags": [
      "dynamic-programming",
      "knapsack",
      "coins"
    ],
    "modelAnswer": "### 1. Optimal Approach & Key Strategy\nBottom-Up Dynamic Programming (Unbounded Knapsack).\nInitialize `dp` array of size `amount + 1` filled with `Infinity`, with base case `dp[0] = 0`.\nFor each coin $c$ in `coins`, and for $i$ from $c$ to `amount`:\n`dp[i] = min(dp[i], dp[i - c] + 1)`.\nIf `dp[amount] == Infinity`, return `-1`; otherwise return `dp[amount]`.\n\n### 2. Complexity Analysis\n- **Time Complexity:** $O(A \\times C)$ where $A = \\text{amount}$ and $C = \\text{len(coins)}$.\n- **Space Complexity:** $O(A)$ for the 1D DP table.\n\n### 3. Key Edge Cases\n- Amount = 0 (returns 0). Impossible amount (e.g. amount = 7 with coins = [2, 4])."
  },
  {
    "type": "dsa",
    "difficulty": "medium",
    "level": "L4",
    "companyTags": [
      "Meta",
      "Uber",
      "Google"
    ],
    "prompt": "Given a reference of a node in a connected undirected graph, return a deep copy (clone) of the graph. Each node in the graph contains a value (int) and a list (List[Node]) of its neighbors.",
    "tags": [
      "graph",
      "dfs",
      "bfs",
      "hash-map"
    ],
    "modelAnswer": "### 1. Optimal Approach & Key Strategy\nDFS or BFS with a Hash Map (`visited: original_node -> cloned_node`).\nCheck if `node` has already been cloned in `visited`. If so, return `visited[node]`.\nOtherwise, instantiate `clone = Node(node.val)`, record in `visited[node] = clone`, and iterate through each `neighbor`: recursively clone and append to `clone.neighbors`.\n\n### 2. Complexity Analysis\n- **Time Complexity:** $O(V + E)$ where $V$ is vertices and $E$ is edges.\n- **Space Complexity:** $O(V)$ for hash map and recursion call stack.\n\n### 3. Key Edge Cases\n- Empty graph (`node == null`). Cycles in graph (the hash map prevents infinite recursion loops)."
  },
  {
    "type": "dsa",
    "difficulty": "hard",
    "level": "L6+",
    "companyTags": [
      "Google",
      "Microsoft"
    ],
    "prompt": "Given two sorted arrays nums1 and nums2 of size m and n respectively, return the median of the two sorted arrays. The overall run time complexity should be O(log (m+n)).",
    "tags": [
      "binary-search",
      "divide-and-conquer",
      "hard"
    ],
    "modelAnswer": "### 1. Optimal Approach & Key Strategy\nBinary Search on Partition of the Shorter Array.\nEnsure `nums1` is the shorter array ($m \\le n$). We partition both arrays such that the left half has $(m + n + 1) // 2$ elements.\nPerform binary search on partition index $i$ in $[0, m]$. Derive $j = (m + n + 1) // 2 - i$.\nCheck boundary conditions: `nums1[i-1] <= nums2[j]` and `nums2[j-1] <= nums1[i]`.\nWhen partition is valid:\n- If $(m + n)$ is odd: median is $\\max(L1, L2)$.\n- If even: median is $(\\max(L1, L2) + \\min(R1, R2)) / 2.0$.\n\n### 2. Complexity Analysis\n- **Time Complexity:** $O(\\log(\\min(m, n)))$ binary search strictly on the smaller array.\n- **Space Complexity:** $O(1)$ auxiliary space."
  },
  {
    "type": "system_design",
    "difficulty": "hard",
    "level": "L5",
    "companyTags": [
      "Discord",
      "Meta",
      "Slack"
    ],
    "prompt": "Design a real-time chat and group messaging platform like Discord or Slack. Explain the WebSocket gateway connection handling, message fan-out for channels with 50,000+ members, and offline notification delivery.",
    "tags": [
      "websockets",
      "chat",
      "pub-sub",
      "kafka",
      "redis"
    ],
    "modelAnswer": "### 1. Optimal Architecture\n- **Connection Layer:** Fleet of stateless WebSocket Gateway servers handling 2M+ concurrent persistent connections.\n- **Presence & Connection Registry:** Distributed Redis / In-memory cluster tracking `user_id -> gateway_pod_ip`.\n- **Fan-Out Architecture:**\n  - 1-on-1 and small groups (< 50 members): Direct push via Redis Pub/Sub to target user gateway nodes.\n  - Large Channels (> 1,000 members): Decouple message delivery. Write to Kafka topic partitioned on `channel_id`. Active users pull updates; offline members receive push notification triggers asynchronously.\n- **Message Storage:** Distributed NoSQL store (Cassandra or ScyllaDB) with compound primary key `((channel_id), message_id_timeuuid)` for efficient range queries of recent chat history.\n\n### 2. Key Reliability Considerations\n- Heartbeats / Ping-Pong: Detect dead client connections within 30 seconds.\n- Message Deduplication: Client generates idempotency UUID to prevent duplicate messages during network reconnections."
  },
  {
    "type": "system_design",
    "difficulty": "hard",
    "level": "L5",
    "companyTags": [
      "Amazon",
      "Apple"
    ],
    "prompt": "Design a distributed key-value store with tunable consistency, similar to Amazon DynamoDB or Apache Cassandra. Explain consistent hashing with virtual nodes, vector clocks, and quorum consensus (R + W > N).",
    "tags": [
      "dynamodb",
      "distributed-systems",
      "consistent-hashing",
      "quorum"
    ],
    "modelAnswer": "### 1. Optimal Architecture\n- **Data Partitioning (Consistent Hashing):** 256 virtual nodes (vnodes) per physical host distributed across a 128-bit hash ring. Ensures even load distribution and seamless node additions/removals.\n- **Replication Strategy:** Replicate each key to $N$ successor nodes on the ring across distinct availability zones.\n- **Configurable Quorum Consistency (Sloppy Quorum):**\n  - Read Quorum ($R$), Write Quorum ($W$), Replication Factor ($N$).\n  - When $R + W > N$, the system guarantees strong read-your-writes consistency. For high availability, configure $W = 1, R = 1$ with eventual consistency.\n- **Conflict Resolution:** Vector clocks or Last-Write-Wins (LWW) with NTP clock sync (Google TrueTime or AWS Time Sync).\n- **Anti-Entropy:** Background Merkle tree synchronization to heal divergent replicas out of band."
  },
  {
    "type": "system_design",
    "difficulty": "medium",
    "level": "L4",
    "companyTags": [
      "Stripe",
      "Google",
      "Airbnb"
    ],
    "prompt": "Design a distributed asynchronous job scheduler and worker pool capable of processing millions of delayed tasks (e.g. sending emails, billing retries). How do you prevent duplicate execution and manage priority queues?",
    "tags": [
      "job-scheduler",
      "bullmq",
      "kafka",
      "distributed-systems"
    ],
    "modelAnswer": "### 1. Optimal Architecture\n- **API & Scheduler Tier:** Client posts job payload with `scheduled_time` and `priority`.\n- **Delay Index:** Redis Sorted Set (ZSET) where `score = epoch_timestamp` and `member = job_id`.\n- **Dispatcher Loop:** Poller daemon runs `ZRANGEBYSCORE key -inf current_timestamp LIMIT 0 100` and transfers due jobs to execution queue (Redis List or RabbitMQ/SQS).\n- **Worker Execution:** Distributed worker fleet claims jobs using atomic pop (`RPOPLPUSH` or SQS visibility timeout).\n- **Idempotency & Dead Letter Queue (DLQ):** Distributed lock acquired per `job_id`. If job fails after 3 exponential backoff attempts, move to DLQ for manual inspection and alerting."
  },
  {
    "type": "system_design",
    "difficulty": "hard",
    "level": "L6+",
    "companyTags": [
      "Datadog",
      "Google",
      "Prometheus"
    ],
    "prompt": "Design a high-throughput metrics ingestion, time-series storage, and alerting engine like Datadog. How do you ingest 10 million data points per second with under 1-second query latency for live dashboards?",
    "tags": [
      "time-series",
      "datadog",
      "metrics",
      "aggregations"
    ],
    "modelAnswer": "### 1. Optimal Architecture\n- **Ingestion Pipeline:** Client agents send batched metric points over UDP/gRPC to Ingestion Gateways $\\rightarrow$ Kafka (partitioned by metric hash).\n- **Time-Series Storage (TSDB):** Gorilla/M3DB style compression (delta-of-delta timestamp compression and XOR floating-point compression) reducing storage footprint to ~1.3 bytes per metric point.\n- **In-Memory Buffer & Rollups:** Hot data (last 2 hours) held in memory for immediate dashboard rendering. Background aggregation pipelines pre-calculate 1m, 1h, 1d downsampled rollups for long-term historical analysis.\n- **Alerting Engine:** Stream processing engine (Apache Flink) evaluating sliding threshold windows in real time with hysteresis to prevent alerting flap."
  },
  {
    "type": "behavioral",
    "difficulty": "hard",
    "level": "L5",
    "companyTags": [
      "Google",
      "Meta",
      "Amazon"
    ],
    "prompt": "Tell me about a high-stakes migration you led from a legacy system to a modern architecture with zero customer downtime. How did you derisk the release and manage backward compatibility?",
    "tags": [
      "migration",
      "zero-downtime",
      "strangler-fig"
    ],
    "modelAnswer": "### 1. Ideal STAR Response\n- **Situation:** Migrated a monolithic auth system processing 25,000 requests/sec to a distributed OAuth2/OIDC microservice.\n- **Task:** Deliver the migration without a single minute of downtime or broken sessions for 4M active users.\n- **Action (Strangler Fig Pattern):**\n  1. Implemented Dual-Writing: New service wrote to both databases in shadow mode to verify data integrity.\n  2. Dark Launching & Read Verification: Read from legacy, queried new service in background, and compared outputs via a diff engine to catch 0.01% edge-case discrepancies.\n  3. Incremental Traffic Ramping: Routed 1% $\\rightarrow$ 5% $\\rightarrow$ 25% $\\rightarrow$ 100% traffic via Envoy feature flags with automatic rollback triggers on latency spikes.\n- **Result:** Completed migration 3 weeks ahead of schedule with zero customer-facing errors."
  },
  {
    "type": "behavioral",
    "difficulty": "medium",
    "level": "L4",
    "companyTags": [
      "Apple",
      "Microsoft",
      "Amazon"
    ],
    "prompt": "Describe a situation where a project you championed or invested significant engineering effort into failed or was cancelled by leadership. How did you react, and what lessons did you carry forward?",
    "tags": [
      "resilience",
      "failed-project",
      "growth-mindset"
    ],
    "modelAnswer": "### 1. Ideal STAR Response\n- **Situation:** Designed and developed an automated performance benchmarking framework for internal microservices for 4 months before company priority shifted to LLM features.\n- **Task:** Pivot constructively without demoralizing teammates or wasting built artifacts.\n- **Action:**\n  - Conducted a transparent retrospective with the team celebrating the technical milestones achieved.\n  - Packaged the core tracing libraries as reusable internal open-source modules, which were later adopted by 3 other core infrastructure squads.\n  - Documented architectural decisions and archived the repository cleanly.\n- **Result:** 70% of the underlying telemetry code was recycled into the production observability stack, saving the company ~8 weeks of redundant engineering."
  },
  {
    "type": "hr_round",
    "difficulty": "medium",
    "level": "L4",
    "companyTags": [
      "Google",
      "Meta",
      "Netflix",
      "Stripe"
    ],
    "prompt": "How do you approach work-life balance and boundary management during intense quarterly product delivery sprints? How do you prevent burnout for yourself and your team?",
    "tags": [
      "work-life-balance",
      "burnout-prevention",
      "sustainable-pace"
    ],
    "modelAnswer": "### 1. Ideal Response\n- **Proactive Boundary Setting:** Prioritize ruthless scoping over heroic overtime. Recognize that consistent high-velocity execution requires sustainable physical and mental stamina.\n- **Signals of Burnout:** Monitor leading indicators (cynicism in code reviews, missed standups, dropping velocity).\n- **Operational Levers:** Protect focus blocks (No-Meeting Thursdays), automate repetitive triage with on-call runbooks, and enforce post-release recovery days."
  },
  {
    "type": "hr_round",
    "difficulty": "easy",
    "level": "L3",
    "companyTags": [
      "Amazon",
      "Microsoft",
      "Google"
    ],
    "prompt": "What are your compensation expectations and what factors do you prioritize when evaluating an offer beyond base salary?",
    "tags": [
      "compensation",
      "career-growth",
      "offer-evaluation"
    ],
    "modelAnswer": "### 1. Ideal Response\n- **Market Calibration:** Frame expectations around documented tier-1 market bands for the level (e.g. $220k - $290k total compensation).\n- **Holistic Evaluation:** Emphasize that equity upside, mentorship caliber, team autonomy, and the scope of technical challenges carry equal weight alongside base compensation."
  },
  {
    "type": "product_management",
    "difficulty": "hard",
    "level": "L5",
    "companyTags": [
      "Uber",
      "DoorDash"
    ],
    "prompt": "Average food delivery order fulfillment time increased by 7 minutes across metropolitan areas over the past month. How do you structure an investigation to pinpoint the root cause and formulate solutions?",
    "tags": [
      "operations",
      "root-cause",
      "marketplace-logistics"
    ],
    "modelAnswer": "### 1. Diagnostic Framework\n1. **Deconstruct the Funnel:** Total Time = Consumer Order Time + Restaurant Prep Time + Driver Dispatch & Travel + Hand-off Time.\n2. **Isolate Variance:** Which sub-metric increased?\n   - If Restaurant Prep: Kitchen capacity bottlenecks, ingredient shortages, or kitchen display tablet connectivity.\n   - If Driver Dispatch: Driver shortages, traffic congestion, or suboptimal routing algorithms.\n3. **Data Cohorts:** Check weather anomalies, surge pricing elasticity, and vehicle type breakdowns (bicycles vs cars).\n4. **Actionable Solutions:** Pilot batching orders from the same restaurant or dynamically adjust estimated prep time buffers shown to consumers."
  },
  {
    "type": "product_management",
    "difficulty": "medium",
    "level": "L4",
    "companyTags": [
      "Spotify",
      "Apple",
      "YouTube"
    ],
    "prompt": "Design a personalized podcast discovery feature for users who exclusively listen to music playlists on our platform. How do you overcome the cold-start problem without degrading the core music experience?",
    "tags": [
      "cold-start",
      "recommendations",
      "feature-design"
    ],
    "modelAnswer": "### 1. Product Strategy & User Journey\n- **User Pain Point:** Music listeners view podcast exploration as high cognitive load (committing to a 60-min episode is harder than a 3-min song).\n- **Cold-Start Bridge (Bite-Sized Previews):**\n  - Extract 60-second highlight audio clips tagged with genres matching user's top music artists.\n  - Present non-intrusively as an inline carousel (\"Artists You Love on Podcasts\") rather than interrupting music queues.\n- **Success Metrics:**\n  - Primary: % of music MAUs listening to >= 5 mins of podcast weekly.\n  - Guardrail: Music streaming session duration must not decrease."
  },
  {
    "type": "case_study",
    "difficulty": "hard",
    "level": "L5",
    "companyTags": [
      "Instacart",
      "Amazon",
      "McKinsey"
    ],
    "prompt": "An on-demand grocery delivery startup currently loses $4.50 on every customer order. Structure an operational strategy to achieve contribution margin positive within 6 months.",
    "tags": [
      "unit-economics",
      "profitability",
      "marketplace"
    ],
    "modelAnswer": "### 1. Unit Economic Breakdown & Levers\n- **Equation:** Contribution Margin = Basket Revenue + Delivery Fees + Retailer Commission + Ad Revenue - (Picker Labor + Driver Delivery + Spoilage + Payment Processing).\n- **Lever 1: Increase Average Order Value (AOV):** Introduce free delivery thresholds (e.g. $65 minimum), boosting high-margin impulse item add-ons at checkout.\n- **Lever 2: Retailer & CPG Monetization:** Introduce sponsored search ads for consumer packaged goods brands (Pepsi, Unilever), adding $2.00 pure margin per order.\n- **Lever 3: Batched Fulfillment:** Cluster orders geographically so drivers deliver 2 orders per trip, cutting per-order delivery cost by 35%."
  },
  {
    "type": "sales_pitch",
    "difficulty": "hard",
    "level": "L5",
    "companyTags": [
      "Palo Alto Networks",
      "CrowdStrike",
      "Microsoft"
    ],
    "prompt": "You are pitching an enterprise zero-trust security platform to a risk-averse Chief Information Security Officer (CISO) whose team is comfortable with their legacy firewall infrastructure. How do you navigate their skepticism and secure a pilot?",
    "tags": [
      "enterprise-sales",
      "ciso",
      "objection-handling",
      "security"
    ],
    "modelAnswer": "### 1. Consultative Selling Blueprint\n- **Acknowledge Security Rigor:** Validate the CISO's cautious stance; explain that in security, stability is paramount.\n- **Highlight Modern Threat Vectors:** Legacy perimeter firewalls are blind to internal lateral movement once a single VPN credential or employee laptop is compromised (hybrid work vulnerability).\n- **Zero-Risk Pilot Proposal:** Offer a non-intrusive 14-day passive audit mode (read-only span port telemetry) that requires zero firewall reconfiguration and provides a diagnostic report of hidden lateral vulnerabilities."
  },
  {
    "type": "managerial",
    "difficulty": "hard",
    "level": "L6+",
    "companyTags": [
      "Google",
      "Stripe",
      "Meta"
    ],
    "prompt": "Two senior engineering managers reporting to you have overlapping ownership over an authentication microservice, causing friction, duplicated PRs, and architectural stalemates. How do you resolve team boundaries and drive lasting alignment?",
    "tags": [
      "org-design",
      "conflict-resolution",
      "boundary-setting"
    ],
    "modelAnswer": "### 1. Executive Resolution Framework\n- **Root Cause Analysis:** Clarify whether the friction stems from ambiguous charter definitions, empire building, or mismatched technical visions.\n- **Single Threaded Ownership (Conway's Law):** Eliminate shared code ownership. Redraw boundaries based on customer value streams:\n  - Squad A: Identity & Single Sign-On (user facing authentication).\n  - Squad B: Token Service & Cryptographic Verification (internal infrastructure).\n- **Define SLAs & APIs:** Establish formal API contracts between both squads so neither team is blocked by the other's roadmap.\n- **Alignment Session:** Facilitate a joint session establishing shared OKRs and celebrate cross-team collaboration."
  }
];

const seedQuestions = async () => {
  try {
    await connectDB();
    console.log('Clearing existing QuestionBank...');
    await QuestionBank.deleteMany();

    console.log(`Seeding ${questions.length} questions across all 8 interview types with complete model answers...`);
    await QuestionBank.insertMany(questions);

    console.log('✅ QuestionBank successfully seeded with company tags, all 8 tracks, and full model answers!');
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
