import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react'
import type { ReactNode } from 'react'

export interface Toast {
  id: string
  type: 'success' | 'error'
  message: string
}

export interface ToastContextValue {
  toasts: Toast[]
  showSuccess: (message: string) => void
  showError: (message: string) => void
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

let toastCounter = 0

function generateToastId(): string {
  toastCounter += 1
  return `toast-${toastCounter}-${Date.now()}`
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: string) => {
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showSuccess = useCallback(
    (message: string) => {
      const id = generateToastId()
      const toast: Toast = { id, type: 'success', message }
      setToasts((prev) => [...prev, toast])

      const timer = setTimeout(() => {
        timersRef.current.delete(id)
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, 4000)
      timersRef.current.set(id, timer)
    },
    []
  )

  const showError = useCallback((message: string) => {
    const id = generateToastId()
    const toast: Toast = { id, type: 'error', message }
    setToasts((prev) => [...prev, toast])
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, showSuccess, showError, dismiss }}>
      {children}
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
