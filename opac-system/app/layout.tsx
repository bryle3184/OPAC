import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Providers } from "@/components/providers/Providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Open Public Access Catalog (OPAC)",
  description: "Modern library catalog system for searching and managing library resources",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={inter.className}>
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <Providers>
          <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-1 container mx-auto px-4 py-8">
              {children}
            </main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
