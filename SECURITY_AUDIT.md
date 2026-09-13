# Dependency Security Audit

## Release gate

Перед публичным релизом выполнить:

```bash
npm audit
npm audit --omit=dev
```

Релиз блокируется при наличии `critical` или `high` в production dependency tree, пока уязвимость не исправлена либо не оформлено явное принятие риска после проверки достижимости и компенсирующих мер.

## Snapshot: 2026-09-13

`npm audit --omit=dev` обнаружил 8 production-уязвимостей: 1 critical, 5 high и 2 moderate.

- critical: прямая зависимость `next` версии `15.5.20`;
- high: `nodemailer`, `postcss`, `sharp`, `nanoid`, `brace-expansion`;
- moderate: `exceljs`, `uuid`;
- npm сообщает о доступных исправлениях, но обновления `nodemailer` и части цепочки `exceljs` требуют отдельной проверки совместимости.

Статус: **OPEN — public release blocker**.

После обновления зависимостей обязательны production build, проверка миграций, входа, операций, формирования Excel, загрузки вложений и отправки почты.

## Production configuration finding

`docker-compose.yml` содержит шаблонный пароль PostgreSQL в явном виде. Порт базы не опубликован на хосте, что ограничивает внешнюю достижимость, но до публичного релиза необходимо:

- перенести пароль в защищённый production env/secret;
- сгенерировать уникальное значение и изменить пароль роли PostgreSQL;
- согласованно обновить `DATABASE_URL` приложения;
- пересоздать только `postgres` и `app` с проверкой миграций и smoke test;
- убедиться, что значение не попало в Git, логи или отчёт проверки.

Статус: **OPEN — production credential rotation required**.
