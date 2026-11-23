import * as T from 'three'
import type { XZ } from './modelKit'

/** A soft round sprite texture, drawn once and shared by every glow. */
export function softDot(inner: string, outer: string) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 64
  const c = canvas.getContext('2d')
  if (c) {
    const g = c.createRadialGradient(32, 32, 0, 32, 32, 32)
    g.addColorStop(0, inner)
    g.addColorStop(0.35, outer)
    g.addColorStop(1, 'rgba(255,255,255,0)')
    c.fillStyle = g
    c.fillRect(0, 0, 64, 64)
  }
  const texture = new T.CanvasTexture(canvas)
  texture.colorSpace = T.SRGBColorSpace
  return texture
}

interface AmbienceOptions {
  low: boolean
  lamps: XZ[]
  campfire: XZ
  chimneys: [number, number, number][]
  river: (z: number) => number
  riverWidth: (z: number) => number
}

/**
 * Everything that makes the island breathe: warm lamp light and halos after
 * dusk, a crackling campfire, chimney smoke, drifting pollen by day, fish
 * shadows in the stream and gulls wheeling over the sea.
 */
export function createAmbience({ low, lamps, campfire, chimneys, river, riverWidth }: AmbienceOptions) {
  const group = new T.Group()
  group.name = 'ambience'
  const glowTexture = softDot('rgba(255,244,214,1)', 'rgba(255,205,120,0.45)')

  /* ---------------------------- Lamp light ----------------------------- */
  const halos = lamps.map(([x, z]) => {
    const halo = new T.Sprite(
      new T.SpriteMaterial({
        map: glowTexture,
        color: '#ffd89a',
        transparent: true,
        depthWrite: false,
        blending: T.AdditiveBlending,
        opacity: 0,
      }),
    )
    halo.position.set(x, 1.95, z)
    halo.scale.setScalar(1.6)
    group.add(halo)
    return halo
  })
  // A small pool of real lights follows the lamps nearest the visitor, so the
  // ground around them glows warmly without paying for every lamp at once.
  const pool = Array.from({ length: low ? 2 : 3 }, () => {
    const light = new T.PointLight('#ffc879', 0, 6.5, 1.6)
    group.add(light)
    return light
  })

  /* ------------------------------ Campfire ----------------------------- */
  const [fx, fz] = campfire
  const fireLight = new T.PointLight('#ff9a4a', 0, 7.5, 1.5)
  fireLight.position.set(fx, 0.9, fz)
  group.add(fireLight)
  const flameMaterial = (color: string) =>
    new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.92, depthWrite: false })
  const flames = [
    ['#ff8a3d', 0.2, 0.42],
    ['#ffc04d', 0.14, 0.32],
    ['#fff0a8', 0.08, 0.2],
  ].map(([color, radius, height]) => {
    const flame = new T.Mesh(new T.ConeGeometry(radius as number, height as number, 8), flameMaterial(color as string))
    flame.position.set(fx, 0.22 + (height as number) / 2, fz)
    group.add(flame)
    return flame
  })
  const fireHalo = new T.Sprite(
    new T.SpriteMaterial({
      map: glowTexture,
      color: '#ffb066',
      transparent: true,
      depthWrite: false,
      blending: T.AdditiveBlending,
    }),
  )
  fireHalo.position.set(fx, 0.55, fz)
  group.add(fireHalo)
  const emberCount = low ? 10 : 22
  const embers = new Float32Array(emberCount * 3)
  const emberSeeds = Array.from({ length: emberCount }, (_, i) => ({
    phase: (i * 0.618) % 1,
    angle: i * 2.4,
    speed: 0.45 + ((i * 0.37) % 1) * 0.4,
  }))
  const emberGeometry = new T.BufferGeometry()
  emberGeometry.setAttribute('position', new T.BufferAttribute(embers, 3))
  const emberPoints = new T.Points(
    emberGeometry,
    new T.PointsMaterial({
      map: glowTexture,
      color: '#ffb35c',
      size: 0.16,
      transparent: true,
      depthWrite: false,
      blending: T.AdditiveBlending,
    }),
  )
  group.add(emberPoints)

  /* ------------------------------- Smoke ------------------------------- */
  const smokeGeometry = new T.IcosahedronGeometry(1, 1)
  const puffs = chimneys.flatMap(([x, y, z], c) =>
    Array.from({ length: low ? 4 : 6 }, (_, i) => {
      const puff = new T.Mesh(
        smokeGeometry,
        new T.MeshLambertMaterial({ color: '#f4efe6', transparent: true, depthWrite: false }),
      )
      group.add(puff)
      return { puff, x, y, z, offset: i / (low ? 4 : 6) + c * 0.13 }
    }),
  )

  /* ---------------------------- Day pollen ----------------------------- */
  const moteCount = low ? 30 : 70
  const motes = new Float32Array(moteCount * 3)
  const moteHome = Array.from({ length: moteCount }, (_, i) => [
    ((i * 0.7548) % 1) * 2 - 1,
    ((i * 0.5698) % 1) * 2 - 1,
    0.4 + ((i * 0.31) % 1) * 2.4,
  ])
  const moteGeometry = new T.BufferGeometry()
  moteGeometry.setAttribute('position', new T.BufferAttribute(motes, 3))
  const moteMaterial = new T.PointsMaterial({
    map: softDot('rgba(255,255,240,1)', 'rgba(255,250,220,0.5)'),
    color: '#fffbe6',
    size: 0.11,
    transparent: true,
    depthWrite: false,
    opacity: 0.8,
  })
  const motePoints = new T.Points(moteGeometry, moteMaterial)
  motePoints.frustumCulled = false
  group.add(motePoints)

  /* ---------------------------- Fish shadows --------------------------- */
  const fishGeometry = new T.CircleGeometry(1, 14)
  fishGeometry.rotateX(-Math.PI / 2)
  const fishMaterial = new T.MeshBasicMaterial({
    color: '#1d4b56',
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
  })
  const fish = Array.from({ length: low ? 2 : 4 }, (_, i) => {
    const body = new T.Mesh(fishGeometry, fishMaterial)
    body.scale.set(0.09 + (i % 2) * 0.04, 1, 0.24 + (i % 2) * 0.08)
    const tail = new T.Mesh(fishGeometry, fishMaterial)
    tail.scale.set(0.07, 1, 0.07)
    tail.position.z = -0.95
    body.add(tail)
    group.add(body)
    return { body, start: i * 5.3, speed: 0.5 + i * 0.13, lane: ((i * 0.41) % 1) - 0.5 }
  })

  /* -------------------------------- Gulls ------------------------------ */
  const gullMaterial = new T.MeshLambertMaterial({ color: '#fbf7ee' })
  const tipMaterial = new T.MeshLambertMaterial({ color: '#8f9ea3' })
  const gulls = [0, 1, 2].slice(0, low ? 1 : 3).map((i) => {
    const gull = new T.Group()
    const torso = new T.Mesh(new T.SphereGeometry(0.12, 10, 6), gullMaterial)
    torso.scale.set(1, 0.8, 2)
    gull.add(torso)
    const wings = [-1, 1].map((side) => {
      const pivot = new T.Group()
      const wing = new T.Mesh(new T.BoxGeometry(0.55, 0.03, 0.2), gullMaterial)
      wing.position.x = side * 0.3
      const tip = new T.Mesh(new T.BoxGeometry(0.16, 0.032, 0.14), tipMaterial)
      tip.position.x = side * 0.62
      pivot.add(wing, tip)
      gull.add(pivot)
      return pivot
    })
    group.add(gull)
    return { gull, wings, radius: 19 + i * 3.5, height: 4.2 + i * 1.1, speed: 0.12 - i * 0.02, offset: i * 2.1 }
  })

  const nearest: { x: number; z: number; d: number }[] = lamps.map(([x, z]) => ({ x, z, d: 0 }))

  return {
    group,
    update(time: number, night: number, px: number, pz: number, reduced: boolean) {
      const dusk = T.MathUtils.smoothstep(night, 0.12, 0.6)

      // Lamps: halos everywhere, real light near the visitor.
      halos.forEach((halo, i) => {
        halo.visible = dusk > 0.01
        halo.material.opacity = dusk * (0.82 + (reduced ? 0 : 0.06 * Math.sin(time * 2.2 + i)))
      })
      for (const lamp of nearest) lamp.d = (lamp.x - px) ** 2 + (lamp.z - pz) ** 2
      nearest.sort((a, b) => a.d - b.d)
      pool.forEach((light, i) => {
        const lamp = nearest[i]
        light.position.set(lamp.x, 1.75, lamp.z)
        light.intensity = dusk * 7
      })

      // Campfire: always lit, it matters most once the sun goes down.
      const flicker = reduced ? 0.5 : 0.5 + 0.25 * Math.sin(time * 17) + 0.25 * Math.sin(time * 7.3 + 1)
      fireLight.intensity = (0.8 + dusk * 9) * (0.85 + flicker * 0.3)
      fireHalo.scale.setScalar(1.3 + flicker * 0.35 + dusk * 0.6)
      fireHalo.material.opacity = 0.35 + dusk * 0.55
      flames.forEach((flame, i) => {
        const wobble = reduced ? 0 : Math.sin(time * (9 + i * 3) + i)
        flame.scale.set(1 + 0.08 * wobble, 0.85 + 0.25 * flicker + 0.1 * wobble, 1 - 0.08 * wobble)
        flame.rotation.y = time * (0.8 + i)
        flame.rotation.z = reduced ? 0 : 0.08 * Math.sin(time * 5 + i * 2)
      })
      emberPoints.visible = !reduced
      if (!reduced) {
        emberSeeds.forEach(({ phase, angle, speed }, i) => {
          const t = (time * speed + phase) % 1
          embers[i * 3] = fx + Math.cos(angle + time) * 0.12 * (1 + t) + Math.sin(time * 3 + i) * 0.05 * t
          embers[i * 3 + 1] = 0.35 + t * 1.6
          embers[i * 3 + 2] = fz + Math.sin(angle + time) * 0.12 * (1 + t)
        })
        emberGeometry.attributes.position.needsUpdate = true
      }

      // Chimney smoke: soft puffs that swell, drift with the breeze and fade.
      puffs.forEach(({ puff, x, y, z, offset }) => {
        const t = reduced ? offset : (time * 0.22 + offset) % 1
        puff.position.set(x + t * 0.9 + Math.sin(time + offset * 9) * 0.06, y + t * 2.1, z - t * 0.25)
        puff.scale.setScalar(0.12 + t * 0.32)
        ;(puff.material as T.MeshLambertMaterial).opacity = 0.62 * Math.sin(Math.PI * Math.min(1, t * 1.15))
      })

      // Pollen glitters in the sunlight around wherever the visitor is.
      motePoints.visible = !reduced && night < 0.6
      if (motePoints.visible) {
        moteMaterial.opacity = 0.75 * (1 - night)
        moteHome.forEach(([hx, hz, hy], i) => {
          const drift = time * 0.05 + i
          motes[i * 3] = px + ((hx * 9 + time * 0.18 + 9) % 18) - 9 + Math.sin(drift * 3) * 0.3
          motes[i * 3 + 1] = hy + Math.sin(time * 0.7 + i) * 0.25
          motes[i * 3 + 2] = pz + hz * 6 + Math.cos(drift * 2) * 0.3
        })
        moteGeometry.attributes.position.needsUpdate = true
      }

      // Fish shadows swim upstream with a lazy wiggle.
      fish.forEach(({ body, start, speed, lane }) => {
        const z = 9.6 - ((start + time * speed) % 19.2)
        const x = river(z) + lane * riverWidth(z) * 0.9 + Math.sin(time * 0.9 + start) * 0.12
        body.position.set(x, -0.112, z)
        body.rotation.y = Math.PI + (reduced ? 0 : Math.sin(time * 5 + start) * 0.2)
        body.visible = Math.abs(z) < 9.2
      })

      // Gulls wheel lazily out over the water.
      gulls.forEach(({ gull, wings, radius, height, speed, offset }) => {
        const a = time * speed + offset
        gull.position.set(Math.cos(a) * radius, height + Math.sin(time * 0.6 + offset) * 0.4, Math.sin(a) * radius * 0.72 - 3)
        gull.rotation.set(0, -a, 0.25)
        const beat = reduced ? 0.1 : Math.sin(time * 4 + offset) * 0.45 + 0.1
        wings[0].rotation.z = beat
        wings[1].rotation.z = -beat
      })
    },
  }
}
