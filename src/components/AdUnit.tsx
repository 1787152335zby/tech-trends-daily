interface AdUnitProps {
  slot: string;
}

export default function AdUnit({ slot }: AdUnitProps) {
  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

  if (!clientId) {
    // Placeholder during development — renders nothing visible
    return null;
  }

  return (
    <div className="my-8 flex justify-center">
      <div className="w-full max-w-3xl">
        <ins
          className="adsbygoogle"
          style={{ display: "block", textAlign: "center" }}
          data-ad-layout="in-article"
          data-ad-format="fluid"
          data-ad-client={clientId}
          data-ad-slot={slot}
        />
      </div>
    </div>
  );
}
