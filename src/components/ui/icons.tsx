/** Small, dependency-free line-icon set (Feather-style, 24px grid). */

interface IconProps {
  size?: number
  className?: string
  'aria-hidden'?: boolean
}

function svgProps({ size = 18, className, ...rest }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    'aria-hidden': rest['aria-hidden'] ?? true,
    focusable: false,
  }
}

export function IconCheck(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

export function IconWatch(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

export function IconAlert(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

export function IconPlus(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

export function IconClose(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

export function IconChevronRight(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

export function IconChevronDown(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

export function IconTrendUp(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <polyline points="3 17 9 11 13 15 21 7" />
      <polyline points="15 7 21 7 21 13" />
    </svg>
  )
}

export function IconTrendDown(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <polyline points="3 7 9 13 13 9 21 17" />
      <polyline points="15 17 21 17 21 11" />
    </svg>
  )
}

export function IconTrendFlat(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <line x1="4" y1="12" x2="20" y2="12" />
    </svg>
  )
}

export function IconFeed(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
    </svg>
  )
}

export function IconHold(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <line x1="9" y1="5" x2="9" y2="19" />
      <line x1="15" y1="5" x2="15" y2="19" />
    </svg>
  )
}

export function IconBell(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

export function IconClock(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 16 14" />
    </svg>
  )
}

export function IconTrash(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  )
}

export function IconPause(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  )
}

export function IconPlay(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <polygon points="6 4 20 12 6 20 6 4" />
    </svg>
  )
}

export function IconSliders(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="17" y1="16" x2="23" y2="16" />
    </svg>
  )
}

export function IconPencil(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  )
}

export function IconActivity(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  )
}
