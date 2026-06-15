import axios from 'axios'

// Prioridad: window.__ENV__ (runtime en Render) > import.meta.env (build-time) > ''
const runtimeEnv = typeof window !== 'undefined' ? (window.__ENV__ || {}) : {}

export const getApiBase = () =>
  runtimeEnv.VITE_API_URL ?? import.meta.env.VITE_API_URL ?? ''

export const SOCKET_URL =
  runtimeEnv.VITE_SOCKET_URL ?? import.meta.env.VITE_SOCKET_URL ?? ''

const api = axios.create({ baseURL: getApiBase() + '/api' })

export default api
