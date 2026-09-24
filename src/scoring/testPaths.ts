/**
 * Shared "is this a test file?" check, used both by the no-tests-changed
 * heuristic and by the repo scanner (CLI + Action) that establishes whether
 * a repository has tests anywhere at all.
 *
 * This intentionally only matches well-established, cross-ecosystem test
 * path conventions. It does not try to parse file contents or understand
 * any particular test framework.
 */
const TEST_PATH_PATTERNS: RegExp[] = [
  // *.test.*, *.spec.* (js/ts/jsx/tsx/mjs/cjs/py/rb/go/etc, one extra suffix allowed)
  /(^|\/)[^/]*\.(test|spec)\.[^/]+$/i,
  // */test/... or */tests/... directories anywhere in the path
  /(^|\/)tests?\//i,
  // */__tests__/... (Jest convention)
  /(^|\/)__tests__\//i,
];

export function isTestFilePath(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, "/");
  return TEST_PATH_PATTERNS.some((pattern) => pattern.test(normalized));
}
