# PROJECT: AI Mock Interview Platform — Build Instructions for Claude

> This document is the single source of truth. If anything in your plan conflicts
> with this doc, THIS DOC WINS. Do not substitute libraries, do not add features
> not listed here, do not skip phases. If something is ambiguous, STOP and ask
> instead of guessing.

---

## 1. PROJECT OVERVIEW

Build **"PrepAI"** — a full-stack MERN platform where a logged-in user selects an
interview type (Technical DSA / System Design / Behavioral), answers questions
by voice or text to an AI interviewer, receives adaptive follow-up questions
based on their previous answer, and gets structured scoring + a performance
dashboard tracking progress over time.

**This is NOT:**
- A generic chatbot wrapper
- A static quiz app with hardcoded questions and no adaptivity
- A single-page demo with no persistence

**This IS:**
- A stateful, multi-turn interview session with a real state machine
- An app where the AI's output is **structured JSON** (via tool/function calling),
  not freeform prose that gets regex-parsed
- An app with real async processing (scoring happens in a background job, not
  inline blocking the response)
- An app with real analytics (MongoDB aggregation pipelines, not just `.find()`)

---

## 2. NON-NEGOTIABLE CONSTRAINTS

1. **No hallucinated packages.** Only use packages listed in Section 4. If you
   need something not listed, stop and propose it before installing.
2. **No mock/fake AI responses in the final build.** Every AI call must go
   through the real Anthropic API using the client pattern in Section 8.
3. **Function calling / structured output is mandatory** for scoring — the AI
   must return JSON matching the schema in Section 8.3, not prose you parse
   with regex.
4. **Every route must have error handling** (try/catch + proper HTTP status
   codes). No route may fail silently.
5. **No localStorage/sessionStorage in the frontend for auth tokens** — use
   httpOnly cookies (see Section 7).
6. **Do not build all features in one pass.** Follow the phases in Section 9
   in order. Do not start Phase 2 code until Phase 1's Definition of Done is met.
7. **Every Mongoose schema must have validation** (required fields, enums where
   applicable) — no schema-less free-for-all documents.
8. **Ask before assuming.** If a requirement is unclear, ask a clarifying
   question rather than picking an interpretation silently.

---

## 3. TECH STACK (exact — do not substitute)

**Frontend**
- React 18 + Vite
- React Router v6
- Tailwind CSS
- Zustand (state management — NOT Redux, keep it lightweight)
- Axios
- Recharts (analytics dashboard)
- Web Speech API (`SpeechRecognition`) for voice input — browser-native, no
  extra package

**Backend**
- Node.js + Express
- Mongoose (MongoDB ODM)
- jsonwebtoken + httpOnly cookies for auth
- bcrypt for password hashing
- BullMQ + Redis (async scoring job queue)
- Socket.io or Server-Sent Events (SSE) for streaming AI responses — **use SSE**,
  it's simpler and sufficient here; do not add Socket.io unless a real-time
  multi-user feature is explicitly requested later

**Database**
- MongoDB (Atlas for deployment, local for dev)

**GenAI**
- Anthropic API (`@anthropic-ai/sdk`), model: `claude-sonnet-5`
- Tool use / function calling for structured scoring output

**Deployment (later phase, not now)**
- Frontend: Vercel
- Backend: Render or Railway
- DB: MongoDB Atlas
- Redis: Upstash

---

## 4. FOLDER STRUCTURE

```
prepai/
├── client/                  # React app
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── store/            # zustand stores
│   │   ├── api/               # axios instance + api calls
│   │   └── hooks/
├── server/
│   ├── src/
│   │   ├── models/            # Mongoose schemas
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/           # anthropic client, scoring logic
│   │   ├── jobs/                # BullMQ workers
│   │   ├── middleware/          # auth, error handler
│   │   └── config/
│   └── server.js
├── .env.example
└── INSTRUCTIONS.md          # this file
```

---

## 5. ENVIRONMENT VARIABLES (`.env.example`)

```
MONGO_URI=
JWT_SECRET=
ANTHROPIC_API_KEY=
REDIS_URL=
CLIENT_URL=http://localhost:5173
PORT=5000
```

---

## 6. DATABASE SCHEMA (Mongoose)

### User
```js
{
  name: String, required
  email: String, required, unique
  passwordHash: String, required
  createdAt: Date
}
```

### InterviewSession
```js
{
  userId: ObjectId (ref User), required
  type: String, enum: ['dsa', 'system_design', 'behavioral'], required
  status: String, enum: ['in_progress', 'completed', 'abandoned'], default: 'in_progress'
  turns: [{
    question: String,
    answer: String,
    followUp: Boolean,
    timestamp: Date
  }]
  finalScore: {
    clarity: Number,       // 0-10
    correctness: Number,   // 0-10
    structure: Number,     // 0-10
    overall: Number,       // 0-10
    feedback: String
  }
  startedAt: Date
  completedAt: Date
}
```

### QuestionBank (seed data, not user-generated)
```js
{
  type: String, enum: ['dsa', 'system_design', 'behavioral'], required
  difficulty: String, enum: ['easy', 'medium', 'hard'], required
  prompt: String, required
  tags: [String]
}
```

---

## 7. AUTH FLOW

- Register/Login → bcrypt hash password → issue JWT → set as **httpOnly,
  secure, sameSite cookie** (not returned in response body, not stored in
  localStorage)
- `authMiddleware.js` reads cookie, verifies JWT, attaches `req.user`
- Protected routes reject with 401 if no valid cookie

---

## 8. GENAI INTEGRATION — DO THIS EXACTLY

### 8.1 Client setup (`server/src/services/anthropicClient.js`)
Use the official SDK, server-side only, key from `process.env.ANTHROPIC_API_KEY`.
Never expose the key to the frontend.

### 8.2 Question flow (adaptive follow-up)
When a user submits an answer:
1. Save the turn to `InterviewSession.turns`.
2. Call the AI with the **full conversation history** (all prior turns) + the
   new answer, asking it to decide: ask a follow-up, or move to the next base
   question from the QuestionBank.
3. Stream the AI's next question back to the client via SSE, token by token.

### 8.3 Scoring (structured output — mandatory tool use)
When a session is marked complete, enqueue a BullMQ job that:
1. Sends the full transcript to Claude with a **tool definition** forcing this
   exact JSON shape:
```json
{
  "clarity": 0-10,
  "correctness": 0-10,
  "structure": 0-10,
  "overall": 0-10,
  "feedback": "2-3 sentence written feedback"
}
```
2. Parses the tool_use block (not the text block).
3. Writes the result to `InterviewSession.finalScore`.
4. Do NOT score synchronously in the request/response cycle — this must be a
   background job. This is a deliberate architecture decision to demonstrate
   async processing; do not "simplify" it away.

---

## 9. BUILD PHASES — follow in order, do not skip ahead

### Phase 1: Foundation (Definition of Done: can register/login, see empty dashboard)
- Express server boots, connects to MongoDB
- User model + register/login/logout routes, JWT cookie auth working
- React app boots, Tailwind configured, login/register pages functional
- Protected dashboard route (empty state is fine)

### Phase 2: Core Interview Loop (DoD: can complete a full text-based mock interview end-to-end)
- QuestionBank model + seed script with ~20 real questions across 3 types
- InterviewSession model + start/submit-answer/complete routes
- AI integration for adaptive follow-ups (text-only, no voice yet)
- SSE streaming of AI responses to frontend
- Basic interview UI: question display, text input, submit

### Phase 3: Scoring + Async Jobs (DoD: completed session shows a real AI-generated score)
- Redis + BullMQ setup
- Scoring job with tool-use structured output (Section 8.3)
- Results page showing score breakdown + feedback

### Phase 4: Voice + Analytics (DoD: can speak an answer; dashboard shows real charts from real data)
- Web Speech API integration for voice-to-text answers
- Dashboard with Recharts: score trends over time, performance by interview
  type, powered by a real MongoDB aggregation pipeline (not client-side math)

### Phase 5: Polish + Deploy
- Loading states, error boundaries, empty states
- Deploy per Section 3
- README with architecture diagram description

**Do not proceed to a phase until the prior phase's DoD is demonstrably met.**

---

## 10. WHAT NOT TO DO

- Do not add Redux, GraphQL, TypeScript, Next.js, or any framework not listed
  in Section 3, even if you think it's "better" — consistency with the stated
  stack matters more for this project's purpose.
- Do not build a generic "chat with AI" screen instead of the structured
  interview state machine.
- Do not skip the BullMQ/Redis async scoring step to "simplify" — this is a
  deliberate resume/interview talking point and must be real.
- Do not fabricate question bank content mid-build without following the
  seed-script pattern in Phase 2.
- Do not put the Anthropic API key or any secret in frontend code.

---

## 11. WHEN YOU'RE DONE WITH A PHASE

Report back explicitly:
1. What was built
2. Which files changed
3. How to test it manually (exact steps)
4. Any deviation from this doc and why

Do not silently move to the next phase without this report.
