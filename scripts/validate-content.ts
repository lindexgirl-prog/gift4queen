import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectMediaReferences, getProductionIssues, parseArchive } from '../src/data/archiveSchema';
import { validateMediaFiles } from './validate-content-lib.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const archivePath = path.join(projectRoot, 'src', 'data', 'archive.json');
const publicDir = path.join(projectRoot, 'public');

try {
  const raw = await readFile(archivePath, 'utf8');
  const archive = parseArchive(JSON.parse(raw));
  const issues = [
    ...getProductionIssues(archive),
    ...await validateMediaFiles(collectMediaReferences(archive), publicDir),
  ];

  if (issues.length) {
    console.error('Архив не готов к публикации:');
    issues.forEach((issue) => console.error(`- ${issue}`));
    process.exitCode = 1;
  } else {
    console.log(`Проверка пройдена: ${archive.cards.length} карточек, ${archive.chapters.length} глав.`);
  }
} catch (error) {
  console.error('archive.json не прошёл проверку структуры.');
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
