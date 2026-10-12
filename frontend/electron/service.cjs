'use strict';
const { app, dialog, ipcMain, shell, safeStorage } = require('electron');
const { createAI } = require('./ai.cjs');
const { createTools, applyPendingRestore } = require('./tools.cjs');
const assert = (c, m) => { if (!c) throw new Error(m); };
const fs = require('node:fs');
const path = require('node:path');
const { Library, EXT } = require('./library.cjs');
function startService(root, getWindow, trusted) {
  try { applyPendingRestore(root); } catch (e) { console.error('restore failed', e); }
  const lib = new Library(root);
  const ai = createAI(root, safeStorage);
  const changed = () =>
    getWindow()?.webContents.send('mewbook:library-changed');
  for (const dir of lib.getSetting('watched', [])) {
    if (fs.existsSync(dir)) lib.watch(dir, changed);
  }
  const tools = createTools(lib, { dialog, shell, app, getWindow, changed });
  const filters = [{ name: 'Tài liệu', extensions: [...EXT] }];
  // Mo app: quet lai cac thu muc lien ket de nhan sach moi / phat hien file mat.
  setTimeout(() => {
    lib
      .serial(async () => {
        for (const dir of lib.getSetting('watched', [])) {
          if (lib.closed) return;
          if (fs.existsSync(dir)) await lib.linkFolder(dir, changed);
        }
      })
      .then(changed)
      .catch((e) => { try { lib.log('watch-error', e.message); } catch {} });
  }, 5000);
  async function command(action, p = {}) {
    switch (action) {
      case 'initialize':
        return lib.initialize(p.seeds, p.legacy);
      case 'snapshot':
        return lib.snapshot();
      case 'patch':
        return lib.patch(p.id, p.values);
      case 'importBytes':
        return lib.serial(() => lib.importBytes(p));
      case 'importDialog': {
        const r = await dialog.showOpenDialog(getWindow(), {
          title: 'Thêm sách (liên kết tại chỗ, không sao chép)',
          properties: ['openFile', 'multiSelections'],
          filters,
        });
        if (r.canceled) return null;
        return lib.serial(async () => {
          const out = { added: [], duplicates: 0, errors: [] };
          for (const file of r.filePaths) {
            try {
              const r = await lib.linkFile(file);
              r.duplicate ? out.duplicates++ : out.added.push(r.book);
            } catch (e) {
              out.errors.push({
                name: path.basename(file),
                message: e.message,
              });
            }
          }
          return out;
        });
      }
      case 'linkPaths': {
        assert(Array.isArray(p.paths) && p.paths.length <= 5000 && p.paths.every((x) => typeof x === 'string' && x.length < 32760), 'Danh sách file không hợp lệ');
        return lib.serial(async () => {
          const out = { added: [], duplicates: 0, errors: [] };
          for (const file of p.paths) {
            try {
              if (fs.statSync(file).isDirectory()) {
                const c = lib.authorizeRoot(file);
                const r = await lib.linkFolder(c, changed);
                lib.setSetting('watched', [...new Set([...lib.getSetting('watched', []), c])]);
                lib.watch(c, changed);
                out.duplicates += r.duplicates; out.folders = (out.folders || 0) + 1; out.folderAdded = (out.folderAdded || 0) + r.added;
                continue;
              }
              const r = await lib.linkFile(file, { extract: p.paths.length <= 200 });
              r.duplicate ? out.duplicates++ : out.added.push(r.book);
            } catch (e) {
              out.errors.push({ name: path.basename(file), message: e.message });
            }
          }
          return out;
        });
      }
      case 'document':
        return lib.document(p.id);
      case 'readDocument':
        return lib.serial(() => lib.ensureDocument(p.id));
      case 'rebuild':
        return lib.serial(() => lib.rebuild(p.id));
      case 'purge':
      case 'purgeAll': {
        const rows = action === 'purgeAll'
          ? lib.db.prepare('SELECT id FROM books WHERE deleted IS NOT NULL').all().map((x) => x.id)
          : [p.id];
        if (!rows.length) return null;
        const items = rows.map((id) => {
          const b = JSON.parse(lib.row(id, true).data);
          let file = null;
          if (b.linked) { try { file = lib.linkedFile(b); } catch {} }
          return { id, title: b.title, file };
        });
        const files = items.filter((x) => x.file);
        const one = items.length === 1;
        const c = await dialog.showMessageBox(getWindow(), {
          type: 'warning',
          title: 'Xác nhận xóa vĩnh viễn',
          noLink: true,
          buttons: files.length
            ? ['Hủy', 'Chỉ gỡ khỏi thư viện', one ? 'Xóa vĩnh viễn cả file gốc' : `Xóa vĩnh viễn cả ${files.length} file gốc`]
            : ['Hủy', 'Xóa vĩnh viễn'],
          defaultId: 0,
          cancelId: 0,
          message: one ? `Xóa vĩnh viễn “${items[0].title}”?` : `Xóa vĩnh viễn ${items.length} sách trong thùng rác?`,
          detail:
            (files.length
              ? (one ? 'File gốc: ' + files[0].file : 'Ví dụ: ' + files.slice(0, 3).map((x) => x.file).join('\n') + (files.length > 3 ? '\n…' : '')) +
                '\n\n• Chỉ gỡ khỏi thư viện: file vẫn nằm nguyên trên ổ đĩa.\n• Xóa vĩnh viễn cả file gốc: file bị XÓA KHỎI Ổ ĐĨA, không vào Thùng rác Windows và KHÔNG khôi phục được.'
              : 'Thông tin sách và ghi chú sẽ bị xóa, không khôi phục được.'),
        });
        if (c.response === 0) return null;
        const deleteFile = files.length > 0 && c.response === 2;
        return lib.serial(async () => {
          const out = { purged: 0, filesDeleted: 0, errors: [] };
          for (const x of items) {
            try { const r = lib.purge(x.id, { deleteFile }); out.purged++; if (r.fileDeleted) out.filesDeleted++; }
            catch (e) { out.errors.push(x.title + ': ' + e.message); }
          }
          changed();
          if (out.errors.length && !out.purged) throw Error(out.errors.slice(0, 3).join('; '));
          return out;
        });
      }
      case 'search':
        return lib.search(p.query);
      case 'noteAdd':
        return lib.addNote(p.id, p.text, p.legacy);
      case 'noteDelete':
        return lib.deleteNote(p.id, p.noteId);
      case 'trash':
        return lib.trash(p.id);
      case 'trashList':
        return lib.list(true);
      case 'restoreBook':
        return lib.restoreBook(p.id);
      case 'summary':
        return lib.serial(async () => {await lib.ensureDocument(p.id); return lib.localSummary(p.id);});
      case 'ollama':
        return lib.serial(async () => {await lib.ensureDocument(p.id); return lib.ollama(p.id, p.model, p.question);});
      case 'aiConfig':
        return ai.config();
      case 'aiSave':
        return ai.save(p);
      case 'aiModels':
        return ai.listModels(p.provider);
      case 'aiAsk':
        return lib.serial(async () => {
          await lib.ensureDocument(p.id);
          const d = lib.document(p.id);
          assert(d.text.trim(), 'Không có văn bản đã trích xuất');
          return { text: d.text };
        }).then(({ text }) => ai.ask({ ...p, text }));
      case 'linkFolder':
      case 'scanFolder': {
        let dir = p.dir;
        if (!dir) {
          const r = await dialog.showOpenDialog(getWindow(), {
            title: 'Liên kết thư mục sách chỉ đọc (quét cả thư mục con)',
            properties: ['openDirectory'],
          });
          if (r.canceled) return null;
          dir = r.filePaths[0];
        }
        return lib.serial(async () => {
          const canonical = lib.authorizeRoot(dir);
          const result = await lib.linkFolder(canonical, changed);
          lib.setSetting('watched', [...new Set([...lib.getSetting('watched', []), canonical])]);
          lib.watch(canonical, changed);
          return result;
        });
      }
      case 'unwatch': {
        if (!lib.getSetting('watched', []).includes(p.dir))
          throw Error('Thư mục chưa được cấp quyền');
        return lib.unwatch(p.dir);
      }
      case 'rescan':
        return lib.serial(async () => {
          const results = [];
          for (const dir of lib.getSetting('watched', []))
            results.push(await lib.linkFolder(dir, changed));
          return results;
        });
      case 'exportFile': {
        const source = lib.file(p.id);
        const b = lib.book(lib.row(p.id));
        const r = await dialog.showSaveDialog(getWindow(), {
          title: 'Xuất bản sao file sách',
          defaultPath: path.basename(
            b.filePath || b.title + path.extname(source),
          ),
        });
        if (r.canceled) return null;
        const dest = lib.assertWritableDestination(r.filePath);
        if (fs.existsSync(dest)) throw Error('Để bảo vệ dữ liệu, chỉ xuất thành file mới; không ghi đè file đã có.');
        fs.copyFileSync(source, dest, fs.constants.COPYFILE_EXCL);
        return true;
      }
      case 'migrationStatus':
        return lib.getSetting('legacyMigrated', []);
      case 'migrationDone': {
        if (!Array.isArray(p.ids) || p.ids.some((x) => typeof x !== 'string'))
          throw Error('Dữ liệu di chuyển không hợp lệ');
        return lib.setSetting('legacyMigrated', [
          ...new Set([...lib.getSetting('legacyMigrated', []), ...p.ids]),
        ]);
      }
      case 'saveCover':
        return lib.saveCover(p.id, p.dataUrl);
      case 'coverInfo':
      return lib.serial(async () => lib.coverInfo(p.id));
    case 'renderOffice':
      return lib.renderOffice(p.id);
    case 'comicPages':
      return lib.comicPages(p.id);
    case 'epubCover':
        return lib.serial(async () => lib.epubCover(p.id));
      case 'collectionsSave':
        return lib.saveCollections(p.list);
      case 'diskInfo':
        return lib.diskInfo();
      case 'events':
        return lib.events();
      case 'eventsSeen':
        assert(Number.isInteger(p.id) && p.id >= 0, 'Mã thông báo không hợp lệ');
        return lib.setSetting('eventsSeen', p.id);
      case 'openExternal': {
        const err = await shell.openPath(lib.file(p.id));
        if (err) throw Error('Windows không mở được file: ' + err);
        return true;
      }
      case 'openWith': {
        const file = lib.file(p.id);
        if (process.platform !== 'win32') return shell.openPath(file).then(() => true);
        require('node:child_process').spawn('rundll32.exe', ['shell32.dll,OpenAs_RunDLL', file], { detached: true, stdio: 'ignore', windowsHide: false }).unref();
        return true;
      }
      case 'showInFolder':
        shell.showItemInFolder(lib.file(p.id));
        return true;
      case 'uiGet':
        return lib.getSetting('ui', {});
      case 'uiSet': {
        const { view, nav, inspector, pageSize } = p;
        return lib.setSetting('ui', {
          view: ['grid', 'list', 'table'].includes(view) ? view : 'grid',
          nav: typeof nav === 'string' ? nav.slice(0, 40) : 'home',
          inspector: !!inspector,
          pageSize: [5, 10, 20, 50, 100].includes(pageSize) ? pageSize : 20,
        });
      }
      default:
        if (action.startsWith('tool.') && Object.hasOwn(tools, action.slice(5))) return tools[action.slice(5)](p || {});
        throw Error('Lệnh backend không được phép');
    }
  }
  ipcMain.handle('mewbook:library', async (event, action, p) => {
    try {
      trusted(event);
      return { ok: true, data: await command(action, p) };
    } catch (e) {
      return { ok: false, error: String(e.message).slice(0, 700) };
    }
  });
  return { lib, changed, close: () => lib.close() };
}
module.exports = { startService };
