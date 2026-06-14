"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/Icon";

export default function QRPage() {
  const { id } = useParams<{ id: string }>();
  const [shop, setShop] = useState<{ name: string; address: string } | null>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
    fetch(`/api/shops/${id}`, { headers: { "ngrok-skip-browser-warning": "true" } })
      .then((r) => r.json())
      .then((d) => { if (!d.error) setShop(d.shop); });
  }, [id]);

  const shopUrl = `${origin}/shop/${id}`;

  const handleDownload = async () => {
    try {
      // Use Canvas API to generate QR
      const QRCode = (await import("qrcode")).default;
      const canvas = document.createElement("canvas");
      await QRCode.toCanvas(canvas, shopUrl, {
        width: 500,
        margin: 2,
        color: { dark: "#1e1b4b", light: "#ffffff" },
      });
      const link = document.createElement("a");
      link.download = `qr-${shop?.name || "shop"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("QR download error:", err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="mx-auto max-w-md px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <Link href={`/dashboard/shop/${id}`} className="text-gray-400 hover:text-gray-600">&larr;</Link>
          <div>
            <h1 className="text-lg font-bold text-gray-900">{shop?.name || "المنشأة"}</h1>
            <p className="text-xs text-gray-400">QR كود المنشأة</p>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-gray-100 p-8 text-center shadow-sm">
          {/* QR Code */}
          <div className="mx-auto mb-6">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(shopUrl)}&bgcolor=ffffff&color=1e1b4b&margin=10`}
              alt={`QR Code for ${shop?.name}`}
              className="mx-auto rounded-2xl shadow-md"
              style={{ imageRendering: "pixelated" }}
            />
          </div>

          <h2 className="text-xl font-bold text-gray-900">{shop?.name}</h2>
          {shop?.address && <p className="text-sm text-gray-500 mt-1"><Icon name="pin" size={13} className="inline -mt-0.5" /> {shop.address}</p>}

          <div className="mt-6 rounded-xl bg-gray-50 p-3">
            <p className="text-xs text-gray-400 mb-1">رابط المنشأة</p>
            <p className="text-sm text-indigo-600 font-medium break-all">{shopUrl}</p>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={handleDownload}
              className="flex-1 rounded-2xl bg-indigo-600 py-3.5 text-sm font-bold text-white hover:bg-indigo-700 transition-all shadow-sm"
            >
              <Icon name="download" size={16} className="inline -mt-0.5" /> تحميل QR
            </button>
            <button
              onClick={handlePrint}
              className="flex-1 rounded-2xl border-2 border-gray-200 py-3.5 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all"
            >
              <Icon name="print" size={16} className="inline -mt-0.5" /> طباعة
            </button>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-amber-50 border border-amber-100 p-5 text-sm text-amber-800">
          <p className="font-bold mb-1">📌 تعليمات الاستخدام:</p>
          <ol className="space-y-1 list-decimal list-inside text-amber-700">
            <li>اطبع QR الكود أو اعرضه على شاشة</li>
            <li>الزبون يمسح الكود بكاميرا هاتفه</li>
            <li>يدخل اسمه وياخذ رقم دوره تلقائياً</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
