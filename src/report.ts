import type { ScoreResult } from "./scoring/types";

function statusIcon(applicable: boolean, score: number): string {
  if (!applicable) return "-";
  return score > 0 ? "!" : "OK";
}

/**
 * Heuristic `reason` strings can embed attacker-controlled text verbatim
 * (e.g. a changed file's path, which a PR author fully controls). Since
 * these reasons get posted as a live PR comment, any markdown-significant
 * character in that text must be neutralized here - not just `|` for the
 * table syntax - or a crafted file/branch name like
 * `[Click here](https://evil.example/phish)x.test.ts` renders as a live
 * clickable link inside SlopGate's own bot comment.
 */
function escapeMarkdownTableCell(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\|/g, "\\|")
    .replace(/`/g, "\\`")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Plain-text itemized report, used by the CLI. */
export function formatPlainReport(result: ScoreResult): string {
  const lines: string[] = [];
  lines.push(`SlopGate score: ${result.score}/100 (label threshold: ${result.threshold})`);
  lines.push(
    result.label
      ? `Result: would apply label "${result.label}"`
      : "Result: would NOT apply a label",
  );
  lines.push("");
  lines.push("Itemized reasoning:");
  for (const h of result.heuristics) {
    const scoreText = h.applicable ? `${h.score}/${h.weight}` : `skipped (weight ${h.weight})`;
    lines.push(`  [${statusIcon(h.applicable, h.score)}] ${h.label} - ${scoreText}`);
    lines.push(`      ${h.reason}`);
  }
  return lines.join("\n");
}

/** Markdown itemized report, used in the GitHub Action's job summary and PR comment. */
export function formatMarkdownReport(result: ScoreResult, labelName: string): string {
  const lines: string[] = [];
  lines.push(`### SlopGate: composite score ${result.score}/100`);
  lines.push("");
  lines.push(
    result.label
      ? `Applied label \`${labelName}\` (score >= threshold ${result.threshold}).`
      : `No label applied (score < threshold ${result.threshold}).`,
  );
  lines.push("");
  lines.push("| Heuristic | Score | Reasoning |");
  lines.push("| --- | --- | --- |");
  for (const h of result.heuristics) {
    const scoreText = h.applicable ? `${h.score}/${h.weight}` : `skipped`;
    lines.push(`| ${h.label} | ${scoreText} | ${escapeMarkdownTableCell(h.reason)} |`);
  }
  lines.push("");
  lines.push(
    "_SlopGate is a narrow triage heuristic, not a code review. A label here is a hint for maintainers, not a verdict. See this repo's README `Limitations` section for what this tool can't do._",
  );
  return lines.join("\n");
}
