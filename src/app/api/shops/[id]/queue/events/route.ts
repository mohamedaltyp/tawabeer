import { NextRequest } from "next/server";
import { subscribeToShop, getShop, getActiveQueue, getQueueEntries } from "@/lib/db";

const sseConnectionCount = new Map<string, number>();
const MAX_SSE_PER_SHOP = 10;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const shop = getShop(id);
  if (!shop) return new Response("Shop not found", { status: 404 });

  // Rate limit: حد أقصى لاتصالات SSE لكل محل
  const current = sseConnectionCount.get(id) || 0;
  if (current >= MAX_SSE_PER_SHOP) {
    return new Response("Too many connections", { status: 429 });
  }
  sseConnectionCount.set(id, current + 1);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // Send initial queue state — نبعث كل الانترت عشان العميل يعرف لو اتنادى
      const waiting = getActiveQueue(id);
      const all = getQueueEntries(id);
      const called = all.filter((e) => e.status === "called");
      controller.enqueue(
        encoder.encode(`event: init\ndata: ${JSON.stringify({ queue: waiting, all, called })}\n\n`)
      );

      // Subscribe to new events
      const unsub = subscribeToShop(id, (message: string) => {
        try {
          controller.enqueue(encoder.encode(message));
        } catch {
          unsub();
        }
      });

      // Keep-alive every 30s
      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keepalive\n\n"));
        } catch {
          clearInterval(keepAlive);
          unsub();
        }
      }, 30000);

      // Cleanup on cancel
      req.signal.addEventListener("abort", () => {
        clearInterval(keepAlive);
        unsub();
        const count = sseConnectionCount.get(id) || 1;
        sseConnectionCount.set(id, Math.max(0, count - 1));
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
