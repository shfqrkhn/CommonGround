# CODEBASE.md

## Scope
- **apparent purpose:** COMMONGROUND Suite is a local-first, offline-capable progressive web app for conflict resolution and structured team conversation facilitation. This repository acts as the compiled distribution for GitHub Pages (no source code, no backend).
- **stack/languages/frameworks:** Vanilla JS (ES2023), Vite (upstream build tool), IndexedDB (storage), Workbox (PWA), HTML/CSS.
- **entry points:** `index.html` (SPA fallback), `sw.js` (Service Worker), `byoai.js` (optional standalone AI overlay).
- **build/run/test systems:** Distributed via GitHub Pages. Upstream uses Vitest + fake-indexeddb.
- **architectural style:** Zero-backend PWA, Single Page Application with client-side routing and entirely local storage.
- **major operational invariants:** Strict CSP limits network to `'self'` and `https:` (for AI); no credentials or env vars; immutable schemas require safe migrations; no CDN runtime dependencies.

## Repository Map
```text
.gitignore
.jules/steward.md
CLAUDE.md
LICENSE
README.md
assets/index-BKn_KlXK.css
assets/index-DQPX2SFP.js
assets/workbox-window.prod.es5-Bq4GJJid.js
byoai.js
index.html
manifest.webmanifest
serve.py
sw.js
workbox-8c29f6e4.js
```

## Authoritative Review Summary
- **core flows:** First load caching via Workbox -> `index.html` initializes SPA -> IndexedDB handles 100% of data locally. `byoai.js` connects DB to user's personal AI key for local-context AI assistance.
- **important interfaces:** `IndexedDB Schema (v1)` handles workspaces, matters, participants, intakeRecords, issueNodes, sessions, commitments, followUps. AI prompt structure built in `byoai.js` from IndexedDB reads.
- **key configs:** `manifest.webmanifest` (PWA behavior), `index.html` (`Content-Security-Policy`), `sw.js` (asset precache revisions).
- **major invariants:** No server, touch-action manipulation on interactive elements, precise Workbox revisions for assets.
- **principal risks:** Service worker cache lock-in if revisions drift, CSP misconfigurations preventing BYOAI network requests, malformed import bundles corrupting IndexedDB, unhandled exceptions in UI logic since source code is minified.

## File Inventory
| Path | Role | Priority | Inclusion | Reason |
|---|---|---|---|---|
| `index.html` | Entry Point | Critical | Full | SPA entry point, defines strict CSP, links Workbox and assets. |
| `manifest.webmanifest` | Config | Important | Full | PWA settings, scope, and Android/iOS icon handling. |
| `byoai.js` | AI Overlay | Critical | Excerpt | Core AI logic fetching DB context to prompt Gemini/OpenAI securely. |
| `sw.js` | Service Worker | Important | Excerpt | Workbox precache initialization and route mapping. |
| `assets/index-DQPX2SFP.js` | App Bundle | Critical | Excerpt | Minified core app containing all DB handling and UI logic. |
| `CLAUDE.md` | Documentation | Important | Summary | Defines strict architectural invariants and schema schemas. |
| `.jules/steward.md` | Documentation | Important | Summary | Logs resolution protocols for critical bugs and edge cases. |
| `README.md` | Documentation | Context | Summary | Project overview, privacy guarantees, PWA installation. |
| `assets/index-BKn_KlXK.css` | Styles | Context | Summary | Minified UI stylesheet. |
| `assets/workbox-window.prod.es5-Bq4GJJid.js` | Library | Context | Excluded | Vendored Workbox window script. |
| `workbox-8c29f6e4.js` | Library | Context | Excluded | Vendored Workbox service worker logic. |
| `serve.py` | Script | Context | Excluded | Local development script, unused in production. |
| `.gitignore` | Config | Context | Excluded | Standard gitignore. |
| `LICENSE` | Legal | Context | Excluded | Standard MIT license. |

## Embedded Critical Files

### `index.html`
- **Role:** SPA Entry Point
- **Why it matters:** Defines strict CSP rules and mounts app CSS/JS.
- **Inclusion:** Full
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob:; connect-src 'self' https:; worker-src 'self' blob:; manifest-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-src 'none'; child-src 'none'; frame-ancestors 'none'; upgrade-insecure-requests;" />
    <meta name="description" content="Facilitator-first human-systems resolution suite. Resolve clearly." />
    <meta name="referrer" content="no-referrer" />
    <meta http-equiv="Permissions-Policy" content="camera=(), microphone=(), geolocation=(), payment=(), fullscreen=(self)" />
    <meta name="theme-color" content="#1a1f2e" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-title" content="CommonGround" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="application-name" content="CommonGround" />
    <link rel="icon" type="image/png" sizes="32x32" href="/CommonGround/icons/icon-32.png" />
    <link rel="icon" type="image/png" sizes="16x16" href="/CommonGround/icons/icon-16.png" />
    <link rel="apple-touch-icon" sizes="180x180" href="/CommonGround/icons/icon-180.png" />
    <meta name="msapplication-TileImage" content="/CommonGround/icons/icon-256.png" />
    <meta name="msapplication-TileColor" content="#0f1117" />
    <!-- iOS splash screens -->
    <link rel="apple-touch-startup-image" media="screen and (device-width:375px) and (device-height:667px) and (-webkit-device-pixel-ratio:2) and (orientation:portrait)" href="/CommonGround/icons/splash/apple-splash-750-1334.png" />
    <link rel="apple-touch-startup-image" media="screen and (device-width:414px) and (device-height:896px) and (-webkit-device-pixel-ratio:2) and (orientation:portrait)" href="/CommonGround/icons/splash/apple-splash-828-1792.png" />
    <link rel="apple-touch-startup-image" media="screen and (device-width:375px) and (device-height:812px) and (-webkit-device-pixel-ratio:3) and (orientation:portrait)" href="/CommonGround/icons/splash/apple-splash-1125-2436.png" />
    <link rel="apple-touch-startup-image" media="screen and (device-width:390px) and (device-height:844px) and (-webkit-device-pixel-ratio:3) and (orientation:portrait)" href="/CommonGround/icons/splash/apple-splash-1170-2532.png" />
    <link rel="apple-touch-startup-image" media="screen and (device-width:393px) and (device-height:852px) and (-webkit-device-pixel-ratio:3) and (orientation:portrait)" href="/CommonGround/icons/splash/apple-splash-1179-2556.png" />
    <link rel="apple-touch-startup-image" media="screen and (device-width:402px) and (device-height:874px) and (-webkit-device-pixel-ratio:3) and (orientation:portrait)" href="/CommonGround/icons/splash/apple-splash-1206-2622.png" />
    <link rel="apple-touch-startup-image" media="screen and (device-width:414px) and (device-height:896px) and (-webkit-device-pixel-ratio:3) and (orientation:portrait)" href="/CommonGround/icons/splash/apple-splash-1242-2688.png" />
    <link rel="apple-touch-startup-image" media="screen and (device-width:428px) and (device-height:926px) and (-webkit-device-pixel-ratio:3) and (orientation:portrait)" href="/CommonGround/icons/splash/apple-splash-1284-2778.png" />
    <link rel="apple-touch-startup-image" media="screen and (device-width:430px) and (device-height:932px) and (-webkit-device-pixel-ratio:3) and (orientation:portrait)" href="/CommonGround/icons/splash/apple-splash-1290-2796.png" />
    <link rel="apple-touch-startup-image" media="screen and (device-width:440px) and (device-height:956px) and (-webkit-device-pixel-ratio:3) and (orientation:portrait)" href="/CommonGround/icons/splash/apple-splash-1320-2868.png" />
    <link rel="apple-touch-startup-image" media="screen and (device-width:768px) and (device-height:1024px) and (-webkit-device-pixel-ratio:2) and (orientation:portrait)" href="/CommonGround/icons/splash/apple-splash-1536-2048.png" />
    <link rel="apple-touch-startup-image" media="screen and (device-width:744px) and (device-height:1133px) and (-webkit-device-pixel-ratio:2) and (orientation:portrait)" href="/CommonGround/icons/splash/apple-splash-1488-2266.png" />
    <link rel="apple-touch-startup-image" media="screen and (device-width:820px) and (device-height:1180px) and (-webkit-device-pixel-ratio:2) and (orientation:portrait)" href="/CommonGround/icons/splash/apple-splash-1640-2360.png" />
    <link rel="apple-touch-startup-image" media="screen and (device-width:834px) and (device-height:1194px) and (-webkit-device-pixel-ratio:2) and (orientation:portrait)" href="/CommonGround/icons/splash/apple-splash-1668-2388.png" />
    <link rel="apple-touch-startup-image" media="screen and (device-width:1024px) and (device-height:1366px) and (-webkit-device-pixel-ratio:2) and (orientation:portrait)" href="/CommonGround/icons/splash/apple-splash-2048-2732.png" />
    <link rel="apple-touch-startup-image" media="screen and (device-width:1032px) and (device-height:1376px) and (-webkit-device-pixel-ratio:2) and (orientation:portrait)" href="/CommonGround/icons/splash/apple-splash-2064-2752.png" />
    <link rel="manifest" href="/CommonGround/manifest.webmanifest" />
    <title>CommonGround Suite</title>
    <style>
      /* Global Mobile Interaction Base */
      button, [role="button"], [type="button"], [type="submit"], [type="reset"], a, summary, .btn, .chip, .list-item.clickable, .step, label, input[type="radio"] {
        touch-action: manipulation;
        transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
      }

      /* Premium Background & Foundation */
      html {
        background-color: #0f111a !important;
        scroll-behavior: smooth !important;
      }
      body {
        background-color: transparent !important;
        background-image: none !important;
        color: #f8f9fc !important;
        font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
        -webkit-font-smoothing: antialiased;
        min-height: 100vh;
      }

      /* Dynamic Orb Animation */
      @keyframes orbFloat1 {
        0% { transform: translate(0, 0) scale(1); }
        100% { transform: translate(8vw, 12vh) scale(1.15); }
      }
      @keyframes orbFloat2 {
        0% { transform: translate(0, 0) scale(1); }
        100% { transform: translate(-10vw, -8vh) scale(1.2); }
      }
      @keyframes orbPulse {
        0%, 100% { opacity: 0.5; }
        50% { opacity: 0.8; }
      }

      /* Joyful Interactive Elements */
      @media (hover: hover) {
        button:hover, [role="button"]:hover, a.button:hover {
          transform: translateY(-2px) !important;
          filter: brightness(1.15) !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2), 0 0 12px rgba(79, 142, 247, 0.15) !important;
        }
        a:hover { filter: brightness(1.2) !important; }
      }
      button:active, [role="button"]:active, a.button:active {
        transform: translateY(1px) !important;
        box-shadow: none !important;
        filter: brightness(0.95) !important;
      }
      a { transition: color 0.2s ease !important; }

      /* Input & Form Styling (Responsive & Intuitive) */
      input, textarea, select {
        background: rgba(0,0,0,0.25) !important;
        border: 1px solid rgba(255,255,255,0.12) !important;
        border-radius: 10px !important;
        color: #ffffff !important;
        transition: border-color 0.25s, box-shadow 0.25s !important;
        backdrop-filter: blur(8px) !important;
        -webkit-backdrop-filter: blur(8px) !important;
      }
      input:focus, textarea:focus, select:focus {
        border-color: #4f8ef7 !important;
        box-shadow: 0 0 0 3px rgba(79, 142, 247, 0.25) !important;
        outline: none !important;
      }
      input::placeholder, textarea::placeholder {
        color: rgba(255,255,255,0.4) !important;
      }

      /* Glassmorphic Surfaces (Useful & Joyful) */
      article, section, .card, [role="dialog"], [role="region"], .noscript-card, header, nav, dialog {
        background: rgba(30, 35, 50, 0.4) !important;
        backdrop-filter: blur(24px) !important;
        -webkit-backdrop-filter: blur(24px) !important;
        border: 1px solid rgba(255,255,255,0.06) !important;
        box-shadow: 0 8px 32px rgba(0,0,0,0.2) !important;
        border-radius: 14px !important;
      }

      /* Micro-animations */
      @keyframes floatInGlass {
        from { opacity: 0; transform: translateY(12px); filter: blur(4px); }
        to { opacity: 1; transform: translateY(0); filter: blur(0); }
      }
      #app {
        animation: floatInGlass 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards !important;
      }
    </style>
    <script type="module" crossorigin src="/CommonGround/assets/index-DQPX2SFP.js"></script>
    <link rel="stylesheet" crossorigin href="/CommonGround/assets/index-BKn_KlXK.css">
    <!-- BYOAI: optional AI facilitator overlay — loads after app, fully additive -->
    <script defer src="/CommonGround/byoai.js"></script>
  </head>
  <body>
    <!-- Joyful Animated Ambient Background -->
    <div id="joyful-ambient-bg" aria-hidden="true" style="position:fixed;inset:0;z-index:-1;overflow:hidden;background-color:#0f111a;pointer-events:none;">
      <div style="position:absolute;top:-15%;left:-10%;width:55vw;height:55vw;background:radial-gradient(circle, rgba(79, 142, 247, 0.18) 0%, rgba(79, 142, 247, 0) 70%);border-radius:50%;filter:blur(60px);animation:orbFloat1 22s infinite alternate ease-in-out, orbPulse 15s infinite ease-in-out;"></div>
      <div style="position:absolute;bottom:-15%;right:-10%;width:65vw;height:65vw;background:radial-gradient(circle, rgba(123, 94, 167, 0.15) 0%, rgba(123, 94, 167, 0) 70%);border-radius:50%;filter:blur(80px);animation:orbFloat2 28s infinite alternate ease-in-out, orbPulse 18s infinite ease-in-out;animation-delay:-5s;"></div>
      <div style="position:absolute;top:40%;left:50%;width:40vw;height:40vw;transform:translate(-50%, -50%);background:radial-gradient(circle, rgba(46, 204, 113, 0.08) 0%, rgba(46, 204, 113, 0) 60%);border-radius:50%;filter:blur(100px);animation:orbPulse 20s infinite ease-in-out;animation-delay:-10s;"></div>
    </div>
    <div id="app"></div>
    <noscript>
      <div class="noscript-card">
        <h1>COMMONGROUND Suite</h1>
        <p>JavaScript is required to run this application.</p>
      </div>
    </noscript>
  </body>
</html>
```

### `manifest.webmanifest`
- **Role:** PWA Config
- **Why it matters:** Configures standalone mode, screenshots, and icons ensuring PWA requirements.
- **Inclusion:** Full
```json
{
  "id": "/CommonGround/",
  "name": "COMMONGROUND Suite",
  "short_name": "CommonGround",
  "description": "Facilitator-first human-systems resolution suite. Resolve clearly.",
  "start_url": "/CommonGround/",
  "scope": "/CommonGround/",
  "display": "standalone",
  "display_override": ["window-controls-overlay", "standalone"],
  "background_color": "#0f1117",
  "theme_color": "#1a1f2e",
  "orientation": "any",
  "categories": ["productivity", "utilities"],
  "icons": [
    {
      "src": "/CommonGround/icons/icon-16.png",
      "sizes": "16x16",
      "type": "image/png"
    },
    {
      "src": "/CommonGround/icons/icon-32.png",
      "sizes": "32x32",
      "type": "image/png"
    },
    {
      "src": "/CommonGround/icons/icon-48.png",
      "sizes": "48x48",
      "type": "image/png"
    },
    {
      "src": "/CommonGround/icons/icon-64.png",
      "sizes": "64x64",
      "type": "image/png"
    },
    {
      "src": "/CommonGround/icons/icon-128.png",
      "sizes": "128x128",
      "type": "image/png"
    },
    {
      "src": "/CommonGround/icons/icon-180.png",
      "sizes": "180x180",
      "type": "image/png"
    },
    {
      "src": "/CommonGround/icons/icon-256.png",
      "sizes": "256x256",
      "type": "image/png"
    },
    {
      "src": "/CommonGround/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/CommonGround/icons/icon-512-maskable.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ],
  "screenshots": [
    {
      "src": "/CommonGround/screenshot-app.png",
      "type": "image/png",
      "form_factor": "wide",
      "label": "CommonGround facilitation dashboard"
    }
  ]
}
```

### `byoai.js`
- **Role:** AI Overlay
- **Why it matters:** Contains business logic for interacting with IndexedDB and executing AI queries without an external backend.
- **Inclusion:** Excerpt
- **Excerpt note:** Preserves configuration constants, DB access interface signatures, context gathering function, and API network fetch signatures.
```javascript
/**
 * BYOAI — Bring Your Own AI Facilitator for CommonGround Suite
 *
 * A self-contained overlay that reads all session data from IndexedDB and
 * forwards it to the user's own AI API key (Google Gemini or any
 * OpenAI-compatible endpoint).  No data is sent anywhere without an explicit
 * user action.  The API key is stored in localStorage and never leaves the
 * browser except in requests to the provider the user configured.
 */
(function () {
  'use strict';

...
  const modelListCache = new Map();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DRAFT_KEY = 'byoai_draft';
  const QUICK_PROMPTS = [
    { label: '20-min plan', prompt: 'Give me a 3-step facilitation plan for the next 20 minutes.' },
    { label: 'Next questions', prompt: 'Draft 4 neutral, high-leverage questions I should ask next.' },
    { label: 'Risk scan', prompt: 'Identify risks, power imbalances, and one mitigation for each.' },
    { label: 'Commitments', prompt: 'Turn this into clear commitments with owner, due date, and check-in.' },
  ];

  const GEMINI_MODELS = [
    { id: 'gemini-2.0-flash',              label: 'Gemini 2.0 Flash (recommended)' },
    { id: 'gemini-2.0-flash-lite',         label: 'Gemini 2.0 Flash Lite' },
    { id: 'gemini-2.5-pro-preview-03-25',  label: 'Gemini 2.5 Pro Preview' },
    { id: 'gemini-1.5-flash',              label: 'Gemini 1.5 Flash' },
    { id: 'gemini-1.5-pro',               label: 'Gemini 1.5 Pro' },
  ];
...
    { id: 'gpt-4.1',      label: 'GPT-4.1 (recommended)' },
    { id: 'gpt-4o',       label: 'GPT-4o' },
    { id: 'gpt-4o-mini',  label: 'GPT-4o Mini' },
    { id: 'o3',           label: 'o3' },
    { id: 'o4-mini',      label: 'o4-mini' },
  ];

  // ── Config ────────────────────────────────────────────────────────────────

  function loadConfig() {
    try { return JSON.parse(localStorage.getItem(CONFIG_KEY) || 'null'); }
...
    const dbs = await indexedDB.databases();
    const required = ['workspaces', 'matters', 'participants'];

    for (const { name } of dbs) {
      if (!name) continue;
      try {
        const db = await idbOpen(name);
        const stores = Array.from(db.objectStoreNames);
        db.close();
...
  async function callGemini(cfg, messages) { ... }
  async function callOpenAI(cfg, messages) { ... }
  async function callAI(cfg, messages) {
    return cfg.provider === 'gemini' ? callGemini(cfg, messages) : callOpenAI(cfg, messages);
  }
...
  async function sendMessage() { ... }
  function initPanel() { ... }
    }
  });

  // ── Boot ──────────────────────────────────────────────────────────────────

  function boot() {
    document.body.appendChild(buildToggle());
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

})();
```

### `sw.js`
- **Role:** Service Worker
- **Why it matters:** Exposes caching mechanisms and precisely defines revisions needed for cache invalidation.
- **Inclusion:** Excerpt
- **Excerpt note:** Preserves the core structural logic of precache and routing, excluding the large array of icon assets.
```javascript
if(!self.define){let e,i={};const n=(n,s)=>(n=new URL(n+".js",s).href,i[n]||new Promise(i=>{if("document"in self){const e=document.createElement("scri...
ifest",revision:"5fdcddbf7b1f688c"}],{}),e.cleanupOutdatedCaches(),e.registerRoute(new e.NavigationRoute(e.createHandlerBoundToURL("index.html")))});

```

### `assets/index-DQPX2SFP.js`
- **Role:** Main App Bundle
- **Why it matters:** Contains entire DB and UI behavior. Minified, so direct editing is disallowed.
- **Inclusion:** Excerpt
- **Excerpt note:** Preserves the top of the file to show initialization, context bindings, and overall minified structure, minimizing noise.
```javascript
(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossO
...
`[SW] App is ready for offline use.`)}}),t&&cr(e)}function ur(e,t){e.innerHTML=`
    <div class="error-screen" role="alert" aria-live="assertive">
      <div class="error-card">
        <h1>COMMONGROUND Suite</h1>
        <p class="error-msg">${t}</p>
        <button id="reload-btn" class="btn btn-primary">Reload</button>
      </div>
    </div>
  `;let n=e.querySelector(`#reload-btn`);n&&n.addEventListener(`click`,()=>location.reload())}lr().catch(e=>console.error(e?.message||"Unknown error"));
```

## Summarized Files
- **`CLAUDE.md`:** Important documentation capturing the architecture (Vite, TypeScript, local IndexedDB schema, Workbox caching) and explicit instructions on repository behavior. Warns against modifying minified assets directly.
- **`.jules/steward.md`:** Important protocol log. Captures architectural mandates derived from bugs, such as touch interactions (`touch-action: manipulation`), Workbox SHA-256 vs MD5 revision conventions, BYOAI CSP constraints, and array cross-reference import checks.
- **`README.md`:** Contextual overview of CommonGround Suite, highlighting its "100% offline-first sovereign architecture".
- **`assets/index-BKn_KlXK.css`:** Contextual stylesheet. Fully minified, responsible for layout and custom component styling.

## Cross-File Relationships
- **startup wiring:** `index.html` bootstraps everything. It links the manifest, loads CSS (`index-BKn_KlXK.css`), executes the primary JS bundle (`index-DQPX2SFP.js`), and defers the AI overlay (`byoai.js`).
- **module relationships:** `byoai.js` is isolated and entirely standalone, reaching into the IndexedDB database defined and maintained by `index-DQPX2SFP.js`.
- **API/data flow:** External requests are disabled by default. If a user sets an API key in `byoai_config` (`localStorage`), `byoai.js` requests model data and generates responses directly via `fetch` to provider APIs.
- **config/env flow:** CSP and PWA metadata flow directly from `index.html` and `manifest.webmanifest`. Revisions flow through `sw.js`.
- **dependency hotspots:** Workbox (`sw.js` and `workbox-8c29f6e4.js`) orchestrates offline availability. Changes to assets require `sw.js` revision updates to avoid cache stalling.

## Review Hotspots
- **correctness risks:** Mismatches between schema definitions in the minified DB handler (`index-DQPX2SFP.js`) and explicit queries made by `byoai.js`.
- **security risks:** Strict CSP in `index.html` prevents XSS, but improper use of `.innerHTML` inside minified bundles or `byoai.js` could break these boundaries if not escaped.
- **performance risks:** Synchronous IndexedDB or excessive DOM manipulation in the minified app bundle. Deep history arrays sent in the `byoai.js` payload could overflow token limits.
- **state/concurrency risks:** Local state corruption if complex array imports lack comprehensive `matterId` and duplicate-key verification.
- **maintainability smells:** The core logic is heavily minified and bundled; resolving core app logic requires access to the upstream TypeScript repo.

## Packaging Notes
- **exclusions:** All vendored `.js` files, icons, Python scripts, and git settings were excluded to minimize noise.
- **compression decisions:** Extracted only signatures and critical context from `byoai.js` and `sw.js` while suppressing the vast strings of model selection code and Workbox cache arrays.
- **fidelity limits:** As the main application logic (`index-DQPX2SFP.js`) is an opaque compiled distribution bundle, reviewing complex business rules (e.g. negotiation/change-facilitation flows) with high confidence requires referencing the original upstream source repository.