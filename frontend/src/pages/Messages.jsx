import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import api, { getSocketUrl } from '../api'
import { useAuth } from '../context/AuthContext'
import { Avatar } from '../components/Layout'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

export default function Messages() {
  const { user } = useAuth()
  const { userId } = useParams()
  const navigate = useNavigate()
  const [conversations, setConversations] = useState([])
  const [messages, setMessages] = useState([])
  const [activeUser, setActiveUser] = useState(null)
  const [text, setText] = useState('')
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  // En móvil: 'list' | 'chat'
  const [mobileView, setMobileView] = useState('list')
  const bottomRef = useRef()
  const socketRef = useRef()

  useEffect(() => {
    socketRef.current = io(getSocketUrl())
    socketRef.current.emit('user:online', String(user.id))
    socketRef.current.on('message:receive', (msg) => {
      setMessages(m => [...m, msg])
    })
    return () => socketRef.current.disconnect()
  }, [user.id])

  useEffect(() => {
    api.get('/messages/conversations').then(r => setConversations(r.data))
  }, [])

  useEffect(() => {
    if (userId) {
      api.get(`/users/${userId}`).then(r => openConversation(r.data))
    }
  }, [userId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const openConversation = async (u) => {
    const uid = u.id ?? u.other_id
    const { data: msgs } = await api.get(`/messages/${uid}`)
    const profile = u.full_name ? u : (await api.get(`/users/${uid}`)).data
    setActiveUser({ ...profile, id: uid })
    setMessages(msgs)
    setSearch('')
    setSearchResults([])
    setMobileView('chat')
    navigate(`/messages/${uid}`, { replace: true })
  }

  const send = async (e) => {
    e.preventDefault()
    if (!text.trim() || !activeUser) return
    const { data } = await api.post(`/messages/${activeUser.id}`, { content: text })
    setMessages(m => [...m, data])
    socketRef.current.emit('message:send', { ...data, receiver_id: activeUser.id })
    setText('')
    setConversations(prev => {
      const exists = prev.find(c => c.other_id === activeUser.id)
      if (exists) return prev.map(c => c.other_id === activeUser.id ? { ...c, last_msg: text } : c)
      return [{ other_id: activeUser.id, full_name: activeUser.full_name, username: activeUser.username, avatar_url: activeUser.avatar_url, last_msg: text, unread_count: 0 }, ...prev]
    })
  }

  const doSearch = async (q) => {
    setSearch(q)
    if (!q.trim()) { setSearchResults([]); return }
    setSearching(true)
    const { data } = await api.get(`/users/search?q=${q}`)
    setSearchResults(data.filter(u => u.id !== user.id))
    setSearching(false)
  }

  const backToList = () => {
    setMobileView('list')
    setActiveUser(null)
    navigate('/messages', { replace: true })
  }

  return (
    <div className="max-w-4xl mx-auto card overflow-hidden flex" style={{ height: 'calc(100vh - 8rem)' }}>

      {/* Panel izquierdo — siempre visible en desktop, ocultado en móvil cuando hay chat abierto */}
      <div className={`
        flex-shrink-0 border-r border-gray-100 flex flex-col
        w-full md:w-72
        ${mobileView === 'chat' ? 'hidden md:flex' : 'flex'}
      `}>
        <div className="p-3 border-b border-gray-100 space-y-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1">Nuevo mensaje</p>
          <div className="relative">
            <svg className="w-4 h-4 absolute left-2.5 top-2.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              className="input pl-8 text-sm"
              placeholder="Buscar usuario..."
              value={search}
              onChange={e => doSearch(e.target.value)}
            />
          </div>
          {search.trim() && (
            <div className="bg-white border border-gray-100 rounded-lg overflow-hidden shadow-sm">
              {searching && <div className="p-3 text-center text-xs text-gray-400">Buscando...</div>}
              {!searching && searchResults.length === 0 && <div className="p-3 text-center text-xs text-gray-400">Sin resultados</div>}
              {searchResults.map(u => (
                <button key={u.id} onClick={() => openConversation(u)}
                  className="w-full flex items-center gap-2 p-2.5 hover:bg-primary-50 text-left transition-colors">
                  <Avatar user={u} size="sm" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{u.full_name}</p>
                    <p className="text-xs text-gray-400">@{u.username}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 pt-3 pb-1">Mensajes recientes</p>
          {conversations.length === 0 && (
            <p className="text-center text-xs text-gray-400 p-6">
              Usa el buscador para enviar tu primer mensaje
            </p>
          )}
          {conversations.map(c => (
            <button key={c.other_id} onClick={() => openConversation(c)}
              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left border-b border-gray-50 transition-colors ${activeUser?.id === parseInt(c.other_id) ? 'bg-primary-50 border-l-2 border-l-primary' : ''}`}>
              <div className="relative flex-shrink-0">
                <Avatar user={c} size="sm" />
                {c.unread_count > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-accent text-white text-xs rounded-full flex items-center justify-center">{c.unread_count}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm truncate ${c.unread_count > 0 ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>{c.full_name}</p>
                <p className="text-xs text-gray-400 truncate">{c.last_msg}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Panel derecho — chat */}
      <div className={`
        flex-1 flex flex-col min-w-0
        ${mobileView === 'list' ? 'hidden md:flex' : 'flex'}
      `}>
        {activeUser ? (
          <>
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3 bg-white">
              {/* Botón volver — solo móvil */}
              <button onClick={backToList} className="md:hidden p-1 -ml-1 text-gray-500 hover:text-primary">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <Avatar user={activeUser} size="sm" />
              <div>
                <p className="font-semibold text-sm text-gray-900">{activeUser.full_name}</p>
                <p className="text-xs text-gray-400">@{activeUser.username}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
              {messages.length === 0 && (
                <div className="text-center text-gray-400 text-sm py-8">
                  Inicia la conversación con {activeUser.full_name}
                </div>
              )}
              {messages.map((m, i) => {
                const mine = m.sender_id === user.id
                return (
                  <div key={i} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm shadow-sm ${mine ? 'bg-primary text-white rounded-br-sm' : 'bg-white text-gray-800 rounded-bl-sm'}`}>
                      {m.content}
                      <p className={`text-xs mt-1 ${mine ? 'text-primary-200' : 'text-gray-400'}`}>
                        {formatDistanceToNow(new Date(m.created_at), { locale: es, addSuffix: true })}
                      </p>
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>

            <form onSubmit={send} className="p-3 border-t border-gray-100 flex gap-2 bg-white">
              <input
                className="input flex-1 text-sm"
                placeholder={`Mensaje para ${activeUser.full_name}...`}
                value={text}
                onChange={e => setText(e.target.value)}
              />
              <button type="submit" className="btn-primary px-4" disabled={!text.trim()}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 hidden md:flex items-center justify-center bg-gray-50">
            <div className="text-center text-gray-300 space-y-3">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-sm">Selecciona una conversación o busca un compañero</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
