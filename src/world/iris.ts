/** A scene swap runs only while the screen is fully covered by the iris. */
export function makeIris(element: HTMLElement | null, motion: MediaQueryList) {
  const closeDuration = 420
  const holdDuration = 85
  const openDuration = 520
  let action: (() => void) | undefined
  let finish: (() => void) | undefined
  let previous = 0
  let elapsed = 0
  let swapped = false
  let progress = 0

  function stop() {
    action = undefined
    const complete = finish
    finish = undefined
    if (element) element.hidden = true
    complete?.()
  }

  return {
    active: () => action !== undefined,
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
    },
    advance(now: number) {
      if (!action) return
      // Preserve the closed frame even when loading a room stalls rendering.
      elapsed += previous ? Math.min(now - previous, 45) * (motion.matches ? 3 : 1) : 0
      previous = now
      if (!swapped && elapsed >= closeDuration) elapsed = closeDuration
      const time = elapsed
      if (time >= closeDuration && !swapped) {
        swapped = true
        action()
      }
      if (time >= closeDuration + holdDuration + openDuration) {
        stop()
        return
      }
      const easing = (t: number) => t * t * (3 - 2 * t)
      progress =
        time < closeDuration
          ? 1 - easing(time / closeDuration)
          : easing(
              Math.max(0, time - closeDuration - holdDuration) / openDuration,
            )
    },
    draw(x: number, y: number, width: number, height: number) {
      if (!action || !element) return
      const radius =
        Math.hypot(Math.max(x, width - x), Math.max(y, height - y)) + 16
      element.style.setProperty('--iris-x', x + 'px')
      element.style.setProperty('--iris-y', y + 'px')
      element.style.setProperty('--iris-radius', radius * progress + 'px')
      element.classList.toggle('sealed', motion.matches || progress <= 0.001)
      element.style.opacity = motion.matches ? String(1 - progress) : '1'
      element.hidden = false
    },
  }
}
