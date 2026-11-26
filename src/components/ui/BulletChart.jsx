import React from 'react'

/**
 * Gráfico de Bala (Bullet Chart) compacto para medir cumplimiento de metas
 * sin ocupar el espacio de un velocímetro tradicional.
 *
 * @param {string} label - Nombre de la métrica
 * @param {number} value - Valor actual
 * @param {number} target - Meta / objetivo
 * @param {number} max - Escala máxima (default 100)
 * @param {string} unit - Sufijo de unidad (ej. "%", "h")
 * @param {boolean} invert - Si true, valores menores que la meta son positivos (ej. FRT/MTTR)
 * @param {string} helper - Texto secundario de contexto
 */
export default function BulletChart({
  label,
  value = 0,
  target = 80,
  max = 100,
  unit = '%',
  invert = false,
  helper = '',
}) {
  const safeVal = Number.isFinite(Number(value)) ? Number(value) : 0
  const safeMax = Math.max(max, safeVal, target, 1)
  const valuePct = Math.min(100, Math.max(0, (safeVal / safeMax) * 100))
  const targetPct = Math.min(100, Math.max(0, (target / safeMax) * 100))

  const meetsTarget = invert ? safeVal <= target : safeVal >= target
  const isClose = invert
    ? safeVal <= target * 1.25
    : safeVal >= target * 0.8

  const statusTone = meetsTarget ? 'good' : isClose ? 'warn' : 'bad'
  const statusText = meetsTarget ? 'En meta' : isClose ? 'Cerca' : 'Atención'

  return (
    <div className="ux-bullet">
      <div className="ux-bullet-header">
        <span className="ux-bullet-label">{label}</span>
        <div className="ux-bullet-values">
          <span className="ux-bullet-current">
            {safeVal}{unit}
          </span>
          <span className={`ux-bullet-badge is-${statusTone}`}>{statusText}</span>
        </div>
      </div>

      <div
        className="ux-bullet-track"
        role="progressbar"
        aria-valuenow={safeVal}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        title={`Actual: ${safeVal}${unit} · Meta: ${invert ? '≤' : '≥'} ${target}${unit}`}
      >
        {/* Bandas cualitativas de fondo (bajo / medio / óptimo) */}
        <div className="ux-bullet-band band-low" />
        <div className="ux-bullet-band band-mid" />
        {/* Barra de valor actual */}
        <div
          className={`ux-bullet-fill is-${statusTone}`}
          style={{ width: `${valuePct}%` }}
        />
        {/* Marcador vertical de meta */}
        <div
          className="ux-bullet-target"
          style={{ left: `${targetPct}%` }}
          title={`Meta: ${target}${unit}`}
        />
      </div>

      <div className="ux-bullet-footer">
        <span>{helper}</span>
        <span className="ux-bullet-meta-target">
          Meta: {invert ? '≤' : '≥'} {target}{unit}
        </span>
      </div>
    </div>
  )
}
