interface TeamColorDotProps {
  color: string
  size?: number
}

export function TeamColorDot({ color, size = 10 }: TeamColorDotProps) {
  return (
    <span
      className="inline-block shrink-0 rounded-full"
      style={{ width: size, height: size, backgroundColor: color }}
    />
  )
}
