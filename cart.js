// Логика страницы корзины

// Отобразить корзину
function displayCart() {
    const cart = Cart.getCart();
    const cartContainer = document.getElementById('cartContainer');
    const cartSummary = document.getElementById('cartSummary');
    const emptyCart = document.getElementById('emptyCart');
    
    if (cart.length === 0) {
        cartContainer.innerHTML = '';
        cartSummary.style.display = 'none';
        emptyCart.style.display = 'block';
        return;
    }
    
    emptyCart.style.display = 'none';
    cartSummary.style.display = 'block';
    cartContainer.innerHTML = '';
    
    cart.forEach(item => {
        const cartItem = createCartItem(item);
        cartContainer.appendChild(cartItem);
    });
    
    updateCartTotal();
}

// Создать элемент корзины
function createCartItem(item) {
    const cartItem = document.createElement('div');
    cartItem.className = 'cart-item';
    cartItem.setAttribute('data-item-id', item.id);
    
    cartItem.innerHTML = `
        <div class="cart-item-image">${item.image || '📦'}</div>
        <div class="cart-item-info">
            <h3 class="cart-item-name">${item.name}</h3>
            <div class="cart-item-price">${formatPrice(item.price)} so'm</div>
        </div>
        <div class="cart-item-controls">
            <button class="quantity-btn minus" data-item-id="${item.id}">−</button>
            <span class="quantity-value" data-item-id="${item.id}">${item.quantity}</span>
            <button class="quantity-btn plus" data-item-id="${item.id}">+</button>
        </div>
        <button class="cart-item-remove" data-item-id="${item.id}">🗑️</button>
    `;
    
    // Обработчики событий
    const minusBtn = cartItem.querySelector('.minus');
    const plusBtn = cartItem.querySelector('.plus');
    const removeBtn = cartItem.querySelector('.cart-item-remove');
    
    minusBtn.addEventListener('click', function() {
        const currentQuantity = parseInt(cartItem.querySelector('.quantity-value').textContent);
        Cart.updateQuantity(item.id, currentQuantity - 1);
        displayCart();
    });
    
    plusBtn.addEventListener('click', function() {
        const currentQuantity = parseInt(cartItem.querySelector('.quantity-value').textContent);
        Cart.updateQuantity(item.id, currentQuantity + 1);
        displayCart();
    });
    
    removeBtn.addEventListener('click', function() {
        if (confirm(`"${item.name}" ni savatdan o'chirishni xohlaysizmi?`)) {
            Cart.removeItem(item.id);
            displayCart();
        }
    });
    
    return cartItem;
}

// Обновить общую сумму
function updateCartTotal() {
    const total = Cart.getTotal();
    const totalElement = document.getElementById('cartTotal');
    if (totalElement) {
        totalElement.textContent = formatPrice(total) + ' so\'m';
    }
    
    // Обновить счетчик в хедере
    Cart.updateCartCount();
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

// Обработка кнопки "Начать покупки"
const startShoppingBtn = document.getElementById('startShoppingBtn');
if (startShoppingBtn) {
    startShoppingBtn.addEventListener('click', function() {
        window.location.href = 'index.html';
        
        if (window.Telegram && window.Telegram.WebApp) {
            window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
        }
    });
}

// Обработка кнопки "Оформить заказ"
const checkoutBtn = document.getElementById('checkoutBtn');
if (checkoutBtn) {
    checkoutBtn.addEventListener('click', function() {
        const cart = Cart.getCart();
        if (cart.length === 0) {
            alert('Savat bo\'sh!');
            return;
        }
        
        window.location.href = 'checkout.html';
        
        if (window.Telegram && window.Telegram.WebApp) {
            window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
        }
    });
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    displayCart();
    Cart.updateCartCount();
});

