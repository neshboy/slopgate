import type { HeuristicResult, PRInput, ScoreResult } from "./types";
import { scoreNoTestsChanged } from "./noTestsChanged";
import { scoreBoilerplateDescription } from "./boilerplateDescription";
import { scoreDiffDescriptionRatio } from "./diffDescriptionRatio";
import { scoreTemplateSimilarity } from "./templateSimilarity";

export const DEFAULT_THRESHOLD = 60;
export const DEFAULT_LABEL = "possible-ai-slop";

export type { HeuristicResult, PRInput, ScoreResult };
export { isTestFilePath } from "./testPaths";
export { BOILERPLATE_PHRASES } from "./boilerplateDescription";
export { diceCoefficient } from "./templateSimilarity";

/**
 * Runs every heuristic and combines them into a single 0-100 composite
 * score, normalized only across the heuristics that were actually
 * applicable (see HeuristicResult.applicable). This means a repo with no
 * tests, or a CLI run with no prior-PR data, is scored fairly against the
 * heuristics that *could* run rather than being penalized for missing data.
 *
 * This is intentionally a transparent weighted sum, not a black box: the
 * full itemized breakdown is always returned alongside the number.
 */
export function scorePR(
  input: PRInput,
  options: { threshold?: number; label?: string } = {},
): ScoreResult {
  const threshold = options.threshold ?? DEFAULT_THRESHOLD;
  const labelName = options.label ?? DEFAULT_LABEL;

  const changedLines = (input.additions ?? 0) + (input.deletions ?? 0);

  const heuristics: HeuristicResult[] = [
    scoreNoTestsChanged(input.changedFiles, input.repoHasTests),
    scoreBoilerplateDescription(input.description),
    scoreDiffDescriptionRatio(changedLines, input.description),
    scoreTemplateSimilarity(input.description, input.priorDescriptions),
  ];

  const applicable = heuristics.filter((h) => h.applicable);
  const totalWeight = applicable.reduce((sum, h) => sum + h.weight, 0);
  const totalScore = applicable.reduce((sum, h) => sum + h.score, 0);
  const score = totalWeight > 0 ? Math.round((totalScore / totalWeight) * 100) : 0;

  return {
    score,
    heuristics,
    label: score >= threshold ? labelName : null,
    threshold,
  };
}
