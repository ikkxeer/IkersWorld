export const weatherModes = ['auto', 'clear', 'sunset', 'night', 'storm'] as const
export type Weather = (typeof weatherModes)[number]

export const weatherCopy = {
  es: { label: 'Clima', auto: 'Hora local', clear: 'Día despejado', sunset: 'Atardecer', night: 'Noche', storm: 'Tormenta' },
  ca: { label: 'Temps', auto: 'Hora local', clear: 'Dia serè', sunset: 'Capvespre', night: 'Nit', storm: 'Tempesta' },
  en: { label: 'Weather', auto: 'Local time', clear: 'Clear day', sunset: 'Sunset', night: 'Night', storm: 'Storm' },
}

export function weatherDate(date: Date, weather: Weather) {
  if (weather === 'auto') return date
  const fixed = new Date(date)
  const time = { clear: [12, 0], sunset: [18, 36], night: [0, 0], storm: [16, 0] }[weather]
  fixed.setHours(time[0], time[1], 0, 0)
  return fixed
}
