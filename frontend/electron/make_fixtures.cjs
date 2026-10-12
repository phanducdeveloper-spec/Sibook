'use strict';
// Tao file mau cho moi dinh dang ebook de kiem thu (node electron/make_fixtures.cjs <dir>)
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const AdmZip = require('adm-zip');

function png(w, h, rgb) {
  const crc = (b) => { let c, t = []; for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } let x = 0xffffffff; for (const v of b) x = t[(x ^ v) & 255] ^ (x >>> 8); return (x ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const l = Buffer.alloc(4); l.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const o = y * (w * 3 + 1) + 1 + x * 3; const band = (x + y) % 40 < 20; raw[o] = band ? rgb[0] : 255; raw[o + 1] = band ? rgb[1] : 255; raw[o + 2] = band ? rgb[2] : 255; }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
const PARA = 'Ngày xưa ở một làng nhỏ ven sông có một chú mèo tên là Mew rất thích đọc sách. Mỗi tối chú ngồi bên ngọn đèn dầu, lật từng trang và mơ về những chuyến phiêu lưu. ';

function mobi({ title, author, html, cover, compress }) {
  const text = Buffer.from(html, 'utf8');
  const recs = [];
  for (let i = 0; i < text.length; i += 4096) {
    let r = text.subarray(i, i + 4096);
    if (compress) {
      // PalmDOC hop le: byte 0x09-0x7f giu nguyen, byte khac dung literal run (1-8)
      const out = [];
      for (let k = 0; k < r.length;) {
        const c = r[k];
        if (c >= 0x09 && c < 0x80) { out.push(c); k++; }
        else { const n = Math.min(8, r.length - k); out.push(n); for (let j = 0; j < n; j++) out.push(r[k + j]); k += n; }
      }
      r = Buffer.from(out);
    }
    recs.push(Buffer.concat([r, Buffer.from([0x81])])); // trailing entry (flag bit1) size 1
  }
  const exth = [];
  const ex = (t, d) => { const h = Buffer.alloc(8); h.writeUInt32BE(t); h.writeUInt32BE(d.length + 8, 4); exth.push(Buffer.concat([h, d])); };
  ex(100, Buffer.from(author)); ex(503, Buffer.from(title));
  const u32 = (v) => { const b = Buffer.alloc(4); b.writeUInt32BE(v); return b; };
  if (cover) ex(201, u32(0));
  let exthBody = Buffer.concat(exth);
  const exthHdr = Buffer.concat([Buffer.from('EXTH'), u32(12 + exthBody.length), u32(exth.length)]);
  let exthAll = Buffer.concat([exthHdr, exthBody]);
  exthAll = Buffer.concat([exthAll, Buffer.alloc((4 - (exthAll.length % 4)) % 4)]);
  const hdrLen = 0xe8;
  const r0 = Buffer.alloc(16 + hdrLen);
  r0.writeUInt16BE(compress ? 2 : 1, 0); r0.writeUInt32BE(text.length, 4); r0.writeUInt16BE(recs.length, 8); r0.writeUInt16BE(4096, 10);
  r0.write('MOBI', 16); r0.writeUInt32BE(hdrLen, 20); r0.writeUInt32BE(2, 24); r0.writeUInt32BE(65001, 28);
  const firstImg = recs.length + 1;
  r0.writeUInt32BE(cover ? firstImg : 0xffffffff, 0x6c);
  r0.writeUInt32BE(0x40, 0x80);
  r0.writeUInt16BE(0x2, 0xf2);
  const titleBuf = Buffer.from(title);
  r0.writeUInt32BE(r0.length + exthAll.length, 0x54); r0.writeUInt32BE(titleBuf.length, 0x58);
  const rec0 = Buffer.concat([r0, exthAll, titleBuf, Buffer.alloc(4)]);
  const all = [rec0, ...recs, ...(cover ? [cover] : [])];
  const hdr = Buffer.alloc(78 + all.length * 8 + 2);
  hdr.write(title.slice(0, 31).replace(/[^\x20-\x7e]/g, '_'), 0, 'latin1');
  hdr.write('BOOKMOBI', 60, 'latin1');
  hdr.writeUInt16BE(all.length, 76);
  let off = hdr.length;
  all.forEach((r, i) => { hdr.writeUInt32BE(off, 78 + i * 8); hdr.writeUInt32BE(i * 2, 82 + i * 8); off += r.length; });
  return Buffer.concat([hdr, ...all]);
}

function make(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const cover = png(300, 450, [230, 120, 20]);
  const chapters = (n) => Array.from({ length: n }, (_, i) => `<h2>Chương ${i + 1}</h2><p>${PARA.repeat(6)}</p><mbp:pagebreak/>`).join('');
  fs.writeFileSync(path.join(dir, 'Meo-doc-sach.mobi'), mobi({ title: 'Mèo đọc sách (MOBI)', author: 'Tác giả MOBI', html: '<html><head><title>x</title></head><body>' + chapters(5) + '</body></html>', cover, compress: true }));
  fs.writeFileSync(path.join(dir, 'Kindle-khong-bia.azw3'), mobi({ title: 'Sách Kindle không bìa', author: 'Nguyễn Văn A', html: '<html><body>' + chapters(3) + '</body></html>', cover: null, compress: false }));
  const fb2 = `<?xml version="1.0" encoding="utf-8"?>
<FictionBook xmlns="http://www.gribuser.ru/xml/fictionbook/2.0" xmlns:l="http://www.w3.org/1999/xlink">
<description><title-info><author><first-name>Lê</first-name><last-name>Thị B</last-name></author><book-title>Truyện cổ FB2</book-title><coverpage><image l:href="#cover.png"/></coverpage></title-info></description>
<body><title><p>Truyện cổ FB2</p></title><section><title><p>Phần một</p></title><p>${PARA.repeat(5)}</p></section><section><title><p>Phần hai</p></title><p>${PARA.repeat(5)}</p></section></body>
<binary id="cover.png" content-type="image/png">${png(280, 420, [20, 160, 150]).toString('base64')}</binary>
</FictionBook>`;
  fs.writeFileSync(path.join(dir, 'Truyen-co.fb2'), fb2);
  const odt = new AdmZip();
  odt.addFile('mimetype', Buffer.from('application/vnd.oasis.opendocument.text'));
  odt.addFile('content.xml', Buffer.from(`<?xml version="1.0"?><office:document-content xmlns:office="o" xmlns:text="t"><office:body><office:text><text:h text:outline-level="1">Báo cáo ODT</text:h><text:p>${PARA.repeat(4)}</text:p><text:h text:outline-level="2">Mục 2</text:h><text:p>Nội dung<text:s/>mục hai.</text:p></office:text></office:body></office:document-content>`));
  odt.addFile('meta.xml', Buffer.from('<office:document-meta><office:meta><dc:title>Tài liệu ODT</dc:title><meta:initial-creator>Phòng Kế Toán</meta:initial-creator></office:meta></office:document-meta>'));
  odt.writeZip(path.join(dir, 'Bao-cao.odt'));
  const rtfText = 'Xin chào thế giới RTF. ' .split('').map((c) => (c.charCodeAt(0) > 127 ? '\\u' + c.charCodeAt(0) + '?' : c)).join('');
  fs.writeFileSync(path.join(dir, 'Thu-tu-rtf.rtf'), `{\\rtf1\\ansi\\ansicpg1252\\deff0{\\fonttbl{\\f0 Arial;}}{\\info{\\title Th\\u432?r RTF}{\\author Tr\\u7847?n C}}{\\colortbl;\\red0\\green0\\blue0;}\\f0\\fs24 {\\b ${rtfText}}\\par Caf\\'e9 v\\u224?o bu\\u7893?i s\\u225?ng.\\par ${'Line of text for preview. '.repeat(30)}\\par}`);
  fs.writeFileSync(path.join(dir, 'Trang-web.html'), `<!doctype html><html><head><meta charset="utf-8"><title>Trang HTML mẫu</title><meta name="author" content="Web Writer"><style>p{color:red}</style><script>var x=1</script></head><body><h1>Tiêu đề lớn</h1><p>${PARA.repeat(4)}</p><h2>Phần &amp; tiếp</h2><p>A&nbsp;B &#273;&#x1EA1;</p></body></html>`);
  fs.writeFileSync(path.join(dir, 'Ghi-chu.md'), `# Ghi chú Markdown\n\n${PARA.repeat(3)}\n\n## Mục phụ\n\n- một\n- hai\n`);
  const cbz = new AdmZip();
  cbz.addFile('page10.png', png(200, 300, [200, 30, 120]));
  cbz.addFile('page2.png', png(200, 300, [30, 30, 200]));
  cbz.addFile('page1.png', png(200, 300, [240, 60, 160]));
  cbz.addFile('ComicInfo.xml', Buffer.from('<ComicInfo><Title>Truyện tranh CBZ</Title><Writer>Họa sĩ D</Writer></ComicInfo>'));
  cbz.writeZip(path.join(dir, 'Truyen-tranh.cbz'));
  fs.writeFileSync(path.join(dir, 'Ban-quet.djvu'), Buffer.concat([Buffer.from('AT&TFORM'), Buffer.alloc(200, 1)]));
  fs.writeFileSync(path.join(dir, 'Truyen-nen.cbr'), Buffer.concat([Buffer.from('Rar!\x1a\x07\x00'), Buffer.alloc(200, 2)]));
  fs.writeFileSync(path.join(dir, 'Van-ban.txt'), 'Văn bản thuần TXT\n\n' + PARA.repeat(8));
  return fs.readdirSync(dir);
}
module.exports = { make, mobi, png };
if (require.main === module) console.log(make(process.argv[2] || path.join(require('os').tmpdir(), 'mewbook-fixtures')));
