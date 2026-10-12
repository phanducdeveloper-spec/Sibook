# SI Book — Thư Viện Số & Trình Đọc Sách Trên Windows (v1.0.1)

[![Version](https://img.shields.io/badge/version-1.0.1-blue.svg)](https://github.com/phanducdeveloper-spec/Sibook)
[![Platform](https://img.shields.io/badge/platform-Windows%20x64-informational.svg)](https://github.com/phanducdeveloper-spec/Sibook)
[![Electron](https://img.shields.io/badge/Electron-44.7-brightgreen.svg)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-19.0-61dafb.svg)](https://react.dev/)
[![SQLite](https://img.shields.io/badge/SQLite-FTS5-orange.svg)](https://sqlite.org/)

**SI Book** là ứng dụng desktop Windows hiện đại theo triết lý **local-first**, giúp bạn quản lý, tìm kiếm và đọc thư viện sách cá nhân với hiệu năng cao, trực tiếp từ các thư mục trên máy tính mà **không cần sao chép hay thay đổi file gốc**.

---

## 📥 Tải Về Cài Đặt (Bản 1.0.1)

| Bản phát hành | Định dạng | Tải về trực tiếp | Hướng dẫn sử dụng |
|---------------|-----------|-------------------|-------------------|
| **SI Book Portable** | `.exe` (129 MB) | [👉 **Tải SI-Book-1.0.1-Portable.exe**](https://github.com/phanducdeveloper-spec/Sibook/releases/download/v1.0.1/SI-Book-1.0.1-Portable.exe) | **Khuyên dùng**: Không cần cài đặt, tải về bấm đúp chạy luôn |
| **SI Book Setup** | `.exe` (130 MB) | [👉 **Tải SI-Book-1.0.1-Setup.exe**](https://github.com/phanducdeveloper-spec/Sibook/releases/download/v1.0.1/SI-Book-1.0.1-Setup.exe) | Trình cài đặt chuẩn Windows, tự tạo shortcut Desktop |

> 💡 **Xem toàn bộ bản phát hành tại**: [GitHub Releases](https://github.com/phanducdeveloper-spec/Sibook/releases)

---

## 🌟 Điểm Nổi Bật

- 🚀 **Local-First & Quyền Riêng Tư Tuyệt Đối**: Toàn bộ dữ liệu, chỉ mục nội dung và ghi chú lưu trữ cục bộ trong cơ sở dữ liệu SQLite (WAL mode). Sách không bao giờ tự ý gửi lên đám mây.
- 🔗 **Liên Kết Thư Mục Trực Tiếp**: Thêm thư mục sách chỉ đọc — SI Book quản lý bằng đường dẫn và mã băm SHA-256, không nhân đôi dung lượng ổ đĩa.
- ⚡ **Tìm Kiếm Toàn Văn FTS5 Siêu Tốc**: Tìm kiếm tức thì trong tiêu đề, tác giả, hashtag, thư mục và cả nội dung trích xuất của sách; hỗ trợ tiếng Việt không dấu.
- 📖 **Hỗ Trợ Đa Định Dạng**:
  - **Ebook & Tài liệu**: PDF, EPUB, MOBI, AZW3, FB2, TXT, RTF, HTML.
  - **Tài liệu văn phòng**: DOCX, PPTX.
  - Tự động trích xuất bìa, mục lục (TOC), số trang, metadata và văn bản.
- 🤖 **Trợ Lý AI Tích Hợp**:
  - Hỗ trợ mô hình AI cục bộ qua **Ollama** (chạy offline trên máy).
  - Tùy chọn kết nối API: **OpenAI**, **Claude**, **Gemini**, **DeepSeek** khi người dùng cấu hình khóa API.
  - Tóm tắt sách, trích xuất ý chính, hỏi đáp nội dung theo ngữ cảnh.
- 🛠️ **Bộ Công Cụ Tiện Ích Thư Viện**:
  - Nhận diện sách trùng lặp theo checksum SHA-256.
  - Tự động chuẩn hóa, sửa tên tác giả hàng loạt.
  - Tự động gán hashtag, phân loại theo cấu trúc thư mục.
  - Chuyển đổi định dạng sách qua Calibre (tự động nhận diện nếu máy đã cài Calibre).
  - Xuất danh mục sách ra file CSV; sao lưu và khôi phục an toàn.
- 📦 **Phân Phối Tiện Lợi**:
  - **Portable (.exe)**: File chạy độc lập, không cần cài đặt hay cài thêm Node.js/Python.
  - **Setup (.exe)**: Bộ cài đặt hoàn chỉnh với shortcut Desktop và Start Menu.

---

## 🏗️ Kiến Trúc Hệ Thống

Ứng dụng được thiết kế theo mô hình tách biệt tiến trình chặt chẽ để đảm bảo an toàn và độ ổn định cao:

```
SI-Book/
├── frontend/
│   ├── electron/                 # Backend Electron (Main Process & Utilities)
│   │   ├── main.cjs              # Điểm khởi chạy Electron, quản lý Window & Protocol
│   │   ├── preload.cjs           # Context Bridge an toàn (chặn IPC tùy ý)
│   │   ├── library.cjs           # Core SQLite, FTS5, quét thư mục, quản lý file & metadata
│   │   ├── service.cjs           # API Layer qua IPC Whitelist
│   │   ├── extractor.cjs         # Worker trích xuất nội dung (PDF/EPUB/Office/...)
│   │   ├── formats.cjs           # Bộ giải mã các định dạng MOBI, FB2, RTF, HTML, TXT
│   │   └── tools.cjs             # Các tính năng bảo trì, Calibre, meta search & AI
│   └── src/                      # Frontend UI (Renderer Process - React 19 + Vite)
│       ├── App.jsx               # Giao diện chính, điều hướng, quản lý state
│       ├── Reader.jsx            # Trình đọc sách đa năng (PDF, EPUB, Text, Canvas)
│       ├── Tools.jsx             # Giao diện hộp công cụ, cài đặt & thông tin About
│       ├── AIModal.jsx           # Cửa sổ tương tác với trợ lý AI
│       └── index.css             # Hệ thống thiết kế giao diện tinh gọn, hỗ trợ Dark Mode
├── release/                      # File đóng gói exe (Portable & Setup)
├── Start-SIBook.bat              # Script khởi động nhanh
└── build.bat                     # Script build ứng dụng tự động
```

### An toàn & Hiệu năng:
1. **Process Isolation**: Bộ trích xuất `extractor.cjs` chạy trong tiến trình con riêng biệt với giới hạn bộ nhớ/thời gian. File lỗi hoặc cấu trúc phức tạp không làm sập giao diện chính.
2. **CSP & Whitelist IPC**: Renderer hoàn toàn không có quyền can thiệp filesystem tùy ý, ngăn chặn tấn công injection.
3. **SQLite WAL (Write-Ahead Logging)**: Đảm bảo toàn vẹn dữ liệu ngay cả khi ứng dụng bị tắt đột ngột.

---

## ⌨️ Phím Tắt Tiện Dụng

| Phím tắt | Chức năng |
|----------|-----------|
| <kbd>Ctrl</kbd> + <kbd>K</kbd> / <kbd>Ctrl</kbd> + <kbd>F</kbd> | Mở thanh tìm kiếm nhanh / tìm kiếm toàn văn FTS5 |
| <kbd>Ctrl</kbd> + <kbd>N</kbd> | Thêm sách mới hoặc liên kết thư mục sách |
| <kbd>Bấm đúp</kbd> | Mở sách vào chế độ đọc ngay |
| <kbd>Ctrl</kbd> / <kbd>Shift</kbd> + Click | Chọn nhiều sách để xử lý hàng loạt |
| <kbd>Esc</kbd> | Đóng trình đọc, thoát hộp thoại hoặc bỏ chọn sách |

---

## 🚀 Hướng Dẫn Phát Triển & Build

### 1. Yêu Cầu Môi Trường
- **Node.js** >= 18
- **npm** >= 9
- Hệ điều hành: Windows 10/11 x64

### 2. Cài Đặt Dependencies
```bash
cd frontend
npm install
```

### 3. Chạy Ở Chế Độ Phát Triển (Dev)
```bash
# Khởi chạy Vite Dev Server + Electron Desktop App
npm run dev
# Ở terminal khác:
npm run desktop
```

### 4. Kiểm Thử Backend
```bash
npm run test:backend
```

### 5. Đóng Gói Ứng Dụng (Build Exe)
```bash
# Tạo thư mục đóng gói kiểm tra nhanh
npm run pack

# Đóng gói hoàn chỉnh (SI-Book-1.0.1-Portable.exe & SI-Book-1.0.1-Setup.exe)
npm run dist
```
Các file sản phẩm hoàn thiện sẽ xuất hiện tại thư mục `release/`.

---

## 👤 Tác Giả & Bản Quyền

- **Tác giả**: Phan Đức
- **Phiên bản**: 1.0.1
- **Bản quyền**: © 2026 Phan Đức. Mọi quyền được bảo lưu.
