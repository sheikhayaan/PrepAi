#!/usr/bin/env node
/**
 * Self-audit generated SVGs in headless Chrome:
 *  - every <text> bbox must stay inside the canvas
 *  - no two text bboxes may overlap by more than 2px on both axes
 *
 * Usage: node docs/assets/check-svg.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const files = ['banner.svg', 'architecture.svg', 'pipeline.svg', 'donut.svg', 'histogram.svg', 'repo-tree.svg'];
const chromeCandidates = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
];
const chrome = chromeCandidates.find((p) => fs.existsSync(p));
if (!chrome) {
  console.error('No Chrome/Edge binary found.');
  process.exit(2);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'prepai-svg-audit-'));
let failures = 0;

for (const file of files) {
  const svg = fs
    .readFileSync(path.join(dir, file), 'utf8')
    .replace(/^<\?xml[^>]*>\s*/, '');
  const html = `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#000">${svg}
<pre id="__audit"></pre>
<script>
const root = document.querySelector('svg');
const W = Number(root.getAttribute('width'));
const H = Number(root.getAttribute('height'));
const boxes = [...root.querySelectorAll('text')].map((t) => {
  const b = t.getBBox();
  return { s: t.textContent.slice(0, 42), x: b.x, y: b.y, w: b.width, h: b.height };
});
const issues = [];
for (const b of boxes) {
  if (b.x < -1 || b.y < -1 || b.x + b.w > W + 1 || b.y + b.h > H + 1) {
    issues.push({ type: 'outside', text: b.s, box: [b.x, b.y, b.w, b.h] });
  }
}
for (let i = 0; i < boxes.length; i++) {
  for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], b = boxes[j];
    const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    if (ox > 2 && oy > 2) issues.push({ type: 'overlap', a: a.s, b: b.s, ox: +ox.toFixed(1), oy: +oy.toFixed(1) });
  }
}
document.getElementById('__audit').textContent = JSON.stringify({ W, H, count: boxes.length, issues });
</script></body>`;
  const page = path.join(tmp, file + '.html');
  fs.writeFileSync(page, html);
  let dom = '';
  try {
    dom = execFileSync(
      chrome,
      ['--headless=new', '--disable-gpu', '--no-sandbox', '--allow-file-access-from-files', '--virtual-time-budget=1500', '--dump-dom', pathToFileURL(page).href],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 60000 }
    );
  } catch (err) {
    console.error(`${file}: chrome failed (${err.message})`);
    failures++;
    continue;
  }
  const match = dom.match(/id="__audit">([\s\S]*?)<\/pre>/);
  if (!match) {
    console.error(`${file}: audit element missing`);
    failures++;
    continue;
  }
  const raw = match[1]
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
  const report = JSON.parse(raw);
  if (report.issues.length) {
    failures++;
    console.error(`${file}: ${report.issues.length} issue(s) across ${report.count} text boxes`);
    for (const issue of report.issues.slice(0, 6)) console.error('  ', JSON.stringify(issue));
  } else {
    console.log(`${file}: OK (${report.count} text boxes, ${report.W}x${report.H})`);
  }
}
fs.rmSync(tmp, { recursive: true, force: true });
if (failures) {
  console.error(`SVG audit FAILED for ${failures} file(s)`);
  process.exit(1);
}
console.log('SVG audit: 0 issues on all six figures');
