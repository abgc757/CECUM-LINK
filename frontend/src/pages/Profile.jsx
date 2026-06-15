import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import { Avatar } from '../components/Layout'
import PostCard from '../components/PostCard'
import toast from 'react-hot-toast'

const API = import.meta.env.VITE_API_URL || ''
const ROLES = { student: 'Alumno', teacher: 'Maestro', parent: 'Padre de familia', moderator: 'Moderador', superuser: 'Superusuario' }

export default function Profile() {
  const { id } = useParams()
  const { user, setUser } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [posts, setPosts] = useState([])
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ full_name: '', bio: '' })
  const [saving, setSaving] = useState(false)
  const fileRef = useRef()
  const isMe = parseInt(id) === user.id

  useEffect(() => {
    api.get(`/users/${id}`).then(r => { setProfile(r.data); setForm({ full_name: r.data.full_name, bio: r.data.bio || '' }) })
    api.get(`/posts?user_id=${id}`).catch(() => {})
  }, [id])

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    const fd = new FormData()
    fd.append('full_name', form.full_name)
    fd.append('bio', form.bio)
    try {
      const { data } = await api.patch('/users/me', fd)
      setProfile(p => ({ ...p, ...data }))
      setUser(u => ({ ...u, ...data }))
      setEditing(false)
      toast.success('Perfil actualizado')
    } catch { toast.error('Error al guardar') }
    finally { setSaving(false) }
  }

  const uploadAvatar = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const fd = new FormData()
    fd.append('avatar', file)
    const { data } = await api.patch('/users/me', fd)
    setProfile(p => ({ ...p, avatar_url: data.avatar_url }))
    setUser(u => ({ ...u, avatar_url: data.avatar_url }))
    toast.success('Foto actualizada')
  }

  if (!profile) return <div className="text-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" /></div>

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="card p-6">
        <div className="flex items-start gap-4">
          <div className="relative flex-shrink-0">
            <Avatar user={profile} size="lg" />
            {isMe && (
              <>
                <button onClick={() => fileRef.current.click()}
                  className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary text-white rounded-full text-xs flex items-center justify-center hover:bg-primary-600">
                  +
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={uploadAvatar} />
              </>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h1 className="text-xl font-bold text-gray-900">{profile.full_name}</h1>
                <p className="text-sm text-gray-400">@{profile.username}</p>
              </div>
              {isMe && !editing && (
                <button onClick={() => setEditing(true)} className="btn-secondary text-sm">Editar</button>
              )}
              {!isMe && (
                <button onClick={() => navigate(`/messages/${profile.id}`)} className="btn-primary text-sm">Mensaje</button>
              )}
            </div>
            <div className="flex gap-2 mt-2">
              <span className="badge bg-primary-50 text-primary-700">{ROLES[profile.role] || profile.role}</span>
              {profile.grade && <span className="badge bg-gray-100 text-gray-600">{profile.grade}</span>}
            </div>
            {!editing && profile.bio && <p className="text-sm text-gray-600 mt-3">{profile.bio}</p>}
          </div>
        </div>

        {editing && (
          <form onSubmit={save} className="mt-4 space-y-3 border-t border-gray-100 pt-4">
            <div>
              <label className="label">Nombre completo</label>
              <input className="input" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div>
              <label className="label">Biografía</label>
              <textarea className="input" rows={3} placeholder="Cuéntanos algo sobre ti..." value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} />
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setEditing(false)} className="btn-secondary text-sm">Cancelar</button>
              <button type="submit" className="btn-primary text-sm" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </form>
        )}
      </div>

      <div className="text-sm font-medium text-gray-400 px-1">Publicaciones</div>
      {posts.length === 0 && (
        <div className="card p-8 text-center text-gray-400 text-sm">Sin publicaciones aún</div>
      )}
      {posts.map(p => <PostCard key={p.id} post={p} onDelete={pid => setPosts(ps => ps.filter(x => x.id !== pid))} />)}
    </div>
  )
}
