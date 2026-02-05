// Backend + Frontend сервер (Express)
// Запускается отдельно от бота для масштабирования

require('dotenv').config();
const express = require('express');
const path = require('path');

const PORT = process.env.PORT || 3000;
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

// Ограничение размера тела запроса (защита от DoS)
app.use(express.json({ limit: '1mb' })); // Максимум 1MB на запрос
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Rate limiting для API endpoints
app.use('/api', rateLimit);

// Статические файлы (Frontend)
app.use(express.static(__dirname));

// Health check для Railway
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'ok', 
        service: 'backend-frontend',
        timestamp: new Date().toISOString()
    });
});

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
            if (Array.isArray(parsed) || (typeof parsed === 'object' && parsed !== null)) {
                return parsed;
            }
            return defaultValue;
        }
    } catch (e) {
        console.error(`Error reading ${filename}:`, e);
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

function validateProducts(products) {
    if (!Array.isArray(products)) return false;
    if (products.length > 1000) return false;
    return products.every(validateProduct);
}

function validateBanner(banner) {
    if (!banner || typeof banner !== 'object') return false;
    if (!banner.id || typeof banner.id !== 'string') return false;
    if (!banner.title || typeof banner.title !== 'string' || banner.title.length === 0) return false;
    if (!banner.subtitle || typeof banner.subtitle !== 'string' || banner.subtitle.length === 0) return false;
    return true;
}

function validateBanners(banners) {
    if (!Array.isArray(banners)) return false;
    if (banners.length > 100) return false;
    return banners.every(validateBanner);
}

function validateHero(hero) {
    if (!hero || typeof hero !== 'object') return false;
    if (hero.title && typeof hero.title !== 'string') return false;
    if (hero.subtitle && typeof hero.subtitle !== 'string') return false;
    return true;
}

function validateOrder(order) {
    if (!order || typeof order !== 'object') return false;
    if (!order.name || typeof order.name !== 'string' || order.name.length === 0 || order.name.length > 100) return false;
    if (!order.phone || typeof order.phone !== 'string' || order.phone.length === 0 || order.phone.length > 20) return false;
    if (!order.address || typeof order.address !== 'string' || order.address.length === 0 || order.address.length > 500) return false;
    if (!Array.isArray(order.items) || order.items.length === 0 || order.items.length > 100) return false;
    if (typeof order.total !== 'number' || order.total < 0 || order.total > 100000000) return false;
    return true;
}

const VALID_ORDER_STATUSES = ['new', 'processing', 'confirmed', 'preparing', 'delivering', 'completed', 'cancelled'];

function validateOrderStatus(status) {
    return VALID_ORDER_STATUSES.includes(status);
}

// Проверка прав администратора (используем общую функцию из bot.js или создаем здесь)
const ADMIN_IDS = (process.env.ADMIN_CHAT_IDS || process.env.ADMIN_CHAT_ID || '').split(',').map(id => id.trim()).filter(id => id);

function isAdmin(userId) {
    if (ADMIN_IDS.length === 0) {
        console.warn('⚠️  ADMIN_IDS not set, allowing all users');
        return true;
    }
    return ADMIN_IDS.includes(userId.toString());
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
        
        if (!userId || typeof userId !== 'string') {
            return res.status(400).json({ success: false, error: 'Invalid user ID' });
        }
        
        if (!isAdmin(userId)) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }
        
        if (!validateProducts(products)) {
            return res.status(400).json({ success: false, error: 'Invalid products data' });
        }
        
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
        
        if (!userId || typeof userId !== 'string') {
            return res.status(400).json({ success: false, error: 'Invalid user ID' });
        }
        
        if (!isAdmin(userId)) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }
        
        if (!validateBanners(banners)) {
            return res.status(400).json({ success: false, error: 'Invalid banners data' });
        }
        
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
        
        if (!userId || typeof userId !== 'string') {
            return res.status(400).json({ success: false, error: 'Invalid user ID' });
        }
        
        if (!isAdmin(userId)) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }
        
        if (!validateHero(hero)) {
            return res.status(400).json({ success: false, error: 'Invalid hero data' });
        }
        
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
        
        if (!userId || typeof userId !== 'string') {
            return res.status(400).json({ success: false, error: 'Invalid user ID' });
        }
        
        if (!isAdmin(userId)) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }
        
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
            // Уведомление пользователю будет отправлено ботом через внутренний API
            // Здесь только сохраняем статус
            res.json({ success: true, order: orders[orderIndex] });
        } else {
            res.status(500).json({ success: false, error: 'Failed to update order' });
        }
    } catch (e) {
        console.error('Error updating order status:', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// API endpoint для приема заказов
app.post('/api/orders', (req, res) => {
    try {
        const order = req.body;
        
        if (!validateOrder(order)) {
            return res.status(400).json({ success: false, error: 'Invalid order data' });
        }
        
        const orderId = Date.now().toString();
        
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
        
        const orders = readJSONFile('orders.json', []);
        orders.push(sanitizedOrder);
        
        if (writeJSONFile('orders.json', orders)) {
            // Бот сервис автоматически обнаружит новый заказ через мониторинг orders.json
            // Помечаем заказ как новый для бота
            console.log(`New order saved: ${orderId}, customer: ${order.name}`);
            console.log(`Bot service will send notification automatically`);
            
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

// Уведомление бота о новом заказе (через внутренний API или очередь)
function notifyBotAboutOrder(order, orderId) {
    // В Railway сервисы могут общаться через внутренние URL
    // Или через общий файл/очередь
    // Здесь просто логируем - бот будет читать orders.json
    console.log(`New order received: ${orderId}, customer: ${order.name}`);
}

// API endpoint для настроек бота
app.get('/api/bot-settings', (req, res) => {
    try {
        const fs = require('fs');
        if (fs.existsSync('bot-settings.json')) {
            const settings = JSON.parse(fs.readFileSync('bot-settings.json', 'utf8'));
            res.json(settings);
        } else {
            res.json({});
        }
    } catch (e) {
        console.error('Error reading bot settings:', e);
        res.json({});
    }
});

app.post('/api/bot-settings', (req, res) => {
    try {
        const fs = require('fs');
        fs.writeFileSync('bot-settings.json', JSON.stringify(req.body, null, 2));
        res.json({ success: true, message: 'Settings saved' });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Главная страница
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Запуск сервера
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Backend + Frontend server running on port ${PORT}`);
    console.log(`📦 Service: Backend + Frontend`);
    console.log(`🌐 Health check: http://localhost:${PORT}/health`);
});

