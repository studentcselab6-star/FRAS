import { useEffect } from 'react'
import type { Toast } from '../../types'

interface ToastContainerProps {
  toasts: Toast[]
  onRemove: (id: string) => void
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 min-w-[300px]
            transform transition-all duration-300 animate-slide-in-right
            ${toast.type === 'success' ? 'bg-green-500 text-white' : ''}
            ${toast.type === 'error' ? 'bg-red-500 text-white' : ''}
            ${toast.type === 'warning' ? 'bg-yellow-500 text-white' : ''}
            ${toast.type === 'info' ? 'bg-blue-500 text-white' : ''}
          `}
        >
          <i className={`fas ${getToastIcon(toast.type)}`} />
          <span className="flex-1">{toast.message}</span>
          <button
            onClick={() => onRemove(toast.id)}
            className="opacity-70 hover:opacity-100 transition-opacity"
            aria-label="Close notification"
          >
            <i className="fas fa-times" />
          </button>
        </div>
      ))}
    </div>
  )
}

const getToastIcon = (type: Toast['type']): string => {
  switch (type) {
    case 'success': return 'fa-check-circle'
    case 'error': return 'fa-exclamation-circle'
    case 'warning': return 'fa-exclamation-triangle'
    case 'info': return 'fa-info-circle'
    default: return 'fa-info-circle'
  }
}

// Hook for managing toasts
export const useToast = () => {
  const addToast = (message: string, type: Toast['type'] = 'info', duration: number = 5000) => {
    const id = crypto.randomUUID()
    const toast: Toast = { id, message, type }
    
    // Dispatch custom event for global toast handler
    window.dispatchEvent(new CustomEvent('toast', { detail: { toast, duration } }))
    
    return id
  }

  const success = (message: string, duration?: number) => addToast(message, 'success', duration)
  const error = (message: string, duration?: number) => addToast(message, 'error', duration)
  const warning = (message: string, duration?: number) => addToast(message, 'warning', duration)
  const info = (message: string, duration?: number) => addToast(message, 'info', duration)

  return { success, error, warning, info }
}

// Add CSS animation for toast
const style = document.createElement('style')
style.textContent = `
  @keyframes slide-in-right {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  .animate-slide-in-right {
    animation: slide-in-right 0.3s ease-out;
  }
`
document.head.appendChild(style)