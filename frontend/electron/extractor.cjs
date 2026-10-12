'use strict';
if (__dirname.includes('app.asar.unpacked'))
  module.paths.unshift(
    require('node:path').join(
      __dirname.replace('app.asar.unpacked', 'app.asar'),
      '../node_modules',
    ),
  );
const workerData = { file: process.argv[2] };
const parentPort = {
  postMessage: (r) => process.stdout.write(JSON.stringify(r) + '\n'),
};
console.log = (...args) => process.stderr.write(args.join(' ') + '\n');
const fs = require('node:fs');
const path = require('node:path');
const AdmZip = require('adm-zip');
const { XMLParser } = require('fast-xml-parser');
const F = require('./formats.cjs');
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  removeNSPrefix: true,
  processEntities: false,
});
const arr = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);
function text(x) {
  if (x == null) return '';
  if (typeof x === 'string' || typeof x === 'number') return String(x);
  if (Array.isArray(x)) return x.map(text).join(' ');
  return Object.entries(x)
    .filter(([k]) => !k.startsWith('@_') && !['script', 'style'].includes(k))
    .map(([, v]) => text(v))
    .join(' ');
}
function zipOpen(p) {
  const z = new AdmZip(p);
  let sum = 0;
  const es = z.getEntries();
  if (es.length > 10000) throw Error('Tài liệu chứa quá nhiều mục');
  for (const e of es) {
    sum += e.header.size;
    if (e.header.size > 32 * 1024 * 1024 || sum > 128 * 1024 * 1024)
      throw Error('Tài liệu nén vượt giới hạn an toàn');
  }
  return z;
}
function xml(z, n) {
  const e = z.getEntry(n);
  if (!e) return null;
  const s = e.getData().toString('utf8');
  if (/<!ENTITY/i.test(s)) throw Error('XML entity không được phép');
  return parser.parse(s);
}
async function main() {
  const file = workerData.file,
    ext = path.extname(file).slice(1).toLowerCase();
  let r = { text: '', toc: [], pages: 0, status: 'ready' };
  if (ext === 'txt') {
    const size = fs.statSync(file).size,
      fd = fs.openSync(file, 'r'),
      buf = Buffer.alloc(Math.min(size, 4 * 1024 * 1024));
    try {
      fs.readSync(fd, buf, 0, buf.length, 0);
    } finally {
      fs.closeSync(fd);
    }
    const b = buf;
    if (size > buf.length) r.status = 'partial: giới hạn đọc TXT';
    r.text = (
      b[0] === 255 && b[1] === 254
        ? b.subarray(2).toString('utf16le')
        : b.toString('utf8')
    ).replace(/^\uFEFF/, '');
  } else if (ext === 'pdf') {
    const { getDocument } = await import(
      require('node:url').pathToFileURL(
        require.resolve('pdfjs-dist/legacy/build/pdf.mjs'),
      ).href
    );
    const doc = await getDocument({
      data: new Uint8Array(fs.readFileSync(file)),
      useSystemFonts: true,
      isEvalSupported: false,
      disableFontFace: true,
    }).promise;
    try {
      r.pages = doc.numPages;
      let parts = [];
      for (let i = 1; i <= Math.min(doc.numPages, 1000); i++) {
        const p = await doc.getPage(i);
        const c = await p.getTextContent();
        parts.push(
          c.items.map((x) => x.str + (x.hasEOL ? '\n' : ' ')).join(''),
        );
        p.cleanup();
        if (parts.join('').length > 2000000) break;
      }
      r.text = parts.join('\n\n');
      const info = await doc.getMetadata().catch(() => null);
      r.title = info?.info?.Title || '';
      r.author = info?.info?.Author || '';
      const flatten = async (xs, depth = 0) => {
        if (depth > 12) return;
        for (const x of xs || []) {
          let page = null;
          try {
            const dest =
              typeof x.dest === 'string'
                ? await doc.getDestination(x.dest)
                : x.dest;
            if (dest?.[0])
              page =
                typeof dest[0] === 'number'
                  ? dest[0] + 1
                  : (await doc.getPageIndex(dest[0])) + 1;
          } catch {}
          r.toc.push({ title: x.title, page });
          if (r.toc.length > 3000) return;
          await flatten(x.items, depth + 1);
        }
      };
      await flatten(await doc.getOutline());
      if (doc.numPages > 1000 || r.text.length > 2000000)
        r.status = 'partial: giới hạn chỉ mục';
      if (!r.text.trim()) r.status = 'image-only: cần OCR';
    } finally {
      await doc.destroy();
    }
  } else if (ext === 'epub') {
    const z = zipOpen(file);
    const c = xml(z, 'META-INF/container.xml');
    const opf = arr(c?.container?.rootfiles?.rootfile)[0]?.['@_full-path'];
    if (!opf || opf.includes('..') || opf.startsWith('/'))
      throw Error('EPUB container sai');
    const pkg = xml(z, opf)?.package;
    const base = path.posix.dirname(opf);
    r.title = text(pkg?.metadata?.title).trim();
    r.author = text(pkg?.metadata?.creator).trim();
    r.publisher = text(pkg?.metadata?.publisher).trim();
    const manifest = new Map(
      arr(pkg?.manifest?.item).map((i) => [i['@_id'], i]),
    );
    let parts = [];
    for (const ref of arr(pkg?.spine?.itemref)) {
      const item = manifest.get(ref['@_idref']);
      if (!item) continue;
      const n = path.posix.normalize(
        path.posix.join(base, decodeURIComponent(item['@_href']).split('#')[0]),
      );
      if (n.startsWith('../') || n.startsWith('/'))
        throw Error('Đường dẫn EPUB sai');
      const d = xml(z, n);
      const body = d?.html?.body;
      const content = text(body).replace(/\s+/g, ' ').trim();
      if (content) {
        const title =
          text(
            body?.h1 || body?.h2 || body?.section?.h1 || d?.html?.head?.title,
          ).trim() || 'Chương ' + (r.toc.length + 1);
        r.toc.push({ title, offset: parts.join('\n\n').length });
        parts.push(content);
      }
      if (parts.join('').length > 2000000) {
        r.status = 'partial: giới hạn chỉ mục';
        break;
      }
    }
    r.text = parts.join('\n\n');
    r.pages = r.toc.length;
  } else if (ext === 'docx' || ext === 'pptx') {
    const z = zipOpen(file);
    const raw = (n) => {
      const s = F.zipRead(z, n)?.toString('utf8') || '';
      if (/<!ENTITY/i.test(s)) throw Error('XML entity không được phép');
      return s;
    };
    // Ghep cac run (w:t / a:t) trong cung doan KHONG chen dau cach -> tranh chu bi tach roi
    const paras = (s, p, t) =>
      s.split(new RegExp('</' + p + '>')).map((chunk) =>
        F.entities(
          chunk
            .replace(/<w:tab\/>|<a:tab\/>/g, '<' + t + '>\t</' + t + '>')
            .replace(/<w:br\/>|<a:br\/>|<a:br>[\s\S]*?<\/a:br>/g, '<' + t + '>\n</' + t + '>')
            .match(new RegExp('<' + t + '(?:\\s[^>]*)?>[^<]*</' + t + '>', 'g'))
            ?.map((x) => x.replace(/<[^>]+>/g, ''))
            .join('') || '',
        ).replace(/[ \u00a0]{2,}/g, ' ').trim(),
      );
    if (ext === 'docx') {
      const s = raw('word/document.xml');
      const chunks = s.split('</w:p>');
      const ps = paras(s, 'w:p', 'w:t');
      const out = [];
      ps.forEach((t, i) => {
        if (!t) return;
        if (/<w:pStyle w:val="(Heading|Title|u?\d)[^"]*"/i.test(chunks[i] || '') && /<w:pStyle w:val="(Heading|Title)/i.test(chunks[i]))
          r.toc.push({ title: t.slice(0, 200), offset: out.join('\n\n').length + (out.length ? 2 : 0) });
        out.push(t);
      });
      r.text = out.join('\n\n');
    } else {
      let names = [];
      try {
        const pres = raw('ppt/presentation.xml');
        const rels = raw('ppt/_rels/presentation.xml.rels');
        const target = new Map([...rels.matchAll(/<Relationship\b[^>]*>/g)].map((m) => [/Id="([^"]+)"/.exec(m[0])?.[1], /Target="([^"]+)"/.exec(m[0])?.[1]]));
        names = [...pres.matchAll(/<p:sldId\b[^>]*r:id="([^"]+)"/g)]
          .map((m) => target.get(m[1]))
          .filter(Boolean)
          .map((t) => path.posix.normalize('ppt/' + t.replace(/^\//, '')));
      } catch {}
      if (!names.length)
        names = z
          .getEntries()
          .map((e) => e.entryName)
          .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
          .sort((a, b) => Number(a.match(/slide(\d+)/)[1]) - Number(b.match(/slide(\d+)/)[1]));
      r.pages = names.length;
      const out = [];
      names.forEach((n, i) => {
        const lines = paras(raw(n), 'a:p', 'a:t').filter(Boolean);
        const head = 'Slide ' + (i + 1) + (lines[0] ? ' – ' + lines[0].slice(0, 120) : '');
        r.toc.push({ title: head, page: i + 1, offset: out.join('\n\n').length + (out.length ? 2 : 0) });
        out.push(['Slide ' + (i + 1), ...lines].join('\n'));
      });
      r.text = out.join('\n\n');
    }
  } else if (F.MOBI_EXT.includes(ext)) {
    const m = F.parseMobi(fs.readFileSync(file), { cover: false });
    delete m.cover;
    r = { ...r, ...m };
  } else if (ext === 'fb2') {
    const m = F.parseFb2(fs.readFileSync(file), { cover: false });
    delete m.cover;
    r = { ...r, ...m };
  } else if (ext === 'odt') {
    const z = F.zipOpen(file);
    const content = F.zipRead(z, 'content.xml')?.toString('utf8') || '';
    if (/<!ENTITY/i.test(content)) throw Error('XML entity không được phép');
    const body = /<office:body\b[\s\S]*<\/office:body>/i.exec(content)?.[0] || content;
    const t = F.markupToText(body);
    r.text = t.text;
    r.toc = t.toc;
    const meta = F.zipRead(z, 'meta.xml')?.toString('utf8') || '';
    const tag = (n) => F.entities((new RegExp('<' + n + '\\b[^>]*>([^<]*)<').exec(meta)?.[1] || '')).trim();
    r.title = tag('dc:title');
    r.author = tag('meta:initial-creator') || tag('dc:creator');
  } else if (ext === 'rtf') {
    const buf = fs.readFileSync(file);
    const s = buf.toString('latin1');
    r.text = F.rtfToText(s);
    const title = /\{\\title\s+((?:[^{}\\]|\\.)*)\}/.exec(s)?.[1];
    if (title) r.title = F.rtfToText('{' + title + '}');
    const author = /\{\\author\s+((?:[^{}\\]|\\.)*)\}/.exec(s)?.[1];
    if (author) r.author = F.rtfToText('{' + author + '}');
  } else if (ext === 'html' || ext === 'htm') {
    const s = F.decodeSmart(fs.readFileSync(file));
    r.title = F.entities(/<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(s)?.[1] || '').replace(/\s+/g, ' ').trim();
    r.author = F.entities(/<meta\s+name=["']author["']\s+content=["']([^"']*)/i.exec(s)?.[1] || '').trim();
    const t = F.markupToText(s);
    r.text = t.text;
    r.toc = t.toc;
  } else if (ext === 'md') {
    r.text = F.decodeSmart(fs.readFileSync(file));
    for (const m of r.text.matchAll(/^(#{1,3})\s+(.+)$/gm)) {
      if (r.toc.length < 3000) r.toc.push({ title: m[2].trim(), offset: m.index });
    }
    if (r.toc[0] && r.text.trimStart().startsWith('# ')) r.title = r.toc[0].title;
  } else if (ext === 'cbz') {
    const z = F.zipOpen(file);
    r.pages = F.comicEntries(z).length;
    const info = F.zipRead(z, 'ComicInfo.xml')?.toString('utf8') || '';
    const tag = (n) => F.entities(new RegExp('<' + n + '>([^<]*)<').exec(info)?.[1] || '').trim();
    r.title = tag('Title') || tag('Series');
    r.author = tag('Writer');
    r.text = tag('Summary');
    r.status = 'comic: truyện tranh ' + r.pages + ' trang ảnh';
  } else if (ext === 'djvu' || ext === 'cbr')
    r.status =
      'unsupported-reader: ' + ext.toUpperCase() + ' được lưu trong kho; mở bằng ứng dụng mặc định để đọc';
  else r.status = 'image: không có OCR';
  if (!r.text.trim() && r.status === 'ready') r.status = 'empty: không tìm thấy văn bản';
  // Muc luc du phong: dong bat dau bang "Chuong/Chapter/Phan..." (MOBI cu, TXT, RTF)
  if (!r.toc.length && r.text && ext !== 'pdf' && ext !== 'pptx') {
    const re = /^[ \t]*((?:CHƯƠNG|Chương|CHAPTER|Chapter|PHẦN|Phần|PART|Part|HỒI|Hồi|QUYỂN|Quyển|BÀI|Bài|MỤC|Mục)[ \t]+[\wÀ-ỹIVXLC]+\b[^\n]{0,90})$/gmu;
    for (const m of r.text.slice(0, 2000000).matchAll(re)) {
      r.toc.push({ title: m[1].trim(), offset: m.index });
      if (r.toc.length >= 3000) break;
    }
    if (r.toc.length < 2) r.toc = [];
  }
  if (r.text.length > 2000000) {
    r.text = r.text.slice(0, 2000000);
    r.status = 'partial: giới hạn 2 triệu ký tự';
  }
  return r;
}
main()
  .then((r) => parentPort.postMessage(r))
  .catch((e) => parentPort.postMessage({ error: e.message }));
