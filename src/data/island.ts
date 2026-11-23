/**
 * Where every outdoor prop stands. Scenery builds them from here and the
 * navigation derives colliders from the same lists, so what you see is what
 * you bump into.
 */
type XZ = [number, number]

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
  [-9.27, 7.25],
  [-6.91, 8.01],
  [0.04, -3.17],
  [4.24, -4.02],
  [4.93, 1.98],
  [5.66, 8.11],
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
]

export const lampSites: XZ[] = [
  [-8.25, 0.03],
  [0.82, -2.9],
  [9.99, -0.27],
  [6.85, 5.42],
  [-8.55, 6.35],
  [2.05, 8.72],
]

export const benchSites: XZ[] = [
  [-5.92, -0.24],
  [5.88, -0.14],
  [-9.96, 4.01],
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
export const parasolSite: XZ = [12.1, 4.1]
export const picnicSite: XZ = [4.4, 3.5]

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
  const [fx, fz] = campfire.fire
  out.push([fx, fz, 0.55])
  for (const [dx, dz] of campfire.posts) out.push([fx + dx, fz + dz, 0.16])
  out.push([fx + campfire.woodpile[0], fz + campfire.woodpile[1], 0.3])
  for (const [dx, dz, turn] of campfire.logs)
    for (const k of [-1, 0, 1])
      out.push([fx + dx + k * Math.cos(turn) * 0.3, fz + dz + k * Math.sin(turn) * 0.3, 0.24])
  return out
}
