import type { Metadata } from "next";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import GlobalKeyboard from "@/components/shared/GlobalKeyboard";
import KioskMaintenanceGuard from "@/components/shared/KioskMaintenanceGuard";
import ThemeProvider from "@/components/shared/ThemeProvider";
import DynamicTheme from "@/components/shared/DynamicTheme";
import { Toaster } from "@/components/ui/sonner";

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

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
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const saved = localStorage.getItem('kiosk_font_size');
                  if (saved) {
                    const sizeMap = { sm: '14px', md: '16px', lg: '18px', xl: '20px' };
                    document.documentElement.style.fontSize = sizeMap[saved] || '16px';
                  }
                  const cachedTheme = localStorage.getItem('kiosk_theme_cache');
                  if (cachedTheme) {
                    const vars = JSON.parse(cachedTheme);
                    const root = document.documentElement;
                    for (const key in vars) {
                      if (Object.prototype.hasOwnProperty.call(vars, key)) {
                        root.style.setProperty(key, vars[key]);
                      }
                    }
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={cn(hideKioskCursor && "hide-kiosk-cursor")}>
        <ThemeProvider>
          <DynamicTheme />
          <KioskMaintenanceGuard />
          {children}
          <GlobalKeyboard />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
