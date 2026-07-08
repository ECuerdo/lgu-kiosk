import KioskSlideshow from "@/components/KioskSlideshow";
import RfidOverlay from "@/components/RfidOverlay";
import KioskActivationGate from "@/components/shared/KioskActivationGate";

export default function Home() {
  return (
    <KioskActivationGate>
      <KioskSlideshow />
      <RfidOverlay />
    </KioskActivationGate>
  );
}
