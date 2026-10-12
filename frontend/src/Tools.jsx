import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Tags, FolderTree, Copy, Users, ListChecks, ScanSearch, FolderInput, Eraser, Send, Repeat, FileSpreadsheet,
  Archive, Trash2, EyeOff, LifeBuoy, X, Globe, Bookmark, Check, HardDrive, RefreshCw, TriangleAlert, Layers,
} from 'lucide-react';
import { backend } from './backend-client';

const IC = { HardDrive, Tags, FolderTree, Copy, Users, ListChecks, ScanSearch, FolderInput, Eraser, Send, Repeat, FileSpreadsheet, Archive, Trash2, EyeOff, LifeBuoy, Globe, Layers };
export const CATEGORY_TAGS = ['điện-nhẹ', 'điện-công-nghiệp', 'tiêu-chuẩn-quy-chuẩn', 'xây-dựng-kiến-trúc', 'cntt-lập-trình', 'kinh-tế-kinh-doanh', 'kỹ-năng-tâm-lý', 'văn-học', 'lịch-sử-chính-trị', 'triết-học-tôn-giáo', 'khoa-học', 'giáo-dục-ngôn-ngữ', 'sức-khỏe-đời-sống', 'nghệ-thuật-văn-hóa', 'thiếu-nhi-truyện-tranh'];
export const TOOL_GROUPS = [
  [['classify', 'Tags', 'Tự động phân loại…'], ['tagFolder', 'FolderTree', 'Gán nhãn theo thư mục lưu trữ…'], ['duplicates', 'Copy', 'Tìm file trùng…'], ['authors', 'Users', 'Sửa tác giả…']],
  [['batch', 'ListChecks', 'Cập nhật thông tin sách hàng loạt…'], ['relink', 'ScanSearch', 'Tìm lại file…'], ['consolidate', 'FolderInput', 'Gom sách về một thư mục…'], ['cleanup', 'Eraser', 'Dọn dẹp thư viện…'], ['copies', 'HardDrive', 'Bỏ bản sao, dùng thư viện gốc…']],
  [['device', 'Send', 'Gửi sang máy đọc sách…'], ['convert', 'Repeat', 'Chuyển đổi định dạng…'], ['csv', 'FileSpreadsheet', 'Xuất danh sách sách (CSV)…']],
  [['backup', 'Archive', 'Sao lưu / khôi phục thư viện…']],
  [['trash', 'Trash2', 'Sách đã xóa (thùng rác)…'], ['excluded', 'EyeOff', 'Sách đã gỡ khỏi thư viện…']],
  [['help', 'LifeBuoy', 'Trợ giúp & giới thiệu']],
];
const TITLES = Object.fromEntries(TOOL_GROUPS.flat().map(([id, , l]) => [id, l.replace('…', '')]));
TITLES.meta = 'Tìm thêm thông tin trên mạng';
TITLES.saveFilter = 'Lưu bộ lọc thành bộ sưu tập';
const UNKNOWN = (v) => !v || v === 'Chưa cập nhật' || v === 'Chưa rõ tác giả';
const normalize = (s) => String(s || '').toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
const fmtBytes = (n) => (n >= 1e9 ? (n / 1e9).toFixed(2) + ' GB' : n >= 1e6 ? (n / 1e6).toFixed(1) + ' MB' : Math.round((n || 0) / 1e3) + ' KB');
const splitTags = (s) => String(s || '').split(/[,;\n]/).map((t) => t.trim().replace(/^#/, '').toLocaleLowerCase('vi').replace(/\s+/g, '-')).filter(Boolean);

export function ToolsMenu({ onPick, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    setTimeout(() => document.addEventListener('mousedown', h));
    return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div className="tools-menu" ref={ref} role="menu">
      {TOOL_GROUPS.map((g, i) => (
        <div key={i} className="tools-group">
          {g.map(([id, icon, label]) => {
            const C = IC[icon];
            return (
              <button key={id} role="menuitem" onClick={() => { onClose(); onPick(id); }}>
                <C size={15} strokeWidth={1.8} />
                {label}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function useScope(ctx, def = 'filtered') {
  const real = (l) => l.filter((b) => !b.demo).map((b) => b.id);
  const [scope, setScope] = useState(ctx.picked.length ? 'picked' : def);
  const ids = scope === 'picked' ? ctx.picked : scope === 'selected' ? (ctx.selected ? [ctx.selected.id] : []) : scope === 'all' ? real(ctx.all) : real(ctx.filtered);
  const el = (
    <label className="tool-scope">
      Áp dụng cho
      <select value={scope} onChange={(e) => setScope(e.target.value)}>
        {ctx.picked.length > 0 && <option value="picked">{ctx.picked.length} sách đang chọn</option>}
        {def === 'selected' && ctx.selected && <option value="selected">Sách đang xem: {ctx.selected.title.slice(0, 50)}</option>}
        <option value="filtered">{real(ctx.filtered).length} sách đang hiển thị (theo bộ lọc)</option>
        <option value="all">Toàn bộ thư viện ({real(ctx.all).length} sách)</option>
      </select>
    </label>
  );
  return [ids, el, scope];
}

export function ToolDialog({ tool, onClose, ctx }) {
  const [err, setErr] = useState('');
  const [working, setWorking] = useState(false);
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', h, true);
    return () => window.removeEventListener('keydown', h, true);
  }, []);
  const call = async (action, p = {}, { reload = false, msg } = {}) => {
    setErr(''); setWorking(true);
    try {
      const r = await backend('tool.' + action, p);
      if (reload && r !== null) await ctx.reload();
      if (msg && r) ctx.notify(typeof msg === 'function' ? msg(r) : msg);
      return r;
    } catch (e) { setErr(e.message); return null; } finally { setWorking(false); }
  };
  const P = { ctx, call, working, onClose };
  const Body = { duplicates: Duplicates, relink: Relink, cleanup: Cleanup, authors: Authors, batch: Batch, classify: Classify, tagFolder: TagFolder, consolidate: Consolidate, csv: Csv, backup: Backup, device: Device, convert: Convert, excluded: Excluded, copies: Copies, help: Help, meta: Meta, saveFilter: SaveFilter }[tool];
  return (
    <div className="modal-backdrop tool-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget && !working) onClose(); }}>
      <section className="modal tool-modal" role="dialog" aria-modal="true" aria-label={TITLES[tool]}>
        <button className="tool modal-close" aria-label="Đóng" onClick={onClose}><X size={18} /></button>
        <h2>{TITLES[tool]}</h2>
        {Body ? <Body {...P} /> : null}
        {working && <p className="tool-working"><RefreshCw size={14} className="spin" /> Đang xử lý…</p>}
        {err && <p className="tool-err"><TriangleAlert size={14} /> {err}</p>}
      </section>
    </div>
  );
}

function BookLine({ b, children }) {
  return (
    <div className="tool-book">
      {children}
      <div>
        <b>{b.title}</b>
        <small>{b.author} · {b.format} · {b.size}{b.progress ? ` · đã đọc ${b.progress}%` : ''}{b.linked ? '' : ' · bản sao cũ'}</small>
        <small className="path">{b.filePath}</small>
      </div>
    </div>
  );
}

function Duplicates({ ctx, call, working }) {
  const [res, setRes] = useState(null);
  const [chk, setChk] = useState({});
  const byId = useMemo(() => Object.fromEntries(ctx.all.map((b) => [b.id, b])), [ctx.all]);
  const scan = async () => {
    const r = await call('duplicates');
    if (!r) return;
    setRes(r);
    const c = {};
    for (const g of r.groups) {
      if (g.kind !== 'same') continue;
      const bs = g.ids.map((id) => byId[id]).filter(Boolean);
      const keep = [...bs].sort((a, b) => (b.progress || 0) - (a.progress || 0) || String(b.openedAt || '').localeCompare(String(a.openedAt || '')) || Number(!!b.linked) - Number(!!a.linked))[0];
      bs.forEach((b) => { if (keep && b.id !== keep.id) c[b.id] = true; });
    }
    setChk(c);
  };
  useEffect(() => { scan(); }, []);
  if (!res) return <p>Đang so sánh nội dung file… (thư viện lớn có thể mất vài phút)</p>;
  const groups = res.groups.map((g) => ({ ...g, books: g.ids.map((id) => byId[id]).filter(Boolean) })).filter((g) => g.books.length > 1);
  const same = groups.filter((g) => g.kind === 'same'), title = groups.filter((g) => g.kind === 'title');
  const picked = Object.keys(chk).filter((k) => chk[k] && byId[k]);
  const render = (g, i) => (
    <div className="dup-group" key={i}>
      {g.books.map((b) => (
        <BookLine key={b.id} b={b}>
          <input type="checkbox" checked={!!chk[b.id]} onChange={(e) => setChk((c) => ({ ...c, [b.id]: e.target.checked }))} title="Đánh dấu để chuyển vào thùng rác" />
        </BookLine>
      ))}
    </div>
  );
  return (
    <>
      <p>Đã quét {res.scanned.toLocaleString('vi')} sách: <b>{same.length}</b> nhóm trùng hoàn toàn (cùng nội dung file), <b>{title.length}</b> nhóm có thể trùng (cùng tên). Mục được đánh dấu sẽ chuyển vào thùng rác; file gốc trong thư mục liên kết không bị xóa.</p>
      <div className="tool-list">
        {same.length > 0 && <h4>Trùng hoàn toàn</h4>}
        {same.slice(0, 300).map(render)}
        {title.length > 0 && <h4>Có thể trùng (cùng tên, khác file)</h4>}
        {title.slice(0, 300).map(render)}
        {!groups.length && <p className="muted">Không tìm thấy sách trùng. 🎉</p>}
      </div>
      <div className="tool-actions">
        <button disabled={working} onClick={scan}>Quét lại</button>
        <button className="primary" disabled={working || !picked.length} onClick={async () => {
          const r = await call('batch', { ids: picked, trash: true }, { reload: true, msg: `Đã chuyển ${picked.length} sách trùng vào thùng rác.` });
          if (r) { setChk({}); setRes({ ...res, groups: res.groups.map((g) => ({ ...g, ids: g.ids.filter((id) => !picked.includes(id)) })) }); }
        }}>Chuyển {picked.length} mục đã chọn vào thùng rác</button>
      </div>
    </>
  );
}

function Relink({ ctx, call, working }) {
  const [res, setRes] = useState(null);
  const missing = ctx.all.filter((b) => b.missing);
  return (
    <>
      <p>Có <b>{missing.length}</b> sách không tìm thấy file (bị di chuyển, đổi tên hoặc ổ đĩa chưa cắm). “Tự động tìm lại” nối sách với file cùng tên và dung lượng trong các thư mục liên kết, giữ nguyên ghi chú, tiến độ, hashtag và bộ sưu tập.</p>
      <div className="tool-actions">
        <button className="primary" disabled={working || !missing.length} onClick={async () => setRes(await call('relinkAuto', {}, { reload: true }))}>Tự động tìm lại</button>
        <button disabled={working || !missing.length} onClick={() => call('batch', { ids: missing.map((b) => b.id), trash: true }, { reload: true, msg: 'Đã chuyển sách mất file vào thùng rác.' })}>Chuyển tất cả vào thùng rác</button>
      </div>
      {res && <p className="tool-ok">Đã nối lại {res.merged + res.relocated} sách; còn {res.notFound} sách chưa tìm thấy.</p>}
      <div className="tool-list">
        {missing.slice(0, 300).map((b) => (
          <BookLine key={b.id} b={b}>
            <button disabled={working} onClick={() => call('relinkManual', { id: b.id }, { reload: true, msg: 'Đã nối lại file.' })}>Chọn file…</button>
          </BookLine>
        ))}
      </div>
    </>
  );
}

function Cleanup({ call, working }) {
  const [s, setS] = useState(null);
  const [o, setO] = useState({ missing: false, demo: true, orphans: true, vacuum: true });
  const [done, setDone] = useState(null);
  const scan = async () => setS(await call('cleanupScan'));
  useEffect(() => { scan(); }, []);
  if (!s) return <p>Đang kiểm tra thư viện…</p>;
  const row = (k, label) => (
    <label className="tool-check"><input type="checkbox" checked={o[k]} onChange={(e) => setO({ ...o, [k]: e.target.checked })} />{label}</label>
  );
  return (
    <>
      {row('missing', `Chuyển ${s.missing} sách mất file vào thùng rác`)}
      {row('demo', `Ẩn ${s.demo} sách mẫu (chuyển vào thùng rác)`)}
      {row('orphans', `Xóa ${s.orphanFiles} file thừa trong kho (${fmtBytes(s.orphanFilesBytes)}), ${s.orphanCovers} ảnh bìa thừa (${fmtBytes(s.orphanCoversBytes)}), ${s.stale} mục cài đặt cũ`)}
      {row('vacuum', `Thu gọn cơ sở dữ liệu (hiện ${fmtBytes(s.dbBytes)})`)}
      <p className="muted">Không đụng tới file sách gốc trong thư mục liên kết. Sách vào thùng rác vẫn khôi phục được.</p>
      <div className="tool-actions">
        <button className="primary" disabled={working} onClick={async () => { const r = await call('cleanupRun', o, { reload: true }); if (r) { setDone(r); scan(); } }}>Dọn dẹp</button>
      </div>
      {done && <p className="tool-ok">Xong: {done.trashed} sách vào thùng rác, xóa {done.files} file và {done.covers} bìa thừa{done.vacuum ? ', đã thu gọn CSDL' : ''}.</p>}
    </>
  );
}

function Copies({ ctx, call, working }) {
  const [s, setS] = useState(null);
  const [r, setR] = useState(null);
  const [m, setM] = useState(null);
  const load = async () => setS(await call('copiesInfo'));
  useEffect(() => { load(); }, []);
  if (!s) return <p>Đang kiểm tra…</p>;
  return (
    <>
      <p>SI Book giờ <b>chỉ dùng thư viện gốc</b>: sách ở thư mục nào thì nằm yên ở đó, app chỉ lưu đường dẫn. Bản cũ từng sao chép sách vào <code>{s.filesDir}</code>.</p>
      <p className={s.copies ? '' : 'tool-ok'}>{s.copies ? <>Còn <b>{s.copies.toLocaleString('vi')}</b> sách đang là bản sao ({fmtBytes(s.bytes)}).</> : 'Không còn sách nào là bản sao. 🎉'} Thư mục bản sao hiện có {s.filesCount.toLocaleString('vi')} file ({fmtBytes(s.filesBytes)}).</p>
      <h4>1. Nối lại với thư viện gốc</h4>
      <p className="muted">Chọn thư mục gốc chứa sách (ví dụ D:\THƯ VIỆN SÁCH). SI Book liên kết thư mục đó, so khớp nội dung từng file (SHA-256), chuyển ghi chú / tiến độ / đánh giá / hashtag / bộ sưu tập sang sách gốc rồi xóa bản sao. File gốc không bị sửa.</p>
      <div className="tool-actions">
        <button className="primary" disabled={working || !s.copies} onClick={async () => { const x = await call('copiesRelink', {}, { reload: true }); if (x) { setR(x); load(); } }}>Chọn thư mục gốc và nối lại…</button>
      </div>
      {working && <p className="muted">Đang so khớp nội dung file — thư viện lớn có thể mất vài phút.</p>}
      {r && <p className="tool-ok">Đã nối lại {r.matched.toLocaleString('vi')} sách với file gốc trong {r.root}, giải phóng {fmtBytes(r.freed)}. Còn {r.remaining} bản sao{r.errors ? `; ${r.errors} file không đọc được` : ''}.</p>}
      <h4>2. Sách không còn bản gốc</h4>
      <p className="muted">Nếu file gốc đã bị xóa, chuyển các bản sao còn lại ra một thư mục bạn chọn (file được đưa ra khỏi AppData và liên kết tại chỗ).</p>
      <div className="tool-actions">
        <button disabled={working || !s.copies} onClick={async () => { const x = await call('copiesMoveOut', {}, { reload: true }); if (x) { setM(x); load(); } }}>Chuyển {s.copies} bản sao còn lại ra thư mục…</button>
      </div>
      {m && <p className="tool-ok">Đã chuyển {m.moved} sách sang {m.dir}{m.errors?.length ? `; lỗi ${m.errors.length}: ${m.errors.slice(0, 2).join('; ')}` : ''}.</p>}
    </>
  );
}

function authorKey(n) { return normalize(n).split(/[^a-z0-9]+/).filter(Boolean); }
function compatible(a, b) {
  if (a.length !== b.length || a.length < 2 || a[0] !== b[0] || a[a.length - 1] !== b[b.length - 1]) return false;
  return a.every((t, i) => t === b[i] || (t.length === 1 && b[i][0] === t) || (b[i].length === 1 && t[0] === b[i]));
}
function Authors({ ctx, call, working }) {
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState({});
  const [target, setTarget] = useState({});
  const authors = useMemo(() => {
    const m = new Map();
    for (const b of ctx.all) if (!b.demo) m.set(b.author, (m.get(b.author) || 0) + 1);
    return [...m].map(([name, count]) => ({ name, count, key: authorKey(name) })).sort((a, b) => b.count - a.count);
  }, [ctx.all]);
  const groups = useMemo(() => {
    const out = [], used = new Set();
    for (const a of authors) {
      if (used.has(a.name) || UNKNOWN(a.name)) continue;
      const g = authors.filter((x) => !used.has(x.name) && !UNKNOWN(x.name) && (x.key.join(' ') === a.key.join(' ') || compatible(x.key, a.key)));
      if (g.length > 1) { g.forEach((x) => used.add(x.name)); out.push(g); }
    }
    return out;
  }, [authors]);
  const shown = authors.filter((a) => normalize(a.name).includes(normalize(q))).slice(0, 200);
  const rename = (from, to) => call('renameAuthor', { from, to }, { reload: true, msg: (r) => `Đã cập nhật tác giả cho ${r.updated} sách.` });
  return (
    <>
      {groups.length > 0 && (
        <>
          <h4>Gợi ý gộp ({groups.length} nhóm tên giống nhau)</h4>
          <div className="tool-list short">
            {groups.slice(0, 50).map((g, i) => {
              const t = target[i] ?? g[0].name;
              return (
                <div className="merge-row" key={i}>
                  <span>{g.map((a) => `${a.name} (${a.count})`).join(' · ')}</span>
                  <select value={t} onChange={(e) => setTarget({ ...target, [i]: e.target.value })}>{g.map((a) => <option key={a.name}>{a.name}</option>)}</select>
                  <button disabled={working} onClick={() => rename(g.map((a) => a.name).filter((n) => n !== t), t)}>Gộp</button>
                </div>
              );
            })}
          </div>
        </>
      )}
      <h4>Tất cả tác giả ({authors.length})</h4>
      <input className="tool-search" placeholder="Tìm tác giả…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="tool-list">
        {shown.map((a) => {
          const v = edit[a.name] ?? a.name;
          return (
            <div className="author-row" key={a.name}>
              <input value={v} onChange={(e) => setEdit({ ...edit, [a.name]: e.target.value })} maxLength={300} />
              <em>{a.count}</em>
              <button disabled={working || !v.trim() || v === a.name} onClick={() => rename([a.name], v)}>Đổi</button>
              <button title="Lọc sách của tác giả này" onClick={() => ctx.applyFilter({ kind: 'author', value: a.name })}>Xem</button>
            </div>
          );
        })}
      </div>
    </>
  );
}

function Batch({ ctx, call, working }) {
  const [ids, scopeEl] = useScope(ctx);
  const [f, setF] = useState({ author: '', publisher: '', year: '', folder: '', addTags: '', removeTags: '', addCol: '', removeCol: '', favorite: '', toRead: '', progress: '', rating: '' });
  const [meta, setMeta] = useState(null);
  const [confirmTrash, setConfirmTrash] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const values = {};
  for (const k of ['author', 'publisher', 'year', 'folder']) if (f[k].trim()) values[k] = f[k].trim();
  if (f.favorite) values.favorite = f.favorite === 'yes';
  if (f.toRead) values.toRead = f.toRead === 'yes';
  if (f.progress) values.progress = Number(f.progress);
  if (f.rating) values.rating = Number(f.rating);
  const payload = { ids, values, addTags: splitTags(f.addTags), removeTags: splitTags(f.removeTags), addCollections: f.addCol ? [f.addCol] : [], removeCollections: f.removeCol ? [f.removeCol] : [] };
  const any = Object.keys(values).length || payload.addTags.length || payload.removeTags.length || f.addCol || f.removeCol;
  const noAuthor = ctx.all.filter((b) => ids.includes(b.id) && UNKNOWN(b.author)).map((b) => b.id);
  const sel = (k, opts) => <select value={f[k]} onChange={set(k)}><option value="">Không đổi</option>{opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>;
  return (
    <>
      {scopeEl}
      <p className="muted">Chỉ các ô có nhập mới được thay đổi. Mẹo: giữ Ctrl hoặc Shift và bấm vào sách để chọn nhiều cuốn.</p>
      <div className="tool-grid">
        <label>Tác giả<input value={f.author} onChange={set('author')} maxLength={300} /></label>
        <label>Nhà xuất bản<input value={f.publisher} onChange={set('publisher')} maxLength={300} /></label>
        <label>Năm xuất bản<input value={f.year} onChange={set('year')} maxLength={20} /></label>
        <label>Nhóm / thư mục hiển thị<input value={f.folder} onChange={set('folder')} maxLength={200} /></label>
        <label>Thêm hashtag (cách nhau dấu phẩy)<input value={f.addTags} onChange={set('addTags')} placeholder="vd: điện-nhẹ, camera" /></label>
        <label>Bỏ hashtag<input value={f.removeTags} onChange={set('removeTags')} /></label>
        <label>Thêm vào bộ sưu tập{sel('addCol', ctx.collections.map((c) => [c.id, c.name]))}</label>
        <label>Bỏ khỏi bộ sưu tập{sel('removeCol', ctx.collections.map((c) => [c.id, c.name]))}</label>
        <label>Yêu thích{sel('favorite', [['yes', 'Có'], ['no', 'Không']])}</label>
        <label>Sẽ đọc{sel('toRead', [['yes', 'Thêm vào Sẽ đọc'], ['no', 'Bỏ khỏi Sẽ đọc']])}</label>
        <label>Tiến độ đọc{sel('progress', [['0', 'Chưa đọc (0%)'], ['100', 'Đã đọc xong (100%)']])}</label>
        <label>Đánh giá{sel('rating', [1, 2, 3, 4, 5].map((n) => [String(n), '★'.repeat(n)]))}</label>
      </div>
      <div className="tool-actions">
        <button className="primary" disabled={working || !any || !ids.length} onClick={() => call('batch', payload, { reload: true, msg: (r) => `Đã cập nhật ${r.updated} sách.` })}>Cập nhật {ids.length} sách</button>
      </div>
      <h4><Globe size={14} /> Tự tìm thông tin trên mạng</h4>
      <p className="muted">Tra Google Books / Open Library theo tên sách, chỉ điền các ô còn trống (tác giả, NXB, năm, ISBN, mô tả). Mỗi lần tối đa 40 sách.</p>
      <div className="tool-actions">
        <button disabled={working || !noAuthor.length} onClick={async () => setMeta(await call('metaAuto', { ids: noAuthor, max: 40 }, { reload: true }))}>Tìm cho {Math.min(40, noAuthor.length)} / {noAuthor.length} sách chưa rõ tác giả</button>
      </div>
      {meta && <p className="tool-ok">Đã kiểm tra {meta.checked} sách: cập nhật {meta.updated}, không tìm thấy {meta.notFound}.</p>}
      <h4><Trash2 size={14} /> Xóa hàng loạt</h4>
      <div className="tool-actions">
        <label className="tool-check"><input type="checkbox" checked={confirmTrash} onChange={(e) => setConfirmTrash(e.target.checked)} />Tôi muốn chuyển {ids.length} sách vào thùng rác</label>
        <button disabled={working || !confirmTrash || !ids.length} onClick={async () => { const r = await call('batch', { ids, trash: true }, { reload: true, msg: (x) => `Đã chuyển ${x.updated} sách vào thùng rác.` }); if (r) { setConfirmTrash(false); ctx.setPicked([]); } }}>Chuyển vào thùng rác</button>
      </div>
    </>
  );
}

function TagStats({ r }) {
  const rows = Object.entries(r.perTag || {}).sort((a, b) => b[1] - a[1]);
  return (
    <div className="tag-stats">
      {rows.slice(0, 60).map(([t, n]) => <span key={t}>#{t} <em>{n}</em></span>)}
      {!rows.length && <p className="muted">Không có sách nào khớp.</p>}
    </div>
  );
}
function Classify({ ctx, call, working }) {
  const [ids, scopeEl, scope] = useScope(ctx, 'all');
  const [onlyNew, setOnlyNew] = useState(true);
  const [r, setR] = useState(null);
  const [applied, setApplied] = useState(false);
  const p = { onlyNew, ids: scope === 'all' ? null : ids };
  return (
    <>
      <p>Tự gắn hashtag chủ đề (Điện nhẹ, Điện công nghiệp, Tiêu chuẩn, Xây dựng, CNTT, Kinh tế, Kỹ năng, Văn học, Lịch sử, Triết học, Khoa học, Giáo dục, Sức khỏe, Nghệ thuật, Thiếu nhi) dựa trên tên sách, thư mục, mô tả và nội dung đã lập chỉ mục. Hashtag cũ được giữ nguyên.</p>
      {scopeEl}
      <label className="tool-check"><input type="checkbox" checked={onlyNew} onChange={(e) => { setOnlyNew(e.target.checked); setR(null); }} />Chỉ sách chưa có chủ đề</label>
      <div className="tool-actions">
        <button disabled={working} onClick={async () => { setApplied(false); setR(await call('classify', { ...p, apply: false })); }}>Xem trước</button>
        <button className="primary" disabled={working || !r?.matched || applied} onClick={async () => { const x = await call('classify', { ...p, apply: true }, { reload: true, msg: (y) => `Đã phân loại ${y.matched} sách.` }); if (x) setApplied(true); }}>Áp dụng</button>
      </div>
      {r && (
        <>
          <p className="tool-ok">{r.matched} / {r.scanned} sách xác định được chủ đề{applied ? ' — đã áp dụng' : ''}.</p>
          <TagStats r={r} />
          <div className="tool-list short">{r.sample.map((s, i) => <p key={i} className="sample"><b>{s.title}</b> → {s.tags.map((t) => '#' + t).join(' ')}</p>)}</div>
        </>
      )}
    </>
  );
}
function TagFolder({ call, working }) {
  const [mode, setMode] = useState('parent');
  const [r, setR] = useState(null);
  const [applied, setApplied] = useState(false);
  return (
    <>
      <p>Dùng tên thư mục chứa file làm hashtag. Ví dụ <code>D:\Sách\Kỹ thuật\Camera\abc.pdf</code> → <b>#camera</b> (hoặc cả <b>#kỹ-thuật</b>).</p>
      <label className="tool-scope">Cách gán
        <select value={mode} onChange={(e) => { setMode(e.target.value); setR(null); }}>
          <option value="parent">Chỉ thư mục chứa file</option>
          <option value="all">Tất cả thư mục con trên đường dẫn</option>
        </select>
      </label>
      <div className="tool-actions">
        <button disabled={working} onClick={async () => { setApplied(false); setR(await call('tagByFolder', { mode, apply: false })); }}>Xem trước</button>
        <button className="primary" disabled={working || !r?.matched || applied} onClick={async () => { const x = await call('tagByFolder', { mode, apply: true }, { reload: true, msg: (y) => `Đã gán nhãn cho ${y.matched} sách.` }); if (x) setApplied(true); }}>Áp dụng</button>
      </div>
      {r && <><p className="tool-ok">{r.matched} sách sẽ được thêm nhãn{applied ? ' — đã áp dụng' : ''}.</p><TagStats r={r} /></>}
    </>
  );
}
function Consolidate({ ctx, call, working }) {
  const [ids, scopeEl] = useScope(ctx);
  const [layout, setLayout] = useState('flat');
  const [r, setR] = useState(null);
  return (
    <>
      <p>Sao chép file sách về một thư mục (vd. để chép sang ổ khác, USB, chia sẻ). File gốc giữ nguyên chỗ cũ; file đã có sẵn (cùng tên, cùng dung lượng) sẽ bỏ qua.</p>
      {scopeEl}
      <label className="tool-scope">Sắp xếp vào
        <select value={layout} onChange={(e) => setLayout(e.target.value)}>
          <option value="flat">Một thư mục chung</option>
          <option value="author">Thư mục con theo tác giả</option>
          <option value="tag">Thư mục con theo hashtag đầu tiên</option>
          <option value="format">Thư mục con theo định dạng</option>
        </select>
      </label>
      <div className="tool-actions">
        <button className="primary" disabled={working || !ids.length} onClick={async () => setR(await call('consolidate', { ids, layout }))}>Chọn thư mục đích và sao chép {ids.length} sách</button>
      </div>
      {r && <p className="tool-ok">Đã sao chép {r.copied} file vào {r.dir}; bỏ qua {r.skipped}{r.errors.length ? `; lỗi ${r.errors.length}: ${r.errors.slice(0, 3).join('; ')}` : ''}.</p>}
    </>
  );
}
function Csv({ ctx, call, working }) {
  const [ids, scopeEl, scope] = useScope(ctx, 'all');
  const [r, setR] = useState(null);
  return (
    <>
      <p>Xuất danh sách gồm tên, tác giả, định dạng, NXB, năm, ISBN, hashtag, bộ sưu tập, tiến độ, đánh giá, ngày thêm, dung lượng và đường dẫn file. Mở được bằng Excel.</p>
      {scopeEl}
      <div className="tool-actions">
        <button className="primary" disabled={working} onClick={async () => setR(await call('exportCsv', { ids: scope === 'all' ? null : ids }))}>Xuất CSV…</button>
      </div>
      {r && <p className="tool-ok">Đã xuất {r.rows} sách: {r.file}</p>}
    </>
  );
}
function Backup({ call, working }) {
  const [info, setInfo] = useState(null);
  const [files, setFiles] = useState(false);
  const [r, setR] = useState(null);
  useEffect(() => { call('backupInfo').then(setInfo); }, []);
  return (
    <>
      <p>Bản sao lưu gồm cơ sở dữ liệu (thông tin sách, ghi chú, tiến độ, đánh giá, hashtag, bộ sưu tập, cài đặt) và ảnh bìa. Sách trong thư mục liên kết chỉ lưu đường dẫn, không sao chép file. API key AI không được sao lưu.</p>
      {info && <label className="tool-check"><input type="checkbox" checked={files} onChange={(e) => setFiles(e.target.checked)} />Kèm {info.importedFiles} bản sao cũ còn trong AppData ({fmtBytes(info.importedBytes)})</label>}
      {info?.last && <p className="muted">Lần sao lưu gần nhất: {new Date(info.last.at).toLocaleString('vi')} — {info.last.dest}</p>}
      <div className="tool-actions">
        <button className="primary" disabled={working} onClick={async () => { const x = await call('backup', { includeFiles: files }); if (x) { setR(x); setInfo(await call('backupInfo')); } }}>Sao lưu ngay…</button>
        <button disabled={working} onClick={() => call('restore')}>Khôi phục từ bản sao lưu…</button>
      </div>
      {r && <p className="tool-ok">Đã sao lưu {r.books} sách vào {r.dest}</p>}
      <p className="muted">Khôi phục sẽ khởi động lại app; thư viện hiện tại được giữ trong thư mục library-before-restore-… để phòng khi cần.</p>
    </>
  );
}
function Device({ ctx, call, working }) {
  const [ids, scopeEl] = useScope(ctx, 'selected');
  const [devs, setDevs] = useState(null);
  const [r, setR] = useState(null);
  const load = async () => setDevs((await call('devices')) || []);
  useEffect(() => { load(); }, []);
  const send = async (drive) => setR(await call('sendDevice', { ids, drive }));
  return (
    <>
      {scopeEl}
      <h4><HardDrive size={14} /> Thiết bị USB đang cắm</h4>
      {devs === null ? <p>Đang tìm thiết bị…</p> : !devs.length ? <p className="muted">Không thấy máy đọc sách/USB dạng ổ đĩa. Kindle đời mới (kết nối MTP) hãy dùng “Send to Kindle” bên dưới.</p> : (
        <div className="tool-list short">
          {devs.map((d) => (
            <div className="device-row" key={d.drive}>
              <span><b>{d.drive} {d.label}</b> · {d.kind === 'kindle' ? 'Kindle' : d.kind === 'kobo' ? 'Kobo' : 'USB'} · trống {fmtBytes(d.free)}<small>{d.target}</small></span>
              <button className="primary" disabled={working || !ids.length} onClick={() => send(d.drive)}>Gửi {ids.length} sách</button>
            </div>
          ))}
        </div>
      )}
      <div className="tool-actions">
        <button disabled={working} onClick={load}>Tìm lại thiết bị</button>
        <button disabled={working || !ids.length} onClick={() => send(null)}>Chọn thư mục khác…</button>
        <button disabled={working || !ctx.selected} onClick={() => call('sendKindleWeb', { id: ids[0] || ctx.selected.id })} title="Mở trang Send to Kindle và thư mục chứa file để kéo thả">Send to Kindle (web)…</button>
      </div>
      {r && <p className="tool-ok">Đã gửi {r.copied} sách tới {r.target}; bỏ qua {r.skipped} (đã có){r.unsupported.length ? `; ${r.unsupported.length} sách Kindle không đọc được qua USB (EPUB…) — hãy chuyển sang AZW3 hoặc dùng Send to Kindle` : ''}{r.errors.length ? `; lỗi ${r.errors.length}` : ''}.</p>}
    </>
  );
}
function Convert({ ctx, call, working }) {
  const b = ctx.selected;
  const [info, setInfo] = useState(null);
  const [to, setTo] = useState('epub');
  const [add, setAdd] = useState(false);
  const [r, setR] = useState(null);
  useEffect(() => { call('convertInfo').then(setInfo); }, []);
  const ext = String(b?.filePath || '').split('.').pop().toLowerCase();
  const office = ['docx', 'doc', 'pptx', 'ppt', 'odt', 'rtf'].includes(ext);
  const formats = ['epub', 'azw3', 'mobi', 'pdf', 'docx', 'txt', 'fb2', 'rtf'].filter((x) => x !== ext);
  if (!b || b.demo) return <p>Hãy chọn một sách thật trong thư viện trước.</p>;
  return (
    <>
      <p>Sách: <b>{b.title}</b> ({b.format})</p>
      <p className={info?.calibre ? 'tool-ok' : 'muted'}>{info === null ? 'Đang kiểm tra Calibre…' : info.calibre ? 'Calibre: ' + info.calibre : 'Chưa cài Calibre — cần cài (miễn phí tại calibre-ebook.com) để chuyển EPUB/MOBI/AZW3/PDF…' + (office ? ' Word/PowerPoint → PDF vẫn làm được bằng Microsoft Office.' : '')}</p>
      <label className="tool-scope">Chuyển sang
        <select value={to} onChange={(e) => setTo(e.target.value)}>{formats.map((f) => <option key={f} value={f}>{f.toUpperCase()}</option>)}</select>
      </label>
      <label className="tool-check"><input type="checkbox" checked={add} onChange={(e) => setAdd(e.target.checked)} />Thêm bản chuyển đổi vào thư viện</label>
      <div className="tool-actions">
        <button className="primary" disabled={working || (!info?.calibre && !(office && to === 'pdf'))} onClick={async () => setR(await call('convert', { id: b.id, to, addToLibrary: add }, { reload: add }))}>Chuyển đổi…</button>
      </div>
      {working && <p className="muted">Chuyển đổi sách lớn có thể mất vài phút.</p>}
      {r && <p className="tool-ok">Đã tạo {r.file}{r.imported ? ' và thêm vào thư viện' : ''}.</p>}
    </>
  );
}
function Excluded({ call, working }) {
  const [d, setD] = useState(null);
  const load = async () => setD(await call('excludedList'));
  useEffect(() => { load(); }, []);
  if (!d) return <p>Đang tải…</p>;
  return (
    <>
      <p>Sách trong thư mục liên kết đã bị “xóa vĩnh viễn” sẽ không được thêm lại khi quét thư mục. Khôi phục để SI Book nhận lại chúng.</p>
      <div className="tool-list">
        {d.items.map((x) => (
          <div className="device-row" key={x.id}>
            <span><b>{x.title || '(không rõ tên)'}</b><small>{x.root}\{x.relative} · {new Date(x.at).toLocaleString('vi')}</small></span>
            <button disabled={working} onClick={async () => { await call('excludedRestore', { id: x.id }, { reload: true, msg: 'Đã khôi phục vào thư viện.' }); load(); }}>Khôi phục</button>
          </div>
        ))}
        {!d.items.length && !d.unknown && <p className="muted">Không có sách nào bị gỡ.</p>}
        {d.unknown > 0 && <p className="muted">{d.unknown} sách gỡ từ phiên bản cũ (không lưu tên).</p>}
      </div>
      {(d.items.length > 0 || d.unknown > 0) && (
        <div className="tool-actions">
          <button disabled={working} onClick={async () => { await call('excludedRestore', { all: true }, { reload: true, msg: 'Đã khôi phục tất cả.' }); load(); }}>Khôi phục tất cả và quét lại</button>
        </div>
      )}
    </>
  );
}
function Help({ call }) {
  const [i, setI] = useState(null);
  useEffect(() => { call('helpInfo').then(setI); }, []);
  return (
    <div className="help-body">
      <div className="about-card">
        <img src="./assets/app-icon.png" alt="" />
        <div>
          <b>SI Book{i ? ' ' + i.version : ''}</b>
          <span>Thư viện số và trình đọc sách cho Windows — dùng trực tiếp thư viện gốc, không sao chép sách.</span>
          <span>Tác giả: <b>Phan Đức</b></span>
        </div>
      </div>
      <h4>Phím tắt & thao tác</h4>
      <ul>
        <li><kbd>Ctrl</kbd>+<kbd>K</kbd> / <kbd>Ctrl</kbd>+<kbd>F</kbd>: tìm sách (cả nội dung đã lập chỉ mục) · <kbd>Ctrl</kbd>+<kbd>N</kbd>: thêm sách · <kbd>Esc</kbd>: đóng / bỏ chọn</li>
        <li>Bấm để xem chi tiết, <b>bấm đúp để đọc</b>. Giữ <kbd>Ctrl</kbd> hoặc <kbd>Shift</kbd> khi bấm để chọn nhiều sách → thanh thao tác hàng loạt.</li>
        <li>Kéo thả sách vào bộ sưu tập ở thanh bên; kéo thả file/thư mục từ Windows vào cửa sổ để liên kết (không sao chép).</li>
        <li>Thanh trượt cạnh ô sắp xếp để phóng to/thu nhỏ bìa; nút mặt trăng để bật chế độ tối.</li>
      </ul>
      <h4>Quản lý thư viện</h4>
      <ul>
        <li><b>Thêm thư mục</b>: liên kết chỉ đọc, không sao chép hay sửa file gốc; tự quét sách mới khi mở app.</li>
        <li><b>Công cụ (cờ lê)</b>: phân loại tự động, gán nhãn theo thư mục, tìm trùng, sửa tác giả, cập nhật hàng loạt, tìm lại file, gom sách, dọn dẹp, gửi máy đọc, chuyển định dạng (Calibre), CSV, sao lưu.</li>
        <li><b>Trợ lý AI</b>: OpenAI, Claude, Gemini, DeepSeek (cần API key) hoặc Ollama chạy trên máy.</li>
      </ul>
      {i && (
        <>
          <h4>Thông tin</h4>
          <p>SI Book {i.version} · Electron {i.electron} · © 2026 Phan Đức</p>
          <div className="tool-actions"><button onClick={() => call('openDataFolder')}>Mở thư mục dữ liệu</button></div>
        </>
      )}
    </div>
  );
}
function Meta({ ctx, call, working, onClose }) {
  const b = ctx.selected;
  const [q, setQ] = useState(() => (b ? b.title + (UNKNOWN(b.author) ? '' : ' ' + b.author) : ''));
  const [items, setItems] = useState(null);
  const [use, setUse] = useState({ title: false, author: true, publisher: true, year: true, isbn: true, description: true, cover: true });
  const search = async () => setItems((await call('metaSearch', { query: q })) || []);
  useEffect(() => { if (b && !b.demo) search(); }, []);
  if (!b || b.demo) return <p>Hãy chọn một sách thật trong thư viện trước.</p>;
  const apply = async (it) => {
    const v = {};
    for (const k of ['title', 'author', 'publisher', 'year', 'isbn', 'description']) if (use[k] && it[k]) v[k] = String(it[k]).slice(0, k === 'description' ? 20000 : 500);
    if (Object.keys(v).length) await ctx.update(b.id, v);
    if (use.cover && it.cover) await call('metaCover', { id: b.id, url: it.cover });
    await ctx.reload();
    ctx.notify('Đã cập nhật thông tin sách từ ' + it.source + '.');
    onClose();
  };
  return (
    <>
      <form className="meta-search" onSubmit={(e) => { e.preventDefault(); search(); }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} maxLength={300} placeholder="Tên sách, tác giả hoặc ISBN" />
        <button className="primary" disabled={working || !q.trim()}>Tìm</button>
      </form>
      <div className="meta-use">
        Cập nhật:
        {[['title', 'Tên sách'], ['author', 'Tác giả'], ['publisher', 'NXB'], ['year', 'Năm'], ['isbn', 'ISBN'], ['description', 'Mô tả'], ['cover', 'Ảnh bìa']].map(([k, l]) => (
          <label key={k}><input type="checkbox" checked={use[k]} onChange={(e) => setUse({ ...use, [k]: e.target.checked })} />{l}</label>
        ))}
      </div>
      <div className="tool-list">
        {items === null ? <p>Đang tìm trên Google Books và Open Library…</p> : !items.length ? <p className="muted">Không tìm thấy kết quả. Thử rút gọn tên sách hoặc tìm theo ISBN.</p> : items.map((it, i) => (
          <div className="meta-item" key={i}>
            {it.thumb ? <img src={it.thumb} alt="" /> : <div className="meta-noimg">Không bìa</div>}
            <div>
              <b>{it.title}</b>
              <small>{[it.author, it.publisher, it.year, it.isbn && 'ISBN ' + it.isbn, it.pages && it.pages + ' trang'].filter(Boolean).join(' · ')}</small>
              {it.description && <p>{it.description.slice(0, 220)}{it.description.length > 220 ? '…' : ''}</p>}
              <em>{it.source}</em>
            </div>
            <button className="primary" disabled={working} onClick={() => apply(it)}>Dùng</button>
          </div>
        ))}
      </div>
    </>
  );
}
function SaveFilter({ ctx, working, onClose }) {
  const ids = ctx.filtered.filter((b) => !b.demo).map((b) => b.id);
  const [name, setName] = useState(ctx.viewLabel || '');
  const [busy, setBusy] = useState(false);
  return (
    <form onSubmit={async (e) => {
      e.preventDefault();
      setBusy(true);
      try {
        const id = 'c-' + Date.now().toString(36);
        const ok = await ctx.saveCollections([...ctx.collections, { id, name: name.trim(), icon: 'Layers', color: '#2563eb' }]);
        if (ok && ids.length) await backend('tool.batch', { ids, addCollections: [id] });
        await ctx.reload();
        ctx.setNav('col:' + id);
        ctx.notify(`Đã tạo bộ sưu tập “${name.trim()}” với ${ids.length} sách.`);
        onClose();
      } finally { setBusy(false); }
    }}>
      <p>Tạo bộ sưu tập mới chứa <b>{ids.length}</b> sách đang hiển thị theo bộ lọc / tìm kiếm hiện tại.</p>
      <label className="tool-scope">Tên bộ sưu tập<input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required autoFocus /></label>
      <div className="tool-actions"><button className="primary" disabled={busy || working || !name.trim() || !ids.length}>Lưu bộ sưu tập</button></div>
    </form>
  );
}

export function BulkBar({ ctx, openTool }) {
  const n = ctx.picked.length;
  const run = async (p, msg) => {
    try { await backend('tool.batch', { ids: ctx.picked, ...p }); await ctx.reload(); ctx.notify(msg); } catch (e) { ctx.setError(e.message); }
  };
  return (
    <div className="bulk-bar" role="toolbar" aria-label="Thao tác hàng loạt">
      <b><Check size={15} /> Đã chọn {n}</b>
      <button onClick={() => ctx.setPicked(ctx.filtered.map((b) => b.id))}>Chọn tất cả ({ctx.filtered.length})</button>
      <button onClick={() => openTool('batch')}><ListChecks size={14} /> Sửa hàng loạt</button>
      <select value="" aria-label="Thêm vào bộ sưu tập" onChange={(e) => e.target.value && run({ addCollections: [e.target.value] }, `Đã thêm ${n} sách vào bộ sưu tập.`)}>
        <option value="">+ Bộ sưu tập…</option>
        {ctx.collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <button onClick={() => run({ values: { toRead: true } }, `Đã thêm ${n} sách vào Sẽ đọc.`)}><Bookmark size={14} /> Sẽ đọc</button>
      <button onClick={() => openTool('device')}><Send size={14} /> Gửi máy đọc</button>
      <button onClick={() => openTool('consolidate')}><FolderInput size={14} /> Gom về thư mục</button>
      <button onClick={() => openTool('csv')}><FileSpreadsheet size={14} /> CSV</button>
      <button onClick={() => openTool('batch')} title="Xóa nằm trong Sửa hàng loạt"><Trash2 size={14} /></button>
      <button className="bulk-clear" onClick={() => ctx.setPicked([])}><X size={14} /> Bỏ chọn</button>
    </div>
  );
}
