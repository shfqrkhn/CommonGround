## 2026-03-28 - [📱 Mobile] - [BYOAI Panel Header Safe-Area Inset Top]
**Protocol:** The BYOAI panel uses `position:fixed;inset:0 0 0 auto`, anchoring its top edge at y=0. With `viewport-fit=cover` active, this means the panel's header content is positioned under the status bar / notch / Dynamic Island on iPhone X+ in standalone PWA mode. The panel header had `padding:13px 14px` with no top safe-area allowance, hiding the 🤝 title and close/settings buttons behind the status bar. Fix: change header top padding to `max(13px, env(safe-area-inset-top, 0px))` — preserves the minimum visual padding while adding the status-bar height when `viewport-fit:cover` is active. This follows the same pattern as `.app-header` and `.sw-banner` in the main app.

## 2026-03-28 - [📱 Mobile] - [BYOAI Toggle and Panel Footer Safe-Area Insets]
**Protocol:** `byoai.js` uses `viewport-fit=cover` (inherited from `index.html`), which activates `env(safe-area-inset-*)` CSS variables. Two elements lacked safe-area padding:
1. **Toggle button** — `position:fixed;bottom:22px;right:22px` places the 🤝 button within the iOS home indicator zone (~34px) on iPhone X+ in standalone PWA mode, making it unreachable by touch. Fix: `bottom:calc(22px + env(safe-area-inset-bottom,0px));right:calc(22px + env(safe-area-inset-right,0px))` — uses `calc()` to add insets on top of the minimum visual offset, same pattern as the app header.
2. **Panel footer** — the chat input/send button row had `padding:10px 12px` with no bottom safe-area allowance, hiding the controls behind the home indicator. Fix: set bottom padding to `max(10px,env(safe-area-inset-bottom,0px))` using the CSS `max()` function so the minimum visual padding is always preserved while accommodating the safe area.
Any `position:fixed` element that is anchored to the bottom edge must include `env(safe-area-inset-bottom)` in its positioning when `viewport-fit:cover` is active.

## 2026-03-28 - [♿ A11y] - [BYOAI Panel Escape Key and History Overflow]
**Protocol:** Two additional issues remained after the ARIA/focus fix in v0.1.100:
1. **Escape key not handled** — ARIA APG (Disclosure pattern) requires that pressing Escape closes a visible non-modal panel and returns focus to the controlling element. Without it, keyboard users must Tab back to the close button to dismiss the panel. Fix: add a `document.addEventListener('keydown', ...)` handler that fires when `e.key === 'Escape'` and `state.open` is true; update all ARIA state and return focus to the toggle button (same pattern as the close-button handler).
2. **Conversation history grows unbounded** — `state.history` is appended to with every exchange. On long conversations this eventually exceeds the model's context window, causing the API to return a 400/413 error. Fix: before calling `callAI()` in `sendMessage()`, compute a trimmed view: system message + last 20 messages (`state.history.length > 21 ? [state.history[0], ...state.history.slice(-20)] : state.history`). The stored history is not modified so the UI still shows the full conversation, but only recent context is sent to the API.

## 2026-03-28 - [♿ A11y] - [BYOAI Panel ARIA State and Focus Management]
**Protocol:** The BYOAI toggle button and slide-in panel lacked ARIA state synchronisation and keyboard focus management, violating WCAG 2.1 AA (Success Criteria 4.1.2 Name/Role/Value and 2.4.3 Focus Order). Three defects and their fixes:
1. **`aria-hidden` missing on closed panel** — the panel is visually hidden via CSS `transform:translateX(100%)` but remains in the accessibility tree, so screen readers read its content even when it is closed. Fix: set `aria-hidden="true"` on the panel element initially (in `buildPanel()`) and toggle it with the open state.
2. **Toggle button `aria-expanded` and `aria-label` not updated** — the button always announced "Open AI Facilitator" regardless of panel state. Fix: set `aria-expanded` to `"true"`/`"false"` and update `aria-label` to "Close AI Facilitator" / "Open AI Facilitator" whenever state changes, including from the close button handler.
3. **No focus management on open/close** — keyboard and screen reader users had no programmatic cue that the panel opened. Fix: use `requestAnimationFrame(() => input.focus())` after opening to move focus into the panel; return focus to the toggle button on close (from both `togglePanel()` and the close button handler).
Add `aria-controls="byoai-panel"` on the toggle button to complete the association.

## 2026-03-28 - [🛡️ Sentinel] - [innerHTML With User-Supplied Data]
**Protocol:** In `byoai.js`, `renderSettings()` embedded `cfg.apiKey` and `cfg.endpoint` (arbitrary strings loaded from `localStorage`) directly into an `innerHTML` template literal as HTML attribute values. A `"` character in either value breaks the attribute context and allows injection of arbitrary attributes or elements. Fix: remove user-supplied values from the HTML template entirely and set them via DOM property assignment (`element.value = cfg.apiKey`) after the element is created. Similarly, `renderModelOptions()` embedded API-returned model IDs and labels into `innerHTML` via template literals — these must be set via `option.value` and `option.textContent` using `document.createElement('option')`. Any string originating from user input, `localStorage`, or an external API must never be interpolated directly into an `innerHTML` template.

## 2026-03-28 - [🛡️ Sentinel] - [Dead escHtml After Rendering Model Change]
**Protocol:** `escHtml()` was introduced in `byoai.js` to escape strings before setting them via `innerHTML`. After the rendering model changed from `innerHTML`/`md2html` to `textContent` (v0.1.97) and error message escaping was removed (v0.1.98), `escHtml` had zero callers and became dead code. Remove it. Retaining a utility function after its use case is eliminated creates false confidence that escaping is still in place. When switching between rendering models (`innerHTML` ↔ `textContent`), audit every call-site of both the renderer and any escaping helpers, and delete helpers that have no remaining callers.

## 2024-03-28 - [🎨 Palette] - [Mobile Physics]
**Protocol:** Apply `touch-action: manipulation` to all clickable elements on mobile to prevent zoom-on-tap.

## 2024-03-28 - [🛡️ Sentinel] - [Logs]
**Protocol:** Suppress stack traces in production by logging `error.message` instead of the full error object.

## 2026-03-28 - [⚡ Bolt] - [Per-Participant Records]
**Protocol:** When a record type transitions from one-per-matter to one-per-participant, export/import bundles must be updated atomically — both the serialisation (export array field) and deserialisation (import loop + validation) — or data loss occurs silently on round-trip.

## 2026-03-28 - [🛡️ Sentinel] - [Import Validation Completeness]
**Protocol:** When a new array field is added to the import bundle, the `Et()` validator must receive ALL three checks that apply to keyed record arrays: (1) matterId cross-reference, (2) foreign-key cross-reference (e.g. participantId must be in the participants set — guard must not short-circuit on falsy value), (3) duplicate-key detection via a local Set. Omitting any check allows malformed or adversarially crafted bundles to corrupt the DB silently or throw cryptic runtime errors inside the import transaction.

## 2026-03-28 - [🛡️ Sentinel] - [Import Validation Completeness]
**Protocol:** When updating minified JS bundles, ensure version numbers in UI (Pt variable), README.md, and CLAUDE.md are properly synchronized.

## 2026-03-28 - [🛡️ Sentinel] - [Service Worker Revision Integrity]
**Protocol:** After every commit that modifies a precached asset, the corresponding `revision` field in `sw.js` must be updated. Two revision formats coexist — do not mix them:
- **Dynamic assets** (index.html, JS bundle, CSS bundle, manifest.webmanifest): use the **first 16 hex characters of SHA-256** — `sha256sum <file> | cut -c1-16`. These were originally MD5 but are maintained as SHA-256[:16] since v0.1.87.
- **Static assets** (icons/*.png, icons/splash/*.png, icons.svg, screenshot-app.png): use **full MD5** — `md5sum <file> | awk '{print $1}'`. These change only when asset files themselves change. Note: `favicon.svg` has been deleted; do not re-add it.
Omitting this step leaves a stale revision that prevents Workbox from invalidating the old cached asset for returning users, silently serving outdated code.

## 2026-03-28 - [🎨 Palette] - [Mobile Header Nav Overflow]
**Protocol:** The header brand has `flex-shrink:0`, so on narrow screens (≤480px) the brand + nav together exceed the viewport width. Fix: (1) hide `.brand-tag` at ≤640px and reduce `header-inner` gap to `var(--space-2)`; (2) hide `.brand-name` and reduce `header-inner` padding to `0 var(--space-2)` at ≤480px. This keeps all three nav buttons (Dashboard, Matters, Settings) fully visible with no horizontal overflow down to 320px.

## 2026-03-28 - [🎨 Palette] - [Center-Content Viewport Overflow]
**Protocol:** `.center-content{min-height:100dvh}` causes the create-workspace page to overflow by the footer height (~53px), pushing the footer off-screen and requiring vertical scrolling. Fix: use `min-height:calc(100dvh - 48px - env(safe-area-inset-bottom))` so the centering column fills exactly the available height above the footer.

## 2026-03-28 - [🛡️ Sentinel] - [Global Notice Sticky Overlap]
**Protocol:** `.global-notice` had `position:sticky;top:0` (z-index 95) and appears before the header (z-index 100) in DOM order. When the user scrolled with a persistent error notice visible, the header slid on top and permanently covered the notice. Fix: remove `position:sticky;top:0` from `.global-notice` — it stays in normal document flow, remains visible until dismissed, and does not conflict with the sticky header.

## 2026-03-28 - [🎨 Palette] - [SW Banner Safe-Area Insets]
**Protocol:** `.sw-banner` is `position:sticky;top:0` (z-index 110) and appears above the header in the DOM. Unlike `.app-header`, it lacked `env(safe-area-inset-top/left/right)` padding, causing banner text to be clipped under the status bar on notched iPhones in standalone PWA mode. Fix: use `padding-top:max(var(--space-2),env(safe-area-inset-top))`, `padding-left:max(var(--space-4),env(safe-area-inset-left))`, `padding-right:max(var(--space-4),env(safe-area-inset-right))` on `.sw-banner` — the same pattern the header uses, preserving minimum visual padding while accommodating the safe area.

## 2026-03-28 - [🛡️ Sentinel] - [BYOAI CSP Compatibility]
**Protocol:** When BYOAI is enabled, CSP `connect-src` must include `https:` (while remaining tightly scoped) or provider API calls and model auto-discovery will fail at runtime.

## 2026-03-28 - [🎨 Palette] - [Cross-Platform PWA Install Assets]
**Protocol:** A correctly installable PWA requires platform-specific assets beyond the basic manifest icons:
1. **iOS apple-touch-icon** — must be exactly 180×180 px at `<link rel="apple-touch-icon" sizes="180x180">`. Larger sizes (256px) are silently ignored on some iOS versions.
2. **iOS splash screens** — `<link rel="apple-touch-startup-image">` with exact `media` queries matching device-width, device-height, device-pixel-ratio, and orientation. Required sizes: 750×1334 (SE 1/2/3), 828×1792 (XR/11), 1125×2436 (X/XS/11Pro/12mini/13mini), 1170×2532 (12/13/14/16), 1179×2556 (14Pro/15/15Pro/16), 1206×2622 (16 Pro), 1242×2688 (XS Max/11 Pro Max), 1284×2778 (12/13/14 Pro Max/14 Plus), 1290×2796 (14/15/16 Pro Max/15 Plus/16 Plus), 1320×2868 (16 Pro Max), 1488×2266 (iPad mini 6/7), 1536×2048 (iPad 7/8/9/mini 5), 1640×2360 (iPad 10/Air 5/Air 11 M2), 1668×2388 (iPad Pro 11" M4), 2048×2732 (iPad Pro 12.9"/Air 13 M2), 2064×2752 (iPad Pro 13" M4). Design: `background_color` fill with emoji at 35% of the shorter dimension. Without these, iOS shows a white flash on launch. When new iPhone/iPad models are released check Apple's HIG or device specs for updated logical resolution and DPR.
3. **Windows tile** — `<meta name="msapplication-TileImage">` and `<meta name="msapplication-TileColor">` in `<head>` for Windows Start menu tile support.
4. **Manifest screenshots** — `"screenshots"` array in the manifest. `form_factor` must match actual image orientation: `"wide"` for landscape images (width > height), `"narrow"` for portrait images (height > width). A mismatched form_factor causes the install prompt to skip displaying the screenshot.
5. **`display_override`** — add `["window-controls-overlay", "standalone"]` for desktop Chromium PWA title-bar integration; falls back gracefully to `display: standalone` on unsupported platforms.
All splash images and the screenshot must be added to the Workbox precache with full MD5 revisions.

## 2026-03-28 - [🎨 Palette] - [PWA Icon Source of Truth]
**Protocol:** PNG files in `icons/` are the canonical PWA icon assets — do not regenerate them from SVG source files. The original `favicon.svg` contained incorrect artwork (a lightning bolt) and has been deleted. The correct icon is the handshake 🤝 emoji rendered from Noto Color Emoji (`/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf`) using Pillow at each required size. If icons ever need to be regenerated, render from the emoji directly — not from any SVG present in the repository. `icons.svg` is a UI sprite sheet for in-app icon glyphs and must not be confused with the app icon.

## 2026-03-28 - [🎨 Palette] - [PWA Manifest Icon Requirements]
**Protocol:** The PWA manifest must satisfy Android/Chrome install requirements:
1. **512×512 icon required** — without it, Android may show a blank home screen icon. Always include both `icons/icon-512.png` (`purpose: "any"`) and `icons/icon-512-maskable.png` (`purpose: "maskable"`).
2. **Split `any` and `maskable` into separate entries** — combining `"purpose": "any maskable"` on one entry causes Android's adaptive icon system to apply its shape mask to an icon not designed for it, producing a clipped or blank result.
3. **Maskable safe zone** — the maskable icon must have a solid background fill (use `background_color` from the manifest, `#0f1117`) with icon content occupying ≤70% of the canvas, ensuring it survives all Android adaptive icon shapes.

## 2026-03-28 - [🛡️ Sentinel] - [SW Precache Completeness]
**Protocol:** Every asset referenced by `index.html` (scripts, stylesheets, deferred scripts, and `<link>` hrefs including splash images) must appear in the Workbox precache in `sw.js`. `byoai.js` was missing despite being loaded via `<script defer>`; it has been added with a SHA-256[:16] revision. Audit the precache list whenever a new `<script>`, `<link>`, or `<meta content>` asset tag is added to `index.html`. Dynamic assets (JS/HTML/CSS/webmanifest) use SHA-256[:16]; static assets (PNGs, SVGs) use full MD5.

## 2026-03-28 - [🛡️ Sentinel] - [Favicon SVG Removal]
**Protocol:** `index.html` previously declared `<link rel="icon" type="image/svg+xml" href="...favicon.svg">` as the primary icon with a PNG as fallback. Android Chrome ignores SVG favicons for PWA home screen icons and falls through to the manifest. The SVG-first link was replaced with explicit PNG links (`icon-32.png` sizes="32x32", `icon-16.png` sizes="16x16") and `<link rel="apple-touch-icon" sizes="256x256" href="icons/icon-256.png">`. Never use SVG as the primary favicon source in this repository.

## 2026-03-28 - [🤝 BYOAI] - [escHtml With textContent Double-Encoding]
**Protocol:** In `byoai.js`, `appendBubble()` renders content via `bubble.textContent`, which means the DOM already escapes special characters safely. Wrapping the error message in `escHtml()` before passing to `appendBubble()` causes HTML entities (`&lt;`, `&amp;`, `&quot;`) to appear literally in the UI — e.g. an API error containing `<details>` would display as `&lt;details&gt;`. Fix: omit `escHtml()` for any string destined for `textContent`. Only use `escHtml()` when injecting into `innerHTML`.

## 2026-03-28 - [🤝 BYOAI] - [Dead Code Removal After Plain-Text Refactor]
**Protocol:** After switching `appendBubble()` from `innerHTML`/`md2html` to `textContent` in v0.1.97, the `md2html()` function became unreachable dead code. Remove it. Dead HTML-rendering helpers left in place after a rendering model change create confusion and inflate the bundle size for no benefit.

## 2026-03-28 - [🤝 BYOAI] - [SPA Route Detection via hashchange]
**Protocol:** The SPA route watcher previously polled via `setInterval(..., 500)`. Since the app uses hash-based routing (`location.hash`), the correct primitive is `window.addEventListener('hashchange', ...)`. The event fires synchronously when the hash changes, giving zero-latency context refresh with no polling overhead. Replace any `setInterval` route-change poll in hash-based SPAs with `hashchange`.

## 2026-03-28 - [🤝 BYOAI] - [AI Assistant Plain Text Output]
**Protocol:** The BYOAI AI Facilitator must output and render plain text only — no markdown syntax. Two changes are required in tandem:
1. **Rendering** — `appendBubble` must use `bubble.textContent = content` (with `white-space:pre-wrap` on the AI bubble) instead of `bubble.innerHTML = md2html(content)`. This prevents raw markdown tokens (`**`, `##`, `-`) from appearing as literal characters in the UI.
2. **System prompt** — the Response Format section must explicitly instruct the model: no asterisks, no hash headings, no dashes for bullets, no backticks; 3–5 sentence cap; all guidance anchored to the active matter's title and type. The seed greeting must also name the matter and request plain text.
Omitting either change causes the other to partially break: a plain-text prompt with HTML rendering is harmless, but a markdown prompt with `textContent` rendering shows raw symbols to the user.
