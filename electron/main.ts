import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;

function createWindow() {
    const isDev = !app.isPackaged;

    // Dev ve Prod ortamına göre icon yolunu çöz
    const iconPath = isDev
        ? path.join(__dirname, "../public/icon.ico")
        : path.join(app.getAppPath(), "dist/icon.ico");

    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        frame: false, // Windows varsayılan titlebar'ı kaldırır
        icon: iconPath,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, "preload.cjs"), // Derleme türüne göre cjs veya js
        },
    });

    if (isDev) {
        mainWindow.loadURL("http://localhost:3000");
    } else {
        mainWindow.loadFile(path.join(app.getAppPath(), "dist/index.html"));
    }

    mainWindow.on("closed", () => {
        mainWindow = null;
    });
}

// IPC Dinleyicileri (Tekrar tanımlanmaması için app.whenReady dışına da alınabilir)
ipcMain.on("window:minimize", () => mainWindow?.minimize());
ipcMain.on("window:maximize", () => {
    if (mainWindow?.isMaximized()) {
        mainWindow.unmaximize();
    } else {
        mainWindow?.maximize();
    }
});
ipcMain.on("window:close", () => mainWindow?.close());

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

app.on("activate", () => {
    if (mainWindow === null) {
        createWindow();
    }
});