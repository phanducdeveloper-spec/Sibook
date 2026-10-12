'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Library } = require('./library.cjs');
const { createTools } = require('./tools.cjs');
const temp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'sibook-copies-'));

test('old AppData copies are relinked to the original library and removed', async () => {
  const root = temp(), orig = temp(), out = temp();
  const lib = new Library(root);
  let pick = orig;
  const tools = createTools(lib, { dialog: { showOpenDialog: async () => ({ canceled: false, filePaths: [pick] }) }, shell: {}, app: { getVersion: () => 't' }, getWindow: () => null, changed: () => {} });
  try {
    lib.initialize([]);
    fs.mkdirSync(path.join(orig, 'Sub'));
    const a = path.join(orig, 'Sub', 'Sách A.txt');
    fs.writeFileSync(a, 'Nội dung sách A gốc alpha123');
    // gia lap ban sao cu: 1 sach co ban goc, 1 sach da mat ban goc
    const c1 = (await lib.storeLegacyCopy(a, { title: 'Sách A' }, 'Sách A.txt')).book;
    const lost = path.join(out, 'tmp-lost.txt');
    fs.writeFileSync(lost, 'Sách B chỉ còn bản sao beta456');
    const c2 = (await lib.storeLegacyCopy(lost, null, 'Sách B.txt')).book;
    fs.unlinkSync(lost);
    lib.patch(c1.id, { progress: 42, favorite: true, hashtags: ['triết'] });
    lib.addNote(c1.id, 'Ghi chú quan trọng');
    assert.equal(fs.readdirSync(lib.files).length, 2);
    assert.equal(tools.copiesInfo().copies, 2);

    const r = await tools.copiesRelink({});
    assert.equal(r.matched, 1);
    assert.equal(r.remaining, 1);
    assert.equal(fs.readdirSync(lib.files).length, 1);
    const linked = lib.list().find((b) => b.linked && b.filePath === fs.realpathSync(a));
    assert.ok(linked, 'original is in the library');
    assert.equal(linked.progress, 42);
    assert.equal(linked.favorite, true);
    assert.deepEqual(linked.hashtags, ['triết']);
    assert.equal(lib.notes()[linked.id].length, 1);
    assert.ok(lib.search('alpha123').includes(linked.id));
    assert.ok(fs.existsSync(a), 'original untouched');
    assert.ok(lib.getSetting('watched', []).includes(fs.realpathSync(orig)));

    pick = out;
    const m = await tools.copiesMoveOut();
    assert.equal(m.moved, 1);
    assert.equal(fs.readdirSync(lib.files).length, 0);
    assert.equal(tools.copiesInfo().copies, 0);
    const b = lib.list().find((x) => x.title === 'Sách B' || x.filePath.endsWith('Sách B.txt'));
    assert.ok(b && b.linked && fs.existsSync(b.filePath));
    assert.ok(lib.search('beta456').includes(b.id));
    assert.equal(lib.list().filter((x) => !x.linked).length, 0);
  } finally {
    lib.close();
    for (const p of [root, orig, out]) fs.rmSync(p, { recursive: true, force: true });
  }
});
