"use client";

import { Send, Square, TerminalSquare } from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { Job, JobEvent, JobMessage } from "@/lib/types";

type Props = {
  initialJob: Job;
  initialEvents: JobEvent[];
  initialMessages: JobMessage[];
};

const terminalLevel = {
  debug: "text-zinc-500",
  info: "text-zinc-300",
  warn: "text-amber-300",
  error: "text-red-300",
};

export function JobConsole({ initialJob, initialEvents, initialMessages }: Props) {
  const [job, setJob] = useState(initialJob);
  const [events, setEvents] = useState(initialEvents);
  const [messages, setMessages] = useState(initialMessages);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const source = new EventSource(`/api/jobs/${initialJob.id}/events`);

    source.addEventListener("job-event", (event) => {
      const parsed = JSON.parse((event as MessageEvent).data) as JobEvent;
      setEvents((current) => (current.some((item) => item.id === parsed.id) ? current : [...current, parsed]));
    });

    source.addEventListener("job-state", (event) => {
      setJob(JSON.parse((event as MessageEvent).data) as Job);
    });

    return () => source.close();
  }, [initialJob.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [events.length]);

  const statusTone = useMemo(() => {
    if (job.status === "completed") return "border-cyan-600/40 bg-cyan-950 text-cyan-100";
    if (job.status === "failed" || job.status === "cancelled") return "border-red-600/40 bg-red-950 text-red-100";
    if (job.status === "conflict") return "border-orange-600/40 bg-orange-950 text-orange-100";
    return "border-emerald-600/40 bg-emerald-950 text-emerald-100";
  }, [job.status]);

  async function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;

    setSending(true);
    const response = await fetch(`/api/jobs/${job.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: trimmed, author: "operator" }),
    });

    if (response.ok) {
      const json = (await response.json()) as { message: JobMessage };
      setMessages((current) => [...current, json.message]);
      setBody("");
    }
    setSending(false);
  }

  async function cancelJob() {
    await fetch(`/api/jobs/${job.id}/cancel`, { method: "POST" });
  }

  return (
    <section className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="overflow-hidden rounded-md border border-zinc-800 bg-black">
        <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium text-zinc-100">
            <TerminalSquare className="h-4 w-4 text-emerald-300" />
            Worker stream
          </div>
          <span className={`rounded-md border px-2 py-1 text-xs font-medium ${statusTone}`}>{job.status.replaceAll("_", " ")}</span>
        </div>
        <div className="h-[62vh] overflow-y-auto px-4 py-3 font-mono text-xs leading-6">
          {events.map((event) => (
            <div key={event.id} className="grid gap-3 border-b border-zinc-900 py-2 sm:grid-cols-[180px_70px_1fr]">
              <span className="text-zinc-600">{new Date(event.createdAt).toLocaleTimeString()}</span>
              <span className={terminalLevel[event.level]}>{event.level}</span>
              <span className="whitespace-pre-wrap text-zinc-300">{event.message}</span>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      <aside className="space-y-5">
        <div className="rounded-md border border-zinc-800 bg-zinc-950 p-4">
          <h2 className="text-sm font-medium text-zinc-100">Steer Cloud Claude</h2>
          <form onSubmit={submitMessage} className="mt-3 space-y-3">
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              className="min-h-32 w-full resize-y rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none ring-0 placeholder:text-zinc-600 focus:border-emerald-600"
              placeholder="Type a follow-up instruction for the Railway worker."
            />
            <button
              type="submit"
              disabled={sending || !body.trim()}
              className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-emerald-500 px-3 text-sm font-medium text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
            >
              <Send className="h-4 w-4" />
              Send
            </button>
          </form>
        </div>

        <div className="rounded-md border border-zinc-800 bg-zinc-950 p-4">
          <h2 className="text-sm font-medium text-zinc-100">Messages</h2>
          <div className="mt-3 space-y-3">
            {messages.length ? (
              messages.map((message) => (
                <div key={message.id} className="rounded-md border border-zinc-800 bg-zinc-900 p-3">
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium text-zinc-300">{message.author}</span>
                    <span className="text-zinc-600">{message.consumed ? "consumed" : "queued"}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-5 text-zinc-400">{message.body}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-zinc-500">No steering messages yet.</p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={cancelJob}
          className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-zinc-800 bg-zinc-950 px-3 text-sm font-medium text-zinc-300 transition hover:border-red-600 hover:text-red-200"
        >
          <Square className="h-4 w-4" />
          Cancel
        </button>
      </aside>
    </section>
  );
}
