"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  Skull,
  Sparkles,
  FileText,
  ArrowLeft,
  Info,
  X,
  Clock,
  BookOpen,
  Upload,
  CheckCircle2,
  FileCheck,
  HeartHandshake,
  User,
  Copy
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type ServiceStatus = "ACTIVE" | "COMING_SOON";

interface RegistryService {
  id: string;
  category: "BIRTH" | "DEATH" | "MARRIAGE";
  title: Record<string, string>;
  desc: Record<string, string>;
  icon: React.ReactNode;
  status: ServiceStatus;
  path?: string;
  requirements?: Record<string, string[]>;
  estimatedTime?: string;
  baseFee?: string;
}

const CIVIL_REGISTRY_SERVICES: RegistryService[] = [
  // BIRTH REGISTRY SERVICES
  {
    id: "birth-registration",
    category: "BIRTH",
    title: {
      en: "Birth Registration",
      fil: "Rehistro ng Kapanganakan",
      pang: "Rehistro na Inyanak",
      ilo: "Rehistro ti Nayanak"
    },
    desc: {
      en: "Register a new birth record (timely or late registration).",
      fil: "Iparehistro ang bagong panganak (sapat sa panahon o huli).",
      pang: "Iparehistro so bagon niyanak (husto ed panahon odino asakbay).",
      ilo: "Iparehistro ti kabarbaro a nayanak (husto iti panawen wenno naladaw)."
    },
    icon: <Clock className="w-8 h-8 text-theme-primary" />,
    status: "ACTIVE",
    path: "/modules/civil-registry/birth-registration"
  },
  {
    id: "birth-request",
    category: "BIRTH",
    title: {
      en: "Birth Certificate Request (True Copy)",
      fil: "Hiling ng Kopya ng Sertipiko ng Kapanganakan (True Copy)",
      pang: "Kerew na Kopya na Sertipiko na Niyanak (True Copy)",
      ilo: "Dawaten ti Kopya ti Sertipiko ti Pannakayanak (True Copy)"
    },
    desc: {
      en: "Request a certified true copy of an existing birth certificate.",
      fil: "Humingi ng sertipikadong kopya ng umiiral na sertipiko ng kapanganakan.",
      pang: "Pangasingger na certified true copy na walan sertipiko na niyanak.",
      ilo: "Dawaten ti certified true copy ti adda a sertipiko ti pannakayanak."
    },
    icon: <Copy className="w-8 h-8 text-theme-primary" />,
    status: "ACTIVE",
    path: "/modules/civil-registry/birth-certificate-request"
  },
  {
    id: "birth-psa",
    category: "BIRTH",
    title: {
      en: "Birth PSA Endorsement",
      fil: "Endorso ng Kapanganakan sa PSA",
      pang: "Endorso na Inyanak ed PSA",
      ilo: "Endorso ti Nayanak iti PSA"
    },
    desc: {
      en: "Request endorsement of a verified local birth certificate record to the PSA.",
      fil: "Humiling ng endorso ng lokal na sertipiko ng kapanganakan sa PSA.",
      pang: "Kerew na endorso na lokal ya sertipiko na niyanak ed PSA.",
      ilo: "Agdawat ti endorso ti lokal a sertipiko ti pannakayanak iti PSA."
    },
    icon: <FileCheck className="w-8 h-8 text-theme-primary" />,
    status: "COMING_SOON",
    estimatedTime: "3-5 Business Days",
    baseFee: "₱150.00",
    requirements: {
      en: [
        "Verified Local Birth Certificate Copy",
        "Valid ID of the requestor/parent",
        "PSA Negative Certification"
      ],
      fil: [
        "Beripikadong Kopya ng Lokal na Sertipiko ng Kapanganakan",
        "Valid ID ng nagre-request o magulang",
        "PSA Negative Certification"
      ]
    }
  },
  
  // DEATH REGISTRY SERVICES
  {
    id: "death-registration",
    category: "DEATH",
    title: {
      en: "Death Registration",
      fil: "Rehistro ng Pagpanaw",
      pang: "Rehistro na Inatey",
      ilo: "Rehistro ti Ipupusay"
    },
    desc: {
      en: "Register a death or request a certified death certificate.",
      fil: "Iparehistro ang pagpanaw o humingi ng sertipikadong kopya ng kamatayan.",
      pang: "Iparehistro so inatey odino kerew na kopya na sertipiko na inatey.",
      ilo: "Iparehistro ti ipupusay wenno agdawat ti sertipiko ti natay."
    },
    icon: <Skull className="w-8 h-8 text-theme-primary" />,
    status: "COMING_SOON",
    estimatedTime: "Same Day Processing",
    baseFee: "Free",
    requirements: {
      en: [
        "Certificate of Death signed by attending physician",
        "Informant's profile details & relationship",
        "Burial or transfer permit details",
        "Valid ID of the informant"
      ],
      fil: [
        "Sertipiko ng Pagpanaw na nilagdaan ng doktor",
        "Impormasyon ng nagparehistro at relasyon",
        "Burial o transfer permit",
        "Valid ID ng informant"
      ]
    }
  },
  {
    id: "death-request",
    category: "DEATH",
    title: {
      en: "Death Certificate Request (True Copy)",
      fil: "Hiling ng Kopya ng Sertipiko ng Kamatayan (True Copy)",
      pang: "Kerew na Kopya na Sertipiko na Inatey (True Copy)",
      ilo: "Dawaten ti Kopya ti Sertipiko ti Ipupusay (True Copy)"
    },
    desc: {
      en: "Request a certified true copy of an existing death certificate.",
      fil: "Humingi ng sertipikadong kopya ng umiiral na sertipiko ng kamatayan.",
      pang: "Pangasingger na certified true copy na walan sertipiko na inatey.",
      ilo: "Dawaten ti certified true copy ti adda a sertipiko ti ipupusay."
    },
    icon: <Copy className="w-8 h-8 text-theme-primary" />,
    status: "COMING_SOON",
    estimatedTime: "1-2 Business Days",
    baseFee: "₱115.00",
    requirements: {
      en: [
        "Deceased person's full name",
        "Date and place of death",
        "Valid ID of the requestor",
        "Authorization Letter (if not immediate family)"
      ],
      fil: [
        "Buong pangalan ng pumanaw",
        "Petsa at lugar ng pagkamatay",
        "Valid ID ng nag-request",
        "Authorization Letter (kung hindi malapit na kamag-anak)"
      ]
    }
  },
  {
    id: "death-psa",
    category: "DEATH",
    title: {
      en: "Death PSA Endorsement",
      fil: "Endorso ng Kamatayan sa PSA",
      pang: "Endorso na Inatey ed PSA",
      ilo: "Endorso ti Ipupusay iti PSA"
    },
    desc: {
      en: "Request endorsement of a verified local death certificate record to the PSA.",
      fil: "Humiling ng endorso ng lokal na sertipiko ng kamatayan sa PSA.",
      pang: "Kerew na endorso na lokal ya sertipiko na inatey ed PSA.",
      ilo: "Agdawat ti endorso ti lokal a sertipiko ti ipupusay iti PSA."
    },
    icon: <FileCheck className="w-8 h-8 text-theme-primary" />,
    status: "COMING_SOON",
    estimatedTime: "3-5 Business Days",
    baseFee: "₱150.00",
    requirements: {
      en: [
        "Verified Local Death Certificate Copy",
        "Valid ID of the requestor",
        "LCR Certification of Death record"
      ],
      fil: [
        "Beripikadong Kopya ng Lokal na Sertipiko ng Pagpanaw",
        "Valid ID ng nagre-request",
        "LCR Certification"
      ]
    }
  },

  // MARRIAGE REGISTRY SERVICES
  {
    id: "marriage-license",
    category: "MARRIAGE",
    title: {
      en: "Marriage License Application",
      fil: "Aplikasyon para sa Lisensya ng Kasal",
      pang: "Aplikasyon para ed Lisensya na Kasal",
      ilo: "Aplikasion para ti Lisensya ti Kasar"
    },
    desc: {
      en: "Apply for a legal license to be married in the Philippines.",
      fil: "Mag-apply para sa legal na lisensya sa kasal sa Pilipinas.",
      pang: "Man-apply na lisensya na kasal ed Pilipinas.",
      ilo: "Ag-apply para iti lisensya ti kasar ditoy Pilipinas."
    },
    icon: <HeartHandshake className="w-8 h-8 text-theme-primary" />,
    status: "COMING_SOON",
    estimatedTime: "10-12 Days",
    baseFee: "₱250.00",
    requirements: {
      en: [
        "Birth Certificate (PSA copy) of both applicants",
        "Certificate of No Marriage (CENOMAR) from PSA",
        "Pre-Marriage Counseling Certificate",
        "Parents' Consent (18-21) / Advice (22-25)",
        "Valid ID and Barangay Clearance of both applicants"
      ],
      fil: [
        "Birth Certificate (PSA copy) ng parehong aplikante",
        "Certificate of No Marriage (CENOMAR) mula sa PSA",
        "Pre-Marriage Counseling Certificate",
        "Pahintulot ng magulang (18-21) / Advice ng magulang (22-25)",
        "Valid ID at Barangay Clearance ng parehong aplikante"
      ]
    }
  },
  {
    id: "marriage-registration",
    category: "MARRIAGE",
    title: {
      en: "Marriage Registration",
      fil: "Rehistro ng Kasal",
      pang: "Rehistro na Kasal",
      ilo: "Rehistro ti Kasar"
    },
    desc: {
      en: "Request a certified copy of a marriage certificate.",
      fil: "Humingi ng sertipikadong kopya ng sertipiko ng kasal.",
      pang: "Pangasingger na certified copy na sertipiko na kasal.",
      ilo: "Dawaten ti certified copy ti sertipiko ti kasar."
    },
    icon: <Heart className="w-8 h-8 text-theme-primary" />,
    status: "COMING_SOON",
    estimatedTime: "1-2 Business Days",
    baseFee: "Free (Standard Registration)",
    requirements: {
      en: [
        "Four (4) original copies of the Marriage Contract",
        "Signatures of contracting parties, solemnizing officer, and witnesses",
        "Copy of valid Marriage License",
        "CRASM certificate of the solemnizing officer"
      ],
      fil: [
        "Apat (4) na orihinal na kopya ng Marriage Contract",
        "Lagda ng mag-asawa, solemnizing officer, at mga saksi",
        "Kopya ng valid na Marriage License",
        "CRASM ng solemnizing officer"
      ]
    }
  },
  {
    id: "marriage-request",
    category: "MARRIAGE",
    title: {
      en: "Marriage Certificate Request (True Copy)",
      fil: "Hiling ng Kopya ng Sertipiko ng Kasal (True Copy)",
      pang: "Kerew na Kopya na Sertipiko na Kasal (True Copy)",
      ilo: "Dawaten ti Kopya ti Sertipiko ti Kasar (True Copy)"
    },
    desc: {
      en: "Request a certified true copy of an existing marriage certificate.",
      fil: "Humingi ng sertipikadong kopya ng umiiral na kontrata o sertipiko ng kasal.",
      pang: "Pangasingger na certified true copy na walan sertipiko na kasal.",
      ilo: "Dawaten ti certified true copy ti adda a sertipiko ti kasar."
    },
    icon: <Copy className="w-8 h-8 text-theme-primary" />,
    status: "COMING_SOON",
    estimatedTime: "1-2 Business Days",
    baseFee: "₱115.00",
    requirements: {
      en: [
        "Husband's full name",
        "Wife's maiden full name",
        "Date of marriage & place of event",
        "Valid ID of either spouse or authorized representative"
      ],
      fil: [
        "Buong pangalan ng asawang lalaki",
        "Buong pangalan (maiden) ng asawang babae",
        "Petsa at lugar ng kasal",
        "Valid ID ng mag-asawa o ng authorized representative"
      ]
    }
  },
  {
    id: "marriage-psa",
    category: "MARRIAGE",
    title: {
      en: "Marriage PSA Endorsement",
      fil: "Endorso ng Kasal sa PSA",
      pang: "Endorso na Kasal ed PSA",
      ilo: "Endorso ti Kasar iti PSA"
    },
    desc: {
      en: "Request endorsement of a verified local marriage certificate record to the PSA.",
      fil: "Humiling ng endorso ng lokal na sertipiko ng kasal sa PSA.",
      pang: "Kerew na endorso na lokal ya sertipiko na kasal ed PSA.",
      ilo: "Agdawat ti endorso ti lokal a sertipiko ti kasar iti PSA."
    },
    icon: <FileCheck className="w-8 h-8 text-theme-primary" />,
    status: "COMING_SOON",
    estimatedTime: "3-5 Business Days",
    baseFee: "₱150.00",
    requirements: {
      en: [
        "Verified Local Marriage Contract / Certificate Copy",
        "Valid ID of the requestor",
        "LCR Certification of Marriage record"
      ],
      fil: [
        "Beripikadong Kopya ng Lokal na Kontrata ng Kasal",
        "Valid ID ng nagre-request",
        "LCR Certification"
      ]
    }
  }
];

const CATEGORY_TRANSLATIONS = {
  BIRTH: {
    title: {
      en: "BIRTH REGISTRY SERVICES",
      fil: "SERBISYO SA REHISTRO NG KAPANGANAKAN",
      pang: "SERBISYO NG NIYANAK",
      ilo: "SERBISIO TI PANNAKAYANAK"
    },
    subtitle: {
      en: "REGISTRATION & CERTIFIED COPIES & ENDORSEMENTS",
      fil: "PAGPAPATALA, MGA SERTIPIKADONG KOPYA AT ENDORSO",
      pang: "REHISTRO, KOPYA TAN ENDORSO",
      ilo: "REHISTRO, KOPYA KEN ENDORSO"
    }
  },
  DEATH: {
    title: {
      en: "DEATH REGISTRY SERVICES",
      fil: "SERBISYO SA REHISTRO NG PAGPANAW",
      pang: "SERBISYO NG INATEY",
      ilo: "SERBISIO TI IPUPUSAY"
    },
    subtitle: {
      en: "REGISTRATION & CERTIFIED TRUE COPY REQUESTS",
      fil: "PAGPAPATALA AT MGA HILING NG SERTIPIKADONG KOPYA",
      pang: "REHISTRO TAN KEREW NA KOPYA",
      ilo: "REHISTRO KEN DAWAT TI KOPYA"
    }
  },
  MARRIAGE: {
    title: {
      en: "MARRIAGE REGISTRY & LICENSES",
      fil: "REHISTRO NG KASAL AT MGA LISENSYA",
      pang: "REHISTRO NA KASAL TAN LISENSYA",
      ilo: "REHISTRO TI KASAR KEN LISENSYA"
    },
    subtitle: {
      en: "LICENSE APPLICATIONS, REGISTRATIONS & CERTIFIED COPIES",
      fil: "APLIKASYON NG LISENSYA, PAGPAPATALA AT MGA KOPYA",
      pang: "APLIKASYON NA LISENSYA, REHISTRO TAN KOPYA",
      ilo: "APLIKASION TI LISENSYA, REHISTRO KEN KOPYA"
    }
  }
};

const TRANSLATIONS = {
  en: {
    back: "Back to Dashboard",
    headlinePart1: "CHOOSE APPLICATION",
    headlinePart2: "PATHWAY",
    subheadlineSelect: "SELECT A CIVIL REGISTRY SERVICE TO PROCEED.",
    activeBadge: "Available",
    soonBadge: "In Development",
    requirementsTitle: "Requirements & Checklist",
    processTime: "Estimated Processing Time",
    fees: "Base Filing Fee",
    closeBtn: "Close Guide",
    applyBtn: "Start Application",
    residentHeader: "Verified Resident Portal"
  },
  fil: {
    back: "Bumalik sa Dashboard",
    headlinePart1: "PUMILI NG PARAAN NG",
    headlinePart2: "APLIKASYON",
    subheadlineSelect: "PUMILI NG SERBISYONG SIBIL PARA MAGPATULOY.",
    activeBadge: "Magagamit na",
    soonBadge: "Kasalukuyang Ginagawa",
    requirementsTitle: "Mga Kakailanganin at Checklist",
    processTime: "Tinatayang Oras ng Pagproseso",
    fees: "Pangunahing Bayad",
    closeBtn: "Isara ang Gabay",
    applyBtn: "Simulan ang Aplikasyon",
    residentHeader: "Portal ng Beripikadong Mamamayan"
  },
  pang: {
    back: "Pawil ed Dashboard",
    headlinePart1: "PILIEN SO APLIKASYON",
    headlinePart2: "DARAANAN",
    subheadlineSelect: "PILIEN SO SERBISYO PARA NTULOY.",
    activeBadge: "Nalmo La",
    soonBadge: "Isasagawa Niyan",
    requirementsTitle: "Saray Kailangan tan Checklist",
    processTime: "Oras na Pagproseso",
    fees: "Bayad na Aplikasyon",
    closeBtn: "Kabat so Gabay",
    applyBtn: "Gamporan so Aplikasyon",
    residentHeader: "Portal na Beripikado ya Umili"
  },
  ilo: {
    back: "Agsubli ti Dashboard",
    headlinePart1: "AGPILI TI APLIKASION",
    headlinePart2: "DALAWAN",
    subheadlineSelect: "AGPILI TI SERBISIO TAPNO AGTULOY.",
    activeBadge: "Mabalin Uts",
    soonBadge: "Kasalukuyang Ginagawa",
    requirementsTitle: "Dagiti Kasapulan ken Checklist",
    processTime: "Oras ti Pannakaproseso",
    fees: "Bayad ti Aplikasion",
    closeBtn: "Irikep ti Gubay",
    applyBtn: "Irugi ti Aplikasion",
    residentHeader: "Portal ti Beripikado a Residente"
  }
};

export default function CivilRegistryHubPage() {
  const router = useRouter();
  const [lang] = useState<"en" | "fil" | "pang" | "ilo">(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("kiosk_lang");
      if (saved && ["en", "fil", "pang", "ilo"].includes(saved)) {
        return saved as "en" | "fil" | "pang" | "ilo";
      }
    }
    return "en";
  });
  const [selectedService, setSelectedService] = useState<RegistryService | null>(null);

  const handleServiceClick = (service: RegistryService) => {
    if (service.status === "ACTIVE" && service.path) {
      router.push(service.path);
    } else {
      setSelectedService(service);
    }
  };

  const t = TRANSLATIONS[lang];

  return (
    <div className="h-full overflow-y-auto bg-slate-50 dark:bg-[#0a0b10] px-6 py-12 md:px-20 md:py-16 font-sans text-slate-900 dark:text-white relative transition-colors duration-300">
      <div className="mx-auto max-w-[1500px]">
        
        {/* Navigation & Go Back */}
        <div className="mb-10 flex items-center justify-between">
          <Button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#151821] px-8 py-7 text-sm md:text-lg font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1f2432] hover:text-slate-900 dark:hover:text-white transition-all active:scale-95 shadow-md"
          >
            <ArrowLeft className="h-5 w-5 md:h-6 md:w-6" />
            {t.back}
          </Button>

          <div className="flex items-center gap-3 bg-white dark:bg-[#151821] border border-slate-200 dark:border-white/10 rounded-2xl px-6 py-4 text-xs md:text-base font-black uppercase tracking-widest text-theme-secondary shadow-md">
            <span className="relative flex h-3 w-3 mr-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-theme-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-theme-primary"></span>
            </span>
            {t.residentHeader}
          </div>
        </div>

        {/* Stepper Progress Bar */}
        <div className="flex justify-center items-center gap-6 md:gap-12 lg:gap-20 mb-16 mt-8 max-w-6xl mx-auto">
          {/* Step 1: STATUS */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-3xl bg-theme-primary flex items-center justify-center shadow-[0_0_30px_color-mix(in srgb, var(--primary-theme) 0.5 * 100%, transparent)]">
              <Sparkles className="w-7 h-7 md:w-9 md:h-9 text-white animate-pulse" />
            </div>
            <span className="text-[10px] md:text-sm font-black uppercase tracking-widest text-theme-primary italic">
              STATUS
            </span>
          </div>

          <div className="h-1 w-10 md:w-20 bg-slate-300 dark:bg-white/10 hidden sm:block"></div>

          {/* Step 2: IDENTITY */}
          <div className="flex flex-col items-center gap-3 opacity-50 dark:opacity-40">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-3xl bg-slate-100 dark:bg-[#151821] border border-slate-200 dark:border-white/10 flex items-center justify-center">
              <User className="w-7 h-7 md:w-9 md:h-9 text-slate-500 dark:text-slate-400" />
            </div>
            <span className="text-[10px] md:text-sm font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 italic">
              IDENTITY
            </span>
          </div>

          <div className="h-1 w-10 md:w-20 bg-slate-300 dark:bg-white/10 hidden sm:block"></div>

          {/* Step 3: DETAILS */}
          <div className="flex flex-col items-center gap-3 opacity-50 dark:opacity-40">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-3xl bg-slate-100 dark:bg-[#151821] border border-slate-200 dark:border-white/10 flex items-center justify-center">
              <FileText className="w-7 h-7 md:w-9 md:h-9 text-slate-500 dark:text-slate-400" />
            </div>
            <span className="text-[10px] md:text-sm font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 italic">
              DETAILS
            </span>
          </div>

          <div className="h-1 w-10 md:w-20 bg-slate-300 dark:bg-white/10 hidden sm:block"></div>

          {/* Step 4: DOCUMENTS */}
          <div className="flex flex-col items-center gap-3 opacity-50 dark:opacity-40">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-3xl bg-slate-100 dark:bg-[#151821] border border-slate-200 dark:border-white/10 flex items-center justify-center">
              <Upload className="w-7 h-7 md:w-9 md:h-9 text-slate-500 dark:text-slate-400" />
            </div>
            <span className="text-[10px] md:text-sm font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 italic">
              DOCUMENTS
            </span>
          </div>

          <div className="h-1 w-10 md:w-20 bg-slate-300 dark:bg-white/10 hidden sm:block"></div>

          {/* Step 5: SUBMIT */}
          <div className="flex flex-col items-center gap-3 opacity-50 dark:opacity-40">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-3xl bg-slate-100 dark:bg-[#151821] border border-slate-200 dark:border-white/10 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 md:w-9 md:h-9 text-slate-500 dark:text-slate-400" />
            </div>
            <span className="text-[10px] md:text-sm font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 italic">
              SUBMIT
            </span>
          </div>
        </div>

        {/* Main Content Card Container */}
        <div className="bg-white dark:bg-[#0c0d12] border border-slate-200 dark:border-[#1d2230] rounded-[3rem] p-8 md:p-16 lg:p-20 shadow-xl md:shadow-2xl transition-colors duration-300">
          
          {/* Header Title inside Card */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-7xl lg:text-8xl font-black italic uppercase tracking-tighter leading-none select-none text-slate-900 dark:text-white">
              {lang === "en" ? (
                <>CHOOSE APPLICATION <span className="text-theme-primary">PATHWAY</span></>
              ) : (
                <>{t.headlinePart1} <span className="text-theme-primary">{t.headlinePart2}</span></>
              )}
            </h2>
            <p className="text-xs md:text-xl font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.4em] mt-5 italic">
              {t.subheadlineSelect}
            </p>
          </div>

          {/* Categories and Grids */}
          <div className="space-y-16">
            {(["BIRTH", "DEATH", "MARRIAGE"] as const).map((cat) => {
              const catTrans = CATEGORY_TRANSLATIONS[cat];
              const services = CIVIL_REGISTRY_SERVICES.filter(s => s.category === cat);
              
              return (
                <div key={cat} className="space-y-8">
                  {/* Category Header with Vertical Accent Bar */}
                  <div className="flex items-center gap-4 pl-1">
                    <div className="w-[8px] h-12 bg-theme-primary rounded-full shrink-0"></div>
                    <div className="space-y-1">
                      <h3 className="text-xl md:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white italic uppercase tracking-wider leading-none">
                        {catTrans.title[lang] || catTrans.title.en}
                      </h3>
                      <p className="text-[10px] md:text-sm lg:text-base font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest italic leading-none">
                        {catTrans.subtitle[lang] || catTrans.subtitle.en}
                      </p>
                    </div>
                  </div>

                  {/* Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {services.map((service) => (
                      <motion.div
                        key={service.id}
                        onClick={() => handleServiceClick(service)}
                        whileHover={{ y: -6 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        className="group flex flex-col justify-start min-h-[260px] md:min-h-[300px] bg-slate-50/50 dark:bg-[#151821]/80 border border-slate-200/80 dark:border-[#202534] rounded-[2rem] p-8 md:p-10 hover:border-theme-primary/50 dark:hover:border-theme-primary/30 hover:bg-slate-100/30 dark:hover:bg-[#1a1e2c] active:scale-[0.98] transition-all duration-300 cursor-pointer relative overflow-hidden shadow-md hover:shadow-xl dark:hover:shadow-[0_0_30px_color-mix(in srgb, var(--primary-theme) 0.08 * 100%, transparent)]"
                      >
                        {/* Card Icon */}
                        <div className="mb-6">
                          <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-slate-200/50 dark:bg-[#0c0d12] border border-slate-300/30 dark:border-white/5 flex items-center justify-center">
                            {/* Render icon with scaled dimensions dynamically */}
                            {React.cloneElement(service.icon as React.ReactElement<{ className?: string }>, { className: "w-8 h-8 md:w-10 md:h-10 text-theme-primary" })}
                          </div>
                        </div>

                        {/* Title */}
                        <h4 className="text-lg md:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white group-hover:text-theme-primary transition-colors leading-tight mb-3 uppercase italic tracking-tight">
                          {service.title[lang] || service.title.en}
                        </h4>

                        {/* Description */}
                        <p className="text-xs md:text-sm lg:text-base font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide leading-relaxed">
                          {service.desc[lang] || service.desc.en}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

        </div>

      </div>

      {/* Interactive Coming Soon/Details Modal */}
      <AnimatePresence>
        {selectedService && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-xl rounded-[2.5rem] bg-white dark:bg-[#151821] border border-slate-200 dark:border-white/10 p-8 shadow-2xl relative"
            >
              <button
                onClick={() => setSelectedService(null)}
                className="absolute top-6 right-6 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-800 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                  {React.cloneElement(selectedService.icon as React.ReactElement<{ className?: string }>, { className: "w-8 h-8 text-white" })}
                </div>
                <div>
                  <Badge className="bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10 uppercase font-black text-[9px] py-0.5 px-2 rounded-full mb-1">
                    {t.soonBadge}
                  </Badge>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white italic uppercase tracking-tight leading-tight">
                    {selectedService.title[lang] || selectedService.title.en}
                  </h2>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-slate-50 dark:bg-[#0c0d12]/50 border border-slate-100 dark:border-white/5 rounded-2xl p-5 space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-wider text-theme-primary flex items-center gap-1.5">
                    <BookOpen size={16} />
                    {t.requirementsTitle}
                  </h3>
                  <ul className="space-y-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {(selectedService.requirements?.[lang] || selectedService.requirements?.en || []).map((req, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-theme-primary font-bold mt-0.5">•</span>
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 dark:bg-[#0c0d12]/50 border border-slate-100 dark:border-white/5 rounded-2xl p-4">
                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1">{t.processTime}</p>
                    <p className="text-sm font-black text-slate-900 dark:text-white">{selectedService.estimatedTime || "N/A"}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-[#0c0d12]/50 border border-slate-100 dark:border-white/5 rounded-2xl p-4">
                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1">{t.fees}</p>
                    <p className="text-sm font-black text-theme-primary">{selectedService.baseFee || "Free"}</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-theme-primary/10 border border-theme-primary/20 flex gap-3 text-xs font-semibold text-theme-primary leading-relaxed">
                  <Info className="w-5 h-5 shrink-0 text-theme-primary" />
                  <span>
                    This service is currently being digitized. When complete, you will be able to apply directly through this kiosk terminal.
                  </span>
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <Button
                  onClick={() => setSelectedService(null)}
                  className="w-full sm:w-auto rounded-xl bg-theme-primary hover:bg-theme-hover font-black uppercase tracking-wider py-5 px-8 text-xs text-white"
                >
                  {t.closeBtn}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
