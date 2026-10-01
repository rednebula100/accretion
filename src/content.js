import Decimal from "break_eternity.js";
import { STRUCTURE_DATA } from './data/structure.js';
export const D = (value) => new Decimal(value);
export const ERAS = [
  [
    "Microscopic matter",
    -12,
    -5,
    "dust",
    "Carbon mote|Silicate speck|Ice microcrystal|Cosmic dust grain|Pollen grain|Iron whisker|Salt crystal|Micrometeorite|Graphite flake|Metal shaving",
  ],
  [
    "Granular matter",
    -4,
    2,
    "rock",
    "Sand grain|Iron filing|Basalt granule|Quartz pebble|Copper pellet|Obsidian shard|River stone|Nickel nodule|Granite cobble|Iron boulder",
  ],
  [
    "Manufactured matter",
    2,
    4,
    "manufactured",
    "Steel ingot|Engine block|Titanium billet|Pressure vessel|Flywheel|Concrete beam|Turbine rotor|Machine press|Reactor shielding|Foundry crucible",
  ],
  [
    "Industrial scale",
    4,
    9,
    "machine",
    "Freight truck|Crawler excavator|Locomotive|Mining hauler|Orbital station|Submarine hull|Cargo ship|Offshore platform|Arcology frame|Industrial district",
  ],
  [
    "Geological masses",
    9,
    15,
    "rock",
    "Basalt monolith|Glacial iceberg|Mesa fragment|Granite ridge|Volcanic cone|Oceanic seamount|Mountain massif|Caldera complex|Ice shelf|Crustal plate",
  ],
  [
    "Meteoroids",
    8,
    14,
    "asteroid",
    "Stony bolide|Iron bolide|Carbonaceous meteoroid|Regolith aggregate|Porous rubble swarm|Metal-rich impactor|Basaltic impactor|Fragment train|Differentiated planetesimal|Primordial planetesimal",
  ],
  [
    "Asteroids",
    14,
    21,
    "asteroid",
    "Rubble-pile asteroid|S-type asteroid|M-type asteroid|Trojan asteroid|Contact binary|Vesta-class body|Pallas-class body|Hygiea-class body|Mantled protoplanet|Ceres-class body",
  ],
  [
    "Cometary reservoirs",
    15,
    22,
    "comet",
    "Short-period comet|Long-period comet|Sungrazing comet|Dormant comet nucleus|Giant comet|Icy centaur|Scattered-disk body|Kuiper-belt aggregate|Oort cloud fragment|Cometary reservoir",
  ],
  [
    "Dwarf worlds",
    21,
    23,
    "planet",
    "Rocky dwarf world|Icy dwarf world|Haumea-class body|Makemake-class body|Pluto-class body|Eris-class body|Sedna-class world|Subglacial dwarf|Iron-rich dwarf|Ocean dwarf world",
  ],
  [
    "Moons",
    22,
    24,
    "moon",
    "Volcanic moon|Europa-class moon|Ganymede-class moon|Titan-class moon|Lunar-class body|Captured ice moon|Ocean moon|Iron-core moon|Binary moon pair|Giant exomoon",
  ],
  [
    "Terrestrial worlds",
    23,
    26,
    "planet",
    "Mercury-class world|Mars-class world|Venus-class world|Earth-class world|Ocean planet|Lava planet|Carbon planet|Iron planet|Super-Earth|Mega-Earth",
  ],
  [
    "Ice giants",
    25,
    27,
    "gas",
    "Mini-Neptune|Ammonia world|Methane world|Water-rich sub-Neptune|Uranus-class world|Neptune-class world|Warm ice giant|Oceanic ice giant|Stripped ice giant|Super-Neptune",
  ],
  [
    "Gas giants",
    26,
    28.4,
    "gas",
    "Sub-Saturn|Saturn-class world|Ringed gas giant|Jupiter-class world|Hot Jupiter|Eccentric gas giant|Cold super-Jupiter|Helium-rich giant|Massive gas giant|Deuterium-limit giant",
  ],
  [
    "Substellar objects",
    28.4,
    29.2,
    "star",
    "Cool Y dwarf|Water-cloud dwarf|Ammonia-cloud dwarf|T dwarf|Methane brown dwarf|L dwarf|Iron-cloud dwarf|Young brown dwarf|Hot brown dwarf|Hydrogen-limit dwarf",
  ],
  [
    "Red dwarfs",
    29.2,
    30,
    "star",
    "Ultracool dwarf|Late M dwarf|Flare star|Fully convective dwarf|Quiet red dwarf|Metal-poor red dwarf|Binary red dwarf|Early M dwarf|Orange dwarf|Low-mass stellar pair",
  ],
  [
    "Main sequence",
    30,
    32,
    "star",
    "K-type star|Sun-like star|F-type star|A-type star|Sirius-class star|Be star|B-type star|Blue main-sequence star|O-type star|Massive stellar binary",
  ],
  [
    "Evolved stars",
    30.2,
    32.2,
    "giant",
    "Subgiant|Red-clump star|Helium-burning giant|Red giant|Carbon star|AGB star|Mira-type variable|Post-AGB star|Bright giant|Blue giant",
  ],
  [
    "Supergiants",
    31,
    32.7,
    "giant",
    "Yellow supergiant|Red supergiant|Blue supergiant|Wolf-Rayet star|Luminous blue variable|Yellow hypergiant|Red hypergiant|Blue hypergiant|Very massive star|Primordial massive star",
  ],
  [
    "Compact remnants",
    30,
    34,
    "compact",
    "Helium white dwarf|Carbon-oxygen white dwarf|Magnetic white dwarf|Neutron star|Millisecond pulsar|Magnetar|Stellar black hole|Binary black hole|Mass-gap black hole|Intermediate black hole",
  ],
  [
    "Cosmic structures",
    35,
    48,
    "cosmic",
    "Stellar association|Globular cluster|Nuclear star cluster|Galactic nucleus|Supermassive black hole|Dwarf galaxy|Spiral galaxy|Galaxy group|Galaxy cluster|Cosmic filament",
  ],
].map(([name, min, max, render, names], id) => ({
  id,
  name,
  min,
  max,
  render,
  names: names.split("|"),
}));
const exact = {
  "Earth-class world": 5.972e24,
  "Sun-like star": 1.989e30,
  "Jupiter-class world": 1.898e27,
  "Lunar-class body": 7.342e22,
  "Neptune-class world": 1.024e26,
  "Ceres-class body": 9.39e20,
  "Mars-class world": 6.417e23,
  "Mercury-class world": 3.301e23,
  "Venus-class world": 4.867e24,
  "Saturn-class world": 5.683e26,
};
Object.assign(exact, {
  "Helium white dwarf": 7e29,
  "Carbon-oxygen white dwarf": 1.2e30,
  "Magnetic white dwarf": 2e30,
  "Neutron star": 2.8e30,
  "Millisecond pulsar": 3.2e30,
  Magnetar: 3.6e30,
  "Stellar black hole": 1.6e31,
  "Binary black hole": 6e31,
  "Mass-gap black hole": 1.8e32,
  "Intermediate black hole": 2e34,
  "Supermassive black hole": 8e39,
  "Europa-class moon": 4.8e22,
  "Ganymede-class moon": 1.48e23,
  "Titan-class moon": 1.35e23,
  "Pluto-class body": 1.303e22,
  "Eris-class body": 1.6466e22,
});
let cumulative = D(0);
export const MATTER = ERAS.flatMap((era) =>
  era.names.map((name, j) => {
    const i = era.id * 10 + j,
      mass = D(exact[name] || 10 ** (era.min + ((era.max - era.min) * j) / 9));
    const unlock = cumulative.mul(0.55);
    cumulative = cumulative.add(mass);
    const density = ["gas", "star", "giant", "cosmic"].includes(era.render)
      ? 1400
      : 3500;
    const render = name.toLowerCase().includes("black hole")
      ? "blackhole"
      : era.render;
    return {
      id: i,
      name,
      category: era.id,
      mass,
      cost: D(12).mul(D(1.52).pow(i)),
      radius: Math.cbrt((mass.toNumber() / density) * 0.2387),
      density,
      render,
      unlock,
      tidalResistance:
        render === "compact" ? 0.92 : render === "gas" ? 0.15 : 0.5,
      capture:
        render === "blackhole"
          ? "inspiral"
          : ["star", "giant"].includes(render)
            ? "disruption"
            : ["planet", "moon", "gas", "cosmic"].includes(render)
              ? "stripping"
              : "ballistic",
      duration:
        render === "blackhole"
          ? 10
          : ["star", "giant", "cosmic"].includes(render)
            ? 8
            : ["planet", "moon", "gas"].includes(render)
              ? 6
              : 3.8,
      description:
        era.id < 4
          ? "Solid matter · curved capture"
          : render === "blackhole"
            ? "Binary inspiral · spacetime ringdown"
            : render === "comet"
              ? "Volatile ice · evaporating tail"
              : ["star", "giant"].includes(render)
                ? "Stellar plasma · tidal disruption"
                : ["gas", "cosmic"].includes(render)
                  ? "Diffuse matter · extended stripping"
                  : "Gravitational capture · tidal fragmentation",
    };
  }),
);
export const CORE = [
  [
    "Gravitational capture",
    "Ambient dust enters the capture field automatically.",
    "capture",
  ],
  ["Orbital decay", "Captured matter falls 20% faster.", "decay"],
  [
    "Accretion disk",
    "A persistent disk forms. Accretion generates 60% more energy.",
    "disk",
  ],
  [
    "Feeding scheduler",
    "Save for and automatically acquire the heaviest known matter.",
    "auto",
  ],
  [
    "Parallel trajectories",
    "Increase the feeding pipeline from 100 to 200 bodies.",
    "queue",
  ],
  [
    "Tidal field",
    "Disruptive feeding releases twice as much return energy.",
    "tides",
  ],
  [
    "Angular momentum",
    "Unlock spin tuning: choose energy or faster capture.",
    "spin",
  ],
  [
    "Resonant capture",
    "A varied diet multiplies energy generation.",
    "diversity",
  ],
  [
    "Orbital reservoir",
    "Bulk deliveries take fewer seconds to enter the field.",
    "reservoir",
  ],
  [
    "Planetary disruption",
    "Planetary feeding yields an extra observation.",
    "planetary",
  ],
  [
    "Thermal extraction",
    "Every absorption returns 35% of its purchase cost.",
    "thermal",
  ],
  [
    "Adaptive scheduler",
    "Automation can reserve energy for structure purchases.",
    "reserve",
  ],
  ["Gas stripping", "Gas and stellar bodies fall 25% faster.", "stripping"],
  [
    "Stellar ignition",
    "Stellar feeding doubles ambient energy generation.",
    "stellar",
  ],
  [
    "Magnetic alignment",
    "Relativistic jets emerge; spin generates more energy.",
    "jets",
  ],
  [
    "Coherent flow",
    "Every active feeding body boosts production, up to twice.",
    "flow",
  ],
  [
    "Horizon thermodynamics",
    "Reveal the end of this black hole’s lifecycle.",
    "evaporation",
  ],
  [
    "Terminal memory",
    "Discoveries increase Information earned by Evaporation.",
    "memory",
  ],
  [
    "Compact interactions",
    "Mergers emit a powerful pulse of captured energy.",
    "merger",
  ],
  [
    "Cosmic boundary",
    "Access cosmic targets after the universe has been renewed.",
    "boundary",
  ],
];
const branches = [
  [
    "Collection aperture",
    "Dust trajectories",
    "Capture cross-section",
    "Infall channels",
  ],
  [
    "Low eccentricity",
    "Momentum exchange",
    "Short trajectories",
    "Circularization",
  ],
  ["Viscous heating", "Inner disk", "Radiative transport", "Hot corona"],
  [
    "Acquisition budget",
    "Continuous supply",
    "Delivery cadence",
    "Intake priority",
  ],
  [
    "Parallel lanes",
    "Synchronized arrival",
    "Rubble stream",
    "Extended pipeline",
  ],
  ["Roche boundary", "Tidal shear", "Debris recovery", "Disruption cascade"],
  ["Prograde orbit", "Spin coupling", "Angular exchange", "Frame dragging"],
  ["Mineral survey", "Ice survey", "Metal survey", "Composition archive"],
  [
    "Holding orbit",
    "Stream separation",
    "Queue compression",
    "Orbital sorting",
  ],
  ["Mantle stripping", "Core exposure", "Ocean dispersal", "Planetary archive"],
  [
    "Photon collection",
    "Thermal channel",
    "Radiation capture",
    "Cooling balance",
  ],
  ["Energy buffer", "Fair scheduling", "Supply horizon", "Burst delivery"],
  ["Envelope loss", "Atmospheric mixing", "Hydrogen channel", "Helium channel"],
  ["Stellar envelope", "Fusion ash", "Plasma capture", "Stellar archive"],
  ["Magnetic flux", "Polar alignment", "Jet collimation", "Field coherence"],
  ["Shear layers", "Flow symmetry", "Laminar transport", "Disk resonance"],
  ["Horizon states", "Thermal history", "Quantum trace", "Radiative limit"],
  ["Run archive", "Matter memory", "Entropy record", "Information bound"],
  [
    "Degenerate matter",
    "Binary resonance",
    "Inspiral coupling",
    "Ringdown recovery",
  ],
  ["Cluster tides", "Galactic flow", "Cosmic capture", "Boundary conditions"],
];
export const LEGACY_STRUCTURE = CORE.flatMap(([name, description, effect], era) => {
  const id = `core-${era}`,
    x = 360 + Math.sin(era * 0.7) * 110,
    y = 150 + era * 200;
  const core = {
    id,
    name,
    description,
    effect,
    era,
    x,
    y,
    parent: era ? `core-${era - 1}` : null,
    cost: MATTER[era * 10].cost.mul(3),
    kind: "core",
  };
  return [
    core,
    ...branches[era].map((name, j) => ({
      id: `branch-${era}-${j}`,
      name,
      era,
      parent: j < 2 ? id : `branch-${era}-${j - 2}`,
      x: x + (j % 2 ? -1 : 1) * (140 + Math.floor(j / 2) * 140),
      y: y + 60 + (j % 2) * 32,
      kind: "branch",
      effect:
        j === 2
          ? "survey-" + era
          : j === 3
            ? "synthesis-" + era
            : j === 0
              ? "energy"
              : "speed",
      description:
        j === 2
          ? "First absorption of each matter form in this era returns 50% energy. Observed matter costs 30% less."
          : j === 3
            ? "Observe six matter forms in this era to establish a capture reservoir and increase all energy generation by 18%."
            : j === 0
              ? "Increase energy generation by 12%."
              : "Reduce transit time by 5%.",
      cost: MATTER[era * 10].cost.mul(1.8 + j * 2),
    })),
  ];
});
export const STRUCTURE = STRUCTURE_DATA.map(n=>({...n,cost:D(n.cost),prerequisites:n.prereqs}));
export const RESEARCH = [
  {
    id: "autostart",
    name: "Remembered motion",
    cost: 3,
    description:
      "Future seeds begin with automatic gravitational capture and the feeding scheduler.",
  },
  {
    id: "heritage",
    name: "Inherited structure",
    cost: 5,
    description: "The first four core structures return with each new seed.",
  },
  {
    id: "compression",
    name: "Compressed history",
    cost: 8,
    description:
      "Multiply energy by 8 while revisiting previously absorbed matter.",
  },
  {
    id: "offline",
    name: "Persistent observer",
    cost: 8,
    description: "Offline feeding operates for up to 24 hours instead of 4.",
  },
  {
    id: "bulk",
    name: "Stream intelligence",
    cost: 12,
    description: "The scheduler can purchase up to 10 bodies at once.",
  },
  {
    id: "archive",
    name: "Autonomous architecture",
    cost: 18,
    description:
      "Automatically rebuild affordable core structures from mastered eras.",
  },
  {
    id: "start",
    name: "Charged seed",
    cost: 20,
    description:
      "Begin each lifecycle with 1,000 energy and accelerated early generation.",
  },
  {
    id: "cosmic",
    name: "Beyond a single star",
    cost: 25,
    description: "Reveal stellar associations, clusters and galactic nuclei.",
  },
  {
    id: "echo",
    name: "Observational continuity",
    cost: 35,
    description: "Each completed lifecycle improves production by 40%.",
  },
  {
    id: "lens",
    name: "Deep field",
    cost: 45,
    description:
      "Double the energy released by black-hole mergers and cosmic captures.",
  },
  {
    id: "conditions",
    name: "Initial conditions",
    cost: 60,
    description:
      "After three lifecycles, cosmic boundary studies can reveal a deeper reset.",
  },
  {
    id: "mastery",
    name: "Perfect recollection",
    cost: 90,
    description:
      "Previously mastered matter uses 60% less energy and arrives 40% faster.",
  },
];
export const PHENOMENA = [
  [
    "horizon",
    "Event horizon",
    "The boundary beyond which light cannot return to a distant observer. A black hole has no solid surface.",
    "The visible shadow is larger than the event horizon. Tiny black holes are stabilized here for play.",
  ],
  [
    "capture",
    "Gravitational capture",
    "Gravity bends trajectories. A passing object usually needs to lose energy to remain bound.",
    "Acquisition energy includes transport and orbital insertion. Distances and time are compressed.",
  ],
  [
    "disk",
    "Accretion disk",
    "Orbiting gas loses angular momentum, falls inward and heats through friction and magnetic turbulence.",
    "The disk is an evolving visualization; resource production is a game economy.",
  ],
  [
    "lensing",
    "Gravitational lensing",
    "Light follows curved paths near a massive object. The far side of a disk can appear above and below the shadow.",
    "The renderer integrates approximate bent light paths. It is not a full Kerr solver.",
  ],
  [
    "tides",
    "Tidal disruption",
    "The near side of a body feels stronger gravity than the far side. That difference can tear the body into a stream.",
    "All targets are deliberately delivered on unstable orbits. Size and tidal limits are exaggerated.",
  ],
  [
    "spin",
    "Black-hole spin",
    "Black holes can carry angular momentum. Spin changes stable orbits and drags nearby spacetime.",
    "The spin dial is an engineering abstraction controlling energy and capture speed.",
  ],
  [
    "stellar",
    "Stellar disruption",
    "A star can be torn apart outside a black hole’s horizon. Some debris falls back and produces a bright flare.",
    "Here the entire purchased target eventually accretes, preserving a clear economy.",
  ],
  [
    "jets",
    "Relativistic jets",
    "Accreting systems can launch narrow outflows along magnetic fields near their rotation axis. Jets do not emerge from inside the horizon.",
    "Jets are unlocked magnetic infrastructure; their appearance is stylized.",
  ],
  [
    "merger",
    "Black-hole merger",
    "Two black holes can orbit, radiate gravitational waves and merge into one remnant.",
    "Real mergers lose some mass to radiation. Here the displayed purchase mass is the retained mass.",
  ],
  [
    "evaporation",
    "Hawking evaporation",
    "Quantum effects predict that black holes radiate and eventually lose mass. Stellar black holes would take vastly longer than the universe’s current age to evaporate.",
    "The accelerated contraction, terminal feeding and burst are a dramatic lifecycle abstraction, not a literal simulation.",
  ],
  [
    "boundary",
    "Cosmic initial conditions",
    "The universe’s initial state determines how matter and structure can develop.",
    "Renewing a universe and preserving Information are fictional progression systems.",
  ],
];
export const EXPERIMENTS = [
  {
    id: "spectra",
    name: "Spectral survey",
    description:
      "Observe 12 absorptions. Energy output doubles for this lifecycle.",
    goal: 12,
  },
  {
    id: "flow",
    name: "Flow stability",
    description: "Observe 30 absorptions. Every delivery becomes 20% faster.",
    goal: 30,
  },
  {
    id: "entropy",
    name: "Entropy record",
    description:
      "Observe 60 absorptions. Gain 3 extra Information at Evaporation.",
    goal: 60,
  },
];
