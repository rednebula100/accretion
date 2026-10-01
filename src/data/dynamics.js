// Independently designed; DYNAMICS-SPEC revision8. No external game code reused.
export const DYNAMICS = [
  {
    "id": "a-source",
    "name": "Organized infall",
    "region": "a",
    "prereqs": [
      "apparatus"
    ],
    "cost": "10",
    "repeatable": false,
    "x": 360,
    "y": 100,
    "kind": "core",
    "description": "Flux×2",
    "purpose": "Immediate investment enables self-growth and paid-flow branches; finite"
  },
  {
    "id": "a-conductance",
    "name": "Conductance",
    "region": "a",
    "prereqs": [
      "a-source"
    ],
    "cost": "25",
    "repeatable": true,
    "x": 210,
    "y": 200,
    "kind": "branch",
    "description": "conductance formula",
    "purpose": "Repeatable competes with one-offs; a-loop later changes exponent; cap20"
  },
  {
    "id": "a-infall",
    "name": "Paid accretion",
    "region": "a",
    "prereqs": [
      "a-source"
    ],
    "cost": "60",
    "repeatable": false,
    "x": 510,
    "y": 200,
    "kind": "branch",
    "description": "enable paidFlow",
    "purpose": "Active feeding vs reserve; a-diet/bulk synergy; bounded, ambient excluded"
  },
  {
    "id": "a-reserve",
    "name": "Quiet reservoir",
    "region": "a",
    "prereqs": [
      "a-conductance"
    ],
    "cost": "100",
    "repeatable": false,
    "x": 60,
    "y": 300,
    "kind": "branch",
    "description": "enable H",
    "purpose": "First spend/hold opportunity cost; b-hysteresis; H≤4"
  },
  {
    "id": "a-work",
    "name": "Radiative work",
    "region": "a",
    "prereqs": [
      "a-conductance"
    ],
    "cost": "180",
    "repeatable": false,
    "x": 360,
    "y": 300,
    "kind": "branch",
    "description": "Energy×1.8",
    "purpose": "Matter/Structure advancement versus Flux growth; enables extraction"
  },
  {
    "id": "a-shear",
    "name": "Orbital shear",
    "region": "a",
    "prereqs": [
      "a-infall"
    ],
    "cost": "300",
    "repeatable": false,
    "x": 660,
    "y": 300,
    "kind": "branch",
    "description": "new transit×0.82",
    "purpose": "Throughput vs income; paid activity; floor1.4s, old queue unchanged"
  },
  {
    "id": "a-diet",
    "name": "Spectral variety",
    "region": "a",
    "prereqs": [
      "a-infall",
      "a-shear"
    ],
    "cost": "650",
    "repeatable": false,
    "x": 510,
    "y": 400,
    "kind": "branch",
    "description": "enable diversity",
    "purpose": "Breadth rather than only latest Matter; B strata; at most200species"
  },
  {
    "id": "a-return",
    "name": "First extraction",
    "region": "a",
    "prereqs": [
      "a-work"
    ],
    "cost": "1100",
    "repeatable": false,
    "x": 210,
    "y": 400,
    "kind": "branch",
    "description": "first PAID species absorption +30% paid-cost refund",
    "purpose": "Discovery vs repeat flow; own paid ledger, once/species"
  },
  {
    "id": "a-balance",
    "name": "Flow allocation",
    "region": "a",
    "prereqs": [
      "a-reserve",
      "a-work"
    ],
    "cost": "2000",
    "repeatable": false,
    "x": 360,
    "y": 500,
    "kind": "branch",
    "description": "enable u",
    "purpose": "Reversible Flux/Energy choice; all later regions; factors1..1.8"
  },
  {
    "id": "a-loop",
    "name": "Conductive loop",
    "region": "a",
    "prereqs": [
      "a-conductance",
      "a-balance"
    ],
    "cost": "3600",
    "repeatable": false,
    "x": 60,
    "y": 500,
    "kind": "branch",
    "description": "conductance exponent1.3→1.7",
    "purpose": "Scaling breakthrough revives early repeatable; cap20"
  },
  {
    "id": "a-close",
    "name": "Coherent orbit",
    "region": "a",
    "prereqs": [
      "a-loop",
      "a-diet",
      "a-return"
    ],
    "cost": "8000",
    "repeatable": false,
    "x": 360,
    "y": 600,
    "kind": "branch",
    "description": "Flux×3; reconstruction; revealB",
    "purpose": "Converge growth and feeding; no count gate"
  },
  {
    "id": "b-source",
    "name": "Layered current",
    "region": "b",
    "prereqs": [
      "a-close"
    ],
    "cost": "30000",
    "repeatable": false,
    "x": 360,
    "y": 800,
    "kind": "core",
    "description": "Flux×4",
    "purpose": "New productive scale following recovery; finite"
  },
  {
    "id": "b-buffer",
    "name": "Buffer depth",
    "region": "b",
    "prereqs": [
      "b-source"
    ],
    "cost": "50000",
    "repeatable": true,
    "x": 60,
    "y": 900,
    "kind": "branch",
    "description": "additional refund .01L×actual paid cost on absorption",
    "purpose": "Physical return versus other investments; cap20percentage points, no passive10×Energy multiplier"
  },
  {
    "id": "b-strata",
    "name": "Fresh strata",
    "region": "b",
    "prereqs": [
      "b-source"
    ],
    "cost": "100000",
    "repeatable": false,
    "x": 510,
    "y": 900,
    "kind": "branch",
    "description": "first-paid discovery +6s pre-step Flux rate",
    "purpose": "Explore vs stabilize cheap flow; at most200impulses; no recursion"
  },
  {
    "id": "b-hysteresis",
    "name": "Persistent reservoir",
    "region": "b",
    "prereqs": [
      "b-buffer"
    ],
    "cost": "200000",
    "repeatable": false,
    "x": 210,
    "y": 1000,
    "kind": "branch",
    "description": "H uses max(F,0.35B)",
    "purpose": "Spend without losing all reserve output; resets locally, H≤4"
  },
  {
    "id": "b-queue",
    "name": "Parallel intake",
    "region": "b",
    "prereqs": [
      "b-strata"
    ],
    "cost": "300000",
    "repeatable": false,
    "x": 660,
    "y": 1000,
    "kind": "branch",
    "description": "capacity100→200 with parallel apparatus",
    "purpose": "Physical throughput investment; earned capability retained locally"
  },
  {
    "id": "b-target",
    "name": "Known-orbit scheduler",
    "region": "b",
    "prereqs": [
      "b-queue"
    ],
    "cost": "600000",
    "repeatable": false,
    "x": 660,
    "y": 1100,
    "kind": "branch",
    "description": "auto known paid species≥2 below frontier, affordable fallback",
    "purpose": "Low-input support while latest discovery stays manual;1/1.2s"
  },
  {
    "id": "b-thermal",
    "name": "Thermal recovery",
    "region": "b",
    "prereqs": [
      "b-hysteresis"
    ],
    "cost": "1000000",
    "repeatable": false,
    "x": 60,
    "y": 1100,
    "kind": "branch",
    "description": "ordinary base refund8%→35%",
    "purpose": "Repeated feeding gains value; preserve old modifiers"
  },
  {
    "id": "b-resonance",
    "name": "Energy coupling",
    "region": "b",
    "prereqs": [
      "b-hysteresis",
      "b-strata"
    ],
    "cost": "2000000",
    "repeatable": false,
    "x": 360,
    "y": 1200,
    "kind": "branch",
    "description": "enable bounded reserve→Flux",
    "purpose": "Energy reserve vs Matter/Structure spending; factor≤4"
  },
  {
    "id": "b-gas",
    "name": "Envelope handling",
    "region": "b",
    "prereqs": [
      "b-queue",
      "b-target"
    ],
    "cost": "4000000",
    "repeatable": false,
    "x": 660,
    "y": 1200,
    "kind": "branch",
    "description": "gas/comet new transit×0.75",
    "purpose": "Specialized handling; no planetary input needed; convergence"
  },
  {
    "id": "b-sorting",
    "name": "Stream separation",
    "region": "b",
    "prereqs": [
      "b-thermal",
      "b-resonance"
    ],
    "cost": "7000000",
    "repeatable": false,
    "x": 210,
    "y": 1300,
    "kind": "branch",
    "description": "bulk stagger0.065→0.025s",
    "purpose": "Bulk becomes real throughput; no immediate Mass"
  },
  {
    "id": "b-roche",
    "name": "Roche convergence",
    "region": "b",
    "prereqs": [
      "b-gas",
      "b-sorting"
    ],
    "cost": "10000000",
    "repeatable": false,
    "x": 360,
    "y": 1400,
    "kind": "branch",
    "description": "planetary capability; Flux×3; revealC",
    "purpose": "Two handling paths remove a frontier constraint; capability retained"
  },
  {
    "id": "b-compression",
    "name": "Efficient conductors",
    "region": "b",
    "prereqs": [
      "b-thermal"
    ],
    "cost": "15000000",
    "repeatable": false,
    "x": -90,
    "y": 1300,
    "kind": "branch",
    "description": "repeatable cost1.55→1.4",
    "purpose": "Optional old-repeatable efficiency; quadratic cost and20cap remain"
  },
  {
    "id": "c-source",
    "name": "Plasma circulation",
    "region": "c",
    "prereqs": [
      "b-roche"
    ],
    "cost": "40000000",
    "repeatable": false,
    "x": 360,
    "y": 1600,
    "kind": "core",
    "description": "Flux×5; also requires built planetary apparatus",
    "purpose": "New scale after physical planetary breakthrough; finite"
  },
  {
    "id": "c-coupling",
    "name": "Apparatus resonance",
    "region": "c",
    "prereqs": [
      "c-source"
    ],
    "cost": "80000000",
    "repeatable": true,
    "x": 210,
    "y": 1700,
    "kind": "branch",
    "description": "Flux×(1+0.18L min(6,groups))",
    "purpose": "Apparatus completion feeds tree; finite6groups,20levels"
  },
  {
    "id": "c-divert",
    "name": "Flow-fed current",
    "region": "c",
    "prereqs": [
      "c-source"
    ],
    "cost": "200000000",
    "repeatable": false,
    "x": 660,
    "y": 1700,
    "kind": "branch",
    "description": "Flux×(1+min(2,paidQueue/20))",
    "purpose": "Active flow versus quiet reserve; finite occupancy"
  },
  {
    "id": "c-controls",
    "name": "Radiative routing",
    "region": "c",
    "prereqs": [
      "c-divert"
    ],
    "cost": "500000000",
    "repeatable": false,
    "x": 660,
    "y": 1800,
    "kind": "branch",
    "description": "radiative work and fallback/save-for-frontier policy, formulas above",
    "purpose": "Spend Flux to solve an Energy constraint or preserve investment; once/frontier work ledger prevents reset farming; later trials extend policies"
  },
  {
    "id": "c-stripping",
    "name": "Layer stripping",
    "region": "c",
    "prereqs": [
      "c-coupling"
    ],
    "cost": "800000000",
    "repeatable": false,
    "x": 60,
    "y": 1800,
    "kind": "branch",
    "description": "gas/star/giant new transit×0.60",
    "purpose": "Physical preparation before stars; floor1.4s"
  },
  {
    "id": "c-harmonics",
    "name": "Composition map",
    "region": "c",
    "prereqs": [
      "c-coupling",
      "c-divert"
    ],
    "cost": "2000000000",
    "repeatable": false,
    "x": 360,
    "y": 1900,
    "kind": "branch",
    "description": "not-yet-paid species price×0.65",
    "purpose": "Discovery vs repeated feeding; once-only ledger"
  },
  {
    "id": "c-scheduler",
    "name": "Frontier acquisition",
    "region": "c",
    "prereqs": [
      "c-controls",
      "c-harmonics"
    ],
    "cost": "4000000000",
    "repeatable": false,
    "x": 660,
    "y": 1900,
    "kind": "branch",
    "description": "latest auto up to10/1.2s",
    "purpose": "Retire mastered feeding clicks; reserve/category still decisions"
  },
  {
    "id": "c-stellar",
    "name": "Stellar convergence",
    "region": "c",
    "prereqs": [
      "c-stripping",
      "c-harmonics"
    ],
    "cost": "8000000000",
    "repeatable": false,
    "x": 210,
    "y": 2000,
    "kind": "branch",
    "description": "stellar handling capability",
    "purpose": "Remove physical frontier gate; no stars required, retained capability"
  },
  {
    "id": "c-magnetic",
    "name": "Angular coupling",
    "region": "c",
    "prereqs": [
      "c-scheduler"
    ],
    "cost": "12000000000",
    "repeatable": false,
    "x": 660,
    "y": 2000,
    "kind": "branch",
    "description": "Energy×(1+2spin)",
    "purpose": "Output versus longer transit; spin≤.98, no visual Boolean"
  },
  {
    "id": "c-fold",
    "name": "Circulation closure",
    "region": "c",
    "prereqs": [
      "c-stellar",
      "c-magnetic"
    ],
    "cost": "20000000000",
    "repeatable": false,
    "x": 360,
    "y": 2100,
    "kind": "branch",
    "description": "Flux×4; revealD",
    "purpose": "Handling plus controlled automation converge; reconstruction opportunity"
  },
  {
    "id": "d-source",
    "name": "Nuclear current",
    "region": "d",
    "prereqs": [
      "c-fold"
    ],
    "cost": "50000000000",
    "repeatable": false,
    "x": 360,
    "y": 2400,
    "kind": "core",
    "description": "Flux×6; late Energy denominator quadratic .09→.035; also requires magnetic apparatus",
    "purpose": "Thermal breakthrough arrives before late wall is already solved; finite"
  },
  {
    "id": "d-packing",
    "name": "Stream packing",
    "region": "d",
    "prereqs": [
      "d-source"
    ],
    "cost": "100000000000",
    "repeatable": true,
    "x": 60,
    "y": 2500,
    "kind": "branch",
    "description": "new transit×.96^L",
    "purpose": "Throughput vs feedback investment; cap20/floor1.4s"
  },
  {
    "id": "d-duplex",
    "name": "Alternating streams",
    "region": "d",
    "prereqs": [
      "d-source"
    ],
    "cost": "300000000000",
    "repeatable": false,
    "x": 660,
    "y": 2500,
    "kind": "branch",
    "description": "optional alternate frontier/cheapest known selected class",
    "purpose": "Keep activity and reserve under auto; at most10/1.2s"
  },
  {
    "id": "d-feedback",
    "name": "Integrated history",
    "region": "d",
    "prereqs": [
      "d-source"
    ],
    "cost": "600000000000",
    "repeatable": false,
    "x": 360,
    "y": 2600,
    "kind": "branch",
    "description": "enable bounded T feedback",
    "purpose": "Hold productive cycle versus reconstruction; factor≤4"
  },
  {
    "id": "d-reserves",
    "name": "Stable extraction",
    "region": "d",
    "prereqs": [
      "d-packing",
      "d-feedback"
    ],
    "cost": "1000000000000",
    "repeatable": false,
    "x": 60,
    "y": 2600,
    "kind": "branch",
    "description": "Energy×(1+0.6(H−1))",
    "purpose": "Later quiet-reserve route; factor≤2.8"
  },
  {
    "id": "d-coalescence",
    "name": "Coupled apparatus",
    "region": "d",
    "prereqs": [
      "d-feedback",
      "d-duplex"
    ],
    "cost": "2000000000000",
    "repeatable": false,
    "x": 510,
    "y": 2700,
    "kind": "branch",
    "description": "Flux×(1+0.5min(6,groups)); Energy×2",
    "purpose": "Completed apparatus drives final cross-layer acceleration; finite snapshot"
  },
  {
    "id": "d-radiation",
    "name": "Sustained radiation",
    "region": "d",
    "prereqs": [
      "d-coalescence"
    ],
    "cost": "5000000000000",
    "repeatable": false,
    "x": 660,
    "y": 2800,
    "kind": "branch",
    "description": "Energy×(1+min(3,paidQueue/12))",
    "purpose": "Flow route vs reserve route; no ambient input"
  },
  {
    "id": "d-horizon",
    "name": "Resolved horizon",
    "region": "d",
    "prereqs": [
      "d-radiation",
      "d-reserves"
    ],
    "cost": "16000000000000",
    "repeatable": false,
    "x": 360,
    "y": 2900,
    "kind": "branch",
    "description": "Flux×4; Evap I×(1+min(.5,.04log10(1+T))), final floor",
    "purpose": "Choose deeper current-universe return versus earlier Evap; no count requirement; merged redundant d-memory"
  }
];
