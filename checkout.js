// Логика страницы оформления заказа

// Отобразить товары в заказе
function displayOrderItems() {
    const cart = Cart.getCart();
    const orderItems = document.getElementById('orderItems');
    const orderTotal = document.getElementById('orderTotal');
    
    if (cart.length === 0) {
        window.location.href = 'cart.html';
        return;
    }
    
    orderItems.innerHTML = '';
    
    cart.forEach(item => {
        const orderItem = document.createElement('div');
        orderItem.className = 'order-item';
        
        orderItem.innerHTML = `
            <div class="order-item-image">${item.image || '📦'}</div>
            <div class="order-item-info">
                <div class="order-item-name">${item.name}</div>
                <div class="order-item-details">
                    <span>${item.quantity} x ${formatPrice(item.price)} so'm</span>
                </div>
            </div>
            <div class="order-item-total">${formatPrice(item.price * item.quantity)} so'm</div>
        `;
        
        orderItems.appendChild(orderItem);
    });
    
    const total = Cart.getTotal();
    orderTotal.textContent = formatPrice(total) + ' so\'m';
}

// Валидация формы
function validateForm() {
    let isValid = true;
    
    // Валидация имени
    const name = document.getElementById('customerName').value.trim();
    const nameError = document.getElementById('nameError');
    if (!name || name.length < 2) {
        nameError.textContent = 'Ism kamida 2 ta belgi bo\'lishi kerak';
        isValid = false;
    } else {
        nameError.textContent = '';
    }
    
    // Валидация телефона
    const phone = document.getElementById('customerPhone').value.trim();
    const phoneError = document.getElementById('phoneError');
    const phoneRegex = /^\+998\d{9}$/;
    if (!phone || !phoneRegex.test(phone)) {
        phoneError.textContent = 'Telefon raqami noto\'g\'ri formatda (masalan: +998901234567)';
        isValid = false;
    } else {
        phoneError.textContent = '';
    }
    
    // Валидация адреса
    const address = document.getElementById('deliveryAddress').value.trim();
    const addressError = document.getElementById('addressError');
    if (!address || address.length < 10) {
        addressError.textContent = 'Manzil kamida 10 ta belgi bo\'lishi kerak';
        isValid = false;
    } else {
        addressError.textContent = '';
    }
    
    return isValid;
}

// Отправить заказ с retry логикой
async function submitOrder(orderData, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            // Отправка на сервер
            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(orderData),
                signal: AbortSignal.timeout(10000) // 10 секунд таймаут
            });
            
            if (response.ok) {
                const result = await response.json();
                // Сохранить номер заказа
                localStorage.setItem('lastOrderId', result.orderId || Date.now().toString());
                // Сохранить данные заказа для страницы успеха
                localStorage.setItem('lastOrder', JSON.stringify(orderData));
                // Очистить корзину
                Cart.clearCart();
                // Очистить очередь заказов (если была)
                localStorage.removeItem('pendingOrders');
                // Перейти на страницу успеха
                window.location.href = 'success.html';
                return;
            } else {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Server error');
            }
        } catch (error) {
            console.error(`Error submitting order (attempt ${attempt}/${retries}):`, error);
            
            // Если это последняя попытка, сохранить в очередь и использовать fallback
            if (attempt === retries) {
                // Сохранить заказ в очередь для отправки позже
                const pendingOrders = JSON.parse(localStorage.getItem('pendingOrders') || '[]');
                pendingOrders.push({
                    ...orderData,
                    timestamp: new Date().toISOString(),
                    retries: 0,
                    telegramUserId: orderData.telegramUserId || null // Сохранить user ID в очереди
                });
                localStorage.setItem('pendingOrders', JSON.stringify(pendingOrders));
                
                // Fallback: сохранить заказ локально и отправить через бота
                await sendOrderToTelegram(orderData);
                return;
            }
            
            // Подождать перед следующей попыткой (экспоненциальная задержка)
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
    }
}

// Отправить заказ в Telegram (fallback)
async function sendOrderToTelegram(orderData) {
    // Если есть Telegram WebApp, попробуем отправить через него
    if (window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        
        // Формируем сообщение для администратора
        const message = formatOrderMessage(orderData);
        
        // Отправляем через Telegram WebApp API (если доступно)
        try {
            tg.sendData(JSON.stringify({
                type: 'order',
                data: orderData
            }));
            
            // Сохранить номер заказа
            const orderId = Date.now().toString();
            localStorage.setItem('lastOrderId', orderId);
            Cart.clearCart();
            window.location.href = 'success.html';
        } catch (e) {
            alert('Xatolik yuz berdi. Iltimos, qayta urinib ko\'ring.');
            console.error('Error sending order:', e);
        }
    } else {
        // Если нет Telegram, просто сохраняем локально
        const orderId = Date.now().toString();
        localStorage.setItem('lastOrderId', orderId);
        localStorage.setItem('lastOrder', JSON.stringify(orderData));
        Cart.clearCart();
        window.location.href = 'success.html';
    }
}

// Форматировать сообщение о заказе
function formatOrderMessage(orderData) {
    let message = `🛒 YANGI BUYURTMA\n\n`;
    message += `👤 Mijoz: ${orderData.name}\n`;
    message += `📞 Telefon: ${orderData.phone}\n`;
    message += `📍 Manzil: ${orderData.address}\n`;
    message += `⏰ Vaqt: ${orderData.deliveryTime}\n\n`;
    message += `📦 Mahsulotlar:\n`;
    
    orderData.items.forEach(item => {
        message += `• ${item.name} x${item.quantity} - ${formatPrice(item.price * item.quantity)} so'm\n`;
    });
    
    message += `\n💰 Jami: ${formatPrice(orderData.total)} so'm\n`;
    
    if (orderData.comment) {
        message += `\n💬 Izoh: ${orderData.comment}`;
    }
    
    return message;
}

// Форматировать цену
function formatPrice(price) {
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

// Обработка кнопки "Назад"
const backBtn = document.getElementById('backBtn');
if (backBtn) {
    backBtn.addEventListener('click', function() {
        window.history.back();
        
        if (window.Telegram && window.Telegram.WebApp) {
            window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
        }
    });
}

// Обработка отправки формы
const checkoutForm = document.getElementById('checkoutForm');
if (checkoutForm) {
    checkoutForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (!validateForm()) {
            if (window.Telegram && window.Telegram.WebApp) {
                window.Telegram.WebApp.HapticFeedback.impactOccurred('heavy');
            }
            return;
        }
        
        const submitBtn = document.getElementById('submitOrderBtn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Yuborilmoqda...';
        
        // Получить Telegram user ID
        let telegramUserId = null;
        if (window.Telegram && window.Telegram.WebApp) {
            const user = window.Telegram.WebApp.initDataUnsafe?.user;
            if (user && user.id) {
                telegramUserId = user.id.toString();
            }
        }
        
        const cart = Cart.getCart();
        const orderData = {
            name: document.getElementById('customerName').value.trim(),
            phone: document.getElementById('customerPhone').value.trim(),
            address: document.getElementById('deliveryAddress').value.trim(),
            deliveryTime: document.getElementById('deliveryTime').value,
            comment: document.getElementById('orderComment').value.trim(),
            items: cart,
            total: Cart.getTotal(),
            timestamp: new Date().toISOString(),
            telegramUserId: telegramUserId // Сохранить Telegram user ID
        };
        
        await submitOrder(orderData);
        
        submitBtn.disabled = false;
        submitBtn.textContent = 'Buyurtmani tasdiqlash';
    });
}

// Валидация в реальном времени
document.getElementById('customerPhone').addEventListener('input', function(e) {
    let value = e.target.value.replace(/\D/g, '');
    if (value && !value.startsWith('998')) {
        value = '998' + value;
    }
    if (value && !value.startsWith('+')) {
        value = '+' + value;
    }
    e.target.value = value;
});

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    displayOrderItems();
    
    // Попытка заполнить данные из Telegram
    if (window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        const user = tg.initDataUnsafe?.user;
        
        if (user) {
            if (user.first_name) {
                document.getElementById('customerName').value = user.first_name + (user.last_name ? ' ' + user.last_name : '');
            }
            if (user.username) {
                // Можно использовать username как подсказку для телефона
            }
        }
    }
});

