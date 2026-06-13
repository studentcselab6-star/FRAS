import { useState, useCallback } from 'react'
import { Link, useLocation } from 'react-router-dom'

interface SidebarItem {
  path: string
  name: string
  icon: string
}

interface SidebarProps {
  items: SidebarItem[]
  onNavigate?: (path: string) => void
}

export const Sidebar: React.FC<SidebarProps> = ({ items, onNavigate }) => {
  const location = useLocation()

  return (
    <div className="bg-fras-navy backdrop-blur-xl p-6 border border-fras-gold rounded-lg shadow-2xl h-fit">
      <nav className="flex flex-col gap-3">
        {items.map((item) => {
          const isActive = location.pathname === item.path
          
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => onNavigate?.(item.path)}
              className={`flex items-center gap-3 px-5 py-4 rounded-lg font-medium transition-all duration-300 w-full text-left ${
                isActive
                  ? 'bg-fras-gold-gradient text-white'
                  : 'bg-white/6 text-white border-l-[3px] border-fras-gold hover:text-fras-gold hover:translate-x-1'
              }`}
            >
              <i className={`fas ${item.icon}`} />
              {item.name}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}