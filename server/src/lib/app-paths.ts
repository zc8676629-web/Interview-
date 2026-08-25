import os from "node:os";
import path from "node:path";

const APP_DIR_NAME = "interview-plus-plus";

export function resolveDataDir(explicitDir?: string): string {
  if (explicitDir) {
    return explicitDir;
  }

  if (process.env.DATA_DIR) {
    return process.env.DATA_DIR;
  }

  if (process.platform === "win32" && process.env.APPDATA) {
    return path.join(process.env.APPDATA, APP_DIR_NAME);
  }

  return path.join(os.homedir(), ".local", "share", APP_DIR_NAME);
}

export function resolveStateFile(dataDir: string): string {
  return path.join(dataDir, "app-state.json");
}

export function resolveUploadsDir(dataDir: string): string {
  return path.join(dataDir, "uploads");
}

