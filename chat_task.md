TIẾP TỤC GIAI ĐỌAN 2.

# THIẾT KẾ ỨNG DỤNG DESKTOP MỚI HOÀN TOÀN DỰA TRÊN ẢNH THAM CHIẾU

Bạn được cung cấp **01 ảnh tham chiếu giao diện ứng dụng**.

Nhiệm vụ của bạn là **thiết kế và xây dựng một ứng dụng desktop hoàn toàn mới từ đầu**, lấy ảnh tham chiếu làm **SOURCE OF TRUTH duy nhất cho art direction, bố cục, hierarchy và trải nghiệm thị giác**.

Đây là **một ứng dụng mới độc lập**.


---

# 1. SOURCE OF TRUTH

Ảnh tham chiếu quyết định:

- visual language
- color palette
- typography
- spacing
- proportions
- hierarchy
- panel structure
- card system
- icon style
- lighting
- depth
- shadows
- gradients
- materials
- interaction language
- overall atmosphere

Mục tiêu:

> Khi mở ứng dụng, người dùng phải lập tức cảm nhận được cùng một ngôn ngữ thiết kế với ảnh tham chiếu.

Không biến ảnh tham chiếu thành background.

Không nhúng screenshot.

Phải **rebuild toàn bộ giao diện bằng UI thật**.

---

# 2. PHÂN TÍCH ẢNH TRƯỚC KHI CODE

Trước khi viết code, hãy phân tích ảnh thành một **desktop application design system**.

### Visual

Phân tích:

- màu nền
- màu surface
- màu accent
- typography
- iconography
- border
- radius
- shadow
- glow
- gradient
- texture
- contrast
- lighting
- depth

### Layout

Xác định:

- App Header / Title Bar
- Sidebar
- Navigation
- Toolbar
- Search
- Main Workspace
- Secondary Panel
- Inspector / Details Panel
- Status Bar
- Modal
- Context Menu
- Notification
- Empty State

### Composition

Phân tích:

- focal point
- tỷ lệ sidebar / workspace
- tỷ lệ panel
- visual hierarchy
- spacing
- card density
- foreground / background
- chiều sâu

**Không bắt đầu coding trước khi hoàn tất phân tích.**

---

# 3. ĐÂY LÀ DESKTOP APP, KHÔNG PHẢI WEBSITE

Không xây theo kiểu:

- landing page
- hero website
- SaaS dashboard template
- generic website
- Bootstrap admin template

Ứng dụng phải có cảm giác như:

> **Một phần mềm desktop thương mại hoàn chỉnh.**

Ưu tiên:

- workspace
- navigation
- data
- tools
- panels
- commands
- shortcuts
- trạng thái hệ thống
- interaction

---

# 4. CẤU TRÚC ỨNG DỤNG

Dựa trên ảnh tham chiếu để xây dựng cấu trúc tương ứng.

Có thể gồm:

```text
App Window
│
├── Custom Title Bar
│
├── Sidebar
│   ├── Home
│   ├── Library
│   ├── Collections
│   ├── Categories
│   ├── Favorites
│   └── Settings
│
├── Top Toolbar
│   ├── Search
│   ├── Filter
│   ├── Sort
│   ├── View Mode
│   └── Main Action
│
├── Main Workspace
│   ├── Sections
│   ├── Cards
│   ├── Grid
│   ├── List
│   └── Content
│
├── Details / Inspector Panel
│
└── Bottom Status Bar
```

Không bắt buộc giữ nguyên tên nhưng phải giữ **logic và visual rhythm của ảnh tham chiếu**.

---

# 5. APP WINDOW

Ứng dụng phải có cảm giác desktop thực sự.

Hỗ trợ:

- resize
- maximize
- minimize
- close
- drag window
- persistent window size
- persistent sidebar width
- persistent panel state

Nếu phù hợp, sử dụng:

- custom title bar
- frameless window
- native desktop controls

Không làm giao diện giống web page chạy trong browser.

---

# 6. SIDEBAR

Sidebar phải là thành phần điều hướng chính.

Có:

- icon
- label
- counter
- active state
- hover state
- collapsed state
- expandable groups

Cho phép:

```text
Expanded
↓
Collapsed
↓
Icon-only
```

Animation chuyển trạng thái phải mượt.

---

# 7. MAIN WORKSPACE

Workspace phải là khu vực tập trung chính.

Có thể chứa:

- grid
- cards
- lists
- folders
- documents
- media
- projects
- categories
- timeline
- charts
- content preview

Tùy theo nội dung ứng dụng.

UI phải giống **phần mềm thật đang hoạt động**, không phải mockup tĩnh.

---

# 8. DETAILS / INSPECTOR PANEL

Nếu ảnh tham chiếu có panel chi tiết:

phải tái tạo thành panel thật.

Có:

- thumbnail
- title
- metadata
- actions
- tags
- statistics
- description
- AI information
- file information
- context actions

Panel có thể:

- mở / đóng
- resize
- pin
- collapse

---

# 9. TOOLBAR

Toolbar phải ưu tiên thao tác thực tế.

Có:

- Search
- Filter
- Sort
- View
- Refresh
- Import
- Export
- Create
- AI
- Settings

Không đặt quá nhiều button.

Những thao tác phụ chuyển vào:

```text
More
⋮
Context menu
```

---

# 10. SEARCH

Search phải là thành phần quan trọng của app.

Hỗ trợ:

- search realtime
- keyword
- title
- author
- tag
- category
- file type

Có thể thêm:

```text
Ctrl + K
```

để mở command/search palette.

Search palette có:

- commands
- recent files
- navigation
- actions
- tools

---

# 11. INTERACTION

Ứng dụng phải có cảm giác sống.

Triển khai:

- hover
- active
- selected
- pressed
- focus
- drag
- drop
- context menu
- tooltip
- modal
- toast
- loading
- skeleton
- empty state
- error state
- success state

Animation:

- subtle
- responsive
- fast
- premium

Không dùng animation quá mạnh hoặc gây khó chịu.

---

# 12. MICRO-INTERACTIONS

Tập trung vào:

- hover elevation
- icon animation
- card transition
- panel slide
- sidebar collapse
- progress animation
- loading shimmer
- notification
- success feedback

Mọi thao tác phải có feedback rõ ràng.

---

# 13. KEYBOARD SHORTCUT

Ứng dụng desktop phải hỗ trợ shortcut cơ bản:

```text
Ctrl + K  → Search
Ctrl + F  → Find
Ctrl + N  → New
Ctrl + O  → Open
Ctrl + S  → Save
Ctrl + Z  → Undo
Ctrl + Shift + Z → Redo
Esc       → Close modal/panel
```

Có thể mở:

**Command Palette**

bằng:

```text
Ctrl + K
```

---

# 14. RESPONSIVE DESKTOP

Không tập trung vào mobile website.

Ưu tiên:

### 1920×1080

### 1600×900

### 1440×900

### 1280×800

Nếu chạy trên kích thước nhỏ:

- sidebar tự thu gọn
- details panel tự collapse
- toolbar giảm density
- card grid tự thay đổi

---

# 15. DESIGN SYSTEM

Xây dựng design system thống nhất.

### Typography

- Display
- Heading
- Body
- Label
- Caption

### Color

- Background
- Surface
- Elevated Surface
- Primary
- Secondary
- Accent
- Success
- Warning
- Error
- Text
- Muted

### Components

- Button
- Icon Button
- Card
- Input
- Search
- Badge
- Tabs
- Dropdown
- Menu
- Tooltip
- Modal
- Drawer
- Toast
- Table
- List
- Grid
- Panel

### Spacing

Thiết lập spacing scale thống nhất.

---

# 16. HÌNH ẢNH VÀ ILLUSTRATION

Hình ảnh phải tuân thủ cùng một visual language.

Không sử dụng hình ảnh ngẫu nhiên.

Ưu tiên:

- cinematic
- atmospheric
- detailed
- premium
- realistic
- stylized 3D
- coherent lighting

Nếu sử dụng mascot/character:

> Chỉ sử dụng như một phần nhận diện thương hiệu, không để nhân vật lấn át UI.

---

# 17. AI FEATURES

Nếu phù hợp với loại ứng dụng, tích hợp AI một cách tự nhiên:

- AI Search
- AI Summary
- AI Categorization
- AI Tagging
- AI Recommendations
- AI Assistant
- Smart Organization
- Natural Language Search

AI phải là **một lớp chức năng của app**, không biến toàn bộ giao diện thành chatbot.

---

# 18. LOCAL-FIRST

Nếu ứng dụng xử lý file hoặc thư viện local:

Ưu tiên:

```text
Local files
↓
Local database/index
↓
Search
↓
AI processing
↓
UI
```

Có thể hỗ trợ:

- offline
- local storage
- file watching
- automatic indexing
- metadata extraction
- caching

---

# 19. REAL PRODUCT

Không tạo mockup.

Ứng dụng phải hoạt động thật:

- navigation thật
- search thật
- filter thật
- sorting thật
- selection thật
- context menu thật
- panel thật
- data state thật
- loading state thật
- error handling thật

Dữ liệu demo chỉ được sử dụng để mô phỏng ban đầu.

---

# 20. TECH STACK

Có thể sử dụng:

```text
React
+
TypeScript
+
Tauri / Electron
+
CSS / Tailwind / custom CSS
```

Ưu tiên **Tauri** nếu cần:

- nhẹ
- startup nhanh
- native desktop
- memory thấp

Kiến trúc phải được tổ chức thành component rõ ràng.

---

# 21. PERFORMANCE

Ứng dụng phải:

- startup nhanh
- animation mượt
- không lag khi nhiều dữ liệu
- virtualization cho list/grid lớn
- lazy loading
- debounce search
- caching
- background indexing

Không render toàn bộ hàng nghìn item cùng lúc nếu không cần.

---

# 22. ACCESSIBILITY

Hỗ trợ:

- keyboard navigation
- focus state
- readable contrast
- tooltip
- ARIA khi cần
- reduced motion

---

# 23. TỰ KIỂM TRA SAU KHI BUILD

Sau khi hoàn thành:

### Bước 1

Build ứng dụng.

### Bước 2

Chạy ứng dụng ở kích thước:

```text
1920×1080
1600×900
1440×900
1280×800
```

### Bước 3

Chụp screenshot.

### Bước 4

So sánh với ảnh tham chiếu.

Kiểm tra:

- layout
- proportions
- spacing
- colors
- typography
- cards
- sidebar
- panels
- hierarchy
- imagery
- visual density

### Bước 5

Tự sửa tất cả điểm lệch.

Lặp lại cho đến khi đạt độ tương đồng thị giác cao.

---

# 24. ART DIRECTION

Không được tự ý chuyển sang:

- SaaS dashboard
- admin panel
- corporate UI
- Bootstrap
- generic AI UI
- template UI

Mục tiêu:

> **PREMIUM + CINEMATIC + IMMERSIVE + FUTURISTIC + DISTINCTIVE**

Nhưng vẫn phải:

> **CLEAN + USABLE + FAST + PROFESSIONAL**

---

# 25. NGUYÊN TẮC RA QUYẾT ĐỊNH

Khi phải chọn:

**Visual quality vs feature density**

→ ưu tiên visual quality.

**Clean layout vs nhiều thành phần**

→ ưu tiên clean layout.

**Subtle animation vs flashy animation**

→ ưu tiên subtle animation.

**Native app feeling vs website feeling**

→ luôn ưu tiên native app feeling.

---

# 26. KẾT QUẢ CUỐI CÙNG

Tạo ra:

> **Một ứng dụng desktop mới hoàn toàn, xây dựng từ số 0, có chức năng thật, nhưng giữ được ngôn ngữ hình ảnh, composition, hierarchy, màu sắc và cảm giác cao cấp của ảnh tham chiếu.**

Ứng dụng phải:

- đẹp
- hiện đại
- nhanh
- responsive trong desktop
- có chiều sâu
- có animation
- có interaction
- có keyboard shortcut
- có trạng thái thật
- có cảm giác như một sản phẩm thương mại hoàn chỉnh

### TUYỆT ĐỐI KHÔNG

- bê nguyên code từ app khác
- nhúng screenshot
- dùng screenshot làm background
- biến ảnh thành một lớp UI giả
- tự ý đổi art direction
- biến app thành website
- biến app thành generic dashboard

> **ẢNH THAM CHIẾU = SOURCE OF TRUTH.**

**Bắt đầu bằng việc phân tích ảnh → xây design system → dựng app shell → triển khai workspace → interaction → hoàn thiện → screenshot → so sánh → chỉnh lại.**