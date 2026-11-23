import * as T from 'three'
import { daylight } from './daylight'
import { paintSea } from '../world/water'
import { softDot } from '../world/ambience'

export function makeSky(scene: T.Scene, low: boolean) {
  const sky = new T.Color(),
    seaColor = new T.Color(),
    tmp = new T.Color()
  scene.background = sky
  const fog = new T.Fog(0xa6dce5, 43, 118)
  scene.fog = fog
  const hemi = new T.HemisphereLight(0xfff6d8, 0xb7d08c, 1.75)
  const sun = new T.DirectionalLight(0xffecc6, 2.6)
  sun.castShadow = true
  sun.shadow.mapSize.set(low ? 1024 : 2048, low ? 1024 : 2048)
  Object.assign(sun.shadow.camera, {
    left: -33,
    right: 33,
    top: 23,
    bottom: -23,
    near: 0.1,
    far: 75,
  })
  sun.shadow.bias = -0.0005
  sun.shadow.normalBias = 0.035
  // Soft, slightly blurred shadows suit the storybook look.
  sun.shadow.radius = 3
  scene.add(hemi, sun)
  const sea = new T.Mesh(
    new T.PlaneGeometry(240, 240, 96, 96),
    new T.MeshStandardMaterial({ color: 0x66bfc6, roughness: 0.55 }),
  )
  const seaClock = { value: 0 }
  paintSea(sea.material, seaClock)
  sea.rotation.x = -Math.PI / 2
  sea.position.y = -0.88
  sea.receiveShadow = false
  scene.add(sea)
  let seed = 735
  function random() {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 4294967296
  }
  const cloudMat = new T.MeshLambertMaterial({ color: 0xfffaf0 })
  cloudMat.userData.noBend = true
  const cloudGeo = new T.IcosahedronGeometry(1, 2)
  const clouds = new T.Group()
  for (let i = 0; i < 12; i++) {
    const group = new T.Group()
    group.position.set(
      -57 + i * 9 + random() * 5,
      3 + random() * 7,
      -25 - random() * 18,
    )
    for (let j = 0; j < 4; j++) {
      const puff = new T.Mesh(cloudGeo, cloudMat)
      puff.position.set(j * 1.4, Math.sin(j) * 0.65, 0)
      puff.scale.set(1.8, 0.8 + random(), 1.3)
      group.add(puff)
    }
    clouds.add(group)
  }
  scene.add(clouds)
  const starPos = []
  for (let i = 0; i < 230; i++)
    starPos.push((random() - 0.5) * 150, random() * 36 + 4, -28 - random() * 45)
  // A southern star field faces the beach lookout across the water.
  for (let i = 0; i < 480; i++)
    starPos.push(19.75 + (random() - 0.5) * 45, 0.9 + random() * 18, 28 + random() * 34)
  for (let i = 0; i < 500; i++) {
    const forward = 30 + random() * 28
    const side = (random() - 0.5) * 23
    starPos.push(19.75 + (forward + side) * 0.707, 1.4 + random() * 10, (forward - side) * 0.707)
  }
  const sg = new T.BufferGeometry()
  sg.setAttribute('position', new T.Float32BufferAttribute(starPos, 3))
  const starMat = new T.PointsMaterial({
    color: '#fff8d4',
    size: 0.15,
    transparent: true,
    fog: false,
  })
  starMat.userData.noBend = true
  const stars = new T.Points(sg, starMat)
  scene.add(stars)
  const orb = new T.Mesh(
    new T.SphereGeometry(2.2, 20, 12),
    new T.MeshBasicMaterial({ color: '#fff6c4', fog: false }),
  )
  orb.material.userData.noBend = true
  scene.add(orb)
  const coveMoon = new T.Mesh(new T.SphereGeometry(0.58, 24, 16),
    new T.MeshBasicMaterial({color: '#fff2c6', fog: false}))
  coveMoon.material.userData.noBend = true
  coveMoon.position.set(49.1, 4.15, 32.4)
  scene.add(coveMoon)
  // Small luminous points hover just above the meadow when the local sun sets.
  const fliesGeometry = new T.BufferGeometry()
  const fireflies = new Float32Array((low ? 12 : 28) * 3)
  for (let i = 0; i < fireflies.length; i += 3) {
    fireflies[i] = (random() - 0.5) * 23
    fireflies[i + 1] = 0.45 + random() * 0.9
    fireflies[i + 2] = (random() - 0.5) * 14
  }
  const resting = fireflies.slice()
  fliesGeometry.setAttribute('position', new T.BufferAttribute(fireflies, 3))
  const flyMaterial = new T.PointsMaterial({
    map: softDot('rgba(255,250,200,1)', 'rgba(255,220,110,0.55)'),
    color: '#ffe895',
    size: 0.26,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: T.AdditiveBlending,
  })
  const flies = new T.Points(fliesGeometry, flyMaterial)
  scene.add(flies)
  // Shooting stars streak across the night sky every so often.
  const streakCanvas = document.createElement('canvas')
  streakCanvas.width = 128
  streakCanvas.height = 8
  const sc = streakCanvas.getContext('2d')
  if (sc) {
    const g = sc.createLinearGradient(0, 0, 128, 0)
    g.addColorStop(0, 'rgba(255,255,255,0)')
    g.addColorStop(0.85, 'rgba(255,248,220,0.9)')
    g.addColorStop(1, 'rgba(255,255,255,1)')
    sc.fillStyle = g
    sc.fillRect(0, 2, 128, 4)
  }
  const streakMaterial = new T.MeshBasicMaterial({
    map: new T.CanvasTexture(streakCanvas),
    transparent: true,
    depthWrite: false,
    blending: T.AdditiveBlending,
    fog: false,
    opacity: 0,
  })
  streakMaterial.userData.noBend = true
  const streak = new T.Mesh(new T.PlaneGeometry(6, 0.12), streakMaterial)
  streak.visible = false
  scene.add(streak)
  let nightLevel = 0
  let nextStreak = 8
  let streakStart = -10
  const streakFrom = new T.Vector3(),
    streakDir = new T.Vector3()
  function update(date: Date) {
    const s = daylight(date)
    sky.set(s.a[1]).lerp(tmp.set(s.b[1]), s.mix)
    fog.color.copy(sky)
    seaColor.set(s.a[2]).lerp(tmp.set(s.b[2]), s.mix)
    sea.material.color.copy(seaColor)
    sun.color.set(s.a[3]).lerp(tmp.set(s.b[3]), s.mix)
    sun.intensity = s.intensity
    const angle = ((s.hour - 6) / 12) * Math.PI
    sun.position.set(
      -Math.cos(angle) * 19,
      7 + Math.abs(Math.sin(angle)) * 24,
      -10,
    )
    hemi.intensity = 1.65 - s.night * 0.94
    hemi.color.set('#fff3d8').lerp(tmp.set('#b6cfff'), s.night)
    // Golden hour: rosy sky light, violet bounce from the ground and a
    // peachy sun, like a storybook sunset.
    const golden = Math.max(0, 1 - Math.abs(s.hour - 7) / 1.6, 1 - Math.abs(s.hour - 18.7) / 1.7)
    hemi.color.lerp(tmp.set('#ffc0c8'), golden * 0.7)
    hemi.groundColor.set('#b7d08c').lerp(tmp.set('#9d86bd'), golden * 0.75 + s.night * 0.3)
    sun.color.lerp(tmp.set('#ffa98a'), golden * 0.5)
    flies.visible = s.night > 0.18
    flyMaterial.opacity = s.night
    coveMoon.visible = s.night > 0.55
    starMat.opacity = s.night
    nightLevel = s.night
    orb.material.color.set(s.night > 0.55 ? '#e5e9ff' : '#ffebae')
    orb.position.set(
      Math.cos(angle) * 24,
      4 + Math.abs(Math.sin(angle)) * 10,
      -35,
    )
    return s.night
  }
  return {
    update,
    animate: (t: number) => {
      if (nightLevel > 0.6 && t > nextStreak) {
        streakStart = t
        nextStreak = t + 7 + random() * 12
        streakFrom.set(-30 + random() * 50, 16 + random() * 10, -34 - random() * 10)
        streakDir.set(1, -0.45 - random() * 0.2, 0).normalize()
        streak.rotation.z = Math.atan2(streakDir.y, streakDir.x)
      }
      const age = (t - streakStart) / 0.9
      streak.visible = age >= 0 && age < 1
      if (streak.visible) {
        streak.position.copy(streakFrom).addScaledVector(streakDir, age * 22)
        streakMaterial.opacity = Math.sin(Math.PI * age) * nightLevel
      }
      if (flies.visible) {
        for (let i = 0; i < fireflies.length; i += 3) {
          fireflies[i] = resting[i] + Math.sin(t * 0.67 + i) * 0.22
          fireflies[i + 1] = resting[i + 1] + Math.cos(t * 0.92 + i) * 0.18
        }
        fliesGeometry.attributes.position.needsUpdate = true
      }
      seaClock.value = t
      clouds.position.x = Math.sin(t * 0.019) * 5

    },
  }
}
