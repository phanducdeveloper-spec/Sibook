'use strict';
// Cong cu quan ly thu vien: trung lap, tim lai file, don dep, tac gia, hang loat, phan loai,
// gom sach, CSV, sao luu/khoi phuc, gui may doc, chuyen dinh dang, tra cuu thong tin tren mang.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFile } = require('node:child_process');
const { norm, hashFile } = require('./library.cjs');
const { CATEGORIES } = require('./categories.cjs');
const assert = (c, m) => { if (!c) throw new Error(m); };
const validId = (id) => typeof id === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(id);
const DEFAULT_DESC = /^(Tài liệu lưu trong kho file|Liên kết chỉ đọc)/;
const UNKNOWN = (v) => !v || v === 'Chưa cập nhật' || v === 'Chưa rõ tác giả';
const words = (s) => ' ' + norm(s).replace(/[^a-z0-9]+/g, ' ').trim() + ' ';
const stamp = () => new Date().toISOString().slice(0, 16).replace(/[-:]/g, '').replace('T', '-');
const AUTHOR = { name: 'Phan Đức' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function applyPendingRestore(root) {
  const pend = path.join(root, 'restore-pending');
  if (!fs.existsSync(path.join(pend, 'library.sqlite'))) return false;
  const live = path.join(root, 'library');
  const bak = path.join(root, 'library-before-restore-' + stamp());
  if (fs.existsSync(live)) fs.renameSync(live, bak);
  fs.mkdirSync(live, { recursive: true });
  fs.renameSync(path.join(pend, 'library.sqlite'), path.join(live, 'library.sqlite'));
  const move = (name) => {
    if (fs.existsSync(path.join(pend, name))) fs.renameSync(path.join(pend, name), path.join(live, name));
    else if (fs.existsSync(path.join(bak, name))) fs.renameSync(path.join(bak, name), path.join(live, name));
  };
  move('covers');
  move('files');
  move('rendered');
  fs.rmSync(pend, { recursive: true, force: true });
  return true;
}

function createTools(lib, { dialog, shell, app, getWindow, changed }) {
  const db = lib.db;
  const win = () => getWindow();
  const list = (x, max = 50000) => {
    assert(Array.isArray(x) && x.length <= max && x.every(validId), 'Danh sách sách không hợp lệ');
    return [...new Set(x)];
  };
  const books = () => lib.list().filter((b) => !b.demo);
  const fileOf = (b) => { try { return lib.file(b.id); } catch { return null; } };
  const keyOf = (id) => db.prepare('SELECT file_key, sha FROM books WHERE id=?').get(id) || {};
  const sizeOf = (b) => {
    if (b.linked) return b.sourceSize || 0;
    const k = keyOf(b.id).file_key;
    try { return k ? fs.statSync(path.join(lib.files, k)).size : 0; } catch { return 0; }
  };
  const titleKey = (t) => norm(t)
    .replace(/\.(pdf|epub|mobi|azw3?|docx?|pptx?|txt|djvu|cbz|cbr|fb2)$/, '')
    .replace(/\(\d+\)|\bcopy\b|\bban sao\b|\bebook\b|\bfull\b|\[[^\]]*\]/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ').trim();
  const pickDir = async (title) => {
    const r = await dialog.showOpenDialog(win(), { title, properties: ['openDirectory', 'createDirectory'] });
    return r.canceled ? null : r.filePaths[0];
  };
  const safeName = (s) => String(s || '').replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/[. ]+$/, '').trim().slice(0, 120) || 'Khác';
  const uniquePath = (dir, name) => {
    let p = path.join(dir, name);
    const ext = path.extname(name), base = path.basename(name, ext);
    for (let i = 2; fs.existsSync(p); i++) p = path.join(dir, `${base} (${i})${ext}`);
    return p;
  };
  const fileName = (b, src) => {
    const n = b.linked ? path.basename(src) : path.basename(String(b.filePath || ''));
    return safeName(n && path.extname(n) ? n : safeName(b.title) + path.extname(src));
  };
  const writableDir = (dir) => { lib.assertWritableDestination(path.join(dir, '__sibook_check__')); return dir; };
  const linkedId = (root, rel) => 'linked-' + crypto.createHash('sha256')
    .update(process.platform === 'win32' ? (root + '\0' + rel).toLowerCase() : root + '\0' + rel).digest('hex');
  const setData = (id, d) => db.prepare('UPDATE books SET data=? WHERE id=?').run(JSON.stringify(d), id);
  const dataOf = (id) => JSON.parse(lib.row(id).data);
  const tx = (fn) => {
    db.exec('BEGIN IMMEDIATE');
    try { const r = fn(); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; }
  };
  const moveCover = (from, to) => {
    const c = lib.coverFile(from);
    if (c && !lib.coverFile(to)) { try { fs.renameSync(c, path.join(lib.covers, to + path.extname(c))); } catch {} }
    lib.clearCover(from);
  };
  // gop du lieu nguoi dung tu sach cu (mat file) vao sach moi
  function mergeInto(oldId, newId) {
    const o = dataOf(oldId), n = dataOf(newId);
    const custom = (k) => !UNKNOWN(o[k]) && UNKNOWN(n[k]);
    for (const k of ['author', 'publisher', 'year', 'isbn']) if (custom(k)) n[k] = o[k];
    if (o.description && !DEFAULT_DESC.test(o.description) && DEFAULT_DESC.test(n.description || '')) n.description = o.description;
    if (o.aiSummary && !n.aiSummary) { n.aiSummary = o.aiSummary; n.summarySource = o.summarySource; }
    n.progress = Math.max(o.progress || 0, n.progress || 0);
    n.favorite = !!(o.favorite || n.favorite);
    n.toRead = !!(o.toRead || n.toRead);
    n.rating = n.rating || o.rating;
    n.review = n.review || o.review;
    n.hashtags = [...new Set([...(n.hashtags || []), ...(o.hashtags || [])])];
    n.collections = [...new Set([...(n.collections || []), ...(o.collections || [])])];
    if (String(o.openedAt || '') > String(n.openedAt || '')) n.openedAt = o.openedAt;
    if (!n.location && o.location) n.location = o.location;
    const base = (x) => path.basename(String(x.filePath || ''), path.extname(String(x.filePath || '')));
    if (o.title && o.title !== base(o) && n.title === base(n)) n.title = o.title;
    const od = db.prepare('SELECT length(text) AS n FROM documents WHERE id=?').get(oldId), nd = db.prepare('SELECT length(text) AS n FROM documents WHERE id=?').get(newId);
    const moveDoc = !!(od && od.n && !(nd && nd.n));
    if (moveDoc && o.pages) n.pages = o.pages;
    tx(() => {
      if (moveDoc) {
        db.prepare('DELETE FROM documents WHERE id=?').run(newId);
        db.prepare('UPDATE documents SET id=? WHERE id=?').run(newId, oldId);
        if (lib.getSetting('ot2:' + oldId)) lib.setSetting('ot2:' + newId, true);
      }
      setData(newId, n);
      db.prepare('UPDATE notes SET book_id=? WHERE book_id=?').run(newId, oldId);
      db.prepare('DELETE FROM search_index WHERE rowid=(SELECT rowid FROM books WHERE id=?)').run(oldId);
      db.prepare('DELETE FROM books WHERE id=?').run(oldId);
    });
    moveCover(oldId, newId);
    lib.reindex(newId);
  }
  const copyRows = () => db.prepare("SELECT * FROM books WHERE file_key IS NOT NULL AND deleted IS NULL AND coalesce(json_extract(data,'$.linked'),0)=0").all();
  const dropCopyFile = (key) => {
    if (!key || db.prepare('SELECT id FROM books WHERE file_key=? LIMIT 1').get(key)) return;
    try { fs.unlinkSync(path.join(lib.files, key)); } catch {}
  };
  function relocate(id, real) {
    const roots = lib.getSetting('linkedRoots', []);
    let root = roots.filter((r) => lib.contained(r, real)).sort((a, b) => b.length - a.length)[0];
    if (!root) root = lib.authorizeRoot(path.dirname(real));
    const rel = path.relative(root, real), nid = linkedId(root, rel), st = fs.statSync(real);
    if (nid === id) {
      const d = dataOf(id);
      Object.assign(d, { missing: false, filePath: real, sourceSize: st.size, sourceMtime: st.mtimeMs });
      setData(id, d); lib.reindex(id); return id;
    }
    if (db.prepare('SELECT id FROM books WHERE id=?').get(nid)) { mergeInto(id, nid); return nid; }
    const d = dataOf(id);
    Object.assign(d, { id: nid, missing: false, linked: true, readOnly: true, filePath: real, sourceRoot: root, sourceRelative: rel, sourceSize: st.size, sourceMtime: st.mtimeMs, folder: path.basename(root) });
    tx(() => {
      const r = lib.row(id);
      db.prepare('INSERT INTO books VALUES(?,?,?,?,?,NULL)').run(nid, JSON.stringify(d), r.file_key, r.sha, r.added);
      db.prepare('UPDATE notes SET book_id=? WHERE book_id=?').run(nid, id);
      db.prepare('DELETE FROM search_index WHERE rowid=(SELECT rowid FROM books WHERE id=?)').run(id);
      db.prepare('DELETE FROM books WHERE id=?').run(id);
    });
    moveCover(id, nid);
    lib.reindex(nid);
    return nid;
  }

  const T = {
    async duplicates() {
      const all = books();
      const bySize = new Map();
      for (const b of all) {
        if (b.missing) continue;
        const s = sizeOf(b);
        if (s) (bySize.get(s) || bySize.set(s, []).get(s)).push(b);
      }
      const groups = [], inSame = new Set();
      for (const [size, l] of bySize) {
        if (l.length < 2) continue;
        const byHash = new Map();
        for (const b of l) {
          let h = keyOf(b.id).sha;
          if (!h && b.sourceSha && b.sourceShaMtime === b.sourceMtime) h = b.sourceSha;
          if (!h) {
            const f = fileOf(b);
            if (!f) continue;
            try { h = await hashFile(f); } catch { continue; }
            const d = dataOf(b.id); d.sourceSha = h; d.sourceShaMtime = d.sourceMtime; setData(b.id, d);
          }
          (byHash.get(h) || byHash.set(h, []).get(h)).push(b.id);
        }
        for (const ids of byHash.values()) if (ids.length > 1) { groups.push({ kind: 'same', size, ids }); ids.forEach((i) => inSame.add(i)); }
      }
      const byTitle = new Map();
      for (const b of all) {
        const k = titleKey(b.title);
        if (k.length >= 4) (byTitle.get(k) || byTitle.set(k, []).get(k)).push(b.id);
      }
      for (const ids of byTitle.values()) if (ids.length > 1 && ids.some((i) => !inSame.has(i))) groups.push({ kind: 'title', ids });
      return { groups: groups.slice(0, 3000), scanned: all.length };
    },
    async relinkAuto() {
      const all = books();
      const missing = all.filter((b) => b.missing && b.linked);
      const res = { missing: missing.length, merged: 0, relocated: 0, notFound: 0 };
      const key = (b) => path.basename(String(b.sourceRelative || b.filePath || '')).toLowerCase() + '|' + (b.sourceSize || 0);
      const live = new Map(all.filter((b) => b.linked && !b.missing).map((b) => [key(b), b]));
      for (const m of missing) {
        const twin = live.get(key(m));
        if (twin) { mergeInto(m.id, twin.id); res.merged++; continue; }
        // thu cung duong dan tuong doi trong cac thu muc lien ket khac (vd. doi o dia)
        let found = null;
        for (const root of lib.getSetting('linkedRoots', [])) {
          const c = path.join(root, m.sourceRelative || '');
          try { if (fs.statSync(c).isFile() && fs.statSync(c).size === m.sourceSize) { found = fs.realpathSync(c); break; } } catch {}
        }
        if (found) { relocate(m.id, found); res.relocated++; } else res.notFound++;
      }
      if (res.merged || res.relocated) lib.log('relink', `Tìm lại file: ${res.merged + res.relocated} sách đã nối lại, ${res.notFound} chưa tìm thấy`);
      changed();
      return res;
    },
    async relinkManual({ id }) {
      const b = lib.book(lib.row(id));
      assert(b.linked, 'Chỉ nối lại được sách liên kết thư mục');
      const ext = path.extname(String(b.sourceRelative || b.filePath || '')).slice(1);
      const r = await dialog.showOpenDialog(win(), { title: 'Chọn file mới cho: ' + b.title, properties: ['openFile'], filters: ext ? [{ name: ext.toUpperCase(), extensions: [ext] }, { name: 'Tất cả', extensions: ['*'] }] : [] });
      if (r.canceled) return null;
      const nid = relocate(id, fs.realpathSync(r.filePaths[0]));
      changed();
      return { id: nid };
    },
    cleanupScan() {
      const all = lib.list();
      const keys = new Set(db.prepare('SELECT file_key FROM books WHERE file_key IS NOT NULL').all().map((r) => r.file_key));
      const ids = new Set(db.prepare('SELECT id FROM books').all().map((r) => r.id));
      const orphanFiles = fs.readdirSync(lib.files).filter((f) => !keys.has(f));
      const orphanCovers = fs.readdirSync(lib.covers).filter((f) => !ids.has(f.replace(/\.(jpg|png|webp)(\.tmp)?$/, '')));
      const stale = db.prepare("SELECT key FROM settings WHERE key LIKE 'ot2:%'").all().filter((r) => !ids.has(r.key.slice(4))).length;
      const bytes = (dir, l) => l.reduce((s, f) => { try { return s + fs.statSync(path.join(dir, f)).size; } catch { return s; } }, 0);
      let dbBytes = 0;
      try { dbBytes = fs.statSync(path.join(lib.root, 'library', 'library.sqlite')).size; } catch {}
      return {
        missing: all.filter((b) => b.missing).length,
        demo: all.filter((b) => b.demo).length,
        orphanFiles: orphanFiles.length, orphanFilesBytes: bytes(lib.files, orphanFiles),
        orphanCovers: orphanCovers.length, orphanCoversBytes: bytes(lib.covers, orphanCovers),
        stale, dbBytes,
      };
    },
    cleanupRun(o = {}) {
      const out = { trashed: 0, files: 0, covers: 0, settings: 0, vacuum: false };
      for (const b of lib.list()) if ((o.missing && b.missing) || (o.demo && b.demo)) { lib.trash(b.id); out.trashed++; }
      if (o.orphans) {
        const keys = new Set(db.prepare('SELECT file_key FROM books WHERE file_key IS NOT NULL').all().map((r) => r.file_key));
        const ids = new Set(db.prepare('SELECT id FROM books').all().map((r) => r.id));
        for (const f of fs.readdirSync(lib.files)) if (!keys.has(f)) { try { fs.unlinkSync(path.join(lib.files, f)); out.files++; } catch {} }
        for (const f of fs.readdirSync(lib.covers)) if (!ids.has(f.replace(/\.(jpg|png|webp)(\.tmp)?$/, ''))) { try { fs.unlinkSync(path.join(lib.covers, f)); out.covers++; } catch {} }
        for (const r of db.prepare("SELECT key FROM settings WHERE key LIKE 'ot2:%'").all()) if (!ids.has(r.key.slice(4))) { db.prepare('DELETE FROM settings WHERE key=?').run(r.key); out.settings++; }
      }
      if (o.vacuum) { db.exec('VACUUM'); out.vacuum = true; }
      lib.log('cleanup', `Dọn dẹp: ${out.trashed} sách vào thùng rác, ${out.files} file thừa, ${out.covers} bìa thừa`);
      changed();
      return out;
    },
    // Ban sao cu trong AppData\\library\\files: noi lai voi file goc roi xoa ban sao.
    copiesInfo() {
      const rows = copyRows();
      let bytes = 0, filesBytes = 0, filesCount = 0;
      for (const r of rows) { try { bytes += fs.statSync(path.join(lib.files, r.file_key)).size; } catch {} }
      try { for (const f of fs.readdirSync(lib.files)) { try { filesBytes += fs.statSync(path.join(lib.files, f)).size; filesCount++; } catch {} } } catch {}
      return { copies: rows.length, bytes, filesDir: lib.files, filesCount, filesBytes, watched: lib.getSetting('watched', []) };
    },
    async copiesRelink({ dir = null } = {}) {
      if (!dir) dir = await pickDir('Chọn thư mục thư viện gốc chứa các sách đã bị sao chép');
      if (!dir) return null;
      const root = await lib.serial(async () => {
        const c = lib.authorizeRoot(dir);
        await lib.linkFolder(c, changed);
        lib.setSetting('watched', [...new Set([...lib.getSetting('watched', []), c])]);
        lib.watch(c, changed);
        return c;
      });
      const copies = copyRows();
      const bySize = new Map();
      for (const r of copies) {
        let size = 0;
        try { size = fs.statSync(path.join(lib.files, r.file_key)).size; } catch { continue; }
        (bySize.get(size) || bySize.set(size, []).get(size)).push(r);
      }
      const out = { root, copies: copies.length, matched: 0, freed: 0, remaining: 0, errors: 0 };
      const linked = db.prepare("SELECT id, data FROM books WHERE deleted IS NULL AND json_extract(data,'$.linked')=1 AND json_extract(data,'$.sourceRoot')=?").all(root);
      let n = 0;
      for (const L of linked) {
        const lb = JSON.parse(L.data), cands = bySize.get(lb.sourceSize);
        if (!cands?.length || lb.missing) continue;
        let sha;
        try { sha = await hashFile(lib.linkedFile(lb)); } catch { out.errors++; continue; }
        const i = cands.findIndex((r) => r.sha === sha);
        if (i < 0) continue;
        const c = cands.splice(i, 1)[0];
        try { await lib.serial(async () => { mergeInto(c.id, L.id); dropCopyFile(c.file_key); }); out.matched++; out.freed += lb.sourceSize; } catch { out.errors++; }
        if (++n % 25 === 0) { changed(); await sleep(0); }
      }
      out.remaining = copyRows().length;
      lib.log('copies', `Nối lại ${out.matched} sách với file gốc trong ${root}, xóa bản sao (${(out.freed / 1073741824).toFixed(2)} GB); còn ${out.remaining} bản sao`);
      changed();
      return out;
    },
    async copiesMoveOut() {
      const rows = copyRows();
      if (!rows.length) return { moved: 0 };
      const dir = await pickDir(`Chọn thư mục để chuyển ${rows.length} sách còn lại ra khỏi AppData`);
      if (!dir) return null;
      const real = fs.realpathSync(dir);
      assert(!lib.contained(fs.realpathSync(lib.root), real), 'Hãy chọn thư mục ngoài dữ liệu SI Book');
      const out = { dir: real, moved: 0, errors: [] };
      for (const r of rows) {
        const src = path.join(lib.files, r.file_key);
        try {
          const b = JSON.parse(r.data);
          const target = uniquePath(real, fileName(b, src));
          await fs.promises.copyFile(src, target, fs.constants.COPYFILE_EXCL);
          assert((await hashFile(target)) === r.sha, 'Sao chép không khớp nội dung');
          await lib.serial(async () => { const nb = (await lib.linkFile(target, { extract: false })).book; mergeInto(r.id, nb.id); dropCopyFile(r.file_key); });
          out.moved++;
        } catch (e) { out.errors.push(String(e.message).slice(0, 200)); }
        if (out.moved % 25 === 0) { changed(); await sleep(0); }
      }
      lib.log('copies', `Chuyển ${out.moved} sách từ AppData sang ${real}`);
      changed();
      return out;
    },
    renameAuthor({ from, to }) {
      const froms = (Array.isArray(from) ? from : [from]).map((s) => String(s));
      assert(froms.length && froms.length <= 200, 'Danh sách tác giả không hợp lệ');
      assert(typeof to === 'string' && to.trim() && to.length <= 300, 'Tên tác giả mới không hợp lệ');
      let n = 0;
      for (const b of lib.list()) if (froms.includes(b.author) && b.author !== to.trim()) { lib.patch(b.id, { author: to.trim() }); n++; }
      changed();
      return { updated: n };
    },
    batch({ ids, values = {}, addTags = [], removeTags = [], addCollections = [], removeCollections = [], trash = false }) {
      ids = list(ids);
      let n = 0;
      for (const id of ids) {
        if (trash) { lib.trash(id); n++; continue; }
        const b = lib.book(lib.row(id));
        const v = { ...values };
        if (addTags.length || removeTags.length) v.hashtags = [...new Set([...(b.hashtags || []), ...addTags])].filter((t) => !removeTags.includes(t));
        if (addCollections.length || removeCollections.length) v.collections = [...new Set([...(b.collections || []), ...addCollections])].filter((t) => !removeCollections.includes(t));
        if (Object.keys(v).length) { lib.patch(id, v); n++; }
      }
      changed();
      return { updated: n };
    },
    classify({ apply = false, onlyNew = true, ids = null } = {}) {
      const catTags = CATEGORIES.map((c) => c[0]);
      const docText = db.prepare('SELECT substr(text,1,4000) AS t FROM documents WHERE id=?');
      const scope = ids ? new Set(list(ids)) : null;
      const out = { scanned: 0, matched: 0, perTag: {}, sample: [] };
      for (const b of books()) {
        if (scope && !scope.has(b.id)) continue;
        if (onlyNew && (b.hashtags || []).some((t) => catTags.includes(t))) continue;
        out.scanned++;
        const parts = [
          [words(b.title), 3],
          [words([b.folder, b.sourceRelative, b.filePath].join(' ')), 2],
          [words([DEFAULT_DESC.test(b.description || '') ? '' : b.description, b.aiSummary, docText.get(b.id)?.t].join(' ')), 1],
        ];
        const scores = CATEGORIES.map(([tag, kws]) => [tag, parts.reduce((s, [txt, w]) => s + w * kws.reduce((k, kw) => k + (txt.includes(' ' + kw + ' ') ? 1 : 0), 0), 0)]);
        if (['CBZ', 'CBR'].includes(String(b.format).toUpperCase())) scores.find((s) => s[0] === 'thiếu-nhi-truyện-tranh')[1] += 3;
        scores.sort((a, b) => b[1] - a[1]);
        const best = scores[0][1];
        if (best < 2) continue;
        const tags = scores.filter((s, i) => i < 2 && s[1] >= Math.max(2, best * 0.6)).map((s) => s[0]);
        out.matched++;
        for (const t of tags) out.perTag[t] = (out.perTag[t] || 0) + 1;
        if (out.sample.length < 40) out.sample.push({ title: b.title, tags });
        if (apply) lib.patch(b.id, { hashtags: [...new Set([...(b.hashtags || []), ...tags])] });
      }
      if (apply) { lib.log('classify', `Tự động phân loại ${out.matched}/${out.scanned} sách`); changed(); }
      return out;
    },
    tagByFolder({ apply = false, mode = 'parent' } = {}) {
      const skip = new Set(['sach', 'books', 'book', 'ebook', 'ebooks', 'tai lieu', 'new folder', 'download', 'downloads', 'documents', 'thu vien', 'library']);
      const toTag = (s) => String(s).toLocaleLowerCase('vi').replace(/[_.]+/g, ' ').replace(/[^\p{L}\p{N} &-]+/gu, ' ').trim().replace(/\s+/g, '-').slice(0, 40);
      const out = { scanned: 0, matched: 0, perTag: {} };
      for (const b of books()) {
        let dirs = [];
        if (b.linked && b.sourceRelative) dirs = path.dirname(b.sourceRelative).split(/[\\/]/).filter((d) => d && d !== '.');
        else if (b.folder && b.folder !== 'Sách cá nhân') dirs = [b.folder];
        if (mode === 'parent') dirs = dirs.slice(-1);
        const tags = dirs.filter((d) => !skip.has(norm(d).trim())).map(toTag).filter((t) => t.length >= 2);
        out.scanned++;
        if (!tags.length) continue;
        const next = [...new Set([...(b.hashtags || []), ...tags])];
        if (next.length === (b.hashtags || []).length) continue;
        out.matched++;
        for (const t of tags) out.perTag[t] = (out.perTag[t] || 0) + 1;
        if (apply) lib.patch(b.id, { hashtags: next.slice(0, 100) });
      }
      if (apply) { lib.log('classify', `Gán nhãn theo thư mục cho ${out.matched} sách`); changed(); }
      return out;
    },
    async consolidate({ ids, layout = 'flat' }) {
      ids = list(ids);
      const dir = await pickDir('Chọn thư mục để gom (sao chép) sách vào');
      if (!dir) return null;
      writableDir(dir);
      const out = { dir, copied: 0, skipped: 0, errors: [] };
      for (const id of ids) {
        const b = lib.book(lib.row(id)), src = fileOf(b);
        if (!src) { out.errors.push(b.title + ': không tìm thấy file'); continue; }
        const sub = layout === 'author' ? safeName(b.author) : layout === 'format' ? safeName(b.format) : layout === 'tag' ? safeName(b.hashtags?.[0] || 'Chưa phân loại') : '';
        const target = path.join(dir, sub);
        try {
          fs.mkdirSync(target, { recursive: true });
          const name = fileName(b, src), same = path.join(target, name);
          if (fs.existsSync(same) && fs.statSync(same).size === fs.statSync(src).size) { out.skipped++; continue; }
          await fs.promises.copyFile(src, uniquePath(target, name), fs.constants.COPYFILE_EXCL);
          out.copied++;
        } catch (e) { out.errors.push(b.title + ': ' + e.message); }
      }
      lib.log('consolidate', `Gom ${out.copied} sách vào ${dir}`);
      shell.openPath(dir);
      return out;
    },
    async exportCsv({ ids = null } = {}) {
      const scope = ids ? new Set(list(ids)) : null;
      const r = await dialog.showSaveDialog(win(), { title: 'Xuất danh sách sách (CSV)', defaultPath: 'SI-Book-danh-sach-' + stamp() + '.csv', filters: [{ name: 'CSV', extensions: ['csv'] }] });
      if (r.canceled) return null;
      const dest = lib.assertWritableDestination(r.filePath);
      const cols = Object.fromEntries(lib.collections().map((c) => [c.id, c.name]));
      const q = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
      const head = ['Tên sách', 'Tác giả', 'Định dạng', 'Số trang', 'Nhà xuất bản', 'Năm', 'ISBN', 'Hashtag', 'Bộ sưu tập', 'Tiến độ (%)', 'Đánh giá', 'Yêu thích', 'Sẽ đọc', 'Ngày thêm', 'Mở gần nhất', 'Dung lượng (MB)', 'Đường dẫn file', 'Trạng thái'];
      const rows = books().filter((b) => !scope || scope.has(b.id)).map((b) => [
        b.title, b.author, b.format, b.pages || '', b.publisher, b.year, b.isbn, (b.hashtags || []).join(', '),
        (b.collections || []).map((c) => cols[c]).filter(Boolean).join(', '), b.progress || 0, b.rating || '', b.favorite ? 'Có' : '', b.toRead ? 'Có' : '',
        b.addedAt ? new Date(b.addedAt).toLocaleString('vi') : b.dateAdded, b.openedAt ? new Date(b.openedAt).toLocaleString('vi') : '',
        (sizeOf(b) / 1048576).toFixed(2), b.linked ? b.filePath : 'Kho SI Book: ' + (b.filePath || ''), b.missing ? 'Mất file' : 'OK',
      ].map(q).join(','));
      fs.writeFileSync(dest, '\ufeff' + [head.map(q).join(','), ...rows].join('\r\n'), 'utf8');
      shell.showItemInFolder(dest);
      return { file: dest, rows: rows.length };
    },
    backupInfo() {
      const keys = db.prepare('SELECT DISTINCT file_key FROM books WHERE file_key IS NOT NULL AND deleted IS NULL').all();
      const bytes = keys.reduce((s, r) => { try { return s + fs.statSync(path.join(lib.files, r.file_key)).size; } catch { return s; } }, 0);
      return { importedFiles: keys.length, importedBytes: bytes, last: lib.getSetting('lastBackup', null) };
    },
    async backup({ includeFiles = false } = {}) {
      const dir = await pickDir('Chọn nơi lưu bản sao lưu SI Book');
      if (!dir) return null;
      writableDir(dir);
      const dest = path.join(dir, 'SI-Book-Backup-' + stamp());
      fs.mkdirSync(dest);
      db.exec(`VACUUM INTO '${path.join(dest, 'library.sqlite').replace(/'/g, "''")}'`);
      await fs.promises.cp(lib.covers, path.join(dest, 'covers'), { recursive: true });
      if (includeFiles) await fs.promises.cp(lib.files, path.join(dest, 'files'), { recursive: true });
      const manifest = { app: 'SI Book', version: app.getVersion(), at: new Date().toISOString(), books: books().length, includeFiles };
      fs.writeFileSync(path.join(dest, 'backup.json'), JSON.stringify(manifest, null, 1));
      lib.setSetting('lastBackup', { at: manifest.at, dest });
      lib.log('backup', 'Sao lưu thư viện: ' + dest);
      shell.openPath(dest);
      return { dest, ...manifest };
    },
    async restore() {
      const dir = await pickDir('Chọn thư mục bản sao lưu (SI-Book-Backup-...)');
      if (!dir) return null;
      assert(fs.existsSync(path.join(dir, 'library.sqlite')) && fs.existsSync(path.join(dir, 'backup.json')), 'Thư mục này không phải bản sao lưu SI Book');
      const m = JSON.parse(fs.readFileSync(path.join(dir, 'backup.json'), 'utf8'));
      const c = await dialog.showMessageBox(win(), { type: 'warning', buttons: ['Hủy', 'Khôi phục và khởi động lại'], defaultId: 0, cancelId: 0, message: `Khôi phục bản sao lưu ngày ${new Date(m.at).toLocaleString('vi')} (${m.books} sách)?`, detail: 'Thư viện hiện tại được giữ lại trong thư mục library-before-restore-... để phòng khi cần. File sách gốc không bị động tới.' });
      if (c.response !== 1) return null;
      const pend = path.join(lib.root, 'restore-pending');
      fs.rmSync(pend, { recursive: true, force: true });
      await fs.promises.cp(dir, pend, { recursive: true });
      setTimeout(() => { app.relaunch(); app.quit(); }, 300);
      return { restarting: true };
    },
    async devices() {
      const out = await new Promise((resolve) => execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', 'Get-CimInstance Win32_LogicalDisk -Filter "DriveType=2" | Select-Object DeviceID,VolumeName,FreeSpace,Size | ConvertTo-Json -Compress'], { windowsHide: true, timeout: 15000 }, (e, so) => resolve(e ? '' : so)));
      let l = [];
      try { l = [].concat(JSON.parse(out || '[]') || []); } catch {}
      return l.filter((d) => d && d.DeviceID).map((d) => {
        const root = d.DeviceID + '\\';
        const kindle = fs.existsSync(path.join(root, 'documents')) && (/kindle/i.test(d.VolumeName || '') || fs.existsSync(path.join(root, 'system')));
        const kobo = fs.existsSync(path.join(root, '.kobo'));
        return { drive: d.DeviceID, label: d.VolumeName || '', free: d.FreeSpace || 0, size: d.Size || 0, kind: kindle ? 'kindle' : kobo ? 'kobo' : 'usb', target: kindle ? path.join(root, 'documents') : kobo ? root : path.join(root, 'Books') };
      });
    },
    async sendDevice({ ids, drive }) {
      ids = list(ids, 2000);
      let target, kind = 'folder';
      if (drive) {
        const d = (await T.devices()).find((x) => x.drive === drive);
        assert(d, 'Không tìm thấy thiết bị ' + drive);
        target = d.target; kind = d.kind;
      } else {
        target = await pickDir('Chọn thư mục trên máy đọc sách / điện thoại');
        if (!target) return null;
      }
      writableDir(target);
      fs.mkdirSync(target, { recursive: true });
      const kindleOk = ['mobi', 'azw', 'azw3', 'kfx', 'prc', 'pdf', 'txt'];
      const out = { target, copied: 0, skipped: 0, unsupported: [], errors: [] };
      for (const id of ids) {
        const b = lib.book(lib.row(id)), src = fileOf(b);
        if (!src) { out.errors.push(b.title + ': không tìm thấy file'); continue; }
        if (kind === 'kindle' && !kindleOk.includes(path.extname(src).slice(1).toLowerCase())) { out.unsupported.push(b.title); continue; }
        const name = fileName(b, src), same = path.join(target, name);
        try {
          if (fs.existsSync(same) && fs.statSync(same).size === fs.statSync(src).size) { out.skipped++; continue; }
          await fs.promises.copyFile(src, uniquePath(target, name));
          out.copied++;
        } catch (e) { out.errors.push(b.title + ': ' + e.message); }
      }
      lib.log('device', `Gửi ${out.copied} sách sang ${target}`);
      return out;
    },
    sendKindleWeb({ id }) {
      const f = fileOf(lib.book(lib.row(id)));
      if (f) shell.showItemInFolder(f);
      shell.openExternal('https://www.amazon.com/sendtokindle');
      return true;
    },
    async convertInfo() {
      const cands = [
        process.env.ProgramFiles && path.join(process.env.ProgramFiles, 'Calibre2', 'ebook-convert.exe'),
        process.env['ProgramFiles(x86)'] && path.join(process.env['ProgramFiles(x86)'], 'Calibre2', 'ebook-convert.exe'),
        process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Programs', 'Calibre2', 'ebook-convert.exe'),
        'C:\\Calibre Portable\\Calibre\\ebook-convert.exe',
      ].filter(Boolean);
      let calibre = cands.find((p) => fs.existsSync(p)) || null;
      if (!calibre) calibre = await new Promise((resolve) => execFile('where', ['ebook-convert'], { windowsHide: true, timeout: 5000 }, (e, so) => resolve(e ? null : String(so).split(/\r?\n/)[0].trim() || null)));
      return { calibre };
    },
    async convert({ id, to, addToLibrary = false }) {
      const FORMATS = ['epub', 'azw3', 'mobi', 'pdf', 'docx', 'txt', 'fb2', 'rtf'];
      assert(FORMATS.includes(to), 'Định dạng đích không hỗ trợ');
      const b = lib.book(lib.row(id)), src = fileOf(b);
      assert(src, 'Không tìm thấy file sách');
      const ext = path.extname(src).slice(1).toLowerCase();
      assert(ext !== to, 'Sách đã ở định dạng ' + to.toUpperCase());
      const office = ['docx', 'doc', 'pptx', 'ppt', 'odt', 'rtf'].includes(ext) && to === 'pdf';
      const { calibre } = await T.convertInfo();
      assert(calibre || office, 'Cần cài Calibre (miễn phí, calibre-ebook.com) để chuyển đổi định dạng sách.');
      const r = await dialog.showSaveDialog(win(), { title: 'Lưu bản chuyển đổi', defaultPath: safeName(path.basename(fileName(b, src), path.extname(src))) + '.' + to, filters: [{ name: to.toUpperCase(), extensions: [to] }] });
      if (r.canceled) return null;
      const dest = lib.assertWritableDestination(r.filePath);
      assert(!fs.existsSync(dest), 'Để an toàn, hãy chọn tên file mới (không ghi đè).');
      if (office) {
        await lib.renderOffice(id);
        fs.copyFileSync(lib.renderedFile(id), dest, fs.constants.COPYFILE_EXCL);
      } else {
        await new Promise((resolve, reject) => execFile(calibre, [src, dest], { windowsHide: true, timeout: 20 * 60 * 1000, maxBuffer: 16 * 1024 * 1024 }, (e, so, se) => (e ? reject(new Error('Calibre lỗi: ' + String(se || e.message).slice(-400))) : resolve())));
      }
      assert(fs.existsSync(dest), 'Không tạo được file chuyển đổi');
      const out = { file: dest, imported: null };
      if (addToLibrary) out.imported = (await lib.serial(() => lib.importPath(dest))).book?.id || null;
      lib.log('convert', `Chuyển đổi ${b.title} → ${to.toUpperCase()}`);
      shell.showItemInFolder(dest);
      changed();
      return out;
    },
    excludedList() {
      const info = db.prepare('SELECT * FROM excluded_info ORDER BY at DESC').all();
      const total = db.prepare('SELECT COUNT(*) AS n FROM linked_exclusions').get().n;
      return { items: info, unknown: Math.max(0, total - info.length) };
    },
    async excludedRestore({ id, all = false }) {
      const rows = all ? db.prepare('SELECT * FROM excluded_info').all() : [db.prepare('SELECT * FROM excluded_info WHERE id=?').get(String(id))].filter(Boolean);
      if (all) db.exec('DELETE FROM linked_exclusions');
      for (const r of rows) {
        db.prepare('DELETE FROM linked_exclusions WHERE id=?').run(r.id);
        db.prepare('DELETE FROM excluded_info WHERE id=?').run(r.id);
      }
      if (all) db.exec('DELETE FROM excluded_info');
      const roots = new Set(rows.map((r) => r.root).filter(Boolean));
      if (all) for (const w of lib.getSetting('watched', [])) roots.add(w);
      for (const root of roots) if (fs.existsSync(root)) await lib.serial(() => lib.linkFolder(root, changed));
      changed();
      return { restored: rows.length };
    },
    async metaSearch({ query }) {
      assert(typeof query === 'string' && query.trim() && query.length <= 300, 'Từ khóa tìm kiếm không hợp lệ');
      const get = async (url) => {
        const c = new AbortController(), t = setTimeout(() => c.abort(), 15000);
        try { const r = await fetch(url, { signal: c.signal, headers: { 'User-Agent': 'SI-Book/' + app.getVersion() } }); return r.ok ? r : null; } catch { return null; } finally { clearTimeout(t); }
      };
      const q = encodeURIComponent(query.trim());
      const [g, o] = await Promise.all([
        get(`https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=10&printType=books`).then((r) => r?.json()).catch(() => null),
        get(`https://openlibrary.org/search.json?q=${q}&limit=6&fields=title,author_name,first_publish_year,publisher,isbn,cover_i,number_of_pages_median`).then((r) => r?.json()).catch(() => null),
      ]);
      const items = [];
      for (const it of g?.items || []) {
        const v = it.volumeInfo || {};
        const isbn = (v.industryIdentifiers || []).find((x) => x.type === 'ISBN_13') || (v.industryIdentifiers || [])[0];
        items.push({ source: 'Google Books', title: [v.title, v.subtitle].filter(Boolean).join(': '), author: (v.authors || []).join(', '), publisher: v.publisher || '', year: String(v.publishedDate || '').slice(0, 4), isbn: isbn?.identifier || '', description: String(v.description || '').slice(0, 5000), pages: v.pageCount || 0, cover: (v.imageLinks?.thumbnail || v.imageLinks?.smallThumbnail || '').replace(/^http:/, 'https:').replace('&edge=curl', '') });
      }
      for (const d of o?.docs || []) {
        items.push({ source: 'Open Library', title: d.title || '', author: (d.author_name || []).join(', '), publisher: (d.publisher || [])[0] || '', year: String(d.first_publish_year || ''), isbn: (d.isbn || [])[0] || '', description: '', pages: d.number_of_pages_median || 0, cover: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg` : '' });
      }
      assert(g || o, 'Không kết nối được Google Books / Open Library. Kiểm tra mạng.');
      await Promise.all(items.map(async (it) => {
        if (!it.cover) return;
        const r = await get(it.cover.replace('-L.jpg', '-M.jpg'));
        const buf = r ? Buffer.from(await r.arrayBuffer()) : null;
        it.thumb = buf && buf.length > 200 && buf.length < 600000 ? 'data:' + (r.headers.get('content-type') || 'image/jpeg') + ';base64,' + buf.toString('base64') : '';
      }));
      return items;
    },
    async metaCover({ id, url }) {
      lib.row(id);
      const u = new URL(String(url));
      assert(u.protocol === 'https:' && /(^|\.)(books\.google\.com|googleusercontent\.com|googleapis\.com|openlibrary\.org)$/.test(u.hostname), 'Địa chỉ ảnh bìa không được phép');
      const r = await fetch(u, { headers: { 'User-Agent': 'SI-Book' } });
      assert(r.ok, 'Không tải được ảnh bìa');
      const type = r.headers.get('content-type') || '';
      const buf = Buffer.from(await r.arrayBuffer());
      lib.writeCover(id, buf, /png/.test(type) ? 'png' : /webp/.test(type) ? 'webp' : 'jpg');
      changed();
      return lib.book(lib.row(id));
    },
    async metaAuto({ ids, max = 40 }) {
      ids = list(ids).slice(0, Math.min(100, max));
      const out = { checked: 0, updated: 0, notFound: 0, items: [] };
      const sim = (a, b) => { const A = new Set(titleKey(a).split(' ')), B = new Set(titleKey(b).split(' ')); const i = [...A].filter((x) => B.has(x)).length; return i / Math.max(1, Math.min(A.size, B.size)); };
      for (const id of ids) {
        const b = lib.book(lib.row(id));
        out.checked++;
        let res = [];
        try { res = await T.metaSearch({ query: titleKey(b.title).slice(0, 200) + (UNKNOWN(b.author) ? '' : ' ' + b.author) }); } catch {}
        const hit = res.find((r) => r.title && sim(b.title, r.title) >= 0.7);
        if (!hit) { out.notFound++; continue; }
        const v = {};
        if (UNKNOWN(b.author) && hit.author) v.author = hit.author.slice(0, 300);
        if (UNKNOWN(b.publisher) && hit.publisher) v.publisher = hit.publisher.slice(0, 300);
        if (UNKNOWN(b.year) && hit.year) v.year = hit.year;
        if (UNKNOWN(b.isbn) && hit.isbn) v.isbn = hit.isbn;
        if (DEFAULT_DESC.test(b.description || '') && hit.description) v.description = hit.description;
        if (Object.keys(v).length) { lib.patch(id, v); out.updated++; out.items.push({ title: b.title, author: v.author || b.author }); }
        await sleep(250);
      }
      lib.log('meta', `Cập nhật thông tin trên mạng: ${out.updated}/${out.checked} sách`);
      changed();
      return out;
    },
    coverReset({ id }) {
      lib.row(id);
      lib.clearCover(id);
      changed();
      return lib.book(lib.row(id));
    },
    async helpInfo() {
      return { author: AUTHOR, version: app.getVersion(), dataPath: lib.root, calibre: (await T.convertInfo()).calibre, electron: process.versions.electron };
    },
    openDataFolder() { shell.openPath(lib.root); return true; },

  };
  return T;
}
module.exports = { createTools, applyPendingRestore };
