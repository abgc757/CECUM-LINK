import { useState, useEffect } from 'react'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function Events() {
  const { user } = useAuth()
  const [events, setEvents] = useState([])
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', event_date: '', location: '' })

  useEffect(() => { api.get('/events').then(r => setEvents(r.data)) }, [])

  const submit = async (e) => {
    e.preventDefault()
    const { data } = await api.post('/events', form)
    setEvents(ev => [...ev, { ...data, creator_name: user.full_name }].sort((a, b) => new Date(a.event_date) - new Date(b.event_date)))
    setForm({ title: '', description: '', event_date: '', location: '' })
    setCreating(false)
    toast.success('Evento creado')
  }

  const del = async (id) => {
    if (!confirm('¿Eliminar evento?')) return
    await api.delete(`/events/${id}`)
    setEvents(ev => ev.filter(e => e.id !== id))
    toast.success('Evento eliminado')
  }

  const canCreate = ['teacher','moderator','superuser'].includes(user.role)

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Eventos</h1>
        {canCreate && <button onClick={() => setCreating(v => !v)} className="btn-primary text-sm">+ Nuevo evento</button>}
      </div>

      {creating && (
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold">Nuevo evento</h2>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="label">Título *</label>
              <input className="input" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Fecha y hora *</label>
                <input type="datetime-local" className="input" required value={form.event_date} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))} />
              </div>
              <div>
                <label className="label">Lugar</label>
                <input className="input" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Ej: Auditorio principal" />
              </div>
            </div>
            <div>
              <label className="label">Descripción</label>
              <textarea className="input" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setCreating(false)} className="btn-secondary text-sm">Cancelar</button>
              <button type="submit" className="btn-primary text-sm">Crear evento</button>
            </div>
          </form>
        </div>
      )}

      {events.length === 0 && (
        <div className="card p-12 text-center text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          <p>No hay eventos próximos</p>
        </div>
      )}

      <div className="space-y-3">
        {events.map(ev => {
          const d = new Date(ev.event_date)
          const isPast = d < new Date()
          const canDel = ev.created_by === user.id || ['moderator','superuser'].includes(user.role)
          return (
            <div key={ev.id} className={`card p-4 flex gap-4 ${isPast ? 'opacity-60' : ''}`}>
              <div className="flex-shrink-0 w-14 h-14 bg-primary-50 rounded-xl flex flex-col items-center justify-center">
                <span className="text-primary font-bold text-lg leading-none">{d.getDate()}</span>
                <span className="text-primary-400 text-xs">{d.toLocaleDateString('es-MX', { month: 'short' })}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-gray-900">{ev.title}</h3>
                  {canDel && <button onClick={() => del(ev.id)} className="text-gray-300 hover:text-accent flex-shrink-0"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>}
                </div>
                {ev.description && <p className="text-sm text-gray-500 mt-0.5">{ev.description}</p>}
                <div className="flex gap-3 mt-1 text-xs text-gray-400">
                  <span>{d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</span>
                  {ev.location && <span>📍 {ev.location}</span>}
                  <span>Por {ev.creator_name}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
