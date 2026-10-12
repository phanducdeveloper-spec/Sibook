'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const AdmZip = require('adm-zip');
const { Library } = require('./library.cjs');
function temp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'mewbook-backend-test-'));
}
function pdf(dest) {
  const stream =
    'BT /F1 12 Tf 72 720 Td (Electrical safety searchable document. Read before working.) Tj ET';
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Length ' + stream.length + ' >>\nstream\n' + stream + '\nendstream',
  ];
  let s = '%PDF-1.4\n',
    off = [0];
  objs.forEach((o, i) => {
    off.push(Buffer.byteLength(s));
    s += i + 1 + ' 0 obj\n' + o + '\nendobj\n';
  });
  const x = Buffer.byteLength(s);
  s +=
    'xref\n0 6\n0000000000 65535 f \n' +
    off
      .slice(1)
      .map((n) => String(n).padStart(10, '0') + ' 00000 n \n')
      .join('') +
    'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n' +
    x +
    '\n%%EOF';
  fs.writeFileSync(dest, s);
}
const seed = {
  id: 'b1',
  title: 'Sách mẫu',
  author: 'Mẫu',
  progress: 0,
  favorite: false,
  hashtags: [],
  section: 'today',
  cover: './assets/image-6.jpeg',
  format: 'PDF',
};
test('SQLite library: imports, persistence, search, notes, validation', async (t) => {
  const root = temp(),
    inputs = temp(),
    r2 = temp();
  let lib = new Library(root),
    lib2;
  try {
    await t.test(
      'initialize is idempotent and migrates legacy preferences',
      () => {
        lib.initialize([seed], {
          custom: { b1: { favorite: true } },
          notes: {
            b1: [{ id: 'old-note', text: 'Ghi chú cũ', date: 'hôm qua' }],
          },
        });
        lib.initialize([seed]);
        assert.equal(lib.list().length, 1);
        assert.equal(lib.list()[0].favorite, true);
        assert.equal(lib.notes().b1.length, 1);
        assert.equal(lib.stats().total, 0);
      },
    );
    const txt = path.join(inputs, 'Kỹ thuật điện.txt');
    fs.writeFileSync(
      txt,
      'An toàn thi công điện. Chỉ mục đặc biệt unicorn987 chỉ có trong nội dung. Công trình cần kiểm tra trước khi đóng điện.',
    );
    let book;
    await t.test('adding a book links the original in place (no copy) and indexes text', async () => {
      book = (await lib.importPath(txt)).book;
      assert.equal(book.indexStatus, 'ready');
      assert.equal(book.linked, true);
      assert.equal(lib.document(book.id).text.includes('unicorn987'), true);
      assert.equal(lib.file(book.id), fs.realpathSync(txt));
      assert.equal(fs.readdirSync(lib.files).length, 0);
      assert.equal(lib.stats().total, 1);
    });
    await t.test('adding the same file twice is a duplicate; byte import never copies', async () => {
      const r = await lib.importPath(txt);
      assert.equal(r.duplicate, true);
      assert.equal(r.book.id, book.id);
      await assert.rejects(lib.importBytes({ name: 'Tên khác.txt', bytes: new Uint8Array(fs.readFileSync(txt)) }));
      assert.equal(fs.readdirSync(lib.files).length, 0);
      assert.equal(lib.stats().total, 1);
    });
    await t.test('accent-insensitive full-text and safe query syntax', () => {
      assert.ok(lib.search('an toan').includes(book.id));
      assert.ok(lib.search('unicorn987').includes(book.id));
      assert.ok(lib.search('đóng điện').includes(book.id));
      assert.doesNotThrow(() => lib.search('" OR 1=1 -- *'));
    });
    await t.test('validated metadata CRUD, tags and notes', () => {
      lib.patch(book.id, {
        title: 'Tài liệu kiểm thử',
        favorite: true,
        progress: 37,
        hashtags: ['điện', 'điện'],
        folder: 'Thư mục A',
      });
      assert.equal(lib.book(lib.row(book.id)).hashtags.length, 1);
      assert.ok(lib.search('thu muc').includes(book.id));
      const n = lib.addNote(book.id, 'Nội dung ghi chú');
      lib.deleteNote(book.id, n.id);
      assert.equal(lib.notes()[book.id], undefined);
      assert.throws(() => lib.patch(book.id, { filePath: 'C:\\secret.txt' }));
      assert.throws(() => lib.patch(book.id, { progress: 101 }));
      assert.throws(() => lib.file('../../secret'));
    });
    await t.test('extractive summary is grounded and honestly labelled', () => {
      const r = lib.localSummary(book.id);
      assert.ok(r.aiSummary);
      assert.match(r.summarySource, /không phải AI/);
    });
    await t.test(
      'soft delete removes search results; restore preserves file',
      () => {
        lib.trash(book.id);
        assert.equal(
          lib.list().some((b) => b.id === book.id),
          false,
        );
        assert.equal(lib.search('unicorn987').includes(book.id), false);
        lib.restoreBook(book.id);
        assert.ok(fs.existsSync(lib.file(book.id)));
      },
    );
    await t.test('PDF content and page count extraction', async () => {
      const p = path.join(inputs, 'sample.pdf');
      pdf(p);
      const r = await lib.importPath(p);
      assert.equal(r.book.pages, 1);
      assert.match(lib.document(r.book.id).text, /Electrical safety/);
      assert.equal(r.book.indexStatus, 'ready');
    });
    await t.test('EPUB metadata, spine and safe text reader', async () => {
      const z = new AdmZip();
      z.addFile(
        'META-INF/container.xml',
        Buffer.from(
          '<container><rootfiles><rootfile full-path="OPS/book.opf"/></rootfiles></container>',
        ),
      );
      z.addFile(
        'OPS/book.opf',
        Buffer.from(
          '<package><metadata><dc:title xmlns:dc="x">EPUB kỹ thuật</dc:title><dc:creator xmlns:dc="x">Tác giả EPUB</dc:creator></metadata><manifest><item id="c" href="chapter.xhtml"/></manifest><spine><itemref idref="c"/></spine></package>',
        ),
      );
      z.addFile(
        'OPS/chapter.xhtml',
        Buffer.from(
          '<!DOCTYPE html><html><head><title>Chương đầu</title></head><body><h1>Chương điện</h1><p>Nội dung sách EPUB searchable777.</p><script>evil()</script></body></html>',
        ),
      );
      const p = path.join(inputs, 'sample.epub');
      z.writeZip(p);
      const r = await lib.importPath(p);
      assert.equal(r.book.title, 'EPUB kỹ thuật');
      assert.equal(r.book.author, 'Tác giả EPUB');
      assert.match(lib.document(r.book.id).text, /searchable777/);
      assert.equal(lib.document(r.book.id).text.includes('evil'), false);
      assert.equal(lib.document(r.book.id).toc.length, 1);
    });
    await t.test('DOCX and PPTX text extraction', async () => {
      for (const ext of ['docx', 'pptx']) {
        const z = new AdmZip();
        z.addFile(
          ext === 'docx' ? 'word/document.xml' : 'ppt/slides/slide1.xml',
          Buffer.from(
            ext === 'docx'
              ? '<w:document xmlns:w="x"><w:body><w:p><w:r><w:t>Office extract test</w:t></w:r></w:p></w:body></w:document>'
              : '<p:sld xmlns:p="x" xmlns:a="y"><p:cSld><a:t>Office extract test</a:t></p:cSld></p:sld>',
          ),
        );
        const p = path.join(inputs, 'sample.' + ext);
        z.writeZip(p);
        const r = await lib.importPath(p);
        assert.match(lib.document(r.book.id).text, /Office extract test/);
      }
    });
    await t.test(
      'unsupported formats fail safely; malformed PDF retains original',
      async () => {
        await assert.rejects(
          lib.importBytes({ name: 'virus.exe', bytes: new Uint8Array([1]) }),
        );
        const bp = path.join(inputs, 'broken.pdf');
        fs.writeFileSync(bp, Buffer.from([1, 2, 3]));
        const r = await lib.importPath(bp);
        assert.match(r.book.indexStatus, /error:/);
        assert.ok(fs.existsSync(lib.file(r.book.id)));
      },
    );
    await t.test(
      'folder scan reports duplicates and never deletes original',
      async () => {
        const p = path.join(inputs, 'folder-note.txt');
        fs.writeFileSync(p, 'Unique scanned folder text');
        const r = await lib.scan(inputs);
        assert.equal(r.added, 1);
        assert.ok(r.duplicates >= 3);
        assert.ok(fs.existsSync(p));
      },
    );
    await t.test(
      'Unicode document survives subprocess chunk boundaries',
      async () => {
        const text = 'Kiểm thử tiếng Việt 🐈. '.repeat(7000);
        const up = path.join(inputs, 'unicode.txt');
        fs.writeFileSync(up, text);
        const r = await lib.importPath(up);
        assert.equal(lib.document(r.book.id).text, text);
        await lib.rebuild(r.book.id);
        assert.equal(lib.document(r.book.id).text, text);
        const file = lib.file(r.book.id);
        lib.trash(r.book.id);
        lib.purge(r.book.id);
        assert.equal(fs.existsSync(file), true, 'purge never deletes the original file');
        const dp = path.join(inputs, 'delete-me.txt');
        fs.writeFileSync(dp, 'x');
        const d = (await lib.importPath(dp)).book;
        lib.trash(d.id);
        assert.deepEqual(lib.purge(d.id, { deleteFile: true }), { fileDeleted: true });
        assert.equal(fs.existsSync(dp), false, 'confirmed permanent delete removes the file');
        assert.throws(() => lib.row(r.book.id, true));
        assert.throws(() => lib.purge(book.id));
      },
    );
    await t.test(
      'SQLite persists across restart and healthy integrity check',
      () => {
        const before = lib.list().length;
        lib.close();
        lib = new Library(root);
        assert.equal(lib.list().length, before);
        assert.equal(lib.book(lib.row(book.id)).progress, 37);
        assert.equal(
          lib.db.prepare('PRAGMA integrity_check').get().integrity_check,
          'ok',
        );
      },
    );
  } finally {
    lib.close();
    lib2?.close();
    for (const p of [root, inputs, r2])
      fs.rmSync(p, { recursive: true, force: true });
  }
});
