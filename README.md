# Оборот спецодежды

Мобильное веб-приложение / PWA для учёта спецодежды по штрих-кодам на СТО.

## Что реализовано

- вход по email и паролю через httpOnly cookie;
- роли `admin` и `master`;
- справочники СТО, сотрудников, типов изделий и спецодежды;
- операция стирки с блоками «Принято из стирки» и «Отдано в стирку»;
- возврат уволенного сотрудника с удержаниями;
- сканирование камерой через `@zxing/browser` и ручной ввод;
- загрузка фото актов и фото одежды;
- генерация Excel через `exceljs`;
- отправка комплекта документов через Gmail SMTP;
- аналитика по изделиям, стирке и возвратам;
- Docker Compose для VPS.

## Локальный запуск

```bash
npm install
cp .env.example .env
npm run prisma:migrate
npm run seed
npm run dev
```

По умолчанию seed создаёт СТО `Ясенево`, типы `Футболка`, `Куртка`, `Комбинезон` и администратора из переменных `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`.

## Развёртывание на VPS

```bash
git clone <repo-url>
cd <project-folder>
cp .env.example .env
nano .env
docker compose up -d --build
docker compose exec app npx prisma migrate deploy
docker compose exec app npx prisma db seed
```

Для Nginx используйте `nginx.conf.example`, затем выпустите SSL:

```bash
sudo certbot --nginx -d example.ru
```

Файлы операций сохраняются в `STORAGE_DIR`, в Docker это `/app/storage`, проброшенный в локальную папку `./storage`.
