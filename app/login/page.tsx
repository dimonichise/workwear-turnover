import { redirect } from "next/navigation";
import { Lock, Mail, Shirt } from "lucide-react";
import { currentUser } from "@/lib/auth";

export default async function LoginPage() {
  if (await currentUser()) redirect("/");
  return (
    <main className="shell flex min-h-screen items-center justify-center">
      <form action="/api/auth/login" method="post" className="panel w-full max-w-sm space-y-5 p-6">
        <div className="space-y-3 text-center">
          <span className="brand-mark mx-auto h-14 w-14">
            <Shirt size={28} />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">СпецУчёт</h1>
            <p className="mt-1 text-sm text-slate-600">Учёт оборота спецодежды по штрих-кодам</p>
          </div>
        </div>
        <label className="block space-y-1 text-sm">
          <span>Email</span>
          <span className="relative block">
            <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input name="email" type="email" required className="pl-10" />
          </span>
        </label>
        <label className="block space-y-1 text-sm">
          <span>Пароль</span>
          <span className="relative block">
            <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input name="password" type="password" required className="pl-10" />
          </span>
        </label>
        <button className="w-full bg-brand text-white">Войти</button>
      </form>
    </main>
  );
}
