import { access, copyFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export async function prepareGitHubPages(clientDir, domain) {
  const indexPath = path.join(clientDir, 'index.html');
  try {
    await access(indexPath);
  } catch {
    throw new Error('Missing GitHub Pages build input: index.html');
  }

  await Promise.all([
    copyFile(indexPath, path.join(clientDir, '404.html')),
    writeFile(path.join(clientDir, 'CNAME'), `${domain}\n`, 'utf8'),
  ]);
}
