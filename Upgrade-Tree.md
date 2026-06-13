# UpgradeTree.md — Spore Lord

Replaces and expands §3.3 (Generators) and §3.4 (Upgrades) from the design spec.

---

## Overview

Every generator and the manual clicker has its own upgrade tree. All trees share the same structural pattern:

```
[Shared T1] → [Shared T2] → [Shared T3]
                                  ↓
                        ┌── BRANCH 1 ──┐
                      [RED]          [BLUE]
                        │               │
                   T4 → T8         T4 → T8
                        ↓               ↓
               ┌── BRANCH 2 ──┐  ┌── BRANCH 2 ──┐
               [A]    [B]     [A]             [B]
                │      │       │               │
           T9→T15  T9→T15  T9→T15         T9→T15
```

- **Shared Tiers 1–3:** Linear, must be purchased in order. Available to all players.
- **Branch 1 (after T3):** Choose RED or BLUE permanently. The other path is visible but locked forever.
- **Branch 2 (after T8, i.e. 5 upgrades into the branch):** Choose one of two sub-paths permanently.
- **Terminal path (T9–T15):** 7 upgrades. No further branching — this is the end of the tree.

**Total upgrades per full path:** 3 (shared) + 5 (branch) + 7 (terminal) = **15**
**Total possible terminal paths per tree:** 4 (Red-A, Red-B, Blue-A, Blue-B)
**Total unique terminal paths across all 7 trees:** 28

### Branch Choice UI

When a branch point is reached (T3 or T8 purchased), the next upgrade slot expands into a side-by-side choice card. Each option shows:
- Branch name and icon
- 3-line philosophy description
- First upgrade of that path as a preview
- A **"COMMIT"** button — clearly labelled as permanent

The unchosen path collapses to a faded tombstone card with a lock icon. Its upgrade names and effects remain visible but blurred.

### Cost Formula

Each generator tree uses its **base generator cost** as the cost unit (C).

| Tier Range | Cost Formula         |
|------------|----------------------|
| T1         | C × 1                |
| T2         | C × 3                |
| T3         | C × 10               |
| T4         | C × 30               |
| T5         | C × 100              |
| T6         | C × 300              |
| T7         | C × 1,000            |
| T8         | C × 3,000            |
| T9         | C × 10,000           |
| T10        | C × 30,000           |
| T11        | C × 100,000          |
| T12        | C × 300,000          |
| T13        | C × 1,000,000        |
| T14        | C × 3,000,000        |
| T15        | C × 10,000,000       |

The clicker tree uses its own flat cost column (defined in its section).

### Unlock Condition

Each tier requires the **previous tier** to be purchased. T1 also requires owning at least **1 of the associated generator** (or 1 total click for the clicker tree).

---

## Tree 0 — The Clicker: "Spore Touch"

*The hand that started it all. Upgrades modify Spores Per Click (SPC), click mechanics, and combo behaviour.*

### Shared Path

| Tier | Name | Cost | Effect | Flavour |
|------|------|------|--------|---------|
| T1 | Hardened Cap | 50 | SPC ×2 | *Chitin grows where skin once was.* |
| T2 | Spore Compression | 200 | SPC ×2 | *More spores in every squeeze.* |
| T3 | Mycotoxin Charge | 800 | SPC ×3 · 5% chance: output ×2 | *A touch that leaves more than a mark.* |

---

### Branch Choice: CRIMSON HAND vs VOID TOUCH

```
            T3 (Mycotoxin Charge)
                     ↓
       ┌─────── BRANCH 1 ───────┐
  CRIMSON HAND             VOID TOUCH
  Burst & crits          Synergy & idle
```

---

### 🔴 CRIMSON HAND — *Explosive burst, critical hits, click combos*

| Tier | Name | Cost | Effect |
|------|------|------|--------|
| T4 | Spore Burst | 2,000 | SPC ×2 |
| T5 | Overcharge | 6,000 | Every 10th click awards SPC ×5 instead |
| T6 | Critical Bloom | 15,000 | Crit chance 10% (crit = SPC ×10) |
| T7 | Frenzy State | 40,000 | 5 clicks in 2s triggers 5s of SPC ×3 |
| T8 | Explosive Release | 100,000 | Frenzy bursts add +50% SPS for 10s |

#### Branch Choice 2: INFERNO vs EMBER

```
      T8 (Explosive Release)
               ↓
    ┌─── BRANCH 2 ───┐
  INFERNO          EMBER
  Escalating     Sustained
  power spikes   burn gains
```

**🔴→ INFERNO** — *Bigger crits. Bigger frenzy. Everything louder.*

| Tier | Name | Cost | Effect |
|------|------|------|--------|
| T9  | Volcanic Touch   | 200,000     | Crit chance 20%, crit multiplier ×15 |
| T10 | Magma Core       | 600,000     | Frenzy duration extends to 10s |
| T11 | Pyroclastic Bloom | 2,000,000  | Every 25th click: +1s of total SPS instantly |
| T12 | Superheated Tip  | 6,000,000   | SPC ×3 |
| T13 | Caldera Release  | 20,000,000  | Frenzy multiplier ×5 |
| T14 | Magmatic Ascension | 60,000,000 | Frenzy SPS bonus applies permanently after first trigger |
| T15 | Pyrospore God    | 200,000,000 | SPC ×5 · crit chance 30% · crit multiplier ×20 |

**🔴→ EMBER** — *Each click feeds a slow, compounding fire.*

| Tier | Name | Cost | Effect |
|------|------|------|--------|
| T9  | Smoldering Touch  | 200,000    | Each click permanently grants +0.01 SPS |
| T10 | Ember Trails      | 600,000    | Click combos stack +0.5 SPC per click (resets after 3s idle) |
| T11 | Slow Burn         | 2,000,000  | Every 10s without clicking: gain 5s of SPS passively |
| T12 | Coal Bed          | 6,000,000  | SPC ×2 · Ember Trail stack cap ×2 |
| T13 | Sustained Heat    | 20,000,000 | Ember Trail never resets |
| T14 | Banked Embers     | 60,000,000 | Offline time on return grants click-power burst (1s per 10min offline) |
| T15 | Eternal Flame     | 200,000,000 | SPC = SPC + (total lifetime clicks × 0.0001) |

---

### 🔵 VOID TOUCH — *Efficiency, generator synergy, idle benefits*

| Tier | Name | Cost | Effect |
|------|------|------|--------|
| T4 | Resonant Tap      | 2,000  | SPC ×2 |
| T5 | Mycelial Echo     | 6,000  | Each click triggers +2% SPS for 5s (stacks to 10 times) |
| T6 | Void Attunement   | 15,000 | SPC +1 per unique generator type owned |
| T7 | Symbiotic Touch   | 40,000 | SPC ×0.1 per total generator count |
| T8 | Harmonic Pulse    | 100,000 | Every 20 clicks: all generators burst 3s output instantly |

#### Branch Choice 2: DEEP CURRENT vs SURFACE DRIFT

```
      T8 (Harmonic Pulse)
               ↓
    ┌─── BRANCH 2 ───┐
  DEEP CURRENT   SURFACE DRIFT
  Synergy with    Automation
  generator count  & idle
```

**🔵→ DEEP CURRENT** — *The more you've built, the stronger you click.*

| Tier | Name | Cost | Effect |
|------|------|------|--------|
| T9  | Neural Mycelium     | 200,000     | SPC ×(1 + 0.02 per total generator owned) |
| T10 | Root Network        | 600,000     | Harmonic Pulse triggers every 10 clicks |
| T11 | Subterranean Pulse  | 2,000,000   | Harmonic Pulse burst extended to 6s |
| T12 | Hive Resonance      | 6,000,000   | All generators +5% SPS while player clicked in last 30s |
| T13 | Collective Mind     | 20,000,000  | SPC + (total generators × 10) |
| T14 | Mycorrhizal Lattice | 60,000,000  | Generator hive bonus rises to +15% SPS |
| T15 | Void Communion      | 200,000,000 | SPC ×5 · all generators permanently ×1.2 SPS |

**🔵→ SURFACE DRIFT** — *Clicks happen whether you're there or not.*

| Tier | Name | Cost | Effect |
|------|------|------|--------|
| T9  | Phantom Clicks    | 200,000     | Auto-generates 1 phantom click per second |
| T10 | Spore Tide        | 600,000     | Phantom click rate: 3/s |
| T11 | Effortless Bloom  | 2,000,000   | Phantom clicks trigger Harmonic Pulse |
| T12 | Passive Current   | 6,000,000   | SPS +10% while no real click in last 60s |
| T13 | Dormant Power     | 20,000,000  | Offline gain cap raised from 8h → 24h |
| T14 | Void Sleep        | 60,000,000  | Offline gain rate ×3 |
| T15 | Tidal Supremacy   | 200,000,000 | Phantom clicks: 10/s · SPS ×1.5 while idle |

---

## Tree 1 — Mycelium Thread (Base C = 10)

*The first filaments. Upgrades focus on volume, reach, and thread density.*

### Shared Path

| Tier | Name | Cost | Effect | Flavour |
|------|------|------|--------|---------|
| T1 | Thicker Walls | 10 | Thread SPS ×2 | *A stronger strand carries more.* |
| T2 | Branching Growth | 30 | Thread SPS ×2 | *Two become four become thousands.* |
| T3 | Nutrient Channels | 100 | Thread SPS ×3 · threads boost SPC +0.1 each | *The network feeds the hand.* |

---

### Branch Choice: SCORCHED FILAMENT vs ENDLESS WEAVE

```
         T3 (Nutrient Channels)
                  ↓
     ┌──── BRANCH 1 ────┐
SCORCHED FILAMENT   ENDLESS WEAVE
Aggressive growth,  Patient expansion,
decay & regrowth    pure density gains
```

---

### 🔴 SCORCHED FILAMENT — *Burn fast, regenerate faster*

| Tier | Name | Cost | Effect |
|------|------|------|--------|
| T4 | Cauterised Tips  | 300   | Thread SPS ×2 |
| T5 | Rapid Regrowth   | 1,000 | When a thread "burns" (random 5s bonus): +200% SPS burst |
| T6 | Ash Fertiliser   | 3,000 | Thread SPS scales with total threads owned ×0.5% |
| T7 | Consuming Spread | 10,000 | Threads grant +1% SPS to all other generators |
| T8 | Firestarter      | 30,000 | Thread bonus to other generators rises to +3% |

#### Branch Choice 2: ASH NETWORK vs EMBER STRAND

**🔴→ ASH NETWORK** — *Threads sacrifice themselves for global power.*

| Tier | Name | Cost | Effect |
|------|------|------|--------|
| T9  | Cinder Lattice    | 100,000    | Thread SPS ×2 · ash bonus to others +5% |
| T10 | Smoulder Web      | 300,000    | Global SPS +0.5% per Thread owned |
| T11 | Consumed Network  | 1,000,000  | Every 10 Threads: all generators +1% SPS |
| T12 | Phoenix Mycelium  | 3,000,000  | Thread SPS triples after each burn burst |
| T13 | Scorched Earth    | 10,000,000 | Burn bursts trigger every 30s automatically |
| T14 | Pyroclastic Web   | 30,000,000 | Burn burst duration extends to 15s |
| T15 | Ash Singularity   | 100,000,000 | All generators ×1.5 SPS · Threads ×5 SPS |

**🔴→ EMBER STRAND** — *Individual threads grow stronger with age.*

| Tier | Name | Cost | Effect |
|------|------|------|--------|
| T9  | Tempered Thread   | 100,000    | Thread SPS ×3 |
| T10 | Heat Soak         | 300,000    | Each Thread grants +0.2 SPC |
| T11 | Glowing Filament  | 1,000,000  | Thread SPS gains ×0.1% per second played (soft cap 500%) |
| T12 | Fused Core        | 3,000,000  | Thread SPS ×2 |
| T13 | Living Ember      | 10,000,000 | Thread aging bonus uncapped |
| T14 | Incandescent Web  | 30,000,000 | Thread SPS added to SPC directly |
| T15 | Eternal Thread    | 100,000,000 | Thread SPS ×10 · contributes ×2 to SPC |

---

### 🔵 ENDLESS WEAVE — *Slow, patient, exponential density*

| Tier | Name | Cost | Effect |
|------|------|------|--------|
| T4 | Dense Packing     | 300   | Thread SPS ×2 |
| T5 | Interlocking Mesh | 1,000 | Each Thread owned after 10: +1% SPS per Thread |
| T6 | Underground Layer | 3,000 | Thread SPS ×2 · unlocks basement layer (visual) |
| T7 | Depth Pressure    | 10,000 | Thread SPS scales with Hyphal Networks owned ×2% |
| T8 | Mycelial Fabric   | 30,000 | Thread count ×2 (doubles all Thread SPS contributions) |

#### Branch Choice 2: DEEP LATTICE vs REACTIVE WEB

**🔵→ DEEP LATTICE** — *Goes deeper. Produces more. Never stops.*

| Tier | Name | Cost | Effect |
|------|------|------|--------|
| T9  | Bedrock Reach     | 100,000    | Thread SPS ×3 |
| T10 | Tectonic Threads  | 300,000    | Thread SPS +1% per Spore Cluster owned |
| T11 | Subduction Zone   | 1,000,000  | Thread SPS ×2 |
| T12 | Mantle Tap        | 3,000,000  | Threads passively produce while game is closed at 150% rate |
| T13 | Core Weave        | 10,000,000 | Thread SPS ×3 |
| T14 | Planetary Network | 30,000,000 | Threads grant +0.01% SPS to every other generator per Thread owned |
| T15 | World Mycelium    | 100,000,000 | Thread SPS ×5 · offline cap raised 2h for this generator |

**🔵→ REACTIVE WEB** — *Responds to player behaviour. The web watches.*

| Tier | Name | Cost | Effect |
|------|------|------|--------|
| T9  | Nerve Filament    | 100,000    | Thread SPS +5% per manual click in last 10s |
| T10 | Signal Threads    | 300,000    | Thread SPS ×2 while player is active |
| T11 | Feedback Loop     | 1,000,000  | Clicking boosts Thread SPS by +0.1% permanently |
| T12 | Stimulus Web      | 3,000,000  | Active bonus rises to +20% Thread SPS |
| T13 | Adaptive Mesh     | 10,000,000 | Thread bonus adapts: +1% SPS per upgrade purchased (any tree) |
| T14 | Sentient Strand   | 30,000,000 | Thread SPS ×3 · reactive bonus uncapped |
| T15 | Awakened Web      | 100,000,000 | Thread SPS ×5 · all player actions trigger a Thread burst |

---

## Tree 2 — Spore Cluster (Base C = 100)

*A node of dense reproductive mass. Upgrades focus on output density, clustering bonuses, and propagation range.*

### Shared Path

| Tier | Name | Cost | Effect | Flavour |
|------|------|------|--------|---------|
| T1 | Cluster Density   | 100  | Cluster SPS ×2 | *Pack them tighter.* |
| T2 | Pressure Release  | 300  | Cluster SPS ×2 · burst every 60s (+5s SPS) | *What's compressed must eventually explode.* |
| T3 | Reproductive Node | 1,000 | Cluster SPS ×2 · clusters reduce Thread cost by 1% each | *The cluster feeds the thread.* |

---

### Branch Choice: EXPLOSIVE CLUSTER vs DENSE COLONY

```
         T3 (Reproductive Node)
                  ↓
     ┌──── BRANCH 1 ────┐
EXPLOSIVE CLUSTER    DENSE COLONY
Burst output,        Compounding density,
boom cycles          passive mass production
```

---

### 🔴 EXPLOSIVE CLUSTER — *Controlled detonations produce spore cascades*

| Tier | Name | Cost | Effect |
|------|------|------|--------|
| T4 | Pressurised Sac   | 3,000  | Cluster SPS ×2 · burst timer: 45s |
| T5 | Shrapnel Bloom    | 10,000 | Burst awards ×10 SPS instead of ×5 |
| T6 | Chain Reaction    | 30,000 | Bursts from one Cluster can cascade to adjacent (random +50% chance) |
| T7 | Detonation Field  | 100,000 | Owning 10+ Clusters: burst SPS multiplier ×2 |
| T8 | Critical Mass     | 300,000 | Burst triggers automatically when spores hit a multiple of 1M |

#### Branch Choice 2: DETONATION FIELD vs SHRAPNEL BURST

**🔴→ DETONATION FIELD** — *Explosions get bigger. Radius grows. Everything suffers.*

| Tier | Name | Cost | Effect |
|------|------|------|--------|
| T9  | Blast Radius      | 1,000,000  | Burst SPS multiplier ×3 |
| T10 | Pressure Wave     | 3,000,000  | Bursts add +1% SPS to all generators for 30s |
| T11 | Concussive Growth | 10,000,000 | Burst timer reduced to 20s |
| T12 | Shockwave Core    | 30,000,000 | Global burst SPS bonus stacks (up to 20× per generator) |
| T13 | Detonation Cascade | 100,000,000 | Bursts chain 100% between clusters |
| T14 | Nuclear Node      | 300,000,000 | Burst multiplier ×5 · affects SPC too |
| T15 | Singularity Burst | 1,000,000,000 | One burst per 60s produces 60s of all-generator SPS at once |

**🔴→ SHRAPNEL BURST** — *Each explosion scatters seeds that grow their own producers.*

| Tier | Name | Cost | Effect |
|------|------|------|--------|
| T9  | Seed Scatter      | 1,000,000  | Each burst spawns +0.5 virtual Thread SPS (permanent) |
| T10 | Pellet Cloud      | 3,000,000  | Shrapnel seeds scale with total Clusters owned |
| T11 | Growth Shards     | 10,000,000 | Shrapnel seeds also affect Hyphal Network SPS |
| T12 | Propagation Storm | 30,000,000 | Each burst permanently increases all-generator SPS by 0.01% |
| T13 | Hyper Scatter     | 100,000,000 | Permanent SPS bonus from bursts ×5 per burst |
| T14 | Spore Artillery   | 300,000,000 | Burst permanent bonus affects offline production |
| T15 | Living Shrapnel   | 1,000,000,000 | Accumulated burst bonuses doubled retroactively |

---

### 🔵 DENSE COLONY — *Mass, patience, compounding returns*

| Tier | Name | Cost | Effect |
|------|------|------|--------|
| T4 | Colony Core       | 3,000  | Cluster SPS ×2 |
| T5 | Biomass Buildup   | 10,000 | Each Cluster after the 5th: +2% Cluster SPS per Cluster |
| T6 | Nutrient Pooling  | 30,000 | Cluster SPS ×2 · Clusters reduce Spore Cluster cost by 2% each |
| T7 | Supercolony Seed  | 100,000 | Owning 20+ Clusters: global SPS +5% |
| T8 | Mass Accumulation | 300,000 | Cluster SPS scales with total spores earned (×0.001% per 1M) |

#### Branch Choice 2: SUPERCOLONY vs SPORE BANK

**🔵→ SUPERCOLONY** — *Size begets size. The colony cannot stop growing.*

| Tier | Name | Cost | Effect |
|------|------|------|--------|
| T9  | Colonial Reach    | 1,000,000  | Cluster SPS ×2 · supercolony threshold drops to 10 |
| T10 | Distributed Mass  | 3,000,000  | Every 5 Clusters: +1% to all generators |
| T11 | Hive Architecture | 10,000,000 | Cluster SPS ×3 |
| T12 | Macroorganism     | 30,000,000 | Cluster count effectively ×1.5 for SPS calculations |
| T13 | Planetary Colony  | 100,000,000 | Cluster SPS ×2 · global generator bonus ×2 |
| T14 | Gestalt Bloom     | 300,000,000 | All generator costs reduced 10% per 50 Clusters owned |
| T15 | Living Continent  | 1,000,000,000 | Cluster SPS ×10 · all generators +25% SPS |

**🔵→ SPORE BANK** — *Store output, release it amplified.*

| Tier | Name | Cost | Effect |
|------|------|------|--------|
| T9  | Reserve Pool      | 1,000,000  | Idle SPS banks up to 60s of production, releases on click |
| T10 | Interest Growth   | 3,000,000  | Banked spores grow at +1% per 10s |
| T11 | Compound Reserve  | 10,000,000 | Bank cap raises to 5 minutes |
| T12 | Withdrawal Surge  | 30,000,000 | Release triggers ×2 multiplier on banked total |
| T13 | Overflow Protocol | 100,000,000 | When bank is full: excess converts to permanent SPS bonus |
| T14 | Infinite Ledger   | 300,000,000 | Bank cap: 30 minutes |
| T15 | The Great Reserve | 1,000,000,000 | Bank cap: unlimited · release always ×3 |

---

## Tree 3 — Hyphal Network (Base C = 1,100)

*Underground nerve web. Upgrades focus on connectivity, efficiency, and cross-generator synergies.*

### Shared Path

| Tier | Name | Cost | Effect | Flavour |
|------|------|------|--------|---------|
| T1 | Signal Boost      | 1,100  | Network SPS ×2 | *A clearer channel.* |
| T2 | Redundant Paths   | 3,300  | Network SPS ×2 · Networks reduce Thread/Cluster cost 1% each | *Backup routes never sleep.* |
| T3 | Mycorrhizal Link  | 11,000 | Network SPS ×2 · all generators +3% SPS per Network owned | *Everything connects.* |

---

### Branch Choice: PARASITIC NETWORK vs SYMBIOTIC NETWORK

```
        T3 (Mycorrhizal Link)
                  ↓
     ┌──── BRANCH 1 ────┐
PARASITIC NETWORK   SYMBIOTIC NETWORK
Drains and converts  Amplifies and shares
other generators     between generators
```

---

### 🔴 PARASITIC NETWORK — *Take from others. Make it your own.*

| Tier | Name | Cost | Effect |
|------|------|------|--------|
| T4 | Tap Root         | 33,000  | Network SPS ×2 |
| T5 | Resource Drain   | 110,000 | Network converts 2% of all other generators' SPS into bonus Network SPS |
| T6 | Host Compromise  | 330,000 | Drain rises to 5% |
| T7 | Necrotic Spread  | 1,100,000 | Drained SPS bonus ×2 |
| T8 | Total Parasite   | 3,300,000 | Network SPS includes 10% of all other generators' raw SPS |

#### Branch Choice 2: MIND CORRUPTION vs RESOURCE DRAIN

**🔴→ MIND CORRUPTION** — *The network doesn't just take resources — it takes control.*

| Tier | Name | Cost | Effect |
|------|------|------|--------|
| T9  | Neural Override   | 11,000,000  | Networks control 1% of each generator's SPS |
| T10 | Compulsion Signal | 33,000,000  | Controlled generators produce 110% |
| T11 | Puppeteer Hyphae  | 110,000,000 | Control % rises to 3% per Network |
| T12 | Subconscious Tap  | 330,000,000 | Controlled output counts double toward milestones |
| T13 | Total Influence   | 1,100,000,000 | All generators produce +20% (the Network commands it) |
| T14 | Hive Override     | 3,300,000,000 | Controlled % uncapped · generator costs -15% |
| T15 | Unified Parasite  | 11,000,000,000 | All generators are extensions of the Network: SPS unified ×1.5 |

**🔴→ RESOURCE DRAIN** — *Pure extraction. Cold, efficient, total.*

| Tier | Name | Cost | Effect |
|------|------|------|--------|
| T9  | Efficient Tap     | 11,000,000  | Drain % rises to 15% |
| T10 | Pipeline          | 33,000,000  | Network SPS ×2 |
| T11 | Total Extraction  | 110,000,000 | Drain applies to offline production too |
| T12 | Pressure Siphon   | 330,000,000 | Drain ×2, other generators unaffected (pure bonus) |
| T13 | Void Pipeline     | 1,100,000,000 | Drain now includes future generators (pre-extracts cost) |
| T14 | Maximum Harvest   | 3,300,000,000 | Drain ×4 |
| T15 | The Great Drain   | 11,000,000,000 | Network SPS = Network SPS + 25% of all other generators total SPS |

---

### 🔵 SYMBIOTIC NETWORK — *Share, amplify, grow together*

| Tier | Name | Cost | Effect |
|------|------|------|--------|
| T4 | Mutualism         | 33,000  | Network SPS ×2 · each other generator type adds 2% Network SPS |
| T5 | Shared Pathways   | 110,000 | All generators +2% SPS per Network owned |
| T6 | Feedback Loop     | 330,000 | Networks get +1% SPS for every upgrade purchased across all trees |
| T7 | Symbiotic Core    | 1,100,000 | All-generator bonus rises to +4% per Network |
| T8 | Harmonic Web      | 3,300,000 | Networks multiply all shared bonuses by 1.5× |

#### Branch Choice 2: MUTUALISM vs MYCORRHIZAL HARMONY

**🔵→ MUTUALISM** — *Every generator becomes more than the sum of its parts.*

| Tier | Name | Cost | Effect |
|------|------|------|--------|
| T9  | Co-Dependence     | 11,000,000  | Each unique generator type owned: +5% to all SPS |
| T10 | Cross-Pollination | 33,000,000  | Highest SPS generator boosts all others by 10% of its SPS |
| T11 | Intertwined Roots | 110,000,000 | Owning 5 of every generator: global SPS ×1.5 |
| T12 | Living Matrix     | 330,000,000 | Each new generator purchase triggers a 5s burst across all |
| T13 | Biome Cohesion    | 1,100,000,000 | All generators SPS ×1.2 per upgrade tier completed anywhere |
| T14 | Apex Symbiosis    | 3,300,000,000 | Generator count thresholds (10, 25, 50) each unlock +10% global SPS |
| T15 | Mutualistic God   | 11,000,000,000 | All generators ×2 SPS · cost of all buildings -20% |

**🔵→ MYCORRHIZAL HARMONY** — *Balance everything. Lose nothing.*

| Tier | Name | Cost | Effect |
|------|------|------|--------|
| T9  | Equalisation      | 11,000,000  | Weakest generator gets +50% SPS (auto-detects) |
| T10 | Even Growth       | 33,000,000  | If all generators within 20% count of each other: global +10% SPS |
| T11 | Perfect Ratio     | 110,000,000 | Perfect balance bonus rises to +25% SPS |
| T12 | Harmonic Dividend | 330,000,000 | All generators produce 110% at all times (harmony overflow) |
| T13 | Resonant Peace    | 1,100,000,000 | Balance check loosens to 50% · bonus uncapped |
| T14 | Unified Growth    | 3,300,000,000 | Buying any generator boosts all others by 1% (permanent) |
| T15 | The Harmony       | 11,000,000,000 | Global SPS ×3 if all 6 generators have completed their T3 shared path |

---

## Tree 4 — Sporulating Body (Base C = 12,000)

*House-sized fruiting body. Upgrades focus on sheer output, scale, and lifecycle acceleration.*

### Shared Path

| Tier | Name | Cost | Effect | Flavour |
|------|------|------|--------|---------|
| T1 | Enlarged Gills     | 12,000  | Body SPS ×2 | *More surface area. More everything.* |
| T2 | Rapid Fruiting     | 36,000  | Body SPS ×2 · Body SPS scales +1% per Cluster owned | *It doesn't wait for seasons.* |
| T3 | Titan Canopy       | 120,000 | Body SPS ×3 · reduces Cluster/Network cost by 2% per Body | *Shadow falls over the valley.* |

---

### Branch Choice: AGGRESSIVE FRUITING vs SLOW GROWTH

```
           T3 (Titan Canopy)
                  ↓
     ┌──── BRANCH 1 ────┐
AGGRESSIVE FRUITING   SLOW GROWTH
Fast cycles, decay,   Ancient mass,
toxic output          unstoppable output
```

---

### 🔴 AGGRESSIVE FRUITING — *Fast growth. Faster death. Infinite replacement.*

| Tier | Name | Cost | Effect |
|------|------|------|--------|
| T4 | Toxic Bloom      | 360,000   | Body SPS ×2 · produces a toxic field: nearby generators +5% SPS |
| T5 | Rapid Decay Cycle | 1,200,000 | Bodies "die" every 90s triggering a SPS ×5 burst, then respawn |
| T6 | Accelerated Growth | 3,600,000 | Decay cycle triggers every 60s |
| T7 | Spore Overload   | 12,000,000 | Burst on decay: ×8 SPS |
| T8 | Necromycorrhiza  | 36,000,000 | Dead bodies leave permanent +1% SPS residue (stacks indefinitely) |

#### Branch Choice 2: RAPID DECAY CYCLE vs TOXIC BLOOM

**🔴→ RAPID DECAY CYCLE** — *Die constantly. The numbers go up regardless.*

| Tier | Name | Cost | Effect |
|------|------|------|--------|
| T9  | Hyper Cycle      | 120,000,000  | Decay cycle: 30s |
| T10 | Death Harvest    | 360,000,000  | Decay burst: ×15 SPS |
| T11 | Corpse Factory   | 1,200,000,000 | Residue from decay stacks faster (×3 per cycle) |
| T12 | Instant Regrowth | 3,600,000,000 | Decay and respawn are instant: continuous burst |
| T13 | Death Loop       | 12,000,000,000 | Burst now applies to all generators |
| T14 | Thanatopic Growth | 36,000,000,000 | Decay SPS burst ×20 |
| T15 | Eternal Rot      | 120,000,000,000 | Body SPS ×10 · decay burst fires every 10s |

**🔴→ TOXIC BLOOM** — *Poisons the world. The world produces anyway.*

| Tier | Name | Cost | Effect |
|------|------|------|--------|
| T9  | Myco Venom       | 120,000,000  | Toxic field bonus: +10% to all generators |
| T10 | Spore Toxin      | 360,000,000  | Toxin field radius grows: +15% |
| T11 | Neurological Bloom | 1,200,000,000 | Toxic field boosts SPC by +5 per Body owned |
| T12 | Lethal Canopy    | 3,600,000,000 | Body SPS ×3 · toxic bonus stacks per Body |
| T13 | Systemic Poison  | 12,000,000,000 | Toxic bonus: +25% all generators |
| T14 | Pandemic Bloom   | 36,000,000,000 | Toxin field effect applies globally (not proximity) |
| T15 | World Toxin      | 120,000,000,000 | All generators ×2 SPS · SPC ×3 (toxin in the air) |

---

### 🔵 SLOW GROWTH — *Ancient. Immovable. Inevitable.*

| Tier | Name | Cost | Effect |
|------|------|------|--------|
| T4 | Ancient Spore     | 360,000   | Body SPS ×2 · bodies produce 105% of SPS offline |
| T5 | Old Growth        | 1,200,000  | SPS scales with total time played (×0.001% per minute, soft cap 300%) |
| T6 | Geological Pace   | 3,600,000  | Offline production cap for this generator: unlimited |
| T7 | Primordial Mass   | 12,000,000 | Body SPS ×3 |
| T8 | Living Mountain   | 36,000,000 | Bodies generate a permanent SPS accumulator: +0.001% SPS per tick |

#### Branch Choice 2: TITAN BODY vs ANCIENT SPORE

**🔵→ TITAN BODY** — *It grows. It does not stop.*

| Tier | Name | Cost | Effect |
|------|------|------|--------|
| T9  | Colossal Scale   | 120,000,000  | Body SPS ×3 · accumulator rate ×3 |
| T10 | Weight of Ages   | 360,000,000  | Body SPS scales with total buildings owned ×0.1% |
| T11 | Tectonic Form    | 1,200,000,000 | Body SPS ×2 · all generator costs -5% per Body owned |
| T12 | Immovable Mass   | 3,600,000,000 | SPS accumulator uncapped |
| T13 | Godform          | 12,000,000,000 | Body SPS ×5 |
| T14 | Atlas Body       | 36,000,000,000 | Carrying the weight of all SPS: global ×1.5 |
| T15 | The Titan        | 120,000,000,000 | Body SPS ×10 · time played bonus ×3 · all generators +10% |

**🔵→ ANCIENT SPORE** — *Spores from before memory. Their reach is different.*

| Tier | Name | Cost | Effect |
|------|------|------|--------|
| T9  | Primordial Release | 120,000,000  | Ancient spores boost all generators +5% SPS |
| T10 | Ancestral Memory  | 360,000,000  | Each milestone seen: +1% all generator SPS |
| T11 | Living History    | 1,200,000,000 | Milestone bonus ×3 |
| T12 | Geological Time   | 3,600,000,000 | Body SPS ×3 · ancient bonus applies to offline production |
| T13 | Pre-Cambrian Core | 12,000,000,000 | All generators +20% SPS |
| T14 | Deep Time         | 36,000,000,000 | Milestone bonus uncapped |
| T15 | Origin Spore      | 120,000,000,000 | All generators ×2 · offline gain: 48h cap · SPC ×5 |

---

## Tree 5 — Stellar Bloom (Base C = 130,000)

*Spores in the solar wind. Upgrades focus on scale, cosmic reach, and time-bending production.*

### Shared Path

| Tier | Name | Cost | Effect | Flavour |
|------|------|------|--------|---------|
| T1 | Solar Sails      | 130,000   | Bloom SPS ×2 | *Carried by light itself.* |
| T2 | Nebula Spread    | 390,000   | Bloom SPS ×2 · Blooms reduce Sporulating Body cost 1% each | *The void is fertile.* |
| T3 | Heliosphere Gate | 1,300,000 | Bloom SPS ×3 · all generators +1% SPS per Bloom owned | *A boundary crossed.* |

---

### Branch Choice: SOLAR FLARE vs DARK MATTER DRIFT

```
          T3 (Heliosphere Gate)
                    ↓
      ┌───── BRANCH 1 ─────┐
   SOLAR FLARE        DARK MATTER DRIFT
  Violent eruptions,   Invisible, patient,
  spike production     compounding mass
```

---

### 🔴 SOLAR FLARE — *Eruption events. Massive short-term output.*

| Tier | Name | Cost | Effect |
|------|------|------|--------|
| T4 | Coronal Burst     | 3,900,000  | Bloom SPS ×2 · eruption event every 120s (×8 SPS for 10s) |
| T5 | Magnetic Surge    | 13,000,000 | Eruption multiplier rises to ×12 |
| T6 | Proton Storm      | 39,000,000 | Eruptions boost all generators +10% SPS for 30s |
| T7 | Chromospheric Arc | 130,000,000 | Eruption triggers every 60s |
| T8 | Gamma Burst       | 390,000,000 | Eruption applies globally, affects SPC ×5 during event |

#### Branch Choice 2: SUPERNOVA SEED vs GAMMA BURST

**🔴→ SUPERNOVA SEED** — *The star dies. Something new is born from the wreckage.*

| Tier | Name | Cost | Effect |
|------|------|------|--------|
| T9  | Stellar Collapse   | 1,300,000,000  | On every 10th eruption: +permanent 0.1% all-generator SPS |
| T10 | Neutron Core       | 3,900,000,000  | Permanent bonus ×3 per supernova |
| T11 | Supernova Wave     | 13,000,000,000 | Supernova every 5th eruption |
| T12 | Remnant Cloud      | 39,000,000,000 | Remnant of each supernova grants new Bloom equivalent SPS |
| T13 | Pulsar Phase       | 130,000,000,000 | Between eruptions: steady +25% SPS (pulsar baseline) |
| T14 | Quasar Core        | 390,000,000,000 | Supernova applies ×10 global SPS burst |
| T15 | Big Bang Spore     | 1,300,000,000,000 | Bloom SPS ×10 · supernova fires every eruption · global SPS ×2 |

**🔴→ GAMMA BURST** — *Pure radiation. Sustained bombardment.*

| Tier | Name | Cost | Effect |
|------|------|------|--------|
| T9  | Radiation Field    | 1,300,000,000  | Eruptions permanently irradiate generators: +0.05% SPS each |
| T10 | Ionising Bloom     | 3,900,000,000  | Irradiation stacks ×2 per eruption |
| T11 | Particle Rain      | 13,000,000,000 | Irradiation applies to offline production |
| T12 | Hard Radiation     | 39,000,000,000 | Bloom SPS ×3 · irradiation cap removed |
| T13 | Cosmic Rays        | 130,000,000,000 | SPC permanently increases with each eruption (+100 per event) |
| T14 | Lethal Flux        | 390,000,000,000 | Eruption bonus duration: 120s |
| T15 | Solar God Bloom    | 1,300,000,000,000 | Bloom SPS ×10 · eruption multiplier ×20 · SPC ×10 during events |

---

### 🔵 DARK MATTER DRIFT — *Invisible mass. Patient, invisible, immense.*

| Tier | Name | Cost | Effect |
|------|------|------|--------|
| T4 | Dark Halo        | 3,900,000  | Bloom SPS ×2 |
| T5 | Invisible Spread | 13,000,000 | Blooms produce 20% additional SPS that doesn't display (hidden accumulator) |
| T6 | Gravitational Lure | 39,000,000 | Hidden accumulator releases every 5 minutes as a surge |
| T7 | Dark Web         | 130,000,000 | Accumulator release ×3 |
| T8 | Void Garden      | 390,000,000 | Hidden accumulator grows at 2× rate · release triggers every 3 minutes |

#### Branch Choice 2: BLACK HOLE GARDEN vs VOID BLOOM

**🔵→ BLACK HOLE GARDEN** — *Everything falls in. Nothing escapes unchanged.*

| Tier | Name | Cost | Effect |
|------|------|------|--------|
| T9  | Event Horizon     | 1,300,000,000  | Accumulator releases pull +10% from all other generators |
| T10 | Tidal Force       | 3,900,000,000  | Bloom SPS ×3 · pull rises to 20% |
| T11 | Spaghettification | 13,000,000,000 | Generator output stretched: each release = 2× actual accumulated |
| T12 | Hawking Radiation | 39,000,000,000 | Black hole leaks constant +5% to all generators |
| T13 | Graviton Web      | 130,000,000,000 | Pull applies to offline accumulated production |
| T14 | Singularity Garden | 390,000,000,000 | All SPS pulls toward Blooms ×2 — Bloom SPS becomes universal multiplier |
| T15 | The Great Attractor | 1,300,000,000,000 | Bloom SPS ×10 · all generators passively contribute 10% to Bloom SPS |

**🔵→ VOID BLOOM** — *Grows in nothing. Needs nothing.*

| Tier | Name | Cost | Effect |
|------|------|------|--------|
| T9  | Null Substrate    | 1,300,000,000  | Bloom SPS +50% when no click in 120s |
| T10 | Absence Harvest   | 3,900,000,000  | Void bonus rises to +100% |
| T11 | Silence Resonance | 13,000,000,000 | Void bloom SPS multiplies offline rate ×3 for this generator |
| T12 | Dark Patience     | 39,000,000,000 | Void bonus applies to all generators during idle |
| T13 | The Quiet Empire  | 130,000,000,000 | All-generator idle bonus: +30% SPS |
| T14 | Absolute Void     | 390,000,000,000 | Offline cap: 72h · offline rate ×5 |
| T15 | Void Ascendant    | 1,300,000,000,000 | Bloom SPS ×10 · idle bonus ×3 · offline production uncapped |

---

## Tree 6 — Cosmic Spore (Base C = 1,400,000)

*A galaxy-spanning entity. Upgrades bend time, space, and the laws of production itself.*

### Shared Path

| Tier | Name | Cost | Effect | Flavour |
|------|------|------|--------|---------|
| T1 | Galactic Dispersal  | 1,400,000  | Cosmic SPS ×2 | *A spore the size of a moon.* |
| T2 | Dimensional Seeding | 4,200,000  | Cosmic SPS ×2 · Cosmic Spores reduce Stellar Bloom cost 2% each | *Other realities. Other soils.* |
| T3 | Universal Substrate | 14,000,000 | Cosmic SPS ×3 · all generators +2% SPS per Cosmic Spore owned | *The universe itself becomes fertile.* |

---

### Branch Choice: UNIVERSAL INFECTION vs GALACTIC PATIENCE

```
        T3 (Universal Substrate)
                  ↓
     ┌──── BRANCH 1 ────┐
UNIVERSAL INFECTION   GALACTIC PATIENCE
Aggressive universal   Slow, inevitable,
spread & corruption    total domination
```

---

### 🔴 UNIVERSAL INFECTION — *Spread. Consume. Repeat. Forever.*

| Tier | Name | Cost | Effect |
|------|------|------|--------|
| T4 | Dimensional Breach | 42,000,000  | Cosmic SPS ×2 · infects other game tabs (cosmetic + +5% SPS) |
| T5 | Reality Seepage    | 140,000,000 | Cosmic SPS ×2 · all-generator bonus +3% per Cosmic Spore |
| T6 | Planar Corruption  | 420,000,000 | Corruption field: every 60s, random generator gets ×3 SPS for 20s |
| T7 | Infectious Bloom   | 1,400,000,000 | Corruption field affects all generators simultaneously |
| T8 | Omni-Infection     | 4,200,000,000 | Infection event fires every 30s · duration 30s |

#### Branch Choice 2: DIMENSIONAL BREACH vs REALITY CORRUPTION

**🔴→ DIMENSIONAL BREACH** — *Other dimensions. Other farms.*

| Tier | Name | Cost | Effect |
|------|------|------|--------|
| T9  | Parallel Mycelium  | 14,000,000,000  | Shadow dimension produces 10% of all current SPS as bonus |
| T10 | Dimensional Tap    | 42,000,000,000  | Shadow SPS rises to 25% |
| T11 | Rift Harvest       | 140,000,000,000 | Rifts open randomly: 10s of ×5 SPS |
| T12 | Multiverse Web     | 420,000,000,000 | Each dimension visited doubles shadow SPS (up to ×8) |
| T13 | Reality Overlap    | 1,400,000,000,000 | Breach bonus applies to offline production |
| T14 | Dimensional Flood  | 4,200,000,000,000 | Shadow SPS = 50% of all SPS |
| T15 | Omniversal Spore   | 14,000,000,000,000 | Shadow SPS = 100% of all SPS (effectively doubles everything) |

**🔴→ REALITY CORRUPTION** — *The rules of physics are negotiable.*

| Tier | Name | Cost | Effect |
|------|------|------|--------|
| T9  | Physics Glitch     | 14,000,000,000  | Random generator produces ×10 SPS for 5s once per minute |
| T10 | Law Erosion        | 42,000,000,000  | ×10 event applies to all generators |
| T11 | Causality Break    | 140,000,000,000 | Events fire every 30s |
| T12 | Reality Unravel    | 420,000,000,000 | Cosmic SPS ×5 · corruption event ×20 SPS |
| T13 | Entropy Override   | 1,400,000,000,000 | All generators ignore their cost for the next purchase (once per 10 min) |
| T14 | Thermodynamic Lie  | 4,200,000,000,000 | SPS increases retroactively: every purchase ever made grants +0.01% global SPS |
| T15 | The Broken Law     | 14,000,000,000,000 | Cosmic SPS ×10 · global SPS ×3 · all costs -25% |

---

### 🔵 GALACTIC PATIENCE — *It does not hurry. It wins anyway.*

| Tier | Name | Cost | Effect |
|------|------|------|--------|
| T4 | Interstellar Drift   | 42,000,000  | Cosmic SPS ×2 · offline rate ×1.5 |
| T5 | Cosmic Accumulation  | 140,000,000 | Cosmic SPS scales with total spores ever earned ×0.0001% |
| T6 | Deep Time Harvest    | 420,000,000 | Offline cap: 48h |
| T7 | Universal Patience   | 1,400,000,000 | Cosmic SPS ×2 · idle bonus ×2 (all generators) |
| T8 | Entropy Garden       | 4,200,000,000 | Cosmic SPS accumulates separately at ×1.5 rate offline |

#### Branch Choice 2: ENTROPY GARDEN vs HEAT DEATH BLOOM

**🔵→ ENTROPY GARDEN** — *Tends the inevitable decline. Profits from it.*

| Tier | Name | Cost | Effect |
|------|------|------|--------|
| T9  | Thermodynamic Farm | 14,000,000,000  | Entropy SPS: gains +0.01% per minute played (no cap) |
| T10 | Heat Sink          | 42,000,000,000  | Entropy rate ×3 |
| T11 | Disorder Harvest   | 140,000,000,000 | Entropy bonus applies to all generators |
| T12 | Cosmic Rot         | 420,000,000,000 | Cosmic SPS ×3 · entropy accelerates ×5 |
| T13 | Second Law Triumph | 1,400,000,000,000 | Entropy farm produces retroactively: rewards hours of previous play |
| T14 | Absolute Zero Farm | 4,200,000,000,000 | Entropy bonus uncapped and applies offline |
| T15 | Heat Death Lord    | 14,000,000,000,000 | Cosmic SPS ×10 · entropy rate ×10 · offline = online production rate |

**🔵→ HEAT DEATH BLOOM** — *At the end of all things, only spores remain.*

| Tier | Name | Cost | Effect |
|------|------|------|--------|
| T9  | Final Epoch        | 14,000,000,000  | Cosmic SPS ×3 · end-state bonus when all 6 generator trees hit T9 |
| T10 | Universal Winter   | 42,000,000,000  | End-state bonus: +50% all SPS |
| T11 | Last Warmth        | 140,000,000,000 | SPS scales with total milestones seen ×5% each |
| T12 | Cold Light         | 420,000,000,000 | Cosmic SPS ×2 · milestone scaling ×3 |
| T13 | The Final Bloom    | 1,400,000,000,000 | Completing this tree grants a cosmetic: universe goes dark except your spores |
| T14 | Remnant God        | 4,200,000,000,000 | All generators produce at full rate offline forever |
| T15 | After Everything   | 14,000,000,000,000 | Global SPS ×5 · SPC ×10 · you have outlasted the universe |

---

## UI Treatment: Branch State Rendering

| State | Visual |
|-------|--------|
| Locked (prerequisite not met) | Dimmed card, blurred name, padlock icon, no cost shown |
| Available to unlock | Spore Glow border pulse, cost visible, COMMIT button active |
| Chosen path | Full colour, purchased tiers checkmarked, remaining tiers visible |
| Rejected path | Collapsed to tombstone card, lock icon, greyed out entirely |
| Tier purchased | Checkmark badge, tier slot darkens, next tier highlights |
| Tier affordable | Spore Glow shimmer sweep animation on card |
| Tier unaffordable | Muted red cost display, no shimmer |
| Branch choice active | Side-by-side choice cards expand with animation, blocking further interaction until chosen |

---

## Implementation Notes

- Branch choices are stored in save state as `"branch1": "red" | "blue"` and `"branch2": "A" | "B"` per generator key.
- Upgrade effect functions are defined in a lookup table indexed by `generatorKey.tier` — no switch/case chains.
- All multipliers are applied in a single `computeMultipliers()` pass each tick to avoid order-of-operations bugs.
- Tier costs use the formula table above; no individual cost storage needed (computed from generator base cost × tier multiplier).
- Total upgrade count across all 7 trees: **7 trees × 15 tiers = 105 upgrades**, but only one of 4 terminal paths is ever active per tree (28 possible terminal paths, 7 actually reached per playthrough).