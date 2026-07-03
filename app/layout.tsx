import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { LogOut, Shirt } from "lucide-react";
import { currentUser } from "@/lib/auth";
import { AppNavigation } from "@/components/AppNavigation";
import "./globals.css";

export const metadata: Metadata = {
  title: "Оборот спецодежды",
  description: "Учёт оборота спецодежды по штрих-кодам",
  manifest: "/manifest.webmanifest"
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#176b5b"
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  return (
    <html lang="ru">
      <body>
        {user && (
          <header className="border-b border-line bg-white">
            <div className="shell flex items-center justify-between gap-3 py-3">
              <div className="flex flex-wrap items-center gap-3">
                <Link href="/" className="flex items-center gap-2 font-bold">
                  <Shirt size={22} /> Спецодежда
                </Link>
                <AppNavigation />
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span>{user.fullName}</span>
                <form action="/api/auth/logout" method="post">
                  <button className="bg-panel" title="Выйти">
                    <LogOut size={16} />
                  </button>
                </form>
              </div>
            </div>
          </header>
        )}
        {children}
      </body>
    </html>
  );
}
