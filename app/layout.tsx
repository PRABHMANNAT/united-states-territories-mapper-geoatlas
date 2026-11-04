import type { Metadata } from "next";
import { Footer, Navigation } from "@/components/navigation";
import { regions } from "@/lib/data";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "StateAtlas · The American Atlas", template: "%s · StateAtlas" },
  description: "Explore every state. Compare every statistic. Understand America.",
  openGraph: { title: "StateAtlas", description: "An open atlas of U.S. states, territories, and outlying islands.", images: ["/social.svg"] },
};

const themeScript = "try{document.documentElement.dataset.theme=localStorage.getItem('stateatlas-theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')}catch{}";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning>
    <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
    <body><a className="skip-link" href="#main">Skip to content</a><Navigation regions={regions} /><main id="main">{children}</main><Footer /></body>
  </html>;
}
