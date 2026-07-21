-- Migración: corregir URLs de archivos de /uploads/ a /api/uploads/
-- Ejecutar en el VPS con:
--   docker exec cecum_db psql -U cecum -d cecumlink -f /tmp/migrate_urls.sql
-- O directamente:
--   docker exec cecum_db psql -U cecum -d cecumlink -c "$(cat migrate_urls.sql)"

BEGIN;

UPDATE posts
  SET image_url = '/api/uploads/' || split_part(image_url, '/uploads/', 2)
  WHERE image_url LIKE '/uploads/%';

UPDATE posts
  SET video_url = '/api/uploads/' || split_part(video_url, '/uploads/', 2)
  WHERE video_url LIKE '/uploads/%';

UPDATE users
  SET avatar_url = '/api/uploads/' || split_part(avatar_url, '/uploads/', 2)
  WHERE avatar_url LIKE '/uploads/%';

UPDATE gallery
  SET image_url = '/api/uploads/' || split_part(image_url, '/uploads/', 2)
  WHERE image_url LIKE '/uploads/%';

-- Verificación
SELECT 'posts_image' as campo, COUNT(*) as pendientes FROM posts WHERE image_url LIKE '/uploads/%'
UNION ALL SELECT 'posts_video', COUNT(*) FROM posts WHERE video_url LIKE '/uploads/%'
UNION ALL SELECT 'users_avatar', COUNT(*) FROM users WHERE avatar_url LIKE '/uploads/%'
UNION ALL SELECT 'gallery_image', COUNT(*) FROM gallery WHERE image_url LIKE '/uploads/%';

COMMIT;
