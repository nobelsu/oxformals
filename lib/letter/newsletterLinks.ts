export const NEWSLETTER_IOS_URL =
  "https://testflight.apple.com/join/z9ZPehd9";
export const NEWSLETTER_ANDROID_URL =
  "https://drive.google.com/file/d/1zg4uX-x8A3oJ3R4IdHhl_ung39Ok0auI/view?usp=sharing";

/** Optional Instagram via NEXT_PUBLIC_*; app links are fixed above. */
export const NEWSLETTER_LINKS = {
  instagram: process.env.NEXT_PUBLIC_NEWSLETTER_INSTAGRAM_URL ?? "",
  ios: NEWSLETTER_IOS_URL,
  android: NEWSLETTER_ANDROID_URL,
} as const;

export type NewsletterAppLink = {
  id: "ios" | "android";
  label: string;
  href: string;
  ready: boolean;
};

export function newsletterAppLinks(): NewsletterAppLink[] {
  const { ios, android } = NEWSLETTER_LINKS;
  return [
    { id: "ios", label: "Try on iOS", href: ios, ready: true },
    {
      id: "android",
      label: "Try on Android",
      href: android,
      ready: true,
    },
  ];
}

export function newsletterCtaLinks() {
  const { instagram, ios, android } = NEWSLETTER_LINKS;
  return [
    { id: "instagram" as const, label: "Instagram", href: instagram },
    { id: "ios" as const, label: "Try on iOS", href: ios },
    { id: "android" as const, label: "Try on Android", href: android },
  ].filter((item) => item.href.length > 0);
}
