# MewBook — Thư viện số (Desktop Library App)

## Original Problem Statement
Rebuild a brand-new desktop application from scratch, using a provided reference screenshot as the single SOURCE OF TRUTH for art direction, layout, hierarchy and visual experience. It is a Vietnamese digital-library desktop app ("MewBook"). Must feel like a real commercial desktop product (not a website/dashboard template): custom title bar, sidebar, toolbar, workspace with book cards, inspector panel, status bar, command palette, keyboard shortcuts, real interactions.

## User Choices (Phase 2)
- Source: Phase 1 zip was an offline build (no editable source) → rebuilt faithfully from reference image.
- Backend: **Frontend-only**, static demo data (no DB, no API).
- AI: UI only (no real AI integration for now).
- Theme: Light tone + blue accent + multi-color covers (as reference).
- Scope: Full app shell + workspace + inspector + search/command palette + interactions.

## Architecture
- Vite + React 19 + Tailwind v4 + shadcn primitives. Frontend-only; backend template untouched/unused.
- Fonts: Be Vietnam Pro (body, Vietnamese-optimized) + Sora (display).
- State in `App.js` with localStorage persistence (sidebar collapsed/width, inspector open, view mode).
- Design tokens + custom utilities in `src/index.css` (`--mw-*` vars, shadows, shimmer, float, fade-up).
- Static data in `src/data/library.js` (15 books across today/week/month, authors, hashtags, formats, folders).
- Components in `src/components/mewbook/`: Sidebar, TopToolbar, HeroBanner, Workspace, BookCard, Inspector, StatusBar, CommandPalette.

## Implemented (2026-10-08)
- App shell: custom title bar controls, brand, sidebar, toolbar, workspace, inspector, status bar.
- Sidebar: primary nav with counters/active states, collapse to icon-only (72px) + drag-resize, Authors/Hashtag/Format(2-col)/Folders sections.
- Toolbar: command-palette search trigger (Ctrl+K), view switch (Lưới/Bảng/Danh sách), Thêm sách, sync/AI/settings + window controls.
- Hero banner: gradient, stats chips, animated robot illustration + floating book spines, Descartes quote card; responsive breakpoints.
- Workspace: grouped sections (HÔM NAY/TUẦN NÀY/THÁNG NÀY), grid/table/list views, filter chips (remove/clear-all), realtime search filter, pagination, empty state.
- BookCard: cover image, format badge, favorite star, title/author, progress bar, hover elevation, staggered entrance.
- Inspector: cover, title/author, Đọc ngay + secondary actions, tabs (Thông tin/Mô tả AI/Mục lục/Ghi chú), metadata table, rating, hashtags, AI summary card.
- StatusBar: library stats, disk usage bar, Local/connection indicators, notifications.
- Command palette (cmdk): documents + commands + navigation groups, filtering, Esc close.
- Keyboard shortcuts: Ctrl+K, Ctrl+F, Ctrl+N/O/S, Ctrl+Z/Shift+Z, Esc. Sonner toasts for feedback.
- Verified by testing agent: 9/9 frontend flows pass, 0 console errors.

## Backlog / Remaining
- P1: Table view as semantic virtualized table; list/grid virtualization for large libraries.
- P1: Real file import + local indexing; persist library/favorites.
- P2: Real AI (summary/categorize) via Emergent LLM key.
- P2: Dark mode; drag-and-drop import; context menus on cards.

## Next Tasks
- Await user feedback on visual fidelity vs reference, then iterate on any deltas.
