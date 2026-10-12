'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {Library}=require('./library.cjs');
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
test('Read-only folder connections',async t=>{
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'mewbook-link-unit-')),src=path.join(base,'source'),root=path.join(base,'profile');
 fs.mkdirSync(path.join(src,'files','nested'),{recursive:true});
 const file=path.join(src,'files','nested','Tiếng Việt.txt');fs.writeFileSync(file,'Nội dung duy nhất linkedcontent987. Không chỉnh sửa sách gốc.');
 fs.writeFileSync(path.join(src,'ignore.exe'),'ignored');
 const before=hash(file),mt=fs.statSync(file).mtimeMs;const lib=new Library(root);let b;
 try {
 await t.test('Recursive scan, including a folder named files; no vault copy',async()=>{const r=await lib.linkFolder(src);assert.equal(r.scanned,1);assert.equal(r.added,1);b=lib.list()[0];assert(b.linked&&b.readOnly);assert.equal(b.indexStatus,'none');assert.equal(fs.readdirSync(lib.files).length,0);assert.equal(lib.file(b.id),file);});
 await t.test('Metadata searchable before extraction',()=>assert(lib.search('tieng viet').includes(b.id)));
 await t.test('Lazy extraction and content search',async()=>{const d=await lib.ensureDocument(b.id);assert(d.text.includes('linkedcontent987'));assert(lib.search('linkedcontent987').includes(b.id));});
 await t.test('Notes and progress stored only in app database',()=>{lib.addNote(b.id,'Ghi chú riêng');lib.patch(b.id,{progress:23,title:'Tiêu đề riêng'});assert.equal(hash(file),before);assert.equal(fs.statSync(file).mtimeMs,mt);});
 await t.test('Rescan deduplicates paths and preserves edits',async()=>{const r=await lib.linkFolder(src);assert.equal(r.added,0);assert.equal(lib.list()[0].title,'Tiêu đề riêng');assert.equal(lib.list()[0].progress,23);});
 await t.test('Reject source writes and path traversal',()=>{assert.throws(()=>lib.assertWritableDestination(path.join(src,'new.zip')));assert.throws(()=>lib.assertWritableDestination(file));assert.throws(()=>lib.linkedFile({...b,sourceRelative:'..'+path.sep+'outside.txt'}));assert.throws(()=>lib.linkedFile({...b,sourceRoot:base}));assert.throws(()=>lib.authorizeRoot(root));assert.throws(()=>lib.authorizeRoot(base));});
 await t.test('ZIP backup and restore are completely removed',()=>{assert.equal(typeof lib.backup,'undefined');assert.equal(typeof lib.restoreBackup,'undefined');assert(!fs.existsSync(path.join(base,'backup.zip')));});
 await t.test('Trash and purge remove references only; rescan does not resurrect excluded references',async()=>{lib.trash(b.id);await lib.linkFolder(src);assert.equal(lib.list().length,0);lib.restoreBook(b.id);lib.trash(b.id);lib.purge(b.id);await lib.linkFolder(src);assert.equal(lib.list().length,0);assert.equal(hash(file),before);assert.equal(fs.statSync(file).mtimeMs,mt);});
 await t.test('More than 2000 files register without extraction or copies',async()=>{const more=path.join(src,'many');fs.mkdirSync(more);for(let i=0;i<2101;i++)fs.writeFileSync(path.join(more,i+'.txt'),'tiny');let changed=0;const r=await lib.linkFolder(src,()=>changed++);assert.equal(r.scanned,2102);assert.equal(r.added,2101);assert(!r.limited);assert.equal(lib.list().length,2101);assert(changed>=21);assert.equal(fs.readdirSync(lib.files).length,0);});
 await t.test('Missing source books flagged, metadata retained',async()=>{const x=lib.list()[0];fs.unlinkSync(lib.file(x.id));await lib.linkFolder(src);assert(lib.book(lib.row(x.id)).missing);assert.throws(()=>lib.file(x.id));});
 } finally {lib.close();fs.rmSync(base,{recursive:true,force:true});}
});
