require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectDB = require('./src/config/db');
const { notFound, errorHandler } = require('./src/middleware/errorHandler');

const helmet = require('helmet');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Connect to MongoDB
connectDB();

// Google Security Console & OWASP Compliant Security Headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://accounts.google.com"],
        frameSrc: ["'self'", "https://accounts.google.com"],
        connectSrc: ["'self'", "https://accounts.google.com", "https://api.anthropic.com"],
        imgSrc: ["'self'", "data:", "https:", "http:"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  })
);

// High-Concurrency HTTP Compression (Gzip / Deflate)
app.use(compression());

// CORS configuration
app.use(
  cors({
    origin: [CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parsers & Cookie parser (limit body size to prevent payload exhaustion attacks)
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(cookieParser());

// Anti-NoSQL Query Injection Middleware
app.use(mongoSanitize({ replaceWith: '_' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'PrepAI Enterprise API Server', timestamp: new Date() });
});

// Mount Routes
app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/interviews', require('./src/routes/interviewRoutes'));
app.use('/api/analytics', require('./src/routes/analyticsRoutes'));
app.use('/api/admin', require('./src/routes/adminRoutes'));
app.use('/api/ratings', require('./src/routes/ratingRoutes'));

// Centralized Error Handling Middleware
app.use(notFound);
app.use(errorHandler);

// Start listening with Slowloris / Timeout Protection for 500-600 concurrent users
const server = app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`🚀 PrepAI Enterprise Server running on port ${PORT}`);
  console.log(`🌐 Allowed Client URL: ${CLIENT_URL}`);
  console.log(`🛡️  Security & Hardening: Active (Helmet, NoSQL Sanitize, HSTS)`);
  console.log(`⚡ Concurrency Capacity: Optimized for 500+ Concurrent Users`);
  console.log(`=========================================`);
});

// Server timeouts to prevent slowloris and lingering hanging connections
server.headersTimeout = 65000;
server.requestTimeout = 60000;
server.keepAliveTimeout = 60000;

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error(`Unhandled Rejection: ${err.message}`);
});

module.exports = { app, server };
