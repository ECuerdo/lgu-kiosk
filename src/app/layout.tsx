import type { Metadata } from "next";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import GlobalKeyboard from "@/components/shared/GlobalKeyboard";
import KioskMaintenanceGuard from "@/components/shared/KioskMaintenanceGuard";
import ThemeProvider from "@/components/shared/ThemeProvider";
import DynamicTheme from "@/components/shared/DynamicTheme";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "LGU Mapandan - Public Kiosk",
  description:
    "Official public information kiosk for the Municipality of Mapandan, Pangasinan.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const hideKioskCursor =
    process.env.NEXT_PUBLIC_HIDE_KIOSK_CURSOR?.toLowerCase() === "true";

  return (
    <html lang="en" suppressHydrationWarning className={cn("font-sans", geist.variable)}>
      <head>
      </head>
      <body className={cn(hideKioskCursor && "hide-kiosk-cursor")}>
        <ThemeProvider>
          <DynamicTheme />
          <KioskMaintenanceGuard />
          {children}
          <GlobalKeyboard />
        </ThemeProvider>
      </body>
    </html>
  );
}
