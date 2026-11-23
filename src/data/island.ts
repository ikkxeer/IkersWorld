/**
 * Where every outdoor prop stands. Scenery builds them from here and the
 * navigation derives colliders from the same lists, so what you see is what
 * you bump into.
 */
type XZ = [number, number]

/** The island's footprint: everything that depends on its size reads this. */
export const shape = {
  /** Radii of the coastline ellipse. */
  coastX: 19.4,
  coastZ: 14.2,
  /** Radii of the walkable lawn inside it. */
  walkX: 18.4,
  walkZ: 12.6,
  /** Where the river spills over the cliff at either end (|z|). */
  lip: 13.25,
  /** The pier runs south from the shore: start and end along z (x = 2.5). */
  pierFrom: 12.95,
  pierTo: 17.45,
}
/** Where the visitor fishes from: the end of the pier, facing the sea. */
export const fishingSpot: XZ = [2.5, 17.05]

export const treeSites: XZ[] = [
  [-12, -3],
  [-13.8, 0.1],
  [-11.7, -5.42],
  [-10.2, -6.25],
  [-8.5, -6.68],
  [-6.3, -7.15],
  [-4.56, -8.85],
  [-0.8, -8.68],
  [2.78, -8.88],
  [5.3, -7.69],
  [7.4, -6.71],
  [13.36, -2.26],
  [13.8, -0.3],
  [12.4, 2.29],
  [10.5, 6.49],
  [-11.42, 2.7],
  [-11.13, 5.42],
  [-6.91, 8.01],
  [0.04, -3.17],
  [4.24, -4.02],
  [4.93, 1.98],
  [5.66, 8.11],
  // The outer ring of the enlarged island.
  [-16.1, -3.9],
  [-15.2, 5.1],
  [-6.1, 10.9],
  [-0.4, 11.7],
  [-9.27, 7.25],
  [-12.6, 8.9],
  [9.2, -10.9],
  [15.6, -5.2],
  [16.6, 3.6],
  [12.3, -9.3],
  [-13.4, -8.2],
  [-2.9, -11.4],
  [7.4, 11.0],
  [14.9, 7.4],
]
/** Conifers keep the same rhythm as before: every 5th from 1, every 7th from 3. */
export const isPine = (i: number) => i % 5 === 1 || i % 7 === 3

export const bushSites: XZ[] = [
  [-8.78, -2],
  [-5.48, -2],
  [-10.24, 1.79],
  [-5, -6.04],
  [0.18, -4.25],
  [2.9, -4.33],
  [7.17, -1.83],
  [10.47, -1.98],
  [7.33, 2.17],
  [8.78, 2.24],
  [-5.31, 7.3],
  [-11, 3.55],
  [-0.42, 7.77],
  [4.47, 7.84],
  [10.67, 5.24],
  [3.98, -2.01],
  [-14.6, -6.2],
  [-9.7, 10.4],
  [16.2, -1.5],
  [4.2, -11.4],
  [-4.4, 10.3],
]

export const lampSites: XZ[] = [
  [-8.25, 0.03],
  [0.82, -2.9],
  [9.99, -0.27],
  [6.85, 5.42],
  [-8.55, 6.35],
  [2.05, 8.72],
  [1.45, 12.15],
  [11.9, 6.9],
  [-6.3, -9.6],
]

export const benchSites: XZ[] = [
  [-5.92, -0.24],
  [5.88, -0.14],
  [-9.96, 4.01],
  // The western lookout, facing the open sea.
  [-15.9, 1.6],
  // A quiet bench on the islet, looking out to sea.
  [-24.9, 3.15],
]

export const cafeTables: XZ[] = [
  [5.8, 4.75],
  [6.22, 3.08],
]

export const rockSites: [number, number, number][] = [
  [-12.7, -1.4, 1],
  [11.9, -1.7, 0.8],
  [-3.6, -8.2, 0.9],
  [7.2, 8.25, 0.85],
  [-9.9, -6.2, 0.7],
  [13.1, 1.2, 0.75],
]

export const fenceRuns: XZ[][] = [
  [
    [-10.4, -4.7],
    [-10.5, -3.45],
    [-10.6, -2.12],
    [-10.4, -1],
    [-9.24, -0.9],
  ],
  [
    [-5, -5.17],
    [-4.37, -4.25],
    [-4.36, -2.94],
    [-4.28, -1.74],
  ],
  [
    [4.15, -6.61],
    [5.4, -6.31],
    [6.4, -5.83],
  ],
  [
    [7.23, 7.04],
    [8.48, 7.01],
    [9.65, 6.81],
  ],
]

export const wellSite: XZ = [5.7, -4.9]
export const parasolSite: XZ = [12.3, 9.0]
export const picnicSite: XZ = [4.4, 3.5]

/** New corners of the enlarged island. */
export const tulipField = { center: [-8.6, -10.1] as XZ, width: 4.6, depth: 2.2 }
export const pond = { center: [6.6, -10.2] as XZ, radius: 1.35 }
export const beach = { center: [11.2, 9.1] as XZ, radiusX: 3.1, radiusZ: 1.35 }
export const palmSites: XZ[] = [
  [9.2, 9.8],
  [13.6, 8.0],
  [10.6, 7.6],
]
export const telescopeSite: XZ = [-16.85, -0.7]

/**
 * The mountain shrine (south-west): a raised octagonal tournament ring
 * reached through a torii gate, ringed by rock spires, a gong, a training
 * post, stone lanterns and banners.
 */
/**
 * A quiet islet off the west coast, reached by a long wooden bridge from
 * the lookout. It holds the shrine.
 */
export const islet = {
  center: [-26.2, 1.2] as XZ,
  /** Coastline radii, and the walkable lawn inside them. */
  coastX: 4.6,
  coastZ: 3.9,
  walkX: 3.85,
  walkZ: 3.15,
  /** The bridge runs along z = bridgeZ from the island to the islet. */
  bridgeZ: 0.9,
  bridgeFrom: -17.7,
  bridgeTo: -22.75,
  bridgeWidth: 1.15,
}
export const onBridge = (x: number, z: number) =>
  x < islet.bridgeFrom + 0.1 && x > islet.bridgeTo - 0.25 && Math.abs(z - islet.bridgeZ) < islet.bridgeWidth / 2 - 0.08
export const onIslet = (x: number, z: number) =>
  ((x - islet.center[0]) / islet.walkX) ** 2 + ((z - islet.center[1]) / islet.walkZ) ** 2 <= 1
/** Bridge deck height: a gentle arch over the water. */
export function bridgeDeck(x: number) {
  const t = Math.min(1, Math.max(0, (islet.bridgeFrom - x) / (islet.bridgeFrom - islet.bridgeTo)))
  return 0.12 + 0.14 * Math.sin(Math.PI * t)
}

/**
 * The mountain shrine on the islet: a raised octagonal tournament ring
 * reached through a torii gate, ringed by rock spires, a gong, a training
 * post, stone lanterns, banners, paper lanterns and two cherry trees.
 */
export const shrine = {
  center: [-26.6, 1.3] as XZ,
  radius: 1.45,
  gate: [-23.55, 1.0] as XZ,
  /** Gate posts sit either side of the path into the ring. */
  gateYaw: Math.atan2(-26.6 + 23.55, 1.3 - 1.0),
  spires: [
    [-29.1, -0.5, 3.0],
    [-29.4, 2.8, 2.3],
    [-27.4, 4.1, 1.6],
    [-26.3, -1.75, 1.8],
  ] as [number, number, number][],
  gong: [-29.0, 1.6] as XZ,
  post: [-24.0, 3.0] as XZ,
  lanterns: [
    [-23.2, 2.0],
    [-23.2, 0.0],
  ] as XZ[],
  banners: [] as XZ[],
  /** Posts carrying strings of paper lanterns around the ring. */
  lanternPosts: Array.from({ length: 6 }, (_, i) => {
    const a = (i / 6) * Math.PI * 2 + 0.3
    return [-26.6 + Math.cos(a) * 2.25, 1.3 + Math.sin(a) * 2.25] as XZ
  }),
  sakura: [
    [-28.0, -1.55, 0.95],
    [-24.25, 3.85, 0.8],
  ] as [number, number, number][],
}
/** Is (x, z) on the shrine islet (kept clear of the island's flowers and tufts)? */
export const inShrine = (x: number, z: number) => onIslet(x, z) || onBridge(x, z)
/** Floor height on the raised ring, easing up over its chamfered rim. */
export function shrineFloor(x: number, z: number) {
  const r = Math.hypot(x - shrine.center[0], z - shrine.center[1])
  const t = Math.min(1, Math.max(0, (shrine.radius + 0.15 - r) / 0.3))
  return 0.1 + 0.11 * t * t * (3 - 2 * t)
}


/** The campfire circle: the fire pit and the three log seats around it. */
export const campfire = {
  fire: [-0.45, 4.2] as XZ,
  /** Offset from the fire, and the log's yaw. */
  logs: [
    [0.35, -0.8, 0.41],
    [0.62, 0.48, -0.75],
    [-0.12, 0.86, 0.15],
  ] as [number, number, number][],
  /** Two posts carrying a string of paper lanterns over the circle. */
  posts: [
    [-0.95, -0.95],
    [-1.3, 0.72],
  ] as XZ[],
  woodpile: [1.15, -0.25] as XZ,
}

/** Paper lanterns hanging on the string between the campfire posts. */
export function lanternPoints(count = 5) {
  const [fx, fz] = campfire.fire
  const [[ax, az], [bx, bz]] = campfire.posts
  return Array.from({ length: count }, (_, i) => {
    const t = (i + 1) / (count + 1)
    return [fx + ax + (bx - ax) * t, 1.62 - Math.sin(Math.PI * t) * 0.32, fz + az + (bz - az) * t] as [number, number, number]
  })
}

/** Circles the visitor cannot walk into: (x, z, radius). */
export function propColliders() {
  const out: [number, number, number][] = []
  for (const [x, z] of treeSites) out.push([x, z, 0.36])
  for (const [x, z] of bushSites) out.push([x, z, 0.42])
  for (const [x, z] of lampSites) out.push([x, z, 0.24])
  for (const [x, z] of benchSites)
    for (const dx of [-0.45, 0, 0.45]) out.push([x + dx, z - 0.05, 0.3])
  for (const [x, z] of cafeTables) out.push([x, z, 0.72])
  for (const [x, z, k] of rockSites) out.push([x + 0.1 * k, z, 0.48 * k])
  for (const run of fenceRuns)
    for (let i = 0; i < run.length - 1; i++) {
      const [ax, az] = run[i],
        [bx, bz] = run[i + 1]
      const steps = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.3)
      for (let s = 0; s <= steps; s++)
        out.push([ax + ((bx - ax) * s) / steps, az + ((bz - az) * s) / steps, 0.16])
    }
  out.push([...wellSite, 0.62], [...parasolSite, 0.25], [parasolSite[0] + 0.73, parasolSite[1] + 0.2, 0.42])
  for (const [x, z] of palmSites) out.push([x, z, 0.3])
  out.push([...telescopeSite, 0.3])
  // Shrine: gate posts, spires, gong, training post, lanterns, banners.
  const [gx, gz] = shrine.gate
  const across = shrine.gateYaw + Math.PI / 2
  for (const side of [-1, 1]) out.push([gx + Math.sin(across) * 0.78 * side, gz + Math.cos(across) * 0.78 * side, 0.18])
  for (const [x, z, h] of shrine.spires) out.push([x, z, 0.45 + h * 0.08])
  out.push([...shrine.gong, 0.42], [...shrine.post, 0.22])
  for (const [x, z] of shrine.lanternPosts) out.push([x, z, 0.14])
  for (const [x, z] of shrine.sakura) out.push([x, z, 0.36])
  for (const [x, z] of shrine.lanterns) out.push([x, z, 0.22])
  for (const [x, z] of shrine.banners) out.push([x, z, 0.12])
  // The pond is water: walk around it.
  const [px, pz] = pond.center
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2
    out.push([px + Math.cos(a) * pond.radius * 0.55, pz + Math.sin(a) * pond.radius * 0.55, pond.radius * 0.62])
  }
  const [fx, fz] = campfire.fire
  out.push([fx, fz, 0.55])
  for (const [dx, dz] of campfire.posts) out.push([fx + dx, fz + dz, 0.16])
  out.push([fx + campfire.woodpile[0], fz + campfire.woodpile[1], 0.3])
  for (const [dx, dz, turn] of campfire.logs)
    for (const k of [-1, 0, 1])
      out.push([fx + dx + k * Math.cos(turn) * 0.3, fz + dz + k * Math.sin(turn) * 0.3, 0.24])
  return out
}
