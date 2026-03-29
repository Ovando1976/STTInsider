import "./globals.css";
import { Inter } from "next/font/google";
import { AppProviders } from "@/components/providers/app-providers";
import { Metadata } from "next";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "STT Insider",
  description: "Exlpore the Virgin Islands Community",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
