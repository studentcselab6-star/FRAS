import { useState, useEffect, useCallback } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Navbar } from '../components/ui/Navbar'
import { Sidebar } from '../components/ui/Sidebar'
import { ToastContainer, useToast } from '../components/ui/Toast'
import type { User } from '../types'

const Layout = () => {
  const [user, setUser] = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: 'success' | 'error' | 'info' | 'warning' }>>([])
  const location = useLocation()
  const navigate = useNavigate()
  const toast = useToast()

  // Sync auth state with localStorage
  const syncAuthState = useCallback(() => {
    const auth = localStorage.getItem('auth')
    const userData = localStorage.getItem('user')
    if (auth && userData) {
      setIsAuthenticated(true)
      try {
        setUser(JSON.parse(userData))
      } catch (err) {
        console.error('Failed to parse user data:', err)
        localStorage.removeItem('user')
      }
    } else {
      setIsAuthenticated(false)
      setUser(null)
    }
  }, [])

  // Initial sync
  useEffect(() => {
    syncAuthState()
  }, [syncAuthState])

  // Listen for storage events (sync across tabs)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth' || e.key === 'user') {
        syncAuthState()
      }
    }
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [syncAuthState])

  // Listen for toast events
  useEffect(() => {
    const handleToast = (e: Event) => {
      const customEvent = e as CustomEvent<{ toast: { id: string; message: string; type: string }; duration: number }>
      const { toast: toastData, duration } = customEvent.detail
      
      setToasts(prev => [...prev, { 
        id: toastData.id, 
        message: toastData.message, 
        type: toastData.type as 'success' | 'error' | 'info' | 'warning' 
      }])

      // Auto-remove after duration
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== toastData.id))
      }, duration)
    }

    window.addEventListener('toast', handleToast as EventListener)
    return () => window.removeEventListener('toast', handleToast as EventListener)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('auth')
    localStorage.removeItem('user')
    setIsAuthenticated(false)
    setUser(null)
    toast.success('Logged out successfully')
    navigate('/login')
  }

  const sidebarItems = [
    { path: '/dashboard', name: 'Dashboard', icon: 'fa-tachometer-alt' },
    { path: '/students', name: 'View Students', icon: 'fa-users' },
    { path: '/take-attendance', name: 'Take Attendance', icon: 'fa-check-circle' },
    { path: '/check-attendance', name: 'Check Attendance', icon: 'fa-search' },
    { path: '/add-student', name: 'Add Student', icon: 'fa-user-plus' },
  ]

  // Show only navbar for login/register pages
  if (location.pathname === '/login' || location.pathname === '/register') {
    return (
      <>
        <Outlet />
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </>
    )
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated && location.pathname !== '/login' && location.pathname !== '/register') {
    navigate('/login')
    return null
  }

  return (
    <>
      <div className="min-h-screen">
        <Navbar user={user} onLogout={handleLogout} />
        
        <div className="max-w-[1600px] mx-auto px-5 py-8">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Sidebar - Hidden on mobile */}
            <aside className="hidden md:block w-64 flex-shrink-0">
              <Sidebar items={sidebarItems} />
            </aside>

            {/* Main Content */}
            <main className="flex-1 min-w-0">
              <Outlet />
            </main>
          </div>
        </div>
      </div>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  )
}

export default Layout