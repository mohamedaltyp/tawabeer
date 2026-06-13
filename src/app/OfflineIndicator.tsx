"use client";

import { useEffect, useState } from "react";

export default function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Set initial state
    setIsOffline(!navigator.onLine);

    const handleOffline = () => {
      setIsOffline(true);
      setShowBanner(true);
    };

    const handleOnline = () => {
      setIsOffline(false);
      // Hide banner after a delay when coming back online
      setTimeout(() => setShowBanner(false), 3000);
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  // Register service worker
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("[PWA] Service Worker registered:", registration.scope);

          // Check for updates periodically
          setInterval(() => {
            registration.update();
          }, 60 * 60 * 1000); // Check every hour
        })
        .catch((error) => {
          console.error("[PWA] Service Worker registration failed:", error);
        });
    }
  }, []);

  if (!showBanner && !isOffline) return null;

  return (
    <div
      className={`fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md transition-all duration-300 ${
        showBanner ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0"
      }`}
    >
      <div
        className={`flex items-center gap-3 rounded-2xl px-5 py-4 shadow-lg border ${
          isOffline
            ? "bg-amber-50 border-amber-200 text-amber-800"
            : "bg-green-50 border-green-200 text-green-800"
        }`}
      >
        <span className="text-2xl">{isOffline ? "📡" : "✅"}</span>
        <div className="flex-1">
          <p className="font-semibold text-sm">
            {isOffline ? "أنت غير متصل" : "تم الاتصال מחדש"}
          </p>
          <p className="text-xs opacity-75">
            {isOffline
              ? "البيانات المحفوظة متاحة"
              : "جاري تحديث البيانات..."}
          </p>
        </div>
        {!isOffline && (
          <button
            onClick={() => setShowBanner(false)}
            className="text-green-600 hover:text-green-800"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
