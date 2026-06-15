import axios from 'axios'

// En Render, window.__ENV__ es inyectado en runtime por entrypoint.render.sh
// En Docker local, las variables VITE_* vienen del build
// En desarrollo local (vite dev), el proxy de vite.config.js maneja /api
const runtimeEnv = typeof window !== 'undefined' ? window.__ENV__ : {}

const BASE = (runtimeEnv?.VITE_API_URL ?? import.meta.env.VITE_API_URL ?? '') + '/api'

const api = axios.create({ baseURL: BASE })

export const SOCKET_URL = runtimeEnv?.VITE_SOCKET_URL ?? import.meta.env.VITE_SOCKET_URL ?? ''

export default api
