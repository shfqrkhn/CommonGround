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
