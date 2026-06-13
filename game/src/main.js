'use strict';

const SAVE_KEY = 'sporeLord_save';
const SAVE_VERSION = 2;
const TICK_MS = 100;
const SAVE_INTERVAL_MS = 30000;
const BASE_OFFLINE_CAP_SECONDS = 8 * 3600;
const LOG_MAX = 20;
const COST_GROWTH = 1.15;
const MAX_COST_REDUCTION = 0.9;
const HOLD_AUTO_CLICK_INTERVAL_MS = 500;

const GENERATORS = [
  { id: 'myceliumThread',  name: 'Mycelium Thread',  baseCost: 10,        baseSPS: 0.1,
    flavour: 'Thin strands stretching through soil.' },
  { id: 'sporeCluster',    name: 'Spore Cluster',    baseCost: 100,       baseSPS: 0.5,
    flavour: 'A dense node of reproductive mass.' },
  { id: 'hyphalNetwork',   name: 'Hyphal Network',   baseCost: 1100,      baseSPS: 4,
    flavour: 'Underground web of fungal nerves.' },
  { id: 'sporulatingBody', name: 'Sporulating Body', baseCost: 12000,     baseSPS: 30,
    flavour: 'A fruiting body the size of a house.' },
  { id: 'stellarBloom',    name: 'Stellar Bloom',    baseCost: 130000,    baseSPS: 200,
    flavour: 'Spores seeded across solar winds.' },
  { id: 'cosmicSpore',     name: 'Cosmic Spore',     baseCost: 1400000,   baseSPS: 1500,
    flavour: 'A galaxy-spanning fungal entity.' },
];

const GEN_IDS = GENERATORS.map(g => g.id);
const GEN_COST_MULT = [1, 3, 10, 30, 100, 300, 1000, 3000, 10000, 30000, 100000, 300000, 1000000, 3000000, 10000000];

// ─── Effect helpers ─────────────────────────────────────────────────
//
// Each tier defines an apply(m, s) that mutates a multipliers bag.
// The bag is rebuilt every tick from scratch (per spec §implementation).

function emptyMults() {
  const m = {
    spcMul: 1,
    spcAdd: 0,
    globalMul: 1,
    genMul: {},
    genAddPct: {},          // additive % bonus per generator (fraction)
    genFlatSps: {},         // flat SPS added per generator
    costRedPct: {},
    offlineCapAdd: 0,
    offlineRateMul: 1,
    phantomClicksPerSec: 0,
    spsPerClickRate: 0,
    spcPerLifetimeClick: 0,
    idleBonusMul: 1,
  };
  for (const id of GEN_IDS) {
    m.genMul[id] = 1;
    m.genAddPct[id] = 0;
    m.genFlatSps[id] = 0;
    m.costRedPct[id] = 0;
  }
  return m;
}

// Convenience helpers used inside apply() functions
const E = {
  spcMul:  (m, v) => { m.spcMul *= v; },
  spcAdd:  (m, v) => { m.spcAdd += v; },
  glob:    (m, v) => { m.globalMul *= v; },
  gen:     (m, id, v) => { m.genMul[id] *= v; },
  genPctEach: (m, id, v) => { m.genAddPct[id] += v; }, // adds v as already-scaled %
  spcPerGen: (m, s, id, v) => { m.spcAdd += (s.generators[id]?.count || 0) * v; },
  spcPerTotalGen: (m, s, v) => { m.spcAdd += totalGenCount(s) * v; },
  spcPerUniqueType: (m, s, v) => { m.spcAdd += uniqueGenTypes(s) * v; },
  // gen X gets +v% per count of source
  genPctPerSource: (m, s, target, source, v) => {
    m.genAddPct[target] += (s.generators[source]?.count || 0) * v;
  },
  // all gens get +v% per count of source
  allGensPctPerSource: (m, s, source, v) => {
    const cnt = s.generators[source]?.count || 0;
    for (const id of GEN_IDS) m.genAddPct[id] += cnt * v;
  },
  // all gens except source itself get +v% per count of source
  othersPctPerSource: (m, s, source, v) => {
    const cnt = s.generators[source]?.count || 0;
    for (const id of GEN_IDS) if (id !== source) m.genAddPct[id] += cnt * v;
  },
  // gen X gets +v% per count of X itself
  genPctSelf: (m, s, id, v) => {
    m.genAddPct[id] += (s.generators[id]?.count || 0) * v;
  },
  costRed: (m, s, target, source, v) => {
    m.costRedPct[target] += (s.generators[source]?.count || 0) * v;
  },
  offlineCapAdd: (m, sec) => { m.offlineCapAdd += sec; },
  offlineRateMul: (m, v) => { m.offlineRateMul *= v; },
  phantom: (m, v) => { m.phantomClicksPerSec += v; },
  spsPerClick: (m, v) => { m.spsPerClickRate += v; },
  spcPerLifetimeClick: (m, v) => { m.spcPerLifetimeClick += v; },
  idleBonus: (m, v) => { m.idleBonusMul *= v; },
};

// ─── TREE DATA ──────────────────────────────────────────────────────
//
// Structure per tree: { label, gen, baseC, shared:[T1,T2,T3],
//   branches: { red:{label,philosophy,tiers:[T4..T8],subs:{A,B}}, blue:{...} } }
//
// Each tier: { name, cost, desc, flavour?, apply(m, s) }
//
// Costs for generator trees follow GEN_COST_MULT × baseC.
// Clicker tree uses explicit per-tier costs.

const TREE_DATA = {
  // ════════════════════════════════════════════════════════════════
  // TREE 0 — Clicker: Spore Touch
  // ════════════════════════════════════════════════════════════════
  clicker: {
    label: 'Spore Touch', tabShort: 'Touch', gen: null,
    description: 'The hand that started it all.',
    shared: [
      { name: 'Hardened Cap',      cost: 50,  desc: 'SPC ×2',
        flavour: 'Chitin grows where skin once was.',
        apply: (m) => E.spcMul(m, 2) },
      { name: 'Spore Compression', cost: 200, desc: 'SPC ×2',
        flavour: 'More spores in every squeeze.',
        apply: (m) => E.spcMul(m, 2) },
      { name: 'Mycotoxin Charge',  cost: 800, desc: 'SPC ×3 · 5% chance: output ×2',
        flavour: 'A touch that leaves more than a mark.',
        apply: (m) => E.spcMul(m, 3.15) },
    ],
    branches: {
      red: {
        label: 'Crimson Hand', icon: '🔴',
        philosophy: 'Explosive burst, critical hits, click combos.',
        tiers: [
          { name: 'Spore Burst',       cost: 2000,   desc: 'SPC ×2',
            apply: (m) => E.spcMul(m, 2) },
          { name: 'Overcharge',        cost: 6000,   desc: 'Every 10th click awards SPC ×5',
            apply: (m) => E.spcMul(m, 1.4) },
          { name: 'Critical Bloom',    cost: 15000,  desc: 'Crit chance 10% (crit = SPC ×10)',
            apply: (m) => E.spcMul(m, 1.9) },
          { name: 'Frenzy State',      cost: 40000,  desc: '5 clicks in 2s triggers 5s of SPC ×3',
            apply: (m) => E.spcMul(m, 1.5) },
          { name: 'Explosive Release', cost: 100000, desc: 'Frenzy bursts add +50% SPS for 10s',
            apply: (m) => E.glob(m, 1.05) },
        ],
        subs: {
          A: {
            label: 'Inferno',
            philosophy: 'Bigger crits. Bigger frenzy. Everything louder.',
            tiers: [
              { name: 'Volcanic Touch',     cost: 200000,    desc: 'Crit chance 20%, crit ×15',
                apply: (m) => E.spcMul(m, 2) },
              { name: 'Magma Core',         cost: 600000,    desc: 'Frenzy duration extends to 10s',
                apply: (m) => E.spcMul(m, 1.2) },
              { name: 'Pyroclastic Bloom',  cost: 2000000,   desc: 'Every 25th click: +1s of total SPS instantly',
                apply: (m) => E.glob(m, 1.1) },
              { name: 'Superheated Tip',    cost: 6000000,   desc: 'SPC ×3',
                apply: (m) => E.spcMul(m, 3) },
              { name: 'Caldera Release',    cost: 20000000,  desc: 'Frenzy multiplier ×5',
                apply: (m) => E.spcMul(m, 2.5) },
              { name: 'Magmatic Ascension', cost: 60000000,  desc: 'Frenzy SPS bonus applies permanently after first trigger',
                apply: (m) => E.glob(m, 1.5) },
              { name: 'Pyrospore God',      cost: 200000000, desc: 'SPC ×5 · crit 30% · crit ×20',
                apply: (m) => E.spcMul(m, 10) },
            ],
          },
          B: {
            label: 'Ember',
            philosophy: 'Each click feeds a slow, compounding fire.',
            tiers: [
              { name: 'Smoldering Touch', cost: 200000,    desc: 'Each click permanently grants +0.01 SPS',
                apply: (m) => E.spsPerClick(m, 0.01) },
              { name: 'Ember Trails',     cost: 600000,    desc: 'Click combos stack +0.5 SPC (3s decay)',
                apply: (m) => E.spcMul(m, 1.3) },
              { name: 'Slow Burn',        cost: 2000000,   desc: 'Every 10s idle: gain 5s of SPS passively',
                apply: (m) => E.idleBonus(m, 1.2) },
              { name: 'Coal Bed',         cost: 6000000,   desc: 'SPC ×2 · Ember Trail stack cap ×2',
                apply: (m) => E.spcMul(m, 2) },
              { name: 'Sustained Heat',   cost: 20000000,  desc: 'Ember Trail never resets',
                apply: (m) => E.spcMul(m, 1.5) },
              { name: 'Banked Embers',    cost: 60000000,  desc: 'Offline time on return grants click-power burst',
                apply: (m) => E.glob(m, 1.1) },
              { name: 'Eternal Flame',    cost: 200000000, desc: 'SPC + (lifetime clicks × 0.0001)',
                apply: (m) => E.spcPerLifetimeClick(m, 0.0001) },
            ],
          },
        },
      },
      blue: {
        label: 'Void Touch', icon: '🔵',
        philosophy: 'Efficiency, generator synergy, idle benefits.',
        tiers: [
          { name: 'Resonant Tap',    cost: 2000,   desc: 'SPC ×2',
            apply: (m) => E.spcMul(m, 2) },
          { name: 'Mycelial Echo',   cost: 6000,   desc: 'Each click triggers +2% SPS for 5s (×10 stack)',
            apply: (m) => E.glob(m, 1.1) },
          { name: 'Void Attunement', cost: 15000,  desc: 'SPC +1 per unique generator type owned',
            apply: (m, s) => E.spcPerUniqueType(m, s, 1) },
          { name: 'Symbiotic Touch', cost: 40000,  desc: 'SPC +0.1 per total generator count',
            apply: (m, s) => E.spcPerTotalGen(m, s, 0.1) },
          { name: 'Harmonic Pulse',  cost: 100000, desc: 'Every 20 clicks: generators burst 3s instantly',
            apply: (m) => E.glob(m, 1.1) },
        ],
        subs: {
          A: {
            label: 'Deep Current',
            philosophy: 'The more you have built, the stronger you click.',
            tiers: [
              { name: 'Neural Mycelium',     cost: 200000,    desc: 'SPC ×(1 + 0.02 per generator owned)',
                apply: (m, s) => E.spcMul(m, 1 + 0.02 * totalGenCount(s)) },
              { name: 'Root Network',        cost: 600000,    desc: 'Harmonic Pulse triggers every 10 clicks',
                apply: (m) => E.glob(m, 1.1) },
              { name: 'Subterranean Pulse',  cost: 2000000,   desc: 'Pulse burst extended to 6s',
                apply: (m) => E.glob(m, 1.1) },
              { name: 'Hive Resonance',      cost: 6000000,   desc: 'All generators +5% SPS while clicked in last 30s',
                apply: (m) => E.glob(m, 1.1) },
              { name: 'Collective Mind',     cost: 20000000,  desc: 'SPC + (total generators × 10)',
                apply: (m, s) => E.spcPerTotalGen(m, s, 10) },
              { name: 'Mycorrhizal Lattice', cost: 60000000,  desc: 'Hive bonus rises to +15% SPS',
                apply: (m) => E.glob(m, 1.15) },
              { name: 'Void Communion',      cost: 200000000, desc: 'SPC ×5 · all generators ×1.2',
                apply: (m) => { E.spcMul(m, 5); E.glob(m, 1.2); } },
            ],
          },
          B: {
            label: 'Surface Drift',
            philosophy: 'Clicks happen whether you are there or not.',
            tiers: [
              { name: 'Phantom Clicks',  cost: 200000,    desc: 'Auto-generates 1 phantom click per second',
                apply: (m) => E.phantom(m, 1) },
              { name: 'Spore Tide',      cost: 600000,    desc: 'Phantom click rate: 3/s',
                apply: (m) => E.phantom(m, 2) },
              { name: 'Effortless Bloom',cost: 2000000,   desc: 'Phantom clicks trigger Harmonic Pulse',
                apply: (m) => E.glob(m, 1.1) },
              { name: 'Passive Current', cost: 6000000,   desc: 'SPS +10% while no real click in last 60s',
                apply: (m) => E.idleBonus(m, 1.1) },
              { name: 'Dormant Power',   cost: 20000000,  desc: 'Offline gain cap raised 8h → 24h',
                apply: (m) => E.offlineCapAdd(m, 16 * 3600) },
              { name: 'Void Sleep',      cost: 60000000,  desc: 'Offline gain rate ×3',
                apply: (m) => E.offlineRateMul(m, 3) },
              { name: 'Tidal Supremacy', cost: 200000000, desc: 'Phantom: 10/s · SPS ×1.5 while idle',
                apply: (m) => { E.phantom(m, 7); E.idleBonus(m, 1.5); } },
            ],
          },
        },
      },
    },
  },

  // ════════════════════════════════════════════════════════════════
  // TREE 1 — Mycelium Thread (C = 10)
  // ════════════════════════════════════════════════════════════════
  myceliumThread: {
    label: 'Mycelium Thread', tabShort: 'Thread', gen: 'myceliumThread', baseC: 10,
    description: 'The first filaments. Volume, reach, thread density.',
    shared: [
      { name: 'Thicker Walls',     desc: 'Thread SPS ×2',
        flavour: 'A stronger strand carries more.',
        apply: (m) => E.gen(m, 'myceliumThread', 2) },
      { name: 'Branching Growth',  desc: 'Thread SPS ×2',
        flavour: 'Two become four become thousands.',
        apply: (m) => E.gen(m, 'myceliumThread', 2) },
      { name: 'Nutrient Channels', desc: 'Thread SPS ×3 · threads boost SPC +0.1 each',
        flavour: 'The network feeds the hand.',
        apply: (m, s) => { E.gen(m, 'myceliumThread', 3); E.spcPerGen(m, s, 'myceliumThread', 0.1); } },
    ],
    branches: {
      red: {
        label: 'Scorched Filament', icon: '🔴',
        philosophy: 'Aggressive growth, decay and regrowth.',
        tiers: [
          { name: 'Cauterised Tips',  desc: 'Thread SPS ×2',
            apply: (m) => E.gen(m, 'myceliumThread', 2) },
          { name: 'Rapid Regrowth',   desc: 'Burns trigger +200% SPS bursts',
            apply: (m) => E.gen(m, 'myceliumThread', 1.3) },
          { name: 'Ash Fertiliser',   desc: 'Thread SPS scales +0.5% per Thread owned',
            apply: (m, s) => E.genPctSelf(m, s, 'myceliumThread', 0.005) },
          { name: 'Consuming Spread', desc: 'Threads grant +1% SPS to all other generators',
            apply: (m, s) => E.othersPctPerSource(m, s, 'myceliumThread', 0.01) },
          { name: 'Firestarter',      desc: 'Thread bonus to others rises to +3%',
            apply: (m, s) => E.othersPctPerSource(m, s, 'myceliumThread', 0.02) },
        ],
        subs: {
          A: {
            label: 'Ash Network',
            philosophy: 'Threads sacrifice themselves for global power.',
            tiers: [
              { name: 'Cinder Lattice',   desc: 'Thread SPS ×2 · ash bonus +5%',
                apply: (m) => E.gen(m, 'myceliumThread', 2) },
              { name: 'Smoulder Web',     desc: 'Global SPS +0.5% per Thread owned',
                apply: (m, s) => E.allGensPctPerSource(m, s, 'myceliumThread', 0.005) },
              { name: 'Consumed Network', desc: 'Every 10 Threads: all generators +1% SPS',
                apply: (m, s) => E.allGensPctPerSource(m, s, 'myceliumThread', 0.001) },
              { name: 'Phoenix Mycelium', desc: 'Thread SPS triples after each burn burst',
                apply: (m) => E.gen(m, 'myceliumThread', 1.5) },
              { name: 'Scorched Earth',   desc: 'Burn bursts auto-trigger every 30s',
                apply: (m) => E.gen(m, 'myceliumThread', 1.2) },
              { name: 'Pyroclastic Web',  desc: 'Burn burst duration extends to 15s',
                apply: (m) => E.gen(m, 'myceliumThread', 1.2) },
              { name: 'Ash Singularity',  desc: 'All generators ×1.5 · Threads ×5',
                apply: (m) => { E.gen(m, 'myceliumThread', 5); E.glob(m, 1.5); } },
            ],
          },
          B: {
            label: 'Ember Strand',
            philosophy: 'Individual threads grow stronger with age.',
            tiers: [
              { name: 'Tempered Thread',   desc: 'Thread SPS ×3',
                apply: (m) => E.gen(m, 'myceliumThread', 3) },
              { name: 'Heat Soak',         desc: 'Each Thread grants +0.2 SPC',
                apply: (m, s) => E.spcPerGen(m, s, 'myceliumThread', 0.2) },
              { name: 'Glowing Filament',  desc: 'Thread SPS gains +0.1%/sec played (cap 500%)',
                apply: (m) => E.gen(m, 'myceliumThread', 1.5) },
              { name: 'Fused Core',        desc: 'Thread SPS ×2',
                apply: (m) => E.gen(m, 'myceliumThread', 2) },
              { name: 'Living Ember',      desc: 'Thread aging bonus uncapped',
                apply: (m) => E.gen(m, 'myceliumThread', 1.5) },
              { name: 'Incandescent Web',  desc: 'Thread SPS added to SPC directly',
                apply: (m) => E.gen(m, 'myceliumThread', 1.5) },
              { name: 'Eternal Thread',    desc: 'Thread SPS ×10 · contributes ×2 to SPC',
                apply: (m) => { E.gen(m, 'myceliumThread', 10); E.spcMul(m, 1.3); } },
            ],
          },
        },
      },
      blue: {
        label: 'Endless Weave', icon: '🔵',
        philosophy: 'Patient expansion, pure density gains.',
        tiers: [
          { name: 'Dense Packing',     desc: 'Thread SPS ×2',
            apply: (m) => E.gen(m, 'myceliumThread', 2) },
          { name: 'Interlocking Mesh', desc: 'Each Thread after 10: +1% SPS per Thread',
            apply: (m, s) => E.genPctSelf(m, s, 'myceliumThread', 0.01) },
          { name: 'Underground Layer', desc: 'Thread SPS ×2 · unlocks basement layer',
            apply: (m) => E.gen(m, 'myceliumThread', 2) },
          { name: 'Depth Pressure',    desc: 'Thread SPS +2% per Hyphal Network owned',
            apply: (m, s) => E.genPctPerSource(m, s, 'myceliumThread', 'hyphalNetwork', 0.02) },
          { name: 'Mycelial Fabric',   desc: 'Thread output ×2 (effective count doubles)',
            apply: (m) => E.gen(m, 'myceliumThread', 2) },
        ],
        subs: {
          A: {
            label: 'Deep Lattice',
            philosophy: 'Goes deeper. Produces more. Never stops.',
            tiers: [
              { name: 'Bedrock Reach',     desc: 'Thread SPS ×3',
                apply: (m) => E.gen(m, 'myceliumThread', 3) },
              { name: 'Tectonic Threads',  desc: 'Thread SPS +1% per Spore Cluster owned',
                apply: (m, s) => E.genPctPerSource(m, s, 'myceliumThread', 'sporeCluster', 0.01) },
              { name: 'Subduction Zone',   desc: 'Thread SPS ×2',
                apply: (m) => E.gen(m, 'myceliumThread', 2) },
              { name: 'Mantle Tap',        desc: 'Offline rate ×1.5',
                apply: (m) => E.offlineRateMul(m, 1.5) },
              { name: 'Core Weave',        desc: 'Thread SPS ×3',
                apply: (m) => E.gen(m, 'myceliumThread', 3) },
              { name: 'Planetary Network', desc: 'Threads grant +0.01% SPS to every other gen per Thread',
                apply: (m, s) => E.othersPctPerSource(m, s, 'myceliumThread', 0.0001) },
              { name: 'World Mycelium',    desc: 'Thread SPS ×5 · offline cap +2h',
                apply: (m) => { E.gen(m, 'myceliumThread', 5); E.offlineCapAdd(m, 7200); } },
            ],
          },
          B: {
            label: 'Reactive Web',
            philosophy: 'Responds to player behaviour. The web watches.',
            tiers: [
              { name: 'Nerve Filament',  desc: 'Thread SPS +5% per click in last 10s',
                apply: (m) => E.gen(m, 'myceliumThread', 1.2) },
              { name: 'Signal Threads',  desc: 'Thread SPS ×2 while player is active',
                apply: (m) => E.gen(m, 'myceliumThread', 1.5) },
              { name: 'Feedback Loop',   desc: 'Clicking boosts Thread SPS +0.1% permanently',
                apply: (m) => E.gen(m, 'myceliumThread', 1.3) },
              { name: 'Stimulus Web',    desc: 'Active bonus rises to +20% Thread SPS',
                apply: (m) => E.gen(m, 'myceliumThread', 1.2) },
              { name: 'Adaptive Mesh',   desc: 'Thread +1% per upgrade purchased (any tree)',
                apply: (m, s) => E.genPctSelf(m, s, 'myceliumThread', 0) /* base; below adds */ },
              { name: 'Sentient Strand', desc: 'Thread SPS ×3 · reactive bonus uncapped',
                apply: (m) => E.gen(m, 'myceliumThread', 3) },
              { name: 'Awakened Web',    desc: 'Thread SPS ×5 · all actions trigger a burst',
                apply: (m) => E.gen(m, 'myceliumThread', 5) },
            ],
          },
        },
      },
    },
  },

  // ════════════════════════════════════════════════════════════════
  // TREE 2 — Spore Cluster (C = 100)
  // ════════════════════════════════════════════════════════════════
  sporeCluster: {
    label: 'Spore Cluster', tabShort: 'Cluster', gen: 'sporeCluster', baseC: 100,
    description: 'A node of dense reproductive mass.',
    shared: [
      { name: 'Cluster Density',   desc: 'Cluster SPS ×2',
        flavour: 'Pack them tighter.',
        apply: (m) => E.gen(m, 'sporeCluster', 2) },
      { name: 'Pressure Release',  desc: 'Cluster SPS ×2 · 60s burst',
        flavour: 'What is compressed must eventually explode.',
        apply: (m) => E.gen(m, 'sporeCluster', 2.1) },
      { name: 'Reproductive Node', desc: 'Cluster SPS ×2 · Clusters reduce Thread cost 1% each',
        flavour: 'The cluster feeds the thread.',
        apply: (m, s) => { E.gen(m, 'sporeCluster', 2); E.costRed(m, s, 'myceliumThread', 'sporeCluster', 0.01); } },
    ],
    branches: {
      red: {
        label: 'Explosive Cluster', icon: '🔴',
        philosophy: 'Controlled detonations produce spore cascades.',
        tiers: [
          { name: 'Pressurised Sac',  desc: 'Cluster SPS ×2 · burst timer: 45s',
            apply: (m) => E.gen(m, 'sporeCluster', 2.1) },
          { name: 'Shrapnel Bloom',   desc: 'Bursts award ×10 SPS',
            apply: (m) => E.gen(m, 'sporeCluster', 1.4) },
          { name: 'Chain Reaction',   desc: 'Bursts cascade to adjacent (+50% chance)',
            apply: (m) => E.gen(m, 'sporeCluster', 1.3) },
          { name: 'Detonation Field', desc: 'Owning 10+ Clusters: burst ×2',
            apply: (m) => E.gen(m, 'sporeCluster', 1.5) },
          { name: 'Critical Mass',    desc: 'Burst auto-triggers at spore milestones',
            apply: (m) => E.gen(m, 'sporeCluster', 1.5) },
        ],
        subs: {
          A: {
            label: 'Detonation Field',
            philosophy: 'Explosions get bigger. Radius grows.',
            tiers: [
              { name: 'Blast Radius',        desc: 'Burst SPS multiplier ×3',
                apply: (m) => E.gen(m, 'sporeCluster', 2) },
              { name: 'Pressure Wave',       desc: 'Bursts +1% to all generators for 30s',
                apply: (m) => E.glob(m, 1.05) },
              { name: 'Concussive Growth',   desc: 'Burst timer reduced to 20s',
                apply: (m) => E.gen(m, 'sporeCluster', 1.5) },
              { name: 'Shockwave Core',      desc: 'Global burst stacks (up to 20× per generator)',
                apply: (m) => E.glob(m, 1.1) },
              { name: 'Detonation Cascade',  desc: 'Bursts chain 100% between clusters',
                apply: (m) => E.gen(m, 'sporeCluster', 2) },
              { name: 'Nuclear Node',        desc: 'Burst ×5 · affects SPC',
                apply: (m) => { E.gen(m, 'sporeCluster', 2); E.spcMul(m, 1.5); } },
              { name: 'Singularity Burst',   desc: 'One burst per 60s produces 60s of all-gen SPS',
                apply: (m) => { E.gen(m, 'sporeCluster', 3); E.glob(m, 1.3); } },
            ],
          },
          B: {
            label: 'Shrapnel Burst',
            philosophy: 'Each explosion scatters seeds that grow their own producers.',
            tiers: [
              { name: 'Seed Scatter',      desc: 'Bursts spawn +0.5 virtual Thread SPS',
                apply: (m) => E.gen(m, 'sporeCluster', 1.5) },
              { name: 'Pellet Cloud',      desc: 'Shrapnel scales with total Clusters',
                apply: (m, s) => E.genPctSelf(m, s, 'sporeCluster', 0.01) },
              { name: 'Growth Shards',     desc: 'Shrapnel also affects Hyphal Network',
                apply: (m, s) => E.genPctPerSource(m, s, 'hyphalNetwork', 'sporeCluster', 0.01) },
              { name: 'Propagation Storm', desc: 'Each burst +0.01% global SPS permanently',
                apply: (m) => E.glob(m, 1.1) },
              { name: 'Hyper Scatter',     desc: 'Burst permanent bonus ×5',
                apply: (m) => E.glob(m, 1.1) },
              { name: 'Spore Artillery',   desc: 'Permanent burst bonus applies offline',
                apply: (m) => E.offlineRateMul(m, 1.2) },
              { name: 'Living Shrapnel',   desc: 'Accumulated burst bonuses doubled retroactively',
                apply: (m) => { E.gen(m, 'sporeCluster', 3); E.glob(m, 1.2); } },
            ],
          },
        },
      },
      blue: {
        label: 'Dense Colony', icon: '🔵',
        philosophy: 'Mass, patience, compounding returns.',
        tiers: [
          { name: 'Colony Core',       desc: 'Cluster SPS ×2',
            apply: (m) => E.gen(m, 'sporeCluster', 2) },
          { name: 'Biomass Buildup',   desc: 'Each Cluster after 5th: +2% Cluster SPS',
            apply: (m, s) => E.genPctSelf(m, s, 'sporeCluster', 0.02) },
          { name: 'Nutrient Pooling',  desc: 'Cluster SPS ×2 · Cluster cost -2% each',
            apply: (m, s) => { E.gen(m, 'sporeCluster', 2); E.costRed(m, s, 'sporeCluster', 'sporeCluster', 0.02); } },
          { name: 'Supercolony Seed',  desc: 'Owning 20+ Clusters: global SPS +5%',
            apply: (m) => E.glob(m, 1.05) },
          { name: 'Mass Accumulation', desc: 'Cluster SPS scales with total spores (×0.001% per 1M)',
            apply: (m, s) => E.gen(m, 'sporeCluster', 1 + Math.min(2, (s.totalSporesEarned || 0) / 1e6 * 0.00001)) },
        ],
        subs: {
          A: {
            label: 'Supercolony',
            philosophy: 'Size begets size.',
            tiers: [
              { name: 'Colonial Reach',    desc: 'Cluster SPS ×2 · threshold drops to 10',
                apply: (m) => E.gen(m, 'sporeCluster', 2) },
              { name: 'Distributed Mass',  desc: 'Every 5 Clusters: +1% to all generators',
                apply: (m, s) => E.allGensPctPerSource(m, s, 'sporeCluster', 0.002) },
              { name: 'Hive Architecture', desc: 'Cluster SPS ×3',
                apply: (m) => E.gen(m, 'sporeCluster', 3) },
              { name: 'Macroorganism',     desc: 'Cluster count effectively ×1.5',
                apply: (m) => E.gen(m, 'sporeCluster', 1.5) },
              { name: 'Planetary Colony',  desc: 'Cluster SPS ×2 · global ×2',
                apply: (m) => { E.gen(m, 'sporeCluster', 2); E.glob(m, 2); } },
              { name: 'Gestalt Bloom',     desc: 'All costs -10% per 50 Clusters owned',
                apply: (m, s) => {
                  const reduction = Math.floor((s.generators.sporeCluster?.count || 0) / 50) * 0.10;
                  for (const id of GEN_IDS) m.costRedPct[id] += reduction;
                } },
              { name: 'Living Continent',  desc: 'Cluster SPS ×10 · all gens +25%',
                apply: (m) => { E.gen(m, 'sporeCluster', 10); E.glob(m, 1.25); } },
            ],
          },
          B: {
            label: 'Spore Bank',
            philosophy: 'Store output, release it amplified.',
            tiers: [
              { name: 'Reserve Pool',      desc: 'Idle SPS banks up to 60s, releases on click',
                apply: (m) => E.gen(m, 'sporeCluster', 1.5) },
              { name: 'Interest Growth',   desc: 'Banked spores grow +1% per 10s',
                apply: (m) => E.gen(m, 'sporeCluster', 1.3) },
              { name: 'Compound Reserve',  desc: 'Bank cap raises to 5 minutes',
                apply: (m) => E.gen(m, 'sporeCluster', 1.5) },
              { name: 'Withdrawal Surge',  desc: 'Release ×2 multiplier on banked total',
                apply: (m) => E.gen(m, 'sporeCluster', 1.5) },
              { name: 'Overflow Protocol', desc: 'Bank-full overflow → permanent SPS bonus',
                apply: (m) => E.glob(m, 1.1) },
              { name: 'Infinite Ledger',   desc: 'Bank cap: 30 minutes',
                apply: (m) => E.offlineCapAdd(m, 1800) },
              { name: 'The Great Reserve', desc: 'Bank cap unlimited · release always ×3',
                apply: (m) => { E.gen(m, 'sporeCluster', 5); E.offlineRateMul(m, 1.5); } },
            ],
          },
        },
      },
    },
  },

  // ════════════════════════════════════════════════════════════════
  // TREE 3 — Hyphal Network (C = 1100)
  // ════════════════════════════════════════════════════════════════
  hyphalNetwork: {
    label: 'Hyphal Network', tabShort: 'Network', gen: 'hyphalNetwork', baseC: 1100,
    description: 'Underground nerve web. Connectivity and synergy.',
    shared: [
      { name: 'Signal Boost',     desc: 'Network SPS ×2',
        flavour: 'A clearer channel.',
        apply: (m) => E.gen(m, 'hyphalNetwork', 2) },
      { name: 'Redundant Paths',  desc: 'Network SPS ×2 · -1% Thread/Cluster cost each',
        flavour: 'Backup routes never sleep.',
        apply: (m, s) => {
          E.gen(m, 'hyphalNetwork', 2);
          E.costRed(m, s, 'myceliumThread', 'hyphalNetwork', 0.01);
          E.costRed(m, s, 'sporeCluster', 'hyphalNetwork', 0.01);
        } },
      { name: 'Mycorrhizal Link', desc: 'Network SPS ×2 · all generators +3% SPS per Network',
        flavour: 'Everything connects.',
        apply: (m, s) => { E.gen(m, 'hyphalNetwork', 2); E.allGensPctPerSource(m, s, 'hyphalNetwork', 0.03); } },
    ],
    branches: {
      red: {
        label: 'Parasitic Network', icon: '🔴',
        philosophy: 'Take from others. Make it your own.',
        tiers: [
          { name: 'Tap Root',         desc: 'Network SPS ×2',
            apply: (m) => E.gen(m, 'hyphalNetwork', 2) },
          { name: 'Resource Drain',   desc: 'Networks convert 2% of others to bonus',
            apply: (m) => E.gen(m, 'hyphalNetwork', 1.3) },
          { name: 'Host Compromise',  desc: 'Drain rises to 5%',
            apply: (m) => E.gen(m, 'hyphalNetwork', 1.4) },
          { name: 'Necrotic Spread',  desc: 'Drained SPS bonus ×2',
            apply: (m) => E.gen(m, 'hyphalNetwork', 1.5) },
          { name: 'Total Parasite',   desc: 'Network SPS includes 10% of others raw SPS',
            apply: (m) => E.gen(m, 'hyphalNetwork', 1.5) },
        ],
        subs: {
          A: {
            label: 'Mind Corruption',
            philosophy: 'The network takes control.',
            tiers: [
              { name: 'Neural Override',   desc: 'Networks control 1% of each generator',
                apply: (m) => E.gen(m, 'hyphalNetwork', 1.5) },
              { name: 'Compulsion Signal', desc: 'Controlled generators produce 110%',
                apply: (m) => E.glob(m, 1.1) },
              { name: 'Puppeteer Hyphae',  desc: 'Control rises to 3% per Network',
                apply: (m) => E.glob(m, 1.1) },
              { name: 'Subconscious Tap',  desc: 'Controlled output counts double',
                apply: (m) => E.gen(m, 'hyphalNetwork', 2) },
              { name: 'Total Influence',   desc: 'All generators +20%',
                apply: (m) => E.glob(m, 1.2) },
              { name: 'Hive Override',     desc: 'Control uncapped · costs -15%',
                apply: (m) => { for (const id of GEN_IDS) m.costRedPct[id] += 0.15; } },
              { name: 'Unified Parasite',  desc: 'All generators ×1.5 (unified output)',
                apply: (m) => E.glob(m, 1.5) },
            ],
          },
          B: {
            label: 'Resource Drain',
            philosophy: 'Pure extraction. Cold, efficient, total.',
            tiers: [
              { name: 'Efficient Tap',    desc: 'Drain rises to 15%',
                apply: (m) => E.gen(m, 'hyphalNetwork', 1.5) },
              { name: 'Pipeline',         desc: 'Network SPS ×2',
                apply: (m) => E.gen(m, 'hyphalNetwork', 2) },
              { name: 'Total Extraction', desc: 'Drain applies offline',
                apply: (m) => E.offlineRateMul(m, 1.5) },
              { name: 'Pressure Siphon',  desc: 'Drain ×2 (pure bonus)',
                apply: (m) => E.gen(m, 'hyphalNetwork', 2) },
              { name: 'Void Pipeline',    desc: 'Drain pre-extracts future generators',
                apply: (m) => E.gen(m, 'hyphalNetwork', 2) },
              { name: 'Maximum Harvest',  desc: 'Drain ×4',
                apply: (m) => E.gen(m, 'hyphalNetwork', 2) },
              { name: 'The Great Drain',  desc: 'Network SPS includes 25% of others total',
                apply: (m) => { E.gen(m, 'hyphalNetwork', 3); E.glob(m, 1.25); } },
            ],
          },
        },
      },
      blue: {
        label: 'Symbiotic Network', icon: '🔵',
        philosophy: 'Share, amplify, grow together.',
        tiers: [
          { name: 'Mutualism',         desc: 'Network SPS ×2 · +2% per other gen type',
            apply: (m, s) => { E.gen(m, 'hyphalNetwork', 2); m.genAddPct.hyphalNetwork += uniqueGenTypes(s) * 0.02; } },
          { name: 'Shared Pathways',   desc: 'All gens +2% SPS per Network',
            apply: (m, s) => E.allGensPctPerSource(m, s, 'hyphalNetwork', 0.02) },
          { name: 'Feedback Loop',     desc: 'Networks +1% per upgrade across all trees',
            apply: (m, s) => {
              const upgs = totalUpgradesPurchased(s);
              m.genAddPct.hyphalNetwork += upgs * 0.01;
            } },
          { name: 'Symbiotic Core',    desc: 'All-gen bonus rises to +4% per Network',
            apply: (m, s) => E.allGensPctPerSource(m, s, 'hyphalNetwork', 0.02) },
          { name: 'Harmonic Web',      desc: 'Networks multiply shared bonuses ×1.5',
            apply: (m) => E.gen(m, 'hyphalNetwork', 1.5) },
        ],
        subs: {
          A: {
            label: 'Mutualism',
            philosophy: 'Every generator more than the sum of its parts.',
            tiers: [
              { name: 'Co-Dependence',     desc: 'Each unique gen type owned: +5% all SPS',
                apply: (m, s) => E.glob(m, 1 + uniqueGenTypes(s) * 0.05) },
              { name: 'Cross-Pollination', desc: 'Highest-SPS gen boosts others 10% of its SPS',
                apply: (m) => E.glob(m, 1.1) },
              { name: 'Intertwined Roots', desc: 'Owning 5 of every gen: global ×1.5',
                apply: (m, s) => {
                  if (GEN_IDS.every(id => (s.generators[id]?.count || 0) >= 5)) E.glob(m, 1.5);
                } },
              { name: 'Living Matrix',     desc: 'New gen purchases trigger 5s burst across all',
                apply: (m) => E.glob(m, 1.1) },
              { name: 'Biome Cohesion',    desc: 'All gen SPS ×1.2 per tree tier completed',
                apply: (m, s) => E.glob(m, 1 + Math.min(2, totalUpgradesPurchased(s) * 0.005)) },
              { name: 'Apex Symbiosis',    desc: 'Count thresholds (10/25/50) unlock +10% global each',
                apply: (m, s) => {
                  let bonus = 1;
                  for (const id of GEN_IDS) {
                    const c = s.generators[id]?.count || 0;
                    if (c >= 10) bonus *= 1.10;
                    if (c >= 25) bonus *= 1.10;
                    if (c >= 50) bonus *= 1.10;
                  }
                  E.glob(m, bonus);
                } },
              { name: 'Mutualistic God',   desc: 'All gens ×2 · costs -20%',
                apply: (m) => { E.glob(m, 2); for (const id of GEN_IDS) m.costRedPct[id] += 0.20; } },
            ],
          },
          B: {
            label: 'Mycorrhizal Harmony',
            philosophy: 'Balance everything. Lose nothing.',
            tiers: [
              { name: 'Equalisation',      desc: 'Weakest generator +50% SPS',
                apply: (m, s) => {
                  let minId = GEN_IDS[0], minSps = Infinity;
                  for (const id of GEN_IDS) {
                    const sps = baseGenUnit(id) * (s.generators[id]?.count || 0);
                    if (sps < minSps && (s.generators[id]?.count || 0) > 0) { minSps = sps; minId = id; }
                  }
                  m.genAddPct[minId] += 0.5;
                } },
              { name: 'Even Growth',       desc: 'Counts within 20%: global +10%',
                apply: (m, s) => { if (genBalanceWithin(s, 0.2)) E.glob(m, 1.1); } },
              { name: 'Perfect Ratio',     desc: 'Perfect-balance bonus rises to +25%',
                apply: (m, s) => { if (genBalanceWithin(s, 0.2)) E.glob(m, 1.15); } },
              { name: 'Harmonic Dividend', desc: 'All gens produce 110% always',
                apply: (m) => E.glob(m, 1.1) },
              { name: 'Resonant Peace',    desc: 'Balance loosens to 50% · uncapped',
                apply: (m, s) => { if (genBalanceWithin(s, 0.5)) E.glob(m, 1.25); } },
              { name: 'Unified Growth',    desc: 'Buying any gen +1% to all (permanent)',
                apply: (m, s) => E.glob(m, 1 + totalGenCount(s) * 0.001) },
              { name: 'The Harmony',       desc: 'Global ×3 if all 6 gens have completed T3 shared',
                apply: (m, s) => { if (allGensCompletedShared(s)) E.glob(m, 3); else E.glob(m, 1.2); } },
            ],
          },
        },
      },
    },
  },

  // ════════════════════════════════════════════════════════════════
  // TREE 4 — Sporulating Body (C = 12000)
  // ════════════════════════════════════════════════════════════════
  sporulatingBody: {
    label: 'Sporulating Body', tabShort: 'Body', gen: 'sporulatingBody', baseC: 12000,
    description: 'House-sized fruiting body. Scale and lifecycle.',
    shared: [
      { name: 'Enlarged Gills',  desc: 'Body SPS ×2',
        flavour: 'More surface area. More everything.',
        apply: (m) => E.gen(m, 'sporulatingBody', 2) },
      { name: 'Rapid Fruiting',  desc: 'Body SPS ×2 · +1% per Cluster owned',
        flavour: 'It does not wait for seasons.',
        apply: (m, s) => { E.gen(m, 'sporulatingBody', 2); E.genPctPerSource(m, s, 'sporulatingBody', 'sporeCluster', 0.01); } },
      { name: 'Titan Canopy',    desc: 'Body SPS ×3 · -2% Cluster/Network cost per Body',
        flavour: 'Shadow falls over the valley.',
        apply: (m, s) => {
          E.gen(m, 'sporulatingBody', 3);
          E.costRed(m, s, 'sporeCluster', 'sporulatingBody', 0.02);
          E.costRed(m, s, 'hyphalNetwork', 'sporulatingBody', 0.02);
        } },
    ],
    branches: {
      red: {
        label: 'Aggressive Fruiting', icon: '🔴',
        philosophy: 'Fast growth. Faster death. Infinite replacement.',
        tiers: [
          { name: 'Toxic Bloom',         desc: 'Body SPS ×2 · nearby gens +5% SPS',
            apply: (m) => { E.gen(m, 'sporulatingBody', 2); E.glob(m, 1.05); } },
          { name: 'Rapid Decay Cycle',   desc: 'Bodies decay every 90s for ×5 burst',
            apply: (m) => E.gen(m, 'sporulatingBody', 1.4) },
          { name: 'Accelerated Growth',  desc: 'Decay every 60s',
            apply: (m) => E.gen(m, 'sporulatingBody', 1.3) },
          { name: 'Spore Overload',      desc: 'Decay burst ×8',
            apply: (m) => E.gen(m, 'sporulatingBody', 1.5) },
          { name: 'Necromycorrhiza',     desc: 'Dead bodies leave +1% SPS residue (stacks)',
            apply: (m, s) => E.glob(m, 1 + Math.min(2, (s.generators.sporulatingBody?.count || 0) * 0.01)) },
        ],
        subs: {
          A: {
            label: 'Rapid Decay Cycle',
            philosophy: 'Die constantly. Numbers go up anyway.',
            tiers: [
              { name: 'Hyper Cycle',       desc: 'Decay cycle: 30s',
                apply: (m) => E.gen(m, 'sporulatingBody', 1.5) },
              { name: 'Death Harvest',     desc: 'Decay burst: ×15',
                apply: (m) => E.gen(m, 'sporulatingBody', 1.5) },
              { name: 'Corpse Factory',    desc: 'Residue stacks ×3 faster',
                apply: (m) => E.glob(m, 1.1) },
              { name: 'Instant Regrowth',  desc: 'Continuous burst',
                apply: (m) => E.gen(m, 'sporulatingBody', 2) },
              { name: 'Death Loop',        desc: 'Burst applies to all generators',
                apply: (m) => E.glob(m, 1.15) },
              { name: 'Thanatopic Growth', desc: 'Burst ×20',
                apply: (m) => E.gen(m, 'sporulatingBody', 2) },
              { name: 'Eternal Rot',       desc: 'Body SPS ×10 · burst every 10s',
                apply: (m) => { E.gen(m, 'sporulatingBody', 10); E.glob(m, 1.2); } },
            ],
          },
          B: {
            label: 'Toxic Bloom',
            philosophy: 'Poisons the world. World produces anyway.',
            tiers: [
              { name: 'Myco Venom',         desc: 'Toxic field +10% all gens',
                apply: (m) => E.glob(m, 1.1) },
              { name: 'Spore Toxin',        desc: 'Toxin radius +15%',
                apply: (m) => E.glob(m, 1.15) },
              { name: 'Neurological Bloom', desc: 'Toxic field +5 SPC per Body owned',
                apply: (m, s) => E.spcPerGen(m, s, 'sporulatingBody', 5) },
              { name: 'Lethal Canopy',      desc: 'Body SPS ×3 · toxic stacks per Body',
                apply: (m, s) => { E.gen(m, 'sporulatingBody', 3); E.genPctSelf(m, s, 'sporulatingBody', 0.02); } },
              { name: 'Systemic Poison',    desc: 'Toxic bonus: +25% all gens',
                apply: (m) => E.glob(m, 1.25) },
              { name: 'Pandemic Bloom',     desc: 'Toxin field global (not proximity)',
                apply: (m) => E.glob(m, 1.2) },
              { name: 'World Toxin',        desc: 'All gens ×2 · SPC ×3',
                apply: (m) => { E.glob(m, 2); E.spcMul(m, 3); } },
            ],
          },
        },
      },
      blue: {
        label: 'Slow Growth', icon: '🔵',
        philosophy: 'Ancient. Immovable. Inevitable.',
        tiers: [
          { name: 'Ancient Spore',  desc: 'Body SPS ×2 · 105% offline',
            apply: (m) => { E.gen(m, 'sporulatingBody', 2); E.offlineRateMul(m, 1.05); } },
          { name: 'Old Growth',     desc: 'SPS scales with time played (cap 300%)',
            apply: (m) => E.gen(m, 'sporulatingBody', 1.5) },
          { name: 'Geological Pace',desc: 'Offline cap: +∞ for this gen',
            apply: (m) => E.offlineCapAdd(m, 24 * 3600) },
          { name: 'Primordial Mass',desc: 'Body SPS ×3',
            apply: (m) => E.gen(m, 'sporulatingBody', 3) },
          { name: 'Living Mountain',desc: 'Bodies +0.001% SPS per tick',
            apply: (m) => E.glob(m, 1.05) },
        ],
        subs: {
          A: {
            label: 'Titan Body',
            philosophy: 'It grows. It does not stop.',
            tiers: [
              { name: 'Colossal Scale', desc: 'Body SPS ×3',
                apply: (m) => E.gen(m, 'sporulatingBody', 3) },
              { name: 'Weight of Ages', desc: 'Body SPS +0.1% per total building',
                apply: (m, s) => E.genPctPerSource(m, s, 'sporulatingBody', 'myceliumThread', 0.001) /* approx */ },
              { name: 'Tectonic Form',  desc: 'Body SPS ×2 · -5% all costs per Body',
                apply: (m, s) => {
                  E.gen(m, 'sporulatingBody', 2);
                  const bc = s.generators.sporulatingBody?.count || 0;
                  for (const id of GEN_IDS) m.costRedPct[id] += bc * 0.05;
                } },
              { name: 'Immovable Mass', desc: 'Accumulator uncapped',
                apply: (m) => E.gen(m, 'sporulatingBody', 1.5) },
              { name: 'Godform',        desc: 'Body SPS ×5',
                apply: (m) => E.gen(m, 'sporulatingBody', 5) },
              { name: 'Atlas Body',     desc: 'Global ×1.5',
                apply: (m) => E.glob(m, 1.5) },
              { name: 'The Titan',      desc: 'Body SPS ×10 · all gens +10%',
                apply: (m) => { E.gen(m, 'sporulatingBody', 10); E.glob(m, 1.1); } },
            ],
          },
          B: {
            label: 'Ancient Spore',
            philosophy: 'Spores from before memory.',
            tiers: [
              { name: 'Primordial Release', desc: 'Ancient spores +5% all gens',
                apply: (m) => E.glob(m, 1.05) },
              { name: 'Ancestral Memory',   desc: '+1% all SPS per milestone seen',
                apply: (m, s) => E.glob(m, 1 + (s.milestonesSeen?.length || 0) * 0.01) },
              { name: 'Living History',     desc: 'Milestone bonus ×3',
                apply: (m, s) => E.glob(m, 1 + (s.milestonesSeen?.length || 0) * 0.02) },
              { name: 'Geological Time',    desc: 'Body SPS ×3 · ancient bonus offline',
                apply: (m) => { E.gen(m, 'sporulatingBody', 3); E.offlineRateMul(m, 1.2); } },
              { name: 'Pre-Cambrian Core',  desc: 'All gens +20%',
                apply: (m) => E.glob(m, 1.2) },
              { name: 'Deep Time',          desc: 'Milestone bonus uncapped',
                apply: (m, s) => E.glob(m, 1 + (s.milestonesSeen?.length || 0) * 0.03) },
              { name: 'Origin Spore',       desc: 'All gens ×2 · cap 48h · SPC ×5',
                apply: (m) => { E.glob(m, 2); E.offlineCapAdd(m, 40 * 3600); E.spcMul(m, 5); } },
            ],
          },
        },
      },
    },
  },

  // ════════════════════════════════════════════════════════════════
  // TREE 5 — Stellar Bloom (C = 130000)
  // ════════════════════════════════════════════════════════════════
  stellarBloom: {
    label: 'Stellar Bloom', tabShort: 'Bloom', gen: 'stellarBloom', baseC: 130000,
    description: 'Spores in the solar wind. Cosmic reach.',
    shared: [
      { name: 'Solar Sails',      desc: 'Bloom SPS ×2',
        flavour: 'Carried by light itself.',
        apply: (m) => E.gen(m, 'stellarBloom', 2) },
      { name: 'Nebula Spread',    desc: 'Bloom SPS ×2 · -1% Body cost per Bloom',
        flavour: 'The void is fertile.',
        apply: (m, s) => { E.gen(m, 'stellarBloom', 2); E.costRed(m, s, 'sporulatingBody', 'stellarBloom', 0.01); } },
      { name: 'Heliosphere Gate', desc: 'Bloom SPS ×3 · all gens +1% per Bloom',
        flavour: 'A boundary crossed.',
        apply: (m, s) => { E.gen(m, 'stellarBloom', 3); E.allGensPctPerSource(m, s, 'stellarBloom', 0.01); } },
    ],
    branches: {
      red: {
        label: 'Solar Flare', icon: '🔴',
        philosophy: 'Eruption events. Massive short-term output.',
        tiers: [
          { name: 'Coronal Burst',     desc: 'Bloom SPS ×2 · eruption every 120s',
            apply: (m) => E.gen(m, 'stellarBloom', 2.2) },
          { name: 'Magnetic Surge',    desc: 'Eruption ×12',
            apply: (m) => E.gen(m, 'stellarBloom', 1.3) },
          { name: 'Proton Storm',      desc: 'Eruptions +10% all gens for 30s',
            apply: (m) => E.glob(m, 1.05) },
          { name: 'Chromospheric Arc', desc: 'Eruption every 60s',
            apply: (m) => E.gen(m, 'stellarBloom', 1.4) },
          { name: 'Gamma Burst',       desc: 'Eruption global · SPC ×5 during event',
            apply: (m) => { E.glob(m, 1.1); E.spcMul(m, 1.5); } },
        ],
        subs: {
          A: {
            label: 'Supernova Seed',
            philosophy: 'The star dies. Something new is born.',
            tiers: [
              { name: 'Stellar Collapse', desc: '10th eruption: +0.1% all-gen permanent',
                apply: (m) => E.glob(m, 1.05) },
              { name: 'Neutron Core',     desc: 'Permanent bonus ×3 per supernova',
                apply: (m) => E.glob(m, 1.1) },
              { name: 'Supernova Wave',   desc: 'Supernova every 5th eruption',
                apply: (m) => E.glob(m, 1.1) },
              { name: 'Remnant Cloud',    desc: 'Remnant = new Bloom-equivalent SPS',
                apply: (m) => E.gen(m, 'stellarBloom', 2) },
              { name: 'Pulsar Phase',     desc: 'Steady +25% SPS baseline',
                apply: (m) => E.glob(m, 1.25) },
              { name: 'Quasar Core',      desc: 'Supernova: ×10 global burst',
                apply: (m) => E.glob(m, 1.2) },
              { name: 'Big Bang Spore',   desc: 'Bloom ×10 · supernova every eruption · global ×2',
                apply: (m) => { E.gen(m, 'stellarBloom', 10); E.glob(m, 2); } },
            ],
          },
          B: {
            label: 'Gamma Burst',
            philosophy: 'Pure radiation. Sustained bombardment.',
            tiers: [
              { name: 'Radiation Field', desc: 'Eruptions irradiate gens +0.05% each',
                apply: (m) => E.glob(m, 1.05) },
              { name: 'Ionising Bloom',  desc: 'Irradiation stacks ×2 per eruption',
                apply: (m) => E.glob(m, 1.1) },
              { name: 'Particle Rain',   desc: 'Irradiation applies offline',
                apply: (m) => E.offlineRateMul(m, 1.2) },
              { name: 'Hard Radiation',  desc: 'Bloom ×3 · cap removed',
                apply: (m) => E.gen(m, 'stellarBloom', 3) },
              { name: 'Cosmic Rays',     desc: 'SPC permanently +100 per eruption',
                apply: (m) => E.spcAdd(m, 100) },
              { name: 'Lethal Flux',     desc: 'Eruption duration: 120s',
                apply: (m) => E.glob(m, 1.2) },
              { name: 'Solar God Bloom', desc: 'Bloom ×10 · eruption ×20 · SPC ×10 during',
                apply: (m) => { E.gen(m, 'stellarBloom', 10); E.spcMul(m, 1.5); } },
            ],
          },
        },
      },
      blue: {
        label: 'Dark Matter Drift', icon: '🔵',
        philosophy: 'Invisible mass. Patient, immense.',
        tiers: [
          { name: 'Dark Halo',          desc: 'Bloom SPS ×2',
            apply: (m) => E.gen(m, 'stellarBloom', 2) },
          { name: 'Invisible Spread',   desc: 'Hidden +20% SPS accumulator',
            apply: (m) => E.gen(m, 'stellarBloom', 1.2) },
          { name: 'Gravitational Lure', desc: 'Accumulator releases every 5min',
            apply: (m) => E.gen(m, 'stellarBloom', 1.2) },
          { name: 'Dark Web',           desc: 'Release ×3',
            apply: (m) => E.gen(m, 'stellarBloom', 1.5) },
          { name: 'Void Garden',        desc: 'Accumulator ×2 rate · release every 3min',
            apply: (m) => E.gen(m, 'stellarBloom', 1.5) },
        ],
        subs: {
          A: {
            label: 'Black Hole Garden',
            philosophy: 'Everything falls in.',
            tiers: [
              { name: 'Event Horizon',      desc: 'Releases pull +10% from other gens',
                apply: (m) => E.glob(m, 1.1) },
              { name: 'Tidal Force',        desc: 'Bloom ×3 · pull 20%',
                apply: (m) => { E.gen(m, 'stellarBloom', 3); E.glob(m, 1.1); } },
              { name: 'Spaghettification',  desc: 'Each release = ×2 accumulated',
                apply: (m) => E.gen(m, 'stellarBloom', 1.5) },
              { name: 'Hawking Radiation',  desc: 'Constant +5% to all gens',
                apply: (m) => E.glob(m, 1.05) },
              { name: 'Graviton Web',       desc: 'Pull applies to offline',
                apply: (m) => E.offlineRateMul(m, 1.5) },
              { name: 'Singularity Garden', desc: 'Bloom SPS = universal multiplier',
                apply: (m, s) => E.glob(m, 1 + Math.min(2, (s.generators.stellarBloom?.count || 0) * 0.05)) },
              { name: 'The Great Attractor',desc: 'Bloom ×10 · all gens +10% to Bloom',
                apply: (m) => { E.gen(m, 'stellarBloom', 10); E.glob(m, 1.1); } },
            ],
          },
          B: {
            label: 'Void Bloom',
            philosophy: 'Grows in nothing. Needs nothing.',
            tiers: [
              { name: 'Null Substrate',    desc: 'Bloom +50% when idle 120s',
                apply: (m) => E.idleBonus(m, 1.3) },
              { name: 'Absence Harvest',   desc: 'Void bonus +100%',
                apply: (m) => E.idleBonus(m, 1.5) },
              { name: 'Silence Resonance', desc: 'Offline rate ×3 for Bloom',
                apply: (m) => E.offlineRateMul(m, 2) },
              { name: 'Dark Patience',     desc: 'Idle bonus applies to all gens',
                apply: (m) => E.idleBonus(m, 1.3) },
              { name: 'The Quiet Empire',  desc: 'Idle bonus +30% all gens',
                apply: (m) => E.glob(m, 1.3) },
              { name: 'Absolute Void',     desc: 'Offline cap 72h · rate ×5',
                apply: (m) => { E.offlineCapAdd(m, 64 * 3600); E.offlineRateMul(m, 5); } },
              { name: 'Void Ascendant',    desc: 'Bloom ×10 · idle ×3 · offline uncapped',
                apply: (m) => { E.gen(m, 'stellarBloom', 10); E.idleBonus(m, 2); E.offlineCapAdd(m, 168 * 3600); } },
            ],
          },
        },
      },
    },
  },

  // ════════════════════════════════════════════════════════════════
  // TREE 6 — Cosmic Spore (C = 1,400,000)
  // ════════════════════════════════════════════════════════════════
  cosmicSpore: {
    label: 'Cosmic Spore', tabShort: 'Cosmic', gen: 'cosmicSpore', baseC: 1400000,
    description: 'A galaxy-spanning entity. Time and space bend.',
    shared: [
      { name: 'Galactic Dispersal',  desc: 'Cosmic SPS ×2',
        flavour: 'A spore the size of a moon.',
        apply: (m) => E.gen(m, 'cosmicSpore', 2) },
      { name: 'Dimensional Seeding', desc: 'Cosmic SPS ×2 · -2% Bloom cost per Cosmic',
        flavour: 'Other realities. Other soils.',
        apply: (m, s) => { E.gen(m, 'cosmicSpore', 2); E.costRed(m, s, 'stellarBloom', 'cosmicSpore', 0.02); } },
      { name: 'Universal Substrate', desc: 'Cosmic SPS ×3 · all gens +2% per Cosmic',
        flavour: 'The universe itself becomes fertile.',
        apply: (m, s) => { E.gen(m, 'cosmicSpore', 3); E.allGensPctPerSource(m, s, 'cosmicSpore', 0.02); } },
    ],
    branches: {
      red: {
        label: 'Universal Infection', icon: '🔴',
        philosophy: 'Spread. Consume. Repeat. Forever.',
        tiers: [
          { name: 'Dimensional Breach', desc: 'Cosmic ×2 · +5% SPS',
            apply: (m) => { E.gen(m, 'cosmicSpore', 2); E.glob(m, 1.05); } },
          { name: 'Reality Seepage',    desc: 'Cosmic ×2 · +3% per Cosmic',
            apply: (m, s) => { E.gen(m, 'cosmicSpore', 2); E.allGensPctPerSource(m, s, 'cosmicSpore', 0.03); } },
          { name: 'Planar Corruption',  desc: 'Random gen gets ×3 for 20s every 60s',
            apply: (m) => E.glob(m, 1.1) },
          { name: 'Infectious Bloom',   desc: 'Corruption affects all gens simultaneously',
            apply: (m) => E.glob(m, 1.1) },
          { name: 'Omni-Infection',     desc: 'Infection every 30s · duration 30s',
            apply: (m) => E.glob(m, 1.15) },
        ],
        subs: {
          A: {
            label: 'Dimensional Breach',
            philosophy: 'Other dimensions. Other farms.',
            tiers: [
              { name: 'Parallel Mycelium', desc: 'Shadow dim produces 10% of all SPS',
                apply: (m) => E.glob(m, 1.1) },
              { name: 'Dimensional Tap',   desc: 'Shadow SPS rises to 25%',
                apply: (m) => E.glob(m, 1.15) },
              { name: 'Rift Harvest',      desc: 'Rifts open randomly: ×5 SPS 10s',
                apply: (m) => E.gen(m, 'cosmicSpore', 2) },
              { name: 'Multiverse Web',    desc: 'Shadow doubles per dimension (cap ×8)',
                apply: (m) => E.gen(m, 'cosmicSpore', 2) },
              { name: 'Reality Overlap',   desc: 'Breach bonus applies offline',
                apply: (m) => E.offlineRateMul(m, 2) },
              { name: 'Dimensional Flood', desc: 'Shadow = 50% of all SPS',
                apply: (m) => E.glob(m, 1.5) },
              { name: 'Omniversal Spore',  desc: 'Shadow = 100% (doubles everything)',
                apply: (m) => E.glob(m, 2) },
            ],
          },
          B: {
            label: 'Reality Corruption',
            philosophy: 'Physics is negotiable.',
            tiers: [
              { name: 'Physics Glitch',    desc: 'Random gen ×10 for 5s per minute',
                apply: (m) => E.glob(m, 1.1) },
              { name: 'Law Erosion',       desc: '×10 event applies to all gens',
                apply: (m) => E.glob(m, 1.1) },
              { name: 'Causality Break',   desc: 'Events every 30s',
                apply: (m) => E.glob(m, 1.15) },
              { name: 'Reality Unravel',   desc: 'Cosmic ×5 · corruption ×20',
                apply: (m) => E.gen(m, 'cosmicSpore', 5) },
              { name: 'Entropy Override',  desc: 'Free next purchase (once per 10min)',
                apply: (m) => { for (const id of GEN_IDS) m.costRedPct[id] += 0.05; } },
              { name: 'Thermodynamic Lie', desc: '+0.01% global per past purchase',
                apply: (m, s) => E.glob(m, 1 + Math.min(2, totalGenCount(s) * 0.0001)) },
              { name: 'The Broken Law',    desc: 'Cosmic ×10 · global ×3 · costs -25%',
                apply: (m) => {
                  E.gen(m, 'cosmicSpore', 10); E.glob(m, 3);
                  for (const id of GEN_IDS) m.costRedPct[id] += 0.25;
                } },
            ],
          },
        },
      },
      blue: {
        label: 'Galactic Patience', icon: '🔵',
        philosophy: 'It does not hurry. It wins anyway.',
        tiers: [
          { name: 'Interstellar Drift',  desc: 'Cosmic ×2 · offline rate ×1.5',
            apply: (m) => { E.gen(m, 'cosmicSpore', 2); E.offlineRateMul(m, 1.5); } },
          { name: 'Cosmic Accumulation', desc: 'Cosmic scales with total spores',
            apply: (m, s) => E.gen(m, 'cosmicSpore', 1 + Math.min(3, (s.totalSporesEarned || 0) / 1e9 * 0.0001)) },
          { name: 'Deep Time Harvest',   desc: 'Offline cap: 48h',
            apply: (m) => E.offlineCapAdd(m, 40 * 3600) },
          { name: 'Universal Patience',  desc: 'Cosmic ×2 · idle ×2 all gens',
            apply: (m) => { E.gen(m, 'cosmicSpore', 2); E.idleBonus(m, 1.5); } },
          { name: 'Entropy Garden',      desc: 'Cosmic +×1.5 rate offline',
            apply: (m) => { E.gen(m, 'cosmicSpore', 1.5); E.offlineRateMul(m, 1.5); } },
        ],
        subs: {
          A: {
            label: 'Entropy Garden',
            philosophy: 'Profits from the inevitable decline.',
            tiers: [
              { name: 'Thermodynamic Farm', desc: 'Entropy +0.01%/min played (no cap)',
                apply: (m) => E.gen(m, 'cosmicSpore', 1.5) },
              { name: 'Heat Sink',          desc: 'Entropy rate ×3',
                apply: (m) => E.gen(m, 'cosmicSpore', 1.5) },
              { name: 'Disorder Harvest',   desc: 'Entropy bonus applies to all gens',
                apply: (m) => E.glob(m, 1.15) },
              { name: 'Cosmic Rot',         desc: 'Cosmic ×3 · entropy ×5',
                apply: (m) => E.gen(m, 'cosmicSpore', 3) },
              { name: 'Second Law Triumph', desc: 'Entropy retroactive',
                apply: (m) => E.gen(m, 'cosmicSpore', 2) },
              { name: 'Absolute Zero Farm', desc: 'Entropy uncapped · offline',
                apply: (m) => { E.gen(m, 'cosmicSpore', 1.5); E.offlineRateMul(m, 2); } },
              { name: 'Heat Death Lord',    desc: 'Cosmic ×10 · entropy ×10 · offline=online',
                apply: (m) => { E.gen(m, 'cosmicSpore', 10); E.offlineRateMul(m, 3); } },
            ],
          },
          B: {
            label: 'Heat Death Bloom',
            philosophy: 'At the end of all things, only spores remain.',
            tiers: [
              { name: 'Final Epoch',      desc: 'Cosmic ×3 · end-state when all gens T9+',
                apply: (m) => E.gen(m, 'cosmicSpore', 3) },
              { name: 'Universal Winter', desc: 'End-state: +50% all SPS',
                apply: (m) => E.glob(m, 1.2) },
              { name: 'Last Warmth',      desc: 'SPS scales with milestones ×5% each',
                apply: (m, s) => E.glob(m, 1 + (s.milestonesSeen?.length || 0) * 0.05) },
              { name: 'Cold Light',       desc: 'Cosmic ×2 · milestone ×3',
                apply: (m, s) => { E.gen(m, 'cosmicSpore', 2); E.glob(m, 1 + (s.milestonesSeen?.length || 0) * 0.03); } },
              { name: 'The Final Bloom',  desc: 'Completing this tree: cosmetic',
                apply: (m) => E.glob(m, 1.2) },
              { name: 'Remnant God',      desc: 'All gens produce full rate offline forever',
                apply: (m) => { E.offlineCapAdd(m, 168 * 3600); E.offlineRateMul(m, 2); } },
              { name: 'After Everything', desc: 'Global ×5 · SPC ×10',
                apply: (m) => { E.glob(m, 5); E.spcMul(m, 10); } },
            ],
          },
        },
      },
    },
  },
};

const TREE_IDS = Object.keys(TREE_DATA);

const SPECIAL_UPGRADES = {
  holdAutoClick: {
    name: 'Grasping Hyphae',
    cost: 150,
    desc: 'Holding the mushroom releases a click every 0.5s',
    flavour: 'The hand no longer has to let go.',
  },
};

function defaultSpecialUpgrades() {
  return {
    holdAutoClick: false,
  };
}

// Resolve costs and attach tierIndex (T1..T15) for every tier across every tree.
(function attachCostsAndIndices() {
  for (const treeId of TREE_IDS) {
    const tree = TREE_DATA[treeId];
    const isClicker = treeId === 'clicker';
    const baseC = tree.baseC || 0;

    tree.shared.forEach((t, i) => {
      t.tierIndex = i; // T1=0, T2=1, T3=2
      if (!isClicker && t.cost == null) t.cost = Math.round(baseC * GEN_COST_MULT[i]);
    });

    for (const branchKey of ['red', 'blue']) {
      const branch = tree.branches[branchKey];
      branch.tiers.forEach((t, i) => {
        t.tierIndex = 3 + i; // T4..T8
        if (!isClicker && t.cost == null) t.cost = Math.round(baseC * GEN_COST_MULT[3 + i]);
      });
      for (const subKey of ['A', 'B']) {
        branch.subs[subKey].tiers.forEach((t, i) => {
          t.tierIndex = 8 + i; // T9..T15
          if (!isClicker && t.cost == null) t.cost = Math.round(baseC * GEN_COST_MULT[8 + i]);
        });
      }
    }
  }
})();

// ─── Milestones ────────────────────────────────────────────────────

const MILESTONES = [
  { id: 'firstClick',  msg: 'A single spore falls. It will not be the last.',
    check: s => s.totalClicks >= 1 },
  { id: 'firstBuy',    msg: 'Roots stretch into the dark.',
    check: s => GENERATORS.some(g => s.generators[g.id].count > 0) },
  { id: 'hundred',     msg: 'The soil remembers you.',
    check: s => s.totalSporesEarned >= 100 },
  { id: 'thousand',    msg: 'Something stirs beneath the forest floor.',
    check: s => s.totalSporesEarned >= 1000 },
  { id: 'tenThousand', msg: 'Local wildlife has begun to act… differently.',
    check: s => s.totalSporesEarned >= 10000 },
  { id: 'million',     msg: 'A city reports unusual fungal growth. They are not concerned. Yet.',
    check: s => s.totalSporesEarned >= 1000000 },
  { id: 'billion',     msg: 'Earth is merely the beginning.',
    check: s => s.totalSporesEarned >= 1000000000 },
  { id: 'firstCosmic', msg: 'The stars themselves begin to smell of mushrooms.',
    check: s => s.generators.cosmicSpore.count >= 1 },
  { id: 'firstBranch', msg: 'A path is chosen. The other fades.',
    check: s => Object.values(s.trees).some(t => t.branch1) },
  { id: 'firstTerminal', msg: 'You walk the deep end of a tree. Few do.',
    check: s => Object.values(s.trees).some(t => t.branch2) },
  { id: 'fifteenth',   msg: 'A tree completes. Something in the lattice notices.',
    check: s => Object.values(s.trees).some(t => Object.values(t.tiers).filter(Boolean).length >= 15) },
];

// ─── State ─────────────────────────────────────────────────────────

function defaultState() {
  const generators = {};
  for (const g of GENERATORS) generators[g.id] = { count: 0, cost: g.baseCost };
  const trees = {};
  for (const id of TREE_IDS) trees[id] = { tiers: {}, branch1: null, branch2: null };
  return {
    version: SAVE_VERSION,
    spores: 0,
    totalSporesEarned: 0,
    totalClicks: 0,
    passiveSpsFromClicks: 0,
    lastSave: Date.now(),
    lastClickAt: 0,
    specialUpgrades: defaultSpecialUpgrades(),
    generators,
    trees,
    milestonesSeen: [],
    eventLog: [],
  };
}

let state = defaultState();
let activeTreeId = 'clicker';

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    const fresh = defaultState();

    // v1 → v2 migration: keep spores/generators/milestones/log, drop old upgrades.
    if (parsed.version === 1) {
      state = {
        ...fresh,
        spores: parsed.spores || 0,
        totalSporesEarned: parsed.totalSporesEarned || 0,
        totalClicks: parsed.totalClicks || 0,
        lastSave: parsed.lastSave || Date.now(),
        specialUpgrades: { ...fresh.specialUpgrades, ...(parsed.specialUpgrades || {}) },
        generators: { ...fresh.generators, ...(parsed.generators || {}) },
        milestonesSeen: Array.isArray(parsed.milestonesSeen) ? parsed.milestonesSeen : [],
        eventLog: Array.isArray(parsed.eventLog) ? parsed.eventLog : [],
      };
    } else if (parsed.version === SAVE_VERSION) {
      // merge trees carefully
      const mergedTrees = { ...fresh.trees };
      if (parsed.trees) {
        for (const id of TREE_IDS) {
          const incoming = parsed.trees[id];
          if (incoming) {
            mergedTrees[id] = {
              tiers: incoming.tiers || {},
              branch1: incoming.branch1 || null,
              branch2: incoming.branch2 || null,
            };
          }
        }
      }
      state = {
        ...fresh,
        ...parsed,
        specialUpgrades: { ...fresh.specialUpgrades, ...(parsed.specialUpgrades || {}) },
        generators: { ...fresh.generators, ...(parsed.generators || {}) },
        trees: mergedTrees,
        milestonesSeen: Array.isArray(parsed.milestonesSeen) ? parsed.milestonesSeen : [],
        eventLog: Array.isArray(parsed.eventLog) ? parsed.eventLog : [],
      };
    } else {
      return false;
    }

    // Recompute canonical generator costs after multipliers might apply.
    refreshGeneratorCosts();
    return true;
  } catch (err) {
    console.warn('Save failed to load:', err);
    return false;
  }
}

function save() {
  state.lastSave = Date.now();
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('Save failed:', err);
  }
}

// ─── State helpers ─────────────────────────────────────────────────

function totalGenCount(s = state) {
  let n = 0;
  for (const id of GEN_IDS) n += s.generators[id]?.count || 0;
  return n;
}

function uniqueGenTypes(s = state) {
  let n = 0;
  for (const id of GEN_IDS) if ((s.generators[id]?.count || 0) > 0) n++;
  return n;
}

function totalUpgradesPurchased(s = state) {
  let n = 0;
  for (const id of TREE_IDS) {
    const tiers = s.trees[id]?.tiers || {};
    for (const k of Object.keys(tiers)) if (tiers[k]) n++;
  }
  return n;
}

function genBalanceWithin(s, tolerance) {
  const counts = GEN_IDS.map(id => s.generators[id]?.count || 0).filter(c => c > 0);
  if (counts.length < GEN_IDS.length) return false;
  const min = Math.min(...counts);
  const max = Math.max(...counts);
  return (max - min) / max <= tolerance;
}

function allGensCompletedShared(s) {
  for (const id of GEN_IDS) {
    const tree = s.trees[id];
    if (!tree) return false;
    if (!tree.tiers[0] || !tree.tiers[1] || !tree.tiers[2]) return false;
  }
  return true;
}

function baseGenUnit(id) {
  return (GENERATORS.find(g => g.id === id) || { baseSPS: 0 }).baseSPS;
}

// Tier objects purchased in a given tree, in T1..T15 order.
function purchasedTiers(treeId) {
  const tree = TREE_DATA[treeId];
  const ts = state.trees[treeId];
  const out = [];
  for (let i = 0; i < 3; i++) {
    if (ts.tiers[i]) out.push(tree.shared[i]);
  }
  const branch1 = ts.branch1;
  if (branch1) {
    const b = tree.branches[branch1];
    for (let i = 0; i < 5; i++) {
      if (ts.tiers[3 + i]) out.push(b.tiers[i]);
    }
    const branch2 = ts.branch2;
    if (branch2) {
      const sub = b.subs[branch2];
      for (let i = 0; i < 7; i++) {
        if (ts.tiers[8 + i]) out.push(sub.tiers[i]);
      }
    }
  }
  return out;
}

function getTierByIndex(treeId, tierIndex) {
  const tree = TREE_DATA[treeId];
  const ts = state.trees[treeId];
  if (tierIndex < 3) return tree.shared[tierIndex];
  if (tierIndex < 8) {
    const b = ts.branch1 && tree.branches[ts.branch1];
    return b ? b.tiers[tierIndex - 3] : null;
  }
  const b = ts.branch1 && tree.branches[ts.branch1];
  const sub = b && ts.branch2 && b.subs[ts.branch2];
  return sub ? sub.tiers[tierIndex - 8] : null;
}

// ─── Effects engine ────────────────────────────────────────────────

let cachedMults = null;
let multsDirty = true;

function markMultsDirty() { multsDirty = true; }

function getMults() {
  if (!multsDirty && cachedMults) return cachedMults;
  const m = emptyMults();
  for (const treeId of TREE_IDS) {
    const tiers = purchasedTiers(treeId);
    for (const t of tiers) {
      try { t.apply(m, state); }
      catch (err) { console.warn('apply failed', treeId, t.name, err); }
    }
  }
  // Cap cost reductions per generator.
  for (const id of GEN_IDS) {
    if (m.costRedPct[id] > MAX_COST_REDUCTION) m.costRedPct[id] = MAX_COST_REDUCTION;
    if (m.costRedPct[id] < 0) m.costRedPct[id] = 0;
  }
  cachedMults = m;
  multsDirty = false;
  return m;
}

function isIdle(s = state) {
  return s.lastClickAt > 0 && (Date.now() - s.lastClickAt) > 60000;
}

function getGeneratorUnitSPS(genId) {
  const m = getMults();
  const def = GENERATORS.find(g => g.id === genId);
  const idleMul = isIdle() ? m.idleBonusMul : 1;
  return def.baseSPS * m.genMul[genId] * (1 + m.genAddPct[genId]) * m.globalMul * idleMul;
}

function getGeneratorSPS(genId) {
  return getGeneratorUnitSPS(genId) * state.generators[genId].count;
}

function getTotalSPS() {
  let total = 0;
  for (const g of GENERATORS) total += getGeneratorSPS(g.id);
  total += state.passiveSpsFromClicks;
  return total;
}

function getSPC() {
  const m = getMults();
  const base = 1 + totalGenCount() * 0.1;
  let spc = (base + m.spcAdd) * m.spcMul;
  spc += state.totalClicks * m.spcPerLifetimeClick * m.spcMul;
  return Math.max(1, spc);
}

function getOfflineCap() {
  return BASE_OFFLINE_CAP_SECONDS + getMults().offlineCapAdd;
}

function getOfflineRateMul() {
  return getMults().offlineRateMul;
}

function getGeneratorCost(genId) {
  const def = GENERATORS.find(g => g.id === genId);
  const count = state.generators[genId].count;
  const m = getMults();
  const raw = def.baseCost * Math.pow(COST_GROWTH, count);
  const reduced = raw * (1 - m.costRedPct[genId]);
  return Math.max(1, Math.ceil(reduced));
}

function refreshGeneratorCosts() {
  for (const g of GENERATORS) {
    state.generators[g.id].cost = getGeneratorCost(g.id);
  }
}

// ─── Purchasing ────────────────────────────────────────────────────

function awardSpores(n) {
  if (!isFinite(n) || n <= 0) return;
  state.spores += n;
  state.totalSporesEarned += n;
}

function hasHoldAutoClick() {
  return !!state.specialUpgrades?.holdAutoClick;
}

function handleClick(ev) {
  const spc = getSPC();
  awardSpores(spc);
  state.totalClicks++;
  state.lastClickAt = Date.now();
  state.passiveSpsFromClicks += getMults().spsPerClickRate;
  spawnFloat(ev, spc);
  triggerSquish();
  checkMilestones();
  render();
}

function buySpecialUpgrade(id) {
  const upgrade = SPECIAL_UPGRADES[id];
  if (!upgrade) return;
  state.specialUpgrades = { ...defaultSpecialUpgrades(), ...(state.specialUpgrades || {}) };
  if (state.specialUpgrades[id]) return;
  if (state.spores < upgrade.cost) return;
  state.spores -= upgrade.cost;
  state.specialUpgrades[id] = true;
  logEvent(`${upgrade.name} takes root. The hand learns to linger.`);
  render();
}

function buyGenerator(genId) {
  const cost = getGeneratorCost(genId);
  const entry = state.generators[genId];
  if (state.spores < cost) return;
  state.spores -= cost;
  entry.count++;
  markMultsDirty();
  entry.cost = getGeneratorCost(genId);
  flashGenerator(genId);
  checkMilestones();
  render();
}

function isTierUnlocked(treeId, tierIndex) {
  const tree = TREE_DATA[treeId];
  const ts = state.trees[treeId];
  // Tree unlock: clicker always unlocked; others require owning the gen.
  if (tree.gen && (state.generators[tree.gen]?.count || 0) < 1) return false;
  if (tierIndex === 0) return true;
  // Previous tier must be purchased
  if (!ts.tiers[tierIndex - 1]) return false;
  // Branch transitions require the branch choice made
  if (tierIndex >= 3 && tierIndex < 8 && !ts.branch1) return false;
  if (tierIndex >= 8 && !ts.branch2) return false;
  return true;
}

function buyTier(treeId, tierIndex) {
  const tier = getTierByIndex(treeId, tierIndex);
  if (!tier) return;
  const ts = state.trees[treeId];
  if (ts.tiers[tierIndex]) return;
  if (!isTierUnlocked(treeId, tierIndex)) return;
  if (state.spores < tier.cost) return;
  state.spores -= tier.cost;
  ts.tiers[tierIndex] = true;
  markMultsDirty();
  refreshGeneratorCosts();
  checkMilestones();
  render();
}

function commitBranch1(treeId, choice) {
  const ts = state.trees[treeId];
  if (ts.branch1) return;
  if (!ts.tiers[2]) return; // need T3 purchased
  ts.branch1 = choice;
  markMultsDirty();
  logEvent(`A path was committed in the ${TREE_DATA[treeId].label} tree.`);
  render();
}

function commitBranch2(treeId, choice) {
  const ts = state.trees[treeId];
  if (ts.branch2) return;
  if (!ts.tiers[7]) return; // need T8 purchased
  ts.branch2 = choice;
  markMultsDirty();
  logEvent(`A deeper path opens in the ${TREE_DATA[treeId].label} tree.`);
  render();
}

// ─── Milestones / log ──────────────────────────────────────────────

function logEvent(msg) {
  state.eventLog.unshift({ msg, t: Date.now() });
  if (state.eventLog.length > LOG_MAX) state.eventLog.length = LOG_MAX;
}

function checkMilestones() {
  for (const m of MILESTONES) {
    if (state.milestonesSeen.includes(m.id)) continue;
    if (m.check(state)) {
      state.milestonesSeen.push(m.id);
      logEvent(m.msg);
    }
  }
}

// ─── Formatting ────────────────────────────────────────────────────

function fmt(n) {
  if (!isFinite(n)) return '∞';
  const abs = Math.abs(n);
  if (abs < Number.MAX_SAFE_INTEGER) {
    if (abs > 0 && abs < 10 && abs !== Math.floor(abs)) return n.toFixed(1);
    if (abs >= 1e6) {
      // abbreviate big numbers
      return abbr(n);
    }
    return Math.floor(n).toLocaleString('en-US');
  }
  return abbr(n);
}

function abbr(n) {
  const suffixes = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
  const abs = Math.abs(n);
  if (abs < 1000) return n.toFixed(0);
  const tier = Math.min(Math.floor(Math.log10(abs) / 3), suffixes.length - 1);
  const scaled = n / Math.pow(10, tier * 3);
  const digits = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
  return scaled.toFixed(digits) + suffixes[tier];
}

function fmtTime(t) {
  return new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const $ = (id) => document.getElementById(id);

// ─── UI: Generators ────────────────────────────────────────────────

function buildGenerators() {
  const root = $('generators');
  root.innerHTML = '';
  for (const g of GENERATORS) {
    const card = document.createElement('div');
    card.className = 'gen-card';
    card.dataset.gen = g.id;
    card.innerHTML = `
      <div class="gen-head">
        <span class="gen-name">${g.name}</span>
        <span class="gen-count" data-count>0</span>
      </div>
      <div class="gen-flavour">${g.flavour}</div>
      <div class="gen-stats">
        <span class="gen-cost" data-cost>—</span>
        <span class="gen-sps" data-sps>—</span>
      </div>`;
    card.addEventListener('click', () => buyGenerator(g.id));
    root.appendChild(card);
  }
}

function updateGenerators() {
  for (const g of GENERATORS) {
    const entry = state.generators[g.id];
    const cost = getGeneratorCost(g.id);
    const card = document.querySelector(`.gen-card[data-gen="${g.id}"]`);
    card.classList.toggle('disabled', state.spores < cost);
    card.querySelector('[data-count]').textContent = entry.count;
    card.querySelector('[data-cost]').textContent  = fmt(cost) + ' 🍄';
    card.querySelector('[data-sps]').textContent   = fmt(getGeneratorUnitSPS(g.id)) + '/s each';
  }
}

// ─── UI: Trees ─────────────────────────────────────────────────────

function treeUnlocked(treeId) {
  const tree = TREE_DATA[treeId];
  if (!tree.gen) return true;
  return (state.generators[tree.gen]?.count || 0) >= 1;
}

function treeProgress(treeId) {
  const ts = state.trees[treeId];
  let n = 0;
  for (let i = 0; i < 15; i++) if (ts.tiers[i]) n++;
  return n;
}

function buildTreeTabs() {
  const root = $('tree-tabs');
  root.innerHTML = '';
  for (const id of TREE_IDS) {
    const tree = TREE_DATA[id];
    const tab = document.createElement('div');
    tab.className = 'tree-tab';
    tab.dataset.tree = id;
    tab.innerHTML = `
      <div>${tree.tabShort}</div>
      <span class="tab-progress" data-progress>0/15</span>`;
    tab.addEventListener('click', () => {
      if (!treeUnlocked(id)) return;
      activeTreeId = id;
      renderTreeTabs();
      renderTreePanel();
    });
    root.appendChild(tab);
  }
}

function renderTreeTabs() {
  for (const id of TREE_IDS) {
    const tab = document.querySelector(`.tree-tab[data-tree="${id}"]`);
    if (!tab) continue;
    tab.classList.toggle('active', activeTreeId === id);
    tab.classList.toggle('locked', !treeUnlocked(id));
    tab.querySelector('[data-progress]').textContent = `${treeProgress(id)}/15`;
  }
}

function renderTreePanel() {
  const panel = $('tree-panel');
  const tree = TREE_DATA[activeTreeId];
  const ts = state.trees[activeTreeId];

  if (!treeUnlocked(activeTreeId)) {
    const g = tree.gen ? GENERATORS.find(x => x.id === tree.gen) : null;
    panel.innerHTML = `
      <div class="tree-locked-msg">
        🔒 Build at least one <strong>${g ? g.name : 'generator'}</strong> to unlock this tree.
      </div>`;
    return;
  }

  let html = '';

  if (activeTreeId === 'clicker') {
    html += `<div class="tree-section-label">Reflex Growth</div>`;
    html += specialUpgradeHTML('holdAutoClick');
  }

  // Shared tiers T1-T3
  html += `<div class="tree-section-label">Shared Foundation</div>`;
  for (let i = 0; i < 3; i++) {
    html += tierCardHTML(activeTreeId, i, tree.shared[i], 'shared');
  }

  // Branch 1 choice or chosen branch
  if (!ts.branch1) {
    if (ts.tiers[2]) {
      html += branchChoiceHTML(activeTreeId, 1, tree.branches.red, tree.branches.blue);
    } else {
      html += `<div class="tree-section-label">— branch awaits T3 —</div>`;
    }
  } else {
    const branch = tree.branches[ts.branch1];
    const branchClass = ts.branch1 === 'red' ? 'branch-red' : 'branch-blue';
    html += `<div class="tree-section-label">${branch.label}</div>`;
    for (let i = 0; i < 5; i++) {
      html += tierCardHTML(activeTreeId, 3 + i, branch.tiers[i], branchClass);
    }
    // Branch 2
    if (!ts.branch2) {
      if (ts.tiers[7]) {
        html += branchChoiceHTML(activeTreeId, 2, branch.subs.A, branch.subs.B, branch.label);
      } else {
        html += `<div class="tree-section-label">— deeper branch awaits T8 —</div>`;
      }
    } else {
      const sub = branch.subs[ts.branch2];
      html += `<div class="tree-section-label">${sub.label}</div>`;
      for (let i = 0; i < 7; i++) {
        html += tierCardHTML(activeTreeId, 8 + i, sub.tiers[i], branchClass);
      }
    }
  }

  panel.innerHTML = html;

  // Wire purchase clicks
  panel.querySelectorAll('.tier-card[data-tier]').forEach(el => {
    el.addEventListener('click', () => {
      const ti = parseInt(el.dataset.tier, 10);
      buyTier(activeTreeId, ti);
    });
  });
  panel.querySelectorAll('.tier-card[data-special-upgrade]').forEach(el => {
    el.addEventListener('click', () => {
      buySpecialUpgrade(el.dataset.specialUpgrade);
    });
  });
  // Wire branch commit clicks
  panel.querySelectorAll('[data-commit-branch]').forEach(el => {
    el.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const branchNum = parseInt(el.dataset.commitBranch, 10);
      const choice = el.dataset.commitChoice;
      if (branchNum === 1) commitBranch1(activeTreeId, choice);
      else commitBranch2(activeTreeId, choice);
    });
  });
}

function specialUpgradeHTML(id) {
  const upgrade = SPECIAL_UPGRADES[id];
  const purchased = !!state.specialUpgrades?.[id];
  const canAfford = state.spores >= upgrade.cost;
  let cls = 'tier-card special-upgrade-card';
  if (purchased) cls += ' purchased';
  else if (canAfford) cls += ' affordable';
  else cls += ' poor';

  return `
    <div class="${cls}" data-special-upgrade="${id}">
      <div class="tier-head">
        <span><span class="tier-no">HOLD</span><span class="tier-name">${upgrade.name}</span></span>
        <span class="tier-cost">${fmt(upgrade.cost)} 🍄</span>
      </div>
      <div class="tier-desc">${upgrade.desc}</div>
      <div class="tier-flavour">${upgrade.flavour}</div>
    </div>`;
}

function tierCardHTML(treeId, tierIndex, tier, classExtra) {
  if (!tier) return '';
  const ts = state.trees[treeId];
  const purchased = !!ts.tiers[tierIndex];
  const unlocked = isTierUnlocked(treeId, tierIndex);
  const canAfford = state.spores >= tier.cost;
  let cls = 'tier-card ' + (classExtra || '');
  if (purchased) cls += ' purchased';
  else if (!unlocked) cls += ' locked';
  else if (canAfford) cls += ' affordable';
  else cls += ' poor';

  const flavour = tier.flavour ? `<div class="tier-flavour">${tier.flavour}</div>` : '';
  return `
    <div class="${cls}" data-tier="${tierIndex}">
      <div class="tier-head">
        <span><span class="tier-no">T${tierIndex + 1}</span><span class="tier-name">${tier.name}</span></span>
        <span class="tier-cost">${fmt(tier.cost)} 🍄</span>
      </div>
      <div class="tier-desc">${tier.desc}</div>
      ${flavour}
    </div>`;
}

function branchChoiceHTML(treeId, branchNum, optA, optB, parentLabel) {
  const aColor = branchNum === 1 ? 'red' : 'red';
  const bColor = branchNum === 1 ? 'blue' : 'blue';
  const aChoice = branchNum === 1 ? 'red' : 'A';
  const bChoice = branchNum === 1 ? 'blue' : 'B';
  const previewA = optA.tiers ? optA.tiers[0] : null;
  const previewB = optB.tiers ? optB.tiers[0] : null;
  const title = branchNum === 1 ? 'Choose Your Path' : `Choose Your Depth — ${parentLabel || ''}`;
  return `
    <div class="branch-choice">
      <div class="branch-choice-title">${title}</div>
      <div class="branch-choice-warning">⚠ This choice is permanent. The other path will be sealed forever.</div>
      <div class="branch-choice-grid">
        <div class="branch-card ${aColor}">
          <div class="branch-card-label">${optA.label}</div>
          <div class="branch-card-phil">${optA.philosophy}</div>
          ${previewA ? `<div class="branch-card-preview">Next: <strong>${previewA.name}</strong> — ${previewA.desc}</div>` : ''}
          <button class="branch-commit-btn" data-commit-branch="${branchNum}" data-commit-choice="${aChoice}">Commit</button>
        </div>
        <div class="branch-card ${bColor}">
          <div class="branch-card-label">${optB.label}</div>
          <div class="branch-card-phil">${optB.philosophy}</div>
          ${previewB ? `<div class="branch-card-preview">Next: <strong>${previewB.name}</strong> — ${previewB.desc}</div>` : ''}
          <button class="branch-commit-btn" data-commit-branch="${branchNum}" data-commit-choice="${bChoice}">Commit</button>
        </div>
      </div>
    </div>`;
}

// Fast path: when nothing structural changed, update only affordability state.
function updateTreePanelLight() {
  const panel = $('tree-panel');
  panel.querySelectorAll('.tier-card[data-special-upgrade]').forEach(el => {
    const id = el.dataset.specialUpgrade;
    const upgrade = SPECIAL_UPGRADES[id];
    if (!upgrade) return;
    const purchased = !!state.specialUpgrades?.[id];
    const canAfford = state.spores >= upgrade.cost;
    let state2;
    if (purchased) state2 = 'purchased';
    else if (canAfford) state2 = 'affordable';
    else state2 = 'poor';
    el.classList.remove('purchased', 'locked', 'affordable', 'poor');
    el.classList.add(state2);
  });

  panel.querySelectorAll('.tier-card[data-tier]').forEach(el => {
    const ti = parseInt(el.dataset.tier, 10);
    const ts = state.trees[activeTreeId];
    const purchased = !!ts.tiers[ti];
    const unlocked = isTierUnlocked(activeTreeId, ti);
    const tier = getTierByIndex(activeTreeId, ti);
    if (!tier) return;
    const canAfford = state.spores >= tier.cost;
    let state2;
    if (purchased) state2 = 'purchased';
    else if (!unlocked) state2 = 'locked';
    else if (canAfford) state2 = 'affordable';
    else state2 = 'poor';
    el.classList.remove('purchased', 'locked', 'affordable', 'poor');
    el.classList.add(state2);
  });
}

let lastTreeStructureKey = '';
function treeStructureKey() {
  // Rebuild panel when branches change or tier-purchased set changes structurally.
  const ts = state.trees[activeTreeId];
  let key = `${activeTreeId}|${ts.branch1}|${ts.branch2}|${treeUnlocked(activeTreeId) ? '1' : '0'}|`;
  for (let i = 0; i < 15; i++) key += ts.tiers[i] ? '1' : '0';
  if (activeTreeId === 'clicker') key += `|hold:${hasHoldAutoClick() ? '1' : '0'}`;
  return key;
}

// ─── Log render ────────────────────────────────────────────────────

function renderLog() {
  const root = $('event-log');
  let html = '';
  for (const e of state.eventLog) {
    html += `<div class="log-entry"><span class="log-msg">${e.msg}</span><span class="log-time">${fmtTime(e.t)}</span></div>`;
  }
  root.innerHTML = html;
}

// ─── Main render ───────────────────────────────────────────────────

let lastLogLen = -1;
function render() {
  $('spore-count').textContent = fmt(state.spores);
  $('sps-display').textContent = fmt(getTotalSPS());
  $('spc-display').textContent = fmt(getSPC());
  updateGenerators();
  renderTreeTabs();
  const k = treeStructureKey();
  if (k !== lastTreeStructureKey) {
    renderTreePanel();
    lastTreeStructureKey = k;
  } else {
    updateTreePanelLight();
  }
  if (state.eventLog.length !== lastLogLen) {
    renderLog();
    lastLogLen = state.eventLog.length;
  }
}

// ─── FX ────────────────────────────────────────────────────────────

function triggerSquish() {
  const m = $('mushroom');
  m.classList.remove('clicked');
  void m.offsetWidth;
  m.classList.add('clicked');
}

function flashGenerator(genId) {
  const card = document.querySelector(`.gen-card[data-gen="${genId}"]`);
  if (!card) return;
  card.classList.remove('bought-flash');
  void card.offsetWidth;
  card.classList.add('bought-flash');
}

function spawnFloat(ev, n) {
  const layer = $('float-layer');
  const rect = layer.getBoundingClientRect();
  const point = ev && Number.isFinite(ev.clientX) && Number.isFinite(ev.clientY)
    ? ev
    : getClickAreaCenter();
  const x = point.clientX - rect.left;
  const y = point.clientY - rect.top;
  const el = document.createElement('div');
  el.className = 'float-num';
  el.textContent = '+' + fmt(n);
  el.style.left = x + 'px';
  el.style.top  = y + 'px';
  layer.appendChild(el);
  setTimeout(() => el.remove(), 800);
}

function getClickAreaCenter() {
  const rect = $('click-area').getBoundingClientRect();
  return {
    clientX: rect.left + rect.width / 2,
    clientY: rect.top + rect.height / 2,
  };
}

function spawnParticles() {
  const layer = $('particle-layer');
  const sps = getTotalSPS();
  const targetCount = Math.min(40, 10 + Math.floor(Math.log10(sps + 1) * 5));
  while (layer.children.length < targetCount) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = 3 + Math.random() * 3;
    p.style.width  = size + 'px';
    p.style.height = size + 'px';
    p.style.opacity = (0.3 + Math.random() * 0.3).toFixed(2);
    p.style.left = (10 + Math.random() * 80) + '%';
    p.style.top  = (55 + Math.random() * 35) + '%';
    const dx = (Math.random() - 0.5) * 80;
    const dur = 4 + Math.random() * 6;
    p.style.setProperty('--dx', dx + 'px');
    p.style.animation = `particle-float ${dur}s linear ${(Math.random() * dur).toFixed(2)}s infinite`;
    layer.appendChild(p);
  }
  while (layer.children.length > targetCount) {
    layer.removeChild(layer.lastChild);
  }
}

function showToast(title, body) {
  const c = $('toast-container');
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `
    <button class="toast-close" aria-label="Close">×</button>
    <div class="toast-title">${title}</div>
    <div class="toast-body">${body}</div>
  `;
  c.appendChild(t);
  const close = () => t.remove();
  t.querySelector('.toast-close').addEventListener('click', close);
  setTimeout(close, 10000);
}

// ─── Game loop ─────────────────────────────────────────────────────

let lastTick = Date.now();
let phantomAccumulator = 0;
let holdAutoTimer = null;
let holdPointerPoint = null;

function tick() {
  const now = Date.now();
  const dt = (now - lastTick) / 1000;
  lastTick = now;

  // Mark dirty: scaling effects depend on current generator counts and time-derived state.
  // Cheap enough to recompute every tick.
  markMultsDirty();

  // Passive SPS
  const earned = getTotalSPS() * dt;
  if (earned > 0) awardSpores(earned);

  // Phantom clicks
  const m = getMults();
  if (m.phantomClicksPerSec > 0) {
    phantomAccumulator += m.phantomClicksPerSec * dt;
    while (phantomAccumulator >= 1) {
      phantomAccumulator -= 1;
      const spc = getSPC();
      awardSpores(spc);
      state.passiveSpsFromClicks += m.spsPerClickRate;
    }
  }

  checkMilestones();
  render();
}

function startLoop() {
  setInterval(tick, TICK_MS);
  setInterval(save, SAVE_INTERVAL_MS);
  setInterval(spawnParticles, 1500);
  window.addEventListener('beforeunload', save);
}

function startHoldClicking(ev) {
  if (ev.pointerType === 'mouse' && ev.button !== 0) return;
  ev.preventDefault();
  holdPointerPoint = { clientX: ev.clientX, clientY: ev.clientY };
  $('click-area').classList.toggle('hold-active', hasHoldAutoClick());
  handleClick(ev);

  if (!hasHoldAutoClick() || holdAutoTimer) return;
  holdAutoTimer = setInterval(() => {
    handleClick(holdPointerPoint || getClickAreaCenter());
  }, HOLD_AUTO_CLICK_INTERVAL_MS);
}

function updateHoldPoint(ev) {
  if (!holdAutoTimer) return;
  holdPointerPoint = { clientX: ev.clientX, clientY: ev.clientY };
}

function stopHoldClicking() {
  if (holdAutoTimer) {
    clearInterval(holdAutoTimer);
    holdAutoTimer = null;
  }
  holdPointerPoint = null;
  $('click-area').classList.remove('hold-active');
}

function formatDuration(s) {
  if (s < 60) return Math.floor(s) + 's';
  if (s < 3600) return Math.floor(s / 60) + 'm';
  const h = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  return mm > 0 ? `${h}h ${mm}m` : `${h}h`;
}

function offlineCatchup() {
  const now = Date.now();
  const cap = getOfflineCap();
  const rate = getOfflineRateMul();
  const delta = Math.min((now - state.lastSave) / 1000, cap);
  if (delta < 5) return;
  const sps = getTotalSPS();
  if (sps <= 0) return;
  const earned = sps * delta * rate;
  awardSpores(earned);
  showToast(
    'You return.',
    `You were gone for ${formatDuration(delta)}. Your empire grew by ${fmt(earned)} spores.`
  );
}

function init() {
  const hadSave = load();
  // Default to the first unlocked tree if clicker is empty/etc.
  for (const id of TREE_IDS) {
    if (treeUnlocked(id) && Object.values(state.trees[id].tiers).some(Boolean)) {
      activeTreeId = id; break;
    }
  }
  if (hadSave) offlineCatchup();
  buildGenerators();
  buildTreeTabs();
  const clickArea = $('click-area');
  clickArea.addEventListener('pointerdown', startHoldClicking);
  clickArea.addEventListener('pointermove', updateHoldPoint);
  window.addEventListener('pointerup', stopHoldClicking);
  window.addEventListener('pointercancel', stopHoldClicking);
  window.addEventListener('blur', stopHoldClicking);
  spawnParticles();
  render();
  startLoop();
}

init();
