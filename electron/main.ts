import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;

function createWindow() {
    const isDev = !app.isPackaged;

    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        frame: false, // Windows varsayılan titlebar'ı kaldırır
        icon: path.join(__dirname, "../public/icon.ico"),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, "preload.js"),
        },
    });

    if (isDev) {
        mainWindow.loadURL("http://localhost:3000");
    } else {
        mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
    }

    // mainWindow oluşturulduktan sonra
    ipcMain.on("window:minimize", () => mainWindow?.minimize());
    ipcMain.on("window:maximize", () => {
        if (mainWindow?.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow?.maximize();
        }
    });
    ipcMain.on("window:close", () => mainWindow?.close());

    mainWindow.on("closed", () => {
        mainWindow = null;
    });
}

app.whenReady().then(createWindow);
