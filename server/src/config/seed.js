require('dotenv').config();
const mongoose = require('mongoose');
const QuestionBank = require('../models/QuestionBank');
const connectDB = require('./db');

const questions = [
  // DSA Questions
  {
    type: 'dsa',
    difficulty: 'easy',
    prompt: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. How would you solve this with optimal time and space complexity?',
    tags: ['array', 'hash-table', 'two-sum'],
  },
  {
    type: 'dsa',
    difficulty: 'medium',
    prompt: 'Given the head of a singly linked list, reverse the list and return its reversed head. Can you explain both the iterative and recursive approaches, and compare their trade-offs?',
    tags: ['linked-list', 'pointers', 'recursion'],
  },
  {
    type: 'dsa',
    difficulty: 'medium',
    prompt: 'Given a string s, find the length of the longest substring without repeating characters. Walk me through your thought process using the sliding window technique.',
    tags: ['sliding-window', 'string', 'hash-set'],
  },
  {
    type: 'dsa',
    difficulty: 'medium',
    prompt: 'Given an m x n 2D binary grid grid which represents a map of 1s (land) and 0s (water), return the number of islands. How would you implement this using Breadth-First Search (BFS) or Depth-First Search (DFS)?',
    tags: ['graph', 'bfs', 'dfs', 'matrix'],
  },
  {
    type: 'dsa',
    difficulty: 'medium',
    prompt: 'You are given an array of intervals where intervals[i] = [start_i, end_i], merge all overlapping intervals. What is the time complexity and how does sorting assist the solution?',
    tags: ['intervals', 'sorting', 'arrays'],
  },
  {
    type: 'dsa',
    difficulty: 'hard',
    prompt: 'Given an unsorted integer array nums, return the smallest missing positive integer in O(n) time and O(1) auxiliary space. How can we use the array itself as a hash map?',
    tags: ['array', 'in-place', 'hard'],
  },
  {
    type: 'dsa',
    difficulty: 'medium',
    prompt: 'Implement an LRU (Least Recently Used) Cache with get and put operations in O(1) time complexity. What data structures would you combine and why?',
    tags: ['design', 'hash-map', 'doubly-linked-list'],
  },

  // System Design Questions
  {
    type: 'system_design',
    difficulty: 'medium',
    prompt: 'Can you design a scalable URL shortener service like bit.ly? What would the read/write traffic estimates look like, and how would you generate unique 7-character hashes while handling race conditions?',
    tags: ['url-shortener', 'hashing', 'caching', 'scalability'],
  },
  {
    type: 'system_design',
    difficulty: 'medium',
    prompt: 'Design a real-time Notification System that can deliver billions of push notifications, SMS, and emails per day. How would you structure message queues, rate-limiting, and user notification preferences?',
    tags: ['notification', 'message-queue', 'rate-limiting', 'distributed-systems'],
  },
  {
    type: 'system_design',
    difficulty: 'hard',
    prompt: 'Design a distributed Rate Limiter for an API gateway handling millions of requests per second. Compare the Token Bucket, Leaky Bucket, and Sliding Window Log algorithms, and explain how you would coordinate state across multiple server nodes using Redis or Memcached.',
    tags: ['rate-limiter', 'redis', 'concurrency', 'algorithms'],
  },
  {
    type: 'system_design',
    difficulty: 'hard',
    prompt: 'Design a real-time chat application like WhatsApp or Slack. How do you handle 1-on-1 and group messaging, message delivery status (sent, delivered, read), and offline message synchronization?',
    tags: ['chat', 'websockets', 'database-partitioning', 'consistency'],
  },
  {
    type: 'system_design',
    difficulty: 'hard',
    prompt: 'Design a video streaming platform like YouTube or Netflix. Explain video ingestion, chunking, transcoding pipelines, and Content Delivery Network (CDN) caching strategies for smooth global playback.',
    tags: ['video-streaming', 'cdn', 'transcoding', 'storage'],
  },
  {
    type: 'system_design',
    difficulty: 'medium',
    prompt: 'Design an e-commerce Flash Sale checkout system (like Amazon Prime Day or Ticketmaster). How do you prevent inventory overselling under extreme concurrency?',
    tags: ['e-commerce', 'inventory', 'distributed-lock', 'acid-transactions'],
  },

  // Behavioral Questions
  {
    type: 'behavioral',
    difficulty: 'easy',
    prompt: 'Tell me about a time you faced a significant technical roadblock or bug during a critical project deadline. How did you diagnose the issue, prioritize fixes, and what was the outcome?',
    tags: ['star-method', 'problem-solving', 'resilience'],
  },
  {
    type: 'behavioral',
    difficulty: 'medium',
    prompt: 'Describe a situation where you had a strong technical disagreement with a team lead, senior engineer, or product manager. How did you navigate the conversation, use data to support your viewpoint, and handle the final decision?',
    tags: ['disagreement', 'communication', 'collaboration'],
  },
  {
    type: 'behavioral',
    difficulty: 'medium',
    prompt: 'Tell me about a time you made a mistake or shipped a bug to production that impacted users. How did you respond, communicate with stakeholders, and implement preventative measures to ensure it would not happen again?',
    tags: ['accountability', 'incident-response', 'growth-mindset'],
  },
  {
    type: 'behavioral',
    difficulty: 'medium',
    prompt: 'Can you share an example of when you took ownership of a project or task that was outside your direct job scope because you saw a critical need? What impact did your initiative have?',
    tags: ['ownership', 'leadership', 'initiative'],
  },
  {
    type: 'behavioral',
    difficulty: 'easy',
    prompt: 'How do you prioritize your work and make trade-offs when juggling multiple competing high-priority deadlines or ambiguous requirements from different stakeholders?',
    tags: ['prioritization', 'time-management', 'ambiguity'],
  },
  {
    type: 'behavioral',
    difficulty: 'medium',
    prompt: 'Tell me about the project you are most proud of in your career. What made it challenging, what engineering decisions were you responsible for, and what measurable impact did it achieve?',
    tags: ['proud-project', 'deep-dive', 'technical-excellence'],
  },
];

const seedQuestions = async () => {
  try {
    await connectDB();
    console.log('Clearing existing QuestionBank...');
    await QuestionBank.deleteMany();

    console.log(`Seeding ${questions.length} questions...`);
    await QuestionBank.insertMany(questions);

    console.log('QuestionBank successfully seeded!');
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
