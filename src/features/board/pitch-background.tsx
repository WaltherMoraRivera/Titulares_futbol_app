export function PitchBackground() {
  return (
    <svg
      viewBox="0 0 100 150"
      preserveAspectRatio="none"
      className="absolute inset-0 h-full w-full"
    >
      <defs>
        <linearGradient id="pitch-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e8a4c" />
          <stop offset="100%" stopColor="#166a3a" />
        </linearGradient>
      </defs>
      <rect width="100" height="150" fill="url(#pitch-gradient)" />
      {/* franjas de corte de césped */}
      {Array.from({ length: 8 }).map((_, i) => (
        <rect
          key={i}
          x="0"
          y={i * 18.75}
          width="100"
          height="9.375"
          fill="white"
          opacity="0.03"
        />
      ))}

      <g stroke="white" strokeWidth="0.5" fill="none" opacity="0.85">
        <rect x="2" y="2" width="96" height="146" />
        <line x1="2" y1="75" x2="98" y2="75" />
        <circle cx="50" cy="75" r="12" />
        <circle cx="50" cy="75" r="0.8" fill="white" />

        {/* arco superior (rival) */}
        <rect x="20" y="2" width="60" height="22" />
        <rect x="35" y="2" width="30" height="8" />
        <circle cx="50" cy="16" r="0.8" fill="white" />
        <path d="M 40 24 A 12 12 0 0 0 60 24" />

        {/* arco inferior (propio) */}
        <rect x="20" y="126" width="60" height="22" />
        <rect x="35" y="140" width="30" height="8" />
        <circle cx="50" cy="132" r="0.8" fill="white" />
        <path d="M 40 126 A 12 12 0 0 1 60 126" />
      </g>
    </svg>
  );
}
