/**
 * A single heuristic's contribution to the composite score.
 *
 * Every heuristic is deterministic and cheap to compute. None of them use an
 * LLM, none of them try to resolve symbols/types across a codebase, and none
 * of them guess at "correctness" of code. They only look at shallow, textual
 * / structural signals about the PR itself.
 */
export interface HeuristicResult {
  /** Stable machine-readable id, e.g. "no-tests-changed". */
  id: string;
  /** Human-readable name, e.g. "No tests changed". */
  label: string;
  /**
   * Whether this heuristic had enough information to run at all. When
   * `false`, `score` is always 0 and is excluded from the composite
   * normalization so it can never unfairly inflate or deflate the result.
   */
  applicable: boolean;
  /** Points awarded by this heuristic, in the range [0, weight]. */
  score: number;
  /** Maximum points this heuristic can contribute when applicable. */
  weight: number;
  /** Human-readable explanation of why this score was given. Never omitted. */
  reason: string;
}

/**
 * Everything the scorer needs to know about one PR. All fields are plain
 * data so the same scoring logic can run identically from the CLI (reading
 * local files) and from the GitHub Action (reading the REST API).
 */
export interface PRInput {
  /** Raw PR description / body text. */
  description: string;
  /** Paths of files touched by the PR, repo-relative, forward-slash separated. */
  changedFiles: string[];
  /** Total added lines across the diff, if known. */
  additions?: number;
  /** Total deleted lines across the diff, if known. */
  deletions?: number;
  /**
   * Whether the repository has test files *anywhere* outside of this PR's
   * own changes. `undefined` means "unknown" (e.g. CLI run without --repo),
   * in which case the "no tests changed" heuristic is skipped rather than
   * guessed at.
   */
  repoHasTests?: boolean;
  /**
   * Descriptions of other (typically prior) PRs in the same repo, used only
   * for the template-similarity heuristic. Optional: when omitted, that
   * heuristic is skipped rather than faked.
   */
  priorDescriptions?: string[];
}

export interface ScoreResult {
  /** Composite score normalized to 0-100 across only the applicable heuristics. */
  score: number;
  /** Itemized, per-heuristic breakdown. Always present, never a black box. */
  heuristics: HeuristicResult[];
  /** The label that would be applied, or null if the score is under threshold. */
  label: string | null;
  /** The threshold that was used to decide `label`. */
  threshold: number;
}
