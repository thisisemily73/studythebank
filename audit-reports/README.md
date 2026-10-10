# Question audit reports

Generated audit output lives here so it stays separate from application source data.

Run `node --env-file=.env questionScanner.mjs` for a small sample (5 questions by default), or `node --env-file=.env questionScanner.mjs --all` to audit and repair the full bank. Set `QUESTION_AUDIT_LIMIT` to choose a different sample size. Add `--apply` to the full run to activate the candidate only if every issue was repaired and the final local checks are clean.

The scanner saves resumable progress to `questionAudit.checkpoint.json`. `questionFixes.test.json` contains proposed corrections. A proposal is marked `verified_fix` only after structural checks and a second AI review pass. Other proposals are marked `needs_human_review`. A full run creates `questionBank.candidate.json`; it preserves all questions and only replaces the live bank when `--apply` is supplied and its final validation passes.
