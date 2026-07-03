import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";

export default async function SettingsPage() {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/");
  const [stations, users] = await Promise.all([
    prisma.station.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({ include: { station: true }, orderBy: { email: "asc" } })
  ]);
  return (
    <main className="shell space-y-5">
      <h1 className="text-2xl font-bold">Настройки</h1>
      <section className="grid gap-4 lg:grid-cols-2">
        <form action="/api/stations" method="post" className="panel space-y-3 p-4">
          <h2 className="text-lg font-bold">Новая СТО</h2>
          <label className="block space-y-1 text-sm">
            <span>Название</span>
            <input name="name" required placeholder="Ясенево" />
          </label>
          <label className="block space-y-1 text-sm">
            <span>Адрес</span>
            <input name="address" />
          </label>
          <label className="block space-y-1 text-sm">
            <span>Почта для отчетов</span>
            <input name="mailTo" type="email" placeholder="sto@example.com" />
          </label>
          <button className="bg-brand text-white">Создать СТО</button>
        </form>

        <form action="/api/users" method="post" className="panel space-y-3 p-4">
          <h2 className="text-lg font-bold">Новый пользователь</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1 text-sm">
              <span>Имя</span>
              <input name="fullName" required />
            </label>
            <label className="block space-y-1 text-sm">
              <span>Email</span>
              <input name="email" type="email" required />
            </label>
            <label className="block space-y-1 text-sm">
              <span>Пароль</span>
              <input name="password" type="password" minLength={8} required />
            </label>
            <label className="block space-y-1 text-sm">
              <span>Роль</span>
              <select name="role" defaultValue="master">
                <option value="master">Мастер</option>
                <option value="admin">Администратор</option>
              </select>
            </label>
          </div>
          <label className="block space-y-1 text-sm">
            <span>СТО</span>
            <select name="stationId">
              <option value="">Все СТО / без привязки</option>
              {stations.map((station) => (
                <option key={station.id} value={station.id}>
                  {station.name}
                </option>
              ))}
            </select>
          </label>
          <button className="bg-brand text-white">Создать пользователя</button>
        </form>
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-bold">СТО</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {stations.map((station) => (
            <form key={station.id} action={`/api/stations/${station.id}`} method="post" className="panel space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold">{station.name}</h3>
                  <p className="text-sm text-slate-600">{station.isActive ? "активна" : "неактивна"}</p>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input name="isActive" type="checkbox" defaultChecked={station.isActive} className="w-auto" />
                  Активна
                </label>
              </div>
              <label className="block space-y-1 text-sm">
                <span>Название</span>
                <input name="name" defaultValue={station.name} required />
              </label>
              <label className="block space-y-1 text-sm">
                <span>Адрес</span>
                <input name="address" defaultValue={station.address || ""} />
              </label>
              <label className="block space-y-1 text-sm">
                <span>Почта для отчетов</span>
                <input name="mailTo" type="email" defaultValue={station.mailTo || ""} placeholder="Общая почта из .env" />
              </label>
              <button className="bg-panel">Сохранить СТО</button>
            </form>
          ))}
        </div>
      </section>
      <section className="panel table-wrap">
        <h2 className="p-4 text-lg font-bold">Пользователи</h2>
        <table>
          <tbody>
            {users.map((item) => (
              <tr key={item.id}>
                <td>{item.fullName}</td>
                <td>{item.email}</td>
                <td>{item.role === "admin" ? "Администратор" : "Мастер"}</td>
                <td>{item.station?.name}</td>
                <td>
                  <form action={`/api/users/${item.id}/password`} method="post" className="flex min-w-64 gap-2">
                    <input name="password" type="password" minLength={8} placeholder="Новый пароль" required />
                    <button className="bg-panel">Сменить</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
