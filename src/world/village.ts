import {
  Batch,
  type ModelKit,
  clay,
  timber,
  trim,
  wood,
  type XZ,
  type XYZ,
} from './modelKit'
import * as T from 'three'

function windowBox(
  b: Batch,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  shutters: boolean,
) {
  b.block([x, y, z], [w + 0.17, h + 0.17, 0.11], timber)
  b.block(
    [x, y, z + 0.075],
    [w, h, 0.055],
    '#8bb5ad',
    [0, 0, 0],
    false,
    b.kit.glass,
  )
  b.block([x, y, z + 0.11], [0.055, h + 0.04, 0.08], trim)
  b.block([x, y + 0.03, z + 0.115], [w + 0.02, 0.055, 0.08], trim)
  b.block([x, y - h / 2 - 0.09, z + 0.075], [w + 0.28, 0.1, 0.28], trim)
  if (shutters)
    for (const side of [-1, 1]) {
      b.block(
        [x + side * (w / 2 + 0.19), y, z + 0.015],
        [0.25, h + 0.18, 0.1],
        '#688f81',
      )
      for (let row = -1; row <= 1; row++)
        b.block(
          [x + side * (w / 2 + 0.19), y + 0.18 * row, z + 0.076],
          [0.23, 0.035, 0.022],
          '#aac6a2',
        )
    }
}
function arch(b: Batch, x: number, z: number, w: number, h: number, c: string) {
  const points: XZ[] = [
    [-w / 2, 0],
    [w / 2, 0],
  ]
  for (let i = 0; i <= 8; i++) {
    const a = (i * Math.PI) / 8
    points.push([(Math.cos(a) * w) / 2, h - w / 2 + (Math.sin(a) * w) / 2])
  }
  b.prism(points, 0.1, c, [x, 0.1, z])
}
function door(b: Batch, x: number, z: number, c: string) {
  arch(b, x, z, 0.88, 1.44, timber)
  arch(b, x, z + 0.09, 0.7, 1.32, c)
  for (const dx of [-0.22, 0, 0.22])
    b.block([x + dx, 0.61, z + 0.202], [0.019, 0.92, 0.012], wood)
  b.ball([x + 0.21, 0.71, z + 0.23], [0.057, 0.057, 0.057], '#f8c85a')
  b.block([x, 0.09, z + 0.32], [1.12, 0.15, 0.64], '#baaa88', [0, 0, 0], true)
}
function roof(
  b: Batch,
  w: number,
  d: number,
  eave: number,
  peak: number,
  c: string,
  seam: string,
) {
  b.prism(
    [
      [-w / 2, eave],
      [w / 2, eave],
      [0, peak],
    ],
    d,
    '#e4ce9b',
    [0, 0, -d / 2],
  )
  const slope = Math.atan2(peak - eave, w / 2),
    run = Math.hypot(w / 2, peak - eave)
  for (const side of [-1, 1]) {
    const r: XYZ = [0, 0, -side * slope]
    b.block(
      [(side * w) / 4, (peak + eave) / 2 + 0.06, 0],
      [run + 0.28, 0.19, d + 0.6],
      c,
      r,
      true,
    )
    for (let i = 0; i < 5; i++) {
      const t = (i + 0.6) / 5
      b.block(
        [(side * t * w) / 2, peak - (peak - eave) * t + 0.145, 0],
        [0.06, 0.065, d + 0.52],
        seam,
        r,
        true,
      )
    }
    for (const end of [-1, 1])
      b.stick(
        [0, peak + 0.13, end * (d / 2 + 0.25)],
        [side * (w / 2 + 0.1), eave, end * (d / 2 + 0.25)],
        0.073,
        trim,
      )
    b.block(
      [side * (w / 2 + 0.03), eave - 0.035, 0],
      [0.14, 0.13, d + 0.58],
      timber,
    )
  }
  b.block([0, peak + 0.2, 0], [0.2, 0.15, d + 0.63], seam, [0, 0, 0], true)
}
export function building(
  kit: ModelKit,
  zone: 'about' | 'tech' | 'journey' | 'skills',
) {
  if (zone === 'about') return cottage(kit)
  const b = new Batch(kit)
  const isLab = zone === 'tech',
    isCafe = zone === 'skills',
    station = zone === 'journey'
  const w = station ? 3.9 : isLab ? 3.3 : 3.0,
    d = isLab ? 2.7 : 2.3,
    eave = isLab ? 2.15 : 1.92,
    peak = isCafe ? 2.8 : 3.19,
    face = d / 2
  const color = station
      ? '#e7bd7c'
      : isCafe
        ? '#f5d9a5'
        : '#c4d6bf'
  const roofColor = isLab
      ? '#488477'
      : isCafe
        ? '#d78a47'
        : '#577d85'
  const seam = isLab
      ? '#71a592'
      : isCafe
        ? '#eaa85a'
        : '#78969a'
  b.block([0, 0.09, 0], [w + 0.24, 0.22, d + 0.22], '#a59b83', [0, 0, 0], true)
  b.block([0, eave / 2 + 0.09, 0], [w, eave, d], color, [0, 0, 0], true)
  for (const s of [-1, 1]) {
    for (const z of [-1, 1])
      b.block(
        [s * (w / 2 - 0.04), eave / 2 + 0.07, z * (d / 2 - 0.02)],
        [0.14, eave, 0.15],
        timber,
      )
    b.block([(s * w) / 2, 0.45, 0], [0.08, 0.15, d], wood)
    b.block([s * (w / 2 + 0.035), 1.2, -0.1], [0.09, 0.87, 0.9], timber)
    b.block(
      [s * (w / 2 + 0.092), 1.2, -0.1],
      [0.04, 0.71, 0.72],
      '#95c2bb',
      [0, 0, 0],
      false,
      kit.glass,
    )
    b.block([s * (w / 2 + 0.13), 1.2, -0.1], [0.06, 0.06, 0.75], trim)
    b.block([s * (w / 2 + 0.13), 1.2, -0.1], [0.06, 0.73, 0.06], trim)
  }
  b.block([0, 0.41, face + 0.01], [w, 0.14, 0.1], wood)
  roof(b, w + 0.14, d, eave, peak, roofColor, seam)
  if (isCafe) {
    b.block([-0.85, 2.53, -0.43], [0.46, 1.33, 0.46], '#a96e53')
    b.block([-0.85, 3.23, -0.43], [0.59, 0.17, 0.59], clay)
    for (let i = 0; i < 3; i++)
      b.block([-0.85, 2.49 + i * 0.22, -0.19], [0.45, 0.025, 0.02], '#c98961')
  }
  if (isLab) {
    // Open-front wood and metal workbench, framed by a roll-up shop door.
    b.block(
      [-0.48, 1.02, face + 0.045],
      [2.06, 1.76, 0.14],
      '#3c5547',
      [0, 0, 0],
      true,
    )
    for (const x of [-1.49, 0.51])
      b.block([x, 0.98, face + 0.15], [0.13, 1.83, 0.23], timber)
    for (let j = 0; j < 5; j++)
      b.block(
        [-0.49, 1.58 + j * 0.072, face + 0.17],
        [1.92, 0.062, 0.23],
        j % 2 ? '#76958a' : '#9ab2a0',
      )
    b.block(
      [-0.5, 0.76, face + 0.33],
      [1.86, 0.11, 0.63],
      '#c08b60',
      [0, 0, 0],
      true,
    )
    for (const x of [-1.26, 0.27])
      b.block([x, 0.36, face + 0.44], [0.13, 0.72, 0.14], timber)
    b.block(
      [-0.91, 1.04, face + 0.26],
      [0.72, 0.44, 0.12],
      '#253c39',
      [0, 0, 0],
      true,
    )
    b.block([-0.91, 1.04, face + 0.332], [0.61, 0.33, 0.027], '#6caa91')
    for (const [x, y, width] of [
      [-0.98, 1.12, 0.28],
      [-0.94, 1.05, 0.32],
      [-1.05, 0.98, 0.14],
    ])
      b.block([x, y, face + 0.35], [width, 0.019, 0.012], '#f4df98')
    b.block([-0.88, 0.832, face + 0.53], [0.56, 0.045, 0.21], '#aac2a8')
    b.block(
      [0.18, 0.91, face + 0.47],
      [0.34, 0.25, 0.26],
      '#dd875e',
      [0, 0.08, 0],
      true,
    )
    b.stick(
      [0.18, 1.04, face + 0.47],
      [0.18, 1.22, face + 0.47],
      0.043,
      '#ebc86d',
    )
    door(b, 1.02, face, '#7ba091')
    // A coding symbol on the fascia identifies the workshop from across the path.
    const signZ = face + 0.19
    b.block([0, 2.36, signZ], [1.91, 0.58, 0.13], '#2e5c50', [0, 0, 0], true)
    for (const direction of [-1, 1]) {
      const tip = direction * 0.56
      const inner = direction * 0.34
      b.stick(
        [inner, 2.53, signZ + 0.1],
        [tip, 2.36, signZ + 0.1],
        0.042,
        '#fbe2a4',
      )
      b.stick(
        [tip, 2.36, signZ + 0.1],
        [inner, 2.19, signZ + 0.1],
        0.042,
        '#fbe2a4',
      )
    }
    b.stick(
      [-0.1, 2.19, signZ + 0.105],
      [0.1, 2.53, signZ + 0.105],
      0.035,
      '#91cbb0',
    )
  } else if (station) {
    door(b, 0, face, '#8aaca0')
    for (const s of [-1, 1])
      windowBox(b, s * 1.12, 1.16, face, 0.74, 0.75, false)
    b.cylinder([0, 2.51, face + 0.11], 0.39, 0.39, 0.15, timber, 16, [
      Math.PI / 2,
      0,
      0,
    ])
    b.cylinder([0, 2.51, face + 0.2], 0.31, 0.31, 0.05, '#fff1c8', 16, [
      Math.PI / 2,
      0,
      0,
    ])
    b.stick([0, 2.51, face + 0.24], [0, 2.74, face + 0.24], 0.024, timber)
    b.stick([0, 2.51, face + 0.24], [0.17, 2.47, face + 0.24], 0.023, timber)
    for (const s of [-1, 1])
      b.stick(
        [s * 1.72, 0.14, face + 0.8],
        [s * 1.72, 1.99, face + 0.8],
        0.07,
        timber,
      )
    b.block(
      [0, 1.98, face + 0.49],
      [w + 0.2, 0.13, 1.08],
      roofColor,
      [0.15, 0, 0],
      true,
    )
    b.block(
      [0, 0.06, face + 0.55],
      [w + 0.32, 0.12, 1.17],
      '#c3af8d',
      [0, 0, 0],
      true,
    )
  } else {
    door(b, -0.83, face, '#be8457')
    windowBox(b, 0.53, 1.06, face, 1.26, 0.94, false)
    for (let i = 0; i < 9; i++) {
      const x = (i - 4) * 0.34,
        c = i % 2 ? '#fff1cf' : '#dd8968'
      b.block([x, 1.86, face + 0.29], [0.345, 0.1, 0.91], c, [0.21, 0, 0])
      b.cylinder([x, 1.72, face + 0.72], 0.18, 0.18, 0.09, c, 10, [
        Math.PI / 2,
        0,
        0,
      ])
    }
    for (const x of [-1.38, 1.38])
      b.stick([x, 0.13, face + 0.68], [x, 1.75, face + 0.68], 0.046, wood)
    // A teacup and curved handle above the shopfront.
    b.cylinder([0, 2.65, face + 0.15], 0.26, 0.15, 0.31, '#fff3ce', 12)
    b.ball([0, 2.81, face + 0.15], [0.2, 0.02, 0.2], '#80573e', 1)
    b.stick([0.23, 2.75, face + 0.14], [0.41, 2.72, face + 0.14], 0.05, trim)
    b.stick([0.41, 2.72, face + 0.14], [0.25, 2.55, face + 0.14], 0.05, trim)
  }
  // A welcoming porch: wall lanterns that glow at dusk, potted plants and a
  // doormat.
  const doorX = isLab ? 1.02 : station ? 0 : -0.83
  const lanterns = isCafe ? [doorX - 0.6] : [doorX - 0.6, doorX + 0.6]
  for (const x of lanterns) wallLantern(b, x, 1.32, face)
  b.block([doorX, 0.105, face + 0.78], [0.7, 0.02, 0.36], '#c6774f', [0, 0, 0], true)
  b.block([doorX, 0.11, face + 0.78], [0.56, 0.02, 0.24], '#e9a66a', [0, 0, 0], true)
  const pots = isCafe ? [1.62] : [doorX - 0.78, doorX + 0.78]
  pots.forEach((x, i) => pottedPlant(b, x, face + 0.48, i + (isLab ? 2 : 4)))
  return b.finish()
}

function wallLantern(b: Batch, x: number, y: number, face: number) {
  b.stick([x, y + 0.1, face + 0.02], [x, y + 0.1, face + 0.17], 0.018, '#4b3b31', 5)
  b.cylinder([x, y + 0.13, face + 0.17], 0.02, 0.09, 0.07, '#4b3b31', 6)
  b.cylinder([x, y, face + 0.17], 0.07, 0.065, 0.18, '#ffd28a', 6, [0, 0, 0], b.kit.glass)
  b.cylinder([x, y - 0.1, face + 0.17], 0.075, 0.05, 0.03, '#4b3b31', 6)
}

function pottedPlant(b: Batch, x: number, z: number, kind: number) {
  b.cylinder([x, 0.26, z], 0.2, 0.15, 0.32, kind % 2 ? '#c8724e' : '#d48a5c', 12)
  b.cylinder([x, 0.42, z], 0.215, 0.215, 0.05, kind % 2 ? '#b5633f' : '#c27a4f', 12)
  const bloom = ['#ef6c6c', '#f6c24d', '#f39ac4', '#b49ae6', '#fffaf0', '#ff9a5c'][kind % 6]
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2
    b.ball([x + Math.cos(a) * 0.1, 0.55, z + Math.sin(a) * 0.1], [0.11, 0.09, 0.11], '#6fa65a', 1, [0, a, 0], b.kit.leaf)
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4
    b.ball([x + Math.cos(a) * 0.08, 0.67 + (i % 2) * 0.05, z + Math.sin(a) * 0.08], [0.055, 0.045, 0.055], bloom, 1, [0, 0, 0], b.kit.petals)
  }
}

function wreath(b: Batch, x: number, y: number, z: number) {
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2
    b.ball([x + Math.cos(a) * 0.17, y + Math.sin(a) * 0.17, z], [0.06, 0.06, 0.035], i % 2 ? '#5f9a58' : '#78b064', 1)
  }
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.5
    b.ball([x + Math.cos(a) * 0.17, y + Math.sin(a) * 0.17, z + 0.03], [0.022, 0.022, 0.022], i % 2 ? '#e2574c' : '#f6c24d', 1)
  }
  for (const s of [-1, 1]) b.ball([x + s * 0.05, y - 0.18, z + 0.03], [0.05, 0.035, 0.02], '#e2574c', 1, [0, 0, s * 0.5])
}
export function lighthouse(b: Batch, x: number, z: number) {
  const y = 0.6
  b.cylinder([x, 0.17, z], 1.51, 1.8, 0.42, '#c29b68', 12)
  b.cylinder([x, 0.41, z], 1.44, 1.53, 0.19, '#9dbb6c', 12)
  for (let i = 0; i < 5; i++)
    b.cylinder(
      [x, y + 0.45 + i * 0.9, z],
      0.96 - (i + 1) * 0.089,
      0.96 - i * 0.089,
      0.91,
      i % 2 ? '#cb614b' : '#fff0ce',
      14,
    )
  archAtBase()
  b.cylinder([x, 5.08, z], 0.86, 0.76, 0.16, timber, 16)
  b.cylinder(
    [x, 5.46, z],
    0.46,
    0.46,
    0.73,
    '#fed89a',
    12,
    [0, 0, 0],
    b.kit.glass,
  )
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5,
      dx = Math.cos(a),
      dz = Math.sin(a)
    b.stick(
      [x + 0.73 * dx, 5.13, z + 0.73 * dz],
      [x + 0.73 * dx, 5.43, z + 0.73 * dz],
      0.029,
      timber,
    )
    b.stick(
      [x + 0.73 * dx, 5.42, z + 0.73 * dz],
      [
        x + 0.73 * Math.cos(a + Math.PI / 5),
        5.42,
        z + 0.73 * Math.sin(a + Math.PI / 5),
      ],
      0.026,
      timber,
    )
    if (i % 2 === 0)
      b.stick(
        [x + 0.45 * dx, 5.15, z + 0.45 * dz],
        [x + 0.45 * dx, 5.84, z + 0.45 * dz],
        0.042,
        timber,
      )
  }
  b.cylinder([x, 6.02, z], 0.09, 0.82, 0.48, '#b95a47', 14)
  b.ball([x, 6.32, z], [0.1, 0.13, 0.1], '#c99a55', 1)
  function archAtBase() {
    b.block([x, 1.08, z + 0.88], [0.5, 0.95, 0.11], wood, [0, 0, 0], true)
    for (let i = 0; i < 2; i++)
      b.block(
        [x, 2.73 + i * 1.65, z + 0.74 - i * 0.17],
        [0.22, 0.38, 0.08],
        '#5f8584',
        [0, 0, 0],
        true,
      )
  }
}
export function pickable(
  group: T.Group,
  zone: string,
  x: number,
  z: number,
  project?: number,
) {
  group.position.set(x, 0, z)
  group.name = zone
  group.userData.zone = zone
  if (project !== undefined) group.userData.project = project
  return group
}

/**
 * Iker's cottage: a timber-framed storybook house on a stone plinth, with a
 * shingled roof, a dormer, a stone chimney, a little door canopy, climbing
 * ivy and a cosy porch. Same footprint and door as before.
 */
function cottage(kit: ModelKit) {
  const b = new Batch(kit)
  const w = 3.0,
    d = 2.3,
    eave = 1.95,
    peak = 3.3,
    face = d / 2,
    doorX = -0.59
  const plaster = '#f7e4b8',
    shingles = ['#c4573f', '#d06a4c', '#b94f39']
  // Stone plinth with rounded stones along the visible sides.
  b.block([0, 0.09, 0], [w + 0.26, 0.22, d + 0.24], '#b8a894', [0, 0, 0], true)
  const stones = ['#cdbfae', '#b9aa98', '#d8ccbc', '#c3b3a2']
  for (let x = -w / 2 + 0.1, k = 0; x < w / 2; x += 0.3, k++)
    if (Math.abs(x - doorX) > 0.5) b.ball([x, 0.16, face + 0.13], [0.15, 0.1, 0.05], stones[k % 4], 1, [0, 0, k * 0.4])
  for (const side of [-1, 1])
    for (let z = -d / 2 + 0.1, k = 0; z < d / 2; z += 0.3, k++)
      b.ball([side * (w / 2 + 0.13), 0.16, z], [0.05, 0.1, 0.15], stones[(k + 2) % 4], 1, [k * 0.4, 0, 0])
  // Plastered walls and a timber frame.
  b.block([0, eave / 2 + 0.1, 0], [w, eave, d], plaster, [0, 0, 0], true)
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) b.block([sx * (w / 2 - 0.03), eave / 2 + 0.08, sz * (d / 2 - 0.03)], [0.14, eave, 0.14], timber)
  for (const y of [0.42, eave])
    for (const sz of [-1, 1]) b.block([0, y, sz * (d / 2 + 0.03)], [w + 0.04, 0.1, 0.06], y < 1 ? wood : timber)
  for (const side of [-1, 1]) {
    b.block([side * (w / 2 + 0.03), eave, 0], [0.06, 0.1, d + 0.04], timber)
    // Cross braces and a glowing side window.
    for (const [z0, z1] of [
      [-1.05, -0.35],
      [-0.35, -1.05],
    ])
      b.stick([side * (w / 2 + 0.035), 0.5, z0], [side * (w / 2 + 0.035), eave - 0.05, z1], 0.035, timber, 5)
    b.block([side * (w / 2 + 0.04), 1.15, 0.45], [0.09, 0.82, 0.78], timber)
    b.block([side * (w / 2 + 0.09), 1.15, 0.45], [0.04, 0.66, 0.62], '#95c2bb', [0, 0, 0], false, kit.glass)
    b.block([side * (w / 2 + 0.12), 1.15, 0.45], [0.05, 0.05, 0.66], trim)
    b.block([side * (w / 2 + 0.12), 1.15, 0.45], [0.05, 0.68, 0.05], trim)
    b.block([side * (w / 2 + 0.16), 0.74, 0.45], [0.14, 0.08, 0.84], trim)
  }
  // Gable end: plaster infill with decorative half-timbering.
  for (const z of [face, -face])
    b.prism(
      [
        [-w / 2, eave],
        [w / 2, eave],
        [0, peak],
      ],
      0.06,
      plaster,
      [0, 0, z - 0.03],
    )
  b.block([0, eave + 0.42, face + 0.04], [w * 0.62, 0.08, 0.05], timber)
  for (const side of [-1, 1])
    b.stick([side * 0.18, eave + 0.05, face + 0.04], [side * 0.62, eave + 0.42, face + 0.04], 0.03, timber, 5)
  // Round attic window that glows at night.
  b.ball([0, 2.72, face + 0.05], [0.27, 0.27, 0.08], timber, 1)
  b.ball([0, 2.72, face + 0.1], [0.2, 0.2, 0.04], '#f4c77d', 1, [0, 0, 0], kit.glass)
  b.block([0, 2.72, face + 0.13], [0.03, 0.38, 0.02], trim)
  b.block([0, 2.72, face + 0.13], [0.38, 0.03, 0.02], trim)

  // Shingled roof: stepped rows with a scalloped eave.
  const slope = Math.atan2(peak - eave, w / 2),
    run = Math.hypot(w / 2, peak - eave)
  const rows = 6
  for (const side of [-1, 1]) {
    const rot: XYZ = [0, 0, -side * slope]
    for (let r = 0; r < rows; r++) {
      const t = (r + 0.5) / rows
      const x = side * (w / 2 + 0.16) * t,
        y = peak - (peak - eave) * t + 0.13 + r * 0.012
      b.block([x, y, 0], [run / rows + 0.12, 0.09, d + 0.62], shingles[r % 3], rot, true)
    }
    for (let z = -d / 2 - 0.27, k = 0; z <= d / 2 + 0.28; z += 0.23, k++)
      b.ball([side * (w / 2 + 0.2), eave - 0.02, z], [0.1, 0.07, 0.13], shingles[k % 3], 1, [0, 0, -side * slope])
    for (const end of [-1, 1])
      b.stick([0, peak + 0.15, end * (d / 2 + 0.3)], [side * (w / 2 + 0.2), eave + 0.02, end * (d / 2 + 0.3)], 0.06, trim)
  }
  b.block([0, peak + 0.2, 0], [0.22, 0.16, d + 0.7], '#a54833', [0, 0, 0], true)
  // Weather vane on the ridge.
  b.ball([0, peak + 0.32, face + 0.3], [0.07, 0.07, 0.07], '#e8b85a', 1)
  b.stick([0, peak + 0.25, -0.5], [0, peak + 0.95, -0.5], 0.02, '#5b4a3e', 5)
  b.block([0, peak + 0.82, -0.5], [0.02, 0.06, 0.5], '#5b4a3e')
  b.prism(
    [
      [0, 0],
      [0.14, 0.08],
      [0, 0.16],
    ],
    0.02,
    '#e8b85a',
    [-0.01, peak + 0.74, -0.24],
    [0, -Math.PI / 2, 0],
  )
  b.ball([0, peak + 0.97, -0.5], [0.04, 0.04, 0.04], '#e8b85a', 1)

  // Dormer on the sunny slope, with its own little gable.
  const dx = 0.72,
    dy = eave + 0.55,
    dz = -0.35
  b.block([dx, dy, dz], [0.6, 0.55, 0.72], plaster, [0, 0, 0], true)
  b.block([dx + 0.31, dy - 0.02, dz], [0.06, 0.4, 0.42], timber)
  b.block([dx + 0.34, dy - 0.02, dz], [0.03, 0.3, 0.32], '#f4c77d', [0, 0, 0], false, kit.glass)
  b.block([dx + 0.36, dy - 0.02, dz], [0.03, 0.32, 0.03], trim)
  for (const side of [-1, 1])
    b.block([dx + 0.05, dy + 0.38, dz + side * 0.22], [0.78, 0.07, 0.5], shingles[1], [side * 0.62, 0, 0], true)

  // Stone chimney with two pots (smoke rises from here).
  const cx = -0.85,
    cz = -0.43
  b.block([cx, 2.55, cz], [0.46, 1.6, 0.46], '#bfae9c', [0, 0, 0], true)
  for (let row = 0; row < 6; row++)
    for (let k = 0; k < 2; k++) {
      const y = 1.95 + row * 0.24
      const off = (k - 0.5) * 0.22 + (row % 2) * 0.05
      b.ball([cx + off, y, cz + 0.24], [0.11, 0.09, 0.04], stones[(row + k) % 4], 1)
      b.ball([cx + 0.24, y, cz + off], [0.04, 0.09, 0.11], stones[(row + k + 1) % 4], 1)
    }
  b.block([cx, 3.37, cz], [0.6, 0.09, 0.6], '#a89886', [0, 0, 0], true)
  for (const k of [-1, 1]) b.cylinder([cx + k * 0.12, 3.47, cz], 0.07, 0.08, 0.14, clay, 8)

  // The front: arched door under a little canopy, shuttered window with a
  // flower box, lanterns, ivy, hedges, pots, doormat and a wreath.
  door(b, doorX, face, '#7c9c82')
  for (const side of [-1, 1]) {
    b.stick([doorX + side * 0.5, 1.45, face + 0.02], [doorX + side * 0.5, 1.62, face + 0.38], 0.03, timber, 5)
    b.block([doorX + side * 0.28, 1.72, face + 0.24], [0.62, 0.06, 0.55], shingles[0], [0, 0, -side * 0.45], true)
  }
  windowBox(b, 0.68, 1.16, face, 0.7, 0.67, true)
  b.block([0.68, 0.66, face + 0.22], [1.16, 0.22, 0.3], '#a56a42')
  for (let i = 0; i < 7; i++) {
    b.ball([0.21 + i * 0.15, 0.82, face + 0.23], [0.17, 0.12, 0.14], '#638d52', 1, [0, i, 0], kit.leaf)
    b.ball([0.25 + i * 0.14, 0.91, face + 0.28], [0.085, 0.085, 0.085], i % 2 ? '#ed8d77' : '#eaac4e', 1, [0, 0, 0], kit.petals)
  }
  for (const x of [doorX - 0.6, doorX + 0.6]) wallLantern(b, x, 1.32, face)
  for (let i = 0; i < 9; i++) {
    const y = 0.3 + i * 0.19
    b.ball([-w / 2 - 0.02 + Math.sin(i * 1.7) * 0.05, y, face + 0.06], [0.14, 0.13, 0.1], i % 2 ? '#5f9a58' : '#73ad62', 1, [0, i, 0], kit.leaf)
    if (i % 3 === 1) b.ball([-w / 2 + 0.06, y + 0.05, face + 0.14], [0.04, 0.04, 0.03], '#f3a6b5', 1, [0, 0, 0], kit.petals)
  }
  for (const x of [-w / 2 - 0.25, w / 2 + 0.25])
    b.ball([x, 0.32, face + 0.25], [0.34, 0.3, 0.3], '#6fa65a', 1, [0, x, 0], kit.leaf)
  b.block([doorX, 0.105, face + 0.78], [0.7, 0.02, 0.36], '#c6774f', [0, 0, 0], true)
  b.block([doorX, 0.11, face + 0.78], [0.56, 0.02, 0.24], '#e9a66a', [0, 0, 0], true)
  ;[doorX - 0.78, doorX + 0.78].forEach((x, i) => pottedPlant(b, x, face + 0.48, i))
  wreath(b, doorX, 1.0, face + 0.25)
  return b.finish()
}
