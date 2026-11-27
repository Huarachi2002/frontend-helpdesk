import React, { useEffect, useMemo, useState } from 'react'
import {
  IconArrowsVertical,
  IconArrowBigUpLines,
  IconArrowBigDownLines,
  IconArrowBackUp,
  IconAlertCircle,
  IconInfoCircle,
  IconSitemap,
  IconX,
  IconCheck,
  IconTicket,
} from '@tabler/icons-react'
import { Skeleton } from 'primereact/skeleton'
import { useTicketsStore } from '../stores/ticketsStore.js'
import { useToast } from '../context/ToastContext.jsx'
import { escalateTicketSchema, createReturnTicketSchema, validateSchema } from '../schemas/index.js'
import './TicketEscalation.css'

/**
 * ==============================================================================
 * RELEVAMIENTO DE TICKETS (movimiento vertical en la Estructura Organizacional)
 * ==============================================================================
 * - EscalationButton: botón "Relevar Ticket" junto a la reasignación.
 * - EscalationBanner: aviso del último relevamiento/devolución + botón "Devolver".
 * - CargoActualLine: cargo y nivel del responsable actual.
 * - EscalationModals: modales de relevamiento y de devolución.
 * La regla de negocio vive en el backend (bloque `escalation` del TicketResource).
 * ==============================================================================
 */

const TIPO_LABELS = {
  RELEVAMIENTO_ASCENDENTE: 'Ticket relevado desde un nivel inferior',
  RELEVAMIENTO_DESCENDENTE: 'Ticket relevado desde un nivel superior',
  DEVOLUCION: 'Ticket devuelto al nivel anterior',
}

function formatDateTime(value) {
  if (!value) return '—'
  const d = new Date(String(value).replace(' ', 'T'))
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString('es-BO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function isEscalationHistory(comment = '') {
  return /^(Relevamiento (ascendente|descendente)|Devolución al nivel anterior):/.test(comment)
}

// ------------------------------------------------------------------------------
// Botón "Relevar Ticket"
// ------------------------------------------------------------------------------
export function EscalationButton({ ticket, onClick }) {
  const escalation = ticket?.escalation
  if (!escalation) return null

  const disabled = !escalation.can_escalate
  return (
    <button
      type="button"
      className={`btn-reassign-badge btn-escalate-badge ${disabled ? 'is-disabled' : ''}`}
      onClick={onClick}
      disabled={disabled}
      title={disabled ? escalation.blocked_reason : 'Relevar el ticket a otro nivel de la Estructura Organizacional'}
    >
      <IconArrowsVertical size={14} />
      <span>Relevar Ticket</span>
    </button>
  )
}

// ------------------------------------------------------------------------------
// Cargo / nivel del responsable actual
// ------------------------------------------------------------------------------
export function CargoActualLine({ ticket }) {
  const cargo = ticket?.cargo_actual
  if (!cargo) return null
  const subidos = ticket?.nivel_relevamiento || 0

  return (
    <div className="escalation-cargo-line" title={`${cargo.codigo} · ${cargo.seccion}`}>
      <IconSitemap size={13} />
      <span>
        {cargo.nombre} · <b>Nivel {cargo.nivel}</b>
      </span>
    </div>
  )
}

// ------------------------------------------------------------------------------
// Banner del último movimiento vertical
// ------------------------------------------------------------------------------
export function EscalationBanner({ ticket, onReturn }) {
  const escalation = ticket?.escalation
  const mov = escalation?.ultimo_movimiento
  if (!mov) return null

  const isReturn = mov.tipo === 'DEVOLUCION'
  const Icon = isReturn ? IconArrowBackUp : mov.tipo === 'RELEVAMIENTO_ASCENDENTE' ? IconArrowBigUpLines : IconArrowBigDownLines

  return (
    <div className={`escalation-banner ${isReturn ? 'is-return' : ''}`}>
      <div className="escalation-banner-title">
        <Icon size={18} />
        <span>{TIPO_LABELS[mov.tipo] || 'Movimiento de nivel'}</span>
        {mov.cargo_destino && <span className="escalation-banner-tag">Nivel {mov.cargo_destino.nivel}</span>}
      </div>

      <div className="escalation-banner-grid">
        <div>
          <span className="b-label">{isReturn ? 'Devuelto por:' : 'Relevado por:'}</span>
          <span className="b-val">{mov.realizado_por || '—'}</span>
        </div>
        <div>
          <span className="b-label">Fecha:</span>
          <span className="b-val">{formatDateTime(mov.fecha)}</span>
        </div>
        {mov.cargo_destino && (
          <div className="full">
            <span className="b-label">Cargo actual:</span>
            <span className="b-val">{mov.cargo_destino.nombre}</span>
          </div>
        )}
        <div className="full">
          <span className="b-label">{isReturn ? 'Instrucciones:' : 'Motivo:'}</span>
          <span className="b-val escalation-quote">"{mov.motivo}"</span>
        </div>
      </div>

      {escalation.can_return && (
        <button type="button" className="btn-escalation-return" onClick={onReturn}>
          <IconArrowBackUp size={16} />
          <span>
            Devolver al nivel anterior
            {escalation.return_destino ? ` (${escalation.return_destino.name})` : ''}
          </span>
        </button>
      )}
    </div>
  )
}

// ------------------------------------------------------------------------------
// Modales
// ------------------------------------------------------------------------------
export function EscalationModals({ ticket, mode, onClose }) {
  if (!ticket || !mode) return null
  return mode === 'return' ? (
    <ReturnModal ticket={ticket} onClose={onClose} />
  ) : (
    <EscalateModal ticket={ticket} onClose={onClose} />
  )
}

function ModalShell({ title, subtitle, onClose, busy, children, footer, wide = false }) {
  return (
    <div
      className="reassign-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose()
      }}
    >
      <div className="reassign-modal-card escalation-modal-card" style={{ maxWidth: wide ? '760px' : '520px' }}>
        <div className="modal-header">
          <div className="modal-title-group">
            <h2 className="modal-title">{title}</h2>
            <span className="modal-subtitle">{subtitle}</span>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} disabled={busy}>
            <IconX size={20} />
          </button>
        </div>
        <div className="reassign-modal-body">{children}</div>
        <div className="modal-footer">{footer}</div>
      </div>
    </div>
  )
}

function EscalateModal({ ticket, onClose }) {
  const fetchEscalationOptions = useTicketsStore((s) => s.fetchEscalationOptions)
  const escalate = useTicketsStore((s) => s.escalate)
  const { showToast } = useToast()

  const [options, setOptions] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [nivelFiltro, setNivelFiltro] = useState('all') // 'all' | número de nivel (solo filtra la lista)
  const [destinoId, setDestinoId] = useState(null)
  const [motivo, setMotivo] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let alive = true
    fetchEscalationOptions(ticket.id)
      .then((data) => {
        if (!alive) return
        setOptions(data)
      })
      .catch((err) => alive && setLoadError(err.message))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [ticket.id, fetchEscalationOptions])

  const nivelActual = options?.cargo_actual?.nivel
  // Todos los niveles disponibles se muestran a la vez; los botones de nivel solo filtran la lista.
  const nivelesVisibles = useMemo(() => {
    const niveles = options?.niveles || []
    return nivelFiltro === 'all' ? niveles : niveles.filter((n) => n.nivel === nivelFiltro)
  }, [options, nivelFiltro])

  const destino = useMemo(() => {
    if (!destinoId) return null
    for (const n of options?.niveles || []) {
      for (const c of n.cargos) {
        const u = c.usuarios.find((x) => x.id === destinoId)
        if (u) return { ...u, cargo: c, nivel: n.nivel }
      }
    }
    return null
  }, [options, destinoId])

  const handleSubmit = async () => {
    const validation = validateSchema(escalateTicketSchema, { destino_usuario_id: destinoId, motivo })
    if (!validation.success) {
      setFieldErrors(validation.fieldErrors)
      return
    }
    setSubmitting(true)
    setSubmitError('')
    try {
      const res = await escalate(ticket.id, validation.data.destino_usuario_id, validation.data.motivo)
      showToast({ severity: 'success', summary: 'Ticket Relevado', detail: res.message, life: 4500 })
      onClose()
    } catch (err) {
      setSubmitError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const footer = (
    <>
      <button type="button" className="btn-secondary" disabled={submitting} onClick={onClose}>
        Cancelar
      </button>
      <button
        type="button"
        className="btn-primary btn-escalate-confirm"
        disabled={submitting || !destinoId || !options?.can_escalate}
        onClick={handleSubmit}
      >
        <IconArrowsVertical size={16} />
        <span>{submitting ? 'Relevando...' : 'Relevar Ticket'}</span>
      </button>
    </>
  )

  return (
    <ShellWithTicket title="Relevar Ticket" ticket={ticket} onClose={onClose} busy={submitting} footer={footer} wide>
      {loading ? (
        <div className="escalation-loading">
          <Skeleton height="44px" />
          <Skeleton height="120px" />
        </div>
      ) : loadError ? (
        <div className="reassign-error-alert">
          <IconAlertCircle size={16} />
          <span>{loadError}</span>
        </div>
      ) : (
        <>
          {/* Posición actual */}
          <div className="escalation-current">
            <span className="b-label">Nivel actual del ticket</span>
            <div>
              <span className="escalation-level-pill">Nivel {nivelActual ?? '—'}</span>
              <b>{options?.cargo_actual?.nombre || 'Sin cargo'}</b>
              {options?.responsable_actual && <span className="text-muted"> · {options.responsable_actual.name}</span>}
            </div>
          </div>

          {!options?.can_escalate ? (
            <div className="reassign-error-alert">
              <IconAlertCircle size={16} />
              <span>{options?.blocked_reason || 'No es posible relevar este ticket.'}</span>
            </div>
          ) : (
            <>
              {/* Filtro de nivel: por defecto se muestran todos los niveles disponibles */}
              <div className="form-group mt-3">
                <label className="form-label">1. Selecciona al usuario que recibirá el ticket</label>
                <div className="escalation-levels">
                  <button
                    type="button"
                    className={`escalation-level-btn ${nivelFiltro === 'all' ? 'is-selected' : ''}`}
                    onClick={() => setNivelFiltro('all')}
                  >
                    <IconArrowsVertical size={16} />
                    <span>Todos los niveles</span>
                  </button>
                  {options.niveles.map((n) => {
                    const Up = n.direccion === 'ASCENDENTE'
                    return (
                      <button
                        key={n.nivel}
                        type="button"
                        className={`escalation-level-btn ${nivelFiltro === n.nivel ? 'is-selected' : ''} ${Up ? 'is-up' : 'is-down'}`}
                        onClick={() => setNivelFiltro(n.nivel)}
                      >
                        {Up ? <IconArrowBigUpLines size={16} /> : <IconArrowBigDownLines size={16} />}
                        <span>Nivel {n.nivel}</span>
                        <small>{Up ? 'Superior' : 'Inferior'}{!n.contiguo ? ' · salta niveles' : ''}</small>
                      </button>
                    )
                  })}
                </div>
                {!options.puede_saltar_niveles && (
                  <span className="escalation-hint">
                    <IconInfoCircle size={13} /> Relevamiento secuencial: solo puedes mover el ticket al nivel inmediato
                    superior o inferior.
                  </span>
                )}
              </div>

              {/* Usuarios agrupados por nivel y cargo */}
              <div className="form-group">
                <div className="escalation-cargos">
                  {nivelesVisibles.map((n) => (
                    <div key={n.nivel} className="escalation-level-section">
                      <div className={`escalation-level-title ${n.direccion === 'ASCENDENTE' ? 'is-up' : 'is-down'}`}>
                        {n.direccion === 'ASCENDENTE' ? <IconArrowBigUpLines size={15} /> : <IconArrowBigDownLines size={15} />}
                        <span>
                          Nivel {n.nivel} · {n.direccion === 'ASCENDENTE' ? 'Superior' : 'Inferior'}
                          {!n.contiguo ? ' (salta niveles)' : ''}
                        </span>
                      </div>
                    {n.cargos.map((c) => (
                      <div key={c.codigo} className="escalation-cargo-group">
                        <div className="escalation-cargo-head">
                          <span className="escalation-cargo-code">{c.codigo}</span>
                          <b>{c.nombre}</b>
                          <span className="text-muted">· {c.seccion}</span>
                          {c.en_linea_directa && (
                            <span className="escalation-line-tag">
                              {n.direccion === 'ASCENDENTE' ? 'Superior directo' : 'Subordinado directo'}
                            </span>
                          )}
                        </div>
                        {c.usuarios.map((u) => (
                          <label
                            key={u.id}
                            className={`escalation-user-row ${destinoId === u.id ? 'is-selected' : ''}`}
                          >
                            <input
                              type="radio"
                              name="escalation-target"
                              checked={destinoId === u.id}
                              onChange={() => {
                                setDestinoId(u.id)
                                setFieldErrors((p) => ({ ...p, destino_usuario_id: '' }))
                                setSubmitError('')
                              }}
                            />
                            <div className="escalation-user-info">
                              <b>{u.name}</b>
                              <small>{u.email}</small>
                            </div>
                            <span className="escalation-load" title="Tickets activos asignados">
                              <IconTicket size={13} /> {u.carga_activa} activo(s)
                            </span>
                          </label>
                        ))}
                      </div>
                    ))}
                    </div>
                  ))}
                </div>
                {fieldErrors.destino_usuario_id && (
                  <span className="field-error-text">{fieldErrors.destino_usuario_id}</span>
                )}
              </div>

              {/* Motivo */}
              <div className="form-group mt-3">
                <label className="form-label" htmlFor="escalation-motivo">
                  2. Motivo del relevamiento: *
                </label>
                <textarea
                  id="escalation-motivo"
                  rows={3}
                  maxLength={2000}
                  value={motivo}
                  className={`textarea-field ${fieldErrors.motivo ? 'input-invalid' : ''}`}
                  placeholder="Ej. Se requiere acceso administrativo al servidor de la plataforma para resolver el incidente..."
                  onChange={(e) => {
                    setMotivo(e.target.value)
                    if (fieldErrors.motivo) setFieldErrors((p) => ({ ...p, motivo: '' }))
                    if (submitError) setSubmitError('')
                  }}
                />
                {fieldErrors.motivo && <span className="field-error-text">{fieldErrors.motivo}</span>}
              </div>

              {destino && (
                <div className="escalation-summary">
                  <IconCheck size={15} />
                  <span>
                    El ticket pasará de inmediato a <b>{destino.name}</b> ({destino.cargo.nombre}, Nivel {destino.nivel}).
                  </span>
                </div>
              )}

              {submitError && (
                <div className="reassign-error-alert">
                  <IconAlertCircle size={16} />
                  <span>{submitError}</span>
                </div>
              )}
            </>
          )}
        </>
      )}
    </ShellWithTicket>
  )
}

function ReturnModal({ ticket, onClose }) {
  const fetchEscalationOptions = useTicketsStore((s) => s.fetchEscalationOptions)
  const returnToPrevious = useTicketsStore((s) => s.returnToPrevious)
  const { showToast } = useToast()

  const [info, setInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [destinoId, setDestinoId] = useState(null)
  const [instrucciones, setInstrucciones] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let alive = true
    fetchEscalationOptions(ticket.id)
      .then((data) => alive && setInfo(data?.devolucion || null))
      .catch((err) => alive && setLoadError(err.message))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [ticket.id, fetchEscalationOptions])

  const requiresTarget = Boolean(info && !info.destino)

  const handleSubmit = async () => {
    const validation = validateSchema(createReturnTicketSchema(requiresTarget), {
      instrucciones,
      destino_usuario_id: destinoId,
    })
    if (!validation.success) {
      setFieldErrors(validation.fieldErrors)
      return
    }
    setSubmitting(true)
    setSubmitError('')
    try {
      const res = await returnToPrevious(ticket.id, validation.data.instrucciones, requiresTarget ? destinoId : null)
      showToast({ severity: 'success', summary: 'Ticket Devuelto', detail: res.message, life: 4500 })
      onClose()
    } catch (err) {
      setSubmitError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const footer = (
    <>
      <button type="button" className="btn-secondary" disabled={submitting} onClick={onClose}>
        Cancelar
      </button>
      <button
        type="button"
        className="btn-primary btn-escalate-confirm"
        disabled={submitting || !info?.can_return}
        onClick={handleSubmit}
      >
        <IconArrowBackUp size={16} />
        <span>{submitting ? 'Devolviendo...' : 'Devolver Ticket'}</span>
      </button>
    </>
  )

  return (
    <ShellWithTicket title="Devolver al Nivel Anterior" ticket={ticket} onClose={onClose} busy={submitting} footer={footer}>
      {loading ? (
        <div className="escalation-loading">
          <Skeleton height="60px" />
        </div>
      ) : loadError ? (
        <div className="reassign-error-alert">
          <IconAlertCircle size={16} />
          <span>{loadError}</span>
        </div>
      ) : !info?.can_return ? (
        <div className="reassign-error-alert">
          <IconAlertCircle size={16} />
          <span>{info?.reason || 'No es posible devolver este ticket.'}</span>
        </div>
      ) : (
        <>
          <div className="escalation-current">
            <span className="b-label">El ticket regresará a</span>
            {info.destino ? (
              <div>
                {info.cargo && <span className="escalation-level-pill">Nivel {info.cargo.nivel}</span>}
                <b>{info.destino.name}</b>
                {info.cargo && <span className="text-muted"> · {info.cargo.nombre}</span>}
              </div>
            ) : (
              <div className="text-muted">
                El responsable anterior ya no está disponible. Selecciona a otra persona de su cargo
                {info.cargo ? ` (${info.cargo.nombre})` : ''}:
              </div>
            )}
          </div>

          {requiresTarget && (
            <div className="form-group mt-3">
              {info.alternativas.map((u) => (
                <label key={u.id} className={`escalation-user-row ${destinoId === u.id ? 'is-selected' : ''}`}>
                  <input
                    type="radio"
                    name="return-target"
                    checked={destinoId === u.id}
                    onChange={() => {
                      setDestinoId(u.id)
                      setFieldErrors((p) => ({ ...p, destino_usuario_id: '' }))
                    }}
                  />
                  <div className="escalation-user-info">
                    <b>{u.name}</b>
                    <small>{u.email}</small>
                  </div>
                </label>
              ))}
              {fieldErrors.destino_usuario_id && (
                <span className="field-error-text">{fieldErrors.destino_usuario_id}</span>
              )}
            </div>
          )}

          <div className="form-group mt-3">
            <label className="form-label" htmlFor="return-instrucciones">
              Instrucciones para continuar la atención: *
            </label>
            <textarea
              id="return-instrucciones"
              rows={3}
              maxLength={2000}
              value={instrucciones}
              className={`textarea-field ${fieldErrors.instrucciones ? 'input-invalid' : ''}`}
              placeholder="Ej. Se aprobó el cambio de configuración; procede a aplicarlo y confirma con el usuario..."
              onChange={(e) => {
                setInstrucciones(e.target.value)
                if (fieldErrors.instrucciones) setFieldErrors((p) => ({ ...p, instrucciones: '' }))
                if (submitError) setSubmitError('')
              }}
            />
            {fieldErrors.instrucciones && <span className="field-error-text">{fieldErrors.instrucciones}</span>}
          </div>

          {submitError && (
            <div className="reassign-error-alert">
              <IconAlertCircle size={16} />
              <span>{submitError}</span>
            </div>
          )}
        </>
      )}
    </ShellWithTicket>
  )
}

function ShellWithTicket({ ticket, ...props }) {
  return <ModalShell subtitle={`Ticket ${ticket.codigo || `#${ticket.id}`}`} {...props} />
}
