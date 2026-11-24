import * as T from 'three'
import { createVisitor, type IslandCharacter } from './character'
import { outfits } from '../data/outfits'

/**
 * The wardrobe's dressing-room stage: the visitor on a little turntable,
 * slowly spinning so each outfit can be seen from every side, plus
 * pre-rendered thumbnails for the outfit grid.
 */
const portraitCache = new Map<string, string>()

export function createOutfitStage(canvas: HTMLCanvasElement, reduced: boolean) {
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  renderer.outputColorSpace = T.SRGBColorSpace
  renderer.toneMapping = T.NeutralToneMapping
  renderer.shadowMap.enabled = true
  const scene = new T.Scene()
  scene.add(new T.HemisphereLight('#fff6e4', '#b7a6d6', 1.9))
  const key = new T.DirectionalLight('#fff1d6', 2.2)
  key.position.set(2.5, 5, 4)
  key.castShadow = true
  key.shadow.mapSize.set(512, 512)
  const rim = new T.DirectionalLight('#bfe4ff', 1.4)
  rim.position.set(-3, 3, -4)
  scene.add(key, rim)

  // Turntable: a wooden disc with a soft rug, on which the visitor turns.
  const table = new T.Group()
  const disc = new T.Mesh(new T.CylinderGeometry(0.95, 1.02, 0.16, 48), new T.MeshStandardMaterial({ color: '#c6915f', roughness: 0.7 }))
  disc.position.y = -0.08
  disc.receiveShadow = true
  const rug = new T.Mesh(new T.CylinderGeometry(0.8, 0.8, 0.02, 48), new T.MeshStandardMaterial({ color: '#f3e3c2', roughness: 0.9 }))
  rug.position.y = 0.01
  rug.receiveShadow = true
  table.add(disc, rug)
  scene.add(table)

  const camera = new T.PerspectiveCamera(24, 1, 0.1, 50)
  camera.position.set(0, 1.55, 6.9)
  camera.lookAt(0, 0.88, 0)

  let visitor: IslandCharacter | null = null
  let current = ''
  let angle = 0.5
  let swap = 1
  let pending: string | null = null
  let time = 0
  let last = 0
  let frame = 0
  let dead = false

  function mount(id: string) {
    if (visitor) {
      table.remove(visitor.group)
      visitor.group.traverse((o) => {
        if (o instanceof T.Mesh) o.geometry.dispose()
      })
    }
    visitor = createVisitor(id)
    visitor.group.scale.setScalar(1.36)
    visitor.group.traverse((o) => {
      if (o instanceof T.Mesh) o.castShadow = true
    })
    table.add(visitor.group)
    current = id
  }

  function resize() {
    const w = canvas.clientWidth,
      h = canvas.clientHeight
    if (!w || !h) return
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.position.z = w / h < 0.75 ? 7.8 : 6.9
    camera.updateProjectionMatrix()
  }
  const observer = new ResizeObserver(resize)
  observer.observe(canvas)
  resize()

  function tick(stamp: number) {
    if (dead) return
    frame = requestAnimationFrame(tick)
    const dt = Math.min(0.05, last ? (stamp - last) / 1000 : 0)
    last = stamp
    time += dt
    // A slow turn; a quick pop and twirl whenever the outfit changes.
    angle += dt * (reduced ? 0.25 : 0.45)
    if (swap < 1) {
      swap = Math.min(1, swap + dt / 0.45)
      if (pending && swap >= 0.5) {
        mount(pending)
        pending = null
      }
    }
    const pop = swap < 1 ? Math.abs(Math.cos(swap * Math.PI)) : 1
    table.rotation.y = angle + (swap < 1 && !reduced ? (1 - pop) * 0.9 : 0)
    if (visitor) {
      visitor.group.scale.setScalar(1.36 * (0.82 + 0.18 * pop))
      visitor.animate(time, reduced, { distance: 0, speed: 0, turn: 0 }, null)
    }
    renderer.render(scene, camera)
  }
  frame = requestAnimationFrame(tick)

  return {
    show(id: string) {
      if (id === current && !pending) return
      if (!visitor) {
        mount(id)
        return
      }
      pending = id
      swap = 0
    },
    /** Render a front-facing portrait of every outfit, one per idle frame. */
    async thumbnails(size = 160, done: (id: string, url: string) => void) {
      // Portraits never change: render them once per page load.
      const missing = outfits.filter((o) => {
        const url = portraitCache.get(o.id)
        if (url) done(o.id, url)
        return !url
      })
      if (!missing.length) return
      const shot = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true })
      shot.setSize(size, size, false)
      shot.outputColorSpace = T.SRGBColorSpace
      shot.toneMapping = T.NeutralToneMapping
      const portrait = new T.PerspectiveCamera(22, 1, 0.1, 30)
      portrait.position.set(0.45, 1.25, 4.4)
      portrait.lookAt(0, 0.85, 0)
      const studio = new T.Scene()
      studio.add(new T.HemisphereLight('#fff6e4', '#b7a6d6', 2), key.clone(), rim.clone())
      for (const outfit of missing) {
        if (dead) break
        const model = createVisitor(outfit.id)
        model.group.scale.setScalar(1.36)
        model.group.rotation.y = 0.32
        model.animate(1, true, { distance: 0, speed: 0, turn: 0 }, null)
        studio.add(model.group)
        shot.render(studio, portrait)
        const url = shot.domElement.toDataURL('image/webp', 0.9)
        portraitCache.set(outfit.id, url)
        done(outfit.id, url)
        studio.remove(model.group)
        model.group.traverse((o) => {
          if (o instanceof T.Mesh) o.geometry.dispose()
        })
        await new Promise((resolve) => setTimeout(resolve, 16))
      }
      shot.dispose()
      shot.forceContextLoss()
    },
    dispose() {
      dead = true
      cancelAnimationFrame(frame)
      observer.disconnect()
      renderer.dispose()
      renderer.forceContextLoss()
    },
  }
}
