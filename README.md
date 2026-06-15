# CECUM Link — Red Social Escolar

Red social institucional del Centro Educativo y Cultural Morelos.

## Despliegue rápido (Docker)

### Requisitos
- Docker Desktop instalado y corriendo
- Git (opcional)

### Pasos

1. **Copiar el archivo de variables de entorno:**
   ```bash
   cp .env.example .env
   ```
   Edita `.env` y cambia las contraseñas antes de producción.

2. **Levantar todos los servicios:**
   ```bash
   docker compose up -d --build
   ```

3. **Abrir en el navegador:**
   ```
   http://localhost
   ```

4. **Credenciales iniciales del superusuario:**
   ```
   Email:      admin@cecum.edu.mx
   Contraseña: Admin123!
   ```
   > Cambia la contraseña desde el perfil tras el primer inicio de sesión.

### Comandos útiles

```bash
# Ver logs en tiempo real
docker compose logs -f

# Detener servicios
docker compose down

# Detener y eliminar datos (reseteo completo)
docker compose down -v

# Reiniciar solo el backend
docker compose restart backend
```

---

## Estructura del proyecto

```
cecum-link/
├── docker-compose.yml        # Orquestación de servicios
├── .env.example              # Plantilla de variables de entorno
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── index.js          # Servidor Express + Socket.io
│       ├── db/
│       │   ├── connection.js # Conexión PostgreSQL + migraciones
│       │   └── schema.js     # Esquema SQL completo
│       ├── middleware/
│       │   └── auth.js       # JWT + control de roles
│       └── routes/
│           ├── auth.js       # Login / registro
│           ├── posts.js      # Publicaciones, likes, comentarios
│           ├── messages.js   # Mensajería privada
│           ├── groups.js     # Grupos por materia/grado
│           ├── events.js     # Calendario de eventos
│           ├── tasks.js      # Tareas y entregas
│           ├── grades.js     # Calificaciones
│           ├── gallery.js    # Galería de fotos
│           ├── notifications.js
│           ├── users.js      # Perfiles y búsqueda
│           └── admin.js      # Panel admin + consola SQL
└── frontend/
    ├── Dockerfile
    ├── nginx.conf            # Proxy inverso + SPA routing
    ├── src/
    │   ├── App.jsx
    │   ├── api.js
    │   ├── context/AuthContext.jsx
    │   ├── components/
    │   │   ├── Layout.jsx    # Navbar + footer
    │   │   └── PostCard.jsx  # Tarjeta de publicación
    │   └── pages/
    │       ├── Login.jsx
    │       ├── Register.jsx
    │       ├── Feed.jsx
    │       ├── Groups.jsx
    │       ├── GroupDetail.jsx
    │       ├── Events.jsx
    │       ├── Gallery.jsx
    │       ├── Messages.jsx
    │       ├── Grades.jsx
    │       ├── Profile.jsx
    │       └── Admin.jsx     # Panel admin + consola SQL
```

---

## Roles de usuario

| Rol | Descripción | Permisos |
|-----|-------------|----------|
| `student` | Alumno | Publicar, comentar, mensajes, grupos, galería |
| `teacher` | Maestro | Todo lo de alumno + crear tareas y calificaciones |
| `parent` | Padre de familia | Solo lectura y mensajes |
| `moderator` | Moderador | Gestión de usuarios + consola SQL |
| `superuser` | Superusuario | Control total incluyendo roles |

---

## Servicios Docker

| Servicio | Puerto | Descripción |
|----------|--------|-------------|
| `postgres` | 5432 | Base de datos PostgreSQL 16 |
| `backend` | 3001 | API REST + WebSockets |
| `frontend` | 80 | SPA React servida por nginx |

---

## Variables de entorno

| Variable | Descripción | Default |
|----------|-------------|---------|
| `DB_NAME` | Nombre de la base de datos | cecumlink |
| `DB_USER` | Usuario PostgreSQL | cecum |
| `DB_PASSWORD` | Contraseña PostgreSQL | cecum_secret |
| `JWT_SECRET` | Clave secreta para tokens JWT | (cambiar) |
| `VITE_API_URL` | URL del backend (producción) | http://localhost:3001 |
| `FRONTEND_URL` | URL del frontend para CORS | http://localhost |

---

## Seguridad en producción

- Cambia todas las contraseñas en `.env`
- Usa HTTPS con un reverse proxy (Caddy, Nginx externo, Cloudflare Tunnel)
- El `JWT_SECRET` debe tener al menos 32 caracteres aleatorios
- La consola SQL bloquea `DROP`, `TRUNCATE`, `ALTER`, `GRANT` y `REVOKE`

---

Desarrollado por **DevTeam Solutions** para el Centro Educativo y Cultural Morelos.
