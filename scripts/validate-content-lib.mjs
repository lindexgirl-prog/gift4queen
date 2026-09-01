import { stat } from 'node:fs/promises';
import path from 'node:path';

const MAX_VIDEO_BYTES = 25 * 1024 * 1024;

function displayPath(publicDir, filePath) {
  const relative = path.relative(publicDir, filePath).split(path.sep).join('/');
  return `public/${relative}`;
}

export async function validateMediaFiles(mediaPaths, publicDir) {
  const issues = [];
  const resolvedPublicDir = path.resolve(publicDir);

  for (const reference of mediaPaths) {
    const mediaPath = typeof reference === 'string' ? reference : reference.path;
    const mediaKind = typeof reference === 'string'
      ? mediaPath.split('/')[1]
      : reference.kind;
    const filePath = path.resolve(resolvedPublicDir, mediaPath.replace(/^\//, ''));
    const relativePath = path.relative(resolvedPublicDir, filePath);
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      issues.push(`Недопустимый путь к медиа: ${mediaPath}`);
      continue;
    }
    const label = displayPath(resolvedPublicDir, filePath);

    try {
      const file = await stat(filePath);
      if (!file.isFile()) {
        issues.push(`Путь не является файлом: ${label}`);
        continue;
      }
      if (mediaKind === 'video' && file.size > MAX_VIDEO_BYTES) {
        issues.push(`Видео превышает 25 MiB: ${label}`);
      }
    } catch {
      issues.push(`Не найден файл: ${label}`);
    }
  }

  return issues;
}
