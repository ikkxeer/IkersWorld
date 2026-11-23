import { useState, useSyncExternalStore } from 'react'
import { Music2, Play, Square } from 'lucide-react'
import { playRadio, radioSnapshot, stopRadio, subscribeRadio, tracks } from '../audio/beachRadio'
import type { Lang } from '../data/village'

const labels = {
  es: ['Detener', 'No se ha podido reproducir la canción.'],
  ca: ['Atura', 'No s’ha pogut reproduir la cançó.'],
  en: ['Stop', 'The song could not be played.'],
}

export default function BeachRadio({lang, enableSound}: {lang: Lang; enableSound: () => void}) {
  const current = useSyncExternalStore(subscribeRadio, radioSnapshot)
  const [error, setError] = useState(false)
  const [stop, failed] = labels[lang]
  return <div className="cove-radio">
    <div className="cove-tracks">
      {tracks.map((song, i) => <button key={song.title} aria-pressed={current === i} onClick={() => {
        enableSound()
        setError(false)
        void playRadio(i).catch(() => setError(true))
      }}>
        {current === i ? <Music2 size={18} /> : <Play size={18} />}
        <span><strong>{song.title}</strong><small>{song.artist}</small></span>
      </button>)}
      {current >= 0 && <button onClick={stopRadio}><Square size={16}/>{stop}</button>}
    </div>
    {error && <p role="alert">{failed}</p>}
  </div>
}
