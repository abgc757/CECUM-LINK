import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useEffect, useState, useRef } from 'react'
import { io } from 'socket.io-client'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import api from '../api'
import toast from 'react-hot-toast'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || ''

const NOTIF_ICONS = {
  like: '❤️',
  comment: '💬',
  message: '✉️',
  task: '📋',
  default: '🔔'
}

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [notifOpen, setNotifOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const notifRef = useRef()

  const unreadCount = notifications.filter(n => !n.read).length

  useEffect(() => {
    api.get('/notifications').then(r => setNotifications(r.data)).catch(() => {})

    const socket = io(SOCKET_URL, { auth: { token: localStorage.getItem('token') } })
    socket.emit('user:online', String(user.id))
    socket.on('notification:new', (n) => {
      setNotifications(prev => [{ ...n, created_at: n.created_at || new Date().toISOString() }, ...prev])
      toast(n.content, { icon: NOTIF_ICONS[n.type] || '🔔' })
    })
    return () => socket.disconnect()
  }, [user.id])

  useEffect(() => {
    if (!notifOpen) return
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('click', handler, true)
    return () => document.removeEventListener('click', handler, true)
  }, [notifOpen])

  const openNotif = (e) => {
    e.stopPropagation()
    setNotifOpen(v => {
      if (!v && unreadCount > 0) {
        api.patch('/notifications/read').catch(() => {})
        setNotifications(ns => ns.map(n => ({ ...n, read: true })))
      }
      return !v
    })
  }

  const handleLogout = () => { logout(); navigate('/login') }

  const navClass = ({ isActive }) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive ? 'bg-primary text-white' : 'text-gray-600 hover:bg-primary-50 hover:text-primary'
    }`

  const isAdmin = ['moderator', 'superuser'].includes(user.role)

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">C</span>
            </div>
            <span className="font-bold text-primary text-lg hidden sm:block">CECUM Link</span>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            <NavLink to="/" end className={navClass}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
              Inicio
            </NavLink>
            <NavLink to="/groups" className={navClass}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              Grupos
            </NavLink>
            <NavLink to="/events" className={navClass}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              Eventos
            </NavLink>
            <NavLink to="/gallery" className={navClass}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              Galería
            </NavLink>
            <NavLink to="/messages" className={navClass}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              Mensajes
            </NavLink>
            <NavLink to="/grades" className={navClass}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              Calificaciones
            </NavLink>
            {isAdmin && (
              <NavLink to="/admin" className={navClass}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                Admin
              </NavLink>
            )}
          </nav>

          <div className="flex items-center gap-1">
            {/* Campana de notificaciones */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={openNotif}
                className="relative p-2 text-gray-500 hover:text-primary rounded-lg hover:bg-gray-100 transition-colors"
                title="Notificaciones"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-accent text-white text-xs rounded-full flex items-center justify-center font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <span className="font-semibold text-sm text-gray-800">Notificaciones</span>
                    {notifications.length > 0 && (
                      <button
                        onClick={async () => {
                          await api.patch('/notifications/read').catch(() => {})
                          setNotifications(ns => ns.map(n => ({ ...n, read: true })))
                        }}
                        className="text-xs text-primary hover:underline"
                      >
                        Marcar todas como leídas
                      </button>
                    )}
                  </div>

                  <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
                    {notifications.length === 0 ? (
                      <div className="py-10 text-center text-gray-400">
                        <svg className="w-10 h-10 mx-auto mb-2 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                        <p className="text-sm">Sin notificaciones</p>
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div
                          key={n.id}
                          onClick={() => {
                            setNotifOpen(false)
                            if (n.reference_type === 'post') navigate('/')
                            else if (n.reference_type === 'message') navigate('/messages')
                          }}
                          className={`flex gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${!n.read ? 'bg-primary-50' : ''}`}
                        >
                          <span className="text-xl flex-shrink-0 mt-0.5">
                            {NOTIF_ICONS[n.type] || NOTIF_ICONS.default}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm leading-snug ${!n.read ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                              {n.content}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {n.created_at ? formatDistanceToNow(new Date(n.created_at), { locale: es, addSuffix: true }) : 'ahora'}
                            </p>
                          </div>
                          {!n.read && (
                            <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <button onClick={() => navigate(`/profile/${user.id}`)} className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-100">
              <Avatar user={user} size="sm" />
              <span className="text-sm font-medium hidden sm:block">{user.full_name.split(' ')[0]}</span>
            </button>
            <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-accent transition-colors" title="Cerrar sesión">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
            <button className="md:hidden p-2" onClick={() => setMenuOpen(o => !o)}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-4 py-2 flex flex-col gap-1">
            {[['/', 'Inicio'], ['/groups', 'Grupos'], ['/events', 'Eventos'], ['/gallery', 'Galería'], ['/messages', 'Mensajes'], ['/grades', 'Calificaciones'], ...(isAdmin ? [['/admin', 'Admin']] : [])].map(([to, label]) => (
              <NavLink key={to} to={to} end={to==='/'} className={navClass} onClick={() => setMenuOpen(false)}>{label}</NavLink>
            ))}
          </div>
        )}
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        <Outlet />
      </main>

      <footer className="bg-white border-t border-gray-100 py-3 text-center text-xs text-gray-400">
        CECUM Link &copy; {new Date().getFullYear()} — Centro Educativo y Cultural Morelos
      </footer>
    </div>
  )
}

export function Avatar({ user, size = 'md' }) {
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-16 h-16 text-xl' }
  const API = import.meta.env.VITE_API_URL || ''
  if (user?.avatar_url) {
    return <img src={`${API}${user.avatar_url}`} alt={user.full_name} className={`${sizes[size]} rounded-full object-cover`} />
  }
  const initials = user?.full_name?.split(' ').map(w => w[0]).slice(0,2).join('') || '?'
  return (
    <div className={`${sizes[size]} rounded-full bg-primary flex items-center justify-center text-white font-bold flex-shrink-0`}>
      {initials}
    </div>
  )
}
