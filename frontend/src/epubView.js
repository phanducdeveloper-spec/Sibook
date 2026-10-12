// Trinh doc EPUB tich hop: giu nguyen CSS, hinh, bang, font va muc luc cua sach.
// Moi chuong duoc dung trong Shadow DOM rieng de CSS cua sach khong anh huong app.
import JSZip from 'jszip';

const BASE_CSS = `:host{display:block}
.epub-body{box-sizing:border-box;max-width:820px;margin:0 auto;padding:48px 56px;background:#fff;color:#1d2330;
font-family:Georgia,'Times New Roman',serif;font-size:18px;line-height:1.65;overflow-wrap:break-word}
.epub-body img,.epub-body svg,.epub-body video{max-width:100%;height:auto}
.epub-body table{border-collapse:collapse;max-width:100%}
.epub-body pre{white-space:pre-wrap}
.epub-body a{color:#1650b4}`;

function dirOf(p) {
  const i = p.lastIndexOf('/');
  return i < 0 ? '' : p.slice(0, i + 1);
}
function resolve(base, href) {
  if (!href) return '';
  let h = href.split('#')[0].split('?')[0];
  try {
    h = decodeURIComponent(h);
  } catch {}
  if (/^[a-z]+:/i.test(h)) return '';
  const parts = (h.startsWith('/') ? h.slice(1) : dirOf(base) + h).split('/');
  const out = [];
  for (const s of parts) {
    if (s === '..') out.pop();
    else if (s && s !== '.') out.push(s);
  }
  return out.join('/');
}
function parseXml(text, type = 'application/xhtml+xml') {
  let doc = new DOMParser().parseFromString(text, type);
  if (doc.getElementsByTagName('parsererror').length) doc = new DOMParser().parseFromString(text, 'text/html');
  return doc;
}
const byTag = (root, name) => Array.from(root.getElementsByTagNameNS('*', name));

export async function renderEpub(container, book, { onLink } = {}) {
  const url = new URL('./__book/' + encodeURIComponent(book.id), document.baseURI).href;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Không đọc được file (' + res.status + ')');
  const zip = await JSZip.loadAsync(await res.arrayBuffer());
  const files = {};
  zip.forEach((p, f) => {
    if (!f.dir) files[p] = f;
  });
  const fileAt = (p) => files[p] || files[Object.keys(files).find((k) => k.toLowerCase() === p.toLowerCase())];

  const containerXml = await fileAt('META-INF/container.xml')?.async('text');
  const opfPath = containerXml && parseXml(containerXml, 'application/xml').querySelector('rootfile')?.getAttribute('full-path');
  if (!opfPath || !fileAt(opfPath)) throw new Error('EPUB thiếu file OPF');
  const opf = parseXml(await fileAt(opfPath).async('text'), 'application/xml');
  const manifest = {};
  for (const it of byTag(opf, 'item'))
    manifest[it.getAttribute('id')] = {
      path: resolve(opfPath, it.getAttribute('href')),
      type: it.getAttribute('media-type') || '',
      props: it.getAttribute('properties') || '',
    };
  const spineEl = byTag(opf, 'spine')[0];
  const spine = byTag(opf, 'itemref')
    .map((r) => manifest[r.getAttribute('idref')])
    .filter((m) => m && fileAt(m.path) && /html|xml/i.test(m.type + m.path));
  if (!spine.length) throw new Error('EPUB không có chương nào');

  // Tai nguyen -> blob URL (anh, font, ...); CSS duoc viet lai duong dan.
  const blobs = new Map();
  const urls = [];
  async function blobUrl(p) {
    if (!blobs.has(p))
      blobs.set(
        p,
        (async () => {
          const f = fileAt(p);
          if (!f) return '';
          const m = Object.values(manifest).find((x) => x.path === p);
          const u = URL.createObjectURL(new Blob([await f.async('uint8array')], { type: m?.type || '' }));
          urls.push(u);
          return u;
        })(),
      );
    return blobs.get(p);
  }
  const fontStyle = document.createElement('style');
  fontStyle.dataset.epubFonts = book.id;
  document.head.appendChild(fontStyle);
  const cssCache = new Map();
  async function rewriteCss(css, base, depth = 0) {
    css = css.replace(/@charset[^;]*;/gi, '');
    // @import
    const imports = [];
    css = css.replace(/@import\s+(?:url\()?\s*['"]?([^'")\s;]+)['"]?\s*\)?[^;]*;/gi, (_, h) => {
      imports.push(resolve(base, h));
      return '';
    });
    let pre = '';
    if (depth < 4) for (const p of imports) pre += await loadCss(p, depth + 1);
    const refs = [...css.matchAll(/url\(\s*['"]?([^'")]+?)['"]?\s*\)/gi)];
    const map = {};
    for (const m of refs) {
      const p = resolve(base, m[1].trim());
      if (p && !(m[1] in map)) map[m[1]] = await blobUrl(p);
    }
    css = css.replace(/url\(\s*['"]?([^'")]+?)['"]?\s*\)/gi, (all, h) => (map[h] ? `url("${map[h]}")` : all));
    // @font-face khong hoat dong trong Shadow DOM -> dua ra document.
    css = css.replace(/@font-face\s*\{[^}]*\}/gi, (f) => {
      fontStyle.textContent += f + '\n';
      return '';
    });
    // html/body cua sach -> khung .epub-body
    css = css.replace(/(^|\})([^{}@]+)\{/g, (all, b, sel) =>
      b + sel.replace(/(^|[\s,>+~(])(html|body)(?=$|[\s,.#:[>+~)])/gi, '$1.epub-body').replace(/:root/g, '.epub-body') + '{',
    );
    return pre + css;
  }
  async function loadCss(p, depth = 0) {
    if (!cssCache.has(p))
      cssCache.set(
        p,
        (async () => {
          const f = fileAt(p);
          return f ? rewriteCss(await f.async('text'), p, depth) : '';
        })(),
      );
    return cssCache.get(p);
  }

  container.innerHTML = '';
  const hosts = new Map();
  function goTo(target) {
    const [p, frag] = target.split('#');
    const host = hosts.get(p) || (p ? null : null);
    if (!host) return false;
    let el = null;
    if (frag) {
      const id = decodeURIComponent(frag);
      el = host.shadowRoot.getElementById(id) || host.shadowRoot.querySelector(`[name="${CSS.escape(id)}"]`);
    }
    (el || host).scrollIntoView({ block: 'start' });
    return true;
  }

  async function buildChapter(item) {
    const doc = parseXml(await fileAt(item.path).async('text'));
    const host = document.createElement('section');
    host.className = 'epub-chapter';
    host.dataset.href = item.path;
    const root = host.attachShadow({ mode: 'open' });
    let css = BASE_CSS + '\n';
    for (const el of Array.from(doc.querySelectorAll('link, style'))) {
      if (el.localName === 'style') css += await rewriteCss(el.textContent || '', item.path);
      else if (/stylesheet/i.test(el.getAttribute('rel') || '')) css += await loadCss(resolve(item.path, el.getAttribute('href')));
    }
    const style = document.createElement('style');
    style.textContent = css;
    root.appendChild(style);
    const body = doc.body || doc.documentElement;
    const wrap = document.createElement('div');
    wrap.className = 'epub-body ' + (body.getAttribute?.('class') || '');
    const bs = body.getAttribute?.('style');
    if (bs) wrap.setAttribute('style', bs);
    // Viet lai tren tai lieu tro (inert) truoc khi dua vao trang de khong tai URL sai.
    for (const bad of body.querySelectorAll('script, iframe, object, embed, form, base, link, meta, title, style'))
      if (bad.localName === 'style') {
        style.textContent += '\n' + (await rewriteCss(bad.textContent || '', item.path));
        bad.remove();
      } else bad.remove();
    for (const el of body.querySelectorAll('*')) {
      for (const a of Array.from(el.attributes)) if (/^on/i.test(a.name)) el.removeAttribute(a.name);
      const tag = el.localName;
      if (tag === 'img' || tag === 'source' || tag === 'video' || tag === 'audio') {
        const src = el.getAttribute('src');
        if (src && !/^(data|blob):/i.test(src)) el.setAttribute('src', (await blobUrl(resolve(item.path, src))) || '');
        el.removeAttribute('srcset');
        if (tag === 'img') el.setAttribute('loading', 'lazy');
      } else if (tag === 'image' || tag === 'use') {
        const h = el.getAttribute('href') || el.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
        if (h && !h.startsWith('#') && !/^(data|blob):/i.test(h)) {
          const u = await blobUrl(resolve(item.path, h));
          el.setAttribute('href', u);
          el.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', u);
        }
      } else if (tag === 'a') {
        const h = el.getAttribute('href') || el.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
        if (!h) continue;
        if (/^[a-z]+:/i.test(h)) {
          el.setAttribute('target', '_blank');
          el.setAttribute('rel', 'noopener');
          continue;
        }
        const target = (h.startsWith('#') ? item.path : resolve(item.path, h)) + (h.includes('#') ? '#' + h.split('#')[1] : '');
        el.dataset.epubTarget = target;
      }
      if (el.hasAttribute('style') && /url\(/i.test(el.getAttribute('style')))
        el.setAttribute('style', await rewriteCss('x{' + el.getAttribute('style') + '}', item.path).then((c) => c.replace(/^\s*x\{|\}\s*$/g, '')));
    }
    for (const n of Array.from(body.childNodes)) wrap.appendChild(document.importNode(n, true));
    root.appendChild(wrap);
    root.addEventListener('click', (e) => {
      const a = e.composedPath().find((n) => n.dataset?.epubTarget);
      if (!a) return;
      e.preventDefault();
      if (goTo(a.dataset.epubTarget)) onLink?.(a.dataset.epubTarget);
    });
    return host;
  }

  // Muc luc: EPUB3 nav -> EPUB2 NCX -> danh sach chuong.
  async function readToc() {
    const nav = Object.values(manifest).find((m) => /\bnav\b/.test(m.props));
    if (nav && fileAt(nav.path)) {
      const d = parseXml(await fileAt(nav.path).async('text'));
      const navs = byTag(d, 'nav');
      const tocNav = navs.find((n) => /toc/.test(n.getAttribute('epub:type') || n.getAttributeNS('http://www.idpf.org/2007/ops', 'type') || '')) || navs[0];
      const out = [];
      const walk = (ol, level) => {
        for (const li of Array.from(ol.children).filter((c) => c.localName === 'li')) {
          const a = Array.from(li.children).find((c) => c.localName === 'a' || c.localName === 'span');
          const title = (a?.textContent || '').replace(/\s+/g, ' ').trim();
          const h = a?.getAttribute('href');
          if (title) out.push({ title, level, href: h ? resolve(nav.path, h) + (h.includes('#') ? '#' + h.split('#')[1] : '') : '' });
          const sub = Array.from(li.children).find((c) => c.localName === 'ol' || c.localName === 'ul');
          if (sub) walk(sub, level + 1);
        }
      };
      const ol = tocNav && Array.from(tocNav.getElementsByTagNameNS('*', 'ol')).concat(Array.from(tocNav.getElementsByTagNameNS('*', 'ul')))[0];
      if (ol) walk(ol, 0);
      if (out.length) return out;
    }
    const ncxId = spineEl?.getAttribute('toc');
    const ncx = (ncxId && manifest[ncxId]) || Object.values(manifest).find((m) => /ncx/.test(m.type));
    if (ncx && fileAt(ncx.path)) {
      const d = parseXml(await fileAt(ncx.path).async('text'), 'application/xml');
      const out = [];
      const walk = (el, level) => {
        for (const np of Array.from(el.children).filter((c) => c.localName === 'navPoint')) {
          const title = (byTag(np, 'text')[0]?.textContent || '').replace(/\s+/g, ' ').trim();
          const h = byTag(np, 'content')[0]?.getAttribute('src') || '';
          if (title) out.push({ title, level, href: resolve(ncx.path, h) + (h.includes('#') ? '#' + h.split('#')[1] : '') });
          walk(np, level + 1);
        }
      };
      const map = byTag(d, 'navMap')[0];
      if (map) walk(map, 0);
      if (out.length) return out;
    }
    return spine.map((s, i) => ({ title: 'Phần ' + (i + 1), level: 0, href: s.path }));
  }

  const toc = await readToc().catch(() => []);
  // Dung 3 chuong dau truoc de hien thi nhanh, phan con lai tiep tuc nen.
  let cancelled = false;
  let next = 0;
  async function buildUpTo(n) {
    for (; next < Math.min(n, spine.length) && !cancelled; next++) {
      const item = spine[next];
      const host = await buildChapter(item).catch((e) => {
        console.warn('[MewBook] EPUB chapter', item.path, e);
        return null;
      });
      if (host && !cancelled) {
        hosts.set(item.path, host);
        container.appendChild(host);
      }
    }
  }
  await buildUpTo(3);
  if (!hosts.size) await buildUpTo(spine.length);
  if (!hosts.size) throw new Error('Không dựng được chương nào');
  const done = (async () => {
    while (next < spine.length && !cancelled) {
      await new Promise((r) => setTimeout(r, 0));
      await buildUpTo(next + 4);
    }
  })();
  return {
    toc,
    done,
    async goTo(target) {
      if (!goTo(target)) {
        await done;
        goTo(target);
      }
    },
    chapters: () => spine.map((s) => s.path),
    // vi tri doc: "epub:<href>|<px trong chuong>"
    position() {
      const p = this.current();
      const h = p && hosts.get(p);
      if (!h) return '';
      const px = Math.round(container.getBoundingClientRect().top - h.getBoundingClientRect().top);
      return 'epub:' + p + '|' + Math.max(0, px);
    },
    async restore(loc) {
      const m = /^epub:(.*)\|(\d+)$/.exec(loc || '');
      if (!m) return;
      if (!hosts.has(m[1])) await done;
      const h = hosts.get(m[1]);
      if (h) container.scrollTop += h.getBoundingClientRect().top - container.getBoundingClientRect().top + Number(m[2]);
    },
    // vi tri hien tai: href chuong dang xem
    current() {
      const top = container.getBoundingClientRect().top;
      let cur = null;
      for (const [p, h] of hosts) {
        if (h.getBoundingClientRect().top - top <= 40) cur = p;
        else break;
      }
      return cur;
    },
    destroy() {
      cancelled = true;
      urls.forEach((u) => URL.revokeObjectURL(u));
      fontStyle.remove();
    },
  };
}
