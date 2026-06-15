import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { Avatar } from './Layout'
import { useAuth } from '../context/AuthContext'
import api, { getApiBase } from '../api'
import toast from 'react-hot-toast'

export default function PostCard({ post, onDelete }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [liked, setLiked] = useState(post.liked)
  const [likesCount, setLikesCount] = useState(parseInt(post.likes_count))
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')
  const [loadingComments, setLoadingComments] = useState(false)

  const toggleLike = async () => {
    const prev = liked
    setLiked(!liked)
    setLikesCount(c => liked ? c - 1 : c + 1)
    try {
      const { data } = await api.post(`/posts/${post.id}/like`)
      setLiked(data.liked)
    } catch {
      setLiked(prev)
    }
  }

  const loadComments = async () => {
    if (!showComments) {
      setLoadingComments(true)
      const { data } = await api.get(`/posts/${post.id}/comments`)
      setComments(data)
      setLoadingComments(false)
    }
    setShowComments(v => !v)
  }

  const submitComment = async (e) => {
    e.preventDefault()
    if (!commentText.trim()) return
    const { data } = await api.post(`/posts/${post.id}/comments`, { content: commentText })
    setComments(c => [...c, { ...data, username: user.username, full_name: user.full_name, avatar_url: user.avatar_url }])
    setCommentText('')
  }

  const handleDelete = async () => {
    if (!confirm('¿Eliminar esta publicación?')) return
    await api.delete(`/posts/${post.id}`)
    toast.success('Publicación eliminada')
    onDelete?.(post.id)
  }

  const canDelete = user.id === post.user_id || ['moderator','superuser'].includes(user.role)

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-start justify-between">
        <button onClick={() => navigate(`/profile/${post.user_id}`)} className="flex items-center gap-3 hover:opacity-80">
          <Avatar user={{ full_name: post.full_name, avatar_url: post.avatar_url }} size="md" />

          <div className="text-left">
            <p className="font-semibold text-sm text-gray-900">{post.full_name}</p>
            <p className="text-xs text-gray-400">@{post.username} · {formatDistanceToNow(new Date(post.created_at), { locale: es, addSuffix: true })}</p>
          </div>
        </button>
        {canDelete && (
          <button onClick={handleDelete} className="text-gray-300 hover:text-accent p-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        )}
      </div>

      <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>

      {post.image_url && (
        <img src={`${getApiBase()}${post.image_url}`} alt="" className="rounded-lg w-full object-cover max-h-80" />
      )}

      <div className="flex items-center gap-4 pt-1 border-t border-gray-100">
        <button onClick={toggleLike} className={`flex items-center gap-1.5 text-sm transition-colors ${liked ? 'text-accent font-medium' : 'text-gray-400 hover:text-accent'}`}>
          <svg className="w-4 h-4" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
          {likesCount}
        </button>
        <button onClick={loadComments} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-primary transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
          {post.comments_count}
        </button>
      </div>

      {showComments && (
        <div className="space-y-3 pt-2 border-t border-gray-100">
          {loadingComments && <p className="text-xs text-gray-400">Cargando...</p>}
          {comments.map(c => (
            <div key={c.id} className="flex gap-2">
              <Avatar user={{ full_name: c.full_name, avatar_url: c.avatar_url }} size="sm" />
              <div className="bg-gray-50 rounded-lg px-3 py-2 flex-1">
                <p className="text-xs font-semibold text-gray-700">{c.full_name}</p>
                <p className="text-sm text-gray-600">{c.content}</p>
              </div>
            </div>
          ))}
          <form onSubmit={submitComment} className="flex gap-2">
            <Avatar user={user} size="sm" />
            <input className="input flex-1 text-sm" value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Escribe un comentario..." />
            <button type="submit" className="btn-primary text-sm px-3 py-1.5">Enviar</button>
          </form>
        </div>
      )}
    </div>
  )
}
