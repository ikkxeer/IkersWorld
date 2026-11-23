import type { CSSProperties } from 'react'
import { Volume2, VolumeX } from 'lucide-react'

const palette = ['#ff8a73', '#ffc94d', '#8fdcb2', '#7cc8f2', '#f7a1c4']

/**
 * The title screen: the logo hops in letter by letter over the slowly
 * turning island, then a pulsing "press any key" prompt waits for the player.
 */
export default function Title({
  subtitle,
  prompt,
  credits,
  leaving,
  sound,
  soundLabel,
  onStart,
  onSound,
}: {
  subtitle: string
  prompt: string
  credits: string
  leaving: boolean
  sound: boolean
  soundLabel: string
  onStart: () => void
  onSound: () => void
}) {
  const word = (text: string, offset: number, colourful: boolean) =>
    text.split('').map((ch, i) => (
      <span
        key={i}
        className="title-letter"
        style={{ '--i': i + offset, '--fill': colourful ? palette[i % palette.length] : '#fff8e7' } as CSSProperties}
      >
        <span>{ch}</span>
      </span>
    ))
  return (
    <div className={'title-screen' + (leaving ? ' leaving' : '')} onPointerUp={onStart}>
      <div className="title-sparkles" aria-hidden="true">
        {[
          [22, 18],
          [16, 34],
          [27, 66],
          [14, 80],
          [40, 12],
          [44, 86],
          [33, 50],
        ].map(([top, left], i) => (
          <i key={i} style={{ '--k': i, top: top + '%', left: left + '%' } as CSSProperties} />
        ))}
      </div>
      <h1 className="title-logo" aria-label="Iker’s World">
        <span className="title-word" aria-hidden="true">
          {word('Iker’s', 0, false)}
        </span>
        <span className="title-word big" aria-hidden="true">
          {word('World', 6, true)}
        </span>
      </h1>
      <p className="title-ribbon">
        <span>{subtitle}</span>
      </p>
      <button className="title-start" onClick={onStart} autoFocus>
        <span className="title-a" aria-hidden="true">
          A
        </span>
        {prompt}
      </button>
      <footer className="title-foot">
        <small>{credits}</small>
        <button
          className="title-sound"
          aria-pressed={sound}
          aria-label={soundLabel}
          title={soundLabel}
          onPointerUp={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            onSound()
          }}
        >
          {sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>
      </footer>
    </div>
  )
}
