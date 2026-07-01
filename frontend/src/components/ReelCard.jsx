import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { es, enUS } from 'date-fns/locale'
import { Avatar } from './Layout'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import api, { getApiBase } from '../api'
import toast from 'react-hot-toast'

export default function ReelCard({ post, onDelete }) {
  const { user } = useAuth()
  const { t, lang } = useLanguage()
  const navigate = useNavigate()
  const [liked, setLiked] = useState(post.liked)
  const [likesCount, setLikesCount] = useState(parseInt(post.likes_count))
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')
  const [loadingComments, setLoadingComments] = useState(false)

  const dateLocale = lang === 'en' ? enUS : es
  const canDelete = user.id === post.user_id || ['moderator', 'superuser'].includes(user.role)
  const imgSrc = (url) => url?.startsWith('http') ? url : `${getApiBase()}${url}`

  const toggleLike = async () => {
    const prev = liked
    setLiked(!liked)
    setLikesCount(c => liked ? c - 1 : c + 1)
    try {
      const { data } = await api.post(`/posts/${post.id}/like`)
      setLiked(data.liked)
    } catch { setLiked(prev) }
  }

  const loadComments = async () => {
    if (comments.length === 0) {
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
    if (!confirm(t('post.confirmDelete'))) return
    await api.delete(`/posts/${post.id}`)
    toast.success(t('post.deleted'))
    onDelete?.(post.id)
  }

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden bg-gray-950">

      {/* Fondo — imagen o gradiente */}
      {post.image_url ? (
        <img
          src={imgSrc(post.image_url)}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-950" />
      )}

      {/* Overlay gradiente inferior */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/10 pointer-events-none" />

      {/* Contenido principal — parte inferior */}
      <div className="absolute bottom-0 left-0 right-14 p-5 space-y-3">
        {/* Autor */}
        <button
          onClick={() => navigate(`/profile/${post.user_id}`)}
          className="flex items-center gap-3 hover:opacity-90 active:opacity-75 transition-opacity"
        >
          <Avatar user={{ full_name: post.full_name, avatar_url: post.avatar_url }} size="md" />
          <div className="text-left">
            <p className="font-semibold text-white text-sm leading-tight">{post.full_name}</p>
            <p className="text-white/60 text-xs">
              @{post.username} · {formatDistanceToNow(new Date(post.created_at), { locale: dateLocale, addSuffix: true })}
            </p>
          </div>
        </button>

        {/* Contenido del post */}
        <p className="text-white text-sm leading-relaxed line-clamp-4 whitespace-pre-wrap">
          {post.content}
        </p>
      </div>

      {/* Acciones — columna derecha */}
      <div className="absolute right-3 bottom-5 flex flex-col items-center gap-5">
        {/* Like */}
        <button onClick={toggleLike} className="flex flex-col items-center gap-1">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${liked ? 'bg-accent/20' : 'bg-black/30'}`}>
            <svg className={`w-6 h-6 ${liked ? 'text-accent' : 'text-white'}`} fill={liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <span className="text-white text-xs font-medium">{likesCount}</span>
        </button>

        {/* Comentarios */}
        <button onClick={loadComments} className="flex flex-col items-center gap-1">
          <div className="w-10 h-10 rounded-full bg-black/30 flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <span className="text-white text-xs font-medium">{post.comments_count}</span>
        </button>

        {/* Eliminar */}
        {canDelete && (
          <button onClick={handleDelete} className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-full bg-black/30 flex items-center justify-center hover:bg-accent/30 transition-colors">
              <svg className="w-5 h-5 text-white/70 hover:text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
          </button>
        )}
      </div>

      {/* Panel de comentarios — drawer desde abajo */}
      {showComments && (
        <div className="absolute inset-0 z-20 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowComments(false)} />
          <div className="relative bg-white rounded-t-2xl max-h-[65%] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <span className="font-semibold text-sm text-gray-800">{t('post.comments') || 'Comentarios'}</span>
              <button onClick={() => setShowComments(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingComments && <p className="text-xs text-gray-400 text-center">{t('post.loading')}</p>}
              {!loadingComments && comments.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-6">{t('post.noComments') || 'Sin comentarios aún'}</p>
              )}
              {comments.map(c => (
                <div key={c.id} className="flex gap-2">
                  <Avatar user={{ full_name: c.full_name, avatar_url: c.avatar_url }} size="sm" />
                  <div className="bg-gray-50 rounded-xl px-3 py-2 flex-1">
                    <p className="text-xs font-semibold text-gray-700">{c.full_name}</p>
                    <p className="text-sm text-gray-600">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={submitComment} className="flex gap-2 p-3 border-t border-gray-100">
              <Avatar user={user} size="sm" />
              <input
                className="input flex-1 text-sm"
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder={t('post.comment')}
              />
              <button type="submit" className="btn-primary text-sm px-3">{t('post.send')}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
