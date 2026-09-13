# Dependency Security Audit

## Release gate

Перед публичным релизом выполнить:

```bash
npm audit
npm audit --omit=dev
```

Релиз блокируется при наличии `critical` или `high` в production dependency tree, пока уязвимость не исправлена либо не оформлено явное принятие риска после проверки достижимости и компенсирующих мер.

## Snapshot: 2026-09-13

До обновления `npm audit --omit=dev` обнаруживал 8 production-уязвимостей: 1 critical, 5 high и 2 moderate.

- critical: прямая зависимость `next` версии `15.5.20`;
- high: `nodemailer`, `postcss`, `sharp`, `nanoid`, `brace-expansion`;
- moderate: `exceljs`, `uuid`;
- npm сообщает о доступных исправлениях, но обновления `nodemailer` и части цепочки `exceljs` требуют отдельной проверки совместимости.

После обновления Next.js, React, Nodemailer и транзитивных зависимостей critical/high устранены. Остаются 2 moderate в цепочке `exceljs`/`uuid`; предлагаемое npm исправление требует отката ExcelJS на старую мажорную версию и не применяется автоматически.

Статус critical/high: **CLOSED**. Moderate: **ACCEPTED TEMPORARILY — проверить замену/обновление ExcelJS отдельной задачей**.

После обновления зависимостей обязательны production build, проверка миграций, входа, операций, формирования Excel, загрузки вложений и отправки почты.

## Production configuration finding

`docker-compose.yml` содержит шаблонный пароль PostgreSQL в явном виде. Порт базы не опубликован на хосте, что ограничивает внешнюю достижимость, но до публичного релиза необходимо:

- перенести пароль в защищённый production env/secret;
- сгенерировать уникальное значение и изменить пароль роли PostgreSQL;
- согласованно обновить `DATABASE_URL` приложения;
- пересоздать только `postgres` и `app` с проверкой миграций и smoke test;
- убедиться, что значение не попало в Git, логи или отчёт проверки.

Конфигурация изменена: Compose требует `POSTGRES_PASSWORD` из production `.env` и больше не содержит пароль в репозитории.

13 сентября 2026 года перед ротацией создана и проверена резервная копия PostgreSQL и файлов. Для роли `workwear` установлен новый случайный пароль, production `.env` обновлён с правами `0600`, контейнеры базы и приложения пересозданы. Health check приложения и базы, HTTP smoke test и пробное соединение Prisma прошли успешно; значение секрета не выводилось в журнал и не сохранялось в Git.

Статус: **CLOSED — production credential rotated and verified**.
