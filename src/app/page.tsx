import { Activity, AlertCircle, CheckCircle2, Clock3, GitBranch, PlayCircle, UserRound } from "lucide-react";
import Link from "next/link";
import { LoginPanel } from "@/components/login-panel";
import { isDashboardAuthorized } from "@/lib/dashboard-auth";
import { getStore } from "@/lib/store";
import type { Job, JobStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const statusIcon: Record<JobStatus, React.ComponentType<{ className?: string }>> = {
  queued: Clock3,
  running: Activity,
  waiting_for_input: Clock3,
  conflict: AlertCircle,
  completed: CheckCircle2,
  failed: AlertCircle,
  cancelled: AlertCircle,
};

const statusClass: Record<JobStatus, string> = {
  queued: "border-zinc-700 bg-zinc-900 text-zinc-300",
  running: "border-emerald-600/40 bg-emerald-950 text-emerald-200",
  waiting_for_input: "border-amber-600/40 bg-amber-950 text-amber-200",
  conflict: "border-orange-600/40 bg-orange-950 text-orange-200",
  completed: "border-cyan-600/40 bg-cyan-950 text-cyan-200",
  failed: "border-red-600/40 bg-red-950 text-red-200",
  cancelled: "border-zinc-700 bg-zinc-900 text-zinc-400",
};

function StatusBadge({ status }: { status: JobStatus }) {
  const Icon = statusIcon[status];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium ${statusClass[status]}`}>
      <Icon className="h-3.5 w-3.5" />
      {status.replaceAll("_", " ")}
    </span>
  );
}

function JobRow({ job }: { job: Job }) {
  return (
    <Link
      href={`/jobs/${job.id}`}
      className="grid gap-3 border-b border-zinc-800 px-4 py-4 transition hover:bg-zinc-900/70 md:grid-cols-[minmax(0,1.1fr)_130px_170px_minmax(0,1fr)_160px]"
    >
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-zinc-100">{job.title}</div>
        <div className="mt-1 font-mono text-xs text-zinc-500">{job.id}</div>
      </div>
      <div>
        <StatusBadge status={job.status} />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <UserRound className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
          <span className="truncate font-mono">{job.enqueuedBy}</span>
        </div>
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <GitBranch className="h-3.5 w-3.5 text-zinc-500" />
          <span className="truncate font-mono">{job.handoffBranch}</span>
        </div>
        {job.conflictBranch ? (
          <div className="mt-1 truncate font-mono text-xs text-orange-300">{job.conflictBranch}</div>
        ) : null}
      </div>
      <div className="text-xs text-zinc-500 md:text-right">{new Date(job.updatedAt).toLocaleString()}</div>
    </Link>
  );
}

export default async function Home() {
  if (!(await isDashboardAuthorized())) return <LoginPanel />;

  const store = await getStore();
  const jobs = await store.listJobs();
  const active = jobs.filter((job) => ["queued", "running", "waiting_for_input", "conflict"].includes(job.status)).length;
  const completed = jobs.filter((job) => job.status === "completed").length;
  const failed = jobs.filter((job) => job.status === "failed").length;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="border-b border-zinc-800 bg-zinc-950">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-8 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-md border border-emerald-700/40 bg-emerald-950 px-2.5 py-1 text-xs font-medium text-emerald-200">
              <PlayCircle className="h-3.5 w-3.5" />
              Railway worker control plane
            </div>
            <h1 className="text-3xl font-semibold tracking-normal text-zinc-50">WalkCode Jobs</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              Local agents hand off unfinished work here, the Railway worker runs Claude Code on the branch, and the local CLI polls until it can sync the result back.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-md border border-zinc-800 bg-zinc-900 px-4 py-3">
              <div className="font-mono text-2xl text-zinc-50">{active}</div>
              <div className="text-xs text-zinc-500">active</div>
            </div>
            <div className="rounded-md border border-zinc-800 bg-zinc-900 px-4 py-3">
              <div className="font-mono text-2xl text-cyan-200">{completed}</div>
              <div className="text-xs text-zinc-500">done</div>
            </div>
            <div className="rounded-md border border-zinc-800 bg-zinc-900 px-4 py-3">
              <div className="font-mono text-2xl text-red-200">{failed}</div>
              <div className="text-xs text-zinc-500">failed</div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-6">
        <div className="overflow-hidden rounded-md border border-zinc-800 bg-zinc-950">
          <div className="grid border-b border-zinc-800 px-4 py-3 text-xs font-medium uppercase tracking-normal text-zinc-500 md:grid-cols-[minmax(0,1.1fr)_130px_170px_minmax(0,1fr)_160px]">
            <div>Task</div>
            <div className="hidden md:block">Status</div>
            <div className="hidden md:block">Enqueued by</div>
            <div className="hidden md:block">Branch</div>
            <div className="hidden md:block md:text-right">Updated</div>
          </div>
          {jobs.length ? (
            jobs.map((job) => <JobRow key={job.id} job={job} />)
          ) : (
            <div className="px-4 py-12 text-center text-sm text-zinc-500">
              No handoffs yet. Run <span className="font-mono text-zinc-300">/walkcode</span> from Claude or the WalkCode skill from Codex.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
