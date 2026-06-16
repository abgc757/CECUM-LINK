import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { Avatar } from '../components/Layout'
import PostCard from '../components/PostCard'
import toast from 'react-hot-toast'

export default function Profile() {
  const { id } = useParams()
  const { user, setUser } = useAuth()
  const { t, lang, changeLang } = useLanguage()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [posts, setPosts] = useState([])
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ full_name: '', bio: '' })
  const [saving, setSaving] = useState(false)
  const fileRef = useRef()
  const isMe = parseInt(id) === user.id

  const ROLES = {
    student: t('role.student'),
    teacher: t('role.teacher'),
    parent: t('role.parent'),
    moderator: t('role.moderator'),
    superuser: t('role.superuser'),
  }

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
      toast.success(t('profile.updated'))
    } catch { toast.error(t('profile.updateError')) }
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
    toast.success(t('profile.photoUpdated'))
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
                <button onClick={() => setEditing(true)} className="btn-secondary text-sm">{t('profile.edit')}</button>
              )}
              {!isMe && (
                <button onClick={() => navigate(`/messages/${profile.id}`)} className="btn-primary text-sm">{t('profile.message')}</button>
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
              <label className="label">{t('auth.fullName')}</label>
              <input className="input" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div>
              <label className="label">{t('profile.bio')}</label>
              <textarea className="input" rows={3} placeholder={t('profile.bioPlaceholder')} value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} />
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setEditing(false)} className="btn-secondary text-sm">{t('profile.cancel')}</button>
              <button type="submit" className="btn-primary text-sm" disabled={saving}>{saving ? t('profile.saving') : t('profile.save')}</button>
            </div>
          </form>
        )}

        {/* Selector de idioma — visible solo en el propio perfil */}
        {isMe && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
            <span className="text-sm text-gray-500">{t('profile.language')}</span>
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => changeLang('es')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${lang === 'es' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {t('profile.langEs')}
              </button>
              <button
                onClick={() => changeLang('en')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${lang === 'en' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {t('profile.langEn')}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="text-sm font-medium text-gray-400 px-1">{t('profile.posts')}</div>
      {posts.length === 0 && (
        <div className="card p-8 text-center text-gray-400 text-sm">{t('profile.noPosts')}</div>
      )}
      {posts.map(p => <PostCard key={p.id} post={p} onDelete={pid => setPosts(ps => ps.filter(x => x.id !== pid))} />)}
    </div>
  )
}
