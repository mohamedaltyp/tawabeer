"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface ShopData {
  id: string;
  name: string;
  description: string;
  category: string;
  address: string;
  phone: string;
  current_number: number;
}

interface QueueEntry {
  id: string;
  number: number;
  customer_name: string;
  status: string;
  estimated_wait: number;
  recall_count?: number;
  called_at?: string | null;
}

interface QueueSettings {
  is_open: number;
  greeting_message: string;
  avg_service_minutes: number;
  booking_enabled: number;
  whatsapp_number?: string;
}

interface Counter {
  id: string;
  name: string;
  current_number: number;
}

const CATEGORY_EMOJI: Record<string, string> = {
  "مطعم": "🍽️",
  "حلاق": "💈",
  "عيادة": "🏥",
  "مغسلة": "🧺",
  "بنق": "🏦",
  "صيدلية": "💊",
  "مخبز": "🥖",
  "سوبرماركت": "🛒",
  "مكتبة": "📚",
  "مركز طبي": "🏥",
  "معمل تحاليل": "🔬",
  "عيادة أسنان": "🦷",
  "عيادة عيون": "👁️",
  "عيادة جلدية": "🧴",
  "عيادة عظام": "🦴",
  "عيادة أطفال": "👶",
  "عيادة نساء": "👩‍⚕️",
  "عيانة باطنة": "🩺",
};

function getCategoryEmoji(category: string): string {
  for (const [key, emoji] of Object.entries(CATEGORY_EMOJI)) {
    if (category?.includes(key)) return emoji;
  }
  return "🏪";
}

export default function ShopPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [shop, setShop] = useState<ShopData | null>(null);
  const [settings, setSettings] = useState<QueueSettings | null>(null);
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [joining, setJoining] = useState(false);
  const [myEntry, setMyEntry] = useState<QueueEntry | null>(null);
  const [error, setError] = useState("");
  const [counters, setCounters] = useState<Counter[]>([]);
  const [selectedCounter, setSelectedCounter] = useState<string>("");
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingStars, setRatingStars] = useState(0);
  const [hoverStars, setHoverStars] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [ratingLoading, setRatingLoading] = useState(false);

  const [telegramLinkUrl, setTelegramLinkUrl] = useState("");

  const audioCtxRef = useRef<AudioContext | null>(null);
  const myNumberRef = useRef<number | null>(null);
  const lastRecallRef = useRef<number>(-1);

  useEffect(() => {
    if (myEntry) myNumberRef.current = myEntry.number;
  }, [myEntry]);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  async function playCallSound() {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") await ctx.resume();

      const playTone = (freq: number, start: number, dur: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        osc.type = "sine";
        gain.gain.setValueAtTime(0.35, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + start + dur);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + dur);
      };

      playTone(523, 0, 0.15);
      playTone(659, 0.15, 0.15);
      playTone(784, 0.3, 0.2);
      playTone(1047, 0.5, 0.4);
    } catch {}
  }

  useEffect(() => {
    fetch(`/api/shops/${id}`, { headers: { "ngrok-skip-browser-warning": "true" } })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setLoading(false); return; }
        setShop(d.shop);
        setSettings(d.settings);
        setQueue(d.queue || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    // Fetch counters for customer selection
    fetch(`/api/shops/${id}/counters`, { headers: { "ngrok-skip-browser-warning": "true" } })
      .then((r) => r.json())
      .then((d) => {
        if (d.counters && d.counters.length > 0) {
          setCounters(d.counters);
          setSelectedCounter(d.counters[0].id);
        }
      })
      .catch(() => {});
  }, [id]);

  const myPosition = useCallback(() => {
    if (!myEntry) return 0;
    return queue.filter(
      (e) => e.status === "waiting" && e.number < myEntry.number
    ).length;
  }, [myEntry, queue]);

  const myRealPosition = myPosition();
  const estimatedWait = myRealPosition * (settings?.avg_service_minutes || 10);
  const peopleCalled = queue.filter(
    (e) => e.status === "called" && e.number < (myEntry?.number || 0)
  ).length;

  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!myEntry?.called_at) return;
    const calledDate = myEntry.called_at.endsWith("Z")
      ? new Date(myEntry.called_at)
      : new Date(myEntry.called_at + "Z");
    const update = () => setElapsed(Math.floor((Date.now() - calledDate.getTime()) / 1000));
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [myEntry?.called_at]);

  function formatElapsed(seconds: number): string {
    if (seconds < 60) return `منذ ${seconds} ثانية`;
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `منذ ${mins} دقيقة`;
    const hrs = Math.floor(mins / 60);
    return `منذ ${hrs} ساعة و${mins % 60} دقيقة`;
  }

  const checkIfCalled = useCallback(
    (allEntries: QueueEntry[], myNum: number | null) => {
      if (!myNum) return;
      const found = allEntries.find((e) => e.number === myNum);
      if (found) {
        // Check if entry was just completed
        if (found.status === "completed" && myEntry && myEntry.status !== "completed") {
          setMyEntry(found);
          setShowRatingModal(true);
          return;
        }
        if (found.status === "called") {
          const recallCount = found.recall_count ?? 0;
          if (recallCount !== lastRecallRef.current) {
            const isRecall = lastRecallRef.current >= 0;
            lastRecallRef.current = recallCount;
            setMyEntry(found);
            playCallSound();
            try {
              navigator.vibrate?.([200, 100, 200, 100, 400]);
            } catch {}
            if (!isRecall) {
              if ("Notification" in window && Notification.permission === "granted") {
                new Notification("🔔 حان دورك!", {
                  body: `رقم ${found.number} — تفضل إلى ${shop?.name || "المحل"}`,
                  tag: "turn-called",
                });
              }
              document.title = `🔔 حان دورك! - ${shop?.name || "المحل"}`;
            } else {
              if ("Notification" in window && Notification.permission === "granted") {
                new Notification("🔔🔔 إعادة نداء!", {
                  body: `رقم ${found.number} — تفضل إلى ${shop?.name || "المحل"}`,
                  tag: `turn-called-${Date.now()}`,
                });
              }
              document.title = `🔔🔔 إعادة نداء! رقم ${found.number}`;
              setTimeout(() => {
                document.title = `🔔 حان دورك! - ${shop?.name || "المحل"}`;
              }, 3000);
            }
          }
        }
      }
    },
    [shop]
  );

  useEffect(() => {
    if (!shop || !myEntry) return;

    let eventSource: EventSource | null = null;
    let retryCount = 0;
    let retryTimeout: NodeJS.Timeout | null = null;
    let isUnmounted = false;

    const connect = () => {
      if (isUnmounted) return;

      const url = `/api/shops/${id}/events`;
      eventSource = new EventSource(url);

      eventSource.onopen = () => {
        retryCount = 0; // Reset retry count on successful connection
      };

      eventSource.addEventListener("init", (event) => {
        const data = JSON.parse(event.data);
        if (data.queue) setQueue(data.queue);
        if (data.shop) {
          // Shop data available if needed in future
        }
        if (data.queue) checkIfCalled(data.queue, myNumberRef.current);
      });

      eventSource.addEventListener("entry_added", (event) => {
        const data = JSON.parse(event.data);
        setQueue((prev) => {
          const newQueue = [...prev, data.entry];
          checkIfCalled(newQueue, myNumberRef.current);
          return newQueue;
        });
      });

      eventSource.addEventListener("entry_updated", (event) => {
        const data = JSON.parse(event.data);
        setQueue((prev) => {
          const newQueue = prev.map((entry) =>
            entry.id === data.entry.id ? data.entry : entry
          );
          checkIfCalled(newQueue, myNumberRef.current);
          return newQueue;
        });
      });

      eventSource.addEventListener("entry_removed", (event) => {
        const data = JSON.parse(event.data);
        setQueue((prev) => {
          const newQueue = prev.filter((entry) => entry.id !== data.entryId);
          checkIfCalled(newQueue, myNumberRef.current);
          return newQueue;
        });
      });

      eventSource.addEventListener("shop_updated", (event) => {
        const data = JSON.parse(event.data);
        if (data.currentNumber) {
          // currentNumber available if needed in future
        }
      });

      eventSource.addEventListener("stats_updated", (event) => {
        const data = JSON.parse(event.data);
        if (data.stats) {
          // stats available if needed in future
        }
      });

      eventSource.onerror = () => {
        eventSource?.close();
        eventSource = null;

        if (isUnmounted) return;

        // Exponential backoff: 1s, 2s, 4s, 8s, ... (max 30s)
        const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
        retryCount++;

        retryTimeout = setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      isUnmounted = true;
      eventSource?.close();
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, [id, shop, myEntry, checkIfCalled]);

  const handleJoin = async () => {
    if (!name.trim()) {
      setError("من فضلك أدخل اسمك");
      return;
    }
    setJoining(true);
    setError("");
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      if (audioCtxRef.current.state === "suspended") await audioCtxRef.current.resume();
    } catch {}
    try {
      const res = await fetch(`/api/shops/${id}/queue`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
        body: JSON.stringify({ customerName: name, customerPhone: phone, counterId: selectedCounter || undefined }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        return;
      }
      setMyEntry(data.entry);
      setTelegramLinkUrl(data.telegram_link_url || "");

      // Subscribe to push notifications
      if (data.entry?.id && "serviceWorker" in navigator && "PushManager" in window) {
        try {
          const reg = await navigator.serviceWorker.ready;
          // Fetch VAPID key from server
          const vapidRes = await fetch("/api/push/vapid");
          const vapidData = await vapidRes.json();
          if (!vapidData.publicKey) return;
          
          const sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: vapidData.publicKey,
          });
          await fetch("/api/push", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ entryId: data.entry.id, subscription: sub }),
          });
        } catch {}
      }
    } catch {
      setError("حدث خطأ، حاول مرة أخرى");
    } finally {
      setJoining(false);
    }
  };

  const handleRatingSubmit = async () => {
    if (ratingStars < 1) return;
    setRatingLoading(true);
    try {
      await fetch(`/api/shops/${id}/ratings`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
        body: JSON.stringify({
          rating: ratingStars,
          comment: ratingComment,
          customerName: myEntry?.customer_name || "",
          entryId: myEntry?.id,
        }),
      });
      setRatingSubmitted(true);
      setTimeout(() => {
        setShowRatingModal(false);
        setRatingSubmitted(false);
        setRatingStars(0);
        setRatingComment("");
        setMyEntry(null);
        setName("");
        setPhone("");
      }, 2000);
    } catch {
      // silently fail
    } finally {
      setRatingLoading(false);
    }
  };

  const initialTotal = myEntry
    ? queue.filter((e) => e.status === "waiting" && e.number <= myEntry.number).length
    : 0;
  const progressPercent =
    myEntry && initialTotal > 0
      ? Math.min(100, Math.round(((initialTotal - myRealPosition - 1) / initialTotal) * 100))
      : 0;

  // ─── Loading State ───
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "linear-gradient(135deg, #1E1B4B 0%, #4338CA 50%, #6C3CE1 100%)" }}>
        <div className="text-center animate-fade-in">
          <div className="relative mx-auto mb-6" style={{ width: 80, height: 80 }}>
            <div className="absolute inset-0 rounded-full border-4 border-white/20"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-white animate-spin"></div>
          </div>
          <p className="text-white/70 text-lg font-medium">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  // ─── Not Found ───
  if (!shop) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6" style={{ background: "linear-gradient(135deg, #1E1B4B 0%, #4338CA 50%, #6C3CE1 100%)" }}>
        <div className="text-8xl animate-float">😕</div>
        <h1 className="text-2xl font-bold text-white">المحل غير موجود</h1>
        <p className="text-white/60 text-center">تأكد من الرابط وحاول مرة أخرى</p>
        <Link
          href="/"
          className="btn-primary"
          style={{ textDecoration: "none" }}
        >
          العودة للرئيسية
        </Link>
      </div>
    );
  }

  const waitingCount = queue.filter((e) => e.status === "waiting").length;
  const isQueueOpen = settings?.is_open !== 0;

  // ─── Called View ───
  if (myEntry && myEntry.status === "called") {
    return (
      <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #064E3B 0%, #065F46 30%, #047857 60%, #10B981 100%)" }}>
        {/* Decorative circles */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/5 animate-float"></div>
          <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-white/5 animate-float" style={{ animationDelay: "1.5s" }}></div>
          <div className="absolute top-1/3 left-1/4 w-32 h-32 rounded-full bg-white/5 animate-float" style={{ animationDelay: "0.8s" }}></div>
        </div>

        <div className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center py-12">
          {/* Success Icon */}
          <div className="animate-bounce-in mb-8">
            <div className="relative">
              <div className="w-28 h-28 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center border-2 border-white/20 animate-glow">
                <span className="text-6xl animate-wave">🎉</span>
              </div>
              {/* Sparkles */}
              <div className="absolute -top-2 -right-2 text-2xl animate-float" style={{ animationDelay: "0.3s" }}>✨</div>
              <div className="absolute -bottom-1 -left-3 text-xl animate-float" style={{ animationDelay: "0.7s" }}>⭐</div>
              <div className="absolute top-0 -left-4 text-lg animate-float" style={{ animationDelay: "1s" }}>🎊</div>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-4xl font-black text-white mb-3 animate-slide-up">
            حان دورك!
          </h1>

          {/* Number */}
          <div className="animate-scale-in mb-4" style={{ animationDelay: "0.2s" }}>
            <div className="number-badge w-24 h-24 mx-auto">
              <span className="text-4xl font-black" style={{ color: "#064E3B" }}>
                {myEntry.number}
              </span>
            </div>
          </div>

          <p className="text-xl text-white/80 mb-2 animate-fade-in" style={{ animationDelay: "0.3s" }}>
            تفضل إلى المحل
          </p>

          {(myEntry.recall_count ?? 0) > 0 && (
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm px-4 py-2 mb-4 animate-fade-in" style={{ animationDelay: "0.4s" }}>
              <span className="text-sm">🔔</span>
              <span className="text-sm text-white/80">
                تمت مناداتك {(myEntry.recall_count ?? 0) + 1} مرات
              </span>
            </div>
          )}

          {/* Timer */}
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm px-5 py-2.5 mb-8">
            <span className="text-sm">⏱️</span>
            <span className="text-sm text-emerald-200 font-medium">{formatElapsed(elapsed)}</span>
          </div>

          {/* Shop Info Card */}
          <div className="w-full max-w-sm glass-dark rounded-3xl p-6 mb-8 animate-slide-up" style={{ animationDelay: "0.5s" }}>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">{getCategoryEmoji(shop.category)}</span>
              <div className="text-right">
                <p className="text-white font-bold text-lg">{shop.name}</p>
                {shop.address && (
                  <p className="text-white/60 text-sm flex items-center gap-1 justify-end">
                    <span>{shop.address}</span>
                    <span>📍</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Reset Button */}
          <button
            onClick={() => {
              setMyEntry(null);
              setName("");
              setPhone("");
            }}
            className="rounded-2xl bg-white/15 backdrop-blur-sm px-8 py-3.5 text-white font-medium hover:bg-white/25 transition-all border border-white/20"
          >
            مسح وبدء من جديد
          </button>
        </div>
      </div>
    );
  }

  // ─── Completed View (Rating Modal) ───
  if (myEntry && myEntry.status === "completed" && showRatingModal) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "linear-gradient(135deg, #1E1B4B 0%, #4338CA 50%, #6C3CE1 100%)" }}>
        <div className="w-full max-w-sm">
          <div className="card p-8 text-center animate-scale-in">
            {ratingSubmitted ? (
              <div className="animate-bounce-in">
                <span className="text-6xl block mb-4">🎉</span>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">شكراً لتقييمك!</h2>
                <p className="text-gray-500">تم تسجيل تقييمك بنجاح</p>
              </div>
            ) : (
              <>
                <span className="text-5xl block mb-4">⭐</span>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">كيف كانت تجربتك؟</h2>
                <p className="text-gray-500 text-sm mb-6">{shop.name}</p>

                {/* Star Rating */}
                <div className="flex justify-center gap-2 mb-6">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRatingStars(star)}
                      onMouseEnter={() => setHoverStars(star)}
                      onMouseLeave={() => setHoverStars(0)}
                      className="text-4xl transition-transform hover:scale-110 active:scale-95"
                      style={{ cursor: "pointer" }}
                    >
                      {star <= (hoverStars || ratingStars) ? "⭐" : "☆"}
                    </button>
                  ))}
                </div>

                {/* Rating Label */}
                <p className="text-sm font-medium mb-4" style={{ color: "#6C3CE1" }}>
                  {ratingStars === 0 && "اختر تقييمك"}
                  {ratingStars === 1 && "سيء جداً 😞"}
                  {ratingStars === 2 && "سيء 😕"}
                  {ratingStars === 3 && "مقبول 🙂"}
                  {ratingStars === 4 && "جيد 😊"}
                  {ratingStars === 5 && "ممتاز! 🤩"}
                </p>

                {/* Comment */}
                <textarea
                  value={ratingComment}
                  onChange={(e) => setRatingComment(e.target.value.slice(0, 500))}
                  placeholder="أضف تعليقاً (اختياري)..."
                  className="input-field w-full mb-6 text-sm"
                  rows={3}
                  style={{ resize: "none" }}
                />

                {/* Submit Button */}
                <button
                  onClick={handleRatingSubmit}
                  disabled={ratingStars < 1 || ratingLoading}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {ratingLoading ? (
                    <>
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      <span>جاري الإرسال...</span>
                    </>
                  ) : (
                    <>
                      <span>✓</span>
                      <span>إرسال التقييم</span>
                    </>
                  )}
                </button>

                {/* Skip */}
                <button
                  onClick={() => {
                    setShowRatingModal(false);
                    setMyEntry(null);
                    setName("");
                    setPhone("");
                  }}
                  className="mt-3 text-sm text-gray-400 hover:text-gray-600 transition-colors"
                >
                  تخطي
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── Waiting View ───
  if (myEntry) {
    return (
      <div className="min-h-screen waiting-board">
        {/* Decorative elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-white/5 animate-float"></div>
          <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-white/5 animate-float" style={{ animationDelay: "2s" }}></div>
          <div className="absolute top-1/4 right-1/4 w-24 h-24 rounded-full bg-white/5 animate-float" style={{ animationDelay: "1s" }}></div>
        </div>

        <div className="relative flex min-h-screen flex-col items-center px-5 py-8 text-white">

          {/* Shop Name Header */}
          <div className="w-full max-w-sm mb-6 animate-slide-down">
            <div className="flex items-center justify-center gap-2 mb-1">
              <h2 className="text-lg font-bold text-white/90">{shop.name}</h2>
              <span className="text-2xl">{getCategoryEmoji(shop.category)}</span>
            </div>
            {shop.address && (
              <p className="text-center text-white/50 text-sm">📍 {shop.address}</p>
            )}
          </div>

          {/* Big Number */}
          <div className="mb-6 animate-scale-in">
            <div className="number-badge w-36 h-36 mx-auto">
              <div className="text-center">
                <span className="text-6xl font-black" style={{ color: "#1E1B4B" }}>
                  {myEntry.number}
                </span>
              </div>
            </div>
          </div>

          {/* Greeting */}
          <h1 className="text-2xl font-bold mb-1 animate-fade-in">
            مرحباً {myEntry.customer_name}! 👋
          </h1>
          <p className="text-indigo-200/70 text-sm mb-8 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            رقم دورك — هنبلغك لما يجي دورك
          </p>

          {/* Stats Grid */}
          <div className="w-full max-w-sm grid grid-cols-2 gap-3 mb-6">
            {/* Position */}
            <div className="stat-card animate-slide-up" style={{ animationDelay: "0.1s" }}>
              <div className="text-3xl font-black text-white mb-1">{myRealPosition}</div>
              <div className="text-xs text-indigo-200/70">أشخاص قدامك</div>
            </div>

            {/* Estimated Time */}
            <div className="stat-card animate-slide-up" style={{ animationDelay: "0.2s" }}>
              <div className="text-2xl font-black text-white mb-1">
                {estimatedWait <= 1 ? "<1" : `≈${estimatedWait}`}
              </div>
              <div className="text-xs text-indigo-200/70">دقيقة متوقعة</div>
            </div>

            {/* Current Serving */}
            <div className="stat-card animate-slide-up" style={{ animationDelay: "0.3s" }}>
              <div className="text-3xl font-black text-amber-300 mb-1">
                {shop.current_number || "—"}
              </div>
              <div className="text-xs text-indigo-200/70">يُخدم الآن</div>
            </div>

            {/* Total Waiting */}
            <div className="stat-card animate-slide-up" style={{ animationDelay: "0.4s" }}>
              <div className="text-3xl font-black text-white mb-1">{waitingCount}</div>
              <div className="text-xs text-indigo-200/70">في الانتظار</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full max-w-sm mb-6 animate-fade-in" style={{ animationDelay: "0.5s" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-indigo-200/60">تقدمك في الطابور</span>
              <span className="text-xs font-bold text-emerald-300">{progressPercent}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
            </div>
          </div>

          {/* People served info */}
          {peopleCalled > 0 && (
            <div className="w-full max-w-sm mb-6 animate-fade-in" style={{ animationDelay: "0.6s" }}>
              <div className="stat-card flex items-center justify-center gap-2">
                <span className="text-sm">✅</span>
                <span className="text-sm text-indigo-200/80">
                  تم مناداة {peopleCalled} شخص قبلك
                </span>
              </div>
            </div>
          )}

          {/* Telegram Notification Button */}
          <div className="w-full max-w-sm mb-4 animate-slide-up" style={{ animationDelay: "0.7s" }}>
            <a
              href={telegramLinkUrl || `https://t.me/tawabeer_bot?start=notif_${myEntry.id}_${id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 w-full rounded-2xl py-4 px-5 text-white font-medium transition-all"
              style={{
                background: "linear-gradient(135deg, rgba(56, 189, 248, 0.25) 0%, rgba(14, 165, 233, 0.25) 100%)",
                border: "1px solid rgba(56, 189, 248, 0.35)",
                backdropFilter: "blur(10px)",
                textDecoration: "none",
              }}
            >
              <span className="text-2xl">✈️</span>
              <div className="text-right flex-1">
                <div className="text-sm font-bold">🔔 اشترك في إشعارات تيليجرام</div>
                <div className="text-xs text-sky-200/70">اضغط هنا عشان توصلك إشعار لما يتنادى دورك</div>
              </div>
              <span className="text-lg">←</span>
            </a>
          </div>

          {/* QR Code for Telegram */}
          {telegramLinkUrl && (
            <div className="w-full max-w-sm mb-6 animate-slide-up" style={{ animationDelay: "0.75s" }}>
              <div className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 p-5 text-center">
                <p className="text-xs text-indigo-200/60 mb-3">📱 امسح الكود ده بالكاميرا عشان تفتح تيليجرام</p>
                <div className="inline-block rounded-xl bg-white p-3">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(telegramLinkUrl)}`}
                    alt="QR Code for Telegram"
                    className="w-44 h-44"
                  />
                </div>
                <p className="text-xs text-indigo-200/50 mt-3">هيفتح البوت ويربط رقمك تلقائياً ✅</p>
              </div>
            </div>
          )}

          {/* Live Indicator */}
          <div className="flex items-center gap-2.5 animate-fade-in" style={{ animationDelay: "0.8s" }}>
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-400"></span>
            </span>
            <span className="text-sm text-indigo-200/60">متابعة حية — يتحدث تلقائياً</span>
          </div>
        </div>
      </div>
    );
  }

  // ─── Join Form ───
  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(180deg, #1E1B4B 0%, #312E81 40%, #FDF8F0 100%)" }}>
      {/* Hero Section */}
      <div className="relative px-6 pt-12 pb-16 text-center overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute top-0 left-0 w-64 h-64 rounded-full opacity-20 blur-3xl" style={{ background: "radial-gradient(circle, #8B5CF6, transparent)" }}></div>
        <div className="absolute top-10 right-0 w-48 h-48 rounded-full opacity-15 blur-3xl" style={{ background: "radial-gradient(circle, #F59E0B, transparent)" }}></div>

        <div className="relative">
          {/* Category Emoji */}
          <div className="animate-bounce-in mb-4">
            <span className="text-7xl block animate-float">{getCategoryEmoji(shop.category)}</span>
          </div>

          {/* Shop Name */}
          <h1 className="text-3xl font-black text-white mb-2 animate-slide-up">
            {shop.name}
          </h1>

          {/* Description */}
          {shop.description && (
            <p className="text-indigo-200/70 text-sm mb-1 animate-fade-in" style={{ animationDelay: "0.1s" }}>
              {shop.description}
            </p>
          )}

          {/* Address */}
          {shop.address && (
            <p className="text-indigo-200/50 text-sm flex items-center justify-center gap-1 animate-fade-in" style={{ animationDelay: "0.2s" }}>
              <span>{shop.address}</span>
              <span>📍</span>
            </p>
          )}

          {/* Phone */}
          {shop.phone && (
            <p className="text-indigo-200/50 text-sm mt-1 animate-fade-in" style={{ animationDelay: "0.25s" }}>
              📞 {shop.phone}
            </p>
          )}

          {/* WhatsApp Button */}
          {settings?.whatsapp_number && (
            <a
              href={`https://wa.me/20${settings.whatsapp_number.replace(/^0/, '').replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-green-500/90 hover:bg-green-600 text-white text-sm font-bold rounded-full transition-all animate-fade-in shadow-lg"
              style={{ animationDelay: "0.3s" }}
            >
              💬 تواصل معنا عبر واتساب
            </a>
          )}
        </div>
      </div>

      {/* Queue Status Card */}
      <div className="mx-auto max-w-md px-5 -mt-8 relative z-10">
        <div className="card p-5 animate-slide-up" style={{ animationDelay: "0.1s" }}>
          <div className="flex items-center justify-around">
            {/* Waiting */}
            <div className="text-center flex-1">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-2" style={{ background: "linear-gradient(135deg, #EEF2FF, #E0E7FF)" }}>
                <span className="text-xl">👥</span>
              </div>
              <p className="text-xs text-gray-400 mb-1">في الانتظار</p>
              <p className="text-2xl font-black" style={{ color: "#6C3CE1" }}>{waitingCount}</p>
            </div>

            <div className="h-12 w-px bg-gray-100"></div>

            {/* Current */}
            <div className="text-center flex-1">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-2" style={{ background: "linear-gradient(135deg, #FEF3C7, #FDE68A)" }}>
                <span className="text-xl">🔄</span>
              </div>
              <p className="text-xs text-gray-400 mb-1">الدور الحالي</p>
              <p className="text-2xl font-black text-gray-800">{shop.current_number || "—"}</p>
            </div>

            <div className="h-12 w-px bg-gray-100"></div>

            {/* Avg Time */}
            <div className="text-center flex-1">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-2" style={{ background: "linear-gradient(135deg, #D1FAE5, #A7F3D0)" }}>
                <span className="text-xl">⏱️</span>
              </div>
              <p className="text-xs text-gray-400 mb-1">متوسط الانتظار</p>
              <p className="text-2xl font-black" style={{ color: "#F59E0B" }}>~{settings?.avg_service_minutes || 10}<span className="text-sm">د</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* Queue Closed Message */}
      {!isQueueOpen && (
        <div className="mx-auto max-w-md px-5 mt-4 animate-fade-in">
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-center">
            <span className="text-2xl mb-2 block">🔒</span>
            <p className="text-amber-700 font-medium text-sm">الطابور مغلق حالياً</p>
            <p className="text-amber-500 text-xs mt-1">يرجى المحاولة لاحقاً</p>
          </div>
        </div>
      )}

      {/* Book Appointment Link */}
      {settings?.booking_enabled === 1 && (
        <div className="mx-auto max-w-md px-5 mt-4 animate-fade-in">
          <Link
            href={`/shop/${id}/book`}
            className="flex items-center justify-center gap-3 w-full rounded-2xl py-4 px-5 text-white font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, rgba(139, 92, 246, 0.9) 0%, rgba(99, 102, 241, 0.9) 100%)",
              border: "1px solid rgba(139, 92, 246, 0.5)",
              textDecoration: "none",
              boxShadow: "0 8px 32px rgba(99, 102, 241, 0.3)",
            }}
          >
            <span className="text-2xl">📅</span>
            <div className="text-right flex-1">
              <div className="text-sm font-bold">احجز موعد مسبق</div>
              <div className="text-xs text-purple-200/70">اختر التاريخ والوقت المناسب ليك</div>
            </div>
            <span className="text-lg">←</span>
          </Link>
        </div>
      )}

      {/* Join Form */}
      <div className="mx-auto max-w-md px-5 mt-6 pb-8">
        <div className="card p-6 animate-slide-up" style={{ animationDelay: "0.2s" }}>
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">احجز دورك الآن</h2>
            <p className="text-sm text-gray-400 mt-1">أدخل بياناتك وهنبلغك لما يجي دورك</p>
          </div>

          <div className="space-y-4">
            {/* Name Input */}
            <div>
              <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-2">
                <span>👤</span>
                <span>الاسم *</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="أدخل اسمك الكامل"
                className="input-field"
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                disabled={!isQueueOpen}
              />
            </div>

            {/* Phone Input */}
            <div>
              <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-2">
                <span>📱</span>
                <span>رقم الهاتف (اختياري)</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="مثال: 0100xxxxxxx"
                className="input-field"
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                disabled={!isQueueOpen}
              />
              <div className="mt-2 flex items-start gap-1.5 text-xs text-gray-400 bg-indigo-50 rounded-xl p-3">
                <span className="text-sm mt-0.5">💡</span>
                <div>
                  <span>لو دخلت رقم موبايلك، هتوصللك إشعار على </span>
                  <b style={{ color: "#6C3CE1" }}>تيليجرام</b>
                  <span> تلقائياً لما يتنادى دورك!</span>
                  <br />
                  <span>اربط رقمك مع البوت: </span>
                  <a href="https://t.me/tawabeer_bot" target="_blank" className="font-semibold hover:underline" style={{ color: "#6C3CE1" }}>
                    @tawabeer_bot
                  </a>
                </div>
              </div>
            </div>

            {/* Counter Selection - only if multiple counters */}
            {counters.length > 1 && (
              <div>
                <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-2">
                  <span>🪟</span>
                  <span>اختر الشباك</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {counters.map((counter) => (
                    <button
                      key={counter.id}
                      type="button"
                      onClick={() => setSelectedCounter(counter.id)}
                      disabled={!isQueueOpen}
                      className={`p-3 rounded-xl text-sm font-medium transition-all border-2 text-center ${
                        selectedCounter === counter.id
                          ? "border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm"
                          : "border-gray-200 bg-white text-gray-600 hover:border-indigo-300 hover:bg-indigo-50/50"
                      }`}
                    >
                      <span className="block text-lg mb-0.5">🪟</span>
                      <span>{counter.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600 text-center animate-fade-in flex items-center justify-center gap-2">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleJoin}
              disabled={joining || !isQueueOpen}
              className="btn-primary w-full text-lg flex items-center justify-center gap-2"
            >
              {joining ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>جاري الحجز...</span>
                </>
              ) : (
                <>
                  <span>🔢</span>
                  <span>احجز دوري</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Back Link */}
        <div className="mt-6 text-center animate-fade-in" style={{ animationDelay: "0.4s" }}>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-indigo-600 transition-colors"
          >
            <span>←</span>
            <span>العودة للرئيسية</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
