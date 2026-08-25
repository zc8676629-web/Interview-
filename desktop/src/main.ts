import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { AddressInfo } from "node:net";

import { app, BrowserWindow, dialog, shell } from "electron";

const APP_TITLE = "本地面试作战台";
const PERSISTENT_ROOT_DIR_NAME = "interview-plus-plus";
const DESKTOP_USER_DATA_DIR_NAME = "desktop-shell";

const persistentRootDir = path.join(app.getPath("appData"), PERSISTENT_ROOT_DIR_NAME);
app.setPath("userData", path.join(persistentRootDir, DESKTOP_USER_DATA_DIR_NAME));

let mainWindow: BrowserWindow | null = null;
let localServer: http.Server | null = null;
let localOrigin = "";

const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow) {
      return;
    }

    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
  });

  app.whenReady().then(startDesktopApp).catch(handleStartupFailure);
}

async function startDesktopApp() {
  await fs.mkdir(persistentRootDir, { recursive: true });
  const workspaceDataDir = path.join(persistentRootDir, "workspace");
  const port = await startLocalServer(workspaceDataDir);
  localOrigin = `http://127.0.0.1:${port}`;

  createMainWindow();
  await mainWindow?.loadURL(localOrigin);

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length > 0) {
      return;
    }

    createMainWindow();
    await mainWindow?.loadURL(localOrigin);
  });
}

async function startLocalServer(dataDir: string) {
  const serverEntry = path.join(app.getAppPath(), "server", "dist", "app.js");
  const serverModule = (await import(pathToFileURL(serverEntry).href)) as {
    createApp(options?: { dataDir?: string }): Promise<Parameters<typeof http.createServer>[0]>;
  };
  const expressApp = await serverModule.createApp({ dataDir });
  localServer = http.createServer(expressApp);

  await new Promise<void>((resolve, reject) => {
    localServer?.once("error", reject);
    localServer?.listen(0, "127.0.0.1", () => {
      localServer?.off("error", reject);
      resolve();
    });
  });

  const address = localServer.address();
  if (!address || typeof address === "string") {
    throw new Error("本地桌面服务端口分配失败");
  }

  return (address as AddressInfo).port;
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    title: APP_TITLE,
    width: 1440,
    height: 920,
    minWidth: 1180,
    minHeight: 760,
    autoHideMenuBar: true,
    backgroundColor: "#f4f8f8",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(localOrigin)) {
      event.preventDefault();
      void shell.openExternal(url);
    }
  });
}

app.on("window-all-closed", () => {
  app.quit();
});

app.on("before-quit", () => {
  if (localServer?.listening) {
    localServer.close();
  }
});

async function handleStartupFailure(error: unknown) {
  const message = error instanceof Error ? error.message : "未知错误";
  try {
    dialog.showErrorBox("启动失败", `桌面应用启动失败：${message}`);
  } finally {
    if (localServer?.listening) {
      localServer.close();
    }
    app.exit(1);
  }
}
