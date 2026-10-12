import { getFile } from './store';
export const backend = window.mewbookDesktop?.library;
export async function startLibrary(seeds) {
  const parse = (k, f) => {
    try {
      return JSON.parse(localStorage.getItem(k)) ?? f;
    } catch {
      return f;
    }
  };
  const custom = parse('mw_custom', {}),
    notes = parse('mw_notes', {});
  await backend('initialize', { seeds, legacy: { custom, notes } });
  const done = new Set(await backend('migrationStatus')),
    errors = [];
  for (const b of parse('mw_imported', [])) {
    if (done.has(b.id)) continue;
    try {
      const item = await getFile(b.id);
      if (!item?.file) throw new Error('Thiếu file IndexedDB cũ');
      if (item.file.size > 64 * 1024 * 1024)
        throw new Error(
          'File cũ lớn hơn 64 MB; dùng hộp thoại Thêm sách để nhập lại file gốc',
        );
      const legacy = { ...b, ...custom[b.id] };
      const r = await backend('importBytes', {
        name: item.file.name,
        bytes: new Uint8Array(await item.file.arrayBuffer()),
        legacy,
      });
      if (custom[b.id])
        await backend('patch', { id: r.book.id, values: custom[b.id] });
      for (const n of notes[b.id] || [])
        await backend('noteAdd', { id: r.book.id, text: n.text, legacy: n });
      await backend('migrationDone', { ids: [b.id] });
    } catch (e) {
      errors.push(b.title + ': ' + e.message);
    }
  }
  const snapshot = await backend('snapshot');
  return { ...snapshot, migrationErrors: errors };
}
