#!/bin/sh
set -e

# BACKEND_URL debe estar definida (ej: cecumlink-backend.onrender.com)
if [ -z "$BACKEND_URL" ]; then
  echo "ERROR: La variable BACKEND_URL no esta definida."
  echo "Agrega BACKEND_URL=<tu-backend>.onrender.com en el panel de Render."
  exit 1
fi

echo "==> Backend URL: $BACKEND_URL"

# Generar nginx.conf con la URL real del backend
envsubst '${BACKEND_URL}' \
  < /etc/nginx/templates/nginx.conf.template \
  > /etc/nginx/conf.d/default.conf

# Generar env-config.js para que React lea las URLs en runtime
cat > /usr/share/nginx/html/env-config.js <<EOF
window.__ENV__ = {
  VITE_API_URL: "https://${BACKEND_URL}",
  VITE_SOCKET_URL: "https://${BACKEND_URL}"
};
EOF

echo "==> env-config.js generado"
echo "==> Iniciando nginx..."
exec nginx -g 'daemon off;'
