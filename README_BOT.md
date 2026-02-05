# Telegram Bot для MEN OSHPAZ

## Установка

1. Установите зависимости:
```bash
npm install
```

2. Создайте файл `.env`:
```bash
# Создайте файл .env в корне проекта
touch .env
```

3. Добавьте в `.env` следующие переменные:
```
BOT_TOKEN=ваш_токен_здесь
PORT=3000
WEBAPP_URL=http://localhost:8000
```

4. Получите токен бота:
   - Откройте Telegram и найдите @BotFather
   - Отправьте команду `/newbot`
   - Следуйте инструкциям
   - Скопируйте полученный токен

4. Отредактируйте `.env` файл и вставьте ваш токен:
```
BOT_TOKEN=ваш_токен_здесь
WEBAPP_URL=http://localhost:8000
```

5. Запустите бота:
```bash
npm start
```

## Команды бота

- `/start` - Запустить бота и показать главное меню
- `/help` - Показать справку
- `/menu` - Показать главное меню
- `/webapp` - Открыть WebApp

## Кнопки меню

### Bot haqida
Информация о боте, его возможностях и ссылка на WebApp.

### Bugun nima yeymiz?
Показывает категории блюд с возможностью перехода к товарам через WebApp.

### Hamkorlik
Информация о сотрудничестве и контакты для партнеров.

### Takliflar
Форма для отправки предложений и отзывов.

## Настройка WebApp

1. Убедитесь, что ваш WebApp доступен по указанному URL в `.env`
2. Для локальной разработки используйте ngrok или другой туннель:
```bash
ngrok http 8000
```
3. Обновите `WEBAPP_URL` в `.env` на URL от ngrok

## Развертывание

### Heroku
1. Создайте приложение на Heroku
2. Установите переменные окружения:
```bash
heroku config:set BOT_TOKEN=your_token
heroku config:set WEBAPP_URL=https://your-app.herokuapp.com
```
3. Задеплойте:
```bash
git push heroku main
```

### VPS/Server
1. Установите Node.js и npm
2. Клонируйте репозиторий
3. Установите зависимости: `npm install`
4. Настройте `.env` файл
5. Запустите через PM2:
```bash
npm install -g pm2
pm2 start bot.js --name men-oshpaz-bot
pm2 save
```

## Структура проекта

```
.
├── bot.js              # Основной файл бота
├── index.html          # Главная страница WebApp
├── products.html       # Страница товаров
├── admin.html          # Админ-панель
├── package.json        # Зависимости Node.js
├── .env.example        # Пример файла конфигурации
└── README_BOT.md       # Эта инструкция
```

## Поддержка

При возникновении проблем:
1. Проверьте, что токен бота правильный
2. Убедитесь, что WebApp доступен по указанному URL
3. Проверьте логи бота в консоли

