import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import { useLanguage } from '../context/LanguageContext'
import toast from 'react-hot-toast'

export default function Groups() {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', subject: '', grade: '' })
  const { t } = useLanguage()
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/groups').then(r => { setGroups(r.data); setLoading(false) })
  }, [])

  const join = async (id, isMember) => {
    if (isMember) {
      await api.delete(`/groups/${id}/leave`)
      setGroups(gs => gs.map(g => g.id === id ? { ...g, is_member: false, members_count: g.members_count - 1 } : g))
    } else {
      await api.post(`/groups/${id}/join`)
      setGroups(gs => gs.map(g => g.id === id ? { ...g, is_member: true, members_count: +g.members_count + 1 } : g))
      toast.success(t('groups.joined'))
    }
  }

  const create = async (e) => {
    e.preventDefault()
    const { data } = await api.post('/groups', form)
    setGroups(gs => [{ ...data, members_count: 1, is_member: true }, ...gs])
    setForm({ name: '', description: '', subject: '', grade: '' })
    setCreating(false)
    toast.success(t('groups.created'))
  }

  if (loading) return <div className="text-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('groups.title')}</h1>
        <button onClick={() => setCreating(v => !v)} className="btn-primary text-sm">{t('groups.create')}</button>
      </div>

      {creating && (
        <div className="card p-6">
          <h2 className="font-semibold mb-4">{t('groups.new')}</h2>
          <form onSubmit={create} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">{t('groups.name')}</label>
              <input className="input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder={t('groups.namePlaceholder')} />
            </div>
            <div>
              <label className="label">{t('groups.subject')}</label>
              <input className="input" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder={t('groups.subjectPlaceholder')} />
            </div>
            <div>
              <label className="label">{t('common.grade')}</label>
              <input className="input" value={form.grade} onChange={e => setForm(f => ({ ...f, grade: e.target.value }))} placeholder={t('groups.gradePlaceholder')} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">{t('groups.description')}</label>
              <textarea className="input" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="sm:col-span-2 flex gap-2 justify-end">
              <button type="button" onClick={() => setCreating(false)} className="btn-secondary text-sm">{t('groups.cancel')}</button>
              <button type="submit" className="btn-primary text-sm">{t('groups.createBtn')}</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map(g => (
          <div key={g.id} className="card p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
            <div>
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-gray-900">{g.name}</h3>
                {g.subject && <span className="badge bg-primary-50 text-primary-700 flex-shrink-0">{g.subject}</span>}
              </div>
              {g.grade && <p className="text-xs text-gray-400 mt-0.5">{g.grade}</p>}
              {g.description && <p className="text-sm text-gray-500 mt-2 line-clamp-2">{g.description}</p>}
            </div>
            <div className="flex items-center justify-between mt-auto">
              <span className="text-xs text-gray-400">{g.members_count} {t('groups.members')}</span>
              <div className="flex gap-2">
                {g.is_member && (
                  <button onClick={() => navigate(`/groups/${g.id}`)} className="btn-secondary text-xs px-3 py-1.5">{t('groups.view')}</button>
                )}
                <button onClick={() => join(g.id, g.is_member)} className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${g.is_member ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'btn-primary'}`}>
                  {g.is_member ? t('groups.leave') : t('groups.join')}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
