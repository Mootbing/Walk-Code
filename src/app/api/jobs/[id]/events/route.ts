import { isApiAuthorized, unauthorized } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const encoder = new TextEncoder();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isApiAuthorized(request)) return unauthorized();

  const { id } = await params;
  const url = new URL(request.url);
  let afterId = url.searchParams.get("after");
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      request.signal.addEventListener("abort", () => {
        closed = true;
        controller.close();
      });

      while (!closed) {
        const store = await getStore();
        const events = await store.listEvents(id, afterId);
        for (const event of events) {
          afterId = event.id;
          controller.enqueue(encoder.encode(`id: ${event.id}\n`));
          controller.enqueue(encoder.encode(`event: job-event\n`));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        }

        const job = await store.getJob(id);
        if (job) {
          controller.enqueue(encoder.encode(`event: job-state\n`));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(job)}\n\n`));
        }

        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream",
    },
  });
}
