import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api'
import { useLanguage } from '../context/LanguageContext'
import toast from 'react-hot-toast'

export default function Register() {
  const [form, setForm] = useState({ username: '', full_name: '', email: '', password: '', grade: '' })
  const [loading, setLoading] = useState(false)
  const { t } = useLanguage()
  const navigate = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/auth/register', form)
      toast.success(t('auth.registerSuccess'))
      navigate('/login')
    } catch (err) {
      toast.error(err.response?.data?.error || t('auth.registerError'))
    } finally {
      setLoading(false)
    }
  }

  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-3 shadow-lg">
            <span className="text-white font-black text-2xl">C</span>
          </div>
          <h1 className="text-2xl font-bold text-primary">{t('auth.createAccount')}</h1>
          <p className="text-gray-500 text-sm mt-1">CECUM Link — {t('auth.schoolCommunity')}</p>
        </div>

        <div className="card p-8">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label">{t('auth.fullName')}</label>
              <input className="input" required value={form.full_name} onChange={f('full_name')} placeholder="Juan Pérez García" />
            </div>
            <div>
              <label className="label">{t('auth.username')}</label>
              <input className="input" required value={form.username} onChange={f('username')} placeholder="juanperez" pattern="[a-zA-Z0-9_]+" title={t('auth.usernameHint')} />
            </div>
            <div>
              <label className="label">{t('auth.email')}</label>
              <input type="email" className="input" required value={form.email} onChange={f('email')} placeholder="correo@ejemplo.com" />
            </div>
            <div>
              <label className="label">{t('auth.grade')}</label>
              <input className="input" value={form.grade} onChange={f('grade')} placeholder="Ej: 3° Secundaria B" />
            </div>
            <div>
              <label className="label">{t('auth.password')}</label>
              <input type="password" className="input" required value={form.password} onChange={f('password')} placeholder={t('auth.minPassword')} minLength={8} />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? t('auth.registering') : t('auth.registerBtn')}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-4">
            {t('auth.hasAccount')}{' '}
            <Link to="/login" className="text-primary font-medium hover:underline">{t('auth.loginLink')}</Link>
          </p>
        </div>
        <p className="text-center text-xs text-gray-400 mt-4">
          {t('auth.pendingApproval')}
        </p>
      </div>
    </div>
  )
}
