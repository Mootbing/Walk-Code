import { PlayCircle } from "lucide-react";
import { JobsTable } from "@/components/jobs-table";
import { LoginPanel } from "@/components/login-panel";
import { isDashboardAuthorized } from "@/lib/dashboard-auth";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
        <JobsTable jobs={jobs} />
      </section>
    </main>
  );
}
