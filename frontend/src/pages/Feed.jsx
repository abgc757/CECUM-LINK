import { useState, useEffect, useRef } from 'react'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { Avatar } from '../components/Layout'
import ReelCard from '../components/ReelCard'
import toast from 'react-hot-toast'

export default function Feed() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState('')
  const [image, setImage] = useState(null)
  const [posting, setPosting] = useState(false)
  const [composerOpen, setComposerOpen] = useState(false)
  const fileRef = useRef()
  const feedRef = useRef()

  const loadPosts = async () => {
    const { data } = await api.get('/posts')
    setPosts(data)
    setLoading(false)
  }

  useEffect(() => { loadPosts() }, [])

  const submit = async (e) => {
    e.preventDefault()
    if (!content.trim()) return
    setPosting(true)
    const fd = new FormData()
    fd.append('content', content)
    if (image) fd.append('image', image)
    try {
      const { data } = await api.post('/posts', fd)
      setPosts(p => [{ ...data, username: user.username, full_name: user.full_name, avatar_url: user.avatar_url, likes_count: 0, comments_count: 0, liked: false }, ...p])
      setContent('')
      setImage(null)
      setComposerOpen(false)
      toast.success(t('feed.published'))
      feedRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      toast.error(t('feed.publishError'))
    } finally {
      setPosting(false)
    }
  }

  return (
    <div className="fixed inset-0 top-14 flex flex-col bg-gray-950">

      {/* Botón flotante nueva publicación */}
      <button
        onClick={() => setComposerOpen(true)}
        className="absolute bottom-6 right-6 z-30 w-14 h-14 rounded-full bg-primary text-white shadow-lg flex items-center justify-center hover:bg-primary-700 active:scale-95 transition-transform"
        title={t('feed.publish')}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {/* Modal compositor */}
      {composerOpen && (
        <div className="absolute inset-0 z-40 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar user={user} size="md" />
                <div>
                  <p className="font-semibold text-sm text-gray-900">{user.full_name}</p>
                  <p className="text-xs text-gray-400">@{user.username}</p>
                </div>
              </div>
              <button onClick={() => { setComposerOpen(false); setImage(null); setContent('') }} className="text-gray-400 hover:text-gray-600 p-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={submit} className="space-y-3">
              <textarea
                className="input resize-none"
                rows={4}
                placeholder={t('feed.placeholder')}
                value={content}
                onChange={e => setContent(e.target.value)}
                autoFocus
              />
              {image && (
                <div className="relative inline-block">
                  <img src={URL.createObjectURL(image)} alt="" className="h-28 rounded-lg object-cover" />
                  <button type="button" onClick={() => setImage(null)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-accent text-white rounded-full text-xs flex items-center justify-center">×</button>
                </div>
              )}
              <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                <button type="button" onClick={() => fileRef.current.click()}
                  className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {t('feed.photo')}
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => setImage(e.target.files[0])} />
                <button type="submit" className="btn-primary text-sm" disabled={posting || !content.trim()}>
                  {posting ? t('feed.publishing') : t('feed.publish')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Feed tipo reels */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : posts.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 gap-3">
          <svg className="w-16 h-16 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
          </svg>
          <p className="text-sm">{t('feed.empty')}</p>
        </div>
      ) : (
        <div
          ref={feedRef}
          className="flex-1 overflow-y-scroll"
          style={{
            scrollSnapType: 'y mandatory',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {posts.map(p => (
            <div
              key={p.id}
              style={{ scrollSnapAlign: 'start', height: 'calc(100vh - 3.5rem)' }}
              className="flex-shrink-0"
            >
              <ReelCard
                post={p}
                onDelete={id => setPosts(ps => ps.filter(x => x.id !== id))}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
