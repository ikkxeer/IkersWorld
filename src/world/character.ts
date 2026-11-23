import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { cartoon } from './modelKit'

/** What the engine measured this frame, in world units. */
export interface Locomotion {
  /** Distance actually travelled this frame (after collisions). */
  distance: number
  /** Smoothed ground speed in units per second. */
  speed: number
  /** Signed yaw (radians) still to turn before facing the travel direction. */
  turn: number
  /** Kick up little dust puffs on footfalls (outdoors only). */
  dust?: boolean
}

export interface IslandCharacter {
  group: THREE.Group
  /** World-space effects (dust) the engine keeps in the active scene. */
  effects?: THREE.Group
  /** Seconds since startup. Facing follows the outer group's local +Z axis. */
  animate: (
    time: number,
    reduced: boolean,
    move?: Locomotion,
    attention?: THREE.Vector3 | null,
  ) => void
  /** Drop any in-flight gait state, e.g. after a teleport or a scene swap. */
  settle: () => void
}

type Vec3 = [number, number, number]

/** Bake differently painted details into one draw call per articulated part. */
function sculpt(material: THREE.Material) {
  const pieces: THREE.BufferGeometry[] = []

  function add(
    geometry: THREE.BufferGeometry,
    color: string,
    at: Vec3,
    size: Vec3,
    tilt: Vec3,
  ) {
    const transform = new THREE.Matrix4().compose(
      new THREE.Vector3(...at),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...tilt)),
      new THREE.Vector3(...size),
    )
    geometry.applyMatrix4(transform)
    const paint = new THREE.Color(color)
    const colors = new Float32Array(geometry.getAttribute('position').count * 3)
    for (let i = 0; i < colors.length; i += 3) paint.toArray(colors, i)
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    for (const name of Object.keys(geometry.attributes))
      if (name !== 'position' && name !== 'normal' && name !== 'color')
        geometry.deleteAttribute(name)
    geometry.clearGroups()
    pieces.push(geometry)
  }

  return {
    oval(color: string, at: Vec3, size: Vec3, tilt: Vec3 = [0, 0, 0]) {
      add(new THREE.SphereGeometry(1, 16, 12), color, at, size, tilt)
    },
    /** A rounded limb hanging from its joint (local origin) along -Y. */
    limb(color: string, radius: number, length: number, at: Vec3 = [0, 0, 0]) {
      add(
        new THREE.CapsuleGeometry(1, length / radius, 4, 12),
        color,
        [at[0], at[1] - length / 2, at[2]],
        [radius, radius, radius],
        [0, 0, 0],
      )
    },
    /** A doughnut (scarf, rims) of the given ring and tube radius. */
    ring(color: string, at: Vec3, radius: number, tube: number, depth = 1, tilt: Vec3 = [0, 0, 0]) {
      const profile: [number, number][] = []
      for (let i = 0; i <= 10; i++) {
        const a = (i / 10) * TAU - Math.PI / 2
        profile.push([radius + tube * Math.cos(a), tube * Math.sin(a)])
      }
      add(
        new THREE.LatheGeometry(
          profile.map(([r, y]) => new THREE.Vector2(r, y)),
          28,
        ),
        color,
        at,
        [1, 1, depth],
        tilt,
      )
    },
    turned(
      color: string,
      at: Vec3,
      profile: [number, number][],
      depth = 1,
      tilt: Vec3 = [0, 0, 0],
    ) {
      add(
        new THREE.LatheGeometry(
          profile.map(([r, y]) => new THREE.Vector2(r, y)),
          32,
        ),
        color,
        at,
        [1, 1, depth],
        tilt,
      )
    },
    mesh(parent: THREE.Object3D, at: Vec3 = [0, 0, 0]) {
      const combined = mergeGeometries(pieces)
      for (const part of pieces) part.dispose()
      pieces.length = 0
      const mesh = new THREE.Mesh(combined, material)
      mesh.castShadow = true
      mesh.receiveShadow = true
      mesh.position.set(...at)
      parent.add(mesh)
      return mesh
    },
  }
}

function joint(parent: THREE.Object3D, x = 0, y = 0, z = 0) {
  const part = new THREE.Group()
  part.position.set(x, y, z)
  parent.add(part)
  return part
}

function clay() {
  return cartoon(
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82 }),
    0.26,
    0.08,
  )
}

function blobShadow(radius: number) {
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 24),
    new THREE.MeshBasicMaterial({
      color: '#24382e',
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    }),
  )
  shadow.rotation.x = -Math.PI / 2
  shadow.position.y = 0.015
  return shadow
}

/** Critically damped spring, for secondary motion such as the hat brim. */
function spring(stiffness: number, damping: number) {
  let value = 0,
    velocity = 0
  return {
    step(target: number, dt: number) {
      velocity += ((target - value) * stiffness - velocity * damping) * dt
      value += velocity * dt
      return value
    },
    kick(impulse: number) {
      velocity += impulse
    },
    reset() {
      value = 0
      velocity = 0
    },
  }
}

const TAU = Math.PI * 2
const { clamp, damp, lerp } = THREE.MathUtils
/** Signed shortest difference between two angles. */
export const angleDelta = (from: number, to: number) =>
  Math.atan2(Math.sin(to - from), Math.cos(to - from))
const ease = (t: number) => t * t * (3 - 2 * t)

/** A small pseudo-random stream so idle behaviour differs between characters. */
function chance(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 4294967296
  }
}

/** Blink timing shared by every character: occasional single or double blinks. */
function blinker(random: () => number) {
  let next = 1.5 + random() * 2,
    double = false
  return (time: number) => {
    if (time > next + 0.5) next = time + 0.3 + random() * 2
    const since = time - next
    if (since < 0) return 1
    const close = (t: number) =>
      t >= 0 && t < 0.15 ? 1 - Math.sin((t / 0.15) * Math.PI) * 0.92 : 1
    const value = Math.min(close(since), double ? close(since - 0.2) : 1)
    if (since > (double ? 0.36 : 0.16)) {
      next = time + 2.2 + random() * 3.4
      double = random() < 0.25
    }
    return value
  }
}

/* ------------------------------------------------------------------------ */
/* Palette: a mint striped jumper, denim dungarees, a coral scarf and yellow */
/* rain boots make the visitor readable at a glance, even from far away.    */
const skin = '#f7cba4'
const skinShade = '#f0b28c'
const blush = '#f59a88'
const hair = '#7a4630'
const hairLight = '#99603f'
const jumper = '#83cdb0'
const stripe = '#fdf3dc'
const denim = '#5479b0'
const denimLight = '#6e93c6'
const scarf = '#ef6c5c'
const boot = '#f3b840'
const sole = '#8a5440'
const ink = '#2f2624'

/* ------------------------------------------------------------------------ */
/* Rig dimensions, in the character's local units (the engine scales ×1.36). */
const THIGH = 0.165
const SHIN = 0.165
const LEG = THIGH + SHIN
const HIP_X = 0.075
const FOOT_X = 0.094
const ANKLE_Y = 0.085
const PELVIS_Y = 0.395
const UPPER_ARM = 0.105
const FOREARM = 0.095
const HEAD = 0.3
/** Distance (local) covered by one full gait cycle, i.e. two steps, at top speed. */
const CYCLE = 0.72
/** Fraction of the cycle each foot spends on the ground; the rest is the swing. */
const STANCE = 0.56
const TOP_SPEED = 3.1

interface FootPose {
  z: number
  y: number
  pitch: number
}

type IdleAction = 'sway' | 'stretch' | 'tap'

export function createVisitor(): IslandCharacter {
  const group = new THREE.Group()
  const material = clay()
  const random = chance(11)

  /* ----------------------------- Skeleton ------------------------------ */
  const pelvis = joint(group, 0, PELVIS_Y, 0)
  const chest = joint(pelvis, 0, 0.05, 0)
  const neck = joint(chest, 0, 0.245, 0.005)
  const head = joint(neck)
  const cowlick = joint(head, 0.03, HEAD + 0.27, -0.02)
  const scarfTail = joint(chest, -0.085, 0.235, -0.1)

  /* ------------------------- Dungaree shorts --------------------------- */
  const hips = sculpt(material)
  hips.oval(denim, [0, 0.03, 0], [0.158, 0.11, 0.135])
  hips.oval(denimLight, [0, -0.01, -0.118], [0.06, 0.045, 0.02])
  hips.mesh(pelvis)

  /* ----------------------------- Torso --------------------------------- */
  const torso = sculpt(material)
  torso.turned(
    jumper,
    [0, 0, 0],
    [
      [0, 0],
      [0.168, 0.01],
      [0.176, 0.06],
      [0.172, 0.16],
      [0.148, 0.222],
      [0.08, 0.248],
      [0, 0.248],
    ],
    0.86,
  )
  // Cream stripes wrap the jumper.
  for (const [y, r] of [
    [0.115, 0.177],
    [0.175, 0.166],
  ])
    torso.turned(
      stripe,
      [0, 0, 0],
      [
        [r, y - 0.018],
        [r + 0.004, y],
        [r, y + 0.018],
      ],
      0.86,
    )
  // Dungaree bib, straps, brass buttons and a sunny star patch.
  torso.oval(denim, [0, 0.07, 0.112], [0.115, 0.1, 0.048])
  torso.oval(denim, [0, 0.03, 0], [0.172, 0.07, 0.15])
  for (const side of [-1, 1]) {
    torso.oval(denim, [side * 0.078, 0.165, 0.12], [0.022, 0.07, 0.014], [0.2, 0, side * 0.12])
    torso.oval(denim, [side * 0.078, 0.15, -0.122], [0.022, 0.085, 0.014], [-0.2, 0, side * 0.12])
    torso.oval('#f6cf63', [side * 0.07, 0.122, 0.152], [0.017, 0.017, 0.01])
  }
  torso.oval(denimLight, [0, 0.06, 0.155], [0.05, 0.04, 0.008])
  torso.oval('#ffd56a', [0, 0.065, 0.161], [0.026, 0.026, 0.008])
  torso.oval('#ff9f7a', [0, 0.065, 0.166], [0.011, 0.011, 0.005])
  // A chunky knitted scarf.
  torso.ring(scarf, [0, 0.243, 0.004], 0.105, 0.045, 0.92)
  torso.oval('#f58676', [0.07, 0.225, 0.1], [0.05, 0.045, 0.04], [0, 0.4, 0])
  torso.mesh(chest)

  const tail = sculpt(material)
  tail.oval(scarf, [0, -0.065, 0], [0.048, 0.08, 0.022])
  tail.oval(stripe, [0, -0.125, 0], [0.047, 0.018, 0.024])
  tail.oval(scarf, [0, -0.16, 0], [0.045, 0.03, 0.021])
  for (const dx of [-0.028, 0, 0.028])
    tail.oval(scarf, [dx, -0.195, 0], [0.011, 0.016, 0.011])
  tail.mesh(scarfTail)

  /* ------------------------------ Head --------------------------------- */
  const H = HEAD
  const face = sculpt(material)
  face.oval(skin, [0, 0, 0], [0.31, 0.29, 0.28])
  face.oval(skin, [0, -0.06, 0.07], [0.27, 0.21, 0.22])
  face.oval(skinShade, [0, -0.045, 0.285], [0.03, 0.022, 0.02])
  for (const side of [-1, 1]) {
    face.oval(skin, [side * 0.298, -0.02, 0.01], [0.05, 0.068, 0.045])
    face.oval('#f2a18c', [side * 0.31, -0.022, 0.03], [0.022, 0.035, 0.012])
    face.oval(blush, [side * 0.172, -0.085, 0.232], [0.058, 0.032, 0.012], [0, side * 0.58, 0])
    face.oval(hair, [side * 0.272, 0.005, 0.06], [0.05, 0.11, 0.075])
  }
  // Hair: a rounded cap, a swoopy four-lock fringe and a nape tuft.
  face.oval(hair, [0, 0.075, -0.045], [0.326, 0.272, 0.3])
  face.oval(hair, [0, -0.09, -0.2], [0.24, 0.16, 0.12])
  for (const [x, y, z, angle, w] of [
    [-0.19, 0.11, 0.19, 0.7, 0.085],
    [-0.085, 0.155, 0.22, 0.35, 0.1],
    [0.04, 0.16, 0.225, -0.15, 0.1],
    [0.165, 0.125, 0.2, -0.55, 0.09],
  ])
    face.oval(hair, [x, y, z], [w, 0.115, 0.055], [0.25, 0, angle])
  face.oval(hairLight, [-0.08, 0.235, 0.12], [0.11, 0.035, 0.05], [0.5, 0.2, 0.25])
  face.mesh(head, [0, H, 0])

  const cowlickMesh = sculpt(material)
  cowlickMesh.oval(hair, [0, 0.045, 0], [0.032, 0.07, 0.026], [0, 0, -0.35])
  cowlickMesh.oval(hair, [0.035, 0.105, 0.004], [0.026, 0.045, 0.022], [0, 0, 0.9])
  cowlickMesh.mesh(cowlick)

  // Expressions are separate meshes so the face can switch moods.
  const eyeShapes = sculpt(material)
  for (const side of [-1, 1]) {
    eyeShapes.oval(ink, [side * 0.11, 0, 0.255], [0.042, 0.058, 0.02], [0, side * 0.38, 0])
    eyeShapes.oval('#ffffff', [side * 0.11 - 0.015, 0.022, 0.274], [0.014, 0.017, 0.005])
    eyeShapes.oval('#ffffff', [side * 0.11 + 0.012, -0.022, 0.276], [0.006, 0.007, 0.004])
  }
  const eyes = eyeShapes.mesh(head, [0, H, 0])
  const happyShapes = sculpt(material)
  for (const side of [-1, 1])
    for (const half of [-1, 1])
      happyShapes.oval(
        ink,
        [side * 0.11 + half * 0.02, 0.004, 0.27],
        [0.028, 0.009, 0.009],
        [0, side * 0.38, -half * 0.6],
      )
  const happyEyes = happyShapes.mesh(head, [0, H, 0])
  happyEyes.visible = false

  const browShapes = sculpt(material)
  for (const side of [-1, 1])
    browShapes.oval(hair, [side * 0.115, 0.098, 0.258], [0.038, 0.011, 0.01], [0, side * 0.35, -side * 0.16])
  const brows = browShapes.mesh(head, [0, H, 0])

  const smileShapes = sculpt(material)
  for (const side of [-1, 1])
    smileShapes.oval('#a3574b', [side * 0.017, -0.112, 0.268], [0.022, 0.008, 0.008], [0, side * 0.1, side * 0.36])
  const smile = smileShapes.mesh(head, [0, H, 0])
  const openShapes = sculpt(material)
  openShapes.oval('#8c3b3a', [0, -0.115, 0.262], [0.042, 0.034, 0.016])
  openShapes.oval('#ec7b77', [0, -0.13, 0.27], [0.026, 0.014, 0.01])
  const mouthOpen = openShapes.mesh(head, [0, H, 0])
  mouthOpen.visible = false

  /* ------------------------------ Arms --------------------------------- */
  const arms = [-1, 1].map((side) => {
    const shoulder = joint(chest, side * 0.148, 0.2, 0.004)
    const upper = sculpt(material)
    upper.oval(jumper, [0, -0.004, 0], [0.06, 0.062, 0.062])
    upper.limb(jumper, 0.05, UPPER_ARM - 0.02)
    upper.oval(stripe, [0, -0.05, 0], [0.053, 0.016, 0.053])
    upper.oval(stripe, [0, -UPPER_ARM + 0.01, 0], [0.052, 0.024, 0.052])
    upper.mesh(shoulder)
    const elbow = joint(shoulder, 0, -UPPER_ARM, 0)
    const lower = sculpt(material)
    lower.limb(skin, 0.04, FOREARM - 0.035)
    lower.oval(skin, [0, -FOREARM, 0.006], [0.055, 0.058, 0.05])
    lower.oval(skin, [-side * 0.02, -FOREARM + 0.014, 0.04], [0.02, 0.028, 0.02], [0.4, 0, 0])
    lower.mesh(elbow)
    return { side, shoulder, elbow }
  })

  /* ------------------------------ Legs --------------------------------- */
  const legs = [-1, 1].map((side) => {
    const thigh = sculpt(material)
    thigh.limb(denim, 0.066, THIGH - 0.02)
    thigh.oval(denimLight, [0, -THIGH + 0.035, 0], [0.07, 0.02, 0.07])
    const calf = sculpt(material)
    calf.limb(stripe, 0.05, SHIN - 0.035, [0, 0.005, 0])
    const shoe = sculpt(material)
    shoe.oval(boot, [0, 0.045, -0.005], [0.072, 0.06, 0.072])
    shoe.oval('#f8cf6d', [0, 0.092, -0.005], [0.074, 0.016, 0.074])
    shoe.oval(boot, [0, -0.01, 0.035], [0.094, 0.07, 0.138])
    shoe.oval('#f7c95e', [0, 0.012, 0.11], [0.06, 0.04, 0.05])
    shoe.oval(sole, [0, -0.058, 0.033], [0.099, 0.026, 0.143])
    const leg = {
      side,
      thigh: thigh.mesh(group),
      calf: calf.mesh(group),
      shoe: shoe.mesh(group),
      pose: { z: 0, y: 0, pitch: 0 } as FootPose,
      from: { z: 0, y: 0, pitch: 0 } as FootPose,
      planted: true,
    }
    leg.shoe.name = 'visitor boot'
    leg.calf.name = 'visitor calf'
    return leg
  })

  const shadow = blobShadow(0.3)
  shadow.scale.y = 0.85
  group.add(shadow)
  group.name = 'visitor'

  /* ------------------------------ Dust --------------------------------- */
  const effects = new THREE.Group()
  effects.name = 'visitor dust'
  const puffGeometry = new THREE.IcosahedronGeometry(1, 1)
  const puffs = Array.from({ length: 10 }, () => {
    const mesh = new THREE.Mesh(
      puffGeometry,
      new THREE.MeshLambertMaterial({
        color: '#f6ead0',
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    )
    mesh.visible = false
    effects.add(mesh)
    return { mesh, age: 1, drift: new THREE.Vector3() }
  })
  let nextPuff = 0
  const footWorld = new THREE.Vector3()
  function kickDust(foot: THREE.Object3D, strength: number) {
    foot.getWorldPosition(footWorld)
    for (let i = 0; i < 2; i++) {
      const puff = puffs[nextPuff]
      nextPuff = (nextPuff + 1) % puffs.length
      const a = random() * TAU
      puff.age = 0
      puff.mesh.visible = true
      puff.mesh.position.set(
        footWorld.x + Math.cos(a) * 0.08,
        footWorld.y - 0.06,
        footWorld.z + Math.sin(a) * 0.08,
      )
      puff.drift.set(Math.cos(a) * 0.35, 0.32, Math.sin(a) * 0.35)
      puff.mesh.userData.strength = strength
    }
  }
  function updateDust(dt: number) {
    for (const puff of puffs) {
      if (!puff.mesh.visible) continue
      puff.age += dt / 0.55
      if (puff.age >= 1) {
        puff.mesh.visible = false
        continue
      }
      const k = 1 - puff.age
      puff.mesh.position.addScaledVector(puff.drift, dt * k)
      puff.mesh.scale.setScalar((0.05 + 0.09 * ease(puff.age)) * puff.mesh.userData.strength)
      ;(puff.mesh.material as THREE.MeshLambertMaterial).opacity = 0.55 * k * k
    }
  }

  /* ---------------------------- Solvers -------------------------------- */
  const down = new THREE.Vector3(0, -1, 0)
  const forward = new THREE.Vector3(0, 0, 1)
  const direction = new THREE.Vector3()
  const bend = new THREE.Vector3()
  const hip = new THREE.Vector3()
  const knee = new THREE.Vector3()
  const ankle = new THREE.Vector3()

  function aim(segment: THREE.Object3D, from: THREE.Vector3, to: THREE.Vector3) {
    segment.position.copy(from)
    direction.subVectors(to, from).normalize()
    segment.quaternion.setFromUnitVectors(down, direction)
  }

  /** Analytic two-bone IK: fixed bone lengths, knee bending forward. */
  function solveLeg(
    leg: (typeof legs)[number],
    from: THREE.Vector3,
    to: THREE.Vector3,
  ) {
    direction.subVectors(to, from)
    const reach = clamp(direction.length(), 0.05, LEG * 0.999)
    direction.normalize()
    const cosHip = (THIGH * THIGH + reach * reach - SHIN * SHIN) / (2 * THIGH * reach)
    const sinHip = Math.sqrt(Math.max(0, 1 - cosHip * cosHip))
    bend.copy(forward).addScaledVector(direction, -forward.dot(direction))
    if (bend.lengthSq() < 1e-6) bend.set(0, 0, 1)
    bend.normalize()
    knee
      .copy(from)
      .addScaledVector(direction, THIGH * cosHip)
      .addScaledVector(bend, THIGH * sinHip)
    // Re-derive the ankle from the solved knee so the shin keeps its length.
    ankle.subVectors(to, knee).setLength(SHIN).add(knee)
    aim(leg.thigh, from, knee)
    aim(leg.calf, knee, ankle)
    return ankle
  }

  /* ------------------------------ Gait --------------------------------- */
  /** Where a foot sits during the cycle, relative to the hips (local units). */
  function gaitFoot(phase: number, length: number, lift: number, out: FootPose) {
    const half = (STANCE * length) / 2
    if (phase < STANCE) {
      // Planted: slides back exactly as fast as the body travels forward.
      const p = phase / STANCE
      out.z = half - STANCE * length * p
      // Heel strike rolls flat, then the heel peels off before toe-off.
      const strike = Math.max(0, 1 - phase / 0.1)
      const peel = Math.max(0, (phase - (STANCE - 0.13)) / 0.13)
      out.pitch = -0.26 * strike * strike + 0.5 * peel * peel
      out.y = 0.045 * Math.sin(Math.max(0, -out.pitch)) + 0.09 * Math.sin(Math.max(0, out.pitch))
      return out
    }
    // Swing: a Hermite curve whose end speeds match the ground, so the foot
    // leaves and lands without a visible skid.
    const u = (phase - STANCE) / (1 - STANCE)
    const slope = -length * (1 - STANCE) * 0.55
    const u2 = u * u,
      u3 = u2 * u
    out.z =
      (2 * u3 - 3 * u2 + 1) * -half +
      (u3 - 2 * u2 + u) * slope +
      (-2 * u3 + 3 * u2) * half +
      (u3 - u2) * slope
    out.y = lift * Math.sin(Math.PI * Math.pow(u, 0.85)) ** 1.4
    out.pitch = 0.5 * (1 - u) ** 2 - 0.26 * u2
    return out
  }

  let previous = 0
  let phase = STANCE
  let walk = 0 // 0 idle … 1 walking, smoothed
  let pace = 0 // normalised speed, smoothed
  let blendIn = 1
  let settleTime = 1
  let settleOrder = [0, 1]
  let moving = false
  let accel = 0
  let lastSpeed = 0
  let lookYaw = 0,
    lookPitch = 0,
    lookTilt = 0
  let lookTarget = [0, 0, 0]
  let nextLook = 3
  let idleSince = 0
  let turnLook = 0
  let action: { kind: IdleAction; start: number; length: number } | null = null
  let nextAction = 4.5
  let lastAction: IdleAction | null = null
  const blink = blinker(random)
  const nod = spring(120, 10)
  const curlPitch = spring(90, 5)
  const curlRoll = spring(90, 5)
  const tailSwing = spring(45, 4.5)
  const tailRoll = spring(45, 4.5)
  const landing = spring(170, 12)
  let lastBob = 0
  let lastYaw = 0
  const gait: FootPose = { z: 0, y: 0, pitch: 0 }

  function settle() {
    moving = false
    walk = 0
    pace = 0
    blendIn = 1
    settleTime = 10
    accel = 0
    lastSpeed = 0
    phase = STANCE
    action = null
    for (const leg of legs) {
      leg.pose.z = leg.pose.y = leg.pose.pitch = 0
      leg.planted = true
    }
    for (const s of [landing, nod, curlPitch, curlRoll, tailSwing, tailRoll]) s.reset()
    lastYaw = group.rotation.y
  }

  const animate: IslandCharacter['animate'] = (time, reduced, move) => {
    const dt = Math.min(0.1, Math.max(0, time - previous))
    previous = time
    const scale = group.scale.x || 1
    const speed = move?.speed ?? 0
    const travelled = (move?.distance ?? 0) / scale
    const nowMoving = travelled > 1e-5 && speed > 0.08

    if (nowMoving && !moving) {
      // Begin with a foot already peeling off, and blend from wherever the
      // feet stand so starting never pops.
      for (const leg of legs) Object.assign(leg.from, leg.pose)
      phase = STANCE - 0.02
      blendIn = 0
      action = null
    } else if (!nowMoving && moving) {
      // Stopping: plant the furthest foot last with two small settling steps.
      for (const leg of legs) Object.assign(leg.from, leg.pose)
      settleTime = 0
      settleOrder =
        Math.abs(legs[0].pose.z) + legs[0].pose.y > Math.abs(legs[1].pose.z) + legs[1].pose.y
          ? [0, 1]
          : [1, 0]
      if (!reduced) {
        landing.kick(-0.4 * pace)
        nod.kick(1.6 * pace)
      }
    }
    moving = nowMoving

    walk = damp(walk, moving ? 1 : 0, moving ? 9 : 6, dt)
    pace = damp(pace, clamp(speed / TOP_SPEED, 0, 1.2), 10, dt)
    accel = damp(accel, dt > 0 ? (speed - lastSpeed) / dt : 0, 8, dt)
    lastSpeed = speed
    const s = reduced ? Math.min(pace, 1) * 0.8 : pace
    const length = CYCLE * (0.7 + 0.3 * Math.min(1, pace))
    const lift = (0.065 + 0.05 * Math.min(1, pace)) * (reduced ? 0.7 : 1)
    const yawRate = dt > 0 ? angleDelta(lastYaw, group.rotation.y) / dt : 0
    lastYaw = group.rotation.y

    /* ---- Idle actions: little bits of personality when standing still ---- */
    if (moving || reduced) {
      idleSince = time
      nextAction = time + 6 + random() * 4
      action = null
    } else if (!action && time > nextAction) {
      const options: IdleAction[] = (['sway', 'stretch', 'tap'] as IdleAction[]).filter(
        (kind) => kind !== lastAction,
      )
      const kind = options[Math.floor(random() * options.length)]
      action = { kind, start: time, length: kind === 'stretch' ? 2.6 : kind === 'sway' ? 2.6 : 2.2 }
      lastAction = kind
    }
    let act = 0,
      actT = 0
    if (action) {
      actT = time - action.start
      if (actT >= action.length) {
        action = null
        nextAction = time + 5 + random() * 4
      } else act = ease(clamp(actT / 0.35, 0, 1)) * ease(clamp((action.length - actT) / 0.45, 0, 1))
    }
    const swaying = action?.kind === 'sway' ? act : 0
    const stretching = action?.kind === 'stretch' ? act : 0
    const tapping = action?.kind === 'tap' ? act : 0

    /* ---- Feet ---- */
    if (moving) {
      const before = phase
      phase = (phase + travelled / length) % 1
      blendIn = Math.min(1, blendIn + dt / 0.14)
      const k = ease(blendIn)
      legs.forEach((leg, index) => {
        const footPhase = (phase + index * 0.5) % 1
        gaitFoot(footPhase, length, lift, gait)
        leg.pose.z = lerp(leg.from.z, gait.z, k)
        leg.pose.y = lerp(leg.from.y, gait.y, k)
        leg.pose.pitch = lerp(leg.from.pitch, gait.pitch, k)
        // Footfall: the phase just wrapped past heel strike.
        const prior = (before + index * 0.5) % 1
        const landed = footPhase < STANCE && prior > footPhase
        if (landed && leg.planted === false) {
          if (move?.dust && !reduced && pace > 0.45) kickDust(leg.shoe, 0.7 + 0.5 * pace)
          if (!reduced) landing.kick(-0.09 * pace)
        }
        leg.planted = footPhase < STANCE
      })
    } else {
      settleTime += dt
      settleOrder.forEach((index, order) => {
        const leg = legs[index]
        const t = clamp((settleTime - order * 0.12) / 0.17, 0, 1)
        const k = ease(t)
        const reach = Math.abs(leg.from.z) + leg.from.y
        const arc = reach > 0.02 ? Math.min(0.055, 0.25 * reach + 0.015) : 0
        leg.pose.z = lerp(leg.from.z, 0, k)
        leg.pose.y = lerp(leg.from.y, 0, k) + arc * Math.sin(Math.PI * t)
        leg.pose.pitch = lerp(leg.from.pitch, 0, k) - arc * Math.sin(Math.PI * t)
        leg.planted = true
      })
      // Tip-toes while stretching; a cheerful toe-tap otherwise.
      if (stretching) for (const leg of legs) {
        leg.pose.pitch += 0.42 * stretching
        leg.pose.y += 0.09 * Math.sin(0.42 * stretching)
      }
      if (tapping) {
        const beat = Math.max(0, Math.sin(actT * TAU * 2.4))
        legs[1].pose.pitch -= 0.38 * beat * tapping
        legs[1].pose.y += 0.04 * Math.sin(0.38 * beat * tapping)
      }
    }

    /* ---- Body rhythm: a springy, bouncy trot ---- */
    const w = walk
    const cycle = phase * TAU
    const bob = reduced ? 0 : -Math.cos(2 * (cycle - 0.03 * TAU)) * 0.022 * s * w
    const bobVelocity = dt > 0 ? (bob - lastBob) / dt : 0
    lastBob = bob
    const weightSide = Math.sin(cycle - 0.04 * TAU)
    const idle = 1 - w
    const breathe = reduced ? 0 : Math.sin(time * 2.1)
    const shift = reduced ? 0 : Math.sin(time * 0.55) * idle
    const turn = clamp(move?.turn ?? 0, -1.4, 1.4)
    turnLook = damp(turnLook, moving ? turn : 0, 8, dt)
    const dance = Math.sin(actT * TAU * 1.15) * swaying

    pelvis.position.x = reduced ? 0 : -0.02 * s * w * weightSide + 0.012 * shift + 0.03 * dance
    pelvis.rotation.set(
      0.03 * s * w,
      reduced ? 0 : 0.14 * s * w * Math.cos(cycle),
      reduced ? 0 : 0.06 * s * w * weightSide - 0.08 * turnLook * s + 0.018 * shift + 0.09 * dance,
    )
    const lean = reduced
      ? 0.03 * w
      : 0.08 * s * w + clamp(accel * 0.018, -0.1, 0.12) - 0.16 * stretching
    chest.rotation.set(
      lean + 0.012 * breathe * idle,
      -pelvis.rotation.y * 1.35,
      -pelvis.rotation.z * 0.45,
    )
    const squash = landing.step(0, dt)
    chest.scale.set(
      1 + 0.012 * breathe * idle - squash * 0.5,
      1 + 0.018 * breathe * idle + squash * 1.1 + 0.05 * stretching,
      1 + 0.014 * breathe * idle - squash * 0.5,
    )

    /* ---- Pelvis height: settle into whichever leg needs it most ---- */
    let height = PELVIS_Y + bob + squash * 0.35
    legs.forEach((leg) => {
      const hx = leg.side * HIP_X + pelvis.position.x
      const dx = leg.side * FOOT_X - hx
      const dz = leg.pose.z
      const allowed = Math.sqrt(Math.max(0, (LEG * 0.985) ** 2 - dx * dx - dz * dz))
      height = Math.min(height, ANKLE_Y + leg.pose.y + allowed + 0.02)
    })
    pelvis.position.y = height
    pelvis.updateMatrix()

    legs.forEach((leg) => {
      hip.set(leg.side * HIP_X, -0.02, 0).applyMatrix4(pelvis.matrix)
      ankle.set(leg.side * FOOT_X, ANKLE_Y + leg.pose.y, leg.pose.z)
      const solved = solveLeg(leg, hip, ankle)
      leg.shoe.position.copy(solved)
      leg.shoe.rotation.set(leg.pose.pitch, leg.side * 0.08, 0)
    })

    /* ---- Arms: counter-swing with follow-through ---- */
    arms.forEach(({ side, shoulder, elbow }, index) => {
      const swing = Math.cos(cycle - 0.07 * TAU + (index ? Math.PI : 0))
      const amount = (reduced ? 0.35 : 0.72) * Math.min(1, s) * w
      const forwardness = Math.max(0, -swing)
      const rest = side * (0.28 + 0.06 * s * w + 0.025 * idle * (breathe + 1))
      const wave = swaying * (0.35 + 0.25 * Math.sin(actT * TAU * 1.15 + index * Math.PI))
      shoulder.rotation.set(
        lerp(swing * amount + 0.02 * idle * breathe, -2.75, stretching),
        0,
        rest + side * (wave + 0.12 * stretching) + (reduced ? 0 : 0.03 * shift * side),
      )
      elbow.rotation.x = lerp(-0.22 - 0.6 * forwardness * amount - 0.12 * w, -0.15, stretching)
    })

    /* ---- Head: stabilises, anticipates turns, looks around when idle ---- */
    if (moving) {
      nextLook = time + 1.5 + random() * 1.5
      lookTarget = [0, 0, 0]
    } else if (!reduced && time > nextLook) {
      const quiet = time - idleSince
      const roll = random()
      lookTarget =
        roll < 0.3
          ? [0, 0, 0]
          : [
              (random() - 0.5) * 1.2,
              (random() - 0.6) * 0.3,
              quiet > 5 && roll > 0.75 ? (random() - 0.5) * 0.45 : 0,
            ]
      nextLook = time + 2.2 + random() * 3.2
    }
    const busy = Math.max(swaying, stretching)
    lookYaw = damp(lookYaw, reduced ? 0 : lookTarget[0] * idle * (1 - busy) + turnLook * 0.45, 5, dt)
    lookPitch = damp(lookPitch, lookTarget[1] * idle * (1 - busy) - 0.32 * stretching, 5, dt)
    lookTilt = damp(lookTilt, lookTarget[2] * idle * (1 - busy) - 0.2 * dance, 6, dt)
    const nodding = reduced ? 0 : nod.step(clamp(-bobVelocity * 0.35, -0.3, 0.3), dt)
    const tapNod = tapping * 0.07 * Math.sin(actT * TAU * 2.4)
    head.rotation.set(
      lookPitch - lean * 0.55 + nodding + tapNod,
      lookYaw - chest.rotation.y - pelvis.rotation.y,
      lookTilt - pelvis.rotation.z * 0.6 + (reduced ? 0 : Math.sin(time * 1.7) * 0.015 * idle),
    )

    /* ---- Face ---- */
    const happy = busy > 0.45
    eyes.visible = !happy
    happyEyes.visible = happy
    eyes.scale.y = reduced ? 1 : blink(time)
    mouthOpen.visible = happy || (stretching > 0.6 && actT > 0.6)
    smile.visible = !mouthOpen.visible
    brows.position.y = H + 0.012 * busy + Math.abs(lookTilt) * 0.02

    /* ---- Secondary motion: cowlick and scarf tail trail behind ---- */
    if (reduced) {
      cowlick.rotation.set(0, 0, 0)
      scarfTail.rotation.set(0.1 * s * w, 0, 0)
    } else {
      cowlick.rotation.x = curlPitch.step(clamp(-bobVelocity * 0.9 + lean * 0.6 - accel * 0.02, -0.5, 0.5), dt)
      cowlick.rotation.z = curlRoll.step(clamp(-yawRate * 0.05 - 0.3 * dance, -0.5, 0.5), dt)
      const flutter = Math.sin(time * 13) * 0.12 * s * w
      scarfTail.rotation.x = 0.08 + tailSwing.step(clamp(0.9 * s * w + accel * 0.03 - bobVelocity * 0.4, -0.3, 1.2), dt) + flutter
      scarfTail.rotation.z = tailRoll.step(clamp(yawRate * 0.08 - pelvis.rotation.z * 2, -0.6, 0.6), dt)
    }

    /* ---- Contact shadow ---- */
    const air = (pelvis.position.y - PELVIS_Y) * 3
    shadow.scale.set(1 - air, 0.85 * (1 - air), 1)
    shadow.position.x = pelvis.position.x * 0.5

    updateDust(dt)
  }
  animate(0, false)
  return { group, effects, animate, settle }
}

/* -------------------------------------------------------------------------- */
/* Pip, the welcoming penguin with his little captain's cap.                  */

export function createGuide(): IslandCharacter {
  const group = new THREE.Group()
  const bird = joint(group)
  const material = clay()
  const random = chance(23)
  const navy = '#3f6690'
  const cream = '#fff4df'
  const orange = '#f4a246'

  const body = sculpt(material)
  body.oval(navy, [0, 0.3, -0.01], [0.25, 0.29, 0.235])
  body.oval(cream, [0, 0.27, 0.075], [0.198, 0.235, 0.18])
  body.oval('#5a83ad', [0, 0.06, -0.19], [0.09, 0.05, 0.08], [0.6, 0, 0])
  // Red neckerchief with a knot.
  body.ring('#e65b4c', [0, 0.47, 0.005], 0.14, 0.038, 0.95)
  body.oval('#f07263', [0.04, 0.43, 0.165], [0.045, 0.06, 0.02], [0.2, 0, -0.5])
  body.oval('#f07263', [-0.035, 0.425, 0.163], [0.04, 0.055, 0.02], [0.2, 0, 0.6])
  body.mesh(bird)

  const feet = [-1, 1].map((side) => {
    const foot = sculpt(material)
    foot.oval(orange, [0, 0.022, 0.05], [0.07, 0.028, 0.1])
    for (const dx of [-0.035, 0, 0.035]) foot.oval('#f7b766', [dx, 0.024, 0.13], [0.02, 0.02, 0.03])
    return foot.mesh(group, [side * 0.085, 0, 0])
  })

  // The head pivots at the neckerchief so nods and tilts read clearly.
  const head = joint(bird, 0, 0.47, 0.01)
  const face = sculpt(material)
  face.oval(navy, [0, 0.13, 0], [0.225, 0.2, 0.205])
  for (const side of [-1, 1]) {
    face.oval(cream, [side * 0.065, 0.11, 0.085], [0.11, 0.12, 0.12])
    face.oval('#f7a3a0', [side * 0.135, 0.06, 0.155], [0.035, 0.02, 0.01], [0, side * 0.6, 0])
  }
  face.turned(
    orange,
    [0, 0.075, 0.2],
    [
      [0.05, 0],
      [0.042, 0.03],
      [0.008, 0.075],
      [0, 0.076],
    ],
    0.62,
    [Math.PI * 0.5, 0, 0],
  )
  face.mesh(head)
  const eyeShapes = sculpt(material)
  for (const side of [-1, 1]) {
    eyeShapes.oval(ink, [side * 0.07, 0, 0.19], [0.026, 0.034, 0.014], [0, side * 0.35, 0])
    eyeShapes.oval('#ffffff', [side * 0.07 - 0.009, 0.012, 0.202], [0.008, 0.01, 0.004])
  }
  const eyes = eyeShapes.mesh(head, [0, 0.135, 0])
  const happyShapes = sculpt(material)
  for (const side of [-1, 1])
    for (const half of [-1, 1])
      happyShapes.oval(ink, [side * 0.07 + half * 0.013, 0.003, 0.2], [0.018, 0.006, 0.006], [0, side * 0.35, -half * 0.6])
  const happyEyes = happyShapes.mesh(head, [0, 0.135, 0])
  happyEyes.visible = false

  // Captain's cap: white crown, navy band, glossy peak and a golden badge.
  const cap = joint(head, 0, 0.3, -0.01)
  const capShapes = sculpt(material)
  capShapes.turned(
    '#fffaf0',
    [0, 0, 0],
    [
      [0, 0],
      [0.15, 0],
      [0.168, 0.045],
      [0.165, 0.085],
      [0.1, 0.105],
      [0, 0.105],
    ],
    1,
  )
  capShapes.ring('#2f4a6e', [0, 0.02, 0], 0.152, 0.024)
  capShapes.oval('#263d5c', [0, 0.008, 0.13], [0.11, 0.016, 0.075], [0.15, 0, 0])
  capShapes.oval('#f4c95d', [0, 0.045, 0.165], [0.022, 0.022, 0.01])
  capShapes.mesh(cap)
  cap.rotation.set(-0.12, 0, 0.12)

  const wings = [-1, 1].map((side) => {
    const pivot = joint(bird, side * 0.225, 0.43, 0)
    const wing = sculpt(material)
    wing.oval(navy, [side * 0.02, -0.11, 0], [0.05, 0.135, 0.1], [0, 0, side * 0.12])
    wing.oval('#5a83ad', [side * 0.035, -0.17, 0.01], [0.03, 0.06, 0.07], [0, 0, side * 0.12])
    wing.mesh(pivot)
    return pivot
  })
  const shadow = blobShadow(0.29)
  group.add(shadow)
  group.name = 'guide'

  let previous = 0
  let home: number | null = null
  let yaw = 0
  let headYaw = 0,
    headTilt = 0,
    headPitch = 0
  let greet = 1 // 0 → 1 over a greeting; ≥1 means idle
  let near = false
  let flutter = 1
  let nextFlutter = 4
  let spin = 1
  let nextSpin = 16
  let tilt = 0
  let gazeOffset = 0
  let nextTilt = 2.5
  const blink = blinker(random)
  const capBounce = spring(160, 8)
  const toPlayer = new THREE.Vector3()

  return {
    group,
    settle() {},
    animate(time, reduced, _move, attention) {
      const dt = Math.min(0.1, Math.max(0, time - previous))
      previous = time
      if (home === null) home = yaw = group.rotation.y

      // Face the visitor when they come close, otherwise watch the pier.
      let bodyTarget = home
      let lookTarget = gazeOffset
      let distance = Infinity
      if (attention) {
        toPlayer.subVectors(attention, group.position)
        distance = Math.hypot(toPlayer.x, toPlayer.z)
        if (distance < 4.6) {
          const bearing = Math.atan2(toPlayer.x, toPlayer.z)
          const offset = angleDelta(home, bearing)
          bodyTarget = home + clamp(offset, -1.3, 1.3)
          lookTarget = clamp(angleDelta(yaw, bearing), -0.8, 0.8)
        }
      }
      const close = distance < 2.6
      if (close && !near && !reduced) greet = 0
      near = close

      if (!reduced && time > nextTilt) {
        tilt = random() < 0.5 ? 0 : (random() - 0.5) * 0.5
        gazeOffset = random() < 0.4 ? (random() - 0.5) * 1.4 : 0
        nextTilt = time + 2 + random() * 3
      }
      if (!reduced && time > nextFlutter && greet >= 1) {
        flutter = 0
        nextFlutter = time + 5 + random() * 6
      }
      // Now and then, when nobody is around, a happy little twirl.
      if (!reduced && !near && time > nextSpin && greet >= 1 && flutter >= 1) {
        spin = 0
        nextSpin = time + 14 + random() * 10
      }
      greet = Math.min(1, greet + dt / 1.8)
      flutter = Math.min(1, flutter + dt / 0.7)
      spin = Math.min(1, spin + dt / 1.1)

      yaw += angleDelta(yaw, bodyTarget) * (1 - Math.exp(-dt * (reduced ? 20 : 3)))
      group.rotation.y = yaw + (spin < 1 ? ease(spin) * TAU : 0)

      // Greeting: two happy hops, then a flipper wave.
      const hopping = greet < 0.55 ? greet / 0.55 : 1
      const hop =
        (hopping < 1 ? Math.abs(Math.sin(hopping * Math.PI * 2)) * (1 - hopping * 0.5) : 0) +
        (spin < 1 ? Math.sin(spin * Math.PI) * 0.8 : 0)
      const waving = greet < 1 ? Math.sin(clamp((greet - 0.2) / 0.8, 0, 1) * Math.PI) : 0
      const flap = flutter < 1 ? Math.sin(flutter * Math.PI * 6) * (1 - flutter) : 0
      const breathe = reduced ? 0 : Math.sin(time * 2.1)
      // An idle waddle: rock from foot to foot.
      const rock = reduced ? 0 : Math.sin(time * 2.4) * (near ? 0.035 : 0.055)
      bird.position.y = reduced ? 0 : hop * 0.17 + breathe * 0.006
      const squash = reduced ? 1 : 1 + breathe * 0.015 - hop * 0.07
      bird.scale.set(2 - squash, squash, 2 - squash)
      bird.rotation.z = rock
      feet.forEach((foot, i) => {
        foot.position.y = Math.max(0, (i ? -1 : 1) * rock) * 0.35 + hop * 0.1
        foot.rotation.x = -hop * 0.4
      })
      wings[0].rotation.z = -0.12 - 0.6 * Math.max(0, flap) - 0.04 * breathe - 0.25 * hop
      wings[1].rotation.z =
        0.12 + 0.6 * Math.max(0, flap) + 0.04 * breathe + 0.25 * hop + waving * (2.2 + 0.35 * Math.sin(time * 14))

      headYaw = damp(headYaw, reduced ? 0 : lookTarget, 6, dt)
      headTilt = damp(headTilt, reduced ? 0 : near ? 0.2 : tilt, 4, dt)
      headPitch = damp(headPitch, reduced ? 0 : near ? -0.1 : 0.03 * Math.sin(time * 0.9), 4, dt)
      head.rotation.set(headPitch - hop * 0.15, headYaw, headTilt - rock * 0.6)
      cap.rotation.x = -0.12 + (reduced ? 0 : capBounce.step(clamp(-hop * 0.5, -0.4, 0), dt))
      const happy = !reduced && (greet < 1 || spin < 1)
      eyes.visible = !happy
      happyEyes.visible = happy
      eyes.scale.y = reduced ? 1 : blink(time)
      shadow.scale.setScalar(1 - hop * 0.5)
    },
  }
}
