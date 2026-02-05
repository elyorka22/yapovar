# ⚡ Быстрая настройка двух сервисов в Railway

## Текущая ситуация

Railway создал один сервис, который запускает `node start.js`. По умолчанию это запускает **Backend + Frontend**.

## Решение: Создать второй сервис для бота

### Шаг 1: В существующем сервисе (Backend + Frontend)

Убедитесь, что в настройках сервиса:
- **Start Command**: `node server.js` (или оставьте `node start.js` с `SERVICE_TYPE=backend-frontend`)
- **Variables**: 
  ```
  SERVICE_TYPE=backend-frontend
  ```

### Шаг 2: Создать второй сервис (Bot)

1. В Railway Dashboard нажмите **"+ New"** → **"GitHub Repo"**
2. Выберите репозиторий: `elyorka22/yapovar`
3. В настройках нового сервиса:
   - **Name**: `bot`
   - **Start Command**: `node bot-service.js` (или `node start.js` с переменной)
   - **Variables** (если используете `start.js`):
     ```
     SERVICE_TYPE=bot
     ```

### Шаг 3: Переменные окружения

Установите на уровне **проекта** (Settings → Variables):

```
BOT_TOKEN=ваш_токен_от_BotFather
ADMIN_CHAT_ID=ваш_telegram_chat_id
ADMIN_CHAT_IDS=123456789,987654321
NODE_ENV=production
WEBAPP_URL=https://ваш-проект.railway.app
RAILWAY_PUBLIC_DOMAIN=ваш-проект.railway.app
```

## Альтернатива: Один сервис с переключением

Если хотите использовать один сервис:

1. В настройках сервиса установите:
   - **Start Command**: `node start.js`
   - **Variables**: 
     ```
     SERVICE_TYPE=backend-frontend
     ```

2. Для бота создайте второй сервис с:
   - **Start Command**: `node start.js`
   - **Variables**: 
     ```
     SERVICE_TYPE=bot
     ```

## Проверка

### Backend + Frontend:
```bash
curl https://ваш-проект.railway.app/health
```

### Bot:
Отправьте `/start` боту в Telegram

## Важно!

- Оба сервиса должны использовать **один и тот же репозиторий**
- Переменные окружения можно установить на уровне проекта
- Каждый сервис будет иметь свои логи и метрики

