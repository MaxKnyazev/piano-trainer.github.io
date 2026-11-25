export type Score = { id: string; title: string; author: string; status: string; notes: string; fileName?: string; data?: string; type?: string };
export type Attempt = { date: string; kind: string; correct: number; total: number; bpm?: number };
export type DraftNote = { midi: number; beats: number };
export type State = { version: 1; completed: string[]; attempts: Attempt[]; scores: Score[]; draft: DraftNote[]; dailyMinutes: number; bpm: number };
export const STORAGE_KEY = 'takt-piano:v1';
export const initialState: State = { version: 1, completed: [], attempts: [], scores: [], draft: [], dailyMinutes: 30, bpm: 60 };
const obj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v: unknown): v is string => typeof v === 'string';
const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
export function validateState(v: unknown): v is State {
  if (!obj(v) || v.version !== 1 || !Array.isArray(v.completed) || !v.completed.every(str) || !Array.isArray(v.attempts) || !Array.isArray(v.scores) || !Array.isArray(v.draft)) return false;
  if (!num(v.bpm) || v.bpm < 30 || v.bpm > 200 || !num(v.dailyMinutes) || ![15, 30, 45].includes(v.dailyMinutes)) return false;
  return v.attempts.every(a => obj(a) && str(a.date) && !Number.isNaN(Date.parse(a.date)) && str(a.kind) && num(a.correct) && num(a.total) && a.correct >= 0 && a.total >= a.correct && (a.bpm === undefined || (num(a.bpm) && a.bpm >= 30 && a.bpm <= 200)))
    && v.scores.every(s => obj(s) && str(s.id) && str(s.title) && str(s.author) && ['Хочу выучить', 'Разбираю', 'Повторяю', 'Готово'].includes(String(s.status)) && str(s.notes) && (s.fileName === undefined || str(s.fileName)) && (s.type === undefined || ['pdf', 'image', 'xml'].includes(String(s.type))) && (s.data === undefined || (str(s.data) && ((s.type === 'xml' && s.data.trimStart().startsWith('<')) || (s.type === 'pdf' && /^data:application\/pdf;base64,[A-Za-z0-9+/=\r\n]+$/.test(s.data)) || (s.type === 'image' && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=\r\n]+$/.test(s.data))))))
    && v.draft.every(n => obj(n) && num(n.midi) && Number.isInteger(n.midi) && n.midi >= 48 && n.midi <= 84 && num(n.beats) && [0.5, 1, 2, 4].includes(n.beats));
}
export function loadState(): { state: State; warning?: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { state: structuredClone(initialState) };
    const state: unknown = JSON.parse(raw);
    if (!validateState(state)) throw new Error('invalid');
    return { state };
  } catch {
    return { state: structuredClone(initialState), warning: 'Не удалось прочитать сохранение. Исходные данные не перезаписаны. Попробуйте восстановить резервную копию.' };
  }
}
export function download(name: string, content: BlobPart, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
