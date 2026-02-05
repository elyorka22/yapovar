// Инициализация Telegram WebApp
if (window.Telegram && window.Telegram.WebApp) {
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();
    
    // Настройка цветов для Telegram
    tg.setHeaderColor('#FF6B35');
    tg.setBackgroundColor('#F7E7CE');
}

// Обработка кликов по карточкам быстрого выбора
document.querySelectorAll('.choice-card').forEach(card => {
    card.addEventListener('click', function() {
        const category = this.getAttribute('data-category');
        handleCategoryClick(category);
    });
});

// Обработка кликов по категориям
document.querySelectorAll('.category-item').forEach(item => {
    item.addEventListener('click', function() {
        const categoryName = this.querySelector('.category-name').textContent;
        handleCategoryClick(categoryName);
    });
});

// Обработка кнопки подписки
document.querySelector('.subscription-btn').addEventListener('click', function() {
    handleSubscriptionClick();
});

// Обработка кнопки корзины
const cartBtn = document.getElementById('cartBtn');
if (cartBtn) {
    cartBtn.addEventListener('click', function() {
        handleCartClick();
    });
}

// Функция обработки клика по категории
function handleCategoryClick(category) {
    // Переход на страницу товаров с параметром категории
    window.location.href = `products.html?category=${category}`;
    
    // Показываем обратную связь пользователю
    if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
    }
}

// Функция для работы с корзиной
const Cart = {
    // Получить корзину из localStorage
    getCart: function() {
        const cart = localStorage.getItem('cart');
        return cart ? JSON.parse(cart) : [];
    },
    
    // Сохранить корзину в localStorage
    saveCart: function(cart) {
        localStorage.setItem('cart', JSON.stringify(cart));
        this.updateCartCount();
    },
    
    // Добавить товар в корзину
    addItem: function(product) {
        const cart = this.getCart();
        const existingItem = cart.find(item => item.id === product.id);
        
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.push({
                id: product.id,
                name: product.name,
                price: product.price,
                image: product.image,
                quantity: 1
            });
        }
        
        this.saveCart(cart);
        
        // Тактильная обратная связь
        if (window.Telegram && window.Telegram.WebApp) {
            window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
        }
    },
    
    // Обновить счетчик корзины в хедере
    updateCartCount: function() {
        const cart = this.getCart();
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        const cartCountElement = document.getElementById('cartCount');
        if (cartCountElement) {
            cartCountElement.textContent = totalItems;
            if (totalItems === 0) {
                cartCountElement.style.display = 'none';
            } else {
                cartCountElement.style.display = 'inline-block';
            }
        }
    },
    
    // Удалить товар из корзины
    removeItem: function(productId) {
        let cart = this.getCart();
        cart = cart.filter(item => item.id !== productId);
        this.saveCart(cart);
        
        // Тактильная обратная связь
        if (window.Telegram && window.Telegram.WebApp) {
            window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
        }
    },
    
    // Изменить количество товара
    updateQuantity: function(productId, quantity) {
        if (quantity <= 0) {
            this.removeItem(productId);
            return;
        }
        
        let cart = this.getCart();
        const item = cart.find(item => item.id === productId);
        
        if (item) {
            item.quantity = quantity;
            this.saveCart(cart);
        }
        
        // Тактильная обратная связь
        if (window.Telegram && window.Telegram.WebApp) {
            window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
        }
    },
    
    // Очистить корзину
    clearCart: function() {
        localStorage.setItem('cart', JSON.stringify([]));
        this.updateCartCount();
    },
    
    // Получить общую сумму
    getTotal: function() {
        const cart = this.getCart();
        return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    },
    
    // Получить количество товаров
    getItemCount: function() {
        const cart = this.getCart();
        return cart.reduce((sum, item) => sum + item.quantity, 0);
    }
};

// Обновить счетчик корзины при загрузке страницы
if (typeof Cart !== 'undefined') {
    Cart.updateCartCount();
}

// Попытка отправить заказы из очереди при загрузке страницы
async function retryPendingOrders() {
    const pendingOrders = JSON.parse(localStorage.getItem('pendingOrders') || '[]');
    if (pendingOrders.length === 0) return;
    
    const successfulOrders = [];
    const failedOrders = [];
    
    for (const order of pendingOrders) {
        try {
            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(order),
                signal: AbortSignal.timeout(10000)
            });
            
            if (response.ok) {
                successfulOrders.push(order);
            } else {
                failedOrders.push(order);
            }
        } catch (error) {
            console.error('Error retrying order:', error);
            failedOrders.push(order);
        }
    }
    
    // Обновить очередь, оставив только неудачные заказы
    localStorage.setItem('pendingOrders', JSON.stringify(failedOrders));
    
    if (successfulOrders.length > 0) {
        console.log(`Successfully sent ${successfulOrders.length} pending orders`);
    }
}

// Попытаться отправить заказы из очереди при загрузке
window.addEventListener('load', () => {
    setTimeout(retryPendingOrders, 2000); // Подождать 2 секунды после загрузки
});

// Функция обработки подписки
function handleSubscriptionClick() {
    console.log('Подписка на еженедельный набор');
    
    // В будущем здесь будет логика оформления подписки
    // Например: window.location.href = 'subscription.html';
    
    // Тактильная обратная связь
    if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
    }
}

// Функция обработки клика по корзине
function handleCartClick() {
    // Переход на страницу корзины
    window.location.href = 'cart.html';
    
    // Тактильная обратная связь
    if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
    }
}

// Загрузка настроек Hero-блока с сервера
async function loadHeroSettings() {
    let heroData = null;
    
    // Сначала попробовать загрузить с сервера
    try {
        const response = await fetch('/api/hero');
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.hero) {
                heroData = data.hero;
                // Сохранить в localStorage для офлайн-доступа
                localStorage.setItem('admin_hero', JSON.stringify(heroData));
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки hero с сервера:', error);
    }
    
    // Если нет данных с сервера, попробовать из localStorage
    if (!heroData) {
        const hero = localStorage.getItem('admin_hero');
        if (hero) {
            try {
                heroData = JSON.parse(hero);
            } catch (e) {
                console.error('Ошибка загрузки hero из localStorage:', e);
            }
        }
    }
    
    // Применить настройки hero-блока
    if (heroData) {
        const heroTitle = document.querySelector('.hero-title');
        const heroSubtitle = document.querySelector('.hero-subtitle');
        const heroSection = document.querySelector('.hero');
        
        if (heroTitle && heroData.title) {
            heroTitle.textContent = heroData.title;
        }
        if (heroSubtitle && heroData.subtitle) {
            heroSubtitle.textContent = heroData.subtitle;
        }
        if (heroSection && heroData.color1 && heroData.color2) {
            heroSection.style.background = `linear-gradient(135deg, ${heroData.color1} 0%, ${heroData.color2} 100%)`;
        }
        if (heroData.image) {
            // Можно добавить изображение в hero-блок если нужно
        }
    }
}

// Загрузка баннеров с сервера
async function loadBanners() {
    let bannersData = null;
    
    // Сначала попробовать загрузить с сервера
    try {
        const response = await fetch('/api/banners');
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.banners && data.banners.length > 0) {
                bannersData = data.banners;
                // Сохранить в localStorage для офлайн-доступа
                localStorage.setItem('admin_banners', JSON.stringify(bannersData));
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки баннеров с сервера:', error);
    }
    
    // Если нет данных с сервера, попробовать из localStorage
    if (!bannersData) {
        const banners = localStorage.getItem('admin_banners');
        if (banners) {
            try {
                bannersData = JSON.parse(banners);
            } catch (e) {
                console.error('Ошибка загрузки баннеров из localStorage:', e);
            }
        }
    }
    
    // Применить настройки баннера
    if (bannersData && bannersData.length > 0) {
        const bannerSection = document.querySelector('.banner');
        
        if (bannerSection) {
            const firstBanner = bannersData[0];
            const bannerTitle = bannerSection.querySelector('.banner-title');
            const bannerSubtitle = bannerSection.querySelector('.banner-subtitle');
            const bannerEmoji = bannerSection.querySelector('.banner-emoji');
            
            if (bannerTitle) bannerTitle.textContent = firstBanner.title;
            if (bannerSubtitle) bannerSubtitle.textContent = firstBanner.subtitle;
            if (bannerEmoji) bannerEmoji.textContent = firstBanner.image || '👨‍🍳';
            
            if (firstBanner.color1 && firstBanner.color2) {
                bannerSection.style.background = `linear-gradient(135deg, ${firstBanner.color1} 0%, ${firstBanner.color2} 100%)`;
            }
        }
    }
}

// Плавная прокрутка при загрузке
window.addEventListener('load', function() {
    window.scrollTo(0, 0);
    loadHeroSettings();
    loadBanners();
});

