import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

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
  return new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.86 })
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

const skin = '#edb287'
const hair = '#62412f'
const jacket = '#399489'
const cuff = '#72b7a3'
const pants = '#3e556d'
const boots = '#9b6442'
const ink = '#42332e'

/* ------------------------------------------------------------------------ */
/* Rig dimensions, in the character's local units (the engine scales ×1.33). */
const THIGH = 0.21
const SHIN = 0.21
const LEG = THIGH + SHIN
const HIP_X = 0.088
const FOOT_X = 0.105
const ANKLE_Y = 0.09
const PELVIS_Y = 0.48
const UPPER_ARM = 0.125
const FOREARM = 0.11
/** Distance (local) covered by one full gait cycle, i.e. two steps, at top speed. */
const CYCLE = 0.84
/** Fraction of the cycle each foot spends on the ground; the rest is the swing. */
const STANCE = 0.58
const TOP_SPEED = 3

interface FootPose {
  z: number
  y: number
  pitch: number
}

export function createVisitor(): IslandCharacter {
  const group = new THREE.Group()
  const material = clay()
  const random = chance(7)

  /* ----------------------------- Skeleton ------------------------------ */
  const pelvis = joint(group, 0, PELVIS_Y, 0)
  const chest = joint(pelvis, 0, 0.06, 0)
  const neck = joint(chest, 0, 0.29, 0.005)
  const head = joint(neck)
  const hatPivot = joint(head, 0, 0.27 + 0.19, -0.01)

  /* ----------------------------- Hips ---------------------------------- */
  const hips = sculpt(material)
  hips.oval(pants, [0, 0.015, 0], [0.165, 0.115, 0.14])
  hips.oval('#c48a52', [0, 0.085, 0], [0.172, 0.026, 0.146])
  hips.oval('#f2cf86', [0, 0.085, 0.142], [0.024, 0.022, 0.01])
  hips.mesh(pelvis)

  /* ----------------------------- Torso --------------------------------- */
  const torso = sculpt(material)
  torso.turned(
    jacket,
    [0, 0, 0],
    [
      [0, 0],
      [0.186, 0.012],
      [0.194, 0.07],
      [0.198, 0.2],
      [0.176, 0.262],
      [0.09, 0.288],
      [0, 0.288],
    ],
    0.82,
  )
  // Collar, lapels and buttons.
  torso.oval('#f6d9a3', [0, 0.25, 0.122], [0.085, 0.06, 0.037])
  torso.oval('#438779', [-0.063, 0.25, 0.146], [0.08, 0.036, 0.023], [0, 0, -0.45])
  torso.oval('#438779', [0.063, 0.25, 0.146], [0.08, 0.036, 0.023], [0, 0, 0.45])
  for (const y of [0.08, 0.15, 0.205])
    torso.oval('#f5d597', [0, y, 0.162], [0.012, 0.012, 0.009])
  // A little explorer's satchel on the back with its straps.
  torso.oval('#d9805b', [0, 0.16, -0.156], [0.165, 0.18, 0.096])
  torso.oval('#eea078', [0, 0.235, -0.2], [0.154, 0.08, 0.066])
  torso.oval('#ffe1aa', [0, 0.19, -0.262], [0.028, 0.029, 0.012])
  for (const side of [-1, 1])
    torso.oval(
      '#e5a177',
      [side * 0.133, 0.19, 0.1],
      [0.024, 0.108, 0.036],
      [0.08, 0, side * 0.13],
    )
  // Neck stub so the head never seems to float when it nods.
  torso.oval(skin, [0, 0.29, 0.005], [0.07, 0.045, 0.065])
  torso.mesh(chest)

  /* ------------------------------ Head --------------------------------- */
  const face = sculpt(material)
  face.oval(skin, [0, 0, 0], [0.283, 0.278, 0.248])
  face.oval(hair, [0, 0.078, -0.058], [0.287, 0.244, 0.229])
  face.oval(skin, [0, -0.027, 0.054], [0.264, 0.225, 0.211])
  face.oval(skin, [0, -0.041, 0.262], [0.042, 0.035, 0.037])
  for (const side of [-1, 1]) {
    face.oval(skin, [side * 0.265, -0.015, -0.002], [0.052, 0.073, 0.044])
    face.oval('#df947c', [side * 0.274, -0.018, 0.026], [0.026, 0.039, 0.012])
    face.oval(hair, [side * 0.246, 0.071, 0.035], [0.04, 0.1, 0.074])
    face.oval(
      '#e79b82',
      [side * 0.171, -0.073, 0.206],
      [0.046, 0.021, 0.013],
      [0, side * 0.49, side * 0.08],
    )
  }
  for (const [x, y, angle] of [
    [-0.15, 0.144, -0.4],
    [-0.049, 0.158, -0.72],
    [0.073, 0.168, -0.65],
  ]) {
    face.oval(hair, [x, y, 0.185], [0.079, 0.099, 0.04], [0, 0, angle])
  }
  face.mesh(head, [0, 0.27, 0])

  // Brows and mouth live on their own mesh so the expression can change.
  const expression = sculpt(material)
  for (const side of [-1, 1])
    expression.oval(
      hair,
      [side * 0.108, 0.077, 0.228],
      [0.05, 0.013, 0.01],
      [0, side * 0.32, -side * 0.12],
    )
  // A soft little smile: two short strokes meeting in a shallow "u".
  for (const side of [-1, 1])
    expression.oval(
      '#ae7159',
      [side * 0.018, -0.094, 0.251],
      [0.024, 0.008, 0.008],
      [0, side * 0.1, side * 0.32],
    )
  const brows = expression.mesh(head, [0, 0.27, 0])

  const eyes = sculpt(material)
  for (const side of [-1, 1]) {
    eyes.oval(ink, [side * 0.105, 0, 0.245], [0.025, 0.035, 0.014], [0, side * 0.28, 0])
    eyes.oval('#fff4de', [side * 0.105 - 0.006, 0.011, 0.259], [0.006, 0.008, 0.003])
  }
  const gaze = eyes.mesh(head, [0, 0.27 + 0.021, 0])

  // A broad brim and a tapered crown make the explorer readable from above.
  const hat = sculpt(material)
  hat.turned(
    '#e2b96c',
    [0, 0.002, 0],
    [
      [0, -0.016],
      [0.287, -0.016],
      [0.382, -0.031],
      [0.4, -0.023],
      [0.393, -0.004],
      [0.29, 0.03],
      [0.275, 0.092],
      [0.229, 0.199],
      [0.169, 0.23],
      [0.04, 0.232],
      [0, 0.226],
    ],
    0.9,
    [-0.065, 0, -0.055],
  )
  hat.turned(
    '#c57b4c',
    [0, 0.002, 0],
    [
      [0.286, 0.032],
      [0.279, 0.076],
      [0.273, 0.093],
    ],
    0.907,
    [-0.065, 0, -0.055],
  )
  hat.oval('#6a9765', [0.259, 0.096, 0.052], [0.028, 0.09, 0.018], [0.24, 0, -0.54])
  hat.mesh(hatPivot)

  /* ------------------------------ Arms --------------------------------- */
  const arms = [-1, 1].map((side) => {
    const shoulder = joint(chest, side * 0.168, 0.232, 0.004)
    const upper = sculpt(material)
    upper.oval(jacket, [0, -0.005, 0], [0.068, 0.07, 0.07])
    upper.limb(jacket, 0.054, UPPER_ARM - 0.02)
    upper.oval(cuff, [0, -UPPER_ARM + 0.012, 0], [0.058, 0.03, 0.058])
    upper.mesh(shoulder)
    const elbow = joint(shoulder, 0, -UPPER_ARM, 0)
    const lower = sculpt(material)
    lower.limb(skin, 0.042, FOREARM - 0.03)
    // A soft mitten hand with a little thumb, chibi style.
    lower.oval(skin, [0, -FOREARM, 0.006], [0.057, 0.062, 0.052])
    lower.oval(skin, [-side * 0.02, -FOREARM + 0.012, 0.042], [0.022, 0.03, 0.022], [0.4, 0, 0])
    lower.mesh(elbow)
    return { side, shoulder, elbow }
  })

  /* ------------------------------ Legs --------------------------------- */
  const legs = [-1, 1].map((side) => {
    const thigh = sculpt(material)
    thigh.limb(pants, 0.074, THIGH)
    const calf = sculpt(material)
    calf.limb('#fff0cb', 0.06, SHIN - 0.02, [0, 0.01, 0])
    calf.oval('#d39a5c', [0, -0.07, 0], [0.064, 0.022, 0.064])
    const shoe = sculpt(material)
    shoe.oval(boots, [0, -0.016, 0.052], [0.107, 0.077, 0.165])
    shoe.oval('#4d382f', [0, -0.063, 0.05], [0.112, 0.03, 0.164])
    shoe.oval('#d79158', [0, 0.026, 0.093], [0.084, 0.055, 0.104])
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

  const shadow = blobShadow(0.33)
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
        color: '#f3e6c9',
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
      out.y = 0.05 * Math.sin(Math.max(0, -out.pitch)) + 0.1 * Math.sin(Math.max(0, out.pitch))
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
  const blink = blinker(random)
  const hatPitch = spring(140, 9)
  const hatRoll = spring(140, 9)
  const landing = spring(170, 13)
  let lastBob = 0
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
    for (const leg of legs) {
      leg.pose.z = leg.pose.y = leg.pose.pitch = 0
      leg.planted = true
    }
    landing.reset()
    hatPitch.reset()
    hatRoll.reset()
  }

  const animate: IslandCharacter['animate'] = (time, reduced, move) => {
    const dt = Math.min(0.1, Math.max(0, time - previous))
    previous = time
    const scale = group.scale.x || 1
    const speed = move?.speed ?? 0
    const travelled = (move?.distance ?? 0) / scale
    const nowMoving = travelled > 1e-5 && speed > 0.08

    if (nowMoving && !moving) {
      // Begin with the left foot already peeling off, and blend from wherever
      // the feet stand so starting never pops.
      for (const leg of legs) Object.assign(leg.from, leg.pose)
      phase = STANCE - 0.02
      blendIn = 0
    } else if (!nowMoving && moving) {
      // Stopping: plant the furthest foot last with two small settling steps.
      for (const leg of legs) Object.assign(leg.from, leg.pose)
      settleTime = 0
      settleOrder =
        Math.abs(legs[0].pose.z) + legs[0].pose.y > Math.abs(legs[1].pose.z) + legs[1].pose.y
          ? [0, 1]
          : [1, 0]
      if (!reduced) landing.kick(-0.35 * pace)
    }
    moving = nowMoving

    walk = damp(walk, moving ? 1 : 0, moving ? 9 : 6, dt)
    pace = damp(pace, clamp(speed / TOP_SPEED, 0, 1.2), 10, dt)
    accel = damp(accel, dt > 0 ? (speed - lastSpeed) / dt : 0, 8, dt)
    lastSpeed = speed
    const s = reduced ? Math.min(pace, 1) * 0.8 : pace
    const length = CYCLE * (0.7 + 0.3 * Math.min(1, pace))
    const lift = (0.07 + 0.05 * Math.min(1, pace)) * (reduced ? 0.7 : 1)

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
          if (!reduced) landing.kick(-0.05 * pace)
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
        const arc = reach > 0.02 ? Math.min(0.06, 0.25 * reach + 0.015) : 0
        leg.pose.z = lerp(leg.from.z, 0, k)
        leg.pose.y = lerp(leg.from.y, 0, k) + arc * Math.sin(Math.PI * t)
        leg.pose.pitch = lerp(leg.from.pitch, 0, k) - 0.25 * arc * Math.sin(Math.PI * t) * 4
        leg.planted = true
      })
    }

    /* ---- Body rhythm ---- */
    const w = walk
    const cycle = phase * TAU
    const bob = reduced ? 0 : -Math.cos(2 * (cycle - 0.03 * TAU)) * 0.016 * s * w
    const bobVelocity = dt > 0 ? (bob - lastBob) / dt : 0
    lastBob = bob
    const weightSide = Math.sin(cycle - 0.04 * TAU)
    const idle = 1 - w
    const breathe = reduced ? 0 : Math.sin(time * 2.1)
    const shift = reduced ? 0 : Math.sin(time * 0.55) * idle
    const turn = clamp(move?.turn ?? 0, -1.4, 1.4)
    turnLook = damp(turnLook, moving ? turn : 0, 8, dt)

    pelvis.position.x = reduced ? 0 : -0.018 * s * w * weightSide + 0.012 * shift
    pelvis.rotation.set(
      0.03 * s * w,
      reduced ? 0 : 0.13 * s * w * Math.cos(cycle),
      reduced ? 0 : 0.05 * s * w * weightSide - 0.07 * turnLook * s + 0.018 * shift,
    )
    const lean = reduced ? 0.03 * w : 0.07 * s * w + clamp(accel * 0.018, -0.1, 0.12)
    chest.rotation.set(
      lean + 0.012 * breathe * idle,
      -pelvis.rotation.y * 1.35,
      -pelvis.rotation.z * 0.45,
    )
    chest.scale.set(1 + 0.012 * breathe * idle, 1 + 0.018 * breathe * idle, 1 + 0.014 * breathe * idle)

    /* ---- Pelvis height: settle into whichever leg needs it most ---- */
    let height = PELVIS_Y + bob + landing.step(0, dt)
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
      const amount = (reduced ? 0.35 : 0.62) * Math.min(1, s) * w
      const forwardness = Math.max(0, -swing)
      shoulder.rotation.set(
        swing * amount + 0.05 * idle * breathe * 0.4,
        0,
        side * (0.3 + 0.05 * s * w + 0.025 * idle * (breathe + 1)) + (reduced ? 0 : 0.03 * shift * side),
      )
      elbow.rotation.x = -0.22 - 0.55 * forwardness * amount - 0.1 * w
    })

    /* ---- Head: stabilises, anticipates turns, looks around when idle ---- */
    if (moving) {
      idleSince = time
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
              quiet > 5 && roll > 0.8 ? (random() - 0.5) * 0.45 : 0,
            ]
      nextLook = time + 2.2 + random() * 3.2
    }
    lookYaw = damp(lookYaw, reduced ? 0 : lookTarget[0] * idle + turnLook * 0.45, 5, dt)
    lookPitch = damp(lookPitch, lookTarget[1] * idle, 5, dt)
    lookTilt = damp(lookTilt, lookTarget[2] * idle, 4, dt)
    head.rotation.set(
      lookPitch - lean * 0.6 + (reduced ? 0 : 0.035 * s * w * Math.cos(2 * cycle + 0.6)),
      lookYaw - chest.rotation.y - pelvis.rotation.y,
      lookTilt - pelvis.rotation.z * 0.6 + (reduced ? 0 : Math.sin(time * 1.7) * 0.015 * idle),
    )
    gaze.scale.y = reduced ? 1 : blink(time)
    brows.position.y = 0.27 + (lookTilt !== 0 ? Math.abs(lookTilt) * 0.025 : 0)

    /* ---- Secondary motion: hat bounces behind the head ---- */
    hatPivot.rotation.x = reduced ? 0 : hatPitch.step(clamp(bobVelocity * 0.5 - accel * 0.012, -0.2, 0.2), dt)
    hatPivot.rotation.z = reduced ? 0 : hatRoll.step(clamp(-turnLook * 0.1 * s, -0.12, 0.12), dt)

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
/* Pip, the welcoming bird.                                                    */

export function createGuide(): IslandCharacter {
  const group = new THREE.Group()
  const bird = joint(group)
  const material = clay()
  const random = chance(23)
  const body = sculpt(material)
  body.oval('#568897', [0, 0.33, -0.015], [0.241, 0.245, 0.232])
  body.oval('#fff0ca', [0, 0.32, 0.102], [0.196, 0.196, 0.174])
  for (const side of [-1, 1]) {
    body.oval('#bc7b46', [side * 0.101, 0.072, 0], [0.031, 0.06, 0.029])
    body.oval('#dca456', [side * 0.101, 0.031, 0.035], [0.061, 0.029, 0.09])
    body.oval('#426c7e', [side * 0.057, 0.302, -0.208], [0.054, 0.039, 0.151], [0.32, side * 0.31, 0])
  }
  // Scarf.
  body.turned(
    '#e48f62',
    [0, 0.434, 0.017],
    [
      [0.187, -0.018],
      [0.216, 0.005],
      [0.21, 0.04],
      [0.183, 0.052],
    ],
    1.04,
  )
  body.oval('#e99a6c', [-0.083, 0.406, 0.212], [0.052, 0.098, 0.018], [0.06, 0, -0.47])
  body.mesh(bird)

  // The head pivots at the scarf so nods and tilts read clearly.
  const neckY = 0.45
  const head = joint(bird, 0, neckY, 0.02)
  const face = sculpt(material)
  const at = (x: number, y: number, z: number): Vec3 => [x, y - neckY, z - 0.02]
  face.oval('#588b98', at(0, 0.59, 0.043), [0.242, 0.205, 0.226])
  face.oval('#f3dfac', at(0, 0.54, 0.145), [0.193, 0.126, 0.153])
  face.turned(
    '#dca456',
    at(0, 0.54, 0.267),
    [
      [0.066, 0],
      [0.056, 0.041],
      [0.009, 0.109],
      [0, 0.11],
    ],
    0.68,
    [Math.PI * 0.5, 0, 0],
  )
  for (const side of [-1, 1])
    face.oval('#cf936b', at(side * 0.168, 0.551, 0.207), [0.035, 0.017, 0.009], [0, side * 0.57, 0])
  face.oval('#568897', at(-0.019, 0.785, 0.029), [0.039, 0.088, 0.027], [0.29, 0, 0.4])
  face.oval('#79a6a0', at(0.029, 0.78, 0.043), [0.026, 0.063, 0.023], [0.32, 0, -0.35])
  face.mesh(head)
  const eyes = sculpt(material)
  for (const side of [-1, 1]) {
    eyes.oval(ink, [side * 0.096, 0, 0.254], [0.023, 0.029, 0.015], [0, side * 0.31, 0])
    eyes.oval('#fff6df', [side * 0.096 - 0.003, 0.009, 0.266], [0.006, 0.007, 0.004])
  }
  const gaze = eyes.mesh(head, at(0, 0.611, 0))

  const wings = [-1, 1].map((side) => {
    const wing = sculpt(material)
    wing.oval('#467887', [side * 0.013, -0.092, -0.04], [0.076, 0.137, 0.105], [0.39, 0, side * 0.08])
    wing.oval('#75a1a0', [side * 0.055, -0.086, -0.055], [0.037, 0.076, 0.091], [0.39, 0, side * 0.2])
    return wing.mesh(bird, [side * 0.19, 0.419, 0])
  })
  const shadow = blobShadow(0.27)
  group.add(shadow)
  group.name = 'guide'

  let previous = 0
  let home: number | null = null
  let yaw = 0
  let headYaw = 0,
    headTilt = 0,
    headPitch = 0
  let greet = 1 // seconds since the last greeting (≥1 means idle)
  let near = false
  let flutter = 1
  let nextFlutter = 4
  let tilt = 0
  let nextTilt = 2.5
  const blink = blinker(random)
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
      let lookTarget = 0
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
      yaw += angleDelta(yaw, bodyTarget) * (1 - Math.exp(-dt * (reduced ? 20 : 3)))
      group.rotation.y = yaw

      if (!reduced && time > nextTilt) {
        tilt = random() < 0.5 ? 0 : (random() - 0.5) * 0.5
        nextTilt = time + 2 + random() * 3
      }
      if (!reduced && time > nextFlutter && greet >= 1) {
        flutter = 0
        nextFlutter = time + 5 + random() * 6
      }
      greet = Math.min(1, greet + dt / 1.1)
      flutter = Math.min(1, flutter + dt / 0.7)

      // A greeting is two happy hops with waving wings.
      const hop = greet < 1 ? Math.abs(Math.sin(greet * Math.PI * 2)) * (1 - greet) : 0
      const flap =
        (greet < 1 ? Math.sin(greet * Math.PI * 10) * (1 - greet) : 0) +
        (flutter < 1 ? Math.sin(flutter * Math.PI * 6) * (1 - flutter) * 0.6 : 0)
      const breathe = reduced ? 0 : Math.sin(time * 2.1)
      bird.position.y = reduced ? 0 : hop * 0.16 + breathe * 0.006
      const squash = reduced ? 1 : 1 + breathe * 0.015 - hop * 0.06
      bird.scale.set(2 - squash, squash, 2 - squash)
      bird.rotation.z = reduced ? 0 : Math.sin(time * 0.8) * 0.025
      wings[0].rotation.z = -0.1 - 0.5 * Math.max(0, flap) - 0.03 * breathe
      wings[1].rotation.z = 0.1 + 0.5 * Math.max(0, flap) + 0.03 * breathe

      headYaw = damp(headYaw, reduced ? 0 : lookTarget, 6, dt)
      headTilt = damp(headTilt, reduced ? 0 : near ? 0.18 : tilt, 4, dt)
      headPitch = damp(headPitch, reduced ? 0 : near ? -0.08 : 0.03 * Math.sin(time * 0.9), 4, dt)
      head.rotation.set(headPitch - hop * 0.2, headYaw, headTilt)
      gaze.scale.y = reduced ? 1 : greet < 0.6 ? 0.35 : blink(time)
      shadow.scale.setScalar(1 - hop * 0.6)
    },
  }
}
