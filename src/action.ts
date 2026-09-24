import * as core from "@actions/core";
import * as github from "@actions/github";
import { scorePR, DEFAULT_LABEL, DEFAULT_THRESHOLD, isTestFilePath } from "./scoring";
import { formatMarkdownReport, formatPlainReport } from "./report";

/**
 * GitHub Action entrypoint. Honest about what it does and does not do:
 *
 * - It reads the PR's changed files + description via the REST API.
 * - It computes a deterministic composite score (see src/scoring).
 * - If the score is at/above the threshold, it applies a label via the
 *   Issues API, and optionally posts a comment with the itemized reasoning.
 *
 * It does NOT and CANNOT suppress the initial GitHub notification that
 * watchers already received when the PR was opened - GitHub fires that
 * notification before any Action runs. This only acts *after* the fact:
 * labeling (and, if you wire it up yourself, moving a Projects card).
 *
 * It also does NOT attempt to detect hallucinated API calls / nonexistent
 * symbols - that would require full per-language static type/symbol
 * resolution across the target codebase, which is out of scope for this
 * tool (see README Limitations).
 */
async function run(): Promise<void> {
  try {
    const token = core.getInput("github-token", { required: true });
    const thresholdInput = core.getInput("threshold");
    const threshold = thresholdInput ? Number(thresholdInput) : DEFAULT_THRESHOLD;
    const labelName = core.getInput("label") || DEFAULT_LABEL;
    const postComment = core.getInput("comment") !== "false";

    const octokit = github.getOctokit(token);
    const { context } = github;
    const pullRequest = context.payload.pull_request;

    if (!pullRequest) {
      core.setFailed("SlopGate: this action must be triggered by a pull_request event.");
      return;
    }

    const owner = context.repo.owner;
    const repo = context.repo.repo;
    const prNumber = pullRequest.number;

    const files = await octokit.paginate(octokit.rest.pulls.listFiles, {
      owner,
      repo,
      pull_number: prNumber,
      per_page: 100,
    });
    const changedFiles = files.map((f) => f.filename);
    const additions = files.reduce((sum, f) => sum + f.additions, 0);
    const deletions = files.reduce((sum, f) => sum + f.deletions, 0);

    // Establish whether the repo has tests anywhere, using the default
    // branch's tree - real ground truth, not a guess.
    let repoHasTests: boolean | undefined;
    try {
      const repoInfo = await octokit.rest.repos.get({ owner, repo });
      const defaultBranch = repoInfo.data.default_branch;
      const branchInfo = await octokit.rest.repos.getBranch({ owner, repo, branch: defaultBranch });
      const tree = await octokit.rest.git.getTree({
        owner,
        repo,
        tree_sha: branchInfo.data.commit.sha,
        recursive: "true",
      });
      repoHasTests = tree.data.tree.some((item) => item.path && isTestFilePath(item.path));
    } catch (err) {
      core.warning(
        `SlopGate: could not determine repo test baseline, skipping that heuristic: ${(err as Error).message}`,
      );
    }

    // Fetch prior PR descriptions for the template-similarity heuristic.
    let priorDescriptions: string[] = [];
    try {
      const priorPRs = await octokit.rest.pulls.list({
        owner,
        repo,
        state: "all",
        per_page: 20,
        sort: "created",
        direction: "desc",
      });
      priorDescriptions = priorPRs.data
        .filter((p) => p.number !== prNumber)
        .map((p) => p.body || "")
        .filter((body) => body.trim().length > 0);
    } catch (err) {
      core.warning(
        `SlopGate: could not fetch prior PR descriptions, skipping that heuristic: ${(err as Error).message}`,
      );
    }

    const result = scorePR(
      {
        description: pullRequest.body || "",
        changedFiles,
        additions,
        deletions,
        repoHasTests,
        priorDescriptions,
      },
      { threshold, label: labelName },
    );

    core.info(formatPlainReport(result));
    core.setOutput("score", String(result.score));
    core.setOutput("label-applied", String(Boolean(result.label)));

    try {
      await core.summary.addRaw(formatMarkdownReport(result, labelName)).write();
    } catch (err) {
      core.warning(`SlopGate: could not write job summary: ${(err as Error).message}`);
    }

    if (result.label) {
      await octokit.rest.issues.addLabels({
        owner,
        repo,
        issue_number: prNumber,
        labels: [labelName],
      });

      if (postComment) {
        await octokit.rest.issues.createComment({
          owner,
          repo,
          issue_number: prNumber,
          body: formatMarkdownReport(result, labelName),
        });
      }
    }
  } catch (err) {
    core.setFailed(`SlopGate failed: ${(err as Error).message}`);
  }
}

run();
