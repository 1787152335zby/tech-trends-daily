import {
  getAdSenseClientId,
  getAdSenseSlot,
  type AdPlacement,
} from "@/lib/adsense";
import AdUnitDisplay from "@/components/AdUnitDisplay";

interface AdUnitProps {
  placement: AdPlacement;
}

export default function AdUnit({ placement }: AdUnitProps) {
  const clientId = getAdSenseClientId();
  const slot = getAdSenseSlot(placement);

  if (!clientId || !slot) {
    return null;
  }

  return (
    <div className="my-8 flex justify-center">
      <div className="w-full max-w-3xl">
        <AdUnitDisplay clientId={clientId} slot={slot} />
      </div>
    </div>
  );
}
