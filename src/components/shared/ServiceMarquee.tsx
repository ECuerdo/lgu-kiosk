"use client";

import React, { Fragment, useEffect, useState } from "react";
import { Megaphone } from "lucide-react";

type Announcement = {
  id?: string;
  title: string;
  content: string;
};

const DEFAULT_NOTICES = [
  "NOTICE: Office hours are Monday to Friday, 8:00 AM - 5:00 PM",
  "For inquiries, call the Mapandan Municipal Hall Hotline: (075) 555-0000",
  "Visit www.mapandan.gov.ph for available online services",
  "Please prepare complete and valid documents before starting a service application",
];

export default function ServiceMarquee() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const notices = [
    ...announcements.map(announcement => `${announcement.title}: ${announcement.content}`),
    ...DEFAULT_NOTICES,
  ];

  useEffect(() => {
    let active = true;
    async function loadAnnouncements() {
      try {
        const response = await fetch("/api/slides", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        if (active && Array.isArray(data.announcements)) {
          setAnnouncements(data.announcements);
        }
      } catch (error) {
        console.error("Service marquee announcements error:", error);
      }
    }
    void loadAnnouncements();
    const refresh = window.setInterval(loadAnnouncements, 5 * 60 * 1000);
    return () => {
      active = false;
      window.clearInterval(refresh);
    };
  }, []);

  return (
    <div className="flex h-9 shrink-0 border-b border-emerald-700/30 bg-[#4caf7d] text-[#0d1b13]">
      <div className="z-10 flex shrink-0 items-center gap-2 bg-[#1a6b3a] px-4 text-[9px] font-black uppercase tracking-widest text-white shadow-md md:px-6">
        <Megaphone className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Announcements</span>
      </div>
      <div className="min-w-0 flex-1 overflow-hidden whitespace-nowrap">
        <div className="service-marquee-track h-full text-[11px] font-bold tracking-wide">
          {[0, 1].map(copy => (
            <div key={copy} className="service-marquee-copy">
              {notices.map((notice, index) => (
                <Fragment key={`${copy}-${index}-${notice}`}>
                  <span>{notice}</span>
                  <span className="mx-8 opacity-50">|</span>
                </Fragment>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
