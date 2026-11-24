import { ruptureTime, vortexTime } from './transformation'

export function createCinematicOverlay(canvas: HTMLCanvasElement, low: boolean) {
  const ink = canvas.getContext('2d')
  const drops = Array.from({length: low ? 84 : 155}, (_, i) => ({
    x: (i * .618034) % 1,
    y: (i * .347296) % 1,
    speed: .58 + (i % 9) * .12,
    length: 12 + (i % 8) * 4,
  }))
  let stormTime = 0
  let stormOn = false
  const bolt = [[.77,.03],[.748,.116],[.777,.111],[.716,.24],[.773,.161],[.7,.35]]
  return {
    update(time: number | null, storm: boolean, dt: number, reduced: boolean) {
      if (storm && !stormOn) stormTime = 0
      stormOn = storm
      if (storm) stormTime += dt
      const lightningAge = (stormTime + 8) % 12 - .06
      const strike = storm && lightningAge >= 0 && lightningAge < .34 ? 1 - lightningAge / .34 : 0
      if (!ink) return strike
      if (time === null && !storm) {
        if (canvas.width) canvas.width = 0
        return 0
      }
      const w = canvas.clientWidth, h = canvas.clientHeight
      const ratio = Math.min(devicePixelRatio, 1.75)
      if (canvas.width !== Math.round(w * ratio) || canvas.height !== Math.round(h * ratio)) {
        canvas.width = Math.round(w * ratio)
        canvas.height = Math.round(h * ratio)
      }
      ink.setTransform(ratio, 0, 0, ratio, 0, 0)
      ink.clearRect(0, 0, w, h)
      if (storm) {
        ink.lineWidth = 1.15
        ink.strokeStyle = reduced ? 'rgba(192,221,239,.23)' : 'rgba(192,221,239,.46)'
        ink.beginPath()
        for (const drop of drops) {
          const age = reduced ? 0 : stormTime * drop.speed
          const x = ((drop.x + 100 - age * .22) % 1 + 1) % 1 * (w + 50)
          const y = (drop.y + age) % 1 * (h + 50) - 45
          ink.moveTo(x, y)
          ink.lineTo(x - drop.length * .34, y + drop.length)
        }
        ink.stroke()
        if (strike > 0) {
          ink.strokeStyle = 'rgba(204,224,255,' + strike * (reduced ? .36 : .9) + ')'
          ink.lineWidth = 2.3
          ink.beginPath()
          bolt.forEach(([x,y], i) => i ? ink.lineTo(x * w,y * h) : ink.moveTo(x * w,y * h))
          ink.stroke()
        }
      }
      if (time === null) return strike
      const age = time - ruptureTime
      if (!reduced && time > vortexTime && age < .74) {
        const rise = Math.min(1, (time - vortexTime) / 2.7)
        const fade = age > 0 ? Math.max(0, 1 - age / .74) : 1
        const radius = Math.hypot(w,h) * .58
        for (let i = 0; i < 73; i++) {
          const angle = (i * .618034 % 1) * Math.PI * 2 + Math.floor(time * 15) * .067
          const dx = Math.cos(angle), dy = Math.sin(angle)
          const outer = radius * (.82 + (i % 13) * .022)
          const inner = radius * (.31 + (i % 13) * .019 - rise * .075)
          ink.fillStyle = i % 4 === 0 ? `rgba(255,226,153,${rise * fade * .47})` : `rgba(30,19,32,${rise * fade * .61})`
          ink.beginPath()
          ink.moveTo(w / 2 + dx * inner, h / 2 + dy * inner)
          ink.lineTo(w / 2 + dx * outer - dy * 2.2, h / 2 + dy * outer + dx * 2.2)
          ink.lineTo(w / 2 + dx * outer + dy * 2.2, h / 2 + dy * outer - dx * 2.2)
          ink.fill()
        }
      }
      // A single warm frame of light, then a comic impact on the expanding wave.
      if (!reduced && age >= 0 && age < .21) {
        ink.fillStyle = 'rgba(255,245,213,' + .87 * (1 - age / .21) ** 2 + ')'
        ink.fillRect(0,0,w,h)
      }
      if (age >= .075 && age < .79) {
        const size = Math.max(38, Math.min(h,w) * .16)
        const opacity = Math.min(1, (.79 - age) * 4)
        ink.save()
        ink.translate(w * .65, h * .32)
        ink.rotate(-.13)
        ink.globalAlpha = opacity
        ink.font = '900 ' + size + 'px "Lilita One", system-ui, sans-serif'
        ink.textAlign = 'center'
        ink.lineWidth = Math.max(3,size * .085)
        ink.strokeStyle = '#2c182f'
        ink.fillStyle = '#ffde76'
        ink.strokeText('¡PUM!',0,0)
        ink.fillText('¡PUM!',0,0)
        ink.restore()
      }
      return strike
    },
  }
}
