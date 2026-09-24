import type { PRInput } from "../../src/scoring/types";

/**
 * Deliberately legitimate synthetic PR:
 * - small, focused diff (17 changed lines)
 * - includes a real test file change
 * - specific, concrete description (no generic filler phrasing)
 * - description is unrelated to any prior PR description
 */
export const legitPRFixture: PRInput = {
  description:
    "Fix off-by-one error in retry backoff calculation that caused the 5th retry to fire " +
    "immediately instead of after the expected delay. Added a regression test covering the " +
    "boundary case in retry.test.ts.",
  changedFiles: ["src/retry.ts", "src/retry.test.ts"],
  additions: 14,
  deletions: 3,
  repoHasTests: true,
  priorDescriptions: [
    "Add validation for empty config path in loadConfig()",
    "Fix memory leak in websocket reconnect handler",
  ],
};
