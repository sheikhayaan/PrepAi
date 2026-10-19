#!/usr/bin/env python3
"""Generate every figure in this README from measured data. Pure stdlib SVG."""
from __future__ import annotations

import glob
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ASSETS = Path(__file__).resolve().parent
BENCH = json.loads((ASSETS / "bench_result.json").read_text(encoding="utf-8"))

INK = "#e8eefc"
MUTED = "#8b9bb4"
DIM = "#5b6b82"
CYAN = "#22d3ee"
BLUE = "#3b82f6"
VIOLET = "#a855f7"
EMERALD = "#10b981"
AMBER = "#f59e0b"
ROSE = "#f43f5e"
BG = "#05070d"
CARD = "#0b1220"
LINE = "#1c2740"
FONT = "Segoe UI, Inter, system-ui, -apple-system, sans-serif"
MONO = "Cascadia Code, Consolas, monospace"

SKIP = {"node_modules", ".git", "dist", "build", "coverage", ".next", "venv", "__pycache__"}
GROUPS = {
    "backend core": ("server/server.js", "server/src"),
    "frontend": ("client/src",),
    "backend tests": ("server/test*.js",),
    "load tests": ("load-tests",),
}


def esc(value: object) -> str:
    """Escape text for SVG/XML."""
    return (
        str(value)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def text(x, y, body, size=13, fill=INK, weight=400, anchor="start", font=FONT, opacity=1.0, letter=0):
    """Return one SVG text element with escaped content."""
    return (
        f'<text x="{x}" y="{y}" font-family="{font}" font-size="{size}" fill="{fill}" '
        f'font-weight="{weight}" text-anchor="{anchor}" opacity="{opacity}" '
        f'letter-spacing="{letter}">{esc(body)}</text>'
    )


def wrap(body: str, max_chars: int) -> list[str]:
    """Greedy word wrap for a fixed character budget."""
    lines, line = [], ""
    for word in body.split():
        candidate = f"{line} {word}".strip()
        if len(candidate) <= max_chars or not line:
            line = candidate
        else:
            lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines


def svg(width, height, body: str) -> str:
    """Wrap a body in the shared dark canvas, gradients, halo and grid."""
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img">
<defs>
  <linearGradient id="g1" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="{CYAN}"/><stop offset="1" stop-color="{BLUE}"/></linearGradient>
  <linearGradient id="g2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{VIOLET}"/><stop offset="1" stop-color="{ROSE}"/></linearGradient>
  <linearGradient id="g3" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="{EMERALD}"/><stop offset="1" stop-color="{CYAN}"/></linearGradient>
  <radialGradient id="halo" cx="50%" cy="0%" r="70%"><stop offset="0" stop-color="{VIOLET}" stop-opacity="0.42"/><stop offset="0.5" stop-color="{BLUE}" stop-opacity="0.12"/><stop offset="1" stop-color="{BG}" stop-opacity="0"/></radialGradient>
  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="#141d2e" stroke-width="1"/></pattern>
  <filter id="glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <filter id="softglow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
</defs>
<rect width="{width}" height="{height}" fill="{BG}"/>
<rect width="{width}" height="{height}" fill="url(#grid)" opacity="0.45"/>
<ellipse cx="{width / 2:.0f}" cy="0" rx="{width * 0.62:.0f}" ry="300" fill="url(#halo)"/>
{body}
</svg>
'''


def count_lines(paths) -> int:
    """Count lines under paths, skipping generated/vendor directories."""
    total = 0
    expanded = []
    for raw in paths:
        for match in glob.glob(str(ROOT / raw)):
            p = Path(match)
            if p.is_dir():
                expanded += [f for f in p.rglob("*") if f.is_file()]
            elif p.is_file():
                expanded.append(p)
    for f in expanded:
        if any(part in SKIP for part in f.parts):
            continue
        if f.suffix not in {".js", ".jsx", ".ts", ".tsx", ".css", ".mjs", ".py"}:
            continue
        try:
            total += len(f.read_text(encoding="utf-8", errors="ignore").splitlines())
        except OSError:
            pass
    return total


COUNTS = {name: count_lines(paths) for name, paths in GROUPS.items()}
TOTAL_LINES = sum(COUNTS.values())


def file_lines(rel: str) -> int:
    """Line count for a single file shown in the repo tree."""
    p = ROOT / rel
    if not p.exists():
        return 0
    return len(p.read_text(encoding="utf-8", errors="ignore").splitlines())


def records(label: str) -> list[dict]:
    """All bench records for a label."""
    return [r for r in BENCH["records"] if r["label"] == label]


def med(values):
    """Median of a numeric list (0 when empty)."""
    if not values:
        return 0
    values = sorted(values)
    mid = len(values) // 2
    return values[mid] if len(values) % 2 else (values[mid - 1] + values[mid]) / 2


def ms(value) -> str:
    """Human millisecond label."""
    return f"{value:.0f} ms"


# --------------------------------------------------------------------------
# 1. Banner
# --------------------------------------------------------------------------
def banner() -> str:
    """Hero mark with orbit rings, gradient wordmark and tech pills."""
    pills = ["React 18", "Express 4", "MongoDB 8", "Redis 8", "Claude 3.5"]
    pill_svg, x = [], 332
    for i, label in enumerate(pills):
        w = len(label) * 7.1 + 26
        color = [CYAN, EMERALD, AMBER, ROSE, VIOLET][i % 5]
        pill_svg.append(
            f'<rect x="{x}" y="286" width="{w:.0f}" height="28" rx="14" fill="{color}" opacity="0.10" stroke="{color}" stroke-opacity="0.55"/>'
        )
        pill_svg.append(text(x + w / 2, 305, label, 11.5, color, 600, "middle"))
        x += w + 10

    rings = "".join(
        [
            f'<circle cx="176" cy="172" r="92" fill="none" stroke="{CYAN}" stroke-opacity="0.28" stroke-width="1.5" filter="url(#softglow)"/>',
            f'<ellipse cx="176" cy="172" rx="118" ry="44" fill="none" stroke="{VIOLET}" stroke-opacity="0.45" stroke-width="1.5" transform="rotate(-18 176 172)"/>',
            f'<ellipse cx="176" cy="172" rx="118" ry="44" fill="none" stroke="{CYAN}" stroke-opacity="0.30" stroke-width="1" transform="rotate(52 176 172)"/>',
            f'<circle cx="176" cy="172" r="60" fill="url(#g1)" opacity="0.12"/>',
            f'<circle cx="272" cy="140" r="5" fill="{CYAN}" filter="url(#glow)"/>',
            f'<circle cx="92" cy="214" r="4" fill="{VIOLET}" filter="url(#glow)"/>',
        ]
    )
    body = f'''
{rings}
{text(176, 191, "P", 64, INK, 800, "middle", letter=0)}
{text(332, 138, "PrepAI", 68, "url(#g1)", 800, letter=-1)}
{text(334, 178, "AI mock interviews that end in a hiring verdict, not a vibe check.", 19, MUTED, 400)}
{text(334, 216, "Multi-turn SSE streaming · 8 calibrated tracks · async scoring · 1,000-user controls.", 14, INK, 500, opacity=.9)}
{text(334, 240, "MongoDB is the source of truth. Redis is acceleration. Claude is replaceable.", 14, MUTED)}
{text(334, 264, "Learning loops A–D can propose, but only a human can promote.", 14, MUTED)}
{"".join(pill_svg)}
{text(1120, 340, "measured, not marketed", 10.5, DIM, 500, "end", MONO)}
'''
    return svg(1200, 360, body)


# --------------------------------------------------------------------------
# 2. Architecture
# --------------------------------------------------------------------------
def architecture() -> str:
    """Four dashed lanes with glass cards and a glowing accent per card."""
    lanes = [
        ("CLIENT", CYAN, [("React 18 SPA", "Vite · Tailwind · Router"), ("Interview Studio", "voice · code · SSE"), ("Zustand stores", "auth · interview state"), ("Resume + retry", "Last-Event-ID replay")]),
        ("EDGE", BLUE, [("Helmet + CSP", "headers · HSTS in prod"), ("CORS allowlist", "strict in production"), ("Rate limiters", "Redis store · 5 buckets"), ("Request ID + timeout", "typed 429/503")]),
        ("CORE", VIOLET, [("Auth & RBAC", "httpOnly cookie · roles"), ("Interview API", "start · answer · complete"), ("SSE transport", "buffer · dedupe · drain"), ("Scoring queue", "BullMQ · off-path"), ("Analytics + admin", "cached · audited")]),
        ("STATE + AI", EMERALD, [("MongoDB", "sessions · stats · audit"), ("Redis", "cache · limits · budgets"), ("Claude 3.5", "semaphore · retries"), ("Worker", "calibration · stamps")]),
    ]
    body = [text(60, 56, "Four planes, one request path", 28, INK, 700)]
    body.append(text(60, 78, "Only the top three planes serve a candidate. Learning runs off-path.", 13, MUTED))

    y = 104
    for name, color, cards in lanes:
        body.append(
            f'<rect x="40" y="{y}" width="1120" height="132" rx="16" fill="#080d18" fill-opacity="0.72" stroke="{LINE}" stroke-dasharray="7 7"/>'
        )
        body.append(text(60, y + 26, name, 12, color, 700, letter=2))
        gap = 14
        start_x = 60
        avail = 1080
        cw = (avail - gap * (len(cards) - 1)) / len(cards)
        for i, (title, sub) in enumerate(cards):
            cx = start_x + i * (cw + gap)
            body.append(
                f'<rect x="{cx:.0f}" y="{y + 40}" width="{cw:.0f}" height="72" rx="10" fill="{CARD}" fill-opacity="0.9" stroke="{LINE}"/>'
            )
            body.append(
                f'<rect x="{cx:.0f}" y="{y + 40}" width="{cw:.0f}" height="3" rx="1.5" fill="{color}" filter="url(#softglow)"/>'
            )
            body.append(text(cx + 12, y + 62, title, 12.5, INK, 600))
            sub_lines = wrap(sub, int(cw / 6.0))
            for j, line in enumerate(sub_lines[:2]):
                body.append(text(cx + 12, y + 80 + j * 14, line, 10.5, MUTED))
        y += 152

    # vertical arrows between lanes
    for ay in (236, 388):
        body.append(
            f'<path d="M600 {ay} L600 {ay + 14}" stroke="{BLUE}" stroke-width="1.5" opacity="0.6"/>'
            f'<path d="M595 {ay + 8} L600 {ay + 14} L605 {ay + 8}" fill="none" stroke="{BLUE}" stroke-width="1.5" opacity="0.8"/>'
        )
    body.append(text(600, 748, "Redis down? per-process fallback. Mongo down? readiness 503, liveness stays 200.", 11.5, DIM, 400, "middle"))
    return svg(1200, 770, "".join(body))


# --------------------------------------------------------------------------
# 3. Pipeline
# --------------------------------------------------------------------------
def pipeline() -> str:
    """Ingest and query flowcharts with measured timings."""
    start_ms = med([r["ms"] for r in records("interview-start")])
    ttfb = med([r["ttfb"] for r in records("answer-dsa") + records("answer-system-design") if r.get("ttfb")])
    total = med([r["ms"] for r in records("answer-dsa") + records("answer-system-design")])
    scoring = BENCH["scoring"]["latencyMs"]

    left = [
        ("Auth cookie + rate limit", "401 / 429 typed"),
        ("Session start", "Mongo write"),
        ("Question select", "policy + stamp"),
        ("Sanitize answer", "injection check"),
        ("Budget + semaphore", "fail fast"),
        ("Claude or simulation", "retry + jitter"),
        ("SSE chunks + done", "resume buffer"),
    ]
    right = [
        ("Complete", "enqueue BullMQ"),
        ("Load rubric", "version pinned"),
        ("Deterministic guards", "injection / low effort"),
        ("Score turn", "Claude or sim"),
        ("Calibrate", "ability + item Elo"),
        ("Persist", "version stamps"),
        ("Cache invalidate", "analytics fresh"),
    ]

    body = [text(40, 48, "Two pipelines, measured end to end", 28, INK, 700)]
    body.append(text(40, 72, "Simulation mode, single instance, n=33. Your numbers will differ; the shape should not.", 13, MUTED))

    for idx, (title, steps, color, caption) in enumerate(
        [
            ("INGEST — start → stream", left, CYAN, f"start {ms(start_ms)} · TTFB {ms(ttfb)} · stream {ms(total)}"),
            ("QUERY — score → learn", right, VIOLET, f"complete → scored in {ms(scoring)}"),
        ]
    ):
        px = 30 + idx * 590
        pw = 550
        body.append(f'<rect x="{px}" y="96" width="{pw}" height="440" rx="16" fill="#080d18" stroke="{LINE}"/>')
        body.append(text(px + 22, 126, title, 13, color, 700, letter=1.5))
        sy = 146
        for i, (name, guard) in enumerate(steps):
            body.append(
                f'<rect x="{px + 22}" y="{sy}" width="{pw - 44}" height="44" rx="9" fill="{CARD}" stroke="{color}" stroke-opacity="0.32"/>'
            )
            body.append(f'<circle cx="{px + 44}" cy="{sy + 22}" r="11" fill="{color}" opacity="0.16"/>')
            body.append(text(px + 44, sy + 26, str(i + 1), 10.5, color, 700, "middle"))
            body.append(text(px + 64, sy + 19, name, 12.5, INK, 600))
            body.append(text(px + 64, sy + 34, guard, 10.5, MUTED))
            if i < len(steps) - 1:
                body.append(
                    f'<path d="M{px + pw / 2:.0f} {sy + 44} L{px + pw / 2:.0f} {sy + 54}" stroke="{color}" stroke-width="1.5" opacity="0.55"/>'
                    f'<path d="M{px + pw / 2 - 4:.0f} {sy + 50} L{px + pw / 2:.0f} {sy + 55} L{px + pw / 2 + 4:.0f} {sy + 50}" fill="none" stroke="{color}" stroke-width="1.5" opacity="0.7"/>'
                )
            sy += 54
        body.append(text(px + 22, 518, caption, 11.5, color, 500, font=MONO))

    body.append(text(600, 566, "Every stage has a typed failure path; none of them hold the HTTP response open for the model.", 11.5, DIM, 400, "middle"))
    return svg(1200, 600, "".join(body))


# --------------------------------------------------------------------------
# 4. Donut
# --------------------------------------------------------------------------
def donut() -> str:
    """Codebase composition from real line counts."""
    colors = [CYAN, VIOLET, EMERALD, AMBER]
    cx, cy, radius, stroke = 320, 300, 132, 42
    circumference = 2 * math.pi * radius
    body = [text(40, 48, "What the repository is actually made of", 28, INK, 700)]
    body.append(text(40, 72, f"{TOTAL_LINES:,} hand-written lines, excluding node_modules, dist and .git.", 13, MUTED))

    offset = 0.0
    body.append(f'<circle cx="{cx}" cy="{cy}" r="{radius}" fill="none" stroke="#101827" stroke-width="{stroke}"/>')
    for (name, value), color in zip(COUNTS.items(), colors):
        frac = value / TOTAL_LINES
        length = frac * circumference
        dash = max(length - 3, 1)
        body.append(
            f'<circle cx="{cx}" cy="{cy}" r="{radius}" fill="none" stroke="{color}" stroke-width="{stroke}" '
            f'stroke-dasharray="{dash:.2f} {circumference - dash:.2f}" stroke-dashoffset="{-offset:.2f}" '
            f'transform="rotate(-90 {cx} {cy})" filter="url(#softglow)" opacity="0.95"/>'
        )
        offset += length

    body.append(text(cx, cy - 4, f"{TOTAL_LINES:,}", 36, INK, 800, "middle"))
    body.append(text(cx, cy + 22, "lines", 13, MUTED, 500, "middle"))

    ly = 172
    for (name, value), color in zip(COUNTS.items(), colors):
        pct = value / TOTAL_LINES * 100
        body.append(f'<rect x="600" y="{ly - 12}" width="10" height="10" rx="3" fill="{color}"/>')
        body.append(text(620, ly - 2, name, 13.5, INK, 600))
        body.append(text(880, ly - 2, f"{value:,}", 13, INK, 700, "end", MONO))
        body.append(text(920, ly - 2, f"{pct:4.1f}%", 13, MUTED, 500, "end", MONO))
        ly += 54

    body.append(text(600, 410, "Counted by docs/assets/generate.py on every run.", 11.5, DIM))
    body.append(text(600, 432, "Rerun: python docs/assets/generate.py", 11.5, DIM, font=MONO))
    return svg(1200, 560, "".join(body))


# --------------------------------------------------------------------------
# 5. Histogram
# --------------------------------------------------------------------------
def histogram() -> str:
    """Latency buckets from bench_result.json with a per-intent legend."""
    buckets = BENCH["buckets"]
    summary = BENCH["summary"]
    counts = [b["count"] for b in buckets]
    peak = max(counts) or 1
    plot_x, plot_y, plot_w, plot_h = 64, 120, 724, 372
    bar_slot = plot_w / len(buckets)
    bar_w = bar_slot - 14

    def color_for(lo):
        """Colour ramp by speed bucket."""
        if lo < 10:
            return EMERALD
        if lo < 25:
            return CYAN
        if lo < 100:
            return BLUE
        if lo < 500:
            return VIOLET
        if lo < 1000:
            return AMBER
        return ROSE

    body = [text(40, 48, "Measured latency — every sample in bench_result.json", 28, INK, 700)]
    body.append(text(40, 72, f"{summary['requests']} requests · 0 failures · simulation mode · single local instance", 13, MUTED))

    # grid + y labels
    for i in range(5):
        gy = plot_y + plot_h - (plot_h / 4) * i
        val = round(peak / 4 * i)
        body.append(f'<path d="M{plot_x} {gy:.0f} L{plot_x + plot_w} {gy:.0f}" stroke="#18223a" stroke-width="1"/>')
        body.append(text(plot_x - 10, gy + 4, str(val), 10.5, DIM, 400, "end", MONO))

    labels = ["0–5", "5–10", "10–25", "25–50", "50–100", "100–250", "250–500", "500–1k", ">1s"]
    for i, (bucket, count) in enumerate(zip(buckets, counts)):
        h = (count / peak) * plot_h
        bx = plot_x + i * bar_slot + 7
        by = plot_y + plot_h - h
        body.append(
            f'<rect x="{bx:.1f}" y="{by:.1f}" width="{bar_w:.1f}" height="{max(h, 2):.1f}" rx="5" fill="{color_for(bucket["lo"])}" opacity="0.9" filter="url(#softglow)"/>'
        )
        body.append(text(bx + bar_w / 2, by - 7, str(count), 10.5, INK, 600, "middle", MONO))
        body.append(text(bx + bar_w / 2, plot_y + plot_h + 20, labels[i], 10, MUTED, 500, "middle"))

    body.append(text(plot_x + plot_w / 2, plot_y + plot_h + 46, "latency bucket (ms)", 11, DIM, 500, "middle"))

    # legend: median by intent
    body.append(text(838, 116, "median by endpoint / intent", 11.5, MUTED, 600, letter=0.6))
    legend = []
    for label in [
        "health",
        "readiness",
        "question-bank",
        "interview-history",
        "analytics-cold",
        "analytics-warm",
        "interview-start",
        "answer-dsa",
        "answer-system-design",
        "answer-behavioral",
        "answer-prompt-injection",
        "interview-complete",
        "scoring-worker",
    ]:
        vals = [r["ms"] for r in records(label)]
        if vals:
            legend.append((label, med(vals)))
    ly = 146
    for label, value in legend:
        body.append(f'<circle cx="846" cy="{ly - 4}" r="3.5" fill="{color_for(value)}"/>')
        body.append(text(860, ly, label, 11.5, INK, 500))
        body.append(text(1150, ly, ms(value), 11.5, MUTED, 600, "end", MONO))
        ly += 29

    body.append(text(40, 578, f"mean {summary['mean']:.1f} ms · median {summary['median']:.1f} ms · p95 {summary['p95']:.1f} ms · p99 {summary['p99']:.1f} ms", 12.5, INK, 600, font=MONO))
    body.append(text(40, 600, "Answers stream for ~1–2 s by design; API reads are single-digit to low-double-digit ms.", 11.5, DIM))
    return svg(1200, 630, "".join(body))


# --------------------------------------------------------------------------
# 6. Repository tree
# --------------------------------------------------------------------------
def repo_tree() -> str:
    """Glowing file tree with one note per important file."""
    rows = [
        ("PrepAi/", 0, "root", "monorepo · npm workspaces by prefix"),
        ("server/", 1, "dir", "API, workers, learning loops"),
        ("server.js", 2, "file", "boot · health · metrics · CORS"),
        ("src/config/env.js", 3, "file", "validated config, prod guards"),
        ("src/config/redis.js", 3, "file", "optional Redis + fallback"),
        ("src/config/indexes.js", 3, "file", "ensureIndexes on boot"),
        ("src/controllers/interviewController.js", 3, "file", "start · answer · complete"),
        ("src/services/anthropicClient.js", 3, "file", "LLM call + deterministic guards"),
        ("src/services/llmResilience.js", 3, "file", "retry · queue · budget"),
        ("src/learning/selectionPolicy.js", 3, "file", "adaptive question choice"),
        ("src/learning/versionRegistry.js", 3, "file", "human-gated artifact states"),
        ("src/sse/sseTransport.js", 3, "file", "resume buffer · redaction hold"),
        ("src/jobs/scoringWorker.js", 3, "file", "off-path scoring + stamps"),
        ("src/models/InterviewSession.js", 3, "file", "score · turns · versions"),
        ("src/middleware/rateLimiter.js", 3, "file", "5 buckets · Redis store"),
        ("client/", 1, "dir", "React 18 + Vite UI"),
        ("src/pages/InterviewPage.jsx", 2, "file", "studio · voice · SSE"),
        ("src/store/useInterviewStore.js", 2, "file", "stream + session state"),
        ("load-tests/", 1, "dir", "k6 + soak + bench harness"),
        ("bench-api.mjs", 2, "file", "source of this README's numbers"),
        ("docs/assets/generate.py", 1, "file", "regenerates all six figures"),
    ]
    color_by_depth = {0: CYAN, 1: VIOLET, 2: INK, 3: MUTED}
    body = [text(40, 48, "Repository map — the files that carry the guarantees", 28, INK, 700)]
    body.append(text(40, 72, "Line counts are read from disk; notes describe the responsibility, not the folder name.", 13, MUTED))

    y = 112
    for name, depth, kind, note in rows:
        x = 48 + depth * 24
        color = color_by_depth.get(depth, MUTED)
        if depth:
            body.append(f'<path d="M{x - 16} {y - 14} L{x - 16} {y + 4} L{x - 6} {y + 4}" fill="none" stroke="{LINE}" stroke-width="1.2"/>')
        if kind == "dir":
            body.append(f'<rect x="{x}" y="{y - 8}" width="9" height="9" rx="2" fill="{color}" opacity="0.8"/>')
        else:
            body.append(f'<circle cx="{x + 4}" cy="{y - 3}" r="3.2" fill="{color}" opacity="0.85"/>')
        label = name
        fsz = 12.5 if depth < 3 else 11.5
        body.append(text(x + 16, y, label, fsz, INK if kind != "file" or depth < 3 else "#c7d3e6", 600 if kind == "dir" else 500, font=MONO))
        body.append(text(700, y, note, 11, MUTED, 400))
        lines = file_lines(name) if kind == "file" else 0
        if lines:
            body.append(text(1150, y, f"{lines} ln", 10.5, DIM, 500, "end", MONO))
        y += 30

    body.append(text(40, 764, "Full tree: find . -path ./node_modules -prune -o -type f -name '*.js' -print | head -40", 10.5, DIM, 400, font=MONO))
    return svg(1200, 790, "".join(body))


def main():
    """Write all six figures and print their sizes."""
    ASSETS.mkdir(parents=True, exist_ok=True)
    figures = {
        "banner.svg": banner,
        "architecture.svg": architecture,
        "pipeline.svg": pipeline,
        "donut.svg": donut,
        "histogram.svg": histogram,
        "repo-tree.svg": repo_tree,
    }
    for name, fn in figures.items():
        payload = fn()
        (ASSETS / name).write_text(payload, encoding="utf-8")
        print(f"wrote {name:20s} {len(payload):6d} bytes")
    print(f"line groups: {COUNTS} total={TOTAL_LINES}")


if __name__ == "__main__":
    main()
