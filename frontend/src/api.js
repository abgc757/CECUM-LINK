import axios from 'axios'

// Lee window.__ENV__ en cada llamada (no en init) para garantizar
// que funcione independientemente del orden de carga de scripts
export const getApiBase = () => {
  const env = (typeof window !== 'undefined' && window.__ENV__) || {}
  return env.VITE_API_URL || import.meta.env.VITE_API_URL || ''
}

export const getSocketUrl = () => {
  const env = (typeof window !== 'undefined' && window.__ENV__) || {}
  return env.VITE_SOCKET_URL || import.meta.env.VITE_SOCKET_URL || ''
}

// Alias para compatibilidad con imports existentes
export const SOCKET_URL = ''

const api = axios.create({
  get baseURL() { return getApiBase() + '/api' }
})

// Interceptor para asegurar que la baseURL siempre esté actualizada
api.interceptors.request.use(config => {
  config.baseURL = getApiBase() + '/api'
  return config
})

export default api
