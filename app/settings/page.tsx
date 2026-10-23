import { Building2, Plus, Save, UserPlus } from "lucide-react";
import { SectionTabs } from "@/components/SectionTabs";
import { DataTable, DataCell, EmptyState } from "@/components/DataTable";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { isGlobalAdmin, stationScope } from "@/lib/access";

export default async function SettingsPage() {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/");
  const globalAdmin = isGlobalAdmin(user);
  const [stations, users] = await Promise.all([
    prisma.station.findMany({
      where: { id: stationScope(user) },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { stationId: stationScope(user) },
      include: { station: true },
      orderBy: { email: "asc" },
    }),
  ]);
  return (
    <main className="shell list-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{user.station?.name || "Управление сетью"}</p>
          <h1 className="page-title">Настройки</h1>
        </div>
      </div>
      <SectionTabs
        label="Разделы настроек"
        tabs={[
          {
            id: "stations",
            label: "СТО",
            count: stations.length,
            content: (
              <section className="settings-section">
                <div className="section-heading">
                  <h2>Станции технического обслуживания</h2>
                  <span>Всего: {stations.length}</span>
                </div>
                {globalAdmin && (
                  <details className="create-disclosure">
                    <summary>
                      <Building2 size={18} />
                      <span>Добавить СТО</span>
                      <Plus className="disclosure-plus" size={18} />
                    </summary>
                    <form
                      action="/api/stations"
                      method="post"
                      className="settings-create-form"
                    >
                      <label className="form-field">
                        <span>Название</span>
                        <input name="name" required placeholder="Ясенево" />
                      </label>
                      <label className="form-field">
                        <span>Адрес</span>
                        <input name="address" />
                      </label>
                      <label className="form-field">
                        <span>Почта для отчетов</span>
                        <input
                          name="mailTo"
                          type="email"
                          placeholder="sto@example.com"
                        />
                      </label>
                      <div className="form-actions">
                        <button className="button-primary">
                          <Plus size={16} />
                          Создать СТО
                        </button>
                      </div>
                    </form>
                  </details>
                )}
                {stations.length === 0 ? (
                  <EmptyState title="СТО пока нет." />
                ) : (
                  <div className="station-editor-grid">
                    {stations.map((station) => (
                      <form
                        key={station.id}
                        action={`/api/stations/${station.id}`}
                        method="post"
                        className="station-editor"
                      >
                        <div className="station-editor-heading">
                          <span className="station-editor-icon">
                            <Building2 size={20} />
                          </span>
                          <div>
                            <h3>{station.name}</h3>
                            <span
                              className={`status-badge ${station.isActive ? "status-active" : "status-archived"}`}
                            >
                              {station.isActive ? "активна" : "неактивна"}
                            </span>
                          </div>
                          {globalAdmin && (
                            <label className="station-active-control">
                              <input
                                name="isActive"
                                type="checkbox"
                                defaultChecked={station.isActive}
                                className="w-auto"
                              />
                              <span>Активна</span>
                            </label>
                          )}
                        </div>
                        <label className="form-field">
                          <span>Название</span>
                          <input
                            name="name"
                            defaultValue={station.name}
                            required
                          />
                        </label>
                        <label className="form-field">
                          <span>Адрес</span>
                          <input
                            name="address"
                            defaultValue={station.address || ""}
                          />
                        </label>
                        <label className="form-field">
                          <span>Почта для отчетов</span>
                          <input
                            name="mailTo"
                            type="email"
                            defaultValue={station.mailTo || ""}
                            placeholder="Общая почта для отчётов"
                          />
                        </label>
                        <div className="form-actions">
                          <button className="bg-panel">
                            <Save size={16} />
                            Сохранить СТО
                          </button>
                        </div>
                      </form>
                    ))}
                  </div>
                )}
              </section>
            ),
          },
          {
            id: "users",
            label: "Пользователи",
            count: users.length,
            content: (
              <section className="settings-section">
                <div className="section-heading">
                  <h2>Пользователи и доступ</h2>
                  <span>Всего: {users.length}</span>
                </div>
                <details className="create-disclosure">
                  <summary>
                    <UserPlus size={18} />
                    <span>Добавить пользователя</span>
                    <Plus className="disclosure-plus" size={18} />
                  </summary>
                  <form
                    action="/api/users"
                    method="post"
                    className="settings-create-form"
                  >
                    <div className="form-grid-two">
                      <label className="form-field">
                        <span>Имя</span>
                        <input name="fullName" required />
                      </label>
                      <label className="form-field">
                        <span>Email</span>
                        <input name="email" type="email" required />
                      </label>
                      <label className="form-field">
                        <span>Пароль</span>
                        <input
                          name="password"
                          type="password"
                          minLength={8}
                          required
                          autoComplete="new-password"
                        />
                      </label>
                      <label className="form-field">
                        <span>Роль</span>
                        <select name="role" defaultValue="master">
                          <option value="master">Мастер</option>
                          <option value="admin">Администратор</option>
                        </select>
                      </label>
                    </div>
                    <label className="form-field">
                      <span>СТО</span>
                      <select name="stationId">
                        {globalAdmin && (
                          <option value="">Все СТО / без привязки</option>
                        )}
                        {stations.map((station) => (
                          <option key={station.id} value={station.id}>
                            {station.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="form-actions">
                      <button className="button-primary">
                        <Plus size={16} />
                        Создать пользователя
                      </button>
                    </div>
                  </form>
                </details>
                {users.length === 0 ? (
                  <EmptyState title="Пользователей пока нет." />
                ) : (
                  <DataTable caption="Пользователи и доступ">
                    <thead role="rowgroup">
                      <tr role="row">
                        <th scope="col" role="columnheader">
                          Пользователь
                        </th>
                        <th scope="col" role="columnheader">
                          Email
                        </th>
                        <th scope="col" role="columnheader">
                          Роль
                        </th>
                        <th scope="col" role="columnheader">
                          СТО
                        </th>
                        <th scope="col" role="columnheader">
                          Пароль
                        </th>
                      </tr>
                    </thead>
                    <tbody role="rowgroup">
                      {users.map((item) => (
                        <tr role="row" key={item.id}>
                          <DataCell label="Пользователь" primary>
                            <span className="font-semibold">
                              {item.fullName}
                            </span>
                          </DataCell>
                          <DataCell label="Email">{item.email}</DataCell>
                          <DataCell label="Роль">
                            <span className="role-badge">
                              {item.role === "admin"
                                ? "Администратор"
                                : "Мастер"}
                            </span>
                          </DataCell>
                          <DataCell label="СТО">
                            {item.station?.name || "Все СТО"}
                          </DataCell>
                          <DataCell label="Пароль" className="data-actions">
                            <form
                              action={`/api/users/${item.id}/password`}
                              method="post"
                              className="password-reset-form"
                            >
                              <input
                                name="password"
                                type="password"
                                minLength={8}
                                placeholder="Новый пароль"
                                aria-label={`Новый пароль для ${item.fullName}`}
                                required
                                autoComplete="new-password"
                              />
                              <button className="bg-panel">Сменить</button>
                            </form>
                          </DataCell>
                        </tr>
                      ))}
                    </tbody>
                  </DataTable>
                )}
              </section>
            ),
          },
        ]}
      />
    </main>
  );
}
