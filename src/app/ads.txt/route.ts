import { getAdSenseClientId } from "@/lib/adsense";

export const dynamic = "force-static";

export function GET() {
  const clientId = getAdSenseClientId();

  if (!clientId) {
    return new Response("Not Found\n", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const publisherId = clientId.slice("ca-".length);
  const body = `google.com, ${publisherId}, DIRECT, f08c47fec0942fa0\n`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600",
    },
  });
}
