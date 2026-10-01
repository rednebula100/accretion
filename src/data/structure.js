// Physical capability graph. Legacy IDs are migration metadata, not additional effects.
export const STRUCTURE_DATA = [
  {
    "id": "st-capture",
    "key": "capture",
    "legacyId": "core-0",
    "name": "Gravitational capture",
    "description": "Weak ambient fragments accompany paid feeding. They do not discover new Matter.",
    "effect": "capture",
    "frontier": 0,
    "era": 0,
    "cost": "12",
    "prereqs": [],
    "gate": null,
    "parent": null,
    "x": 360,
    "y": 120,
    "kind": "core"
  },
  {
    "id": "st-decay",
    "key": "decay",
    "legacyId": "core-1",
    "name": "Orbital decay",
    "description": "Captured matter falls 20% faster.",
    "effect": "decay",
    "frontier": 7,
    "era": 0,
    "cost": "449.9003772449586",
    "prereqs": [
      "st-capture"
    ],
    "gate": null,
    "parent": "st-capture",
    "x": 230,
    "y": 245,
    "kind": "core"
  },
  {
    "id": "st-disk",
    "key": "disk",
    "legacyId": "core-2",
    "name": "Accretion disk",
    "description": "A persistent disk forms. Accretion generates 60% more energy.",
    "effect": "disk",
    "frontier": 18,
    "era": 1,
    "cost": "67528.49702410802",
    "prereqs": [
      "st-decay"
    ],
    "gate": null,
    "parent": "st-decay",
    "x": 490,
    "y": 370,
    "kind": "core"
  },
  {
    "id": "st-apparatus",
    "key": "apparatus",
    "legacyId": null,
    "name": "Accretion dynamics",
    "description": "Organize accretion into Flux. Open the DYNAMICS tree.",
    "effect": "dynamics",
    "frontier": 30,
    "era": 3,
    "cost": "4108375.4977961606",
    "prereqs": [
      "st-disk"
    ],
    "gate": null,
    "parent": "st-disk",
    "x": 360,
    "y": 495,
    "kind": "core"
  },
  {
    "id": "st-angular",
    "key": "angular",
    "legacyId": "core-6",
    "name": "Angular momentum",
    "description": "Unlock spin tuning: choose energy or faster capture.",
    "effect": "spin",
    "frontier": 35,
    "era": 3,
    "cost": "55556748.42026031",
    "prereqs": [
      "st-disk"
    ],
    "gate": null,
    "parent": "st-disk",
    "x": 230,
    "y": 620,
    "kind": "core"
  },
  {
    "id": "st-diversity",
    "key": "diversity",
    "legacyId": "core-7",
    "name": "Resonant capture",
    "description": "A varied diet multiplies energy generation.",
    "effect": "diversity",
    "frontier": 45,
    "era": 4,
    "cost": "3657402009.9666524",
    "prereqs": [
      "st-apparatus"
    ],
    "gate": null,
    "parent": "st-apparatus",
    "x": 490,
    "y": 745,
    "kind": "core"
  },
  {
    "id": "st-scheduler",
    "key": "scheduler",
    "legacyId": "core-3",
    "name": "Feeding scheduler",
    "description": "Prepare paid acquisition controls. Known-orbit automation is developed in DYNAMICS.",
    "effect": "auto",
    "frontier": 50,
    "era": 5,
    "cost": "29674993940.81235",
    "prereqs": [
      "st-apparatus"
    ],
    "gate": null,
    "parent": "st-apparatus",
    "x": 360,
    "y": 870,
    "kind": "core"
  },
  {
    "id": "st-parallel",
    "key": "parallel",
    "legacyId": "core-4",
    "name": "Parallel trajectories",
    "description": "Support parallel transit. Parallel intake in DYNAMICS expands the field to 200 bodies.",
    "effect": "queue",
    "frontier": 55,
    "era": 5,
    "cost": "240773440542.64227",
    "prereqs": [
      "st-scheduler"
    ],
    "gate": null,
    "parent": "st-scheduler",
    "x": 230,
    "y": 995,
    "kind": "core"
  },
  {
    "id": "st-staging",
    "key": "staging",
    "legacyId": "core-8",
    "name": "Orbital reservoir",
    "description": "Bulk deliveries take fewer seconds to enter the field.",
    "effect": "reservoir",
    "frontier": 65,
    "era": 6,
    "cost": "15850554440765.488",
    "prereqs": [
      "st-parallel"
    ],
    "gate": null,
    "parent": "st-parallel",
    "x": 490,
    "y": 1120,
    "kind": "core"
  },
  {
    "id": "st-tidal",
    "key": "tidal",
    "legacyId": "core-5",
    "name": "Tidal field",
    "description": "Disruptive feeding releases twice as much return energy.",
    "effect": "tides",
    "frontier": 70,
    "era": 7,
    "cost": "128606345626337.34",
    "prereqs": [
      "st-angular"
    ],
    "gate": null,
    "parent": "st-angular",
    "x": 360,
    "y": 1245,
    "kind": "core"
  },
  {
    "id": "st-planetary",
    "key": "planetary",
    "legacyId": "core-9",
    "name": "Planetary disruption",
    "description": "Combine Roche convergence and tidal handling to process planetary bodies.",
    "effect": "planetary",
    "frontier": 75,
    "era": 7,
    "cost": "1043470889120652.4",
    "prereqs": [
      "st-tidal",
      "st-staging"
    ],
    "gate": "b-roche",
    "parent": "st-tidal",
    "x": 230,
    "y": 1370,
    "kind": "core"
  },
  {
    "id": "st-thermal",
    "key": "thermal",
    "legacyId": "core-10",
    "name": "Thermal extraction",
    "description": "Every absorption returns 35% of its purchase cost.",
    "effect": "thermal",
    "frontier": 95,
    "era": 9,
    "cost": "4.522224270203142e18",
    "prereqs": [
      "st-planetary"
    ],
    "gate": null,
    "parent": "st-planetary",
    "x": 490,
    "y": 1495,
    "kind": "core"
  },
  {
    "id": "st-reserve",
    "key": "reserve",
    "legacyId": "core-11",
    "name": "Adaptive scheduler",
    "description": "Automation can reserve energy for structure purchases.",
    "effect": "reserve",
    "frontier": 110,
    "era": 11,
    "cost": "2.4154937362808897e21",
    "prereqs": [
      "st-scheduler",
      "st-thermal"
    ],
    "gate": null,
    "parent": "st-scheduler",
    "x": 360,
    "y": 1620,
    "kind": "core"
  },
  {
    "id": "st-stripping",
    "key": "stripping",
    "legacyId": "core-12",
    "name": "Gas stripping",
    "description": "Gas and stellar bodies fall 25% faster.",
    "effect": "stripping",
    "frontier": 125,
    "era": 12,
    "cost": "1.2902080130028941e24",
    "prereqs": [
      "st-thermal"
    ],
    "gate": null,
    "parent": "st-thermal",
    "x": 230,
    "y": 1745,
    "kind": "core"
  },
  {
    "id": "st-stellar",
    "key": "stellar",
    "legacyId": "core-13",
    "name": "Stellar ignition",
    "description": "Combine Stellar convergence and envelope handling to process stars.",
    "effect": "stellar",
    "frontier": 130,
    "era": 13,
    "cost": "1.0468336503319613e25",
    "prereqs": [
      "st-stripping",
      "st-planetary"
    ],
    "gate": "c-stellar",
    "parent": "st-stripping",
    "x": 490,
    "y": 1870,
    "kind": "core"
  },
  {
    "id": "st-magnetic",
    "key": "magnetic",
    "legacyId": "core-14",
    "name": "Magnetic alignment",
    "description": "Organize angular flow. Spin can extract more Energy; visible outflow depends on actual activity.",
    "effect": "jets",
    "frontier": 142,
    "era": 14,
    "cost": "1.5922114028974146e27",
    "prereqs": [
      "st-stellar",
      "st-angular"
    ],
    "gate": null,
    "parent": "st-stellar",
    "x": 360,
    "y": 1995,
    "kind": "core"
  },
  {
    "id": "st-flow",
    "key": "flow",
    "legacyId": "core-15",
    "name": "Coherent flow",
    "description": "Every active feeding body boosts production, up to twice.",
    "effect": "flow",
    "frontier": 148,
    "era": 14,
    "cost": "1.9636417511438393e28",
    "prereqs": [
      "st-magnetic",
      "st-staging"
    ],
    "gate": null,
    "parent": "st-magnetic",
    "x": 230,
    "y": 2120,
    "kind": "core"
  },
  {
    "id": "st-evaporation",
    "key": "evaporation",
    "legacyId": "core-16",
    "name": "Horizon thermodynamics",
    "description": "Reveal the end of this black hole’s lifecycle.",
    "effect": "evaporation",
    "frontier": 160,
    "era": 16,
    "cost": "4.47998512426285e30",
    "prereqs": [
      "st-flow"
    ],
    "gate": null,
    "parent": "st-flow",
    "x": 490,
    "y": 2245,
    "kind": "core"
  },
  {
    "id": "st-memory",
    "key": "memory",
    "legacyId": "core-17",
    "name": "Terminal memory",
    "description": "Discoveries increase Information earned by Evaporation.",
    "effect": "memory",
    "frontier": 170,
    "era": 17,
    "cost": "2.949255862519917e32",
    "prereqs": [
      "st-evaporation"
    ],
    "gate": null,
    "parent": "st-evaporation",
    "x": 360,
    "y": 2370,
    "kind": "core"
  },
  {
    "id": "st-merger",
    "key": "merger",
    "legacyId": "core-18",
    "name": "Compact interactions",
    "description": "Mergers emit a powerful pulse of captured energy.",
    "effect": "merger",
    "frontier": 180,
    "era": 18,
    "cost": "1.9415488894149648e34",
    "prereqs": [
      "st-memory"
    ],
    "gate": null,
    "parent": "st-memory",
    "x": 230,
    "y": 2495,
    "kind": "core"
  },
  {
    "id": "st-boundary",
    "key": "boundary",
    "legacyId": "core-19",
    "name": "Cosmic boundary",
    "description": "Preserve access to the cosmic boundary after Renewal.",
    "effect": "boundary",
    "frontier": 190,
    "era": 19,
    "cost": "1.2781570218758955e36",
    "prereqs": [
      "st-merger"
    ],
    "gate": null,
    "parent": "st-merger",
    "x": 490,
    "y": 2620,
    "kind": "core"
  }
];
