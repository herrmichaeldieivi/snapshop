import type { Metadata } from "next";
import "@/app/globals.css";

const siteOrigin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
export const metadata: Metadata = {
  metadataBase: siteOrigin ? new URL(siteOrigin) : undefined,
  title: { default: "Snap Shop — your little shop link", template: "%s | Snap Shop" },
  description: "A tidy, mobile-ready storefront for the products you already sell. Set it up, share one shop link, and keep the customer conversation yours.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
