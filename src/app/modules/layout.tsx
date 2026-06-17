import ServiceHeader from "@/components/shared/ServiceHeader";
import ServiceMarquee from "@/components/shared/ServiceMarquee";
import SecureIdleTimer from "@/components/shared/SecureIdleTimer";
import KioskMaintenanceGuard from "@/components/shared/KioskMaintenanceGuard";

export default function ModulesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#071c12]">
      <KioskMaintenanceGuard />
      <SecureIdleTimer />
      <ServiceHeader />
      <ServiceMarquee />
      <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
