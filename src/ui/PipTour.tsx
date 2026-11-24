import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Pause, Play, X } from 'lucide-react'
import { pipControls, pipStops, pipWelcome } from '../data/pipTour'
import type { Lang } from '../data/village'
import { play } from '../audio/sfx'

/** Split "*stressed* words" into plain and highlighted runs. */
function runs(text: string) {
  return text.split('*').map((part, i) => ({ part, strong: i % 2 === 1 }))
}

/** A little painted Pip: blinks, bobs and flaps his beak while talking. */
function PipPortrait({ talking, mood }: { talking: boolean; mood: 'happy' | 'wow' | 'wink' }) {
  return (
    <svg className={'pip-face' + (talking ? ' talking' : '')} viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="60" cy="62" r="50" fill="#3f6690" />
      <ellipse cx="60" cy="74" rx="36" ry="34" fill="#fff4df" />
      {/* captain's cap */}
      <path d="M22 40 Q60 2 98 40 Z" fill="#fffaf0" />
      <rect x="22" y="36" width="76" height="10" rx="5" fill="#2f4a6e" />
      <path d="M36 46 Q60 58 84 46 L84 50 Q60 62 36 50 Z" fill="#263d5c" />
      <circle cx="60" cy="30" r="6" fill="#f4c95d" />
      {/* eyes */}
      {mood === 'happy' ? (
        <g stroke="#2f2624" strokeWidth="4.5" strokeLinecap="round" fill="none">
          <path d="M40 68 q6 -7 12 0" />
          <path d="M68 68 q6 -7 12 0" />
        </g>
      ) : mood === 'wink' ? (
        <g>
          <ellipse className="pip-eye" cx="46" cy="67" rx="5.5" ry="7" fill="#2f2624" />
          <path d="M68 68 q6 -7 12 0" stroke="#2f2624" strokeWidth="4.5" strokeLinecap="round" fill="none" />
        </g>
      ) : (
        <g className="pip-eye">
          <ellipse cx="46" cy="66" rx="6.5" ry="8.5" fill="#2f2624" />
          <ellipse cx="74" cy="66" rx="6.5" ry="8.5" fill="#2f2624" />
          <circle cx="44" cy="63" r="2.2" fill="#fff" />
          <circle cx="72" cy="63" r="2.2" fill="#fff" />
        </g>
      )}
      <ellipse cx="34" cy="80" rx="7" ry="4" fill="#f7a3a0" opacity=".8" />
      <ellipse cx="86" cy="80" rx="7" ry="4" fill="#f7a3a0" opacity=".8" />
      {/* beak: the lower half flaps while Pip talks */}
      <path d="M50 78 L70 78 L60 86 Z" fill="#f4a246" />
      <path className="pip-beak" d="M52 82 L68 82 L60 92 Z" fill="#e88f32" />
      {/* neckerchief */}
      <path d="M38 104 Q60 114 82 104 L76 112 Q60 120 44 112 Z" fill="#e65b4c" />
    </svg>
  )
}

/**
 * Pip's guided tour as a proper dialogue box: a bobbing portrait, a name
 * ribbon, text typed out letter by letter with a chirpy voice, highlighted
 * key words, a stop badge, progress dots and a bouncing "next" arrow.
 */
export default function PipTour({
  lang,
  name,
  place,
  step,
  paused,
  closeLabel,
  setStep,
  setPaused,
  close,
}: {
  lang: Lang
  name: string
  place?: string
  /** null: welcome; 0…n-1: stops; n: farewell. */
  step: number | null
  paused: boolean
  closeLabel: string
  setStep: (step: number) => void
  setPaused: (value: boolean) => void
  close: () => void
}) {
  const ui = pipControls[lang]
  const stop = step !== null && step < pipStops.length ? pipStops[step] : undefined
  const finished = step === pipStops.length
  const text = stop ? stop[lang] : finished ? ui.end : pipWelcome[lang]
  const mood = stop?.mood ?? (finished ? 'wink' : 'happy')
  const plain = useMemo(() => text.replace(/\*/g, ''), [text])
  // How much of the current line is typed (reset whenever the line changes).
  const [typed, setTyped] = useState({ line: '', count: 0 })
  const reduced = useMemo(() => matchMedia('(prefers-reduced-motion: reduce)').matches, [])
  const shown = reduced ? plain.length : typed.line === plain ? typed.count : 0
  const setShown = (count: number) => setTyped({ line: plain, count })
  const typing = shown < plain.length
  const box = useRef<HTMLElement>(null)

  // Type the line out, chirping every few letters.
  useEffect(() => {
    if (!typing) return
    const ch = plain[shown]
    const pause = /[.!?…]/.test(ch) ? 190 : /[,:;]/.test(ch) ? 110 : 26
    const id = window.setTimeout(() => {
      if (shown % 3 === 0 && /\p{L}/u.test(ch)) play('blip', (ch.toLowerCase().charCodeAt(0) % 7) / 7)
      setTyped({ line: plain, count: shown + 1 })
    }, pause)
    return () => window.clearTimeout(id)
  }, [typing, shown, plain])

  // Move on by itself once the line has been read (unless paused).
  useEffect(() => {
    if (typing || paused || finished) return
    const id = window.setTimeout(() => setStep((step ?? -1) + 1), Math.max(3200, plain.length * 55))
    return () => window.clearTimeout(id)
  }, [typing, paused, finished, plain, step, setStep])

  const advance = () => {
    if (typing) setShown(plain.length)
    else if (finished) close()
    else setStep((step ?? -1) + 1)
  }
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.code === 'KeyE' || e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault()
        e.stopPropagation()
        advance()
      }
    }
    window.addEventListener('keydown', key, true)
    return () => window.removeEventListener('keydown', key, true)
  })

  // Reveal the typed prefix while keeping the stressed words coloured.
  const parts = runs(text)
  const starts = parts.map((_, i) => parts.slice(0, i).reduce((sum, r) => sum + r.part.length, 0))
  const visible = parts.map(({ part, strong }, i) => {
    const slice = part.slice(0, Math.max(0, shown - starts[i]))
    return strong ? <b key={i}>{slice}</b> : <span key={i}>{slice}</span>
  })

  return (
    <section className="pip-tour" aria-label={name} ref={box} onClick={advance}>
      <div className="pip-portrait">
        <PipPortrait talking={typing} mood={mood} />
      </div>
      <div className="pip-bubble">
        <header>
          <span className="pip-name">{name}</span>
          {stop && place && (
            <span className="pip-stop" key={stop.id}>
              <i>{stop.icon}</i>
              {place}
            </span>
          )}
          <button
            className="pip-close"
            aria-label={closeLabel}
            onClick={(e) => {
              e.stopPropagation()
              close()
            }}
          >
            <X size={16} />
          </button>
        </header>
        <p aria-live="polite" aria-label={plain}>
          {visible}
          {typing && <i className="pip-caret" />}
        </p>
        <footer onClick={(e) => e.stopPropagation()}>
          <div className="pip-dots" role="progressbar" aria-label={ui.progress} aria-valuenow={step === null ? 0 : step + 1} aria-valuemax={pipStops.length}>
            {pipStops.map((s, i) => (
              <button
                key={s.id}
                className={'pip-dot' + (step !== null && i < step ? ' done' : '') + (i === step ? ' on' : '')}
                onClick={() => setStep(i)}
                aria-label={String(i + 1)}
                title={s.icon}
              />
            ))}
          </div>
          <div className="pip-buttons">
            {step !== null && step > 0 && (
              <button onClick={() => setStep(step - 1)} aria-label={ui.back} title={ui.back}>
                <ChevronLeft size={17} />
              </button>
            )}
            {!finished && (
              <button onClick={() => setPaused(!paused)} aria-label={paused ? ui.resume : ui.pause} title={paused ? ui.resume : ui.pause}>
                {paused ? <Play size={15} /> : <Pause size={15} />}
              </button>
            )}
            <button className="pip-next" onClick={advance} aria-label={ui.next} title={ui.skip}>
              <ChevronRight size={18} />
            </button>
          </div>
        </footer>
        {!typing && <span className="pip-more" aria-hidden="true">▼</span>}
      </div>
    </section>
  )
}
