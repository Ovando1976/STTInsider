import "./globals.css";
import { AppProviders } from "@/components/providers/app-providers";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "STT Insider",
  description: "Explore the Virgin Islands community with professional local tools.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="relative min-h-screen overflow-x-clip">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.2),transparent_68%)]" />
          <AppProviders>{children}</AppProviders>
        </div>
      </body>
    </html>
  );
}
