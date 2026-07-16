const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const VIDEO_MIMETYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];

const upload = multer({
  storage: multer.diskStorage({
    destination: 'uploads/',
    filename: (_, file, cb) => cb(null, uuidv4() + path.extname(file.originalname)),
  }),
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB
});

function getImageUrl(file) {
  if (!file) return null;
  return `/uploads/${file.filename}`;
}

function getVideoUrl(file) {
  if (!file) return null;
  return `/uploads/${file.filename}`;
}

module.exports = { upload, getImageUrl, getVideoUrl, VIDEO_MIMETYPES };
