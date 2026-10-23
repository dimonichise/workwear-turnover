import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Building2, LogOut, Shirt } from "lucide-react";
import { currentUser } from "@/lib/auth";
import { AppNavigation } from "@/components/AppNavigation";
import { BrowserStorageRepair } from "@/components/BrowserStorageRepair";
import "./globals.css";

export const metadata: Metadata = {
  title: "Оборот спецодежды",
  description: "Учёт оборота спецодежды по штрих-кодам",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/app-icon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0e7177",
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  return (
    <html lang="ru">
      <body className={user ? "authenticated" : undefined}>
        <BrowserStorageRepair />
        <a href="#main-content" className="skip-link">
          К содержимому
        </a>
        {user && (
          <header className="app-header">
            <div className="shell app-header-inner">
              <div className="app-header-left">
                <Link href="/" className="brand-link">
                  <span className="brand-mark">
                    <Shirt size={20} />
                  </span>
                  <span>
                    Оборот
                    <br />
                    спецодежды
                  </span>
                </Link>
                <div className="station-context">
                  <Building2 size={16} />
                  <span>{user.station?.name || "Все СТО"}</span>
                </div>
              </div>
              <div className="user-menu">
                <div className="user-identity">
                  <span className="user-avatar" aria-hidden="true">
                    {user.fullName.slice(0, 1)}
                  </span>
                  <div className="user-details">
                    <span>{user.fullName}</span>
                    <small>
                      {user.role === "admin" ? "Администратор" : "Мастер"}
                    </small>
                  </div>
                </div>
                <form action="/api/auth/logout" method="post">
                  <button
                    className="icon-button"
                    title="Выйти"
                    aria-label="Выйти из приложения"
                  >
                    <LogOut size={16} />
                  </button>
                </form>
              </div>
            </div>
          </header>
        )}
        {user && <AppNavigation role={user.role} />}
        <div
          id="main-content"
          className={user ? "app-content" : undefined}
          tabIndex={-1}
        >
          {children}
        </div>
      </body>
    </html>
  );
}
