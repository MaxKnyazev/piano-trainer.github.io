import { useEffect, useRef, useState } from 'react';
import { FileMusic, FilePlus2, Search, Trash2, Upload } from 'lucide-react';
import { Button, Modal } from './ui';
import type { Score, State } from './storage';
import { download } from './storage';
import type { Update } from './Trainers';

function SheetViewer({ score }: { score: Score }) {
  const container = useRef<HTMLDivElement>(null); const [error, setError] = useState(''), [loading, setLoading] = useState(score.type === 'xml');
  const [pdfUrl, setPdfUrl] = useState('');
  useEffect(() => {
    if (score.type !== 'pdf' || !score.data) return;
    const binary = atob(score.data.split(',')[1]); const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' })); setPdfUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [score]);
  useEffect(() => {
    if (score.type !== 'xml' || !score.data || !container.current) return;
    let cancelled = false; let display: { clear: () => void } | undefined;
    const target = container.current; setLoading(true); setError('');
    void import('opensheetmusicdisplay').then(async ({ OpenSheetMusicDisplay }) => {
      if (cancelled) return;
      // A dedicated element prevents asynchronous renders from sharing a viewer.
      const child = document.createElement('div'); target.replaceChildren(child);
      const osmd = new OpenSheetMusicDisplay(child, { autoResize: false, backend: 'svg', drawTitle: true }); display = osmd;
      await osmd.load(score.data!); if (cancelled) return; osmd.render(); setLoading(false);
    }).catch(() => { if (!cancelled) { setError('Не удалось прочитать MusicXML. Проверьте файл в нотном редакторе.'); setLoading(false); } });
    return () => { cancelled = true; display?.clear(); target.replaceChildren(); };
  }, [score]);
  if (!score.data) return <div className="empty-state"><FileMusic size={40} /><h3>Здесь ваши заметки о произведении</h3><p>Файл можно добавить отдельной записью в библиотеке.</p></div>;
  return <>{score.type === 'image' && <img className="sheet-image" src={score.data} alt={`Ноты: ${score.title}`} />}{score.type === 'pdf' && pdfUrl && <object className="pdf-viewer" data={pdfUrl} type="application/pdf"><p>Встроенный просмотр PDF недоступен. Скачайте файл кнопкой ниже.</p></object>}{score.type === 'xml' && <>{loading && <p role="status">Подготавливаем нотный лист…</p>}{error && <p role="alert">{error}</p>}<div className="xml-sheet" ref={container} /></>}</>;
}

export function Library({ state, update }: { state: State; update: Update }) {
  const [search, setSearch] = useState(''), [adding, setAdding] = useState(false), [title, setTitle] = useState(''), [author, setAuthor] = useState(''), [file, setFile] = useState<File | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), [selectedId, setSelectedId] = useState<string | null>(null), [deleting, setDeleting] = useState(false);
  const selected = state.scores.find(s => s.id === selectedId);
  const filtered = state.scores.filter(s => `${s.title} ${s.author}`.toLowerCase().includes(search.toLowerCase()));
  async function add() {
    if (!title.trim()) { setError('Укажите название произведения.'); return; }
    setBusy(true); setError('');
    try {
      const score: Score = { id: crypto.randomUUID(), title: title.trim(), author: author.trim(), status: 'Хочу выучить', notes: '' };
      if (file) {
        if (file.size > 1024 * 1024) throw new Error('Для этой версии выберите файл до 1 МБ. Можно добавить запись без файла, а оригинал хранить на компьютере.');
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (ext === 'xml' || ext === 'musicxml') { const xml = await file.text(); const doc = new DOMParser().parseFromString(xml, 'application/xml'); if (doc.querySelector('parsererror') || !['score-partwise','score-timewise'].includes(doc.documentElement.tagName) || /<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error('Ожидается корректный MusicXML без внешних объявлений.'); score.type = 'xml'; score.data = xml; }
        else if (ext === 'pdf' || ['png','jpg','jpeg','webp'].includes(ext ?? '')) {
          const bytes = new Uint8Array(await file.arrayBuffer());
          const detected = bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 ? 'application/pdf' : bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 ? 'image/png' : bytes[0] === 0xff && bytes[1] === 0xd8 ? 'image/jpeg' : String.fromCharCode(...bytes.slice(0,4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8,12)) === 'WEBP' ? 'image/webp' : '';
          if (!detected || (ext === 'pdf') !== (detected === 'application/pdf')) throw new Error('Содержимое файла не соответствует поддерживаемому формату.');
          score.type = detected === 'application/pdf' ? 'pdf' : 'image';
          score.data = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('Не удалось прочитать файл.')); reader.readAsDataURL(new Blob([bytes], { type: detected })); });
        } else throw new Error('Поддерживаются PDF, PNG, JPG, WebP и несжатый MusicXML.');
        score.fileName = file.name;
      }
      if (update(s => ({ ...s, scores: [...s.scores, score] }))) { setAdding(false); setTitle(''); setAuthor(''); setFile(null); }
    } catch (e) { setError(e instanceof Error ? e.message : 'Не удалось добавить файл.'); } finally { setBusy(false); }
  }
  function patchScore(patch: Partial<Score>) { if (selected) update(s => ({ ...s, scores: s.scores.map(score => score.id === selected.id ? { ...score, ...patch } : score) })); }
  return <>
    <div className="page-heading"><div><div className="eyebrow">МУЗЫКА, К КОТОРОЙ ХОЧЕТСЯ ВОЗВРАЩАТЬСЯ</div><h1>Мои ноты</h1><p>Собирайте репертуар и сохраняйте заметки о разборе.</p></div><Button onClick={() => { setAdding(true); setError(''); }}><FilePlus2 size={18} />Добавить произведение</Button></div>
    <div className="library-toolbar"><label className="search"><Search size={18} /><input placeholder="Название или автор" aria-label="Поиск произведений" value={search} onChange={e => setSearch(e.target.value)} /></label><span className="muted">{state.scores.length} произведений</span></div>
    {!filtered.length ? <div className="card empty-state"><div className="empty-icon"><FileMusic size={32} /></div><h2>{search ? 'Ничего не найдено' : 'Ваш репертуар начинается здесь'}</h2><p>{search ? 'Попробуйте другое название или имя автора.' : 'Добавьте любимую пьесу, учебные ноты или собственное упражнение.'}</p>{!search && <Button variant="secondary" onClick={() => setAdding(true)}><Upload size={17} />Добавить первые ноты</Button>}</div> : <div className="score-grid">{filtered.map(s => <button className="card score-card" key={s.id} onClick={() => setSelectedId(s.id)}><div className="score-cover"><FileMusic size={38} /><span>{s.type === 'xml' ? 'MusicXML' : s.type === 'pdf' ? 'PDF' : s.type === 'image' ? 'Изображение' : 'Заметки'}</span><div className="cover-lines">{[0,1,2,3,4].map(i => <i key={i} />)}</div></div><div className="score-info"><span className="tag lavender">{s.status}</span><h3>{s.title}</h3><p>{s.author || 'Автор не указан'}</p></div></button>)}</div>}
    <div className="local-notice"><Upload size={18} /><p>Файлы остаются в этом браузере. До 1 МБ на файл, общий объём ограничен браузером. Делайте резервную копию в настройках.</p></div>
    <Modal open={adding} onOpenChange={setAdding} title="Новое произведение" description="Добавьте файл или сохраните название и заметки."><form onSubmit={e => { e.preventDefault(); void add(); }}><label className="field">Название<input value={title} onChange={e => setTitle(e.target.value)} maxLength={160} required placeholder="Например, Прелюдия до мажор" /></label><label className="field">Автор<input value={author} onChange={e => setAuthor(e.target.value)} maxLength={160} placeholder="Композитор или исполнитель" /></label><label className="file-drop"><Upload size={28} /><strong>{file?.name || 'Выберите нотный файл'}</strong><span>PDF, PNG, JPG, WebP, MusicXML · до 1 МБ</span><input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.xml,.musicxml" onChange={e => setFile(e.target.files?.[0] ?? null)} /></label>{file && <Button variant="ghost" type="button" onClick={() => setFile(null)}>Убрать файл</Button>}{error && <p className="error" role="alert">{error}</p>}<Button type="submit" disabled={busy}>{busy ? 'Сохраняем…' : 'Добавить в библиотеку'}</Button></form></Modal>
    <Modal open={!!selected} onOpenChange={open => { if (!open) { setSelectedId(null); setDeleting(false); } }} title={selected?.title ?? 'Произведение'} description={selected?.author || 'Личная библиотека'} wide>{selected && <><SheetViewer key={selected.id} score={selected} /><div className="score-edit"><label className="field">Этап изучения<select value={selected.status} onChange={e => patchScore({ status: e.target.value })}>{['Хочу выучить','Разбираю','Повторяю','Готово'].map(v => <option key={v}>{v}</option>)}</select></label><label className="field">Заметки и задача на следующее занятие<textarea rows={3} value={selected.notes} onChange={e => patchScore({ notes: e.target.value })} placeholder="Рабочий темп, аппликатура, трудные такты…" /></label><div className="row wrap">{selected.data && <Button variant="secondary" onClick={() => { if (selected.type === 'xml') download(selected.fileName || 'score.musicxml', selected.data!, 'application/vnd.recordare.musicxml+xml'); else { const link = document.createElement('a'); link.href = selected.data!; link.download = selected.fileName || 'score'; link.click(); } }}>Скачать оригинал</Button>}<Button variant="ghost" onClick={() => setDeleting(true)}><Trash2 size={16} />Удалить</Button></div>{deleting && <div className="delete-confirm"><p>Удалить произведение и его заметки из этого браузера?</p><div className="row"><Button variant="secondary" onClick={() => setDeleting(false)}>Оставить</Button><Button onClick={() => { if (update(s => ({ ...s, scores: s.scores.filter(score => score.id !== selected.id) }))) { setSelectedId(null); setDeleting(false); } }}>Удалить произведение</Button></div></div>}</div></>}</Modal>
  </>;
}
