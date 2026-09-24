import fs from "node:fs";
import path from "node:path";
import { Command } from "commander";
import { scorePR, DEFAULT_THRESHOLD, DEFAULT_LABEL } from "./scoring";
import { parseUnifiedDiff } from "./diffParser";
import { repoHasTestFiles } from "./repoScan";
import { formatPlainReport } from "./report";

function readTextFile(filePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), filePath), "utf8");
}

const program = new Command();

program
  .name("slopgate")
  .description(
    "SlopGate: score a PR's diff + description for cheap, deterministic AI-slop signals.",
  )
  .version("0.1.0");

program
  .command("score")
  .description("Score a local diff + description, for testing/tuning outside of CI.")
  .requiredOption("--diff <file>", "path to a unified diff file (e.g. `git diff > pr.diff`)")
  .requiredOption(
    "--description <file>",
    "path to a text file containing the PR description",
  )
  .option(
    "--repo <dir>",
    "path to the repo working tree, used to check whether it has test files anywhere " +
      "(if omitted, the no-tests-changed heuristic is skipped rather than guessed at)",
  )
  .option(
    "--prior-descriptions <file>",
    "path to a JSON file containing an array of prior PR description strings, " +
      "used for the template-similarity heuristic (if omitted, that heuristic is skipped)",
  )
  .option("--threshold <n>", "score (0-100) at/above which the label would apply", String(DEFAULT_THRESHOLD))
  .option("--label <name>", "label name to report", DEFAULT_LABEL)
  .option("--json", "print machine-readable JSON instead of the plain-text report")
  .action((opts) => {
    const diffText = readTextFile(opts.diff);
    const description = readTextFile(opts.description);
    const parsed = parseUnifiedDiff(diffText);

    const repoHasTests = opts.repo ? repoHasTestFiles(path.resolve(process.cwd(), opts.repo)) : undefined;

    let priorDescriptions: string[] | undefined;
    if (opts.priorDescriptions) {
      const raw = JSON.parse(readTextFile(opts.priorDescriptions));
      if (!Array.isArray(raw) || !raw.every((x) => typeof x === "string")) {
        throw new Error("--prior-descriptions file must contain a JSON array of strings");
      }
      priorDescriptions = raw;
    }

    const result = scorePR(
      {
        description,
        changedFiles: parsed.changedFiles,
        additions: parsed.additions,
        deletions: parsed.deletions,
        repoHasTests,
        priorDescriptions,
      },
      { threshold: Number(opts.threshold), label: opts.label },
    );

    if (opts.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(formatPlainReport(result));
    }

    process.exitCode = 0;
  });

program.parseAsync(process.argv).catch((err) => {
  console.error(`slopgate: ${(err as Error).message}`);
  process.exitCode = 1;
});
