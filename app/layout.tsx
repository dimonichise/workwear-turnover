import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { LogOut, Shirt } from "lucide-react";
import { currentUser } from "@/lib/auth";
import { AppNavigation } from "@/components/AppNavigation";
import "./globals.css";

export const metadata: Metadata = {
  title: "Оборот спецодежды",
  description: "Учёт оборота спецодежды по штрих-кодам",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/app-icon.svg", type: "image/svg+xml" }
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }]
  }
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
          <header className="app-header">
            <div className="shell app-header-inner">
              <div className="app-header-left">
                <Link href="/" className="brand-link">
                  <span className="brand-mark">
                    <Shirt size={20} />
                  </span>
                  <span>Спецодежда</span>
                </Link>
                <AppNavigation role={user.role} />
              </div>
              <div className="user-menu">
                <span className="hidden max-w-44 truncate text-slate-700 sm:inline">{user.fullName}</span>
                <form action="/api/auth/logout" method="post">
                  <button className="icon-button" title="Выйти">
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
