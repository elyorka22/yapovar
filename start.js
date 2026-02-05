// Универсальный стартовый скрипт для Railway
// Определяет, какой сервис запускать на основе переменной окружения SERVICE_TYPE

require('dotenv').config();

const SERVICE_TYPE = process.env.SERVICE_TYPE || 'backend-frontend';

console.log(`🚀 Starting service: ${SERVICE_TYPE}`);

if (SERVICE_TYPE === 'bot') {
    // Запускаем бот сервис
    console.log('🤖 Starting Telegram Bot service...');
    require('./bot-service.js');
} else if (SERVICE_TYPE === 'backend-frontend') {
    // Запускаем backend + frontend сервис
    console.log('🌐 Starting Backend + Frontend service...');
    require('./server.js');
} else {
    // По умолчанию запускаем backend + frontend
    console.log('🌐 Starting Backend + Frontend service (default)...');
    require('./server.js');
}

