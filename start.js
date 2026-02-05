// Универсальный стартовый скрипт для Railway
// Определяет, какой сервис запускать на основе переменной окружения SERVICE_TYPE

require('dotenv').config();

const SERVICE_TYPE = process.env.SERVICE_TYPE || 'backend-frontend';

console.log(`🚀 Starting service: ${SERVICE_TYPE}`);
console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);

if (SERVICE_TYPE === 'bot') {
    // Запускаем бот сервис
    console.log('🤖 Starting Telegram Bot service...');
    console.log('📝 Loading bot-service.js...');
    try {
        require('./bot-service.js');
    } catch (error) {
        console.error('❌ Error loading bot-service.js:', error);
        process.exit(1);
    }
} else if (SERVICE_TYPE === 'backend-frontend' || !SERVICE_TYPE) {
    // Запускаем backend + frontend сервис (по умолчанию)
    console.log('🌐 Starting Backend + Frontend service...');
    console.log('📝 Loading server.js...');
    try {
        require('./server.js');
    } catch (error) {
        console.error('❌ Error loading server.js:', error);
        process.exit(1);
    }
} else {
    console.error(`❌ Unknown SERVICE_TYPE: ${SERVICE_TYPE}`);
    console.log('Available types: bot, backend-frontend');
    process.exit(1);
}

