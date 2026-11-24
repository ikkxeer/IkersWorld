import * as T from 'three'

export function createLookout(canvas: HTMLCanvasElement, scene: T.Scene) {
  const ink = canvas.getContext('2d')
  const wildlife = new T.Group()
  wildlife.visible = false
  scene.add(wildlife)
  const sphere = new T.SphereGeometry(1, 16, 10)
  const fin = new T.ConeGeometry(1, 2, 5)
  const paints = ['#6babc1', '#c9e4e8', '#354d61', '#fff2de', '#a5a4ad', '#f8ddae']
    .map(color => new T.MeshBasicMaterial({ color, fog: false }))
  function piece(group: T.Group, shape: T.BufferGeometry, material: number, x: number, y: number, z: number, sx: number, sy: number, sz: number, rz = 0) {
    const mesh = new T.Mesh(shape, paints[material])
    mesh.position.set(x, y, z)
    mesh.scale.set(sx, sy, sz)
    mesh.rotation.z = rz
    group.add(mesh)
    return mesh
  }
  const pod = Array.from({ length: 3 }, () => {
    const body = new T.Group()
    piece(body, sphere, 0, 0, 0, 0, .55, .21, .21)
    piece(body, sphere, 1, .14, -.093, 0, .43, .13, .17)
    piece(body, sphere, 0, .49, -.02, 0, .22, .092, .11)
    piece(body, sphere, 2, .37, .07, .152, .038, .035, .035)
    piece(body, fin, 0, -.11, .20, 0, .18, .23, .055, .45)
    for (const side of [-1, 1]) {
      piece(body, sphere, 0, -.55, .02, side * .12, .17, .06, .19, -.35)
      piece(body, sphere, 0, .04, -.09, side * .19, .18, .035, .12, -.32)
    }
    wildlife.add(body)
    return body
  })
  const birds = Array.from({ length: 8 }, () => {
    const gull = new T.Group()
    piece(gull, sphere, 3, 0, 0, 0, .20, .072, .085)
    piece(gull, sphere, 5, .2, .016, 0, .085, .034, .04)
    const wings = [-1, 1].map(side => {
      const hinge = new T.Group()
      gull.add(hinge)
      piece(hinge, sphere, 3, -.03, 0, side * .21, .16, .035, .26)
      piece(hinge, sphere, 4, -.08, 0, side * .38, .105, .029, .117)
      return hinge
    })
    wildlife.add(gull)
    return { gull, wings }
  })
  const ripples = pod.map(() => {
    const ring = new T.Mesh(new T.RingGeometry(.72, .84, 32), new T.MeshBasicMaterial({
      color: '#edffff', side: T.DoubleSide, transparent: true, depthWrite: false, fog: false,
    }))
    ring.rotation.x = -Math.PI / 2
    wildlife.add(ring)
    return ring
  })

  const sailboat = new T.Group()
  piece(sailboat, sphere, 2, 0, 0, 0, .52, .105, .16)
  piece(sailboat, sphere, 5, 0, .035, 0, .43, .04, .14)
  piece(sailboat, sphere, 2, .02, .38, 0, .019, .36, .019)
  const sail = new T.Shape()
  sail.moveTo(.03, .69)
  sail.quadraticCurveTo(.12, .41, .39, .17)
  sail.lineTo(.03, .16)
  sail.closePath()
  const sailMesh = new T.Mesh(new T.ShapeGeometry(sail), new T.MeshBasicMaterial({
    color: '#fff1cc', side: T.DoubleSide, fog: false,
  }))
  sailboat.add(sailMesh)
  wildlife.add(sailboat)

  let clock = 0
  let active = false
  let darkness = false
  const aim = new T.Vector3()
  const right = new T.Vector3()
  function update(view: number, night: number, dt: number, camera: T.Camera, reduced: boolean, paused: boolean) {
    const visible = view > .85
    const dark = night > .55
    if (!visible || !active || darkness !== dark) clock = 0
    active = visible
    darkness = dark
    if (visible && !paused) clock += dt
    wildlife.visible = visible && !dark
    if (wildlife.visible) {
      camera.getWorldDirection(aim)
      aim.y = 0
      aim.normalize()
      right.set(-aim.z, 0, aim.x)
      const yaw = Math.atan2(-right.z, right.x)
      const drift = (clock / 29 + .28) % 1
      sailboat.position.copy(camera.position).addScaledVector(aim, 31)
        .addScaledVector(right, -5 + drift * 10)
      sailboat.position.y = -.805 + Math.sin(clock * 1.65) * .03
      sailboat.rotation.set(0, yaw, Math.sin(clock * 1.4) * .065, 'YXZ')
      const fly = ((clock + 2) % 12) / 8
      birds.forEach(({gull, wings}, i) => {
        gull.visible = fly < 1
        gull.position.copy(camera.position).addScaledVector(aim, 17 + (i % 2) * 1.8)
          .addScaledVector(right, -7 + fly * 13 - i * .52)
        gull.position.y = 2.35 + Math.sin(i * 2.1) * .4
        gull.rotation.y = yaw
        wings.forEach((wing, side) => { wing.rotation.x = (side * 2 - 1) * (reduced ? -.26 : Math.sin(clock * 7.5 + i * .6) * .72) })
      })
      pod.forEach((dolphin, i) => {
        const progress = (clock + 9 - i * .68) % 9
        const leap = Math.min(1, progress / 1.65)
        dolphin.visible = leap < 1
        dolphin.position.copy(camera.position).addScaledVector(aim, 13 + i * 1.3)
          .addScaledVector(right, -1.9 + leap * 3.8 - i * .34)
        dolphin.position.y = -.98 + Math.sin(leap * Math.PI) * (1.55 + i * .12)
        dolphin.rotation.set(0, yaw, Math.cos(leap * Math.PI) * .72, 'YXZ')
        const splash = progress - 1.65
        const ripple = ripples[i]
        ripple.visible = splash > 0 && splash < 1
        ripple.position.copy(dolphin.position)
        ripple.position.y = -.865
        ripple.scale.setScalar(.39 + Math.max(0, splash) * 1.05)
        ripple.material.opacity = Math.max(0, (1 - splash) * .57)
      })
    }

    if (!ink) return
    if (!visible || !dark) {
      if (canvas.width) canvas.width = 0
      return
    }
    const ratio = Math.min(devicePixelRatio, 2)
    const w = canvas.clientWidth, h = canvas.clientHeight
    if (canvas.width !== Math.round(w * ratio) || canvas.height !== Math.round(h * ratio)) {
      canvas.width = Math.round(w * ratio)
      canvas.height = Math.round(h * ratio)
    }
    ink.setTransform(ratio, 0, 0, ratio, 0, 0)
    ink.clearRect(0, 0, w, h)
    const span = Math.min(w, h)
    function streak(x: number, y: number, length: number, tilt: number, color: string, opacity: number, thickness: number) {
      if (!ink) return
      const tx = x - length, ty = y - length * tilt
      const trail = ink.createLinearGradient(tx, ty, x, y)
      trail.addColorStop(0, 'transparent')
      trail.addColorStop(1, color)
      ink.globalAlpha = opacity
      ink.strokeStyle = trail
      ink.lineWidth = thickness
      ink.lineCap = 'round'
      ink.beginPath()
      ink.moveTo(tx, ty)
      ink.lineTo(x, y)
      ink.stroke()
      ink.fillStyle = color
      ink.beginPath()
      ink.arc(x, y, thickness * .65, 0, Math.PI * 2)
      ink.fill()
      ink.globalAlpha = 1
    }
    const minutes = (clock + 1.8) % 24
    if (minutes < 8) {
      const u = minutes / 8
      streak(w * (.15 + u * .62), h * (.19 + u * .09), span * .16, .19, '#b3ecff', .88 * Math.sin(u * Math.PI), 3)
    }
    const count = minutes >= 10 && minutes <= 19 ? 12 : 2
    for (let i = 0; i < count; i++) {
      const u = ((clock + i * .39) % (count === 2 ? 5.7 : 2.35)) / .95
      if (u < 1) streak(w * (.12 + (i * .173) % .65 + u * .28), h * (.16 + (i * .137) % .29 + .22 * u),
        span * (.07 + i % 4 * .018), .44, i % 4 === 1 ? '#ffcfa4' : '#fff4cf', Math.sin(u * Math.PI), 1.4 + i % 3 * .55)
    }
  }
  return { update }
}
