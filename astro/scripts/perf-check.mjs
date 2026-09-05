#!/usr/bin/env node
// perf-check.mjs — fast (build + bundle budget + image lint) or --full (+ Lighthouse per preset).
// Used by the audit-perf skill (fast + --full). Node builtins only.
//
// --full runs Lighthouse directly (not LHCI) for each route × each preset (desktop + mobile).
// It starts its own static file server for dist/, handles chrome-launcher's EPERM cleanup
// crash on Windows gracefully, and writes reports to .tmp/lighthouse/<preset>/.
import {
  readFileSync,
  readdirSync,
  existsSync,
  mkdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, resolve, extname } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { gzipSync, brotliCompressSync } from "node:zlib";
import { createServer } from "node:http";
import https from "node:https";
import http2 from "node:http2";
import { pathToFileURL } from "node:url";

const IMG_TAG_RE = /<img\b/gi; // NOTE: does NOT match <Image (Astro astro:assets) by design
const DIM_RE = /\b(width|height)\s*=/i;
const EAGER_RE = /loading\s*=\s*"eager"/i;
const FETCHPRIORITY_RE = /\bfetchpriority\s*=/i;
const SRC_EXTS = new Set([".astro", ".tsx", ".jsx", ".html"]);

// Content-type map for the static file server.
const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml",
  ".map": "application/json",
};

function printHelp() {
  console.log(`Usage: node perf-check.mjs [--full] [--no-build] [site-dir]
  default (fast): build + bundle budget + image lint + JSON-LD/llms.txt + links/meta/imageBudget checks (config-gated; used by the pre-push hook)
  --full: also run Lighthouse for each route × each preset (desktop + mobile)
  --worklist: with --full, write .tmp/lighthouse/<preset>/worklist.json inside the
    site dir (per-route scores, gate failures, blind spots; the fix-loop's triage input)
  --no-build: use existing dist/ (skip build)
  --runs N: run Lighthouse N times per route × preset, assert on the median (overrides collect.numberOfRuns)
  --only-failed: with --full, re-audit only the previous run's failing routes (+ canaries);
    locale variants collapse to the default-locale route when lighthouserc.json has a "locales" block
  --target <gate|perfect>: override lighthouserc.json activeTarget for this run (gate=default; perfect=100 all categories)
  --hosted <url>: assert hosting (https/HTTP-2/compression/cache) against a deployed URL; no build
    add --lighthouse to also run Lighthouse against the live URL (the authoritative 100 confirm)
  --trace <url>: run Lighthouse once with --save-assets (150s timeout) and print the
    trace path; best-effort on Windows (non-zero exit after write is the EPERM crash)
  --lcp-diagnose <url>: run Lighthouse once (default config, no preset) and print the
    observed LCP, the SIMULATED breakdown insight, and the known simulation quirks
  site-dir: defaults to current working directory
  env PERF_CHECK_SKIP=1: skip and exit 0
  JSON-LD/llms.txt config gates (lighthouserc.json):
    "jsonld" block present: every route's built HTML must contain valid schema.org JSON-LD
      (opt-in strictness: jsonld.perRoute required @types, jsonld.requiredProps)
    "agentic": { "llmsTxt": true }: dist/llms.txt must exist (H1 + link + min length)
Note: image lint is best-effort (regex, not a parser). <Image (astro:assets)
is not flagged — only bare <img> tags. Multi-line tags may be missed.`);
}

function loadConfig(siteDir) {
  const p = join(siteDir, "lighthouserc.json");
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch {
    console.log(
      "[ERROR] lighthouserc.json missing/invalid — run install.mjs site first",
    );
    process.exit(2);
  }
}

// --- Config accessors with backward-compat fallbacks for old LHCI-style configs ---

function getCollect(config) {
  // New format: config.collect
  if (config.collect) return config.collect;
  // Old LHCI format: config.ci.collect
  if (config.ci?.collect) return config.ci.collect;
  return {};
}

function getRoutes(config) {
  const collect = getCollect(config);
  const urls = collect.url || ["/"];
  return Array.isArray(urls) ? urls : [urls];
}

function getStaticDistDir(config, siteDir) {
  const collect = getCollect(config);
  return resolve(siteDir, collect.staticDistDir || "./dist");
}

function getPresets(config) {
  // New format: config.presets = { desktop: {...}, mobile: {...} }
  if (config.presets) return config.presets;
  // Old LHCI format: build a single desktop preset from ci.assert
  const assertions = config.ci?.assert?.assertions || {};
  return {
    desktop: {
      flags: config.ci?.collect?.settings || { preset: "desktop" },
      assertions,
    },
  };
}

function getNumberOfRuns(config) {
  const collect = getCollect(config);
  return collect.numberOfRuns || 1;
}

// --- Build ---

function runBuild(siteDir) {
  console.log("[RUN] npm run build");
  const r = spawnSync("npm", ["run", "build"], {
    cwd: siteDir,
    shell: process.platform === "win32",
    stdio: "inherit",
  });
  if (r.status !== 0) {
    console.log("[FAIL] build failed");
    process.exit(2);
  }
  console.log("[PASS] build");
}

// --- Bundle budget ---

function measureBundle(siteDir) {
  const dir = join(siteDir, "dist", "_astro");
  if (!existsSync(dir)) {
    console.log("[ERROR] dist/_astro missing — run npm run build first");
    process.exit(2);
  }
  const perFile = [];
  let jsGz = 0;
  let cssGz = 0;
  for (const f of readdirSync(dir)) {
    if (!/\.(js|css)$/.test(f)) continue;
    const buf = readFileSync(join(dir, f));
    const gz = gzipSync(buf).length;
    perFile.push({ file: f, gz });
    if (f.endsWith(".js")) jsGz += gz;
    else cssGz += gz;
  }
  perFile.sort((a, b) => b.gz - a.gz);
  return { jsGz, cssGz, perFile };
}

// --- Image lint ---

function lintImages(siteDir) {
  const findings = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (SRC_EXTS.has(extname(entry.name))) {
        // Strip comments before matching so a literal `<img>` inside a comment
        // (e.g. `{/* Slide 1 is a real <img> ... */}`) is not flagged. Replaced
        // with same-shaped whitespace so reported line numbers stay correct.
        // `//` line comments are NOT stripped (https:// in strings would
        // false-trigger); the reported case is block/JSX/HTML comments.
        const content = readFileSync(p, "utf8")
          .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
          .replace(/\{\/\*[\s\S]*?\*\/\}/g, (m) => m.replace(/[^\n]/g, " "))
          .replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, " "));
        let m;
        IMG_TAG_RE.lastIndex = 0;
        while ((m = IMG_TAG_RE.exec(content)) !== null) {
          const tagEnd = content.indexOf(">", m.index);
          const tag =
            tagEnd === -1
              ? content.slice(m.index)
              : content.slice(m.index, tagEnd + 1);
          const line = content.slice(0, m.index).split("\n").length;
          if (!DIM_RE.test(tag)) {
            findings.push({ file: p, line, msg: "img without width/height" });
          }
          if (EAGER_RE.test(tag) && !FETCHPRIORITY_RE.test(tag)) {
            findings.push({
              file: p,
              line,
              msg: "eager img without fetchpriority (LCP?)",
            });
          }
        }
      }
    }
  };
  const src = join(siteDir, "src");
  if (existsSync(src)) walk(src);
  return findings;
}

// --- Static file server for dist/ ---

// Maps a URL path to a file in the static dir. Tries index.html for clean URLs.
function resolveStaticFile(staticDir, urlPath) {
  // Strip query string
  const path = urlPath.split("?")[0];
  // Try the exact path first (e.g. /_astro/file.js)
  const exact = join(staticDir, path);
  if (
    !exact.endsWith("index.html") &&
    existsSync(exact) &&
    statSync(exact).isFile()
  )
    return exact;
  // Try path/index.html (Astro clean URLs)
  const withIndex = join(staticDir, path, "index.html");
  if (existsSync(withIndex)) return withIndex;
  // Try path.html
  const asHtml = join(staticDir, path + ".html");
  if (existsSync(asHtml)) return asHtml;
  // Fallback: root index.html for SPA-like 404s
  const rootIndex = join(staticDir, "index.html");
  if (existsSync(rootIndex)) return rootIndex;
  return null;
}

// Text-ish types that get gzip'd when the client asks (LH's simulated
// transfer sizes must reflect production compression, else mobile LCP is
// inflated ~1.4s — see errors-log 10). Binary types (images/fonts) are
// already compressed; gzipping them wastes CPU and can inflate size.
const GZIP_TYPES = new Set([
  ".html",
  ".js",
  ".mjs",
  ".css",
  ".json",
  ".svg",
  ".txt",
  ".xml",
  ".map",
]);

function startStaticServer(staticDir) {
  return new Promise((resolveFn, reject) => {
    const server = createServer((req, res) => {
      const filePath = resolveStaticFile(staticDir, req.url);
      if (!filePath) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Not found: " + req.url);
        return;
      }
      const ext = extname(filePath).toLowerCase();
      const contentType = CONTENT_TYPES[ext] || "application/octet-stream";
      try {
        const content = readFileSync(filePath);
        const headers = {
          "Content-Type": contentType,
          "Cache-Control": "no-cache",
        };
        const accepts = (req.headers["accept-encoding"] || "").toLowerCase();
        if (GZIP_TYPES.has(ext) && content.length > 1024) {
          if (accepts.includes("br")) {
            headers["Content-Encoding"] = "br";
            headers["Vary"] = "Accept-Encoding";
            res.writeHead(200, headers);
            res.end(brotliCompressSync(content));
          } else if (accepts.includes("gzip")) {
            headers["Content-Encoding"] = "gzip";
            headers["Vary"] = "Accept-Encoding";
            res.writeHead(200, headers);
            res.end(gzipSync(content));
          } else {
            res.writeHead(200, headers);
            res.end(content);
          }
        } else {
          res.writeHead(200, headers);
          res.end(content);
        }
      } catch {
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("Read error: " + filePath);
      }
    });
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      const port = typeof addr === "object" ? addr.port : addr;
      resolveFn({ server, port });
    });
  });
}

function stopServer(serverObj) {
  return new Promise((resolveFn) => {
    if (!serverObj?.server) return resolveFn();
    serverObj.server.close(() => resolveFn());
  });
}

// --- Lighthouse ---

// Sanitize a route path for use as a filename (e.g. "/" → "root", "/about" → "about")
function routeToFilename(route) {
  if (route === "/") return "root";
  return route.replace(/^\//, "").replace(/\//g, "_") || "root";
}

// Build the Lighthouse CLI args for a given preset.
function buildLighthouseArgs(url, presetConfig, jsonPath) {
  const args = [url, "--output=json", "--output-path=" + jsonPath, "--quiet"];
  // Add preset flags
  const flags = presetConfig.flags || {};
  if (flags.preset) args.push("--preset=" + flags.preset);
  // Add any extra Lighthouse CLI flags from the preset config
  for (const [key, value] of Object.entries(flags)) {
    if (key === "preset") continue; // already handled
    args.push("--" + key.replace(/_/g, "-") + "=" + value);
  }
  // LH 13 does not pass --headless by default (chrome-launcher v1.2+ only adds
  // it when the HEADLESS env var is set) — without it every audit spawns
  // windowed Chrome whose window steals focus. --headless=new still creates a
  // hidden top-level window at (10,10) on Windows (Chromium bug 359921643) —
  // park it off-screen too. Keep --no-sandbox for CI-as-root.
  for (const flag of buildChromeFlags()) args.push("--chrome-flags=" + flag);
  return args;
}

// One --chrome-flags PER flag: a space inside a single --chrome-flags value
// gets split by the shell:true spawn (args are concatenated unquoted), so
// the second flag lands as a top-level Lighthouse arg and never reaches
// Chrome. Repeated --chrome-flags params are joined by Lighthouse itself.
function buildChromeFlags() {
  const chromeFlags = ["--headless=new"];
  if (process.getuid?.() === 0) chromeFlags.push("--no-sandbox");
  if (process.platform === "win32")
    chromeFlags.push("--window-position=-32000,-32000");
  return chromeFlags;
}

// Extract audit results from a Lighthouse JSON report.
function extractMetrics(json) {
  const audits = json.audits || {};
  const lcpAudit = audits["largest-contentful-paint"];
  const inpAudit = audits["interaction-to-next-paint"];
  const clsAudit = audits["cumulative-layout-shift"];
  const tbtAudit = audits["total-blocking-time"];
  return {
    lcp: lcpAudit?.numericValue ?? null,
    inp: inpAudit?.numericValue ?? null,
    inpScore: inpAudit?.score ?? null, // null = n/a (no interactions)
    cls: clsAudit?.numericValue ?? null,
    tbt: tbtAudit?.numericValue ?? null,
    perfScore: json.categories?.performance?.score ?? null,
  };
}

// Check a single assertion (metric / categories:<id> / audit) against the full
// Lighthouse report. Returns {passed, level, actual, threshold, key, type, skipped}.
// type: "metric" | "category" | "audit" | "audit-missing".
function checkAssertion(assertions, key, report) {
  const assertion = assertions[key];
  if (!assertion) return { passed: true, skipped: true, key };
  const level = Array.isArray(assertion) ? assertion[0] : assertion; // "error" | "warn"
  const opts = Array.isArray(assertion) ? assertion[1] || {} : {};
  const max = opts.maxNumericValue;
  const minScore = opts.minScore;

  // categories:<name> → category score gate
  if (key.startsWith("categories:")) {
    const catId = key.slice("categories:".length);
    const score = report.categories?.[catId]?.score ?? null;
    if (score === null || score === undefined) {
      return { passed: true, skipped: true, key, type: "category" };
    }
    const passed = minScore === undefined || score >= minScore;
    return {
      passed,
      level,
      actual: score,
      threshold: minScore,
      key,
      type: "category",
    };
  }

  const audit = report.audits?.[key];
  // Asserted audit absent from this Lighthouse version → blind-spot: skip it
  // (no false-pass, no hard fail); the fix-loop records it as a blind-spot.
  if (!audit) {
    return { passed: true, skipped: true, key, type: "audit-missing" };
  }

  // Metric-style assertion: numeric compare on numericValue.
  if (max !== undefined) {
    const value = audit.numericValue;
    // null (n/a) → skip, e.g. INP on pages with no JS.
    if (value === null || value === undefined) {
      return { passed: true, skipped: true, key, type: "metric" };
    }
    const passed = value <= max;
    return {
      passed,
      level,
      actual: value,
      threshold: max,
      key,
      type: "metric",
    };
  }

  // Score compare (minScore) or bare-string binary assertion (score === 1).
  const score = audit.score;
  if (score === null || score === undefined) {
    return { passed: true, skipped: true, key, type: "audit" };
  }
  const passed = minScore === undefined ? score === 1 : score >= minScore;
  return {
    passed,
    level,
    actual: score,
    threshold: minScore ?? 1,
    key,
    type: "audit",
  };
}

// LH 13.x removed these audits; map each to its replacement so executors know
// what to look at instead (errors-log 09 — verified: the audits are genuinely
// absent from 13.4.1 reports, not warn-level-present).
const BLIND_SPOT_REPLACEMENTS = {
  "modern-image-formats": "image-delivery-insight",
  "uses-responsive-images": "image-size-responsive",
  "interaction-to-next-paint": "inp-breakdown-insight",
};

// Build one worklist entry for a route: all category scores, the structured gate
// failures, and asserted audits missing from this Lighthouse version (blind-spots).
// Pure function (no I/O) so it is unit-testable via import.
// `extra` (optional) is spread into the entry — used for the per-route jsonld result.
function buildWorklistEntry(route, report, failed, assertions, extra = {}) {
  const categoryScores = {};
  for (const [catId, cat] of Object.entries(report.categories || {})) {
    categoryScores[catId] = cat.score;
  }
  const gateFailures = failed.map((f) => ({
    key: f.key,
    type: f.type,
    level: f.level,
    actual: f.actual,
    threshold: f.threshold,
    displayValue: report.audits?.[f.key]?.displayValue ?? null,
  }));
  const blindSpots = Object.keys(assertions)
    .filter((key) => !key.startsWith("categories:") && !report.audits?.[key])
    .map((key) =>
      BLIND_SPOT_REPLACEMENTS[key]
        ? `${key} (replaced by ${BLIND_SPOT_REPLACEMENTS[key]})`
        : key,
    );
  return { route, categoryScores, gateFailures, blindSpots, ...extra };
}

// Group a route by its locale-stripped path. A route is a locale variant when
// its first path segment is in `locales` (e.g. "de" → "/de" and "/de/about" are
// variants of "/" and "/about"). Non-variant routes group as themselves.
function localeGroup(route, locales) {
  if (!locales || locales.length === 0) return route;
  const m = route.match(/^\/([^/]+)(\/.*)?$/);
  if (m && locales.includes(m[1])) return m[2] || "/";
  return route;
}

// Delta-mode route filter for --only-failed: re-audit the previous run's
// failing routes, collapsed across locale variants, plus canaries.
// Rules:
//  - representative = first route in config order within a locale group
//  - a group whose representative failed re-audits only the representative
//  - a group whose representative passed re-audits all its failing variants
//  - routes missing from the previous worklist (audit failed, no entry) are kept
//  - canaries: the first route (home) + the first locale-variant route
// Returns the full route list when prevWorklist is null or has no routes array.
function computeDeltaRoutes(routes, prevWorklist, locales) {
  if (!prevWorklist || !Array.isArray(prevWorklist.routes)) return routes;
  const failed = new Set(
    prevWorklist.routes
      .filter((r) => r.gateFailures && r.gateFailures.length > 0)
      .map((r) => r.route),
  );
  const prevRoutes = new Set(prevWorklist.routes.map((r) => r.route));
  const repByGroup = new Map();
  for (const r of routes) {
    const g = localeGroup(r, locales);
    if (!repByGroup.has(g)) repByGroup.set(g, r);
  }
  const groups = new Map();
  for (const r of routes) {
    if (!failed.has(r)) continue;
    const rep = repByGroup.get(localeGroup(r, locales));
    if (!groups.has(rep)) groups.set(rep, []);
    groups.get(rep).push(r);
  }
  const keep = new Set();
  for (const [rep, members] of groups) {
    if (failed.has(rep)) keep.add(rep);
    else for (const m of members) keep.add(m);
  }
  for (const r of routes) if (!prevRoutes.has(r)) keep.add(r);
  keep.add(routes[0]);
  const firstVariant = routes.find((r) => localeGroup(r, locales) !== r);
  if (firstVariant) keep.add(firstVariant);
  return routes.filter((r) => keep.has(r));
}

// Median of an array of numbers, ignoring null/undefined. Returns null if no values.
function median(values) {
  const nums = values.filter((v) => v !== null && v !== undefined);
  if (nums.length === 0) return null;
  nums.sort((a, b) => a - b);
  const mid = Math.floor(nums.length / 2);
  return nums.length % 2 === 1 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
}

// Merge N parsed Lighthouse reports into one "median report": every audit's
// numericValue/score and every category's score become the median across runs
// (nulls excluded; all-null stays null). Version + human strings come from the
// last report. checkAssertion / buildWorklistEntry / extractMetrics read this
// object unchanged, so assertions, the worklist, and the summary run on medians.
function buildMedianReport(reports) {
  const last = reports[reports.length - 1];
  const categories = {};
  const catIds = new Set();
  for (const r of reports)
    for (const id of Object.keys(r.categories || {})) catIds.add(id);
  for (const id of catIds) {
    categories[id] = {
      score: median(reports.map((r) => r.categories?.[id]?.score ?? null)),
    };
  }
  const audits = {};
  const auditIds = new Set();
  for (const r of reports)
    for (const id of Object.keys(r.audits || {})) auditIds.add(id);
  for (const id of auditIds) {
    const lastAudit = last.audits?.[id] || {};
    audits[id] = {
      score: median(reports.map((r) => r.audits?.[id]?.score ?? null)),
      numericValue: median(
        reports.map((r) => r.audits?.[id]?.numericValue ?? null),
      ),
      scoreDisplayMode: lastAudit.scoreDisplayMode,
      displayValue: lastAudit.displayValue ?? null,
      numericUnit: lastAudit.numericUnit ?? null,
    };
  }
  return { lighthouseVersion: last.lighthouseVersion, categories, audits };
}

// Overlay the active target's category-score deltas onto a preset's assertions.
// targets shape: { gate: { "categories:<id>": <number|null> }, perfect: { ... } }.
//   number  => assertions["categories:<id>"] = ["error", { minScore: <number> }]
//   null    => delete assertions["categories:<id>"]
//   absent  => leave the baseline assertion unchanged.
// No targets block, unknown target, or empty target => return a shallow copy of the
// baseline unchanged (byte-identical to today for existing sites / the gate default).
function applyTarget(presetAssertions, targets, activeTarget) {
  const out = { ...presetAssertions };
  const t = targets && activeTarget ? targets[activeTarget] : null;
  if (!t) return out;
  for (const [key, val] of Object.entries(t)) {
    if (!key.startsWith("categories:")) continue;
    if (val === null || val === undefined) {
      delete out[key];
    } else {
      out[key] = ["error", { minScore: val }];
    }
  }
  return out;
}

// Parse --target <gate|perfect> (space or = form). Returns "gate"|"perfect", or null
// when absent or invalid (any other value).
function parseTargetArg(args) {
  let raw = null;
  const eq = args.find((a) => a.startsWith("--target="));
  if (eq) raw = eq.slice("--target=".length);
  else {
    const i = args.indexOf("--target");
    if (i >= 0) raw = args[i + 1];
  }
  if (raw === null || raw === undefined) return null;
  return raw === "gate" || raw === "perfect" ? raw : null;
}

// Fetch a URL following up to 5 redirects. Returns { url, httpVersion, headers,
// body, statusCode } or rejects on error/timeout. Used by runHostingCheck.
function fetchHeaders(targetUrl, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    let hops = 0;
    const go = (url) => {
      const req = https.get(
        url,
        { headers: { "user-agent": "perf-check" } },
        (res) => {
          if (
            [301, 302, 303, 307, 308].includes(res.statusCode) &&
            res.headers.location
          ) {
            res.resume();
            hops += 1;
            if (hops > 5) return reject(new Error("too many redirects"));
            return go(new URL(res.headers.location, url).href);
          }
          let body = "";
          res.setEncoding("utf8");
          res.on("data", (d) => (body += d));
          res.on("end", () =>
            resolve({
              url,
              httpVersion: res.httpVersion,
              headers: res.headers,
              body,
              statusCode: res.statusCode,
            }),
          );
        },
      );
      req.on("error", reject);
      req.setTimeout(timeoutMs, () => req.destroy(new Error("timeout")));
    };
    go(targetUrl);
  });
}

// ALPN probe: does the origin negotiate HTTP/2 when asked? The plain https
// client (fetchHeaders) never advertises h2, so Cloudflare etc. answer
// HTTP/1.1 even when browsers get HTTP/2 — the httpVersion assertion alone
// false-fails (errors-log 14). Resolves true only when the server actually
// negotiates h2 via ALPN.
function probeHttp2(originUrl, timeoutMs = 10000) {
  return new Promise((resolve) => {
    let settled = false;
    const done = (ok) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        client.destroy();
      } catch {}
      resolve(ok);
    };
    const client = http2.connect(originUrl, { ALPNProtocols: ["h2"] });
    const timer = setTimeout(() => done(false), timeoutMs);
    client.on("connect", () => done(true));
    client.on("error", () => done(false));
  });
}

// Assert the hosting-bound audits against a deployed URL: HTTPS scheme, HTTP/2,
// compression (br/gzip) on a /_astro/ asset, and long cache (max-age) on that
// asset. Returns an array of violation strings (empty = pass). `fetcher` is
// injectable for Chrome-free/network-free testing (defaults to fetchHeaders);
// `probeH2` is the ALPN HTTP/2 probe (injectable for the same reason).
async function runHostingCheck(
  origin,
  hosting,
  fetcher = fetchHeaders,
  probeH2 = probeHttp2,
) {
  const violations = [];
  let originUrl;
  try {
    originUrl = new URL(origin);
  } catch {
    violations.push(`hosting: invalid origin URL: ${origin}`);
    return violations;
  }
  if (originUrl.protocol !== "https:") {
    violations.push(`hosting: ${origin} is not https`);
    return violations;
  }
  const minCacheSeconds = hosting?.minCacheSeconds ?? 31536000;
  const requireHttp2 = hosting?.requireHttp2 ?? true;
  const requireCompression = hosting?.requireCompression ?? true;

  let htmlRes;
  try {
    htmlRes = await fetcher(origin);
  } catch (e) {
    violations.push(`hosting: could not fetch ${origin}: ${e.message}`);
    return violations;
  }
  if (requireHttp2) {
    // httpVersion "2.0" short-circuits (the client negotiated h2 — only
    // possible when the server supports it); otherwise ask via ALPN, because
    // Node's https client never advertises h2 and would report 1.1 even
    // against an h2-capable edge (Cloudflare).
    const h2 = htmlRes.httpVersion === "2.0" || (await probeH2(originUrl));
    if (!h2) {
      violations.push(
        `hosting: ${origin} did not negotiate HTTP/2 (page HTTP/${htmlRes.httpVersion}; ALPN h2 probe failed)`,
      );
    }
  }
  const assetMatch = htmlRes.body.match(
    /(?:src|href)="(\/_astro\/[^"]+\.(?:js|css))"/,
  );
  if (!assetMatch) {
    console.log(
      "[hosting] no /_astro/ asset found — skipping compression/cache checks",
    );
    return violations;
  }
  const assetUrl = new URL(assetMatch[1], origin).href;
  let assetRes;
  try {
    assetRes = await fetcher(assetUrl);
  } catch (e) {
    violations.push(`hosting: could not fetch asset ${assetUrl}: ${e.message}`);
    return violations;
  }
  const enc = (assetRes.headers["content-encoding"] || "").toLowerCase();
  if (requireCompression && enc !== "br" && enc !== "gzip") {
    violations.push(
      `hosting: ${assetUrl} not compressed (content-encoding: ${enc || "none"})`,
    );
  }
  const cc = assetRes.headers["cache-control"] || "";
  const m = /max-age=(\d+)/i.exec(cc);
  const maxAge = m ? Number(m[1]) : 0;
  if (maxAge < minCacheSeconds) {
    violations.push(
      `hosting: ${assetUrl} cache max-age ${maxAge} < ${minCacheSeconds}`,
    );
  }
  return violations;
}

// --- Agentic readiness: JSON-LD + llms.txt checks ---

// Lighthouse has NO structured-data audit (its SEO category's structured-data
// entry is a weight-0 MANUAL audit that never runs), so JSON-LD is validated
// here against each route's built HTML. Config: a "jsonld" block in
// lighthouserc.json activates the check (require !== false keeps it on).
const JSONLD_SCRIPT_RE =
  /<script\b[^>]*\btype\s*=\s*["']application\/ld\+json[^"']*["'][^>]*>/gi;
const SCHEMA_ORG_RE = /^https?:\/\/schema\.org\/?$/i;

// Extract + JSON.parse every <script type="application/ld+json"> block.
// Returns { items: [parsed...], errors: ["block N: invalid JSON (...)"] }.
// A failed block is counted in items as null (it existed but is invalid).
function extractJsonLd(html) {
  const items = [];
  const errors = [];
  JSONLD_SCRIPT_RE.lastIndex = 0;
  let m;
  while ((m = JSONLD_SCRIPT_RE.exec(html)) !== null) {
    const openTagEnd = html.indexOf(">", m.index);
    if (openTagEnd === -1) break;
    const rest = html.slice(openTagEnd + 1);
    const closeRel = rest.search(/<\/script\s*>/i);
    const raw = closeRel === -1 ? rest : rest.slice(0, closeRel);
    try {
      items.push(JSON.parse(raw));
    } catch (e) {
      items.push(null);
      errors.push(
        `block ${items.length}: invalid JSON (${String(e.message).split("\n")[0]})`,
      );
    }
  }
  return { items, errors };
}

// True if node has a schema.org @context (string, or an array containing one).
function hasSchemaOrgContext(node) {
  const ctx = node?.["@context"];
  if (typeof ctx === "string") return SCHEMA_ORG_RE.test(ctx);
  if (Array.isArray(ctx))
    return ctx.some((c) => typeof c === "string" && SCHEMA_ORG_RE.test(c));
  return false;
}

// Flatten ONE parsed JSON-LD block into node objects: the top-level object
// (or the elements of a top-level array) plus their @graph children. Deeper
// nesting is NOT collected — nested objects' types must not satisfy
// perRoute requirements (only what the page declares at node level counts).
function jsonLdNodes(value) {
  const nodes = [];
  const visit = (v) => {
    if (Array.isArray(v)) {
      v.forEach(visit);
      return;
    }
    if (v && typeof v === "object") {
      nodes.push(v);
      if (Array.isArray(v["@graph"])) visit(v["@graph"]);
    }
  };
  visit(value);
  return nodes;
}

// All @type strings across nodes (string or array form).
function jsonLdTypes(nodes) {
  const types = [];
  for (const n of nodes) {
    const t = n?.["@type"];
    if (typeof t === "string") types.push(t);
    else if (Array.isArray(t))
      for (const x of t) if (typeof x === "string") types.push(x);
  }
  return types;
}

// Validate one route's HTML against the jsonld config. Returns
// { ok, blocks, types, errors } — pure, no fs, no I/O. Only called when the
// feature is active (jsonld block present, require !== false), so >=1 block is
// always required. Validity = parses + every top-level node has a schema.org
// @context (an @graph's children inherit the top-level context). perRoute and
// requiredProps are opt-in strictness (see lighthouserc.json "jsonld" block).
function checkRouteJsonLd(html, route, cfg) {
  const errors = [];
  const { items, errors: parseErrors } = extractJsonLd(html);
  errors.push(...parseErrors);
  if (items.length === 0) {
    errors.push("no application/ld+json block found");
  }
  const nodes = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item === null) continue; // parse error already recorded
    const tops = Array.isArray(item) ? item : [item];
    for (const top of tops) {
      if (!top || typeof top !== "object" || Array.isArray(top)) {
        errors.push(`block ${i + 1}: not a JSON-LD object`);
      } else if (!hasSchemaOrgContext(top)) {
        errors.push(
          `block ${i + 1}: @context missing or not https://schema.org`,
        );
      }
    }
    nodes.push(...jsonLdNodes(item));
  }
  const types = jsonLdTypes(nodes);

  // perRoute: required @type for this route (opt-in; the fix-loop ratchets
  // entries in after fixing a route, pinning the page's type).
  const rc = cfg?.perRoute?.[route];
  if (rc && Array.isArray(rc.types)) {
    for (const t of rc.types) {
      if (!types.includes(t)) {
        errors.push(
          `missing required type "${t}" (found: ${types.join(", ") || "none"})`,
        );
      }
    }
  }

  // requiredProps: per-type required properties (opt-in).
  for (const [type, props] of Object.entries(cfg?.requiredProps || {})) {
    const withType = nodes.filter((n) => jsonLdTypes([n]).includes(type));
    if (withType.length === 0) {
      errors.push(`requiredProps: no block with type "${type}"`);
      continue;
    }
    for (const p of props) {
      const v = withType[0][p];
      if (
        v === undefined ||
        v === null ||
        v === "" ||
        (Array.isArray(v) && v.length === 0)
      ) {
        errors.push(`type "${type}": missing/empty property "${p}"`);
      }
    }
  }

  return { ok: errors.length === 0, blocks: items.length, types, errors };
}

// Strict route→built-file resolution for content checks. Unlike
// resolveStaticFile there is NO rootIndex fallback: an unresolvable route must
// fail loudly, never silently inherit the homepage's content.
function resolveRouteHtml(staticDir, route) {
  const path = route.split("?")[0];
  const exact = join(staticDir, path);
  if (existsSync(exact) && statSync(exact).isFile()) return exact;
  const withIndex = join(staticDir, path, "index.html");
  if (existsSync(withIndex)) return withIndex;
  const asHtml = join(staticDir, path + ".html");
  if (existsSync(asHtml)) return asHtml;
  return null;
}

// Sync, dist-based JSON-LD check for every configured route.
// Returns { byRoute: { [route]: checkRouteJsonLd result }, violations: [...] }.
function runJsonLdChecksLocal(siteDir, config) {
  const cfg = config.jsonld || {};
  const staticDir = getStaticDistDir(config, siteDir);
  const byRoute = {};
  const violations = [];
  for (const route of getRoutes(config)) {
    const file = resolveRouteHtml(staticDir, route);
    if (!file) {
      byRoute[route] = {
        ok: false,
        blocks: 0,
        types: [],
        errors: ["built HTML not found in dist/"],
      };
      violations.push(`jsonld ${route}: built HTML not found in dist/`);
      continue;
    }
    const result = checkRouteJsonLd(readFileSync(file, "utf8"), route, cfg);
    byRoute[route] = result;
    for (const e of result.errors) violations.push(`jsonld ${route}: ${e}`);
  }
  return { byRoute, violations };
}

// Async wrapper: local (dist) mode delegates to runJsonLdChecksLocal; hosted
// mode fetches the live HTML per route via `fetcher` (default fetchHeaders).
// Used by runFullLighthouse so results can attach to worklist entries.
async function runJsonLdChecks(
  siteDir,
  config,
  hostedOrigin,
  fetcher = fetchHeaders,
) {
  if (!hostedOrigin) return runJsonLdChecksLocal(siteDir, config);
  const cfg = config.jsonld || {};
  const byRoute = {};
  const violations = [];
  for (const route of getRoutes(config)) {
    let html = null;
    try {
      const res = await fetcher(hostedOrigin.replace(/\/$/, "") + route);
      html = res.body;
    } catch (e) {
      byRoute[route] = {
        ok: false,
        blocks: 0,
        types: [],
        errors: [`could not fetch: ${e.message}`],
      };
      violations.push(`jsonld ${route}: could not fetch (${e.message})`);
      continue;
    }
    const result = checkRouteJsonLd(html, route, cfg);
    byRoute[route] = result;
    for (const e of result.errors) violations.push(`jsonld ${route}: ${e}`);
  }
  return { byRoute, violations };
}

// Deterministic llms.txt check against the built dist (mirrors the bar of
// Lighthouse's llms-txt audit: present at the root, H1 first, links, length).
// Runs in fast AND full mode, so the gate holds even on Lighthouse versions
// without the llms-txt audit (pre-13.3 → blind-spot there, still enforced here).
const LLMS_TXT_MIN_CHARS = 64;
function checkLlmsTxt(distDir) {
  const violations = [];
  const file = join(distDir, "llms.txt");
  if (!existsSync(file)) {
    return [
      "llms-txt: dist/llms.txt missing — add public/llms.txt (a seeded template exists; run install.mjs site)",
    ];
  }
  const content = readFileSync(file, "utf8");
  const firstLine = (
    content.split("\n").find((l) => l.trim() !== "") || ""
  ).trim();
  if (!firstLine.startsWith("# ")) {
    violations.push(
      'llms-txt: first non-empty line must be an H1 starting with "# "',
    );
  }
  if (!/\]\((?:\/|https?:\/\/)/.test(content)) {
    violations.push(
      "llms-txt: no markdown links found (add at least one link)",
    );
  }
  if (content.length < LLMS_TXT_MIN_CHARS) {
    violations.push(
      `llms-txt: content too short (${content.length} chars < ${LLMS_TXT_MIN_CHARS})`,
    );
  }
  return violations;
}

// --- Dist-based content gates: internal links, meta/OG, image budget ---

const URL_ATTR_RE = /(?:\bhref|\bsrc)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;

// Skip list for attribute values that can never resolve to a dist file.
function isExternalOrNonResolvable(url) {
  return (
    url === "" ||
    url.startsWith("//") ||
    /^https?:/i.test(url) ||
    /^(mailto|tel|data|javascript):/i.test(url) ||
    url.startsWith("#") ||
    url.includes("{{")
  );
}

// Resolve one dist-relative URL to a file in staticDir (strict — null when
// unresolvable). Reuses resolveRouteHtml: exact file, index.html, .html.
// Strips query + hash first. Root-absolute paths only (relative URLs are
// skipped by the caller — v1 limitation, documented).
function resolveDistPath(staticDir, url) {
  const clean = url.split(/[?#]/)[0];
  if (clean === "" || !clean.startsWith("/")) return null;
  if (clean === "/") return resolveRouteHtml(staticDir, "/");
  return resolveRouteHtml(staticDir, clean);
}

// Check one route's built HTML for broken internal links/assets.
// cfg: { ignore: ["/prefix", ...] } (optional). Returns { ok, checked, errors }.
function checkRouteLinks(html, _route, staticDir, cfg) {
  const errors = [];
  let checked = 0;
  let m;
  URL_ATTR_RE.lastIndex = 0;
  while ((m = URL_ATTR_RE.exec(html)) !== null) {
    const url = m[1] ?? m[2];
    if (!url || isExternalOrNonResolvable(url)) continue;
    const clean = url.split(/[?#]/)[0];
    if (clean === "" || !clean.startsWith("/")) continue; // relative URLs: out of scope
    if ((cfg?.ignore || []).some((p) => clean === p || clean.startsWith(p))) {
      continue;
    }
    checked += 1;
    if (!resolveDistPath(staticDir, url)) {
      errors.push(`broken link "${url}"`);
    }
  }
  return { ok: errors.length === 0, checked, errors };
}

// Sync, dist-based internal-link check for every configured route.
// Returns { byRoute: { [route]: { ok, checked, errors } }, violations: [...] }.
function runLinkChecksLocal(siteDir, config) {
  const cfg = config.links || {};
  const staticDir = getStaticDistDir(config, siteDir);
  const byRoute = {};
  const violations = [];
  for (const route of getRoutes(config)) {
    const file = resolveRouteHtml(staticDir, route);
    if (!file) {
      byRoute[route] = {
        ok: false,
        checked: 0,
        errors: ["built HTML not found in dist/"],
      };
      violations.push(`links ${route}: built HTML not found in dist/`);
      continue;
    }
    const result = checkRouteLinks(
      readFileSync(file, "utf8"),
      route,
      staticDir,
      cfg,
    );
    byRoute[route] = result;
    for (const e of result.errors) violations.push(`links ${route}: ${e}`);
  }
  return { byRoute, violations };
}

const META_DEFAULTS = {
  title: true,
  description: true,
  canonical: true,
  ogImage: true,
};

// Check one route's built HTML for required head tags.
// cfg keys (booleans): title, description, canonical, ogImage. Returns { ok, errors }.
function checkRouteMeta(html, _route, cfg) {
  const errors = [];
  const want = { ...META_DEFAULTS, ...(cfg || {}) };
  if (want.title) {
    const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (!m || m[1].trim() === "") errors.push("missing or empty <title>");
  }
  if (want.description) {
    const m = html.match(/<meta[^>]+name=["']description["'][^>]*>/i);
    const content = m
      ? (m[0].match(/content\s*=\s*["']([^"']*)["']/i) || [])[1]
      : null;
    if (!content || content.trim() === "") {
      errors.push("missing or empty meta[name=description]");
    }
  }
  if (want.canonical && !/<link[^>]+rel=["']canonical["']/i.test(html)) {
    errors.push("missing link[rel=canonical]");
  }
  if (want.ogImage && !/<meta[^>]+property=["']og:image["']/i.test(html)) {
    errors.push("missing meta[property=og:image]");
  }
  return { ok: errors.length === 0, errors };
}

// Sync, dist-based meta/OG check for every configured route.
// Returns { byRoute: { [route]: { ok, errors } }, violations: [...] }.
function runMetaChecksLocal(siteDir, config) {
  const cfg = config.meta || {};
  const staticDir = getStaticDistDir(config, siteDir);
  const byRoute = {};
  const violations = [];
  for (const route of getRoutes(config)) {
    const file = resolveRouteHtml(staticDir, route);
    if (!file) {
      byRoute[route] = { ok: false, errors: ["built HTML not found in dist/"] };
      violations.push(`meta ${route}: built HTML not found in dist/`);
      continue;
    }
    const result = checkRouteMeta(readFileSync(file, "utf8"), route, cfg);
    byRoute[route] = result;
    for (const e of result.errors) violations.push(`meta ${route}: ${e}`);
  }
  return { byRoute, violations };
}

const IMG_SRC_RE = /<img\b[^>]*>/gi;
const LINK_RE = /<link\b[^>]*>/gi;
const CSS_URL_RE = /url\(\s*(['"]?)([^'")]+)\1\s*\)/gi;
// url()/preload refs are filtered to image extensions — fonts are not image weight.
const IMAGE_EXTS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".avif",
  ".svg",
]);

function imgSrcs(html) {
  const srcs = [];
  let tag;
  IMG_SRC_RE.lastIndex = 0;
  while ((tag = IMG_SRC_RE.exec(html)) !== null) {
    const tagHtml = tag[0];
    const src = (tagHtml.match(/\bsrc\s*=\s*["']([^"']*)["']/i) || [])[1];
    if (src) srcs.push(src);
    const srcset = (tagHtml.match(/\bsrcset\s*=\s*["']([^"']*)["']/i) || [])[1];
    if (srcset) {
      const first = srcset.split(",")[0].trim().split(/\s+/)[0];
      if (first) srcs.push(first);
    }
  }
  return srcs;
}

// All url(...) references in a CSS/HTML string (inline styles, <style> blocks,
// linked stylesheets). data: and # refs are skipped (not local files).
function cssUrls(text) {
  const urls = [];
  let m;
  CSS_URL_RE.lastIndex = 0;
  while ((m = CSS_URL_RE.exec(text)) !== null) {
    const u = m[2].trim();
    if (u && !u.startsWith("data:") && !u.startsWith("#")) urls.push(u);
  }
  return urls;
}

// hrefs of <link rel="..."> tags, optionally filtered by as="...".
function linkHrefs(html, rel, as) {
  const hrefs = [];
  let m;
  LINK_RE.lastIndex = 0;
  while ((m = LINK_RE.exec(html)) !== null) {
    const tag = m[0];
    if (!new RegExp(`\\brel\\s*=\\s*["']${rel}["']`, "i").test(tag)) continue;
    if (as && !new RegExp(`\\bas\\s*=\\s*["']${as}["']`, "i").test(tag))
      continue;
    const href = (tag.match(/\bhref\s*=\s*["']([^"']*)["']/i) || [])[1];
    if (href) hrefs.push(href);
  }
  return hrefs;
}

// Sum the byte size of every local image referenced by one route's HTML:
// <img> srcs, CSS url() refs (inline styles AND linked local stylesheets —
// background-image heroes live there), and <link rel="preload" as="image">
// hrefs. Returns { totalBytes, files: [{ src, bytes }] }. Unresolvable/
// external refs are skipped (the links check owns broken URLs); url()/preload
// refs are filtered to image extensions. Deduped by resolved path (an image
// used as both <img> and background-image counts once).
function measureRouteImages(staticDir, html) {
  const seen = new Set();
  const files = [];
  let totalBytes = 0;
  const add = (src) => {
    if (isExternalOrNonResolvable(src)) return;
    const clean = src.split(/[?#]/)[0];
    if (clean === "" || !clean.startsWith("/")) return;
    const file = resolveDistPath(staticDir, src);
    if (!file || seen.has(file)) return;
    seen.add(file);
    const bytes = statSync(file).size;
    files.push({ src, bytes });
    totalBytes += bytes;
  };
  for (const src of imgSrcs(html)) add(src);
  for (const src of cssUrls(html)) {
    if (IMAGE_EXTS.has(extname(src.split(/[?#]/)[0]).toLowerCase())) add(src);
  }
  // Linked local stylesheets can carry background-image url()s invisible to
  // an HTML-only scan (Astro scoped styles land in /_astro/*.css).
  for (const href of linkHrefs(html, "stylesheet")) {
    if (isExternalOrNonResolvable(href)) continue;
    const file = resolveDistPath(staticDir, href);
    if (!file) continue;
    for (const src of cssUrls(readFileSync(file, "utf8"))) {
      if (IMAGE_EXTS.has(extname(src.split(/[?#]/)[0]).toLowerCase())) add(src);
    }
  }
  // Preloads are real transfers even when the <img> is below the fold.
  for (const href of linkHrefs(html, "preload", "image")) {
    if (IMAGE_EXTS.has(extname(href.split(/[?#]/)[0]).toLowerCase())) add(href);
  }
  return { totalBytes, files };
}

// Per-route image weight budget. Config: imageBudget: { maxRouteImageKb }.
// Returns { byRoute: { [route]: { ok, kb, budget, totalBytes } }, violations }.
function runImageBudgetChecksLocal(siteDir, config) {
  const budget = config.imageBudget?.maxRouteImageKb ?? 500;
  const staticDir = getStaticDistDir(config, siteDir);
  const byRoute = {};
  const violations = [];
  for (const route of getRoutes(config)) {
    const file = resolveRouteHtml(staticDir, route);
    if (!file) {
      byRoute[route] = { ok: false, kb: 0, budget, totalBytes: 0 };
      violations.push(`imageBudget ${route}: built HTML not found in dist/`);
      continue;
    }
    const { totalBytes } = measureRouteImages(
      staticDir,
      readFileSync(file, "utf8"),
    );
    const kb = totalBytes / 1024;
    byRoute[route] = { ok: kb <= budget, kb, budget, totalBytes };
    if (kb > budget) {
      violations.push(
        `imageBudget ${route}: ${kb.toFixed(1)}KB of images > ${budget}KB budget`,
      );
    }
  }
  return { byRoute, violations };
}

function formatMs(ms) {
  if (ms === null || ms === undefined) return "n/a";
  return ms < 1000 ? Math.round(ms) + "ms" : (ms / 1000).toFixed(2) + "s";
}

// Reap chrome-launcher's leftover Chrome processes on Windows. chrome-launcher's
// temp-profile cleanup throws EPERM after results are written (errors-log 08),
// leaving stray chrome.exe processes that accumulate across a batch. Only kill
// chrome.exe whose --user-data-dir points into the OS temp dir (chrome-launcher's
// profile); the user's own Chrome profile lives under AppData\Local\Google\Chrome.
function filterChromeLauncherProcs(rows) {
  const tmp = tmpdir().toLowerCase();
  return rows
    .filter((r) => typeof r.CommandLine === "string")
    .map((r) => {
      const m = r.CommandLine.match(/--user-data-dir=("?)([^"]+)\1/i);
      return { pid: r.ProcessId, dir: m ? m[2] : null };
    })
    .filter((x) => x.dir && x.dir.toLowerCase().includes(tmp))
    .map((x) => x.pid);
}

// Best-effort: returns the number of processes killed, 0 on non-Windows or any
// failure. Never throws. PowerShell strings contain no $_ (Git Bash mangles it).
function reapStrayChrome() {
  if (process.platform !== "win32") return 0;
  try {
    const list = spawnSync(
      "powershell",
      [
        "-NoProfile",
        "-Command",
        "Get-CimInstance Win32_Process -Filter \"Name='chrome.exe'\" | Select-Object ProcessId,CommandLine | ConvertTo-Json -Compress",
      ],
      { timeout: 15000 },
    );
    if (list.status !== 0 || !list.stdout) return 0;
    const rows = JSON.parse(list.stdout.toString());
    const pids = filterChromeLauncherProcs(Array.isArray(rows) ? rows : [rows]);
    if (pids.length === 0) return 0;
    const kill = spawnSync(
      "powershell",
      [
        "-NoProfile",
        "-Command",
        "Stop-Process -Id " +
          pids.join(",") +
          " -Force -ErrorAction SilentlyContinue",
      ],
      { timeout: 15000 },
    );
    return kill.status === 0 ? pids.length : 0;
  } catch {
    return 0;
  }
}

// MUST stay async: the static file server runs in this same process.
// spawnSync blocks the event loop and the server can't answer Chrome → Bug A.
function runLighthouseProcess(args, timeoutMs = 120000) {
  return new Promise((resolve) => {
    const child = spawn("npx", ["--yes", "lighthouse@latest", ...args], {
      shell: process.platform === "win32",
      stdio: "pipe",
    });
    let stdout = "",
      stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));

    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      resolve({
        status: -1,
        stdout,
        stderr: stderr + "\n[timeout after " + timeoutMs + "ms]",
      });
    }, timeoutMs);

    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ status: code, stdout, stderr });
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({ status: -1, stdout, stderr: String(err) });
    });
  });
}

// Run Lighthouse for a single route × preset. Returns { metrics, report } (both null on failure).
async function runLighthouseForRoute(
  url,
  presetName,
  presetConfig,
  outDir,
  numberOfRuns,
) {
  let routeSafe;
  try {
    routeSafe = routeToFilename(new URL(url).pathname);
  } catch {
    routeSafe = routeToFilename(url.replace(/^https?:\/\/[^/]+/, ""));
  }
  const jsonPath = resolve(outDir, routeSafe + ".report.json");

  // Accumulate every run's parsed report; assertions run on the median report
  // (median of N runs — Lighthouse doesn't average, we do).
  const reports = [];
  let lastError = null;

  for (let run = 0; run < numberOfRuns; run++) {
    const args = buildLighthouseArgs(url, presetConfig, jsonPath);
    const r = await runLighthouseProcess(args);

    // EPERM workaround: chrome-launcher's cleanup on Windows throws EPERM
    // (locked temp profile dir), causing a non-zero exit AFTER the JSON output
    // is already written. If the JSON file exists, the results are valid.
    if (r.status !== 0) {
      if (existsSync(jsonPath)) {
        console.log(
          `[WARN] Lighthouse exited non-zero for ${url} (${presetName}) but JSON output exists — using results (expected on Windows: chrome-launcher EPERM cleanup crash after results are written)`,
        );
        const reaped = reapStrayChrome();
        if (reaped > 0)
          console.log(
            `[WARN] reaped ${reaped} stray chrome-launcher process(es)`,
          );
      } else {
        lastError = r.stderr || r.stdout || "unknown error";
        console.log(
          `[FAIL] Lighthouse failed for ${url} (${presetName}): ${lastError.slice(0, 200)}`,
        );
        continue;
      }
    }

    try {
      const json = JSON.parse(readFileSync(jsonPath, "utf8"));
      reports.push(json);
    } catch {
      console.log(
        `[FAIL] Could not parse Lighthouse JSON for ${url} (${presetName})`,
      );
      lastError = "JSON parse error";
    }
  }

  if (reports.length === 0) return { metrics: null, report: null };
  const report = reports.length === 1 ? reports[0] : buildMedianReport(reports);
  return { metrics: extractMetrics(report), report };
}

// --trace: run Lighthouse once with --save-assets and a hard timeout. The
// trace is usable when it completes even though the process exits non-zero
// (chrome-launcher EPERM cleanup — errors-logs 07/13). Returns true when a
// trace file was written.
async function runTraceCapture(url, siteDir) {
  const outDir = join(siteDir, ".tmp");
  mkdirSync(outDir, { recursive: true });
  // LH's --save-assets appends -<index>.trace.json to the extension-stripped
  // output path (cli/run.js + asset-saver.js) — use a bare base path and check
  // the actual trace filename, not the output path.
  const basePath = join(outDir, "lh-trace-" + Date.now());
  const tracePath = basePath + "-0.trace.json";
  const args = [
    url,
    "--only-audits=largest-contentful-paint",
    "--output=json",
    "--output-path=" + basePath,
    "--save-assets",
    "--quiet",
    ...buildChromeFlags().map((f) => "--chrome-flags=" + f),
  ];
  const r = await runLighthouseProcess(args, 150000);
  reapStrayChrome(); // one-shot run hits the same EPERM crash — reap strays
  if (existsSync(tracePath)) {
    console.log("[trace] " + tracePath);
    return true;
  }
  const tail = (r.stderr || r.stdout || "unknown error").slice(-200);
  console.log("[FAIL] no trace written: " + tail);
  return false;
}

// --lcp-diagnose: one Lighthouse run (default config — NO --preset, errors-log
// 23) printing the observed LCP, the SIMULATED breakdown insight (errors-log
// 11), the discovery checklist, and the known simulation quirks (errors-log
// 16). Diagnostic only — always exits 0 when the report was produced.
async function runLcpDiagnose(url, siteDir) {
  const outDir = join(siteDir, ".tmp");
  mkdirSync(outDir, { recursive: true });
  const jsonPath = join(outDir, "lh-lcp-" + Date.now() + ".report.json");
  const args = [
    url,
    "--only-audits=largest-contentful-paint,lcp-breakdown-insight,lcp-discovery-insight",
    "--output=json",
    "--output-path=" + jsonPath,
    "--quiet",
    ...buildChromeFlags().map((f) => "--chrome-flags=" + f),
  ];
  const r = await runLighthouseProcess(args, 120000);
  reapStrayChrome(); // one-shot run hits the same EPERM crash — reap strays
  if (!existsSync(jsonPath)) {
    const tail = (r.stderr || r.stdout || "unknown error").slice(-200);
    console.log("[FAIL] no report written: " + tail);
    return false;
  }
  let report;
  try {
    report = JSON.parse(readFileSync(jsonPath, "utf8"));
  } catch {
    console.log("[FAIL] could not parse report: " + jsonPath);
    return false;
  }
  const lcp = report.audits?.["largest-contentful-paint"];
  console.log(
    "[lcp] observed LCP: " +
      (lcp?.numericValue == null ? "n/a" : lcp.numericValue.toFixed(1) + " ms"),
  );
  const breakdown = report.audits?.["lcp-breakdown-insight"];
  console.log(
    "[lcp] breakdown (SIMULATED — not observed; do not sum to explain the trace, errors-log 11):",
  );
  const parts = breakdown?.details?.items?.[0]?.items;
  if (parts && parts.length) {
    for (const p of parts)
      console.log(
        "[lcp]   " +
          p.subpart +
          ": " +
          (p.duration == null ? "n/a" : p.duration.toFixed(1) + " ms"),
      );
  } else {
    console.log("[lcp]   (no breakdown items in this report)");
  }
  const discovery = report.audits?.["lcp-discovery-insight"];
  console.log(
    "[lcp] discovery checklist: " +
      (discovery?.details?.items
        ? "see report"
        : "n/a (" + (discovery?.scoreDisplayMode ?? "absent") + ")"),
  );
  console.log("[lcp] known quirks (errors-log 16):");
  console.log(
    "[lcp]   1. Crossfading carousels create an LCP candidate per slide — each candidate's resources queue behind ALL traffic in the simulation (LCP 10-14s even when real LCP is ~280ms).",
  );
  console.log(
    "[lcp]   2. The 0.001-opacity trick does NOT suppress candidates — only removing images from the load pipe works.",
  );
  console.log(
    '[lcp]   3. Preloads without fetchpriority="high" fetch at Low priority — always pair the preload with fetchpriority="high".',
  );
  console.log(
    "[lcp]   4. A React-island home page has a ~4.2s simulated-LCP floor (React runtime + fonts dominate).",
  );
  return true;
}

// Run Lighthouse for all routes × all presets. Returns { results, violations }.
async function runFullLighthouse(
  siteDir,
  config,
  worklist,
  runsOverride,
  targetOverride,
  onlyFailed,
  hostedOrigin,
) {
  const routes = getRoutes(config);
  const presets = getPresets(config);
  const numberOfRuns = runsOverride ?? getNumberOfRuns(config);
  const activeTarget = targetOverride ?? config.activeTarget ?? "gate";
  const presetNames = Object.keys(presets);
  console.log(
    `[lighthouse] ${routes.length} route(s) × ${presetNames.length} preset(s) × ${numberOfRuns} run(s) = ${routes.length * presetNames.length * numberOfRuns} total audit(s)`,
  );

  let serverObj = null;
  let baseUrl;
  if (hostedOrigin) {
    baseUrl = hostedOrigin.replace(/\/$/, "");
    console.log(
      `[lighthouse] hosted mode — auditing ${baseUrl} (no static server, no build)`,
    );
  } else {
    const staticDir = getStaticDistDir(config, siteDir);
    if (!existsSync(staticDir)) {
      console.log("[ERROR] dist/ missing — run npm run build first");
      process.exit(2);
    }
    console.log("[lighthouse] starting static server for dist/...");
    serverObj = await startStaticServer(staticDir);
    baseUrl = `http://127.0.0.1:${serverObj.port}`;
    console.log(`[lighthouse] server running at ${baseUrl}`);
  }

  const results = [];
  const violations = [];

  // JSON-LD validation per route (Lighthouse has no structured-data audit —
  // its SEO entry is a weight-0 manual audit). Local mode reads dist/; hosted
  // mode fetches the live URL. Results attach to worklist entries below.
  // Plain --hosted (no --lighthouse) never reaches this function's route loop.
  let jsonldByRoute = null;
  if (config.jsonld?.require) {
    const { byRoute, violations: jsonldViolations } = await runJsonLdChecks(
      siteDir,
      config,
      hostedOrigin,
    );
    jsonldByRoute = byRoute;
    for (const route of Object.keys(byRoute)) {
      const r = byRoute[route];
      console.log(
        `  [jsonld] ${route} — ${r.blocks} block(s)${r.types.length ? `, types: ${r.types.join(", ")}` : ""}${r.ok ? "" : " — FAIL"}`,
      );
    }
    for (const v of jsonldViolations) {
      console.log(`[FAIL] ${v}`);
      violations.push(v);
    }
  }

  // Dist-based content gates — local mode only (hosted mode has no
  // guaranteed dist/ build). Results attach to worklist entries below.
  let linksByRoute = null;
  let metaByRoute = null;
  let imagesByRoute = null;
  if (!hostedOrigin) {
    if (config.links) {
      const { byRoute, violations: gateViolations } = runLinkChecksLocal(
        siteDir,
        config,
      );
      linksByRoute = byRoute;
      for (const route of Object.keys(byRoute)) {
        const r = byRoute[route];
        if (!r.ok)
          console.log(`  [links] ${route} — FAIL (${r.errors.length} broken)`);
      }
      for (const v of gateViolations) {
        console.log(`[FAIL] ${v}`);
        violations.push(v);
      }
    }
    if (config.meta) {
      const { byRoute, violations: gateViolations } = runMetaChecksLocal(
        siteDir,
        config,
      );
      metaByRoute = byRoute;
      for (const route of Object.keys(byRoute)) {
        const r = byRoute[route];
        if (!r.ok) console.log(`  [meta] ${route} — FAIL (${r.errors.length})`);
      }
      for (const v of gateViolations) {
        console.log(`[FAIL] ${v}`);
        violations.push(v);
      }
    }
    if (config.imageBudget) {
      const { byRoute, violations: gateViolations } = runImageBudgetChecksLocal(
        siteDir,
        config,
      );
      imagesByRoute = byRoute;
      for (const route of Object.keys(byRoute)) {
        const r = byRoute[route];
        if (!r.ok) {
          console.log(
            `  [images] ${route} — ${r.kb.toFixed(1)} KB / budget ${r.budget} KB — FAIL`,
          );
        }
      }
      for (const v of gateViolations) {
        console.log(`[FAIL] ${v}`);
        violations.push(v);
      }
    }
  }

  try {
    for (const presetName of presetNames) {
      let presetConfig = presets[presetName];
      const assertions = applyTarget(
        presetConfig.assertions || {},
        config.targets,
        activeTarget,
      );
      const outDir = resolve(
        siteDir,
        ".tmp",
        "lighthouse",
        hostedOrigin ? presetName + "-hosted" : presetName,
      );
      mkdirSync(outDir, { recursive: true });
      const presetWorklist = [];
      let presetVersion = null;

      console.log(`\n[lighthouse] preset: ${presetName}`);

      // The LH CLI's --preset accepts only perf|experimental|desktop; the
      // lighthouserc preset KEYS are arbitrary labels ("mobile" is not a CLI
      // value). Warn once per preset and drop the invalid flag instead of
      // crashing the run (mobile's effective mapping is "no flag").
      const presetFlag = presetConfig.flags?.preset;
      if (
        presetFlag &&
        !["perf", "experimental", "desktop"].includes(presetFlag)
      ) {
        console.log(
          `[WARN] preset "${presetName}" has flags.preset="${presetFlag}" — the LH CLI accepts only perf|experimental|desktop; dropping the flag (mobile is the default)`,
        );
        presetConfig = {
          ...presetConfig,
          flags: { ...presetConfig.flags, preset: undefined },
        };
      }

      let presetRoutes = routes;
      let prev = null;
      if (onlyFailed) {
        try {
          prev = JSON.parse(
            readFileSync(join(outDir, "worklist.json"), "utf8"),
          );
        } catch {
          // no previous worklist — audit everything
        }
        presetRoutes = computeDeltaRoutes(
          routes,
          prev,
          config.locales?.list ?? [],
        );
        if (prev === null) {
          console.log(
            "[lighthouse] delta mode — no previous worklist, auditing all routes",
          );
        } else if (presetRoutes.length !== routes.length) {
          console.log(
            `[lighthouse] delta mode — auditing ${presetRoutes.length} of ${routes.length} routes (previous failures + canaries)`,
          );
        }
      }

      for (const route of presetRoutes) {
        const url = baseUrl + route;
        const { metrics, report } = await runLighthouseForRoute(
          url,
          presetName,
          presetConfig,
          outDir,
          numberOfRuns,
        );

        if (!metrics) {
          violations.push(
            `lighthouse ${presetName} ${route}: audit failed (no results)`,
          );
          results.push({ preset: presetName, route, metrics: null });
          continue;
        }

        // Check ALL assertions (metrics + categories:* + audit scores) against the report
        const checks = Object.keys(assertions).map((key) =>
          checkAssertion(assertions, key, report),
        );

        const failed = checks.filter((c) => !c.passed && !c.skipped);
        const skipped = checks.filter((c) => c.skipped);

        const status = failed.length === 0 ? "PASS" : "FAIL";
        const skippedNote =
          skipped.length > 0
            ? ` (${skipped
                .filter((s) => s.type === "metric")
                .map((s) => s.key)
                .join(", ")} n/a)`
            : "";

        console.log(
          `  [${status}] ${presetName} ${route} — LCP ${formatMs(metrics.lcp)}, INP ${formatMs(metrics.inp)}, CLS ${metrics.cls?.toFixed(3) ?? "n/a"}, perf ${metrics.perfScore === null ? "n/a" : Math.round(metrics.perfScore * 100)}${skippedNote}`,
        );

        for (const check of failed) {
          if (check.type === "metric") {
            const unit = check.key === "cumulative-layout-shift" ? "" : "ms";
            console.log(
              `    [${check.level}] ${check.key}: ${formatMs(check.actual)} > ${formatMs(check.threshold)}${unit}`,
            );
            violations.push(
              `lighthouse ${presetName} ${route}: ${check.key} ${formatMs(check.actual)} exceeds ${formatMs(check.threshold)}${unit}`,
            );
          } else {
            console.log(
              `    [${check.level}] ${check.key}: score ${check.actual} < ${check.threshold}`,
            );
            violations.push(
              `lighthouse ${presetName} ${route}: ${check.key} score ${check.actual} < ${check.threshold}`,
            );
          }
        }

        results.push({ preset: presetName, route, metrics });

        if (worklist) {
          if (presetVersion === null && report?.lighthouseVersion) {
            presetVersion = report.lighthouseVersion;
          }
          const extra = {};
          if (jsonldByRoute) extra.jsonld = jsonldByRoute[route] ?? null;
          if (linksByRoute) extra.links = linksByRoute[route] ?? null;
          if (metaByRoute) extra.meta = metaByRoute[route] ?? null;
          if (imagesByRoute) extra.imageBudget = imagesByRoute[route] ?? null;
          presetWorklist.push(
            buildWorklistEntry(route, report, failed, assertions, extra),
          );
        }
      }

      if (worklist) {
        // Delta mode: merge the previous worklist's entries for routes not
        // re-audited, so the worklist always covers the full route set. A
        // delta-only worklist would make the next --only-failed run treat
        // every passed-but-unreaudited route as "missing" (audit crashed)
        // and re-audit everything — iterations would alternate full/delta.
        let merged = presetWorklist;
        if (onlyFailed && prev !== null) {
          const audited = new Set(presetWorklist.map((e) => e.route));
          merged = [
            ...prev.routes.filter((e) => !audited.has(e.route)),
            ...presetWorklist,
          ].sort((a, b) => routes.indexOf(a.route) - routes.indexOf(b.route));
        }
        writeFileSync(
          join(outDir, "worklist.json"),
          JSON.stringify(
            {
              lighthouseVersion: presetVersion,
              preset: presetName,
              routes: merged,
            },
            null,
            2,
          ),
        );
        console.log(
          `[lighthouse] worklist written: ${join(outDir, "worklist.json")}`,
        );
      }
    }
  } finally {
    if (serverObj) {
      await stopServer(serverObj);
      console.log("[lighthouse] static server stopped");
    }
  }

  // Print summary table
  console.log("\n[lighthouse] summary:");
  for (const { preset, route, metrics } of results) {
    if (!metrics) {
      console.log(`  ${preset} ${route}: FAILED`);
      continue;
    }
    console.log(
      `  ${preset.padEnd(8)} ${route.padEnd(20)} LCP ${formatMs(metrics.lcp).padEnd(8)} INP ${formatMs(metrics.inp).padEnd(8)} CLS ${(metrics.cls?.toFixed(3) ?? "n/a").padEnd(8)} perf ${metrics.perfScore === null ? "n/a" : Math.round(metrics.perfScore * 100)}`,
    );
  }

  return { results, violations };
}

// --- Main ---

// Parse --runs N (space or = form). Returns a positive integer, or null when
// absent or invalid.
function parseRunsArg(args) {
  let raw = null;
  const eq = args.find((a) => a.startsWith("--runs="));
  if (eq) raw = eq.slice("--runs=".length);
  else {
    const i = args.indexOf("--runs");
    if (i >= 0) raw = args[i + 1];
  }
  if (raw === null || raw === undefined) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 ? n : null;
}

function main(argv) {
  if (process.env.PERF_CHECK_SKIP === "1") {
    console.log("[SKIP] PERF_CHECK_SKIP set");
    process.exit(0);
  }
  const args = argv.slice(2);
  if (args.includes("--help")) {
    printHelp();
    process.exit(0);
  }
  const full = args.includes("--full");
  const noBuild = args.includes("--no-build");
  const worklist = args.includes("--worklist");
  const onlyFailed = args.includes("--only-failed");
  // Parse --runs BEFORE anything expensive: an invalid value must exit 2
  // before the build, not just before Lighthouse.
  const runsOverride = parseRunsArg(args);
  // Detect BOTH flag forms: `args.includes("--runs")` alone misses `--runs=3`,
  // which would then silently fall back to collect.numberOfRuns.
  const runsFlagged = args.some(
    (a) => a === "--runs" || a.startsWith("--runs="),
  );
  if (full && runsFlagged && runsOverride === null) {
    console.log("[ERROR] --runs requires a positive integer (e.g. --runs 3)");
    process.exit(2);
  }
  const targetOverride = parseTargetArg(args);
  const targetFlagged = args.some(
    (a) => a === "--target" || a.startsWith("--target="),
  );
  if (targetFlagged && targetOverride === null) {
    console.log("[ERROR] --target must be 'gate' or 'perfect'");
    process.exit(2);
  }
  // A bare `--runs` consumes the next token as its value — exclude it from the
  // positional scan or `--runs 3 /site` makes siteDir resolve to "3".
  const positional = args.filter(
    (a, i) =>
      !a.startsWith("--") &&
      args[i - 1] !== "--runs" &&
      args[i - 1] !== "--target" &&
      args[i - 1] !== "--hosted" &&
      args[i - 1] !== "--trace" &&
      args[i - 1] !== "--lcp-diagnose",
  );
  const siteDir = resolve(positional[0] ?? process.cwd());

  // --hosted needs the site's lighthouserc.json (hosting block + presets for
  // --lighthouse). Without a positional AND without a config in cwd, the
  // generic "lighthouserc.json missing/invalid" reads like a config problem
  // instead of a usage problem (errors-log 15).
  if (
    args.includes("--hosted") &&
    positional.length === 0 &&
    !existsSync(join(siteDir, "lighthouserc.json"))
  ) {
    console.log(
      "[ERROR] --hosted needs the site's lighthouserc.json (hosting block). Run from the site dir or pass it:",
    );
    console.log("  node perf-check.mjs --hosted <url> <site-dir>");
    process.exit(2);
  }

  // Validate --hosted's URL before loadConfig so a bad URL fails fast even
  // without lighthouserc.json (reconciling WP-4's smoke check with its placement
  // text; the mandated branch below re-validates harmlessly for valid URLs).
  const hostedIdxEarly = args.indexOf("--hosted");
  if (hostedIdxEarly >= 0) {
    const v = args[hostedIdxEarly + 1];
    if (!v || v.startsWith("--")) {
      console.log("[ERROR] --hosted requires a URL");
      process.exit(2);
    }
    try {
      new URL(v);
    } catch {
      console.log("[ERROR] --hosted URL is invalid");
      process.exit(2);
    }
  }

  // --trace <url>: one-shot --save-assets capture (errors-logs 07/13). No
  // config needed — fail fast before loadConfig.
  const traceIdx = args.indexOf("--trace");
  if (traceIdx >= 0) {
    const v = args[traceIdx + 1];
    if (!v || v.startsWith("--")) {
      console.log("[ERROR] --trace requires a URL");
      process.exit(2);
    }
    try {
      new URL(v);
    } catch {
      console.log("[ERROR] --trace URL is invalid");
      process.exit(2);
    }
    (async () => {
      const ok = await runTraceCapture(v, siteDir);
      process.exit(ok ? 0 : 1);
    })();
    return;
  }

  // --lcp-diagnose <url>: one-shot LCP insight printout (errors-logs 11/16/23).
  const lcpIdx = args.indexOf("--lcp-diagnose");
  if (lcpIdx >= 0) {
    const v = args[lcpIdx + 1];
    if (!v || v.startsWith("--")) {
      console.log("[ERROR] --lcp-diagnose requires a URL");
      process.exit(2);
    }
    try {
      new URL(v);
    } catch {
      console.log("[ERROR] --lcp-diagnose URL is invalid");
      process.exit(2);
    }
    (async () => {
      const ok = await runLcpDiagnose(v, siteDir);
      process.exit(ok ? 0 : 1);
    })();
    return;
  }

  const config = loadConfig(siteDir);
  const violations = [];

  // --hosted <url>: hosting check (HTTPS/HTTP-2/compression/cache) against the
  // deployed URL. With --lighthouse, also runs Lighthouse against the live URL
  // (no build, no static server). Skips build/bundle/lint entirely.
  const hostedIdx = args.indexOf("--hosted");
  const hostedUrl = hostedIdx >= 0 ? args[hostedIdx + 1] : null;
  if (hostedIdx >= 0) {
    if (!hostedUrl || hostedUrl.startsWith("--")) {
      console.log("[ERROR] --hosted requires a URL");
      process.exit(2);
    }
    try {
      new URL(hostedUrl);
    } catch {
      console.log("[ERROR] --hosted URL is invalid");
      process.exit(2);
    }
    (async () => {
      const hostingViolations = await runHostingCheck(
        hostedUrl,
        config.hosting,
      );
      for (const v of hostingViolations) console.log(`[FAIL] ${v}`);
      if (!hostingViolations.length)
        console.log("[PASS] hosting check — https/HTTP-2/compression/cache OK");
      let result = hostingViolations.length ? "FAIL" : "PASS";
      if (args.includes("--lighthouse")) {
        console.log("[lighthouse] hosted Lighthouse confirm...");
        const { violations: lhViolations } = await runFullLighthouse(
          siteDir,
          config,
          worklist,
          runsOverride,
          targetOverride,
          onlyFailed,
          hostedUrl,
        );
        for (const v of lhViolations) console.log(`[FAIL] ${v}`);
        if (lhViolations.length) {
          result = "FAIL";
        } else {
          console.log(
            "[PASS] hosted Lighthouse — all presets, all routes passed",
          );
        }
      }
      console.log(`RESULT: ${result}`);
      process.exit(result === "FAIL" ? 1 : 0);
    })();
    return;
  }

  // Opt-in type gate (config-gated: "typecheck": { "enabled": true }).
  // Runs astro check in the app dir BEFORE the build — types fail fast,
  // Chrome-free. Requires @astrojs/check + typescript on the site (npx
  // installs ad hoc when missing).
  if (config.typecheck?.enabled) {
    console.log("[typecheck] astro check...");
    const res = spawnSync("npx", ["--yes", "astro", "check"], {
      cwd: siteDir,
      stdio: "inherit",
      shell: process.platform === "win32",
      timeout: 180000,
    });
    if (res.status === 0) {
      console.log("[typecheck] astro check passed");
    } else {
      console.log("[FAIL] typecheck: astro check failed");
      violations.push(`typecheck: astro check exited ${res.status}`);
    }
  }

  if (!noBuild) runBuild(siteDir);

  const { jsGz, cssGz, perFile } = measureBundle(siteDir);
  const jsBudget = config.bundleBudget?.maxRouteJsKb ?? 80;
  const cssBudget = config.bundleBudget?.maxTotalCssKb ?? 50;
  console.log(
    `[bundle] JS gz: ${(jsGz / 1024).toFixed(1)} KB / budget ${jsBudget} KB  |  CSS gz: ${(cssGz / 1024).toFixed(1)} KB / budget ${cssBudget} KB`,
  );
  const top = perFile
    .slice(0, 5)
    .map((f) => `_astro/${f.file} (${(f.gz / 1024).toFixed(1)} KB gz)`)
    .join(", ");
  if (top) console.log(`[bundle] files: ${top}`);
  if (jsGz > jsBudget * 1024)
    violations.push(
      `bundle over budget: JS ${(jsGz / 1024).toFixed(1)}KB > ${jsBudget}KB`,
    );
  if (cssGz > cssBudget * 1024)
    violations.push(
      `bundle over budget: CSS ${(cssGz / 1024).toFixed(1)}KB > ${cssBudget}KB`,
    );

  const imgFindings = lintImages(siteDir);
  for (const f of imgFindings) {
    console.log(`[WARN] ${f.file}:${f.line} — ${f.msg}`);
    violations.push(`img: ${f.file}:${f.line} — ${f.msg}`);
  }

  // Agentic readiness (config-gated — absent blocks mean silent skip, so
  // pre-existing sites stay byte-identical until they adopt the blocks):
  // llms.txt dist check runs in BOTH modes (deterministic; also guards against
  // the llms-txt audit being a blind-spot on Lighthouse < 13.3). JSON-LD runs
  // here in fast mode only — in --full mode runFullLighthouse owns it (it can
  // then attach results to worklist entries without double-printing).
  if (config.agentic?.llmsTxt) {
    for (const v of checkLlmsTxt(getStaticDistDir(config, siteDir))) {
      violations.push(v);
    }
  }
  if (!full && config.jsonld?.require) {
    const { byRoute, violations: jsonldViolations } = runJsonLdChecksLocal(
      siteDir,
      config,
    );
    for (const route of Object.keys(byRoute)) {
      const r = byRoute[route];
      console.log(
        `[jsonld] ${route} — ${r.blocks} block(s)${r.types.length ? `, types: ${r.types.join(", ")}` : ""}${r.ok ? "" : " — FAIL"}`,
      );
    }
    for (const v of jsonldViolations) violations.push(v);
  }

  // Dist-based content gates (config-gated; skip silently when absent).
  if (!full && config.links) {
    const { byRoute, violations: gateViolations } = runLinkChecksLocal(
      siteDir,
      config,
    );
    for (const route of Object.keys(byRoute)) {
      const r = byRoute[route];
      console.log(
        `[links] ${route} — ${r.ok ? `ok (${r.checked} checked)` : `FAIL (${r.errors.length} broken)`}`,
      );
    }
    for (const v of gateViolations) violations.push(v);
  }
  if (!full && config.meta) {
    const { byRoute, violations: gateViolations } = runMetaChecksLocal(
      siteDir,
      config,
    );
    for (const route of Object.keys(byRoute)) {
      const r = byRoute[route];
      if (!r.ok) console.log(`[meta] ${route} — FAIL (${r.errors.length})`);
    }
    for (const v of gateViolations) violations.push(v);
  }
  if (!full && config.imageBudget) {
    const { byRoute, violations: gateViolations } = runImageBudgetChecksLocal(
      siteDir,
      config,
    );
    for (const route of Object.keys(byRoute)) {
      const r = byRoute[route];
      console.log(
        `[images] ${route} — ${r.kb.toFixed(1)} KB / budget ${r.budget} KB${r.ok ? "" : " — FAIL"}`,
      );
    }
    for (const v of gateViolations) violations.push(v);
  }

  let result = violations.length ? "FAIL" : "PASS";
  if (violations.length) {
    for (const v of violations) console.log(`[FAIL] ${v}`);
  } else {
    console.log("[PASS] no bundle/image violations");
  }

  if (full) {
    // runFullLighthouse is async — use spawnSync trick or IIFE
    runFullLighthouse(
      siteDir,
      config,
      worklist,
      runsOverride,
      targetOverride,
      onlyFailed,
    )
      .then(({ violations: lhViolations }) => {
        if (lhViolations.length) {
          result = "FAIL";
          for (const v of lhViolations) console.log(`[FAIL] ${v}`);
        } else {
          console.log("[PASS] Lighthouse — all presets, all routes passed");
        }
        console.log(`RESULT: ${result}`);
        process.exit(result === "FAIL" ? 1 : 0);
      })
      .catch((err) => {
        console.log(`[FAIL] Lighthouse error: ${err.message}`);
        console.log("RESULT: FAIL");
        process.exit(1);
      });
    return; // exit handler in the promise
  }

  console.log(`RESULT: ${result}`);
  process.exit(result === "FAIL" ? 1 : 0);
}

// Guard: run main only when this file is the Node entry point, so the pure
// functions are importable for Chrome-free verification (node --input-type=module).
if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  main(process.argv);
}

export {
  checkAssertion,
  filterChromeLauncherProcs,
  buildWorklistEntry,
  localeGroup,
  computeDeltaRoutes,
  median,
  buildMedianReport,
  parseRunsArg,
  applyTarget,
  parseTargetArg,
};
export { runHostingCheck, probeHttp2 };
export {
  extractJsonLd,
  hasSchemaOrgContext,
  jsonLdNodes,
  jsonLdTypes,
  checkRouteJsonLd,
  resolveRouteHtml,
  runJsonLdChecksLocal,
  runJsonLdChecks,
  checkLlmsTxt,
};
export {
  runLinkChecksLocal,
  checkRouteLinks,
  runMetaChecksLocal,
  checkRouteMeta,
  runImageBudgetChecksLocal,
  measureRouteImages,
  lintImages,
  startStaticServer,
  stopServer,
};
