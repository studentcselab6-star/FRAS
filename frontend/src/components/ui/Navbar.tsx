import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

interface NavbarProps {
  user?: {
    username: string
    role?: string
  } | null
  onLogout?: () => void
}

export const Navbar: React.FC<NavbarProps> = ({ user, onLogout }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  const navigationItems = [
    { path: '/dashboard', name: 'Dashboard', icon: 'fa-tachometer-alt' },
    { path: '/students-section', name: 'Students', icon: 'fa-users' },
    { path: '/take-attendance', name: 'Take Attendance', icon: 'fa-check-circle' },
    { path: '/check-attendance', name: 'Check Attendance', icon: 'fa-search' },
    { path: '/add-student', name: 'Add Student', icon: 'fa-user-plus' },
  ]

  const handleLogout = () => {
    localStorage.removeItem('auth')
    localStorage.removeItem('user')
    onLogout?.()
    navigate('/login')
  }

  const handleNavigate = (path: string) => {
      setIsMenuOpen(false)
    }
  const getInitials = (username?: string) => {
    if (!username) return 'no username'
    return username.charAt(0).toUpperCase()
  }

  return (
    <nav className="bg-fras-navy-gradient backdrop-blur-xl border-b border-fras-gold shadow-2xl sticky top-0 z-40">
      <div className="max-w-[1600px] mx-auto px-5 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="text-2xl font-bold bg-fras-gold-gradient bg-clip-text text-transparent">
            <i className="fas fa-graduation-cap mr-2" />
            FRAS
          </div>

          {/* Mobile menu toggle */}
          <button
            className="md:hidden text-fras-gold text-2xl"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            ☰
          </button>

          {/* Desktop navigation */}
          <div className="hidden md:flex items-center gap-6">
            <div className="flex items-center gap-4">
              {navigationItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                    location.pathname === item.path
                      ? 'bg-fras-gold-gradient text-white -translate-y-0.5'
                      : 'text-white/80 hover:text-fras-gold hover:bg-white/10'
                  }`}
                >
                  <i className={`fas ${item.icon}`} />
                  <span className="text-sm">{item.name}</span>
                </Link>
              ))}
            </div>

            {/* User section */}
            <div className="flex items-center gap-3 pl-4 border-l border-fras-gold">
              <div className="bg-white/6 text-white px-4 py-2 rounded-lg font-medium">
                {getInitials(user?.username)}
              </div>
              <button
                onClick={() => navigate('/profile')}
                className="w-10 h-10 bg-white/6 text-fras-gold rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors"
                title="Profile"
              >
                <i className="fas fa-user" />
              </button>
              <button
                onClick={handleLogout}
                className="w-10 h-10 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg flex items-center justify-center hover:shadow-lg transition-all"
                title="Logout"
              >
                <i className="fas fa-sign-out-alt" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile navigation */}
        {isMenuOpen && (
          <div className="md:hidden mt-3 flex flex-col gap-2 overflow-hidden transition-all duration-300">
            {navigationItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => handleNavigate(item.path)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-300 ${
                  location.pathname === item.path
                    ? 'bg-fras-gold-gradient text-white'
                    : 'text-white bg-white/6 border-l-[3px] border-fras-gold'
                }`}
              >
                <i className={`fas ${item.icon}`} />
                {item.name}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  )
}
