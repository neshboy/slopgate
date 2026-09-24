# SlopGate

SlopGate is a small, honest GitHub Action (plus a local CLI) that scores an incoming pull request for a handful of cheap, deterministic "AI-slop" signals — no tests touched, boilerplate description, a huge diff paired with a near-empty description, a description that looks reused from a prior PR — and applies a label so maintainers can triage a flood of low-effort PRs faster. It is a narrow triage aid, not an autonomous reviewer: it never auto-merges, auto-closes, or auto-rejects anything, and every score comes with an itemized, human-readable breakdown instead of a bare number.

## What it actually does

For each PR, SlopGate runs four independent, deterministic heuristics:

1. **No tests changed** — does the diff touch any file matching common test conventions (`**/*.test.*`, `**/*.spec.*`, `**/test/**`, `**/tests/**`, `**/__tests__/**`), given the repo demonstrably has test files elsewhere? If the repo has no tests at all, this heuristic is skipped so it never unfairly punishes a legitimately untested project.
2. **Boilerplate/generic description** — a real keyword/cliche-phrase detector (see `src/scoring/boilerplateDescription.ts` for the full phrase list) that scores match *density*, not just raw hits.
3. **Diff-size vs. description-length ratio** — flags PRs with a large diff and a near-empty description. Small diffs are exempt; nobody needs a paragraph to explain a five-line fix.
4. **Description similarity to a prior PR** — compares the description against recent PR descriptions in the same repo using a normalized bigram (Dice coefficient) similarity check, to catch a reused template/prompt. This only runs where prior descriptions are actually available (the GitHub Action fetches them via the REST API; the CLI only runs it if you pass `--prior-descriptions`).

Each heuristic contributes points toward a composite 0–100 score, normalized only across the heuristics that actually had enough data to run (see "Graceful skipping" below). Above a configurable threshold (default `60`), SlopGate applies a label (default `possible-ai-slop`) via the GitHub Issues API and posts the itemized breakdown as a PR comment and job summary.

**Graceful skipping:** if a heuristic doesn't have the data it needs — the repo has no tests at all, or there are no prior PRs to compare against — it's marked "skipped" and excluded from the score entirely, rather than guessed at or scored as zero. The itemized output always tells you which heuristics ran and why.

## What it honestly can't do

SlopGate is deliberately narrow. Two things it does **not** do, on purpose:

- **It cannot reliably detect hallucinated API calls.** Reliably telling whether a function/method call actually exists would require full per-language static type and symbol resolution across the entire target codebase — that's a real static-analysis project, not something a regex or heuristic can do honestly. SlopGate does not attempt this at all. If you're looking for that, you want a real type checker / linter for your language, not this tool.
- **It cannot suppress or replace the initial GitHub notification.** GitHub notifies repo watchers the moment a PR is opened — before any GitHub Action can even start running. SlopGate (or any bot) cannot intercept, delay, or cancel that first notification. All SlopGate can do is act *after* the fact: apply a label, and — if you wire it up yourself with a Projects workflow — move the PR's card to a lower-priority column. It does not, and structurally cannot, keep a low-effort PR out of your inbox in the first place.

See [Limitations](#limitations) below for the full list.

## Install / quick start (GitHub Action)

Create `.github/workflows/slopgate.yml` in the repo you want to triage:

```yaml
name: SlopGate
on:
  pull_request:
    types: [opened, edited, synchronize]

permissions:
  pull-requests: write
  issues: write
  contents: read

jobs:
  slopgate:
    runs-on: ubuntu-latest
    steps:
      - uses: neshboy/slopgate@v0
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          # label: possible-ai-slop
          # threshold: '60'
          # comment: 'true'
```

That's it — no build step, no extra dependencies. The Action ships as a committed, pre-bundled `dist/action.cjs`.

### Outputs

| Output | Description |
| --- | --- |
| `score` | Composite score, `0`–`100`. |
| `label-applied` | `"true"` or `"false"`. |

## Quick start (CLI, for local testing)

```bash
npm install
npm run build

# Score a local diff + description without touching GitHub at all:
git diff main... > /tmp/pr.diff
echo "Fixes the retry backoff off-by-one." > /tmp/desc.txt
node dist/cli.cjs score --diff /tmp/pr.diff --description /tmp/desc.txt --repo .
```

Useful flags:

- `--repo <dir>` — scan a local working tree so the "no tests changed" heuristic has real ground truth about whether the repo has tests anywhere (otherwise it's skipped).
- `--prior-descriptions <file.json>` — a JSON array of prior PR description strings, to enable the template-similarity heuristic locally.
- `--threshold <n>` / `--label <name>` — override the defaults for local experimentation.
- `--json` — machine-readable output instead of the plain-text report.

## Example output

A deliberately slop-like PR (huge diff, no tests, boilerplate description reused from a prior PR) produces something like:

```
SlopGate score: 94/100 (label threshold: 60)
Result: would apply label "possible-ai-slop"

Itemized reasoning:
  [!] No tests changed - 30/30
      This repository has test files elsewhere, but this PR does not touch any file
      matching common test path conventions (**/*.test.*, **/*.spec.*, **/test(s)/**,
      **/__tests__/**).
  [!] Boilerplate/generic description - 25/25
      Found 7 boilerplate/cliche phrase match(es) in 38 word description:
      "this pr enhances", "this update also includes", "enhances the overall",
      "streamlines the process" (+3 more).
  [!] Diff-size vs. description-length ratio - 14/20
      Diff changes 860 lines but the description is only 38 word(s)
      (~22.6 changed lines per word).
  [!] Description similarity to a prior PR - 25/25
      Description is 97% similar (normalized bigram overlap) to a prior PR
      description (#1 of 2 compared), suggesting reused template/prompt text.
```

On a GitHub PR, this results in the `possible-ai-slop` label being applied and a comment with the same itemized breakdown, plus a matching entry in the Action's job summary. A small, focused PR with a specific description and a real test-file change scores near `0` and gets no label at all — see `test/fixtures/legit-pr.ts` for a worked example.

## Limitations

This is a deliberately small, honest v1. Known limitations:

- **No hallucinated-API detection.** See above — not implemented, not planned for this tool. Doing it reliably needs real static analysis, not heuristics.
- **No notification suppression.** SlopGate labels and can help you deprioritize (e.g. via a GitHub Projects automation you set up yourself), but it does **not** and **cannot** stop the initial GitHub notification that goes out the moment a PR is opened.
- **Heuristics are shallow by design.** All four signals are textual/structural, not semantic. A well-written AI-assisted PR with a specific description and real tests will (correctly) score low. A terse but legitimate human PR with a huge diff and a short description may score higher than it "deserves" — that's why the score is always itemized, not just a verdict, and why the label is `possible-ai-slop`, not `definitely-ai-slop`.
- **Template-similarity needs history.** The GitHub Action fetches up to 20 recent PRs from the same repo to compare against; a brand-new repo with few prior PRs will mostly skip this heuristic.
- **English-language phrase list.** The boilerplate/cliche detector (`src/scoring/boilerplateDescription.ts`) is only tuned for English phrasing.
- **No content-based diff analysis.** SlopGate looks at file paths and line counts, not the actual code changes — it has no opinion on whether the code itself is correct, tested well, or good.
- **Never auto-closes, auto-rejects, or auto-merges.** By design. The most it ever does is apply a label and post a comment.

## Development

```bash
npm install
npm run typecheck   # tsc --noEmit
npm test            # vitest run
npm run build        # tsup -> dist/action.cjs, dist/cli.cjs
```

## License

MIT, see [LICENSE](./LICENSE).
