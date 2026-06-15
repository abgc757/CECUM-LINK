#!/bin/sh
set -e

if [ -z "$BACKEND_URL" ]; then
  echo "ERROR: BACKEND_URL no esta definida. Agrega BACKEND_URL=cecumlink-backend.onrender.com en Render."
  exit 1
fi

echo "==> Backend URL: https://${BACKEND_URL}"

# Generar nginx.conf estatico (sin proxy, solo SPA)
envsubst < /etc/nginx/templates/nginx.conf.template > /etc/nginx/conf.d/default.conf

# Inyectar URLs del backend para que React las lea en runtime
cat > /usr/share/nginx/html/env-config.js <<ENVEOF
window.__ENV__ = {
  VITE_API_URL: "https://${BACKEND_URL}",
  VITE_SOCKET_URL: "https://${BACKEND_URL}"
};
ENVEOF

echo "==> env-config.js listo"
exec nginx -g 'daemon off;'
