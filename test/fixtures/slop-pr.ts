import type { PRInput } from "../../src/scoring/types";

/**
 * Deliberately slop-like synthetic PR:
 * - huge diff (860 changed lines)
 * - touches only source files, no test files, in a repo that has tests
 * - boilerplate/generic description packed with cliche AI-assistant phrasing
 * - description text is a near-duplicate of a prior PR description
 *   (simulating a reused template/prompt)
 */
export const slopPRFixture: PRInput = {
  description:
    "This PR enhances the overall codebase and improves code readability and maintainability. " +
    "This update also includes several improvements that streamlines the process and ensures " +
    "better performance for all users. Let me know if you would like any changes.",
  changedFiles: [
    "src/utils/helpers.ts",
    "src/utils/formatter.ts",
    "src/api/client.ts",
    "src/api/routes.ts",
    "src/components/Button.tsx",
    "src/components/Modal.tsx",
    "src/services/analytics.ts",
    "src/services/logger.ts",
  ],
  additions: 650,
  deletions: 210,
  repoHasTests: true,
  priorDescriptions: [
    "This PR enhances the overall codebase and improves code readability and maintainability. " +
      "This update also includes several improvements that streamline the process and ensure " +
      "better performance for our users. Let me know if you would like any changes.",
    "Bump lodash from 4.17.20 to 4.17.21 to address a reported security advisory.",
  ],
};
