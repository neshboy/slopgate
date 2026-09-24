import fs from "node:fs";
import path from "node:path";
import { isTestFilePath } from "./scoring/testPaths";

const IGNORED_DIR_NAMES = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  "coverage",
  "out",
]);

/**
 * Walks a local repo directory and returns true as soon as it finds any
 * file matching a common test-path convention. This is the CLI's way of
 * establishing "repoHasTests" as real ground truth (via the filesystem)
 * rather than guessing - mirroring what the GitHub Action does via the Git
 * Trees API against the default branch.
 */
export function repoHasTestFiles(rootDir: string): boolean {
  const stack: string[] = [rootDir];

  while (stack.length > 0) {
    const dir = stack.pop()!;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (IGNORED_DIR_NAMES.has(entry.name)) continue;
        stack.push(path.join(dir, entry.name));
        continue;
      }
      const relative = path.relative(rootDir, path.join(dir, entry.name));
      if (isTestFilePath(relative)) {
        return true;
      }
    }
  }

  return false;
}
