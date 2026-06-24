"use client";

import {
  Activity,
  AlertCircle,
  ArrowDownAZ,
  ArrowUpDown,
  ArrowUpZA,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Funnel,
  GitBranch,
  Github,
  Search,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { ComponentType } from "react";
import { repoLabel } from "@/lib/git-links";
import type { Job, JobStatus } from "@/lib/types";

type SortKey = "title" | "repo" | "status" | "enqueuedBy" | "branch" | "updatedAt";
type SortDirection = "asc" | "desc";
type DateFilter = "all" | "today" | "seven-days";

type SortState = {
  key: SortKey;
  direction: SortDirection;
};

type Props = {
  jobs: Job[];
};

const statusIcon: Record<JobStatus, ComponentType<{ className?: string }>> = {
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

const statusRank: Record<JobStatus, number> = {
  running: 0,
  waiting_for_input: 1,
  conflict: 2,
  queued: 3,
  completed: 4,
  failed: 5,
  cancelled: 6,
};

const gridClass =
  "lg:grid-cols-[minmax(0,1fr)_minmax(0,180px)_120px_150px_minmax(0,1fr)_150px]";

function StatusBadge({ status }: { status: JobStatus }) {
  const Icon = statusIcon[status];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium ${statusClass[status]}`}>
      <Icon className="h-3.5 w-3.5" />
      {status.replaceAll("_", " ")}
    </span>
  );
}

function isToday(date: Date) {
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
}

function isWithinSevenDays(date: Date) {
  return Date.now() - date.getTime() <= 7 * 24 * 60 * 60 * 1000;
}

function sortValue(job: Job, key: SortKey) {
  if (key === "repo") return repoLabel(job.repoUrl).toLocaleLowerCase();
  if (key === "status") return statusRank[job.status];
  if (key === "branch") return job.handoffBranch.toLocaleLowerCase();
  if (key === "updatedAt") return new Date(job.updatedAt).getTime();
  return job[key].toLocaleLowerCase();
}

function searchableText(job: Job) {
  return [
    job.id,
    job.title,
    job.status,
    job.repoUrl,
    repoLabel(job.repoUrl),
    job.sourceBranch,
    job.handoffBranch,
    job.resultBranch,
    job.currentSha,
    job.handoffSha,
    job.enqueuedBy,
    job.summary,
    job.workerId,
    job.error,
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase();
}

function SortButton({
  active,
  direction,
  label,
  onClick,
}: {
  active: boolean;
  direction: SortDirection;
  label: string;
  onClick: () => void;
}) {
  const Icon = active ? (direction === "asc" ? ArrowDownAZ : ArrowUpZA) : ArrowUpDown;

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-w-0 items-center gap-1.5 text-left uppercase tracking-normal transition hover:text-zinc-200"
    >
      <span className="truncate">{label}</span>
      <Icon className="h-3.5 w-3.5 shrink-0" />
    </button>
  );
}

function JobRow({ job }: { job: Job }) {
  const repo = repoLabel(job.repoUrl);

  return (
    <Link
      href={`/jobs/${job.id}`}
      className={`grid gap-3 border-b border-zinc-800 px-4 py-4 transition hover:bg-zinc-900/70 ${gridClass}`}
    >
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-zinc-100">{job.title}</div>
        <div className="mt-1 font-mono text-xs text-zinc-500">{job.id}</div>
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <Github className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
          <span className="truncate font-mono">{repo}</span>
        </div>
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
          <GitBranch className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
          <span className="truncate font-mono">{job.handoffBranch}</span>
        </div>
        {job.conflictBranch ? (
          <div className="mt-1 truncate font-mono text-xs text-orange-300">{job.conflictBranch}</div>
        ) : null}
      </div>
      <div className="text-xs text-zinc-500 lg:text-right">{new Date(job.updatedAt).toLocaleString()}</div>
    </Link>
  );
}

export function JobsTable({ jobs }: Props) {
  const [sort, setSort] = useState<SortState>({ key: "updatedAt", direction: "desc" });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [repo, setRepo] = useState("all");
  const [actor, setActor] = useState("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");

  const repos = useMemo(() => [...new Set(jobs.map((job) => repoLabel(job.repoUrl)))].sort(), [jobs]);
  const actors = useMemo(() => [...new Set(jobs.map((job) => job.enqueuedBy))].sort(), [jobs]);

  const visibleJobs = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();

    return jobs
      .filter((job) => {
        const updated = new Date(job.updatedAt);
        if (repo !== "all" && repoLabel(job.repoUrl) !== repo) return false;
        if (actor !== "all" && job.enqueuedBy !== actor) return false;
        if (dateFilter === "today" && !isToday(updated)) return false;
        if (dateFilter === "seven-days" && !isWithinSevenDays(updated)) return false;
        return !needle || searchableText(job).includes(needle);
      })
      .sort((a, b) => {
        const aValue = sortValue(a, sort.key);
        const bValue = sortValue(b, sort.key);
        const result = typeof aValue === "number" && typeof bValue === "number"
          ? aValue - bValue
          : String(aValue).localeCompare(String(bValue));
        return sort.direction === "asc" ? result : -result;
      });
  }, [actor, dateFilter, jobs, query, repo, sort]);

  const activeFilterCount = [query.trim(), repo !== "all", actor !== "all", dateFilter !== "all"].filter(Boolean).length;

  function setSortKey(key: SortKey) {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  }

  function clearFilters() {
    setQuery("");
    setRepo("all");
    setActor("all");
    setDateFilter("all");
  }

  return (
    <div className="overflow-hidden rounded-md border border-zinc-800 bg-zinc-950">
      <div className="flex flex-col gap-3 border-b border-zinc-800 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFiltersOpen((value) => !value)}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm font-medium text-zinc-200 transition hover:border-zinc-500"
          >
            <Funnel className="h-4 w-4" />
            Filter
            {activeFilterCount ? <span className="font-mono text-xs text-emerald-300">{activeFilterCount}</span> : null}
          </button>
          {activeFilterCount ? (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-zinc-800 px-3 text-sm text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-100"
            >
              <X className="h-4 w-4" />
              Clear
            </button>
          ) : null}
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <CalendarClock className="h-4 w-4" />
          <span className="font-mono">
            {visibleJobs.length}/{jobs.length}
          </span>
        </div>
      </div>

      {filtersOpen ? (
        <div className="grid gap-3 border-b border-zinc-800 bg-zinc-950 px-4 py-4 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_160px]">
          <label className="relative min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-10 w-full rounded-md border border-zinc-800 bg-zinc-900 pl-9 pr-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-emerald-600"
              placeholder="Filter anything"
            />
          </label>
          <select
            value={repo}
            onChange={(event) => setRepo(event.target.value)}
            className="h-10 min-w-0 rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none focus:border-emerald-600"
          >
            <option value="all">All repos</option>
            {repos.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select
            value={actor}
            onChange={(event) => setActor(event.target.value)}
            className="h-10 min-w-0 rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none focus:border-emerald-600"
          >
            <option value="all">All enqueuers</option>
            {actors.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select
            value={dateFilter}
            onChange={(event) => setDateFilter(event.target.value as DateFilter)}
            className="h-10 min-w-0 rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none focus:border-emerald-600"
          >
            <option value="all">Any change</option>
            <option value="today">Changed today</option>
            <option value="seven-days">Last 7 days</option>
          </select>
        </div>
      ) : null}

      <div className={`hidden border-b border-zinc-800 px-4 py-3 text-xs font-medium text-zinc-500 lg:grid ${gridClass}`}>
        <SortButton active={sort.key === "title"} direction={sort.direction} label="Task" onClick={() => setSortKey("title")} />
        <SortButton active={sort.key === "repo"} direction={sort.direction} label="Repo" onClick={() => setSortKey("repo")} />
        <SortButton active={sort.key === "status"} direction={sort.direction} label="Status" onClick={() => setSortKey("status")} />
        <SortButton active={sort.key === "enqueuedBy"} direction={sort.direction} label="Enqueued by" onClick={() => setSortKey("enqueuedBy")} />
        <SortButton active={sort.key === "branch"} direction={sort.direction} label="Branch" onClick={() => setSortKey("branch")} />
        <div className="flex justify-end">
          <SortButton active={sort.key === "updatedAt"} direction={sort.direction} label="Updated" onClick={() => setSortKey("updatedAt")} />
        </div>
      </div>

      {visibleJobs.length ? (
        visibleJobs.map((job) => <JobRow key={job.id} job={job} />)
      ) : (
        <div className="px-4 py-12 text-center text-sm text-zinc-500">
          {jobs.length ? (
            <span>No jobs match the current filters.</span>
          ) : (
            <span>
              No handoffs yet. Run <span className="font-mono text-zinc-300">/walkcode</span> from Claude or the WalkCode skill from Codex.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
