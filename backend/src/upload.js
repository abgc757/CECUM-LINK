const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Si hay credenciales de Cloudinary, usar storage en la nube
// Si no, usar disco local (para Docker local)
const useCloudinary = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

let upload;

if (useCloudinary) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  const storage = new CloudinaryStorage({
    cloudinary,
    params: (req, file) => ({
      folder: 'cecumlink',
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      transformation: [{ quality: 'auto', fetch_format: 'auto' }],
    }),
  });

  upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });
} else {
  const path = require('path');
  const { v4: uuidv4 } = require('uuid');
  const diskStorage = multer.diskStorage({
    destination: 'uploads/',
    filename: (_, file, cb) => cb(null, uuidv4() + path.extname(file.originalname)),
  });
  upload = multer({ storage: diskStorage, limits: { fileSize: 10 * 1024 * 1024 } });
}

// Normaliza la URL de la imagen: si es Cloudinary devuelve URL completa,
// si es disco local devuelve /uploads/filename para que funcione con el proxy nginx
function getImageUrl(file) {
  if (!file) return null;
  if (file.path && file.path.startsWith('http')) return file.path; // Cloudinary
  return `/uploads/${file.filename}`; // disco local
}

module.exports = { upload, getImageUrl };
