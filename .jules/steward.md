## 2024-03-28 - [🎨 Palette] - [Mobile Physics]
**Protocol:** Apply `touch-action: manipulation` to all clickable elements on mobile to prevent zoom-on-tap.

## 2024-03-28 - [🛡️ Sentinel] - [Logs]
**Protocol:** Suppress stack traces in production by logging `error.message` instead of the full error object.

## 2026-03-28 - [⚡ Bolt] - [Per-Participant Records]
**Protocol:** When a record type transitions from one-per-matter to one-per-participant, export/import bundles must be updated atomically — both the serialisation (export array field) and deserialisation (import loop + validation) — or data loss occurs silently on round-trip.
