import type { HeuristicResult } from "./types";

const WEIGHT = 25;

/**
 * Phrases and cliches that show up disproportionately often in generic /
 * template-y / AI-assistant-boilerplate PR descriptions. This is a real,
 * literal substring match list (case-insensitive) - not a single hardcoded
 * example. It is deliberately biased toward *generic filler phrasing*
 * rather than any specific topic, since slop descriptions tend to describe
 * the *shape* of a change ("enhances", "improves", "ensures") without ever
 * saying anything concrete.
 */
export const BOILERPLATE_PHRASES: string[] = [
  "this pr enhances",
  "this pr improves",
  "this pr ensures",
  "this pr streamlines",
  "this pull request enhances",
  "this pull request improves",
  "this pull request ensures",
  "this pull request introduces",
  "this update enhances",
  "this update improves",
  "this update also includes",
  "this change improves",
  "this change enhances",
  "this commit introduces",
  "in summary, this pr",
  "in summary, this change",
  "overall, this pr",
  "overall, this change",
  "significantly improves",
  "greatly improves",
  "enhances the overall",
  "improves the overall",
  "ensures that the code",
  "streamlines the process",
  "boosts performance and",
  "improves performance and",
  "makes the codebase more robust",
  "makes the code more robust",
  "improves code readability",
  "improves code readability and maintainability",
  "better code readability and maintainability",
  "enhances maintainability",
  "as an ai language model",
  "as a large language model",
  "i have made the following changes",
  "here are the changes i made",
  "here is a summary of the changes",
  "let me know if you would like any changes",
  "let me know if you have any questions",
  "feel free to let me know",
  "please let me know if further adjustments are needed",
  "please review and let me know",
  "i hope this helps",
  "this should resolve the issue",
  "this should address the issue",
  "this pr aims to",
  "this pull request aims to",
  "the purpose of this pr is to",
  "the goal of this pr is to",
  "additionally, this pr",
  "furthermore, this pr",
  "moreover, this pr",
];

function countWords(text: string): number {
  const trimmed = text.trim();
  if (trimmed.length === 0) return 0;
  return trimmed.split(/\s+/).length;
}

/**
 * Heuristic 2: real keyword/cliche-phrase detector over the PR description.
 *
 * Score scales with match *density* (matches per 60 words of description),
 * not just raw match count, so a long, otherwise-substantive description
 * that happens to contain one boilerplate phrase isn't penalized as hard as
 * a short description that is mostly boilerplate.
 */
export function scoreBoilerplateDescription(description: string): HeuristicResult {
  const id = "boilerplate-description";
  const label = "Boilerplate/generic description";
  const wordCount = countWords(description);

  if (wordCount === 0) {
    return {
      id,
      label,
      applicable: true,
      score: 0,
      weight: WEIGHT,
      reason:
        "Description is empty, so no boilerplate phrases were found. (An empty description is instead penalized by the diff-size/description-length heuristic.)",
    };
  }

  const lower = description.toLowerCase();
  const matches = BOILERPLATE_PHRASES.filter((phrase) => lower.includes(phrase));

  if (matches.length === 0) {
    return {
      id,
      label,
      applicable: true,
      score: 0,
      weight: WEIGHT,
      reason: `No boilerplate/cliche phrases detected in ${wordCount} word description.`,
    };
  }

  // Density: matches per 60 words. A description that is nothing but
  // boilerplate phrases packed together maxes out quickly; a long
  // description with an occasional cliche does not.
  const density = matches.length / Math.max(1, wordCount / 60);
  const score = Math.min(WEIGHT, Math.round(density * (WEIGHT / 2)));

  const preview = matches.slice(0, 4).map((m) => `"${m}"`).join(", ");
  const extra = matches.length > 4 ? ` (+${matches.length - 4} more)` : "";

  return {
    id,
    label,
    applicable: true,
    score,
    weight: WEIGHT,
    reason: `Found ${matches.length} boilerplate/cliche phrase match(es) in ${wordCount} word description: ${preview}${extra}.`,
  };
}
