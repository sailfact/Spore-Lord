# Spore Lord — Design Specification

> *A fungal domination idle clicker. Browser-based, persistent, self-hosted.*

---

## 1. Concept Summary

The player is a sentient cosmic mushroom. Click to release spores. Spend spores to build a fungal empire across the universe. Everything auto-produces while you're away. State persists across refreshes via `localStorage`.

---

## 2. Visual Design

### 2.1 Aesthetic Direction

**"Bioluminescent Void"** — deep space meets deep forest floor. The UI should feel like staring into a cave where everything glows. Think: pitch black backgrounds, neon mycelium tracery, softly pulsing spore clouds. It should feel slightly *alive* at all times — ambient motion even when the player isn't clicking.

Not cute. Not cartoony. Quietly unsettling, beautiful, and organic.

### 2.2 Colour Palette

| Role              | Hex       | Usage                                      |
|-------------------|-----------|--------------------------------------------|
| Void Black        | `#050508` | Page background                            |
| Deep Mycelium     | `#0d0f1a` | Panel/card backgrounds                     |
| Spore Glow        | `#a8ff78` | Primary accent, spore counter, highlights  |
| Biolume Cyan      | `#38f0d0` | Secondary accent, click FX                 |
| Fungal Purple     | `#8b5cf6` | Tertiary, upgrade cards                    |
| Mycelium Dim      | `#2a2d3e` | Borders, dividers                          |
| Text Primary      | `#e8eaf2` | Body text                                  |
| Text Muted        | `#6b7280` | Labels, descriptions                       |

All interactive elements glow. Hover states should intensify the glow — not change colour.

### 2.3 Typography

| Role              | Font                        | Notes                              |
|-------------------|-----------------------------|------------------------------------|
| Display / Title   | **Cinzel Decorative**       | Import from Google Fonts           |
| UI / Numbers      | **Space Mono**              | Monospaced, consistent digit width |
| Body / Flavour    | **Lora** (italic variant)   | Warm serif for flavour text        |

Spore counts use Space Mono so the number doesn't shift width as it grows.

### 2.4 Layout

Three-column layout on desktop, stacked on mobile:

```
┌──────────────────────────────────────────────────────┐
│                    SPORE LORD                        │  ← header / nav
│              🍄 1,234,567 Spores                     │
├──────────────┬─────────────────────┬─────────────────┤
│              │                     │                 │
│  GENERATORS  │   CLICK ZONE        │  UPGRADES       │
│  (left col)  │   (centre)          │  (right col)    │
│              │                     │                 │
│  Building    │  [Giant Mushroom]   │  Upgrade Card   │
│  cards with  │  pulse animation    │  cards with     │
│  counts &    │                     │  lock/unlock    │
│  buy button  │  Floating spore     │  states         │
│              │  particles          │                 │
│              │                     │                 │
├──────────────┴─────────────────────┴─────────────────┤
│  EVENT LOG — scrolling milestone messages            │
└──────────────────────────────────────────────────────┘
```

**Mobile:** Stack as: header → click zone → generators → upgrades → log.

---

## 3. Game Mechanics

### 3.1 Currency

- Single currency: **Spores** (🍄)
- Display format: raw integers up to 999, then abbreviated (1.2K, 4.5M, 2.1B, etc.)
- Stored as a JavaScript `BigInt` or high-precision float; use `number` with care above 2^53

### 3.2 Manual Click

- Clicking the central mushroom adds **Spores Per Click (SPC)**
- Base SPC = 1
- Modified by upgrades and total generators owned
- Click produces a burst animation + floating "+N" text that drifts upward and fades

### 3.3 Generators (Auto-Producers)

Each generator produces **Spores Per Second (SPS)** passively.

| # | Name              | Base Cost  | Base SPS | Flavour                              |
|---|-------------------|------------|----------|--------------------------------------|
| 1 | Mycelium Thread   | 10         | 0.1      | Thin strands stretching through soil |
| 2 | Spore Cluster     | 100        | 0.5      | A dense node of reproductive mass    |
| 3 | Hyphal Network    | 1,100      | 4        | Underground web of fungal nerves     |
| 4 | Sporulating Body  | 12,000     | 30       | A fruiting body the size of a house  |
| 5 | Stellar Bloom     | 130,000    | 200      | Spores seeded across solar winds     |
| 6 | Cosmic Spore      | 1,400,000  | 1,500    | A galaxy-spanning fungal entity      |

**Cost scaling:** Each purchase multiplies cost by **1.15** (standard idle game curve).

**SPS formula:** `building.baseSPS × count × globalMultiplier`

### 3.4 Upgrades (Unlockable)

Unlocked by owning a certain number of a generator. Purchased once. Permanently doubles (or more) output.

| # | Name                    | Cost      | Unlock Condition          | Effect                              |
|---|-------------------------|-----------|---------------------------|-------------------------------------|
| 1 | Better Spores           | 100       | 1× Mycelium Thread        | SPC × 2                             |
| 2 | Stronger Threads        | 500       | 5× Mycelium Thread        | Mycelium Thread SPS × 2             |
| 3 | Cluster Compression     | 5,000     | 5× Spore Cluster          | Spore Cluster SPS × 2               |
| 4 | Hyphal Overdrive        | 50,000    | 5× Hyphal Network         | Hyphal Network SPS × 2              |
| 5 | Mycorrhizal Resonance   | 500,000   | 5× Sporulating Body       | All buildings SPS × 1.5             |
| 6 | Interstellar Drift      | 5,000,000 | 5× Stellar Bloom          | Stellar Bloom SPS × 2               |
| 7 | Universal Spore Mind    | 50M       | 5× Cosmic Spore           | Cosmic Spore SPS × 2                |
| 8 | The Fungal Singularity  | 1B        | All upgrades purchased    | Global SPS × 3, SPC × 5            |

Locked upgrades are visible but greyed out (blurred flavour text, padlock icon). Unlocked-but-unaffordable show the cost in red. Affordable highlight in Spore Glow.

### 3.5 Milestones & Event Log

A fixed-height scrollable log at the bottom. New entries appear at the top with a fade-in.

| Trigger                         | Message                                                              |
|---------------------------------|----------------------------------------------------------------------|
| First click                     | *"A single spore falls. It will not be the last."*                  |
| 100 Spores total                | *"The soil remembers you."*                                          |
| First generator bought          | *"Roots stretch into the dark."*                                     |
| 1,000 Spores total              | *"Something stirs beneath the forest floor."*                        |
| 10,000 Spores total             | *"Local wildlife has begun to act… differently."*                    |
| 1M Spores total                 | *"A city reports unusual fungal growth. They are not concerned. Yet."* |
| 1B Spores total                 | *"Earth is merely the beginning."*                                   |
| First Cosmic Spore bought       | *"The stars themselves begin to smell of mushrooms."*                |
| Fungal Singularity purchased    | *"All things. One mycelium. You have won, and it doesn't matter."*   |

---

## 4. Persistence Model

All state stored in `localStorage` under the key `sporeLord_save`.

### 4.1 Save Schema (JSON)

```json
{
  "version": 1,
  "spores": 0,
  "totalSporesEarned": 0,
  "lastSave": 1716000000000,
  "generators": {
    "myceliumThread": { "count": 0, "cost": 10 },
    "sporeCluster":   { "count": 0, "cost": 100 },
    "hyphalNetwork":  { "count": 0, "cost": 1100 },
    "sporulatingBody":{ "count": 0, "cost": 12000 },
    "stellarBloom":   { "count": 0, "cost": 130000 },
    "cosmicSpore":    { "count": 0, "cost": 1400000 }
  },
  "upgrades": {
    "betterSpores": false,
    "strongerThreads": false,
    "clusterCompression": false,
    "hyphalOverdrive": false,
    "mycorrhizalResonance": false,
    "interstellarDrift": false,
    "universalSporeMind": false,
    "fungalSingularity": false
  },
  "milestonesSeen": [],
  "eventLog": []
}
```

### 4.2 Offline Progression

On load, calculate time delta since `lastSave`. Award `delta_seconds × SPS` spores (capped at 8 hours offline). Display a "You were gone for X — your empire grew by Y spores" toast on load.

### 4.3 Save Frequency

Auto-save every **30 seconds** and on `beforeunload`. No manual save button required (but could be added).

---

## 5. Animation Spec

### 5.1 Central Mushroom

- **Idle:** Slow breathing scale pulse (`scale: 1.0 → 1.03 → 1.0`, 3s loop, ease-in-out)
- **Click:** Quick squish-and-expand (`scale: 0.92 → 1.08 → 1.0`, 200ms, spring easing)
- **Glow ring:** Radial gradient halo that slowly rotates hue, always on

### 5.2 Floating Click Text

On each click, spawn a `+N` label at the click position that:
- Drifts upward ~60px
- Fades from 100% → 0% opacity
- Duration: 800ms, ease-out
- Font: Space Mono, colour: Spore Glow
- Multiple can stack simultaneously

### 5.3 Spore Particles (Ambient)

10–15 tiny particle elements (CSS `border-radius: 50%`, 3–6px, Spore Glow colour at 40% opacity):
- Spawn at random positions around the mushroom
- Float upward on randomised paths with slight lateral drift
- Looping, staggered, continuous — CSS keyframe animations with random durations (4–10s)
- Density increases with total SPS (JS updates particle count)

### 5.4 Generator Cards

- **Idle:** Very subtle pulse glow on the card border (1.5s loop, low amplitude)
- **On purchase:** Card briefly flashes and a small count badge increments with a bounce
- **Cannot afford:** Desaturated, reduced opacity

### 5.5 Upgrade Cards

- **Locked:** Blurred content, grey palette, padlock SVG icon
- **Unlocked/unaffordable:** Full colour, slight glow, cost shown in muted red
- **Affordable:** Spore Glow border pulse, animated "available" shimmer sweep
- **Purchased:** Checkmark, permanently muted styling

### 5.6 Event Log Entries

- New entries slide in from the left with a fade
- Hold a max of 20 entries (trim oldest)
- Timestamp shown in muted text on the right

---

## 6. Technical Stack

**Static site, ES modules** — no build step, no framework, no bundler, no package manager. The browser loads source files directly from a static server.

| Concern         | Approach                                                        |
|-----------------|-----------------------------------------------------------------|
| Structure       | Semantic HTML5 in `index.html`                                  |
| Styling         | `style.css` linked from `index.html`; CSS vars, Grid/Flex       |
| Logic           | Vanilla JS (ES2020+), ES modules under `src/`                   |
| Entrypoint      | `<script type="module" src="./src/main.js">` in `index.html`    |
| Fonts           | Google Fonts via `<link>` (self-host if offline)                |
| Persistence     | `localStorage`                                                  |
| Game loop       | `setInterval` at 100ms tick for smooth SPS                      |
| Animations      | CSS keyframes + JS class toggling                               |

Suggested module split (not prescriptive — evolve as needed):

```
index.html
style.css
src/
  main.js     — boot, wires modules, starts loop
  loop.js     — setInterval tick, SPS accrual
  state.js    — in-memory game state + multipliers
  save.js     — localStorage load/save, schema versioning, offline catch-up
  ui.js       — DOM rendering, event log, click/buy handlers
```

No dependencies. Must be served over HTTP (ES modules will not load from `file://`).

---

## 7. NAS Hosting

### 7.1 What You Need

The project directory (`index.html`, `style.css`, `src/`) served over HTTP. ES modules require a real server — `file://` won't work. Any of the following do:

| Option                   | Notes                                                   |
|--------------------------|---------------------------------------------------------|
| **Nginx** (Docker)       | Recommended. One container, dead simple config          |
| **Caddy** (Docker)       | Automatic HTTPS if you have a domain pointing to NAS    |
| **Python HTTP server**   | `python3 -m http.server 8080` — no Docker needed        |
| **Nginx (native)**       | If your NAS OS (TrueNAS/Unraid) supports it natively    |

### 7.2 Docker Compose (Nginx)

```yaml
services:
  spore-lord:
    image: nginx:alpine
    ports:
      - "8080:80"
    volumes:
      - ./game:/usr/share/nginx/html:ro
    restart: unless-stopped
```

Place the project files (`index.html`, `style.css`, `src/`) in `./game/`. Access at `http://nas-ip:8080`.

### 7.3 Font Offline Fallback

If the NAS won't have internet access, download Cinzel Decorative, Space Mono, and Lora as `.woff2` files and reference them with `@font-face` instead of the Google Fonts CDN link.

---

## 8. Deliverable Plan

The spec produces a static project directory:

1. `index.html` — semantic markup, font `<link>`s, `<link>` to `style.css`, `<script type="module" src="./src/main.js">`
2. `style.css` — all styling, custom properties, keyframes
3. `src/*.js` — ES modules for game logic, loop, state, save/load, UI (see §6 for suggested split)
4. Inline SVG for the mushroom (or CSS-drawn) inside `index.html`

Ready to drop into a folder and serve over HTTP.

---

*Spec version 1.0 — ready for implementation.*
