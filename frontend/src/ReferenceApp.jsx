import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ACCEPT, ALL_FORMATS, COMIC_FORMATS, EXTERNAL_FORMATS, IMPORT_EXT, TEXT_FORMATS, formatColor } from './bookFormats.js';
import {
  BookOpen,
  Files,
  Home,
  HelpCircle,
  Zap,
  FolderKanban,
  CalendarDays,
  Clock,
  Cctv,
  Network,
  Flame,
  Volume2,
  Sparkles,
  X,
  Plus,
  FileText,
  Folder,
  Search,
  LayoutGrid,
  PanelsTopLeft,
  List,
  RefreshCw,
  WandSparkles,
  Settings,
  Minus,
  Square,
  Menu,
  Layers,
  Quote,
  ListFilter,
  Star,
  Grip,
  ChevronLeft,
  ChevronRight,
  UserRound,
  Pencil,
  Play,
  ChevronDown,
  ChevronUp,
  File,
  Copy,
  Share2,
  Ellipsis,
  ListTree,
  Library,
  HardDrive,
  Info,
  ShieldCheck,
  BadgeCheck,
  Bell,
  CheckCircle,
  ArrowLeft,
  TriangleAlert,
  FolderPlus,
  ExternalLink,
  FolderOpen,
  Trash2,
  Check,
  Wrench,
  Sun,
  Moon,
  Bookmark,
  Globe,
  SquareCheck,
  ZoomIn,
} from 'lucide-react';
const I = {
  BookOpen,
  Files,
  Home,
  HelpCircle,
  Zap,
  FolderKanban,
  CalendarDays,
  Clock,
  Cctv,
  Network,
  Flame,
  Volume2,
  Sparkles,
  X,
  Plus,
  FileText,
  Folder,
  Search,
  LayoutGrid,
  PanelsTopLeft,
  List,
  RefreshCw,
  WandSparkles,
  Settings,
  Minus,
  Square,
  Menu,
  Layers,
  Quote,
  ListFilter,
  Star,
  Grip,
  ChevronLeft,
  ChevronRight,
  UserRound,
  Pencil,
  Play,
  ChevronDown,
  ChevronUp,
  File,
  Copy,
  Share2,
  Ellipsis,
  ListTree,
  Library,
  HardDrive,
  Info,
  ShieldCheck,
  BadgeCheck,
  Bell,
  CheckCircle,
  ArrowLeft,
  TriangleAlert,
  FolderPlus,
  ExternalLink,
  FolderOpen,
  Trash2,
  Check,
  Wrench,
  Sun,
  Moon,
  Bookmark,
  Globe,
  SquareCheck,
  ZoomIn,
};
import {
  BOOKS,
  AUTHORS,
  HASHTAGS,
  FORMATS,
  FOLDERS,
  NAV_ITEMS,
  SECTIONS,
} from './data/library';
import { getFile, saveFile, readLocal, writeLocal } from './store';
import { backend, startLibrary } from './backend-client';
import { coverMeta, ensureCover } from './coverGen';
import { renderOffice } from './officeView';
import { renderEpub } from './epubView';
import AiPanel from './AiPanel.jsx';
import { ToolsMenu, ToolDialog, BulkBar, CATEGORY_TAGS } from './Tools.jsx';
import './reference.css';
const desktop = window.mewbookDesktop;
if (desktop) document.documentElement.classList.add('desktop-mode');
const asset = (name) => `./assets/${encodeURIComponent(name)}`;
// Artwork crops only: all titles, badges, metadata and controls remain live HTML.
const art = Array.from({ length: 15 }, (_, i) =>
  i === 4 ? 'image-4 (1).jpeg' : `cover-ref-${i + 1}.png`,
);
const colors = [
  '#124d88',
  '#ffffff',
  '#145078',
  '#07595f',
  '#bc0624',
  '#ffffff',
  '#ffffff',
  '#ffffff',
  '#073466',
  '#ffffff',
  '#ffffff',
  '#ffffff',
  '#ffffff',
  '#ffffff',
  '#ffffff',
];
const demoBooks = BOOKS.map((b, i) => ({
  ...b,
  cover: asset(art[i]),
  color: colors[i],
  demo: true,
}));
const Icon = ({ name, size = 18, ...props }) => {
  const C = I[name] || I.BookOpen;
  return <C size={size} strokeWidth={1.8} {...props} />;
};
const normalize = (s) =>
  (s || '')
    .toLocaleLowerCase('vi')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
const isMissingInfo = (b) =>
  !b.demo && (b.missing || !b.author || b.author === 'Chưa rõ tác giả');
const bookBytes = (b) => Number(String(b.bytes || '').replace(/\D/g, '')) || 0;
const fmtBytes = (n) =>
  n >= 1e12 ? (n / 1e12).toFixed(2) + ' TB' : n >= 1e9 ? (n / 1e9).toFixed(2) + ' GB' : n >= 1e6 ? (n / 1e6).toFixed(1) + ' MB' : Math.round(n / 1e3) + ' KB';
const TIME_SECTIONS = [
  { id: 'today', title: 'HÔM NAY' },
  { id: 'week', title: 'TUẦN NÀY' },
  { id: 'month', title: 'THÁNG NÀY' },
  { id: 'older', title: 'CŨ HƠN' },
];
function sectionOf(b) {
  if (!b.addedAt) return b.section || 'older';
  const t = new Date(b.addedAt);
  const now = new Date();
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (t >= day) return 'today';
  if (now - t < 7 * 864e5) return 'week';
  if (now - t < 30 * 864e5) return 'month';
  return 'older';
}
const COL_ICONS = ['Layers', 'Zap', 'FolderKanban', 'CalendarDays', 'Star', 'BookOpen', 'Folder', 'Sparkles', 'Files', 'Clock'];
const COL_COLORS = ['#2563eb', '#f97316', '#0ea5a5', '#ec4899', '#8b5cf6', '#16a34a', '#e11d48', '#64748b'];
const NOTIFY_KINDS = ['import', 'link-folder', 'office', 'watch-error', 'purge'];
function Tool({ name, label, onClick, className = '', children, ...props }) {
  return (
    <button
      className={`tool ${className}`}
      onClick={onClick}
      title={label}
      aria-label={label}
      {...props}
    >
      {name && <Icon name={name} />} {children}
    </button>
  );
}
export default function App() {
  const [books, setBooks] = useState(() =>
    backend ? [] : readLocal('mw_imported', []),
  );
  const [custom, setCustom] = useState(() =>
    backend ? {} : readLocal('mw_custom', {}),
  );
  const [notes, setNotes] = useState(() =>
    backend ? {} : readLocal('mw_notes', {}),
  );
  const [selectedId, setSelectedId] = useState('b1');
  const [inspector, setInspector] = useState(window.innerWidth > 1150);
  const [view, setView] = useState('grid');
  const [nav, setNav] = useState('home');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState(null);
  const [sort, setSort] = useState('recent');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [tab, setTab] = useState('Thông tin');
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState('');
  const [menu, setMenu] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [draft, setDraft] = useState('');
  const [reader, setReader] = useState(null);
  const [unsupportedBook, setUnsupportedBook] = useState(null);
  const [authorsOpen, setAuthorsOpen] = useState(false);
  const officeBox = useRef(null);
  const [officeState, setOfficeState] = useState('');
  useEffect(() => {
    if (!reader?.office || !officeBox.current) return;
    let alive = true;
    setOfficeState('loading');
    renderOffice(officeBox.current, reader.book)
      .then(() => alive && setOfficeState('ready'))
      .catch((e) => {
        if (!alive) return;
        console.warn('[SI Book] Office viewer', e);
        setOfficeState('');
        notify('Trình xem tích hợp không hiển thị được, chuyển sang dạng văn bản');
        setReader((r) => (r && r.office ? { ...r, office: false, text: r.fallbackText || '' } : r));
      });
    return () => {
      alive = false;
    };
  }, [reader?.office, reader?.book?.id]);
  const epubBox = useRef(null);
  const epubApi = useRef(null);
  const [epubState, setEpubState] = useState('');
  const [epubTocOpen, setEpubTocOpen] = useState(true);
  const [epubCur, setEpubCur] = useState('');
  useEffect(() => {
    if (!reader?.epub || !epubBox.current) return;
    let alive = true;
    setEpubState('loading');
    renderEpub(epubBox.current, reader.book, { onLink: () => {} })
      .then(async (api) => {
        if (!alive) return api.destroy();
        epubApi.current = api;
        setEpubState('ready');
        if (api.toc.length) setReader((r) => (r && r.epub ? { ...r, toc: api.toc } : r));
        await api.restore(reader.book.location);
      })
      .catch((e) => {
        if (!alive) return;
        console.warn('[SI Book] EPUB viewer', e);
        setEpubState('');
        notify('Không dựng được bố cục EPUB, chuyển sang dạng văn bản');
        setReader((r) => (r && r.epub ? { ...r, epub: false, text: r.fallbackText || '' } : r));
      });
    return () => {
      alive = false;
      epubApi.current?.destroy();
      epubApi.current = null;
    };
  }, [reader?.epub, reader?.book?.id]);
  function epubScroll(e) {
    const api = epubApi.current;
    if (!api) return;
    const el = e.currentTarget;
    clearTimeout(savePosition.current);
    savePosition.current = setTimeout(() => {
      const cur = api.current();
      if (cur) setEpubCur(cur);
      if (!backend) return;
      const max = el.scrollHeight - el.clientHeight;
      update(reader.book.id, {
        location: api.position(),
        progress: max > 0 ? Math.min(100, Math.round((el.scrollTop / max) * 100)) : 100,
      });
    }, 500);
  }
  async function officeExact() {
    if (!reader) return;
    setBusy(true);
    try {
      await backend('renderOffice', { id: reader.book.id });
      setReader((r) => ({ ...r, office: false, text: null, url: 'mewbook://library/' + encodeURIComponent(r.book.id) + '?view=pdf', pdf: true }));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const input = useRef(null),
    search = useRef(null),
    dialog = useRef(null),
    beforeModal = useRef(null);
  const all = useMemo(
    () => books.map((b) => ({ ...b, ...custom[b.id] })),
    [books, custom],
  );
  const selected = all.find((b) => b.id === selectedId) || all[0];
  const [ready, setReady] = useState(!backend),
    [searchIds, setSearchIds] = useState(null),
    [doc, setDoc] = useState(null),
    [watched, setWatched] = useState([]),
    [trashBooks, setTrashBooks] = useState([]),
    [answer, setAnswer] = useState('');
  const [folderPath, setFolderPath] = useState('');
  const [collections, setCollections] = useState([]);
  const [events, setEvents] = useState([]);
  const [eventsSeen, setEventsSeen] = useState(0);
  const [disk, setDisk] = useState([]);
  const [editCol, setEditCol] = useState(null);
  const [dropCol, setDropCol] = useState('');
  const [seenBefore, setSeenBefore] = useState(0);
  const [tool, setTool] = useState(null);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [picked, setPicked] = useState([]);
  const lastPick = useRef(null);
  const coverInput = useRef(null);
  const [theme, setTheme] = useState(() => localStorage.getItem('si_theme') || 'light');
  const [zoom, setZoom] = useState(() => Number(localStorage.getItem('si_zoom')) || 3);
  const [sideQ, setSideQ] = useState('');
  useEffect(() => {
    document.documentElement.classList.toggle('theme-dark', theme === 'dark');
    localStorage.setItem('si_theme', theme);
  }, [theme]);
  useEffect(() => {
    localStorage.setItem('si_zoom', String(zoom));
  }, [zoom]);
  function applySnapshot(r) {
    if (r.collections) setCollections(r.collections);
    if (r.events) setEvents(r.events);
    if (typeof r.eventsSeen === 'number') setEventsSeen(r.eventsSeen);
    backend?.('diskInfo').then(setDisk).catch(() => {});
  }
  const readerBody = useRef(null),
    savePosition = useRef(null);
  async function reload() {
    const r = await backend('snapshot');
    setBooks(r.books);
    setCustom({});
    setNotes(r.notes);
    setWatched(r.watched);
    applySnapshot(r);
    return r;
  }
  async function run(action, payload = {}, message) {
    setBusy(true);
    setError('');
    try {
      const r = await backend(action, payload);
      if (r !== null) {
        const snapshot = await reload();
        if (['linkFolder', 'scanFolder'].includes(action)) {
          setNav('all'); setQuery(''); setFilter({kind: 'source', value: r.dir}); setPage(1); setModal(null);
          const first = snapshot.books.find(b => b.sourceRoot === r.dir && b.linked);
          if (first) setSelectedId(first.id);
        }
        if (message)
          notify(typeof message === 'function' ? message(r) : message);
      }
      return r;
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (!backend) return;
    let alive = true;
    setBusy(true);
    startLibrary([])
      .then(async (r) => {
        if (!alive) return;
        setBooks(r.books);
        setNotes(r.notes);
        setWatched(r.watched);
        applySnapshot(r);
        if (r.migrationErrors.length)
          setError(
            'Chưa chuyển được một số sách cũ; dữ liệu cũ vẫn được giữ: ' +
              r.migrationErrors.join('; '),
          );
        const ui = await backend('uiGet');
        if (ui.view) setView(ui.view);
        if (ui.nav && !['dien-nhe', 'projects', 'weekend'].includes(ui.nav)) setNav(ui.nav);
        if (ui.pageSize) setPageSize(ui.pageSize);
        if (typeof ui.inspector === 'boolean') setInspector(ui.inspector);
        const linked = r.books.filter(b => b.linked);
        if (linked.length && r.watched.length === 1 && linked.every(b => b.sourceRoot === r.watched[0])) {
          setNav('all'); setFilter({kind: 'source', value: r.watched[0]}); setSelectedId(linked[0].id);
        } else if (r.books.length) setSelectedId(r.books[0].id);
        setReady(true);
        // Con ban sao cu trong AppData -> mo cong cu bo ban sao, dung thu vien goc
        if (r.books.some((b) => !b.linked && !b.demo)) setTimeout(() => openTool('copies'), 600);
      })
      .catch((e) => setError('Không khởi động được backend: ' + e.message))
      .finally(() => setBusy(false));
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    if (!backend || !ready) return;
    const timer = setTimeout(
      () =>
        backend('uiSet', { view, nav, inspector, pageSize }).catch((e) =>
          setError(e.message),
        ),
      300,
    );
    return () => clearTimeout(timer);
  }, [ready, view, nav, inspector, pageSize]);
  useEffect(
    () =>
      desktop?.onLibraryChanged?.(() => {
        reload().catch((e) => setError(e.message));
      }),
    [],
  );
  useEffect(() => {
    if (!backend || !ready || !query.trim()) {
      setSearchIds(null);
      return;
    }
    let alive = true;
    const timer = setTimeout(
      () =>
        backend('search', { query })
          .then((ids) => {
            if (alive) setSearchIds(ids);
          })
          .catch((e) => setError(e.message)),
      180,
    );
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [query, ready, books]);
  useEffect(() => {
    if (!backend || !selectedId) return;
    let alive = true;
    backend('document', { id: selectedId })
      .then((d) => {
        if (alive) setDoc(d);
      })
      .catch(() => {
        if (alive) setDoc(null);
      });
    return () => {
      alive = false;
    };
  }, [selectedId, books]);
  useEffect(() => {
    if (reader?.text && readerBody.current)
      readerBody.current.scrollTop = Number(reader.book.location || 0);
  }, [reader]);
  const notify = (s) => setToast(s);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(''), 3500);
      return () => clearTimeout(t);
    }
  }, [toast]);
  useEffect(() => {
    if (!backend) writeLocal('mw_custom', custom);
  }, [custom]);
  useEffect(() => {
    if (!backend) writeLocal('mw_notes', notes);
  }, [notes]);
  const update = async (id, values) => {
    if (!backend) {
      setCustom((c) => ({ ...c, [id]: { ...c[id], ...values } }));
      return;
    }
    try {
      const b = await backend('patch', { id, values });
      setBooks((bs) => bs.map((x) => (x.id === id ? b : x)));
      return b;
    } catch (e) {
      setError(e.message);
      return null;
    }
  };
  function choose(b) {
    setSelectedId(b.id);
    setInspector(true);
    setTab('Thông tin');
  }
  async function toggleCollection(id, colId, add) {
    const b = all.find((x) => x.id === id);
    if (!b) return;
    const cur = b.collections || [];
    const next = add ? [...new Set([...cur, colId])] : cur.filter((x) => x !== colId);
    await update(id, { collections: next });
    const c = collections.find((x) => x.id === colId);
    if (add && c) notify(`Đã thêm “${b.title}” vào ${c.name}`);
  }
  async function saveCollections(list, removed) {
    if (!backend) {
      setCollections(list);
      return true;
    }
    try {
      setCollections(await backend('collectionsSave', { list }));
      if (removed) await reload();
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    }
  }
  async function openExternal(b, folder) {
    if (!backend) return read(b);
    try {
      await backend(folder === 'with' ? 'openWith' : folder ? 'showInFolder' : 'openExternal', { id: b.id });
    } catch (e) {
      setError(e.message);
    }
  }
  function applyFilter(f) {
    setFilter(f);
    setPage(1);
    setMobileNav(false);
  }
  useEffect(() => {
    setPage(1);
  }, [query, nav, filter, pageSize]);
  const filtered = useMemo(() => {
    let a = all.filter((b) => {
      if (nav === 'reading' && !(b.progress > 0 && b.progress < 100))
        return false;
      if (nav === 'uncat' && b.hashtags?.length) return false;
      if (nav === 'toread' && !b.toRead) return false;
      if (nav === 'recent' && !b.openedAt) return false;
      if (nav.startsWith('col:') && !b.collections?.includes(nav.slice(4))) return false;
      if (filter) {
        if (filter.kind === 'missingInfo' && !isMissingInfo(b)) return false;
        if (filter.kind === 'missingFile' && !b.missing) return false;
        if (filter.kind === 'author' && b.author !== filter.value) return false;
        if (filter.kind === 'format' && b.format !== filter.value) return false;
        if (filter.kind === 'tag' && !b.hashtags?.includes(filter.value))
          return false;
        if (filter.kind === 'favorite' && !b.favorite) return false;
        if (filter.kind === 'folder' && b.folder !== filter.value) return false;
        if (filter.kind === 'source' && b.sourceRoot !== filter.value) return false;
      }
      return (
        searchIds?.includes(b.id) ||
        normalize(
          `${b.title} ${b.author} ${b.folder || ''} ${b.format} ${(b.hashtags || []).join(' ')}`,
        ).includes(normalize(query))
      );
    });
    if (sort === 'title')
      a.sort((a, b) => a.title.localeCompare(b.title, 'vi'));
    if (sort === 'progress') a.sort((a, b) => b.progress - a.progress);
    if (sort === 'recent')
      a.sort(
        (a, b) =>
          Number(Boolean(b.imported)) - Number(Boolean(a.imported)) ||
          String(b.addedAt || '').localeCompare(String(a.addedAt || '')),
      );
    if (nav === 'recent') {
      a.sort((x, y) => String(y.openedAt).localeCompare(String(x.openedAt)));
      a = a.slice(0, 30);
    }
    return a;
  }, [all, nav, filter, query, sort, searchIds]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  const coverQueue = visible.filter((b) => b.autoCover).map((b) => b.id).join(',');
  useEffect(() => {
    for (const b of visible) {
      if (!b.autoCover) continue;
      ensureCover(b, backend)?.then((url) => {
        if (url) setBooks((bs) => bs.map((x) => (x.id === b.id ? { ...x, ...(coverMeta.get(b.id) || {}), cover: url, autoCover: false } : x)));
      });
    }
  }, [coverQueue]);
  useEffect(() => {
    if (page > pages) setPage(pages);
  }, [page, pages]);
  useEffect(() => {
    const handler = (e) => {
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && ['k', 'f', 'n'].includes(k)) {
        e.preventDefault();
        if (k === 'n') input.current?.click();
        else search.current?.focus();
      }
      if (e.key === 'Escape') {
        setModal(null);
        setTool(null);
        setToolsOpen(false);
        setPicked([]);
        setMenu(false);
        setMobileNav(false);
        if (reader) {
          if (reader.url?.startsWith('blob:')) URL.revokeObjectURL(reader.url);
          setReader(null);
        }
        if (window.innerWidth < 1150) setInspector(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [reader]);
  useEffect(() => {
    if (modal) {
      beforeModal.current = document.activeElement;
      dialog.current?.focus();
    } else beforeModal.current?.focus?.();
  }, [modal]);
  function trap(e) {
    if (e.key !== 'Tab') return;
    const nodes = dialog.current?.querySelectorAll(
      'button,input,textarea,select,[tabindex="0"]',
    );
    if (!nodes?.length) return;
    const first = nodes[0],
      last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
  async function importBooks(files) {
    if (backend) {
      setBusy(true);
      setError('');
      let added = 0,
        duplicates = 0,
        first = null;
      try {
        // Lien ket file tai cho (khong sao chep vao AppData)
        const paths = files.map((f) => window.mewbookDesktop?.pathForFile?.(f) || '').filter(Boolean);
        if (!paths.length) throw new Error('Không lấy được đường dẫn file. Hãy dùng nút Thêm sách hoặc Thêm thư mục.');
        const r = await backend('linkPaths', { paths });
        added = r.added.length + (r.folderAdded || 0);
        duplicates = r.duplicates;
        first = r.added[0] || null;
        if (r.errors.length) setError(r.errors.slice(0, 5).map((x) => x.name + ': ' + x.message).join('; '));
        await reload();
        setNav('all');
        setFilter(null);
        setQuery('');
        if (first) choose(first);
        notify(`Đã liên kết ${added} sách tại chỗ; bỏ qua ${duplicates} đã có.`);
      } catch (e) {
        setError(e.message);
        await reload();
      } finally {
        setBusy(false);
        if (input.current) input.current.value = '';
      }
      return;
    }
    setBusy(true);
    setError('');
    let added = [];
    try {
      for (const file of files) {
        const ext = file.name.split('.').pop().toLowerCase();
        if (!IMPORT_EXT.includes(ext)) {
          notify(`Không hỗ trợ: ${file.name}`);
          continue;
        }
        const id = crypto.randomUUID();
        await saveFile({ id, file });
        added.push({
          id,
          title: file.name.replace(/\.[^.]+$/, ''),
          author: 'Chưa rõ tác giả',
          format: ['png', 'jpg', 'jpeg', 'webp'].includes(ext)
            ? 'Hình ảnh'
            : ext.toUpperCase(),
          cover: asset('image-6.jpeg'),
          color: '#ffffff',
          progress: 0,
          favorite: false,
          section: 'today',
          size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
          bytes: `${file.size.toLocaleString('vi')} bytes`,
          pages: 0,
          publisher: 'Chưa cập nhật',
          year: 'Chưa cập nhật',
          isbn: 'Chưa cập nhật',
          dateAdded: new Date().toLocaleString('vi'),
          filePath: file.name,
          hashtags: [],
          notes: 0,
          imported: true,
          folder: 'Sách cá nhân',
          description: 'Tài liệu nhập từ máy của bạn.',
        });
      }
      if (added.length) {
        const next = [...books, ...added];
        if (
          !writeLocal(
            'mw_imported',
            next.filter((b) => b.imported),
          )
        )
          throw new Error('Không đủ dung lượng lưu thông tin thư viện.');
        setBooks(next);
        setNav('all');
        setFilter(null);
        setQuery('');
        choose(added[0]);
        notify(`Đã nhập ${added.length} tài liệu và lưu trên máy này.`);
      }
    } catch (e) {
      setError('Không thể lưu tài liệu: ' + e.message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }
  async function read(b) {
    if (backend && b.imported) {
      setBusy(true);
      try {
        if (EXTERNAL_FORMATS.includes(b.format)) {
          setUnsupportedBook(b);
          setModal('unsupported');
          return;
        }
        if (COMIC_FORMATS.includes(b.format)) {
          const pages = await backend('comicPages', { id: b.id });
          setReader({ book: b, url: null, text: null, comic: pages, toc: [], status: 'comic' });
          return;
        }
        update(b.id, { openedAt: new Date().toISOString() });
        const isText = TEXT_FORMATS.includes(b.format);
        const d = await backend(isText ? 'readDocument' : 'document', { id: b.id });
        if (b.format === 'EPUB' && !String(d.status || '').startsWith('drm')) {
          setEpubCur('');
          setReader({ book: b, epub: true, url: null, text: null, fallbackText: d.text, toc: d.toc, status: d.status });
          return;
        }
        if (['DOCX', 'PPTX'].includes(b.format)) {
          setReader({ book: b, office: true, url: null, text: null, fallbackText: d.text, toc: d.toc, status: d.status });
          return;
        }
        setReader({
          book: b,
          url: 'mewbook://library/' + encodeURIComponent(b.id),
          text: isText ? d.text : null,
          toc: d.toc,
          status: d.status,
        });
      } catch (e) {
        setError(e.message);
      } finally {
        setBusy(false);
      }
      return;
    }
    if (!b.imported) {
      setModal('sample');
      return;
    }
    setBusy(true);
    try {
      const item = await getFile(b.id);
      if (!item)
        throw new Error('Không tìm thấy file đã lưu. Vui lòng nhập lại.');
      if (!['PDF', 'TXT', 'Hình ảnh'].includes(b.format)) {
        setModal('unsupported');
        return;
      }
      const url = URL.createObjectURL(item.file);
      const text = b.format === 'TXT' ? await item.file.text() : null;
      setReader({ book: b, url, text });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  function closeReader() {
    if (reader)
      if (reader.url?.startsWith('blob:')) URL.revokeObjectURL(reader.url);
    setReader(null);
  }
  async function saveNote() {
    if (backend) {
      if (!draft.trim()) return;
      const r = await run(
        'noteAdd',
        { id: selected.id, text: draft.trim() },
        'Đã lưu ghi chú.',
      );
      if (r) setDraft('');
      return;
    }
    if (!draft.trim()) return;
    const entry = {
      id: crypto.randomUUID(),
      text: draft.trim(),
      date: new Date().toLocaleString('vi'),
    };
    setNotes((n) => ({
      ...n,
      [selected.id]: [...(n[selected.id] || []), entry],
    }));
    setDraft('');
    notify('Đã lưu ghi chú.');
  }
  async function copyInfo() {
    try {
      await navigator.clipboard.writeText(
        `${selected.title}\n${selected.author}\n${selected.format}`,
      );
      notify('Đã sao chép thông tin sách.');
    } catch {
      notify('Trình duyệt chưa cho phép sao chép.');
    }
  }
  const actualNotes = notes[selected?.id] || [];
  const real = all.filter((b) => !b.demo);
  const stats = {
    total: real.length,
    reading: real.filter((b) => b.progress > 0 && b.progress < 100).length,
    uncat: real.filter((b) => !b.hashtags?.length).length,
    tags: new Set(real.flatMap((b) => b.hashtags || [])).size,
  };
  const navCount = (id) =>
    id === 'reading'
      ? all.filter((b) => b.progress > 0 && b.progress < 100).length
      : id === 'uncat'
        ? all.filter((b) => !b.hashtags?.length).length
        : id === 'toread'
        ? all.filter((b) => b.toRead).length
        : id === 'recent'
          ? Math.min(30, all.filter((b) => b.openedAt).length)
          : id.startsWith('col:')
            ? all.filter((b) => b.collections?.includes(id.slice(4))).length
            : all.length;
  const missingCount = all.filter(isMissingInfo).length;
  const missingFileCount = all.filter((b) => !b.demo && b.missing).length;
  const completeCount = real.filter((b) => !isMissingInfo(b) && b.hashtags?.length).length;
  const folderCount = new Set(real.map((b) => b.folder).filter(Boolean)).size;
  const totalBytes = all.reduce((s, b) => s + bookBytes(b), 0);
  const unseen = events.filter((e) => e.id > eventsSeen && NOTIFY_KINDS.includes(e.kind)).length;
  const mainDisk = disk[0];
  const viewLabel = filter
    ? String(filter.value).split(/[\\/]/).filter(Boolean).pop()
    : nav.startsWith('col:')
      ? collections.find((c) => 'col:' + c.id === nav)?.name
      : nav === 'toread'
        ? 'Sẽ đọc'
        : NAV_ITEMS.find((n) => n.id === nav && !['home', 'all'].includes(n.id))?.label;
  async function openTool(id) {
    setToolsOpen(false);
    if (id === 'trash') {
      try {
        if (backend) setTrashBooks(await backend('trashList'));
        setModal('trash');
      } catch (e) {
        setError(e.message);
      }
      return;
    }
    setTool(id);
  }
  function togglePick(id) {
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }
  function pickClick(e, b) {
    if (e.shiftKey && lastPick.current) {
      const ids = filtered.map((x) => x.id);
      const i = ids.indexOf(lastPick.current), j = ids.indexOf(b.id);
      if (i >= 0 && j >= 0) {
        const range = ids.slice(Math.min(i, j), Math.max(i, j) + 1);
        setPicked((p) => [...new Set([...p, ...range])]);
        return;
      }
    }
    if (e.ctrlKey || e.metaKey || picked.length) {
      lastPick.current = b.id;
      togglePick(b.id);
      return;
    }
    lastPick.current = b.id;
    choose(b);
  }
  async function onCoverFile(file) {
    if (!file || !selected) return;
    try {
      const url = URL.createObjectURL(file);
      const img = await new Promise((ok, bad) => {
        const im = new Image();
        im.onload = () => ok(im);
        im.onerror = () => bad(new Error('Không đọc được ảnh bìa.'));
        im.src = url;
      });
      const s = Math.min(1, 1000 / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(img.width * s));
      c.height = Math.max(1, Math.round(img.height * s));
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      await backend('saveCover', { id: selected.id, dataUrl: c.toDataURL('image/jpeg', 0.88) });
      await reload();
      notify('Đã đổi ảnh bìa.');
    } catch (e) {
      setError(e.message);
    }
  }
  const toolCtx = {
    all, filtered, picked, setPicked, selected, collections, saveCollections,
    reload, notify, setError, applyFilter, setNav, update, viewLabel,
  };
  const sq = normalize(sideQ);
  const authors = [...new Set(all.map((b) => b.author))].filter((n) => !sq || normalize(n).includes(sq)).map((name) => ({
    name,
    count: all.filter((b) => b.author === name).length,
  })).sort((a, b) => b.count - a.count);
  const topics = CATEGORY_TAGS.map((tag) => ({ tag, count: all.filter((b) => b.hashtags?.includes(tag)).length })).filter((t) => t.count && (!sq || normalize(t.tag).includes(sq)));
  const hashtags = [...new Set(all.flatMap((b) => b.hashtags || []))].filter((t) => !CATEGORY_TAGS.includes(t) && (!sq || normalize(t).includes(sq))).map(
    (tag) => ({
      ...HASHTAGS.find((h) => h.tag === tag),
      tag,
      count: all.filter((b) => b.hashtags?.includes(tag)).length,
    }),
  );
  const formats = [...new Set(all.map((b) => b.format))].map((label) => ({
    label,
    count: all.filter((b) => b.format === label).length,
  }));
  const allFormats = [
    ...ALL_FORMATS,
    ...formats.map((f) => f.label).filter((l) => !ALL_FORMATS.includes(l)),
  ].map((label) => ({
    label,
    count: all.filter((b) => b.format === label).length,
  }));
  const folders = [...new Set(all.map((b) => b.folder).filter(Boolean))].filter((f) => !sq || normalize(f).includes(sq)).map(
    (name) => ({ name }),
  );
  return (
    <div
      className="app-shell"
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('Files')) e.preventDefault();
      }}
      onDrop={(e) => {
        if (e.dataTransfer.files.length) {
          e.preventDefault();
          if (ready && !busy) importBooks(Array.from(e.dataTransfer.files));
        }
      }}
    >
      <input
        ref={input}
        className="visually-hidden"
        type="file"
        multiple
        accept={ACCEPT}
        onChange={(e) => importBooks(Array.from(e.target.files || []))}
        aria-label="Chọn tài liệu để nhập"
      />
      <aside className={`sidebar ${mobileNav ? 'mobile-open' : ''}`}>
        <div className="brand">
          <img src={asset('brand-robot.png')} alt="Robot SI Book" />
          <div>
            <strong>SI Book</strong>
            <span>
              Thư viện số <Icon name="Sparkles" size={13} />
            </span>
          </div>
          <Tool
            className="mobile-close"
            name="X"
            label="Đóng menu"
            onClick={() => setMobileNav(false)}
          />
        </div>
        <div className="side-scroll">
          <nav aria-label="Thư viện">
            {[
              ...NAV_ITEMS.filter((n) => ['home', 'all', 'reading'].includes(n.id)),
              { id: 'toread', icon: 'Bookmark', label: 'Sẽ đọc' },
              ...NAV_ITEMS.filter((n) => n.id === 'uncat'),
              ...collections.map((c) => ({ id: 'col:' + c.id, icon: c.icon, label: c.name, color: c.color, col: c })),
              ...NAV_ITEMS.filter((n) => n.id === 'recent'),
            ].map((n) => (
              <button
                key={n.id}
                data-testid={`nav-${n.id}`}
                className={`nav-item ${nav === n.id ? 'active' : ''} ${n.col ? 'collection' : ''} ${dropCol === n.id ? 'drop' : ''}`}
                title={n.col ? 'Kéo thả sách vào đây để thêm vào bộ sưu tập' : undefined}
                onClick={() => {
                  setNav(n.id);
                  applyFilter(null);
                }}
                onDragOver={n.col ? (e) => { if (e.dataTransfer.types.includes('text/mewbook-book')) { e.preventDefault(); setDropCol(n.id); } } : undefined}
                onDragLeave={n.col ? () => setDropCol('') : undefined}
                onDrop={n.col ? (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDropCol('');
                  const id = e.dataTransfer.getData('text/mewbook-book');
                  if (id) toggleCollection(id, n.col.id, true);
                } : undefined}
              >
                <Icon name={n.icon} style={n.col ? { color: n.color } : undefined} />
                <span>{n.label}</span>
                {n.col && (
                  <i
                    className="nav-edit"
                    role="button"
                    tabIndex={0}
                    title="Sửa bộ sưu tập"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditCol(n.col);
                      setModal('collection');
                    }}
                  >
                    <Icon name="Pencil" size={12} />
                  </i>
                )}
                {n.id !== 'home' && <em>{navCount(n.id)}</em>}
              </button>
            ))}
            <button
              className="side-link new-collection"
              onClick={() => {
                setEditCol({ id: '', name: '', icon: 'Layers', color: COL_COLORS[collections.length % COL_COLORS.length] });
                setModal('collection');
              }}
            >
              <Icon name="Plus" size={13} />
              Bộ sưu tập mới
            </button>
          </nav>
          <div className="side-filter">
            <Icon name="Search" size={13} />
            <input value={sideQ} onChange={(e) => setSideQ(e.target.value)} placeholder="Lọc tác giả, chủ đề, hashtag…" aria-label="Lọc thanh bên" />
            {sideQ && <button onClick={() => setSideQ('')} aria-label="Xóa lọc"><Icon name="X" size={12} /></button>}
          </div>
          <h3>TÁC GIẢ</h3>
          {authors.slice(0, authorsOpen ? 100 : 5).map((a, i) => (
            <button
              className="author"
              key={a.name}
              onClick={() => applyFilter({ kind: 'author', value: a.name })}
            >
              <img src={asset(`avatar-${i % AUTHORS.length}.png`)} alt="" />
              <span>{a.name}</span>
              <em>{a.count}</em>
            </button>
          ))}
          {authors.length > 5 && (
            <button className="side-link" onClick={() => setAuthorsOpen((v) => !v)}>
              <Icon name={authorsOpen ? 'ChevronUp' : 'ChevronDown'} size={14} />
              {authorsOpen ? 'Thu gọn' : `Mở rộng (${authors.length - 5} tác giả khác)`}
            </button>
          )}
          {authorsOpen && authors.length > 100 && (
            <button className="side-link" onClick={() => setModal('authors')}>
              Xem tất cả {authors.length} tác giả...
            </button>
          )}
          {topics.length > 0 && (
            <>
              <h3>CHỦ ĐỀ</h3>
              <div className="topics">
                {topics.map((t) => (
                  <button key={t.tag} className={filter?.kind === 'tag' && filter.value === t.tag ? 'active' : ''} onClick={() => applyFilter({ kind: 'tag', value: t.tag })}>
                    <span>{t.tag.replace(/-/g, ' ')}</span>
                    <em>{t.count}</em>
                  </button>
                ))}
              </div>
            </>
          )}
          <h3>HASHTAG</h3>
          <div className="tags">
            {hashtags.map((h) => (
              <button
                key={h.tag}
                style={{ '--tag': h.color }}
                onClick={() => applyFilter({ kind: 'tag', value: h.tag })}
              >
                <Icon name={h.icon} size={12} />#{h.tag}
                <em>{h.count}</em>
              </button>
            ))}
            <button onClick={() => setModal('tags')}>
              <Icon name="Plus" size={14} />
              Thêm tag
            </button>
          </div>
          <h3>ĐỊNH DẠNG</h3>
          <div className="formats">
            {formats.map((f) => (
              <button
                key={f.label}
                onClick={() => applyFilter({ kind: 'format', value: f.label })}
              >
                <Icon
                  name="FileText"
                  size={15}
                  style={{ color: formatColor(f.label) }}
                />
                <span>{f.label}</span>
                <em>{f.count}</em>
              </button>
            ))}
          </div>
          <h3>THƯ MỤC</h3>
          {folders.slice(0, 100).map((f) => (
            <button
              className="folder"
              key={f.name}
              onClick={() => applyFilter({ kind: 'folder', value: f.name })}
            >
              <Icon name="Folder" size={16} fill="#ffca80" color="#f8a447" />
              {f.name}
            </button>
          ))}
          {backend && (
            <button
              className="side-link"
              title="Liên kết một thư mục trên máy (chỉ đọc). SI Book tự quét sách mới mỗi khi mở."
              onClick={() =>
                run('linkFolder', {}, (r) => `Đã thêm thư mục: ${r.scanned} file, ${r.added} sách mới.`)
              }
              disabled={busy}
            >
              <Icon name="FolderPlus" size={13} />
              Thêm thư mục
            </button>
          )}
          <button className="side-link" onClick={() => input.current?.click()}>
            <Icon name="Plus" size={13} />
            Nhập tài liệu
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="toolbar">
          <Tool
            className="mobile-menu"
            name="Menu"
            label="Mở menu thư viện"
            onClick={() => setMobileNav(true)}
          />
          <div className="search-box">
            <Icon name="Search" size={20} />
            <input
              ref={search}
              aria-label="Tìm sách, tài liệu, tác giả, tag"
              placeholder="Tìm sách, tài liệu, tác giả, tag..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <kbd>Ctrl + K</kbd>
            {query && (
              <Tool
                name="X"
                label="Xóa tìm kiếm"
                onClick={() => setQuery('')}
              />
            )}
          </div>
          <div className="view-switch" aria-label="Chế độ xem">
            {[
              ['grid', 'LayoutGrid', 'Lưới'],
              ['table', 'PanelsTopLeft', 'Bảng'],
              ['list', 'List', 'Danh sách'],
            ].map(([id, icon, label]) => (
              <button
                data-testid={`view-${id}`}
                key={id}
                className={view === id ? 'selected' : ''}
                aria-pressed={view === id}
                onClick={() => setView(id)}
              >
                <Icon name={icon} size={17} />
                <span>{label}</span>
              </button>
            ))}
          </div>
          <button
            className="primary add-book"
            onClick={async () => {
              if (!backend) {
                input.current?.click();
                return;
              }
              const r = await run(
                'importDialog',
                {},
                (r) => `Đã liên kết ${r.added.length} sách tại chỗ (không sao chép); ${r.duplicates} đã có.`,
              );
              if (r) {
                setNav('all');
                setFilter(null);
                setQuery('');
                if (r.added[0]) choose(r.added[0]);
                if (r.errors.length)
                  setError(
                    r.errors.map((e) => e.name + ': ' + e.message).join('; '),
                  );
              }
            }}
            disabled={busy || !ready}
          >
            <Icon name="Plus" />
            Thêm sách
          </button>
          <Tool
            name="RefreshCw"
            label="Làm mới thư viện"
            onClick={() =>
              backend
                ? run('rescan', {}, 'Đã quét lại thư mục và cập nhật thư viện.')
                : notify('Thư viện đang lưu cục bộ.')
            }
          />
          {backend && (
            <div className="tools-wrap">
              <Tool name="Wrench" label="Công cụ" className={toolsOpen ? 'active' : ''} onClick={() => setToolsOpen((v) => !v)} />
              {toolsOpen && <ToolsMenu onPick={openTool} onClose={() => setToolsOpen(false)} />}
            </div>
          )}
          <Tool
            name={theme === 'dark' ? 'Sun' : 'Moon'}
            label={theme === 'dark' ? 'Chế độ sáng' : 'Chế độ tối'}
            onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
          />
          <Tool
            className="ai-tool"
            name="WandSparkles"
            label="Trợ lý AI"
            onClick={() => setModal('ai')}
          >
            AI
          </Tool>
          <Tool
            name="Settings"
            label="Cài đặt"
            onClick={() => setModal('settings')}
          />
          <div className="window-controls">
            <Tool
              name="Minus"
              label={desktop ? 'Thu nhỏ cửa sổ' : 'Thu gọn bảng thông tin'}
              onClick={() =>
                desktop ? desktop.minimize() : setInspector(false)
              }
            />
            <Tool
              name="Square"
              label={
                desktop
                  ? 'Phóng to / khôi phục cửa sổ'
                  : 'Bật/tắt toàn màn hình'
              }
              onClick={() => {
                if (desktop) {
                  desktop.toggleMaximize();
                  return;
                }
                if (document.fullscreenElement) document.exitFullscreen();
                else
                  document.documentElement
                    .requestFullscreen?.()
                    .catch(() => notify('Không thể bật toàn màn hình.'));
              }}
            />
            <Tool
              name="X"
              label={desktop ? 'Đóng SI Book' : 'Đóng bảng thông tin'}
              onClick={() => (desktop ? desktop.close() : setInspector(false))}
            />
          </div>
        </header>
        <div className="content-shell">
          <main className="workspace">
            <section className="hero">
              <div className="hero-bg" />
              <div className="hero-text">
                <span className="eyebrow">
                  <Icon name="Sparkles" size={13} />
                  THƯ VIỆN SỐ CỦA BẠN
                </span>
                <h1>Đọc sách hôm nay</h1>
                <p>Kiến thức mở ra một thế giới mới</p>
                <div className="stats">
                  {[
                    ['Files', stats.total, 'Tài liệu của bạn', '#ff9459'],
                    ['BookOpen', stats.reading, 'Đang đọc', '#087dff'],
                    ['HelpCircle', stats.uncat, 'Chưa phân loại', '#a225ee'],
                    ['Layers', stats.tags, 'Hashtag', '#00bc64'],
                  ].map(([icon, num, label, c]) => (
                    <div key={label}>
                      <span style={{ background: c }}>
                        <Icon name={icon} size={16} />
                      </span>
                      <p>
                        <b>{num}</b>
                        <small>{label}</small>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <blockquote>
                <Icon name="Quote" size={28} fill="#167bff" />
                <p>
                  Sách là cách nói chuyện với những bộ óc tuyệt vời nhất của các
                  thế kỷ trước.<cite>- René Descartes</cite>
                </p>
              </blockquote>
            </section>
            <div className="filter-bar">
              <Icon name="ListFilter" size={17} />
              <span>
                Đang lọc: <b>{filtered.length.toLocaleString('vi')}</b> / {all.length.toLocaleString('vi')} tài liệu
              </span>
              {filter && (
                <button className="filter-chip" onClick={() => setFilter(null)}>
                  {filter.value || 'Yêu thích'}
                  <Icon name="X" size={12} />
                </button>
              )}
              <button
                className="filter-chip"
                onClick={() => setModal('filters')}
              >
                <Icon name="Plus" size={14} />
                Thêm bộ lọc
              </button>
              {(filter || query || nav !== 'home') && (
                <button
                  className="clear-filter"
                  onClick={() => {
                    setFilter(null);
                    setQuery('');
                    setNav('home');
                  }}
                >
                  Xóa tất cả
                </button>
              )}
              {backend && (filter || query || nav !== 'home') && filtered.length > 0 && (
                <button className="filter-chip save-filter" title="Lưu các sách đang lọc thành một bộ sưu tập" onClick={() => openTool('saveFilter')}>
                  <Icon name="Layers" size={13} />
                  Lưu thành bộ sưu tập
                </button>
              )}
              {view === 'grid' && (
                <label className="zoom-slider" title="Cỡ ảnh bìa">
                  <Icon name="ZoomIn" size={13} />
                  <input type="range" min={1} max={5} step={1} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} aria-label="Cỡ ảnh bìa" />
                </label>
              )}
              <select
                aria-label="Sắp xếp tài liệu"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="recent">Mới nhất</option>
                <option value="title">Tên sách A-Z</option>
                <option value="progress">Tiến độ đọc</option>
              </select>
            </div>
            {error && (
              <div className="error" role="alert">
                {error}
                <button onClick={() => setError('')}>Đóng</button>
              </div>
            )}
            {picked.length > 0 && <BulkBar ctx={toolCtx} openTool={openTool} />}
            <div className={`book-area ${view} zoom-${zoom}`}>
              {!visible.length ? (
                <div className="empty">
                  <Icon name="BookOpen" size={44} />
                  <h2>Không tìm thấy tài liệu</h2>
                  <p>Thử từ khóa khác, xóa bộ lọc hoặc thêm sách từ máy.</p>
                  <button
                    className="primary"
                    onClick={() => {
                      setFilter(null);
                      setQuery('');
                      setNav('all');
                    }}
                  >
                    Xem thư viện
                  </button>
                </div>
              ) : (
                (sort === 'recent' && nav !== 'recent'
                  ? TIME_SECTIONS
                  : [{ id: 'all', title: nav === 'recent' ? 'Mở gần đây' : 'Kết quả' }]
                ).map((sec) => {
                  const items = sec.id === 'all' ? visible : visible.filter((b) => sectionOf(b) === sec.id);
                  if (!items.length) return null;
                  return (
                    <section className={`book-section ${sec.id}`} key={sec.id}>
                      <div className="section-label">
                        <h2>{sec.title}</h2>
                        <p>
                          {sec.id === 'all' ? filtered.length : filtered.filter((b) => sectionOf(b) === sec.id).length} tài liệu
                        </p>
                      </div>
                      <div className={`books-${view}`}>
                        {view === 'table' ? (
                          <table>
                            <thead>
                              <tr>
                                <th>Tài liệu</th>
                                <th>Tác giả</th>
                                <th>Định dạng</th>
                                <th>Đã đọc</th>
                              </tr>
                            </thead>
                            <tbody>
                              {items.map((b) => (
                                <tr
                                  key={b.id}
                                  className={
                                    `${b.id === selectedId ? 'chosen' : ''} ${picked.includes(b.id) ? 'picked' : ''}`
                                  }
                                >
                                  <td>
                                    <button onClick={(e) => pickClick(e, b)}>
                                      {b.title}
                                    </button>
                                  </td>
                                  <td>{b.author}</td>
                                  <td>{b.format}</td>
                                  <td>{b.progress}%</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          items.map((b) => (
                            <button
                              key={b.id}
                              className={`book-card ${b.id === selectedId ? 'chosen' : ''} ${picked.includes(b.id) ? 'picked' : ''} ${b.color === '#ffffff' ? 'light' : 'dark'}`}
                              style={{ '--cover': b.color }}
                              onClick={(e) => pickClick(e, b)}
                              onDoubleClick={() => read(b)}
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.setData('text/mewbook-book', b.id);
                                e.dataTransfer.effectAllowed = 'copy';
                              }}
                              data-testid={`book-${b.id}`}
                            >
                              <div className="cover-art">
                                <img
                                  src={b.cover}
                                  alt={b.title}
                                  loading="lazy"
                                />
                                <span
                                  className="format-badge"
                                  style={{ background: formatColor(b.format) }}
                                >
                                  {b.format === 'Hình ảnh' ? 'IMG' : b.format}
                                </span>
                                <span
                                  className="pick-box"
                                  role="checkbox"
                                  aria-checked={picked.includes(b.id)}
                                  title="Chọn nhiều (Ctrl/Shift + bấm)"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    lastPick.current = b.id;
                                    togglePick(b.id);
                                  }}
                                >
                                  {picked.includes(b.id) && <Icon name="Check" size={13} />}
                                </span>
                                {b.toRead && (
                                  <span className="toread-marker" title="Sẽ đọc">
                                    <Icon name="Bookmark" size={14} fill="#7c3aed" color="#7c3aed" />
                                  </span>
                                )}
                                {b.favorite && (
                                  <span className="favorite-marker">
                                    <Icon
                                      name="Star"
                                      size={16}
                                      fill="#ffc02a"
                                      color="#ffc02a"
                                    />
                                  </span>
                                )}
                              </div>
                              <div className="book-body">
                                <h3>{b.title}</h3>
                                <p>{b.author}</p>
                                <small>
                                  {b.progress > 0
                                    ? `Đã đọc ${b.progress}%`
                                    : 'Chưa đọc'}
                                </small>
                                <span className="book-more">
                                  <Icon name="Grip" size={14} />
                                </span>
                                <div className="progress">
                                  <i
                                    style={{
                                      width: `${b.progress}%`,
                                      background:
                                        b.progress > 70
                                          ? '#00bf69'
                                          : b.progress > 40
                                            ? '#2bb2bc'
                                            : '#3688ff',
                                    }}
                                  />
                                </div>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </section>
                  );
                })
              )}
            </div>
            <footer className="pagination">
              <div>
                <Tool
                  name="ChevronLeft"
                  label="Trang trước"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                />
                {Array.from({ length: pages }, (_, i) => i)
                  .filter(
                    (i) =>
                      i === 0 || i === pages - 1 || Math.abs(i + 1 - page) <= 2,
                  )
                  .map((i) => (
                    <button
                      key={i}
                      aria-current={page === i + 1 ? 'page' : undefined}
                      className={page === i + 1 ? 'current' : ''}
                      onClick={() => setPage(i + 1)}
                    >
                      {i + 1}
                    </button>
                  ))}
                <Tool
                  name="ChevronRight"
                  label="Trang sau"
                  disabled={page === pages}
                  onClick={() => setPage((p) => p + 1)}
                />
              </div>
              <label>
                Hiển thị{' '}
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                >
                  <option value={100}>100 / trang</option>
                  <option value={50}>50 / trang</option>
                  <option value={20}>20 / trang</option>
                  <option value={10}>10 / trang</option>
                  <option value={5}>5 / trang</option>
                </select>
              </label>
            </footer>
          </main>
          {inspector && selected && (
            <aside className="inspector" aria-label="Thông tin sách">
              <Tool
                className="inspector-close"
                name="X"
                label="Đóng thông tin sách"
                onClick={() => setInspector(false)}
              />
              <div className="inspector-top">
                <div
                  className="inspector-cover"
                  style={{ background: selected.color }}
                >
                  <img src={selected.cover} alt="" />
                  <span
                    className="format-badge"
                    style={{ background: formatColor(selected.format) }}
                  >
                    {selected.format}
                  </span>
                  <div>
                    <strong>{selected.title}</strong>
                    <small>
                      {selected.progress
                        ? `Đã đọc ${selected.progress}%`
                        : 'Chưa đọc'}
                    </small>
                  </div>
                </div>
                <div className="inspector-heading">
                  <button
                    className={`favorite-button ${selected.favorite ? 'favorited' : ''}`}
                    aria-label={
                      selected.favorite ? 'Bỏ yêu thích' : 'Thêm yêu thích'
                    }
                    data-testid="favorite-btn"
                    onClick={() =>
                      update(selected.id, { favorite: !selected.favorite })
                    }
                  >
                    <Icon
                      name="Star"
                      fill={selected.favorite ? '#ffa000' : 'none'}
                      color="#ffa000"
                    />
                  </button>
                  <span
                    className="heading-format"
                    style={{ background: formatColor(selected.format) }}
                  >
                    {selected.format}
                  </span>
                  <h2>{selected.title}</h2>
                  <p>
                    <Icon name="UserRound" size={15} />
                    {selected.author}
                    <button
                      aria-label="Sửa thông tin sách"
                      onClick={() => setModal('edit')}
                    >
                      <Icon name="Pencil" size={13} />
                    </button>
                  </p>
                  <button
                    className="primary read-button"
                    data-testid="read-now"
                    onClick={() => read(selected)}
                  >
                    <Icon name="Play" size={16} fill="white" />
                    Đọc ngay
                    <Icon name="ChevronDown" size={16} />
                  </button>
                  <div className="file-actions">
                    <button
                      title="Mở bằng ứng dụng mặc định của Windows"
                      onClick={() => openExternal(selected)}
                    >
                      <Icon name="File" size={13} />
                      Mở file
                    </button>
                    <button
                      title="Chọn ứng dụng đọc khác trên máy để mở file này"
                      onClick={() => openExternal(selected, 'with')}
                    >
                      <Icon name="ExternalLink" size={13} />
                      Gửi sang trình đọc
                    </button>
                    <button
                      className={selected.toRead ? 'on' : ''}
                      title="Đánh dấu để đọc sau"
                      onClick={() => update(selected.id, { toRead: !selected.toRead })}
                    >
                      <Icon name="Bookmark" size={13} fill={selected.toRead ? 'currentColor' : 'none'} />
                      {selected.toRead ? 'Đã thêm Sẽ đọc' : 'Sẽ đọc'}
                    </button>
                  </div>
                </div>
              </div>
              <div className="inspector-actions">
                {[
                  ['Pencil', 'Sửa', () => setModal('edit')],
                  ['Copy', 'Sao chép', copyInfo],
                  ['Share2', 'Chia sẻ', () => setModal('share')],
                  ['Ellipsis', 'Khác', () => setMenu(!menu)],
                ].map(([icon, label, fn]) => (
                  <button key={label} onClick={fn}>
                    <Icon name={icon} size={17} />
                    {label}
                  </button>
                ))}
              </div>
              {menu && (
                <div className="action-menu">
                  <button
                    onClick={() => {
                      update(selected.id, { progress: 100 });
                      setMenu(false);
                    }}
                  >
                    Đánh dấu đã đọc xong
                  </button>
                  <button
                    onClick={() => {
                      setModal('addToCollection');
                      setMenu(false);
                    }}
                  >
                    Thêm vào bộ sưu tập…
                  </button>
                  {backend && !selected.demo && (
                    <>
                      <button onClick={() => { setMenu(false); coverInput.current?.click(); }}>Đổi ảnh bìa…</button>
                      <button onClick={() => { setMenu(false); run('tool.coverReset', { id: selected.id }, 'Đã dùng lại bìa tự động.'); }}>Dùng bìa tự động</button>
                      <button onClick={() => { setMenu(false); openTool('meta'); }}>Tìm thêm thông tin trên mạng…</button>
                      <button onClick={() => { setMenu(false); openTool('convert'); }}>Chuyển đổi định dạng…</button>
                      <button onClick={() => { setMenu(false); openTool('device'); }}>Gửi sang máy đọc sách…</button>
                      {selected.missing && <button onClick={() => { setMenu(false); openTool('relink'); }}>Tìm lại file…</button>}
                    </>
                  )}
                  {backend && (
                    <button
                      onClick={() => {
                        openExternal(selected, true);
                        setMenu(false);
                      }}
                    >
                      Hiện trong thư mục
                    </button>
                  )}
                  <button
                    onClick={() => {
                      update(selected.id, { progress: 0 });
                      setMenu(false);
                    }}
                  >
                    Đặt lại tiến độ đọc
                  </button>
                  {backend && (
                    <>
                      <button
                        onClick={() =>
                          run(
                            'rebuild',
                            { id: selected.id },
                            'Đã lập lại chỉ mục tài liệu.',
                          )
                        }
                      >
                        Lập lại chỉ mục
                      </button>
                      <button
                        onClick={() =>
                          run(
                            'exportFile',
                            { id: selected.id },
                            'Đã xuất bản sao file.',
                          )
                        }
                      >
                        Xuất file gốc
                      </button>
                      <button
                        onClick={() => {
                          setModal('delete');
                          setMenu(false);
                        }}
                      >
                        Chuyển vào thùng rác
                      </button>
                    </>
                  )}
                </div>
              )}
              <div className="tabs" role="tablist">
                {['Thông tin', 'Mô tả AI', 'Mục lục', 'Ghi chú'].map((t) => (
                  <button
                    role="tab"
                    aria-selected={tab === t}
                    className={tab === t ? 'active' : ''}
                    key={t}
                    onClick={() => setTab(t)}
                  >
                    {t}
                    {t === 'Ghi chú' && ` (${actualNotes.length})`}
                  </button>
                ))}
              </div>
              <div className="inspector-content">
                {tab === 'Thông tin' ? (
                  <>
                    <dl>
                      {[
                        ['Tác giả', selected.author],
                        ['Định dạng', selected.format],
                        ['Lưu trữ', selected.linked ? 'Liên kết chỉ đọc — không sửa file gốc' : selected.demo ? 'Tài liệu mẫu' : 'Bản sao cũ trong AppData — dùng Công cụ → Bỏ bản sao'],
                        ...(selected.missing ? [['Trạng thái file', 'Không tìm thấy file nguồn; kiểm tra lại ổ/thư mục']] : []),
                        ['Dung lượng', `${selected.size} (${selected.bytes})`],
                        [
                          'Số trang',
                          selected.pages
                            ? `${selected.pages} trang`
                            : 'Chưa xác định',
                        ],
                        ['Nhà xuất bản', selected.publisher],
                        ['Năm xuất bản', selected.year],
                        ['ISBN', selected.isbn],
                        ['Ngày thêm', selected.dateAdded],
                        ['Vị trí file', selected.filePath],
                      ].map(([k, v]) => (
                        <React.Fragment key={k}>
                          <dt>{k}</dt>
                          <dd
                            className={k === 'Vị trí file' ? 'file-path' : ''}
                          >
                            {v}
                          </dd>
                        </React.Fragment>
                      ))}
                    </dl>
                    <div className="rating">
                      <span>Đánh giá</span>
                      <div>
                        <span className="my-rating">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <button
                              key={i}
                              title={selected.rating === i ? 'Bỏ đánh giá' : `${i} sao`}
                              aria-label={`${i} sao`}
                              onClick={() => update(selected.id, { rating: selected.rating === i ? 0 : i })}
                            >
                              <Icon name="Star" size={17} fill={(selected.rating || 0) >= i ? '#ffa300' : 'none'} color="#ffa300" />
                            </button>
                          ))}
                        </span>
                        <b>{selected.rating ? `${selected.rating}/5` : 'Chưa có'}</b>
                      </div>
                    </div>
                    <textarea
                      key={'rv' + selected.id}
                      className="my-review"
                      defaultValue={selected.review || ''}
                      placeholder="Nhận xét của bạn về cuốn sách…"
                      maxLength={8000}
                      onBlur={(e) => {
                        if (e.target.value !== (selected.review || '')) update(selected.id, { review: e.target.value }).then((r) => r && notify('Đã lưu nhận xét.'));
                      }}
                    />
                    <div className="book-tags">
                      <span>Hashtag</span>
                      <div>
                        {selected.hashtags?.map((t) => (
                          <button
                            key={t}
                            onClick={() =>
                              applyFilter({ kind: 'tag', value: t })
                            }
                          >
                            #{t}
                          </button>
                        ))}
                        <button onClick={() => setModal('tags')}>
                          + Thêm tag
                        </button>
                      </div>
                    </div>
                    <div className="ai-summary">
                      <header>
                        <Icon name="Sparkles" color="#ae22d6" />
                        <b>AI Tóm tắt</b>
                        <button onClick={() => setModal('ai')}>
                          <Icon name="RefreshCw" size={12} />
                          Tạo lại
                        </button>
                      </header>
                      <p>{selected.aiSummary || selected.description}</p>
                      <small>
                        {selected.summarySource ||
                          (selected.demo
                            ? 'Nội dung sách mẫu'
                            : 'Chưa tạo bản tóm tắt')}
                      </small>
                    </div>
                  </>
                ) : tab === 'Mô tả AI' ? (
                  <div className="tab-empty">
                    <Icon name="Sparkles" />
                    <h3>Mô tả tài liệu</h3>
                    <p>{selected.description}</p>
                    <p>{selected.aiSummary}</p>
                    <p className="muted">
                      {selected.summarySource ||
                        'Chọn Trợ lý AI để tạo tóm tắt cục bộ.'}
                    </p>
                  </div>
                ) : tab === 'Mục lục' ? (
                  <div className="tab-empty">
                    <Icon name="ListTree" />
                    <h3>Mục lục tài liệu</h3>
                    {doc?.toc?.length ? (
                      <ol>
                        {doc.toc.map((t, i) => (
                          <li key={i}>
                            {t.title}
                            {t.page ? ` (trang ${t.page})` : ''}
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p>Tài liệu không có mục lục trích xuất được.</p>
                    )}
                    <p className="muted">
                      Trạng thái chỉ mục: {doc?.status || 'none'}
                    </p>
                  </div>
                ) : (
                  <div className="notes">
                    <label htmlFor="note-draft">Ghi chú của bạn</label>
                    <textarea
                      id="note-draft"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="Ghi lại điều bạn muốn nhớ..."
                    />
                    <button
                      className="primary"
                      disabled={!draft.trim()}
                      onClick={saveNote}
                    >
                      Lưu ghi chú
                    </button>
                    {actualNotes.map((n) => (
                      <article key={n.id}>
                        <small>{n.date}</small>
                        <p>{n.text}</p>
                        <button
                          onClick={() =>
                            backend
                              ? run(
                                  'noteDelete',
                                  { id: selected.id, noteId: n.id },
                                  'Đã xóa ghi chú.',
                                )
                              : setNotes((s) => ({
                                  ...s,
                                  [selected.id]: s[selected.id].filter(
                                    (x) => x.id !== n.id,
                                  ),
                                }))
                          }
                        >
                          Xóa ghi chú
                        </button>
                      </article>
                    ))}
                    {!actualNotes.length && (
                      <p className="muted">Chưa có ghi chú được lưu.</p>
                    )}
                  </div>
                )}
              </div>
            </aside>
          )}
        </div>
      </div>
      <footer className="status-bar">
        <span>
          <Icon name="Library" size={15} />
          Thư viện: <b>{all.length.toLocaleString('vi')}</b> tài liệu
        </span>
        <span title="Tổng dung lượng các file sách">
          <Icon name="HardDrive" size={15} />
          {fmtBytes(totalBytes)}
        </span>
        {missingCount > 0 && (
          <button
            className="status-link warn"
            title="Sách chưa rõ tác giả hoặc mất file nguồn — bấm để lọc ra và sửa"
            onClick={() => {
              setNav('all');
              setQuery('');
              applyFilter({ kind: 'missingInfo', value: 'Thiếu thông tin' });
            }}
          >
            <Icon name="TriangleAlert" size={14} />
            {missingCount.toLocaleString('vi')} thiếu thông tin
          </button>
        )}
        {completeCount > 0 && (
          <span title="Sách đã có tác giả, file nguồn và chủ đề/hashtag">
            <Icon name="CheckCircle" size={14} />
            {completeCount.toLocaleString('vi')} đủ thông tin
          </span>
        )}
        {missingFileCount > 0 && (
          <button
            className="status-link warn"
            title="Bấm để lọc các sách mất file; dùng Công cụ → Tìm lại file để sửa"
            onClick={() => {
              setNav('all');
              setQuery('');
              applyFilter({ kind: 'missingFile', value: 'Không tìm thấy file' });
              if (backend) openTool('relink');
            }}
          >
            <Icon name="TriangleAlert" size={14} />
            {missingFileCount.toLocaleString('vi')} sách không tìm thấy file
          </button>
        )}
        {folderCount > 0 && (
          <span>
            <Icon name="FolderOpen" size={14} />
            {folderCount.toLocaleString('vi')} thư mục
          </span>
        )}
        {viewLabel && (
          <span>
            <Icon name="ListFilter" size={14} />
            {filtered.length.toLocaleString('vi')} {viewLabel}
          </span>
        )}
        <span>
          <Icon name="ShieldCheck" size={15} />
          {desktop ? 'Lưu cục bộ trên máy' : 'Lưu trên trình duyệt'}
        </span>
        {mainDisk && (
          <span
            className="disk"
            title={disk.map((d) => `${d.drive} còn trống ${fmtBytes(d.free)} / ${fmtBytes(d.total)}`).join('\n')}
          >
            Dung lượng ổ đĩa ({mainDisk.drive})
            <i>
              <b
                style={{
                  width: Math.round(((mainDisk.total - mainDisk.free) / Math.max(1, mainDisk.total)) * 100) + '%',
                  background: mainDisk.free / Math.max(1, mainDisk.total) < 0.1 ? '#ef4444' : '#16a34a',
                }}
              />
            </i>
            {fmtBytes(mainDisk.total - mainDisk.free)} / {fmtBytes(mainDisk.total)}
          </span>
        )}
        <span className="local-status">
          <Icon name="BadgeCheck" size={14} />
          Local
        </span>
        <button
          className="bell"
          aria-label="Thông báo"
          title="Thông báo"
          onClick={() => {
            setSeenBefore(eventsSeen);
            setModal('events');
            const max = events.reduce((m, e) => Math.max(m, e.id), 0);
            if (max > eventsSeen) {
              setEventsSeen(max);
              backend?.('eventsSeen', { id: max }).catch(() => {});
            }
          }}
        >
          <Icon name="Bell" size={16} />
          {unseen > 0 && <em className="badge">{unseen > 99 ? '99+' : unseen}</em>}
        </button>
      </footer>
      {toast && (
        <div role="status" className="toast">
          <Icon name="CheckCircle" />
          {toast}
        </div>
      )}
      {busy && (
        <div role="status" className="busy">
          Đang xử lý tài liệu...
        </div>
      )}
      {tool && <ToolDialog tool={tool} onClose={() => setTool(null)} ctx={toolCtx} />}
      <input
        ref={coverInput}
        className="visually-hidden"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-label="Chọn ảnh bìa"
        onChange={(e) => {
          onCoverFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      {modal && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModal(null);
          }}
        >
          <section
            ref={dialog}
            tabIndex={-1}
            onKeyDown={trap}
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <Tool
              className="modal-close"
              name="X"
              label="Đóng hộp thoại"
              onClick={() => setModal(null)}
            />
            <h2 id="modal-title">
              {
                {
                  sample: 'Sách mẫu chưa có file',
                  unsupported: 'Định dạng chưa đọc trực tiếp',
                  settings: 'Cài đặt thư viện',
                  ai: 'Trợ lý AI',
                  filters: 'Lọc tài liệu',
                  edit: 'Sửa thông tin sách',
                  tags: 'Thêm hashtag',
                  authors: 'Tác giả trong thư viện',
                  share: 'Chia sẻ thông tin sách',
                  trash: 'Thùng rác',
                  delete: 'Xóa khỏi thư viện',
                  collection: editCol?.id ? 'Sửa bộ sưu tập' : 'Bộ sưu tập mới',
                  addToCollection: 'Thêm vào bộ sưu tập',
                  events: 'Thông báo',
                }[modal]
              }
            </h2>
            {modal === 'sample' && (
              <>
                <p>
                  Đây là bìa và thông tin minh họa theo ảnh tham chiếu, không
                  phải sách PDF thật. Nhập file của bạn để đọc trong ứng dụng.
                </p>
                <button
                  className="primary"
                  onClick={() => {
                    setModal(null);
                    input.current?.click();
                  }}
                >
                  Nhập file sách
                </button>
              </>
            )}
            {modal === 'unsupported' && (
              <p>
                {unsupportedBook?.format || 'DJVU/CBR'} được lưu trong kho và có
                ảnh xem trước, nhưng chưa có bộ đọc nội bộ. Dùng Khác → Mở bằng
                ứng dụng mặc định hoặc Xuất file gốc. PDF/ảnh/CBZ đọc trực tiếp;
                EPUB, MOBI, AZW3, FB2, TXT, RTF, HTML, Markdown và Office đọc ở
                dạng văn bản.
              </p>
            )}
            {modal === 'settings' && (
              <>
                <p>
                  <b>SI Book · Backend SQLite local-first</b>
                </p>
                <p>
                  Với thư mục liên kết, SI Book chỉ lưu đường dẫn sách;
                  thông tin, ghi chú, tiến độ và chỉ mục được lưu riêng trong
                  hồ sơ SI Book. Không sao chép kho sách và không tạo ZIP. {all.filter((b) => b.demo).length} sách mẫu không
                  được tính vào thống kê tài liệu của bạn.
                </p>
                <p>
                  File nhập từ desktop v0.3 được tự chuyển khi có thể; dữ liệu
                  cũ không bị xóa. AI Ollama chỉ gọi máy này khi bạn bấm gửi.
                </p>
                {backend && (
                  <div className="backend-actions">
                    <button
                      disabled={busy}
                      onClick={() =>
                        run(
                          'linkFolder',
                          {},
                          (r) =>
                            `Đã liên kết ${r.scanned} file; mới ${r.added}; lỗi ${r.errors.length}${r.limited ? '; chưa quét hết do giới hạn an toàn' : ''}. Không sửa sách gốc.`,
                        )
                      }
                    >
                      Chọn thư mục sách (chỉ đọc)
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          setTrashBooks(await backend('trashList'));
                          setModal('trash');
                        } catch (e) {
                          setError(e.message);
                        }
                      }}
                    >
                      Mở thùng rác
                    </button>
                    <label>Đường dẫn thư mục tổng
                      <input aria-label="Đường dẫn thư mục sách" placeholder="D:\THƯ VIỆN SÁCH MỚI" value={folderPath} onChange={e => setFolderPath(e.target.value)} />
                    </label>
                    <button disabled={busy || !folderPath.trim()} onClick={() => run('linkFolder', {dir: folderPath}, r => `Đã liên kết ${r.scanned} file; ${r.errors.length} lỗi. Không sao chép hay sửa sách gốc.`)}>Kết nối đường dẫn (chỉ đọc)</button>
                    <p className="muted">Quét cả thư mục con. Danh sách hiện trước; chỉ đọc nội dung khi mở hoặc lập chỉ mục. Tìm kiếm nội dung chỉ áp dụng cho sách đã lập chỉ mục. Nếu ổ nguồn mất kết nối, sách không mở được.</p>
                    {watched.map((dir) => (
                      <p key={dir}>
                        {dir}
                        <button
                          onClick={() =>
                            run('unwatch', { dir }, 'Đã dừng theo dõi thư mục.')
                          }
                        >
                          Dừng quét tự động
                        </button>
                      </p>
                    ))}
                  </div>
                )}
                <p className="muted">
                  Sao lưu/khôi phục thư viện nằm ở Công cụ (biểu tượng cờ lê) → Sao lưu. SI Book chỉ dùng thư viện gốc: thêm sách, kéo thả hay kết nối thư mục đều chỉ lưu đường dẫn, không sao chép file sách.
                  Bản sao cũ (nếu có) xử lý ở Công cụ → Bỏ bản sao, dùng thư viện gốc. EPUB, MOBI/AZW/AZW3/PRC, FB2, RTF, HTML,
                  Markdown, ODT/Office đọc dạng văn bản, không giữ đầy đủ bố cục;
                  CBZ đọc theo trang ảnh. DJVU/CBR chỉ lưu và xem trước; sách có
                  DRM và PDF quét ảnh chưa đọc được nội dung.
                </p>
              </>
            )}
            {modal === 'delete' && (
              <>
                <p>
                  Chuyển “{selected?.title}” vào thùng rác? File gốc và ghi chú
                  vẫn được giữ để khôi phục.
                </p>
                <button
                  className="primary"
                  onClick={async () => {
                    const r = await run(
                      'trash',
                      { id: selected.id },
                      'Đã chuyển vào thùng rác.',
                    );
                    if (r) setModal(null);
                  }}
                >
                  Chuyển vào thùng rác
                </button>
              </>
            )}
            {modal === 'trash' && (
              <div className="filter-options">
                {trashBooks.length ? (
                  trashBooks.map((b) => (
                    <p key={b.id}>
                      {b.title}
                      <button
                        onClick={async () => {
                          await run(
                            'restoreBook',
                            { id: b.id },
                            'Đã khôi phục sách.',
                          );
                          setTrashBooks(await backend('trashList'));
                        }}
                      >
                        Khôi phục
                      </button>
                      <button
                        onClick={async () => {
                          await run(
                            'purge',
                            { id: b.id },
                            (r) => r.filesDeleted ? 'Đã xóa vĩnh viễn sách và file gốc.' : 'Đã gỡ vĩnh viễn khỏi thư viện (file gốc vẫn còn).',
                          );
                          setTrashBooks(await backend('trashList'));
                        }}
                      >
                        Xóa vĩnh viễn...
                      </button>
                    </p>
                  ))
                ) : (
                  <p>Thùng rác trống.</p>
                )}
                {trashBooks.length > 1 && (
                  <p>
                    <button
                      onClick={async () => {
                        await run(
                          'purgeAll',
                          {},
                          (r) => `Đã xóa vĩnh viễn ${r.purged} sách${r.filesDeleted ? `, xóa ${r.filesDeleted} file gốc` : ' (file gốc vẫn còn)'}${r.errors.length ? `; lỗi ${r.errors.length}` : ''}.`,
                        );
                        setTrashBooks(await backend('trashList'));
                      }}
                    >
                      Xóa vĩnh viễn tất cả ({trashBooks.length})...
                    </button>
                  </p>
                )}
              </div>
            )}
            {modal === 'ai' && (
              <>
                <p>
                  Trích câu tự động chạy hoàn toàn trên máy (không cần AI). Để hỏi đáp, tóm tắt bằng AI, chọn nhà cung cấp bên dưới: OpenAI (GPT), Claude, Gemini, Grok, DeepSeek, Kimi, GLM, OpenRouter hoặc Ollama trên máy.
                </p>
                <button
                  className="primary"
                  disabled={busy || !selected?.imported}
                  onClick={() =>
                    run(
                      'summary',
                      { id: selected.id },
                      'Đã tạo bản tóm tắt trích câu.',
                    )
                  }
                >
                  Tóm tắt trích câu trên máy
                </button>
                <AiPanel selected={selected} busy={busy} setBusy={setBusy} />
              </>
            )}
            {modal === 'filters' && (
              <div className="filter-options">
                <button
                  onClick={() => {
                    applyFilter({ kind: 'favorite', value: 'Yêu thích' });
                    setModal(null);
                  }}
                >
                  Sách yêu thích
                </button>
                {allFormats.map((f) => (
                  <button
                    key={f.label}
                    className={f.count ? '' : 'empty-format'}
                    onClick={() => {
                      applyFilter({ kind: 'format', value: f.label });
                      setModal(null);
                    }}
                  >
                    <span className="format-dot" style={{ background: formatColor(f.label) }} />
                    {f.label}
                    <small>{f.count}</small>
                  </button>
                ))}
              </div>
            )}
            {modal === 'authors' && (
              <div className="filter-options">
                {[...new Set(all.map((b) => b.author))].map((a) => (
                  <button
                    key={a}
                    onClick={() => {
                      applyFilter({ kind: 'author', value: a });
                      setModal(null);
                    }}
                  >
                    {a} ({all.filter((b) => b.author === a).length})
                  </button>
                ))}
              </div>
            )}
            {modal === 'edit' && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  const r = await update(selected.id, {
                    folder: f.get('folder').trim() || 'Sách cá nhân',
                    publisher: f.get('publisher').trim(),
                    year: f.get('year').trim(),
                    isbn: f.get('isbn').trim(),
                    hashtags: f
                      .get('hashtags')
                      .split(',')
                      .map((x) => x.trim().replace(/^#/, ''))
                      .filter(Boolean),
                    title: f.get('title').trim() || selected.title,
                    author: f.get('author').trim() || 'Chưa rõ tác giả',
                    progress: Math.max(
                      0,
                      Math.min(100, Number(f.get('progress'))),
                    ),
                  });
                  if (!backend || r) {
                    setModal(null);
                    notify('Đã lưu thông tin sách.');
                  }
                }}
              >
                <label>
                  Tên sách
                  <input name="title" required defaultValue={selected.title} />
                </label>
                <label>
                  Tác giả
                  <input name="author" defaultValue={selected.author} />
                </label>
                <label>
                  Thư mục / bộ sưu tập
                  <input
                    name="folder"
                    defaultValue={selected.folder || 'Sách cá nhân'}
                  />
                </label>
                <label>
                  Nhà xuất bản
                  <input
                    name="publisher"
                    defaultValue={selected.publisher || ''}
                  />
                </label>
                <label>
                  Năm xuất bản
                  <input name="year" defaultValue={selected.year || ''} />
                </label>
                <label>
                  ISBN
                  <input name="isbn" defaultValue={selected.isbn || ''} />
                </label>
                <label>
                  Hashtag (ngăn bằng dấu phẩy)
                  <input
                    name="hashtags"
                    defaultValue={(selected.hashtags || []).join(', ')}
                  />
                </label>
                <label>
                  Tiến độ (%)
                  <input
                    name="progress"
                    type="number"
                    min="0"
                    max="100"
                    defaultValue={selected.progress}
                  />
                </label>
                <button className="primary">Lưu thay đổi</button>
              </form>
            )}
            {modal === 'tags' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const t = new FormData(e.currentTarget)
                    .get('tag')
                    .trim()
                    .replace(/^#/, '');
                  if (t) {
                    update(selected.id, {
                      hashtags: [...new Set([...(selected.hashtags || []), t])],
                    });
                    setModal(null);
                  }
                }}
              >
                <label>
                  Hashtag cho “{selected.title}”
                  <input
                    name="tag"
                    required
                    maxLength={50}
                    placeholder="Ví dụ: kỹ-thuật"
                  />
                </label>
                <button className="primary">Thêm tag</button>
              </form>
            )}
            {modal === 'collection' && editCol && (
              <form
                className="col-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const name = String(new FormData(e.currentTarget).get('name') || '').trim();
                  if (!name) return;
                  const c = { ...editCol, name, id: editCol.id || 'c-' + Math.random().toString(36).slice(2, 10) };
                  const list = editCol.id ? collections.map((x) => (x.id === c.id ? c : x)) : [...collections, c];
                  if (await saveCollections(list)) {
                    setModal(null);
                    if (!editCol.id) {
                      setNav('col:' + c.id);
                      applyFilter(null);
                      notify('Đã tạo bộ sưu tập. Kéo thả sách vào mục này ở thanh bên để thêm.');
                    }
                  }
                }}
              >
                <label>
                  Tên bộ sưu tập
                  <input name="name" required maxLength={60} defaultValue={editCol.name} placeholder="Ví dụ: Hồ sơ dự án" autoFocus />
                </label>
                <div className="col-icons" aria-label="Biểu tượng">
                  {COL_ICONS.map((ic) => (
                    <button type="button" key={ic} aria-label={ic} className={editCol.icon === ic ? 'on' : ''} onClick={() => setEditCol((c) => ({ ...c, icon: ic }))}>
                      <Icon name={ic} size={16} style={{ color: editCol.color }} />
                    </button>
                  ))}
                </div>
                <div className="col-colors" aria-label="Màu">
                  {COL_COLORS.map((cl) => (
                    <button type="button" key={cl} aria-label={'Màu ' + cl} className={editCol.color === cl ? 'on' : ''} style={{ background: cl }} onClick={() => setEditCol((c) => ({ ...c, color: cl }))} />
                  ))}
                </div>
                <p className="col-hint">Kéo thả sách vào bộ sưu tập ở thanh bên, hoặc dùng “Khác → Thêm vào bộ sưu tập…”. Một sách có thể nằm trong nhiều bộ.</p>
                <div className="col-actions">
                  {editCol.id && (
                    <button
                      type="button"
                      className="col-delete"
                      onClick={async () => {
                        if (await saveCollections(collections.filter((x) => x.id !== editCol.id), true)) {
                          if (nav === 'col:' + editCol.id) setNav('all');
                          setModal(null);
                          notify('Đã xóa bộ sưu tập (sách vẫn còn trong thư viện).');
                        }
                      }}
                    >
                      <Icon name="Trash2" size={14} />
                      Xóa bộ sưu tập
                    </button>
                  )}
                  <button className="primary">{editCol.id ? 'Lưu' : 'Tạo bộ sưu tập'}</button>
                </div>
              </form>
            )}
            {modal === 'addToCollection' && selected && (
              <>
                <p>Chọn bộ sưu tập cho “{selected.title}”:</p>
                <div className="col-pick">
                  {collections.map((c) => {
                    const on = selected.collections?.includes(c.id);
                    return (
                      <button key={c.id} className={on ? 'on' : ''} onClick={() => toggleCollection(selected.id, c.id, !on)}>
                        <Icon name={c.icon} size={16} style={{ color: c.color }} />
                        <span>{c.name}</span>
                        {on && <Icon name="Check" size={16} />}
                      </button>
                    );
                  })}
                  {!collections.length && <p>Chưa có bộ sưu tập nào.</p>}
                </div>
                <div className="col-actions">
                  <button
                    type="button"
                    onClick={() => {
                      setEditCol({ id: '', name: '', icon: 'Layers', color: COL_COLORS[collections.length % COL_COLORS.length] });
                      setModal('collection');
                    }}
                  >
                    <Icon name="Plus" size={14} />
                    Bộ sưu tập mới
                  </button>
                  <button className="primary" onClick={() => setModal(null)}>
                    Xong
                  </button>
                </div>
              </>
            )}
            {modal === 'events' && (
              <ul className="event-list">
                {events
                  .filter((e) => NOTIFY_KINDS.includes(e.kind))
                  .map((e) => (
                    <li key={e.id} className={e.id > seenBefore ? 'new' : ''}>
                      <Icon
                        name={e.kind === 'watch-error' ? 'TriangleAlert' : e.kind === 'office' ? 'CheckCircle' : e.kind === 'link-folder' ? 'FolderOpen' : 'Info'}
                        size={16}
                      />
                      <div>
                        <p>{e.message}</p>
                        <small>{new Date(e.at).toLocaleString('vi')}</small>
                      </div>
                    </li>
                  ))}
                {!events.some((e) => NOTIFY_KINDS.includes(e.kind)) && <li>Chưa có thông báo.</li>}
              </ul>
            )}
            {modal === 'share' && (
              <>
                <p>Chỉ chia sẻ thông tin, không tải file lên máy chủ.</p>
                <pre>
                  {selected.title}
                  {'\n'}
                  {selected.author}
                  {'\n'}
                  {selected.format}
                </pre>
                <button className="primary" onClick={copyInfo}>
                  Sao chép thông tin
                </button>
              </>
            )}
          </section>
        </div>
      )}
      {reader && (
        <section className="reader" aria-label="Trình đọc tài liệu">
          <header>
            <Tool
              name="ArrowLeft"
              label="Quay lại thư viện"
              onClick={closeReader}
            />
            <strong>{reader.book.title}</strong>
            <label>
              Tiến độ{' '}
              <input
                aria-label="Tiến độ đọc"
                type="number"
                min="0"
                max="100"
                value={
                  all.find((b) => b.id === reader.book.id)?.progress ??
                  reader.book.progress
                }
                onChange={(e) =>
                  update(reader.book.id, {
                    progress: Math.max(
                      0,
                      Math.min(100, Number(e.target.value)),
                    ),
                  })
                }
              />
              %
            </label>
            {reader.toc?.length > 0 && (
              <select
                aria-label="Mục lục trình đọc"
                defaultValue=""
                onChange={(e) => {
                  const t = reader.toc[Number(e.target.value)];
                  if (reader.epub && t.href) {
                    epubApi.current?.goTo(t.href);
                  } else if (reader.office && officeBox.current) {
                    const el = officeBox.current;
                    const items = el.querySelectorAll('section.docx, .pptx-preview-slide-wrapper, [class*="slide-wrapper"]');
                    if (t.page && items[t.page - 1]) items[t.page - 1].scrollIntoView({ block: 'start' });
                    else if (typeof t.offset === 'number' && reader.fallbackText)
                      el.scrollTop = (t.offset / Math.max(reader.fallbackText.length, 1)) * (el.scrollHeight - el.clientHeight);
                  } else if ((reader.book.format === 'PDF' || reader.pdf) && t.page) {
                    setReader((r) => ({
                      ...r,
                      url: r.url.split('#')[0] + '#page=' + t.page,
                    }));
                    update(reader.book.id, {
                      progress: Math.round(
                        (t.page / Math.max(reader.book.pages, 1)) * 100,
                      ),
                    });
                  } else if (
                    readerBody.current &&
                    typeof t.offset === 'number'
                  ) {
                    readerBody.current.scrollTop =
                      (t.offset / Math.max(reader.text.length, 1)) *
                      (readerBody.current.scrollHeight -
                        readerBody.current.clientHeight);
                  }
                }}
              >
                <option value="" disabled>
                  Chọn chương / mục
                </option>
                {reader.toc.map((t, i) => (
                  <option key={i} value={i}>
                    {t.title}
                  </option>
                ))}
              </select>
            )}
            {backend && ['DOCX', 'PPTX'].includes(reader.book.format) && (
              <button
                className="office-switch"
                title="Tạo bản PDF bằng Microsoft Office/LibreOffice để hiển thị chính xác 100% (lần đầu có thể mất vài chục giây)"
                onClick={() =>
                  reader.pdf
                    ? setReader((r) => ({ ...r, pdf: false, url: null, office: true }))
                    : officeExact()
                }
              >
                {reader.pdf ? 'Trình xem nhanh' : 'Bản chuẩn ' + (reader.book.format === 'PPTX' ? 'PowerPoint' : 'Word')}
              </button>
            )}
            <Tool name="X" label="Đóng trình đọc" onClick={closeReader} />
          </header>
          {reader.text !== null ? (
            <article
              ref={readerBody}
              className="text-reader"
              onScroll={(e) => {
                if (!backend) return;
                const el = e.currentTarget;
                clearTimeout(savePosition.current);
                const top = el.scrollTop,
                  max = el.scrollHeight - el.clientHeight;
                savePosition.current = setTimeout(
                  () =>
                    update(reader.book.id, {
                      location: String(top),
                      progress:
                        max > 0
                          ? Math.min(100, Math.round((top / max) * 100))
                          : 100,
                    }),
                  600,
                );
              }}
            >
              {reader.text ||
                (String(reader.status || '').startsWith('drm')
                  ? 'Sách này được khóa DRM (Kindle) nên SI Book không đọc được nội dung. Hãy dùng bản không DRM hoặc mở bằng ứng dụng Kindle.'
                  : 'Không trích xuất được văn bản. Kiểm tra trạng thái chỉ mục hoặc xuất file gốc.')}
            </article>
          ) : reader.epub ? (
            <div className={'epub-reader' + (epubTocOpen ? ' toc-open' : '')}>
              {epubTocOpen && reader.toc?.length > 0 && (
                <nav className="epub-toc" aria-label="Mục lục sách">
                  <h3>Mục lục</h3>
                  {reader.toc.map((t, i) => (
                    <button
                      key={i}
                      className={t.href && t.href.split('#')[0] === epubCur && reader.toc.findIndex((x) => x.href && x.href.split('#')[0] === epubCur) === i ? 'on' : ''}
                      style={{ paddingLeft: 12 + Math.min(t.level || 0, 5) * 14 }}
                      title={t.title}
                      onClick={() => {
                        if (t.href) {
                          epubApi.current?.goTo(t.href);
                          setEpubCur(t.href.split('#')[0]);
                        }
                      }}
                    >
                      {t.title}
                    </button>
                  ))}
                </nav>
              )}
              <button className="epub-toc-toggle" onClick={() => setEpubTocOpen((v) => !v)} title={epubTocOpen ? 'Ẩn mục lục' : 'Hiện mục lục'}>
                {epubTocOpen ? '‹' : '☰'}
              </button>
              {epubState === 'loading' && <p className="office-loading">Đang dựng trang sách…</p>}
              <div ref={epubBox} className="epub-box" onScroll={epubScroll} />
            </div>
          ) : reader.office ? (
            <div className="office-reader" data-format={reader.book.format}>
              {officeState === 'loading' && <p className="office-loading">Đang dựng trang {reader.book.format === 'PPTX' ? 'slide' : 'tài liệu'}…</p>}
              <div ref={officeBox} className="office-box" />
            </div>
          ) : reader.comic != null ? (
            <div className="image-reader comic-reader">
              {reader.comic === 0 && <p>Không tìm thấy trang ảnh trong file CBZ.</p>}
              {Array.from({ length: reader.comic }, (_, i) => (
                <img
                  key={i}
                  loading="lazy"
                  src={'mewbook://page/' + encodeURIComponent(reader.book.id) + '/' + i}
                  alt={reader.book.title + ' – trang ' + (i + 1)}
                />
              ))}
            </div>
          ) : reader.book.format === 'Hình ảnh' ? (
            <div className="image-reader">
              <img src={reader.url} alt={reader.book.title} />
            </div>
          ) : (
            <iframe title={`Đọc ${reader.book.title}`} src={reader.url} />
          )}
        </section>
      )}
    </div>
  );
}
