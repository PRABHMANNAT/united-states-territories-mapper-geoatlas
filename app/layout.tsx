import type { Metadata } from "next";
import { Footer, Navigation } from "@/components/navigation";
import { regions } from "@/lib/data";
import "./globals.css";
import "./workspace.css";

export const metadata: Metadata = {
  metadataBase: process.env.STATEATLAS_URL ? new URL(process.env.STATEATLAS_URL) : undefined,
  title: { default: "NorthAtlas · North American Atlas", template: "%s · NorthAtlas" },
  description: "Explore North American countries and subdivisions and build your own maps.",
  openGraph: { title: "NorthAtlas", description: "An open atlas of North American countries, territories, and subdivisions.", images: process.env.STATEATLAS_URL ? ["/social.png"] : undefined },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en">
    <body><a className="skip-link" href="#main">Skip to content</a><Navigation regions={regions} /><main id="main">{children}</main><Footer /></body>
  </html>;
}
