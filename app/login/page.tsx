import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";

export default async function LoginPage() {
  if (await currentUser()) redirect("/");
  return (
    <main className="shell flex min-h-screen items-center justify-center">
      <form action="/api/auth/login" method="post" className="panel w-full max-w-sm space-y-4 p-5">
        <div>
          <h1 className="text-2xl font-bold">Вход</h1>
          <p className="text-sm text-slate-600">Учёт оборота спецодежды на СТО</p>
        </div>
        <label className="block space-y-1 text-sm">
          <span>Email</span>
          <input name="email" type="email" required />
        </label>
        <label className="block space-y-1 text-sm">
          <span>Пароль</span>
          <input name="password" type="password" required />
        </label>
        <button className="w-full bg-brand text-white">Войти</button>
      </form>
    </main>
  );
}
