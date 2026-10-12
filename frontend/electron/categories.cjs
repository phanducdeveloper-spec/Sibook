'use strict';
// Chu de tu dong phan loai: [hashtag, tu khoa (khong dau, chu thuong)]
const CATEGORIES = [
  ['điện-nhẹ', ['dien nhe', 'camera', 'cctv', 'bao chay', 'fire alarm', 'pccc', 'access control', 'kiem soat ra vao', 'am thanh', 'public address', 'intercom', 'tong dai', 'voip', 'mang lan', 'cap quang', 'fiber', 'wifi', 'bms', 'smarthome', 'nha thong minh', 'an ninh', 'cham cong', 'rack', 'nvr', 'camera ip']],
  ['điện-công-nghiệp', ['tu dien', 'dong co', 'bien tan', 'plc', 'scada', 'tram bien ap', 'may bien ap', 'chieu sang', 'chong set', 'noi dat', 'dien cong nghiep', 'cung cap dien', 'he thong dien', 'mach dien', 'electrical', 'power system', 'ups', 'may phat', 'relay', 'role bao ve', 'tu dong hoa', 'automation', 'dien tu']],
  ['tiêu-chuẩn-quy-chuẩn', ['tcvn', 'qcvn', 'iec', 'ieee', 'nfpa', 'tieu chuan', 'quy chuan', 'standard', 'iso', 'bs en', 'tcxdvn', 'thong tu', 'nghi dinh']],
  ['xây-dựng-kiến-trúc', ['xay dung', 'ket cau', 'be tong', 'kien truc', 'autocad', 'revit', 'bim', 'thi cong', 'du toan', 'nen mong', 'mep', 'hvac', 'cap thoat nuoc', 'dieu hoa', 'ban ve', 'cong trinh', 'construction', 'architecture', 'noi that']],
  ['cntt-lập-trình', ['lap trinh', 'python', 'java', 'javascript', 'programming', 'software', 'phan mem', 'database', 'co so du lieu', 'sql', 'linux', 'machine learning', 'tri tue nhan tao', 'algorithm', 'thuat toan', 'cloud', 'devops', 'bao mat', 'security', 'hacker', 'computer', 'may tinh', 'excel', 'react', 'web']],
  ['kinh-tế-kinh-doanh', ['kinh doanh', 'marketing', 'ban hang', 'quan tri', 'tai chinh', 'dau tu', 'chung khoan', 'ke toan', 'startup', 'khoi nghiep', 'business', 'sales', 'management', 'economics', 'kinh te', 'lanh dao', 'doanh nghiep', 'thuong hieu', 'tien te']],
  ['kỹ-năng-tâm-lý', ['ky nang', 'tam ly', 'giao tiep', 'thoi quen', 'tu duy', 'hanh phuc', 'self help', 'habit', 'mindset', 'dac nhan tam', 'dong luc', 'thanh cong', 'phat trien ban than', 'cam xuc', 'chua lanh', 'psychology']],
  ['văn-học', ['tieu thuyet', 'truyen ngan', 'tap tho', 'van hoc', 'novel', 'tuy but', 'hoi ky', 'ky su', 'truyen dai', 'tac pham', 'fiction', 'kiem hiep', 'ngon tinh', 'trinh tham']],
  ['lịch-sử-chính-trị', ['lich su', 'chien tranh', 'chinh tri', 'history', 'de che', 'trieu dai', 'cach mang', 'the chien', 'vuong trieu', 'nha nuoc', 'quoc gia']],
  ['triết-học-tôn-giáo', ['triet', 'phat giao', 'phat phap', 'thien tong', 'dao giao', 'kinh thanh', 'ton giao', 'philosophy', 'khong tu', 'lao tu', 'tam linh', 'kinh phat']],
  ['khoa-học', ['vat ly', 'hoa hoc', 'sinh hoc', 'toan hoc', 'vu tru', 'khoa hoc', 'science', 'physics', 'mathematics', 'tien hoa', 'thien van', 'luong tu']],
  ['giáo-dục-ngôn-ngữ', ['tieng anh', 'english', 'ielts', 'toeic', 'ngu phap', 'tu vung', 'giao trinh', 'hoc tap', 'grammar', 'vocabulary', 'tieng nhat', 'tieng trung', 'tieng han', 'giao duc', 'tu dien', 'luyen thi']],
  ['sức-khỏe-đời-sống', ['suc khoe', 'dinh duong', 'y hoc', 'benh', 'an uong', 'nau an', 'yoga', 'health', 'nuoi day con', 'gia dinh', 'lam dep', 'the duc', 'thuoc', 'mon an']],
  ['nghệ-thuật-văn-hóa', ['am nhac', 'hoi hoa', 'nhiep anh', 'thiet ke do hoa', 'nghe thuat', 'dien anh', 'art', 'design', 'van hoa', 'my thuat', 'photoshop', 'du lich']],
  ['thiếu-nhi-truyện-tranh', ['truyen tranh', 'manga', 'comic', 'thieu nhi', 'co tich', 'doremon', 'conan', 'truyen thieu nhi']],
];
module.exports = { CATEGORIES };
