/**
 * Minimal unified-diff parser: extracts the set of changed file paths plus
 * total added/deleted line counts. Used only by the CLI, which reads a
 * local diff file (e.g. `git diff` output) rather than the GitHub API.
 *
 * This is intentionally simple - it does not need to understand hunks,
 * renames-with-similarity, or binary file markers in detail. It only needs
 * "which files changed" and "how many lines changed" for the heuristics.
 */
export interface ParsedDiff {
  changedFiles: string[];
  additions: number;
  deletions: number;
}

export function parseUnifiedDiff(diffText: string): ParsedDiff {
  const changedFiles = new Set<string>();
  let additions = 0;
  let deletions = 0;

  const lines = diffText.split(/\r?\n/);
  for (const line of lines) {
    if (line.startsWith("+++ ") || line.startsWith("--- ")) {
      const raw = line.slice(4).trim();
      if (raw === "/dev/null") continue;
      const path = raw.replace(/^[ab]\//, "");
      if (path) changedFiles.add(path);
      continue;
    }
    if (line.startsWith("diff --git ")) {
      // e.g. "diff --git a/foo/bar.ts b/foo/bar.ts"
      const match = line.match(/^diff --git a\/(.+?) b\/(.+)$/);
      if (match) {
        changedFiles.add(match[2]);
      }
      continue;
    }
    if (line.startsWith("+")) {
      additions++;
    } else if (line.startsWith("-")) {
      deletions++;
    }
  }

  return { changedFiles: [...changedFiles], additions, deletions };
}
