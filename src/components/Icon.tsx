"use client";
import * as React from "react";

const P: Record<string, React.ReactNode> = {
  users: (<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>),
  refresh: (<><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></>),
  clock: (<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>),
  check: (<path d="M5 12l5 5L20 7"/>),
  checkCircle: (<><circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/></>),
  bell: (<><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></>),
  star: (<path d="M12 3l2.6 5.6 6.1.8-4.5 4.2 1.2 6.1L12 17.8 6.6 19.7l1.2-6.1L3.3 9.4l6.1-.8L12 3z"/>),
  sparkles: (<><path d="M12 3l1.9 4.8L18.7 9l-4.8 1.9L12 15.7l-1.9-4.8L5.3 9l4.8-1.2L12 3z"/><path d="M19 14l.7 2L22 17l-2 .7L19 20l-.7-2L16 17l2-.7L19 14z"/></>),
  pin: (<><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></>),
  phone: (<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2 4.2 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>),
  message: (<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-4-1L3 20l1.1-4A8.4 8.4 0 1 1 21 11.5z"/>),
  send: (<><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4 20-7z"/></>),
  calendar: (<><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></>),
  window: (<><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 9h16"/><path d="M12 9v12"/></>),
  user: (<><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 12 0v1"/></>),
  smartphone: (<><rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/></>),
  bulb: (<><path d="M9 18h6"/><path d="M10 22h4"/><path d="M8 14a5 5 0 1 1 8 0c-.7.9-1.5 1.6-1.5 3h-5c0-1.4-.8-2.1-1.5-3z"/></>),
  lock: (<><rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></>),
  warning: (<><path d="M12 3 2 20h20L12 3z"/><path d="M12 10v4"/><path d="M12 17h.01"/></>),
  hash: (<><path d="M4 9h16"/><path d="M4 15h16"/><path d="M10 3 8 21"/><path d="M16 3l-2 18"/></>),
  arrowLeft: (<><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></>),
  arrowRight: (<><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></>),
  edit: (<><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></>),
  qr: (<><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><path d="M14 14h3v3"/><path d="M20 14v6h-6"/></>),
  store: (<><path d="M3 9l1.5-5h15L21 9"/><path d="M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9"/><path d="M4 9h16"/><path d="M9 20v-6h6v6"/></>),
  search: (<><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></>),
  bolt: (<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z"/>),
  chart: (<><path d="M4 4v16h16"/><rect x="7" y="11" width="3" height="6"/><rect x="12" y="7" width="3" height="10"/><rect x="17" y="13" width="3" height="4"/></>),
  trending: (<><path d="M3 17l6-6 4 4 7-7"/><path d="M17 8h4v4"/></>),
  diamond: (<path d="M6 3h12l4 6-10 12L2 9l4-6z"/>),
  building: (<><rect x="5" y="3" width="14" height="18" rx="1"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"/></>),
  gear: (<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1.17V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 8 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15H4.5a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 6 9.4l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 11 4.6V4.5a2 2 0 1 1 4 0v.09c0 .67.4 1.27 1 1.51.6.25 1.3.12 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 11h.1a2 2 0 1 1 0 4h-.1z"/></>),
  print: (<><path d="M6 9V2h12v7"/><rect x="6" y="13" width="12" height="8"/><path d="M6 17H4a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2"/></>),
  stethoscope: (<><path d="M5 3v5a4 4 0 0 0 8 0V3"/><path d="M9 16a5 5 0 0 0 10 0v-2"/><circle cx="19" cy="11" r="2"/></>),
  pill: (<><rect x="3" y="9" width="18" height="6" rx="3" transform="rotate(-45 12 12)"/><path d="M8.5 8.5l7 7"/></>),
  utensils: (<><path d="M4 3v7a2 2 0 0 0 2 2v9"/><path d="M8 3v18M8 3v6"/><path d="M18 3c-1.7 0-3 2-3 5s1.3 4 3 4v9"/></>),
  scissors: (<><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.1 15.9M14.5 12.5 20 20M8.1 8.1 12 12"/></>),
  cart: (<><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/><path d="M2 3h3l2.4 12.4a1 1 0 0 0 1 .8h9.7a1 1 0 0 0 1-.8L22 7H6"/></>),
  book: (<><path d="M4 5a2 2 0 0 1 2-2h13v18H6a2 2 0 0 1-2-2z"/><path d="M19 17H6a2 2 0 0 0-2 2"/></>),
  tooth: (<path d="M12 5c-2-2-5-2-6 1-1 3 0 6 1 9 .5 1.5 1 4 2 4s1-2 1.5-3.5S12 16 12 16s.5 1 .5 3 .5 3 1.5 3 1.5-2.5 2-4c1-3 2-6 1-9-1-3-4-3-6-1z"/>),
  flask: (<><path d="M9 3h6"/><path d="M10 3v6L5 19a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-10V3"/><path d="M7.5 15h9"/></>),
  hospital: (<><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 8v8M8 12h8"/></>),
  copy: (<><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></>),
  plus: (<path d="M12 5v14M5 12h14"/>),
  x: (<path d="M18 6 6 18M6 6l12 12"/>),
  key: (<><circle cx="8" cy="15" r="5"/><path d="m11.5 11.5 8.5-8.5"/><path d="m17 5 3 3"/><path d="m15 7 2 2"/></>),
  rocket: (<><path d="M9 11a10 10 0 0 1 9-7c1 4-1 8-7 11l-2-4z"/><path d="M5 13c-1.5 1.5-2 5-2 5s3.5-.5 5-2"/><path d="M9 15l-2 2"/></>),
  bellOff: (<><path d="M6 8a6 6 0 0 1 9.3-5"/><path d="M18 8c0 7 3 9 3 9H7"/><path d="M10 21a2 2 0 0 0 4 0"/><path d="M3 3l18 18"/></>),
  download: (<><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></>),
  wifiOff: (<><path d="M2 8.8a16 16 0 0 1 4.6-2.6"/><path d="M10 5.5a16 16 0 0 1 11.6 3.3"/><path d="M5 12.3a11 11 0 0 1 3-1.9"/><path d="M8.5 16a6 6 0 0 1 7-1"/><path d="M12 20h.01"/><path d="M2 2l20 20"/></>),
  crown: (<><path d="M3 7l4 4 5-7 5 7 4-4-2 12H5L3 7z"/></>),
  wallet: (<><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18"/><circle cx="17" cy="14" r="1.2"/></>),
  logout: (<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></>),
  trash: (<><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14"/></>),
  book2: (<><path d="M4 5a2 2 0 0 1 2-2h13v18H6a2 2 0 0 1-2-2z"/><path d="M19 17H6a2 2 0 0 0-2 2"/></>),
  inbox: (<><path d="M3 12h5l2 3h4l2-3h5"/><path d="M5 5h14l2 7v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6l2-7z"/></>),
};

export function Icon({ name, size = 24, className = "", strokeWidth = 1.9 }: { name: string; size?: number; className?: string; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {P[name] ?? P.store}
    </svg>
  );
}

const CATEGORY_ICON: Record<string, string> = {
  "مطعم": "utensils", "حلاق": "scissors", "عيادة": "stethoscope", "مغسلة": "refresh",
  "بنك": "building", "بنق": "building", "صيدلية": "pill", "مخبز": "store", "سوبرماركت": "cart",
  "مكتبة": "book", "مركز طبي": "hospital", "معمل تحاليل": "flask", "عيادة أسنان": "tooth",
  "عيادة عيون": "stethoscope", "عيادة جلدية": "stethoscope", "عيادة عظام": "stethoscope",
  "عيادة أطفال": "stethoscope", "عيادة نساء": "stethoscope", "عيانة باطنة": "stethoscope",
};

export function categoryIcon(category: string): string {
  for (const [key, ic] of Object.entries(CATEGORY_ICON)) {
    if (category?.includes(key)) return ic;
  }
  return "store";
}

export default Icon;
