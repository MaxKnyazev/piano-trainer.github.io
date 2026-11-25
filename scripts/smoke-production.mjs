import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const root = resolve('dist');
const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (!pathname.startsWith('/piano-trainer/')) { res.writeHead(404).end(); return; }
    const file = resolve(root, pathname.slice('/piano-trainer/'.length) || 'index.html');
    if (!file.startsWith(root + '\\') && !file.startsWith(root + '/')) { res.writeHead(403).end(); return; }
    await stat(file); res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' }); res.end(await readFile(file));
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}) });
  const page = await browser.newPage(); const failures = [];
  page.on('pageerror', e => failures.push(e.message));
  page.on('response', r => { if (r.status() >= 400) failures.push(`${r.status()} ${r.url()}`); });
  const url = `http://127.0.0.1:${server.address().port}/piano-trainer/#/course/keyboard`;
  await page.goto(url); await page.getByRole('heading', { name: 'Знакомство с клавиатурой', exact: true }).waitFor();
  await page.reload(); await page.getByRole('heading', { name: 'Знакомство с клавиатурой', exact: true }).waitFor();
  await page.goto(url.replace('/course/keyboard', '/practice?mode=writing'));
  await page.getByRole('button', { name: 'До4', exact: true }).click();
  await page.getByRole('button', { name: 'В библиотеку', exact: true }).click();
  await page.goto(url.replace('/course/keyboard', '/library'));
  await page.getByRole('button', { name: /Моё упражнение 1/ }).click();
  await page.locator('.xml-sheet svg').first().waitFor({ timeout: 20000 });
  assert.deepEqual(failures, []);
  console.log('Production smoke passed: subdirectory assets, direct hash route, reload, local save and lazy MusicXML viewer.');
} finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
