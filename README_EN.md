# SI Book — Digital Library & Ebook Reader for Windows (v1.0.1)

[English](README_EN.md) | [Tiếng Việt](README.md)

[![Version](https://img.shields.io/badge/version-1.0.1-blue.svg)](https://github.com/phanducdeveloper-spec/Sibook)
[![Platform](https://img.shields.io/badge/platform-Windows%20x64-informational.svg)](https://github.com/phanducdeveloper-spec/Sibook)
[![Electron](https://img.shields.io/badge/Electron-44.7-brightgreen.svg)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-19.0-61dafb.svg)](https://react.dev/)
[![SQLite](https://img.shields.io/badge/SQLite-FTS5-orange.svg)](https://sqlite.org/)

**SI Book** is a modern, **local-first** Windows desktop application designed to organize, search, and read your personal digital library with high performance — linking directly to existing files on your computer **without copying or altering original documents**.

---

## 📥 Download & Install (Version 1.0.1)

| Release | Format | Direct Download | Description |
|:---|:---|:---|:---|
| **SI Book Portable** | `.exe` (129 MB) | [👉 **Download SI-Book-1.0.1-Portable.exe**](https://github.com/phanducdeveloper-spec/Sibook/releases/download/v1.0.1/SI-Book-1.0.1-Portable.exe) | **Recommended**: Standalone executable, no installation needed. Double-click and run immediately. |
| **SI Book Setup** | `.exe` (130 MB) | [👉 **Download SI-Book-1.0.1-Setup.exe**](https://github.com/phanducdeveloper-spec/Sibook/releases/download/v1.0.1/SI-Book-1.0.1-Setup.exe) | Standard Windows installer with Desktop and Start Menu shortcuts. |

> 💡 **View all releases and assets on**: [GitHub Releases](https://github.com/phanducdeveloper-spec/Sibook/releases)

---

## 🌟 Key Features

- 🚀 **Local-First & Strict Privacy**: All data, full-text indexes, and notes are stored locally in an SQLite database (WAL mode). Books and documents are never uploaded to any cloud server.
- 🔗 **Direct Folder Linking**: Link your folders in read-only mode — SI Book tracks files by path and SHA-256 hash without duplicating storage on your disk.
- ⚡ **Blazing-Fast FTS5 Full-Text Search**: Instant search across titles, authors, hashtags, folders, and extracted book content with unaccented text normalization.
- 📖 **Comprehensive Format Support**:
  - **Ebooks & Documents**: PDF, EPUB, MOBI, AZW3, FB2, TXT, RTF, HTML.
  - **Office Documents**: DOCX, PPTX.
  - Automatic extraction of covers, tables of contents (TOC), page counts, metadata, and full text.
- 🤖 **Integrated AI Assistant**:
  - Run locally and offline via **Ollama**.
  - Optional cloud LLM integration: **OpenAI**, **Claude**, **Gemini**, **DeepSeek** (bring your own API key).
  - Book summaries, key takeaways extraction, and contextual Q&A.
- 🛠️ **Library Utility Toolkit**:
  - Deduplicate books using SHA-256 checksums.
  - Bulk normalize and rename authors.
  - Auto-tagging and folder-based categorization.
  - Calibre integration for format conversion (auto-detected if Calibre is installed).
  - Export library catalog to CSV; secure backup and restore.
- 📦 **Convenient Distribution**:
  - **Portable (.exe)**: Completely self-contained, no Node.js or Python required on host machine.
  - **Setup (.exe)**: Complete NSIS installer.

---

## 🏗️ Architecture

Engineered with strict process isolation and security boundaries:

```
SI-Book/
├── frontend/
│   ├── electron/                 # Electron Backend (Main Process & Utilities)
│   │   ├── main.cjs              # Electron lifecycle, Window & Protocol management
│   │   ├── preload.cjs           # Secure Context Bridge (restricted IPC)
│   │   ├── library.cjs           # SQLite core, FTS5, folder watcher, metadata & CRUD
│   │   ├── service.cjs           # API Layer via IPC Whitelist
│   │   ├── extractor.cjs         # Isolated worker for document parsing (PDF/EPUB/Office/...)
│   │   ├── formats.cjs           # Parsers for MOBI, FB2, RTF, HTML, TXT
│   │   └── tools.cjs             # Library tools, Calibre integration, meta search & AI
│   └── src/                      # Frontend UI (Renderer Process - React 19 + Vite)
│       ├── App.jsx               # Main UI shell, routing, state management
│       ├── Reader.jsx            # Multi-format reader (PDF, EPUB, Text, Canvas)
│       ├── Tools.jsx             # Toolbox dialog, settings & About view
│       ├── AIModal.jsx           # AI Assistant chat and summary modal
│       └── index.css             # Design system with Dark Mode support
├── release/                      # Packaged executables (Portable & Setup)
├── Start-SIBook.bat              # Quick startup batch script
└── build.bat                     # Automated build script
```

### Security & Reliability:
1. **Process Isolation**: The `extractor.cjs` worker runs in a separate child process with strict memory and execution limits. Corrupted or malicious files will not crash the main UI.
2. **CSP & Whitelisted IPC**: The renderer has zero direct access to the filesystem or arbitrary Node.js APIs.
3. **SQLite WAL (Write-Ahead Logging)**: Guarantees database integrity even during sudden application termination.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| <kbd>Ctrl</kbd> + <kbd>K</kbd> / <kbd>Ctrl</kbd> + <kbd>F</kbd> | Open Command Palette / FTS5 Full-Text Search |
| <kbd>Ctrl</kbd> + <kbd>N</kbd> | Add books or connect a book folder |
| <kbd>Double Click</kbd> | Open book in reader mode immediately |
| <kbd>Ctrl</kbd> / <kbd>Shift</kbd> + Click | Multi-select books for batch operations |
| <kbd>Esc</kbd> | Close reader, dismiss modal, or clear selection |

---

## 🚀 Development & Build Guide

### 1. Prerequisites
- **Node.js** >= 18
- **npm** >= 9
- OS: Windows 10/11 x64

### 2. Install Dependencies
```bash
cd frontend
npm install
```

### 3. Run in Development Mode
```bash
# Terminal 1: Launch Vite Dev Server
npm run dev

# Terminal 2: Launch Electron Window
npm run desktop
```

### 4. Run Backend Tests
```bash
npm run test:backend
```

### 5. Build Release Executables
```bash
# Package into unpacked directory for quick verification
npm run pack

# Build production installers (SI-Book-1.0.1-Portable.exe & SI-Book-1.0.1-Setup.exe)
npm run dist
```
Compiled executables will be output to the `release/` directory.

---

## 👤 Author & License

- **Author**: Phan Đức
- **Version**: 1.0.1
- **Copyright**: © 2026 Phan Đức. All rights reserved.
