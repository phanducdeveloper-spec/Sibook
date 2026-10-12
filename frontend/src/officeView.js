// Trinh xem Office nhe tich hop: DOCX (docx-preview), PPTX (pptx-preview).
// Tai lazy de khong lam nang bundle chinh.
export async function renderOffice(container, book) {
  const url = new URL('./__book/' + encodeURIComponent(book.id), document.baseURI).href;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Không đọc được file (' + res.status + ')');
  const buf = await res.arrayBuffer();
  container.innerHTML = '';
  if (book.format === 'DOCX') {
    const { renderAsync } = await import('docx-preview');
    await renderAsync(buf, container, undefined, {
      className: 'docx',
      inWrapper: true,
      breakPages: true,
      ignoreLastRenderedPageBreak: true,
      useBase64URL: true,
      renderHeaders: true,
      renderFooters: true,
      renderFootnotes: true,
    });
  } else {
    const { init } = await import('pptx-preview');
    const width = Math.max(480, Math.min(1100, container.clientWidth - 48));
    const viewer = init(container, { width, height: Math.round((width * 9) / 16), mode: 'list' });
    await viewer.preview(buf);
  }
  if (!container.childElementCount) throw new Error('Trình xem không hiển thị được nội dung');
}
