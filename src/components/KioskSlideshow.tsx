"use client";

import { useState, useEffect, useCallback, useRef, Fragment } from "react";
import LGULogo from "./shared/LGULogo";

// ────────── Types ──────────
type Slide = {
  id: number | string;
  type: "hero" | "info" | "announce" | "programs" | "news";
  data: Record<string, unknown>;
};

type LiveAnnouncement = {
  id: string | number;
  title: string;
  content: string;
  createdAt: string | Date;
};

type LiveNewsItem = {
  id: string | number;
  title: string;
  content: string;
  category: string;
  publishDate: string | Date;
  imageUrl?: string;
};


// ────────── Slide data ──────────
const slides: Slide[] = [
  {
    id: 1,
    type: "hero",
    data: {
      badge: "📢 Official Kiosk Portal",
      headline: "Welcome to\nMunicipality of Mapandan",
      sub: "Serving our community with transparency, integrity, and excellence. We are here to assist you.",
      bg: "/slide-welcome.png",
    },
  },
  {
    id: 2,
    type: "info",
    data: {
      icon: "🏛️",
      title: "Citizen\nServices",
      sub: "Access government services quickly and efficiently.",
      cards: [
        { 
          icon: "🪪", 
          title: "Barangay ID Card", 
          desc: "Process and secure your official Barangay Resident Identification Card required for local community verification and essential government transactions." 
        },
        { 
          icon: "📄", 
          title: "Civil Registry Records", 
          desc: "Obtain official, certified true copies of Birth Certificates, Marriage Licenses, or Death Certificates from the Municipal Civil Registry Office." 
        },
        { 
          icon: "🏪", 
          title: "Business Licensing", 
          desc: "Apply for or renew business permits, register commercial entities, process sanitary clearances, and secure local operational tax assessments." 
        },
        { 
          icon: "🏠", 
          title: "Property & Land Tax", 
          desc: "Verify local real property declarations, check assessment values, pay your annual Amilyar taxes, and request zoning clearance records." 
        },
      ],
    },
  },
  {
    id: 3,
    type: "announce",
    data: {
      heading: "Mapandan Announcements",
      items: [],
      emptyStateTitle: "No announcements available",
      emptyStateDesc: "Please check back later for official updates from the municipality.",
    },
  },
  {
    id: 4,
    type: "programs",
    data: {
      heading: "LGU Programs & Initiatives",
      programs: [
        { 
          icon: "🌾", 
          color: "green",  
          title: "AgriSupport Program",    
          desc: "Providing high-yield hybrid seeds, premium fertilizers, modern farm equipment, and direct technical seminars to increase harvests and support local Mapandan farming families." 
        },
        { 
          icon: "📚", 
          color: "blue",   
          title: "Edukasyon Mo Scholarship",   
          desc: "Empowering youth through educational financial grants, tuition assistance, textbook subsidies, and academic counseling for high-performing secondary and tertiary students." 
        },
        { 
          icon: "💊", 
          color: "red",    
          title: "Health for All Mission", 
          desc: "Bringing mobile medical consultations, free dental services, pediatric care, diagnostic tests, and critical maintenance medicines directly to citizens in all barangays." 
        },
        { 
          icon: "💼", 
          color: "gold",   
          title: "PESO Livelihood Projects",
          desc: "Organizing vocational skills workshops, local employment fairs, job matching systems, and startup capital support for displaced workers and small micro-entrepreneurs." 
        },
        { 
          icon: "♻️", 
          color: "teal",   
          title: "EcoMunicipyo Clean Drive",   
          desc: "Promoting green living through municipal zero-waste campaigns, plastic waste collection hubs, neighborhood recycling awards, and seasonal community tree planting drives." 
        },
        { 
          icon: "🏘️", 
          color: "purple", 
          title: "Pabahay Shelter Program",        
          desc: "Facilitating secure socialized housing registration, housing development grants, land rights assessment, and construction supply subsidies for families in need." 
        },
      ],
    },
  },
];

const SLIDE_DURATION = 8000; // ms each slide stays

// ────────── Sub-components ──────────

function HeroSlide({ data }: { data: Record<string, unknown> }) {
  const lines = (data.headline as string).split("\n");
  return (
    <div className="slide-hero">
      <div
        className="bg-image"
        style={{ backgroundImage: `url(${data.bg as string})` }}
      />
      <div className="content">
        <div className="hero-badge">{data.badge as string}</div>
        <h2>
          {lines.map((l, i) => (
            <span key={i}>
              {l}
              {i < lines.length - 1 && <br />}
            </span>
          ))}
        </h2>
        <div className="divider" />
        <p>{data.sub as string}</p>
      </div>
    </div>
  );
}

function InfoSlide({ data }: { data: Record<string, unknown> }) {
  const cards = data.cards as Array<{ icon: string; title: string; desc: string }>;
  const titleLines = (data.title as string).split("\n");
  return (
    <div className="slide-info">
      <div className="side-panel">
        <div>
          <div className="panel-icon">{data.icon as string}</div>
          <div className="gold-line" />
          <h2>
            {titleLines.map((l, i) => (
              <span key={i}>
                {l}
                {i < titleLines.length - 1 && <br />}
              </span>
            ))}
          </h2>
          <p>{data.sub as string}</p>
        </div>
        
        <div className="panel-footer">
          <div className="panel-footer-item">
            <span className="dot"></span>
            <span>Fast & Secure Verification</span>
          </div>
          <div className="panel-footer-item">
            <span className="dot"></span>
            <span>Official LGU Records</span>
          </div>
          <div className="panel-footer-item">
            <span className="dot"></span>
            <span>Real-time Processing Status</span>
          </div>
        </div>
      </div>

      <div className="cards-area">
        {cards.map((c, i) => (
          <div 
            className="service-card" 
            key={i}
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="card-top-content">
              <div className="card-header-row">
                <div className="card-icon">{c.icon}</div>
                <div className="status-pill">Available</div>
              </div>
              <h3>{c.title}</h3>
              <p>{c.desc}</p>
            </div>
            <div className="card-arrow">
              <span>Tap to inquire</span>
              <span>&rarr;</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnnounceSlide({ data }: { data: Record<string, unknown> }) {
  const items = data.items as Array<{
    title: string;
    desc: string;
    date: string;
    delay: number;
  }>;
  return (
    <div className="slide-announce">
      <div className="announce-header">
        <div className="tag">📌 Official Notices</div>
        <h2>{data.heading as string}</h2>
      </div>
      <div className="announce-list">
        {items.map((item, i) => (
          <div
            className="announce-item"
            key={i}
            style={{ animationDelay: `${item.delay}ms` }}
          >
            <div className="item-num">{i + 1}</div>
            <div className="item-body">
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
              <span className="date-badge">📅 {item.date}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProgramsSlide({ data }: { data: Record<string, unknown> }) {
  const programs = data.programs as Array<{
    icon: string;
    color: string;
    title: string;
    desc: string;
  }>;
  return (
    <div className="slide-programs">
      <div className="announce-header pb-4">
        <div className="tag bg-theme-primary/15 border-theme-primary/30 text-theme-primary">⚙️ LGU Initiatives</div>
        <h2>{data.heading as string}</h2>
      </div>
      <div className="programs-grid">
        {programs.map((p, i) => (
          <div 
            className={`program-card ${p.color}`} 
            key={i}
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="prog-icon">{p.icon}</div>
            <h3>{p.title}</h3>
            <p className="flex-1">{p.desc}</p>
            <div className="card-action-text">Active Initiative &rarr;</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NewsSlide({ data }: { data: Record<string, unknown> }) {
  const news = data.items as Array<{
    title: string;
    content: string;
    category: string;
    date: string;
    image?: string;
  }>;
  return (
    <div className="slide-announce">
      <div className="announce-header">
        <div className="tag bg-theme-primary/20 border-theme-primary text-theme-primary">📰 Latest News</div>
        <h2>Local Updates & Stories</h2>
      </div>
      <div className="announce-list">
        {news.map((item, i) => (
          <div
            className="announce-item"
            key={i}
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="item-num bg-theme-primary/20 border-theme-primary text-theme-primary">{i + 1}</div>
            <div className="item-body">
              <div className="flex items-center gap-2 mb-1">
                 <span className="text-[10px] font-black bg-slate-800 text-slate-300 px-2 py-0.5 rounded uppercase tracking-widest">{item.category}</span>
                 <span className="text-[10px] text-slate-500 font-bold">{item.date}</span>
              </div>
              <h3 className="line-clamp-1">{item.title}</h3>
              <p className="line-clamp-1">{item.content}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ────────── Clock ──────────
function KioskClock() {
  const [now, setNow] = useState(new Date());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => {
      clearTimeout(timer);
      clearInterval(id);
    };
  }, []);

  if (!mounted) return <div className="clock opacity-0" />;

  const time = now.toLocaleTimeString("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  const date = now.toLocaleDateString("en-PH", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return (
    <div className="clock">
      <div className="time">{time}</div>
      <div className="date">{date}</div>
    </div>
  );
}

// ────────── Main Slideshow ──────────
export default function KioskSlideshow() {
  const [current, setCurrent] = useState(0);
  const [progress, setProgress] = useState(0);
  const [allSlides, setAllSlides] = useState<Slide[]>(slides);
  const [liveAnnouncements, setLiveAnnouncements] = useState<LiveAnnouncement[]>([]);
  
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch live data
  useEffect(() => {
    async function fetchSlides() {
      try {
        const res = await fetch("/api/slides");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        
        // Base slides always shown
        const finalSlides: Slide[] = [
           slides[0], // Hero
           slides[1], // Info
           slides[3], // Programs
        ];

        // Add Announcements if they exist
        if (data.announcements && data.announcements.length > 0) {
            setLiveAnnouncements(data.announcements);
            finalSlides.push({
                id: "announce-live",
                type: "announce",
                data: {
                    heading: "Mapandan Announcements",
                    items: data.announcements.map((a: LiveAnnouncement, i: number) => ({
                        title: a.title,
                        desc: a.content,
                        date: new Date(a.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }),
                        delay: i * 100
                    }))
                }
            });
        }

        // Add News if they exist
        if (data.news && data.news.length > 0) {
            finalSlides.push({
                id: "news-live",
                type: "news",
                data: {
                    items: data.news.map((n: LiveNewsItem) => ({
                        title: n.title,
                        content: n.content,
                        category: n.category,
                        date: new Date(n.publishDate).toLocaleDateString("en-PH", { month: "short", day: "numeric" }),
                        image: n.imageUrl
                    }))
                }
            });
        }
        
        setAllSlides(finalSlides);
      } catch (err) {
        console.error("Slideshow fetch error:", err);
        // Fallback to static slides but filter out announce if it was placeholder
        setAllSlides(slides.filter(s => s.type !== "announce"));
      }
    }
    fetchSlides();
  }, []);

  const goTo = useCallback((idx: number) => {
    setCurrent(idx);
    setProgress(0);
  }, []);

  const goNext = useCallback(() => {
    setCurrent((c) => (c + 1) % allSlides.length);
    setProgress(0);
  }, [allSlides.length]);

  const goPrev = useCallback(() => {
    setCurrent((c) => (c - 1 + allSlides.length) % allSlides.length);
    setProgress(0);
  }, [allSlides.length]);

  // Auto-advance
  useEffect(() => {
    intervalRef.current = setInterval(goNext, SLIDE_DURATION);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [goNext, current, allSlides.length]);

  // Progress bar
  useEffect(() => {
    setProgress(0);
    const step = 100 / (SLIDE_DURATION / 100);
    progressRef.current = setInterval(() => {
      setProgress((p) => Math.min(p + step, 100));
    }, 100);
    return () => {
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [current]);

  function renderSlide(slide: Slide) {
    switch (slide.type) {
      case "hero":
        return <HeroSlide data={slide.data} />;
      case "info":
        return <InfoSlide data={slide.data} />;
      case "announce":
        return <AnnounceSlide data={slide.data} />;
      case "programs":
        return <ProgramsSlide data={slide.data} />;
      case "news":
        return <NewsSlide data={slide.data} />;
    }
  }

  return (
    <div className="kiosk-container">
      {/* Header */}
      <header className="kiosk-header">
        <div className="logo-area">
          <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center p-1 shadow-md">
            <LGULogo size={48} className="object-contain" />
          </div>
          <div className="logo-text">
            <h1>Municipality of Mapandan</h1>
            <p>Province of Pangasinan &nbsp;|&nbsp; Official Public Kiosk</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event("open-rfid-overlay"))}
            className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[10px] font-black uppercase tracking-[0.25em] text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            RFID Login
          </button>
          <KioskClock />
        </div>
      </header>

      {/* Ticker */}
      <div className="ticker-wrap">
        <span className="ticker-inner">
          {liveAnnouncements.length > 0 && liveAnnouncements.map((a, i) => (
            <Fragment key={`live-${i}`}>
                📌&nbsp; {a.title}: {a.content}
                <span className="ticker-sep">●</span>
            </Fragment>
          ))}
          📌&nbsp; NOTICE: Office hours are Monday to Friday, 8:00 AM – 5:00 PM
          <span className="ticker-sep">●</span>
          🏥&nbsp; Mapandan Health Mission - Every Wednesday at the RHU
          <span className="ticker-sep">●</span>
          📋&nbsp; Business permit renewals deadline extended to April 15, 2026
          <span className="ticker-sep">●</span>
          📞&nbsp; For inquiries, call the Mapandan Hall Hotline: (075) 555-0000
          <span className="ticker-sep">●</span>
          🌐&nbsp; Visit: www.mapandan.gov.ph for online services
          <span className="ticker-sep">●</span>
          ♻️&nbsp; Let&apos;s keep Mapandan clean — join the Linis Bayan program
          <span className="ticker-sep">●</span>
        </span>
      </div>

      {/* Slides */}
      <div className="slides-wrapper">
        {allSlides.map((slide, i) => (
          <div key={slide.id} className={`slide ${i === current ? "active" : ""}`}>
            {renderSlide(slide)}
          </div>
        ))}
      </div>

      {/* Footer */}
      <footer className="kiosk-footer">
        <button className="slide-nav-btn" onClick={goPrev}>
          ← Prev
        </button>

        <div className="progress-bar-wrap">
          <div
            className="progress-bar-inner progress-bar-inner-left"
            style={{ transform: `scaleX(${progress / 100})` }}
          />
        </div>

        <div className="slide-dots">
          {allSlides.map((_, i) => (
            <button
              key={i}
              className={`slide-dot ${i === current ? "active" : ""}`}
              onClick={() => goTo(i)}
            />
          ))}
        </div>

        <div className="progress-bar-wrap">
          <div
            className="progress-bar-inner progress-bar-inner-right"
            style={{ transform: `scaleX(${progress / 100})` }}
          />
        </div>

        <button className="slide-nav-btn" onClick={goNext}>
          Next →
        </button>
      </footer>
    </div>
  );
}
