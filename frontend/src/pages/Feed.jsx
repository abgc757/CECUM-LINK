import { useState, useEffect, useRef } from 'react'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import { Avatar } from '../components/Layout'
import PostCard from '../components/PostCard'
import toast from 'react-hot-toast'

const API = import.meta.env.VITE_API_URL || ''

export default function Feed() {
  const { user } = useAuth()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState('')
  const [image, setImage] = useState(null)
  const [posting, setPosting] = useState(false)
  const fileRef = useRef()

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
      toast.success('¡Publicación creada!')
    } catch {
      toast.error('Error al publicar')
    } finally {
      setPosting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="card p-4">
        <div className="flex gap-3">
          <Avatar user={user} size="md" />
          <form onSubmit={submit} className="flex-1 space-y-3">
            <textarea
              className="input resize-none"
              rows={3}
              placeholder="¿Qué quieres compartir con la comunidad CECUM?"
              value={content}
              onChange={e => setContent(e.target.value)}
            />
            {image && (
              <div className="relative inline-block">
                <img src={URL.createObjectURL(image)} alt="" className="h-24 rounded-lg object-cover" />
                <button type="button" onClick={() => setImage(null)} className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-white rounded-full text-xs flex items-center justify-center">×</button>
              </div>
            )}
            <div className="flex items-center justify-between">
              <button type="button" onClick={() => fileRef.current.click()} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                Foto
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => setImage(e.target.files[0])} />
              <button type="submit" className="btn-primary text-sm" disabled={posting || !content.trim()}>
                {posting ? 'Publicando...' : 'Publicar'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" /></div>
      ) : posts.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
          <p>Sé el primero en publicar algo</p>
        </div>
      ) : (
        posts.map(p => <PostCard key={p.id} post={p} onDelete={id => setPosts(ps => ps.filter(x => x.id !== id))} />)
      )}
    </div>
  )
}
