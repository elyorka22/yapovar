// Логика страницы успешного заказа

// Отобразить информацию о заказе
function displayOrderInfo() {
    const orderId = localStorage.getItem('lastOrderId');
    const orderInfo = document.getElementById('orderInfo');
    
    if (!orderId) {
        // Если нет номера заказа, просто показываем общее сообщение
        orderInfo.innerHTML = `
            <div class="order-info-item">
                <span class="order-info-label">Buyurtma raqami:</span>
                <span class="order-info-value order-number">#${Date.now().toString().slice(-6)}</span>
            </div>
        `;
        return;
    }
    
    // Получить данные заказа из localStorage (если есть)
    const lastOrder = localStorage.getItem('lastOrder');
    let orderData = null;
    
    if (lastOrder) {
        try {
            orderData = JSON.parse(lastOrder);
        } catch (e) {
            console.error('Error parsing order data:', e);
        }
    }
    
    orderInfo.innerHTML = `
        <div class="order-info-item">
            <span class="order-info-label">Buyurtma raqami:</span>
            <span class="order-info-value order-number">#${orderId.slice(-6)}</span>
        </div>
        ${orderData ? `
            <div class="order-info-item">
                <span class="order-info-label">Jami:</span>
                <span class="order-info-value">${formatPrice(orderData.total)} so'm</span>
            </div>
            <div class="order-info-item">
                <span class="order-info-label">Yetkazib berish:</span>
                <span class="order-info-value">${getDeliveryTimeText(orderData.deliveryTime)}</span>
            </div>
        ` : ''}
    `;
}

// Получить текст времени доставки
function getDeliveryTimeText(deliveryTime) {
    const times = {
        'asap': 'Imkon qadar tezroq',
        'morning': 'Ertalab (9:00-12:00)',
        'afternoon': 'Kunduzi (12:00-17:00)',
        'evening': 'Kechqurun (17:00-21:00)'
    };
    return times[deliveryTime] || 'Imkon qadar tezroq';
}

// Форматировать цену
function formatPrice(price) {
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

// Обработка кнопки "Вернуться в магазин"
const backToShopBtn = document.getElementById('backToShopBtn');
if (backToShopBtn) {
    backToShopBtn.addEventListener('click', function() {
        window.location.href = 'index.html';
        
        if (window.Telegram && window.Telegram.WebApp) {
            window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
        }
    });
}

// Обработка кнопки "Мои заказы"
const viewOrdersBtn = document.getElementById('viewOrdersBtn');
if (viewOrdersBtn) {
    viewOrdersBtn.addEventListener('click', function() {
        // В будущем здесь будет страница истории заказов
        alert('Bu funksiya tez orada qo\'shiladi');
        
        if (window.Telegram && window.Telegram.WebApp) {
            window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
        }
    });
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    displayOrderInfo();
    
    // Обновить счетчик корзины (должен быть 0)
    if (typeof Cart !== 'undefined') {
        Cart.updateCartCount();
    }
});

