import React, { useId } from 'react'

/**
 * Micro-gráfico de tendencia lineal (Sparkline) en SVG puro para tarjetas KPI.
 * Ocupa mínimo espacio y da contexto visual inmediato de la evolución temporal.
 */
export default function Sparkline({
  data = [],
  color = '#0284c7',
  height = 30,
  width = 96,
  strokeWidth = 2,
}) {
  const gradId = useId()
  const values = (data || []).map((v) => Number(v)).filter((v) => !Number.isNaN(v))

  if (values.length < 2) {
    return null
  }

  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const padY = 4
  const usableH = height - padY * 2

  const points = values.map((val, idx) => {
    const x = (idx / (values.length - 1)) * width
    const y = padY + usableH - ((val - min) / span) * usableH
    return [Number(x.toFixed(1)), Number(y.toFixed(1))]
  })

  const linePath = points
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`)
    .join(' ')

  const areaPath = `${linePath} L${width},${height} L0,${height} Z`
  const [lastX, lastY] = points[points.length - 1]

  return (
    <svg
      className="ux-sparkline"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lastX} cy={lastY} r="2.6" fill={color} />
    </svg>
  )
}
