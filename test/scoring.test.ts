import { describe, expect, it } from "vitest";
import { scorePR } from "../src/scoring";
import { slopPRFixture } from "./fixtures/slop-pr";
import { legitPRFixture } from "./fixtures/legit-pr";

function heuristic(result: ReturnType<typeof scorePR>, id: string) {
  const found = result.heuristics.find((h) => h.id === id);
  if (!found) throw new Error(`heuristic ${id} not found in result`);
  return found;
}

describe("scorePR: slop-like fixture (huge diff, no tests, boilerplate description)", () => {
  const result = scorePR(slopPRFixture);

  it("produces a high composite score and applies the label", () => {
    expect(result.score).toBeGreaterThanOrEqual(60);
    expect(result.label).toBe("possible-ai-slop");
  });

  it("flags no-tests-changed since the repo has tests but this PR touches none", () => {
    const h = heuristic(result, "no-tests-changed");
    expect(h.applicable).toBe(true);
    expect(h.score).toBe(h.weight); // full penalty
    expect(h.reason).toMatch(/does not touch any file/i);
  });

  it("flags boilerplate-description with a nonzero score and named matches", () => {
    const h = heuristic(result, "boilerplate-description");
    expect(h.applicable).toBe(true);
    expect(h.score).toBeGreaterThan(0);
    expect(h.reason).toMatch(/boilerplate\/cliche phrase match/i);
  });

  it("flags a high diff-size vs description-length ratio", () => {
    const h = heuristic(result, "diff-description-ratio");
    expect(h.applicable).toBe(true);
    expect(h.score).toBeGreaterThan(0);
    expect(h.reason).toMatch(/860 lines/i);
  });

  it("flags high similarity to a prior PR description", () => {
    const h = heuristic(result, "template-similarity");
    expect(h.applicable).toBe(true);
    expect(h.score).toBeGreaterThan(0);
    expect(h.reason).toMatch(/similar/i);
  });

  it("gives itemized reasoning for every heuristic, never a bare number", () => {
    expect(result.heuristics).toHaveLength(4);
    for (const h of result.heuristics) {
      expect(h.reason.length).toBeGreaterThan(10);
    }
  });
});

describe("scorePR: legitimate fixture (small diff, real tests, specific description)", () => {
  const result = scorePR(legitPRFixture);

  it("produces a low composite score and does not apply a label", () => {
    expect(result.score).toBeLessThan(60);
    expect(result.label).toBeNull();
  });

  it("does not flag no-tests-changed since this PR touches a test file", () => {
    const h = heuristic(result, "no-tests-changed");
    expect(h.applicable).toBe(true);
    expect(h.score).toBe(0);
    expect(h.reason).toMatch(/test file/i);
  });

  it("does not flag boilerplate-description", () => {
    const h = heuristic(result, "boilerplate-description");
    expect(h.score).toBe(0);
  });

  it("does not flag diff-description-ratio since the diff is small", () => {
    const h = heuristic(result, "diff-description-ratio");
    expect(h.score).toBe(0);
    expect(h.reason).toMatch(/small/i);
  });

  it("does not flag template-similarity against unrelated prior PRs", () => {
    const h = heuristic(result, "template-similarity");
    expect(h.score).toBe(0);
  });
});

describe("scorePR: graceful degradation when data is unavailable", () => {
  it("marks no-tests-changed and template-similarity as not applicable, and still returns a valid score", () => {
    const result = scorePR({
      description: "",
      changedFiles: [],
      additions: 0,
      deletions: 0,
      // repoHasTests and priorDescriptions intentionally omitted
    });

    const noTests = heuristic(result, "no-tests-changed");
    const template = heuristic(result, "template-similarity");
    expect(noTests.applicable).toBe(false);
    expect(noTests.score).toBe(0);
    expect(template.applicable).toBe(false);
    expect(template.score).toBe(0);

    // Composite score is still well-defined (normalized over only the
    // applicable heuristics) and doesn't blow up or divide by zero.
    expect(result.score).toBe(0);
    expect(result.label).toBeNull();
  });

  it("does not penalize a repo that has no test files at all", () => {
    const result = scorePR({
      description: "Small unrelated fix.",
      changedFiles: ["src/index.ts"],
      additions: 2,
      deletions: 1,
      repoHasTests: false,
    });
    const noTests = heuristic(result, "no-tests-changed");
    expect(noTests.applicable).toBe(false);
    expect(noTests.reason).toMatch(/no test files at all/i);
  });
});
