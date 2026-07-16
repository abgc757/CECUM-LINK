const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const VIDEO_MIMETYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];

// Ruta absoluta — siempre apunta a <proyecto>/backend/uploads/
const UPLOADS_DIR = path.join(__dirname, '../uploads');

// Crea el directorio si no existe (importante en dev sin Docker)
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_, __, cb) => cb(null, UPLOADS_DIR),
    filename: (_, file, cb) => cb(null, uuidv4() + path.extname(file.originalname)),
  }),
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB
});

function getImageUrl(file) {
  if (!file) return null;
  return `/api/uploads/${file.filename}`;
}

function getVideoUrl(file) {
  if (!file) return null;
  return `/api/uploads/${file.filename}`;
}

module.exports = { upload, getImageUrl, getVideoUrl, VIDEO_MIMETYPES, UPLOADS_DIR };
