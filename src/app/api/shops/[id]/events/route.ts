import {
  getActiveQueue,
  getShop,
  getQueueStats,
  ensureMigrated,
} from "@/lib/db";
import type { QueueEntry } from "@/lib/db";

export const dynamic = "force-dynamic";

// ─── Change Detection ────────────────────────────

interface QueueSnapshot {
  entries: QueueEntry[];
  stats: { waiting: number; today_total: number; avg_wait_minutes: number };
  shopCurrentNumber: number;
}

function serializeEntry(e: QueueEntry) {
  return {
    id: e.id,
    number: e.number,
    status: e.status,
    customer_name: e.customer_name,
    estimated_wait: e.estimated_wait,
    recall_count: e.recall_count,
    counter_id: e.counter_id,
    created_at: e.created_at,
    called_at: e.called_at,
    completed_at: e.completed_at,
  };
}

/**
 * Detect which changes occurred between the previous and current snapshots.
 * Returns an array of SSE event objects: { type, data }.
 */
function diffSnapshots(
  prev: QueueSnapshot | null,
  curr: QueueSnapshot
): Array<{ type: string; data: unknown }> {
  const events: Array<{ type: string; data: unknown }> = [];

  if (!prev) {
    // First poll — send full state
    events.push({
      type: "init",
      data: {
        queue: curr.entries.map(serializeEntry),
        stats: curr.stats,
        shop_current_number: curr.shopCurrentNumber,
      },
    });
    return events;
  }

  // Build lookup of previous entries
  const prevMap = new Map<string, QueueEntry>();
  for (const e of prev.entries) prevMap.set(e.id, e);
  const currMap = new Map<string, QueueEntry>();
  for (const e of curr.entries) currMap.set(e.id, e);

  // 1. New entries
  for (const e of curr.entries) {
    if (!prevMap.has(e.id)) {
      events.push({ type: "entry_added", data: serializeEntry(e) });
    }
  }

  // 2. Status changes or other field changes
  for (const e of curr.entries) {
    const old = prevMap.get(e.id);
    if (!old) continue; // already reported as new
    if (
      old.status !== e.status ||
      old.counter_id !== e.counter_id ||
      old.recall_count !== e.recall_count
    ) {
      events.push({ type: "entry_updated", data: serializeEntry(e) });
    }
  }

  // 3. Entries removed from active queue (completed / cancelled)
  for (const e of prev.entries) {
    if (!currMap.has(e.id)) {
      events.push({ type: "entry_removed", data: { id: e.id } });
    }
  }

  // 4. Shop-level changes (current_number)
  if (prev.shopCurrentNumber !== curr.shopCurrentNumber) {
    events.push({
      type: "shop_updated",
      data: { current_number: curr.shopCurrentNumber },
    });
  }

  // 5. Stats changes
  if (
    prev.stats.waiting !== curr.stats.waiting ||
    prev.stats.today_total !== curr.stats.today_total
  ) {
    events.push({ type: "stats_updated", data: curr.stats });
  }

  return events;
}

// ─── GET handler ─────────────────────────────────

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  await ensureMigrated();

  // Verify shop exists before opening the stream
  const shop = await getShop(id);
  if (!shop) {
    return new Response(JSON.stringify({ error: "Shop not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Helper: write an SSE frame
      const send = (eventType: string, data: unknown) => {
        const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(payload));
      };

      // Send initial comment to confirm connection is open
      controller.enqueue(encoder.encode(": connected\n\n"));

      let lastSnapshot: QueueSnapshot | null = null;
      let closed = false;

      // Clean up on client disconnect
      req.signal.addEventListener("abort", () => {
        closed = true;
      });

      // Poll loop — every 3 seconds
      while (!closed) {
        try {
          const [entries, stats, refreshedShop] = await Promise.all([
            getActiveQueue(id),
            getQueueStats(id),
            getShop(id),
          ]);

          const current: QueueSnapshot = {
            entries,
            stats,
            shopCurrentNumber: refreshedShop?.current_number ?? shop.current_number,
          };

          const changes = diffSnapshots(lastSnapshot, current);
          for (const evt of changes) {
            send(evt.type, evt.data);
          }

          lastSnapshot = current;
        } catch (err) {
          console.error("SSE poll error:", err);
          send("error", { message: "Polling failed, retrying…" });
        }

        // Wait 3 seconds before next poll (or abort early)
        await new Promise<void>((resolve) => {
          const timer = setTimeout(resolve, 3000);
          req.signal.addEventListener("abort", () => {
            clearTimeout(timer);
            resolve();
          });
        });
      }

      send("close", { message: "Connection closed" });
      controller.close();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
