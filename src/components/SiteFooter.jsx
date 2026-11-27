import React, { useEffect, useState, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { IconEye, IconWorld, IconPalette } from '@tabler/icons-react'
import { trackPageVisit } from '../api/pageVisits.js'
import { getRouteContext } from '../config/navigation.js'
import { useAppearanceStore, THEME_OPTIONS } from '../stores/appearanceStore.js'
import './SiteFooter.css'

// Evita doble conteo por React.StrictMode en desarrollo para una misma navegación
const recentTrackCache = new Map()
const DEDUPE_WINDOW_MS = 1200

const LOCAL_FALLBACK_KEY = 'helpdesk_page_visits_fallback_v1'

function incrementLocalFallback(pathname) {
  try {
    const raw = localStorage.getItem(LOCAL_FALLBACK_KEY)
    const map = raw ? JSON.parse(raw) : {}
    map[pathname] = (Number(map[pathname]) || 0) + 1
    localStorage.setItem(LOCAL_FALLBACK_KEY, JSON.stringify(map))
    const total = Object.values(map).reduce((sum, n) => sum + (Number(n) || 0), 0)
    return { visitas: map[pathname], total_sitio: total }
  } catch {
    return { visitas: 1, total_sitio: 1 }
  }
}

export default function SiteFooter({ variant = 'app' }) {
  const location = useLocation()
  const theme = useAppearanceStore((s) => s.theme)
  const effectiveMode = useAppearanceStore((s) => s.effectiveMode)
  const highContrast = useAppearanceStore((s) => s.highContrast)

  const routeContext = useMemo(
    () => getRouteContext(location.pathname),
    [location.pathname]
  )

  const themeLabel = useMemo(() => {
    return THEME_OPTIONS.find((t) => t.id === theme)?.label || 'Adultos'
  }, [theme])

  const [stats, setStats] = useState({
    ruta: location.pathname,
    visitas: null,
    totalSitio: null,
    loading: true,
  })

  useEffect(() => {
    let active = true
    const pathname = location.pathname || '/'
    const navKey = `${location.key || 'init'}::${pathname}`
    const now = Date.now()

    const cached = recentTrackCache.get(navKey)
    if (cached && now - cached.timestamp < DEDUPE_WINDOW_MS) {
      cached.promise.then((result) => {
        if (active && result) {
          setStats({
            ruta: pathname,
            visitas: result.visitas,
            totalSitio: result.total_sitio,
            loading: false,
          })
        }
      })
      return () => {
        active = false
      }
    }

    setStats((prev) => ({ ...prev, ruta: pathname, loading: true }))

    const trackPromise = trackPageVisit(pathname, routeContext.title)
      .then((data) => ({
        visitas: Number(data?.visitas ?? 0),
        total_sitio: Number(data?.total_sitio ?? 0),
      }))
      .catch(() => incrementLocalFallback(pathname))

    recentTrackCache.set(navKey, { timestamp: now, promise: trackPromise })

    // Limpiar entradas antiguas del cache en memoria
    if (recentTrackCache.size > 30) {
      for (const [key, entry] of recentTrackCache.entries()) {
        if (now - entry.timestamp > 10000) {
          recentTrackCache.delete(key)
        }
      }
    }

    trackPromise.then((result) => {
      if (active) {
        setStats({
          ruta: pathname,
          visitas: result.visitas,
          totalSitio: result.total_sitio,
          loading: false,
        })
      }
    })

    return () => {
      active = false
    }
  }, [location.pathname, location.key, routeContext.title])

  const formattedPageVisits = useMemo(() => {
    if (stats.visitas === null) return '—'
    return new Intl.NumberFormat('es-BO').format(stats.visitas)
  }, [stats.visitas])

  const formattedSiteTotal = useMemo(() => {
    if (stats.totalSitio === null) return null
    return new Intl.NumberFormat('es-BO').format(stats.totalSitio)
  }, [stats.totalSitio])

  return (
    <footer
      className={`site-footer site-footer--${variant}`}
      role="contentinfo"
      aria-label="Pie de página y contador global de accesos"
    >
      <div className="site-footer-inner">

        {/* Contador global de accesos por página/vista (visible para todos los usuarios) */}
        <div className="site-footer-counters" aria-live="polite">
          <div
            className="page-visit-badge"
            title={`Accesos globales registrados en la vista ${routeContext.title} (${stats.ruta})`}
          >
            <IconEye size={15} strokeWidth={2.2} className="visit-icon" />
            <span className="visit-route-label">{routeContext.title}</span>
            <span className="visit-route-path">({stats.ruta})</span>
            <strong className="visit-count-value">
              {stats.loading && stats.visitas === null ? '...' : formattedPageVisits}
            </strong>
            <span className="visit-count-unit">
              {stats.visitas === 1 ? 'visita' : 'visitas'}
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
