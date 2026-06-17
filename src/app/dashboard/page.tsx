"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import { 
  FileText, 
  CreditCard, 
  Users, 
  HeartPulse, 
  HandHelping, 
  Megaphone, 
  LogOut,
  Clock,
  MapPin,
  ShieldCheck,
  Building2,
  Home,
  Search,
  ChevronRight,
  UserCircle,
  Volume2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const AUTO_LOGOUT_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_SERVICE_AUTO_LOGOUT?.toLowerCase() === "true";

type Service = {
  id: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
  category: string;
};

const MUNICIPAL_SERVICES = (lang: "en" | "fil" | "pang" | "ilo"): Service[] => [
  { 
    id: "p1", 
    category: "Permits", 
    title: lang === "en" ? "Business Permit" : (lang === "fil" ? "Pahintulot sa Negosyo" : (lang === "pang" ? "Permiso na Negosyo" : "Permiso ti Negosio")), 
    desc: lang === "en" ? "New application or renewal of business license" : (lang === "fil" ? "Bagong aplikasyon o pagpapabago ng lisensya sa negosyo" : (lang === "pang" ? "Pan-apply na bago odino pan-renew na lisensya na negosyo" : "Baro nga aplikasion wenno pannakapabaro ti lisensya ti negosio")), 
    icon: <Building2 className="w-10 h-10" /> 
  },
  { 
    id: "p2", 
    category: "Permits", 
    title: lang === "en" ? "Locational Clearance" : (lang === "fil" ? "Pahintulot sa Lokasyon" : (lang === "pang" ? "Locational Clearance" : "Locational Clearance")), 
    desc: lang === "en" ? "Zoning and land use verification" : (lang === "fil" ? "Beripikasyon sa paggamit ng lupa at zoning" : (lang === "pang" ? "Pan-tsek na zoning tan usar na dalin" : "Pangtsek ti zoning ken panagusar ti daga")), 
    icon: <MapPin className="w-10 h-10" /> 
  },
  { 
    id: "p3", 
    category: "Permits", 
    title: lang === "en" ? "Building Permit" : (lang === "fil" ? "Pahintulot sa Gusali" : (lang === "pang" ? "Permiso na Algeban" : "Permiso ti Pannakabangon ti Pasdek")), 
    desc: lang === "en" ? "Apply for new construction and building clearances" : (lang === "fil" ? "Mag-apply para sa bagong konstruksyon at mga clearance sa gusali" : (lang === "pang" ? "Man-apply na algeban tan saray clearance na abong" : "Ag-apply para iti baro a pannakabangon ken clearances ti pasdek")), 
    icon: <Building2 className="w-10 h-10" /> 
  },
  { 
    id: "t1", 
    category: "Taxes", 
    title: lang === "en" ? "Real Property Tax" : (lang === "fil" ? "Buwis sa Ari-arian" : (lang === "pang" ? "Buwis na Ari-arian" : "Buis ti Sanikua")), 
    desc: lang === "en" ? "View assessment and pay RPT (Amilyar)" : (lang === "fil" ? "Tingnan ang pagtatasa at magbayad ng Amilyar" : (lang === "pang" ? "Nengnengen so assessment tan manbayar na Amilyar" : "Kitaen ti assessment ken agbayad ti Amilyar")), 
    icon: <CreditCard className="w-10 h-10" /> 
  },
  { 
    id: "t2", 
    category: "Taxes", 
    title: lang === "en" ? "Community Tax" : (lang === "fil" ? "Buwis sa Komunidad" : (lang === "pang" ? "Buwis na Komunidad" : "Buis ti Komunidad")), 
    desc: lang === "en" ? "Get your Cedula (CTC) quickly" : (lang === "fil" ? "Kumuha ng iyong Cedula (CTC) nang mabilis" : (lang === "pang" ? "Pangala na Cedula (CTC) ya maples" : "Mangala ti Sedula (CTC) a sipartak")), 
    icon: <FileText className="w-10 h-10" /> 
  },
  { 
    id: "c1", 
    category: "Records", 
    title: lang === "en" ? "Birth Certificate" : (lang === "fil" ? "Sertipiko ng Kapanganakan" : (lang === "pang" ? "Sertipiko na Niyanak" : "Sertipiko ti Pannakayanak")), 
    desc: lang === "en" ? "NSO/PSA certified true copy requests" : (lang === "fil" ? "Mga kahilingan para sa sertipikadong kopya ng NSO o PSA" : (lang === "pang" ? "Pangasingger na certified true copy na NSO odino PSA" : "Dawaten ti certified true copy ti NSO wenno PSA")), 
    icon: <Users className="w-10 h-10" /> 
  },
  { 
    id: "c2", 
    category: "Records", 
    title: lang === "en" ? "Marriage License" : (lang === "fil" ? "Lisensya sa Kasal" : (lang === "pang" ? "Lisensya na Kasal" : "Lisensya ti Kasar")), 
    desc: lang === "en" ? "Process requirements for civil marriage" : (lang === "fil" ? "Asikasuhin ang mga kinakailangan para sa sibil na kasal" : (lang === "pang" ? "Pan-proseso na saray kakaukolan para ed kasal" : "Pannakaproseso dagiti kasapulan para iti sibil a kasar")), 
    icon: <HandHelping className="w-10 h-10" /> 
  },
  { 
    id: "h1", 
    category: "Health", 
    title: lang === "en" ? "Health Certificate" : (lang === "fil" ? "Sertipiko sa Kalusugan" : (lang === "pang" ? "Sertipiko na Salun-at" : "Sertipiko ti Salun-at")), 
    desc: lang === "en" ? "For employment or sanitary permits" : (lang === "fil" ? "Para sa trabaho o mga permit sa kalinisan" : (lang === "pang" ? "Para ed trabaho odino permit ed sanitary" : "Para iti trabaho wenno permit ti sanitary")), 
    icon: <HeartPulse className="w-10 h-10" /> 
  },
  { 
    id: "h2", 
    category: "Health", 
    title: lang === "en" ? "Sanitary Permit" : (lang === "fil" ? "Pahintulot sa Kalinisan" : (lang === "pang" ? "Permiso na Sanitary" : "Permiso ti Sanitary")), 
    desc: lang === "en" ? "Food and establishment inspections" : (lang === "fil" ? "Mga inspeksyon sa pagkain at establisyimento" : (lang === "pang" ? "Inspeksyon na naakan tan establisimento" : "Inspeksion ti taraon ken establisimento")), 
    icon: <ShieldCheck className="w-10 h-10" /> 
  },
];

const BARANGAY_SERVICES = (lang: "en" | "fil" | "pang" | "ilo"): Service[] => [
  { 
    id: "b1", 
    category: "Certification", 
    title: lang === "en" ? "Barangay Clearance" : (lang === "fil" ? "Barangay Clearance" : (lang === "pang" ? "Barangay Clearance" : "Barangay Clearance")), 
    desc: lang === "en" ? "Standard clearance for various purposes" : (lang === "fil" ? "Karaniwang clearance para sa iba't ibang layunin" : (lang === "pang" ? "Karaniwang clearance para ed nanduruman usar" : "Kadawyan a clearance para iti nadumaduma a gakat")), 
    icon: <ShieldCheck className="w-10 h-10" /> 
  },
  { 
    id: "b2", 
    category: "Certification", 
    title: lang === "en" ? "Indigency Certificate" : (lang === "fil" ? "Sertipiko ng Indigency" : (lang === "pang" ? "Sertipiko na Indigency" : "Sertipiko ti Indigency")), 
    desc: lang === "en" ? "For social services and financial aid" : (lang === "fil" ? "Para sa mga serbisyong panlipunan at tulong pinansyal" : (lang === "pang" ? "Para ed tulong panlipunan tan tulong pinansyal" : "Para iti serbisio sosial ken tulong finansyal")), 
    icon: <HandHelping className="w-10 h-10" /> 
  },
  { 
    id: "b3", 
    category: "Certification", 
    title: lang === "en" ? "Residency Certificate" : (lang === "fil" ? "Sertipiko ng Residency" : (lang === "pang" ? "Sertipiko na Panrehente" : "Sertipiko ti Residensia")), 
    desc: lang === "en" ? "Proof of address within the barangay" : (lang === "fil" ? "Katibayan ng address sa loob ng barangay" : (lang === "pang" ? "Katibayan na address ed loob na barangay" : "Pammaneknek ti pagnaedan iti uneg ti barangay")), 
    icon: <Home className="w-10 h-10" /> 
  },
  { 
    id: "b4", 
    category: "News", 
    title: lang === "en" ? "Announcements" : (lang === "fil" ? "Mga Anunsyo" : (lang === "pang" ? "Saray Anunsyo" : "Dagiti Pakdaar")), 
    desc: lang === "en" ? "Latest barangay updates and events" : (lang === "fil" ? "Mga pinakabagong balita at kaganapan sa barangay" : (lang === "pang" ? "Saray bago ya balita tan kaganapan ed barangay" : "Kababaroan a damdamag ken pasken iti barangay")), 
    icon: <Megaphone className="w-10 h-10" /> 
  },
];

const CATEGORIES = {
  municipal: ["All", "Permits", "Taxes", "Records", "Health"],
  barangay: ["All", "Certification", "News"]
};

const TRANSLATIONS = {
  en: {
    verifiedSession: "VERIFIED SESSION",
    municipalCenter: "Municipal Center",
    barangayCenter: "Barangay Center",
    authenticatedResident: "Authenticated Resident",
    localCitizen: "Local Citizen",
    portal: "Portal",
    exit: "Exit",
    services: "Services",
    availableIn: "Available in Mapandan Government Portal",
    session: "Session",
    total: "TOTAL",
    servicesCount: "SERVICES",
    systemOnline: "System Online",
    startApp: "Start Application",
    voiceGuide: "Voice Guide",
    playAudio: "Play Audio",
    categories: {
      All: "All",
      Permits: "Permits",
      Taxes: "Taxes",
      Records: "Records",
      Health: "Health",
      Certification: "Certification",
      News: "News"
    }
  },
  fil: {
    verifiedSession: "BERIPIKADONG SESYON",
    municipalCenter: "Sentro ng Munisipyo",
    barangayCenter: "Sentro ng Barangay",
    authenticatedResident: "Nakatalagang Mamamayan",
    localCitizen: "Lokal na Mamamayan",
    portal: "Portal",
    exit: "Labas",
    services: "mga Serbisyo",
    availableIn: "Magagamit sa Portal ng Pamahalaan ng Mapandan",
    session: "Sesyon",
    total: "KABUUAN",
    servicesCount: "SERBISYO",
    systemOnline: "Aktibo ang Sistema",
    startApp: "Simulan ang Aplikasyon",
    voiceGuide: "Gabay sa Boses",
    playAudio: "Patugtugin",
    categories: {
      All: "Lahat",
      Permits: "Permiso",
      Taxes: "Buwis",
      Records: "Dokumento",
      Health: "Kalusugan",
      Certification: "Sertipiko",
      News: "Balita"
    }
  },
  pang: {
    verifiedSession: "APROBADO YA SESYON",
    municipalCenter: "Sentro na Munisipyo",
    barangayCenter: "Sentro na Barangay",
    authenticatedResident: "Beripikado ya Residente",
    localCitizen: "Lokal ya Umili",
    portal: "Portal",
    exit: "Paway",
    services: "saray Serbisyo",
    availableIn: "Nalmo ed Portal na Gobyerno na Mapandan",
    session: "Sesyon",
    total: "AMIN",
    servicesCount: "SERBISYO",
    systemOnline: "Aktibo so Sistema",
    startApp: "Gapoan so Aplikasyon",
    voiceGuide: "Tulong ed Boses",
    playAudio: "Dengelen",
    categories: {
      All: "Amin",
      Permits: "Permiso",
      Taxes: "Buwis",
      Records: "Dokumento",
      Health: "Salun-at",
      Certification: "Sertipikasyon",
      News: "Balita"
    }
  },
  ilo: {
    verifiedSession: "NASIGURADO A SESYON",
    municipalCenter: "Sentro ti Munisipyo",
    barangayCenter: "Sentro ti Barangay",
    authenticatedResident: "Beripikado a Residente",
    localCitizen: "Lokal nga Umili",
    portal: "Portal",
    exit: "Rummuar",
    services: "dagiti Serbisio",
    availableIn: "Adda iti Portal ti Gobierno ti Mapandan",
    session: "Sesyon",
    total: "DAGUP",
    servicesCount: "SERBISIO",
    systemOnline: "Aktibo ti Sistema",
    startApp: "Irugi ti Aplikasion",
    voiceGuide: "Gubay ti Boses",
    playAudio: "Denggen",
    categories: {
      All: "Amin",
      Permits: "Permiso",
      Taxes: "Buis",
      Records: "Dokumento",
      Health: "Salun-at",
      Certification: "Sertipikasion",
      News: "Damdamag"
    }
  }
};

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const type = (searchParams.get("type") || "municipal") as "municipal" | "barangay";
  const [activeCategory, setActiveCategory] = useState("All");
  const [lang, setLang] = useState<"en" | "fil" | "pang" | "ilo">("en");
  const [resident, setResident] = useState<{
    id: string;
    fullName: string;
    firstName: string;
    photoUrl?: string;
    livenessUrl?: string;
    imageUrl?: string;
    idFrontUrl?: string;
    barangay?: string;
    email?: string;
  } | null>(null);

  React.useEffect(() => {
    const saved = sessionStorage.getItem("active_resident");
    if (saved) {
      try {
        setResident(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse resident session:", e);
      }
    }
  }, []);

  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const residentPhotoUrl =
    resident?.photoUrl ||
    resident?.livenessUrl ||
    resident?.imageUrl ||
    resident?.idFrontUrl;

  const speakText = (text: string, voiceLang: string = "en-US") => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = voiceLang;
      
      // Select a natural/premium voice if available
      const voices = window.speechSynthesis.getVoices();
      
      // Look for natural or Google voices in the list matching the language
      const targetLang = voiceLang.toLowerCase().replace("_", "-");
      const bestVoice = voices.find(v => {
        const name = v.name.toLowerCase();
        const vLang = v.lang.toLowerCase().replace("_", "-");
        
        // Filter by matching language code prefix (e.g. 'en' or 'fil' / 'tl')
        const isLangMatch = vLang.startsWith(targetLang.split("-")[0]);
        
        // Prefer Google neural, Microsoft natural, or Apple premium voices
        const isNatural = name.includes("natural") || name.includes("google") || name.includes("premium") || name.includes("neural");
        
        return isLangMatch && isNatural;
      }) || voices.find(v => v.lang.toLowerCase().replace("_", "-").startsWith(targetLang.split("-")[0]));

      if (bestVoice) {
        utterance.voice = bestVoice;
      }

      // Voice adjustments to make it sound human-like
      utterance.rate = 0.95; // Slightly slower for clear, professional pacing
      utterance.pitch = 1.05; // Slightly warmer pitch
      utterance.volume = 1.0;  // Full clarity volume

      
      window.speechSynthesis.speak(utterance);
    }
  };

  const toggleVoice = () => {
    const nextState = !isVoiceEnabled;
    setIsVoiceEnabled(nextState);
    if (nextState) {
      // Speak indicator that voice is now ON
      let onMsg = "";
      if (lang === "en") onMsg = "Voice guide is now activated. Tap any service to hear its details.";
      else if (lang === "fil") onMsg = "Aktibo na ang gabay sa boses. Pindutin ang kahit anong serbisyo para marinig ang mga detalye.";
      else if (lang === "pang") onMsg = "Aktibo na so tulong ed boses. Pinduten so anggan dinan ya serbisyo para ed saray detalye.";
      else onMsg = "Aktibo ti gubay ti boses. Pinduten ti aniaman a serbisio tapno mangngeg ti detalye.";
      speakText(onMsg, lang === "en" ? "en-US" : "fil-PH");
    } else {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    }
  };

  const handleServiceClick = (service: Service) => {
    if (isVoiceEnabled) {
      const textToSpeak = `${service.title}. ${service.desc}`;
      speakText(textToSpeak, lang === "en" ? "en-US" : "fil-PH");
    }
    if (service.id === "p3") {
      router.push("/modules/building-permit");
    } else if (service.id === "p1") {
      router.push("/modules/business-permit");
    }
  };

  const rawServices = type === "municipal" ? MUNICIPAL_SERVICES(lang) : BARANGAY_SERVICES(lang);
  const services = Array.isArray(rawServices) ? rawServices : [];
  const filteredServices = activeCategory === "All" 
    ? services 
    : services.filter(s => s.category === activeCategory);

  const categories = CATEGORIES[type];
  const [timeLeft, setTimeLeft] = React.useState(60);

  React.useEffect(() => {
    if (!AUTO_LOGOUT_ENABLED) return;

    let timeout: ReturnType<typeof setTimeout>;

    const resetTimer = () => {
      if (timeout) clearTimeout(timeout);
      setTimeLeft(60);
      timeout = setTimeout(() => {
        sessionStorage.removeItem("active_resident");
        window.speechSynthesis?.cancel();
        router.replace("/");
      }, 60000);
    };

    // Initial timer
    resetTimer();

    // Activities that reset the timer
    const activities = ["pointerdown", "keydown", "touchstart", "wheel", "scroll"];
    
    activities.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    // Countdown for visual feedback (optional but helpful)
    const countdown = setInterval(() => {
        setTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => {
      if (timeout) clearTimeout(timeout);
      clearInterval(countdown);
      activities.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [router]);

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] overflow-hidden font-sans select-none">
      {AUTO_LOGOUT_ENABLED && timeLeft <= 15 && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/70 p-6 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[2rem] border border-amber-200 bg-white p-8 text-center shadow-2xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <Clock className="h-8 w-8" />
            </div>
            <p className="mt-5 text-[10px] font-black uppercase tracking-[0.25em] text-amber-600">
              Session Timeout
            </p>
            <h2 className="mt-2 text-2xl font-black uppercase text-slate-900">
              Are you still there?
            </h2>
            <p className="mt-3 text-sm font-medium text-slate-500">
              For your security, the kiosk will automatically log out in{" "}
              <span className="font-black text-red-600">
                {timeLeft} second{timeLeft === 1 ? "" : "s"}
              </span>.
            </p>
            <div className="mt-7 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  sessionStorage.removeItem("active_resident");
                  window.speechSynthesis?.cancel();
                  router.replace("/");
                }}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-xs font-black uppercase tracking-wider text-red-600"
              >
                <LogOut className="h-4 w-4" />
                Log Out
              </button>
              <button
                type="button"
                onClick={() => setTimeLeft(60)}
                className="flex-1 rounded-xl bg-[#1a6b3a] px-5 py-3 text-xs font-black uppercase tracking-wider text-white shadow-lg"
              >
                Continue Session
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* SIDEBAR - HIGH END DARK MODERN */}
      <aside className="w-24 md:w-28 bg-[#0F172A] flex flex-col items-center py-8 shadow-2xl relative z-30">
        <div className="mb-10">
            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center p-2 shadow-lg shadow-black/20">
                <Image 
                    src="/logo.png" 
                    alt="Mapandan Logo" 
                    width={48} 
                    height={48} 
                    className="object-contain"
                />
            </div>
        </div>

        <nav className="flex-1 w-full space-y-4 px-3">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`w-full group flex flex-col items-center justify-center py-5 px-2 rounded-2xl transition-all duration-300 ${
                activeCategory === cat 
                ? "bg-[#1a6b3a] text-white shadow-lg shadow-emerald-900/30 scale-105" 
                : "text-slate-500 hover:bg-slate-800 hover:text-slate-300"
              }`}
            >
              <div className="mb-2 transition-transform duration-300 group-hover:scale-110">
                {cat === "All" && <Search size={24} />}
                {cat === "Permits" && <Building2 size={24} />}
                {cat === "Taxes" && <CreditCard size={24} />}
                {cat === "Records" && <FileText size={24} />}
                {cat === "Health" && <HeartPulse size={24} />}
                {cat === "Certification" && <ShieldCheck size={24} />}
                {cat === "News" && <Megaphone size={24} />}
              </div>
              <span className="text-[9px] font-black uppercase tracking-[0.2em]">
                {TRANSLATIONS[lang].categories[cat as keyof typeof TRANSLATIONS.en.categories]}
              </span>
            </button>
          ))}
        </nav>

        <div className="mt-auto px-4 w-full pt-8 border-t border-slate-800">
            <button 
                onClick={() => {
                  sessionStorage.removeItem("active_resident");
                  router.push("/");
                }}
                className="w-full flex flex-col items-center justify-center py-6 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-2xl transition-all group"
            >
                <LogOut size={24} className="mb-2 transition-transform group-hover:translate-x-[-2px]" />
                <span className="text-[10px] font-black uppercase tracking-widest">{TRANSLATIONS[lang].exit}</span>
            </button>
        </div>
      </aside>

      {/* MAIN CONTENT WRAPPER */}
      <div className="flex-1 flex flex-col relative min-w-0 h-full">
        
        {/* HEADER AREA - PREMIUM WHITE */}
        <header className="h-[140px] bg-white border-b border-slate-200 flex items-center justify-between px-16 shadow-sm z-20 shrink-0">
          <div className="flex items-center gap-6">
            <div className="hidden lg:block">
               <div className="w-1.5 h-16 bg-[#1a6b3a] rounded-full"></div>
            </div>
            <div>
                <div className="flex items-center gap-3 mb-2">
                    <Badge className="bg-[#1a6b3a] border-none text-white font-black text-[9px] tracking-widest uppercase py-1 px-3">
                        {TRANSLATIONS[lang].verifiedSession}
                    </Badge>
                    <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                        <Clock size={14} className="text-[#4caf7d]" />
                        <span>Kiosk Map-01</span>
                    </div>
                </div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tighter">
                   {type === "municipal" ? TRANSLATIONS[lang].municipalCenter : TRANSLATIONS[lang].barangayCenter}
                </h1>
            </div>
          </div>

          <div className="flex items-center gap-8">
             <Button
                onClick={toggleVoice}
                className={`font-bold rounded-2xl flex items-center gap-2.5 px-4 py-5 shadow-lg active:scale-95 transition-all shrink-0 ${
                  isVoiceEnabled 
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-950/20" 
                    : "bg-slate-200 hover:bg-slate-300 text-slate-700 shadow-slate-300/20"
                }`}
             >
                <Volume2 className={`w-5 h-5 ${isVoiceEnabled ? "text-emerald-200 animate-bounce" : "text-slate-500"}`} />
                <div className="text-left select-none">
                  <span className={`block text-[8px] font-black uppercase tracking-widest leading-none ${isVoiceEnabled ? "text-emerald-300" : "text-slate-500"}`}>
                    {TRANSLATIONS[lang].voiceGuide}
                  </span>
                  <span className="block text-[11px] font-black uppercase">
                    {isVoiceEnabled ? "Guide ON" : "Guide OFF"}
                  </span>
                </div>
             </Button>

             <div className="text-right hidden sm:block">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{TRANSLATIONS[lang].authenticatedResident}</p>
                <div className="flex items-center gap-2 justify-end">
                    <span className="text-lg font-black text-slate-800">
                      {resident ? resident.fullName : TRANSLATIONS[lang].localCitizen}
                    </span>
                    <Badge variant="outline" className="text-[#1a6b3a] border-[#4caf7d] uppercase font-black text-[9px]">{TRANSLATIONS[lang].portal}</Badge>
                </div>
             </div>
             <div className="w-16 h-16 rounded-[2rem] bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden shadow-inner relative">
                {residentPhotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={residentPhotoUrl}
                    alt={resident.fullName} 
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <UserCircle className="w-10 h-10 text-slate-300" />
                )}
             </div>
          </div>
        </header>

        {/* SERVICE GRID AREA - WITH STICKY CATEGORY LABEL */}
        <main className="flex-1 overflow-y-auto bg-[#F1F5F9] relative flex flex-col">
            
             {/* STICKY SUB-HEADER */}
            <div className="sticky top-0 bg-[#F1F5F9]/80 backdrop-blur-xl px-16 py-8 z-10 border-b border-white/40 flex items-baseline justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="bg-[#1a6b3a] text-white p-2 rounded-xl">
                        {activeCategory === "All" ? <Search size={24} /> : <FileText size={24} />}
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">
                            {TRANSLATIONS[lang].categories[activeCategory as keyof typeof TRANSLATIONS.en.categories]} {activeCategory === "All" ? TRANSLATIONS[lang].services : ""}
                        </h2>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">
                            {TRANSLATIONS[lang].availableIn}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${timeLeft < 20 ? "bg-red-50 border-red-100 text-red-600 shadow-sm shadow-red-100" : "bg-white/60 border-slate-200 text-slate-500"} transition-all duration-300`}>
                        <Clock size={14} className={timeLeft < 10 ? "animate-pulse text-red-500" : "text-[#4caf7d]"} />
                        <span className="text-[10px] font-black uppercase tracking-widest leading-none">
                            {TRANSLATIONS[lang].session}: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                        </span>
                    </div>
                    <div className="text-[10px] font-black text-slate-500 bg-white/60 px-4 py-2 rounded-full border border-slate-200 uppercase tracking-widest shadow-sm">
                       {TRANSLATIONS[lang].total}: <span className="text-[#1a6b3a]">{filteredServices.length}</span> {TRANSLATIONS[lang].servicesCount}
                    </div>
                </div>
            </div>

            {/* THE GRID - REBUILT FOR ROBUSTNESS */}
            <div className="p-16 pb-24 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-12 w-full">
                {filteredServices.map((service) => (
                    <div 
                        key={service.id}
                        onClick={() => handleServiceClick(service)}
                        className="group flex flex-col min-h-[300px] bg-white rounded-3xl border border-slate-200/60 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-emerald-900/10 hover:border-[#4caf7d]/50 hover:scale-[1.01] transition-all duration-500 cursor-pointer overflow-hidden p-10 relative"
                    >
                        {/* Top Section */}
                        <div className="flex items-start justify-between mb-8">
                            <div className="w-20 h-20 rounded-2xl bg-slate-50 group-hover:bg-[#1a6b3a] flex items-center justify-center text-slate-400 group-hover:text-white transition-all duration-500 shadow-inner">
                                {service.icon}
                            </div>
                            <div className="text-right">
                                <span className="bg-[#1a6b3a]/10 text-[#1a6b3a] text-[9px] font-black px-4 py-2 rounded-full uppercase tracking-widest opacity-80 group-hover:opacity-100 transition-opacity">
                                    {service.category}
                                </span>
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col justify-center">
                            <h3 className="text-3xl font-black text-slate-900 tracking-tighter mb-3 group-hover:text-[#1a6b3a] transition-colors leading-tight">
                                {service.title}
                            </h3>
                            <p className="text-base text-slate-400 font-bold leading-relaxed group-hover:text-slate-600 transition-colors">
                                {service.desc}
                            </p>
                        </div>

                        <div className="mt-8 flex items-center justify-between pt-8 border-t border-slate-50">
                            <div className="flex items-center gap-2 text-[#1a6b3a] font-black text-xs uppercase tracking-[0.2em] transform translate-x-[-10px] transition-all duration-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-0">
                                {TRANSLATIONS[lang].startApp}
                                <ChevronRight size={18} />
                            </div>
                            <div className="h-14 w-14 bg-slate-50 group-hover:bg-[#1a6b3a] rounded-full flex items-center justify-center transition-all duration-500 shadow-inner group-hover:shadow-lg group-hover:shadow-emerald-900/30">
                                <ChevronRight className="w-6 h-6 text-slate-300 group-hover:text-white transition-colors" />
                            </div>
                        </div>

                        <div className="absolute top-2 right-4 opacity-[0.02] group-hover:opacity-[0.06] transition-opacity pointer-events-none">
                             <ShieldCheck size={140} className="rotate-12" />
                        </div>
                    </div>
                ))}
            </div>
        </main>

        <footer className="h-16 bg-white border-t border-slate-200 px-16 flex items-center justify-between z-20 shrink-0">
            <div className="flex items-center gap-12 text-[11px] font-black text-slate-400 uppercase tracking-widest h-full">
                <div className="flex items-center gap-3 text-[#1a6b3a]">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-[#1a6b3a]"></span>
                    </span>
                    {TRANSLATIONS[lang].systemOnline}
                </div>
                <div className="flex gap-6 h-full items-center">
                    <button 
                      onClick={() => setLang("en")}
                      className={`font-black uppercase tracking-widest h-full transition-colors ${lang === "en" ? "text-[#1a6b3a] border-b-2 border-[#1a6b3a]" : "text-slate-400 hover:text-slate-600"}`}
                    >
                      English Mode
                    </button>
                    <button 
                      onClick={() => setLang("fil")}
                      className={`font-black uppercase tracking-widest h-full transition-colors ${lang === "fil" ? "text-[#1a6b3a] border-b-2 border-[#1a6b3a]" : "text-slate-400 hover:text-slate-600"}`}
                    >
                      Filipino Mode
                    </button>
                    <button 
                      onClick={() => setLang("pang")}
                      className={`font-black uppercase tracking-widest h-full transition-colors ${lang === "pang" ? "text-[#1a6b3a] border-b-2 border-[#1a6b3a]" : "text-slate-400 hover:text-slate-600"}`}
                    >
                      Pangasinan Mode
                    </button>
                    <button 
                      onClick={() => setLang("ilo")}
                      className={`font-black uppercase tracking-widest h-full transition-colors ${lang === "ilo" ? "text-[#1a6b3a] border-b-2 border-[#1a6b3a]" : "text-slate-400 hover:text-slate-600"}`}
                    >
                      Ilocano Mode
                    </button>
                </div>
            </div>
            <div className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">
                Municipality of Mapandan • © 2026
            </div>
        </footer>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-white gap-6">
            <div className="w-24 h-24 border-8 border-slate-100 border-t-[#1a6b3a] rounded-full animate-spin"></div>
            <div className="text-center">
                <p className="text-[#1a6b3a] font-black text-xs uppercase tracking-[0.4em] animate-pulse">Initializing Interface</p>
                <p className="text-slate-400 text-[10px] font-bold uppercase mt-2">Please wait while we secure your connection</p>
            </div>
        </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
