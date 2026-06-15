import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api'
import toast from 'react-hot-toast'

export default function Register() {
  const [form, setForm] = useState({ username: '', full_name: '', email: '', password: '', grade: '' })
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/auth/register', form)
      toast.success('¡Registro exitoso! Espera la aprobación del administrador.')
      navigate('/login')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al registrarse')
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
          <h1 className="text-2xl font-bold text-primary">Crear cuenta</h1>
          <p className="text-gray-500 text-sm mt-1">CECUM Link — Comunidad escolar</p>
        </div>

        <div className="card p-8">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label">Nombre completo</label>
              <input className="input" required value={form.full_name} onChange={f('full_name')} placeholder="Juan Pérez García" />
            </div>
            <div>
              <label className="label">Usuario</label>
              <input className="input" required value={form.username} onChange={f('username')} placeholder="juanperez" pattern="[a-zA-Z0-9_]+" title="Solo letras, números y guión bajo" />
            </div>
            <div>
              <label className="label">Correo electrónico</label>
              <input type="email" className="input" required value={form.email} onChange={f('email')} placeholder="correo@ejemplo.com" />
            </div>
            <div>
              <label className="label">Grado / Grupo (opcional)</label>
              <input className="input" value={form.grade} onChange={f('grade')} placeholder="Ej: 3° Secundaria B" />
            </div>
            <div>
              <label className="label">Contraseña</label>
              <input type="password" className="input" required value={form.password} onChange={f('password')} placeholder="Mínimo 8 caracteres" minLength={8} />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Registrando...' : 'Crear cuenta'}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-4">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-primary font-medium hover:underline">Inicia sesión</Link>
          </p>
        </div>
        <p className="text-center text-xs text-gray-400 mt-4">
          Tu cuenta será revisada y aprobada por un administrador.
        </p>
      </div>
    </div>
  )
}
