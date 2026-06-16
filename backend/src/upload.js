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
const upload = multer({
  storage: useCloudinary ? multer.memoryStorage() : multer.diskStorage({
    destination: 'uploads/',
    filename: (_, file, cb) => cb(null, uuidv4() + path.extname(file.originalname)),
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// Sube el buffer a Cloudinary y devuelve la URL pública
async function uploadToCloudinary(file) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'cecumlink', resource_type: 'image' },
      (err, result) => {
        if (err) {
          console.error('[Cloudinary] Error al subir imagen:', err);
          return reject(err);
        }
        console.log('[Cloudinary] Imagen subida:', result.secure_url);
        resolve(result.secure_url);
      }
    );
    stream.end(file.buffer);
  });
}

// Normaliza la URL: Cloudinary → URL absoluta, disco → /uploads/filename
async function getImageUrl(file) {
  if (!file) return null;
  if (useCloudinary) return uploadToCloudinary(file);
  return `/uploads/${file.filename}`;
}

module.exports = { upload, getImageUrl };
