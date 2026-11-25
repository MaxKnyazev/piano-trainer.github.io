import { useEffect, useRef, useState } from 'react';
import { Music2, Play, Square, Volume2 } from 'lucide-react';
import { audioContext, nameOf, noteY, sound, whiteNotes } from './music';
import { Button } from './ui';

export function Staff({ notes = [60], bass = false, active = -1, beats = [], onPick }: { notes?: number[]; bass?: boolean; active?: number; beats?: number[]; onPick?: (midi: number) => void }) {
  const width = Math.max(360, 85 + notes.length * 48);
  const candidates = bass ? [48,50,52,53,55,57,59,60] : [60,62,64,65,67,69,71,72,74,76,77];
  return <div className="staff-scroll"><svg className={`staff ${onPick ? 'editable' : ''}`} viewBox={`0 0 ${width} 150`} role="img" aria-label={onPick ? 'Нотный стан. Ноты можно добавить также кнопками под ним.' : `Нотная запись, ${bass ? 'басовый' : 'скрипичный'} ключ`} onClick={onPick ? e => { const rect = e.currentTarget.getBoundingClientRect(); const y = (e.clientY - rect.top) / rect.height * 150; onPick(candidates.reduce((best, n) => Math.abs(noteY(n, bass) - y) < Math.abs(noteY(best, bass) - y) ? n : best)); } : undefined}>
    {[44,56,68,80,92].map(y => <line key={y} x1="15" x2={width - 15} y1={y} y2={y} stroke="#afb4c6" strokeWidth="1" />)}
    <text x="22" y={bass ? 86 : 100} fontSize={bass ? 64 : 78} fontFamily="serif" fill="#363549">{bass ? '𝄢' : '𝄞'}</text>
    {notes.map((n, i) => { const x = 90 + i * 48, y = noteY(n, bass), beat = beats[i] ?? 1; const hollow = beat >= 2; return <g key={i} fill={active === i ? '#7161e8' : '#353449'} stroke={active === i ? '#7161e8' : '#353449'}>
      {[...Array(8)].map((_, j) => { const ledger = j < 4 ? 104 + j * 12 : 32 - (j - 4) * 12; return ((ledger >= 104 && y >= ledger) || (ledger <= 32 && y <= ledger)) ? <line key={j} x1={x - 13} x2={x + 13} y1={ledger} y2={ledger} strokeWidth="1.5" /> : null; })}
      <ellipse cx={x} cy={y} rx="8" ry="5.5" transform={`rotate(-18 ${x} ${y})`} fill={hollow ? 'white' : undefined} strokeWidth="2" />
      {beat < 4 && <line x1={x + 7} x2={x + 7} y1={y - 1} y2={y - 33} strokeWidth="2" />}
      {beat === 0.5 && <path d={`M${x + 7} ${y - 33} q18 9 3 23 q7 -14 -3 -15`} fill="currentColor" />}
    </g>; })}
  </svg></div>;
}

export function Keyboard({ onNote, selected = [], from = 60, labels = true }: { onNote: (n: number) => void; selected?: number[]; from?: number; labels?: boolean }) {
  const whites = whiteNotes.map(n => n + from - 60);
  const blacks = [{ after: 0, offset: 1 }, { after: 1, offset: 3 }, { after: 3, offset: 6 }, { after: 4, offset: 8 }, { after: 5, offset: 10 }];
  return <div className="keyboard" aria-label="Экранное пианино">
    {whites.map(n => <button key={n} className={`white-key ${selected.includes(n) ? 'pressed' : ''}`} aria-label={nameOf(n)} onClick={() => onNote(n)}>{labels && <span>{nameOf(n).replace(/\d/, '')}</span>}</button>)}
    {blacks.map(({ after, offset }) => <button key={offset} className={`black-key ${selected.includes(from + offset) ? 'pressed' : ''}`} style={{ left: `calc(${(after + 1) * 12.5}% - 3.4%)` }} aria-label={nameOf(from + offset)} onClick={() => onNote(from + offset)} />)}
  </div>;
}

export function Metronome({ bpm, onBpm }: { bpm: number; onBpm: (bpm: number) => void }) {
  const [running, setRunning] = useState(false), [beat, setBeat] = useState(0), [error, setError] = useState('');
  const generation = useRef(0);
  useEffect(() => {
    const token = ++generation.current;
    if (!running) return;
    let timer: ReturnType<typeof setInterval> | undefined; let scheduled = 0; const visuals: ReturnType<typeof setTimeout>[] = [];
    void audioContext().then(ctx => {
      if (generation.current !== token) return;
      let next = ctx.currentTime + 0.05;
      const schedule = () => { while (next < ctx.currentTime + 0.12) { const index = scheduled++ % 4; sound(ctx, index === 0 ? 91 : 84, next, 0.035, 0.08); visuals.push(setTimeout(() => setBeat(index), Math.max(0, (next - ctx.currentTime) * 1000))); next += 60 / bpm; } };
      schedule(); timer = setInterval(schedule, 25);
    }).catch(() => { setError('Звук недоступен в этом браузере.'); setRunning(false); });
    return () => { generation.current++; clearInterval(timer); visuals.forEach(clearTimeout); };
  }, [running, bpm]);
  useEffect(() => { const stop = () => { if (document.hidden) setRunning(false); }; document.addEventListener('visibilitychange', stop); return () => document.removeEventListener('visibilitychange', stop); }, []);
  return <div className="metronome"><div className="section-label"><Volume2 size={17} /> Метроном</div><div className="metronome-controls"><Button variant="secondary" aria-label={running ? 'Остановить метроном' : 'Включить метроном'} onClick={() => setRunning(!running)}>{running ? <Square size={16} /> : <Play size={16} />}</Button><label><input aria-label="Темп метронома" type="number" min="30" max="200" value={bpm} onChange={e => { const n = Number(e.target.value); if (n >= 30 && n <= 200) onBpm(n); }} /><span>BPM</span></label><div className="beats">{[0,1,2,3].map(n => <i key={n} className={running && beat === n ? 'lit' : ''} />)}</div></div>{error && <small role="alert">{error}</small>}</div>;
}

export function MidiConnect({ onNote }: { onNote: (note: number) => void }) {
  const [status, setStatus] = useState('Подключить пианино'), [pending, setPending] = useState(false);
  const access = useRef<MIDIAccess | null>(null), callback = useRef(onNote), connectedInputs = useRef<MIDIInput[]>([]); callback.current = onNote;
  function detach() { connectedInputs.current.forEach(input => input.onmidimessage = null); connectedInputs.current = []; }
  function bind() {
    detach(); const inputs = [...(access.current?.inputs.values() ?? [])]; connectedInputs.current = inputs;
    inputs.forEach(input => input.onmidimessage = e => { if (e.data && (e.data[0] & 0xf0) === 0x90 && e.data[2] > 0) callback.current(e.data[1]); });
    setStatus(inputs.length ? inputs.map(i => i.name || 'MIDI-пианино').join(', ') : 'Нет MIDI-устройств. Проверьте USB.');
  }
  async function connect() {
    const nav = navigator;
    if (!nav.requestMIDIAccess) { setStatus('Web MIDI недоступен. Попробуйте Chrome или Edge на компьютере.'); return; }
    setPending(true);
    try { if (access.current) access.current.onstatechange = null; detach(); const midi = await nav.requestMIDIAccess({ sysex: false }); access.current = midi; midi.onstatechange = bind; bind(); } catch { setStatus('Доступ к MIDI не получен. Проверьте разрешение браузера.'); } finally { setPending(false); }
  }
  useEffect(() => () => { if (access.current) access.current.onstatechange = null; detach(); }, []);
  return <div className="midi"><Button variant="secondary" onClick={() => void connect()} disabled={pending}><Music2 size={17} />{pending ? 'Подключение…' : 'USB-MIDI'}</Button><span role="status">{status}</span></div>;
}
