import { useState, useEffect, useRef } from 'react'
import api, { getApiBase } from '../api'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function Gallery() {
  const { user } = useAuth()
  const [photos, setPhotos] = useState([])
  const [selected, setSelected] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [caption, setCaption] = useState('')
  const fileRef = useRef()

  useEffect(() => { api.get('/gallery').then(r => setPhotos(r.data)) }, [])

  const upload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    const fd = new FormData()
    fd.append('image', file)
    fd.append('caption', caption)
    try {
      const { data } = await api.post('/gallery', fd)
      setPhotos(p => [{ ...data, username: user.username, full_name: user.full_name }, ...p])
      setCaption('')
      toast.success('Foto subida')
    } catch { toast.error('Error al subir foto') }
    finally { setUploading(false) }
  }

  const del = async (id) => {
    await api.delete(`/gallery/${id}`)
    setPhotos(p => p.filter(x => x.id !== id))
    setSelected(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Galería</h1>
        <div className="flex gap-2 items-center">
          <input className="input text-sm w-48 hidden sm:block" placeholder="Descripción (opcional)" value={caption} onChange={e => setCaption(e.target.value)} />
          <button onClick={() => fileRef.current.click()} disabled={uploading} className="btn-primary text-sm">
            {uploading ? 'Subiendo...' : '+ Subir foto'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={upload} />
        </div>
      </div>

      {photos.length === 0 && (
        <div className="card p-12 text-center text-gray-400">
          <svg className="w-16 h-16 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          <p>Sé el primero en compartir una foto</p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {photos.map(p => (
          <button key={p.id} onClick={() => setSelected(p)} className="aspect-square rounded-xl overflow-hidden hover:opacity-90 transition-opacity group relative">
            <img src={p.image_url.startsWith('http') ? p.image_url : `${getApiBase()}${p.image_url}`} alt={p.caption || ''} className="w-full h-full object-cover" />
            {p.caption && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-white text-xs truncate">{p.caption}</p>
              </div>
            )}
          </button>
        ))}
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="max-w-2xl w-full bg-white rounded-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <img src={selected.image_url.startsWith('http') ? selected.image_url : `${getApiBase()}${selected.image_url}`} alt="" className="w-full object-contain max-h-[60vh]" />
            <div className="p-4 flex items-center justify-between">
              <div>
                {selected.caption && <p className="font-medium text-gray-800">{selected.caption}</p>}
                <p className="text-sm text-gray-400">Por {selected.full_name}</p>
              </div>
              <div className="flex gap-2">
                {(selected.user_id === user.id || ['moderator','superuser'].includes(user.role)) && (
                  <button onClick={() => del(selected.id)} className="btn-danger text-sm">Eliminar</button>
                )}
                <button onClick={() => setSelected(null)} className="btn-secondary text-sm">Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
