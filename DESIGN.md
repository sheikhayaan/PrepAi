# DESIGN.md — Visual Design Spec for PrepAI

> Read this alongside INSTRUCTIONS.md. INSTRUCTIONS.md governs architecture and
> features. This file governs how it should look and feel. Do not treat this
> as optional polish — a bad interface undermines the whole resume story.

---

## 1. THE PROBLEM WITH DEFAULT AI-GENERATED UI

If left unguided, AI tools converge on the same look: cream background with a
terracotta accent, or near-black with one neon accent; identical rounded cards
with the same soft grey shadow; tracked-out ALL-CAPS eyebrow labels above every
heading; a "→" tacked onto every button; monospace font used decoratively for
labels. **None of this is allowed here.** It's an instant tell to anyone
reviewing the project that it wasn't designed with intent.

The bar: this should look like a real, funded product — closer to Linear,
Arc, or Vercel's own dashboard than a Bootstrap template or a ChatGPT clone.

---

## 2. IDENTITY FOR THIS SPECIFIC PRODUCT

PrepAI's subject matter is **high-stakes performance under pressure** — an
interview. The emotional register is focus, precision, and quiet confidence,
not playful or corporate-generic. Lean into that:

- The interview screen should feel like a **calm, focused room**, not a chat
  app. Minimal chrome. The question and the user's answer are the only things
  that matter on screen at any moment.
- The dashboard should feel like an **athlete's training log** — a place you
  return to and see visible progress, not a generic analytics template.

---

## 3. DESIGN TOKENS (use these — don't invent generic defaults)

**Color** — a restrained, focused palette. Do not use warm cream + terracotta,
and do not use near-black + neon:
- `--bg`: `#0F1115` (deep charcoal, not pure black)
- `--surface`: `#171A21` (panel/card background, subtly lifted from bg)
- `--text-primary`: `#EDEFF2`
- `--text-secondary`: `#8B93A1`
- `--accent`: `#5B8CFF` (a focused, confident blue — used sparingly, for
  active states, the recording indicator, and score highlights only)
- `--success`: `#4ADE80` (score/positive feedback only)
- `--warning`: `#FBBF24` (mid-range scores only)

**Depth** *(added — the original spec had no elevation vocabulary at all, which
is why every screen sat on one plane and read as flat.)*

Depth comes from stacked planes and hairlines, not from drop shadows under
everything. Four levels, and nothing invents a fifth:

- `--bg` `#0F1115` — the page. Nothing else uses it as a fill.
- `--surface` `#171A21` — a panel that holds content. Paired with a
  `--hairline` `#232833` border, never a shadow.
- `--surface-hover` `#1D212A` — the same panel under a pointer.
- `--elevated` `#20242E` — reserved for things that genuinely float above the
  page: menus, the mobile nav sheet, a dialog. These are the *only* elements
  allowed a shadow, and it is `--shadow-float`
  (`0 16px 40px -12px rgb(0 0 0 / 0.55)`), tuned to read as depth on a dark
  background rather than as the grey halo of a Bootstrap card.

Panels are allowed — a dashboard tile is a panel. What is banned is *every*
element becoming an identical rounded card with the same shadow; a panel must
earn its border by containing something. Text that should feel like text in
space — the interview question, the score feedback — stays unboxed.

**Radius**
- `4px` inputs and buttons, `10px` panels and tiles, `999px` pills (landing
  page only). Nothing else.

**Type**
- Headline/UI face: **Inter** or **Söhne**-style geometric sans — clean,
  confident, no personality quirks that distract during an interview.
- One typeface family is enough here; do not add a second display font. This
  product's personality comes from restraint and layout, not from
  typographic flourish.
- Body/question text should be generously sized (18–20px) and high contrast —
  a person may be reading this under stress; legibility beats style.

**Layout**
- Every signed-in screen except the active interview carries a **real app
  navbar**: wordmark, the primary destinations with a visible active state
  (an accent underline on the current route, not just a colour change), and the
  account control on the right. It is sticky, sits on `--bg` with a
  `--hairline` bottom border, and gains a backdrop blur once the page scrolls.
  A navbar that is only a wordmark and a "Sign out" link is not a navbar.
- Interview screen: single centered column, max ~640px wide, generous
  vertical whitespace. This is the one screen with **no** navbar — during an
  active session the question, the answer input, and a thin progress line are
  the only things on screen. Getting out is a single explicit control, not a
  nav bar.
- Dashboard: an asymmetric grid — one large "trend over time" chart as the
  hero element, smaller stat tiles around it. Avoid making every tile the
  same size and shape; that's the generic SaaS-card tell.
- Auth screens: the two-plane split (brand panel on `--surface`, form on
  `--bg`) stays. It needs pointer feedback on every field and control, per
  Section 3's Motion rules.

**Motion** *(rewritten — see the note at the end of this section)*

Motion here is not decoration, it is feedback: every animation must be caused
by something (a page arriving, a pointer, a value landing, data loading). What
is banned is *ambient* motion with no cause — a card that fade-slides up for no
reason other than existing.

- **Easing and duration are fixed.** Use `--ease-out` (`cubic-bezier(0.16, 1,
  0.3, 1)`) for anything entering or responding to a pointer, and
  `--ease-in-out` for anything reversible. Durations come from three steps
  only: `120ms` (hover, press, focus), `260ms` (element enter/exit, panel
  reveal), `680ms` (a value or chart resolving). No other numbers.
- **Page arrival is one coordinated move, not per-card confetti.** A screen's
  content enters once as a group: opacity 0→1 with a 6px rise over `260ms`.
  Children may stagger by at most `40ms` each and only down to depth 1 — never
  a cascade through nested elements.
- **Pointer feedback is expected everywhere it means something.** Rows that
  navigate, buttons, and nav links get a `120ms` response: a background shift
  to `--surface-hover`, a border warming toward `--accent`, or a directional
  reveal (e.g. a chevron sliding in 4px). Hover-*lift* via `translateY` is
  allowed only on elements that navigate, and never more than 1px.
- **Values animate to their result.** Any number that represents a measurement
  (score, session count, completion percentage) counts up over `680ms` on
  first paint. Chart lines draw in left-to-right over the same `680ms`.
- **Loading is a shimmer, not a spinner.** Skeletons use a `--surface` →
  `--surface-hover` sweep. Spinners are reserved for indeterminate work with
  no known shape.
- **The score reveal is still the single biggest moment on the product** —
  count-up plus a radial reveal from the number. Nothing else may be louder.
- Respect `prefers-reduced-motion`: when set, all of the above collapse to
  their end state instantly. Direct-manipulation effects that only move while
  the pointer moves (the landing page's video scrub) are exempt — they are not
  autonomous motion, and gating them would leave a dead page for every user
  who merely turned off their OS window animations.

> **Why this replaced the original rule.** The first version of this section
> allowed exactly one animated moment in the entire product and banned hover
> and enter animation outright. Followed literally it produced screens that
> read as unstyled HTML — a dashboard of grey text rows in an empty field, and
> auth screens with no response to the pointer at all. The anti-generic intent
> was right; the prohibition was too broad. The rule is now *motion must have a
> cause*, which bans the AI-generated tell (ambient fade-slide-up on every
> card) without banning the feedback that makes a product feel built.

---

## 4. COMPONENT-SPECIFIC GUIDANCE

**Recording/answer input**
- When voice input is active, show a simple waveform or pulse indicator using
  `--accent` — this is the one moment where a bit of visual richness is
  earned, since it's real-time feedback the user needs.

**Question display**
- No card, no border, no shadow around the question — it should feel like
  text appearing in space, not "content in a box." Let whitespace do the
  separating.

**Score reveal**
- Big number, honest color (green/amber/blue-tinted based on score band, not
  red — this is coaching, not failure), with the 2–3 sentence feedback below
  in `--text-secondary`, not another card.

**Dashboard charts (Recharts)**
- Custom-style the chart: no default Recharts grey grid lines. Use a subtle
  `--surface`-tinted gridline, `--accent` for the primary line, and remove
  chart borders/legends where the data is self-evident.

**Empty states**
- Write these in the product's voice, specific to what's missing — e.g. for a
  new user's dashboard: "No sessions yet. Your first mock interview will show
  up here." Not a generic "No data available."

---

## 5. WHAT TO EXPLICITLY AVOID (checklist before calling any screen done)

- [ ] No cream + terracotta palette
- [ ] No *uniform* card grid — every tile the same size, radius and shadow.
      Panels are fine and expected; a grid of identical ones is the tell.
      (Was: "no rounded cards with shadows on every element" — too broad, it
      banned panels entirely and left screens with nothing to hold content.)
- [ ] No ALL-CAPS tracked-out eyebrow labels above headings
- [ ] No middle-dot-joined meta strings ("Score · Today · DSA")
- [ ] No arrow (→) appended to button *text* (a chevron that appears on hover
      to signal navigation is a different thing and is allowed)
- [ ] No monospace font used decoratively for labels
- [ ] No *ambient* animation — motion with no cause. Enter, hover, press, and
      value-resolution animations are required, per Section 3's Motion rules;
      a card that fade-slides up merely because it exists is not.
      (Was: "no fade-slide-up repeated on every section/card".)
- [ ] No numbered circle-stepper (01 / 02 / 03) unless content is truly
      sequential (the interview progress bar is sequential — a stepper is
      fine there specifically, nowhere else)
- [ ] No screen that responds to the pointer nowhere. If nothing on a screen
      reacts to hover or focus, it is not finished.
- [ ] No shadow on anything that is not `--elevated` (menu, sheet, dialog).

---

## 6. PROCESS — how Opus should actually work through this

1. Before writing any component CSS, write a short design plan: confirm the
   token system above, sketch the interview-screen and dashboard layout as
   ASCII wireframes, and state in one sentence why each layout choice fits
   this product (not "because it looks modern").
2. Build the interview screen first — it's the core experience and the
   highest-leverage screen for the "calm focused room" feeling.
3. After building each screen, self-critique against Section 5's checklist
   before moving on.
4. Keep components in `client/src/components/`, one concern per file. Shared
   tokens (colors, spacing, font sizes) belong in a single Tailwind config
   extension — do not hardcode hex values across components.
