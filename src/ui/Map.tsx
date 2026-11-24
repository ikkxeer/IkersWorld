import { House, FlaskConical, PanelsTopLeft, TrainFront, Coffee, Mail } from 'lucide-react'
import type { Lang, Zone } from '../data/village'
import { AtlasMini } from './Atlas'

const icons = {
  about: House,
  tech: FlaskConical,
  projects: PanelsTopLeft,
  journey: TrainFront,
  skills: Coffee,
  contact: Mail,
}
export function ZoneIcon({ id, size = 20 }: { id: Zone; size?: number }) {
  const Icon = icons[id]
  return <Icon size={size} strokeWidth={2.2} />
}

/** The little map on the HUD button: the painted island and where you are. */
export default function VillageMap({ position }: { lang?: Lang; position?: [number, number]; mini?: boolean }) {
  return (
    <div className="chart mini">
      <AtlasMini position={position} />
    </div>
  )
}
