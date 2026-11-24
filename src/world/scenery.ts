import * as T from 'three'
import {
  Batch,
  ModelKit,
  bark,
  seeded,
  timber,
  trim,
  wood,
  type XZ,
} from './modelKit'
import { building, lighthouse, pickable } from './village'
import { decoratePlaza, exhibit } from './exhibits'
import { exhibitSpots } from '../data/exhibits'
import {
  riverAt,
  riverWidthAt,
  pathways,
  shape,
  lanternPoints,
  benchSites,
  bushSites,
  cafeTables,
  campfire,
  fenceRuns,
  isPine,
  lampSites,
  parasolSite,
  picnicSite,
  rockSites,
  treeSites,
  tulipField,
  pond,
  beach,
  palmSites,
  telescopeSite,
  tideOrgan,
  onOrganDeck,
  onCoveSand,
  radioCove,
  shrine,
  inShrine,
  shrineFloor,
  islet,
  onBridge,
  bridgeDeck,
  wellSite,
} from '../data/island'
import { walkable } from './navigation'
import { createPond, createRiver } from './water'
import { createAmbience } from './ambience'

const river = riverAt
const riverWidth = riverWidthAt

function terrain(b: Batch) {
  const rand = seeded(71)
  // Each bank follows one arc of the coastline and returns along the stream.
  const n = 112,
    coast: XZ[] = []
  for (let i = 0; i < n; i++) {
    const a = (2 * Math.PI * i) / n,
      ripple =
        1 +
        0.018 * Math.sin(a * 7) +
        0.012 * Math.cos(a * 11) +
        0.008 * Math.sin(a * 19)
    coast.push([shape.coastX * Math.cos(a) * ripple, shape.coastZ * Math.sin(a) * ripple])
  }
  b.horizontal(
    coast.map(([x, z]) => [x * 1.044, z * 1.052]),
    -0.62,
    0.37,
    '#f3d7a2',
    undefined,
    0.1,
    4,
    true,
  )
  b.horizontal(
    coast.map(([x, z]) => [x * 1.087, z * 1.088]),
    -0.81,
    0.21,
    '#efcc92',
    undefined,
    0.08,
    4,
  )
  const nearRiver = (p: XZ, s: number) =>
    s * (p[0] - river(p[1])) - riverWidth(p[1])
  for (const side of [-1, 1]) {
    const outer: XZ[] = []
    for (let i = 0; i < n; i++) {
      const a = coast[i],
        c = coast[(i + 1) % n],
        da = nearRiver(a, side),
        dc = nearRiver(c, side)
      if (da >= 0) outer.push(a)
      if (da >= 0 !== dc >= 0) {
        const k = da / (da - dc)
        outer.push([a[0] + k * (c[0] - a[0]), a[1] + k * (c[1] - a[1])])
      }
    }
    // Rotate at the gap so the coast runs continuously between the two estuary tips.
    let split = 0
    for (let i = 0; i < outer.length; i++)
      if (Math.abs(outer[i][1] - outer[(i + 1) % outer.length][1]) > 9)
        split = i + 1
    const arc = [...outer.slice(split), ...outer.slice(0, split)]
    const last = arc[arc.length - 1][1],
      first = arc[0][1],
      outline = [...arc]
    for (let j = 1; j < 34; j++) {
      const z = last + ((first - last) * j) / 34
      outline.push([river(z) + side * riverWidth(z), z])
    }
    b.horizontal(outline, -0.28, 0.39, '#d4a36a', undefined, 0.155, 4)
    b.horizontal(outline, -0.12, 0.19, '#dbb87d', undefined, 0.105, 4)
    b.horizontal(outline, 0.005, 0.14, '#8fbf66', b.kit.grass, 0.095, 5, true)
  }
  // Boulders frame both river mouths where the stream spills to the beach.
  for (const s of [-1, 1])
    for (const side of [-1, 1])
      for (let i = 0; i < 3; i++) {
        const z = s * (shape.lip + 0.45 + i * 0.45)
        b.ball(
          [river(z) + side * (riverWidth(z) * (1.15 + i * 0.35) + 0.25), -0.38 - i * 0.12, z],
          [0.32 - i * 0.05, 0.26 - i * 0.04, 0.3 - i * 0.04],
          ['#b6ab99', '#c9bfae', '#a9a08f'][i],
          1,
          [0, i + side, 0.1],
        )
      }
  // Pebbled cliff faces keep the silhouette varied even at the waterline.
  for (let i = 0; i < 100; i++) {
    const a = rand() * Math.PI * 2,
      idx = Math.floor((a * n) / (Math.PI * 2)),
      [x, z] = coast[idx]
    if (Math.abs(x - river(z)) < 1.15) continue
    const s = 0.1 + rand() * 0.29
    b.ball(
      [
        x * (1 + rand() * 0.031),
        -0.49 - rand() * 0.22,
        z * (1 + rand() * 0.038),
      ],
      [s * 1.7, s, s * 1.3],
      ['#b6a491', '#c9ac88', '#d6b48a', '#a9a896'][i % 4],
      0,
      [0, rand() * 6, 0.11],
    )
  }
}
function meadow(b: Batch) {
  const rand = seeded(931)
  for (const [x, z] of [
    [-10.6, 1.1],
    [-8, 1.17],
    [-4.75, 0.85],
    [0.89, 1.2],
    [4.12, 0.96],
    [6.03, 0.83],
    [9.8, 1.14],
    [2.4, 3.24],
    [2.71, 7.15],
    [-7.1, 6.49],
    [6.36, 5.76],
  ]) {
    for (let j = 0; j < 3; j++) {
      const dx = (rand() - 0.5) * 0.47,
        dz = (rand() - 0.5) * 0.3
      b.ball(
        [x + dx, 0.118, z + dz],
        [0.07 + rand() * 0.05, 0.022, 0.04 + rand() * 0.03],
        j % 2 ? '#cbb68b' : '#edd8b0',
        0,
      )
    }
  }
  for (const z of [-8, -6.8, -4.5, -1.5, 2.3, 7.8, 9.3]) {
    const x = river(z) + riverWidth(z) + 0.09
    for (let j = 0; j < 3; j++) {
      const dx = (j - 1) * 0.08,
        dz = rand() * 0.25,
        h = 0.28 + rand() * 0.22
      b.stick(
        [x + dx, 0, z + dz],
        [x + dx + 0.03, h, z + dz],
        0.016,
        '#829653',
        4,
      )
      b.ball([x + dx + 0.03, h, z + dz], [0.038, 0.092, 0.04], '#a2804e', 0)
    }
  }
}
/** Every path drawn, so flowers can be planted along the verges. */
const routes: { pts: XZ[]; width: number }[] = []
function path(b: Batch, pts: XZ[], width: number, c = '#ecd3a0') {
  const left: XZ[] = [],
    right: XZ[] = []
  pts.forEach(([x, z], i) => {
    const prev = pts[Math.max(0, i - 1)],
      next = pts[Math.min(pts.length - 1, i + 1)]
    const dx = next[0] - prev[0],
      dz = next[1] - prev[1],
      l = Math.hypot(dx, dz) || 1
    left.push([x - ((dz / l) * width) / 2, z + ((dx / l) * width) / 2])
    right.push([x + ((dz / l) * width) / 2, z - ((dx / l) * width) / 2])
  })
  b.horizontal([...left, ...right.reverse()], 0.104, 0.02, c, b.kit.soil, 0.008, 2, true)
  routes.push({ pts, width })
}
const bridgeWidth = 2.9
const bridgeTop = (progress: number) =>
  0.19 + 0.18 * Math.sin(progress * Math.PI)

export function islandFloorHeight(x: number, z: number) {
  const bridgeZ =
    Math.abs(z - 1) < 0.76 ? 1 : Math.abs(z - 6.5) < 0.76 ? 6.5 : null
  if (bridgeZ !== null) {
    const across = (x - river(bridgeZ)) / bridgeWidth + 0.5
    if (across >= 0 && across <= 1) return bridgeTop(across)
  }
  if (z > shape.pierFrom + 0.15 && Math.abs(x - 2.5) < 0.9) return -0.06
  if (onOrganDeck(x, z)) return 0.17
  if (onCoveSand(x, z)) return 0.13
  if (onBridge(x, z)) return bridgeDeck(x)
  if (inShrine(x, z)) return shrineFloor(x, z)
  // The bevel rises above the nominal top of the grass extrusion.
  return 0.1
}

function bridge(b: Batch, z: number) {
  const x = river(z)
  for (let i = 0; i < 13; i++) {
    const t = i / 12,
      xx = x + (t - 0.5) * bridgeWidth,
      y = bridgeTop(t) - 0.07
    b.block(
      [xx, y, z],
      [0.219, 0.14, 1.49],
      i % 3 === 1 ? '#c7925b' : '#dcac70',
      [0, 0, 0.15 * Math.cos(t * Math.PI)],
      true,
    )
  }
  for (const s of [-1, 1]) {
    const za = z + s * 0.74
    for (const v of [-1, 0, 1]) {
      b.stick(
        [x + 1.28 * v, -0.1, za],
        [x + 1.28 * v, 0.79 + 0.13 * (1 - Math.abs(v)), za],
        0.069,
        wood,
        7,
      )
      b.ball(
        [x + 1.28 * v, 0.84 + 0.13 * (1 - Math.abs(v)), za],
        [0.091, 0.075, 0.091],
        trim,
        1,
      )
    }
    for (const v of [-1, 1])
      b.stick([x, 0.89, za], [x + 1.28 * v, 0.77, za], 0.044, timber)
  }
}
function fence(b: Batch, pts: XZ[]) {
  for (let i = 0; i < pts.length; i++) {
    const [x, z] = pts[i]
    b.block([x, 0.37, z], [0.15, 0.71, 0.16], '#ded0a2', [0, 0, 0], true)
    b.cylinder([x, 0.76, z], 0.025, 0.12, 0.12, trim, 4, [0, Math.PI / 4, 0])
    const next = pts[i + 1]
    if (next)
      for (const y of [0.25, 0.49])
        b.stick([x, y, z], [next[0], y, next[1]], 0.057, trim, 6)
  }
}
function lamp(b: Batch, x: number, z: number) {
  b.cylinder([x, 0.1, z], 0.21, 0.24, 0.18, '#657970', 8)
  b.stick([x, 0.1, z], [x, 1.72, z], 0.073, '#59756b', 8)
  b.cylinder([x, 1.72, z], 0.23, 0.13, 0.11, '#526f65', 8)
  b.cylinder(
    [x, 1.94, z],
    0.2,
    0.155,
    0.35,
    '#ffda94',
    6,
    [0, 0, 0],
    b.kit.glass,
  )
  b.cylinder([x, 2.17, z], 0.07, 0.29, 0.19, '#577466', 8)
  b.ball([x, 2.29, z], [0.065, 0.085, 0.065], trim, 1)
}
function bench(b: Batch, x: number, z: number) {
  for (const s of [-1, 1]) {
    b.block([x + 0.48 * s, 0.19, z], [0.14, 0.37, 0.48], timber)
    b.block([x + 0.48 * s, 0.44, z - 0.21], [0.11, 0.72, 0.11], timber)
  }
  for (let i = -1; i <= 1; i++)
    b.block([x, 0.42, z + i * 0.16], [1.38, 0.1, 0.14], wood, [0, 0, 0], true)
  for (let i = 0; i < 2; i++)
    b.block(
      [x, 0.65 + i * 0.18, z - 0.22],
      [1.35, 0.15, 0.1],
      '#b58557',
      [0, 0, 0],
      true,
    )
}
/** Canopy smoothness: rounder blobs read softer and friendlier. */
let leafDetail = 2
function bush(b: Batch, x: number, z: number, s: number, c: string, bloom?: string) {
  for (let i = -1; i <= 1; i++)
    b.ball(
      [x + i * s * 0.33, 0.25 * s, z],
      [
        s * (0.45 + 0.08 * (1 - Math.abs(i))),
        s * (0.37 + 0.13 * (1 - Math.abs(i))),
        s * 0.43,
      ],
      c,
      1,
      [0, i + 0.4, 0],
      b.kit.leaf,
    )
  // Flowering shrubs: little clusters of blossoms dotted over the leaves.
  if (bloom)
    for (let j = 0; j < 9; j++) {
      const a = j * 2.39,
        up = 0.35 + 0.5 * ((j * 0.37) % 1)
      b.ball(
        [
          x + Math.cos(a) * s * 0.55 * (1 - up * 0.4),
          s * (0.2 + 0.42 * up),
          z + Math.sin(a) * s * 0.38 * (1 - up * 0.4),
        ],
        [0.075 * s, 0.065 * s, 0.075 * s],
        j % 3 ? bloom : '#fff6e6',
        1,
        [0, a, 0],
        b.kit.leaf,
      )
    }
}
function tree(
  b: Batch,
  x: number,
  z: number,
  s: number,
  i: number,
  pine = false,
) {
  const lean = ((i * 0.37) % 1) * 0.12 - 0.06
  // Roots flaring out of the ground.
  for (let r = 0; r < 4; r++) {
    const a = (r / 4) * Math.PI * 2 + i
    b.stick(
      [x + Math.cos(a) * 0.3 * s, 0.07, z + Math.sin(a) * 0.3 * s],
      [x + Math.cos(a) * 0.06 * s, 0.32 * s, z + Math.sin(a) * 0.06 * s],
      0.075 * s,
      bark,
      6,
      0.55,
    )
  }
  if (pine) {
    b.stick([x, 0, z], [x + lean * s, 1.1 * s, z], 0.15 * s, bark, 8, 0.7)
    // A plump cedar: drooping tiers with a scalloped skirt and a top tuft.
    const tiers = ['#447f62', '#528f6a', '#66a374', '#7fb780']
    const rim = leafDetail > 1 ? 9 : 6
    for (let j = 0; j < 4; j++) {
      const y = (0.95 + 0.47 * j) * s,
        r = (1.02 - 0.21 * j) * s,
        h = (0.9 - 0.08 * j) * s
      const cx = x + lean * s * (1 + j * 0.25)
      b.cylinder([cx, y, z], 0.1 * s, r * 0.92, h, tiers[j], 12, [0, i * 0.5 + j * 0.3, 0], b.kit.leaf)
      for (let k = 0; k < rim; k++) {
        const a = (k / rim) * Math.PI * 2 + j * 0.6 + i
        // Flattened, overlapping lobes make a soft scalloped skirt.
        b.ball(
          [cx + Math.cos(a) * r * 0.78, y - h * 0.4, z + Math.sin(a) * r * 0.78],
          [0.34 * s * (1 - j * 0.15), 0.1 * s, 0.26 * s * (1 - j * 0.15)],
          tiers[j],
          0,
          [0, -a, 0.38],
          b.kit.leaf,
        )
      }
    }
    b.ball([x + lean * s * 2, 2.85 * s, z], [0.2 * s, 0.25 * s, 0.2 * s], tiers[3], 1, [0, 0, 0], b.kit.leaf)
    return
  }
  const blossom = i % 7 === 5
  const cols = blossom
    ? ['#e993a8', '#f4b2c2', '#fbd4dd']
    : i % 3 === 0
      ? ['#5f9a4c', '#7cb15a', '#9fcb6c']
      : i % 3 === 1
        ? ['#5a9c5e', '#73b268', '#98c97a']
        : ['#6aa65a', '#86ba66', '#aad37d']
  const top = 1.5 * s
  b.stick([x, 0, z], [x + lean * s, top, z], 0.17 * s, bark, 10, 0.66)
  for (const side of [-1, 1])
    b.stick(
      [x + lean * s * 0.7, 1.0 * s, z],
      [x + side * 0.55 * s, 1.62 * s, z + 0.12 * s * side],
      0.075 * s,
      bark,
      7,
      0.55,
    )
  // A fluffy crown: a shaded core wrapped in leafy clumps spread over a
  // sphere, brighter where the sun catches the top.
  const cx = x + lean * s * 1.2,
    cy = 2.05 * s
  b.ball([cx, cy, z], [0.9 * s, 0.78 * s, 0.86 * s], cols[0], 1, [0.1, i, 0], b.kit.leaf)
  const clumps = leafDetail > 1 ? 14 : 9
  for (let k = 0; k < clumps; k++) {
    // Fibonacci sphere, skipping the very bottom.
    const yN = 1 - ((k + 0.5) / clumps) * 1.55
    const ring = Math.sqrt(Math.max(0, 1 - yN * yN))
    const a = k * 2.39996 + i
    const size = (0.42 + 0.1 * ((k * 0.618 + i * 0.3) % 1)) * s
    b.ball(
      [cx + Math.cos(a) * ring * 0.78 * s, cy + yN * 0.62 * s, z + Math.sin(a) * ring * 0.74 * s],
      [size, size * 0.86, size],
      cols[yN > 0.35 ? 2 : yN > -0.2 ? 1 : 0],
      1,
      [0, a, 0.2],
      b.kit.leaf,
    )
  }
  if (blossom || i % 3 === 0)
    for (let j = 0; j < 7; j++) {
      const a = j * 2.4 + i,
        dx = Math.sin(a) * 1.0 * s,
        dz = Math.cos(a) * 0.94 * s
      b.ball(
        [cx + dx, (1.75 + (j % 3) * 0.22) * s, z + dz],
        blossom ? [0.1 * s, 0.09 * s, 0.1 * s] : [0.14 * s, 0.15 * s, 0.14 * s],
        blossom ? '#fff1f3' : j % 2 ? '#f29a5e' : '#e2784f',
        0,
      )
    }
}
/** A cup-shaped tulip on a tall stem. */
function tulip(b: Batch, x: number, z: number, c: string, r: number) {
  const h = 0.27 + 0.1 * r
  b.stick([x, 0.1, z], [x, h, z], 0.014, '#6e9256', 4)
  b.ball([x + 0.04, h * 0.55, z], [0.1, 0.03, 0.035], '#7ba561', -1, [0, r * 3, 0.5], b.kit.petals)
  for (let j = 0; j < 3; j++) {
    const a = (j * Math.PI * 2) / 3 + r
    b.ball([x + Math.cos(a) * 0.03, h + 0.04, z + Math.sin(a) * 0.03], [0.05, 0.075, 0.05], c, -1, [0, a, 0], b.kit.petals)
  }
}
function flower(b: Batch, x: number, z: number, c: string, r: number) {
  // Tiny at this camera distance: octahedral petals read as soft blobs at a
  // fraction of the triangles.
  const h = 0.24 + 0.11 * r
  b.stick([x, 0.1, z], [x, h, z], 0.014, '#6e9256', 3)
  b.ball([x - 0.045, h * 0.6, z], [0.1, 0.034, 0.035], '#7ba561', -1, [0, 0, -0.5], b.kit.petals)
  for (let j = 0; j < 5; j++) {
    const a = (j * Math.PI * 2) / 5 + r
    b.ball([x + Math.cos(a) * 0.065, h, z + Math.sin(a) * 0.065], [0.08, 0.042, 0.072], c, -1, [0, a, 0], b.kit.petals)
  }
  b.ball([x, h + 0.028, z], [0.053, 0.046, 0.053], '#efc45a', -1, [0, 0, 0], b.kit.petals)
}
function sign(kit: ModelKit) {
  const b = new Batch(kit)
  for (const s of [-1, 1])
    b.block([s * 0.48, 0.64, 0], [0.13, 1.22, 0.14], wood)
  b.block([0, 1.04, 0], [1.37, 0.8, 0.16], timber, [0, 0, 0], true)
  b.block([0, 1.04, 0.1], [1.17, 0.62, 0.06], '#e9d5a6', [0, 0, 0], true)
  b.ball([0, 1.04, 0.15], [0.43, 0.227, 0.032], '#80ad79', 1)
  b.stick([-0.12, 0.88, 0.18], [0.06, 1.18, 0.18], 0.03, '#7cb8c0', 5)
  for (let i = 0; i < 3; i++)
    b.ball(
      [-0.23 + 0.21 * i, 1.09 + Math.sin(i) * 0.06, 0.18],
      [0.043, 0.043, 0.027],
      ['#ca8159', '#dca54c', '#648c83'][i],
    )
  b.block([0, 1.49, 0], [1.52, 0.16, 0.44], '#729981', [0.09, 0, 0], true)
  return b.finish()
}
function mailbox(kit: ModelKit) {
  const b = new Batch(kit)
  b.block([0, 0.51, 0], [0.21, 0.98, 0.2], wood, [0, 0, 0], true)
  b.block([0, 0.96, 0], [0.7, 0.13, 0.82], trim, [0, 0, 0], true)
  const shape: XZ[] = [
    [-0.32, 0],
    [0.32, 0],
    [0.32, 0.27],
  ]
  for (let j = 0; j <= 8; j++)
    shape.push([
      0.32 * Math.cos((j * Math.PI) / 8),
      0.26 + 0.31 * Math.sin((j * Math.PI) / 8),
    ])
  b.prism(shape, 0.74, '#c96c58', [0, 1, -0.36], [0, 0, 0], 0.025)
  b.block([0, 1.32, 0.411], [0.43, 0.066, 0.025], timber, [0, 0, 0], true)
  b.block([0, 1.16, 0.418], [0.22, 0.07, 0.026], trim)
  b.block([0.37, 1.48, -0.02], [0.047, 0.42, 0.048], wood)
  b.block([0.37, 1.65, 0.09], [0.054, 0.16, 0.24], '#f4c167')
  return b.finish()
}
function pier(b: Batch) {
  const boards = Math.round((shape.pierTo - shape.pierFrom) / 0.28)
  for (let i = 0; i < boards; i++)
    b.block(
      [2.5, -0.14, shape.pierFrom + 0.1 + i * 0.28],
      [1.78, 0.16, 0.26],
      i % 3 ? '#b98d59' : '#caa06b',
      [0, 0, 0],
      true,
    )
  for (const s of [-1, 1])
    for (let z = shape.pierFrom + 0.25; z < shape.pierTo; z += 1.45) {
      b.stick(
        [2.5 + s * 0.8, -1.06, z],
        [2.5 + s * 0.8, 0.18, z],
        0.104,
        timber,
      )
      b.cylinder([2.5 + s * 0.8, 0.19, z], 0.117, 0.12, 0.09, trim, 8)
    }
  // Small moored wooden dinghy, with a recessed hull and two transverse seats.
  const x = 4.05,
    z = shape.pierFrom + 2.3
  const hull: XZ[] = [
    [-0.42, -0.63],
    [-0.32, -0.97],
    [0, -1.16],
    [0.32, -0.97],
    [0.42, -0.63],
    [0.42, 0.69],
    [0.26, 0.95],
    [-0.26, 0.95],
    [-0.42, 0.69],
  ]
  const poly = (scale: number): XZ[] =>
    hull.map(([a, b]) => [x + a * scale, z + b * scale])
  b.horizontal(poly(1), -0.47, 0.23, '#a07450', undefined, 0.04)
  b.horizontal(poly(0.84), -0.46, 0.012, '#765742')
  for (const dz of [-0.43, 0.36])
    b.block([x, -0.409, z + dz], [0.72, 0.08, 0.17], '#d2a873')
  b.stick([3.25, -0.09, z], [3.8, -0.43, z - 0.5], 0.022, trim, 5)
}
function bird(kit: ModelKit) {
  const b = new Batch(kit)
  b.ball([0, 0.29, 0], [0.15, 0.24, 0.32], '#f3e8cb', 1)
  b.ball([0, 0.48, 0.14], [0.15, 0.16, 0.16], '#f7edda', 1)
  b.ball([0, 0.47, 0.31], [0.065, 0.041, 0.102], '#deab61', 0)
  for (const s of [-1, 1]) {
    b.ball(
      [s * 0.137, 0.31, -0.02],
      [0.055, 0.13, 0.25],
      '#9baba3',
      1,
      [0.18, 0, 0],
    )
    b.ball([s * 0.085, 0.5, 0.262], [0.022, 0.022, 0.022], timber, 1)
    b.stick([s * 0.073, 0.04, 0], [s * 0.073, 0.16, 0], 0.019, '#c59255', 5)
  }
  return b.finish()
}

/* ------------------------------------------------------------------------ */
/* Cosy outdoor props.                                                       */

/** Stone-ringed fire pit with log seats around it. */
function campfireCircle(b: Batch, x: number, z: number) {
  // A soft earthen clearing so the circle feels worn in by many evenings.
  const clearing: XZ[] = []
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2,
      r = 1.55 + 0.12 * Math.sin(a * 3) + 0.06 * Math.cos(a * 5)
    clearing.push([x + Math.cos(a) * r, z + Math.sin(a) * r])
  }
  b.horizontal(clearing, 0.104, 0.02, '#e4c99a', b.kit.soil, 0.01, 2, true)
  // Lantern posts and a sagging string of paper lanterns.
  const lanterns = lanternPoints()
  for (const [dx, dz] of campfire.posts) {
    b.stick([x + dx, 0.1, z + dz], [x + dx, 1.75, z + dz], 0.05, timber, 7)
    b.ball([x + dx, 1.78, z + dz], [0.07, 0.06, 0.07], trim, 1)
  }
  const [[ax, az], [bx, bz]] = campfire.posts
  let prev: [number, number, number] = [x + ax, 1.66, z + az]
  for (const point of [...lanterns, [x + bx, 1.66, z + bz] as [number, number, number]]) {
    b.stick(prev, point, 0.008, '#6b5444', 4)
    prev = point
  }
  lanterns.forEach(([lx, ly, lz], i) => {
    b.stick([lx, ly, lz], [lx, ly - 0.08, lz], 0.006, '#6b5444', 4)
    b.ball([lx, ly - 0.2, lz], [0.1, 0.13, 0.1], ['#ffd27a', '#ff9e8a', '#fff1c4', '#ffc46b', '#ffb3a1'][i % 5], 1, [0, 0, 0], b.kit.glass)
    b.cylinder([lx, ly - 0.07, lz], 0.05, 0.05, 0.03, '#7a5a40', 8)
  })
  // Firewood, stacked and ready.
  const [wx, wz] = campfire.woodpile
  for (let row = 0; row < 3; row++)
    for (let i = 0; i < 3 - row; i++) {
      const dz = (i - (2 - row) / 2) * 0.17
      b.stick([x + wx - 0.32, 0.18 + row * 0.15, z + wz + dz], [x + wx + 0.32, 0.18 + row * 0.15, z + wz + dz], 0.075, i % 2 ? '#a06c45' : '#8f5f3d', 8)
      b.cylinder([x + wx + 0.325, 0.18 + row * 0.15, z + wz + dz], 0.07, 0.07, 0.01, '#e7c391', 8, [0, 0, Math.PI / 2])
    }
  // A ring of wildflowers around the clearing.
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + 0.4,
      r = 1.72
    flower(b, x + Math.cos(a) * r, z + Math.sin(a) * r, ['#fcf2c7', '#f09aa4', '#f6c768'][i % 3], (i * 0.37) % 1)
  }
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2
    b.ball([x + Math.cos(a) * 0.36, 0.15, z + Math.sin(a) * 0.36], [0.12, 0.09, 0.11], i % 2 ? '#b8ad9c' : '#cfc4b0', 1, [0, a, 0])
  }
  b.cylinder([x, 0.12, z], 0.3, 0.3, 0.03, '#5b4a3e', 12)
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.3
    b.stick([x + Math.cos(a) * 0.24, 0.14, z + Math.sin(a) * 0.24], [x - Math.cos(a) * 0.05, 0.3, z - Math.sin(a) * 0.05], 0.05, '#8a5a3a', 6)
  }
  for (const [dx, dz, turn] of campfire.logs) {
    const cx = x + dx,
      cz = z + dz
    const ex = Math.cos(turn) * 0.36,
      ez = Math.sin(turn) * 0.36
    b.stick([cx - ex, 0.24, cz - ez], [cx + ex, 0.24, cz + ez], 0.14, '#9a6a45', 10)
    for (const end of [-1, 1])
      b.cylinder([cx + end * ex * 1.01, 0.24, cz + end * ez * 1.01], 0.125, 0.125, 0.02, '#e2bd8a', 10, [0, -turn, Math.PI / 2])
  }
}
/** A gingham picnic blanket with a basket, a teapot and cups. */
function picnic(b: Batch, x: number, z: number) {
  const rot: [number, number, number] = [0, 0.35, 0]
  b.block([x, 0.118, z], [1.35, 0.02, 1.0], '#fbeee0', rot, true)
  for (let i = -2; i <= 2; i++) {
    b.block([x + i * 0.26 * Math.cos(0.35), 0.13, z - i * 0.26 * Math.sin(0.35)], [0.12, 0.012, 1.0], '#ee8f86', rot)
    b.block([x + i * 0.2 * Math.sin(0.35), 0.131, z + i * 0.2 * Math.cos(0.35)], [1.35, 0.012, 0.1], '#ee8f86', rot)
  }
  b.cylinder([x + 0.32, 0.25, z - 0.12], 0.2, 0.16, 0.22, '#d8a25e', 10)
  b.cylinder([x + 0.32, 0.37, z - 0.12], 0.21, 0.21, 0.03, '#c58c4c', 10)
  b.stick([x + 0.15, 0.37, z - 0.12], [x + 0.32, 0.55, z - 0.12], 0.018, '#b87c41', 5)
  b.stick([x + 0.32, 0.55, z - 0.12], [x + 0.49, 0.37, z - 0.12], 0.018, '#b87c41', 5)
  b.ball([x - 0.25, 0.22, z + 0.1], [0.12, 0.1, 0.12], '#a9d3e8', 1)
  b.ball([x - 0.25, 0.33, z + 0.1], [0.04, 0.03, 0.04], '#fff7ea', 1)
  b.stick([x - 0.14, 0.22, z + 0.1], [x - 0.06, 0.28, z + 0.1], 0.022, '#a9d3e8', 5)
  for (const [dx, dz] of [
    [-0.05, 0.32],
    [0.1, -0.35],
  ])
    b.cylinder([x + dx, 0.16, z + dz], 0.05, 0.04, 0.07, '#fff7ea', 8)
  b.ball([x - 0.05, 0.15, z - 0.25], [0.09, 0.05, 0.09], '#e86a5e', 1)
}
/** Old stone well with a little shingled roof and a bucket. */
function well(b: Batch, x: number, z: number) {
  b.cylinder([x, 0.36, z], 0.5, 0.52, 0.5, '#c9c0b0', 14)
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2
    b.ball([x + Math.cos(a) * 0.5, 0.25 + (i % 2) * 0.17, z + Math.sin(a) * 0.5], [0.13, 0.08, 0.13], i % 3 ? '#b6ab99' : '#d8cfbe', 1, [0, a, 0])
  }
  b.cylinder([x, 0.62, z], 0.53, 0.53, 0.06, '#e0d6c4', 14)
  b.cylinder([x, 0.6, z], 0.4, 0.4, 0.02, '#4f8f9a', 14, [0, 0, 0], b.kit.water)
  for (const s of [-1, 1]) b.stick([x + s * 0.45, 0.6, z], [x + s * 0.45, 1.55, z], 0.05, timber, 7)
  b.stick([x - 0.5, 1.28, z], [x + 0.5, 1.28, z], 0.04, wood, 7)
  b.prism([[-0.7, 1.45], [0.7, 1.45], [0, 1.9]], 0.9, '#b45f4b', [x, 0, z - 0.45], [0, 0, 0], 0.03)
  b.stick([x, 1.28, z], [x, 0.95, z], 0.008, '#8a6a4a', 4)
  b.cylinder([x, 0.88, z], 0.1, 0.08, 0.14, '#8fb7c2', 8)
}
/** A striped beach parasol with a deck chair. */
function parasol(b: Batch, x: number, z: number) {
  b.stick([x, 0.05, z], [x + 0.08, 1.75, z], 0.03, '#f4ead8', 6)
  b.cylinder([x + 0.08, 1.72, z], 0.04, 0.98, 0.36, '#ef7d6b', 16)
  b.cylinder([x + 0.08, 1.8, z], 0.04, 0.55, 0.2, '#fdf4e3', 16)
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    b.ball([x + 0.08 + Math.cos(a) * 0.95, 1.53, z + Math.sin(a) * 0.95], [0.09, 0.05, 0.09], i % 2 ? '#fdf4e3' : '#ef7d6b', 1)
  }
  b.ball([x + 0.08, 1.84, z], [0.06, 0.06, 0.06], '#f6c86a', 1)
  const cx = x + 0.75,
    cz = z + 0.2
  b.block([cx, 0.22, cz], [0.5, 0.05, 0.62], '#f6d38a', [0.12, 0.3, 0], true)
  b.block([cx - 0.08, 0.42, cz - 0.38], [0.5, 0.05, 0.42], '#f6d38a', [1.0, 0.3, 0], true)
  for (const s of [-1, 1]) b.stick([cx + s * 0.24, 0.05, cz + 0.25], [cx + s * 0.2, 0.22, cz + 0.2], 0.02, timber, 5)
}
function mushrooms(b: Batch, x: number, z: number, seed: number) {
  for (let i = 0; i < 3; i++) {
    const a = seed * 3 + i * 2.1,
      mx = x + Math.cos(a) * 0.13 * i,
      mz = z + Math.sin(a) * 0.13 * i,
      h = 0.13 + 0.05 * ((seed + i) % 2)
    b.cylinder([mx, 0.1 + h / 2, mz], 0.035, 0.045, h, '#fbf1dc', 7)
    b.ball([mx, 0.11 + h, mz], [0.09, 0.06, 0.09], i === 1 ? '#f0b85e' : '#e4574a', 1)
    if (i !== 1)
      for (let j = 0; j < 3; j++)
        b.ball([mx + Math.cos(j * 2.1) * 0.05, 0.145 + h, mz + Math.sin(j * 2.1) * 0.05], [0.016, 0.01, 0.016], '#fff9ee', 0)
  }
}
function mossyRocks(b: Batch, x: number, z: number, s: number) {
  b.ball([x, 0.16 * s, z], [0.42 * s, 0.3 * s, 0.36 * s], '#bcb3a4', 1, [0, x, 0.1])
  b.ball([x + 0.38 * s, 0.1 * s, z + 0.12 * s], [0.24 * s, 0.18 * s, 0.22 * s], '#cfc7b8', 1, [0, z, 0])
  b.ball([x - 0.05 * s, 0.32 * s, z - 0.04 * s], [0.3 * s, 0.1 * s, 0.26 * s], '#8fbb6d', 1, [0, x, 0.1])
}
/** Rows of tulips in a tilled bed, with a scarecrow keeping watch. */
function tulipBed(b: Batch) {
  const { center, width, depth } = tulipField
  const [x, z] = center
  const bed: XZ[] = []
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2
    const c = Math.cos(a),
      s = Math.sin(a)
    // A rounded rectangle (superellipse).
    bed.push([x + Math.sign(c) * Math.abs(c) ** 0.45 * (width / 2 + 0.3), z + Math.sign(s) * Math.abs(s) ** 0.45 * (depth / 2 + 0.3)])
  }
  b.horizontal(bed, 0.104, 0.02, '#b98a5e', b.kit.soil, 0.01, 2, true)
  const rows = ['#f26d6d', '#f6c24d', '#f39ac4', '#fffaf0', '#b49ae6']
  rows.forEach((colour, r) => {
    const rz = z - depth / 2 + (r * depth) / (rows.length - 1)
    for (let i = 0; i < 11; i++) {
      const rx = x - width / 2 + (i * width) / 10
      tulip(b, rx + ((i * 7 + r) % 3) * 0.03, rz, colour, ((i * 0.37 + r * 0.21) % 1))
    }
  })
  // Scarecrow.
  const sx = x + width / 2 + 0.75,
    sz = z - 0.2
  b.stick([sx, 0.1, sz], [sx, 1.55, sz], 0.05, timber, 6)
  b.stick([sx - 0.55, 1.15, sz], [sx + 0.55, 1.15, sz], 0.04, timber, 6)
  b.block([sx, 1.05, sz], [0.5, 0.45, 0.22], '#6f9bc8', [0, 0, 0], true)
  b.ball([sx, 1.62, sz], [0.2, 0.2, 0.19], '#f3dfb0', 1)
  b.cylinder([sx, 1.8, sz], 0.32, 0.32, 0.04, '#e0b75e', 14)
  b.cylinder([sx, 1.9, sz], 0.13, 0.17, 0.16, '#e0b75e', 12)
  for (const s of [-1, 1]) b.ball([sx + s * 0.07, 1.65, sz + 0.17], [0.025, 0.025, 0.015], '#4a3a30', 0)
  b.ball([sx, 1.57, sz + 0.18], [0.05, 0.015, 0.01], '#c66b55', 0)
}
/** Rim stones, lily pads, a lotus and reeds around the pond. */
function pondDressing(b: Batch) {
  const [x, z] = pond.center
  const r = pond.radius
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2
    b.ball([x + Math.cos(a) * (r + 0.12), 0.13, z + Math.sin(a) * (r + 0.1)], [0.15 + (i % 3) * 0.03, 0.09, 0.13], i % 2 ? '#c9c0b0' : '#b3aa98', 1, [0, a, 0])
  }
  for (const [dx, dz, s] of [
    [-0.45, 0.25, 0.26],
    [0.35, -0.4, 0.3],
    [0.55, 0.45, 0.22],
    [-0.2, -0.55, 0.2],
  ]) {
    b.cylinder([x + dx, 0.128, z + dz], s, s, 0.012, '#6fae63', 16)
    b.ball([x + dx + s * 0.4, 0.13, z + dz + s * 0.1], [s * 0.25, 0.012, s * 0.2], '#4f9d8f', 0)
  }
  // A pink lotus floating on one pad.
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2
    b.ball([x + 0.55 + Math.cos(a) * 0.06, 0.19, z + 0.45 + Math.sin(a) * 0.06], [0.07, 0.05, 0.035], '#f4a3bf', 1, [0.5, a, 0])
  }
  b.ball([x + 0.55, 0.21, z + 0.45], [0.04, 0.035, 0.04], '#f6d36a', 1)
  for (let i = 0; i < 7; i++) {
    const a = 2.2 + i * 0.22
    const rx = x + Math.cos(a) * (r + 0.35),
      rz = z + Math.sin(a) * (r + 0.3)
    const h = 0.5 + (i % 3) * 0.15
    b.stick([rx, 0.1, rz], [rx + 0.04, h, rz], 0.015, '#7f9a52', 4)
    b.ball([rx + 0.04, h, rz], [0.035, 0.09, 0.035], '#9a7246', 0)
  }
}
/** A swaying palm: a curved, ringed trunk, drooping fronds and coconuts. */
function palm(b: Batch, x: number, z: number, lean: number) {
  let px = x,
    py = 0.1
  const dx = Math.cos(lean) * 0.12,
    dz = Math.sin(lean) * 0.12
  for (let i = 0; i < 9; i++) {
    const nx = px + dx * (i / 4),
      ny = py + 0.32
    b.stick([px, py, z + dz * i * 0.5], [nx, ny, z + dz * (i + 1) * 0.5], 0.13 - i * 0.006, i % 2 ? '#b58a5c' : '#a27a4f', 8, 0.9)
    px = nx
    py = ny
  }
  const tz = z + dz * 4.5
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2
    for (let k = 1; k <= 3; k++)
      b.ball(
        [px + Math.cos(a) * 0.32 * k, py - 0.06 * k * k, tz + Math.sin(a) * 0.32 * k],
        [0.24, 0.035, 0.11],
        k === 3 ? '#8fc86a' : '#6fae58',
        1,
        [0, -a, -0.25 * k],
        b.kit.leaf,
      )
  }
  for (let i = 0; i < 3; i++) b.ball([px + Math.cos(i * 2.1) * 0.12, py - 0.12, tz + Math.sin(i * 2.1) * 0.12], [0.09, 0.09, 0.09], '#7a5638', 1)
}
/** Sand, a sandcastle, shells, starfish and a beach ball. */
function beachDressing(b: Batch) {
  const [x, z] = beach.center
  const sand: XZ[] = []
  for (let i = 0; i < 30; i++) {
    const a = (i / 30) * Math.PI * 2
    const wobble = 1 + 0.08 * Math.sin(a * 3) + 0.05 * Math.cos(a * 5)
    sand.push([x + Math.cos(a) * beach.radiusX * wobble, z + Math.sin(a) * beach.radiusZ * wobble])
  }
  b.horizontal(sand, 0.104, 0.02, '#f5e2b6', b.kit.soil, 0.012, 2, true)
  const cx = x - 1.2,
    cz = z + 0.3
  b.cylinder([cx, 0.2, cz], 0.3, 0.34, 0.2, '#e8c98f', 10)
  for (const [dx, dz] of [
    [-0.28, -0.2],
    [0.28, -0.2],
    [0, 0.28],
  ]) {
    b.cylinder([cx + dx, 0.33, cz + dz], 0.1, 0.11, 0.3, '#ecd09a', 8)
    b.cylinder([cx + dx, 0.54, cz + dz], 0.01, 0.12, 0.14, '#e2bd80', 8)
  }
  b.cylinder([cx, 0.45, cz], 0.14, 0.16, 0.3, '#ecd09a', 8)
  b.stick([cx, 0.6, cz], [cx, 0.85, cz], 0.01, '#8a6a4a', 3)
  b.prism([[0, 0], [0.16, 0.05], [0, 0.1]], 0.01, '#ef6c5c', [cx, 0.74, cz])
  for (const [dx, dz, colour] of [
    [0.9, 0.5, '#f29a6c'],
    [-0.4, -0.7, '#f6c24d'],
    [1.7, -0.3, '#ef8a8a'],
  ] as const) {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2
      b.ball([x + dx + Math.cos(a) * 0.07, 0.125, z + dz + Math.sin(a) * 0.07], [0.07, 0.02, 0.03], colour, 0, [0, -a, 0])
    }
  }
  for (const [dx, dz] of [
    [0.2, -0.9],
    [-1.9, 0.6],
    [2.2, 0.4],
  ])
    b.ball([x + dx, 0.125, z + dz], [0.06, 0.03, 0.05], '#fdf1e6', 1, [0, dx, 0])
  // A striped beach ball.
  const bx = x + 0.6,
    bz = z - 0.2
  b.ball([bx, 0.3, bz], [0.2, 0.2, 0.2], '#fffaf0', 2)
  b.ball([bx, 0.3, bz], [0.204, 0.08, 0.204], '#ef6c5c', 2, [0.4, 0, 0])
  b.ball([bx, 0.3, bz], [0.08, 0.204, 0.204], '#5fb3c9', 2, [0, 0, 0.4])
}
/** A brass telescope on a tripod, pointed at the horizon. */
function telescope(b: Batch, x: number, z: number) {
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2
    b.stick([x + Math.cos(a) * 0.3, 0.1, z + Math.sin(a) * 0.3], [x, 0.95, z], 0.03, timber, 5)
  }
  b.stick([x + 0.35, 1.18, z + 0.1], [x - 0.4, 0.95, z - 0.12], 0.07, '#d7a94d', 10, 0.7)
  b.cylinder([x + 0.37, 1.19, z + 0.1], 0.075, 0.075, 0.03, '#b8862e', 10, [0, 0, Math.PI / 2 - 0.3])
}

/** Rounded, slightly irregular flagstones set into the lawn along a line. */
function steppingStones(b: Batch, pts: XZ[]) {
  let k = 0
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i],
      [bx, bz] = pts[i + 1]
    const span = Math.hypot(bx - ax, bz - az)
    const nx = -(bz - az) / span,
      nz = (bx - ax) / span
    for (let d = 0; d < span; d += 0.5, k++) {
      const side = (k % 2 ? 1 : -1) * 0.16
      const x = ax + ((bx - ax) * d) / span + nx * side,
        z = az + ((bz - az) * d) / span + nz * side
      const s = 0.28 + ((k * 0.37) % 1) * 0.09
      b.ball([x, 0.1, z], [s, 0.05, s * 0.82], k % 3 ? '#c6b2a4' : '#b9a497', 1, [0, k * 1.3, 0])
      b.ball([x - 0.02, 0.125, z - 0.02], [s * 0.82, 0.03, s * 0.66], k % 3 ? '#d9c8ba' : '#cdbaab', 1, [0, k * 1.3, 0])
    }
  }
}

/**
 * The mountain shrine: an octagonal stone tournament ring on a chamfered
 * dais, a vermilion torii gate, rock spires crowned with little pines, a
 * bronze gong, a straw-wrapped training post, stone lanterns and banners.
 */
function mountainShrine(b: Batch) {
  const [cx, cz] = shrine.center
  const r = shrine.radius
  const octagon = (radius: number): XZ[] =>
    Array.from({ length: 8 }, (_, i) => {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8
      return [cx + Math.cos(a) * radius, cz + Math.sin(a) * radius]
    })
  b.horizontal(octagon(r + 0.12), 0.16, 0.16, '#b9ad9c', undefined, 0.06, 2)
  b.horizontal(octagon(r), 0.215, 0.06, '#e6dccb', undefined, 0.025, 1)
  // Stone tiles: a grid of slightly varied slabs.
  for (let i = -3; i <= 3; i++)
    for (let j = -3; j <= 3; j++) {
      const x = cx + i * 0.38,
        z = cz + j * 0.38
      if (Math.hypot(x - cx, z - cz) > r - 0.18) continue
      b.block([x, 0.22, z], [0.35, 0.02, 0.35], (i + j) % 2 ? '#ddd2bf' : '#d2c6b2', [0, 0, 0], true)
    }
  // A painted emblem in the middle: a sun ring with an original flame mark.
  b.cylinder([cx, 0.235, cz], 0.5, 0.5, 0.012, '#d9534a', 32)
  b.cylinder([cx, 0.242, cz], 0.42, 0.42, 0.012, '#f3e7cf', 32)
  b.prism(
    [
      [0, -0.3],
      [0.17, -0.05],
      [0.07, 0.02],
      [0.12, 0.3],
      [-0.05, 0.08],
      [-0.15, 0.1],
      [-0.06, -0.1],
    ],
    0.012,
    '#e08a2c',
    [cx, 0.25, cz],
    [-Math.PI / 2, 0, 0],
  )
  // Corner posts with gold caps on the octagon's points.
  for (const [x, z] of octagon(r + 0.06)) {
    b.cylinder([x, 0.34, z], 0.06, 0.07, 0.3, '#8a3a32', 8)
    b.ball([x, 0.5, z], [0.07, 0.06, 0.07], '#e8b85a', 1)
  }
  // Steps up from the gate.
  const [gx, gz] = shrine.gate
  const toRing = shrine.gateYaw
  for (let k = 0; k < 2; k++) {
    const d = r + 0.25 + k * 0.22
    b.block([cx - Math.sin(toRing) * d, 0.13 - k * 0.03, cz - Math.cos(toRing) * d], [0.9, 0.06, 0.24], '#cfc3ae', [0, toRing, 0], true)
  }
  // Torii gate.
  const across = toRing + Math.PI / 2
  const post = (side: number): [number, number] => [gx + Math.sin(across) * 0.78 * side, gz + Math.cos(across) * 0.78 * side]
  for (const side of [-1, 1]) {
    const [px, pz] = post(side)
    b.cylinder([px, 0.95, pz], 0.08, 0.1, 1.75, '#d8432f', 10)
    b.cylinder([px, 0.12, pz], 0.14, 0.15, 0.14, '#3a2a26', 10)
  }
  b.block([gx, 1.88, gz], [2.1, 0.11, 0.16], '#2a2422', [0, across - Math.PI / 2, 0], true)
  b.block([gx, 1.74, gz], [1.95, 0.1, 0.14], '#d8432f', [0, across - Math.PI / 2, 0], true)
  b.block([gx, 1.5, gz], [1.7, 0.08, 0.11], '#d8432f', [0, across - Math.PI / 2, 0], true)
  b.block([gx, 1.62, gz], [0.1, 0.2, 0.12], '#d8432f', [0, across - Math.PI / 2, 0], true)
  // Rock spires topped with tiny pines.
  shrine.spires.forEach(([x, z, h], i) => {
    const rocks = ['#a69886', '#b8aa96', '#9a8c7a']
    const layers = Math.round(h / 0.45)
    for (let k = 0; k < layers; k++) {
      const t = k / layers
      const w = (0.55 + 0.08 * h) * (1 - t * 0.45)
      b.ball([x + Math.sin(k * 1.7 + i) * 0.06, 0.2 + t * h, z + Math.cos(k * 1.3 + i) * 0.06], [w, 0.34, w * 0.9], rocks[(k + i) % 3], 1, [0, k, 0])
    }
    b.ball([x, h + 0.25, z], [0.4, 0.14, 0.36], '#7fae63', 1, [0, i, 0], b.kit.leaf)
    b.stick([x + 0.05, h + 0.25, z], [x + 0.1, h + 0.75, z], 0.04, bark, 6)
    for (let k = 0; k < 3; k++)
      b.cylinder([x + 0.1, h + 0.55 + k * 0.17, z], 0.03, 0.26 - k * 0.07, 0.24, ['#447f62', '#528f6a', '#66a374'][k], 9, [0, k, 0], b.kit.leaf)
  })
  // Bronze gong in a wooden frame, facing the ring.
  const [ox, oz] = shrine.gong
  for (const side of [-1, 1]) b.stick([ox, 0.1, oz + side * 0.45], [ox, 1.45, oz + side * 0.45], 0.05, timber, 7)
  b.stick([ox, 1.42, oz - 0.55], [ox, 1.42, oz + 0.55], 0.055, timber, 7)
  b.cylinder([ox, 0.85, oz], 0.36, 0.36, 0.05, '#c9963a', 24, [0, 0, Math.PI / 2])
  b.cylinder([ox + 0.03, 0.85, oz], 0.15, 0.15, 0.02, '#e8b85a', 18, [0, 0, Math.PI / 2])
  for (const side of [-1, 1]) b.stick([ox, 1.4, oz + side * 0.2], [ox, 1.18, oz + side * 0.12], 0.008, '#5a4030', 3)
  b.stick([ox + 0.35, 0.1, oz + 0.3], [ox + 0.35, 0.7, oz + 0.3], 0.025, '#8a5a3a', 5)
  b.ball([ox + 0.35, 0.72, oz + 0.3], [0.08, 0.08, 0.08], '#e6dccb', 1)
  // Training post wrapped in straw.
  const [tx, tz] = shrine.post
  b.cylinder([tx, 0.65, tz], 0.12, 0.14, 1.2, '#9a6a45', 10)
  for (const y of [0.85, 1.05]) b.cylinder([tx, y, tz], 0.16, 0.16, 0.14, '#e2c27a', 10)
  b.stick([tx - 0.3, 0.75, tz], [tx + 0.3, 0.75, tz], 0.04, '#9a6a45', 6)
  // Stone lanterns.
  for (const [lx, lz] of shrine.lanterns) {
    b.cylinder([lx, 0.18, lz], 0.18, 0.22, 0.16, '#b9ad9c', 8)
    b.cylinder([lx, 0.45, lz], 0.07, 0.08, 0.4, '#c6baa8', 8)
    b.block([lx, 0.72, lz], [0.3, 0.2, 0.3], '#cfc3ae', [0, 0.3, 0], true)
    b.block([lx, 0.72, lz], [0.18, 0.12, 0.31], '#ffd28a', [0, 0.3, 0], false, b.kit.glass)
    b.cylinder([lx, 0.88, lz], 0.03, 0.3, 0.14, '#b9ad9c', 8, [0, 0.3, 0])
    b.ball([lx, 0.98, lz], [0.06, 0.06, 0.06], '#b9ad9c', 1)
  }
  // Tall banners in red and gold.
  shrine.banners.forEach(([fx, fz], i) => {
    b.stick([fx, 0.1, fz], [fx, 2.2, fz], 0.03, '#3a2a26', 6)
    b.ball([fx, 2.22, fz], [0.05, 0.05, 0.05], '#e8b85a', 1)
    b.block([fx + 0.16, 1.55, fz], [0.3, 0.95, 0.02], i % 2 ? '#e8b85a' : '#c8323a', [0, 0.4, 0])
    b.block([fx + 0.16, 1.55, fz + 0.012], [0.12, 0.12, 0.01], i % 2 ? '#c8323a' : '#e8b85a', [0, 0.4, 0])
  })
  // Strings of paper lanterns (chōchin) looping round the ring.
  const posts = shrine.lanternPosts
  posts.forEach(([px, pz], i) => {
    b.stick([px, 0.1, pz], [px, 1.7, pz], 0.04, '#3a2a26', 6)
    b.ball([px, 1.72, pz], [0.05, 0.05, 0.05], '#e8b85a', 1)
    const [qx, qz] = posts[(i + 1) % posts.length]
    let prev: [number, number, number] = [px, 1.62, pz]
    for (const [lx, ly, lz] of chochinPoints(px, pz, qx, qz)) {
      b.stick(prev, [lx, ly + 0.02, lz], 0.007, '#4a3a30', 3)
      prev = [lx, ly + 0.02, lz]
    }
    b.stick(prev, [qx, 1.62, qz], 0.007, '#4a3a30', 3)
  })
  for (const [lx, ly, lz] of shrineLanterns()) chochin(b, lx, ly, lz)
  // Two big lanterns hanging from the torii's lower beam.
  for (const side of [-1, 1]) {
    const across = shrine.gateYaw + Math.PI / 2
    const hx = gx + Math.sin(across) * 0.42 * side,
      hz = gz + Math.cos(across) * 0.42 * side
    b.stick([hx, 1.46, hz], [hx, 1.3, hz], 0.008, '#3a2a26', 3)
    chochin(b, hx, 1.1, hz, 1.35)
  }
  // Stepping stones from the gate up to the ring.
  for (let k = 0; k < 4; k++) {
    const t = (k + 0.5) / 4
    const x = gx + (cx - gx) * t * 0.45,
      z = gz + (cz - gz) * t * 0.45
    b.ball([x, 0.1, z + (k % 2 ? 0.1 : -0.1)], [0.25, 0.05, 0.21], '#c6b2a4', 1, [0, k, 0])
  }
}
/** A round paper lantern: red body, white band, black caps. */
function chochin(b: Batch, x: number, y: number, z: number, s = 1) {
  b.ball([x, y, z], [0.1 * s, 0.13 * s, 0.1 * s], '#e2493c', 1, [0, 0, 0], b.kit.glass)
  b.ball([x, y, z], [0.104 * s, 0.03 * s, 0.104 * s], '#fff1dc', 1, [0, 0, 0], b.kit.glass)
  for (const dy of [-1, 1]) b.cylinder([x, y + dy * 0.125 * s, z], 0.05 * s, 0.055 * s, 0.03 * s, '#1f1b1b', 8)
  b.stick([x, y - 0.14 * s, z], [x, y - 0.22 * s, z], 0.012 * s, '#f6c84a', 3)
}
/** Lantern positions along a sagging string between two posts. */
function chochinPoints(ax: number, az: number, bx: number, bz: number): [number, number, number][] {
  return [0.25, 0.5, 0.75].map((t) => [ax + (bx - ax) * t, 1.6 - Math.sin(Math.PI * t) * 0.28 - 0.04, az + (bz - az) * t])
}
/** Every paper lantern on the strings (also used for their night glow). */
export function shrineLanterns() {
  const posts = shrine.lanternPosts
  return posts.flatMap(([px, pz], i) => {
    const [qx, qz] = posts[(i + 1) % posts.length]
    return chochinPoints(px, pz, qx, qz).map(([x, y, z]) => [x, y - 0.17, z] as [number, number, number])
  })
}

/** The shrine islet: the same stacked sand, cliff and lawn as the island. */
function isletTerrain(b: Batch) {
  const [cx, cz] = islet.center
  const coast: XZ[] = []
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2
    const ripple = 1 + 0.03 * Math.sin(a * 5 + 1) + 0.02 * Math.cos(a * 7)
    coast.push([cx + Math.cos(a) * islet.coastX * ripple, cz + Math.sin(a) * islet.coastZ * ripple])
  }
  const scaled = (k: number): XZ[] => coast.map(([x, z]) => [cx + (x - cx) * k, cz + (z - cz) * k])
  b.horizontal(scaled(1.087), -0.81, 0.21, '#efcc92', undefined, 0.08, 4)
  b.horizontal(scaled(1.044), -0.62, 0.37, '#f3d7a2', undefined, 0.1, 4, true)
  b.horizontal(coast, -0.28, 0.39, '#d4a36a', undefined, 0.155, 4)
  b.horizontal(coast, -0.12, 0.19, '#dbb87d', undefined, 0.105, 4)
  b.horizontal(coast, 0.005, 0.14, '#8fbf66', b.kit.grass, 0.095, 5, true)
  const rand = seeded(311)
  for (let i = 0; i < 26; i++) {
    const a = rand() * Math.PI * 2
    const s = 0.12 + rand() * 0.22
    b.ball(
      [cx + Math.cos(a) * islet.coastX * 1.03, -0.5 - rand() * 0.2, cz + Math.sin(a) * islet.coastZ * 1.03],
      [s * 1.6, s, s * 1.2],
      ['#b6a491', '#c9ac88', '#d6b48a'][i % 3],
      0,
      [0, rand() * 6, 0.1],
    )
  }
}
/** A long arched footbridge across the strait, with rope railings. */
function isletBridge(b: Batch) {
  const z = islet.bridgeZ,
    from = islet.bridgeFrom + 0.3,
    to = islet.bridgeTo - 0.3,
    w = islet.bridgeWidth
  const planks = Math.round((from - to) / 0.24)
  for (let i = 0; i <= planks; i++) {
    const x = from - ((from - to) * i) / planks
    b.block([x, bridgeDeck(x) - 0.06, z], [0.22, 0.09, w], i % 3 === 1 ? '#c7925b' : '#dcac70', [0, 0, 0], true)
  }
  for (let i = 0; i <= 6; i++) {
    const x = from - ((from - to) * i) / 6
    for (const side of [-1, 1]) {
      const pz = z + side * (w / 2 + 0.02)
      b.stick([x, -0.9, pz], [x, bridgeDeck(x) + 0.55, pz], 0.06, timber, 7)
      b.ball([x, bridgeDeck(x) + 0.58, pz], [0.07, 0.06, 0.07], trim, 1)
      if (i < 6) {
        const nx = from - ((from - to) * (i + 1)) / 6
        // A sagging rope railing.
        for (let k = 0; k < 4; k++) {
          const t0 = k / 4,
            t1 = (k + 1) / 4
          const xa = x + (nx - x) * t0,
            xb = x + (nx - x) * t1
          const sag = (t: number) => -Math.sin(Math.PI * t) * 0.1
          b.stick([xa, bridgeDeck(xa) + 0.5 + sag(t0), pz], [xb, bridgeDeck(xb) + 0.5 + sag(t1), pz], 0.018, '#c9a56e', 4)
        }
      }
    }
  }
}

/** Plant little clumps of flowers along the verges of every path. */
function verges(b: Batch, rand: () => number, low: boolean) {
  const palette = ['#fcf2c7', '#f09aa4', '#f6c768', '#b9a2d9', '#f6a77d', '#9ccbf0', '#ffffff']
  for (const { pts, width } of routes)
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i],
        [bx, bz] = pts[i + 1],
        span = Math.hypot(bx - ax, bz - az),
        nx = -(bz - az) / span,
        nz = (bx - ax) / span
      for (let d = 0.4; d < span; d += low ? 1.5 : 0.95) {
        for (const side of [-1, 1]) {
          if (rand() > 0.5) continue
          const off = width / 2 + 0.28 + rand() * 0.35
          const x = ax + ((bx - ax) * d) / span + nx * off * side,
            z = az + ((bz - az) * d) / span + nz * off * side
          if (Math.abs(x - river(z)) < 1.35 || !walkable(x, z) || inShrine(x, z)) continue
          if (x > -8.9 && x < -3.3 && z > 2.0 && z < 6.6) continue
          const c = palette[Math.floor(rand() * palette.length)],
            tall = rand() < 0.35
          for (let k = 0; k < 3; k++) {
            const fx = x + (rand() - 0.5) * 0.34,
              fz = z + (rand() - 0.5) * 0.26
            if (tall) tulip(b, fx, fz, c, rand())
            else flower(b, fx, fz, c, rand())
          }
        }
      }
    }
}

/** Each coloured key feeds a rank of hollow brass pipes at the back of the deck. */
function buildTideOrgan(b: Batch, group: T.Group) {
  const [cx, cz] = tideOrgan.center
  const boards = ['#957356', '#967e64', '#ac8d68', '#896b54', '#a98461', '#8c7966']
  const pile = (x: number, z: number, top: number) => {
    const base = -2.15
    b.cylinder([x, (top + base) / 2, z], 0.135, 0.17, top - base, '#635446', 10)
    for (const y of [top - 0.13, top - 0.19])
      b.cylinder([x, y, z], 0.145, 0.145, 0.046, '#bd9c70', 12)
    b.ball([x, -0.9, z], [0.36, 0.46, 0.31], '#79766b', 1)
  }
  // Sills start on dry land. Paired piles and cross-bracing carry the boardwalk.
  for (const side of [-1, 1]) {
    const z = cz + side * 0.57
    b.block([18, -0.07, z], [3.85, 0.23, 0.18], '#625345')
    for (const x of [16.48, 17.62, 18.76]) pile(x, z, 0.69)
    for (const x of [16.48, 17.62]) {
      b.stick([x, -0.73, z], [x + 1.14, 0.01, z], 0.084, timber)
      b.stick([x, 0.57, z], [x + 0.57, 0.45, z], 0.026, '#bc9b70')
      b.stick([x + 0.57, 0.45, z], [x + 1.14, 0.57, z], 0.026, '#bc9b70')
    }
  }
  for (let i = 0; i < 11; i++)
    b.block([tideOrgan.bridgeStart + i * 0.235, 0.105, cz], [0.226, 0.13, tideOrgan.bridgeWidth], boards[i % boards.length])
  // An old storm lantern marks the abutment on the shore.
  b.cylinder([17.62, 0.82, cz - 0.57], 0.09, 0.1, 0.23, '#ffcc83', 8, [0,0,0], b.kit.glass)
  b.cylinder([17.62, 0.97, cz - 0.57], 0.045, 0.14, 0.08, '#5c5043', 8)
  // Saw-cut planks follow the circular pier head, with seams, grain and nail heads.
  const count = 19, width = 2 * tideOrgan.radius / count
  for (let i = 0; i < count; i++) {
    const dz = -tideOrgan.radius + (i + 0.5) * width
    const half = Math.sqrt(tideOrgan.radius ** 2 - dz ** 2)
    b.block([cx, 0.075, cz + dz], [half * 2, 0.19, width - 0.015], boards[(i * 5) % boards.length])
    b.block([cx + half * 0.11, 0.172, cz + dz + 0.056], [half * 1.34, 0.003, 0.014], '#796452')
    for (const side of [-1, 1]) b.cylinder([cx + side * (half - 0.1), 0.173, cz + dz], 0.028, 0.028, 0.009, '#605a51', 6)
  }
  for (const dz of [-1.55, 0, 1.55]) {
    const reach = Math.sqrt(tideOrgan.radius ** 2 - dz ** 2) - 0.22
    b.block([cx, -0.13, cz + dz], [2 * reach + 0.28, 0.26, 0.22], timber)
    for (const side of [-1, 1]) {
      const x = cx + side * reach
      pile(x, cz + dz, dz === 0 && side < 0 ? 0.035 : 0.54)
      b.stick([x, -0.82, cz + dz], [x - side * 0.92, -0.11, cz + dz], 0.095, '#665242')
    }
  }
  return tideOrgan.pads.map(({x, z, color}, i) => {
    b.cylinder([x, 0.18, z], 0.48, 0.5, 0.035, '#946e38', 28)
    const key = new T.Mesh(new T.CylinderGeometry(0.42, 0.43, 0.04, 32),
      new T.MeshStandardMaterial({color, emissive: color, emissiveIntensity: 0.12}))
    key.position.set(x, 0.205, z)
    group.add(key)
    for (let j = -1; j <= 1; j++) {
      const px = x + j * 0.19, pz = z - 0.72
      const h = 0.96 + 0.33 * (2 - i) + 0.24 * (1 - Math.abs(j))
      b.cylinder([px, 0.17 + h / 2, pz], 0.088, 0.105, h, '#cb9b54', 16)
      b.cylinder([px, 0.17 + h, pz], 0.128, 0.10, 0.10, '#f2c980', 16)
      b.cylinder([px, 0.224 + h, pz], 0.09, 0.09, 0.009, '#493c37', 16)
      b.cylinder([px, 0.48, pz], 0.109, 0.109, 0.12, color, 16)
    }
    return key
  })
}

function buildRadioCove(b: Batch) {
  const [x, z] = radioCove.center
  // A continuous sandbank runs from below the waterline up to the dry beach.
  const bank = new T.LatheGeometry([
    new T.Vector2(1.32, -1.4), new T.Vector2(1.20, -0.72),
    new T.Vector2(1.09, -0.28), new T.Vector2(1, 0.08),
    new T.Vector2(0.95, 0.13), new T.Vector2(0, 0.13),
  ], 48)
  b.put(bank, '#eed7a7', [x, 0, z], [radioCove.rx, 1, radioCove.rz], [0,0,0], b.kit.soil)
  bank.dispose()
  palm(b, 18.2, 0.15, -1.2)
  for (const [tx, tz, dye] of [[18.98, -0.15, '#608f85'], [19.18, 0.65, '#bb795f']] as const) {
    b.block([tx, 0.138, tz], [1.22, 0.014, 0.49], dye)
    for (const side of [-1, 1])
      b.block([tx + side * 0.46, 0.148, tz], [0.055, 0.009, 0.49], '#ece0b9')
  }
}

function beachSpeaker(kit: ModelKit) {
  const b = new Batch(kit)
  b.block([0, 0.29, 0], [1.09, 0.24, 0.6], '#86715b')
  b.block([0, 0.76, 0], [0.94, 0.75, 0.43], '#8f593d', [0,0,0], true)
  b.block([0, 0.77, 0.22], [0.83, 0.61, 0.045], '#353e3b')
  for (const dx of [-0.22, 0.22]) {
    for (const [r, z, c] of [[0.17, 0.257, '#c19c66'], [0.138, 0.279, '#49504a'], [0.062, 0.302, '#262d2c']] as const)
      b.cylinder([dx, 0.72, z], r, r, 0.026, c, 24, [Math.PI/2,0,0])
  }
  b.block([0, 0.986, 0.257], [0.63, 0.079, 0.03], '#d6ba7e')
  b.stick([-0.27,1.12,0], [-0.27,1.25,0], 0.033, timber)
  b.stick([-0.27,1.25,0], [0.27,1.25,0], 0.033, timber)
  b.stick([0.27,1.25,0], [0.27,1.12,0], 0.033, timber)
  b.stick([0.35,1.11,-0.12], [0.57,1.67,-0.12], 0.014, '#b9b7a4')
  return pickable(b.finish(), 'radio', ...radioCove.speaker)
}

export function createScenery(low: boolean) {
  const kit = new ModelKit(),
    group = new T.Group(),
    staticParts = new Batch(kit),
    objects: T.Object3D[] = [],
    rand = seeded(602)
  leafDetail = low ? 1 : 2
  routes.length = 0
  const organKeys = buildTideOrgan(staticParts, group)
  terrain(staticParts)
  meadow(staticParts)
  for (const { pts, width } of pathways) path(staticParts, pts, width)
  // Flagstones lead up to Iker's front door.
  steppingStones(staticParts, [
    [-7, 1.0],
    [-7.4, 0.25],
    [-7.55, -1.5],
  ])
  staticParts.horizontal(
    [
      [-8.6, 2.65],
      [-7.99, 2.33],
      [-4.23, 2.42],
      [-3.56, 2.87],
      [-3.56, 5.83],
      [-4.23, 6.27],
      [-7.94, 6.29],
      [-8.54, 5.76],
    ],
    0.104,
    0.02,
    '#e3cfa2',
    staticParts.kit.soil,
    0,
    1,
    true,
  )
  // Paths out to the tulip field, the pond, the beach and the lookout.
  decoratePlaza(staticParts)
  bridge(staticParts, 1)
  bridge(staticParts, 6.5)
  pier(staticParts)
  lighthouse(staticParts, 11.5, -5.75)
  for (const run of fenceRuns) fence(staticParts, run)
  for (const [x, z] of lampSites) lamp(staticParts, x, z)
  // Cosy corners: a campfire circle, a picnic, the old well and a beach nook.
  const fireSite = campfire.fire
  campfireCircle(staticParts, ...fireSite)
  picnic(staticParts, ...picnicSite)
  well(staticParts, ...wellSite)
  parasol(staticParts, ...parasolSite)
  for (const [x, z, k] of rockSites) mossyRocks(staticParts, x, z, k)
  // The new corners of the island.
  tulipBed(staticParts)
  pondDressing(staticParts)
  buildRadioCove(staticParts)
  beachDressing(staticParts)
  palmSites.forEach(([x, z], i) => palm(staticParts, x, z, 0.6 + i * 2.1))
  telescope(staticParts, ...telescopeSite)
  isletTerrain(staticParts)
  isletBridge(staticParts)
  mountainShrine(staticParts)
  shrine.sakura.forEach(([x, z, s]) => tree(staticParts, x, z, s, 5))
  group.add(createPond(...pond.center, pond.radius, kit.clock))
  // Wildflowers scattered across the wide outer meadow.
  for (let i = 0; i < (low ? 26 : 60); i++) {
    const a = rand() * Math.PI * 2,
      r = 0.72 + rand() * 0.24
    const x = Math.cos(a) * shape.walkX * r,
      z = Math.sin(a) * shape.walkZ * r
    if (Math.abs(x - river(z)) < 1.4 || !walkable(x, z) || inShrine(x, z)) continue
    const colour = ['#fcf2c7', '#f09aa4', '#f6c768', '#b9a2d9', '#ffffff', '#9ccbf0'][i % 6]
    for (let k = 0; k < 3; k++) flower(staticParts, x + (rand() - 0.5) * 0.4, z + (rand() - 0.5) * 0.3, colour, rand())
  }
  for (const [x, z] of benchSites) bench(staticParts, x, z)
  for (const [x, z] of cafeTables) {
    staticParts.cylinder([x, 0.53, z], 0.42, 0.42, 0.1, '#d2a57a', 12)
    staticParts.stick([x, 0.05, z], [x, 0.49, z], 0.071, timber)
    for (const s of [-1, 1]) {
      staticParts.cylinder([x + s * 0.48, 0.27, z], 0.19, 0.19, 0.09, '#bc895b', 8)
      staticParts.stick([x + s * 0.48, 0.04, z], [x + s * 0.48, 0.24, z], 0.046, timber)
    }
  }
  /** Every tree's trunk and crown, for shaking and falling leaves. */
  const crowns: [number, number, number][] = []
  treeSites.forEach(([x, z], i) => {
    const pine = isPine(i)
    const size = 0.77 + rand() * 0.59
    tree(staticParts, x, z, size, i, pine)
    crowns.push([x, z, (pine ? 1.9 : 2.1) * size])
    if (!pine && i % 4 === 1) mushrooms(staticParts, x + 0.72, z + 0.42, i)
  })
  verges(staticParts, rand, low)
  bushSites.forEach(([x, z], i) =>
    bush(
      staticParts,
      x,
      z,
      0.79 + rand() * 0.36,
      ['#79a967', '#6fa262', '#84b36c'][i % 3],
      i % 3 === 1 ? ['#f3a6b5', '#c9a6e0', '#9fc6ec', '#f6c66a'][i % 4] : undefined,
    ),
  )
  const flowerSites: XZ[] = [
    [-8.83, -1.78],
    [-5.3, -1.68],
    [-0.4, -4.35],
    [2.79, -4.29],
    [7.47, -1.55],
    [10.84, -1.46],
    [7.15, 2.02],
    [8.71, 2.07],
    [-8.83, 1.69],
    [-6.49, 7.16],
    [-4.63, 7.1],
    [-0.79, 5.39],
    [4.14, 6.93],
    [0.78, 8.59],
    [-10.31, 3.18],
    [-11.59, -1.4],
    [5.45, -0.61],
  ]
  flowerSites.forEach(([x, z], i) => {
    const c = ['#fcf2c7', '#e89797', '#f3c86a', '#b7a0c8', '#f4b083'][i % 5]
    for (let j = 0; j < (low ? 4 : 7); j++)
      flower(
        staticParts,
        x + (rand() - 0.5) * 1.0,
        z + (rand() - 0.5) * 0.62,
        c,
        rand(),
      )
  })
  // Little tufts, toadstools and beach stones are grouped into pockets off the paths.
  for (let i = 0; i < (low ? 60 : 125); i++) {
    const a = rand() * Math.PI * 2,
      r = 0.77 + rand() * 0.18,
      x = Math.cos(a) * shape.walkX * r,
      z = Math.sin(a) * shape.walkZ * r
    if (Math.abs(x - river(z)) < 1.13 || inShrine(x, z)) continue
    for (let j = 0; j < 2; j++)
      staticParts.ball(
        [x + j * 0.06, 0.12, z],
        [0.038, 0.155, 0.04],
        i % 2 ? '#92b86a' : '#81aa62',
        0,
        [0.12, 0, (j - 0.5) * 0.63],
        kit.petals,
      )
    if (i % 11 === 0) {
      staticParts.cylinder([x + 0.12, 0.12, z], 0.044, 0.065, 0.23, trim, 7)
      staticParts.ball([x + 0.12, 0.24, z], [0.142, 0.088, 0.142], '#d68464', 1)
    }
  }
  const add = (g: T.Group) => {
    group.add(g)
    objects.push(g)
    return g
  }
  add(pickable(building(kit, 'about'), 'about', -7, -3))
  add(pickable(building(kit, 'tech'), 'tech', 1, -6))
  add(pickable(building(kit, 'journey'), 'journey', 9, -3))
  add(pickable(building(kit, 'skills'), 'skills', 8, 4))
  exhibitSpots.forEach(
    ([x, z], i) =>
      (add(pickable(exhibit(kit, i), 'projects', x, z, i)).position.y = 0.08),
  )
  add(beachSpeaker(kit))
  add(pickable(mailbox(kit), 'contact', 2, 5.5))
  add(pickable(sign(kit), 'map', 0, 2))
  group.add(staticParts.finish())
  const daylightGlow = { value: 1 }
  group.add(createRiver(river, riverWidth, kit.clock, daylightGlow, shape.lip))
  const ambience = createAmbience({
    kit,
    crowns: crowns.filter((_, i) => !isPine(i)),
    perches: [
      [-9.6, -1.4],
      [3.3, -1.3],
      [-6.4, 1.85],
      [6.3, 6.7],
      [-3.7, 7.7],
    ],
    low,
    lamps: lampSites,
    campfire: fireSite,
    lanterns: [...lanternPoints(), ...shrineLanterns()],
    shrineAura: { center: shrine.center, radius: shrine.radius, stoneLanterns: shrine.lanterns },
    chimneys: [
      [-7.85, 3.4, -3.43],
      [7.15, 3.4, 3.57],
    ],
    river,
    riverWidth,
  })
  group.add(ambience.group)
  const seabirds = [
    [3.3, shape.pierFrom + 1.7],
    [-15.2, -2.6],
  ].map(([x, z], i) => {
    const g = bird(kit)
    g.position.set(x, i === 0 ? -0.05 : 0, z)
    g.rotation.y = 1.43 - i * 2.25
    group.add(g)
    return g
  })
  const fliers = [
    [-6.1, -1.1],
    [0.38, 4.6],
    [5.9, -2.4],
    [-6.9, 6.7],
  ]
    .slice(0, low ? 2 : 4)
    .map(([x, z], i) => {
      const butterfly = new T.Group()
      for (const s of [-1, 1]) {
        const b = new Batch(kit)
        b.ball(
          [s * 0.086, 0, 0],
          [0.12, 0.028, 0.092],
          i % 2 ? '#e4b858' : '#d99984',
          1,
        )
        b.ball([s * 0.058, 0, -0.074], [0.078, 0.02, 0.066], '#f2d9a3', 1)
        butterfly.add(b.finish())
      }
      group.add(butterfly)
      return { butterfly, x, z }
    })
  kit.clearTemplates()
  let shakeStart = -10
  let clock = 0
  return {
    group,
    interactives: objects,
    lightOrganKey(index: number) {
      organKeys.forEach((key, i) => {
        key.material.emissiveIntensity = i === index ? 1.8 : 0.12
        key.position.y = i === index ? 0.19 : 0.205
      })
    },
    crowns,
    balloon: ambience.balloon,
    popBalloon: ambience.popBalloon,
    /** Shake the tree nearest to (x, z) if one is within reach. */
    shake(x: number, z: number, reachLimit = 1.6) {
      let best = -1,
        bestDistance = reachLimit
      crowns.forEach(([tx, tz], i) => {
        const d = Math.hypot(tx - x, tz - z)
        if (d < bestDistance) {
          bestDistance = d
          best = i
        }
      })
      if (best < 0 || clock - shakeStart < 0.6) return null
      const [tx, tz, top] = crowns[best]
      kit.shake.value.set(tx, tz, 1)
      shakeStart = clock
      ambience.burst(tx, tz, top)
      return crowns[best]
    },
    animate: (
      time: number,
      night: number,
      px: number,
      pz: number,
      reduced: boolean,
      floor = 0,
    ) => {
      kit.clock.value = time
      clock = time
      kit.shake.value.z = Math.max(0, 1 - (time - shakeStart) / 0.9)
      kit.walker.value.set(px, pz)
      kit.walkerFloor.value = floor
      kit.motion.value = reduced ? 0 : 1
      kit.glass.emissiveIntensity = 0.04 + night * 1.6
      daylightGlow.value = 1 - night * 0.7
      kit.daylight.value = reduced ? 0 : 1 - night
      ambience.update(time, night, px, pz, reduced)
      if (reduced) return
      seabirds.forEach((g, i) => {
        g.rotation.z = 0.035 * Math.sin(time * 1.46 + i)
        g.rotation.y = 1.43 - i * 2.25 + 0.18 * Math.sin(time * 0.63 + i)
      })
      fliers.forEach(({ butterfly, x, z }, i) => {
        butterfly.visible = night < 0.73
        butterfly.position.set(
          x + 0.51 * Math.sin(time * 0.78 + i),
          0.67 + 0.19 * Math.sin(time * 1.54 + i * 2),
          z + 0.27 * Math.sin(time * 1.29 + i),
        )
        butterfly.rotation.y = time * 0.46 + i
        butterfly.children.forEach((w, j) => {
          w.rotation.z = (j ? 1 : -1) * (0.5 + 0.42 * Math.sin(time * 12 + i))
        })
      })
    },
  }
}
