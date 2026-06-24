import { ArrowLeft, ExternalLink, GitCommitHorizontal, GitPullRequest, TerminalSquare, UserRound } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JobConsole } from "@/components/job-console";
import { LoginPanel } from "@/components/login-panel";
import { isDashboardAuthorized } from "@/lib/dashboard-auth";
import { githubBranchUrl, githubCommitUrl } from "@/lib/git-links";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isDashboardAuthorized())) return <LoginPanel />;

  const { id } = await params;
  const store = await getStore();
  const [job, events, messages] = await Promise.all([
    store.getJob(id),
    store.listEvents(id),
    store.listMessages(id),
  ]);

  if (!job) notFound();

  const branchUrl = githubBranchUrl(job.repoUrl, job.handoffBranch);
  const commitSha = job.handoffSha ?? job.currentSha;
  const commitUrl = githubCommitUrl(job.repoUrl, commitSha);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="border-b border-zinc-800 bg-zinc-950">
        <div className="mx-auto max-w-7xl px-5 py-6">
          <Link href="/" className="mb-5 inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-zinc-100">
            <ArrowLeft className="h-4 w-4" />
            Jobs
          </Link>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-2 text-xs text-zinc-500">
                <TerminalSquare className="h-4 w-4" />
                <span className="font-mono">{job.id}</span>
              </div>
              <h1 className="text-2xl font-semibold tracking-normal text-zinc-50">{job.title}</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">{job.summary.slice(0, 240)}</p>
            </div>
            <div className="grid gap-2 text-xs text-zinc-400">
              <div className="flex min-w-0 items-center gap-2 font-mono">
                <UserRound className="h-4 w-4 shrink-0 text-violet-300" />
                <span className="truncate">{job.enqueuedBy}</span>
              </div>
              <div className="flex items-center gap-2 font-mono">
                <GitPullRequest className="h-4 w-4 text-emerald-300" />
                {branchUrl ? (
                  <a
                    href={branchUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-emerald-200 underline-offset-4 transition hover:text-emerald-100 hover:underline"
                  >
                    {job.handoffBranch}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : (
                  job.handoffBranch
                )}
              </div>
              <div className="flex items-center gap-2 font-mono">
                <GitCommitHorizontal className="h-4 w-4 text-cyan-300" />
                {commitUrl ? (
                  <a
                    href={commitUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-cyan-200 underline-offset-4 transition hover:text-cyan-100 hover:underline"
                  >
                    {commitSha}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : (
                  commitSha
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <JobConsole initialJob={job} initialEvents={events} initialMessages={messages} />
    </main>
  );
}
