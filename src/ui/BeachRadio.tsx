import { useState } from 'react'
import { ExternalLink, Music2, Play } from 'lucide-react'
import type { Lang } from '../data/village'

const songs = [
  { title: 'GREEDY', artist: 'PARTYNEXTDOOR & Drake', video: 'NdnlUby4NWU' },
  { title: 'Marvins Room', artist: 'Drake', video: 'ssuClMbm18w' },
  { title: 'Over My Dead Body', artist: 'Drake', video: 'PMk8L9FNqnY' },
  { title: 'Otra Noche en Miami', artist: 'Bad Bunny', video: 'hoQmSA6MRAk' },
]
const openLabel = { es: 'Abrir en YouTube', ca: 'Obrir a YouTube', en: 'Open on YouTube' }

export default function BeachRadio({lang}: {lang: Lang}) {
  const [selected, select] = useState<number | null>(null)
  const current = selected === null ? null : songs[selected]
  return <div className="cove-radio">
    <div className="cove-tracks">
      {songs.map((song, i) =>
        <button key={song.video} aria-pressed={selected === i} onClick={() => select(i)}>
          {selected === i ? <Music2 size={18} /> : <Play size={18} />}
          <span><strong>{song.title}</strong><small>{song.artist}</small></span>
        </button>
      )}
    </div>
    {current && <>
      <iframe key={current.video}
        title={current.title + ' · ' + current.artist}
        src={'https://www.youtube-nocookie.com/embed/' + current.video + '?autoplay=1&playsinline=1'}
        allow="autoplay; encrypted-media; fullscreen" allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin" />
      <a href={'https://www.youtube.com/watch?v=' + current.video} target="_blank" rel="noreferrer">
        {openLabel[lang]} <ExternalLink size={16} />
      </a>
    </>}
  </div>
}
