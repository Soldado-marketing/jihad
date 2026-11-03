#!/usr/bin/env sh
# Writes the PR state file that docs/tools/progress_panel.py reads (--prs).
# Usage: sh docs/tools/fetch_prs.sh > prs.json      (needs gh, authenticated)
# Shape per PR: n, state (OPEN|CLOSED|MERGED), draft, merged, ci (SUCCESS|FAILURE|PENDING|none)
set -eu
gh pr list --state all --limit 40 --json number,state,isDraft,mergedAt,statusCheckRollup --jq '
  [.[] | {
    n: .number,
    state: .state,
    draft: .isDraft,
    merged: (.mergedAt != null),
    ci: (
      if ([.statusCheckRollup[]?] | length) == 0 then "none"
      elif ([.statusCheckRollup[]? | select(.status != "COMPLETED")] | length) > 0 then "PENDING"
      elif ([.statusCheckRollup[]? | select(.conclusion == "FAILURE" or .conclusion == "ERROR" or .conclusion == "TIMED_OUT" or .conclusion == "CANCELLED")] | length) > 0 then "FAILURE"
      else "SUCCESS" end)
  }]'
