// Загрузка переменных окружения
require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const path = require('path');

// Замените на ваш токен бота от @BotFather
const TOKEN = process.env.BOT_TOKEN || 'YOUR_BOT_TOKEN_HERE';
const PORT = process.env.PORT || 3000;
// Для Railway используем переменную RAILWAY_PUBLIC_DOMAIN или PORT
const WEBAPP_URL = process.env.WEBAPP_URL || 
                   (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : 'https://your-domain.com');
// ID администраторов (можно указать несколько через запятую)
const ADMIN_IDS = (process.env.ADMIN_CHAT_IDS || process.env.ADMIN_CHAT_ID || '').split(',').map(id => id.trim()).filter(id => id);

// Проверка токена
if (TOKEN === 'YOUR_BOT_TOKEN_HERE') {
    console.error('⚠️  ВНИМАНИЕ: Установите BOT_TOKEN в файле .env');
    console.error('   Получите токен у @BotFather в Telegram');
}

// Создаем бота
// Для Railway используем polling, для production можно использовать webhook
const bot = new TelegramBot(TOKEN, { 
    polling: process.env.NODE_ENV !== 'production' || !process.env.WEBHOOK_URL,
    webHook: process.env.WEBHOOK_URL ? {
        port: PORT
    } : false
});

// Если используется webhook, настраиваем его
if (process.env.WEBHOOK_URL) {
    bot.setWebHook(`${process.env.WEBHOOK_URL}/bot${TOKEN}`);
    console.log('Webhook configured:', `${process.env.WEBHOOK_URL}/bot${TOKEN}`);
}

// Express сервер для статических файлов
const app = express();

// Простой rate limiting (базовая защита от спама)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 минута
const RATE_LIMIT_MAX_REQUESTS = 100; // Максимум 100 запросов в минуту

function rateLimit(req, res, next) {
    const ip = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
    const now = Date.now();
    
    if (!rateLimitMap.has(ip)) {
        rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
        return next();
    }
    
    const limit = rateLimitMap.get(ip);
    
    if (now > limit.resetTime) {
        limit.count = 1;
        limit.resetTime = now + RATE_LIMIT_WINDOW;
        return next();
    }
    
    if (limit.count >= RATE_LIMIT_MAX_REQUESTS) {
        return res.status(429).json({ success: false, error: 'Too many requests' });
    }
    
    limit.count++;
    next();
}

// Очистка старых записей rate limit каждые 5 минут
setInterval(() => {
    const now = Date.now();
    for (const [ip, limit] of rateLimitMap.entries()) {
        if (now > limit.resetTime) {
            rateLimitMap.delete(ip);
        }
    }
}, 300000); // 5 минут

// Безопасность: установка заголовков
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});

// Rate limiting для API endpoints
app.use('/api', rateLimit);

// Ограничение размера тела запроса (защита от DoS)
app.use(express.json({ limit: '1mb' })); // Максимум 1MB на запрос
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Статические файлы
app.use(express.static(__dirname));

// Health check для Railway
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        bot: TOKEN !== 'YOUR_BOT_TOKEN_HERE' ? 'configured' : 'not configured'
    });
});

// Функция для получения настроек бота
function getBotSettings() {
    try {
        const fs = require('fs');
        if (fs.existsSync('bot-settings.json')) {
            const settings = JSON.parse(fs.readFileSync('bot-settings.json', 'utf8'));
            return settings;
        }
    } catch (e) {
        console.error('Error reading bot settings:', e);
    }
    return null;
}

// API endpoint для получения настроек бота
app.get('/api/bot-settings', (req, res) => {
    const settings = getBotSettings();
    res.json(settings || {});
});

// API endpoint для сохранения настроек бота
app.post('/api/bot-settings', (req, res) => {
    try {
        const fs = require('fs');
        fs.writeFileSync('bot-settings.json', JSON.stringify(req.body, null, 2));
        res.json({ success: true, message: 'Settings saved' });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Функция для санитизации строк (защита от XSS)
function sanitizeString(str) {
    if (typeof str !== 'string') return str;
    return str
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;')
        .substring(0, 1000); // Ограничение длины
}

// Функция для валидации товара
function validateProduct(product) {
    if (!product || typeof product !== 'object') return false;
    if (!product.id || typeof product.id !== 'string') return false;
    if (!product.name || typeof product.name !== 'string' || product.name.length === 0) return false;
    if (typeof product.price !== 'number' || product.price < 0 || product.price > 100000000) return false;
    if (product.description && typeof product.description !== 'string') return false;
    if (product.category && typeof product.category !== 'string') return false;
    return true;
}

// Функция для валидации массива товаров
function validateProducts(products) {
    if (!Array.isArray(products)) return false;
    if (products.length > 1000) return false; // Ограничение количества
    return products.every(validateProduct);
}

// Функция для валидации баннера
function validateBanner(banner) {
    if (!banner || typeof banner !== 'object') return false;
    if (!banner.id || typeof banner.id !== 'string') return false;
    if (!banner.title || typeof banner.title !== 'string' || banner.title.length === 0) return false;
    if (!banner.subtitle || typeof banner.subtitle !== 'string' || banner.subtitle.length === 0) return false;
    return true;
}

// Функция для валидации массива баннеров
function validateBanners(banners) {
    if (!Array.isArray(banners)) return false;
    if (banners.length > 100) return false; // Ограничение количества
    return banners.every(validateBanner);
}

// Функция для валидации hero-блока
function validateHero(hero) {
    if (!hero || typeof hero !== 'object') return false;
    if (hero.title && typeof hero.title !== 'string') return false;
    if (hero.subtitle && typeof hero.subtitle !== 'string') return false;
    return true;
}

// Функция для валидации заказа
function validateOrder(order) {
    if (!order || typeof order !== 'object') return false;
    if (!order.name || typeof order.name !== 'string' || order.name.length === 0 || order.name.length > 100) return false;
    if (!order.phone || typeof order.phone !== 'string' || order.phone.length === 0 || order.phone.length > 20) return false;
    if (!order.address || typeof order.address !== 'string' || order.address.length === 0 || order.address.length > 500) return false;
    if (!Array.isArray(order.items) || order.items.length === 0 || order.items.length > 100) return false;
    if (typeof order.total !== 'number' || order.total < 0 || order.total > 100000000) return false;
    return true;
}

// Валидные статусы заказа
const VALID_ORDER_STATUSES = ['new', 'processing', 'confirmed', 'preparing', 'delivering', 'completed', 'cancelled'];

// Функция для валидации статуса заказа
function validateOrderStatus(status) {
    return VALID_ORDER_STATUSES.includes(status);
}

// Функция для чтения/записи JSON файлов
function readJSONFile(filename, defaultValue = []) {
    try {
        const fs = require('fs');
        if (fs.existsSync(filename)) {
            const content = fs.readFileSync(filename, 'utf8');
            if (!content || content.trim().length === 0) {
                return defaultValue;
            }
            const parsed = JSON.parse(content);
            // Проверка, что это массив или объект
            if (Array.isArray(parsed) || (typeof parsed === 'object' && parsed !== null)) {
                return parsed;
            }
            return defaultValue;
        }
    } catch (e) {
        console.error(`Error reading ${filename}:`, e);
        // Если файл поврежден, создаем резервную копию
        try {
            const fs = require('fs');
            if (fs.existsSync(filename)) {
                const backupName = `${filename}.backup.${Date.now()}`;
                fs.copyFileSync(filename, backupName);
                console.log(`Backup created: ${backupName}`);
            }
        } catch (backupError) {
            console.error('Error creating backup:', backupError);
        }
    }
    return defaultValue;
}

function writeJSONFile(filename, data) {
    try {
        const fs = require('fs');
        // Создать резервную копию перед записью
        if (fs.existsSync(filename)) {
            const backupName = `${filename}.backup.${Date.now()}`;
            try {
                fs.copyFileSync(filename, backupName);
            } catch (e) {
                console.warn(`Could not create backup for ${filename}:`, e);
            }
        }
        fs.writeFileSync(filename, JSON.stringify(data, null, 2));
        return true;
    } catch (e) {
        console.error(`Error writing ${filename}:`, e);
        return false;
    }
}

// API endpoint для проверки прав администратора
app.post('/api/check-admin', (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({ success: false, error: 'User ID required' });
        }
        const isAdminUser = isAdmin(userId);
        res.json({ success: true, isAdmin: isAdminUser });
    } catch (e) {
        console.error('Error checking admin:', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// API endpoints для товаров
app.get('/api/products', (req, res) => {
    try {
        const products = readJSONFile('products.json', []);
        res.json({ success: true, products });
    } catch (e) {
        console.error('Error getting products:', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

app.post('/api/products', (req, res) => {
    try {
        const { userId, products } = req.body;
        
        // Валидация входных данных
        if (!userId || typeof userId !== 'string') {
            return res.status(400).json({ success: false, error: 'Invalid user ID' });
        }
        
        if (!isAdmin(userId)) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }
        
        if (!validateProducts(products)) {
            return res.status(400).json({ success: false, error: 'Invalid products data' });
        }
        
        // Санитизация данных
        const sanitizedProducts = products.map(product => ({
            ...product,
            name: sanitizeString(product.name),
            description: product.description ? sanitizeString(product.description) : '',
            category: product.category ? sanitizeString(product.category) : ''
        }));
        
        if (writeJSONFile('products.json', sanitizedProducts)) {
            res.json({ success: true, message: 'Products saved' });
        } else {
            res.status(500).json({ success: false, error: 'Failed to save products' });
        }
    } catch (e) {
        console.error('Error saving products:', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// API endpoints для баннеров
app.get('/api/banners', (req, res) => {
    try {
        const banners = readJSONFile('banners.json', []);
        res.json({ success: true, banners });
    } catch (e) {
        console.error('Error getting banners:', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

app.post('/api/banners', (req, res) => {
    try {
        const { userId, banners } = req.body;
        
        // Валидация входных данных
        if (!userId || typeof userId !== 'string') {
            return res.status(400).json({ success: false, error: 'Invalid user ID' });
        }
        
        if (!isAdmin(userId)) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }
        
        if (!validateBanners(banners)) {
            return res.status(400).json({ success: false, error: 'Invalid banners data' });
        }
        
        // Санитизация данных
        const sanitizedBanners = banners.map(banner => ({
            ...banner,
            title: sanitizeString(banner.title),
            subtitle: sanitizeString(banner.subtitle)
        }));
        
        if (writeJSONFile('banners.json', sanitizedBanners)) {
            res.json({ success: true, message: 'Banners saved' });
        } else {
            res.status(500).json({ success: false, error: 'Failed to save banners' });
        }
    } catch (e) {
        console.error('Error saving banners:', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// API endpoints для hero-блока
app.get('/api/hero', (req, res) => {
    try {
        const hero = readJSONFile('hero.json', null);
        res.json({ success: true, hero });
    } catch (e) {
        console.error('Error getting hero:', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

app.post('/api/hero', (req, res) => {
    try {
        const { userId, hero } = req.body;
        
        // Валидация входных данных
        if (!userId || typeof userId !== 'string') {
            return res.status(400).json({ success: false, error: 'Invalid user ID' });
        }
        
        if (!isAdmin(userId)) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }
        
        if (!validateHero(hero)) {
            return res.status(400).json({ success: false, error: 'Invalid hero data' });
        }
        
        // Санитизация данных
        const sanitizedHero = {
            ...hero,
            title: hero.title ? sanitizeString(hero.title) : '',
            subtitle: hero.subtitle ? sanitizeString(hero.subtitle) : ''
        };
        
        if (writeJSONFile('hero.json', sanitizedHero)) {
            res.json({ success: true, message: 'Hero settings saved' });
        } else {
            res.status(500).json({ success: false, error: 'Failed to save hero settings' });
        }
    } catch (e) {
        console.error('Error saving hero:', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// API endpoint для получения заказов (только для админов)
app.get('/api/orders', (req, res) => {
    try {
        const { userId } = req.query;
        if (!isAdmin(userId)) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }
        const orders = readJSONFile('orders.json', []);
        res.json({ success: true, orders });
    } catch (e) {
        console.error('Error getting orders:', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// API endpoint для обновления статуса заказа
app.post('/api/orders/:orderId/status', (req, res) => {
    try {
        const { orderId } = req.params;
        const { userId, status } = req.body;
        
        // Валидация входных данных
        if (!userId || typeof userId !== 'string') {
            return res.status(400).json({ success: false, error: 'Invalid user ID' });
        }
        
        if (!isAdmin(userId)) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }
        
        // Валидация статуса
        if (!status || !validateOrderStatus(status)) {
            return res.status(400).json({ success: false, error: 'Invalid order status' });
        }
        
        const orders = readJSONFile('orders.json', []);
        const orderIndex = orders.findIndex(o => o.id === orderId || o.orderId === orderId);
        if (orderIndex === -1) {
            return res.status(404).json({ success: false, error: 'Order not found' });
        }
        
        const oldStatus = orders[orderIndex].status;
        orders[orderIndex].status = status;
        orders[orderIndex].updatedAt = new Date().toISOString();
        
        if (writeJSONFile('orders.json', orders)) {
            // Отправить уведомление пользователю об изменении статуса
            if (orders[orderIndex].telegramUserId && oldStatus !== status) {
                sendOrderStatusNotification(orders[orderIndex].telegramUserId, orderId, status, orders[orderIndex]);
            }
            
            res.json({ success: true, order: orders[orderIndex] });
        } else {
            res.status(500).json({ success: false, error: 'Failed to update order' });
        }
    } catch (e) {
        console.error('Error updating order status:', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// Функция отправки уведомления пользователю об изменении статуса заказа
function sendOrderStatusNotification(telegramUserId, orderId, status, order) {
    try {
        const statusMessages = {
            'new': '🆕 Yangi buyurtma qabul qilindi',
            'processing': '⏳ Buyurtmangiz ko\'rib chiqilmoqda',
            'confirmed': '✅ Buyurtmangiz tasdiqlandi',
            'preparing': '👨‍🍳 Buyurtmangiz tayyorlanmoqda',
            'delivering': '🚚 Buyurtmangiz yetkazilmoqda',
            'completed': '🎉 Buyurtmangiz yetkazib berildi!',
            'cancelled': '❌ Buyurtmangiz bekor qilindi'
        };
        
        const statusMessage = statusMessages[status] || `Buyurtmangiz holati o'zgardi: ${status}`;
        
        let message = `${statusMessage}\n\n`;
        message += `📦 Buyurtma raqami: #${orderId.slice(-6)}\n`;
        message += `💰 Jami: ${(order.totalAmount || order.total || 0).toLocaleString('ru-RU')} so'm\n`;
        
        if (status === 'delivering') {
            message += `\n🚚 Yetkazib beruvchi tez orada siz bilan bog'lanadi.`;
        } else if (status === 'completed') {
            message += `\n🙏 Bizni tanlaganingiz uchun rahmat! Yana buyurtma berishingiz mumkin.`;
        }
        
        bot.sendMessage(telegramUserId, message).catch(err => {
            console.error(`Error sending notification to user ${telegramUserId}:`, err);
        });
    } catch (e) {
        console.error('Error sending order status notification:', e);
    }
}

// API endpoint для приема заказов
app.post('/api/orders', (req, res) => {
    try {
        const order = req.body;
        
        // Валидация заказа
        if (!validateOrder(order)) {
            return res.status(400).json({ success: false, error: 'Invalid order data' });
        }
        
        const orderId = Date.now().toString();
        
        // Санитизация данных заказа
        const sanitizedOrder = {
            id: orderId,
            orderId: orderId,
            name: sanitizeString(order.name),
            phone: sanitizeString(order.phone),
            address: sanitizeString(order.address),
            deliveryTime: order.deliveryTime || 'asap',
            comment: order.comment ? sanitizeString(order.comment) : '',
            items: order.items.map(item => ({
                ...item,
                name: sanitizeString(item.name),
                price: typeof item.price === 'number' ? item.price : 0,
                quantity: typeof item.quantity === 'number' ? item.quantity : 1
            })),
            total: typeof order.total === 'number' ? order.total : 0,
            telegramUserId: order.telegramUserId || null,
            status: 'new',
            createdAt: new Date().toISOString()
        };
        
        // Сохранить заказ в файл (для истории)
        const orders = readJSONFile('orders.json', []);
        orders.push(sanitizedOrder);
        
        if (writeJSONFile('orders.json', orders)) {
            // Отправить заказ администратору в Telegram
            sendOrderToAdmin(sanitizedOrder, orderId);
            
            res.json({ 
                success: true, 
                orderId: orderId,
                message: 'Order received' 
            });
        } else {
            res.status(500).json({ success: false, error: 'Failed to save order' });
        }
    } catch (e) {
        console.error('Error processing order:', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// Функция отправки заказа администратору
function sendOrderToAdmin(order, orderId) {
    try {
        // ID администратора (получить из переменных окружения или настроек)
        const adminChatId = process.env.ADMIN_CHAT_ID || ADMIN_IDS[0];
        
        if (!adminChatId) {
            console.error('⚠️  КРИТИЧНО: ADMIN_CHAT_ID not set, order will not be sent to admin!');
            console.error('   Order ID:', orderId);
            console.error('   Customer:', order.name, order.phone);
            // В продакшене это критично - заказ может быть потерян!
            return;
        }
        
        // Формируем сообщение о заказе
        let message = `🛒 YANGI BUYURTMA #${orderId.slice(-6)}\n\n`;
        message += `👤 Mijoz: ${order.name}\n`;
        message += `📞 Telefon: ${order.phone}\n`;
        message += `📍 Manzil: ${order.address}\n`;
        
        const deliveryTimes = {
            'asap': 'Imkon qadar tezroq',
            'morning': 'Ertalab (9:00-12:00)',
            'afternoon': 'Kunduzi (12:00-17:00)',
            'evening': 'Kechqurun (17:00-21:00)'
        };
        message += `⏰ Vaqt: ${deliveryTimes[order.deliveryTime] || order.deliveryTime}\n\n`;
        
        message += `📦 Mahsulotlar:\n`;
        order.items.forEach(item => {
            const itemTotal = item.price * item.quantity;
            message += `• ${item.name} x${item.quantity} - ${itemTotal.toLocaleString('ru-RU')} so'm\n`;
        });
        
        message += `\n💰 Jami: ${order.total.toLocaleString('ru-RU')} so'm\n`;
        
        if (order.comment) {
            message += `\n💬 Izoh: ${order.comment}`;
        }
        
        // Отправляем сообщение администратору
        bot.sendMessage(adminChatId, message);
        
        console.log(`Order #${orderId} sent to admin`);
    } catch (e) {
        console.error('Error sending order to admin:', e);
    }
}

// Проверка, является ли пользователь администратором
function isAdmin(chatId) {
    if (ADMIN_IDS.length === 0) {
        // Если не указаны админы, разрешаем всем (для разработки)
        console.warn('⚠️  ADMIN_IDS not set, allowing all users');
        return true;
    }
    return ADMIN_IDS.includes(chatId.toString());
}

// Главная страница
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Запуск сервера
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`WebApp URL: ${WEBAPP_URL}`);
    if (TOKEN === 'YOUR_BOT_TOKEN_HERE') {
        console.warn('⚠️  ВНИМАНИЕ: Установите BOT_TOKEN в переменных окружения Railway');
    }
});

// Обработка команды /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const settings = getBotSettings();
    
    // Создаем клавиатуру
    const keyboard = [
        [
            { text: 'Bot haqida' },
            { text: 'Bugun nima yeymiz?' }
        ],
        [
            { text: 'Hamkorlik' },
            { text: 'Takliflar' }
        ]
    ];
    
    // Добавляем кнопку админа, если пользователь - админ
    if (isAdmin(chatId)) {
        keyboard.push([{ text: '🔐 Admin Panel' }]);
    }
    
    const options = {
        reply_markup: {
            keyboard: keyboard,
            resize_keyboard: true,
            one_time_keyboard: false
        }
    };
    
    const welcomeMessage = settings?.startMessage || `Assalomu alaykum! 👋

MEN OSHPAZ botiga xush kelibsiz! 🍳

Bu bot orqali siz:
• Uyda pishirish uchun mahsulotlar buyurtma qilishingiz mumkin
• Turli retseptlar va maslahatlar olishingiz mumkin
• Yangi mahsulotlar haqida ma'lumot olishingiz mumkin

Quyidagi tugmalardan birini tanlang:`;
    
    bot.sendMessage(chatId, welcomeMessage, options);
});

// Обработка кнопки "Bot haqida"
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    
    if (text === 'Bot haqida') {
        const settings = getBotSettings();
        const aboutMessage = settings?.aboutMessage || `🤖 Bot haqida

MEN OSHPAZ - bu uyda pishirish uchun barcha kerakli mahsulotlarni yetkazib beruvchi xizmat.

Bizning xizmatlarimiz:
• 🍕 Tayyor xamir va ingredientlar
• 📦 To'liq pishirish to'plamlari
• 🌶️ Souslar va ziravorlar
• 🥤 Ichimliklar va boshqa mahsulotlar

Bizning maqsadimiz - sizga uyda oson va qulay pishirish imkoniyatini berish.

WebApp orqali buyurtma berish uchun quyidagi tugmani bosing:`;
        
        const webAppButton = {
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: '🛒 WebApp ochish',
                            web_app: { url: WEBAPP_URL }
                        }
                    ]
                ]
            }
        };
        
        bot.sendMessage(chatId, aboutMessage, webAppButton);
    }
    
    // Обработка кнопки "Bugun nima yeymiz?"
    else if (text === 'Bugun nima yeymiz?') {
        const settings = getBotSettings();
        const suggestionsMessage = settings?.suggestionsMessage || `🍽️ Bugun nima yeymiz?

Quyidagi variantlardan birini tanlang:`;
        
        const suggestionsKeyboard = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '🍕 Pitsa pishiramiz', callback_data: 'category_pizza' },
                        { text: '🥟 Somsa pishiramiz', callback_data: 'category_samsa' }
                    ],
                    [
                        { text: '🍔 Burger pishiramiz', callback_data: 'category_burger' },
                        { text: '🥞 Nonushta', callback_data: 'category_breakfast' }
                    ],
                    [
                        {
                            text: '🛒 Barcha mahsulotlarni ko\'rish',
                            web_app: { url: `${WEBAPP_URL}/index.html` }
                        }
                    ]
                ]
            }
        };
        
        bot.sendMessage(chatId, suggestionsMessage, suggestionsKeyboard);
    }
    
    // Обработка кнопки "Hamkorlik"
    else if (text === 'Hamkorlik') {
        const settings = getBotSettings();
        let partnershipMessage = settings?.partnershipMessage || `🤝 Hamkorlik

Biz hamkorlarimiz bilan birgalikda ishlashga qiziqamiz!

Agar siz:
• 🏪 Restoran yoki oshxona egasiz
• 🚚 Yetkazib berish xizmatiga egasiz
• 📦 Mahsulot yetkazib beruvchisiz
• 💼 Boshqa biznes egasiz

Biz bilan bog'laning!

📞 Aloqa: @menoshpaz_support
📧 Email: info@menoshpaz.uz
🌐 Website: ${WEBAPP_URL}

Hamkorlik bo'yicha batafsil ma'lumot olish uchun quyidagi tugmani bosing:`;
        
        // Заменить контакты из настроек
        if (settings?.contactUsername) {
            partnershipMessage = partnershipMessage.replace(/@[\w_]+/g, settings.contactUsername);
        }
        if (settings?.contactEmail) {
            partnershipMessage = partnershipMessage.replace(/[\w.-]+@[\w.-]+\.\w+/g, settings.contactEmail);
        }
        
        const contactUsername = settings?.contactUsername || '@menoshpaz_support';
        const contactButton = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '📞 Bog\'lanish', url: `https://t.me/${contactUsername.replace('@', '')}` }
                    ]
                ]
            }
        };
        
        bot.sendMessage(chatId, partnershipMessage, contactButton);
    }
    
    // Обработка кнопки "Admin Panel"
    else if (text === '🔐 Admin Panel' || text === 'Admin Panel') {
        if (!isAdmin(chatId)) {
            bot.sendMessage(chatId, '❌ Sizda admin huquqi yo\'q.');
            return;
        }
        
        const adminUrl = `${WEBAPP_URL}/admin.html`;
        const adminButton = {
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: '🔐 Admin Panelni ochish',
                            web_app: { url: adminUrl }
                        }
                    ],
                    [
                        {
                            text: '📋 Linkni ko\'rsatish',
                            callback_data: 'show_admin_link'
                        }
                    ]
                ]
            }
        };
        
        const adminMessage = `🔐 Admin Panel\n\nAdmin panelni ochish uchun quyidagi tugmani bosing yoki linkni oching:\n\n${adminUrl}`;
        
        bot.sendMessage(chatId, adminMessage, adminButton);
    }
    
    // Обработка кнопки "Takliflar"
    else if (text === 'Takliflar') {
        const settings = getBotSettings();
        const feedbackMessage = settings?.feedbackMessage || `💡 Takliflar va fikrlar

Sizning fikrlaringiz biz uchun juda muhim! 

Agar sizda:
• ✨ Yangi mahsulot takliflari bo'lsa
• 🎯 Xizmatni yaxshilash bo'yicha takliflar bo'lsa
• 🐛 Muammo yoki shikoyat bo'lsa
• 💬 Boshqa fikr va takliflar bo'lsa

Bizga yozing! Biz har bir xabaringizni o'qiymiz va javob beramiz.

Taklif yuborish uchun quyidagi tugmani bosing:`;
        
        const feedbackUsername = settings?.feedbackUsername || '@menoshpaz_feedback';
        const feedbackButton = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '✍️ Taklif yuborish', url: `https://t.me/${feedbackUsername.replace('@', '')}` }
                    ],
                    [
                        { text: '⭐ Botni baholash', url: 'https://t.me/storebot?start=menoshpaz_bot' }
                    ]
                ]
            }
        };
        
        bot.sendMessage(chatId, feedbackMessage, feedbackButton);
    }
});

// Обработка команды /admin
bot.onText(/\/admin/, (msg) => {
    const chatId = msg.chat.id;
    
    if (!isAdmin(chatId)) {
        bot.sendMessage(chatId, '❌ Sizda admin huquqi yo\'q.');
        return;
    }
    
    const adminUrl = `${WEBAPP_URL}/admin.html`;
    const adminButton = {
        reply_markup: {
            inline_keyboard: [
                [
                    {
                        text: '🔐 Admin Panelni ochish',
                        web_app: { url: adminUrl }
                    }
                ],
                [
                    {
                        text: '📋 Linkni ko\'rsatish',
                        callback_data: 'show_admin_link'
                    }
                ]
            ]
        }
    };
    
    const adminMessage = `🔐 Admin Panel\n\nAdmin panelni ochish uchun quyidagi tugmani bosing yoki linkni oching:\n\n${adminUrl}`;
    
    bot.sendMessage(chatId, adminMessage, adminButton);
});

// Обработка callback-кнопок (inline кнопки)
bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;
    
    // Ответ на callback
    bot.answerCallbackQuery(query.id);
    
    // Обработка показа ссылки на админ-панель
    if (data === 'show_admin_link') {
        if (!isAdmin(chatId)) {
            bot.sendMessage(chatId, '❌ Sizda admin huquqi yo\'q.');
            return;
        }
        
        const adminUrl = `${WEBAPP_URL}/admin.html`;
        bot.sendMessage(chatId, `🔐 Admin Panel linki:\n\n${adminUrl}\n\nBu linkni brauzerda ochishingiz mumkin.`);
        return;
    }
    
    // Обработка категорий
    if (data.startsWith('category_')) {
        const category = data.replace('category_', '');
        const categoryNames = {
            pizza: '🍕 Pitsa',
            samsa: '🥟 Somsa',
            burger: '🍔 Burger',
            breakfast: '🥞 Nonushta'
        };
        
        const message = `${categoryNames[category]} kategoriyasidagi mahsulotlarni ko'rish uchun WebApp ni oching:`;
        
        const webAppButton = {
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: `🛒 ${categoryNames[category]} mahsulotlari`,
                            web_app: { url: `${WEBAPP_URL}/products.html?category=${category}` }
                        }
                    ]
                ]
            }
        };
        
        bot.sendMessage(chatId, message, webAppButton);
    }
});

// Обработка команды /help
bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    const settings = getBotSettings();
    
    let helpMessage = settings?.helpMessage || `📖 Yordam

Quyidagi buyruqlar mavjud:

/start - Botni qayta ishga tushirish
/help - Yordam olish
/menu - Asosiy menyuni ko'rsatish
/webapp - WebApp ni ochish`;

    // Добавить команду /admin для администраторов
    if (isAdmin(chatId)) {
        helpMessage += `\n/admin - Admin panelni ochish`;
    }
    
    helpMessage += `\n\nYoki quyidagi tugmalardan foydalaning:
• Bot haqida
• Bugun nima yeymiz?
• Hamkorlik
• Takliflar`;
    
    bot.sendMessage(chatId, helpMessage);
});

// Обработка команды /menu
bot.onText(/\/menu/, (msg) => {
    const chatId = msg.chat.id;
    
    // Создаем клавиатуру
    const keyboard = [
        [
            { text: 'Bot haqida' },
            { text: 'Bugun nima yeymiz?' }
        ],
        [
            { text: 'Hamkorlik' },
            { text: 'Takliflar' }
        ]
    ];
    
    // Добавляем кнопку админа, если пользователь - админ
    if (isAdmin(chatId)) {
        keyboard.push([{ text: '🔐 Admin Panel' }]);
    }
    
    const options = {
        reply_markup: {
            keyboard: keyboard,
            resize_keyboard: true,
            one_time_keyboard: false
        }
    };
    
    bot.sendMessage(chatId, 'Asosiy menyu:', options);
});

// Обработка команды /webapp
bot.onText(/\/webapp/, (msg) => {
    const chatId = msg.chat.id;
    const webAppButton = {
        reply_markup: {
            inline_keyboard: [
                [
                    {
                        text: '🛒 WebApp ochish',
                        web_app: { url: WEBAPP_URL }
                    }
                ]
            ]
        }
    };
    
    bot.sendMessage(chatId, 'WebApp ni ochish uchun quyidagi tugmani bosing:', webAppButton);
});

// Обработка ошибок
bot.on('polling_error', (error) => {
    console.error('Polling error:', error);
    // Не останавливаем бота при ошибках polling
});

bot.on('error', (error) => {
    console.error('Bot error:', error);
});

// Обработка ошибок Express
app.use((err, req, res, next) => {
    console.error('Express error:', err);
    res.status(500).json({ 
        success: false, 
        error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message 
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ success: false, error: 'Not found' });
});

// Обработка получения сообщений
bot.on('message', (msg) => {
    // Игнорируем команды и уже обработанные сообщения
    if (msg.text && msg.text.startsWith('/')) {
        return;
    }
    
    // Если это не одна из наших кнопок, отправляем подсказку
    const validButtons = ['Bot haqida', 'Bugun nima yeymiz?', 'Hamkorlik', 'Takliflar', '🔐 Admin Panel', 'Admin Panel'];
    if (msg.text && !validButtons.includes(msg.text)) {
        const chatId = msg.chat.id;
        bot.sendMessage(chatId, 'Iltimos, quyidagi tugmalardan birini tanlang yoki /menu buyrug\'ini kiriting.');
    }
});

console.log('Bot is running...');

