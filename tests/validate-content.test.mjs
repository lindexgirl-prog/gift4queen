import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, truncate, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { validateMediaFiles } from '../scripts/validate-content-lib.mjs';

async function withPublicDirectory(run) {
  const root = await mkdtemp(path.join(tmpdir(), 'family-archive-'));
  const publicDir = path.join(root, 'public');
  await mkdir(path.join(publicDir, 'images'), { recursive: true });
  await mkdir(path.join(publicDir, 'video'), { recursive: true });
  try {
    await run(publicDir);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test('validateMediaFiles reports a missing referenced file', async () => {
  await withPublicDirectory(async (publicDir) => {
    const issues = await validateMediaFiles(['/images/missing.jpg'], publicDir);

    assert.deepEqual(issues, ['Не найден файл: public/images/missing.jpg']);
  });
});

test('validateMediaFiles accepts an existing image', async () => {
  await withPublicDirectory(async (publicDir) => {
    await writeFile(path.join(publicDir, 'images', 'card.jpg'), 'image');

    assert.deepEqual(await validateMediaFiles(['/images/card.jpg'], publicDir), []);
  });
});

test('validateMediaFiles rejects a video larger than 25 MiB', async () => {
  await withPublicDirectory(async (publicDir) => {
    const videoPath = path.join(publicDir, 'video', 'large.mp4');
    await writeFile(videoPath, '');
    await truncate(videoPath, 25 * 1024 * 1024 + 1);

    const issues = await validateMediaFiles(['/video/large.mp4'], publicDir);

    assert.deepEqual(issues, ['Видео превышает 25 MiB: public/video/large.mp4']);
  });
});

test('validateMediaFiles refuses a path outside public', async () => {
  await withPublicDirectory(async (publicDir) => {
    const issues = await validateMediaFiles(['/images/../../secret.txt'], publicDir);

    assert.deepEqual(issues, ['Недопустимый путь к медиа: /images/../../secret.txt']);
  });
});

test('validateMediaFiles applies the video limit from the typed reference', async () => {
  await withPublicDirectory(async (publicDir) => {
    const videoPath = path.join(publicDir, 'images', 'large.mp4');
    await writeFile(videoPath, '');
    await truncate(videoPath, 25 * 1024 * 1024 + 1);

    const issues = await validateMediaFiles([{ path: '/images/large.mp4', kind: 'video' }], publicDir);

    assert.deepEqual(issues, ['Видео превышает 25 MiB: public/images/large.mp4']);
  });
});

test('validateMediaFiles rejects a directory used as media', async () => {
  await withPublicDirectory(async (publicDir) => {
    const issues = await validateMediaFiles(['/images'], publicDir);

    assert.deepEqual(issues, ['Путь не является файлом: public/images']);
  });
});
