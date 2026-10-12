// Static demo library data for MewBook (frontend-only)
const u = (id) => `https://images.unsplash.com/photo-${id}?crop=entropy&cs=srgb&fm=jpg&q=80&w=520`;

export const COVERS = {
  bldgDark: u('1619218070141-bcfeb8b93074'),
  bldgBrown: u('1615406020658-6c4b805f1f30'),
  bldgGray: u('1488972685288-c3fd157d7c7a'),
  bldgBlue: u('1614595737476-42487331b8a1'),
  cam1: u('1618482914248-29272d021005'),
  cam2: u('1589935447067-5531094415d1'),
  cam3: u('1528312635006-8ea0bc49ec63'),
  city1: u('1515868769-ad822a0c67e9'),
  city2: u('1664353655151-9d94a9170eb0'),
  city3: u('1611323340350-bdcc0e6cfae5'),
  server1: u('1762163516269-3c143e04175c'),
  server2: u('1775519520494-d12d91797a01'),
  router1: u('1606904825846-647eb07f5be2'),
  router2: u('1516044734145-07ca8eef8731'),
  router3: u('1691435828932-911a7801adfb'),
  constr1: u('1716037991590-c975184b37df'),
  constr2: u('1768677903496-becc4be07258'),
  constr3: u('1674062333283-41a1b59f0408'),
};

export const FORMAT_META = {
  PDF: { color: '#ef4444', bg: '#fdecec' },
  EPUB: { color: '#16a34a', bg: '#e8f6ed' },
  DOCX: { color: '#2563eb', bg: '#e9f1ff' },
  PPTX: { color: '#f97316', bg: '#fff1e6' },
  MOBI: { color: '#0ea5a5', bg: '#e4f6f6' },
  'Hình ảnh': { color: '#7c5cff', bg: '#f1edff' },
};

export const BOOKS = [
  { id: 'b1', title: 'Thiết kế hệ thống điện nhẹ', author: 'Nguyễn Văn Hải', format: 'PDF', cover: COVERS.bldgDark, progress: 66, favorite: true, section: 'today', size: '12,4 MB', bytes: '12.987.392 bytes', pages: 248, publisher: 'NXB Xây Dựng', year: 2021, isbn: '978-604-82-5531-7', dateAdded: '25/09/2026 14:32', filePath: 'D:\\Sách\\Kỹ thuật\\he-thong-dien-nhe.pdf', rating: 4.6, reviews: 18, hashtags: ['điện-nhẹ', 'camera', 'thiết-kế', 'thi công'], notes: 5, description: 'Sổ tay thực hành cho người làm điện nhẹ: từ khảo sát, chọn thiết bị đến bản vẽ và nghiệm thu.', aiSummary: 'Sổ tay thực hành cho người làm điện nhẹ: từ khảo sát, chọn thiết bị đến bản vẽ và nghiệm thu. Phù hợp kỹ sư mới vào nghề và những người cần một quy trình rõ ràng, dễ áp dụng trong thực tế. Nội dung bao gồm hệ thống mạng, camera, âm thanh, kiểm soát ra vào, cáp quang và các tiêu chuẩn thi công.' },
  { id: 'b2', title: 'Camera giám sát cho nhà và công trình', author: 'Lê Quang Minh', format: 'PDF', cover: COVERS.cam2, progress: 12, favorite: false, section: 'today', size: '8,1 MB', bytes: '8.493.120 bytes', pages: 164, publisher: 'NXB Khoa Học', year: 2022, isbn: '978-604-67-1180-2', dateAdded: '24/09/2026 09:10', filePath: 'D:\\Sách\\Kỹ thuật\\camera-giam-sat.pdf', rating: 4.3, reviews: 11, hashtags: ['camera', 'điện-nhẹ', 'an-ninh'], notes: 2, description: 'Hướng dẫn chọn, lắp đặt và cấu hình hệ thống camera IP cho hộ gia đình và công trình.', aiSummary: 'Tài liệu tập trung vào thực hành lắp đặt camera IP: chọn độ phân giải, vị trí lắp, cấu hình NVR và lưu trữ.' },
  { id: 'b3', title: 'Cáp quang ngoài hiện trường', author: 'Phạm Thu Hà', format: 'PDF', cover: COVERS.city2, progress: 0, favorite: false, section: 'today', size: '15,7 MB', bytes: '16.462.336 bytes', pages: 312, publisher: 'NXB Bưu Điện', year: 2020, isbn: '978-604-11-2043-9', dateAdded: '24/09/2026 08:02', filePath: 'D:\\Sách\\Mạng\\cap-quang.pdf', rating: 4.8, reviews: 26, hashtags: ['mạng', 'cáp-quang', 'điện-nhẹ'], notes: 0, description: 'Kỹ thuật hàn nối, đo kiểm và bảo trì cáp quang trong môi trường thực tế.', aiSummary: 'Cẩm nang hiện trường cho kỹ thuật viên cáp quang: hàn nối, đo OTDR, xử lý sự cố suy hao.' },
  { id: 'b4', title: 'Âm thanh công cộng', author: 'Trần Công Lý', format: 'PDF', cover: COVERS.server2, progress: 45, favorite: true, section: 'today', size: '9,9 MB', bytes: '10.380.800 bytes', pages: 196, publisher: 'NXB Âm Nhạc', year: 2023, isbn: '978-604-55-7781-0', dateAdded: '23/09/2026 16:40', filePath: 'D:\\Sách\\Âm thanh\\am-thanh-cong-cong.pdf', rating: 4.1, reviews: 7, hashtags: ['âm-thanh', 'điện-nhẹ', 'pa'], notes: 1, description: 'Thiết kế hệ thống âm thanh thông báo PA cho tòa nhà, trường học, nhà máy.', aiSummary: 'Hướng dẫn tính toán công suất, phân vùng loa và đi dây cho hệ thống âm thanh công cộng.' },
  { id: 'b5', title: 'PCCC trong tòa nhà cao tầng', author: 'Bùi Tấn', format: 'PDF', cover: COVERS.city3, progress: 0, favorite: false, section: 'today', accent: '#dc2626', size: '18,2 MB', bytes: '19.084.288 bytes', pages: 356, publisher: 'NXB Xây Dựng', year: 2021, isbn: '978-604-82-6120-2', dateAdded: '23/09/2026 11:15', filePath: 'D:\\Sách\\PCCC\\pccc-cao-tang.pdf', rating: 4.9, reviews: 34, hashtags: ['pccc', 'an-toàn', 'điện-nhẹ'], notes: 3, description: 'Tiêu chuẩn và giải pháp phòng cháy chữa cháy cho nhà cao tầng.', aiSummary: 'Tổng hợp quy chuẩn PCCC hiện hành, hệ thống báo cháy, chữa cháy tự động và thoát hiểm cho nhà cao tầng.' },

  { id: 'b6', title: 'Kiểm soát ra vào', author: 'Lê Quang Minh', format: 'PDF', cover: COVERS.cam3, progress: 20, favorite: false, section: 'week', size: '6,4 MB', bytes: '6.710.886 bytes', pages: 132, publisher: 'NXB Khoa Học', year: 2022, isbn: '978-604-67-2010-1', dateAdded: '21/09/2026 13:00', filePath: 'D:\\Sách\\Kỹ thuật\\kiem-soat-ra-vao.pdf', rating: 4.2, reviews: 9, hashtags: ['điện-nhẹ', 'an-ninh', 'access'], notes: 0, description: 'Hệ thống access control: thẻ từ, vân tay, khuôn mặt và tích hợp.', aiSummary: 'Giới thiệu các công nghệ kiểm soát ra vào và cách tích hợp với hệ thống an ninh tòa nhà.' },
  { id: 'b7', title: 'Bản vẽ kỹ thuật thực hành', author: 'Bùi Tấn', format: 'PDF', cover: COVERS.bldgGray, progress: 90, favorite: false, section: 'week', size: '11,0 MB', bytes: '11.534.336 bytes', pages: 220, publisher: 'NXB Xây Dựng', year: 2019, isbn: '978-604-82-4410-6', dateAdded: '20/09/2026 10:22', filePath: 'D:\\Sách\\Kỹ thuật\\ban-ve-ky-thuat.pdf', rating: 4.5, reviews: 15, hashtags: ['bản-vẽ', 'cad', 'thiết-kế'], notes: 4, description: 'Đọc hiểu và lập bản vẽ kỹ thuật theo tiêu chuẩn.', aiSummary: 'Giáo trình bản vẽ kỹ thuật: ký hiệu, tỷ lệ, hình chiếu và quy ước trình bày.' },
  { id: 'b8', title: 'Tổng đài nội bộ IP', author: 'Phạm Thu Hà', format: 'PDF', cover: COVERS.router3, progress: 0, favorite: false, section: 'week', size: '7,8 MB', bytes: '8.178.892 bytes', pages: 158, publisher: 'NXB Bưu Điện', year: 2021, isbn: '978-604-11-3051-3', dateAdded: '19/09/2026 15:48', filePath: 'D:\\Sách\\Mạng\\tong-dai-ip.pdf', rating: 4.0, reviews: 6, hashtags: ['mạng', 'voip', 'điện-nhẹ'], notes: 0, description: 'Triển khai tổng đài VoIP cho doanh nghiệp vừa và nhỏ.', aiSummary: 'Hướng dẫn cài đặt và cấu hình tổng đài IP, định tuyến cuộc gọi và tích hợp SIP trunk.' },
  { id: 'b9', title: 'Lập trình Python cho người mới', author: 'Bùi Tấn', format: 'PDF', cover: COVERS.bldgBlue, progress: 34, favorite: true, section: 'week', accent: '#2563eb', size: '5,2 MB', bytes: '5.452.595 bytes', pages: 410, publisher: 'NXB Thông Tin', year: 2023, isbn: '978-604-80-7712-5', dateAdded: '18/09/2026 09:30', filePath: 'D:\\Sách\\Lập trình\\python-co-ban.pdf', rating: 4.7, reviews: 52, hashtags: ['python', 'lập-trình', 'cơ-bản'], notes: 8, description: 'Nhập môn Python từ con số 0 với ví dụ thực tế.', aiSummary: 'Giáo trình Python nền tảng: biến, vòng lặp, hàm, cấu trúc dữ liệu và dự án nhỏ.' },
  { id: 'b10', title: 'Mạng không dây doanh nghiệp', author: 'Nguyễn Văn Hải', format: 'PDF', cover: COVERS.router1, progress: 0, favorite: false, section: 'week', size: '10,3 MB', bytes: '10.800.332 bytes', pages: 268, publisher: 'NXB Bưu Điện', year: 2022, isbn: '978-604-11-2890-9', dateAdded: '17/09/2026 14:05', filePath: 'D:\\Sách\\Mạng\\wifi-doanh-nghiep.pdf', rating: 4.4, reviews: 13, hashtags: ['mạng', 'wifi', 'điện-nhẹ'], notes: 1, description: 'Thiết kế phủ sóng Wi-Fi cho văn phòng và nhà xưởng.', aiSummary: 'Phân tích khảo sát site survey, chọn AP, roaming và bảo mật cho mạng Wi-Fi doanh nghiệp.' },

  { id: 'b11', title: 'Chấm công và kiểm soát cửa', author: 'Nguyễn Văn Hải', format: 'PDF', cover: COVERS.bldgBrown, progress: 10, favorite: false, section: 'month', size: '6,9 MB', bytes: '7.235.174 bytes', pages: 142, publisher: 'NXB Lao Động', year: 2020, isbn: '978-604-59-4120-7', dateAdded: '12/09/2026 08:40', filePath: 'D:\\Sách\\Kỹ thuật\\cham-cong.pdf', rating: 3.9, reviews: 5, hashtags: ['điện-nhẹ', 'access', 'hr'], notes: 0, description: 'Giải pháp chấm công và kiểm soát cửa tích hợp.', aiSummary: 'Mô tả các giải pháp chấm công bằng thẻ và sinh trắc học, tích hợp phần mềm nhân sự.' },
  { id: 'b12', title: 'Tủ rack và đi dây gọn gàng', author: 'Lê Quang Minh', format: 'PDF', cover: COVERS.server1, progress: 56, favorite: false, section: 'month', size: '8,8 MB', bytes: '9.227.468 bytes', pages: 176, publisher: 'NXB Khoa Học', year: 2021, isbn: '978-604-67-2455-0', dateAdded: '11/09/2026 17:12', filePath: 'D:\\Sách\\Mạng\\tu-rack.pdf', rating: 4.6, reviews: 19, hashtags: ['mạng', 'rack', 'cáp'], notes: 2, description: 'Chuẩn hóa tủ rack, quản lý cáp và nhãn.', aiSummary: 'Hướng dẫn bố trí tủ rack, quản lý cáp mạng, đánh nhãn và làm mát thiết bị.' },
  { id: 'b13', title: 'Nghệ thuật ghi chép', author: 'Phạm Thu Hà', format: 'EPUB', cover: COVERS.constr1, progress: 78, favorite: false, section: 'month', accent: '#16a34a', size: '2,1 MB', bytes: '2.202.009 bytes', pages: 96, publisher: 'NXB Trẻ', year: 2023, isbn: '978-604-1-19920-4', dateAdded: '10/09/2026 20:00', filePath: 'D:\\Sách\\Kỹ năng\\ghi-chep.epub', rating: 4.8, reviews: 41, hashtags: ['kỹ-năng', 'ghi-chép', 'học-tập'], notes: 6, description: 'Phương pháp ghi chép hiệu quả cho công việc và học tập.', aiSummary: 'Giới thiệu các phương pháp ghi chép như Cornell, Mindmap và cách hệ thống hóa kiến thức.' },
  { id: 'b14', title: 'Chống sét cho thiết bị mạng', author: 'Bùi Tấn', format: 'PDF', cover: COVERS.constr3, progress: 0, favorite: false, section: 'month', size: '9,4 MB', bytes: '9.856.614 bytes', pages: 204, publisher: 'NXB Xây Dựng', year: 2022, isbn: '978-604-82-6701-3', dateAdded: '09/09/2026 11:30', filePath: 'D:\\Sách\\Kỹ thuật\\chong-set.pdf', rating: 4.3, reviews: 10, hashtags: ['điện-nhẹ', 'chống-sét', 'an-toàn'], notes: 0, description: 'Giải pháp chống sét lan truyền cho hệ thống mạng và camera.', aiSummary: 'Tổng hợp giải pháp tiếp địa và chống sét lan truyền bảo vệ thiết bị điện nhẹ.' },
  { id: 'b15', title: 'Sổ tay giám sát thi công', author: 'Trần Công Lý', format: 'PDF', cover: COVERS.constr2, progress: 92, favorite: false, section: 'month', size: '13,6 MB', bytes: '14.260.634 bytes', pages: 286, publisher: 'NXB Xây Dựng', year: 2021, isbn: '978-604-82-5990-2', dateAdded: '08/09/2026 09:00', filePath: 'D:\\Sách\\Kỹ thuật\\giam-sat-thi-cong.pdf', rating: 4.7, reviews: 23, hashtags: ['thi-công', 'giám-sát', 'điện-nhẹ'], notes: 3, description: 'Quy trình giám sát và nghiệm thu công trình điện nhẹ.', aiSummary: 'Cẩm nang giám sát thi công: checklist nghiệm thu, an toàn lao động và quản lý chất lượng.' },
];

export const NAV_ITEMS = [
  { id: 'home', icon: 'Home', label: 'Trang chủ', color: '#2563eb' },
  { id: 'all', icon: 'Files', label: 'Tất cả tài liệu', count: '7.545', color: '#2563eb' },
  { id: 'reading', icon: 'BookOpen', label: 'Sách đang đọc', count: 42, color: '#f97316' },
  { id: 'uncat', icon: 'HelpCircle', label: 'Chưa phân loại', count: 318, color: '#8b5cf6' },
  { id: 'dien-nhe', icon: 'Zap', label: 'Kỹ thuật điện nhẹ', count: 31, color: '#f97316', highlight: true },
  { id: 'projects', icon: 'FolderKanban', label: 'Hồ sơ dự án', count: 9, color: '#0ea5a5' },
  { id: 'weekend', icon: 'CalendarDays', label: 'Đọc cuối tuần', count: 4, color: '#ec4899' },
  { id: 'recent', icon: 'Clock', label: 'Gần đây', color: '#64748b' },
];

export const AUTHORS = [
  { name: 'Nguyễn Văn Hải', count: 14, color: '#2563eb' },
  { name: 'Phạm Thu Hà', count: 7, color: '#ec4899' },
  { name: 'Lê Quang Minh', count: 6, color: '#16a34a' },
  { name: 'Bùi Tấn', count: 3, color: '#f97316' },
  { name: 'Trần Công Lý', count: 1, color: '#8b5cf6' },
];

export const HASHTAGS = [
  { tag: 'điện-nhẹ', count: 31, icon: 'Zap', color: '#ef4444' },
  { tag: 'camera', count: 12, icon: 'Cctv', color: '#2563eb' },
  { tag: 'mạng', count: 9, icon: 'Network', color: '#0ea5a5' },
  { tag: 'pccc', count: 6, icon: 'Flame', color: '#f97316' },
  { tag: 'âm-thanh', count: 4, icon: 'Volume2', color: '#8b5cf6' },
];

export const FORMATS = [
  { label: 'PDF', count: 31 },
  { label: 'EPUB', count: 12 },
  { label: 'DOCX', count: 5 },
  { label: 'PPTX', count: 3 },
  { label: 'MOBI', count: 2 },
  { label: 'Hình ảnh', count: 6 },
];

export const FOLDERS = [
  { name: 'Sách cá nhân', color: '#f59e0b' },
  { name: 'Tài liệu công việc', color: '#2563eb' },
  { name: 'Học tập', color: '#16a34a' },
  { name: 'Lưu trữ', color: '#8b5cf6' },
];

export const SECTIONS = [
  { id: 'today', title: 'HÔM NAY', subtitle: '5 tài liệu mới thêm' },
  { id: 'week', title: 'TUẦN NÀY', subtitle: 'Nhập từ thư mục theo dõi' },
  { id: 'month', title: 'THÁNG NÀY', subtitle: '24 tài liệu' },
];

export const FILTERS = [
  { id: 'f1', label: 'Định dạng: PDF' },
  { id: 'f2', label: 'Hashtag: #điện-nhẹ' },
  { id: 'f3', label: 'Từ khóa: camera' },
  { id: 'f4', label: 'Kỹ thuật điện nhẹ' },
];
