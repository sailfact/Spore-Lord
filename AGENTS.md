# AGENTS.md

This file provides guidance for coding agents working in this repository.

## Project

Spore Lord is a browser-based fungal idle clicker, self-hosted on a NAS. The full design lives in `SPEC.md`; read it before changing mechanics, visuals, or the save schema.

## Architecture

- **No build step, no framework, no bundler, no package manager.** The browser loads source files directly. Do not introduce dependencies, transpilation, or tooling beyond a static file server.
- **ES modules, vanilla JS, ES2020+.** `game/index.html` is the entrypoint. Keep logic split across modules under `game/src/` and wire them with `import` / `export`. CSS should remain in files loaded directly by the browser.
- **Persistence is `localStorage` under key `sporeLord_save`.** Schema is versioned (`version: 1`); bump and migrate if you change shape. Auto-save every 30 seconds and on `beforeunload`.
- **Offline progression is capped at 8 hours.** Compute delta from `lastSave` on load, then award `delta_seconds * SPS`.
- **Cost scaling is fixed at 1.15x per purchase.** The stored `cost` field is derivable: `cost = baseCost * 1.15^count`. Recompute from `count` rather than trusting `cost` if a save looks inconsistent.
- **SPS formula:** `building.baseSPS * count * buildingMultiplier * globalMultiplier`. `globalMultiplier` is the product of every global upgrade, and per-building multipliers compose the same way.
- **SPC is separate:** base 1 multiplied by purchased SPC upgrades.
- **Numbers can exceed `2^53`.** Use `BigInt` or be deliberate about precision; spore counts grow without bound.

## Run Locally

```bash
cd game
python3 -m http.server 8080
# then open http://localhost:8080
```

A static server is required because ES modules will not load reliably via `file://` due to CORS restrictions.

## Verification

There are currently no formal tests, lint, or build steps. For behavior changes, verify in a browser by exercising the click loop, buying each generator and upgrade tier, reloading to confirm persistence, and checking offline catch-up by editing `lastSave` in DevTools.

## Aesthetic Guardrails

The look is **"Bioluminescent Void"**: pitch black with neon mycelium glow. Hover states intensify glow, never change hue. The game should feel unsettling, beautiful, and organic; not cute or cartoony. Palette, fonts, and animation timings are specified in `SPEC.md` sections 2 and 5, and those sections are authoritative.
