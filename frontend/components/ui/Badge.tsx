interface BadgeProps {
  label: string
  color?: string
  className?: string
}

export default function Badge({ label, color, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-semibold ${className}`}
      style={color ? { backgroundColor: color + '33', color } : undefined}
    >
      {label}
    </span>
  )
}
