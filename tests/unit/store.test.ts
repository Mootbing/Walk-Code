import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

test("file store manages the job lifecycle", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "walk-store-"));
  process.env.WALK_DATA_FILE = path.join(tempDir, "db.json");
  delete process.env.DATABASE_URL;

  const { getStore } = await import("../../src/lib/store");
  const store = await getStore();

  try {
    const job = await store.createJob({
      id: "job_unit",
      title: "Unit lifecycle",
      repoUrl: "/tmp/repo.git",
      sourceBranch: "main",
      handoffBranch: "walk-code/main",
      currentSha: "abc123",
      handoffSha: "def456",
      enqueuedBy: "unit-test",
      summary: "Finish the work.",
    });

    assert.equal(job.status, "queued");
    assert.equal(job.enqueuedBy, "unit-test");
    assert.equal(job.resultBranch, "walk-code/main");

    const jobs = await store.listJobs();
    assert.equal(jobs.length, 1);
    assert.equal(jobs[0].id, "job_unit");
    assert.equal(jobs[0].enqueuedBy, "unit-test");

    const claimed = await store.claimNextJob("worker-unit");
    assert.equal(claimed?.status, "running");
    assert.equal(claimed?.workerId, "worker-unit");

    const event = await store.addEvent("job_unit", "info", "hello");
    const events = await store.listEvents("job_unit");
    assert.ok(events.some((item) => item.id === event.id));

    const message = await store.addMessage("job_unit", "operator", "steer this way");
    assert.equal(message.consumed, false);

    const pendingMessages = await store.listMessages("job_unit", true);
    assert.equal(pendingMessages.length, 1);

    await store.markMessagesConsumed("job_unit", [message.id]);
    assert.equal((await store.listMessages("job_unit", true)).length, 0);

    const conflicted = await store.markConflict("job_unit", "walk-code/conflicts/job_unit-main", "resolve this");
    assert.equal(conflicted?.status, "conflict");
    assert.equal(conflicted?.conflictBranch, "walk-code/conflicts/job_unit-main");

    const completed = await store.updateJobStatus("job_unit", "completed", { handoffSha: "fff999" });
    assert.equal(completed?.status, "completed");
    assert.equal(completed?.handoffSha, "fff999");
    assert.ok(completed?.completedAt);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
