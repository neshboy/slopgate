import type { HeuristicResult } from "./types";
import { isTestFilePath } from "./testPaths";

const WEIGHT = 30;

/**
 * Heuristic 1: does the diff touch any test file, given the repo clearly has
 * test files elsewhere?
 *
 * This does NOT try to determine whether the repo "should" have tests, or
 * whether the tests that exist are any good. It only asks: does this repo
 * demonstrably have a test convention, and did this PR participate in it?
 *
 * If we don't know whether the repo has tests at all (repoHasTests is
 * undefined) or we positively know it doesn't, the heuristic is marked
 * not-applicable so it can never punish a legitimately test-free project.
 */
export function scoreNoTestsChanged(
  changedFiles: string[],
  repoHasTests: boolean | undefined,
): HeuristicResult {
  const id = "no-tests-changed";
  const label = "No tests changed";

  if (repoHasTests === undefined) {
    return {
      id,
      label,
      applicable: false,
      score: 0,
      weight: WEIGHT,
      reason:
        "Skipped: it's unknown whether this repository has test files elsewhere (no --repo scan / no repo tree available).",
    };
  }

  if (repoHasTests === false) {
    return {
      id,
      label,
      applicable: false,
      score: 0,
      weight: WEIGHT,
      reason:
        "Skipped: this repository has no test files at all, so absence of test changes is not a meaningful signal here.",
    };
  }

  const touchedTestFiles = changedFiles.filter(isTestFilePath);

  if (touchedTestFiles.length > 0) {
    return {
      id,
      label,
      applicable: true,
      score: 0,
      weight: WEIGHT,
      reason: `PR modifies ${touchedTestFiles.length} test file(s) (e.g. ${touchedTestFiles[0]}).`,
    };
  }

  return {
    id,
    label,
    applicable: true,
    score: WEIGHT,
    weight: WEIGHT,
    reason:
      "This repository has test files elsewhere, but this PR does not touch any file matching common test path conventions (**/*.test.*, **/*.spec.*, **/test(s)/**, **/__tests__/**).",
  };
}
