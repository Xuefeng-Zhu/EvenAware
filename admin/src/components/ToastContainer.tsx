import { useToast } from '../contexts/ToastContext'

export default function ToastContainer() {
  const { toasts, dismiss } = useToast()

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="alert"
          className={`rounded-md px-4 py-3 text-white shadow-lg flex items-center justify-between gap-3 ${
            toast.type === 'success'
              ? 'bg-green-600'
              : 'bg-red-600'
          }`}
        >
          <span className="text-sm">{toast.message}</span>
          {toast.type === 'error' && (
            <button
              onClick={() => dismiss(toast.id)}
              className="shrink-0 text-white/80 hover:text-white focus:outline-none"
              aria-label="Dismiss"
            >
              ✕
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
