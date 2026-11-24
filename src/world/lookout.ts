import * as T from 'three'

export function createLookout(canvas: HTMLCanvasElement, scene: T.Scene) {
  const ink = canvas.getContext('2d')
  const wildlife = new T.Group()
  wildlife.visible = false
  scene.add(wildlife)
  const sphere = new T.SphereGeometry(1, 16, 10)
  const paints = ['#6397a9', '#cae4df', '#304852', '#fff2de', '#555e67', '#e7b072', '#925b40']
    .map(color => new T.MeshStandardMaterial({ color, roughness: .83, fog: false }))
  function piece(group: T.Group, geometry: T.BufferGeometry, material: number, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1) {
    const mesh = new T.Mesh(geometry, paints[material])
    mesh.position.set(x, y, z)
    mesh.scale.set(sx, sy, sz)
    group.add(mesh)
    return mesh
  }

  // Sew a smooth skin between the cross sections of the body or hull.
  function profile(sections: number[][], colors?: [string, string]) {
    const vertices = [], indices = [], shades = []
    const slices = 24
    const upper = new T.Color(colors?.[0]), lower = new T.Color(colors?.[1])
    const tint = new T.Color()
    for (const [x, y, height, width] of sections) {
      for (let i = 0; i < slices; i++) {
        const angle = i / slices * Math.PI * 2
        const lift = Math.cos(angle)
        vertices.push(x, y + lift * height, Math.sin(angle) * width)
        tint.copy(lower).lerp(upper, T.MathUtils.smoothstep(lift, -.62, -.12))
        shades.push(tint.r, tint.g, tint.b)
      }
    }
    for (let row = 1; row < sections.length; row++) {
      for (let i = 0; i < slices; i++) {
        const a = (row - 1) * slices + i, b = (row - 1) * slices + (i + 1) % slices
        indices.push(a, b, a + slices, b, b + slices, a + slices)
      }
    }
    const geometry = new T.BufferGeometry()
    geometry.setAttribute('position', new T.Float32BufferAttribute(vertices, 3))
    if (colors) geometry.setAttribute('color', new T.Float32BufferAttribute(shades, 3))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()
    return geometry
  }
  function outline(points: number[][]) {
    const shape = new T.Shape()
    shape.moveTo(points[0][0], points[0][1])
    for (const [x, y, endX, endY] of points.slice(1)) shape.quadraticCurveTo(x, y, endX, endY)
    shape.closePath()
    return new T.ExtrudeGeometry(shape, {depth: .018, bevelEnabled: true, bevelSize: .012, bevelThickness: .008, bevelSegments: 1})
  }
  const dolphinSkin = profile([
    [-.84,.02,.001,.001], [-.64,.016,.067,.087], [-.42,.025,.14,.14],
    [-.18,.047,.21,.191], [.09,.055,.226,.212], [.32,.035,.187,.17],
    [.46,-.017,.1,.12], [.55,-.067,.057,.093], [.73,-.06,.036,.054], [.77,-.055,.001,.001],
  ], ['#558ba3','#d3e5df'])
  const slick = new T.MeshStandardMaterial({vertexColors: true, roughness: .34, side: T.DoubleSide, fog: false})
  const dorsal = outline([[.16,.17], [-.015,.30,-.19,.47], [-.17,.28,-.44,.153]])
  const fluke = outline([[.1,0], [-.05,.2,-.25,.35], [-.25,.09,-.11,0], [-.25,-.09,-.25,-.35], [-.05,-.2,.1,0]])
  const pod = Array.from({ length: 3 }, (_, i) => {
    const body = new T.Group()
    body.add(new T.Mesh(dolphinSkin, slick))
    piece(body, dorsal, 0, 0, 0, -.009)
    const tail = new T.Group()
    tail.position.set(-.73,.025,0)
    piece(tail, fluke, 0, 0,0,0).rotation.x = Math.PI / 2
    body.add(tail)
    for (const side of [-1, 1]) {
      piece(body, sphere, 2, .38,.049,side * .145,.027,.023,.012)
      piece(body, sphere, 3, .386,.056,side * .156,.008,.008,.005)
      piece(body, sphere, 0, -.02,-.105,side * .18,.25,.035,.096).rotation.y = side * -.58
    }
    body.scale.setScalar(1 - i * .10)
    wildlife.add(body)
    return { body, tail }
  })
  const feather = outline([[.17,0], [.14,.2,.03,.38], [-.05,.48,-.23,.57], [-.16,.31,-.11,.21], [-.17,.10,-.12,0]])
  const tip = outline([[.03,.38], [-.05,.48,-.23,.57], [-.18,.43,-.148,.365], [-.10,.39,.03,.38]])
  const birds = Array.from({ length: 8 }, () => {
    const gull = new T.Group()
    piece(gull, sphere, 3, 0,0,0,.24,.092,.092)
    piece(gull, sphere, 3, .157,.043,0,.089,.073,.065)
    piece(gull, sphere, 5, .239,.029,0,.068,.022,.029)
    for (const side of [-1, 1]) piece(gull, sphere, 2, .174,.067,side * .055,.015,.016,.012)
    const wings = [-1, 1].map(side => {
      const hinge = new T.Group()
      const plumes = new T.Group()
      plumes.rotation.x = side * Math.PI / 2
      piece(plumes, feather, 3, 0,0,0)
      piece(plumes, tip, 4, 0,0,.015)
      hinge.add(plumes)
      gull.add(hinge)
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
  const hull = profile([[-.73,.027,.008,.023],[-.53,-.009,.13,.16],[-.22,-.04,.17,.24],[.19,-.037,.17,.24],[.52,-.001,.125,.14],[.78,.044,.008,.004]],
    ['#a46a46','#574134'])
  sailboat.add(new T.Mesh(hull, new T.MeshStandardMaterial({vertexColors: true, side: T.DoubleSide, roughness: .82, fog: false})))
  piece(sailboat, sphere, 5, 0,.103,0,.63,.034,.215)
  const spar = new T.CylinderGeometry(.018,.023,1.11,10)
  piece(sailboat, spar, 6, -.08,.69,0)
  piece(sailboat, spar, 6, -.33,.31,0,.65,.54,.65).rotation.z = Math.PI / 2
  const mainSail = outline([[-.07,1.19], [-.33,.89,-.61,.34], [-.35,.29,-.073,.34]])
  const jib = outline([[.02,1.02], [.25,.72,.55,.36], [.4,.29,.026,.33]])
  piece(sailboat, mainSail, 3, 0,0,.028)
  piece(sailboat, jib, 1, 0,0,-.008)
  const pennant = outline([[-.072,1.22], [-.27,1.27,-.36,1.20], [-.19,1.19,-.072,1.15]])
  const pennantMesh = new T.Mesh(pennant, new T.MeshStandardMaterial({color:'#bc665a',roughness: .9, fog:false}))
  sailboat.add(pennantMesh)
  const wake = new T.Group()
  for (const side of [-1, 1]) {
    const foam = piece(wake, sphere, 1, -1.14,-.012,side * .15,.48,.01,.024)
    foam.rotation.y = side * .18
  }
  sailboat.add(wake)
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
      sailboat.rotation.set(Math.sin(clock * .95) * .065, yaw + .22, Math.sin(clock * 1.4) * .046, 'YXZ')
      pennantMesh.rotation.y = reduced ? 0 : Math.sin(clock * 6.7) * .23
      const fly = ((clock + 2) % 12) / 8
      birds.forEach(({gull, wings}, i) => {
        gull.visible = fly < 1
        gull.position.copy(camera.position).addScaledVector(aim, 17 + (i % 2) * 1.8)
          .addScaledVector(right, -7 + fly * 13 - i * .52)
        gull.position.y = 2.20 + Math.sin(i * 2.1) * .32 + Math.sin(clock * 1.4 + i * .7) * .16
        gull.rotation.set(0, yaw + Math.sin(clock + i) * .14, Math.sin(clock * .9 + i) * .13, 'YXZ')
        wings.forEach((wing, side) => { wing.rotation.x = (side * 2 - 1) * (reduced ? -.26 : Math.sin(clock * 7.5 + i * .6) * .72) })
      })
      pod.forEach(({body: dolphin, tail}, i) => {
        const progress = (clock + 9 - i * .68) % 9
        const leap = Math.min(1, progress / 1.65)
        dolphin.visible = leap < 1
        dolphin.position.copy(camera.position).addScaledVector(aim, 13 + i * 1.3)
          .addScaledVector(right, -1.9 + leap * 3.8 - i * .34)
        dolphin.position.y = -.98 + Math.sin(leap * Math.PI) * (1.55 + i * .12)
        dolphin.rotation.set(0, yaw - .12, Math.atan2(Math.PI * 1.55 * Math.cos(leap * Math.PI), 3.8), 'YXZ')
        tail.rotation.z = reduced ? 0 : Math.sin(leap * Math.PI * 5) * .42
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
