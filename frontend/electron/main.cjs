'use strict';
const {
  app,
  BrowserWindow,
  protocol,
  net,
  ipcMain,
  session,
  Menu,
  shell,
} = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
app.setName('SI Book');
// Stable app storage (giu thu muc MewBook cu de khong mat du lieu khi doi ten app).
const qaPath = process.argv.find((a) => a.startsWith('--qa-data-dir='));
app.setPath(
  'userData',
  qaPath
    ? path.resolve(qaPath.slice('--qa-data-dir='.length))
    : path.join(app.getPath('appData'), 'MewBook'),
);
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'mewbook',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
    },
  },
]);
const root = path.resolve(__dirname, '../build');
const ENTRY = 'mewbook://app/index.html';
let mainWindow;
let service;
const CSP =
  "default-src 'self' blob:; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' mewbook://library mewbook://cover mewbook://page blob: data:; font-src 'self' data: blob:; connect-src 'self' blob:; frame-src 'self' mewbook://library blob:; object-src 'self' blob:; base-uri 'self'; form-action 'none'";
function trusted(event) {
  if (
    !mainWindow ||
    event.sender !== mainWindow.webContents ||
    event.senderFrame !== mainWindow.webContents.mainFrame ||
    !event.senderFrame.url.startsWith('mewbook://app/')
  )
    throw new Error('Untrusted IPC sender');
}
ipcMain.handle('mewbook:window', (event, action) => {
  trusted(event);
  const w = mainWindow;
  if (action === 'minimize') w.minimize();
  else if (action === 'maximize') {
    if (w.isMinimized()) w.restore();
    if (w.isMaximized()) w.unmaximize();
    else w.maximize();
  } else if (action === 'close') {
    setImmediate(() => w.close());
    return true;
  } else if (action !== 'state') throw new Error('Invalid action');
  return {
    minimized: w.isMinimized(),
    maximized: w.isMaximized(),
    size: w.getSize(),
  };
});
ipcMain.handle('mewbook:info', (event) => {
  trusted(event);
  return {
    name: 'SI Book',
    version: app.getVersion(),
    dataPath: app.getPath('userData'),
    packaged: app.isPackaged,
  };
});
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
  app
    .whenReady()
    .then(async () => {
      service = require('./service.cjs').startService(
        app.getPath('userData'),
        () => mainWindow,
        trusted,
      );
      protocol.handle('mewbook', async (request) => {
        try {
          const url = new URL(request.url);
          if (url.hostname === 'cover' && request.method === 'GET') {
            const file = service.lib.coverFile(decodeURIComponent(url.pathname.slice(1)));
            if (!file) return new Response('Not found', { status: 404 });
            const type = { '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' }[path.extname(file)];
            return new Response(fs.readFileSync(file), {
              status: 200,
              headers: { 'Content-Type': type, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-cache' },
            });
          }
          // Trang anh cua truyen tranh CBZ: mewbook://page/<id>/<n>
          if (url.hostname === 'page' && request.method === 'GET') {
            const [id, n] = url.pathname.slice(1).split('/').map(decodeURIComponent);
            const pg = service.lib.comicPage(id, Number(n));
            return new Response(pg.data, {
              status: 200,
              headers: { 'Content-Type': pg.type, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'max-age=3600' },
            });
          }
          // Same-origin read of a book file for pdf.js thumbnails (mewbook://app/__book/<id>).
          const sameOriginBook = url.hostname === 'app' && url.pathname.startsWith('/__book/');
          if ((url.hostname === 'library' || sameOriginBook) && request.method === 'GET') {
            const id = decodeURIComponent(url.pathname.slice(sameOriginBook ? 8 : 1));
            const rendered = url.searchParams.get('view') === 'pdf' ? service.lib.renderedFile(id) : null;
            if (url.searchParams.get('view') === 'pdf' && !rendered) return new Response('Not rendered', { status: 404 });
            const file = rendered || service.lib.file(id);
            const response = await net.fetch(pathToFileURL(file).href, {
              headers: request.headers,
            });
            const h = new Headers(response.headers);
            h.set('Content-Security-Policy', "default-src 'none'; sandbox");
            h.set('X-Content-Type-Options', 'nosniff');
            return new Response(response.body, {
              status: response.status,
              headers: h,
            });
          }
          if (url.hostname !== 'app' || request.method !== 'GET')
            return new Response('Forbidden', { status: 403 });
          const pathname =
            decodeURIComponent(url.pathname).replace(/^\/+/, '') ||
            'index.html';
          const candidate = path.resolve(root, pathname);
          if (
            !candidate.startsWith(root + path.sep) ||
            !fs.existsSync(candidate) ||
            !fs.statSync(candidate).isFile()
          )
            return new Response('Not found', { status: 404 });
          const response = await net.fetch(pathToFileURL(candidate).href);
          const headers = new Headers(response.headers);
          headers.set('Content-Security-Policy', CSP);
          headers.set('X-Content-Type-Options', 'nosniff');
          return new Response(response.body, {
            status: response.status,
            headers,
          });
        } catch {
          return new Response('Bad request', { status: 400 });
        }
      });
      // Application requires no HTTP server and no network connection.
      session.defaultSession.webRequest.onBeforeRequest(
        { urls: ['http://*/*', 'https://*/*', 'ws://*/*', 'wss://*/*'] },
        (_details, callback) => callback({ cancel: true }),
      );
      session.defaultSession.setPermissionRequestHandler(
        (_wc, permission, callback, details) =>
          callback(
            permission === 'clipboard-sanitized-write' &&
              details.requestingUrl?.startsWith('mewbook://app/'),
          ),
      );
      session.defaultSession.on('will-download', (_event, item) => {
        item.setSaveDialogOptions({
          title: 'Lưu bản sao lưu SI Book',
          defaultPath: path.join(
            app.getPath('downloads'),
            path.basename(item.getFilename()),
          ),
        });
      });
      Menu.setApplicationMenu(null);
      const bounds = service.lib.getSetting('windowBounds', {});
      mainWindow = new BrowserWindow({
        width: Math.max(1000, Math.min(2400, bounds.width || 1619)),
        height: Math.max(650, Math.min(1400, bounds.height || 971)),
        minWidth: 1000,
        minHeight: 650,
        show: false,
        frame: false,
        title: 'SI Book',
        backgroundColor: '#f4f8ff',
        icon: path.join(__dirname, 'resources/icon.ico'),
        autoHideMenuBar: true,
        webPreferences: {
          preload: path.join(__dirname, 'preload.cjs'),
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: true,
          webSecurity: true,
          plugins: true,
          devTools: !app.isPackaged,
        },
      });
      mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
      mainWindow.webContents.on('will-navigate', (event, url) => {
        if (!url.startsWith('mewbook://app/')) event.preventDefault();
      });
      mainWindow.webContents.on('will-attach-webview', (event) =>
        event.preventDefault(),
      );
      mainWindow.once('ready-to-show', () => mainWindow.show());
      mainWindow.on('close', () => {
        service.lib.setSetting('windowBounds', mainWindow.getNormalBounds());
      });
      mainWindow.on('closed', () => {
        mainWindow = null;
      });
      await mainWindow.loadURL(ENTRY);
    })
    .catch((error) => {
      console.error(error);
      app.quit();
    });
  app.on('window-all-closed', () => app.quit());
  app.on('will-quit', () => {
    service?.close();
  });
}
