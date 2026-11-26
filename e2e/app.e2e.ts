import { expect, test } from '@playwright/test';

test('course progress persists across reload and nested hash routes', async ({ page }) => {
  await page.goto('/#/course/keyboard');
  await expect(page.getByRole('heading', { name: 'Знакомство с клавиатурой', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Я выполнил упражнение' }).first().click();
  await page.reload();
  await expect(page.getByText('Выполнено', { exact: true })).toHaveCount(1);
  await page.goto('/#/progress');
  await expect(page.getByRole('heading', { name: 'Мой прогресс', exact: true })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('takt-piano:v1')!).completed)).toEqual(['keyboard:0']);
});

test('notes trainer saves one answer and advances', async ({ page }) => {
  await page.goto('/#/practice?mode=notes');
  await page.getByRole('button', { name: 'Ми4', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Верно' })).toBeVisible();
  await page.getByRole('button', { name: 'Ми4', exact: true }).click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('takt-piano:v1')!).attempts.length)).toBe(1);
  await page.getByRole('button', { name: 'Следующее задание' }).click();
  await expect(page.getByText('Верно, это Ми4.')).toHaveCount(0);
});

test('rhythm trainer records a completed grid', async ({ page }) => {
  await page.goto('/#/practice?mode=rhythm');
  for (let i = 0; i < 9; i++) await page.getByRole('button', { name: /Нажимайте в пульс/ }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Среднее отклонение' })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('takt-piano:v1')!).attempts[0].total)).toBe(8);
});

test('chord trainer validates C major', async ({ page }) => {
  await page.goto('/#/practice?mode=chords');
  for (const note of ['До4','Ми4','Соль4']) await page.getByRole('button', { name: note, exact: true }).click();
  await page.getByRole('button', { name: 'Проверить', exact: true }).click();
  await expect(page.getByText('Верно! Прослушайте аккорд и запомните его звучание.')).toBeVisible();
});

test('notation draft saves to library and renders MusicXML', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/#/practice?mode=writing');
  await page.getByRole('button', { name: 'До4', exact: true }).click();
  await page.getByRole('button', { name: 'Ми4', exact: true }).click();
  await page.getByRole('button', { name: 'В библиотеку', exact: true }).click();
  await page.goto('/#/library');
  await page.getByRole('button', { name: /Моё упражнение 1/ }).click();
  await expect(page.locator('.xml-sheet svg').first()).toBeVisible({ timeout: 20000 });
  await page.getByLabel('Заметки и задача на следующее занятие').fill('Повторить в 60 BPM');
  await page.getByRole('button', { name: 'Закрыть', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: /Моё упражнение 1/ }).click();
  await expect(page.getByLabel('Заметки и задача на следующее занятие')).toHaveValue('Повторить в 60 BPM');
  expect(errors).toEqual([]);
});

test('library supports PDF upload and confirmed deletion', async ({ page }) => {
  await page.goto('/#/library');
  await page.getByRole('button', { name: 'Добавить произведение' }).click();
  await page.getByLabel('Название', { exact: true }).fill('Моя пьеса');
  await page.locator('.file-drop input').setInputFiles({ name: 'score.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n%%EOF') });
  await page.getByRole('button', { name: 'Добавить в библиотеку' }).click();
  await page.getByRole('button', { name: /Моя пьеса/ }).click();
  await expect(page.locator('object[type="application/pdf"]')).toHaveCount(1);
  await page.getByRole('button', { name: 'Удалить', exact: true }).click();
  await page.getByRole('button', { name: 'Удалить произведение', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Ваш репертуар начинается здесь' })).toBeVisible();
});

test('backup import requires confirmation and rejects invalid data', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Открыть настройки' }).click();
  await page.locator('.import-button input').setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{"version":2}') });
  await expect(page.getByText('Формат резервной копии не подходит или файл повреждён.')).toBeVisible();
  const backup = { version: 1, completed: ['keyboard:0'], attempts: [], scores: [], draft: [], bpm: 72, dailyMinutes: 15 };
  await page.locator('.import-button input').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
  expect(await page.evaluate(() => localStorage.getItem('takt-piano:v1'))).toBeNull();
  await page.getByRole('button', { name: 'Заменить данные' }).click();
  await expect(page.getByText('Резервная копия восстановлена.')).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('takt-piano:v1')!).bpm)).toBe(72);
});

test('mobile navigation works without page overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Открыть меню' }).click();
  await page.getByRole('link', { name: 'Тренажёры', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Ваша практика' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/mobile.png', fullPage: true });
});

test('desktop overview has no runtime errors', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Каждый день/ })).toBeVisible();
  await page.screenshot({ path: 'test-results/desktop.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('MIDI note-on grades a note and note-off does not duplicate it', async ({ page }) => {
  await page.addInitScript(() => {
    const input = { name: 'Test Tesler', onmidimessage: null as null | ((event: { data: Uint8Array }) => void) };
    Object.defineProperty(navigator, 'requestMIDIAccess', { value: async () => ({ inputs: new Map([['test', input]]), onstatechange: null }) });
    (window as unknown as { emitMidi: (bytes: number[]) => void }).emitMidi = bytes => input.onmidimessage?.({ data: new Uint8Array(bytes) });
  });
  await page.goto('/#/practice?mode=notes');
  await page.getByRole('button', { name: 'USB-MIDI' }).click();
  await expect(page.getByText('Test Tesler', { exact: true })).toBeVisible();
  await page.evaluate(() => (window as unknown as { emitMidi: (bytes: number[]) => void }).emitMidi([0x90, 64, 100]));
  await expect(page.getByText('Верно, это Ми4.')).toBeVisible();
  await page.evaluate(() => (window as unknown as { emitMidi: (bytes: number[]) => void }).emitMidi([0x90, 64, 0]));
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('takt-piano:v1')!).attempts.length)).toBe(1);
});

test('storage failure keeps the previous state and reports the issue', async ({ page }) => {
  await page.goto('/#/course/keyboard');
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new DOMException('Full', 'QuotaExceededError'); }; });
  await page.getByRole('button', { name: 'Я выполнил упражнение' }).first().click();
  await expect(page.getByRole('alert')).toContainText('Сохранение не удалось');
  await expect(page.getByText('Выполнено', { exact: true })).toHaveCount(0);
});

test('ear and speed trainers finish and store results', async ({ page }) => {
  await page.goto('/#/practice?mode=ear');
  await page.getByRole('button', { name: 'Послушать', exact: true }).click();
  await page.getByRole('button', { name: 'Большая терция', exact: true }).click();
  await expect(page.getByText('Верно: большая терция, 4 полутонов.')).toBeVisible();
  await page.getByRole('tab', { name: 'Ровность', exact: true }).click();
  await page.getByRole('button', { name: 'Начать упражнение', exact: true }).click();
  for (const note of ['До4','Ре4','Ми4','Фа4','Соль4','Фа4','Ми4','Ре4']) await page.getByRole('button', { name: note, exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Фрагмент завершён' })).toBeVisible();
  const attempts = await page.evaluate(() => JSON.parse(localStorage.getItem('takt-piano:v1')!).attempts);
  expect(attempts.map((a: { kind: string }) => a.kind)).toEqual(['ear', 'speed']);
  expect(attempts[1].correct).toBe(8);
});

test('expanded chapter keeps old completions and marks filtered exercises by their original index', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('takt-piano:v1', JSON.stringify({ version: 1, completed: ['keyboard:0','keyboard:1','keyboard:2'], attempts: [], scores: [], draft: [], bpm: 60, dailyMinutes: 30 }));
  });
  await page.goto('/#/course');
  await expect(page.getByText('18 глав с подробными объяснениями · 108 упражнений', { exact: true })).toBeVisible();
  const firstChapter = page.locator('.chapter-row').first();
  await expect(firstChapter).toContainText('3/6 упражнений');
  await expect(firstChapter).not.toHaveClass(/chapter-done/);
  await firstChapter.click();
  await page.screenshot({ path: 'test-results/lesson-desktop.png' });
  await expect(page.getByText('Выполнено', { exact: true })).toHaveCount(3);
  await page.getByLabel('Выберите сложность').selectOption('Базовый');
  await expect(page.locator('.exercise')).toHaveCount(2);
  await page.getByRole('button', { name: 'Я выполнил упражнение', exact: true }).click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('takt-piano:v1')!).completed)).toEqual(['keyboard:0','keyboard:1','keyboard:2','keyboard:3']);
  await page.getByLabel('Выберите сложность').selectOption('Все упражнения');
  await expect(page.locator('.exercise')).toHaveCount(6);
  await page.getByRole('button', { name: 'Самопроверка', exact: true }).first().click();
  await page.getByText('Как найти фа, если до пока не видно?', { exact: true }).click();
  await expect(page.getByText('Найдите группу из трёх чёрных клавиш. Белая непосредственно слева от неё — фа.', { exact: true })).toBeVisible();
});

test('long lesson is readable on mobile and its practice navigation works', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/course/triads');
  await page.screenshot({ path: 'test-results/lesson-mobile-top.png' });
  await expect(page.getByRole('heading', { name: 'Мажор и минор: меняется середина' })).toBeVisible();
  await page.getByRole('button', { name: 'Упражнения', exact: true }).first().click();
  await expect(page.getByRole('heading', { name: 'Теперь — за инструмент' })).toBeInViewport();
  await page.getByLabel('Выберите сложность').selectOption('Усложнение');
  await page.getByText('Если пока трудно', { exact: true }).click();
  await expect(page.getByText('Сначала постройте только ре мажор и ре минор.', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/lesson-mobile.png', fullPage: true });
});
