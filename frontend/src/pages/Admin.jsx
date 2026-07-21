import { useState, useEffect } from 'react'
import api, { getApiBase } from '../api'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { formatDistanceToNow } from 'date-fns'
import { es, enUS } from 'date-fns/locale'
import toast from 'react-hot-toast'

const ROLES = { student: 'Alumno', teacher: 'Maestro', parent: 'Padre de familia', moderator: 'Moderador', superuser: 'Superusuario' }
const ROLE_COLORS = { student: 'bg-blue-50 text-blue-700', teacher: 'bg-green-50 text-green-700', parent: 'bg-purple-50 text-purple-700', moderator: 'bg-yellow-50 text-yellow-700', superuser: 'bg-red-50 text-accent' }

// Roles que cada tipo de usuario puede aprobar
const APPROVABLE = {
  moderator: ['student', 'parent'],
  teacher:   ['student', 'parent'],
  superuser: ['student', 'teacher', 'parent', 'moderator', 'superuser'],
}

const EMPTY_USER_FORM = { username: '', full_name: '', email: '', password: '', role: 'student', grade: '' }
const EMPTY_PWD_MODAL = { open: false, userId: null, username: '', password: '', confirm: '', saving: false }

function mediaSrc(url) {
  if (!url) return null
  if (url.startsWith('http')) return url
  return `${getApiBase()}${url}`
}

export default function Admin() {
  const { user } = useAuth()
  const { t, lang } = useLanguage()
  const [tab, setTab] = useState('users')
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState(null)
  const [archivedPosts, setArchivedPosts] = useState([])
  const [loadingArchived, setLoadingArchived] = useState(false)
  const [query, setQuery] = useState('SELECT id, username, full_name, role, approved, created_at FROM users ORDER BY created_at DESC LIMIT 20;')
  const [sqlResult, setSqlResult] = useState(null)
  const [sqlError, setSqlError] = useState(null)
  const [sqlLoading, setSqlLoading] = useState(false)
  const [creatingUser, setCreatingUser] = useState(false)
  const [userForm, setUserForm] = useState(EMPTY_USER_FORM)
  const [savingUser, setSavingUser] = useState(false)
  const [pwdModal, setPwdModal] = useState(EMPTY_PWD_MODAL)

  const isSuperuser = user.role === 'superuser'
  const dateLocale = lang === 'en' ? enUS : es

  useEffect(() => {
    api.get('/admin/users').then(r => setUsers(r.data))
    api.get('/admin/stats').then(r => setStats(r.data))
  }, [])

  useEffect(() => {
    if (tab === 'archived' && archivedPosts.length === 0) {
      setLoadingArchived(true)
      api.get('/admin/posts/archived')
        .then(r => setArchivedPosts(r.data))
        .finally(() => setLoadingArchived(false))
    }
  }, [tab])

  const approve = async (id, approved, targetRole) => {
    const allowed = APPROVABLE[user.role] || []
    if (!allowed.includes(targetRole)) {
      toast.error(t('admin.users.noPermission'))
      return
    }
    try {
      const { data } = await api.patch(`/admin/users/${id}/approve`, { approved })
      setUsers(us => us.map(u => u.id === id ? { ...u, approved: data.approved } : u))
      toast.success(approved ? t('admin.users.approved') : t('admin.users.revoked'))
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error')
    }
  }

  const changeRole = async (id, role) => {
    await api.patch(`/admin/users/${id}/role`, { role })
    setUsers(us => us.map(u => u.id === id ? { ...u, role } : u))
    toast.success(t('admin.users.roleUpdated'))
  }

  const createUser = async (e) => {
    e.preventDefault()
    setSavingUser(true)
    try {
      const { data } = await api.post('/admin/users', userForm)
      setUsers(us => [data, ...us])
      setUserForm(EMPTY_USER_FORM)
      setCreatingUser(false)
      toast.success(`${t('admin.users.created').replace('creado', data.username + ' creado').replace('created', data.username + ' created')}`)
    } catch (err) {
      toast.error(err.response?.data?.error || t('admin.users.createError'))
    } finally {
      setSavingUser(false)
    }
  }

  const openPwdModal = (u) => setPwdModal({ open: true, userId: u.id, username: u.username, password: '', confirm: '', saving: false })

  const changePassword = async (e) => {
    e.preventDefault()
    if (pwdModal.password !== pwdModal.confirm) {
      toast.error('Las contraseñas no coinciden')
      return
    }
    setPwdModal(m => ({ ...m, saving: true }))
    try {
      await api.patch(`/admin/users/${pwdModal.userId}/password`, { password: pwdModal.password })
      toast.success(`Contraseña de @${pwdModal.username} actualizada`)
      setPwdModal(EMPTY_PWD_MODAL)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al cambiar contraseña')
      setPwdModal(m => ({ ...m, saving: false }))
    }
  }

  const deleteUser = async (id) => {
    if (!confirm(t('admin.users.confirmDelete'))) return
    await api.delete(`/admin/users/${id}`)
    setUsers(us => us.filter(u => u.id !== id))
    toast.success(t('admin.users.deleted'))
  }

  const unarchivePost = async (id) => {
    await api.patch(`/posts/${id}/archive`, { archived: false })
    setArchivedPosts(ps => ps.filter(p => p.id !== id))
    toast.success(t('post.unarchived'))
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
    { key: 'stats', label: t('admin.tabs.stats') },
    { key: 'users', label: t('admin.tabs.users') },
    { key: 'archived', label: t('admin.tabs.archived') },
    ...(isSuperuser ? [{ key: 'sql', label: t('admin.tabs.sql') }] : []),
  ]

  const pending = users.filter(u => !u.approved)
  const approved = users.filter(u => u.approved)

  return (
    <div className="space-y-6">

      {/* Modal cambio de contraseña */}
      {pwdModal.open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h2 className="font-semibold text-gray-900 mb-1">Cambiar contraseña</h2>
            <p className="text-sm text-gray-400 mb-4">@{pwdModal.username}</p>
            <form onSubmit={changePassword} className="space-y-3">
              <div>
                <label className="label">Nueva contraseña</label>
                <input
                  type="password" className="input" required minLength={8}
                  placeholder="Mínimo 8 caracteres"
                  value={pwdModal.password}
                  onChange={e => setPwdModal(m => ({ ...m, password: e.target.value }))}
                  autoFocus
                />
              </div>
              <div>
                <label className="label">Confirmar contraseña</label>
                <input
                  type="password" className="input" required minLength={8}
                  placeholder="Repite la contraseña"
                  value={pwdModal.confirm}
                  onChange={e => setPwdModal(m => ({ ...m, confirm: e.target.value }))}
                />
              </div>
              {pwdModal.password && pwdModal.confirm && pwdModal.password !== pwdModal.confirm && (
                <p className="text-xs text-accent">Las contraseñas no coinciden</p>
              )}
              <div className="flex gap-2 justify-end pt-1">
                <button type="button" onClick={() => setPwdModal(EMPTY_PWD_MODAL)}
                  className="btn-secondary text-sm">Cancelar</button>
                <button type="submit" className="btn-primary text-sm"
                  disabled={pwdModal.saving || pwdModal.password !== pwdModal.confirm || !pwdModal.password}>
                  {pwdModal.saving ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('admin.title')}</h1>
        <span className="badge bg-primary-50 text-primary-700">{ROLES[user.role]}</span>
      </div>

      <div className="flex gap-2 border-b border-gray-100 pb-0 overflow-x-auto">
        {tabs.map(tab_ => (
          <button key={tab_.key} onClick={() => setTab(tab_.key)}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors -mb-px border-b-2 whitespace-nowrap ${tab === tab_.key ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {tab_.label}
            {tab_.key === 'users' && pending.length > 0 && (
              <span className="ml-1.5 w-5 h-5 bg-accent text-white text-xs rounded-full inline-flex items-center justify-center">{pending.length}</span>
            )}
            {tab_.key === 'archived' && stats?.archived_posts > 0 && (
              <span className="ml-1.5 w-5 h-5 bg-yellow-500 text-white text-xs rounded-full inline-flex items-center justify-center">{stats.archived_posts}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'stats' && stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            [t('admin.stats.users'), stats.total_users, 'text-primary'],
            [t('admin.stats.posts'), stats.total_posts, 'text-blue-500'],
            [t('admin.stats.groups'), stats.total_groups, 'text-green-500'],
            [t('admin.stats.events'), stats.upcoming_events, 'text-yellow-500'],
            [t('admin.stats.archived'), stats.archived_posts, 'text-orange-500'],
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
              + {t('admin.users.addUser')}
            </button>
          </div>

          {creatingUser && (
            <div className="card p-6 border-l-4 border-primary">
              <h2 className="font-semibold mb-4">{t('admin.users.newUser')}</h2>
              <form onSubmit={createUser} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">{t('admin.users.fullName')}</label>
                  <input className="input" required value={userForm.full_name}
                    onChange={e => setUserForm(f => ({ ...f, full_name: e.target.value }))}
                    placeholder="Juan Pérez García" />
                </div>
                <div>
                  <label className="label">{t('admin.users.username')}</label>
                  <input className="input" required value={userForm.username}
                    onChange={e => setUserForm(f => ({ ...f, username: e.target.value }))}
                    placeholder="juanperez" pattern="[a-zA-Z0-9_]+" />
                </div>
                <div>
                  <label className="label">{t('admin.users.email')}</label>
                  <input type="email" className="input" required value={userForm.email}
                    onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="correo@cecum.edu.mx" />
                </div>
                <div>
                  <label className="label">{t('admin.users.password')}</label>
                  <input type="password" className="input" required minLength={8} value={userForm.password}
                    onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))}
                    placeholder={t('auth.minPassword')} />
                </div>
                <div>
                  <label className="label">{t('admin.users.role')}</label>
                  <select className="input" value={userForm.role}
                    onChange={e => setUserForm(f => ({ ...f, role: e.target.value }))}>
                    <option value="student">{ROLES.student}</option>
                    <option value="teacher">{ROLES.teacher}</option>
                    <option value="parent">{ROLES.parent}</option>
                    <option value="moderator">{ROLES.moderator}</option>
                    {isSuperuser && <option value="superuser">{ROLES.superuser}</option>}
                  </select>
                </div>
                <div>
                  <label className="label">{t('admin.users.grade')}</label>
                  <input className="input" value={userForm.grade}
                    onChange={e => setUserForm(f => ({ ...f, grade: e.target.value }))}
                    placeholder="Ej: 3° Secundaria B" />
                </div>
                <div className="sm:col-span-2 flex gap-2 justify-end">
                  <button type="button" onClick={() => { setCreatingUser(false); setUserForm(EMPTY_USER_FORM) }}
                    className="btn-secondary text-sm">{t('admin.users.cancel')}</button>
                  <button type="submit" className="btn-primary text-sm" disabled={savingUser}>
                    {savingUser ? t('admin.users.creating') : t('admin.users.createBtn')}
                  </button>
                </div>
              </form>
            </div>
          )}

          {pending.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 mb-3">{t('admin.users.pending')} ({pending.length})</h2>
              <div className="space-y-2">
                {pending.map(u => (
                  <UserRow key={u.id} u={u} currentUser={user} onApprove={approve} onChangeRole={changeRole} onDelete={deleteUser} onChangePassword={openPwdModal} />
                ))}
              </div>
            </div>
          )}

          <div>
            <h2 className="text-sm font-semibold text-gray-500 mb-3">{t('admin.users.approved')} ({approved.length})</h2>
            <div className="space-y-2">
              {approved.map(u => (
                <UserRow key={u.id} u={u} currentUser={user} onApprove={approve} onChangeRole={changeRole} onDelete={deleteUser} onChangePassword={openPwdModal} />
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'archived' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            {lang === 'en'
              ? 'Posts archived from the feed. Only moderators, teachers, and superusers can see and restore them.'
              : 'Publicaciones archivadas del feed. Solo moderadores, profesores y superusuarios pueden verlas y restaurarlas.'}
          </p>
          {loadingArchived && (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {!loadingArchived && archivedPosts.length === 0 && (
            <div className="card p-12 text-center text-gray-400">
              <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              <p>{t('admin.archived.empty')}</p>
            </div>
          )}
          {!loadingArchived && archivedPosts.map(post => (
            <div key={post.id} className="card p-4 flex gap-4 items-start">
              {/* Miniatura */}
              {(post.image_url || post.video_url) && (
                <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                  {post.video_url ? (
                    <video src={mediaSrc(post.video_url)} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                  ) : (
                    <img src={mediaSrc(post.image_url)} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-900">{post.full_name}</span>
                  <span className="text-xs text-gray-400">@{post.username}</span>
                  <span className="text-xs text-gray-400">·</span>
                  <span className="text-xs text-gray-400">
                    {formatDistanceToNow(new Date(post.created_at), { locale: dateLocale, addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm text-gray-700 line-clamp-2">{post.content}</p>
              </div>
              <button
                onClick={() => unarchivePost(post.id)}
                className="flex-shrink-0 text-xs bg-yellow-100 text-yellow-700 hover:bg-yellow-200 px-3 py-1.5 rounded-lg font-medium transition-colors"
              >
                {t('admin.archived.unarchive')}
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === 'sql' && isSuperuser && (
        <div className="space-y-4">
          <div className="card p-4 border-l-4 border-yellow-400 bg-yellow-50">
            <p className="text-sm text-yellow-800 font-medium">{t('admin.sql.title')} — {lang === 'en' ? 'Superusers only' : 'Solo superusuarios'}</p>
            <p className="text-xs text-yellow-700 mt-0.5">{t('admin.sql.warning')}</p>
          </div>

          <form onSubmit={runSQL} className="card p-4 space-y-3">
            <label className="label">{t('admin.sql.title')}</label>
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
                  'SELECT * FROM posts WHERE archived=false ORDER BY created_at DESC LIMIT 20;',
                  'SELECT * FROM posts WHERE archived=true ORDER BY created_at DESC LIMIT 20;',
                  'SELECT u.full_name, COUNT(p.id) AS posts FROM users u LEFT JOIN posts p ON p.user_id=u.id GROUP BY u.id ORDER BY posts DESC;'
                ].map((q, i) => (
                  <button key={i} type="button" onClick={() => setQuery(q)}
                    className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded text-gray-600 font-mono truncate max-w-xs">
                    {lang === 'en'
                      ? ['Users', 'Posts', 'Archived posts', 'Top posters'][i]
                      : ['Usuarios', 'Publicaciones', 'Posts archivados', 'Top publicadores'][i]}
                  </button>
                ))}
              </div>
              <button type="submit" className="btn-primary text-sm" disabled={sqlLoading || !query.trim()}>
                {sqlLoading ? t('admin.sql.running') : t('admin.sql.run')}
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
                <span className="text-xs text-gray-500 font-mono">{sqlResult.rowCount} {t('admin.sql.rows')}</span>
                <button onClick={() => {
                  const csv = [sqlResult.fields?.map(f => f.name).join(','), ...sqlResult.rows.map(r => Object.values(r).join(','))].join('\n')
                  const a = document.createElement('a'); a.href = 'data:text/csv,' + encodeURIComponent(csv); a.download = 'resultado.csv'; a.click()
                }} className="text-xs text-primary hover:underline">{t('admin.sql.export')}</button>
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
                <p className="p-4 text-center text-sm text-gray-400">{lang === 'en' ? 'No results' : 'Sin resultados'}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function UserRow({ u, currentUser, onApprove, onChangeRole, onDelete, onChangePassword }) {
  const isSuperuser = currentUser.role === 'superuser'
  const isOwnRow = u.id === currentUser.id
  const canApproveThis = (APPROVABLE[currentUser.role] || []).includes(u.role)

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
            <option value="student">{ROLES.student}</option>
            <option value="teacher">{ROLES.teacher}</option>
            <option value="parent">{ROLES.parent}</option>
            <option value="moderator">{ROLES.moderator}</option>
            <option value="superuser">{ROLES.superuser}</option>
          </select>
        )}
        {/* Botón aprobar/revocar — solo visible si el usuario actual puede gestionar este rol */}
        {!isOwnRow && canApproveThis && (
          <button
            onClick={() => onApprove(u.id, !u.approved, u.role)}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors
              ${u.approved ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
            {u.approved ? 'Revocar' : 'Aprobar'}
          </button>
        )}
        {isSuperuser && !isOwnRow && (
          <button onClick={() => onChangePassword(u)} title="Cambiar contraseña"
            className="text-gray-300 hover:text-primary p-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </button>
        )}
        {isSuperuser && !isOwnRow && (
          <button onClick={() => onDelete(u.id)} className="text-gray-300 hover:text-accent p-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
