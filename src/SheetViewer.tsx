import { useEffect, useRef, useState } from 'react';
import { FileMusic } from 'lucide-react';
import type { Score } from './storage';

export function SheetViewer({ score }: { score: Score }) {
  const container = useRef<HTMLDivElement>(null); const [error, setError] = useState(''), [loading, setLoading] = useState(score.type === 'xml');
  const [pdfUrl, setPdfUrl] = useState('');
  useEffect(() => {
    if (score.type !== 'pdf' || !score.data) return;
    const binary = atob(score.data.split(',')[1]); const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' })); setPdfUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [score.data, score.type]);
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
  }, [score.data, score.type]);
  if (!score.data) return <div className="empty-state"><FileMusic size={40} /><h3>Здесь ваши заметки о произведении</h3><p>Файл можно добавить отдельной записью в библиотеке.</p></div>;
  return <>{score.type === 'image' && <img className="sheet-image" src={score.data} alt={`Ноты: ${score.title}`} />}{score.type === 'pdf' && pdfUrl && <object className="pdf-viewer" data={pdfUrl} type="application/pdf"><p>Встроенный просмотр PDF недоступен. Скачайте файл кнопкой ниже.</p></object>}{score.type === 'xml' && <>{loading && <p role="status">Подготавливаем нотный лист…</p>}{error && <p role="alert">{error}</p>}<div className="xml-sheet" ref={container} /></>}</>;
}
