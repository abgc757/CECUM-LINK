#!/bin/sh
set -e

# Inyectar BACKEND_URL en el config de nginx en runtime
envsubst '${BACKEND_URL}' < /etc/nginx/templates/nginx.conf.template > /etc/nginx/conf.d/default.conf

# Inyectar la URL del backend en la app React (window.__ENV__)
cat > /usr/share/nginx/html/env-config.js <<EOF
window.__ENV__ = {
  VITE_API_URL: "https://${BACKEND_URL}",
  VITE_SOCKET_URL: "https://${BACKEND_URL}"
};
EOF

exec nginx -g 'daemon off;'
