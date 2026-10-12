'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const F = require('./formats.cjs');
const { make } = require('./make_fixtures.cjs');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mewbook-fmt-'));
make(dir);
const run = (name) => {
  const out = execFileSync(process.execPath, [path.join(__dirname, 'extractor.cjs'), path.join(dir, name)], { encoding: 'utf8' });
  return JSON.parse(out.trim().split('\n').pop());
};

test('MOBI PalmDOC + EXTH + cover', () => {
  const r = run('Meo-doc-sach.mobi');
  assert.equal(r.error, undefined);
  assert.equal(r.title, 'Mèo đọc sách (MOBI)');
  assert.equal(r.author, 'Tác giả MOBI');
  assert.match(r.text, /chú mèo tên là Mew/);
  assert.doesNotMatch(r.text, /<|\u0081/);
  assert.equal(r.toc.length, 5);
  assert.equal(r.toc[1].title, 'Chương 2');
  assert.ok(r.text.slice(r.toc[1].offset).startsWith('Chương 2'));
  assert.equal(F.imageType(F.embeddedCover(path.join(dir, 'Meo-doc-sach.mobi'))), 'image/png');
});
test('AZW3 uncompressed, no cover', () => {
  const r = run('Kindle-khong-bia.azw3');
  assert.equal(r.author, 'Nguyễn Văn A');
  assert.match(r.text, /Chương 3/);
  assert.equal(F.embeddedCover(path.join(dir, 'Kindle-khong-bia.azw3')), null);
});
test('FB2', () => {
  const r = run('Truyen-co.fb2');
  assert.equal(r.title, 'Truyện cổ FB2');
  assert.equal(r.author, 'Lê Thị B');
  assert.deepEqual(r.toc.map((t) => t.title), ['Truyện cổ FB2', 'Phần một', 'Phần hai']);
  assert.doesNotMatch(r.text, /iVBOR/);
  assert.equal(F.imageType(F.embeddedCover(path.join(dir, 'Truyen-co.fb2'))), 'image/png');
});
test('ODT', () => {
  const r = run('Bao-cao.odt');
  assert.equal(r.title, 'Tài liệu ODT');
  assert.equal(r.author, 'Phòng Kế Toán');
  assert.match(r.text, /Nội dung mục hai/);
  assert.deepEqual(r.toc.map((t) => t.title), ['Báo cáo ODT', 'Mục 2']);
});
test('RTF', () => {
  const r = run('Thu-tu-rtf.rtf');
  assert.match(r.text, /Xin chào thế giới RTF/);
  assert.match(r.text, /Café vào buổi sáng/);
  assert.doesNotMatch(r.text, /Arial|red0|\\/);
  assert.equal(r.title, 'Thưr RTF');
  assert.equal(r.author, 'Trần C');
});
test('HTML + MD + TXT', () => {
  const h = run('Trang-web.html');
  assert.equal(h.title, 'Trang HTML mẫu');
  assert.equal(h.author, 'Web Writer');
  assert.match(h.text, /Phần & tiếp/);
  assert.match(h.text, /A B đạ/);
  assert.doesNotMatch(h.text, /color:red|var x/);
  const m = run('Ghi-chu.md');
  assert.equal(m.title, 'Ghi chú Markdown');
  assert.equal(m.toc.length, 2);
  assert.equal(run('Van-ban.txt').status, 'ready');
});
test('CBZ pages + cover natural order', () => {
  const r = run('Truyen-tranh.cbz');
  assert.equal(r.pages, 3);
  assert.equal(r.title, 'Truyện tranh CBZ');
  const z = F.zipOpen(path.join(dir, 'Truyen-tranh.cbz'));
  assert.deepEqual(F.comicEntries(z).map((e) => e.entryName), ['page1.png', 'page2.png', 'page10.png']);
  assert.equal(F.imageType(F.embeddedCover(path.join(dir, 'Truyen-tranh.cbz'))), 'image/png');
});
test('DJVU/CBR stored, external reader', () => {
  assert.match(run('Ban-quet.djvu').status, /^unsupported-reader/);
  assert.match(run('Truyen-nen.cbr').status, /^unsupported-reader/);
});
test('PalmDOC back-reference decode', () => {
  // "abcabcabc": 'abc' + copy dist 3 len 6 -> 0x80 | ... (dist<<3 | (len-3))
  const v = 0x8000 | (3 << 3) | (6 - 3);
  const out = F.palmdoc(Buffer.from([0x61, 0x62, 0x63, v >> 8, v & 0xff, 0xc1]));
  assert.equal(out.toString('latin1'), 'abcabcabc A');
  assert.equal(F.trailingSize(Buffer.from([9, 9, 9, 0x82]), 0x2), 2);
  assert.equal(F.trailingSize(Buffer.from([9, 9, 1, 0x81]), 0x3), 3);
});
test('formatOf', () => {
  assert.equal(F.formatOf('htm'), 'HTML');
  assert.equal(F.formatOf('jpeg'), 'Hình ảnh');
  assert.equal(F.formatOf('azw3'), 'AZW3');
});
