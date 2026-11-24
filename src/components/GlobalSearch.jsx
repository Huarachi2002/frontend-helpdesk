import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconSearch, IconTicket, IconUsers, IconFolders, IconX } from '@tabler/icons-react'
import { globalSearch } from '../api/search.js'
import './GlobalSearch.css'

export default function GlobalSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const inputRef = useRef(null)
  const containerRef = useRef(null)
  const debounceRef = useRef(null)
  const navigate = useNavigate()

  const doSearch = useCallback(async (q) => {
    if (q.length < 2) {
      setResults(null)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await globalSearch(q)
      setResults(res.data)
    } catch (err) {
      setResults(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (query.length < 2) {
      setResults(null)
      return
    }
    debounceRef.current = setTimeout(() => doSearch(query), 400)
    return () => clearTimeout(debounceRef.current)
  }, [query, doSearch])

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = (url) => {
    navigate(url)
    setQuery('')
    setResults(null)
    setOpen(false)
  }

  const hasResults = results && (
    results.tickets?.length > 0 ||
    results.usuarios?.length > 0 ||
    results.categorias?.length > 0
  )

  const getEstadoLabel = (estado) => {
    const map = {
      EN_ESPERA: 'En Espera',
      CLIENTE_ESPERANDO_RESPUESTA: 'En Progreso',
      ESPERANDO_POR_CLIENTE: 'Esperando Cliente',
      RESUELTO: 'Resuelto',
      CERRADO: 'Cerrado',
    }
    return map[estado] || estado
  }

  return (
    <div className="gs-wrapper" ref={containerRef}>
      <div className={`gs-input-box ${open ? 'gs-open' : ''}`}>
        <IconSearch size={16} className="gs-icon" />
        <input
          ref={inputRef}
          type="text"
          className="gs-input"
          placeholder="Buscar tickets, usuarios, categorías..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          autoComplete="off"
        />
        {query && (
          <button className="gs-clear" onClick={() => { setQuery(''); setResults(null); inputRef.current?.focus() }}>
            <IconX size={14} />
          </button>
        )}
      </div>

      {open && query.length >= 2 && (
        <div className="gs-dropdown">
          {loading && (
            <div className="gs-loading">
              <span className="gs-spinner" />
              <span>Buscando...</span>
            </div>
          )}

          {!loading && !hasResults && results && (
            <div className="gs-empty">No se encontraron resultados para "<b>{query}</b>"</div>
          )}

          {!loading && hasResults && (
            <>
              {results.tickets?.length > 0 && (
                <div className="gs-group">
                  <div className="gs-group-label"><IconTicket size={13} /> Tickets</div>
                  {results.tickets.map((t) => (
                    <button key={t.id} className="gs-item" onClick={() => handleSelect(t.url)}>
                      <span className="gs-item-code">{t.codigo}</span>
                      <span className="gs-item-title">{t.asunto}</span>
                      <span className={`gs-item-badge gs-badge-${t.estado?.toLowerCase()}`}>
                        {getEstadoLabel(t.estado)}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {results.usuarios?.length > 0 && (
                <div className="gs-group">
                  <div className="gs-group-label"><IconUsers size={13} /> Usuarios</div>
                  {results.usuarios.map((u) => (
                    <button key={u.id} className="gs-item" onClick={() => handleSelect(u.url)}>
                      <span className="gs-item-title">{u.nombre}</span>
                      <span className="gs-item-sub">{u.correo}</span>
                      <span className="gs-item-badge gs-badge-rol">{u.rol}</span>
                    </button>
                  ))}
                </div>
              )}

              {results.categorias?.length > 0 && (
                <div className="gs-group">
                  <div className="gs-group-label"><IconFolders size={13} /> Categorías</div>
                  {results.categorias.map((c) => (
                    <button key={c.id} className="gs-item" onClick={() => handleSelect(c.url)}>
                      <span className="gs-item-title">{c.nombre}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
