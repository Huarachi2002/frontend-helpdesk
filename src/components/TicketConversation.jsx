import React, { useMemo, useState } from 'react'
import { Button } from 'primereact/button'
import { IconMail, IconMailCheck, IconMailOff, IconMessages, IconLock, IconSend } from '@tabler/icons-react'
import { isAdmin } from '../utils/permissions.js'
import './TicketConversation.css'

const FINAL_STATUSES = ['resolved', 'closed']

/**
 * Conversación del ticket y formulario de respuesta.
 * La respuesta se envía por correo a la contraparte y el backend
 * actualiza el estado del ticket automáticamente.
 */
export default function TicketConversation({ ticket, currentUser, onReply, statusLabel, formatDate }) {
  const [mensaje, setMensaje] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const mensajes = ticket?.mensajes ?? []
  const status = ticket?.status

  const role = useMemo(() => {
    if (!ticket || !currentUser) return null
    const solicitanteId = ticket.solicitante?.id ?? ticket.created_by?.id
    const asignadoId = ticket.tecnico_asignado?.id ?? ticket.assigned_to?.id
    if (solicitanteId === currentUser.id) return 'CLIENTE'
    if (isAdmin(currentUser) || asignadoId === currentUser.id) return 'SOPORTE'
    return null
  }, [ticket, currentUser])

  const isFinal = FINAL_STATUSES.includes(status)
  const canReply = Boolean(role) && !isFinal
  const canResolve = role === 'SOPORTE' && (ticket?.allowed_transitions ?? []).includes('resolved')

  const nextStatusHint = useMemo(() => {
    if (role === 'SOPORTE' && ['open', 'in_progress'].includes(status)) return 'waiting'
    if (role === 'CLIENTE' && status === 'waiting') return 'in_progress'
    return null
  }, [role, status])

  const recipientName =
    role === 'SOPORTE'
      ? ticket?.solicitante?.name || 'el solicitante'
      : ticket?.tecnico_asignado?.name || 'el soporte técnico'

  const submit = async (nextStatus = null) => {
    const text = mensaje.trim()
    if (text.length < 2) {
      setError('Escribe el contenido de la respuesta.')
      return
    }
    setError('')
    setSending(true)
    try {
      await onReply(text, nextStatus)
      setMensaje('')
    } catch (e) {
      setError(e.message || 'No se pudo enviar la respuesta.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="surface-card ticket-conversation">
      <div className="card-section-header">
        <IconMessages size={18} className="text-blue" />
        <h3 className="section-heading">Respuestas del Ticket</h3>
        <span className="conv-count">{mensajes.length}</span>
      </div>

      {mensajes.length === 0 ? (
        <div className="conv-empty">Todavía no hay respuestas en este ticket.</div>
      ) : (
        <ul className="conv-list">
          {mensajes.map((m) => {
            const mine = m.usuario?.id === currentUser?.id
            const isSupport = m.tipo_emisor === 'SOPORTE'
            return (
              <li key={m.id} className={`conv-item ${isSupport ? 'is-support' : 'is-client'} ${mine ? 'is-mine' : ''}`}>
                <div className="conv-meta">
                  <span className="conv-author">{m.remitente_nombre || m.usuario?.name || m.remitente_email}</span>
                  <span className={`conv-badge ${isSupport ? 'badge-support' : 'badge-client'}`}>
                    {isSupport ? 'Soporte' : 'Solicitante'}
                  </span>
                  <span className="conv-time">{formatDate(m.fecha_creacion)}</span>
                  <span
                    className={`conv-mail ${m.enviado_por_correo ? 'sent' : 'not-sent'}`}
                    title={m.enviado_por_correo ? 'Enviado por correo' : 'No se envió por correo'}
                  >
                    {m.enviado_por_correo ? <IconMailCheck size={14} /> : <IconMailOff size={14} />}
                  </span>
                </div>
                <div className="conv-body">{m.cuerpo_mensaje}</div>
              </li>
            )
          })}
        </ul>
      )}

      {isFinal ? (
        <div className="conv-locked">
          <IconLock size={15} />
          <span>El ticket está {statusLabel(status).toLowerCase()} y ya no admite respuestas.</span>
        </div>
      ) : !role ? (
        <div className="conv-locked">
          <IconLock size={15} />
          <span>Solo el solicitante, el técnico asignado o la Dirección pueden responder.</span>
        </div>
      ) : (
        <div className="conv-form">
          <label htmlFor="reply-message" className="conv-label">
            <IconMail size={14} /> Responder por correo a <strong>{recipientName}</strong>
          </label>
          <textarea
            id="reply-message"
            className="textarea-field w-full"
            rows={4}
            value={mensaje}
            maxLength={10000}
            disabled={sending || !canReply}
            placeholder="Escribe tu respuesta..."
            onChange={(e) => setMensaje(e.target.value)}
          />
          {nextStatusHint && (
            <p className="conv-hint">
              Al enviar, el ticket pasará a <strong>{statusLabel(nextStatusHint)}</strong>.
            </p>
          )}
          {error && <p className="conv-error">{error}</p>}
          <div className="conv-actions">
            {canResolve && (
              <Button
                label="Responder y resolver"
                severity="success"
                outlined
                size="small"
                disabled={sending}
                onClick={() => submit('resolved')}
              />
            )}
            <Button
              label={sending ? 'Enviando...' : 'Enviar respuesta'}
              icon={<IconSend size={15} style={{ marginRight: 6 }} />}
              size="small"
              loading={sending}
              disabled={sending}
              onClick={() => submit(null)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
