import { describe, expect, it } from 'vitest';
import { createMinecraftScores, MINECRAFT_CATALOG_VERSION, withMinecraftCatalog } from './minecraft';
import { initialState, safeSourceUrl, validateState } from './storage';

describe('Minecraft library migration', () => {
  it('adds both editions for eight tracks without attaching copyrighted files', () => {
    const scores = createMinecraftScores();
    expect(scores).toHaveLength(16);
    expect(new Set(scores.map(s => s.id)).size).toBe(16);
    expect(new Set(scores.map(s => s.title)).size).toBe(8);
    expect(scores.filter(s => s.difficulty === 'easy')).toHaveLength(8);
    expect(scores.every(s => !s.data && safeSourceUrl(s.source?.url))).toBe(true);
    expect(validateState(withMinecraftCatalog(structuredClone(initialState)))).toBe(true);
  });
  it('preserves existing notes and is idempotent', () => {
    const edited = { ...createMinecraftScores()[0], notes: 'My tempo is 50 BPM', status: 'Разбираю' };
    const migrated = withMinecraftCatalog({ ...initialState, scores: [edited] });
    expect(migrated.scores).toHaveLength(16);
    expect(migrated.scores[0]).toEqual(edited);
    expect(withMinecraftCatalog(migrated)).toBe(migrated);
  });
  it('does not resurrect a deleted catalog item on reload or restore', () => {
    const migrated = withMinecraftCatalog(structuredClone(initialState));
    const afterDeletion = { ...migrated, scores: migrated.scores.slice(1) };
    const restored = JSON.parse(JSON.stringify(afterDeletion));
    expect(validateState(restored)).toBe(true);
    expect(withMinecraftCatalog(restored).scores).toHaveLength(15);
    expect(restored.catalogs).toContain(MINECRAFT_CATALOG_VERSION);
  });
  it('rejects unsafe source URLs and malformed metadata in backups', () => {
    expect(safeSourceUrl('javascript:alert(1)')).toBe(false);
    expect(safeSourceUrl('https://user:password@example.com/')).toBe(false);
    const score = createMinecraftScores()[0];
    expect(validateState({ ...initialState, scores: [{ ...score, source: { title: 'Bad source', url: 'data:text/html,test' } }] })).toBe(false);
    expect(validateState({ ...initialState, catalogs: 'wrong type' })).toBe(false);
    expect(validateState({ ...initialState, scores: [{ ...score, difficulty: 'invalid' }] })).toBe(false);
  });
});
