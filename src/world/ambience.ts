import * as T from 'three'
import { Batch, ModelKit, type XZ } from './modelKit'

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
  kit: ModelKit
  /** Broadleaf crowns leaves can fall from: x, z, crown height. */
  crowns: [number, number, number][]
  /** Grassy spots sparrows like to land on. */
  perches: XZ[]
  low: boolean
  lamps: XZ[]
  campfire: XZ
  lanterns: [number, number, number][]
  chimneys: [number, number, number][]
  river: (z: number) => number
  riverWidth: (z: number) => number
}

/**
 * Everything that makes the island breathe: warm lamp light and halos after
 * dusk, a crackling campfire, chimney smoke, drifting pollen by day, fish
 * shadows in the stream and gulls wheeling over the sea.
 */
export function createAmbience({ kit, crowns, perches, low, lamps, campfire, lanterns, chimneys, river, riverWidth }: AmbienceOptions) {
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

  // Paper lantern glows over the campfire circle.
  const lanternGlows = lanterns.map(([x, y, z], i) => {
    const glow = new T.Sprite(
      new T.SpriteMaterial({
        map: glowTexture,
        color: i % 2 ? '#ffb38a' : '#ffd890',
        transparent: true,
        depthWrite: false,
        blending: T.AdditiveBlending,
        opacity: 0,
      }),
    )
    glow.position.set(x, y - 0.2, z)
    glow.scale.setScalar(0.75)
    group.add(glow)
    return glow
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

  /* --------------------------- Falling leaves -------------------------- */
  const leafGeometry = new T.IcosahedronGeometry(1, 0)
  leafGeometry.scale(0.07, 0.012, 0.045)
  const leaves = new T.InstancedMesh(
    leafGeometry,
    new T.MeshLambertMaterial({ color: '#ffffff' }),
    low ? 10 : 22,
  )
  leaves.frustumCulled = false
  const leafColors = ['#8cbf62', '#a6cf6c', '#f2b35e', '#e98b5a', '#f3c2cc']
  const leafState = Array.from({ length: leaves.count }, (_, i) => ({
    x: 0,
    y: -5,
    z: 0,
    age: 0,
    life: 0,
    delay: (i * 1.7) % 9,
    spin: 0,
    seed: i * 1.37,
  }))
  const tint = new T.Color()
  leafState.forEach((_, i) => leaves.setColorAt(i, tint.set(leafColors[i % leafColors.length])))
  function dropLeaf(leaf: (typeof leafState)[number], x: number, y: number, z: number) {
    leaf.x = x
    leaf.y = y
    leaf.z = z
    leaf.age = 0
    leaf.life = 4.5 + ((leaf.seed * 7) % 2)
    leaf.delay = 0
  }
  group.add(leaves)

  /* ------------------------------ Sparrows ----------------------------- */
  const birdBody = new Batch(kit)
  birdBody.ball([0, 0.07, 0], [0.065, 0.058, 0.085], '#b98257', 1)
  birdBody.ball([0, 0.055, 0.02], [0.05, 0.045, 0.06], '#f3dfbf', 1)
  birdBody.ball([0, 0.12, 0.06], [0.045, 0.044, 0.045], '#a8724a', 1)
  birdBody.ball([0, 0.125, 0.1], [0.012, 0.01, 0.022], '#e6a640', 0)
  for (const s of [-1, 1]) birdBody.ball([s * 0.03, 0.135, 0.09], [0.009, 0.011, 0.006], '#2f2624', 0)
  birdBody.ball([0, 0.085, -0.1], [0.028, 0.012, 0.05], '#8a5a3a', 0, [0.35, 0, 0])
  const bodyMesh = birdBody.finish().children[0] as T.Mesh
  const wingGeometry = new T.SphereGeometry(1, 8, 6)
  wingGeometry.translate(1, 0, 0)
  wingGeometry.scale(0.045, 0.012, 0.035)
  const sparrowCount = low ? 3 : 6
  const sparrowBodies = new T.InstancedMesh(bodyMesh.geometry, kit.matte, sparrowCount)
  const sparrowWings = new T.InstancedMesh(wingGeometry, new T.MeshLambertMaterial({ color: '#9a6744' }), sparrowCount * 2)
  sparrowBodies.frustumCulled = sparrowWings.frustumCulled = false
  sparrowBodies.castShadow = true
  group.add(sparrowBodies, sparrowWings)
  const sparrows = Array.from({ length: sparrowCount }, (_, i) => {
    const home = perches[i % perches.length]
    return {
      x: home[0] + ((i * 0.37) % 0.6) - 0.3,
      z: home[1] + ((i * 0.61) % 0.6) - 0.3,
      y: 0.1,
      yaw: i,
      perch: i % perches.length,
      flight: null as null | { from: [number, number]; to: [number, number]; t: number },
      nextHop: i * 0.4,
      hop: 1,
      hopFrom: [0, 0] as [number, number],
      hopTo: [0, 0] as [number, number],
      peck: 0,
    }
  })
  const proxy = new T.Object3D()
  const wingProxy = new T.Object3D()

  const nearest: { x: number; z: number; d: number }[] = lamps.map(([x, z]) => ({ x, z, d: 0 }))

  let lastTime = 0
  return {
    group,
    /** A shaken tree lets go of a handful of leaves. */
    burst(x: number, z: number, height: number) {
      let dropped = 0
      for (const leaf of leafState) {
        if (dropped >= 7) break
        if (leaf.age < leaf.life * 0.6 && leaf.life > 0) continue
        dropLeaf(leaf, x + (Math.random() - 0.5) * 1.6, height - 0.2 + Math.random() * 0.6, z + (Math.random() - 0.5) * 1.4)
        dropped++
      }
    },
    update(time: number, night: number, px: number, pz: number, reduced: boolean) {
      const dt = Math.min(0.1, Math.max(0, time - lastTime))
      lastTime = time
      const dusk = T.MathUtils.smoothstep(night, 0.12, 0.6)

      // Lamps: halos everywhere, real light near the visitor.
      halos.forEach((halo, i) => {
        halo.visible = dusk > 0.01
        halo.material.opacity = dusk * (0.82 + (reduced ? 0 : 0.06 * Math.sin(time * 2.2 + i)))
      })
      for (const lamp of nearest) lamp.d = (lamp.x - px) ** 2 + (lamp.z - pz) ** 2
      nearest.sort((a, b) => a.d - b.d)
      // Real lights only exist after dusk: by day they would cost every pixel
      // a lighting pass for nothing.
      const lit = dusk > 0.01
      pool.forEach((light, i) => {
        light.visible = lit
        const lamp = nearest[i]
        light.position.set(lamp.x, 1.75, lamp.z)
        light.intensity = dusk * 7
      })

      lanternGlows.forEach((glow, i) => {
        glow.visible = dusk > 0.01
        glow.material.opacity = dusk * (0.75 + (reduced ? 0 : 0.15 * Math.sin(time * 1.7 + i * 1.3)))
      })

      // Campfire: always lit, it matters most once the sun goes down.
      const flicker = reduced ? 0.5 : 0.5 + 0.25 * Math.sin(time * 17) + 0.25 * Math.sin(time * 7.3 + 1)
      fireLight.visible = lit
      fireLight.intensity = dusk * 9 * (0.85 + flicker * 0.3)
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

      // Leaves drift down from the crowns, rock side to side and settle.
      leaves.visible = !reduced
      if (!reduced) {
        leafState.forEach((leaf, i) => {
          if (leaf.age >= leaf.life) {
            leaf.delay -= dt
            if (leaf.delay <= 0 && crowns.length) {
              const [cx, cz, ch] = crowns[Math.floor(((time * 13.7 + i * 5.3) % 1) * crowns.length)]
              dropLeaf(leaf, cx + Math.sin(time + i) * 0.8, ch, cz + Math.cos(time * 1.3 + i) * 0.7)
            } else {
              proxy.position.set(0, -50, 0)
              proxy.scale.setScalar(0)
              proxy.updateMatrix()
              leaves.setMatrixAt(i, proxy.matrix)
              return
            }
          }
          leaf.age += dt
          const falling = leaf.y > 0.13
          if (falling) {
            leaf.y -= dt * 0.42
            leaf.x += Math.sin(leaf.age * 2.3 + leaf.seed) * dt * 0.45
            leaf.z += Math.cos(leaf.age * 1.7 + leaf.seed) * dt * 0.25 + dt * 0.1
            leaf.spin += dt * 2.2
          } else if (leaf.age < leaf.life - 1) leaf.age = Math.max(leaf.age, leaf.life - 1.6)
          const fade = Math.min(1, (leaf.life - leaf.age) / 0.6)
          proxy.position.set(leaf.x, Math.max(0.12, leaf.y), leaf.z)
          proxy.rotation.set(falling ? Math.sin(leaf.age * 2.3 + leaf.seed) * 0.8 : 0, leaf.spin, falling ? Math.cos(leaf.age * 1.9) * 0.5 : 0)
          proxy.scale.setScalar(Math.max(0, fade))
          proxy.updateMatrix()
          leaves.setMatrixAt(i, proxy.matrix)
          if (leaf.age >= leaf.life) leaf.delay = 2 + ((leaf.seed * 3.1) % 6)
        })
        leaves.instanceMatrix.needsUpdate = true
      }

      // Sparrows hop and peck, and scatter to another perch if you come close.
      sparrows.forEach((bird, i) => {
        if (!bird.flight && Math.hypot(bird.x - px, bird.z - pz) < 1.9 && !reduced) {
          const next = (bird.perch + 1 + (i % (perches.length - 1))) % perches.length
          bird.perch = next
          const [tx, tz] = perches[next]
          bird.flight = { from: [bird.x, bird.z], to: [tx + ((i * 0.53) % 0.8) - 0.4, tz + ((i * 0.29) % 0.8) - 0.4], t: 0 }
        }
        let flap = 0
        if (bird.flight) {
          const f = bird.flight
          f.t = Math.min(1, f.t + dt / 2.4)
          const k = f.t * f.t * (3 - 2 * f.t)
          bird.x = f.from[0] + (f.to[0] - f.from[0]) * k
          bird.z = f.from[1] + (f.to[1] - f.from[1]) * k
          bird.y = 0.1 + Math.sin(Math.PI * f.t) * 2.2
          bird.yaw = Math.atan2(f.to[0] - f.from[0], f.to[1] - f.from[1])
          flap = Math.sin(time * 38 + i)
          if (f.t >= 1) {
            bird.flight = null
            bird.y = 0.1
            bird.nextHop = time + 0.6
          }
        } else if (!reduced) {
          if (time > bird.nextHop) {
            const a = Math.sin(i * 3.1 + time) * Math.PI
            const [hx, hz] = perches[bird.perch]
            bird.hopFrom = [bird.x, bird.z]
            const r = 0.12
            bird.hopTo = [
              Math.min(hx + 0.6, Math.max(hx - 0.6, bird.x + Math.cos(a) * r)),
              Math.min(hz + 0.6, Math.max(hz - 0.6, bird.z + Math.sin(a) * r)),
            ]
            bird.hop = 0
            bird.yaw = Math.atan2(bird.hopTo[0] - bird.x, bird.hopTo[1] - bird.z)
            bird.nextHop = time + 0.5 + ((i * 0.77 + time) % 1.4)
            bird.peck = (i + Math.floor(time)) % 3 === 0 ? 0 : 1
          }
          bird.hop = Math.min(1, bird.hop + dt / 0.18)
          bird.x = bird.hopFrom[0] + (bird.hopTo[0] - bird.hopFrom[0]) * bird.hop
          bird.z = bird.hopFrom[1] + (bird.hopTo[1] - bird.hopFrom[1]) * bird.hop
          bird.y = 0.1 + Math.sin(Math.PI * bird.hop) * 0.06
          bird.peck = Math.min(1, bird.peck + dt / 0.5)
        }
        const pecking = bird.flight ? 0 : Math.sin(Math.min(1, bird.peck) * Math.PI) * 0.6
        proxy.position.set(bird.x, bird.y, bird.z)
        proxy.rotation.set(pecking, bird.yaw, 0)
        proxy.scale.setScalar(1.25)
        proxy.updateMatrix()
        sparrowBodies.setMatrixAt(i, proxy.matrix)
        for (const side of [-1, 1]) {
          wingProxy.position.set(side * 0.05, 0.09, 0)
          wingProxy.rotation.set(0, side < 0 ? Math.PI : 0, (bird.flight ? 0.2 + flap * 0.9 : -0.5) * (side < 0 ? 1 : 1))
          wingProxy.updateMatrix()
          wingProxy.matrix.premultiply(proxy.matrix)
          sparrowWings.setMatrixAt(i * 2 + (side > 0 ? 1 : 0), wingProxy.matrix)
        }
      })
      sparrowBodies.instanceMatrix.needsUpdate = true
      sparrowWings.instanceMatrix.needsUpdate = true

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
