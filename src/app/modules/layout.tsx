import ServiceHeader from "@/components/shared/ServiceHeader";
import ServiceMarquee from "@/components/shared/ServiceMarquee";
import SecureIdleTimer from "@/components/shared/SecureIdleTimer";

export default function ModulesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#071c12]">
      <SecureIdleTimer />
      <ServiceHeader />
      <ServiceMarquee />
      <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
