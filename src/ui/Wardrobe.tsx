import { useEffect, useRef, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, Shirt, X } from 'lucide-react'
import { outfits } from '../data/outfits'
import type { Lang } from '../data/village'

type Stage = Awaited<ReturnType<typeof import('../world/preview')['createOutfitStage']>>

/**
 * The wardrobe: a dressing-room stage where the highlighted outfit turns
 * slowly on a turntable, next to a grid of rendered portraits. Hover or
 * arrow through to preview, then put it on.
 */
export default function Wardrobe({
  lang,
  current,
  title,
  hint,
  wearing,
  wearLabel,
  closeLabel,
  onPick,
  onClose,
}: {
  lang: Lang
  current: string
  title: string
  hint: string
  wearing: string
  wearLabel: string
  closeLabel: string
  onPick: (id: string) => void
  onClose: () => void
}) {
  const box = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const stage = useRef<Stage | null>(null)
  const [selected, setSelected] = useState(current)
  const [previewFailed, setPreviewFailed] = useState(false)
  const [thumbs, setThumbs] = useState<Record<string, string>>({})
  const selectedRef = useRef(selected)
  const index = Math.max(0, outfits.findIndex((o) => o.id === selected))
  const outfit = outfits[index]

  // Boot the 3D stage (and render the portraits) once.
  useEffect(() => {
    let alive = true
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    import('../world/preview').then(({ createOutfitStage }) => {
      if (!alive || !canvas.current) return
      const s = createOutfitStage(canvas.current, reduced)
      stage.current = s
      s.show(selectedRef.current)
      void s.thumbnails(168, (id, url) => {
        if (alive) setThumbs((t) => ({ ...t, [id]: url }))
      }).catch(() => { if (alive) setPreviewFailed(true) })
    }).catch(() => { if (alive) setPreviewFailed(true) })
    return () => {
      alive = false
      stage.current?.dispose()
      stage.current = null
    }
  }, [])

  useEffect(() => {
    selectedRef.current = selected
    stage.current?.show(selected)
  }, [selected])

  useEffect(() => {
    box.current?.querySelector<HTMLButtonElement>('.outfit-card.on')?.focus()
  }, [])

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault()
        const step = e.key === 'ArrowLeft' ? -1 : 1
        setSelected((id) => {
          const i = outfits.findIndex((o) => o.id === id)
          return outfits[(i + step + outfits.length) % outfits.length].id
        })
      }
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [onClose])

  const step = (delta: number) => setSelected(outfits[(index + delta + outfits.length) % outfits.length].id)

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
        <div className="wardrobe-main">
          <section className="dressing-stage" aria-live="polite">
            <div className="stage-viewport">
              <canvas ref={canvas} aria-hidden="true" />
              {previewFailed && <Shirt className="stage-fallback" size={65} aria-hidden="true" />}
            </div>
            <button className="stage-arrow prev" onClick={() => step(-1)} aria-label="←">
              <ChevronLeft size={22} />
            </button>
            <button className="stage-arrow next" onClick={() => step(1)} aria-label="→">
              <ChevronRight size={22} />
            </button>
            <div className="stage-caption">
              <small>
                {index + 1} / {outfits.length}
              </small>
              <b>{outfit.name[lang]}</b>
              <p>{outfit.blurb[lang]}</p>
              {outfit.id === current ? (
                <span className="stage-wearing">
                  <Check size={16} /> {wearing}
                </span>
              ) : (
                <button className="primary small" onClick={() => onPick(outfit.id)}>
                  <Shirt size={18} /> {wearLabel}
                </button>
              )}
            </div>
          </section>
          <div className="outfit-grid">
            {outfits.map((o) => (
              <button
                key={o.id}
                className={'outfit-card' + (o.id === selected ? ' on' : '') + (o.id === current ? ' worn' : '')}
                onClick={() => setSelected(o.id)}
                onDoubleClick={() => onPick(o.id)}
                onPointerEnter={(e) => e.pointerType === 'mouse' && setSelected(o.id)}
                aria-pressed={o.id === selected}
                aria-label={o.name[lang]}
              >
                <span className="outfit-thumb" style={{ background: `radial-gradient(circle at 50% 70%, ${o.top}55, ${o.accent}22 70%)` }}>
                  {thumbs[o.id] ? <img src={thumbs[o.id]} alt="" /> : previewFailed ? <Shirt size={30} /> : <i className="thumb-spinner" />}
                </span>
                <b>{o.name[lang]}</b>
                {o.id === current && (
                  <em>
                    <Check size={12} />
                  </em>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
