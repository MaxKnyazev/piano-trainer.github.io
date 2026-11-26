import type { Score } from './storage';

export async function readScoreFile(file: File): Promise<Pick<Score, 'type' | 'data' | 'fileName'>> {
  if (file.size > 1024 * 1024) throw new Error('Выберите файл до 1 МБ. Более крупный оригинал можно хранить на компьютере.');
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'xml' || ext === 'musicxml') {
    const xml = await file.text(), doc = new DOMParser().parseFromString(xml, 'application/xml');
    if (doc.querySelector('parsererror') || !['score-partwise','score-timewise'].includes(doc.documentElement.tagName) || /<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error('Ожидается корректный MusicXML без внешних объявлений.');
    return { type: 'xml', data: xml, fileName: file.name };
  }
  if (ext !== 'pdf' && !['png','jpg','jpeg','webp'].includes(ext ?? '')) throw new Error('Поддерживаются PDF, PNG, JPG, WebP и несжатый MusicXML.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 ? 'application/pdf'
    : bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 ? 'image/png'
    : bytes[0] === 0xff && bytes[1] === 0xd8 ? 'image/jpeg'
    : String.fromCharCode(...bytes.slice(0,4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8,12)) === 'WEBP' ? 'image/webp' : '';
  if (!mime || (ext === 'pdf') !== (mime === 'application/pdf')) throw new Error('Содержимое файла не соответствует поддерживаемому формату.');
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('Не удалось прочитать файл.'));
    reader.readAsDataURL(new Blob([bytes], { type: mime }));
  });
  return { type: mime === 'application/pdf' ? 'pdf' : 'image', data, fileName: file.name };
}
