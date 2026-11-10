import React, { createContext, useContext, useRef } from 'react'
import { Toast } from 'primereact/toast'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const toastRef = useRef(null)

  const showToast = ({ severity = 'info', summary = '', detail = '', life = 3500 }) => {
    if (toastRef.current) {
      toastRef.current.show({ severity, summary, detail, life })
    }
  }

  return (
    <ToastContext.Provider value={{ showToast, toastRef }}>
      <Toast ref={toastRef} position="top-right" />
      {children}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    return {
      showToast: (args) => console.log('Toast:', args),
      toastRef: null,
    }
  }
  return context
}

export default ToastContext
