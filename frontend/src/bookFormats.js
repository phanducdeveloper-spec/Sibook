// Danh sach dinh dang ebook/tai lieu MewBook ho tro (dung chung cho UI).
export const IMPORT_EXT = [
  'pdf', 'epub', 'mobi', 'azw', 'azw3', 'prc', 'pdb', 'fb2', 'djvu', 'cbz', 'cbr',
  'txt', 'rtf', 'md', 'html', 'htm', 'docx', 'odt', 'pptx',
  'png', 'jpg', 'jpeg', 'webp',
];
export const ACCEPT = IMPORT_EXT.map((e) => '.' + e).join(',');
// Thu tu hien thi trong bo loc
export const ALL_FORMATS = [
  'PDF', 'EPUB', 'MOBI', 'AZW3', 'AZW', 'PRC', 'PDB', 'FB2', 'DJVU', 'CBZ', 'CBR',
  'TXT', 'RTF', 'MD', 'HTML', 'DOCX', 'ODT', 'PPTX', 'Hình ảnh',
];
// Doc o che do van ban trong MewBook
export const TEXT_FORMATS = [
  'TXT', 'EPUB', 'DOCX', 'PPTX', 'MOBI', 'AZW', 'AZW3', 'PRC', 'PDB', 'FB2',
  'ODT', 'RTF', 'HTML', 'HTM', 'MD',
];
export const COMIC_FORMATS = ['CBZ'];
export const EXTERNAL_FORMATS = ['DJVU', 'CBR'];
const COLORS = {
  PDF: '#ff2448', EPUB: '#08bd68', TXT: '#187aff', 'Hình ảnh': '#863cff',
  MOBI: '#ff8a00', AZW: '#e8710a', AZW3: '#f59e0b', PRC: '#d97706', PDB: '#b45309',
  FB2: '#0ea5a4', DJVU: '#7c3aed', CBZ: '#ec4899', CBR: '#db2777',
  RTF: '#2563eb', MD: '#334155', HTML: '#e44d26', HTM: '#e44d26',
  DOCX: '#2b579a', ODT: '#0369a1', PPTX: '#d24726',
};
export const formatColor = (f) => COLORS[f] || '#187aff';
