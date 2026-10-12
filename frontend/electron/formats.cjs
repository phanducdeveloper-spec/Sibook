'use strict';
// Bo doc dinh dang ebook dung chung (extractor + library): MOBI/AZW/AZW3/PRC/PDB,
// FB2, ODT, RTF, HTML, Markdown, CBZ va trich anh bia nhung san trong file.
const fs = require('node:fs');
const path = require('node:path');

const IMAGE_EXT = ['png', 'jpg', 'jpeg', 'webp'];
const MOBI_EXT = ['mobi', 'azw', 'azw3', 'prc', 'pdb'];
const EBOOK_EXT = [
  'pdf', 'epub', ...MOBI_EXT, 'fb2', 'djvu', 'cbz', 'cbr',
  'txt', 'rtf', 'md', 'html', 'htm', 'docx', 'odt', 'pptx',
];
const ALL_EXT = [...EBOOK_EXT, ...IMAGE_EXT];
const formatOf = (ext) => {
  ext = String(ext || '').toLowerCase();
  if (IMAGE_EXT.includes(ext)) return 'Hình ảnh';
  if (ext === 'htm') return 'HTML';
  return ext.toUpperCase();
};

function imageType(b) {
  if (!b || b.length < 12) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b.toString('latin1', 0, 4) === 'GIF8') return 'image/gif';
  if (b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP') return 'image/webp';
  if (b[0] === 0x42 && b[1] === 0x4d) return 'image/bmp';
  return null;
}

function decode(buf, enc = 'utf-8') {
  try {
    return new TextDecoder(enc).decode(buf);
  } catch {
    return Buffer.from(buf).toString('latin1');
  }
}
function decodeSmart(buf) {
  if (buf[0] === 0xff && buf[1] === 0xfe) return decode(buf.subarray(2), 'utf-16le');
  if (buf[0] === 0xfe && buf[1] === 0xff) return decode(buf.subarray(2), 'utf-16be');
  const head = buf.subarray(0, 2048).toString('latin1');
  const cs = /encoding\s*=\s*["']([\w-]+)["']/i.exec(head)?.[1] ||
    /<meta[^>]+charset\s*=\s*["']?([\w-]+)/i.exec(head)?.[1];
  let s;
  if (cs && !/^utf-?8$/i.test(cs)) s = decode(buf, cs.toLowerCase());
  else {
    s = decode(buf, 'utf-8');
    // Khong khai bao ma ma co qua nhieu ky tu loi -> thu windows-1252
    if (!cs && (s.match(/\uFFFD/g) || []).length > 20) s = decode(buf, 'windows-1252');
  }
  return s.replace(/^\uFEFF/, '');
}

const ENT = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…',
  mdash: '—', ndash: '–', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”',
  copy: '©', reg: '®', laquo: '«', raquo: '»', middot: '·', bull: '•', shy: '',
  trade: '™', deg: '°', times: '×', eacute: 'é', egrave: 'è', agrave: 'à',
};
function entities(s) {
  return s.replace(/&(#x[0-9a-f]{1,6}|#\d{1,7}|[a-z]{2,8});/gi, (m, e) => {
    if (e[0] === '#') {
      const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return n > 0 && n < 0x110000 && !(n >= 0xd800 && n < 0xe000) ? String.fromCodePoint(n) : '';
    }
    const v = ENT[e.toLowerCase()];
    return v ?? m;
  });
}

const BLOCK = new Set([
  'p', 'div', 'li', 'tr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'section', 'article',
  'blockquote', 'pre', 'table', 'ul', 'ol', 'dt', 'dd', 'hr', 'subtitle', 'v',
  'stanza', 'poem', 'empty-line', 'epigraph', 'text-author', 'pagebreak',
  'list-item', 'table-row', 'page', 'cite', 'figure', 'header', 'footer', 'body',
  'main', 'aside', 'nav', 'caption', 'dl', 'annotation',
]);
const HEAD = new Set(['h1', 'h2', 'h3', 'h', 'title']);
const BR = new Set(['br', 'line-break']);
const SPACE = new Set(['tab', 's', 'td', 'th', 'table-cell']);

/** HTML/XML -> van ban thuong + muc luc tu tieu de (h1-h3, FB2 title, ODT text:h). */
function markupToText(src, limit = 2200000) {
  const s = String(src)
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<(script|style|head|binary|description|svg)\b[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<\?[\s\S]*?\?>|<!DOCTYPE[^>]*>/gi, '');
  const parts = [], toc = [];
  let len = 0, nls = 2, space = false, cur = null;
  const emit = (t) => { parts.push(t); len += t.length; };
  const block = (n) => {
    if (len === 0) return;
    if (nls < n) { emit('\n'.repeat(n - nls)); nls = n; }
    space = false;
  };
  const word = (raw) => {
    const t = entities(raw).replace(/\s+/g, ' ');
    if (!t) return;
    const core = t.trim();
    if (!core) { if (nls === 0) space = true; return; }
    if ((t[0] === ' ' || space) && nls === 0) emit(' ');
    emit(core);
    nls = 0;
    space = t[t.length - 1] === ' ';
    if (cur) cur.title += (cur.title ? ' ' : '') + core;
  };
  const re = /<(\/?)([a-zA-Z][\w:.-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>|([^<]+)|</g;
  let m;
  while ((m = re.exec(s))) {
    if (m[5] != null) { word(m[5]); }
    else if (m[0] === '<') word('<');
    else {
      const close = m[1] === '/', self = m[4] === '/';
      const name = m[2].toLowerCase().split(':').pop();
      if (HEAD.has(name)) {
        if (!close && !self) { block(2); cur = { title: '', offset: len }; }
        else if (close && cur) {
          const t = cur.title.trim();
          if (t && toc.length < 3000) toc.push({ title: t.slice(0, 200), offset: cur.offset });
          cur = null;
          block(2);
        }
      } else if (BR.has(name)) {
        if (len) { emit('\n'); nls = Math.min(nls + 1, 2); space = false; }
      } else if (SPACE.has(name)) {
        if (nls === 0) space = true;
      } else if (name === 'img' || name === 'image') {
        // bo qua anh
      } else if (BLOCK.has(name)) block(2);
    }
    if (len > limit) break;
  }
  return { text: parts.join('').trim(), toc };
}

// ---------- MOBI / AZW / AZW3 / PRC / PalmDOC ----------
function pdbRecords(buf) {
  if (buf.length < 86) throw Error('File PDB/MOBI quá ngắn hoặc hỏng');
  const n = buf.readUInt16BE(76);
  if (n < 1 || 78 + n * 8 > buf.length) throw Error('Bảng bản ghi MOBI không hợp lệ');
  const offs = [];
  for (let i = 0; i < n; i++) offs.push(buf.readUInt32BE(78 + i * 8));
  return {
    name: buf.toString('latin1', 0, 32).replace(/\0[\s\S]*$/, ''),
    type: buf.toString('latin1', 60, 68),
    count: n,
    rec(i) {
      if (i < 0 || i >= n) return Buffer.alloc(0);
      const a = offs[i], b = i + 1 < n ? offs[i + 1] : buf.length;
      return a <= b && b <= buf.length ? buf.subarray(a, b) : Buffer.alloc(0);
    },
  };
}
function palmdoc(d) {
  const out = Buffer.alloc(d.length * 5 + 16);
  let o = 0, i = 0;
  while (i < d.length) {
    const c = d[i++];
    if (c >= 1 && c <= 8) for (let k = 0; k < c && i < d.length; k++) out[o++] = d[i++];
    else if (c < 0x80) out[o++] = c;
    else if (c >= 0xc0) { out[o++] = 0x20; out[o++] = c ^ 0x80; }
    else {
      if (i >= d.length) break;
      const v = (c << 8) | d[i++];
      const dist = (v >> 3) & 0x7ff, len = (v & 7) + 3;
      if (!dist || dist > o) break;
      for (let k = 0; k < len; k++) { out[o] = out[o - dist]; o++; }
    }
  }
  return out.subarray(0, o);
}
function trailingSize(rec, flags) {
  const size = rec.length;
  let num = 0;
  const entry = (sz) => {
    let bit = 0, res = 0;
    while (sz > 0) {
      const v = rec[sz - 1];
      res |= (v & 0x7f) << bit;
      bit += 7;
      sz--;
      if (v & 0x80 || bit >= 28) break;
    }
    return res;
  };
  for (let f = flags >> 1; f; f >>= 1) if (f & 1) num += entry(size - num);
  if (flags & 1 && size - num - 1 >= 0) num += (rec[size - num - 1] & 3) + 1;
  return Math.max(0, Math.min(num, size));
}
class Huff {
  constructor(huff, cdics) {
    if (huff.toString('latin1', 0, 4) !== 'HUFF') throw Error('Bảng HUFF không hợp lệ');
    const off1 = huff.readUInt32BE(8), off2 = huff.readUInt32BE(12);
    this.dict1 = [];
    for (let i = 0; i < 256; i++) {
      const v = huff.readUInt32BE(off1 + i * 4);
      const cl = v & 0x1f;
      this.dict1.push([cl, v & 0x80, (Math.floor(v / 256) + 1) * 2 ** (32 - cl) - 1]);
    }
    this.min = [0];
    this.max = [2 ** 32 - 1];
    for (let cl = 1; cl <= 32; cl++) {
      this.min[cl] = huff.readUInt32BE(off2 + (cl - 1) * 8) * 2 ** (32 - cl);
      this.max[cl] = (huff.readUInt32BE(off2 + (cl - 1) * 8 + 4) + 1) * 2 ** (32 - cl) - 1;
    }
    this.dict = [];
    for (const c of cdics) {
      if (c.toString('latin1', 0, 4) !== 'CDIC') continue;
      const phrases = c.readUInt32BE(8), bits = c.readUInt32BE(12);
      const n = Math.min(2 ** bits, phrases - this.dict.length);
      for (let i = 0; i < n; i++) {
        const off = c.readUInt16BE(16 + i * 2);
        const blen = c.readUInt16BE(16 + off);
        this.dict.push([c.subarray(18 + off, 18 + off + (blen & 0x7fff)), blen & 0x8000]);
      }
    }
  }
  unpack(data, depth = 0) {
    if (depth > 40) throw Error('Dữ liệu HUFF lồng quá sâu');
    const d = Buffer.concat([data, Buffer.alloc(8)]);
    let bitsleft = data.length * 8, pos = 0;
    const parts = [];
    for (;;) {
      const byte = pos >>> 3, sh = pos & 7;
      let code = d.readUInt32BE(byte);
      if (sh) code = ((code << sh) | (d[byte + 4] >>> (8 - sh))) >>> 0;
      let [cl, term, maxcode] = this.dict1[code >>> 24];
      if (!term) {
        while (cl < 32 && code < this.min[cl]) cl++;
        maxcode = this.max[cl];
      }
      if (!cl) throw Error('Mã HUFF không hợp lệ');
      pos += cl;
      bitsleft -= cl;
      if (bitsleft < 0) break;
      const r = Math.floor((maxcode - code) / 2 ** (32 - cl));
      const e = this.dict[r];
      if (!e) throw Error('Từ điển CDIC không hợp lệ');
      if (!e[1]) {
        this.dict[r] = null;
        e[0] = this.unpack(e[0], depth + 1);
        e[1] = 1;
        this.dict[r] = e;
      }
      parts.push(e[0]);
    }
    return Buffer.concat(parts);
  }
}
function parseMobi(buf, { text: wantText = true, cover: wantCover = true } = {}) {
  const pdb = pdbRecords(buf);
  const r0 = pdb.rec(0);
  if (r0.length < 16) throw Error('Bản ghi đầu MOBI không hợp lệ');
  const res = { title: '', author: '', publisher: '', text: '', toc: [], pages: 0, status: 'ready', cover: null };
  const comp = r0.readUInt16BE(0), nText = r0.readUInt16BE(8), crypt = r0.readUInt16BE(12);
  const isMobi = r0.length >= 24 && r0.toString('latin1', 16, 20) === 'MOBI';
  if (!isMobi && !/^TEXt(REAd|TlDc)/.test(pdb.type)) {
    res.status = 'unsupported-reader: kiểu PDB này (' + pdb.type.trim() + ') chưa có bộ đọc';
    return res;
  }
  let codepage = 1252, extra = 0, firstImg = 0;
  const exth = {};
  if (isMobi) {
    const hdrLen = r0.readUInt32BE(20);
    codepage = r0.readUInt32BE(28);
    const dec0 = (b) => decode(b, codepage === 65001 ? 'utf-8' : 'windows-1252');
    if (r0.length >= 0x5c) {
      const tOff = r0.readUInt32BE(0x54), tLen = r0.readUInt32BE(0x58);
      if (tLen < 2000 && tOff + tLen <= r0.length) res.title = dec0(r0.subarray(tOff, tOff + tLen)).trim();
    }
    if (r0.length >= 0x70) firstImg = r0.readUInt32BE(0x6c);
    if (hdrLen >= 0xe4 && r0.length >= 0xf4) extra = r0.readUInt16BE(0xf2);
    const exthFlag = r0.length >= 0x84 ? r0.readUInt32BE(0x80) : 0;
    let p = 16 + hdrLen;
    if (exthFlag & 0x40 && p + 12 <= r0.length && r0.toString('latin1', p, p + 4) === 'EXTH') {
      const cnt = r0.readUInt32BE(p + 8);
      p += 12;
      for (let i = 0; i < cnt && i < 2000 && p + 8 <= r0.length; i++) {
        const t = r0.readUInt32BE(p), l = r0.readUInt32BE(p + 4);
        if (l < 8 || p + l > r0.length) break;
        (exth[t] ??= []).push(r0.subarray(p + 8, p + l));
        p += l;
      }
    }
    if (exth[100]) res.author = exth[100].map(dec0).map((s) => s.trim()).filter(Boolean).join(', ');
    if (exth[503]?.[0]) res.title = dec0(exth[503][0]).trim() || res.title;
    if (exth[101]?.[0]) res.publisher = dec0(exth[101][0]).trim();
  }
  if (!res.title) res.title = pdb.name.replace(/_/g, ' ').trim();
  const dec = (b) => decode(b, codepage === 65001 ? 'utf-8' : 'windows-1252');
  if (wantCover && isMobi && firstImg > 0 && firstImg < pdb.count && firstImg !== 0xffffffff) {
    const cand = [];
    for (const k of [201, 202]) if (exth[k]?.[0]?.length >= 4) {
      const v = exth[k][0].readUInt32BE(0);
      if (v !== 0xffffffff) cand.push(firstImg + v);
    }
    for (let i = firstImg; i < Math.min(pdb.count, firstImg + 40); i++) cand.push(i);
    for (const i of cand) {
      const rec = pdb.rec(i);
      if (imageType(rec)) { res.cover = rec; break; }
    }
  }
  if (!wantText) return res;
  if (crypt !== 0) {
    res.status = 'drm: Sách được khóa DRM nên không đọc được nội dung';
    return res;
  }
  let huff = null;
  if (comp === 17480) {
    const ho = r0.readUInt32BE(0x70), hn = r0.readUInt32BE(0x74);
    const cd = [];
    for (let i = 1; i < hn && i < 64; i++) cd.push(pdb.rec(ho + i));
    huff = new Huff(pdb.rec(ho), cd);
  } else if (comp !== 1 && comp !== 2) {
    res.status = 'unsupported-reader: kiểu nén MOBI ' + comp + ' chưa hỗ trợ';
    return res;
  }
  const out = [];
  let total = 0;
  for (let i = 1; i <= nText && i < pdb.count; i++) {
    let rec = pdb.rec(i);
    rec = rec.subarray(0, rec.length - trailingSize(rec, extra));
    const o = comp === 1 ? rec : comp === 2 ? palmdoc(rec) : huff.unpack(rec);
    out.push(o);
    total += o.length;
    if (total > 30e6) { res.status = 'partial: giới hạn chỉ mục'; break; }
  }
  const raw = dec(Buffer.concat(out));
  if (isMobi || /<(p|div|br|html)\b/i.test(raw.slice(0, 5000))) {
    const t = markupToText(raw);
    res.text = t.text;
    res.toc = t.toc;
  } else res.text = raw;
  res.pages = res.toc.length;
  return res;
}

// ---------- FB2 ----------
function fb2Tag(src, n) {
  const m = new RegExp('<(?:[\\w-]+:)?' + n + '\\b[^>]*>([\\s\\S]*?)</(?:[\\w-]+:)?' + n + '\\s*>', 'i').exec(src);
  return m ? entities(m[1].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim() : '';
}
function parseFb2(buf, { text: wantText = true, cover: wantCover = true } = {}) {
  const s = decodeSmart(buf);
  if (/<!ENTITY/i.test(s.slice(0, 5000))) throw Error('XML entity không được phép');
  const res = { title: '', author: '', publisher: '', text: '', toc: [], pages: 0, status: 'ready', cover: null };
  const desc = /<description\b[\s\S]*?<\/description>/i.exec(s)?.[0] || '';
  const ti = /<title-info\b[\s\S]*?<\/title-info>/i.exec(desc)?.[0] || desc;
  res.title = fb2Tag(ti, 'book-title');
  res.author = [...ti.matchAll(/<author\b[\s\S]*?<\/author>/gi)]
    .map((a) => ['first-name', 'middle-name', 'last-name'].map((k) => fb2Tag(a[0], k)).filter(Boolean).join(' ') || fb2Tag(a[0], 'nickname'))
    .filter(Boolean)
    .join(', ');
  res.publisher = fb2Tag(/<publish-info\b[\s\S]*?<\/publish-info>/i.exec(desc)?.[0] || '', 'publisher');
  if (wantCover) {
    const id = /<coverpage\b[\s\S]*?href\s*=\s*["']#?([^"']+)["']/i.exec(ti)?.[1];
    const bins = [...s.matchAll(/<binary\b([^>]*)>([^<]*)<\/binary>/gi)];
    const pick = (id && bins.find((b) => new RegExp('\\bid\\s*=\\s*["\']' + id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '["\']').test(b[1]))) ||
      bins.find((b) => /cover/i.test(b[1]) && /image/i.test(b[1]));
    if (pick) {
      const data = Buffer.from(pick[2].replace(/\s+/g, ''), 'base64');
      if (imageType(data)) res.cover = data;
    }
  }
  if (wantText) {
    const bodies = [...s.matchAll(/<body\b[^>]*>([\s\S]*?)<\/body>/gi)].map((b) => '<section>' + b[1] + '</section>');
    const t = markupToText(bodies.join('') || s);
    res.text = t.text;
    res.toc = t.toc;
    res.pages = t.toc.length;
  }
  return res;
}

// ---------- RTF ----------
const RTF_DEST = new Set(('aftncn aftnsep aftnsepc annotation atnauthor atndate atnicn atnid atnparent atnref atntime ' +
  'atrfend atrfstart author background bkmkend bkmkstart blipuid buptim category colorschememapping colortbl comment ' +
  'company creatim datafield datastore defchp defpap do doccomm docvar dptxbxtext ebcend ebcstart factoidname falt ' +
  'fchars ffdeftext ffentrymcr ffexitmcr ffformat ffhelptext ffl ffname ffstattext field file filetbl fldinst fldtype ' +
  'fname fontemb fontfile fonttbl footer footerf footerl footerr footnote formfield ftncn ftnsep ftnsepc g generator ' +
  'gridtbl header headerf headerl headerr hl hlfr hlinkbase hlloc hlsrc hsv htmltag info keycode keywords latentstyles ' +
  'lchars levelnumbers leveltext lfolevel linkval list listlevel listname listoverride listoverridetable listpicture ' +
  'liststylename listtable listtext lsdlockedexcept macc maccPr mailmerge maln malnScr manager margPr mbar mbarPr ' +
  'mbaseJc mbegChr mborderBox mborderBoxPr mbox mboxPr mchr mcount mctrlPr md mdeg mdegHide mden mdiff mdPr me mendChr ' +
  'meqArr meqArrPr mf mfName mfPr mfunc mfuncPr mgroupChr mgroupChrPr mgrow mhideBot mhideLeft mhideRight mhideTop ' +
  'mhtmltag mlim mlimloc mlimlow mlimlowPr mlimupp mlimuppPr mm mmaddfieldname mmath mmathPict mmathPr mmaxdist mmc ' +
  'mmcJc mmconnectstr mmconnectstrdata mmcPr mmcs mmdatasource mmheadersource mmmailsubject mmodso mmodsofilter ' +
  'mmodsofldmpdata mmodsomappedname mmodsoname mmodsorecipdata mmodsosort mmodsosrc mmodsotable mmodsoudl ' +
  'mmodsoudldata mmodsouniquetag mmPr mmquery mmr mnary mnaryPr mnoBreak mnum mobjDist moMath moMathPara moMathParaPr ' +
  'mopEmu mphant mphantPr mplcHide mpos mr mrad mradPr mrPr msepChr mshow mshp msPre msPrePr msSub msSubPr msSubSup ' +
  'msSubSupPr msSup msSupPr mstrikeBLTR mstrikeH mstrikeTLBR mstrikeV msub msubHide msup msupHide mtransp mtype mvertJc ' +
  'mvfmf mvfml mvtof mvtol mzeroAsc mzeroDesc mzeroWid nesttableprops nextfile nonesttables objalias objclass objdata ' +
  'object objname objsect objtime oldcprops oldpprops oldsprops oldtprops oleclsid operator panose password passwordhash ' +
  'pgp pgptbl picprop pict pn pnseclvl pntext pntxta pntxtb printim private propname protend protstart protusertbl pxe ' +
  'result revtbl revtim rsidtbl rxe shp shpgrp shpinst shppict shprslt shptxt sn sp staticval stylesheet subject sv svb ' +
  'tc template themedata title txe ud upr userprops wgrffmtfilter windowcaption writereservation writereservhash xe xform ' +
  'xmlattrname xmlattrvalue xmlclose xmlname xmlnstbl xmlopen nonshppict').split(' '));
const RTF_SPECIAL = {
  par: '\n', sect: '\n\n', page: '\n\n', line: '\n', tab: '\t', emdash: '—', endash: '–',
  emspace: ' ', enspace: ' ', qmspace: ' ', bullet: '•', lquote: '‘', rquote: '’',
  ldblquote: '“', rdblquote: '”', row: '\n', cell: ' | ', nestcell: ' | ',
};
function rtfToText(s) {
  const cp = /\\ansicpg(\d+)/.exec(s.slice(0, 4000))?.[1];
  const enc = cp ? (cp === '65001' ? 'utf-8' : 'windows-' + cp) : 'windows-1252';
  const re = /\\([a-z]{1,32})(-?\d{1,10})? ?|\\'([0-9a-f]{2})|\\([^a-z])|([{}])|[\r\n]+|([^\\{}\r\n]+)/gi;
  const out = [], stack = [];
  let ignorable = false, ucskip = 1, curskip = 0, bytes = [], m;
  const flush = () => { if (bytes.length) { out.push(decode(Buffer.from(bytes), enc)); bytes = []; } };
  while ((m = re.exec(s))) {
    const [, word, arg, hex, ch, brace, txt] = m;
    if (hex) {
      if (curskip > 0) curskip--;
      else if (!ignorable) bytes.push(parseInt(hex, 16));
      continue;
    }
    flush();
    if (brace) {
      curskip = 0;
      if (brace === '{') stack.push([ucskip, ignorable]);
      else if (stack.length) [ucskip, ignorable] = stack.pop();
    } else if (ch) {
      curskip = 0;
      if (ch === '~') { if (!ignorable) out.push('\u00a0'); }
      else if ('{}\\'.includes(ch)) { if (!ignorable) out.push(ch); }
      else if (ch === '*') ignorable = true;
      else if (ch === '\n' || ch === '\r') { if (!ignorable) out.push('\n'); }
    } else if (word) {
      curskip = 0;
      if (RTF_DEST.has(word)) ignorable = true;
      else if (ignorable) {}
      else if (RTF_SPECIAL[word]) out.push(RTF_SPECIAL[word]);
      else if (word === 'uc') ucskip = Number(arg) || 0;
      else if (word === 'u') {
        let c = Number(arg);
        if (c < 0) c += 0x10000;
        out.push(String.fromCharCode(c));
        curskip = ucskip;
      }
    } else if (txt) {
      let t = txt;
      if (curskip > 0) { const k = Math.min(curskip, t.length); t = t.slice(k); curskip -= k; }
      if (t && !ignorable) out.push(t);
    }
  }
  flush();
  return out.join('').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

// ---------- ZIP helpers ----------
function zipOpen(p) {
  const AdmZip = require('adm-zip');
  const z = new AdmZip(p);
  let sum = 0;
  const es = z.getEntries();
  if (es.length > 20000) throw Error('Tài liệu chứa quá nhiều mục');
  for (const e of es) {
    sum += e.header.size;
    if (e.header.size > 64 * 1024 * 1024 || sum > 1024 * 1024 * 1024)
      throw Error('Tài liệu nén vượt giới hạn an toàn');
  }
  return z;
}
const natural = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
function comicEntries(z) {
  return z
    .getEntries()
    .filter((e) => !e.isDirectory && /\.(jpe?g|png|webp|gif|bmp)$/i.test(e.entryName) && !/(^|\/)(__MACOSX|\.)/.test(e.entryName))
    .sort((a, b) => natural(a.entryName, b.entryName));
}
function zipRead(z, name, max = 32 * 1024 * 1024) {
  const e = z.getEntry(name);
  return e && !e.isDirectory && e.header.size <= max ? e.getData() : null;
}

function epubCoverData(z) {
  const attr = (tag, a) => new RegExp('\\b' + a + '="([^"]*)"').exec(tag)?.[1];
  const opfPath = /full-path="([^"]+)"/.exec(zipRead(z, 'META-INF/container.xml')?.toString('utf8') || '')?.[1];
  if (opfPath) {
    const opf = zipRead(z, opfPath)?.toString('utf8') || '';
    const items = [...opf.matchAll(/<item\b[^>]*>/g)].map((x) => x[0]);
    let item = items.find((t) => /properties="[^"]*cover-image/.test(t));
    const metaTag = [...opf.matchAll(/<meta\b[^>]*>/g)].map((x) => x[0]).find((t) => attr(t, 'name') === 'cover');
    if (!item && metaTag) item = items.find((t) => attr(t, 'id') === attr(metaTag, 'content'));
    if (!item) item = items.find((t) => /media-type="image\//.test(t) && /cover/i.test(t));
    if (item && attr(item, 'href')) {
      const dir = path.posix.dirname(opfPath);
      const href = decodeURIComponent(attr(item, 'href'));
      const data = zipRead(z, path.posix.normalize(dir === '.' ? href : dir + '/' + href));
      if (imageType(data)) return data;
    }
  }
  const e = z.getEntries().find((x) => /\.(jpe?g|png|webp|gif)$/i.test(x.entryName) && /cover/i.test(x.entryName));
  const data = e ? zipRead(z, e.entryName) : null;
  return imageType(data) ? data : null;
}

/** Anh bia nhung san trong file (Buffer) hoac null. */
function embeddedCover(file, ext) {
  ext = String(ext || path.extname(file).slice(1)).toLowerCase();
  const size = fs.statSync(file).size;
  if (MOBI_EXT.includes(ext)) {
    if (size > 300 * 1024 * 1024) return null;
    return parseMobi(fs.readFileSync(file), { text: false }).cover;
  }
  if (ext === 'fb2') {
    if (size > 100 * 1024 * 1024) return null;
    return parseFb2(fs.readFileSync(file), { text: false }).cover;
  }
  if (['epub', 'cbz', 'docx', 'pptx', 'odt'].includes(ext)) {
    const z = zipOpen(file);
    if (ext === 'epub') return epubCoverData(z);
    if (ext === 'cbz') {
      const first = comicEntries(z)[0];
      const d = first ? zipRead(z, first.entryName) : null;
      return imageType(d) ? d : null;
    }
    const thumb = z.getEntries().find((e) => /^(docProps\/thumbnail|Thumbnails\/thumbnail)\.(jpe?g|png|gif|bmp)$/i.test(e.entryName));
    const d = thumb ? zipRead(z, thumb.entryName) : null;
    return imageType(d) ? d : null;
  }
  return null;
}

module.exports = {
  IMAGE_EXT, MOBI_EXT, EBOOK_EXT, ALL_EXT, formatOf, imageType, decode, decodeSmart,
  entities, markupToText, parseMobi, parseFb2, rtfToText, zipOpen, zipRead, comicEntries,
  embeddedCover, palmdoc, trailingSize,
};
