import React, { useState, useEffect, useCallback } from 'react'
import { Button } from 'primereact/button'
import { Skeleton } from 'primereact/skeleton'
import { Tag } from 'primereact/tag'
import {
  IconShieldLock, IconRefresh, IconFilter, IconLogin,
  IconLogout, IconAlertTriangle, IconActivity, IconChartBar,
  IconWorld, IconUser,
} from '@tabler/icons-react'
import { getAuditLogs, getAuditStats } from '../../api/auditLogs.js'
import './AuditLogView.css'

const TIPO_EVENTO_CONFIG = {
  LOGIN_OK:   { label: 'Login Exitoso',  severity: 'success', icon: IconLogin },
  LOGIN_FAIL: { label: 'Login Fallido',  severity: 'danger',  icon: IconAlertTriangle },
  LOGOUT:     { label: 'Cierre Sesión',  severity: 'secondary', icon: IconLogout },
  ACCESS:     { label: 'Acceso',         severity: 'info',    icon: IconActivity },
}

export default function AuditLogView() {
  const [logs, setLogs] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingStats, setLoadingStats] = useState(true)
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 })

  // Filtros
  const [filters, setFilters] = useState({
    tipo_evento: '',
    fecha_desde: '',
    fecha_hasta: '',
    ip: '',
  })

  const fetchLogs = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const params = { page, ...filters }
      Object.keys(params).forEach(k => !params[k] && delete params[k])
      const res = await getAuditLogs(params)
      setLogs(res.data.data || [])
      setPagination({
        current_page: res.data.current_page,
        last_page: res.data.last_page,
        total: res.data.total,
      })
    } catch (err) {
      console.error('Error al cargar bitácora:', err)
    } finally {
      setLoading(false)
    }
  }, [filters])

  const fetchStats = useCallback(async () => {
    setLoadingStats(true)
    try {
      const res = await getAuditStats()
      setStats(res.data)
    } catch (err) {
      console.error('Error al cargar estadísticas:', err)
    } finally {
      setLoadingStats(false)
    }
  }, [])

  useEffect(() => {
    fetchLogs(1)
    fetchStats()
  }, [])

  const applyFilters = () => fetchLogs(1)
  const clearFilters = () => {
    setFilters({ tipo_evento: '', fecha_desde: '', fecha_hasta: '', ip: '' })
    setTimeout(() => fetchLogs(1), 100)
  }

  const formatDate = (d) => {
    if (!d) return '—'
    return new Date(d).toLocaleString('es-BO', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    })
  }

  const getTipoConfig = (tipo) => TIPO_EVENTO_CONFIG[tipo] || { label: tipo, severity: 'secondary', icon: IconActivity }

  return (
    <div className="audit-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Bitácora de Auditoría</h1>
          <p className="page-subtitle">
            Registro persistente de accesos, inicios de sesión e interacciones del sistema
          </p>
        </div>
        <Button
          label="Actualizar"
          severity="secondary"
          outlined
          size="small"
          icon={<IconRefresh size={16} />}
          loading={loading}
          onClick={() => { fetchLogs(1); fetchStats() }}
        />
      </div>

      {/* Stats Cards */}
      <div className="audit-stats-row">
        {loadingStats ? (
          [1,2,3,4].map(i => (
            <div key={i} className="audit-stat-card">
              <Skeleton width="60%" height="28px" className="mb-2" />
              <Skeleton width="80%" height="14px" />
            </div>
          ))
        ) : (
          <>
            <div className="audit-stat-card audit-stat-green">
              <div className="audit-stat-icon"><IconLogin size={22} /></div>
              <div className="audit-stat-value">{stats?.logins_exitosos_24h ?? 0}</div>
              <div className="audit-stat-label">Logins Exitosos (24h)</div>
            </div>
            <div className="audit-stat-card audit-stat-red">
              <div className="audit-stat-icon"><IconAlertTriangle size={22} /></div>
              <div className="audit-stat-value">{stats?.logins_fallidos_24h ?? 0}</div>
              <div className="audit-stat-label">Intentos Fallidos (24h)</div>
            </div>
            <div className="audit-stat-card audit-stat-blue">
              <div className="audit-stat-icon"><IconActivity size={22} /></div>
              <div className="audit-stat-value">
                {stats?.por_evento?.find(e => e.tipo_evento === 'ACCESS')?.total ?? 0}
              </div>
              <div className="audit-stat-label">Total Accesos</div>
            </div>
            <div className="audit-stat-card audit-stat-purple">
              <div className="audit-stat-icon"><IconChartBar size={22} /></div>
              <div className="audit-stat-value">{stats?.top_recursos?.length ?? 0}</div>
              <div className="audit-stat-label">Recursos Monitoreados</div>
            </div>
          </>
        )}
      </div>

      {/* Top Recursos */}
      {!loadingStats && stats?.top_recursos?.length > 0 && (
        <div className="audit-top-resources">
          <div className="audit-section-title">
            <IconWorld size={18} />
            <span>Recursos con Mayor Índice de Acceso</span>
          </div>
          <div className="audit-resources-list">
            {stats.top_recursos.map((r, i) => (
              <div key={i} className="audit-resource-item">
                <span className="audit-resource-rank">#{i + 1}</span>
                <span className="audit-resource-path">{r.recurso}</span>
                <span className="audit-resource-count">{r.total} accesos</span>
                <div
                  className="audit-resource-bar"
                  style={{ width: `${Math.round((r.total / stats.top_recursos[0].total) * 100)}%` }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="audit-filters">
        <div className="audit-filter-row">
          <div className="filter-group">
            <label>Tipo de Evento</label>
            <select
              className="filter-select"
              value={filters.tipo_evento}
              onChange={e => setFilters(f => ({ ...f, tipo_evento: e.target.value }))}
            >
              <option value="">Todos</option>
              <option value="LOGIN_OK">Login Exitoso</option>
              <option value="LOGIN_FAIL">Login Fallido</option>
              <option value="LOGOUT">Cierre de Sesión</option>
              <option value="ACCESS">Acceso a Recurso</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Desde</label>
            <input
              type="date"
              className="filter-input"
              value={filters.fecha_desde}
              onChange={e => setFilters(f => ({ ...f, fecha_desde: e.target.value }))}
            />
          </div>

          <div className="filter-group">
            <label>Hasta</label>
            <input
              type="date"
              className="filter-input"
              value={filters.fecha_hasta}
              onChange={e => setFilters(f => ({ ...f, fecha_hasta: e.target.value }))}
            />
          </div>

          <div className="filter-group">
            <label>IP</label>
            <input
              type="text"
              className="filter-input"
              placeholder="Ej: 192.168.1"
              value={filters.ip}
              onChange={e => setFilters(f => ({ ...f, ip: e.target.value }))}
            />
          </div>

          <div className="filter-actions">
            <Button label="Filtrar" size="small" icon={<IconFilter size={15} />} onClick={applyFilters} />
            <Button label="Limpiar" size="small" severity="secondary" outlined onClick={clearFilters} />
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="audit-table-wrap">
        <div className="audit-table-header">
          <div className="audit-section-title">
            <IconShieldLock size={18} />
            <span>Registros de Bitácora</span>
          </div>
          <span className="audit-total-badge">{pagination.total} registros totales</span>
        </div>

        {loading ? (
          <div className="audit-table-skeleton">
            {[1,2,3,4,5].map(i => <Skeleton key={i} height="50px" className="mb-2" />)}
          </div>
        ) : (
          <div className="audit-table">
            <div className="audit-table-head">
              <div>Fecha/Hora</div>
              <div>Tipo Evento</div>
              <div>Usuario</div>
              <div>IP</div>
              <div>Recurso / Acción</div>
            </div>

            {logs.length === 0 ? (
              <div className="audit-empty">No se encontraron registros con los filtros aplicados</div>
            ) : (
              logs.map(log => {
                const cfg = getTipoConfig(log.tipo_evento)
                const TipoIcon = cfg.icon
                return (
                  <div key={log.id} className="audit-table-row">
                    <div className="audit-cell-date">{formatDate(log.created_at)}</div>
                    <div className="audit-cell-tipo">
                      <Tag
                        severity={cfg.severity}
                        value={
                          <span className="audit-tag-inner">
                            <TipoIcon size={12} />
                            {cfg.label}
                          </span>
                        }
                      />
                    </div>
                    <div className="audit-cell-user">
                      {log.usuario ? (
                        <span className="audit-user-pill">
                          <IconUser size={13} />
                          {log.usuario.nombre} {log.usuario.apellido}
                        </span>
                      ) : log.correo_intento ? (
                        <span className="audit-email-attempt">{log.correo_intento}</span>
                      ) : '—'}
                    </div>
                    <div className="audit-cell-ip">
                      <code className="audit-ip">{log.ip ?? '—'}</code>
                    </div>
                    <div className="audit-cell-recurso" title={log.descripcion}>
                      <span className="audit-method">{log.metodo}</span>
                      <span className="audit-path">{log.recurso}</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* Paginación */}
        {!loading && pagination.last_page > 1 && (
          <div className="audit-pagination">
            <Button
              label="Anterior"
              size="small"
              severity="secondary"
              outlined
              disabled={pagination.current_page <= 1}
              onClick={() => fetchLogs(pagination.current_page - 1)}
            />
            <span className="audit-page-info">
              Página {pagination.current_page} de {pagination.last_page}
            </span>
            <Button
              label="Siguiente"
              size="small"
              severity="secondary"
              outlined
              disabled={pagination.current_page >= pagination.last_page}
              onClick={() => fetchLogs(pagination.current_page + 1)}
            />
          </div>
        )}
      </div>
    </div>
  )
}
