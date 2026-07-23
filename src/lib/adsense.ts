export type AdPlacement =
  | "home-top"
  | "home-mid"
  | "home-bottom"
  | "article-bottom";

const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID?.trim() ?? "";

const slots: Record<AdPlacement, string> = {
  "home-top": process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME_TOP?.trim() ?? "",
  "home-mid": process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME_MID?.trim() ?? "",
  "home-bottom": process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME_BOTTOM?.trim() ?? "",
  "article-bottom":
    process.env.NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE_BOTTOM?.trim() ?? "",
};

export function isValidAdSenseClientId(value: string): boolean {
  return /^ca-pub-\d{16}$/.test(value);
}

export function isValidAdSenseSlot(value: string): boolean {
  return /^\d+$/.test(value);
}

export function getAdSenseClientId(): string | null {
  return isValidAdSenseClientId(clientId) ? clientId : null;
}

export function getAdSenseSlot(placement: AdPlacement): string | null {
  const slot = slots[placement];
  return isValidAdSenseSlot(slot) ? slot : null;
}
