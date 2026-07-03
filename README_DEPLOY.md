# Деплой на VPS Ubuntu 24.04

Инструкция рассчитана на домен `specod.aiautomatizaciy.ru`, путь проекта `/opt/workwear-app` и запуск через Docker Compose.

## 1. Установка Docker

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
```

Проверка:

```bash
docker --version
docker compose version
```

## 2. Клонирование проекта

```bash
sudo mkdir -p /opt/workwear-app
sudo chown -R "$USER":"$USER" /opt/workwear-app
git clone https://github.com/dimonichise/workwear-turnover.git /opt/workwear-app
cd /opt/workwear-app
```

## 3. Настройка `.env`

```bash
cp .env.example .env
nano .env
```

Заполните значения без реальных секретов в репозитории:

```env
DATABASE_URL="postgresql://workwear:change_me@postgres:5432/workwear?schema=public"
APP_URL="https://specod.aiautomatizaciy.ru"
APP_SECRET="replace-with-long-random-secret"

SMTP_HOST="smtp.gmail.com"
SMTP_PORT="465"
SMTP_SECURE="true"
SMTP_USER="your-gmail@gmail.com"
SMTP_PASS="gmail-app-password"
MAIL_TO="25u@autopilot-sto.ru"

STORAGE_DIR="/app/storage"

ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="replace-with-strong-password"
ADMIN_NAME="Администратор"
```

Файл `.env` не должен попадать в git.

## 4. Запуск приложения

```bash
docker compose up -d --build
```

Примените миграции и создайте стартовые данные:

```bash
docker compose exec app npx prisma migrate deploy
docker compose exec app npx prisma db seed
```

Если нужно удалить старые непроведённые черновики операций и оставить только один активный черновик на СТО/тип операции:

```bash
docker compose exec app npm run cleanup:operations
```

Проверка локального ответа приложения:

```bash
curl -I http://127.0.0.1:3000
```

Ожидаемый результат для неавторизованного запроса:

```text
HTTP/1.1 307 Temporary Redirect
location: /login
```

## 5. Nginx

```bash
sudo apt install -y nginx
sudo nano /etc/nginx/sites-available/workwear-app
```

Конфигурация:

```nginx
server {
    server_name specod.aiautomatizaciy.ru;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Включение сайта:

```bash
sudo ln -s /etc/nginx/sites-available/workwear-app /etc/nginx/sites-enabled/workwear-app
sudo nginx -t
sudo systemctl reload nginx
```

## 6. HTTPS через Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d specod.aiautomatizaciy.ru
```

Проверка автообновления сертификатов:

```bash
sudo certbot renew --dry-run
```

## 7. Логи и перезапуск

Просмотр контейнеров:

```bash
docker compose ps
```

Логи приложения:

```bash
docker compose logs -f app
```

Логи PostgreSQL:

```bash
docker compose logs -f postgres
```

Перезапуск:

```bash
docker compose restart
```

Обновление после нового коммита:

```bash
cd /opt/workwear-app
git pull
docker compose up -d --build
docker compose exec app npx prisma migrate deploy
docker compose exec app npm run cleanup:operations
```

Полная остановка:

```bash
docker compose down
```
