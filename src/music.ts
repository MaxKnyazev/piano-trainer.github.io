export const noteNames = ['До', 'До♯', 'Ре', 'Ре♯', 'Ми', 'Фа', 'Фа♯', 'Соль', 'Соль♯', 'Ля', 'Ля♯', 'Си'];
export const whiteNotes = [60, 62, 64, 65, 67, 69, 71, 72];
export function nameOf(midi: number) { return `${noteNames[midi % 12]}${Math.floor(midi / 12) - 1}`; }
export function chordNotes(root: number, minor: boolean) { return [root % 12, (root + (minor ? 3 : 4)) % 12, (root + 7) % 12].sort((a, b) => a - b); }
export function sameChord(selected: number[], target: number[]) { return [...new Set(selected.map(n => n % 12))].sort((a, b) => a - b).join(',') === [...target].sort((a, b) => a - b).join(','); }
export function timingAccuracy(times: number[], bpm: number) {
  if (times.length < 2) return { error: 0, correct: 0, total: 0 };
  const period = 60000 / bpm;
  // Compare every event to the original grid, so cumulative drift remains visible.
  const errors = times.slice(1).map((time, i) => Math.abs(time - times[0] - (i + 1) * period));
  return { error: Math.round(errors.reduce((a, b) => a + b, 0) / errors.length), correct: errors.filter(e => e <= Math.min(120, period * 0.15)).length, total: errors.length };
}
let context: AudioContext | undefined;
export async function audioContext() {
  context ??= new AudioContext();
  if (context.state === 'suspended') await context.resume();
  return context;
}
export function sound(ctx: AudioContext, midi: number, at = ctx.currentTime, duration = 0.45, volume = 0.16) {
  const osc = ctx.createOscillator(), gain = ctx.createGain();
  osc.type = 'triangle'; osc.frequency.value = 440 * 2 ** ((midi - 69) / 12);
  gain.gain.setValueAtTime(0, at); gain.gain.linearRampToValueAtTime(volume, at + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.001, at + duration);
  osc.connect(gain); gain.connect(ctx.destination); osc.start(at); osc.stop(at + duration + 0.02);
}
export async function playNotes(notes: { midi: number; beats: number }[], bpm = 60) {
  const ctx = await audioContext(); let at = ctx.currentTime + 0.05;
  notes.forEach(n => { sound(ctx, n.midi, at, n.beats * 60 / bpm * 0.85); at += n.beats * 60 / bpm; });
}
export function noteY(midi: number, bass = false) {
  const steps: Record<number, number> = { 0: 0, 2: 1, 4: 2, 5: 3, 7: 4, 9: 5, 11: 6 };
  const step = Math.floor(midi / 12) * 7 + (steps[midi % 12] ?? 0);
  return 104 - (step - (bass ? 23 : 35)) * 6;
}
export function musicXML(notes: { midi: number; beats: number }[]) {
  const pitches: Record<number, string> = { 0: 'C', 2: 'D', 4: 'E', 5: 'F', 7: 'G', 9: 'A', 11: 'B' };
  const types: Record<number, string> = { 0.5: 'eighth', 1: 'quarter', 2: 'half', 4: 'whole' };
  // One note per unmetered measure avoids exporting incomplete/overfull 4/4 bars.
  return `<?xml version="1.0" encoding="utf-8"?><score-partwise version="4.0"><work><work-title>Моё упражнение</work-title></work><part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list><part id="P1">${notes.map((n, i) => `<measure number="${i + 1}">${i === 0 ? '<attributes><divisions>2</divisions><key><fifths>0</fifths></key><time><senza-misura/></time><clef><sign>G</sign><line>2</line></clef></attributes>' : ''}<note><pitch><step>${pitches[n.midi % 12] ?? 'C'}</step><octave>${Math.floor(n.midi / 12) - 1}</octave></pitch><duration>${n.beats * 2}</duration><type>${types[n.beats]}</type></note></measure>`).join('')}</part></score-partwise>`;
}
