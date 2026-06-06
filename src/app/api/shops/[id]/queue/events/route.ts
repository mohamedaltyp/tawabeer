import { NextRequest } from "next/server";
import { subscribeToShop, getShop, getActiveQueue } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const shop = getShop(id);
  if (!shop) return new Response("Shop not found", { status: 404 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // Send initial queue state
      const queue = getActiveQueue(id);
      controller.enqueue(
        encoder.encode(`event: init\ndata: ${JSON.stringify({ queue })}\n\n`)
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
