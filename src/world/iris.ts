/**
 * Classic circular "iris" wipe. The circle closes on the centre of the screen
 * (or on a given point), the scene swap runs only while the screen is fully
 * black, then the circle reopens from the same spot. It plays even with
 * reduced motion: the wipe itself moves nothing in the scene.
 */
export function makeIris(element: HTMLElement | null) {
  const closeDuration = 640
  const holdDuration = 220
  const openDuration = 700
  let action: (() => void) | undefined
  let finish: (() => void) | undefined
  let previous = 0
  let elapsed = 0
  let swapped = false
  /** Visible fraction of the screen radius: 1 open, 0 black. */
  let aperture = 1
  /** How strongly the camera should frame the visitor: rises while closing,
   * stays at 1 in the dark and eases back to 0 as the new scene opens. */
  let framing = 0

  // Closing accelerates into the centre, then holds a beat on a tiny circle
  // before snapping shut, like the old cartridge games.
  const easeInOutCubic = (t: number) =>
    t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
  const easeOutCubic = (t: number) => 1 - (1 - t) ** 3
  const easeInCubic = (t: number) => t * t * t
  function closeCurve(t: number) {
    const beat = 0.78
    if (t < beat) return 1 - 0.9 * easeInOutCubic(t / beat)
    return 0.1 * (1 - easeInCubic((t - beat) / (1 - beat)))
  }
  function openCurve(t: number) {
    const beat = 0.2
    if (t < beat) return 0.1 * easeOutCubic(t / beat)
    return 0.1 + 0.9 * easeInOutCubic((t - beat) / (1 - beat))
  }

  function stop() {
    action = undefined
    aperture = 1
    framing = 0
    const complete = finish
    finish = undefined
    if (element) {
      element.hidden = true
      element.classList.remove('sealed')
    }
    complete?.()
  }

  return {
    active: () => action !== undefined,
    framing: () => framing,
    start(swap: () => void, complete?: () => void) {
      if (action) return
      if (!element) {
        swap()
        complete?.()
        return
      }
      action = swap
      finish = complete
      previous = 0
      elapsed = 0
      swapped = false
      aperture = 1
      framing = 0
    },
    advance(now: number) {
      if (!action) return
      // Clamp each step so a slow frame (e.g. building a room) never skips
      // the black frame or the start of the reveal.
      elapsed += previous ? Math.min(now - previous, 40) : 0
      previous = now
      if (!swapped && elapsed >= closeDuration) {
        elapsed = closeDuration
        swapped = true
        aperture = 0
        framing = 1
        action()
        return
      }
      if (elapsed >= closeDuration + holdDuration + openDuration) {
        stop()
        return
      }
      if (elapsed < closeDuration) {
        aperture = closeCurve(elapsed / closeDuration)
        framing = easeInOutCubic(elapsed / closeDuration)
      } else {
        const t = Math.max(0, elapsed - closeDuration - holdDuration) / openDuration
        aperture = t > 0 ? openCurve(t) : 0
        framing = 1 - easeInOutCubic(t)
      }
    },
    draw(width: number, height: number, x = width / 2, y = height / 2) {
      if (!action || !element) return
      const radius = Math.hypot(Math.max(x, width - x), Math.max(y, height - y)) + 8
      element.style.setProperty('--iris-x', x + 'px')
      element.style.setProperty('--iris-y', y + 'px')
      element.style.setProperty('--iris-radius', (radius * aperture).toFixed(2) + 'px')
      element.classList.toggle('sealed', aperture <= 0.002)
      element.hidden = false
    },
  }
}
