#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepareGitHubPages } from './prepare-github-pages-lib.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
await prepareGitHubPages(path.join(root, 'dist', 'client'), 'gift4queen.ru');
console.log('Prepared GitHub Pages build: 404.html and CNAME.');
