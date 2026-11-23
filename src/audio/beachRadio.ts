import { radioCove } from '../data/island'

export const tracks = [
  { file: 'greedy.mp3', title: 'GREEDY', artist: 'PARTYNEXTDOOR & Drake' },
  { file: 'marvins-room.mp3', title: 'Marvins Room', artist: 'Drake' },
  { file: 'over-my-dead-body.mp3', title: 'Over My Dead Body', artist: 'Drake' },
  { file: 'otra-noche-en-miami.mp3', title: 'Otra Noche en Miami', artist: 'Bad Bunny' },
]

let muted = false
export function muteRadio(value: boolean) {
  muted = value
  if (player) player.muted = value
}
let context: AudioContext | undefined
let player: HTMLAudioElement | undefined
let panner: PannerNode | undefined
let gain: GainNode | undefined
let playing = -1
let revision = 0
const listeners = new Set<() => void>()
export const subscribeRadio = (fn: () => void) => {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}
export const radioSnapshot = () => playing
function announce(index: number) {
  playing = index
  listeners.forEach(fn => fn())
}
export function stopRadio() {
  revision++
  player?.pause()
  announce(-1)
}
export async function playRadio(index: number) {
  const src = '/audio/' + tracks[index].file
  if (!context || !player) {
    context = new AudioContext()
    player = new Audio()
    player.muted = muted
    panner = context.createPanner()
    panner.panningModel = 'HRTF'
    panner.distanceModel = 'inverse'
    panner.refDistance = 2
    panner.rolloffFactor = 1.7
    gain = context.createGain()
    context.createMediaElementSource(player).connect(panner).connect(gain).connect(context.destination)
    player.onended = stopRadio
    player.onerror = stopRadio
  }
  const request = ++revision
  player.src = src
  try {
    await Promise.all([context.resume(), player.play()])
    if (request === revision) announce(index)
  } catch (e) {
    if (request === revision) { stopRadio(); throw e }
  }
}

// Listener at the visitor's head, axes aligned with the view. Positive x is screen right.
export function positionRadio(x: number, y: number, z: number, yaw: number, indoors: boolean) {
  if (!panner || !context || !gain) return
  const dx = radioCove.speaker[0] - x, dz = radioCove.speaker[1] - z
  panner.setPosition(dx * Math.cos(yaw) - dz * Math.sin(yaw), 0.78 - y, dx * Math.sin(yaw) + dz * Math.cos(yaw))
  gain.gain.setTargetAtTime(indoors || document.hidden ? 0 : 0.85, context.currentTime, 0.12)
}
export function disposeRadio() {
  stopRadio()
  if (player) { player.onerror = null; player.removeAttribute('src'); player.load() }
  void context?.close()
  player = undefined
  context = undefined
  gain = undefined
  panner = undefined
}
