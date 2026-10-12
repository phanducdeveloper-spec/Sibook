const DB = 'mewbook-local-v1';
export const readLocal = (key, fallback) => {try {return JSON.parse(localStorage.getItem(key)) ?? fallback;} catch {return fallback;}};
export const writeLocal = (key, value) => {try {localStorage.setItem(key, JSON.stringify(value)); return true;} catch {return false;}};
async function database() {return new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore('files',{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
export async function saveFile(item) {const db=await database();try {await new Promise((resolve,reject)=>{const tx=db.transaction('files','readwrite');tx.objectStore('files').put(item);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});} finally {db.close();}}
export async function getFile(id) {const db=await database();try {return await new Promise((resolve,reject)=>{const r=db.transaction('files').objectStore('files').get(id);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});} finally {db.close();}}
