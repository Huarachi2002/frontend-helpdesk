import React, { useEffect } from 'react'
import { IconX } from '@tabler/icons-react'

/**
 * Panel lateral deslizable (Drawer) para revelación progresiva:
 * permite inspeccionar el detalle de un registro o estado sin abandonar la vista.
 */
export default function DetailDrawer({ open, title, subtitle, onClose, footer, children }) {
  useEffect(() => {
    if (!open) return
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="ux-drawer-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.()
      }}
    >
      <aside className="ux-drawer-panel" role="dialog" aria-modal="true" aria-label={title}>
        <div className="ux-drawer-header">
          <div className="ux-drawer-titles">
            <h3 className="ux-drawer-title">{title}</h3>
            {subtitle && <p className="ux-drawer-subtitle">{subtitle}</p>}
          </div>
          <button
            type="button"
            className="ux-drawer-close"
            onClick={onClose}
            aria-label="Cerrar panel"
          >
            <IconX size={18} />
          </button>
        </div>

        <div className="ux-drawer-body">{children}</div>

        {footer && <div className="ux-drawer-footer">{footer}</div>}
      </aside>
    </div>
  )
}
