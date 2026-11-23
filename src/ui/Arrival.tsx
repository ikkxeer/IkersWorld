/**
 * The loading screen: the visitor drifts down through the clouds under an
 * umbrella while the island loads, then the 3D scene picks up the same fall.
 */
export default function Arrival({ label, leaving }: { label: string; leaving: boolean }) {
  return (
    <div className={'arrival' + (leaving ? ' leaving' : '')} role="status" aria-live="polite">
      <div className="arrival-clouds far" aria-hidden="true" />
      <div className="arrival-clouds mid" aria-hidden="true" />
      <svg className="arrival-hero" viewBox="0 0 140 230" aria-hidden="true">
        {/* Umbrella */}
        <g className="arrival-brolly">
          <path d="M14 70 Q70 -6 126 70 Z" fill="#ef6c5c" />
          <path d="M34 52 Q70 20 106 52 L100 58 Q70 32 40 58 Z" fill="#fdf3dc" />
          {Array.from({ length: 8 }, (_, i) => (
            <circle key={i} cx={21 + i * 14} cy={71} r={7.5} fill={i % 2 ? '#fdf3dc' : '#ef6c5c'} />
          ))}
          <circle cx="70" cy="22" r="5" fill="#f6c24d" />
          <path d="M70 70 V84" stroke="#8a5a3a" strokeWidth="4" strokeLinecap="round" />
        </g>
        {/* Scarf tail streaming upwards */}
        <path className="arrival-scarf" d="M80 152 q18 -6 24 -22 q4 -8 12 -10" fill="none" stroke="#ef6c5c" strokeWidth="9" strokeLinecap="round" />
        {/* Legs and boots */}
        <g className="arrival-legs">
          <rect x="54" y="186" width="13" height="20" rx="6" fill="#5479b0" />
          <rect x="73" y="186" width="13" height="20" rx="6" fill="#5479b0" />
          <ellipse cx="59" cy="211" rx="11" ry="8" fill="#f3b840" />
          <ellipse cx="81" cy="211" rx="11" ry="8" fill="#f3b840" />
        </g>
        {/* Body: striped jumper and dungarees */}
        <rect x="46" y="148" width="48" height="42" rx="18" fill="#83cdb0" />
        <rect x="46" y="160" width="48" height="6" fill="#fdf3dc" />
        <rect x="46" y="172" width="48" height="6" fill="#fdf3dc" />
        <path d="M52 172 h36 v14 q-18 10 -36 0 Z" fill="#5479b0" />
        <circle cx="70" cy="178" r="4" fill="#ffd56a" />
        {/* Waving arm */}
        <path className="arrival-wave" d="M92 160 q16 -4 20 -20" fill="none" stroke="#83cdb0" strokeWidth="11" strokeLinecap="round" />
        <circle className="arrival-wave" cx="113" cy="138" r="7" fill="#f7cba4" />
        {/* Scarf */}
        <rect x="50" y="144" width="40" height="11" rx="5.5" fill="#ef6c5c" />
        {/* Head */}
        <circle cx="70" cy="118" r="31" fill="#f7cba4" />
        <path d="M39 118 Q38 84 70 84 Q102 84 101 118 Q96 100 84 99 Q72 106 58 100 Q46 102 39 118 Z" fill="#7a4630" />
        <path d="M70 85 q2 -10 9 -11 q-6 4 -4 11" fill="#7a4630" />
        <ellipse cx="58" cy="120" rx="4.2" ry="5.6" fill="#2f2624" />
        <ellipse cx="82" cy="120" rx="4.2" ry="5.6" fill="#2f2624" />
        <circle cx="56.5" cy="118" r="1.5" fill="#fff" />
        <circle cx="80.5" cy="118" r="1.5" fill="#fff" />
        <ellipse cx="50" cy="130" rx="6" ry="3.4" fill="#f59a88" />
        <ellipse cx="90" cy="130" rx="6" ry="3.4" fill="#f59a88" />
        <path d="M65 133 q5 4 10 0" fill="none" stroke="#a3574b" strokeWidth="2.2" strokeLinecap="round" />
        {/* Arm holding the umbrella */}
        <path d="M48 156 Q22 122 62 84" fill="none" stroke="#83cdb0" strokeWidth="11" strokeLinecap="round" />
        <circle cx="66" cy="83" r="7" fill="#f7cba4" />
      </svg>
      <div className="arrival-clouds near" aria-hidden="true" />
      <div className="arrival-text">
        <strong>Iker’s World</strong>
        <span>
          {label}
          <i aria-hidden="true">
            <b />
            <b />
            <b />
          </i>
        </span>
      </div>
    </div>
  )
}
