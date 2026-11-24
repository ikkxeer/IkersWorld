import { ruptureTime, transformationEnd, wideTime } from './transformation'
import { outfitDetails } from '../data/outfitDetails'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { cartoon } from './modelKit'
import { outfitById, type Outfit } from '../data/outfits'

/** What the engine measured this frame, in world units. */
export interface Locomotion {
  /** Distance actually travelled this frame (after collisions). */
  distance: number
  /** Smoothed ground speed in units per second. */
  speed: number
  /** Signed yaw (radians) still to turn before facing the travel direction. */
  turn: number
  /** Kick up little dust puffs on footfalls (outdoors only). */
  jumpHeight?: number
  powerTime?: number | null
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
  /** Sit down on (or get up from) a seat right behind the character. */
  sit?: (seated: boolean, seat?: Seat) => void
  /** Change into an outfit from the wardrobe (with a twirl unless instant). */
  wear?: (outfit: string, instant?: boolean) => void
  /** Float a little emote bubble above the head. */
  emote?: (kind: Emote) => void
  /** Rod handling for the fishing activity. */
  angler?: Angler
  /** Drift down under an umbrella (the arrival), or land and fold it away. */
  umbrella?: (open: boolean) => void
  /** A big, happy landing: squash, dust and a sparkle. */
  land?: () => void
  /** A friendly wave (the visitor) or a hello back (NPCs). */
  wave?: () => void
  trainingAnchors?: (face: THREE.Vector3, fists: THREE.Vector3) => void
  talk?: (speaking: boolean) => void
  /** Called on every footfall with the current pace (for footstep sounds). */
  onStep?: (listener: (strength: number) => void) => void
}

export interface Angler {
  /** Hold the rod out (true) or put it away (false). */
  hold: (value: boolean) => void
  /** Play the overhead cast. */
  cast: () => void
  /** A quick jerk of the rod when the fish is hooked. */
  tug: () => void
  /** Lift a fish proudly overhead (null puts it away). */
  show: (colors: [string, string] | null, scale?: number) => void
  /** World position of the rod tip, for the line. */
  tip: (out: THREE.Vector3) => THREE.Vector3
}

/** Where and how to sit: seat-top height above the floor (world units). */
export interface Seat {
  height: number
  /** 'fire' warms hands and hums; 'bench' relaxes and may doze off. */
  mode: 'fire' | 'bench'
}

export type Emote = 'note' | 'heart' | 'alert' | 'sparkle' | 'sleep'

/** Emote bubbles drawn once on a canvas and reused as sprites. */
const emoteTextures = new Map<Emote, THREE.Texture>()
function emoteTexture(kind: Emote) {
  let texture = emoteTextures.get(kind)
  if (texture) return texture
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 96
  const c = canvas.getContext('2d')
  const color = { note: '#5b8fd6', heart: '#ec6577', alert: '#f08a3c', sparkle: '#e9a92a', sleep: '#7f8fc9' }[kind]
  if (c) {
    c.fillStyle = '#fffaf0'
    c.strokeStyle = 'rgba(80,60,40,0.25)'
    c.lineWidth = 4
    c.beginPath()
    c.arc(48, 44, 34, 0, TAU)
    c.fill()
    c.stroke()
    c.beginPath()
    c.moveTo(40, 74)
    c.lineTo(48, 90)
    c.lineTo(58, 72)
    c.fill()
    c.fillStyle = color
    if (kind === 'heart') {
      c.beginPath()
      c.moveTo(48, 62)
      c.bezierCurveTo(20, 42, 30, 18, 48, 32)
      c.bezierCurveTo(66, 18, 76, 42, 48, 62)
      c.fill()
    } else if (kind === 'sparkle') {
      c.beginPath()
      for (let i = 0; i < 8; i++) {
        const r = i % 2 ? 9 : 24,
          a = (i / 8) * TAU - Math.PI / 2
        c.lineTo(48 + Math.cos(a) * r, 44 + Math.sin(a) * r)
      }
      c.fill()
    } else {
      c.font = '900 50px "Nunito Variable", Nunito, system-ui, sans-serif'
      c.textAlign = 'center'
      c.textBaseline = 'middle'
      c.fillText(kind === 'note' ? '♪' : kind === 'sleep' ? 'z' : '!', 48, 46)
    }
  }
  texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  emoteTextures.set(kind, texture)
  return texture
}

/** A small pool of bubbles that pop up, drift and fade above a character. */
function emotes(parent: THREE.Object3D, height: number) {
  const pool = Array.from({ length: 3 }, () => {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ transparent: true, depthWrite: false, depthTest: false }),
    )
    sprite.visible = false
    sprite.renderOrder = 10
    parent.add(sprite)
    return { sprite, age: 1, drift: 0 }
  })
  let next = 0
  return {
    show(kind: Emote) {
      const bubble = pool[next]
      next = (next + 1) % pool.length
      bubble.sprite.material.map = emoteTexture(kind)
      bubble.sprite.material.needsUpdate = true
      bubble.age = 0
      bubble.drift = (next - 1) * 0.08
      bubble.sprite.visible = true
    },
    update(dt: number) {
      for (const bubble of pool) {
        if (!bubble.sprite.visible) continue
        bubble.age += dt / 1.8
        if (bubble.age >= 1) {
          bubble.sprite.visible = false
          continue
        }
        const pop = bubble.age < 0.12 ? ease(bubble.age / 0.12) * 1.15 : 1 + 0.15 * (1 - Math.min(1, (bubble.age - 0.12) / 0.15))
        bubble.sprite.scale.setScalar(0.3 * Math.min(pop, 1.15))
        bubble.sprite.position.set(0.18 + bubble.drift + Math.sin(bubble.age * 6) * 0.02, height + bubble.age * 0.35, 0)
        bubble.sprite.material.opacity = 1 - Math.max(0, (bubble.age - 0.75) / 0.25)
      }
    },
  }
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
    /** Part of a surface of revolution: capes, coat tails, skirts. */
    shell(color: string, at: Vec3, profile: [number, number][], phiStart: number, phiLength: number, tilt: Vec3 = [0, 0, 0]) {
      add(
        new THREE.LatheGeometry(
          profile.map(([r, y]) => new THREE.Vector2(r, y)),
          24,
          phiStart,
          phiLength,
        ),
        color,
        at,
        [1, 1, 1],
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
const smoothstep01 = (t: number) => ease(clamp(t, 0, 1))

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
/* Skin tones shared by every outfit (see src/data/outfits.ts for clothes). */
const skin = '#f7cba4'
const skinShade = '#f0b28c'
const blush = '#f59a88'
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

type IdleAction = 'sway' | 'stretch' | 'tap' | 'hop' | 'twirl'

/** Seated pose: the seat is ~0.2 behind the feet, at log height. */
const SIT_FOOT = 0.07

export function createVisitor(initialOutfit?: string): IslandCharacter {
  const group = new THREE.Group()
  const material = clay()
  const celWeight = { value: 0 }
  const baseShader = material.onBeforeCompile
  const cacheKey = material.customProgramCacheKey
  material.onBeforeCompile = (shader, renderer) => {
    baseShader.call(material, shader, renderer)
    shader.uniforms.celWeight = celWeight
    shader.fragmentShader = 'uniform float celWeight;\n' + shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      `float keyLight = dot(normal, normalize(vec3(-.50, .74, .53)));
      vec3 inkShade = diffuseColor.rgb * mix(vec3(.29,.23,.43), vec3(1.19,1.08,.98), step(.08, keyLight));
      inkShade += diffuseColor.rgb * step(.76, keyLight) * .30;
      outgoingLight = mix(outgoingLight, inkShade + outgoingLight * .40, celWeight);
      #include <opaque_fragment>`,
    )
  }
  material.customProgramCacheKey = () => cacheKey.call(material) + '|training-cel'

  const random = chance(11)

  /* ----------------------------- Skeleton ------------------------------ */
  const pelvis = joint(group, 0, PELVIS_Y, 0)
  const chest = joint(pelvis, 0, 0.05, 0)
  const neck = joint(chest, 0, 0.245, 0.005)
  const head = joint(neck)
  const cowlick = joint(head, 0.03, HEAD + 0.27, -0.02)
  const scarfTail = joint(chest, -0.085, 0.235, -0.1)

  /* ------------------------------ Arms --------------------------------- */
  const arms = [-1, 1].map((side) => {
    const shoulder = joint(chest, side * 0.148, 0.2, 0.004)
    const elbow = joint(shoulder, 0, -UPPER_ARM, 0)
    return { side, shoulder, elbow }
  })

  const knuckles = arms.map(({ elbow }) => {
    const fist = sculpt(material)
    for (const x of [-.029, -.010, .010, .029]) {
      fist.oval(skin, [x, -FOREARM + .002, .027], [.016, .029, .032])
      fist.oval(skinShade, [x + .010, -FOREARM + .004, .049], [.003, .014, .005])
    }
    const mesh = fist.mesh(elbow)
    mesh.visible = false
    return mesh
  })

  /* --------------------------- Expressions ----------------------------- */
  // Separate meshes so the face can switch moods.
  const H = HEAD
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
  const smileShapes = sculpt(material)
  for (const side of [-1, 1])
    smileShapes.oval('#a3574b', [side * 0.017, -0.112, 0.268], [0.022, 0.008, 0.008], [0, side * 0.1, side * 0.36])
  const smile = smileShapes.mesh(head, [0, H, 0])
  const openShapes = sculpt(material)
  openShapes.oval('#8c3b3a', [0, -0.115, 0.262], [0.042, 0.034, 0.016])
  openShapes.oval('#ec7b77', [0, -0.13, 0.27], [0.026, 0.014, 0.01])
  const mouthOpen = openShapes.mesh(head, [0, H, 0])
  mouthOpen.visible = false

  /* ------------------------------ Legs --------------------------------- */
  const legs = [-1, 1].map((side) => ({
    side,
    thigh: new THREE.Mesh(),
    calf: new THREE.Mesh(),
    shoe: new THREE.Mesh(),
    pose: { z: 0, y: 0, pitch: 0 } as FootPose,
    from: { z: 0, y: 0, pitch: 0 } as FootPose,
    planted: true,
  }))

  /* ------------------------------ Outfit ------------------------------- */
  // Everything the wardrobe can change is rebuilt here on the same rig.
  let worn: THREE.Mesh[] = []
  let brows = new THREE.Mesh()
  /** The outfit chosen in the wardrobe (a power-up only borrows the hair). */
  let base: Outfit = outfitById(initialOutfit)
  function dress(o: Outfit) {
    for (const m of worn) {
      m.parent?.remove(m)
      m.geometry.dispose()
    }
    worn = []
    const wear = (shape: ReturnType<typeof sculpt>, parent: THREE.Object3D, at?: Vec3) => {
      const m = shape.mesh(parent, at)
      worn.push(m)
      return m
    }
    const { hair, hairLight, top, stripe, accent, bottom, bottomLight } = o
    const detailing = outfitDetails(o.id)
    const seam = new THREE.Color(top).lerp(new THREE.Color(detailing.cloth), 0.55).getStyle()
    const cuff = new THREE.Color(accent).lerp(new THREE.Color('#fff1d7'), 0.28).getStyle()

    // Lower body: shorts, dungarees, trousers, hakama or skirt.
    const hips = sculpt(material)
    hips.oval(bottom, [0, 0.03, 0], [0.158, 0.11, 0.135])
    hips.oval(bottomLight, [0, -0.01, -0.118], [0.06, 0.045, 0.02])
    // Skirts, gowns, robes, hakama and coat tails hang from the waist.
    const hem = o.hem ?? 'none'
    const hemColor = o.hemColor ?? bottom
    if (hem === 'skirt' || hem === 'gown' || hem === 'robe' || hem === 'hakama') {
      const drop = hem === 'skirt' ? 0.17 : hem === 'hakama' ? 0.25 : 0.27
      const flare = hem === 'skirt' ? 0.245 : hem === 'hakama' ? 0.22 : 0.27
      const profile: [number, number][] = [
        [0.165, 0.11],
        [0.18, 0.05],
        [flare * 0.92, 0.11 - drop * 0.6],
        [flare, 0.11 - drop],
        [flare - 0.02, 0.11 - drop - 0.012],
      ]
      // Lathe faces point outwards when the profile runs bottom to top.
      hips.turned(hemColor, [0, 0, 0], [...profile].reverse(), 0.95)
      // Inner lining so the hem never looks hollow from below.
      hips.turned(o.hemLining ?? bottomLight, [0, 0, 0], profile.map(([r, y]) => [r * 0.97, y + 0.004] as [number, number]), 0.95)
      if (hem === 'skirt' || hem === 'hakama')
        // Pleats.
        for (let k = 0; k < 10; k++) {
          const a = (k / 10) * TAU
          hips.oval(hem === 'skirt' ? bottomLight : bottom, [Math.sin(a) * flare * 0.9, 0.11 - drop * 0.62, Math.cos(a) * flare * 0.86], [0.012, drop * 0.36, 0.012], [Math.cos(a) * 0.35, 0, -Math.sin(a) * 0.35])
        }
      if (hem === 'gown')
        for (let k = 0; k < 12; k++) {
          const a = (k / 12) * TAU
          hips.oval(o.hemTrim ?? '#ffffff', [Math.sin(a) * flare * 0.98, 0.11 - drop + 0.005, Math.cos(a) * flare * 0.93], [0.04, 0.025, 0.04])
        }
    } else if (hem === 'coat') {
      // Two coat tails flaring behind the legs.
      hips.shell(hemColor, [0, 0, 0], [[0.245, -0.18], [0.24, -0.16], [0.2, 0.0], [0.165, 0.11]], Math.PI * 0.62, Math.PI * 0.76)
      hips.shell(o.hemLining ?? bottomLight, [0, 0, 0], [[0.158, 0.11], [0.193, 0.0], [0.232, -0.16], [0.238, -0.18]], Math.PI * 0.62, Math.PI * 0.76)
    }
    wear(hips, pelvis)

    // Torso.
    const torso = sculpt(material)
    torso.turned(
      top,
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
    if (stripe)
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
    if (o.bib) {
      // Dungaree bib, straps, brass buttons and a sunny star patch.
      torso.oval(bottom, [0, 0.07, 0.112], [0.115, 0.1, 0.048])
      torso.oval(bottom, [0, 0.03, 0], [0.172, 0.07, 0.15])
      for (const side of [-1, 1]) {
        torso.oval(bottom, [side * 0.078, 0.165, 0.12], [0.022, 0.07, 0.014], [0.2, 0, side * 0.12])
        torso.oval(bottom, [side * 0.078, 0.15, -0.122], [0.022, 0.085, 0.014], [-0.2, 0, side * 0.12])
        torso.oval('#f6cf63', [side * 0.07, 0.122, 0.152], [0.017, 0.017, 0.01])
      }
      torso.oval(bottomLight, [0, 0.06, 0.155], [0.05, 0.04, 0.008])
      torso.oval('#ffd56a', [0, 0.065, 0.161], [0.026, 0.026, 0.008])
      torso.oval('#ff9f7a', [0, 0.065, 0.166], [0.011, 0.011, 0.005])
    } else {
      // A waistband so tops of any colour sit neatly on the trousers.
      torso.ring(bottom, [0, 0.02, 0.004], 0.165, 0.03, 0.86)
    }
    if (o.collar === 'scarf') {
      torso.ring(accent, [0, 0.243, 0.004], 0.105, 0.045, 0.92)
      torso.oval(accent, [0.07, 0.225, 0.1], [0.05, 0.045, 0.04], [0, 0.4, 0])
    } else if (o.collar === 'sailor') {
      torso.oval('#27407a', [0, 0.235, -0.11], [0.15, 0.03, 0.11], [0.35, 0, 0])
      torso.oval('#fbfaf6', [0, 0.25, -0.105], [0.13, 0.012, 0.09], [0.35, 0, 0])
      for (const side of [-1, 1])
        torso.oval('#27407a', [side * 0.07, 0.2, 0.135], [0.05, 0.075, 0.015], [0.15, 0, side * 0.55])
      for (const side of [-1, 1]) torso.oval(accent, [side * 0.035, 0.17, 0.162], [0.04, 0.025, 0.012], [0, 0, side * 0.4])
      torso.oval(accent, [0, 0.168, 0.166], [0.018, 0.018, 0.012])
      torso.oval(skin, [0, 0.29, 0.005], [0.07, 0.045, 0.065])
    } else if (o.collar === 'kimono') {
      for (const side of [-1, 1])
        torso.oval('#f4efe3', [side * 0.035, 0.17, 0.152], [0.03, 0.11, 0.014], [0.2, 0, side * 0.55])
      torso.ring(accent, [0, 0.06, 0.004], 0.172, 0.035, 0.86)
      torso.oval(skin, [0, 0.29, 0.005], [0.07, 0.045, 0.065])
    } else {
      torso.oval(skin, [0, 0.29, 0.005], [0.07, 0.045, 0.065])
      if (stripe) torso.ring(stripe, [0, 0.24, 0.004], 0.1, 0.02, 0.9)
    }
    if (o.back === 'katana') {
      torso.oval(o.backColor, [-0.02, 0.12, -0.17], [0.026, 0.3, 0.026], [0.15, 0, 0.75])
      torso.oval('#d8b25a', [-0.17, 0.28, -0.19], [0.045, 0.012, 0.045], [0.15, 0, 0.75])
      torso.oval('#5a3f30', [-0.23, 0.36, -0.2], [0.02, 0.08, 0.02], [0.15, 0, 0.75])
    } else if (o.back === 'cape') {
      // A real cape: a flared half-cone from the shoulders, lined inside,
      // with a round collar and clasps.
      const outside: [number, number][] = [
        [0.12, 0.27],
        [0.19, 0.2],
        [0.23, 0.0],
        [0.27, -0.24],
        [0.275, -0.27],
      ]
      torso.shell(o.backColor, [0, 0, -0.02], [...outside].reverse(), Math.PI * 0.55, Math.PI * 0.9)
      torso.shell(o.capeLining ?? accent, [0, 0, -0.02], outside.map(([r, y]) => [r * 0.95, y] as [number, number]), Math.PI * 0.55, Math.PI * 0.9)
      torso.ring(o.backColor, [0, 0.255, -0.01], 0.13, 0.03, 0.95)
      for (const side of [-1, 1]) torso.oval('#e8b85a', [side * 0.1, 0.235, 0.12], [0.025, 0.025, 0.015])
      if (o.capeTrim)
        for (let k = 0; k < 9; k++) {
          const a = Math.PI * 0.6 + (k / 8) * Math.PI * 0.8
          torso.oval(o.capeTrim, [Math.sin(a) * 0.26, -0.24, Math.cos(a) * 0.26 - 0.02], [0.05, 0.035, 0.05])
        }
    } else if (o.back === 'wings') {
      for (const side of [-1, 1]) {
        torso.oval(o.backColor, [side * 0.17, 0.2, -0.2], [0.2, 0.13, 0.025], [0.2, side * -0.5, side * 0.55])
        torso.oval(o.backColor, [side * 0.13, 0.04, -0.19], [0.13, 0.09, 0.022], [0.2, side * -0.5, side * -0.35])
      }
    } else if (o.back === 'backpack') {
      torso.oval(o.backColor, [0, 0.14, -0.19], [0.14, 0.15, 0.08])
      torso.oval(o.accent, [0, 0.08, -0.25], [0.09, 0.06, 0.03])
    } else if (o.back === 'jetpack') {
      for (const side of [-1, 1]) {
        torso.oval(o.backColor, [side * 0.065, 0.15, -0.2], [0.06, 0.15, 0.06])
        torso.oval('#f08a3c', [side * 0.065, -0.02, -0.2], [0.04, 0.03, 0.04])
      }
      torso.oval('#8a90a0', [0, 0.18, -0.17], [0.1, 0.1, 0.04])
    }
    if ((o.extra ?? 'none') === 'belt') {
      torso.ring(o.extraColor ?? '#5a3a2a', [0, 0.02, 0.004], 0.172, 0.022, 0.86)
      torso.oval('#e8b85a', [0, 0.02, 0.155], [0.035, 0.03, 0.012])
    }
    // Raised patches and stitched emblems use the clothing mesh and share its rig.
    const badgeX = o.bib ? 0 : 0.085
    const badgeY = o.bib ? 0.075 : 0.113
    const badgeZ = o.bib ? 0.168 : 0.158
    torso.oval(detailing.ink, [badgeX, badgeY, badgeZ], [0.046, 0.049, 0.009])
    torso.oval(detailing.cloth, [badgeX, badgeY, badgeZ + .009], [0.040, 0.043, 0.008])
    detailing.motif.slice(1).forEach(([x,y], i) => {
      const [px,py] = detailing.motif[i]
      torso.oval(detailing.ink,
        [badgeX + (x + px) * .005, badgeY + (y + py) * .0048, badgeZ + .018],
        [.0036, Math.hypot(x - px, y - py) * .0054 + .003, .003],
        [0,0,-Math.atan2(x - px, y - py)])
    })
    for (const side of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const x = side * (0.106 + i * .010)
        const depth = Math.sqrt(.171 ** 2 - x ** 2) * .86
        torso.oval(seam, [x, .053 + i * .004, depth + .009], [.004, .008, .007], [0, side * .75, side * .28])
      }
      if (o.back === 'backpack' || o.back === 'jetpack') {
        torso.oval(detailing.cloth, [side * .111, .171, .109], [.021,.069,.025], [.21,0,side * .18])
        torso.oval(cuff, [side * .108, .144, .133], [.020,.012,.007])
      }
    }
    if (hem === 'coat' || o.id === 'chef' || o.id === 'knight') {
      for (const y of [.083, .121, .159])
        torso.oval(cuff, [-.047, y, .148], [.009,.009,.009])
    }
    if (o.id === 'winter' || o.id === 'fisher' || o.id === 'gamer' || o.id === 'rocker') {
      // The puffed coat, slicker, hoodie and jacket each get a shaped front.
      const quilted = o.id === 'winter'
      torso.oval(top, [0, .132, -.116], [.143, .108, .065])
      for (const side of [-1, 1]) {
        torso.oval(seam, [side * .084, .075, .153], [.043, .022, .012], [0, side * .32, side * .23])
        torso.oval(top, [side * .087, .069, .161], [.034, .014, .008], [0, side * .32, side * .23])
        if (quilted) for (const y of [.105, .142, .179])
          torso.oval(top, [side * .078, y, -.139], [.063, .017, .027])
      }
      torso.oval(cuff, [0, .18, .158], [.009, .018, .008])
    }
    if (o.hat === 'helmet' || o.back === 'jetpack') {
      // Exposed plating over padded fabric, with little painted rivets.
      for (const side of [-1, 1]) {
        torso.oval(bottomLight, [side * .124, .177, .074], [.047,.055,.061], [.05,side * .28,side * .15])
        torso.oval(cuff, [side * .151, .16, .109], [.009,.009,.009])
      }
    }
    wear(torso, chest)
    if (o.back === 'tail') {
      // A curly tail from the small of the back.
      const tailShape = sculpt(material)
      for (let k = 0; k < 7; k++) {
        const t = k / 6
        tailShape.oval(k === 6 ? o.backColor : o.hair, [0.02 * Math.sin(t * 5), 0.02 + t * 0.2 + Math.sin(t * 3) * 0.05, -0.15 - t * 0.12], [0.04, 0.04, 0.04])
      }
      wear(tailShape, pelvis)
    }

    // Scarf tail only with a scarf.
    if (o.collar === 'scarf') {
      const tail = sculpt(material)
      tail.oval(accent, [0, -0.065, 0], [0.048, 0.08, 0.022])
      tail.oval('#fdf3dc', [0, -0.125, 0], [0.047, 0.018, 0.024])
      tail.oval(accent, [0, -0.16, 0], [0.045, 0.03, 0.021])
      for (const dx of [-0.028, 0, 0.028]) tail.oval(accent, [dx, -0.195, 0], [0.011, 0.016, 0.011])
      wear(tail, scarfTail)
    }

    // Head and hair.
    const face = sculpt(material)
    face.oval(skin, [0, 0, 0], [0.31, 0.29, 0.28])
    face.oval(skin, [0, -0.06, 0.07], [0.27, 0.21, 0.22])
    face.oval(skinShade, [0, -0.045, 0.285], [0.03, 0.022, 0.02])
    for (const side of [-1, 1]) {
      face.oval(skin, [side * 0.298, -0.02, 0.01], [0.05, 0.068, 0.045])
      face.oval('#f2a18c', [side * 0.31, -0.022, 0.03], [0.022, 0.035, 0.012])
      face.oval(blush, [side * 0.172, -0.085, 0.232], [0.058, 0.032, 0.012], [0, side * 0.58, 0])
    }
    const style = o.hairStyle
    // Hats that sit on the head hide the top of the hair: only a tucked
    // fringe and the side and back locks show.
    const covered = ['cap', 'beanie', 'helmet', 'tricorn', 'straw'].includes(o.hat)
    face.oval(hair, [0, covered ? 0.04 : 0.075, -0.045], covered ? [0.318, 0.25, 0.295] : [0.326, 0.272, 0.3])
    face.oval(hair, [0, -0.09, -0.2], [0.24, 0.16, 0.12])
    if (covered) {
      for (const side of [-1, 1]) face.oval(hair, [side * 0.275, -0.01, 0.06], [0.05, 0.1, 0.075])
      // A soft fringe tucked under the brim, hugging the forehead.
      face.oval(hair, [0, 0.085, 0.17], [0.25, 0.085, 0.1], [0.5, 0, 0])
      for (let i = 0; i < 3; i++) {
        const x = -0.1 + i * 0.1
        face.oval(hair, [x, 0.07, 0.235], [0.06, 0.05, 0.03], [0.5, 0, -x * 1.6])
      }
      if (style === 'long') {
        face.oval(hair, [0, -0.17, -0.16], [0.29, 0.3, 0.15])
        for (const side of [-1, 1]) face.oval(hair, [side * 0.28, -0.12, 0.02], [0.07, 0.22, 0.09])
      } else if (style === 'twintails')
        for (const side of [-1, 1]) face.oval(hair, [side * 0.36, -0.12, -0.1], [0.1, 0.24, 0.1], [0, 0, side * 0.25])
    } else if (style === 'slick') {
      // Slicked back with a sharp widow's peak and a glossy streak.
      for (const side of [-1, 1]) face.oval(hair, [side * 0.27, 0.03, 0.03], [0.05, 0.1, 0.08])
      for (const side of [-1, 1]) face.oval(hair, [side * 0.08, 0.17, 0.2], [0.13, 0.075, 0.07], [0.5, 0, side * 0.45])
      face.oval(hair, [0, 0.11, 0.23], [0.035, 0.07, 0.035], [0.3, 0, 0])
      face.oval(hairLight, [0.07, 0.25, 0.05], [0.16, 0.03, 0.12], [0.2, 0.2, -0.2])
    } else if (style === 'swoop') {
      for (const side of [-1, 1]) face.oval(hair, [side * 0.272, 0.005, 0.06], [0.05, 0.11, 0.075])
      for (const [x, y, z, angle, w] of [
        [-0.19, 0.11, 0.19, 0.7, 0.085],
        [-0.085, 0.155, 0.22, 0.35, 0.1],
        [0.04, 0.16, 0.225, -0.15, 0.1],
        [0.165, 0.125, 0.2, -0.55, 0.09],
      ])
        face.oval(hair, [x, y, z], [w, 0.115, 0.055], [0.25, 0, angle])
      face.oval(hairLight, [-0.08, 0.235, 0.12], [0.11, 0.035, 0.05], [0.5, 0.2, 0.25])
    } else if (style === 'spiky') {
      // Sharp bangs and a crown of spikes swept back.
      for (let i = 0; i < 5; i++) {
        const x = -0.2 + i * 0.1
        face.oval(hair, [x, 0.12, 0.22], [0.05, 0.13, 0.04], [0.3, 0, -x * 1.6])
      }
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * TAU
        face.oval(
          i % 3 ? hair : hairLight,
          [Math.sin(a) * 0.18, 0.26 + Math.cos(a) * 0.03, Math.cos(a) * 0.14 - 0.06],
          [0.07, 0.2, 0.07],
          [-0.55 + Math.cos(a) * 0.4, 0, -Math.sin(a) * 0.6],
        )
      }
      for (const side of [-1, 1]) face.oval(hair, [side * 0.28, 0.02, 0.05], [0.05, 0.12, 0.07], [0, 0, side * 0.3])
    } else if (style === 'topknot') {
      for (const side of [-1, 1]) face.oval(hair, [side * 0.27, 0.03, 0.05], [0.045, 0.09, 0.07])
      face.oval(hair, [0, 0.16, 0.18], [0.24, 0.07, 0.08], [0.4, 0, 0])
      face.oval(hair, [0, 0.36, -0.06], [0.09, 0.085, 0.09])
      face.oval(accent, [0, 0.3, -0.05], [0.07, 0.025, 0.07])
      face.oval(hairLight, [0, 0.27, 0.06], [0.12, 0.03, 0.08], [0.5, 0, 0])
    } else {
      // Long hair (and twin tails): straight bangs and locks down the back.
      for (let i = 0; i < 5; i++) {
        const x = -0.2 + i * 0.1
        face.oval(hair, [x, 0.13, 0.21], [0.065, 0.12, 0.05], [0.25, 0, -x * 0.5])
      }
      for (const side of [-1, 1]) face.oval(hair, [side * 0.28, -0.1, 0.02], [0.07, 0.22, 0.09])
      face.oval(hairLight, [0.05, 0.25, 0.1], [0.12, 0.035, 0.05], [0.5, 0.2, -0.25])
      if (style === 'long') {
        face.oval(hair, [0, -0.17, -0.16], [0.29, 0.3, 0.15])
        // Separate locks give the long hair some flow.
        for (let k = 0; k < 4; k++) {
          const x = -0.18 + k * 0.12
          face.oval(k % 2 ? hairLight : hair, [x, -0.3, -0.2 - Math.abs(x) * 0.2], [0.07, 0.17, 0.06], [0.15, 0, x * 0.6])
        }
      } else
        for (const side of [-1, 1]) {
          face.oval(hair, [side * 0.36, -0.1, -0.1], [0.1, 0.24, 0.1], [0, 0, side * 0.25])
          face.oval(o.accent, [side * 0.31, 0.12, -0.08], [0.05, 0.05, 0.05])
        }
    }
    // Hats and hair accessories.
    if (o.hat === 'headband') {
      face.ring(o.hatColor, [0, 0.14, 0.02], 0.3, 0.028, 0.93, [-0.15, 0, 0])
      for (const side of [-1, 1]) face.oval(o.hatColor, [side * 0.07, 0.0, -0.37], [0.04, 0.15, 0.016], [0.75, 0, side * 0.4])
    } else if (o.hat === 'wizard') {
      face.turned(
        o.hatColor,
        [0, 0.22, -0.03],
        [
          [0, 0],
          [0.44, 0],
          [0.45, 0.025],
          [0.22, 0.05],
          [0.14, 0.3],
          [0.04, 0.55],
          [0, 0.58],
        ],
        1,
        [-0.18, 0, 0.18],
      )
      face.ring('#f2c94c', [0, 0.3, -0.02], 0.2, 0.025, 1, [-0.18, 0, 0.18])
      face.oval('#f2c94c', [0.03, 0.4, 0.17], [0.045, 0.045, 0.015], [0, 0, 0.6])
    } else if (o.hat === 'bow') {
      for (const side of [-1, 1]) face.oval(o.hatColor, [0.08 + side * 0.09, 0.29, 0.05], [0.1, 0.07, 0.04], [0, 0, side * 0.5])
      face.oval(o.hatColor, [0.08, 0.29, 0.06], [0.04, 0.04, 0.04])
    } else if (o.hat === 'cap') {
      // A rounded cap with a peak.
      face.oval(o.hatColor, [0, 0.11, -0.02], [0.342, 0.24, 0.33])
      face.oval(o.hatBrim ?? o.hatColor, [0, 0.1, 0.27], [0.22, 0.026, 0.17], [0.16, 0, 0])
      face.ring(o.hatBrim ?? o.hatColor, [0, 0.05, -0.02], 0.31, 0.03, 1, [-0.12, 0, 0])
      face.oval(o.accent, [0, 0.35, -0.02], [0.045, 0.028, 0.045])
    } else if (o.hat === 'crown') {
      face.turned(
        o.hatColor,
        [0, 0.24, -0.02],
        [
          [0.15, 0],
          [0.17, 0.09],
          [0.15, 0.09],
          [0.13, 0.02],
          [0, 0.02],
        ],
        1,
        [-0.1, 0, 0],
      )
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * TAU
        face.oval(o.hatColor, [Math.sin(a) * 0.16, 0.37, -0.02 + Math.cos(a) * 0.16], [0.03, 0.05, 0.03])
        face.oval(k % 2 ? '#e0473b' : '#4fb0d6', [Math.sin(a) * 0.17, 0.29, -0.02 + Math.cos(a) * 0.17], [0.022, 0.022, 0.012], [0, a, 0])
      }
    } else if (o.hat === 'ears') {
      for (const side of [-1, 1]) {
        face.oval(o.hatColor, [side * 0.17, 0.29, -0.02], [0.08, 0.11, 0.05], [0, 0, side * -0.35])
        face.oval('#f6b0a0', [side * 0.17, 0.28, 0.02], [0.045, 0.07, 0.02], [0, 0, side * -0.35])
      }
    } else if (o.hat === 'beanie') {
      face.oval(o.hatColor, [0, 0.12, -0.03], [0.342, 0.27, 0.33])
      face.ring(o.hatBrim ?? o.hatColor, [0, 0.04, -0.02], 0.315, 0.045, 0.98, [-0.12, 0, 0])
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * TAU
        face.oval(o.hatBrim ?? o.hatColor, [Math.sin(a) * 0.31, 0.04, -0.02 + Math.cos(a) * 0.31], [0.012, 0.04, 0.012])
      }
      face.oval('#fffaf0', [0, 0.41, -0.05], [0.08, 0.08, 0.08])
    } else if (o.hat === 'tricorn') {
      // A proper tricorn: domed crown and three upturned brim corners.
      face.oval(o.hatColor, [0, 0.15, -0.03], [0.33, 0.22, 0.32])
      face.turned(o.hatColor, [0, 0.12, -0.03], [[0, -0.01], [0.42, -0.01], [0.44, 0.02], [0, 0.02]], 1)
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * TAU
        face.oval(o.hatColor, [Math.sin(a) * 0.3, 0.24, -0.03 + Math.cos(a) * 0.3], [0.3, 0.13, 0.05], [0.0, a, 0])
        face.oval('#d9b44a', [Math.sin(a) * 0.33, 0.3, -0.03 + Math.cos(a) * 0.33], [0.26, 0.015, 0.02], [0, a, 0])
      }
      // A little skull-and-crossbones badge (a friendly one).
      face.oval('#f6f1e4', [0, 0.27, 0.3], [0.05, 0.045, 0.02])
      for (const side of [-1, 1]) face.oval('#f6f1e4', [0, 0.21, 0.3], [0.07, 0.012, 0.012], [0, 0, side * 0.6])
    } else if (o.hat === 'helmet') {
      // A rounded helmet; a clear bubble visor for the astronaut look.
      if (o.hatColor === '#cfe7ff') {
        face.ring('#dfe2ea', [0, -0.22, 0.01], 0.26, 0.05, 1)
        face.oval('#e6f3ff', [0, 0.12, -0.08], [0.36, 0.34, 0.3])
        face.oval('#9fd0ff', [0, 0.06, 0.28], [0.22, 0.17, 0.04])
      } else {
        // Knight's helm: dome, cheek guards, a brow band and a plume.
        face.oval(o.hatColor, [0, 0.1, -0.03], [0.345, 0.29, 0.335])
        face.ring('#e0e6ee', [0, 0.04, -0.02], 0.315, 0.035, 1, [-0.12, 0, 0])
        for (const side of [-1, 1]) face.oval(o.hatColor, [side * 0.27, -0.08, 0.06], [0.07, 0.13, 0.12])
        face.oval('#e0e6ee', [0, 0.14, 0.29], [0.025, 0.12, 0.03], [0.3, 0, 0])
        for (let k = 0; k < 5; k++)
          face.oval(k % 2 ? o.accent : (o.plume ?? '#e0473b'), [0, 0.38 - k * 0.02, -0.05 - k * 0.07], [0.05, 0.1, 0.06], [-0.4 - k * 0.25, 0, 0])
      }
    } else if (o.hat === 'chef') {
      face.turned(
        o.hatColor,
        [0, 0.22, -0.03],
        [
          [0.2, 0],
          [0.2, 0.18],
          [0, 0.18],
        ],
        1,
        [-0.08, 0, 0],
      )
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * TAU
        face.oval(o.hatColor, [Math.sin(a) * 0.14, 0.46, -0.04 + Math.cos(a) * 0.14], [0.13, 0.12, 0.13])
      }
      face.oval(o.hatColor, [0, 0.5, -0.04], [0.15, 0.12, 0.15])
    } else if (o.hat === 'straw') {
      face.turned(
        o.hatColor,
        [0, 0.18, -0.02],
        [
          [0, 0.16],
          [0.18, 0.15],
          [0.22, 0.04],
          [0.48, 0],
          [0.5, -0.02],
          [0, -0.02],
        ],
        1,
        [-0.08, 0, 0.06],
      )
      face.ring('#c8423a', [0, 0.23, -0.02], 0.215, 0.025, 1, [-0.08, 0, 0.06])
    } else if (o.hat === 'goggles') {
      face.ring(o.hatColor, [0, 0.12, 0.01], 0.31, 0.022, 0.95, [-0.2, 0, 0])
      for (const side of [-1, 1]) {
        face.oval(o.hatColor, [side * 0.1, 0.2, 0.25], [0.085, 0.07, 0.05])
        face.oval(o.accent === '#2a2d3a' ? '#ff9a52' : '#bfe8ff', [side * 0.1, 0.2, 0.29], [0.065, 0.05, 0.02])
      }
    } else if (o.hat === 'halo') {
      face.ring(o.hatColor, [0, 0.47, -0.02], 0.17, 0.025, 1)
    }
    // Small extras that give each look its character.
    const extra = o.extra ?? 'none'
    if (extra === 'eyepatch') {
      face.oval('#1f1b1b', [0.11, 0.02, 0.27], [0.065, 0.07, 0.02], [0, 0.38, 0])
      face.oval('#1f1b1b', [0, 0.1, 0.02], [0.31, 0.015, 0.29], [0.1, 0, -0.35])
    } else if (extra === 'mask') {
      // A cloth mask over the nose and mouth, tied at the back.
      face.oval(o.extraColor ?? '#283246', [0, -0.115, 0.2], [0.22, 0.095, 0.1])
      face.oval(o.extraColor ?? '#283246', [0, -0.1, 0.02], [0.29, 0.08, 0.23])
    } else if (extra === 'glasses' || extra === 'shades') {
      const lens = extra === 'shades' ? '#2a2630' : '#e9f6ff'
      for (const side of [-1, 1]) {
        face.ring(o.extraColor ?? '#3a2e2a', [side * 0.11, 0.0, 0.3], 0.062, 0.013, 1, [Math.PI / 2, side * 0.38, 0])
        face.oval(lens, [side * 0.11, 0.0, 0.298], [0.06, 0.06, 0.008], [0, side * 0.38, 0])
        face.oval(o.extraColor ?? '#3a2e2a', [side * 0.24, 0.02, 0.18], [0.012, 0.012, 0.09], [0, side * 0.6, 0])
      }
      face.oval(o.extraColor ?? '#3a2e2a', [0, 0.01, 0.31], [0.035, 0.011, 0.011])
    } else if (extra === 'headphones') {
      face.ring(o.extraColor ?? '#2a2d3a', [0, 0.08, -0.01], 0.33, 0.022, 1, [0, 0, Math.PI / 2])
      for (const side of [-1, 1]) {
        face.oval(o.extraColor ?? '#2a2d3a', [side * 0.31, -0.02, 0.0], [0.05, 0.085, 0.085])
        face.oval(o.accent, [side * 0.345, -0.02, 0.0], [0.015, 0.06, 0.06])
      }
    }
    wear(face, head, [0, H, 0])
    cowlick.visible = style === 'swoop'
    if (style === 'swoop') {
      const curl = sculpt(material)
      curl.oval(hair, [0, 0.045, 0], [0.032, 0.07, 0.026], [0, 0, -0.35])
      curl.oval(hair, [0.035, 0.105, 0.004], [0.026, 0.045, 0.022], [0, 0, 0.9])
      wear(curl, cowlick)
    }
    const browShapes = sculpt(material)
    for (const side of [-1, 1])
      browShapes.oval(hair, [side * 0.115, 0.098, 0.258], [0.038, 0.011, 0.01], [0, side * 0.35, -side * 0.16])
    const browY = brows.position.y || H
    brows = wear(browShapes, head, [0, browY, 0])

    // Arms: sleeves in the top colour, bare forearms and mitten hands.
    for (const { side, shoulder, elbow } of arms) {
      const upper = sculpt(material)
      upper.oval(top, [0, -0.004, 0], [0.06, 0.062, 0.062])
      upper.limb(top, 0.05, UPPER_ARM - 0.02)
      if (stripe) upper.oval(stripe, [0, -0.05, 0], [0.053, 0.016, 0.053])
      upper.oval(stripe ?? accent, [0, -UPPER_ARM + 0.01, 0], [0.052, 0.024, 0.052])
      upper.oval(detailing.cloth, [0, -UPPER_ARM + 0.023, 0], [.054, .010, .054])
      upper.oval(cuff, [side * .026, -UPPER_ARM + .005, .046], [.008,.008,.006])
      if (hem === 'coat' || o.hat === 'helmet' || o.back === 'jetpack')
        upper.oval(stripe ?? seam, [side * .011,-.04, .033], [.064,.046,.036])
      wear(upper, shoulder)
      const lower = sculpt(material)
      lower.limb(skin, 0.04, FOREARM - 0.035)
      lower.oval(skin, [0, -FOREARM, 0.006], [0.055, 0.058, 0.05])
      lower.oval(skin, [-side * 0.02, -FOREARM + 0.014, 0.04], [0.02, 0.028, 0.02], [0.4, 0, 0])
      wear(lower, elbow)
    }

    // Legs and footwear (posed every frame by the IK, so no transforms here).
    for (const leg of legs) {
      const thigh = sculpt(material)
      thigh.limb(bottom, 0.066, THIGH - 0.02)
      thigh.oval(bottomLight, [0, -THIGH + 0.035, 0], [0.07, 0.02, 0.07])
      const calf = sculpt(material)
      calf.limb(o.sock, 0.05, SHIN - 0.035, [0, 0.005, 0])
      const shoe = sculpt(material)
      shoe.oval(o.boot, [0, 0.045, -0.005], [0.072, 0.06, 0.072])
      shoe.oval(o.bootLight, [0, 0.092, -0.005], [0.074, 0.016, 0.074])
      shoe.oval(o.boot, [0, -0.01, 0.035], [0.094, 0.07, 0.138])
      shoe.oval(o.bootLight, [0, 0.012, 0.11], [0.06, 0.04, 0.05])
      shoe.oval(o.sole, [0, -0.058, 0.033], [0.099, 0.026, 0.143])
      shoe.oval(detailing.cloth, [0, -.013, .157], [.061,.036,.025])
      for (const offset of [0, .025, .05]) {
        const z = .071 + offset
        shoe.oval(cuff, [0, .055 - offset * .31, z], [.046,.006,.008], [.35,0,offset * 3])
      }
      for (const side of [-1,1])
        shoe.oval(o.bootLight, [side * .092, -.036, .05], [.008,.008,.054])
      const keep = (mesh: THREE.Mesh, old: THREE.Mesh) => {
        mesh.position.copy(old.position)
        mesh.quaternion.copy(old.quaternion)
        mesh.rotation.copy(old.rotation)
        return mesh
      }
      leg.thigh = keep(wear(thigh, group), leg.thigh)
      leg.calf = keep(wear(calf, group), leg.calf)
      leg.shoe = keep(wear(shoe, group), leg.shoe)
      leg.shoe.name = 'visitor boot'
      leg.calf.name = 'visitor calf'
    }
    scarfTail.visible = o.collar === 'scarf'
  }
  dress(outfitById(initialOutfit))

  /* ---------------------------- Fishing rod ---------------------------- */
  // Held in the right fist; tilted up so it rises out of the hand.
  const rodPivot = joint(arms[0].elbow, 0, -FOREARM, 0.015)
  rodPivot.rotation.x = -0.95
  const rodShape = sculpt(material)
  rodShape.limb('#d0a067', 0.013, 1.0)
  rodShape.oval('#6b4a35', [0, -0.04, 0], [0.028, 0.08, 0.028])
  rodShape.oval('#dfe3e6', [0.035, -0.16, 0], [0.04, 0.04, 0.022])
  for (const y of [-0.45, -0.75]) rodShape.oval('#f3c54d', [0, y, 0], [0.02, 0.012, 0.02])
  rodShape.mesh(rodPivot)
  const rodTip = joint(rodPivot, 0, -1.02, 0)
  rodPivot.visible = false
  // The catch, lifted overhead.
  const trophy = joint(group, 0, 1.56, 0.08)
  let trophyMesh: THREE.Mesh | null = null
  function buildFish([body, fin]: [string, string]) {
    const fish = sculpt(material)
    fish.oval(body, [0, 0, 0], [0.22, 0.1, 0.065])
    fish.oval(fin, [0.02, -0.035, 0], [0.17, 0.05, 0.062])
    fish.oval(body, [-0.24, 0.035, 0], [0.07, 0.06, 0.02], [0, 0, 0.6])
    fish.oval(body, [-0.24, -0.035, 0], [0.07, 0.06, 0.02], [0, 0, -0.6])
    fish.oval(fin, [0, 0.1, 0], [0.09, 0.04, 0.015], [0, 0, -0.2])
    for (const side of [-1, 1]) {
      fish.oval('#ffffff', [0.14, 0.025, side * 0.05], [0.028, 0.028, 0.012])
      fish.oval(ink, [0.148, 0.025, side * 0.058], [0.015, 0.017, 0.008])
    }
    return fish.mesh(trophy)
  }

  /* ------------------------------ Umbrella ---------------------------- */
  // Held aloft in the right hand for the drift down through the clouds.
  const brolly = joint(arms[0].elbow, 0, -FOREARM, 0.01)
  const brollyShape = sculpt(material)
  brollyShape.limb('#8a5a3a', 0.014, 0.62)
  brollyShape.oval('#8a5a3a', [0.03, 0.04, 0], [0.035, 0.03, 0.03])
  // The canopy opens towards -Y, which points up while the arm is raised.
  const canopy = (colour: string, from: number, to: number, lift = 0) =>
    brollyShape.turned(
      colour,
      [0, -0.6 - lift, 0],
      Array.from({ length: 7 }, (_, i) => {
        const t = from + ((to - from) * i) / 6
        return [0.54 * Math.sin(t * Math.PI * 0.5), -0.3 * Math.cos(t * Math.PI * 0.5)] as [number, number]
      }),
    )
  canopy('#ef6c5c', 0, 1)
  canopy('#fdf3dc', 0.42, 0.62, 0.004)
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU
    brollyShape.oval(i % 2 ? '#ef6c5c' : '#fdf3dc', [Math.cos(a) * 0.53, -0.6, Math.sin(a) * 0.53], [0.075, 0.035, 0.075])
  }
  brollyShape.oval('#f6c24d', [0, -0.93, 0], [0.04, 0.05, 0.04])
  brollyShape.mesh(brolly)
  brolly.visible = false

  /* --------------------------- Energy aura ----------------------------- */
  const aura = new THREE.Group()
  aura.visible = false
  group.add(aura)
  const glow = (color: string, opacity: number) =>
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  const flame = (scale: number) =>
    new THREE.LatheGeometry(
      [
        [0.0, -0.02],
        [0.3, 0.02],
        [0.44, 0.35],
        [0.42, 0.8],
        [0.3, 1.25],
        [0.12, 1.65],
        [0.0, 1.85],
      ].map(([r, y]) => new THREE.Vector2(r * scale, y * scale)),
      22,
    )
  // Flame shells: scrolling noise tongues licking upward, brightest at the
  // silhouette (fresnel) so the body stays readable inside the glow.
  const flameMaterial = (core: string, edge: string, speed: number) =>
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: { time: { value: 0 }, power: { value: 0 }, core: { value: new THREE.Color(core) }, edge: { value: new THREE.Color(edge) }, speed: { value: speed } },
      vertexShader: `
        varying vec2 vUv; varying float vRim;
        void main() {
          vUv = uv;
          vec4 view = modelViewMatrix * vec4(position, 1.0);
          vec3 n = normalize(normalMatrix * normal);
          vRim = 1.0 - abs(dot(n, normalize(-view.xyz)));
          gl_Position = projectionMatrix * view;
        }`,
      fragmentShader: `
        uniform float time, power, speed; uniform vec3 core, edge;
        varying vec2 vUv; varying float vRim;
        float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float n(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
        void main() {
          vec2 q = vec2(vUv.x * 7.0, vUv.y * 2.6 - time * speed);
          float f = n(q) * 0.6 + n(q * 2.3 + 4.1) * 0.4;
          float tongues = smoothstep(0.15, 0.75, f + 0.75 - vUv.y * 1.05);
          float base = smoothstep(0.0, 0.08, vUv.y);
          float a = tongues * base * (0.35 + 0.9 * pow(vRim, 1.6)) * power;
          vec3 c = mix(core, edge, clamp(vUv.y * 1.2 + vRim * 0.4, 0.0, 1.0));
          gl_FragColor = vec4(c * a, a);
        }`,
    })
  const auraOuter = new THREE.Mesh(flame(1), flameMaterial('#fff1a8', '#ff9a1f', 2.4))
  const auraInner = new THREE.Mesh(flame(0.74), flameMaterial('#ffffff', '#ffd23f', 3.4))
  aura.add(auraOuter, auraInner)
  // Light streaks rushing up through the aura.
  const streakGeometry = new THREE.PlaneGeometry(0.025, 0.5)
  const streaks = Array.from({ length: 10 }, (_, i) => {
    const streak = new THREE.Mesh(streakGeometry, glow('#fff2b0', 0.7))
    aura.add(streak)
    return { streak, a: i * 0.63 * TAU, r: 0.32 + (i % 3) * 0.07, speed: 1.6 + (i % 4) * 0.5 }
  })
  const sparkGeometry = new THREE.OctahedronGeometry(0.03, 0)
  const sparks = Array.from({ length: 12 }, (_, i) => {
    const spark = new THREE.Mesh(sparkGeometry, glow('#fff6c8', 0.9))
    aura.add(spark)
    return { spark, a: i * 2.4, r: 0.2 + (i % 4) * 0.08, speed: 0.8 + (i % 3) * 0.35 }
  })
  let lastPowerTime: number | null = null
  let golden = 0
  let auraW = 0

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
  const bubbles = emotes(group, 1.32)
  let seated = false
  let sitW = 0
  let seatMode: Seat['mode'] = 'fire'
  let seatPelvis = 0.285
  let seatBack = 0.2
  let seatedSince = 0
  let changeT = 1
  let pendingOutfit: Outfit | null = null
  let lastSpin = 0
  let holding = false
  let rodW = 0
  let castT = 1
  let tugT = 1
  let showing = false
  let showW = 0
  let floating = false
  let floatW = 0
  let footstep: ((strength: number) => void) | null = null
  let waveT = 1
  let brollyScale = 0
  let nextNote = 0
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
    seated = false
    sitW = 0
    pelvis.position.z = 0
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

  let wasAirborne = false
  const animate: IslandCharacter['animate'] = (time, reduced, move) => {
    const dt = Math.min(0.1, Math.max(0, time - previous))
    previous = time
    const scale = group.scale.x || 1
    const speed = move?.speed ?? 0
    const liftOff = (move?.jumpHeight ?? 0) / scale
    if (wasAirborne && !liftOff) landing.kick(reduced ? -0.35 : -0.95)
    wasAirborne = liftOff > 0
    const travelled = (move?.distance ?? 0) / scale
    const airborne = liftOff > 0
    const nowMoving = !airborne && travelled > 1e-5 && speed > 0.08

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
    pace = damp(pace, clamp(speed / TOP_SPEED, 0, 1.9), 10, dt)
    sitW = damp(sitW, seated ? 1 : 0, reduced ? 14 : 4.5, dt)
    rodW = damp(rodW, holding ? 1 : 0, 9, dt)
    showW = damp(showW, showing ? 1 : 0, 7, dt)
    floatW = damp(floatW, floating ? 1 : 0, floating ? 20 : 6, dt)
    brollyScale = damp(brollyScale, floating ? 1 : 0, floating ? 12 : 9, dt)
    castT = Math.min(1, castT + dt / 0.75)
    waveT = Math.min(1, waveT + dt / 1.8)
    const waving = waveT < 1 ? ease(clamp(waveT / 0.15, 0, 1)) * ease(clamp((1 - waveT) / 0.2, 0, 1)) : 0
    tugT = Math.min(1, tugT + dt / 0.35)
    const sitting = ease(clamp(sitW, 0, 1))
    // Running: longer strides, pumping arms and a keener lean.
    const run = clamp((pace - 1.05) / 0.6, 0, 1)
    accel = damp(accel, dt > 0 ? (speed - lastSpeed) / dt : 0, 8, dt)
    lastSpeed = speed
    const s = reduced ? Math.min(pace, 1) * 0.8 : pace
    const length = CYCLE * (0.7 + 0.3 * Math.min(1, pace) + 0.45 * Math.max(0, pace - 1))
    const lift = (0.065 + 0.05 * Math.min(1, pace) + 0.04 * run) * (reduced ? 0.7 : 1)
    const yawRate = dt > 0 ? angleDelta(lastYaw, group.rotation.y) / dt : 0
    lastYaw = group.rotation.y

    /* ---- Idle actions: little bits of personality when standing still ---- */
    if (moving || airborne || reduced || seated || sitW > 0.02 || holding || showing || floating) {
      idleSince = time
      nextAction = time + 6 + random() * 4
      action = null
    } else if (!action && time > nextAction) {
      const options: IdleAction[] = (['sway', 'stretch', 'tap', 'hop', 'twirl'] as IdleAction[]).filter(
        (kind) => kind !== lastAction,
      )
      const kind = options[Math.floor(random() * options.length)]
      action = {
        kind,
        start: time,
        length: kind === 'stretch' || kind === 'sway' ? 2.6 : kind === 'hop' ? 1.5 : kind === 'twirl' ? 1.7 : 2.2,
      }
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
    // Little hops of joy, and a twirl with arms out.
    const hopping = action?.kind === 'hop' ? act : 0
    const hopLift = hopping ? Math.abs(Math.sin(actT * TAU * 1.35)) * 0.075 * hopping : 0
    const twirling = action?.kind === 'twirl' ? act : 0
    const twirlAngle = action?.kind === 'twirl' ? ease(clamp((actT - 0.25) / 1.1, 0, 1)) * TAU : 0
    // Outfit change: two quick spins with a pop of sparkles half way.
    if (changeT < 1) {
      changeT = Math.min(1, changeT + dt / 0.95)
      if (pendingOutfit && changeT >= 0.5) {
        dress(pendingOutfit)
        pendingOutfit = null
        bubbles.show('sparkle')
        for (const leg of legs) {
          kickDust(leg.shoe, 2.2)
          kickDust(leg.shoe, 1.6)
        }
      }
    }
    const changing = changeT < 1 ? Math.sin(Math.PI * changeT) : 0
    const spin = (changeT < 1 ? ease(changeT) * TAU * 2 : 0) + twirlAngle
    // Only ever turn forwards: an interrupted twirl just stops where it is.
    if (spin > lastSpin) group.rotation.y += spin - lastSpin
    lastSpin = spin

    /* ---- Feet ---- */
    if (airborne) {
      const tuck = Math.min(1, liftOff * 2)
      legs.forEach(leg => {
        leg.pose.y = (0.12 + (leg.side > 0 ? 0.08 : 0)) * tuck
        leg.pose.z = leg.side * 0.13 * tuck
        leg.pose.pitch = (leg.side > 0 ? -0.16 : 0.30) * tuck
        leg.planted = false
      })
    } else if (moving) {
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
        if (landed && !liftOff && leg.planted === false) {
          if (move?.dust && !reduced && pace > 0.45) kickDust(leg.shoe, 0.7 + 0.5 * pace)
          if (!reduced) landing.kick(-0.09 * pace)
          footstep?.(Math.min(1.4, 0.5 + pace * 0.6))
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

    /* ---- Seated: feet planted in front, swinging happily now and then ---- */
    if (sitting > 0) {
      const kick = reduced ? 0 : smoothstep01(Math.sin(time * 0.37) * 2 - 0.6)
      legs.forEach((leg, index) => {
        const swing = kick * Math.max(0, Math.sin(time * 4.2 + index * Math.PI))
        leg.pose.z = lerp(leg.pose.z, SIT_FOOT + (seatMode === 'bench' ? 0.03 : 0) + 0.05 * swing, sitting)
        leg.pose.y = lerp(leg.pose.y, 0.035 * swing, sitting)
        leg.pose.pitch = lerp(leg.pose.pitch, -0.25 * swing, sitting)
      })
    }

    /* ---- Floating: legs dangle and kick lazily under the umbrella ---- */
    if (floatW > 0.001)
      legs.forEach((leg, index) => {
        const kick = Math.sin(time * 3.1 + index * Math.PI)
        leg.pose.z = lerp(leg.pose.z, 0.05 * kick, floatW)
        leg.pose.y = lerp(leg.pose.y, 0.05 + 0.03 * kick, floatW)
        leg.pose.pitch = lerp(leg.pose.pitch, 0.35 + 0.25 * kick, floatW)
      })

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

    // Power-up timeline: stance (0–0.4), charge (0.4–2.8), burst (2.8–3.6), relax.
    const powerT = move?.powerTime ?? transformationEnd
    const stance = powerT < transformationEnd ? smoothstep01(powerT / .30) * smoothstep01((transformationEnd - powerT) / .85) : 0
    const charge = powerT < ruptureTime ? .36 + smoothstep01(powerT / ruptureTime) * .64 : 0
    const burst = powerT >= ruptureTime && powerT < ruptureTime + 1.25 ? Math.sin(Math.PI * Math.min(1, (powerT - ruptureTime) / 1.25)) : 0
    celWeight.value = stance * .78
    knuckles.forEach(fist => { fist.visible = stance > .5 && powerT < ruptureTime })
    pelvis.position.x = reduced ? 0 : -0.02 * s * w * weightSide + 0.012 * shift + 0.03 * dance
    pelvis.rotation.set(
      0.03 * s * w + 0.06 * run - 0.08 * sitting,
      reduced ? 0 : 0.14 * s * w * Math.cos(cycle),
      reduced ? 0 : 0.06 * s * w * weightSide - 0.08 * turnLook * s + 0.018 * shift + 0.09 * dance,
    )
    const lean = reduced
      ? 0.03 * w
      : 0.08 * s * w + 0.1 * run + clamp(accel * 0.018, -0.1, 0.12) - 0.16 * stretching
    const fireSway = reduced ? 0 : Math.sin(time * 1.2) * 0.05 * sitting
    chest.rotation.set(
      lean + 0.012 * breathe * idle + 0.16 * sitting,
      -pelvis.rotation.y * 1.35,
      -pelvis.rotation.z * 0.45 + fireSway,
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
    pelvis.position.y =
      lerp(height, seatPelvis + 0.006 * breathe, sitting) + (hopLift + changing * 0.07) * (1 - sitting) - 0.072 * stance * (1 - burst)
    if (!reduced && charge > 0) pelvis.position.x += Math.sin(time * 56) * .012 * charge
    pelvis.position.z = -seatBack * sitting
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
      const amount = ((reduced ? 0.35 : 0.72) * Math.min(1, s) + 0.25 * run) * w
      const forwardness = Math.max(0, -swing)
      const rest = side * (0.28 + 0.06 * s * w + 0.025 * idle * (breathe + 1))
      const wave = swaying * (0.35 + 0.25 * Math.sin(actT * TAU * 1.15 + index * Math.PI))
      shoulder.rotation.set(
        lerp(swing * amount + 0.02 * idle * breathe, -2.75, stretching),
        0,
        rest + side * (wave + 0.12 * stretching) + (reduced ? 0 : 0.03 * shift * side),
      )
      elbow.rotation.x = lerp(-0.22 - 0.6 * forwardness * amount - 0.12 * w - 0.85 * run * w, -0.15, stretching)
      if (rodW > 0.001) {
        // Rod out over the water: the back-swing and flick of a cast, and a
        // sharp tug when something bites.
        // Raise the rod up over the shoulder, then flick it out over the water.
        const raise = castT < 0.45 ? ease(castT / 0.45) * 1.35 : 1.35 - ease(Math.min(1, (castT - 0.45) / 0.22)) * 1.8
        const swing = -(castT < 1 ? raise * (1 - Math.max(0, (castT - 0.7) / 0.3)) : 0) - (tugT < 1 ? 0.5 * Math.sin(tugT * Math.PI) : 0)
        const rodArm = index === 0
        shoulder.rotation.x = lerp(shoulder.rotation.x, rodArm ? -0.9 + swing : -0.75 + swing * 0.6, rodW)
        shoulder.rotation.z = lerp(shoulder.rotation.z, rodArm ? side * 0.12 : -side * 0.1, rodW)
        elbow.rotation.x = lerp(elbow.rotation.x, rodArm ? -0.6 : -1.05, rodW)
      }
      if (waving > 0.001 && index === 1) {
        shoulder.rotation.x = lerp(shoulder.rotation.x, -2.55, waving)
        shoulder.rotation.z = lerp(shoulder.rotation.z, side * (0.45 + 0.35 * Math.sin(time * 13)), waving)
        elbow.rotation.x = lerp(elbow.rotation.x, -0.45, waving)
      }
      if (floatW > 0.001) {
        // One hand grips the umbrella overhead, the other waves at the island.
        const wave = Math.sin(time * 5) * 0.35
        shoulder.rotation.x = lerp(shoulder.rotation.x, index === 0 ? -2.95 : -0.4, floatW)
        shoulder.rotation.z = lerp(shoulder.rotation.z, index === 0 ? side * 0.08 : side * (1.25 + wave), floatW)
        elbow.rotation.x = lerp(elbow.rotation.x, index === 0 ? -0.12 : -0.5, floatW)
      }
      if (showW > 0.001) {
        shoulder.rotation.x = lerp(shoulder.rotation.x, -2.85, showW)
        shoulder.rotation.z = lerp(shoulder.rotation.z, side * 0.22, showW)
        elbow.rotation.x = lerp(elbow.rotation.x, -0.25, showW)
      }
      if (stance > 0) {
        // Elbows tuck in, wrists turn inward and the fists rise to the chest
        // for the detail shot. The force of the impact throws both arms wide.
        const clench = 1 - smoothstep01((powerT - wideTime) / .5)
        shoulder.rotation.x = lerp(lerp(shoulder.rotation.x, .36 - .58 * clench, stance), -0.35, burst)
        shoulder.rotation.z = lerp(lerp(shoulder.rotation.z, side * (.53 - .20 * clench), stance), side * 1.35, burst)
        elbow.rotation.x = lerp(lerp(elbow.rotation.x, -1.75 - .38 * clench, stance), -0.15, burst)
      }
      if (hopping > 0 || twirling > 0 || changing > 0) {
        const out = Math.max(twirling, changing)
        shoulder.rotation.x = lerp(shoulder.rotation.x, -0.5 - 1.2 * hopping, Math.max(hopping, out * 0.4))
        shoulder.rotation.z = lerp(shoulder.rotation.z, side * (0.35 + 0.9 * out), Math.max(hopping, out))
      }
      if (airborne) {
        const reach = Math.min(1, liftOff * 2.5)
        shoulder.rotation.x = lerp(0, -0.94, reach)
        shoulder.rotation.z = side * (0.28 + reach * 0.55)
        elbow.rotation.x = -0.3 - 0.48 * reach
      }
      if (sitting > 0) {
        // Warm both hands at the fire (or rest them on the knees on a
        // bench), switching every so often.
        const warm = seatMode === 'bench' ? 0 : reduced ? 1 : smoothstep01(Math.sin(time * 0.21) * 3 + 0.5)
        const rub = reduced ? 0 : 0.07 * Math.sin(time * 6.5 + index * Math.PI) * warm
        shoulder.rotation.x = lerp(shoulder.rotation.x, lerp(-0.62, -1.12 + rub, warm), sitting)
        shoulder.rotation.z = lerp(shoulder.rotation.z, side * lerp(0.2, 0.12, warm), sitting)
        elbow.rotation.x = lerp(elbow.rotation.x, lerp(-0.3, -0.85, warm), sitting)
      }
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
    const busy = Math.max(swaying, stretching, hopping, twirling)
    // On a bench, after a while, the visitor nods off.
    const dozing = seated && seatMode === 'bench' && !reduced && time - seatedSince > 8 ? smoothstep01((time - seatedSince - 8) / 1.5) : 0
    const gazeAway = 1 - sitting
    lookYaw = damp(lookYaw, reduced ? 0 : (lookTarget[0] * idle * (1 - busy) + turnLook * 0.45) * gazeAway, 5, dt)
    lookPitch = damp(lookPitch, lookTarget[1] * idle * (1 - busy) * gazeAway - 0.32 * stretching + 0.14 * sitting, 5, dt)
    lookTilt = damp(lookTilt, lookTarget[2] * idle * (1 - busy) - 0.2 * dance, 6, dt)
    const nodding = reduced ? 0 : nod.step(clamp(-bobVelocity * 0.35, -0.3, 0.3), dt)
    const tapNod = tapping * 0.07 * Math.sin(actT * TAU * 2.4)
    head.rotation.set(
      lookPitch - lean * 0.55 + nodding + tapNod + dozing * (0.22 + 0.06 * Math.sin(time * 1.3)) + 0.18 * charge * stance - 0.35 * burst,
      lookYaw - chest.rotation.y - pelvis.rotation.y,
      lookTilt - pelvis.rotation.z * 0.6 + (reduced ? 0 : Math.sin(time * 1.7) * 0.015 * idle),
    )

    /* ---- Face ---- */
    const cosy = sitting > 0.9 && !reduced && Math.sin(time * 0.45) > 0.82
    const happy = busy > 0.45 || changing > 0.2 || (cosy && seatMode === 'fire') || showW > 0.5 || waving > 0.5 || (floatW > 0.5 && Math.sin(time * 0.9) > 0.3)
    brolly.visible = brollyScale > 0.02
    brolly.scale.set(Math.max(0.001, brollyScale), 1, Math.max(0.001, brollyScale))
    rodPivot.visible = rodW > 0.05
    trophy.visible = showW > 0.05
    trophy.scale.setScalar(Math.max(0.001, showW))
    trophy.position.y = 1.56 + (reduced ? 0 : Math.sin(time * 6) * 0.02 * showW)
    trophy.rotation.z = reduced ? 0 : Math.sin(time * 9) * 0.12 * showW
    if (sitting > 0.95 && !reduced && time > nextNote) {
      bubbles.show(dozing > 0.5 ? 'sleep' : seatMode === 'bench' ? (random() < 0.5 ? 'heart' : 'note') : random() < 0.2 ? 'heart' : 'note')
      nextNote = time + (dozing > 0.5 ? 2.4 : seatMode === 'bench' ? 4.5 : 2.6) + random() * 2.4
    }
    eyes.visible = !happy
    happyEyes.visible = happy
    eyes.scale.y = reduced ? 1 : Math.min(blink(time), 1 - dozing * 0.9)
    mouthOpen.visible = happy || (stretching > 0.6 && actT > 0.6) || charge > 0.55 || burst > 0.2
    if (stance > 0.2) {
      // A determined face while powering up.
      eyes.visible = true
      happyEyes.visible = false
    }
    smile.visible = !mouthOpen.visible
    brows.position.y = H + 0.012 * busy + Math.abs(lookTilt) * 0.02 - stance * .012
    brows.rotation.x = stance * -.17

    /* ---- Secondary motion: cowlick and scarf tail trail behind ---- */
    if (reduced) {
      cowlick.rotation.set(0, 0, 0)
      scarfTail.rotation.set(0.1 * s * w, 0, 0)
    } else {
      cowlick.rotation.x = curlPitch.step(clamp(-bobVelocity * 0.9 + lean * 0.6 - accel * 0.02, -0.5, 0.5), dt)
      cowlick.rotation.z = curlRoll.step(clamp(-yawRate * 0.05 - 0.3 * dance, -0.5, 0.5), dt)
      const flutter = Math.sin(time * 13) * 0.12 * s * w
      scarfTail.rotation.x = 0.08 + tailSwing.step(clamp(0.75 * Math.min(s, 1.2) * w + accel * 0.03 - bobVelocity * 0.4, -0.3, 0.95), dt) + flutter
      scarfTail.rotation.z = tailRoll.step(clamp(yawRate * 0.08 - pelvis.rotation.z * 2, -0.6, 0.6), dt)
    }

    /* ---- Contact shadow ---- */
    const air = (pelvis.position.y - PELVIS_Y) * 3
    shadow.scale.set(1 - air, 0.85 * (1 - air), 1)
    shadow.position.y = 0.015 - liftOff
    shadow.scale.multiplyScalar(1 / (1 + liftOff * 0.65))
    shadow.position.x = pelvis.position.x * 0.5

    updateDust(dt)
    bubbles.update(dt)

    /* ---- Aura: grows while charging, flares on the burst, lingers gold ---- */
    if (powerT < transformationEnd && powerT >= ruptureTime && (lastPowerTime === null || lastPowerTime < ruptureTime)) {
      dress({ ...base, hair: '#f6c63c', hairLight: '#fff09a', hairStyle: 'spiky' })
      golden = 14
      for (const leg of legs) {
        kickDust(leg.shoe, 2.6)
        kickDust(leg.shoe, 2.2)
      }
    }
    lastPowerTime = move?.powerTime ?? null
    if (golden > 0) {
      golden -= dt
      if (golden <= 0) {
        dress(base)
        bubbles.show('sparkle')
      }
    }
    const auraTarget = Math.max(charge * .45 * smoothstep01((powerT - wideTime) / 2), burst * 1.08, golden > 0 ? .54 : 0)
    auraW = damp(auraW, auraTarget, 10, dt)
    aura.visible = auraW > 0.02
    if (aura.visible) {
      const flick = 1 + Math.sin(time * 31) * 0.06 + Math.sin(time * 17.3) * 0.05
      aura.position.y = 0.02
      auraOuter.scale.set(auraW * 1.05 * flick, auraW * (1.1 + 0.15 * Math.sin(time * 23)), auraW * 1.05 * flick)
      auraInner.scale.set(auraW * flick, auraW * (1 + 0.12 * Math.sin(time * 29 + 1)), auraW * flick)
      auraOuter.rotation.y = time * 0.6
      auraInner.rotation.y = -time * 0.9
      for (const m of [auraOuter, auraInner]) {
        const u = (m.material as THREE.ShaderMaterial).uniforms
        u.time.value = time
        u.power.value = Math.min(1.6, 0.55 + auraW * 0.8)
      }
      for (const { streak, a, r, speed } of streaks) {
        const t = (time * speed + a) % 1
        const ang = a + time * 0.7
        streak.position.set(Math.cos(ang) * r * auraW, (0.1 + t * 1.9) * auraW, Math.sin(ang) * r * auraW)
        streak.rotation.y = -ang + Math.PI / 2
        streak.scale.set(1, 0.6 + auraW, 1)
        ;(streak.material as THREE.MeshBasicMaterial).opacity = Math.sin(t * Math.PI) * 0.8 * Math.min(1, auraW)
      }
      for (const { spark, a, r, speed } of sparks) {
        const t = (time * speed + a) % 1
        spark.position.set(Math.cos(a + time) * r * (1 + auraW * 0.4), t * 1.6 * Math.max(0.6, auraW), Math.sin(a + time) * r * (1 + auraW * 0.4))
        spark.scale.setScalar((1 - t) * Math.min(1.4, auraW + 0.3))
        spark.rotation.set(time * 3 + a, time * 2, 0)
      }
    }
  }
  animate(0, false)
  return {
    group,
    effects,
    animate,
    settle,
    sit(value: boolean, seat?: Seat) {
      seated = value
      if (value) {
        nextNote = previous + 1.5
        seatedSince = previous
        seatMode = seat?.mode ?? 'fire'
        const height = (seat?.height ?? 0.28) / (group.scale.x || 1)
        seatPelvis = height + 0.075
        seatBack = seatMode === 'bench' ? 0.12 : 0.2
      }
    },
    trainingAnchors(face, fists) {
      face.set(0, HEAD + .032, .115)
      head.localToWorld(face)
      fists.set(0, -FOREARM, .035)
      arms[0].elbow.localToWorld(fists)
    },
    wear(id: string, instant = false) {
      const next = outfitById(id)
      base = next
      golden = 0
      if (instant) {
        dress(next)
        return
      }
      pendingOutfit = next
      changeT = 0
    },
    emote: (kind: Emote) => bubbles.show(kind),
    wave() {
      if (waveT < 0.7) return
      waveT = 0
      bubbles.show('heart')
    },
    onStep(listener) {
      footstep = listener
    },
    umbrella(open: boolean) {
      floating = open
      if (open) brollyScale = 1
    },
    land() {
      floating = false
      landing.kick(-1.2)
      nod.kick(3)
      for (const leg of legs) kickDust(leg.shoe, 1.6)
      bubbles.show('sparkle')
    },
    angler: {
      hold(value: boolean) {
        holding = value
      },
      cast() {
        castT = 0
      },
      tug() {
        tugT = 0
      },
      show(colors, scale = 1) {
        if (trophyMesh) {
          trophy.remove(trophyMesh)
          trophyMesh.geometry.dispose()
          trophyMesh = null
        }
        showing = !!colors
        if (colors) {
          trophyMesh = buildFish(colors)
          trophyMesh.scale.setScalar(scale)
          bubbles.show('sparkle')
        }
      },
      tip(out: THREE.Vector3) {
        return rodTip.getWorldPosition(out)
      },
    },
  }
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
  const lowerBill = joint(head, 0, .068, .20)
  const bill = sculpt(material)
  bill.oval('#d6803d', [0,-.012,.028], [.042,.015,.045])
  bill.mesh(lowerBill)
  const brows = [-1,1].map(side => {
    const brow = sculpt(material)
    brow.oval('#365174', [0,0,0], [.027,.006,.007], [0, 0, side * -.24])
    return brow.mesh(head, [side * .073,.183,.196])
  })
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

  let talking = false
  let speechAge = 0
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
  const bubbles = emotes(group, 1.0)

  return {
    group,
    settle() {},
    emote: (kind: Emote) => bubbles.show(kind),
    talk(speaking) {
      talking = speaking
      speechAge = 0
    },
    wave() {
      greet = 0
      bubbles.show('heart')
    },
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
        if (distance < 4.6 || talking) {
          const bearing = Math.atan2(toPlayer.x, toPlayer.z)
          const offset = angleDelta(home, bearing)
          bodyTarget = talking ? bearing : home + clamp(offset, -1.3, 1.3)
          lookTarget = clamp(angleDelta(yaw, bearing), -0.8, 0.8)
        }
      }
      const close = distance < 2.6
      if (close && !near && !reduced) {
        greet = 0
        bubbles.show('alert')
      }
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
      const before = greet
      greet = Math.min(1, greet + dt / 1.8)
      if (before < 0.55 && greet >= 0.55) bubbles.show('heart')
      bubbles.update(dt)
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
      speechAge += dt
      const emphasis = Math.max(0, Math.sin(speechAge * 3.2))
      const syllable = talking ? Math.max(0, Math.sin(speechAge * 17) * Math.sin(speechAge * 5.4)) : 0
      lowerBill.rotation.x = syllable * .66
      for (const [i, brow] of brows.entries()) {
        brow.position.y = .183 + (talking ? .016 * emphasis * (i === 0 ? .64 : 1) : 0)
        brow.rotation.z = talking ? (i === 0 ? -.19 : .19) * emphasis : 0
      }
      if (talking && !reduced) {
        head.rotation.x -= .12 * emphasis
        wings[1].rotation.z = .21 + 1.25 * emphasis
        wings[0].rotation.x = -.45 * (1 - emphasis)
      } else wings[0].rotation.x = 0
      const happy = !talking && !reduced && (greet < 1 || spin < 1)
      eyes.visible = !happy
      happyEyes.visible = happy
      eyes.scale.y = reduced ? 1 : blink(time)
      shadow.scale.setScalar(1 - hop * 0.5)
    },
  }
}

/* -------------------------------------------------------------------------- */
/* Mochi, the island cat, napping on a bench.                                 */

export function createCat(): IslandCharacter {
  const group = new THREE.Group()
  const material = clay()
  const random = chance(41)
  const fur = '#f2b673'
  const cream = '#fff1dc'
  const body = joint(group)
  const loaf = sculpt(material)
  loaf.oval(fur, [0, 0.12, 0], [0.24, 0.13, 0.17])
  loaf.oval(cream, [0.02, 0.09, 0.1], [0.17, 0.08, 0.08])
  for (const [x, z] of [
    [-0.13, -0.05],
    [0.05, -0.08],
  ])
    loaf.oval('#e39a55', [x, 0.2, z], [0.05, 0.03, 0.07], [0, 0, 0.2])
  for (const side of [-1, 1]) loaf.oval(cream, [0.17, 0.035, side * 0.07], [0.06, 0.03, 0.045])
  loaf.mesh(body)

  const head = joint(body, 0.2, 0.17, 0.02)
  const face = sculpt(material)
  face.oval(fur, [0.05, 0.03, 0], [0.13, 0.11, 0.12])
  face.oval(cream, [0.12, 0.0, 0], [0.06, 0.05, 0.08])
  face.oval('#f08a8a', [0.175, 0.025, 0], [0.012, 0.01, 0.014])
  for (const side of [-1, 1]) {
    face.oval(fur, [0.04, 0.13, side * 0.065], [0.035, 0.055, 0.03], [side * 0.25, 0, -0.15])
    face.oval('#f6b0a0', [0.05, 0.125, side * 0.065], [0.018, 0.035, 0.015], [side * 0.25, 0, -0.15])
    face.oval('#f6a196', [0.14, -0.005, side * 0.07], [0.012, 0.02, 0.025])
  }
  face.mesh(head)
  const closed = sculpt(material)
  const open = sculpt(material)
  for (const side of [-1, 1]) {
    closed.oval(ink, [0.155, 0.045, side * 0.045], [0.006, 0.006, 0.026], [0, 0, 0.3])
    open.oval(ink, [0.155, 0.05, side * 0.045], [0.012, 0.024, 0.016])
    open.oval('#ffffff', [0.165, 0.058, side * 0.045 - 0.004], [0.004, 0.006, 0.005])
  }
  const sleepyEyes = closed.mesh(head)
  const eyes = open.mesh(head)
  eyes.visible = false

  const tail = joint(body, -0.22, 0.08, 0.05)
  const tailShape = sculpt(material)
  tailShape.oval(fur, [0.0, 0, 0.09], [0.04, 0.035, 0.11], [0, 0.4, 0])
  tailShape.oval('#e39a55', [0.07, 0, 0.18], [0.035, 0.03, 0.06], [0, 1.2, 0])
  tailShape.mesh(tail)
  group.name = 'cat'

  const bubbles = emotes(group, 0.55)
  const toPlayer = new THREE.Vector3()
  let previous = 0
  let awake = 0
  let nextSnore = 2
  let nextTwitch = 3
  let twitch = 1
  return {
    group,
    settle() {},
    emote: (kind: Emote) => bubbles.show(kind),
    animate(time, reduced, _move, attention) {
      const dt = Math.min(0.1, Math.max(0, time - previous))
      previous = time
      let near = false
      let bearing = 0
      if (attention) {
        toPlayer.subVectors(attention, group.position)
        near = Math.hypot(toPlayer.x, toPlayer.z) < 2.2
        // The cat's nose points along its local +X: turn the head towards the
        // visitor in that frame.
        group.worldToLocal(toPlayer.copy(attention))
        bearing = Math.atan2(-toPlayer.z, toPlayer.x)
      }
      awake = damp(awake, near ? 1 : 0, near ? 3 : 0.8, dt)
      const breathe = reduced ? 0 : Math.sin(time * (1.6 + awake))
      body.scale.set(1, 1 + 0.035 * breathe, 1 + 0.02 * breathe)
      head.rotation.set(
        0,
        clamp(bearing, -0.9, 0.9) * awake,
        lerp(-0.35, 0.12, awake) + (reduced ? 0 : 0.03 * breathe),
      )
      head.position.y = 0.17 + 0.05 * awake
      eyes.visible = awake > 0.5
      sleepyEyes.visible = !eyes.visible
      if (eyes.visible && !reduced) eyes.scale.y = Math.sin(time * 0.9) > 0.97 ? 0.15 : 1
      if (!reduced && time > nextTwitch) {
        twitch = 0
        nextTwitch = time + 2 + random() * 4
      }
      twitch = Math.min(1, twitch + dt / 0.6)
      const flick = twitch < 1 ? Math.sin(twitch * Math.PI * 3) * (1 - twitch) : 0
      tail.rotation.y = reduced ? 0 : 0.25 * Math.sin(time * (0.8 + awake * 2.5)) + 0.5 * flick
      if (!reduced && awake < 0.2 && time > nextSnore) {
        bubbles.show('sleep')
        nextSnore = time + 3.5 + random() * 2
      }
      bubbles.update(dt)
    },
  }
}
