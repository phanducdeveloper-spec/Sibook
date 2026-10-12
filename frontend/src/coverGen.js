// Tao anh bia / preview cho moi loai sach:
// - PDF: render trang 1 bang pdf.js
// - EPUB/MOBI/AZW3/FB2/CBZ/DOCX/PPTX/ODT: anh bia nhung san trong file (backend)
// - Con lai (TXT, RTF, MD, HTML, MOBI khong co bia...): ve "trang dau" tu van ban
// Ket qua luu o backend, chi tao 1 lan.
import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { formatColor } from './bookFormats.js';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
const base = new URL('./pdfjs/', document.baseURI).href;
const failed = new Set();
const inflight = new Map();
export const coverMeta = new Map();
let chain = Promise.resolve();
const W = 420;

async function renderPdfCover(id, width = W) {
  const task = pdfjs.getDocument({
    url: new URL('./__book/' + encodeURIComponent(id), document.baseURI).href,
    isEvalSupported: false,
    disableAutoFetch: true,
    cMapUrl: base + 'cmaps/',
    cMapPacked: true,
    standardFontDataUrl: base + 'standard_fonts/',
    wasmUrl: base + 'wasm/',
  });
  try {
    const doc = await task.promise;
    const page = await doc.getPage(1);
    const unit = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: Math.min(4, width / unit.width) });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.min(Math.ceil(viewport.height), width * 3);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvas, canvasContext: ctx, viewport }).promise;
    return canvas.toDataURL('image/jpeg', 0.82);
  } finally {
    await task.destroy().catch(() => {});
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Anh bia hong'));
    img.src = src;
  });
}

// Thu nho anh bia nhung san ve 420px (JPEG) -> nhe, dong nhat
async function imageCover(dataUrl) {
  const img = await loadImage(dataUrl);
  if (!img.naturalWidth || !img.naturalHeight) throw new Error('Anh bia rong');
  const scale = Math.min(1, W / img.naturalWidth);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.min(Math.round(img.naturalHeight * scale), W * 3));
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, Math.round(img.naturalHeight * scale));
  return canvas.toDataURL('image/jpeg', 0.85);
}

function wrap(ctx, text, maxWidth, maxLines) {
  const lines = [];
  for (const para of String(text || '').split(/\n+/)) {
    const words = para.trim().split(/\s+/).filter(Boolean);
    let line = '';
    for (let w of words) {
      // tu qua dai (CJK, URL) -> cat theo ky tu
      while (ctx.measureText(w).width > maxWidth) {
        let k = w.length;
        while (k > 1 && ctx.measureText((line ? line + ' ' : '') + w.slice(0, k)).width > maxWidth) k--;
        if (k <= 1 && line) { lines.push(line); line = ''; continue; }
        lines.push((line ? line + ' ' : '') + w.slice(0, k));
        line = '';
        w = w.slice(k);
        if (lines.length >= maxLines) return lines;
      }
      const t = line ? line + ' ' + w : w;
      if (ctx.measureText(t).width > maxWidth && line) {
        lines.push(line);
        line = w;
      } else line = t;
      if (lines.length >= maxLines) return lines;
    }
    if (line) lines.push(line);
    if (lines.length >= maxLines) return lines;
  }
  return lines;
}

// Ve "trang dau" cua sach tu tieu de + doan van ban dau
function textCover(info) {
  const H = Math.round(W * 1.414);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const color = formatColor(info.format);
  const fmt = String(info.format || 'FILE');
  ctx.fillStyle = '#fdfcf8';
  ctx.fillRect(0, 0, W, H);
  // dai mau dinh dang
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, W, 14);
  ctx.fillRect(0, 0, 10, H);
  const pad = 34;
  ctx.textBaseline = 'top';
  ctx.fillStyle = color;
  ctx.font = '700 15px "Segoe UI", Arial, sans-serif';
  ctx.fillText(fmt.toUpperCase(), pad, 32);
  let y = 62;
  ctx.fillStyle = '#1f2430';
  ctx.font = '700 29px "Segoe UI", Arial, sans-serif';
  const titleLines = wrap(ctx, info.title || 'Không tên', W - pad * 2, 4);
  for (const l of titleLines) { ctx.fillText(l, pad, y); y += 36; }
  if (info.author && info.author !== 'Chưa rõ tác giả') {
    ctx.fillStyle = '#6b7080';
    ctx.font = 'italic 17px "Segoe UI", Arial, sans-serif';
    for (const l of wrap(ctx, info.author, W - pad * 2, 2)) { y += 2; ctx.fillText(l, pad, y); y += 22; }
  }
  y += 14;
  ctx.fillStyle = color;
  ctx.fillRect(pad, y, 64, 3);
  y += 22;
  const snippet = String(info.snippet || '').replace(/\r/g, '').trim();
  if (snippet) {
    ctx.fillStyle = '#3d4250';
    ctx.font = '15px Cambria, "Times New Roman", Georgia, serif';
    const lh = 22;
    const max = Math.floor((H - y - 28) / lh);
    // bo trung lap tieu de o dau van ban
    const body = snippet.startsWith(info.title) ? snippet.slice(info.title.length).trim() || snippet : snippet;
    for (const l of wrap(ctx, body, W - pad * 2, max)) { ctx.fillText(l, pad, y); y += lh; }
    const g = ctx.createLinearGradient(0, H - 110, 0, H);
    g.addColorStop(0, 'rgba(253,252,248,0)');
    g.addColorStop(1, 'rgba(253,252,248,1)');
    ctx.fillStyle = g;
    ctx.fillRect(10, H - 110, W - 10, 110);
  } else {
    // khong co van ban: bieu tuong dinh dang lon
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = color;
    ctx.font = '800 ' + (fmt.length > 4 ? 84 : 110) + 'px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(fmt.toUpperCase(), W / 2 + 5, H / 2 + 10);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }
  ctx.fillStyle = '#a0a4b0';
  ctx.font = '12px "Segoe UI", Arial, sans-serif';
  if (info.pages) ctx.fillText(info.pages + ' trang', pad, H - 26);
  return canvas.toDataURL('image/jpeg', 0.86);
}

/** Tra ve Promise<url bia | null>. Chay tuan tu de khong lam nang may. */
export function ensureCover(book, backend) {
  if (!backend || !book?.autoCover || failed.has(book.id)) return null;
  if (inflight.has(book.id)) return inflight.get(book.id);
  const job = chain.then(async () => {
    try {
      let dataUrl = null;
      if (String(book.format).toUpperCase() === 'PDF') {
        try {
          dataUrl = await renderPdfCover(book.id);
        } catch (e) {
          console.warn('[MewBook] PDF loi, dung preview van ban', book.id, e);
        }
      }
      if (!dataUrl) {
        const info = (await backend('coverInfo', { id: book.id })) || {};
        if (info.image) {
          try {
            dataUrl = await imageCover(info.image);
          } catch {}
        }
        if (!dataUrl) dataUrl = textCover({ ...book, ...info });
        if (info.title) coverMeta.set(book.id, { title: info.title, author: info.author, pages: info.pages });
      }
      return await backend('saveCover', { id: book.id, dataUrl });
    } catch (e) {
      console.warn('[MewBook] Khong tao duoc anh bia', book.id, e);
      return null;
    }
  });
  chain = job.catch(() => null);
  const p = job.then((url) => {
    inflight.delete(book.id);
    if (!url) failed.add(book.id);
    return url;
  });
  inflight.set(book.id, p);
  return p;
}
