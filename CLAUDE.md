# CLAUDE.md — COMMONGROUND Suite

> This file guides AI assistants working in this repository. Keep it updated when conventions, protocols, or architecture change.

---

## Repository Purpose

This is the **compiled distribution repository** for COMMONGROUND Suite, a local-first, offline-capable progressive web app for conflict resolution and structured team conversation facilitation. The source code, TypeScript, tests, and build toolchain live in a **separate private source repository**. This repo contains the built output deployed to GitHub Pages.

**Live app:** https://shfqrkhn.github.io/CommonGround/
**Current version:** v0.1.102

---

## Repository Layout

```
/
├── index.html                  # SPA entry point (sets CSP headers + links manifest)
├── manifest.webmanifest        # PWA manifest (name, icons, display mode, scope)
├── icons.svg                   # SVG icon sprite (UI glyphs used by JS bundle)
├── byoai.js                    # BYOAI optional AI facilitator overlay
├── sw.js                       # Compiled Workbox service worker (minified)
├── workbox-8c29f6e4.js         # Workbox runtime library
├── screenshot-app.png          # App screenshot (manifest screenshots field)
├── README.md                   # User and developer documentation
├── LICENSE                     # MIT License
├── .gitignore                  # Ignores node_modules only
├── assets/
│   ├── index-DQPX2SFP.js      # Main JS bundle (~125KB minified)
│   ├── index-BKn_KlXK.css     # Main CSS bundle (~19KB minified)
│   └── workbox-window.prod.es5-Bq4GJJid.js
├── icons/                      # PWA icons: 16–512px PNG + 180px apple-touch +
│   │                           # 512px maskable; splash/ subdir for iOS launch screens
│   └── splash/                 # iOS apple-touch-startup-image PNGs (16 device sizes)
└── .jules/
    └── steward.md              # Protocol log — critical implementation decisions
```

---

## Technology Stack

| Concern | Technology |
|---------|-----------|
| Build tool | Vite 8 |
| Language | TypeScript 5, strict mode, ES2023 |
| UI | Vanilla JS with DOM templating (no React/Vue/Svelte) |
| Storage | IndexedDB (9 stores, versioned schema, forward-safe migrations) |
| Large artifacts | OPFS (Origin Private File System) |
| Offline / PWA | vite-plugin-pwa + Workbox (precache, auto-update) |
| Tests | Vitest + fake-indexeddb |
| Hosting | GitHub Pages (fully static, no server) |

---

## Architecture

### Local-First, Zero-Backend

- **No server.** All data lives in the browser's IndexedDB.
- **No external calls by default.** Optional BYOAI provider traffic uses HTTPS when explicitly configured by the user.
- **No credentials.** No API keys, tokens, env vars, or secrets needed anywhere.
- **No CDN runtime.** All dependencies are bundled; the app is fully self-contained after the first load.

### SPA Routing

All navigation requests fall through to `index.html` via the Workbox service worker. Routes are handled client-side:

| Route | Purpose |
|-------|---------|
| `create-workspace` | Initial workspace setup |
| `onboarding` | First-run experience |
| `dashboard` | Main workspace view |
| `create-matter` | New case setup |
| `matters` | Case list |
| `matter-detail` | Case overview |
| `suitability` | Safety/suitability screen (mandatory 10-question checklist) |
| `intake` | Per-participant context capture with visibility controls |
| `issue-map` | Structured issue map with priority levels |
| `session` | Facilitation log entry with phase tracking |
| `commitments` | Action/commitment tracking |
| `follow-up` | Follow-up checkpoint scheduling |
| `negotiation-pack` | AI-generated negotiation briefing |
| `team-health-pack` | AI-generated team health briefing |
| `performance-conversation-pack` | AI-generated performance briefing |
| `change-facilitation-pack` | AI-generated change facilitation briefing |
| `export` | Bundle generation |
| `settings` | Workspace config, import/export, factory reset |
| `recovery` | Data recovery interface |

### IndexedDB Schema (v1)

| Store | Key Path | Notable Indexes |
|-------|----------|----------------|
| `workspaces` | `id` | `createdAt`, `updatedAt` |
| `matters` | `id` | `workspaceId`, `status`, `type`, `createdAt`, `updatedAt` |
| `participants` | `id` | `matterId`, `createdAt`, `updatedAt` |
| `intakeRecords` | `id` | `matterId`, `createdAt`, `updatedAt` |
| `issueNodes` | `id` | `matterId`, `priority`, `createdAt`, `updatedAt` |
| `sessions` | `id` | `matterId`, `createdAt`, `updatedAt` |
| `commitments` | `id` | `matterId`, `status`, `createdAt`, `updatedAt` |
| `followUps` | `id` | `matterId`, `createdAt`, `updatedAt` |
| `exportArtifacts` | `id` | `matterId`, `createdAt`, `updatedAt` |

**Migration rule:** Schema changes require a version bump and a forward-safe migration runner. Never mutate existing record shapes without a migration path.

### Export Bundle Format

```jsonc
{
  "version": "<semver>",
  "exportedAt": "<ISO timestamp>",
  "workspaceName": "<string>",
  "facilitatorName": "<string>",
  "matters": [],
  "participants": [],
  "intakeRecords": [],   // Per-participant (not per-matter) since v0.1.82
  "issueNodes": [],
  "sessions": [],
  "commitments": [],
  "followUps": []
}
```

---

## Design Principles

1. **Sovereign** — no backend dependency, no CDN runtime, no external calls in production.
2. **Atomic changes** — every service function is independently testable with bounded side effects.
3. **Strict CSP** — base app is self-hosted; `connect-src` permits HTTPS only for optional BYOAI provider calls; no eval.
4. **Accessible** — WCAG 2.1 AA: keyboard navigable, screen-reader semantic, reduced-motion safe.
5. **Offline-first** — full offline capability after first visit; installable as standalone PWA.

---

## Critical Protocols

These protocols are derived from real bugs and must be followed precisely. They are logged in `.jules/steward.md`.

### [Mobile Physics] — Touch Interaction

Apply `touch-action: manipulation` to **all clickable elements** on mobile. This prevents the 300ms tap delay and double-tap zoom that otherwise breaks interactive UX on iOS and Android.

### [Logs] — Production Error Logging

In production, log `error.message` only — **never** the full `error` object. Full error objects expose stack traces that can leak internal implementation details in public DevTools.

### [Per-Participant Records] — Atomic Export/Import Updates

When a record type transitions from **one-per-matter** to **one-per-participant** (or any similar cardinality change):

- Update **both** serialisation (export) and deserialisation (import) in the same commit.
- Updating only one side causes silent data loss on round-trip — the bundle will export the new shape but the import loop will silently drop records, or vice versa.
- See v0.1.82 (`intakeRecords`) as the reference implementation.

### [Import Validation Completeness] — Three-Check Rule

When adding a new array field to the import bundle, the validator function must apply **all three** checks that apply to keyed record arrays:

1. **matterId cross-reference** — every record's `matterId` must exist in the imported matters set.
2. **Foreign-key cross-reference** — any additional foreign key (e.g. `participantId`) must exist in the corresponding set. **Do not short-circuit on falsy values** — guard the check with an explicit presence test.
3. **Duplicate-key detection** — use a local `Set` to detect duplicate primary keys within the array.

Omitting any check allows malformed or adversarially crafted bundles to silently corrupt IndexedDB or throw cryptic runtime errors inside import transactions.

---

## Testing

- **Framework:** Vitest + fake-indexeddb
- **Coverage target:** 95%+ statement coverage; 100% for core database services
- **Test count:** 116 tests (as of v0.1.86)
- **What is tested:** core database services, data migrations, import/export validation, suitability assessment logic, form validation

Tests live in the **source repository**, not this distribution repository. Do not add test files here.

---

## Build & Deployment

- **Build tool:** Vite 8 — outputs minified JS/CSS bundles into `assets/`
- **PWA generation:** `vite-plugin-pwa` generates `sw.js` and `manifest.webmanifest`
- **Hosting:** GitHub Pages at `https://shfqrkhn.github.io/CommonGround/`
- **Base path:** `/CommonGround/`
- **Deployment:** Push compiled dist to `main` branch — GitHub Pages serves it automatically

This is a **distribution-only** repository. Do not run `npm install`, `vite build`, or any build commands here. Changes to source code happen upstream, then compiled output is committed here.

---

## Git Workflow

- **Main branch:** `main` — reflects the latest deployed release
- **Feature branches:** `claude/<feature>-<TASK_ID>` or `shfqrkhn/<feature>-<TASK_ID>`
- **Version tags:** `v0.1.x` on `main` after each release
- **Commit messages:** Short imperative subject line; reference the version bump when applicable

When working in this repository as an AI assistant:
1. Develop on the designated feature branch (check task context).
2. Commit with clear, descriptive messages.
3. Push to the designated branch when complete.
4. Do **not** push to `main` directly.
5. Do **not** create a pull request unless explicitly asked.

---

## Security Constraints

- **CSP is strict and intentional.** Keep `connect-src` limited to `'self' https:` for BYOAI compatibility; do not add wider network scopes, `unsafe-inline`, or `unsafe-eval`.
- **No external URLs.** Do not add `<script src="...">`, `<link rel="stylesheet" href="...">`, or any resource pointing outside `'self'`.
- **No backend.** Do not add fetch calls, WebSockets, or any network I/O targeting external hosts.
- **No credentials in code.** There are no API keys, tokens, or secrets — if you find yourself needing one, stop and reconsider the approach.

---

## What NOT To Do in This Repository

- Do not add source TypeScript files — this is a dist-only repo.
- Do not add test files — tests live in the source repo.
- Do not add `node_modules/`, lock files, or build config (vite.config.ts, tsconfig.json, etc.).
- Do not modify minified `assets/` bundles by hand — they are generated by the build pipeline.
- Do not weaken the Content-Security-Policy in `index.html`.
- Do not add tracking scripts, analytics, or any external resource loading.
