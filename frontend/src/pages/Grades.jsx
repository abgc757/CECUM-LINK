import { useState, useEffect } from 'react'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function Grades() {
  const { user } = useAuth()
  const [grades, setGrades] = useState([])
  const [students, setStudents] = useState([])
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ student_id: '', subject: '', grade_value: '', period: '', notes: '' })
  const [searchQ, setSearchQ] = useState('')
  const isTeacher = ['teacher','moderator','superuser'].includes(user.role)

  useEffect(() => {
    if (isTeacher) {
      api.get('/admin/users').then(r => setStudents(r.data.filter(u => u.role === 'student')))
    } else {
      api.get('/grades/my').then(r => setGrades(r.data))
    }
  }, [isTeacher])

  const loadStudentGrades = async (id) => {
    const { data } = await api.get(`/grades/student/${id}`)
    setGrades(data)
  }

  const submit = async (e) => {
    e.preventDefault()
    const { data } = await api.post('/grades', form)
    setGrades(g => [data, ...g])
    setForm({ student_id: '', subject: '', grade_value: '', period: '', notes: '' })
    setCreating(false)
    toast.success('Calificación registrada')
  }

  const filteredStudents = students.filter(s =>
    s.full_name.toLowerCase().includes(searchQ.toLowerCase()) ||
    s.username.toLowerCase().includes(searchQ.toLowerCase())
  )

  const avg = grades.length ? (grades.reduce((a, g) => a + parseFloat(g.grade_value), 0) / grades.length).toFixed(1) : null

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Calificaciones</h1>
        {isTeacher && <button onClick={() => setCreating(v => !v)} className="btn-primary text-sm">+ Registrar calificación</button>}
      </div>

      {isTeacher && (
        <div className="card p-4">
          <label className="label">Consultar alumno</label>
          <input className="input mb-2" placeholder="Buscar alumno..." value={searchQ} onChange={e => setSearchQ(e.target.value)} />
          <div className="max-h-48 overflow-y-auto space-y-1">
            {filteredStudents.slice(0, 10).map(s => (
              <button key={s.id} onClick={() => { loadStudentGrades(s.id); setForm(f => ({ ...f, student_id: s.id })) }}
                className={`w-full text-left p-2 rounded-lg hover:bg-gray-50 text-sm flex justify-between ${form.student_id == s.id ? 'bg-primary-50 text-primary' : ''}`}>
                <span>{s.full_name}</span>
                <span className="text-gray-400">@{s.username}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {creating && isTeacher && (
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold">Nueva calificación</h2>
          <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Materia *</label>
              <input className="input" required value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Matemáticas" />
            </div>
            <div>
              <label className="label">Calificación * (0-10)</label>
              <input type="number" className="input" required min="0" max="10" step="0.1" value={form.grade_value} onChange={e => setForm(f => ({ ...f, grade_value: e.target.value }))} />
            </div>
            <div>
              <label className="label">Periodo</label>
              <input className="input" value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value }))} placeholder="1er Bimestre" />
            </div>
            <div>
              <label className="label">Observaciones</label>
              <input className="input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="sm:col-span-2 flex gap-2 justify-end">
              <button type="button" onClick={() => setCreating(false)} className="btn-secondary text-sm">Cancelar</button>
              <button type="submit" className="btn-primary text-sm" disabled={!form.student_id}>Registrar</button>
            </div>
          </form>
        </div>
      )}

      {grades.length > 0 && avg && (
        <div className="grid grid-cols-3 gap-3">
          <div className="card p-4 text-center">
            <p className="text-3xl font-bold text-primary">{avg}</p>
            <p className="text-xs text-gray-400 mt-1">Promedio general</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-3xl font-bold text-green-500">{Math.max(...grades.map(g => g.grade_value))}</p>
            <p className="text-xs text-gray-400 mt-1">Calificación más alta</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-3xl font-bold text-gray-400">{grades.length}</p>
            <p className="text-xs text-gray-400 mt-1">Total registradas</p>
          </div>
        </div>
      )}

      {grades.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
          <p>{isTeacher ? 'Selecciona un alumno para ver sus calificaciones' : 'Sin calificaciones registradas aún'}</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3 text-gray-500 font-medium">Materia</th>
                <th className="text-left p-3 text-gray-500 font-medium">Periodo</th>
                <th className="text-center p-3 text-gray-500 font-medium">Calificación</th>
                <th className="text-left p-3 text-gray-500 font-medium hidden sm:table-cell">Observaciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {grades.map(g => (
                <tr key={g.id} className="hover:bg-gray-50">
                  <td className="p-3 font-medium">{g.subject}</td>
                  <td className="p-3 text-gray-500">{g.period || '—'}</td>
                  <td className="p-3 text-center">
                    <span className={`badge ${parseFloat(g.grade_value) >= 7 ? 'bg-green-50 text-green-700' : parseFloat(g.grade_value) >= 6 ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-accent'}`}>
                      {parseFloat(g.grade_value).toFixed(1)}
                    </span>
                  </td>
                  <td className="p-3 text-gray-400 text-xs hidden sm:table-cell">{g.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
