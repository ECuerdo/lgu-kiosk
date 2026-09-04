"use client";

import { useState, useEffect, useCallback, useRef, Fragment } from "react";
import Image from "next/image";
import LGULogo from "./shared/LGULogo";
import { 
  Building2, 
  FileText, 
  ShieldAlert, 
  Newspaper, 
  PhoneCall, 
  Users, 
  HardHat, 
  Clock, 
  Radio, 
  CreditCard, 
  ChevronRight, 
  ArrowRight,
  Sparkles,
  MapPin,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";

// ────────── Data Interfaces ──────────
interface HeroSlideData {
  id: string;
  title: string;
  subtitle: string | null;
  tagline: string | null;
  imageUrl: string;
}

interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  priority: string;
  category: string;
  isPinned: boolean;
  createdAt: string;
}

interface NewsItem {
  id: string;
  title: string;
  content: string;
  author: string | null;
  category: string;
  imageUrl: string | null;
  publishDate: string;
}

interface ServiceItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string;
  baseFee: number;
  processingTime: string | null;
  slaDays: number;
  requiredDocs: unknown;
  pickupAddress: string | null;
}

interface OfficialItem {
  id: string;
  name: string;
  position: string;
  imageUrl: string | null;
  motto: string | null;
  category: string;
}

interface ProjectItem {
  id: string;
  title: string;
  category: string;
  status: string;
  location: string;
  budget: string | null;
  progress: number;
  imageUrl: string | null;
}

interface HotlineItem {
  id: string;
  name: string;
  category: string;
  mobileNumber: string | null;
  telephone: string | null;
}

interface KioskFeedData {
  heroSlides: HeroSlideData[];
  announcements: AnnouncementItem[];
  newsList: NewsItem[];
  services: ServiceItem[];
  officials: OfficialItem[];
  projects: ProjectItem[];
  hotlines: HotlineItem[];
}

const SLIDE_DURATION = 15000; // 15 seconds per slide - well-paced ambient cycle

// ────────── Fallback / Default Data ──────────
const DEFAULT_HERO = {
  title: "Welcome to the Municipality of Mapandan",
  subtitle: "Province of Pangasinan • Republic of the Philippines",
  tagline: "Empowering our citizens through digital transparency, progressive governance, and rapid public service.",
  bg: "/slide-welcome.png",
};

const DEFAULT_SERVICES = [
  {
    name: "Barangay ID & Clearance",
    category: "Community Affairs",
    processingTime: "Same Day",
    desc: "Official residency identification card and community clearance valid for local verification and legal transactions.",
  },
  {
    name: "Civil Registry Documents",
    category: "Civil Registry",
    processingTime: "1-2 Business Days",
    desc: "Certified true copies of Birth Certificate, Marriage License, and Death Registration certificates.",
  },
  {
    name: "Business Permit & Licensing",
    category: "BPLO / Treasury",
    processingTime: "2-3 Days",
    desc: "Commercial operations registration, annual business renewals, tax assessments, and sanitary inspection permits.",
  },
  {
    name: "Real Property Tax (Amilyar)",
    category: "Assessor / Treasury",
    processingTime: "Immediate",
    desc: "Check land & property assessment declarations, pay annual Amilyar dues, and request zoning clearance records.",
  },
  {
    name: "Senior Citizen & PWD Benefits",
    category: "MSWDO Office",
    processingTime: "Same Day",
    desc: "Application for National Senior Citizen ID, PWD Booklet, social pension assessment, and special financial assistance.",
  },
  {
    name: "Zoning & Building Clearances",
    category: "Engineering Office",
    processingTime: "3-5 Business Days",
    desc: "Locational clearances, residential construction permits, electrical inspection certificates, and fencing permits.",
  },
  {
    name: "Health Certificate & Sanitary Permit",
    category: "Rural Health Unit",
    processingTime: "Same Day",
    desc: "Medical laboratory assessments, food handler certifications, and sanitary clearances for local establishments.",
  },
  {
    name: "Farmer & Agricultural Assistance",
    category: "Agriculture Office",
    processingTime: "1-2 Days",
    desc: "RSBSA farmer registration, seed distribution programs, crop insurance verification, and livestock vaccination.",
  },
];

const DEFAULT_HOTLINES = [
  { name: "MDRRMO Rescue Dispatch", category: "Emergency", phone: "0998-123-4567" },
  { name: "Mapandan Municipal Police (PNP)", category: "Security", phone: "0998-555-0100" },
  { name: "Bureau of Fire Protection (BFP)", category: "Fire", phone: "(075) 555-1199" },
  { name: "Rural Health Unit (RHU Clinic)", category: "Medical", phone: "0920-777-2233" },
];

const DEFAULT_OFFICIALS: OfficialItem[] = [
  {
    id: "off-1",
    name: "HON. KARL CHRISTIAN F. VEGA",
    position: "MUNICIPAL MAYOR",
    imageUrl: null,
    motto: "Tapat at Progresibong Pamamahala para sa Mapandan",
    category: "EXECUTIVE",
  },
  {
    id: "off-2",
    name: "ANTHONY C. PENULIAR",
    position: "VICE MAYOR",
    imageUrl: null,
    motto: null,
    category: "EXECUTIVE",
  },
  {
    id: "off-3",
    name: "ALICIA A. MARIANO",
    position: "COUNCILOR",
    imageUrl: null,
    motto: null,
    category: "COUNCIL",
  },
  {
    id: "off-4",
    name: "PERCIVAL Z. BIAGTAN",
    position: "COUNCILOR",
    imageUrl: null,
    motto: null,
    category: "COUNCIL",
  },
  {
    id: "off-5",
    name: "BLANDO B. QUINTO",
    position: "COUNCILOR",
    imageUrl: null,
    motto: null,
    category: "COUNCIL",
  },
  {
    id: "off-6",
    name: "FREDERICK LALAS",
    position: "COUNCILOR",
    imageUrl: null,
    motto: null,
    category: "COUNCIL",
  },
  {
    id: "off-7",
    name: "MICHEAL A. CALIMLIM",
    position: "COUNCILOR",
    imageUrl: null,
    motto: null,
    category: "COUNCIL",
  },
  {
    id: "off-8",
    name: "FREDDIE R. PENULIAR",
    position: "COUNCILOR",
    imageUrl: null,
    motto: null,
    category: "COUNCIL",
  },
  {
    id: "off-9",
    name: "JOHN ERICSON L. PARAYNO",
    position: "COUNCILOR",
    imageUrl: null,
    motto: null,
    category: "COUNCIL",
  },
  {
    id: "off-10",
    name: "GEM T. CASTRO",
    position: "COUNCILOR",
    imageUrl: null,
    motto: null,
    category: "COUNCIL",
  },
  {
    id: "off-11",
    name: "ALEXANDER AQUINO",
    position: "LNB PRESIDENT",
    imageUrl: null,
    motto: null,
    category: "COUNCIL",
  },
  {
    id: "off-12",
    name: "DIEGO CASTRO",
    position: "SK FEDERATION PRESIDENT",
    imageUrl: null,
    motto: null,
    category: "COUNCIL",
  },
  {
    id: "off-13",
    name: "JOHN MANUEL",
    position: "PCL PRESIDENT",
    imageUrl: null,
    motto: null,
    category: "COUNCIL",
  },
];

const DEFAULT_PROJECTS: ProjectItem[] = [
  {
    id: "proj-1",
    title: "Construction of Mapandan Super Health Center & Emergency Complex",
    category: "Healthcare Infrastructure",
    status: "ONGOING",
    location: "Brgy. Poblacion, Mapandan",
    budget: "₱ 25,000,000.00",
    progress: 78,
    imageUrl: null,
  },
  {
    id: "proj-2",
    title: "Farm-to-Market Road Concreting & Solar Street Lighting Project",
    category: "Transportation & Energy",
    status: "ONGOING",
    location: "Brgy. Lupa – Torres Agricultural Corridor",
    budget: "₱ 14,500,000.00",
    progress: 92,
    imageUrl: null,
  },
  {
    id: "proj-3",
    title: "Rehabilitation of Municipal Public Market & Drainage Flood Control",
    category: "Economic Infrastructure",
    status: "ONGOING",
    location: "Commercial Commercial District, Poblacion",
    budget: "₱ 18,200,000.00",
    progress: 65,
    imageUrl: null,
  },
  {
    id: "proj-4",
    title: "Modern Multi-Purpose Evacuation & Disaster Response Command Center",
    category: "Disaster Preparedness",
    status: "PLANNING",
    location: "Brgy. Nilombot High Ground Zone",
    budget: "₱ 12,000,000.00",
    progress: 40,
    imageUrl: null,
  },
];

// ────────── Sub-Slide 1: Executive Welcome (Hero) ──────────
function HeroSlideView({ slide }: { slide?: HeroSlideData }) {
  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      {/* Background Image with Cinematic Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center filter brightness-[0.38] scale-105 transition-transform duration-1000 ease-out"
        style={{ backgroundImage: `url(${slide?.imageUrl || DEFAULT_HERO.bg})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#050816] via-transparent to-[#050816]/70 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_color-mix(in_srgb,var(--primary-theme)_15%,transparent)_0%,transparent_70%)] pointer-events-none" />

      <div className="relative z-10 max-w-5xl px-8 text-center flex flex-col items-center">
        <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-emerald-300 text-xs font-black uppercase tracking-[0.25em] shadow-2xl mb-8 animate-pulse">
          <Sparkles className="w-4 h-4 text-amber-400" />
          Official Municipal Terminal
        </div>

        <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-white tracking-tight leading-[1.15] drop-shadow-2xl mb-6">
          {slide?.title || DEFAULT_HERO.title}
        </h1>

        <div className="w-24 h-1.5 bg-gradient-to-r from-amber-400 via-emerald-400 to-amber-400 rounded-full mb-6 shadow-lg shadow-emerald-500/20" />

        <p className="text-lg md:text-2xl font-light text-slate-200 max-w-3xl leading-relaxed mb-4">
          {slide?.subtitle || DEFAULT_HERO.subtitle}
        </p>

        <p className="text-sm md:text-base text-slate-400 max-w-2xl font-normal leading-relaxed">
          {slide?.tagline || DEFAULT_HERO.tagline}
        </p>
      </div>
    </div>
  );
}

// ────────── Sub-Slide 2: Live Citizen Services Directory ──────────
function ServicesSlideView({ services }: { services: ServiceItem[] }) {
  const allServices = services && services.length > 0 ? services : DEFAULT_SERVICES;
  const ITEMS_PER_PAGE = 4;
  const totalPages = Math.max(1, Math.ceil(allServices.length / ITEMS_PER_PAGE));
  const [page, setPage] = useState(0);

  // Auto-rotate service pages every 7 seconds with smooth fade
  useEffect(() => {
    if (totalPages <= 1) return;
    const interval = setInterval(() => {
      setPage((prev) => (prev + 1) % totalPages);
    }, 7000);
    return () => clearInterval(interval);
  }, [totalPages]);

  const currentPageServices = allServices.slice(
    page * ITEMS_PER_PAGE,
    (page + 1) * ITEMS_PER_PAGE
  );

  return (
    <div className="relative w-full h-full flex flex-col justify-between p-5 sm:p-7 md:p-9 lg:p-10 overflow-hidden bg-gradient-to-br from-[#07121e] via-[#050816] to-[#041a12]">
      {/* Ambient background blur */}
      <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

      {/* Slide Header with Page Counter & Interactive Dots */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-end justify-between border-b border-white/10 pb-3 md:pb-4 gap-2 flex-shrink-0">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] sm:text-[11px] font-black uppercase tracking-widest mb-1">
            <Building2 className="w-3.5 h-3.5" />
            Citizen Charter & Services
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-snug">
            Municipal Service Directory
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Tap your Resident RFID Card anytime to directly request, track, or calculate processing assessments.
          </p>
        </div>

        {/* Right Status & Page Pills */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {totalPages > 1 && (
            <div className="flex items-center gap-2 bg-slate-900/80 border border-emerald-500/30 px-3 py-1.5 rounded-xl backdrop-blur-md">
              <span className="text-[11px] font-bold text-emerald-300">
                Page {page + 1} of {totalPages}
              </span>
              <div className="flex items-center gap-1.5 ml-1">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i)}
                    className={`h-1.5 transition-all duration-300 rounded-full ${
                      page === i ? "w-5 bg-emerald-400" : "w-1.5 bg-white/20 hover:bg-white/40"
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl backdrop-blur-md">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>LGU Active</span>
          </div>
        </div>
      </div>

      {/* Service Cards Grid - Full Vertical & Horizontal Stretch with Smooth Page Transition */}
      <div 
        key={page}
        className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 flex-1 my-3 md:my-4 min-h-0 animate-in fade-in duration-500"
      >
        {currentPageServices.map((srv, idx) => {
          const isReal = "slaDays" in srv;
          const name = srv.name;
          const category = srv.category || "Municipal Service";
          const time = isReal 
            ? (srv as ServiceItem).processingTime || `${(srv as ServiceItem).slaDays || 1} Day SLA`
            : (srv as { processingTime: string }).processingTime;
          const desc = isReal 
            ? (srv as ServiceItem).description || "Fast-tracked municipal document request service." 
            : (srv as { desc: string }).desc;

          return (
            <div 
              key={idx}
              className="group relative rounded-2xl bg-slate-900/70 border border-white/10 hover:border-emerald-500/50 p-5 sm:p-6 md:p-7 flex flex-col justify-between backdrop-blur-xl transition-all duration-200 shadow-xl hover:shadow-2xl hover:shadow-emerald-950/50"
            >
              {/* Top Row: Category + Available Pill */}
              <div className="flex items-center justify-between gap-3 mb-2 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
                    <FileText className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] sm:text-xs font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-md bg-white/10 text-emerald-300 border border-white/10">
                    {category}
                  </span>
                </div>
                <span className="text-[11px] sm:text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Available
                </span>
              </div>

              {/* Middle: Prominent Service Title & Full Clear Description */}
              <div className="my-auto py-2">
                <h3 className="text-lg sm:text-xl md:text-2xl font-black text-white mb-2 leading-snug group-hover:text-emerald-300 transition-colors">
                  {name}
                </h3>
                <p className="text-xs sm:text-sm md:text-base text-slate-300 leading-relaxed line-clamp-3 font-normal">
                  {desc}
                </p>
              </div>

              {/* Bottom Row: SLA Tag & RFID Tap Ready CTA */}
              <div className="pt-3 md:pt-4 border-t border-white/10 flex items-center justify-between text-xs sm:text-sm flex-shrink-0">
                <span className="text-slate-300 flex items-center gap-2 font-medium bg-slate-800/60 px-3 py-1.5 rounded-lg border border-white/5">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <span className="font-semibold text-white">{time}</span>
                </span>
                <span className="text-emerald-400 font-bold flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity bg-emerald-500/10 hover:bg-emerald-500/20 px-3.5 py-1.5 rounded-lg border border-emerald-500/30">
                  <span>RFID Tap Ready</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Service Footer Note */}
      <div className="relative z-10 flex items-center justify-between text-[11px] sm:text-xs text-slate-400 pt-2 border-t border-white/10 flex-shrink-0">
        <span>* Requirements and guidelines are based on the Citizen&apos;s Charter of Mapandan.</span>
        <span className="font-semibold text-emerald-400">Mapandan Municipal Frontline Services</span>
      </div>
    </div>
  );
}

// ────────── Sub-Slide 3: Pure Municipal Leadership & Council Showcase ──────────
function LeadershipSlideView({ officials }: { officials: OfficialItem[] }) {
  const allOfficials = officials && officials.length > 0 ? officials : DEFAULT_OFFICIALS;
  
  // Mayor is the top apex
  const mayor = allOfficials.find((o) => o.position.toUpperCase().includes("MAYOR") && !o.position.toUpperCase().includes("VICE")) || allOfficials[0];
  
  // Exclude mayor from the council roster
  const councilRoster = allOfficials.filter((o) => o.id !== mayor?.id);
  
  // Tier 1: 5 Members (Anthony Penuliar, Alicia Mariano, Percival Biagtan, Blando Quinto, Frederick Lalas)
  const tier1 = councilRoster.slice(0, 5);
  // Tier 2: 4 Members (Micheal Calimlim, Freddie Penuliar, John Ericson Parayno, Gem Castro)
  const tier2 = councilRoster.slice(5, 9);
  // Tier 3: 3 Members (Alexander Aquino, Diego Castro, John Manuel)
  const tier3 = councilRoster.slice(9, 12);

  return (
    <div className="relative w-full h-full flex flex-col justify-between p-3 sm:p-5 md:p-6 lg:p-7 overflow-hidden bg-gradient-to-br from-[#060a14] via-[#050816] to-[#0d070f] text-white">
      {/* Subtle atmospheric glow behind Mayor */}
      <div className="absolute top-28 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-rose-600/10 blur-[90px] pointer-events-none" />

      {/* Centered Grand Header: MUNICIPAL GOVERNMENT */}
      <div className="relative z-10 text-center flex-shrink-0 pt-1">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-black italic tracking-wider uppercase text-white drop-shadow-md">
          MUNICIPAL GOVERNMENT
        </h2>
        <div className="w-16 h-1 bg-rose-600 rounded-full mx-auto mt-1" />
      </div>

      {/* Main Pyramid Tree Canvas */}
      <div className="relative z-10 flex-1 flex flex-col justify-evenly my-auto min-h-0 py-1">
        {/* ────────── APEX: MAYOR ────────── */}
        <div className="flex flex-col items-center text-center flex-shrink-0">
          {/* Circular Portrait with Red/Crimson Accent Ring */}
          <div className="relative p-1 rounded-full bg-gradient-to-b from-rose-500/80 via-rose-700/50 to-slate-900 shadow-xl shadow-rose-950/50">
            <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-26 md:h-26 rounded-full overflow-hidden bg-slate-900/90 border-2 border-slate-950 flex items-center justify-center">
              {mayor.imageUrl ? (
                <Image src={mayor.imageUrl} alt={mayor.name} width={100} height={100} className="w-full h-full object-cover" unoptimized />
              ) : (
                <Users className="w-10 h-10 text-rose-300" />
              )}
            </div>
          </div>

          <h3 className="text-xs sm:text-sm md:text-base font-extrabold uppercase tracking-wide text-white mt-1.5 leading-tight">
            {mayor.name}
          </h3>
          <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-rose-500 mt-0.5 border-b border-rose-500/60 pb-0.5">
            {mayor.position}
          </span>
        </div>

        {/* ────────── TIER 1: 5 COUNCIL MEMBERS ────────── */}
        <div className="flex items-center justify-center gap-4 sm:gap-8 md:gap-12 flex-shrink-0">
          {tier1.map((off, idx) => (
            <div key={idx} className="flex flex-col items-center text-center max-w-[85px] sm:max-w-[115px]">
              <div className="p-0.5 rounded-full bg-slate-800 border border-white/20 shadow-md">
                <div className="w-11 h-11 sm:w-13 sm:h-13 md:w-15 md:h-15 rounded-full overflow-hidden bg-slate-900 flex items-center justify-center">
                  {off.imageUrl ? (
                    <Image src={off.imageUrl} alt={off.name} width={60} height={60} className="w-full h-full object-cover" unoptimized />
                  ) : (
                    <Users className="w-5 h-5 text-slate-400" />
                  )}
                </div>
              </div>
              <h4 className="text-[9px] sm:text-[10px] md:text-[11px] font-bold text-white uppercase tracking-tight leading-tight mt-1 truncate w-full">
                {off.name}
              </h4>
              <span className="text-[7px] sm:text-[8px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
                {off.position}
              </span>
            </div>
          ))}
        </div>

        {/* ────────── TIER 2: 4 COUNCIL MEMBERS ────────── */}
        <div className="flex items-center justify-center gap-5 sm:gap-10 md:gap-14 flex-shrink-0">
          {tier2.map((off, idx) => (
            <div key={idx} className="flex flex-col items-center text-center max-w-[90px] sm:max-w-[120px]">
              <div className="p-0.5 rounded-full bg-slate-800 border border-white/20 shadow-md">
                <div className="w-11 h-11 sm:w-13 sm:h-13 md:w-15 md:h-15 rounded-full overflow-hidden bg-slate-900 flex items-center justify-center">
                  {off.imageUrl ? (
                    <Image src={off.imageUrl} alt={off.name} width={60} height={60} className="w-full h-full object-cover" unoptimized />
                  ) : (
                    <Users className="w-5 h-5 text-slate-400" />
                  )}
                </div>
              </div>
              <h4 className="text-[9px] sm:text-[10px] md:text-[11px] font-bold text-white uppercase tracking-tight leading-tight mt-1 truncate w-full">
                {off.name}
              </h4>
              <span className="text-[7px] sm:text-[8px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
                {off.position}
              </span>
            </div>
          ))}
        </div>

        {/* ────────── TIER 3: 3 COUNCIL MEMBERS / SECTORAL ────────── */}
        <div className="flex items-center justify-center gap-6 sm:gap-12 md:gap-16 flex-shrink-0">
          {tier3.map((off, idx) => (
            <div key={idx} className="flex flex-col items-center text-center max-w-[95px] sm:max-w-[125px]">
              <div className="p-0.5 rounded-full bg-slate-800 border border-white/20 shadow-md">
                <div className="w-11 h-11 sm:w-13 sm:h-13 md:w-15 md:h-15 rounded-full overflow-hidden bg-slate-900 flex items-center justify-center">
                  {off.imageUrl ? (
                    <Image src={off.imageUrl} alt={off.name} width={60} height={60} className="w-full h-full object-cover" unoptimized />
                  ) : (
                    <Users className="w-5 h-5 text-slate-400" />
                  )}
                </div>
              </div>
              <h4 className="text-[9px] sm:text-[10px] md:text-[11px] font-bold text-white uppercase tracking-tight leading-tight mt-1 truncate w-full">
                {off.name}
              </h4>
              <span className="text-[7px] sm:text-[8px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
                {off.position}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Note */}
      <div className="relative z-10 flex items-center justify-between text-[10px] sm:text-xs text-slate-400 pt-1.5 border-t border-white/10 flex-shrink-0">
        <span>Sangguniang Bayan of Mapandan, Pangasinan • 2025–2028 Term</span>
        <span className="font-semibold text-rose-500">Official Municipal Council</span>
      </div>
    </div>
  );
}

// ────────── Sub-Slide 4: Dedicated Public Works & Transparency Projects ──────────
function ProjectsSlideView({ projects }: { projects: ProjectItem[] }) {
  const allProjects = projects && projects.length > 0 ? projects : DEFAULT_PROJECTS;

  return (
    <div className="relative w-full h-full flex flex-col justify-between p-5 sm:p-7 md:p-9 lg:p-10 overflow-hidden bg-gradient-to-br from-[#041a12] via-[#050816] to-[#0c1e19]">
      {/* Ambient background blur */}
      <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />

      {/* Slide Header */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-end justify-between border-b border-white/10 pb-3 md:pb-4 gap-2 flex-shrink-0">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] sm:text-[11px] font-black uppercase tracking-widest mb-1">
            <HardHat className="w-3.5 h-3.5" />
            Infrastructure, Transparency & Progress
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-snug">
            Major Public Works & Community Projects
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Full accountability and real-time status monitoring of ongoing municipal infrastructure.
          </p>
        </div>
        <div className="sm:text-right flex-shrink-0">
          <span className="inline-block text-[11px] sm:text-xs font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full">
            ● Full Transparency Compliant
          </span>
        </div>
      </div>

      {/* Projects Grid: 4 Grand Full-Height Cards (2x2 Layout) */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 flex-1 my-3 md:my-4 min-h-0">
        {allProjects.slice(0, 4).map((proj, idx) => (
          <div 
            key={idx}
            className="p-5 sm:p-6 rounded-2xl bg-slate-900/70 border border-white/10 hover:border-emerald-500/50 backdrop-blur-xl flex flex-col justify-between transition-all duration-200 shadow-xl hover:shadow-2xl hover:shadow-emerald-950/50"
          >
            {/* Top Row: Category + Status Badge */}
            <div className="flex items-start justify-between gap-3 mb-2 flex-shrink-0">
              <span className="text-[10px] sm:text-xs font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-md bg-white/10 text-emerald-300 border border-white/10">
                {proj.category}
              </span>
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {proj.status}
              </span>
            </div>

            {/* Middle: Project Title & Location */}
            <div className="my-auto py-2">
              <h3 className="text-base sm:text-lg md:text-xl font-black text-white leading-snug mb-2">
                {proj.title}
              </h3>
              <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-300">
                <MapPin className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span className="truncate">{proj.location}</span>
              </div>
            </div>

            {/* Bottom Row: Progress Bar & Allocated Budget */}
            <div className="pt-3 border-t border-white/10 flex flex-col gap-2 flex-shrink-0">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="text-slate-400 font-medium">Physical Completion</span>
                <span className="font-mono font-black text-emerald-400">{proj.progress}%</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                  style={{ width: `${proj.progress}%` }}
                />
              </div>

              {proj.budget && (
                <div className="flex items-center justify-between text-[11px] sm:text-xs text-slate-400 mt-1">
                  <span>Authorized Budget:</span>
                  <span className="font-mono font-bold text-white bg-white/5 px-2 py-0.5 rounded border border-white/10">
                    {proj.budget}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Note */}
      <div className="relative z-10 flex items-center justify-between text-[11px] sm:text-xs text-slate-400 pt-2 border-t border-white/10 flex-shrink-0">
        <span>Public Funds Transparency Act • Municipal Engineering & Planning Development Office</span>
        <span className="font-semibold text-emerald-400">Municipality of Mapandan Portal</span>
      </div>
    </div>
  );
}

// ────────── Sub-Slide 4: News & Municipal Advisories ──────────
function NewsSlideView({ news, announcements }: { news: NewsItem[]; announcements: AnnouncementItem[] }) {
  const latestNews = news.slice(0, 3);
  const notices = announcements.slice(0, 4);

  return (
    <div className="relative w-full h-full flex flex-col justify-between p-5 sm:p-7 md:p-10 lg:p-12 overflow-y-auto lg:overflow-hidden bg-gradient-to-br from-[#051124] via-[#050816] to-[#121c2b]">
      {/* Header */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-end justify-between border-b border-white/10 pb-4 md:pb-5 gap-2 flex-shrink-0">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-blue-500/20 border border-blue-400/30 text-blue-300 text-[10px] sm:text-[11px] font-black uppercase tracking-widest mb-1.5">
            <Newspaper className="w-3.5 h-3.5" />
            Official Bulletin
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-snug">
            News & Municipal Advisories
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Stay informed with verified updates and administrative orders from the local government.
          </p>
        </div>
        <div className="hidden md:block text-right text-[11px] sm:text-xs text-slate-400 flex-shrink-0">
          Updated Daily • Public Information Office
        </div>
      </div>

      {/* Grid */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 my-auto py-4">
        {/* Left: News Cards (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-blue-400 flex items-center gap-2">
            <Newspaper className="w-4 h-4" /> Latest Municipal News
          </h3>

          {latestNews.length > 0 ? (
            latestNews.map((item, idx) => (
              <div 
                key={idx}
                className="p-4 rounded-xl bg-slate-900/60 border border-white/10 backdrop-blur-md flex gap-4 items-start"
              >
                {item.imageUrl && (
                  <div className="w-24 h-24 rounded-lg overflow-hidden bg-slate-800 flex-shrink-0">
                    <Image 
                      src={item.imageUrl} 
                      alt={item.title} 
                      width={96} 
                      height={96} 
                      className="w-full h-full object-cover" 
                      unoptimized 
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">
                      {item.category}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {new Date(item.publishDate).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  </div>
                  <h4 className="text-sm md:text-base font-bold text-white line-clamp-1 mb-1">
                    {item.title}
                  </h4>
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {item.content}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 rounded-xl bg-slate-900/40 border border-white/10 text-center text-slate-400 text-xs">
              No recent news articles published today. Check back shortly for official press releases.
            </div>
          )}
        </div>

        {/* Right: Urgent Bulletins & Notices (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Official Notices & Circulars
          </h3>

          <div className="flex flex-col gap-3">
            {notices.length > 0 ? (
              notices.map((n, idx) => (
                <div 
                  key={idx}
                  className="p-3.5 rounded-xl bg-slate-900/50 border border-white/10 backdrop-blur-md flex flex-col gap-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-amber-300 uppercase">
                      {n.priority === "URGENT" ? "🔴 URGENT ADVISORY" : "📌 Announcement"}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(n.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                  <h5 className="text-xs font-bold text-white leading-snug">{n.title}</h5>
                  <p className="text-[11px] text-slate-400 line-clamp-2">{n.content}</p>
                </div>
              ))
            ) : (
              <div className="p-6 rounded-xl bg-slate-900/40 border border-white/10 text-center text-slate-400 text-xs">
                Office Hours: 8:00 AM - 5:00 PM, Mondays through Fridays.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="relative z-10 flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-white/10">
        <span>Information & Communications Technology Office (ICTO)</span>
        <span className="font-semibold text-blue-400">Mapandan Press Release</span>
      </div>
    </div>
  );
}

// ────────── Sub-Slide 5: Public Safety & Emergency Hotlines ──────────
function EmergencySlideView({ hotlines }: { hotlines: HotlineItem[] }) {
  const displayHotlines = hotlines.length > 0 ? hotlines : DEFAULT_HOTLINES;

  return (
    <div className="relative w-full h-full flex flex-col justify-between p-5 sm:p-7 md:p-10 lg:p-12 overflow-y-auto lg:overflow-hidden bg-gradient-to-br from-[#1a0c10] via-[#050816] to-[#140a12]">
      {/* Header */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-end justify-between border-b border-white/10 pb-4 md:pb-5 gap-2 flex-shrink-0">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-rose-500/20 border border-rose-400/30 text-rose-300 text-[10px] sm:text-[11px] font-black uppercase tracking-widest mb-1.5 animate-pulse">
            <ShieldAlert className="w-3.5 h-3.5" />
            Public Safety & Disaster Response
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-snug">
            Emergency Hotlines & Medical Dispatch
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            24/7 First Responders, Police Assistance, Fire Protection, and Rural Health Services.
          </p>
        </div>
        <div className="sm:text-right flex-shrink-0">
          <span className="inline-block text-[11px] sm:text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/30 px-3 py-1 rounded-full">
            ● 24/7 Hotline Operations Active
          </span>
        </div>
      </div>

      {/* Hotline Cards Grid */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 my-auto py-3">
        {displayHotlines.map((h, idx) => {
          const number = "telephone" in h 
            ? (h as HotlineItem).mobileNumber || (h as HotlineItem).telephone || "Direct Hall Line"
            : (h as { phone: string }).phone;

          return (
            <div 
              key={idx}
              className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-900/70 border border-white/10 hover:border-rose-500/40 backdrop-blur-xl flex items-center justify-between gap-3 shadow-lg hover:shadow-rose-950/30 transition-all duration-200"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 flex-shrink-0">
                  <PhoneCall className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-widest text-rose-300 bg-rose-500/15 px-1.5 py-0.5 rounded">
                    {h.category}
                  </span>
                  <h4 className="text-xs sm:text-sm md:text-base font-bold text-white mt-0.5 truncate">{h.name}</h4>
                  <p className="text-[10px] sm:text-xs text-slate-400 hidden sm:block truncate">Toll-free within Mapandan jurisdiction</p>
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <div className="text-xs sm:text-sm md:text-base font-bold font-mono text-amber-400 tracking-wide">
                  {number}
                </div>
                <span className="text-[9px] sm:text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Immediate Dispatch</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between text-[11px] sm:text-xs text-slate-400 pt-2.5 border-t border-white/10 gap-1 flex-shrink-0">
        <span>In case of severe typhoons, flooding, or medical crisis, call MDRRMO directly.</span>
        <span className="font-semibold text-rose-400">Mapandan Emergency Operations Center</span>
      </div>
    </div>
  );
}

// ────────── Live PST Digital Clock ──────────
function PSTClock() {
  const [timeStr, setTimeStr] = useState("");
  const [dateStr, setDateStr] = useState("");

  useEffect(() => {
    function update() {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString("en-PH", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
      setDateStr(
        now.toLocaleDateString("en-PH", {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      );
    }
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="text-right flex flex-col justify-center">
      <div className="text-xl md:text-2xl font-black font-mono text-white tracking-wide leading-none">
        {timeStr || "--:--:--"}
      </div>
      <div className="text-[11px] font-bold uppercase tracking-widest text-emerald-400 mt-1">
        PST • {dateStr || "Philippine Time"}
      </div>
    </div>
  );
}

// ────────── Main Kiosk Slideshow Component ──────────
export default function KioskSlideshow() {
  const [feed, setFeed] = useState<KioskFeedData | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [progress, setProgress] = useState(0);

  // Total slides count:
  // 0: Hero Slide
  // 1: Services Directory
  // 2: Municipal Leadership & Council Directory
  // 3: Major Infrastructure & Public Works Projects
  // 4: News & Notices
  // 5: Emergency Hotlines
  const TOTAL_SLIDES = 6;

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % TOTAL_SLIDES);
    setProgress(0);
  }, [TOTAL_SLIDES]);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + TOTAL_SLIDES) % TOTAL_SLIDES);
    setProgress(0);
  }, [TOTAL_SLIDES]);

  // Fetch Kiosk Feed Data
  useEffect(() => {
    async function loadFeed() {
      try {
        const res = await fetch("/api/kiosk/feed");
        if (res.ok) {
          const data = await res.json();
          setFeed(data);
        }
      } catch (err) {
        console.error("Failed to load kiosk feed data:", err);
      }
    }
    loadFeed();
    // Poll updates every 3 minutes
    const interval = setInterval(loadFeed, 180000);
    return () => clearInterval(interval);
  }, []);

  // Automatic Slide Rotation
  useEffect(() => {
    const timer = setInterval(nextSlide, SLIDE_DURATION);
    return () => clearInterval(timer);
  }, [nextSlide, currentSlide]);

  // Smooth Progress Bar
  useEffect(() => {
    setProgress(0);
    const step = 100 / (SLIDE_DURATION / 100);
    const pTimer = setInterval(() => {
      setProgress((old) => Math.min(old + step, 100));
    }, 100);
    return () => clearInterval(pTimer);
  }, [currentSlide]);

  return (
    <div className="relative w-screen h-screen flex flex-col bg-[#050816] text-white overflow-hidden select-none">
      {/* ────────── Persistent Top Executive Header ────────── */}
      <header className="relative z-50 h-16 sm:h-20 px-4 sm:px-8 bg-slate-950/90 border-b border-white/10 backdrop-blur-xl flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-14 sm:h-14 bg-white rounded-full flex items-center justify-center p-1 shadow-lg shadow-black/50 border border-emerald-500/30 flex-shrink-0">
            <LGULogo size={40} className="object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg md:text-xl font-black uppercase tracking-wider text-white">
                Municipality of Mapandan
              </h1>
              <span className="hidden md:inline-block px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-widest border border-emerald-500/30">
                Pangasinan
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-slate-400 font-medium line-clamp-1">
              Official Interactive Public Service & Information Terminal
            </p>
          </div>
        </div>

        {/* Right Status Badges & PST Clock */}
        <div className="flex items-center gap-3 sm:gap-6">
          {/* RFID Hardware Active Pulse */}
          <div className="hidden sm:flex items-center gap-2.5 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] sm:text-xs font-bold">
            <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-emerald-500"></span>
            </span>
            <span>RFID Ready</span>
          </div>

          <div className="h-6 sm:h-8 w-px bg-white/10 hidden sm:block" />

          <PSTClock />
        </div>
      </header>

      {/* ────────── Urgent Announcement Marquee Ticker ────────── */}
      <div className="relative z-40 bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 border-b border-emerald-500/20 py-1.5 px-3 sm:px-6 flex items-center overflow-hidden flex-shrink-0">
        <div className="flex items-center gap-1.5 sm:gap-2 text-emerald-300 font-black text-[10px] sm:text-xs uppercase tracking-widest pr-2 sm:pr-4 border-r border-emerald-400/20 flex-shrink-0">
          <Radio className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400 animate-pulse" />
          <span>Notice:</span>
        </div>

        <div className="overflow-hidden whitespace-nowrap w-full pl-3 sm:pl-4">
          <div className="inline-block animate-[ticker_110s_linear_infinite] hover:[animation-play-state:paused] text-xs font-semibold text-slate-200">
            {feed?.announcements && feed.announcements.length > 0 ? (
              feed.announcements.map((a, i) => (
                <Fragment key={i}>
                  <span className="text-amber-300 font-bold">[{a.category}]</span> {a.title}: {a.content}
                  <span className="mx-4 sm:mx-6 text-emerald-400">●</span>
                </Fragment>
              ))
            ) : null}
            <span>Welcome to the Municipal Hall of Mapandan • Office hours: Mon to Fri, 8:00 AM – 5:00 PM</span>
            <span className="mx-4 sm:mx-6 text-emerald-400">●</span>
            <span>For inquiries, contact the Mayor&apos;s Information Desk at (075) 555-0000</span>
            <span className="mx-4 sm:mx-6 text-emerald-400">●</span>
            <span>Always secure and present your official Resident ID for fast lane verification</span>
            <span className="mx-4 sm:mx-6 text-emerald-400">●</span>
          </div>
        </div>
      </div>

      {/* ────────── Center Carousel Showcase ────────── */}
      <main className="relative flex-1 w-full overflow-hidden">
        {/* Slide 0: Hero */}
        <div className={`absolute inset-0 transition-opacity duration-1000 ${currentSlide === 0 ? "opacity-100 z-10 pointer-events-auto" : "opacity-0 z-0 pointer-events-none"}`}>
          <HeroSlideView slide={feed?.heroSlides?.[0]} />
        </div>

        {/* Slide 1: Services Directory */}
        <div className={`absolute inset-0 transition-opacity duration-1000 ${currentSlide === 1 ? "opacity-100 z-10 pointer-events-auto" : "opacity-0 z-0 pointer-events-none"}`}>
          <ServicesSlideView services={feed?.services || []} />
        </div>

        {/* Slide 2: Municipal Leadership & Council */}
        <div className={`absolute inset-0 transition-opacity duration-1000 ${currentSlide === 2 ? "opacity-100 z-10 pointer-events-auto" : "opacity-0 z-0 pointer-events-none"}`}>
          <LeadershipSlideView officials={feed?.officials || []} />
        </div>

        {/* Slide 3: Major Public Works & Infrastructure Projects */}
        <div className={`absolute inset-0 transition-opacity duration-1000 ${currentSlide === 3 ? "opacity-100 z-10 pointer-events-auto" : "opacity-0 z-0 pointer-events-none"}`}>
          <ProjectsSlideView projects={feed?.projects || []} />
        </div>

        {/* Slide 4: News & Notices */}
        <div className={`absolute inset-0 transition-opacity duration-1000 ${currentSlide === 4 ? "opacity-100 z-10 pointer-events-auto" : "opacity-0 z-0 pointer-events-none"}`}>
          <NewsSlideView news={feed?.newsList || []} announcements={feed?.announcements || []} />
        </div>

        {/* Slide 5: Emergency Hotlines */}
        <div className={`absolute inset-0 transition-opacity duration-1000 ${currentSlide === 5 ? "opacity-100 z-10 pointer-events-auto" : "opacity-0 z-0 pointer-events-none"}`}>
          <EmergencySlideView hotlines={feed?.hotlines || []} />
        </div>
      </main>

      {/* ────────── Persistent Bottom Beacon ("Tap RFID to Start") ────────── */}
      <footer className="relative z-50 h-20 sm:h-24 px-4 sm:px-8 bg-slate-950/95 border-t border-white/10 backdrop-blur-2xl flex items-center justify-between flex-shrink-0">
        {/* Previous Slide Button */}
        <button 
          onClick={prevSlide}
          className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-[11px] sm:text-xs font-bold text-slate-300 transition-colors flex items-center gap-1.5"
        >
          ← <span className="hidden sm:inline">Prev</span>
        </button>

        {/* Prominent Tap Card CTA */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2 sm:gap-3 px-3.5 sm:px-6 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-emerald-600/30 via-teal-500/30 to-emerald-600/30 border border-emerald-400/40 shadow-2xl shadow-emerald-500/20 animate-pulse">
            <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-300 animate-bounce" />
            <div className="text-center">
              <div className="text-xs sm:text-sm font-black uppercase tracking-wider sm:tracking-widest text-white">
                Tap Resident RFID Card To Begin
              </div>
              <div className="text-[10px] sm:text-[11px] font-medium text-emerald-300 hidden sm:block">
                I-tap ang inyong RFID card upang mag-transact
              </div>
            </div>
            <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-300 hidden sm:block" />
          </div>

          {/* Dots Indicator */}
          <div className="flex items-center gap-1.5 sm:gap-2 mt-1.5 sm:mt-2">
            {Array.from({ length: TOTAL_SLIDES }).map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setCurrentSlide(idx);
                  setProgress(0);
                }}
                className={`h-1.5 transition-all duration-300 rounded-full ${
                  currentSlide === idx ? "w-6 sm:w-8 bg-emerald-400 shadow-md shadow-emerald-400/50" : "w-1.5 sm:w-2 bg-white/20"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Next Slide Button */}
        <button 
          onClick={nextSlide}
          className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-[11px] sm:text-xs font-bold text-slate-300 transition-colors flex items-center gap-1.5"
        >
          <span className="hidden sm:inline">Next</span> →
        </button>

        {/* Bottom edge progress line */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-900">
          <div 
            className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </footer>
    </div>
  );
}
