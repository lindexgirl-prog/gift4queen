import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { prepareGitHubPages } from '../scripts/prepare-github-pages-lib.mjs';

async function withClientDirectory(run) {
  const root = await mkdtemp(path.join(tmpdir(), 'family-archive-pages-'));
  const clientDir = path.join(root, 'client');
  await mkdir(clientDir, { recursive: true });
  try {
    await run(clientDir);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test('prepareGitHubPages creates an SPA fallback and custom-domain marker', async () => {
  await withClientDirectory(async (clientDir) => {
    await writeFile(path.join(clientDir, 'index.html'), '<main>archive</main>');

    await prepareGitHubPages(clientDir, 'gift4queen.ru');

    assert.equal(await readFile(path.join(clientDir, '404.html'), 'utf8'), '<main>archive</main>');
    assert.equal(await readFile(path.join(clientDir, 'CNAME'), 'utf8'), 'gift4queen.ru\n');
  });
});

test('prepareGitHubPages refuses a build without index.html', async () => {
  await withClientDirectory(async (clientDir) => {
    await assert.rejects(
      prepareGitHubPages(clientDir, 'gift4queen.ru'),
      /Missing GitHub Pages build input: index\.html/,
    );
  });
});
