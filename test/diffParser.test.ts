import { describe, expect, it } from "vitest";
import { parseUnifiedDiff } from "../src/diffParser";

const SAMPLE_DIFF = `diff --git a/src/retry.ts b/src/retry.ts
index 1234567..89abcde 100644
--- a/src/retry.ts
+++ b/src/retry.ts
@@ -10,7 +10,7 @@ export function computeDelay(attempt: number): number {
-  return attempt * BASE_DELAY;
+  return (attempt - 1) * BASE_DELAY;
 }
diff --git a/src/retry.test.ts b/src/retry.test.ts
index abcdef1..2345678 100644
--- a/src/retry.test.ts
+++ b/src/retry.test.ts
@@ -1,3 +1,6 @@
 import { computeDelay } from "./retry";
+
+test("first attempt has zero delay", () => {
+  expect(computeDelay(1)).toBe(0);
+});
`;

describe("parseUnifiedDiff", () => {
  it("extracts changed file paths without a/ b/ prefixes", () => {
    const result = parseUnifiedDiff(SAMPLE_DIFF);
    expect(result.changedFiles).toEqual(
      expect.arrayContaining(["src/retry.ts", "src/retry.test.ts"]),
    );
    expect(result.changedFiles).toHaveLength(2);
  });

  it("counts additions and deletions, ignoring the +++/--- header lines", () => {
    const result = parseUnifiedDiff(SAMPLE_DIFF);
    // 1 real deletion (retry.ts) + 1 real addition (retry.ts) + 4 real additions (retry.test.ts)
    expect(result.deletions).toBe(1);
    expect(result.additions).toBe(5);
  });
});
