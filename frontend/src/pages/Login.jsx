import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(form.email, form.password)
      navigate('/')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary rounded-2xl mb-4 shadow-lg">
            <span className="text-white font-black text-3xl">C</span>
          </div>
          <h1 className="text-3xl font-bold text-primary">CECUM Link</h1>
          <p className="text-gray-500 mt-1 text-sm">Centro Educativo y Cultural Morelos</p>
        </div>

        <div className="card p-8">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Iniciar sesión</h2>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label">Correo electrónico</label>
              <input type="email" className="input" required
                value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="tu@correo.com" />
            </div>
            <div>
              <label className="label">Contraseña</label>
              <input type="password" className="input" required
                value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="••••••••" />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-4">
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="text-primary font-medium hover:underline">Regístrate</Link>
          </p>
        </div>

        <div className="mt-4 p-3 bg-primary-50 rounded-lg border border-primary-100 text-xs text-primary-700 text-center">
          <strong>Primer acceso:</strong> admin@cecum.edu.mx / Admin123!
        </div>
      </div>
    </div>
  )
}
