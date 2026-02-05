// Telegram Bot Service
// Запускается отдельно от backend для масштабирования

require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const TOKEN = process.env.BOT_TOKEN || 'YOUR_BOT_TOKEN_HERE';
const WEBAPP_URL = process.env.WEBAPP_URL || 
                   (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : 'https://your-domain.com');
const ADMIN_IDS = (process.env.ADMIN_CHAT_IDS || process.env.ADMIN_CHAT_ID || '').split(',').map(id => id.trim()).filter(id => id);

// Проверка токена
if (TOKEN === 'YOUR_BOT_TOKEN_HERE') {
    console.error('⚠️  ВНИМАНИЕ: Установите BOT_TOKEN в файле .env');
    console.error('   Получите токен у @BotFather в Telegram');
    process.exit(1);
}

// Создаем бота
const bot = new TelegramBot(TOKEN, { 
    polling: true // Всегда используем polling для отдельного сервиса
});

console.log('🤖 Telegram Bot service started');

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

// Функция для чтения заказов
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
    }
    return defaultValue;
}

// Проверка, является ли пользователь администратором
function isAdmin(chatId) {
    if (ADMIN_IDS.length === 0) {
        console.warn('⚠️  ADMIN_IDS not set, allowing all users');
        return true;
    }
    return ADMIN_IDS.includes(chatId.toString());
}

// Функция отправки заказа администратору
function sendOrderToAdmin(order, orderId) {
    try {
        const adminChatId = process.env.ADMIN_CHAT_ID || ADMIN_IDS[0];
        
        if (!adminChatId) {
            console.error('⚠️  КРИТИЧНО: ADMIN_CHAT_ID not set, order will not be sent to admin!');
            console.error('   Order ID:', orderId);
            console.error('   Customer:', order.name, order.phone);
            return;
        }
        
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
        
        bot.sendMessage(adminChatId, message);
        console.log(`Order #${orderId} sent to admin`);
    } catch (e) {
        console.error('Error sending order to admin:', e);
    }
}

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

// Мониторинг новых заказов (проверяет orders.json каждые 5 секунд)
setInterval(() => {
    try {
        const orders = readJSONFile('orders.json', []);
        const newOrders = orders.filter(order => 
            order.status === 'new' && 
            !order.notifiedToAdmin &&
            order.createdAt && 
            new Date(order.createdAt) > new Date(Date.now() - 60000) // За последнюю минуту
        );
        
        newOrders.forEach(order => {
            sendOrderToAdmin(order, order.orderId || order.id);
            // Помечаем как уведомленный
            order.notifiedToAdmin = true;
            const fs = require('fs');
            const allOrders = readJSONFile('orders.json', []);
            const orderIndex = allOrders.findIndex(o => o.id === order.id || o.orderId === order.orderId);
            if (orderIndex >= 0) {
                allOrders[orderIndex].notifiedToAdmin = true;
                fs.writeFileSync('orders.json', JSON.stringify(allOrders, null, 2));
            }
        });
    } catch (e) {
        console.error('Error checking new orders:', e);
    }
}, 5000); // Проверка каждые 5 секунд

// Мониторинг изменений статусов заказов
setInterval(() => {
    try {
        const orders = readJSONFile('orders.json', []);
        orders.forEach(order => {
            if (order.telegramUserId && 
                order.status && 
                order.status !== 'new' && 
                !order.statusNotified &&
                order.updatedAt &&
                new Date(order.updatedAt) > new Date(Date.now() - 60000)) {
                
                sendOrderStatusNotification(
                    order.telegramUserId,
                    order.orderId || order.id,
                    order.status,
                    order
                );
                
                // Помечаем как уведомленный
                order.statusNotified = true;
                const fs = require('fs');
                const allOrders = readJSONFile('orders.json', []);
                const orderIndex = allOrders.findIndex(o => o.id === order.id || o.orderId === order.orderId);
                if (orderIndex >= 0) {
                    allOrders[orderIndex].statusNotified = true;
                    fs.writeFileSync('orders.json', JSON.stringify(allOrders, null, 2));
                }
            }
        });
    } catch (e) {
        console.error('Error checking order status changes:', e);
    }
}, 5000); // Проверка каждые 5 секунд

// Обработка команды /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const settings = getBotSettings();
    
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

// Обработка сообщений
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

// Обработка callback-кнопок
bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;
    
    bot.answerCallbackQuery(query.id);
    
    if (data === 'show_admin_link') {
        if (!isAdmin(chatId)) {
            bot.sendMessage(chatId, '❌ Sizda admin huquqi yo\'q.');
            return;
        }
        
        const adminUrl = `${WEBAPP_URL}/admin.html`;
        bot.sendMessage(chatId, `🔐 Admin Panel linki:\n\n${adminUrl}\n\nBu linkni brauzerda ochishingiz mumkin.`);
        return;
    }
    
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
});

bot.on('error', (error) => {
    console.error('Bot error:', error);
});

console.log('✅ Bot service ready and listening for messages');

