import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api, { getApiBase } from '../api'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { Avatar } from '../components/Layout'
import { formatDistanceToNow } from 'date-fns'
import { es, enUS } from 'date-fns/locale'

function mediaSrc(url) {
  if (!url) return null
  if (url.startsWith('http')) return url
  return `${getApiBase()}${url}`
}


export default function Gallery() {
  const { userId } = useParams()
  const { user } = useAuth()
  const { t, lang } = useLanguage()
  const navigate = useNavigate()

  const targetId = userId ? parseInt(userId) : user.id
  const isMe = targetId === user.id

  const [media, setMedia] = useState([])
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  const dateLocale = lang === 'en' ? enUS : es

  useEffect(() => {
    setLoading(true)
    const fetches = [
      api.get(`/posts/media?user_id=${targetId}`),
    ]
    if (!isMe) fetches.push(api.get(`/users/${targetId}`))

    Promise.all(fetches).then(([mediaRes, profileRes]) => {
      setMedia(mediaRes.data)
      if (profileRes) setProfile(profileRes.data)
    }).finally(() => setLoading(false))
  }, [targetId, isMe])

  const title = isMe
    ? t('gallery.myTitle')
    : `${t('gallery.userTitle')} ${profile?.full_name || '...'}`

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        {!isMe && (
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">{title}</h1>
          {!isMe && profile && (
            <p className="text-sm text-gray-400">@{profile.username}</p>
          )}
        </div>
        {!isMe && profile && (
          <button
            onClick={() => navigate(`/profile/${targetId}`)}
            className="btn-secondary text-sm"
          >
            {t('profile.edit').replace('Editar', 'Perfil').replace('Edit', 'Profile')}
          </button>
        )}
      </div>

      {/* Perfil del usuario visitado */}
      {!isMe && profile && (
        <div className="card p-4 flex items-center gap-4">
          <Avatar user={profile} size="lg" />
          <div>
            <p className="font-semibold text-gray-900">{profile.full_name}</p>
            <p className="text-sm text-gray-400">@{profile.username}</p>
            {profile.bio && <p className="text-sm text-gray-600 mt-1">{profile.bio}</p>}
          </div>
        </div>
      )}

      {/* Estado de carga */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Sin media */}
      {!loading && media.length === 0 && (
        <div className="card p-12 text-center text-gray-400">
          <svg className="w-16 h-16 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p>{isMe ? t('gallery.empty') : t('gallery.emptyOther')}</p>
        </div>
      )}

      {/* Grid de media */}
      {!loading && media.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1">
          {media.map(item => (
            <button
              key={item.id}
              onClick={() => setSelected(item)}
              className="aspect-square relative overflow-hidden rounded-sm hover:opacity-90 active:opacity-75 transition-opacity group bg-gray-900"
            >
              {item.video_url ? (
                <>
                  <video
                    src={mediaSrc(item.video_url)}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                    preload="metadata"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 bg-black/50 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                </>
              ) : (
                <img
                  src={mediaSrc(item.image_url)}
                  alt={item.content || ''}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex flex-col"
          onClick={() => setSelected(null)}
        >
          <div
            className="relative flex-1 flex items-center justify-center p-4"
            onClick={e => e.stopPropagation()}
          >
            {/* Cerrar */}
            <button
              onClick={() => setSelected(null)}
              className="absolute top-4 right-4 z-10 w-9 h-9 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {selected.video_url ? (
              <video
                src={mediaSrc(selected.video_url)}
                controls
                autoPlay
                playsInline
                className="max-w-full max-h-[70vh] rounded-lg"
              />
            ) : (
              <img
                src={mediaSrc(selected.image_url)}
                alt=""
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            )}
          </div>

          {/* Footer del lightbox */}
          <div
            className="bg-black/70 px-5 py-4 flex items-center gap-3"
            onClick={e => e.stopPropagation()}
          >
            <Avatar user={{ full_name: selected.full_name, avatar_url: selected.avatar_url }} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium">{selected.full_name}</p>
              {selected.content && (
                <p className="text-white/60 text-xs truncate">{selected.content}</p>
              )}
              <p className="text-white/40 text-xs">
                {formatDistanceToNow(new Date(selected.created_at), { locale: dateLocale, addSuffix: true })}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
