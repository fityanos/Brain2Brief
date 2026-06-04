interface Props {
  className?: string
  title?: string
}

/**
 * Brain2Brief brand mark — brain (left) + document (right), gradient stroke.
 * Renders the artwork only; wrap externally if you need a framed/app-icon look.
 */
export function BrainLogo({ className, title = 'Brain2Brief' }: Props) {
  const gradientId = 'brain2brief-gradient'
  return (
    <svg
      viewBox="0 0 512 512"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
      className={className}
    >
      <title>{title}</title>
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#6A3DFF" />
          <stop offset="100%" stopColor="#2563FF" />
        </linearGradient>
      </defs>

      {/* Brain half */}
      <path
        d="M210 120 C170 120,145 145,145 180 C115 190,95 220,95 255 C95 290,115 320,145 330 C145 370,175 395,210 395"
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={18}
        strokeLinecap="round"
      />
      <path
        d="M145 180 C170 210,195 180,210 205"
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={18}
        strokeLinecap="round"
      />
      <path
        d="M125 255 C160 280,190 245,210 270"
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={18}
        strokeLinecap="round"
      />
      <path
        d="M145 330 C170 350,195 320,210 345"
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={18}
        strokeLinecap="round"
      />

      {/* Divider */}
      <line
        x1="256"
        y1="110"
        x2="256"
        y2="402"
        stroke={`url(#${gradientId})`}
        strokeWidth={18}
        strokeLinecap="round"
      />

      {/* Document half */}
      <path
        d="M256 120 H355 L415 180 V355 C415 380 395 400 370 400 H270"
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={18}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d="M355 120 V180 H415"
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={18}
        strokeLinejoin="round"
      />
      <line
        x1="300"
        y1="230"
        x2="380"
        y2="230"
        stroke={`url(#${gradientId})`}
        strokeWidth={14}
        strokeLinecap="round"
      />
      <line
        x1="300"
        y1="280"
        x2="380"
        y2="280"
        stroke={`url(#${gradientId})`}
        strokeWidth={14}
        strokeLinecap="round"
      />
      <line
        x1="300"
        y1="330"
        x2="350"
        y2="330"
        stroke={`url(#${gradientId})`}
        strokeWidth={14}
        strokeLinecap="round"
      />
    </svg>
  )
}
