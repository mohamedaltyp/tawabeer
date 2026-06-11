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

  // 🔔 صوت التنبيه عند النداء
  const audioCtxRef = useRef<AudioContext | null>(null);
  async function playCallSound() {
    try {
      // نستخدم AudioContext موجود أو نعمل واحد جديد
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const ctx = audioCtxRef.current;
      // نستنى الـ resume لو السياق معلق
      if (ctx.state === "suspended") await ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      // نغمتين متتاليتين عشان يكون الصوت واضح
      osc.frequency.setValueAtTime(660, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.2);
      osc.type = "sine";
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 1);
    } catch {
      // لو فشل الصوت، نعتمد على الإشعار والمؤقت
    }
  }

  // المتغير المرجعي لرقم العميل — عشان الـ SSE يقدر يوصل للرقم من غير ما يحتاج useEffect
  const myNumberRef = useRef<number | null>(null);
  useEffect(() => {
    if (myEntry) myNumberRef.current = myEntry.number;
  }, [myEntry]);

  // طلب إذن الإشعارات مرة واحدة عند فتح الصفحة
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

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
  }, [id]);

  // Calculate my position from the live queue
  const myPosition = useCallback(() => {
    if (!myEntry) return 0;
    return queue.filter(
      (e) => e.status === "waiting" && e.number < myEntry.number
    ).length;
  }, [myEntry, queue]);

  const myRealPosition = myPosition();

  const estimatedWait = myRealPosition * (settings?.avg_service_minutes || 10);

  const totalAhead = myRealPosition;
  const peopleCalled = queue.filter(
    (e) => e.status === "called" && e.number < (myEntry?.number || 0)
  ).length;

  // المتغير المرجعي لآخر recall_count — عشان نكتشف إعادة النداء بدقة
  const lastRecallRef = useRef<number>(-1);

  // 🔄 دالة مساعدة: تشوف لو الـ entry بتاع العميل اتنادى من البيانات
  const checkIfCalled = useCallback((allEntries: QueueEntry[], myNum: number | null) => {
    if (!myNum) return;
    const found = allEntries.find((e) => e.number === myNum);
    if (found && found.status === "called") {
      const recallCount = found.recall_count ?? 0;
      // لو recall_count اتغير عن آخر مرة شفناها — يبقى فيه نداء جديد
      if (recallCount !== lastRecallRef.current) {
        const isRecall = lastRecallRef.current >= 0;
        lastRecallRef.current = recallCount;
        // نحدث myEntry
        setMyEntry(found);
        playCallSound();
        try { navigator.vibrate?.([200, 100, 200, 100, 400]); } catch {}
        if (!isRecall) {
          // أول نداء
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("🔔 حان دورك!", {
              body: `رقم ${found.number} — تفضل إلى ${shop?.name || "المحل"}`,
              tag: "turn-called",
            });
          }
          document.title = `🔔 حان دورك! - ${shop?.name || "المحل"}`;
        } else {
          // إعادة نداء
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("🔔🔔 إعادة نداء!", {
              body: `رقم ${found.number} — تفضل إلى ${shop?.name || "المحل"}`,
              tag: `turn-called-${Date.now()}`,
            });
          }
          document.title = `🔔🔔 إعادة نداء! رقم ${found.number} - ${shop?.name || "المحل"}`;
          setTimeout(() => {
            document.title = `🔔 حان دورك! - ${shop?.name || "المحل"}`;
          }, 3000);
        }
      }
    }
  }, [shop]);

  // SSE for real-time updates — باستخدام useRef عشان ما يتقطعش الاتصال
  useEffect(() => {
    if (!shop) return;
    const evtSource = new EventSource(`/api/shops/${id}/queue/events`);

    evtSource.addEventListener("queue-update", (e) => {
      const data = JSON.parse(e.data);
      if (data.action === "called" && myNumberRef.current === data.entry.number) {
        // تحديث حالة myEntry إلى called
        setMyEntry((prev) => {
          if (!prev) return null;
          return { ...prev, status: "called" };
        });
        // 🔔 تشغيل الصوت فوراً — بنستخدم async عشان نستنى resume لو السياق معلق
        playCallSound();
        // 🔊 اهتزاز للموبايل
        try { navigator.vibrate?.([200, 100, 200, 100, 400]); } catch {}
        // 🔔 إشعار المتصفح — tag مختلف عشان يظهر حتى لو موجود قبله
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification(data.recall ? "🔔🔔 حان دورك! (إعادة نداء)" : "🔔 حان دورك!", {
            body: `رقم ${data.entry.number} — تفضل إلى ${shop?.name || "المحل"}`,
            tag: data.recall ? `turn-called-${Date.now()}` : "turn-called",
          });
        }
        // تغيير عنوان الصفحة — نضيف recall indicator
        document.title = data.recall
          ? `🔔🔔 إعادة نداء! رقم ${data.entry.number} - ${shop?.name || "المحل"}`
          : `🔔 حان دورك! - ${shop?.name || "المحل"}`;
        // بعد 3 ثوان نرجع العنوان العادي
        setTimeout(() => {
          document.title = `🔔 حان دورك! - ${shop?.name || "المحل"}`;
        }, 3000);
      }
      // تحديث قائمة الانتظار الحية
      fetch(`/api/shops/${id}/queue`, { headers: { "ngrok-skip-browser-warning": "true" } }).then(r => r.json()).then(d => setQueue(d.queue || []));
    });

    evtSource.addEventListener("init", (e) => {
      const data = JSON.parse(e.data);
      setQueue(data.queue || []);
      // ✅ التحقق من حالة العميل عند إعادة الاتصال
      // لو الاتصال انقطع واتجدد، نتأكد إن رقمنا مش موجود في "called"
      if (myNumberRef.current && data.called) {
        const calledEntry = data.called.find(
          (ce: QueueEntry) => ce.number === myNumberRef.current
        );
        if (calledEntry) {
          setMyEntry(calledEntry);
          playCallSound();
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("🔔 حان دورك!", {
              body: `رقم ${calledEntry.number} — تفضل إلى ${shop?.name || "المحل"}`,
              tag: "turn-called",
            });
          }
          document.title = `🔔 حان دورك! - ${shop?.name || "المحل"}`;
        }
      }
    });

    return () => evtSource.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, shop]);

  // ⏱️ Polling مستمر — كل 3 ثوان عشان نكتشف إعادة النداء (حتى لو SSE انقطع من التونل)
  useEffect(() => {
    if (!shop || !myEntry) return;
    const interval = setInterval(async () => {
      try {
        // جلب كل حاجة في طلب واحد — مع منع التخزين المؤقت
        const shopRes = await fetch(`/api/shops/${id}?t=${Date.now()}`, {
          headers: {
            "ngrok-skip-browser-warning": "true",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
          },
        });
        const shopData = await shopRes.json();
        setQueue(shopData.queue || []);
        // دايم نشوف لو تمت مناداتنا — للنداء الأول وإعادة النداء
        checkIfCalled(shopData.allQueue || [], myNumberRef.current);
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [id, shop, myEntry, checkIfCalled]);

  const handleJoin = async () => {
    if (!name.trim()) {
      setError("من فضلك أدخل اسمك");
      return;
    }
    setJoining(true);
    setError("");
    // نشغل AudioContext من أول تفاعل عشان المتصفح يسمح بالصوت بعدين
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
      }
      if (audioCtxRef.current.state === "suspended") {
        await audioCtxRef.current.resume();
      }
    } catch {}
    try {
      const res = await fetch(`/api/shops/${id}/queue`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
        body: JSON.stringify({ customerName: name, customerPhone: phone }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      setMyEntry(data.entry);
    } catch {
      setError("حدث خطأ، حاول مرة أخرى");
    } finally {
      setJoining(false);
    }
  };

  // Progress percentage
  const initialTotal = myEntry
    ? queue.filter((e) => e.status === "waiting" && e.number <= myEntry.number).length
    : 0;
  const progressPercent = myEntry && initialTotal > 0
    ? Math.min(100, Math.round(((initialTotal - myRealPosition - 1) / initialTotal) * 100))
    : 0;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 gap-4">
        <span className="text-6xl">😕</span>
        <p className="text-lg font-medium text-gray-900">المحل غير موجود</p>
        <Link href="/" className="text-indigo-600 hover:underline">عودة للرئيسية</Link>
      </div>
    );
  }

  const waitingCount = queue.filter((e) => e.status === "waiting").length;

  // ─── Joined / Waiting View ───
  if (myEntry) {
    const isCalled = myEntry.status === "called";
    return (
      <div className={`min-h-screen ${isCalled ? "bg-gradient-to-br from-green-500 to-emerald-600" : "waiting-board"} text-white`}>
        <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center animate-fade-in">

          {isCalled ? (
            <>
              <div className="animate-pulse-ring mb-6 rounded-full bg-white/20 p-6">
                <span className="text-6xl">🎉</span>
              </div>
              <h1 className="text-3xl font-bold mb-2">حان دورك!</h1>
              <p className="text-xl text-white/80 mb-8">رقم {myEntry.number} — تفضل إلى المحل</p>
              <div className="rounded-2xl bg-white/10 backdrop-blur-md px-8 py-6 border border-white/20">
                <p className="text-sm text-white/70">{shop.name}</p>
                <p className="text-lg font-bold mt-1">{shop.address}</p>
              </div>
              <button
                onClick={() => { setMyEntry(null); setName(""); setPhone(""); }}
                className="mt-8 rounded-2xl bg-white/20 px-6 py-3 text-white font-medium hover:bg-white/30 transition-all backdrop-blur-sm"
              >
                امسح مرة أخرى
              </button>
            </>
          ) : (
            <>
              {/* Big Number */}
              <div className="mb-4">
                <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-white/10 backdrop-blur-md border-2 border-white/20 animate-pulse-ring">
                  <span className="text-5xl font-black">{myEntry.number}</span>
                </div>
              </div>
              <h1 className="text-2xl font-bold mb-1">مرحباً {myEntry.customer_name}!</h1>
              <p className="text-indigo-200 text-sm mb-6">رقم دورك</p>

              {/* Real-time Position Card */}
              <div className="rounded-2xl bg-white/10 backdrop-blur-md px-6 py-5 border border-white/20 w-full max-w-sm space-y-3">
                {/* Progress bar */}
                <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-l from-green-400 to-emerald-300 transition-all duration-700 ease-out"
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>

                {/* People ahead */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-indigo-200">👥 الأشخاص قدامك</span>
                  <span className="text-xl font-black">{myRealPosition}</span>
                </div>

                {/* Estimated time remaining */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-indigo-200">⏱️ الوقت المتبقي تقديرياً</span>
                  <span className="text-lg font-bold">
                    {estimatedWait <= 1
                      ? "أقل من دقيقة"
                      : `≈ ${estimatedWait} دقيقة`}
                  </span>
                </div>

                {/* Current serving */}
                <div className="flex items-center justify-between border-t border-white/10 pt-3">
                  <span className="text-sm text-indigo-200">🔄 يتم خدمة رقم</span>
                  <span className="text-lg font-bold">{shop.current_number || "—"}</span>
                </div>

                {/* People served so far */}
                {peopleCalled > 0 && (
                  <div className="flex items-center justify-between text-xs text-indigo-300">
                    <span>✅ تم مناداة {peopleCalled} قبل</span>
                  </div>
                )}
              </div>

              {/* Live indicator */}
              <div className="mt-6 flex items-center gap-2 text-sm text-indigo-300">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400"></span>
                </span>
                متابعة حية — يتحدّث تلقائياً
              </div>

              <p className="mt-4 text-xs text-indigo-300/60">
                سيتم تحديث موقعك لحظة مناداة كل شخص
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  // ─── Join Form ───
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Shop Header */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-700 px-6 py-12 text-white text-center">
        <span className="text-5xl mb-4 block">
          {shop.category === "مطعم" ? "🍽️" : shop.category === "حلاق" ? "💈" : shop.category === "عيادة" ? "🏥" : shop.category === "مغسلة" ? "🧺" : "🏪"}
        </span>
        <h1 className="text-2xl font-bold">{shop.name}</h1>
        {shop.description && <p className="mt-1 text-indigo-200">{shop.description}</p>}
        {shop.address && <p className="mt-1 text-sm text-indigo-200">📍 {shop.address}</p>}
      </div>

      {/* Queue Status */}
      <div className="mx-auto max-w-md px-6 -mt-6">
        <div className="rounded-2xl bg-white shadow-md border border-gray-100 p-5">
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              <p className="text-xs text-gray-400">في الانتظار</p>
              <p className="text-2xl font-bold text-indigo-600">{waitingCount}</p>
            </div>
            <div className="h-10 w-px bg-gray-100"></div>
            <div className="text-center flex-1">
              <p className="text-xs text-gray-400">رقم الحالي</p>
              <p className="text-2xl font-bold text-gray-900">{shop.current_number || "—"}</p>
            </div>
            <div className="h-10 w-px bg-gray-100"></div>
            <div className="text-center flex-1">
              <p className="text-xs text-gray-400">متوسط الانتظار</p>
              <p className="text-2xl font-bold text-amber-500">~{settings?.avg_service_minutes || 10}د</p>
            </div>
          </div>
        </div>
      </div>

      {/* Join Form */}
      <div className="mx-auto max-w-md px-6 mt-6 animate-slide-up">
        <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 text-center">احجز دورك الآن</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 text-right">الاسم *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="أدخل اسمك"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-right text-gray-900 placeholder-gray-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-50 transition-all"
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 text-right">رقم الهاتف (اختياري)</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="مثال: 0100xxxxxxx"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-right text-gray-900 placeholder-gray-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-50 transition-all"
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              />
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 text-center">{error}</div>
            )}

            <button
              onClick={handleJoin}
              disabled={joining}
              className="w-full rounded-2xl bg-indigo-600 py-4 text-lg font-bold text-white hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg hover:shadow-xl"
            >
              {joining ? "جاري الحجز..." : "🔢 احجز دوري"}
            </button>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-gray-400 hover:text-indigo-600 transition-colors">
            ← العودة للرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}
