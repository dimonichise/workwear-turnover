import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/auth";

export default async function SettingsPage() {
  const user = await requireUser();
  requireAdmin(user.role);
  const [stations, users] = await Promise.all([
    prisma.station.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({ include: { station: true }, orderBy: { email: "asc" } })
  ]);
  return (
    <main className="shell space-y-5">
      <h1 className="text-2xl font-bold">Настройки</h1>
      <section className="panel table-wrap">
        <h2 className="p-4 text-lg font-bold">СТО</h2>
        <table>
          <tbody>
            {stations.map((station) => (
              <tr key={station.id}>
                <td>{station.name}</td>
                <td>{station.address}</td>
                <td>{station.isActive ? "активна" : "неактивна"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="panel table-wrap">
        <h2 className="p-4 text-lg font-bold">Пользователи</h2>
        <table>
          <tbody>
            {users.map((item) => (
              <tr key={item.id}>
                <td>{item.fullName}</td>
                <td>{item.email}</td>
                <td>{item.role}</td>
                <td>{item.station?.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
