import { useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import { Check, Shirt, X } from 'lucide-react'
import { outfits } from '../data/outfits'
import type { Lang } from '../data/village'

/**
 * The wardrobe: a grid of outfit cards, each with a tiny painted figure in
 * that look's colours. Picking one closes the wardrobe and the visitor
 * twirls into it.
 */
export default function Wardrobe({
  lang,
  current,
  title,
  hint,
  wearing,
  closeLabel,
  onPick,
  onClose,
}: {
  lang: Lang
  current: string
  title: string
  hint: string
  wearing: string
  closeLabel: string
  onPick: (id: string) => void
  onClose: () => void
}) {
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    box.current?.querySelector<HTMLButtonElement>('.outfit-card.on')?.focus()
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [onClose])
  return (
    <div className="wardrobe-backdrop" onClick={onClose}>
      <div className="wardrobe" role="dialog" aria-modal="true" aria-label={title} ref={box} onClick={(e) => e.stopPropagation()}>
        <header>
          <span className="wardrobe-icon">
            <Shirt size={22} />
          </span>
          <div>
            <h2>{title}</h2>
            <p>{hint}</p>
          </div>
          <button className="round" onClick={onClose} aria-label={closeLabel} title={closeLabel}>
            <X size={18} />
          </button>
        </header>
        <div className="outfit-grid">
          {outfits.map((o) => (
            <button
              key={o.id}
              className={'outfit-card' + (o.id === current ? ' on' : '')}
              onClick={() => onPick(o.id)}
              aria-pressed={o.id === current}
            >
              <span
                className={'outfit-doll hair-' + o.hairStyle}
                aria-hidden="true"
                style={
                  {
                    '--hair': o.hair,
                    '--top': o.top,
                    '--stripe': o.stripe ?? o.top,
                    '--bottom': o.bottom,
                    '--boot': o.boot,
                    '--accent': o.accent,
                    '--hat': o.hatColor,
                  } as CSSProperties
                }
              >
                {o.hat === 'wizard' && <i className="doll-wizard" />}
                {o.hat === 'bow' && <i className="doll-bow" />}
                {o.hat === 'headband' && <i className="doll-band" />}
                <i className="doll-hair" />
                <i className="doll-face" />
                <i className="doll-body" />
                <i className="doll-legs" />
              </span>
              <b>{o.name[lang]}</b>
              <small>{o.blurb[lang]}</small>
              {o.id === current && (
                <em>
                  <Check size={14} /> {wearing}
                </em>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
