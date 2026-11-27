import React, { useState, useEffect } from 'react'
import {
  IconSettings,
  IconBell,
  IconMail,
  IconClock,
  IconHourglassLow,
  IconCheck,
  IconRefresh,
  IconPlayerPlay,
  IconShieldCheck,
  IconAlertTriangle,
  IconInfoCircle,
} from '@tabler/icons-react'
import {
  getConfigurations,
  updateConfigurations,
  triggerReminders,
} from '../../api/notifications.js'
import { useAuthStore } from '../../stores/authStore.js'
import { isAdmin } from '../../utils/permissions.js'
import { useToast } from '../../context/ToastContext.jsx'
import { systemSettingsSchema, validateSchema, extractApiValidationErrors } from '../../schemas/index.js'
import './SettingsManagementView.css'

export default function SettingsManagementView() {
  const user = useAuthStore((state) => state.user)
  const userIsAdmin = isAdmin(user)
  const { showToast } = useToast()

  const [activeTab, setActiveTab] = useState('params') // 'params' | 'events'
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [triggering, setTriggering] = useState(false)
  const [triggerOutput, setTriggerOutput] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  // Configuraciones del sistema y políticas globales
  const [configs, setConfigs] = useState({
    horas_recordatorio_pendientes: 24,
    dias_ticket_sin_respuesta: 3,
    resumen_diario_activo: true,
    notificaciones_email_activas: true,
    notificaciones_inapp_activas: true,
    correo_remitente_nombre: 'Mesa de Ayuda UAGRM',
    correo_remitente_direccion: 'soporte@uagrm.edu.bo',
    notif_evento_ticket_creado_email: true,
    notif_evento_ticket_creado_inapp: true,
    notif_evento_cambio_estado_email: true,
    notif_evento_cambio_estado_inapp: true,
    notif_evento_solicitud_reasignacion_email: true,
    notif_evento_solicitud_reasignacion_inapp: true,
    notif_evento_reasignacion_email: true,
    notif_evento_reasignacion_inapp: true,
    notif_evento_recordatorio_email: true,
    notif_evento_recordatorio_inapp: true,
    notif_evento_sin_respuesta_email: true,
    notif_evento_sin_respuesta_inapp: true,
    relevamiento_permitir_saltar_niveles: false,
  })

  // Catálogo de eventos del sistema para las políticas globales
  const eventPolicies = [
    {
      id: 'ticket_creado',
      name: 'Apertura de Nuevos Tickets',
      desc: 'Notifica inmediatamente cuando un usuario crea un requerimiento en la mesa de ayuda.',
      target: 'Solicitante, Técnico asignado y Dirección',
      emailKey: 'notif_evento_ticket_creado_email',
      inappKey: 'notif_evento_ticket_creado_inapp',
    },
    {
      id: 'cambio_estado',
      name: 'Cambio de Estado en Tickets',
      desc: 'Alerta sobre avances en la atención (En Proceso, En Espera, Resuelto, Cerrado, Cancelado).',
      target: 'Solicitante, Técnico asignado y Dirección',
      emailKey: 'notif_evento_cambio_estado_email',
      inappKey: 'notif_evento_cambio_estado_inapp',
    },
    {
      id: 'solicitud_reasignacion',
      name: 'Solicitud de Reasignación Técnica',
      desc: 'Alerta al Director cuando un técnico de soporte solicita transferir un ticket a otro agente.',
      target: 'Administradores (Director) para autorización',
      emailKey: 'notif_evento_solicitud_reasignacion_email',
      inappKey: 'notif_evento_solicitud_reasignacion_inapp',
    },
    {
      id: 'reasignacion',
      name: 'Resolución de Reasignación',
      desc: 'Comunica el veredicto de la Dirección tras aprobar o rechazar el traspaso del ticket.',
      target: 'Nuevo técnico, técnico solicitante y creador',
      emailKey: 'notif_evento_reasignacion_email',
      inappKey: 'notif_evento_reasignacion_inapp',
    },
    {
      id: 'recordatorio',
      name: 'Recordatorio SLA de Tickets Pendientes',
      desc: 'Dispara recordatorio para tickets que superan las horas límite sin avance o respuesta.',
      target: 'Técnico asignado y Dirección',
      emailKey: 'notif_evento_recordatorio_email',
      inappKey: 'notif_evento_recordatorio_inapp',
    },
    {
      id: 'sin_respuesta',
      name: 'Alerta de Tickets sin Respuesta Inicial',
      desc: 'Envía un seguimiento al solicitante confirmando que su caso continúa en atención técnica.',
      target: 'Usuario solicitante del ticket',
      emailKey: 'notif_evento_sin_respuesta_email',
      inappKey: 'notif_evento_sin_respuesta_inapp',
    },
  ]

  const loadData = async () => {
    setLoading(true)
    try {
      const [notifData, relevamientoData] = await Promise.all([
        getConfigurations('notificaciones'),
        getConfigurations('relevamiento'),
      ])
      const cfgData = [...notifData, ...relevamientoData]
      const cfgMap = { ...configs }
      cfgData.forEach((item) => {
        if (item.tipo === 'integer') {
          cfgMap[item.clave] = parseInt(item.valor, 10)
        } else if (item.tipo === 'boolean') {
          cfgMap[item.clave] = item.valor === '1' || item.valor === true || item.valor === 'true'
        } else {
          cfgMap[item.clave] = item.valor
        }
      })
      setConfigs(cfgMap)
    } catch (err) {
      console.error(err)
      showToast({
        severity: 'error',
        summary: 'Error al cargar',
        detail: 'No se pudieron obtener las configuraciones del sistema.',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleConfigChange = (key, value) => {
    setConfigs((prev) => ({ ...prev, [key]: value }))
    if (fieldErrors[key]) {
      setFieldErrors((prev) => ({ ...prev, [key]: '' }))
    }
  }

  const handleSaveConfigs = async (e) => {
    if (e) e.preventDefault()

    const validation = validateSchema(systemSettingsSchema, configs)
    if (!validation.success) {
      setFieldErrors(validation.fieldErrors)
      const paramFields = [
        'horas_recordatorio_pendientes',
        'dias_ticket_sin_respuesta',
        'correo_remitente_nombre',
        'correo_remitente_direccion',
      ]
      if (paramFields.some((f) => validation.fieldErrors[f])) {
        setActiveTab('params')
      }
      showToast({
        severity: 'warn',
        summary: 'Revisa los datos',
        detail: validation.firstError,
        life: 4000,
      })
      return
    }

    setFieldErrors({})
    setSaving(true)
    try {
      const payload = Object.entries(validation.data).map(([clave, valor]) => ({
        clave,
        valor: typeof valor === 'boolean' ? (valor ? '1' : '0') : String(valor),
      }))

      await updateConfigurations(payload)
      setConfigs(validation.data)
      showToast({
        severity: 'success',
        summary: 'Configuración guardada',
        detail: 'Los parámetros y políticas institucionales han sido actualizados exitosamente.',
      })
    } catch (err) {
      const apiErr = extractApiValidationErrors(err, 'No se pudo guardar la configuración.')
      setFieldErrors(apiErr.fieldErrors)
      showToast({
        severity: 'error',
        summary: 'Error al guardar',
        detail: apiErr.message,
      })
    } finally {
      setSaving(false)
    }
  }

  const handleTriggerReminders = async () => {
    setTriggering(true)
    setTriggerOutput('')
    try {
      const res = await triggerReminders()
      setTriggerOutput(res.output || 'Proceso finalizado correctamente sin salida.')
      showToast({
        severity: 'success',
        summary: 'Recordatorios ejecutados',
        detail: 'El proceso programado se ejecutó con éxito.',
      })
    } catch (err) {
      showToast({
        severity: 'error',
        summary: 'Error de ejecución',
        detail: err.response?.data?.message || err.message,
      })
    } finally {
      setTriggering(false)
    }
  }

  if (!userIsAdmin) {
    return (
      <div className="settings-page">
        <div className="settings-card">
          <div className="settings-card-header">
            <h3>Acceso Restringido</h3>
            <p>La configuración del sistema y las políticas de notificación son de gestión exclusiva para el Administrador (Director).</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="settings-page">
      {/* Header */}
      <div className="settings-header">
        <div className="settings-header-info">
          <h2>
            <IconSettings className="settings-header-icon" size={28} />
            Configuraciones del Sistema & Políticas de Notificación
          </h2>
          <p>
            Gestión institucional exclusiva del Administrador (Director). Los parámetros aquí establecidos aplican globalmente a todos los usuarios del sistema.
          </p>
        </div>

        <button className="settings-reload-btn" onClick={loadData} disabled={loading}>
          <IconRefresh size={18} className={loading ? 'spinning' : ''} />
          <span>Recargar</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="settings-tabs">
        <button
          className={`settings-tab-btn ${activeTab === 'params' ? 'active' : ''}`}
          onClick={() => setActiveTab('params')}
        >
          <IconClock size={18} />
          <span>Parámetros SLA & Canales Globales</span>
        </button>
        <button
          className={`settings-tab-btn ${activeTab === 'events' ? 'active' : ''}`}
          onClick={() => setActiveTab('events')}
        >
          <IconBell size={18} />
          <span>Políticas de Notificación por Evento</span>
        </button>
      </div>

      {/* Content */}
      <div className="settings-content">
        {activeTab === 'params' && (
          <div className="settings-system-grid">
            <form onSubmit={handleSaveConfigs} className="settings-card" noValidate>
              <div className="settings-card-header">
                <h3>Tiempos de Espera & Disparadores SLA</h3>
                <p>Configura las horas y días límite antes de disparar alertas automáticas.</p>
              </div>

              <div className="settings-form-group">
                <label htmlFor="horas_recordatorio">
                  <IconClock size={16} />
                  <span>Horas de inactividad para recordatorio a Técnicos y Dirección</span>
                </label>
                <div className="input-suffix-wrapper">
                  <input
                    id="horas_recordatorio"
                    type="number"
                    min="1"
                    max="168"
                    value={configs.horas_recordatorio_pendientes}
                    onChange={(e) =>
                      handleConfigChange('horas_recordatorio_pendientes', e.target.value)
                    }
                    className={`settings-input ${fieldErrors.horas_recordatorio_pendientes ? 'input-invalid' : ''}`}
                    aria-invalid={Boolean(fieldErrors.horas_recordatorio_pendientes)}
                  />
                  <span className="input-suffix">horas</span>
                </div>
                {fieldErrors.horas_recordatorio_pendientes && (
                  <span className="field-error-text">{fieldErrors.horas_recordatorio_pendientes}</span>
                )}
                <small className="settings-helper-text">
                  Si un ticket en estado de Espera o Abierto supera este plazo sin avance, se generará una notificación en plataforma y un correo al técnico responsable y a la Dirección.
                </small>
              </div>

              <div className="settings-form-group">
                <label htmlFor="dias_sin_respuesta">
                  <IconHourglassLow size={16} />
                  <span>Días sin respuesta inicial para alertar al Solicitante</span>
                </label>
                <div className="input-suffix-wrapper">
                  <input
                    id="dias_sin_respuesta"
                    type="number"
                    min="1"
                    max="30"
                    value={configs.dias_ticket_sin_respuesta}
                    onChange={(e) =>
                      handleConfigChange('dias_ticket_sin_respuesta', e.target.value)
                    }
                    className={`settings-input ${fieldErrors.dias_ticket_sin_respuesta ? 'input-invalid' : ''}`}
                    aria-invalid={Boolean(fieldErrors.dias_ticket_sin_respuesta)}
                  />
                  <span className="input-suffix">días</span>
                </div>
                {fieldErrors.dias_ticket_sin_respuesta && (
                  <span className="field-error-text">{fieldErrors.dias_ticket_sin_respuesta}</span>
                )}
                <small className="settings-helper-text">
                  Si un ticket nuevo no recibe respuesta técnica en este número de días, el sistema despacha un correo de seguimiento institucional al usuario solicitante.
                </small>
              </div>

              <div className="settings-divider" />

              <div className="settings-card-header">
                <h3>Interruptores Maestros de Canales de Comunicación</h3>
                <p>Habilita o pausa globalmente el despacho de alertas institucionales.</p>
              </div>

              <div className="settings-toggle-row">
                <div className="toggle-label-box">
                  <span className="toggle-title">Canal de Correo Electrónico (Email)</span>
                  <span className="toggle-desc">
                    Habilitar el despacho de correos vía SMTP para los eventos autorizados del sistema.
                  </span>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={configs.notificaciones_email_activas}
                    onChange={(e) => handleConfigChange('notificaciones_email_activas', e.target.checked)}
                  />
                  <span className="slider round" />
                </label>
              </div>

              <div className="settings-toggle-row">
                <div className="toggle-label-box">
                  <span className="toggle-title">Bandeja de Notificaciones en Plataforma Web</span>
                  <span className="toggle-desc">
                    Permitir el registro y visualización en tiempo real de notificaciones en la campana web para los usuarios.
                  </span>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={configs.notificaciones_inapp_activas}
                    onChange={(e) => handleConfigChange('notificaciones_inapp_activas', e.target.checked)}
                  />
                  <span className="slider round" />
                </label>
              </div>

              <div className="settings-toggle-row">
                <div className="toggle-label-box">
                  <span className="toggle-title">Resumen Diario Consolidado (Digest)</span>
                  <span className="toggle-desc">
                    Consolidar tickets pendientes en un solo correo diario para Técnicos y Directores a primera hora de la mañana.
                  </span>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={configs.resumen_diario_activo}
                    onChange={(e) => handleConfigChange('resumen_diario_activo', e.target.checked)}
                  />
                  <span className="slider round" />
                </label>
              </div>

              <div className="settings-divider" />

              <div className="settings-card-header">
                <h3>Identidad del Remitente Institucional</h3>
                <p>Personaliza la procedencia que visualizarán los usuarios en los correos recibidos.</p>
              </div>

              <div className="settings-grid-2">
                <div className="settings-form-group">
                  <label htmlFor="remitente_nombre">Nombre del Remitente</label>
                  <input
                    id="remitente_nombre"
                    type="text"
                    maxLength={100}
                    value={configs.correo_remitente_nombre}
                    onChange={(e) => handleConfigChange('correo_remitente_nombre', e.target.value)}
                    className={`settings-input ${fieldErrors.correo_remitente_nombre ? 'input-invalid' : ''}`}
                    aria-invalid={Boolean(fieldErrors.correo_remitente_nombre)}
                  />
                  {fieldErrors.correo_remitente_nombre && (
                    <span className="field-error-text">{fieldErrors.correo_remitente_nombre}</span>
                  )}
                </div>
                <div className="settings-form-group">
                  <label htmlFor="remitente_correo">Correo Electrónico Sistema</label>
                  <input
                    id="remitente_correo"
                    type="email"
                    maxLength={150}
                    value={configs.correo_remitente_direccion}
                    onChange={(e) => handleConfigChange('correo_remitente_direccion', e.target.value)}
                    className={`settings-input ${fieldErrors.correo_remitente_direccion ? 'input-invalid' : ''}`}
                    aria-invalid={Boolean(fieldErrors.correo_remitente_direccion)}
                  />
                  {fieldErrors.correo_remitente_direccion && (
                    <span className="field-error-text">{fieldErrors.correo_remitente_direccion}</span>
                  )}
                </div>
              </div>

              <div className="settings-divider" />

              <div className="settings-card-header">
                <h3>Relevamiento de Tickets</h3>
                <p>Reglas del movimiento vertical de tickets entre los niveles de la Estructura Organizacional.</p>
              </div>

              <div className="settings-toggle-row">
                <div className="toggle-label-box">
                  <span className="toggle-title">Permitir saltar niveles en el relevamiento</span>
                  <span className="toggle-desc">
                    Desactivado: los Técnicos solo pueden relevar al nivel inmediato superior o inferior (secuencial).
                    Activado: pueden elegir cualquier nivel. Los Administradores siempre pueden saltar niveles.
                  </span>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={Boolean(configs.relevamiento_permitir_saltar_niveles)}
                    onChange={(e) => handleConfigChange('relevamiento_permitir_saltar_niveles', e.target.checked)}
                  />
                  <span className="slider round" />
                </label>
              </div>

              <div className="settings-actions">
                <button type="submit" className="settings-save-btn" disabled={saving}>
                  <IconCheck size={18} />
                  <span>{saving ? 'Guardando...' : 'Guardar Parámetros del Sistema'}</span>
                </button>
              </div>
            </form>

            {/* Panel de prueba manual del scheduler */}
            <div className="settings-card test-card">
              <div className="settings-card-header">
                <h3>Ejecución Manual de Recordatorios</h3>
                <p>Dispara de inmediato el proceso programado del servidor.</p>
              </div>

              <p className="test-desc">
                Esta acción evalúa todos los tickets con los parámetros vigentes, registra las notificaciones correspondientes en plataforma y despacha los correos hacia los técnicos y la Dirección.
              </p>

              <button
                className="settings-trigger-btn"
                onClick={handleTriggerReminders}
                disabled={triggering}
              >
                <IconPlayerPlay size={18} />
                <span>{triggering ? 'Ejecutando proceso...' : 'Disparar Recordatorios Ahora'}</span>
              </button>

              {triggerOutput && (
                <div className="trigger-output-box">
                  <div className="output-header">Registro de Ejecución Artisan:</div>
                  <pre className="output-pre">{triggerOutput}</pre>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'events' && (
          <div className="settings-card">
            <div className="settings-card-header">
              <h3>Políticas Globales de Notificación por Evento</h3>
              <p>
                Define qué canales institucionales se activan ante cada suceso del ciclo de vida del ticket. Esta política aplica obligatoriamente para todos los usuarios.
              </p>
            </div>

            {(!configs.notificaciones_email_activas || !configs.notificaciones_inapp_activas) && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 16px',
                marginBottom: '16px',
                backgroundColor: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: '8px',
                color: '#92400e',
                fontSize: '13px'
              }}>
                <IconAlertTriangle size={20} />
                <span>
                  <strong>Atención:</strong> Uno o más canales maestros se encuentran pausados en la pestaña anterior. Si un canal maestro está desactivado, no se enviarán alertas a través de él aunque esté habilitado individualmente en esta matriz.
                </span>
              </div>
            )}

            <div className="prefs-table-wrapper">
              <table className="prefs-table">
                <thead>
                  <tr>
                    <th>Evento del Sistema & Alcance</th>
                    <th className="th-center" style={{ width: '130px' }}>
                      <div className="th-icon-label">
                        <IconMail size={16} />
                        <span>Correo</span>
                      </div>
                    </th>
                    <th className="th-center" style={{ width: '130px' }}>
                      <div className="th-icon-label">
                        <IconBell size={16} />
                        <span>Plataforma</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {eventPolicies.map((evt) => (
                    <tr key={evt.id}>
                      <td className="td-label">
                        <span className="pref-event-name">{evt.name}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {evt.desc}
                        </span>
                        <span style={{ fontSize: '0.6875rem', color: 'var(--text-brand)', fontWeight: 500, marginTop: '4px' }}>
                          Destinatarios: {evt.target}
                        </span>
                      </td>
                      <td className="td-center">
                        <label className="switch">
                          <input
                            type="checkbox"
                            checked={configs[evt.emailKey] ?? true}
                            onChange={(e) => handleConfigChange(evt.emailKey, e.target.checked)}
                          />
                          <span className="slider round" />
                        </label>
                      </td>
                      <td className="td-center">
                        <label className="switch">
                          <input
                            type="checkbox"
                            checked={configs[evt.inappKey] ?? true}
                            onChange={(e) => handleConfigChange(evt.inappKey, e.target.checked)}
                          />
                          <span className="slider round" />
                        </label>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="settings-actions">
              <button
                type="button"
                className="settings-save-btn"
                onClick={handleSaveConfigs}
                disabled={saving}
              >
                <IconCheck size={18} />
                <span>{saving ? 'Guardando...' : 'Guardar Políticas Institucionales'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
