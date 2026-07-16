import { useState, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import api, { getSocketUrl } from '../api'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { Avatar } from '../components/Layout'
import ReelCard from '../components/ReelCard'
import toast from 'react-hot-toast'

const MAX_VIDEO_SECONDS = 30

export default function Feed() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState('')
  const [image, setImage] = useState(null)
  const [posting, setPosting] = useState(false)
  const [composerOpen, setComposerOpen] = useState(false)
  const [newPostsBanner, setNewPostsBanner] = useState(0)

  const socketRef = useRef()

  // Video recording state
  const [videoBlob, setVideoBlob] = useState(null)
  const [recording, setRecording] = useState(false)
  const [recordSeconds, setRecordSeconds] = useState(0)
  const [cameraStream, setCameraStream] = useState(null)
  const [facingMode, setFacingMode] = useState('user')

  const fileRef = useRef()
  const feedRef = useRef()
  const mediaRecorderRef = useRef()
  const videoPreviewRef = useRef()
  const timerRef = useRef()
  const chunksRef = useRef([])
  const streamRef = useRef(null)   // ref estable — no sufre stale closure

  const loadPosts = async () => {
    const { data } = await api.get('/posts')
    setPosts(data)
    setLoading(false)
  }

  useEffect(() => {
    loadPosts()
    const socket = io(getSocketUrl(), { auth: { token: localStorage.getItem('token') } })
    socketRef.current = socket
    socket.emit('user:online', String(user.id))
    socket.on('post:new', (post) => {
      setPosts(prev => {
        if (prev.some(p => p.id === post.id)) return prev
        setNewPostsBanner(n => n + 1)
        return [post, ...prev]
      })
    })
    return () => socket.disconnect()
  }, [user.id])

  // Adjuntar stream al elemento <video> cuando cambia (resuelve el race condition del ref)
  useEffect(() => {
    if (!cameraStream || !videoPreviewRef.current) return
    videoPreviewRef.current.srcObject = cameraStream
    videoPreviewRef.current.play().catch(() => {})
  }, [cameraStream])

  // Limpia cámara al cerrar el compositor
  useEffect(() => {
    if (!composerOpen) stopCamera()
  }, [composerOpen])

  // Detiene pistas del stream usando el ref — evita stale closure
  const stopCamera = () => {
    clearInterval(timerRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setCameraStream(null)
    setRecording(false)
    setRecordSeconds(0)
  }

  // Devuelve el mimeType base sin codecs para el Blob (Cloudinary no acepta codecs en el tipo)
  const getBaseMimeType = () => {
    const types = ['video/webm', 'video/mp4']
    return types.find(t => MediaRecorder.isTypeSupported(t)) || 'video/webm'
  }

  // mimeType completo (con codecs) solo para MediaRecorder
  const getRecorderMimeType = () => {
    const types = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4']
    return types.find(t => MediaRecorder.isTypeSupported(t)) || 'video/webm'
  }

  const startRecording = async (mode = facingMode) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode },
        audio: true,
      })
      streamRef.current = stream          // ref estable para callbacks
      setCameraStream(stream)             // state para el render
      chunksRef.current = []

      const mr = new MediaRecorder(stream, { mimeType: getRecorderMimeType() })
      mediaRecorderRef.current = mr
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        // Blob con tipo base — compatible con Cloudinary
        const blob = new Blob(chunksRef.current, { type: getBaseMimeType() })
        setVideoBlob(blob)
        setImage(null)
        // Detener cámara usando el ref (no el state, que puede ser stale)
        clearInterval(timerRef.current)
        streamRef.current?.getTracks().forEach(t => t.stop())
        streamRef.current = null
        setCameraStream(null)
        setRecording(false)
        setRecordSeconds(0)
      }
      mr.start(200)
      setRecording(true)
      setRecordSeconds(0)
      timerRef.current = setInterval(() => {
        setRecordSeconds(s => {
          if (s + 1 >= MAX_VIDEO_SECONDS) {
            if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current.stop()
            clearInterval(timerRef.current)
            return MAX_VIDEO_SECONDS
          }
          return s + 1
        })
      }, 1000)
    } catch {
      toast.error('No se pudo acceder a la cámara')
    }
  }

  const stopRecording = () => {
    clearInterval(timerRef.current)
    if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current.stop()
    // mr.onstop se encarga de cerrar el stream y limpiar el state
  }

  const switchCamera = async () => {
    const newMode = facingMode === 'user' ? 'environment' : 'user'
    setFacingMode(newMode)
    clearInterval(timerRef.current)
    if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current.stop()
    chunksRef.current = []
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setCameraStream(null)
    setRecording(false)
    setRecordSeconds(0)
    await startRecording(newMode)
  }

  const getSupportedMimeType = () => getBaseMimeType()

  const submit = async (e) => {
    e.preventDefault()
    if (!content.trim()) return
    setPosting(true)
    const toastId = videoBlob ? toast.loading(t('feed.uploading') || 'Subiendo video…') : null
    try {
      const fd = new FormData()
      fd.append('content', content)
      if (image) fd.append('image', image)
      if (videoBlob) {
        const ext = getBaseMimeType().includes('mp4') ? 'mp4' : 'webm'
        fd.append('video', videoBlob, `video.${ext}`)
      }

      // Timeout extendido a 3 min para videos grandes
      const { data } = await api.post('/posts', fd, { timeout: 180000 })
      if (toastId) toast.dismiss(toastId)
      setPosts(p => [{
        ...data,
        username: user.username,
        full_name: user.full_name,
        avatar_url: user.avatar_url,
        likes_count: 0, comments_count: 0, liked: false
      }, ...p])
      setContent('')
      setImage(null)
      setVideoBlob(null)
      setComposerOpen(false)
      toast.success(t('feed.published'))
      socketRef.current?.emit('post:new', {
        ...data,
        username: user.username,
        full_name: user.full_name,
        avatar_url: user.avatar_url,
        likes_count: 0, comments_count: 0, liked: false
      })
      feedRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      if (toastId) toast.dismiss(toastId)
      const msg = err?.response?.data?.error || err?.message || t('feed.publishError')
      toast.error(msg)
      console.error('[Feed] Error publicando:', err)
    } finally {
      setPosting(false)
    }
  }

  const closeComposer = () => {
    setComposerOpen(false)
    setImage(null)
    setVideoBlob(null)
    setContent('')
  }

  return (
    <div className="fixed inset-0 top-14 flex flex-col bg-gray-950">

      {/* Botón + nueva publicación — esquina superior derecha */}
      <button
        onClick={() => setComposerOpen(true)}
        className="absolute top-3 right-4 z-30 w-10 h-10 rounded-full bg-primary text-white shadow-lg flex items-center justify-center hover:bg-primary-700 active:scale-95 transition-transform"
        title={t('feed.publish')}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {/* Modal compositor */}
      {composerOpen && (
        <div className="absolute inset-0 z-40 bg-black/60 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <div className="flex items-center gap-3">
                <Avatar user={user} size="md" />
                <div>
                  <p className="font-semibold text-sm text-gray-900">{user.full_name}</p>
                  <p className="text-xs text-gray-400">@{user.username}</p>
                </div>
              </div>
              <button onClick={closeComposer} className="text-gray-400 hover:text-gray-600 p-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={submit} className="px-5 pb-4 space-y-3">
              <textarea
                className="input resize-none"
                rows={3}
                placeholder={t('feed.placeholder')}
                value={content}
                onChange={e => setContent(e.target.value)}
                autoFocus
              />

              {/* Preview imagen */}
              {image && !videoBlob && (
                <div className="relative inline-block">
                  <img src={URL.createObjectURL(image)} alt="" className="h-28 rounded-lg object-cover" />
                  <button type="button" onClick={() => setImage(null)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-accent text-white rounded-full text-xs flex items-center justify-center">×</button>
                </div>
              )}

              {/* Preview / grabación de video */}
              {(cameraStream || videoBlob) && (
                <div className="relative rounded-xl overflow-hidden bg-black" style={{ aspectRatio: '9/16', maxHeight: '340px' }}>
                  {/* Vista en vivo de la cámara */}
                  {cameraStream && (
                    <video
                      ref={videoPreviewRef}
                      className="w-full h-full object-cover"
                      style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
                      muted
                      playsInline
                      autoPlay
                    />
                  )}
                  {/* Reproducción del video grabado */}
                  {videoBlob && !cameraStream && (
                    <video src={URL.createObjectURL(videoBlob)} className="w-full h-full object-cover" controls playsInline />
                  )}

                  {/* HUD superior: indicador REC + temporizador */}
                  {recording && (
                    <div className="absolute top-3 left-0 right-0 flex items-center justify-center gap-2">
                      <div className="flex items-center gap-1.5 bg-black/60 rounded-full px-3 py-1">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-white text-xs font-mono font-bold">REC</span>
                        <span className="text-white/80 text-xs font-mono">{MAX_VIDEO_SECONDS - recordSeconds}s</span>
                      </div>
                    </div>
                  )}

                  {/* Barra de progreso de grabación */}
                  {recording && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                      <div
                        className="h-full bg-red-500 transition-all"
                        style={{ width: `${(recordSeconds / MAX_VIDEO_SECONDS) * 100}%` }}
                      />
                    </div>
                  )}

                  {/* Botón cambio de cámara — visible durante grabación activa */}
                  {cameraStream && (
                    <button
                      type="button"
                      onClick={switchCamera}
                      title={facingMode === 'user' ? 'Cambiar a cámara trasera' : 'Cambiar a cámara frontal'}
                      className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors"
                    >
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                  )}

                  {/* Descartar video grabado */}
                  {videoBlob && !cameraStream && (
                    <button type="button" onClick={() => setVideoBlob(null)}
                      className="absolute top-3 right-3 w-8 h-8 bg-black/60 text-white rounded-full text-sm flex items-center justify-center hover:bg-black/80">
                      ×
                    </button>
                  )}
                </div>
              )}

              {/* Barra de acciones */}
              <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                <div className="flex gap-3">
                  {/* Adjuntar imagen */}
                  {!videoBlob && !cameraStream && (
                    <button type="button" onClick={() => fileRef.current.click()}
                      className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {t('feed.photo')}
                    </button>
                  )}

                  {/* Grabar video */}
                  {!image && !videoBlob && !recording && !cameraStream && (
                    <button type="button" onClick={startRecording}
                      className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                      </svg>
                      Video (30s)
                    </button>
                  )}

                  {/* Detener grabación */}
                  {recording && (
                    <button type="button" onClick={stopRecording}
                      className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 font-medium">
                      <span className="w-3 h-3 bg-red-500 rounded-sm" />
                      Detener grabación
                    </button>
                  )}
                </div>

                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { setImage(e.target.files[0]); setVideoBlob(null) }} />
                <button type="submit" className="btn-primary text-sm" disabled={posting || !content.trim() || recording}>
                  {posting ? t('feed.publishing') : t('feed.publish')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Banner de nuevas publicaciones */}
      {newPostsBanner > 0 && (
        <button
          onClick={() => {
            feedRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
            setNewPostsBanner(0)
          }}
          className="absolute top-14 left-1/2 z-30 -translate-x-1/2 flex items-center gap-2 bg-primary text-white text-sm font-medium px-4 py-2 rounded-full shadow-lg hover:bg-primary-700 active:scale-95 transition-all"
          style={{ animation: 'slideDown 0.25s ease' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
          {newPostsBanner === 1 ? '1 nueva publicación' : `${newPostsBanner} nuevas publicaciones`}
        </button>
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
          style={{ scrollSnapType: 'y mandatory', WebkitOverflowScrolling: 'touch' }}
        >
          {posts.map(p => (
            <div key={p.id} style={{ scrollSnapAlign: 'start', height: 'calc(100vh - 3.5rem)' }} className="flex-shrink-0">
              <ReelCard post={p} onDelete={id => setPosts(ps => ps.filter(x => x.id !== id))} />
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateX(-50%) translateY(-12px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  )
}
