import { useState, useEffect } from 'react'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

const ROLES = { student: 'Alumno', teacher: 'Maestro', parent: 'Padre de familia', moderator: 'Moderador', superuser: 'Superusuario' }
const ROLE_COLORS = { student: 'bg-blue-50 text-blue-700', teacher: 'bg-green-50 text-green-700', parent: 'bg-purple-50 text-purple-700', moderator: 'bg-yellow-50 text-yellow-700', superuser: 'bg-red-50 text-accent' }

const EMPTY_USER_FORM = { username: '', full_name: '', email: '', password: '', role: 'student', grade: '' }

export default function Admin() {
  const { user } = useAuth()
  const [tab, setTab] = useState('users')
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState(null)
  const [query, setQuery] = useState('SELECT id, username, full_name, role, approved, created_at FROM users ORDER BY created_at DESC LIMIT 20;')
  const [sqlResult, setSqlResult] = useState(null)
  const [sqlError, setSqlError] = useState(null)
  const [sqlLoading, setSqlLoading] = useState(false)
  const [creatingUser, setCreatingUser] = useState(false)
  const [userForm, setUserForm] = useState(EMPTY_USER_FORM)
  const [savingUser, setSavingUser] = useState(false)
  const isSuperuser = user.role === 'superuser'

  useEffect(() => {
    api.get('/admin/users').then(r => setUsers(r.data))
    api.get('/admin/stats').then(r => setStats(r.data))
  }, [])

  const approve = async (id, approved) => {
    const { data } = await api.patch(`/admin/users/${id}/approve`, { approved })
    setUsers(us => us.map(u => u.id === id ? { ...u, approved: data.approved } : u))
    toast.success(approved ? 'Usuario aprobado' : 'Acceso revocado')
  }

  const changeRole = async (id, role) => {
    await api.patch(`/admin/users/${id}/role`, { role })
    setUsers(us => us.map(u => u.id === id ? { ...u, role } : u))
    toast.success('Rol actualizado')
  }

  const createUser = async (e) => {
    e.preventDefault()
    setSavingUser(true)
    try {
      const { data } = await api.post('/admin/users', userForm)
      setUsers(us => [data, ...us])
      setUserForm(EMPTY_USER_FORM)
      setCreatingUser(false)
      toast.success(`Usuario ${data.username} creado`)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al crear usuario')
    } finally {
      setSavingUser(false)
    }
  }

  const deleteUser = async (id) => {
    if (!confirm('¿Eliminar este usuario? Esta acción no se puede deshacer.')) return
    await api.delete(`/admin/users/${id}`)
    setUsers(us => us.filter(u => u.id !== id))
    toast.success('Usuario eliminado')
  }

  const runSQL = async (e) => {
    e.preventDefault()
    setSqlLoading(true)
    setSqlError(null)
    setSqlResult(null)
    try {
      const { data } = await api.post('/admin/sql', { query })
      setSqlResult(data)
    } catch (err) {
      setSqlError(err.response?.data?.error || 'Error al ejecutar query')
    } finally {
      setSqlLoading(false)
    }
  }

  const tabs = [
    { key: 'stats', label: 'Estadísticas' },
    { key: 'users', label: 'Usuarios' },
    { key: 'sql', label: 'Consola SQL' }
  ]

  const pending = users.filter(u => !u.approved)
  const approved = users.filter(u => u.approved)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Panel de administración</h1>
        <span className="badge bg-primary-50 text-primary-700">{ROLES[user.role]}</span>
      </div>

      <div className="flex gap-2 border-b border-gray-100 pb-0">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors -mb-px border-b-2 ${tab === t.key ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t.label}
            {t.key === 'users' && pending.length > 0 && (
              <span className="ml-1.5 w-5 h-5 bg-accent text-white text-xs rounded-full inline-flex items-center justify-center">{pending.length}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'stats' && stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            ['Usuarios totales', stats.total_users, 'text-primary'],
            ['Publicaciones', stats.total_posts, 'text-blue-500'],
            ['Grupos activos', stats.total_groups, 'text-green-500'],
            ['Eventos próximos', stats.upcoming_events, 'text-yellow-500']
          ].map(([label, val, color]) => (
            <div key={label} className="card p-5 text-center">
              <p className={`text-4xl font-bold ${color}`}>{val}</p>
              <p className="text-xs text-gray-400 mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'users' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button onClick={() => setCreatingUser(v => !v)} className="btn-primary text-sm">
              + Agregar usuario
            </button>
          </div>

          {creatingUser && (
            <div className="card p-6 border-l-4 border-primary">
              <h2 className="font-semibold mb-4">Nuevo usuario</h2>
              <form onSubmit={createUser} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Nombre completo *</label>
                  <input className="input" required value={userForm.full_name}
                    onChange={e => setUserForm(f => ({ ...f, full_name: e.target.value }))}
                    placeholder="Juan Pérez García" />
                </div>
                <div>
                  <label className="label">Usuario *</label>
                  <input className="input" required value={userForm.username}
                    onChange={e => setUserForm(f => ({ ...f, username: e.target.value }))}
                    placeholder="juanperez" pattern="[a-zA-Z0-9_]+" />
                </div>
                <div>
                  <label className="label">Correo electrónico *</label>
                  <input type="email" className="input" required value={userForm.email}
                    onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="correo@cecum.edu.mx" />
                </div>
                <div>
                  <label className="label">Contraseña temporal *</label>
                  <input type="password" className="input" required minLength={8} value={userForm.password}
                    onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="Mínimo 8 caracteres" />
                </div>
                <div>
                  <label className="label">Rol</label>
                  <select className="input" value={userForm.role}
                    onChange={e => setUserForm(f => ({ ...f, role: e.target.value }))}>
                    <option value="student">Alumno</option>
                    <option value="teacher">Maestro</option>
                    <option value="parent">Padre de familia</option>
                    <option value="moderator">Moderador</option>
                    {isSuperuser && <option value="superuser">Superusuario</option>}
                  </select>
                </div>
                <div>
                  <label className="label">Grado / Grupo</label>
                  <input className="input" value={userForm.grade}
                    onChange={e => setUserForm(f => ({ ...f, grade: e.target.value }))}
                    placeholder="Ej: 3° Secundaria B" />
                </div>
                <div className="sm:col-span-2 flex gap-2 justify-end">
                  <button type="button" onClick={() => { setCreatingUser(false); setUserForm(EMPTY_USER_FORM) }}
                    className="btn-secondary text-sm">Cancelar</button>
                  <button type="submit" className="btn-primary text-sm" disabled={savingUser}>
                    {savingUser ? 'Creando...' : 'Crear usuario'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {pending.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 mb-3">Pendientes de aprobación ({pending.length})</h2>
              <div className="space-y-2">
                {pending.map(u => (
                  <UserRow key={u.id} u={u} isSuperuser={isSuperuser} currentUserId={user.id} onApprove={approve} onChangeRole={changeRole} onDelete={deleteUser} />
                ))}
              </div>
            </div>
          )}
          <div>
            <h2 className="text-sm font-semibold text-gray-500 mb-3">Usuarios activos ({approved.length})</h2>
            <div className="space-y-2">
              {approved.map(u => (
                <UserRow key={u.id} u={u} isSuperuser={isSuperuser} currentUserId={user.id} onApprove={approve} onChangeRole={changeRole} onDelete={deleteUser} />
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'sql' && (
        <div className="space-y-4">
          <div className="card p-4 border-l-4 border-yellow-400 bg-yellow-50">
            <p className="text-sm text-yellow-800 font-medium">Consola SQL — Solo moderadores y superusuarios</p>
            <p className="text-xs text-yellow-700 mt-0.5">Las operaciones destructivas sobre usuarios y tablas del sistema están restringidas.</p>
          </div>

          <form onSubmit={runSQL} className="card p-4 space-y-3">
            <label className="label">Consulta SQL</label>
            <textarea
              className="input font-mono text-sm"
              rows={6}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="SELECT * FROM users LIMIT 10;"
              spellCheck={false}
            />
            <div className="flex items-center justify-between">
              <div className="flex gap-2 flex-wrap">
                {[
                  'SELECT * FROM users ORDER BY created_at DESC LIMIT 20;',
                  'SELECT * FROM posts ORDER BY created_at DESC LIMIT 20;',
                  'SELECT g.name, COUNT(gm.user_id) AS members FROM groups g LEFT JOIN group_members gm ON gm.group_id=g.id GROUP BY g.id;',
                  'SELECT u.full_name, COUNT(p.id) AS posts FROM users u LEFT JOIN posts p ON p.user_id=u.id GROUP BY u.id ORDER BY posts DESC;'
                ].map((q, i) => (
                  <button key={i} type="button" onClick={() => setQuery(q)}
                    className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded text-gray-600 font-mono truncate max-w-xs">
                    {['Usuarios', 'Publicaciones', 'Grupos/Miembros', 'Top publicadores'][i]}
                  </button>
                ))}
              </div>
              <button type="submit" className="btn-primary text-sm" disabled={sqlLoading || !query.trim()}>
                {sqlLoading ? 'Ejecutando...' : 'Ejecutar'}
              </button>
            </div>
          </form>

          {sqlError && (
            <div className="card p-4 border-l-4 border-accent bg-red-50">
              <p className="text-sm text-accent font-mono">{sqlError}</p>
            </div>
          )}

          {sqlResult && (
            <div className="card overflow-hidden">
              <div className="p-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <span className="text-xs text-gray-500 font-mono">{sqlResult.rowCount} fila(s) retornadas</span>
                <button onClick={() => {
                  const csv = [sqlResult.fields?.map(f => f.name).join(','), ...sqlResult.rows.map(r => Object.values(r).join(','))].join('\n')
                  const a = document.createElement('a'); a.href = 'data:text/csv,' + encodeURIComponent(csv); a.download = 'resultado.csv'; a.click()
                }} className="text-xs text-primary hover:underline">Exportar CSV</button>
              </div>
              {sqlResult.rows.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        {sqlResult.fields?.map(f => (
                          <th key={f.name} className="text-left p-2 text-gray-500 font-medium border-b border-gray-100">{f.name}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 font-mono">
                      {sqlResult.rows.map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          {Object.values(row).map((v, j) => (
                            <td key={j} className="p-2 text-gray-700 max-w-xs truncate">{v === null ? <span className="text-gray-300">null</span> : String(v)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {sqlResult.rows.length === 0 && (
                <p className="p-4 text-center text-sm text-gray-400">Sin resultados</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function UserRow({ u, isSuperuser, currentUserId, onApprove, onChangeRole, onDelete }) {
  const isOwnRow = u.id === currentUserId
  return (
    <div className={`card p-3 flex items-center gap-3 flex-wrap ${isOwnRow ? 'border-primary border-l-4' : ''}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-gray-900">{u.full_name}</p>
          <span className="text-xs text-gray-400">@{u.username}</span>
          <span className={`badge ${ROLE_COLORS[u.role] || 'bg-gray-100 text-gray-600'}`}>{ROLES[u.role] || u.role}</span>
          {!u.approved && <span className="badge bg-orange-50 text-orange-600">Pendiente</span>}
          {isOwnRow && <span className="badge bg-primary-50 text-primary-700 text-xs">Tú</span>}
        </div>
        <p className="text-xs text-gray-400">{u.email} {u.grade && `· ${u.grade}`}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {isSuperuser && !isOwnRow && (
          <select value={u.role} onChange={e => onChangeRole(u.id, e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-600 focus:outline-none focus:ring-1 focus:ring-primary">
            <option value="student">Alumno</option>
            <option value="teacher">Maestro</option>
            <option value="parent">Padre</option>
            <option value="moderator">Moderador</option>
            <option value="superuser">Superusuario</option>
          </select>
        )}
        <button onClick={() => onApprove(u.id, !u.approved)}
          className={`text-xs px-3 py-1.5 rounded-lg font-medium ${u.approved ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
          {u.approved ? 'Revocar' : 'Aprobar'}
        </button>
        {isSuperuser && !isOwnRow && (
          <button onClick={() => onDelete(u.id)} className="text-gray-300 hover:text-accent p-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        )}
      </div>
    </div>
  )
}
