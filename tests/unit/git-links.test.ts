import assert from "node:assert/strict";
import test from "node:test";
import { githubBranchUrl, githubCommitUrl } from "../../src/lib/git-links";

test("builds GitHub branch links for HTTPS remotes with slashy branch names", () => {
  assert.equal(
    githubBranchUrl("https://github.com/Mootbing/walkcode-prod-e2e-20260623173519.git", "walk-code/main"),
    "https://github.com/Mootbing/walkcode-prod-e2e-20260623173519/tree/walk-code/main",
  );
});

test("builds GitHub links for SSH remotes and skips unsupported remotes", () => {
  assert.equal(
    githubCommitUrl("git@github.com:Mootbing/Walk-Code.git", "1395b2e1c696390a58c08825fef61ef9c73cf9c8"),
    "https://github.com/Mootbing/Walk-Code/commit/1395b2e1c696390a58c08825fef61ef9c73cf9c8",
  );
  assert.equal(githubBranchUrl("https://example.com/Mootbing/Walk-Code.git", "main"), null);
});
