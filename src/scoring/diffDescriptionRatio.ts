import type { HeuristicResult } from "./types";

const WEIGHT = 20;

/** Below this many changed lines, diff size is never treated as "large". */
const SMALL_DIFF_LINE_THRESHOLD = 30;

function countWords(text: string): number {
  const trimmed = text.trim();
  if (trimmed.length === 0) return 0;
  return trimmed.split(/\s+/).length;
}

/**
 * Heuristic 3: diff-size vs. description-length ratio.
 *
 * Flags PRs that change a lot of code while explaining almost nothing.
 * Small diffs are exempt: a five-line fix doesn't need a paragraph, so this
 * heuristic only engages once the diff is big enough that a reader would
 * reasonably expect some explanation.
 */
export function scoreDiffDescriptionRatio(
  changedLines: number,
  description: string,
): HeuristicResult {
  const id = "diff-description-ratio";
  const label = "Diff-size vs. description-length ratio";
  const wordCount = countWords(description);

  if (changedLines < SMALL_DIFF_LINE_THRESHOLD) {
    return {
      id,
      label,
      applicable: true,
      score: 0,
      weight: WEIGHT,
      reason: `Diff is small (${changedLines} changed lines < ${SMALL_DIFF_LINE_THRESHOLD}), so description length is not a concerning signal regardless of word count.`,
    };
  }

  const ratio = changedLines / Math.max(1, wordCount);

  let score: number;
  if (ratio > 50) {
    score = WEIGHT;
  } else if (ratio > 20) {
    score = Math.round(WEIGHT * 0.7);
  } else if (ratio > 10) {
    score = Math.round(WEIGHT * 0.4);
  } else if (ratio > 5) {
    score = Math.round(WEIGHT * 0.15);
  } else {
    score = 0;
  }

  return {
    id,
    label,
    applicable: true,
    score,
    weight: WEIGHT,
    reason: `Diff changes ${changedLines} lines but the description is only ${wordCount} word(s) (~${ratio.toFixed(1)} changed lines per word).`,
  };
}
