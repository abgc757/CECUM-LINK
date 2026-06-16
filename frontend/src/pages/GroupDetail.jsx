import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import PostCard from '../components/PostCard'
import { Avatar } from '../components/Layout'
import toast from 'react-hot-toast'

export default function GroupDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const { t, lang } = useLanguage()
  const [tab, setTab] = useState('feed')
  const [posts, setPosts] = useState([])
  const [tasks, setTasks] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState('')
  const [taskForm, setTaskForm] = useState({ title: '', description: '', due_date: '' })
  const [creatingTask, setCreatingTask] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get(`/posts?group_id=${id}`),
      api.get(`/tasks/group/${id}`),
      api.get(`/groups/${id}/members`)
    ]).then(([p, tk, m]) => {
      setPosts(p.data); setTasks(tk.data); setMembers(m.data); setLoading(false)
    })
  }, [id])

  const postInGroup = async (e) => {
    e.preventDefault()
    if (!content.trim()) return
    const fd = new FormData()
    fd.append('content', content)
    fd.append('group_id', id)
    const { data } = await api.post('/posts', fd)
    setPosts(p => [{ ...data, username: user.username, full_name: user.full_name, likes_count: 0, comments_count: 0, liked: false }, ...p])
    setContent('')
  }

  const submitTask = async (e) => {
    e.preventDefault()
    const { data } = await api.post('/tasks', { ...taskForm, group_id: id })
    setTasks(tk => [...tk, { ...data, creator_name: user.full_name }])
    setTaskForm({ title: '', description: '', due_date: '' })
    setCreatingTask(false)
    toast.success(t('groups.taskCreated'))
  }

  const submitHomework = async (taskId, content) => {
    await api.post(`/tasks/${taskId}/submit`, { content })
    setTasks(tk => tk.map(x => x.id === taskId ? { ...x, my_submission_id: true, my_submitted_at: new Date().toISOString() } : x))
    toast.success(t('groups.taskSubmitted'))
  }

  if (loading) return <div className="text-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" /></div>

  const tabs = [
    { key: 'feed', label: t('groups.tabs.feed') },
    { key: 'tasks', label: t('groups.tabs.tasks') },
    { key: 'members', label: t('groups.tabs.members') }
  ]

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="card p-4">
        <div className="flex gap-1 border-b border-gray-100 pb-3">
          {tabs.map(tb => (
            <button key={tb.key} onClick={() => setTab(tb.key)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === tb.key ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
              {tb.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'feed' && (
        <div className="space-y-4">
          <div className="card p-4">
            <form onSubmit={postInGroup} className="space-y-2">
              <textarea className="input" rows={2} placeholder={t('groups.postPlaceholder')} value={content} onChange={e => setContent(e.target.value)} />
              <div className="flex justify-end">
                <button type="submit" className="btn-primary text-sm" disabled={!content.trim()}>{t('feed.publish')}</button>
              </div>
            </form>
          </div>
          {posts.map(p => <PostCard key={p.id} post={p} onDelete={pid => setPosts(ps => ps.filter(x => x.id !== pid))} />)}
        </div>
      )}

      {tab === 'tasks' && (
        <div className="space-y-4">
          {['teacher','moderator','superuser'].includes(user.role) && (
            <div className="card p-4">
              {!creatingTask ? (
                <button onClick={() => setCreatingTask(true)} className="btn-primary text-sm">{t('groups.assignTask')}</button>
              ) : (
                <form onSubmit={submitTask} className="space-y-3">
                  <input className="input" required placeholder={t('groups.taskTitle')} value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} />
                  <textarea className="input" rows={2} placeholder={t('groups.taskDesc')} value={taskForm.description} onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))} />
                  <div>
                    <label className="label">{t('groups.taskDue')}</label>
                    <input type="datetime-local" className="input" value={taskForm.due_date} onChange={e => setTaskForm(f => ({ ...f, due_date: e.target.value }))} />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button type="button" onClick={() => setCreatingTask(false)} className="btn-secondary text-sm">{t('groups.cancel')}</button>
                    <button type="submit" className="btn-primary text-sm">{t('groups.createTask')}</button>
                  </div>
                </form>
              )}
            </div>
          )}
          {tasks.length === 0 && <div className="card p-8 text-center text-gray-400 text-sm">{t('groups.noTasks')}</div>}
          {tasks.map(tk => (
            <TaskCard key={tk.id} task={tk} user={user} onSubmit={submitHomework} t={t} lang={lang} />
          ))}
        </div>
      )}

      {tab === 'members' && (
        <div className="card p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {members.map(m => (
            <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
              <Avatar user={m} size="sm" />
              <div>
                <p className="text-sm font-medium">{m.full_name}</p>
                <p className="text-xs text-gray-400">@{m.username} · {m.group_role === 'admin' ? t('groups.memberRole.admin') : t('groups.memberRole.member')}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TaskCard({ task, user, onSubmit, t, lang }) {
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const due = task.due_date ? new Date(task.due_date) : null
  const isOverdue = due && due < new Date() && !task.my_submitted_at
  const locale = lang === 'en' ? 'en-US' : 'es-MX'

  return (
    <div className={`card p-4 space-y-3 border-l-4 ${isOverdue ? 'border-accent' : task.my_submitted_at ? 'border-green-400' : 'border-primary'}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-gray-900">{task.title}</h3>
          {task.description && <p className="text-sm text-gray-500 mt-0.5">{task.description}</p>}
        </div>
        {task.my_submitted_at && (
          <span className="badge bg-green-50 text-green-700">{t('groups.taskDelivered')}</span>
        )}
        {isOverdue && <span className="badge bg-red-50 text-accent">{t('groups.taskOverdue')}</span>}
      </div>
      <div className="text-xs text-gray-400 flex gap-4">
        {due && <span>{t('groups.taskDueLabel')} {due.toLocaleDateString(locale, { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}</span>}
        {task.my_grade != null && <span className="text-primary font-medium">{t('groups.taskGrade')} {task.my_grade}</span>}
      </div>
      {!task.my_submission_id && (
        <div className="flex gap-2">
          <input className="input flex-1 text-sm" placeholder={t('groups.taskAnswerPlaceholder')} value={text} onChange={e => setText(e.target.value)} />
          <button onClick={async () => { setSubmitting(true); await onSubmit(task.id, text); setSubmitting(false) }} disabled={!text.trim() || submitting} className="btn-primary text-sm px-3">
            {submitting ? '...' : t('groups.submitTask')}
          </button>
        </div>
      )}
    </div>
  )
}
