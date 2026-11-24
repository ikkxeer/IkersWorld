import { createLookout } from './lookout'
import { disposeRadio, positionRadio } from '../audio/beachRadio'
import * as T from 'three'
import { makeSky } from '../environment/sky'
import { makeIris } from './iris'
import { createPostFX } from './postfx'
import { daylight } from '../environment/daylight'
import { bendScene, projectCurved, unbendRay, worldCurve, worldCurveFocus } from './curve'
import { anchors, destinations } from '../data/village'
import { benchSites, campfire, fishingSpot, shape, shrine, radioCove, tideOrgan } from '../data/island'
import { createFishing } from './fishing'
import { organNote, play } from '../audio/sfx'
import { createVisitor, createGuide, createCat, angleDelta } from './character'
import { makeGallery, makeInterior } from './interior'
import { createScenery, islandFloorHeight } from './scenery'
import { walkable, route, type Point } from './navigation'
import type {
  Interior,
  Target,
  VillageEvents,
  VillageController,
  VillageView,
} from './contracts'

export function startVillage(
  canvas: HTMLCanvasElement,
  events: VillageEvents,
  view: VillageView,
): VillageController {
  const low = window.innerWidth < 760 || navigator.hardwareConcurrency <= 4
  const motion = matchMedia('(prefers-reduced-motion: reduce)')
  const iris = makeIris(view.iris)
  const renderer = new T.WebGLRenderer({
    canvas,
    antialias: !low,
    powerPreference: 'default',
  })
  // Resolution adapts to how smoothly frames arrive (see `adapt` in tick).
  const maxRatio = Math.min(devicePixelRatio, low ? 1.25 : 1.65)
  const minRatio = Math.min(maxRatio, low ? 0.75 : 1)
  let pixelRatio = maxRatio
  renderer.setPixelRatio(pixelRatio)
  renderer.shadowMap.enabled = true
  // Almost everything that casts a shadow is static, so the shadow map is
  // refreshed a couple of dozen times a second instead of every frame.
  renderer.shadowMap.autoUpdate = false
  let lastShadow = 0
  let pendingHover: PointerEvent | null = null
  let lastShade: [number, number, number] = [NaN, NaN, NaN]
  renderer.shadowMap.type = T.PCFShadowMap
  renderer.outputColorSpace = T.SRGBColorSpace
  // Neutral tone mapping keeps pastel colours bright and clean instead of
  // the filmic desaturation ACES applies.
  renderer.toneMapping = T.NeutralToneMapping
  renderer.toneMappingExposure = 1.0
  const scene = new T.Scene(),
    camera = new T.OrthographicCamera(-20, 20, 14, -14, 0.1, 160)
  const atmosphere = makeSky(scene, low)
  const lookoutEvents = view.lookout ? createLookout(view.lookout, scene) : null
  const scenery = createScenery(low),
    visitor = createVisitor(view.outfit),
    guide = createGuide(),
    cat = createCat()
  // Mochi naps on the bench by Iker's house.
  cat.group.position.set(-6.2, 0.47, -0.22)
  cat.group.scale.setScalar(1.25)
  scene.add(cat.group)
  let guideSpeaking = false
  let guideFrame = 0
  let guideDestination: Point | null = null
  const [guideX, guideZ] = anchors.npc
  guide.group.position.set(guideX, islandFloorHeight(guideX, guideZ), guideZ)
  // Pip waits beside the path at the foot of the pier, watching new arrivals.
  guide.group.rotation.y = Math.atan2(2.5 - guideX, shape.pierFrom + 0.8 - guideZ)
  guide.group.scale.setScalar(1.4)
  guide.group.userData.zone = 'npc'
  const dust = visitor.effects ?? new T.Group()
  scene.add(scenery.group, visitor.group, guide.group, dust)
  visitor.group.position.set(2.5, -0.06, shape.pierFrom + 1.7)
  visitor.group.scale.setScalar(1.36)
  // An invisible hit area makes the campfire circle clickable and reachable.
  const [fireX, fireZ] = campfire.fire
  const fireSpot = new T.Group()
  fireSpot.position.set(fireX, 0, fireZ)
  fireSpot.userData.zone = 'campfire'
  const fireHit = new T.Mesh(
    new T.CylinderGeometry(1.35, 1.35, 1, 12),
    new T.MeshBasicMaterial({ visible: false }),
  )
  fireHit.position.y = 0.5
  fireSpot.add(fireHit)
  scene.add(fireSpot)
  // The end of the pier is a fishing spot.
  const fishSpot = new T.Group()
  fishSpot.position.set(fishingSpot[0], 0, fishingSpot[1])
  fishSpot.userData.zone = 'fishing'
  const fishHit = new T.Mesh(new T.CylinderGeometry(0.75, 0.75, 1, 10), new T.MeshBasicMaterial({ visible: false }))
  fishHit.position.y = 0.4
  fishSpot.add(fishHit)
  scene.add(fishSpot)
  const fishing = createFishing({
    angler: visitor.angler!,
    emote: (kind) => visitor.emote?.(kind),
    report: (update) => events.angler?.(update),
    waterY: -0.86,
  })
  scene.add(fishing.group)
  // Footsteps sound woody on the pier, bridges and indoor floors.
  visitor.onStep?.((strength) => {
    const p = visitor.group.position
    const wood = !!inside || p.y > 0.14 || p.y < 0
    play(wood ? 'stepWood' : 'step', strength)
  })
  /** Walking out to the end of the pier before casting. */
  const jumpDuration = 0.64
  let jumpTime = jumpDuration
  let organKey = -1
  let anglingWalk = false
  function beginFishing() {
    if (inside || rest) return
    const p = visitor.group.position
    if (Math.hypot(p.x - fishingSpot[0], p.z - fishingSpot[1]) < 0.35) {
      faceYaw = 0
      fishing.begin(p, 0)
      return
    }
    goal = route([p.x, p.z], fishingSpot)
    if (!goal.length) goal = [fishingSpot]
    anglingWalk = true
    ring.visible = false
  }
  const outdoorPickables: T.Object3D[] = [...scenery.interactives, guide.group, fireSpot, fishSpot]

  /* ------------------------- Arrival from the sky ------------------------ */
  // The visitor drifts down through a cloud bank under an umbrella and lands
  // softly on the pier. Skipped with reduced motion or a deep link.
  const FALL = 4.8
  const FALL_HEIGHT = 24
  const landingSpot = new T.Vector3(2.5, islandFloorHeight(2.5, shape.pierFrom + 1.7), shape.pierFrom + 1.7)
  let landed = motion.matches || !!view.skipIntro
  let fallT = landed ? FALL + 3 : 0
  /** Title screen ("attract mode"): the island turns slowly until start. */
  let attract = !!view.title
  const cloudBank = new T.Group()
  const cloudPuff = new T.IcosahedronGeometry(1, 2)
  const cloudMaterial = new T.MeshLambertMaterial({
    color: '#ffffff',
    emissive: '#eef3ff',
    emissiveIntensity: 0.55,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
  })
  for (let i = 0; i < 22; i++) {
    const a = i * 2.4,
      r = 2.2 + ((i * 0.618) % 1) * 4.5
    const cluster = new T.Group()
    cluster.position.set(landingSpot.x + Math.cos(a) * r, 5 + ((i * 0.37) % 1) * 17, landingSpot.z + Math.sin(a) * r * 0.7)
    for (let j = 0; j < 4; j++) {
      const puff = new T.Mesh(cloudPuff, cloudMaterial)
      puff.position.set((j - 1.5) * 0.9, Math.sin(j * 1.7) * 0.3, Math.cos(j * 2.3) * 0.4)
      puff.scale.set(1.1 + (j % 2) * 0.5, 0.75 + (j % 3) * 0.2, 1)
      cluster.add(puff)
    }
    cluster.scale.setScalar(0.8 + ((i * 0.29) % 1) * 0.9)
    cloudBank.add(cluster)
  }
  cloudBank.visible = !landed && !attract
  scene.add(cloudBank)
  const landingShadow = new T.Mesh(
    new T.CircleGeometry(0.42, 24),
    new T.MeshBasicMaterial({ color: '#24382e', transparent: true, opacity: 0, depthWrite: false }),
  )
  landingShadow.rotation.x = -Math.PI / 2
  landingShadow.position.set(landingSpot.x, landingSpot.y + 0.03, landingSpot.z)
  scene.add(landingShadow)
  function skipArrival() {
    attract = false
    if (landed) return
    fallT = FALL + 3
    landed = true
    visitor.umbrella?.(false)
    visitor.group.rotation.z = 0
    cloudBank.visible = false
    landingShadow.visible = false
  }
  /** Teleport to a spot (through the iris), facing a point, with a hop. */
  function jump(stand: [number, number], look: [number, number], arrived?: () => void) {
    const move = () => {
      jumpTime = jumpDuration
      const [x, z] = stand
      visitor.group.position.set(x, islandFloorHeight(x, z), z)
      goal = []
      keys.clear()
      stick.set(0, 0)
      velocity.set(0, 0)
      rest = null
      training = null
      fishing.cancel()
      visitor.settle()
      snapCamera = true
      setHover(null)
      visitor.group.rotation.y = Math.atan2(look[0] - x, look[1] - z)
      updateReach()
    }
    // A quick hop and sparkle on arrival makes travelling feel magical.
    const pop = () => {
      visitor.land?.()
      play('land')
    }
    if (inside) crossDoor(false, () => (move(), pop()), arrived)
    else if (motion.matches) {
      move()
      arrived?.()
    } else
      iris.start(() => {
        move()
        pop()
      }, arrived)
  }
  /** Seats: where to sit, which way to face and where to step off. Logs
   * around the campfire face the fire; every bench faces out from its back. */
  const fireSeats = campfire.logs.map(([dx, dz]) => {
    const lx = fireX + dx,
      lz = fireZ + dz
    const yaw = Math.atan2(fireX - lx, fireZ - lz)
    const ux = Math.sin(yaw),
      uz = Math.cos(yaw)
    return {
      x: lx + ux * 0.27,
      z: lz + uz * 0.27,
      yaw,
      out: [lx - ux * 0.66, lz - uz * 0.66] as [number, number],
      height: 0.28,
      mode: 'fire' as 'fire' | 'bench',
    }
  })
  const benchSeats = benchSites.map(([bx, bz], i) => {
    // Mochi naps on the left of the first bench: sit beside her.
    const x = bx + (i === 0 ? 0.36 : 0)
    return { x, z: bz + 0.17, yaw: 0, out: [x, bz + 0.88] as [number, number], height: 0.37, mode: 'bench' as const }
  })
  const seats = [...fireSeats, ...benchSeats]
  type Seat = (typeof seats)[number]
  // Invisible hit areas make every bench clickable and reachable.
  const benchSpots = benchSites.map(([bx, bz], i) => {
    const spot = new T.Group()
    spot.position.set(bx, 0, bz)
    spot.userData.zone = benchSites[i] === radioCove.bench ? 'lookout' : 'bench'
    spot.userData.project = fireSeats.length + i
    const hit = new T.Mesh(new T.BoxGeometry(1.5, 1, 0.9), new T.MeshBasicMaterial({ visible: false }))
    hit.position.y = 0.5
    spot.add(hit)
    scene.add(spot)
    return spot
  })
  outdoorPickables.push(...benchSpots)

  /* ------------------------ Mountain shrine: training ------------------- */
  const [ringX, ringZ] = shrine.center
  const ringSpot = new T.Group()
  ringSpot.position.set(ringX, 0, ringZ)
  ringSpot.userData.zone = 'dojo'
  const ringHit = new T.Mesh(new T.CylinderGeometry(shrine.radius, shrine.radius, 0.6, 8), new T.MeshBasicMaterial({ visible: false }))
  ringHit.position.y = 0.3
  ringSpot.add(ringHit)
  const gongSpot = new T.Group()
  gongSpot.position.set(shrine.gong[0], 0, shrine.gong[1])
  gongSpot.userData.zone = 'gong'
  const gongHit = new T.Mesh(new T.BoxGeometry(0.5, 1.5, 1.1), new T.MeshBasicMaterial({ visible: false }))
  gongHit.position.y = 0.75
  gongSpot.add(gongHit)
  scene.add(ringSpot, gongSpot)
  outdoorPickables.push(ringSpot, gongSpot)
  // Pebbles that lift off the ring while energy gathers.
  const pebbles = new T.InstancedMesh(new T.IcosahedronGeometry(1, 0), new T.MeshStandardMaterial({ color: '#b9ad9c', roughness: 0.9 }), 12)
  pebbles.castShadow = true
  pebbles.frustumCulled = false
  const pebbleSeeds = Array.from({ length: pebbles.count }, (_, i) => ({
    a: (i / pebbles.count) * Math.PI * 2 + (i % 3) * 0.3,
    r: 0.75 + (i % 4) * 0.15,
    s: 0.05 + (i % 3) * 0.025,
    h: 0.5 + (i % 5) * 0.18,
  }))
  const pebbleProxy = new T.Object3D()
  const shockwave = new T.Mesh(
    new T.RingGeometry(0.85, 1, 48),
    new T.MeshBasicMaterial({ color: '#ffe08a', transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }),
  )
  shockwave.rotation.x = -Math.PI / 2
  shockwave.position.set(ringX, 0.26, ringZ)
  const ringLight = new T.PointLight('#ffcf5a', 0, 7, 1.6)
  ringLight.position.set(ringX, 1.2, ringZ)
  scene.add(pebbles, shockwave, ringLight)
  /** Training: walk to the centre of the ring, then the power-up. */
  let training: { stage: 'walk' | 'power'; t: number } | null = null
  function beginTraining() {
    if (training || inside || rest) return
    const p = visitor.group.position
    training = { stage: 'walk', t: 0 }
    goal = route([p.x, p.z], [ringX, ringZ])
    if (!goal.length) goal = [[ringX, ringZ]]
    ring.visible = false
  }
  function placePebbles(lift: number, time: number) {
    pebbleSeeds.forEach(({ a, r, s, h }, i) => {
      const up = lift * h
      pebbleProxy.position.set(
        ringX + Math.cos(a + up * 0.6) * r,
        0.25 + up + Math.sin(time * 3 + i) * 0.04 * lift,
        ringZ + Math.sin(a + up * 0.6) * r,
      )
      pebbleProxy.rotation.set(time * lift + i, time * 0.7 * lift + i, 0)
      pebbleProxy.scale.setScalar(s)
      pebbleProxy.updateMatrix()
      pebbles.setMatrixAt(i, pebbleProxy.matrix)
    })
    pebbles.instanceMatrix.needsUpdate = true
  }
  placePebbles(0, 0)
  let shake = 0
  let catReplyAt = -1
  /** Turn to face an interactive object (e.g. the wardrobe). */
  function faceTowards(zone: string) {
    const o = getPickables().find((item) => item.userData.zone === zone)
    if (!o) return
    o.getWorldPosition(nearestPoint)
    const p = visitor.group.position
    faceYaw = Math.atan2(nearestPoint.x - p.x, nearestPoint.z - p.z)
  }
  /** Sitting by the fire: walk to the log, hop on, sit, and hop back off. */
  let rest: {
    seat: Seat
    stage: 'approach' | 'hop' | 'seated' | 'rise' | 'leave'
    timer: number
    from: [number, number]
  } | null = null
  let lookout = 0
  let skyReveal = 0
  let cozy = 0
  let running = false
  /** A tree the visitor is walking over to shake, and where to face. */
  let pendingShake: [number, number] | null = null
  let faceYaw: number | null = null
  function shakeTree(x: number, z: number) {
    const tree = scenery.shake(x, z)
    if (!tree) return false
    play('rustle')
    const p = visitor.group.position
    faceYaw = Math.atan2(tree[0] - p.x, tree[1] - p.z)
    return true
  }
  /** Did a click land on a tree crown? Returns that tree. */
  function crownAt(clientX: number, clientY: number) {
    const box = canvas.getBoundingClientRect()
    const x = clientX - box.left,
      y = clientY - box.top
    let hit: [number, number, number] | null = null
    for (const crown of scenery.crowns) {
      const [cx, cz, top] = crown
      projectCurved(projected.set(cx, top, cz), camera)
      const sx = ((projected.x + 1) * box.width) / 2,
        sy = ((1 - projected.y) * box.height) / 2
      projectCurved(projected.set(cx + 1, top, cz), camera)
      const radius = Math.abs(((projected.x + 1) * box.width) / 2 - sx) * 0.9
      if (Math.hypot(x - sx, y - sy) < radius) hit = crown
    }
    return hit
  }
  function beginRest(index?: number) {
    if (rest || inside) return
    const p = visitor.group.position
    const usable = index !== undefined && seats[index] ? [seats[index]] : fireSeats.filter((s) => canWalk(...s.out))
    if (!usable.length) return
    const seat = usable.reduce((best, s) =>
      Math.hypot(s.out[0] - p.x, s.out[1] - p.z) < Math.hypot(best.out[0] - p.x, best.out[1] - p.z) ? s : best,
    )
    rest = { seat, stage: 'approach', timer: 0, from: [p.x, p.z] }
    goal = route([p.x, p.z], seat.out)
    if (!goal.length) goal = [seat.out]
    ring.visible = false
  }
  function standUp() {
    if (!rest || (rest.stage !== 'seated' && rest.stage !== 'hop')) return
    visitor.sit?.(false)
    rest.stage = 'rise'
    rest.timer = 0
  }
  const rooms = { about: makeInterior(), tech: makeGallery() }
  let inside: Interior = false
  let snapCamera = false
  const doorstep = new T.Vector3()
  const getPickables = () => (inside ? rooms[inside].interactives : outdoorPickables)
  function canWalk(x: number, z: number) {
    if (!inside) return walkable(x, z)
    if (Math.abs(x) >= 3.6 || Math.abs(z) >= 2.62) return false
    if (inside === 'tech') return z > -1.1
    return !(x < -2.38 && z > -1.7 && z < 0.83) &&
      !(x > 1.72 && z < -1.65) &&
      Math.hypot(x - 0.12, z + 1.62) > 0.58 &&
      Math.hypot(x - 3.35, z - 0.4) > 0.38 &&
      !(x > -2.55 && x < -1.05 && z < -2.15)
  }
  function setInside(value: Interior) {
    if (inside === value) return
    jumpTime = jumpDuration
    if (value) doorstep.copy(visitor.group.position)
    inside = value
    snapCamera = true
    const destination = value ? rooms[value].scene : scene
    destination.add(visitor.group, dust)
    velocity.set(0, 0)
    rest = null
    fishing.cancel()
    visitor.settle()
    if (value) visitor.group.position.set(0, 0, 1.16)
    else visitor.group.position.copy(doorstep)
    visitor.group.rotation.y = value ? Math.PI : 0
    goal = []
    keys.clear()
    stick.set(0, 0)
    setHover(null)
    updateReach()
    events.inside(value)
  }
  const ray = new T.Raycaster(),
    pointer = new T.Vector2(),
    point = new T.Vector3()
  const plane = new T.Plane(new T.Vector3(0, 1, 0), 0)
  const nearestPoint = new T.Vector3()
  const projected = new T.Vector3()
  const ring = new T.Mesh(
    new T.RingGeometry(0.35, 0.43, 35),
    new T.MeshBasicMaterial({
      color: '#fff1a3',
      transparent: true,
      opacity: 0.86,
      side: T.DoubleSide,
      depthWrite: false,
    }),
  )
  ring.rotation.x = -Math.PI / 2
  ring.visible = false
  const exhibitHalo = new T.Mesh(
    new T.TorusGeometry(0.84, 0.038, 8, 42),
    new T.MeshBasicMaterial({
      color: '#ffe799',
      transparent: true,
      opacity: 0.98,
    }),
  )
  exhibitHalo.rotation.x = -Math.PI / 2
  exhibitHalo.visible = false
  const guideMarker = new T.Mesh(
    new T.OctahedronGeometry(0.14),
    new T.MeshBasicMaterial({ color: '#fff2bc' }),
  )
  guideMarker.position.y = 1.34
  guide.group.add(guideMarker)
  scene.add(ring, exhibitHalo)
  const focus = new T.Vector3(0, 0, 0),
    desired = new T.Vector3(),
    cameraOffset = new T.Vector3(8, 19, 27)
  const keys = new Set<string>(),
    stick = new T.Vector2()
  const right = new T.Vector2(27, -8).normalize(),
    forward = new T.Vector2(-8, -27).normalize(),
    step = new T.Vector2(),
    wish = new T.Vector2(),
    velocity = new T.Vector2(),
    steerTarget = new T.Vector3()
  let paused = false,
    zoom = 1,
    reach: Target | null = null,
    project: number | undefined
  let goal: Point[] = [],
    elapsed = 0,
    last = 0,
    night = atmosphere.update(new Date()),
    lastLight = 0,
    lastHud = -1,
    frame = 0,
    dead = false
  let hovered: T.Object3D | null = null,
    nearObject: T.Object3D | null = null
  // Bloom, tilt-shift and grading on capable devices; modest ones render
  // straight to the screen.
  const post = low ? null : createPostFX(renderer, scene, camera)
  /** 1 around sunrise and sunset: warms the grade and the bloom. */
  const goldenHour = () => {
    const { hour } = daylight(new Date())
    return Math.max(0, 1 - Math.abs(hour - 7) / 1.6, 1 - Math.abs(hour - 18.7) / 1.7)
  }
  let golden = goldenHour()
  const resize = () => {
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false)
    post?.setSize(canvas.clientWidth, canvas.clientHeight, pixelRatio)
    camera.updateProjectionMatrix()
  }
  const observer = new ResizeObserver(resize)
  observer.observe(canvas)
  resize()
  const signal = new AbortController()
  function resolve(e: PointerEvent) {
    const box = canvas.getBoundingClientRect()
    pointer.set(
      ((e.clientX - box.left) / box.width) * 2 - 1,
      (-(e.clientY - box.top) / box.height) * 2 + 1,
    )
    ray.setFromCamera(pointer, camera)
    unbendRay(ray.ray, camera)
    let o: T.Object3D | null =
      ray.intersectObjects(getPickables(), true)[0]?.object ?? null
    while (o && !o.userData.zone) o = o.parent
    return o
  }
  function setHover(o: T.Object3D | null) {
    if (hovered === o) return
    hovered = o
    const zone: Target | null = o?.userData.zone ?? null
    events.hover(zone, o?.userData.project)
    canvas.style.cursor = zone ? 'pointer' : 'crosshair'
  }
  canvas.addEventListener(
    'pointermove',
    (e) => {
      // Picking is done once per frame in tick, not for every mouse event.
      if (!paused && !attract && !iris.active() && e.pointerType !== 'touch') pendingHover = e
    },
    { signal: signal.signal },
  )
  canvas.addEventListener('pointerleave', () => ((pendingHover = null), setHover(null)), {
    signal: signal.signal,
  })
  let down: [number, number] = [0, 0]
  canvas.addEventListener(
    'pointerdown',
    (e) => {
      down = [e.clientX, e.clientY]
    },
    { signal: signal.signal },
  )
  canvas.addEventListener(
    'pointerup',
    (e) => {
      if (
        paused ||
        !landed ||
        iris.active() ||
        e.button !== 0 ||
        Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 12
      )
        return
      // Popping the gift balloon takes priority over everything else.
      const drifting = inside ? null : scenery.balloon()
      if (drifting) {
        const box = canvas.getBoundingClientRect()
        projectCurved(projected.set(drifting.position.x, drifting.position.y + 0.9, drifting.position.z), camera)
        const sx = ((projected.x + 1) * box.width) / 2,
          sy = ((1 - projected.y) * box.height) / 2
        if (Math.hypot(e.clientX - box.left - sx, e.clientY - box.top - sy) < 70 && scenery.popBalloon()) {
          play('pop')
          visitor.emote?.('heart')
          events.gift?.(Math.floor(Math.random() * 6))
          return
        }
      }
      const o = resolve(e)
      if (fishing.active()) {
        fishing.press()
        return
      }
      if (rest && rest.stage !== 'approach') {
        standUp()
        return
      }
      if (o) {
        activate(o.userData.zone, o.userData.project)
        return
      }
      const crown = inside ? null : crownAt(e.clientX, e.clientY)
      if (crown) {
        const p = visitor.group.position
        const [cx, cz] = crown
        const d = Math.hypot(cx - p.x, cz - p.z)
        if (d < 1.6) shakeTree(p.x, p.z)
        else {
          // Walk up to the trunk first, then give it a shake.
          const k = 1.05 / d
          goal = route([p.x, p.z], [cx + (p.x - cx) * k, cz + (p.z - cz) * k])
          pendingShake = goal.length ? [cx, cz] : null
        }
        return
      }
      pendingShake = null
      if (ray.ray.intersectPlane(plane, point))
        goal = inside
          ? canWalk(point.x, point.z)
            ? [[point.x, point.z]]
            : []
          : route(
              [visitor.group.position.x, visitor.group.position.z],
              [point.x, point.z],
            )
      if (goal.length) {
        ring.position.set(point.x, 0.09, point.z)
        ring.visible = true
      }
    },
    { signal: signal.signal },
  )
  const changeZoom = (n: number) => {
    zoom = T.MathUtils.clamp(zoom + n, 0.7, 1.65)
  }
  canvas.addEventListener(
    'wheel',
    (e) => {
      if (!paused && !iris.active()) {
        e.preventDefault()
        changeZoom(-Math.sign(e.deltaY) * 0.09)
      }
    },
    { passive: false, signal: signal.signal },
  )
  const movement = [
    'KeyA',
    'KeyD',
    'KeyW',
    'KeyS',
    'ArrowUp',
    'ArrowDown',
    'ArrowLeft',
    'ArrowRight',
  ]
  function crossDoor(
    enter: Interior,
    afterSwap?: () => void,
    arrived?: () => void,
  ) {
    if (iris.active() || enter === inside) return
    skipArrival()
    goal = []
    keys.clear()
    stick.set(0, 0)
    setHover(null)
    iris.start(() => {
      if (enter) {
        const [x, z] = destinations[enter]
        visitor.group.position.set(x, 0, z)
      }
      setInside(enter)
      afterSwap?.()
    }, arrived)
  }
  function activate(target: Target, exhibit?: number) {
    if (jumpTime < jumpDuration) return
    if (target === 'wardrobe') {
      faceTowards(target)
      events.wardrobe?.()
    } else if (target === 'rise') standUp()
    else if (target === 'bench' || target === 'lookout') {
      if (rest) standUp()
      else beginRest(exhibit)
    } else if (target === 'dojo') {
      beginTraining()
    } else if (target === 'gong') {
      faceTowards('gong')
      play('gong')
      visitor.emote?.('note')
      shake = Math.max(shake, 0.25)
    } else if (target === 'fishing') {
      if (fishing.active()) fishing.press()
      else beginFishing()
    } else if (target === 'campfire') {
      if (rest) standUp()
      else beginRest()
    } else if (target === 'exit') crossDoor(false)
    else if ((target === 'about' || target === 'tech') && !inside) crossDoor(target)
    else events.open(target, exhibit)
  }
  /** Wave hello; Pip waves back when he can see you. */
  let pipReplyAt = -1
  function greet() {
    if (paused || iris.active() || !landed || fishing.active() || (rest && rest.stage !== 'seated')) return
    visitor.wave?.()
    play('wave')
    const p = visitor.group.position
    if (!inside && Math.hypot(p.x - guide.group.position.x, p.z - guide.group.position.z) < 5.5) pipReplyAt = elapsed + 0.6
  }
  function interact() {
    if (paused || iris.active() || !landed) return
    if (fishing.active()) fishing.press()
    else if (rest && rest.stage !== 'approach') standUp()
    else if (reach) activate(reach, project)
    else if (!inside) shakeTree(visitor.group.position.x, visitor.group.position.z)
  }
  window.addEventListener(
    'keydown',
    (e) => {
      if (
        paused ||
        iris.active() ||
        e.altKey ||
        e.ctrlKey ||
        e.metaKey ||
        e.target instanceof HTMLSelectElement
      )
        return
      if (e.code === 'Space' && !attract && landed &&
          !(e.target instanceof HTMLElement && e.target.closest('button, input, textarea, select, a, [contenteditable=true]'))) {
        e.preventDefault()
        if (!e.repeat && jumpTime >= jumpDuration && !rest && !training && !fishing.active() && !anglingWalk)
          jumpTime = 0
      }
      if (e.key === 'Shift') running = true
      if (movement.includes(e.code)) {
        e.preventDefault()
        keys.add(e.code)
        if (rest?.stage === 'seated') standUp()
        fishing.cancel()
      }
      if (e.code === 'KeyE' && !e.repeat) interact()
      if (e.code === 'KeyQ' && !e.repeat) greet()
      if (e.code === 'Equal') changeZoom(0.1)
      if (e.code === 'Minus') changeZoom(-0.1)
    },
    { signal: signal.signal },
  )
  window.addEventListener('keyup', (e) => {
    keys.delete(e.code)
    if (e.key === 'Shift') running = false
  }, {
    signal: signal.signal,
  })
  window.addEventListener(
    'blur',
    () => {
      keys.clear()
      stick.set(0, 0)
    },
    { signal: signal.signal },
  )
  canvas.addEventListener(
    'webglcontextlost',
    (e) => {
      e.preventDefault()
      events.fail()
    },
    { signal: signal.signal },
  )
  // Frame pacing: drop the pixel ratio a notch when frames run long, and win
  // it back once things are smooth again.
  let sampleStart = 0,
    samples = 0,
    lastAdapt = 0
  function adapt(stamp: number) {
    if (paused || document.hidden) return
    if (!sampleStart) sampleStart = stamp
    samples++
    const elapsedMs = stamp - sampleStart
    if (elapsedMs < 2000) return
    const average = elapsedMs / samples
    sampleStart = stamp
    samples = 0
    const target = low ? 33 : 17
    if (stamp - lastAdapt < 3000) return
    let next = pixelRatio
    if (average > target * 1.45) next = Math.max(minRatio, pixelRatio - 0.2)
    else if (average < target * 1.1) next = Math.min(maxRatio, pixelRatio + 0.1)
    if (Math.abs(next - pixelRatio) > 0.01) {
      pixelRatio = next
      lastAdapt = stamp
      renderer.setPixelRatio(pixelRatio)
      resize()
    }
  }
  function updateReach(force = true) {
    const previous = nearObject
    const p = visitor.group.position
    let best = Infinity
    reach = null
    project = undefined
    nearObject = null
    for (const o of getPickables()) {
      const zone = o.userData.zone as Target
      if (!zone) continue
      o.getWorldPosition(nearestPoint)
      const dx = p.x - nearestPoint.x,
        dz = p.z - nearestPoint.z,
        dist = Math.hypot(dx, dz)
      const limit = inside
        ? 1.45
        : zone === 'projects' ||
            zone === 'npc' ||
            zone === 'map' ||
            zone === 'contact' || zone === 'radio'
          ? 1.8
          : zone === 'campfire'
            ? 2.3
            : zone === 'fishing'
              ? 1.6
              : zone === 'bench' || zone === 'lookout'
                ? 1.8
                : zone === 'dojo'
                  ? 2.7
                  : zone === 'gong'
                    ? 1.4
                    : 3.5
      if (rest || fishing.active() || training?.stage === 'power') break
      // The campfire circle is wide: measure from its rim, not its centre.
      const effective = zone === 'campfire' ? dist - 0.75 : dist
      if (dist <= limit && effective < best) {
        nearObject = o
        reach = zone
        best = effective
        project = o.userData.project
      }
    }
    if (rest?.stage === 'seated') reach = 'rise'
    // Nothing to interact with mid-transition: hide the prompt during wipes.
    if (iris.active()) {
      reach = null
      project = undefined
      nearObject = null
    }
    if (force || previous !== nearObject)
      events.position(
        inside ? doorstep.x : p.x,
        inside ? doorstep.z : p.z,
        reach,
        project,
      )
  }
  // Per-frame cost, read by the development hook (window.__island.perf).
  renderer.info.autoReset = false
  const perf = { cpu: 0, calls: 0, triangles: 0, frames: 0 }
  function tick(stamp: number) {
    if (dead || document.hidden) return
    frame = requestAnimationFrame(tick)
    if (last && stamp - last < (paused && !iris.active() ? 100 : low ? 31 : 15))
      return
    const started = performance.now()
    renderer.info.reset()
    if (pendingHover) {
      if (!paused && !iris.active()) setHover(resolve(pendingHover))
      pendingHover = null
    }
    iris.advance(stamp)
    adapt(stamp)
    const dt = Math.min(0.14, Math.max(0, (stamp - (last || stamp)) / 1000))
    last = stamp
    elapsed += dt
    if (stamp - lastLight > 8000) {
      night = atmosphere.update(new Date())
      golden = goldenHour()
      lastLight = stamp
    }
    const p = visitor.group.position
    let distance = 0,
      turn = 0
    const pace = (inside ? 2.6 : 3.1) * (running && !inside ? 1.75 : 1)
    // Touch controls can get up from the fire or reel in, like the keys do.
    if (stick.lengthSq() > 0.09 && !paused) {
      if (rest?.stage === 'seated') standUp()
      fishing.cancel()
    }
    const free = (!rest || rest.stage === 'approach') && !fishing.active() && landed && training?.stage !== 'power'
    wish.set(0, 0)
    if (!paused && !iris.active() && free) {
      const dx =
        Number(keys.has('KeyD') || keys.has('ArrowRight')) -
        Number(keys.has('KeyA') || keys.has('ArrowLeft')) +
        stick.x
      const dz =
        Number(keys.has('KeyW') || keys.has('ArrowUp')) -
        Number(keys.has('KeyS') || keys.has('ArrowDown')) -
        stick.y
      step.copy(right).multiplyScalar(dx).addScaledVector(forward, dz)
      if (step.lengthSq() > 0.001) {
        goal = []
        ring.visible = false
        rest = null
        pendingShake = null
        faceYaw = null
        anglingWalk = false
        if (training?.stage === 'walk') training = null
        wish.copy(step)
        if (wish.lengthSq() > 1) wish.normalize()
        wish.multiplyScalar(pace)
      } else {
        // Waypoints are released a little early so corners are rounded off.
        while (
          goal.length > 1 &&
          Math.hypot(goal[0][0] - p.x, goal[0][1] - p.z) < 0.3
        )
          goal.shift()
        if (goal.length) {
          wish.set(goal[0][0] - p.x, goal[0][1] - p.z)
          const remaining = wish.length()
          if (goal.length === 1 && remaining < 0.04) {
            goal.shift()
            wish.set(0, 0)
          } else {
            // Ease off over the last stretch instead of stopping dead.
            const brake =
              goal.length === 1 ? T.MathUtils.clamp(remaining / 0.75, 0.3, 1) : 1
            wish.setLength(pace * brake)
          }
        }
      }
    }
    // Accelerate and brake over a fraction of a second so starts, stops and
    // changes of direction carry a little weight.
    const speeding = wish.lengthSq() >= velocity.lengthSq()
    const response = 1 - Math.exp(-dt * (speeding ? 9 : 12))
    velocity.x += (wish.x - velocity.x) * response
    velocity.y += (wish.y - velocity.y) * response
    if (wish.lengthSq() === 0 && velocity.lengthSq() < 0.01) velocity.set(0, 0)
    if (velocity.lengthSq() > 0 && free) {
      step.copy(velocity).multiplyScalar(dt)
      if (goal.length === 1) {
        const remaining = Math.hypot(goal[0][0] - p.x, goal[0][1] - p.z)
        if (step.length() > remaining) step.setLength(remaining)
      }
      const ox = p.x,
        oz = p.z
      if (canWalk(p.x + step.x, p.z)) p.x += step.x
      else velocity.x = 0
      if (canWalk(p.x, p.z + step.y)) p.z += step.y
      else velocity.y = 0
      step.set(p.x - ox, p.z - oz)
      distance = step.length()
      if (goal.length && wish.lengthSq() > 0 && distance < 0.0002) goal = []
    }
    let speed = distance > 0.0002 ? Math.min(velocity.length(), distance / Math.max(dt, 1e-3)) : 0
    if (velocity.length() > 0.2) {
      // Turn progressively towards the direction of travel.
      const rot = visitor.group.rotation.y
      turn = angleDelta(rot, Math.atan2(velocity.x, velocity.y))
      const turned = turn * (1 - Math.exp(-dt * 11))
      visitor.group.rotation.y = rot + turned
      turn -= turned
    }
    // Campfire: arrive at the log, hop on, sit; on any input, hop back off.
    let hopLift = 0
    if (rest && !paused) {
      const seat = rest.seat
      rest.timer += dt
      if (rest.stage === 'approach' && !goal.length) {
        if (Math.hypot(seat.out[0] - p.x, seat.out[1] - p.z) < 0.35) {
          rest.stage = 'hop'
          rest.timer = 0
          rest.from = [p.x, p.z]
        } else rest = null
      }
      if (rest && rest.stage !== 'approach') {
        velocity.set(0, 0)
        const leaving = rest.stage === 'leave'
        const hopping = rest.stage === 'hop' || leaving
        const t = Math.min(1, rest.timer / 0.5)
        if (hopping) {
          const k = t * t * (3 - 2 * t)
          const [ax, az] = leaving ? [seat.x, seat.z] : rest.from
          const [bx, bz] = leaving ? seat.out : [seat.x, seat.z]
          const ox = p.x,
            oz = p.z
          p.x = ax + (bx - ax) * k
          p.z = az + (bz - az) * k
          hopLift = Math.sin(Math.PI * t) * 0.26
          distance = Math.hypot(p.x - ox, p.z - oz)
        }
        const facing = leaving ? Math.atan2(seat.out[0] - seat.x, seat.out[1] - seat.z) : seat.yaw
        visitor.group.rotation.y += angleDelta(visitor.group.rotation.y, facing) * (1 - Math.exp(-dt * 12))
        if (rest.stage === 'hop' && t >= 1) {
          rest.stage = 'seated'
          visitor.sit?.(true, { height: seat.height, mode: seat.mode })
          if (seat === benchSeats[0]) catReplyAt = elapsed + 1.1
          play('sit')
        } else if (rest.stage === 'rise' && rest.timer > 0.4) {
          rest.stage = 'leave'
          rest.timer = 0
        } else if (leaving && t >= 1) rest = null
      }
    }
    cozy = T.MathUtils.damp(cozy, rest?.stage === 'seated' || fishing.active() || training?.stage === 'power' ? 1 : 0, 1.6, dt)
    if (jumpTime < jumpDuration && !paused && !iris.active()) {
      jumpTime = Math.min(jumpDuration, jumpTime + dt)
      if (jumpTime === jumpDuration) play('land')
    }
    const jumpPhase = jumpTime / jumpDuration
    const jumpHeight = 3.6 * jumpPhase * (1 - jumpPhase)
    const key = !inside && !attract && landed && jumpTime === jumpDuration
      ? tideOrgan.pads.findIndex(pad => Math.hypot(pad.x - p.x, pad.z - p.z) < 0.43) : -1
    if (key !== organKey) {
      organKey = key
      scenery.lightOrganKey(key)
      if (key >= 0) organNote(tideOrgan.pads[key].hz)
    }
    const onRug = Math.abs(p.x) < 1.73 && Math.abs(p.z - 0.1) < 1.27
    p.y = (inside ? (inside === 'about' && onRug ? 0.09 : 0.01) : islandFloorHeight(p.x, p.z)) + hopLift + jumpHeight
    // Shrine training: arrive in the centre of the ring, face the camera, power up.
    if (training && !paused) {
      training.t += dt
      if (training.stage === 'walk' && !goal.length) {
        if (Math.hypot(ringX - p.x, ringZ - p.z) < 0.5) {
          training = { stage: 'power', t: 0 }
          faceYaw = Math.atan2(cameraOffset.x, cameraOffset.z)
          visitor.powerUp?.()
          play('charge')
        } else training = null
      }
      if (training?.stage === 'power') {
        const t = training.t
        const lift = t < 2.8 ? T.MathUtils.smoothstep(t, 0.4, 2.6) : Math.max(0, 1 - (t - 2.8) / 0.9)
        placePebbles(lift, elapsed)
        shake = Math.max(shake, t < 2.8 ? 0.12 * lift : 0)
        ringLight.intensity = (t < 2.8 ? 4 * lift : 14 * Math.max(0, 1 - (t - 2.8) / 1.2)) * (motion.matches ? 0.4 : 1)
        if (t >= 2.8 && t - dt < 2.8) {
          play('burst')
          shake = motion.matches ? 0 : 0.9
          shockwave.material.opacity = 0.9
          shockwave.scale.setScalar(0.4)
          visitor.emote?.('sparkle')
        }
        if (t > 4.6) {
          training = null
          ringLight.intensity = 0
          placePebbles(0, elapsed)
        }
      }
    }
    if (shockwave.material.opacity > 0) {
      shockwave.scale.multiplyScalar(1 + dt * 4.5)
      shockwave.material.opacity = Math.max(0, shockwave.material.opacity - dt * 1.1)
    }
    shake = Math.max(0, shake - dt * 1.4)
    if (anglingWalk && !goal.length) {
      anglingWalk = false
      if (Math.hypot(fishingSpot[0] - p.x, fishingSpot[1] - p.z) < 0.4) {
        faceYaw = 0
        fishing.begin(p, 0)
      }
    }
    // The campfire crackles when you're close.
    if (!inside && !paused) {
      const nearFire = Math.hypot(p.x - fireX, p.z - fireZ)
      if (nearFire < 5 && Math.random() < dt * 2.2) play('crackle', 1 - nearFire / 5)
    }
    // A panel open over the game pauses the fish too, so it never escapes
    // while someone is reading.
    if (!paused) fishing.update(dt, elapsed)
    if (pendingShake && !goal.length) {
      const [sx, sz] = pendingShake
      pendingShake = null
      if (Math.hypot(sx - p.x, sz - p.z) < 1.7) shakeTree(p.x, p.z)
    }
    if (faceYaw !== null && speed < 0.05) {
      const delta = angleDelta(visitor.group.rotation.y, faceYaw)
      visitor.group.rotation.y += delta * (1 - Math.exp(-dt * 10))
      turn = delta
      if (Math.abs(delta) < 0.02) faceYaw = null
    }
    if (rest && rest.stage !== 'approach') speed = distance / Math.max(dt, 1e-3)
    visitor.group.visible = !attract
    landingShadow.visible = !attract && !landed
    if (!landed && !inside) {
      if (fallT === 0) visitor.umbrella?.(true)
      if (!paused && !attract) fallT += dt
      const u = Math.min(1, fallT / FALL)
      const left = 1 - u
      p.set(
        landingSpot.x + Math.sin(fallT * 1.7) * 0.7 * left,
        landingSpot.y + FALL_HEIGHT * left ** 1.7,
        landingSpot.z + Math.cos(fallT * 1.3) * 0.3 * left,
      )
      visitor.group.rotation.y = Math.sin(fallT * 0.9) * 0.6 * left
      visitor.group.rotation.z = Math.sin(fallT * 1.7 + 0.6) * 0.13 * left
      landingShadow.material.opacity = 0.32 * T.MathUtils.smoothstep(u, 0.4, 1)
      landingShadow.scale.setScalar(0.4 + 0.6 * u)
      cloudMaterial.opacity = 0.95 * (1 - T.MathUtils.smoothstep(u, 0.7, 0.95))
      if (u >= 1) {
        landed = true
        p.copy(landingSpot)
        visitor.group.rotation.z = 0
        visitor.land?.()
        play('land')
        events.landed?.()
        cloudBank.visible = false
        landingShadow.visible = false
      }
    } else if (landed && fallT < FALL + 3 && !paused) fallT += dt
    visitor.animate(elapsed, motion.matches, {
      distance,
      speed,
      turn,
      dust: !inside,
      jumpHeight,
    })
    if (catReplyAt > 0 && elapsed > catReplyAt) {
      catReplyAt = -1
      cat.emote?.('heart')
    }
    if (pipReplyAt > 0 && elapsed > pipReplyAt) {
      pipReplyAt = -1
      guide.wave?.()
    }
    guide.animate(elapsed, motion.matches, undefined, guideSpeaking ? camera.position : inside ? null : p)
    if (!inside) cat.animate(elapsed, motion.matches, undefined, p)
    if (!motion.matches) {
      guideMarker.position.y = 1.34 + Math.sin(elapsed * 2.4) * 0.045
      guideMarker.rotation.y = elapsed * 1.3
    }
    scenery.animate(elapsed, night, p.x, p.z, motion.matches, p.y)
    if (!motion.matches) atmosphere.animate(elapsed)
    if (
      hovered &&
      !paused &&
      !iris.active() &&
      hovered.userData.zone !== 'projects'
    ) {
      hovered.getWorldPosition(nearestPoint)
      ring.visible = true
      ring.position.set(nearestPoint.x, 0.1, nearestPoint.z)
      ring.scale.setScalar(1.7)
    } else {
      ring.scale.setScalar(1)
      if (!goal.length) ring.visible = false
    }
    // 0 while drifting down, easing to 1 after touchdown.
    const intro = motion.matches || inside ? 1 : T.MathUtils.smoothstep(fallT, FALL + 0.35, FALL + 2.1)
    const aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight)
    const closeToPlaza =
      1 - T.MathUtils.smoothstep(Math.hypot(p.x + 5.7, p.z - 4.6), 2.6, 7.9)
    // Far out (the islet, the pier's end) the camera follows the visitor fully.
    const remote = T.MathUtils.smoothstep(Math.abs(p.x), 14, 21)
    const follow = T.MathUtils.lerp(aspect < 0.9 ? 0.88 : 0.74 + 0.1 * closeToPlaza, 1, remote)
    desired.set(
      inside ? 0 : p.x * follow,
      inside ? 0.55 : 0,
      inside ? 0 : p.z * 0.84,
    )
    if (intro < 1) {
      // Keep the falling visitor centred, then ease back to the usual framing.
      steerTarget.set(p.x, p.y + 0.75, p.z)
      desired.lerp(steerTarget, 1 - intro)
    }
    if (!inside) {
      // Look a little ahead of the visitor, and settle in close by the fire.
      desired.x += velocity.x * 0.16 * intro
      desired.z += velocity.y * 0.12 * intro
      if (training?.stage === 'power') {
        desired.x += (p.x * follow - desired.x) * 0.6 * cozy
        desired.z += (p.z * 0.84 - desired.z) * 0.6 * cozy
      } else if (fishing.active()) {
        // Frame the water in front of the pier so the bobber stays in view.
        desired.x += (p.x - desired.x) * 0.85 * cozy
        desired.z += (p.z + 1.3 - desired.z) * 0.85 * cozy
      } else {
        const [sx, sz] = rest?.seat.mode === 'bench' ? [rest.seat.x, rest.seat.z] : [fireX, fireZ]
        desired.x += (sx * follow - desired.x) * 0.45 * cozy
        desired.z += (sz * 0.84 - desired.z) * 0.45 * cozy
      }
    }
    guideFrame = motion.matches ? Number(guideSpeaking) :
      T.MathUtils.damp(guideFrame, Number(guideSpeaking && !inside), 3.7, dt)
    if (!inside && guideFrame > .001) {
      const g = guide.group.position
      const [x, z] = guideDestination ?? [g.x, g.z]
      if (guideDestination) steerTarget.set(x + .30, -.50, z + 2.1)
      else steerTarget.set(g.x + .35, -.62, g.z + 2.35)
      desired.lerp(steerTarget, guideFrame)
    }
    // Around the iris, glide the camera so the visitor sits in the middle of
    // the screen, right where the circle shrinks to and reopens from.
    // With reduced motion the camera stays put and the circle closes on the
    // visitor where they stand instead.
    const steer = motion.matches || attract ? 0 : iris.framing()
    if (steer > 0) {
      steerTarget.set(p.x, p.y + 0.9, p.z)
      desired.lerp(steerTarget, steer)
    }
    focus.lerp(
      desired,
      snapCamera || (motion.matches && !steer)
        ? 1
        : steer > 0
          ? 1 - Math.exp(-dt * 7)
          : inside || intro < 0.02
            ? 1
            : 1 - Math.exp(-dt * (intro < 1 ? 6 : 3)),
    )
    snapCamera = false
    const streetSpan =
      aspect < 0.9 ? 10.15 - closeToPlaza * 1.3 : 8.25 - closeToPlaza * 1.15
    const span = inside
      ? Math.max(4.2, 4.8 / aspect) / zoom
      : T.MathUtils.lerp(
          (aspect < 0.9 ? 7 : 4.6) + 3.2 * Math.min(1, fallT / FALL),
          (streetSpan / zoom) * (1 - 0.2 * cozy),
          intro,
        )
    const beachSeat = benchSeats[benchSites.indexOf(radioCove.bench)]
    const watching = rest?.seat === beachSeat && rest.stage === 'seated'
    lookout = motion.matches ? Number(watching) : T.MathUtils.damp(lookout, Number(watching), 2.4, dt)
    cameraOffset.set(8, T.MathUtils.lerp(19, 12, guideFrame), 27)
    if (lookout > 0.001) {
      const yaw = T.MathUtils.lerp(Math.atan2(8, 27), Math.PI * 1.25, lookout)
      const radius = T.MathUtils.lerp(Math.hypot(8, 27), 3.75, lookout)
      cameraOffset.set(radius * Math.sin(yaw), T.MathUtils.lerp(19, 0.13 - night * 0.28, lookout), radius * Math.cos(yaw))
      focus.lerp(steerTarget.set(p.x + 4, 1.45 + night * 0.6, p.z + 4), lookout)
    }
    if (attract) {
      // A slow establishing orbit around the whole island.
      const a = motion.matches ? 0.3 : 0.3 + elapsed * 0.05
      cameraOffset.set(8 * Math.cos(a) - 27 * Math.sin(a), 21, 27 * Math.cos(a) + 8 * Math.sin(a))
      focus.set(0, 0, 1.5)
    }
    // A gentle diorama curve outdoors; rooms stay flat.
    worldCurve.value = inside ? 0 : 0.0072 * (1 - lookout)
    worldCurveFocus.value = cameraOffset.length()
    const shown = attract ? (aspect < 0.9 ? 22 : 13.5) : T.MathUtils.lerp(T.MathUtils.lerp(span, guideDestination ? (aspect < .9 ? 6.6 : 4.9) : (aspect < .9 ? 4.1 : 3.35), guideFrame), aspect < 0.9 ? 3.1 : 2.45, lookout)
    camera.left = -shown * aspect
    camera.right = shown * aspect
    camera.top = shown
    camera.bottom = -shown
    camera.position.copy(focus).add(cameraOffset)
    camera.lookAt(focus)
    if (shake > 0.001 && !motion.matches) {
      camera.position.x += Math.sin(elapsed * 63) * 0.12 * shake
      camera.position.y += Math.cos(elapsed * 57) * 0.08 * shake
    }
    camera.updateProjectionMatrix()
    camera.updateMatrixWorld()
    // The lookout's stars wait until the camera has finished turning to the
    // sky, then fade in; they vanish at once when you get up.
    const settled = watching && lookout > 0.985
    skyReveal = settled ? Math.min(1, skyReveal + dt / (motion.matches ? 0.01 : 1.6)) : 0
    atmosphere.revealSky(skyReveal * skyReveal * (3 - 2 * skyReveal))
    if (view.lookout) view.lookout.style.opacity = String(skyReveal)
    lookoutEvents?.update(settled ? 1 : 0, night, dt, camera, motion.matches, paused)
    positionRadio(p.x, p.y + 1.25, p.z, Math.atan2(cameraOffset.x, cameraOffset.z), !!inside)
    view.signs.forEach((sign, index) => {
      if (!sign) return
      const [x, z] = index === 0 ? anchors.tech : [guide.group.position.x, guide.group.position.z]
      projectCurved(projected.set(x, index === 0 ? 3.46 : 2.1, z), camera)
      const visible =
        !inside &&
        !paused &&
        !iris.active() &&
        intro > 0.78 &&
        Math.abs(projected.x) < 0.87 &&
        Math.abs(projected.y) < 0.79
      sign.hidden = !visible
      if (visible)
        sign.style.transform = `translate(${((projected.x + 1) * canvas.clientWidth) / 2}px,${((1 - projected.y) * canvas.clientHeight) / 2}px) translate(-50%,-100%)`
    })
    const reportPosition = elapsed - lastHud > 0.17
    if (reportPosition) lastHud = elapsed
    updateReach(reportPosition)
    const activeExhibit =
      reach === 'projects'
        ? nearObject
        : hovered?.userData.zone === 'projects'
          ? hovered
          : null
    exhibitHalo.visible =
      !!activeExhibit && !inside && !paused && !iris.active()
    if (activeExhibit && exhibitHalo.visible) {
      const { x, z } = activeExhibit.position
      exhibitHalo.position.set(x, 0.135, z)
      exhibitHalo.material.opacity = motion.matches
        ? 0.98
        : 0.89 + 0.09 * Math.cos(elapsed * 4)
      projectCurved(projected.set(x, 1.89, z), camera)
      if (view.exhibit) {
        const width = canvas.clientWidth
        const height = canvas.clientHeight
        const safeMargin = Math.min(159, width * 0.43)
        const labelX = T.MathUtils.clamp(
          ((projected.x + 1) * width) / 2,
          safeMargin,
          width - safeMargin,
        )
        const labelY = T.MathUtils.clamp(
          ((1 - projected.y) * height) / 2,
          Math.min(130, height * 0.36),
          height * 0.81,
        )
        view.exhibit.style.transform = `translate(${labelX}px,${labelY}px) translate(-50%,-100%)`
        view.exhibit.hidden = false
      }
    } else if (view.exhibit) view.exhibit.hidden = true
    if (iris.active()) {
      const width = canvas.clientWidth,
        height = canvas.clientHeight
      if (motion.matches) {
        projectCurved(projected.set(p.x, p.y + 0.9, p.z), camera)
        iris.draw(
          width,
          height,
          T.MathUtils.clamp(((projected.x + 1) * width) / 2, 0, width),
          T.MathUtils.clamp(((1 - projected.y) * height) / 2, 0, height),
        )
      } else iris.draw(width, height)
    }
    // The shadow box follows the view (snapped to a coarse grid so it does
    // not shimmer), so shadows stay crisp and only nearby things are drawn
    // into the shadow map.
    const viewHalf = (attract ? 30 : Math.min(34, Math.max(15, span * Math.max(1, aspect) * 1.25 + 3)))
    const shadeRadius = Math.ceil(viewHalf / 4) * 4
    const shadeX = Math.round(focus.x / 2) * 2,
      shadeZ = Math.round(focus.z / 2) * 2
    if (shadeX !== lastShade[0] || shadeZ !== lastShade[1] || shadeRadius !== lastShade[2]) {
      atmosphere.shadeAround(shadeX, shadeZ, shadeRadius)
      lastShade = [shadeX, shadeZ, shadeRadius]
      lastShadow = 0
    }
    if (stamp - lastShadow > (low ? 66 : 40)) {
      renderer.shadowMap.needsUpdate = true
      lastShadow = stamp
    }
    const current = inside ? rooms[inside].scene : scene
    if (post) post.render(current, { night: inside ? 0.35 : night, golden: inside ? 0 : golden, inside: !!inside, time: elapsed }, dt)
    else renderer.render(current, camera)
    perf.cpu = perf.cpu * 0.9 + (performance.now() - started) * 0.1
    perf.calls = renderer.info.render.calls
    perf.triangles = renderer.info.render.triangles
    perf.frames++
  }
  document.addEventListener(
    'visibilitychange',
    () => {
      cancelAnimationFrame(frame)
      keys.clear()
      stick.set(0, 0)
      last = 0
      if (!document.hidden) {
        night = atmosphere.update(new Date())
        frame = requestAnimationFrame(tick)
      }
    },
    { signal: signal.signal },
  )
  bendScene(scene)
  if (import.meta.env.DEV)
    // Development-only hook for automated visual checks.
    Object.assign(window, {
      __island: {
        teleport(x: number, z: number, yaw = 0) {
          skipArrival()
          visitor.group.position.set(x, islandFloorHeight(x, z), z)
          visitor.group.rotation.y = yaw
          velocity.set(0, 0)
          goal = []
          visitor.settle()
          snapCamera = true
        },
        perf: () => ({ ...perf, cpu: +perf.cpu.toFixed(2), ratio: pixelRatio }),
        state: () => ({ rest: rest?.stage ?? null, fishing: fishing.stage(), training: training ? training.stage + ':' + training.t.toFixed(2) : null, lookout: +lookout.toFixed(3), skyReveal: +skyReveal.toFixed(3), reach, x: visitor.group.position.x, z: visitor.group.position.z }),
      },
    })
  frame = requestAnimationFrame(tick)
  return {
    pause(value) {
      paused = value
      running = false
      keys.clear()
      stick.set(0, 0)
      goal = []
      setHover(null)
    },
    zoom(delta) {
      if (!iris.active()) changeZoom(delta)
    },
    guideTalk(value) {
      guideSpeaking = value
      if (!value) guideDestination = null
      guide.talk?.(value)
    },
    guideFocus(look) {
      guideDestination = look
    },
    transitioning: iris.active,
    leave() {
      crossDoor(false)
    },
    travel(id, arrived) {
      if (iris.active()) return
      skipArrival()
      if (id === 'about' || id === 'tech') {
        if (inside !== id) crossDoor(id, undefined, arrived)
        else arrived?.()
        return
      }
      jump(destinations[id], anchors[id], arrived)
    },
    goTo(stand, look, arrived) {
      if (iris.active()) return
      skipArrival()
      jump(stand, look, arrived)
    },
    touch(x, y) {
      if (!iris.active()) stick.set(x, y)
    },
    interact,
    wear(id, instant = false) {
      visitor.wear?.(id, instant)
      if (instant) return
      play('fanfare')
      // Spin round, then face the camera to show the new look off.
      setTimeout(() => {
        faceYaw = Math.atan2(cameraOffset.x, cameraOffset.z)
      }, 1000)
    },
    start() {
      if (!attract || iris.active()) return
      if (landed) {
        // Reduced motion: no fall, straight onto the pier.
        attract = false
        snapCamera = true
        events.landed?.()
        return
      }
      play('fanfare')
      iris.start(() => {
        attract = false
        snapCamera = true
        cloudBank.visible = !landed
      })
    },
    dispose() {
      disposeRadio()
      dead = true
      cancelAnimationFrame(frame)
      signal.abort()
      observer.disconnect()
      const geometries = new Set<T.BufferGeometry>(),
        materials = new Set<T.Material>(),
        textures = new Set<T.Texture>()
      const collect = (root: T.Scene) =>
        root.traverse((o) => {
          if (o instanceof T.Mesh || o instanceof T.Points || o instanceof T.Sprite) {
            if (!(o instanceof T.Sprite)) geometries.add(o.geometry)
            for (const m of [o.material].flat()) {
              materials.add(m)
              for (const v of Object.values(m))
                if (v instanceof T.Texture) textures.add(v)
            }
            if (o instanceof T.InstancedMesh) o.dispose()
          }
        })
      collect(scene)
      Object.values(rooms).forEach(room => collect(room.scene))
      textures.forEach((t) => t.dispose())
      geometries.forEach((g) => g.dispose())
      materials.forEach((m) => m.dispose())
      post?.dispose()
      renderer.dispose()
    },
  }
}
