import { describe, expect, it } from 'vitest';
import { chordNotes, musicXML, noteY, sameChord, timingAccuracy } from './music';
import { initialState, validateState } from './storage';

describe('music fundamentals', () => {
  it('places middle C on its ledger line in both clefs', () => {
    expect(noteY(60)).toBe(104); expect(noteY(64)).toBe(92);
    expect(noteY(60, true)).toBe(32); expect(noteY(53, true)).toBe(56);
  });
  it('accepts inversions but rejects wrong or missing chord tones', () => {
    expect(chordNotes(60, false)).toEqual([0,4,7]); expect(chordNotes(60, true)).toEqual([0,3,7]);
    expect(sameChord([64,67,72], chordNotes(60, false))).toBe(true);
    expect(sameChord([60,63,67], chordNotes(60, false))).toBe(false);
    expect(sameChord([60,72,67], chordNotes(60, false))).toBe(false);
  });
  it('measures against the original grid and catches cumulative drift', () => {
    expect(timingAccuracy([100,1100,2100,3100], 60)).toEqual({ error: 0, correct: 3, total: 3 });
    expect(timingAccuracy([0,1100,2200,3300], 60)).toEqual({ error: 200, correct: 1, total: 3 });
    expect(timingAccuracy([100], 60).total).toBe(0);
  });
  it('exports the correct pitch, duration and unmetered notation', () => {
    const xml = musicXML([{ midi: 60, beats: 0.5 }, { midi: 72, beats: 4 }]);
    expect(xml).toContain('<step>C</step><octave>4</octave>'); expect(xml).toContain('<duration>1</duration><type>eighth</type>');
    expect(xml).toContain('<octave>5</octave>'); expect(xml).toContain('<senza-misura/>');
  });
});

describe('backup validation', () => {
  it('accepts a complete backup with notes and rejects unsupported versions', () => {
    expect(validateState(initialState)).toBe(true); expect(validateState({ ...initialState, version: 2 })).toBe(false);
    expect(validateState({ ...initialState, draft: [{ midi: 60, beats: 1 }] })).toBe(true);
  });
  it('rejects invalid tempo, impossible results and executable file URLs', () => {
    expect(validateState({ ...initialState, bpm: 0 })).toBe(false);
    expect(validateState({ ...initialState, attempts: [{ date: 'today', kind: 'notes', correct: 4, total: 1 }] })).toBe(false);
    expect(validateState({ ...initialState, scores: [{ id: 'a', title: 't', author: '', notes: '', status: 'Разбираю', type: 'image', data: 'javascript:alert(1)' }] })).toBe(false);
    expect(validateState({ ...initialState, draft: [{ midi: 200, beats: 1 }] })).toBe(false);
  });
  it('accepts supported embedded files and prevents arbitrary MIME types', () => {
    const score = { id: 'a', title: 't', author: '', notes: '', status: 'Разбираю' };
    expect(validateState({ ...initialState, scores: [{ ...score, type: 'pdf', data: 'data:application/pdf;base64,JVBERg==' }] })).toBe(true);
    expect(validateState({ ...initialState, scores: [{ ...score, type: 'image', data: 'data:image/svg+xml;base64,PHN2Zz4=' }] })).toBe(false);
  });
});
