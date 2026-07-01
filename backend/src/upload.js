const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const useCloudinary = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (useCloudinary) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

// Multer siempre guarda en memoria; la ruta decide dónde persistir
const VIDEO_MIMETYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];

const upload = multer({
  storage: useCloudinary ? multer.memoryStorage() : multer.diskStorage({
    destination: 'uploads/',
    filename: (_, file, cb) => cb(null, uuidv4() + path.extname(file.originalname)),
  }),
  limits: { fileSize: 150 * 1024 * 1024 },
});

async function uploadToCloudinary(file, resourceType = 'image') {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'cecumlink', resource_type: resourceType },
      (err, result) => {
        if (err) {
          console.error(`[Cloudinary] Error al subir ${resourceType}:`, err);
          return reject(err);
        }
        console.log(`[Cloudinary] ${resourceType} subido:`, result.secure_url);
        resolve(result.secure_url);
      }
    );
    stream.end(file.buffer);
  });
}

async function getImageUrl(file) {
  if (!file) return null;
  if (useCloudinary) return uploadToCloudinary(file, 'image');
  return `/uploads/${file.filename}`;
}

async function getVideoUrl(file) {
  if (!file) return null;
  if (useCloudinary) return uploadToCloudinary(file, 'video');
  return `/uploads/${file.filename}`;
}

module.exports = { upload, getImageUrl, getVideoUrl, VIDEO_MIMETYPES };
