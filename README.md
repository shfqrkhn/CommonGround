# COMMONGROUND Suite

**Facilitator-first human-systems resolution suite. Resolve clearly.**

A local-first, offline-capable progressive web app for preparing, facilitating, and documenting structured conflict-resolution and team-conversation workflows — with zero backend, zero accounts, and no data leaving your device.

---

## Live App

**[https://shfqrkhn.github.io/CommonGround/](https://shfqrkhn.github.io/CommonGround/)**

![App Screenshot](./screenshot-app.png)

Works in any modern browser. No installation required. Can be installed as a standalone app from your browser's address bar.

---

## For End Users

### What It Does

COMMONGROUND Suite gives facilitators a private, structured workspace to manage the full arc of a resolution or conversation:

| Step | What you do |
|------|-------------|
| **Workspace** | Create a named workspace for your practice |
| **Matter** | Open a matter and set its type (conflict, negotiation, team health, performance conversation, change facilitation) |
| **Suitability** | Run a mandatory suitability screen — safety and route-out triggers surface first |
| **Intake** | Capture participant context with visibility controls (private or facilitator-only) |
| **Issue Map** | Build a structured issue map with priority levels |
| **Sessions** | Record agenda, notes, and facilitation phase for each session |
| **Commitments** | Track owner, due date, and status for every commitment made |
| **Follow-ups** | Schedule and complete follow-up checkpoints |
| **Packs** | Generate specialist briefings — Negotiation, Team Health, Performance Conversation, Change Facilitation |
| **Export** | Download a full archive packet as a portable JSON bundle |

### Data & Privacy

- **Nothing leaves your device.** All data is stored in your browser's local IndexedDB storage.
- There is no server, no account, no sync, and no telemetry of any kind.
- **Back up your data:** Settings → Export → downloads a portable `.json` file.
- **Restore your data:** Settings → Import → loads any previously exported bundle.
- **Wipe everything:** Settings → Factory Reset → clears all local data permanently.

### Offline Use

After your first visit the app works fully offline. If you install it from your browser (look for the install prompt or "Add to Home Screen"), it behaves like a native app with no browser chrome.

### Browser Support

Any modern browser with IndexedDB and Service Worker support: Chrome, Edge, Firefox, Safari (iOS 16.4+), and all Chromium-based browsers.

---

## For Developers

### Architecture

| Layer | Technology |
|-------|-----------|
| Build | Vite 8 + TypeScript 5 (strict, ES2023) |
| Storage | IndexedDB — 9 stores, versioned schema, forward-safe migration runner |
| Large artifacts | OPFS (Origin Private File System) |
| Offline | vite-plugin-pwa / Workbox — auto-update, full precache |
| Tests | Vitest + fake-indexeddb — 116 tests, 95%+ statement coverage, core services at 100% |
| Hosting | GitHub Pages — fully static, no server required |

### Design Principles

- **Sovereign** — no backend dependency, no CDN runtime, no external calls in production.
- **Atomic changes** — every service function is independently testable and side-effect bounded.
- **Strict CSP** — `connect-src 'self'` only; no inline scripts; no eval.
- **Accessible** — WCAG 2.1 AA: keyboard navigable, screen-reader semantic, reduced-motion safe.

### This Repository

This repository contains the **compiled distribution** (`dist/`) of COMMONGROUND Suite. The source code, test suite, and build toolchain live in the source repository.

---

## Version

`v0.1.87`
