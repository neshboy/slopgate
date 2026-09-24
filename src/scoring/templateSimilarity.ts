import type { HeuristicResult } from "./types";

const WEIGHT = 25;

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function bigrams(text: string): string[] {
  const normalized = normalize(text);
  if (normalized.length < 2) return normalized.length === 1 ? [normalized] : [];
  const grams: string[] = [];
  for (let i = 0; i < normalized.length - 1; i++) {
    grams.push(normalized.slice(i, i + 2));
  }
  return grams;
}

/**
 * Dice coefficient over character bigrams: 2 * |A ∩ B| / (|A| + |B|).
 * A simple, well-known, deterministic normalized-string-similarity measure.
 * Returns a value in [0, 1]; 1 means identical (after whitespace/case
 * normalization), 0 means no shared bigrams at all.
 */
export function diceCoefficient(a: string, b: string): number {
  const bigramsA = bigrams(a);
  const bigramsB = bigrams(b);

  if (bigramsA.length === 0 && bigramsB.length === 0) return 1;
  if (bigramsA.length === 0 || bigramsB.length === 0) return 0;

  const counts = new Map<string, number>();
  for (const gram of bigramsA) {
    counts.set(gram, (counts.get(gram) ?? 0) + 1);
  }

  let intersection = 0;
  for (const gram of bigramsB) {
    const remaining = counts.get(gram) ?? 0;
    if (remaining > 0) {
      intersection++;
      counts.set(gram, remaining - 1);
    }
  }

  return (2 * intersection) / (bigramsA.length + bigramsB.length);
}

/**
 * Heuristic 4: description similarity to a template.
 *
 * Compares this PR's description against a set of prior PR descriptions
 * from the same repo (fetched by the caller - the GitHub Action fetches
 * these via the REST API; the CLI can optionally be given a file of them,
 * but otherwise skips this heuristic rather than faking a result).
 *
 * A high similarity to a *specific* prior description is a much stronger
 * signal than matching generic boilerplate (heuristic 2 already covers
 * generic phrasing) - it suggests the same template/prompt was reused
 * near-verbatim.
 */
export function scoreTemplateSimilarity(
  description: string,
  priorDescriptions: string[] | undefined,
): HeuristicResult {
  const id = "template-similarity";
  const label = "Description similarity to a prior PR";

  const candidates = (priorDescriptions ?? []).filter((d) => d && d.trim().length > 0);

  if (candidates.length === 0) {
    return {
      id,
      label,
      applicable: false,
      score: 0,
      weight: WEIGHT,
      reason:
        "Skipped: no prior PR descriptions were available for comparison (CLI run without prior descriptions, or repo has no other PRs).",
    };
  }

  if (description.trim().length === 0) {
    return {
      id,
      label,
      applicable: true,
      score: 0,
      weight: WEIGHT,
      reason: "Description is empty; nothing to compare against prior PR descriptions.",
    };
  }

  let best = 0;
  let bestIndex = -1;
  candidates.forEach((candidate, index) => {
    const similarity = diceCoefficient(description, candidate);
    if (similarity > best) {
      best = similarity;
      bestIndex = index;
    }
  });

  let score: number;
  if (best > 0.85) {
    score = WEIGHT;
  } else if (best > 0.7) {
    score = Math.round(WEIGHT * 0.6);
  } else if (best > 0.5) {
    score = Math.round(WEIGHT * 0.3);
  } else {
    score = 0;
  }

  const pct = Math.round(best * 100);
  return {
    id,
    label,
    applicable: true,
    score,
    weight: WEIGHT,
    reason:
      score > 0
        ? `Description is ${pct}% similar (normalized bigram overlap) to a prior PR description (#${bestIndex + 1} of ${candidates.length} compared), suggesting reused template/prompt text.`
        : `Highest similarity to any of ${candidates.length} prior PR description(s) compared was only ${pct}%, no reused-template pattern detected.`,
  };
}
