#!/bin/sh
set -e

if [ -z "$BACKEND_URL" ]; then
  echo "ERROR: BACKEND_URL no esta definida. Agrega BACKEND_URL=cecumlink-backend.onrender.com en Render."
  exit 1
fi

echo "==> Backend URL: https://${BACKEND_URL}"

# Sustituir solo ${BACKEND_URL} — la lista explícita protege las variables nginx
# como $uri, $host, $upstream_name, etc.
envsubst '${BACKEND_URL}' < /etc/nginx/templates/nginx.conf.template > /etc/nginx/conf.d/default.conf

# Inyectar URLs del backend para que React las lea en runtime
cat > /usr/share/nginx/html/env-config.js <<ENVEOF
window.__ENV__ = {
  VITE_API_URL: "https://${BACKEND_URL}",
  VITE_SOCKET_URL: "https://${BACKEND_URL}"
};
ENVEOF

echo "==> env-config.js generado correctamente"
exec nginx -g 'daemon off;'
