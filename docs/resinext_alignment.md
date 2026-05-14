# Resinext alignment notes (Resinsite ↔ Resin app)

`/Users/zachbas/resinext` is outside this Codex run’s writable roots, so I can’t directly apply these edits. This document lists the concrete changes to make the Chrome extension match the web app + iOS vibe and the current config flow.

## 1) Palette + typography (match `ResinTheme.swift`)

Update `resinext/src/style.css`:

- Replace the current CSS variables with:
  - `--resin-bg: #F5EFE7`
  - `--resin-amber: #C8884A`
  - `--resin-forest: #4D6652`
  - `--resin-earth: #8C7B6A`
  - `--resin-charcoal: #2E2A26`
  - `--resin-border: rgba(46, 42, 38, 0.12)`
- Replace the font stack to match the web app:
  - `Nunito` for UI text
  - `JetBrains Mono` for mono accents

This brings extension UI into the same warm sand / amber / forest system used across iOS + web.

## 2) “No bypass” copy (match actual behavior)

If any extension UI copy claims “network level” blocking or “can’t be disabled”, rewrite it to be precise:

- Chrome extension blocking is enforced by Chrome rules during active sessions.
- It reduces impulse-clicks; it’s not a kernel/network firewall.

The resinsite page at `/extension` was updated to reflect this.

## 3) Config loading (match `/api/config`)

The web app now correctly serves `resinsite/resin-config.json` via `GET /api/config`.

Make sure `resinext/src/configService.ts`:

- Prefers `/api/config` as the source of truth (already does), and
- Avoids hard-coded Supabase URL/keys unless config fetch fails.

## 4) Event bridge parity

Resinsite listens for:

- `resin:ai_started`
- `resin:ai_success`
- `resin:ai_error`

Confirm the extension’s content script dispatches these consistently for:

- Manual “Quick Activate” scheduling (`/api/activate`)
- Any failure paths (so the dashboard doesn’t stick in “scheduling”)

