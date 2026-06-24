export type JobStatus =
  | "queued"
  | "running"
  | "waiting_for_input"
  | "conflict"
  | "completed"
  | "failed"
  | "cancelled";

export type Job = {
  id: string;
  title: string;
  status: JobStatus;
  repoUrl: string;
  sourceBranch: string;
  handoffBranch: string;
  resultBranch: string;
  currentSha: string;
  handoffSha: string | null;
  enqueuedBy: string;
  summary: string;
  conflictBranch: string | null;
  workerId: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export type JobEvent = {
  id: string;
  jobId: string;
  level: "debug" | "info" | "warn" | "error";
  message: string;
  createdAt: string;
};

export type JobMessage = {
  id: string;
  jobId: string;
  author: "local-agent" | "operator" | "worker";
  body: string;
  consumed: boolean;
  createdAt: string;
};

export type CreateJobInput = {
  id?: string;
  title: string;
  repoUrl: string;
  sourceBranch: string;
  handoffBranch: string;
  resultBranch?: string;
  currentSha: string;
  handoffSha?: string | null;
  enqueuedBy?: string;
  summary: string;
};

export type Store = {
  createJob(input: CreateJobInput): Promise<Job>;
  listJobs(): Promise<Job[]>;
  getJob(id: string): Promise<Job | null>;
  claimNextJob(workerId: string): Promise<Job | null>;
  updateJobStatus(
    id: string,
    status: JobStatus,
    patch?: Partial<Pick<Job, "error" | "handoffSha" | "workerId">>,
  ): Promise<Job | null>;
  markConflict(id: string, conflictBranch: string, body: string): Promise<Job | null>;
  addEvent(jobId: string, level: JobEvent["level"], message: string): Promise<JobEvent>;
  listEvents(jobId: string, afterId?: string | null): Promise<JobEvent[]>;
  addMessage(jobId: string, author: JobMessage["author"], body: string): Promise<JobMessage>;
  listMessages(jobId: string, onlyUnconsumed?: boolean): Promise<JobMessage[]>;
  markMessagesConsumed(jobId: string, ids: string[]): Promise<void>;
};
