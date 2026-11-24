import { stations } from './data/gallery'
import type { Interior } from './world/contracts'
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  Compass,
  LogOut,
  Map as MapIcon,
  MapPin,
  Sun,
  Moon,
  Sunrise,
  Sunset,
  Volume2,
  VolumeX,
  Globe2,
  ChevronDown,
  Gamepad2,
  Plus,
  Minus,
  Check,
  X,
  Footprints,
  Fish,
  Gift,
} from 'lucide-react'
import type { CSSProperties } from 'react'
import { fishKinds } from './data/fish'
import {
  copy,
  placeKeys,
  languages,
  type Lang,
  type Zone,
  type Panel,
} from './data/village'
import { portfolio } from './data/portfolio'
import { daylight } from './environment/daylight'
import { useAmbience } from './hooks/useAmbience'
import type {
  AnglerUpdate,
  Target,
  VillageController,
  VillageEvents,
} from './world/contracts'
import Game from './ui/Game'
import Arrival from './ui/Arrival'
const Wardrobe = lazy(() => import('./ui/Wardrobe'))
import { loadOutfit, saveOutfit } from './data/outfits'
import { places, type MapPlace } from './data/places'
import { pipStops } from './data/pipTour'
import PipTour from './ui/PipTour'
const Journal = lazy(() => import('./ui/Panel'))
import VillageMap, { ZoneIcon } from './ui/Map'
const languageNames = { es: 'Español', ca: 'Català', en: 'English' }
function readLang(): Lang {
  try {
    const s = localStorage.getItem('ikers-world-lang')
    return languages.includes(s as Lang) ? (s as Lang) : 'es'
  } catch {
    return 'es'
  }
}
function placeName(
  place: Target | null,
  lang: Lang,
  exhibit?: number,
  inside: Interior = false,
) {
  const t = copy[lang]
  if (place === 'projects' && exhibit !== undefined)
    return portfolio(lang).projects[exhibit].name
  if (place === 'radio') return t.radio
  if (place === 'exit') return inside === 'tech' ? t.leaveLab : t.leaveHouse
  if (place === 'campfire') return t.campfire
  if (place === 'fishing') return t.fishing
  if (place === 'wardrobe') return t.wardrobe
  if (place === 'bench' || place === 'lookout' || place === 'rise') return t[place]
  if (place === 'dojo') return t.dojo
  if (place === 'gong') return t.gong
  if (place === 'about' && inside) return t.album
  if (place === 'tech') return exhibit === undefined ? t.workshopSign : stations[exhibit][lang]
  return place === 'map'
    ? t.map
    : place === 'npc'
      ? t.guideName
      : place
        ? t[placeKeys[place]]
        : t.path
}
function FishingHud({
  update,
  lang,
  pull,
}: {
  update: AnglerUpdate
  lang: Lang
  pull: () => void
}) {
  const t = copy[lang]
  if (update.stage === 'caught') {
    const kind = fishKinds.find((f) => f.id === update.fish)
    if (!kind) return null
    return (
      <div className="catch-card" role="status">
        <span className="catch-fish" style={{ '--fish': kind.colors[0], '--fin': kind.colors[1] } as CSSProperties}>
          <Fish size={34} strokeWidth={2.2} />
        </span>
        <div>
          <small>
            {t.fishCaught}…
            {update.isNew && <em>{t.fishNew}</em>}
          </small>
          <b>
            {kind.name[lang]} · {update.size} cm
          </b>
          <p>{kind.quip[lang]}</p>
          <span className="catch-count">
            {t.fishCollection} {update.count}/{update.total}
          </span>
        </div>
      </div>
    )
  }
  if (update.stage === 'bite')
    return (
      <button className="prompt bite" onClick={pull}>
        <kbd>E</kbd>
        {t.fishBite}
      </button>
    )
  if (update.stage === 'lost')
    return <div className="prompt">{update.reason === 'early' ? t.fishEarly : t.fishLate}</div>
  if (update.stage === 'waiting')
    return (
      <button className="prompt" onClick={pull}>
        <Fish size={18} />
        {t.fishWait} · <kbd>E</kbd> {t.fishReel}
      </button>
    )
  return null
}
function Clock({ lang }: { lang: Lang }) {
  const [date, setDate] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setDate(new Date()), 10000)
    return () => clearInterval(id)
  }, [])
  const phase = daylight(date).phase,
    Icon = { day: Sun, night: Moon, dawn: Sunrise, dusk: Sunset }[phase],
    t = copy[lang]
  return (
    <div className="clock" title={t.local}>
      <Icon size={22} className={'sun ' + phase} />
      <b>
        {new Intl.DateTimeFormat(lang, {
          hour: '2-digit',
          minute: '2-digit',
          hourCycle: 'h23',
        }).format(date)}
      </b>
      <i />
      <span>{t[phase]}</span>
    </div>
  )
}
function App() {
  const location = useLocation(),
    deep: Panel | null =
      location.pathname === '/sobre-mi'
        ? 'about'
        : location.pathname === '/asignaturas'
          ? 'subjects'
          : null
  const [lang, setLang] = useState<Lang>(readLang),
    [menu, setMenu] = useState(false),
    [sound, toggleSound, enableSound] = useAmbience()
  const [mode, setMode] = useState<'game' | 'light'>('game'),
    [panel, setPanel] = useState<Panel | null>(deep),
    [project, setProject] = useState<number | null>(null),
    [tourPaused, setTourPaused] = useState(false)
  const [pos, setPos] = useState<[number, number]>([2.5, 14.65]),
    [near, setNear] = useState<{ target: Target; exhibit?: number } | null>(
      null,
    ),
    [hover, setHover] = useState<{ target: Target; exhibit?: number } | null>(
      null,
    ),
    [inside, setInside] = useState<Interior>(false),
    [angler, setAngler] = useState<AnglerUpdate | null>(null),
    [gift, setGift] = useState<number | null>(null),
    [photo, setPhoto] = useState(false)
  const [ready, setReady] = useState(false),
    [arrivalGone, setArrivalGone] = useState(false),
    [intro, setIntro] = useState(!deep),
    [arrivalShown, setArrivalShown] = useState(false),
    [hud, setHud] = useState<'hidden' | 'enter' | 'shown'>(() => (deep ? 'shown' : 'hidden')),
    [welcome, setWelcome] = useState(false),
    [outfit, setOutfit] = useState(loadOutfit),
    [wardrobe, setWardrobe] = useState(false)
  const ctl = useRef<VillageController | null>(null),
    pending = useRef<Zone | null>(null),
    languageBox = useRef<HTMLDivElement>(null)
  const t = copy[lang],
    light = mode === 'light'
  const nearbyExhibit = near?.target === 'projects' ? near.exhibit : undefined
  const hoveredExhibit =
    hover?.target === 'projects' ? hover.exhibit : undefined
  const exhibitIndex = nearbyExhibit ?? hoveredExhibit
  const exhibit =
    exhibitIndex === undefined
      ? undefined
      : {
          ...portfolio(lang).projects[exhibitIndex],
          index: exhibitIndex,
          nearby: nearbyExhibit !== undefined,
        }
  useEffect(() => {
    document.documentElement.lang = lang
    try {
      localStorage.setItem('ikers-world-lang', lang)
    } catch {
      /* Preferences are optional in private sessions. */
    }
  }, [lang])
  useEffect(() => {
    if (!menu) return
    const outside = (e: PointerEvent) => {
      if (!languageBox.current?.contains(e.target as Node)) setMenu(false)
    }
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenu(false)
    }
    window.addEventListener('pointerdown', outside)
    window.addEventListener('keydown', escape)
    return () => {
      window.removeEventListener('pointerdown', outside)
      window.removeEventListener('keydown', escape)
    }
  }, [menu])
  const open = useCallback((p: Panel, i?: number) => {
    setMenu(false)
    setIntro(false)
    setProject(i ?? null)
    setTourPaused(false)
    setPanel(p)
  }, [])
  const close = useCallback(() => {
    setPanel(null)
    setProject(null)
  }, [])
  const touring = panel === 'npc'
  const tourStop = touring && project !== null ? pipStops[project] : undefined
  const tourPlace = tourStop ? places.find(place => place.id === tourStop.id) : undefined
  useEffect(() => {
    ctl.current?.guideTalk(touring)
    if (!touring) return
    const onEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') close() }
    window.addEventListener('keydown', onEscape)
    return () => window.removeEventListener('keydown', onEscape)
  }, [touring, close])
  useEffect(() => {
    if (touring) ctl.current?.guideFocus(tourPlace?.at ?? null)
  }, [touring, tourPlace])
  const events = useMemo<VillageEvents>(
    () => ({
      open,
      position(x, z, target, exhibit) {
        setPos((old) =>
          Math.abs(old[0] - x) + Math.abs(old[1] - z) > 0.08 ? [x, z] : old,
        )
        setNear((old) =>
          old?.target === target && old?.exhibit === exhibit
            ? old
            : target
              ? { target, exhibit }
              : null,
        )
      },
      hover(target, exhibit) {
        setHover(target ? { target, exhibit } : null)
      },
      inside: setInside,
      wardrobe() {
        setWardrobe(true)
      },
      landed() {
        setHud((h) => (h === 'hidden' ? 'enter' : h))
        setWelcome(true)
      },
      gift(index) {
        setGift(index)
      },
      angler(update) {
        setAngler(update.stage === 'done' ? null : update)
      },
      fail() {
        setMode('light')
        setInside(false)
        setReady(false)
        setIntro(false)
        setPanel((p) => p ?? 'map')
      },
    }),
    [open],
  )
  const loaded = useCallback(() => {
    setReady(true)
    if (pending.current) {
      ctl.current?.travel(pending.current)
      pending.current = null
    }
  }, [])
  /** Travel to any place on the map (buildings go through `visit`). */
  function visitPlace(place: MapPlace) {
    if (light && place.id === 'radio-cove') { open('radio'); return }
    if (place.zone) {
      visit(place.zone)
      return
    }
    if (light || ctl.current?.transitioning()) return
    setIntro(false)
    setPanel(null)
    ctl.current?.goTo(place.stand, place.at)
  }
  function visit(id: Zone) {
    setIntro(false)
    setProject(null)
    if (light) {
      setPanel(id)
      return
    }
    if (ctl.current?.transitioning()) return
    setPanel(null)
    const arrival = () => {
      if (id !== 'about' && id !== 'projects' && id !== 'tech') open(id)
    }
    if (ctl.current) ctl.current.travel(id, arrival)
    else {
      pending.current = id
      arrival()
    }
  }
  const closeWardrobe = useCallback(() => setWardrobe(false), [])
  useEffect(() => {
    if (!welcome) return
    const id = setTimeout(() => setWelcome(false), 4900)
    return () => clearTimeout(id)
  }, [welcome])
  useEffect(() => {
    const action = (e: KeyboardEvent) => {
      if (
        (hud === 'hidden' && !light) ||
        wardrobe ||
        ctl.current?.transitioning() ||
        e.repeat ||
        e.ctrlKey ||
        e.altKey ||
        e.metaKey ||
        menu ||
        panel ||
        e.target instanceof HTMLSelectElement
      )
        return
      if (e.code === 'KeyM') {
        e.preventDefault()
        open('map')
      }
      if (e.code === 'KeyP' && ready) setPhoto((v) => !v)
      if (inside && e.code === 'Escape') ctl.current?.leave()
      if (
        intro &&
        [
          'KeyW',
          'KeyA',
          'KeyS',
          'KeyD',
          'ArrowLeft',
          'ArrowRight',
          'ArrowUp',
          'ArrowDown',
          'Escape',
        ].includes(e.code)
      )
        setIntro(false)
    }
    window.addEventListener('keydown', action)
    return () => window.removeEventListener('keydown', action)
  }, [menu, panel, intro, open, inside, ready, hud, light, wardrobe])
  useEffect(() => {
    if (gift === null) return
    const id = setTimeout(() => setGift(null), 9000)
    return () => clearTimeout(id)
  }, [gift])
  // Give the illustrated descent time to read even on a warm cache. As
  // the clouds fade, release the paused 3D visitor into the same descent.
  useEffect(() => {
    if (deep) return
    // Always shown in full, reduced motion included: it is the welcome.
    const id = window.setTimeout(() => setArrivalShown(true), 1850)
    return () => window.clearTimeout(id)
  }, [deep])
  const arrivalHandoff = ready && arrivalShown
  useEffect(() => {
    if (!arrivalHandoff) return
    const id = window.setTimeout(() => setArrivalGone(true), 800)
    return () => window.clearTimeout(id)
  }, [arrivalHandoff])
  // The painted cover only shows in light (map-only) mode; while the 3D
  // island loads, the arrival screen is on top anyway.
  const hasCover = light
  return (
    <main
      className={
        'screen playing' +
        (light ? ' light-mode' : '') +
        (photo && !panel ? ' photo-mode' : '') +
        (panel === 'npc' ? ' pip-talking' : '') +
        (hud === 'hidden' && !light ? ' hud-hidden' : hud === 'enter' ? ' hud-enter' : '')
      }
    >
      {wardrobe && (
        <Suspense fallback={null}>
        <Wardrobe
          lang={lang}
          current={outfit}
          title={t.wardrobe}
          hint={t.wardrobeHint}
          wearing={t.wearing}
          wearLabel={t.wearIt}
          closeLabel={t.close}
          onClose={closeWardrobe}
          onPick={(id) => {
            setWardrobe(false)
            if (id === outfit) return
            setOutfit(id)
            saveOutfit(id)
            ctl.current?.wear(id)
          }}
        />
        </Suspense>
      )}
      {welcome && !panel && (
        <div className="welcome-banner" role="status">
          <b>{t.welcome} Iker’s World</b>
          <small>
            {new Intl.DateTimeFormat(lang, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(new Date())}
          </small>
        </div>
      )}
      {photo && !panel && (
        <button className="photo-badge" onClick={() => setPhoto(false)}>
          {t.photo} · {t.photoExit}
        </button>
      )}
      {hasCover && <div className="cover" aria-hidden="true" />}
      {mode === 'game' && (
        <Game
          controller={ctl}
          events={events}
          ready={loaded}
          paused={!!panel || menu || wardrobe || (!deep && !arrivalHandoff)}
          workshop={t.workshopSign}
          skipIntro={!!deep}
          outfit={outfit}
          guide={t.guideName}
          exhibit={exhibit}
          openLabel={t.open}
        />
      )}
      <header className="hud-top">
        <button
          className="brand"
          onClick={() => open('map')}
          aria-label={t.map}
        >
          <span className="brand-icon">
            <Compass size={29} strokeWidth={2.1} />
          </span>
          <span>
            <strong>Iker’s World</strong>
            <small>{t.brand}</small>
          </span>
        </button>
        <div className="tools">
          <Clock lang={lang} />
          <button
            className="round sound"
            onClick={toggleSound}
            aria-pressed={sound}
            title={sound ? t.soundOff : t.soundOn}
            aria-label={sound ? t.soundOff : t.soundOn}
          >
            {sound ? <Volume2 size={19} /> : <VolumeX size={19} />}
          </button>
          <div className="lang-box" ref={languageBox}>
            <button
              className="lang-toggle"
              aria-expanded={menu}
              aria-label={t.language}
              onClick={() => setMenu(!menu)}
            >
              <Globe2 size={17} />
              {lang.toUpperCase()}
              <ChevronDown size={14} />
            </button>
            {menu && (
              <div className="lang-menu">
                {languages.map((l) => (
                  <button
                    key={l}
                    onClick={() => {
                      setLang(l)
                      setMenu(false)
                    }}
                    lang={l}
                  >
                    {languageNames[l]}
                    {l === lang && <Check size={15} />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>
      {!arrivalGone && !light && (!deep || !ready) && <Arrival label={t.loading3D} leaving={arrivalHandoff} />}
      {light && !panel && (
        <section className="light-home">
          <h1>{t.light}</h1>
          <p>{t.mapFallback}</p>
          <button className="primary small" onClick={() => open('map')}>
            <MapIcon />
            {t.map}
          </button>
        </section>
      )}
      {ready && !panel && (
        <>
          <div className="game-tools">
            {inside && (
              <button
                className="round"
                onClick={() => ctl.current?.leave()}
                aria-label={inside === 'tech' ? t.leaveLab : t.leaveHouse}
                title={inside === 'tech' ? t.leaveLab : t.leaveHouse}
              >
                <LogOut size={18} />
              </button>
            )}
            <button
              className="round"
              onClick={() => ctl.current?.zoom(0.12)}
              title={t.zoomIn}
              aria-label={t.zoomIn}
            >
              <Plus />
            </button>
            <button
              className="round"
              onClick={() => ctl.current?.zoom(-0.12)}
              title={t.zoomOut}
              aria-label={t.zoomOut}
            >
              <Minus />
            </button>
            <button
              className="round"
              onClick={() => open('controls')}
              title={t.guide}
              aria-label={t.guide}
            >
              <Gamepad2 />
            </button>
          </div>
          {hover && hover.target !== 'projects' && (
            <div className="hover-name">
              <MapPin size={16} />
              {placeName(hover.target, lang, hover.exhibit, inside)}
            </div>
          )}
          {gift !== null && !panel && (() => {
            const all = portfolio(lang).projects
            const index = gift % all.length
            return (
              <div className="catch-card gift-card" role="status">
                <span className="catch-fish" style={{ '--fish': '#ef6c5c', '--fin': '#f6c24d' } as CSSProperties}>
                  <Gift size={30} strokeWidth={2.2} />
                </span>
                <div>
                  <small>{t.giftTitle}</small>
                  <p>{t.giftBody}</p>
                  <b>{all[index].name}</b>
                  <button
                    className="primary small"
                    onClick={() => {
                      setGift(null)
                      open('projects', index)
                    }}
                  >
                    {t.open}
                  </button>
                </div>
              </div>
            )
          })()}
          {angler ? (
            <FishingHud update={angler} lang={lang} pull={() => ctl.current?.interact()} />
          ) : near && near.target !== 'projects' ? (
            <button className="prompt" onClick={() => ctl.current?.interact()}>
              <kbd>E</kbd>
              {placeName(near.target, lang, near.exhibit, inside)}
            </button>
          ) : !near && intro && hud !== 'hidden' ? (
            <div className="intro-toast">
              <span className="intro-icon">
                <Footprints />
              </span>
              <div>
                <b>{t.intro}</b>
                <p>{t.walkClick}</p>
                <small>
                  <kbd>WASD</kbd> {t.move} · <kbd>E</kbd> {t.interact}
                </small>
              </div>
              <button
                onClick={() => setIntro(false)}
                aria-label={t.skip}
                title={t.skip}
              >
                <X size={18} />
              </button>
            </div>
          ) : null}
          <div className="touch-pad" role="group" aria-label={t.touch}>
            {[
              [0, -1, '↑'],
              [-1, 0, '←'],
              [1, 0, '→'],
              [0, 1, '↓'],
            ].map(([x, y, label], i) => (
              <button
                key={i}
                aria-label={t.move + ' ' + label}
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId)
                  setIntro(false)
                  ctl.current?.touch(Number(x), Number(y))
                }}
                onLostPointerCapture={() => ctl.current?.touch(0, 0)}
              >
                {label}
              </button>
            ))}
          </div>
        </>
      )}
      <footer className="hud-bottom">
        <div className="location">
          <span className="loc-icon">
            <MapPin size={20} />
          </span>
          <div>
            <small>{inside === 'tech' ? t.techPlace : inside ? t.about : t.coast}</small>
            <b>
              {inside
                ? t.interior
                : near
                  ? placeName(near.target, lang, near.exhibit)
                  : t.path}
            </b>
          </div>
        </div>
        <nav className="quick" aria-label={t.access}>
          {(['about', 'projects', 'tech', 'contact'] as Zone[]).map((id) => (
            <button key={id} onClick={() => open(id)} title={t[placeKeys[id]]}>
              <ZoneIcon id={id} size={19} />
              <span>{id === 'about' ? t.who : t[id]}</span>
            </button>
          ))}
        </nav>
        <button className="map-button in-game" onClick={() => open('map')}>
          <VillageMap lang={lang} mini position={pos} />
          <span>
            <MapIcon size={20} />
            {t.map}
            <kbd>M</kbd>
          </span>
        </button>
      </footer>
      {panel === 'npc' && (
        <PipTour
          lang={lang}
          name={t.guideName}
          place={tourPlace?.name[lang]}
          step={project}
          paused={tourPaused}
          closeLabel={t.close}
          setStep={setProject}
          setPaused={setTourPaused}
          close={close}
        />
      )}
      {panel && panel !== 'npc' && (
        <Suspense fallback={null}>
        <Journal
          enableSound={enableSound}
          page={panel}
          lang={lang}
          project={project}
          setProject={setProject}
          open={open}
          close={close}
          visitPlace={visitPlace}
          position={pos}
          fallback={light}
          useMap={() => {
            setMode('light')
            setInside(false)
            setIntro(false)
            setPanel('map')
          }}
        />
        </Suspense>
      )}
    </main>
  )
}
export default App
