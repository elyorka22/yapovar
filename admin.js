// Админ-панель JavaScript

// Проверка прав администратора
let isAdminUser = false;
let currentUserId = null;

// Инициализация Telegram WebApp и проверка прав
async function initAdminPanel() {
    if (window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.ready();
        tg.expand();
        
        // Получить user ID из Telegram WebApp
        const user = tg.initDataUnsafe?.user;
        if (user && user.id) {
            currentUserId = user.id.toString();
            
            // Проверить права администратора
            try {
                const response = await fetch('/api/check-admin', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ userId: currentUserId })
                });
                
                const data = await response.json();
                if (data.success && data.isAdmin) {
                    isAdminUser = true;
                    // Загрузить данные с сервера
                    await syncDataFromServer();
                } else {
                    // Пользователь не админ - редирект на главную
                    alert('Sizda admin huquqi yo\'q.');
                    window.location.href = 'index.html';
                    return;
                }
            } catch (error) {
                console.error('Error checking admin rights:', error);
                // Если сервер недоступен, разрешаем доступ (для разработки)
                // В продакшене лучше заблокировать
                if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                    console.warn('Server unavailable, allowing access for development');
                    isAdminUser = true;
                } else {
                    alert('Server bilan bog\'lanishda xatolik. Iltimos, keyinroq urinib ko\'ring.');
                    window.location.href = 'index.html';
                    return;
                }
            }
        } else {
            // Если нет Telegram WebApp, проверяем для разработки
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                console.warn('Telegram WebApp not available, allowing access for development');
                isAdminUser = true;
            } else {
                alert('Telegram WebApp talab qilinadi.');
                window.location.href = 'index.html';
                return;
            }
        }
    } else {
        // Если нет Telegram WebApp, проверяем для разработки
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.warn('Telegram WebApp not available, allowing access for development');
            isAdminUser = true;
        } else {
            alert('Telegram WebApp talab qilinadi.');
            window.location.href = 'index.html';
            return;
        }
    }
    
    // Инициализировать админ-панель только если пользователь админ
    if (isAdminUser) {
        initializeAdminPanel();
        initializeAdminPanelContent();
    }
}

// Синхронизация данных с сервера
async function syncDataFromServer() {
    try {
        // Загрузить товары
        const productsResponse = await fetch('/api/products');
        if (productsResponse.ok) {
            const productsData = await productsResponse.json();
            if (productsData.success && productsData.products.length > 0) {
                localStorage.setItem('admin_products', JSON.stringify(productsData.products));
            }
        }
        
        // Загрузить баннеры
        const bannersResponse = await fetch('/api/banners');
        if (bannersResponse.ok) {
            const bannersData = await bannersResponse.json();
            if (bannersData.success && bannersData.banners.length > 0) {
                localStorage.setItem('admin_banners', JSON.stringify(bannersData.banners));
            }
        }
        
        // Загрузить hero-блок
        const heroResponse = await fetch('/api/hero');
        if (heroResponse.ok) {
            const heroData = await heroResponse.json();
            if (heroData.success && heroData.hero) {
                localStorage.setItem('admin_hero', JSON.stringify(heroData.hero));
            }
        }
    } catch (error) {
        console.error('Error syncing data from server:', error);
    }
}

// Синхронизация данных на сервер
async function syncDataToServer(dataType, data) {
    if (!isAdminUser || !currentUserId) {
        console.error('User is not admin or user ID not set');
        return false;
    }
    
    try {
        const response = await fetch(`/api/${dataType}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: currentUserId,
                [dataType]: data
            })
        });
        
        const result = await response.json();
        return result.success;
    } catch (error) {
        console.error(`Error syncing ${dataType} to server:`, error);
        return false;
    }
}

// Инициализация админ-панели
function initializeAdminPanel() {
    // Инициализация Telegram WebApp
    if (window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.ready();
        tg.expand();
    }
    
    // Управление вкладками
    document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', function() {
        const tabName = this.getAttribute('data-tab');
        switchTab(tabName);
    });
});

function switchTab(tabName) {
    // Убрать активный класс у всех вкладок
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.admin-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Добавить активный класс выбранной вкладке
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    // Загрузить данные для вкладки
    if (tabName === 'products') {
        loadProducts();
    } else if (tabName === 'banners') {
        loadBanners();
    } else if (tabName === 'hero') {
        loadHeroSettings();
    } else if (tabName === 'orders') {
        loadOrders();
    } else if (tabName === 'bot') {
        loadBotSettings();
    } else if (tabName === 'stats') {
        loadStats();
    }
}

// Управление товарами
let editingProductId = null;

function loadProducts() {
    const products = AdminStorage.getProducts();
    const productsList = document.getElementById('productsList');
    productsList.innerHTML = '';
    
    if (products.length === 0) {
        productsList.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">Mahsulotlar yo\'q</p>';
        return;
    }
    
    products.forEach(product => {
        const card = createProductCard(product);
        productsList.appendChild(card);
    });
}

function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'admin-product-card';
    
    card.innerHTML = `
        <div class="admin-product-header">
            <div class="admin-product-image">${product.image || '📦'}</div>
            <div class="admin-product-info">
                <div class="admin-product-name">${product.name}</div>
                <div class="admin-product-price">${formatPrice(product.price)} so'm</div>
            </div>
        </div>
        <div class="admin-product-actions">
            <button class="admin-edit-btn" onclick="editProduct('${product.id}')">Tahrirlash</button>
            <button class="admin-delete-btn" onclick="deleteProduct('${product.id}')">O'chirish</button>
        </div>
    `;
    
    return card;
}

// Добавление товара
document.getElementById('addProductBtn').addEventListener('click', function() {
    editingProductId = null;
    document.getElementById('modalTitle').textContent = 'Yangi mahsulot';
    document.getElementById('productName').value = '';
    document.getElementById('productDescription').value = '';
    document.getElementById('productPrice').value = '';
    document.getElementById('productImage').value = '';
    document.getElementById('productCategory').value = 'pizza';
    document.getElementById('productModal').classList.add('active');
});

// Сохранение товара
document.getElementById('saveProductBtn').addEventListener('click', async function() {
    const product = {
        id: editingProductId || 'product-' + Date.now(),
        category: document.getElementById('productCategory').value,
        name: document.getElementById('productName').value,
        description: document.getElementById('productDescription').value,
        price: parseInt(document.getElementById('productPrice').value),
        image: document.getElementById('productImage').value || '📦'
    };
    
    if (!product.name || !product.price) {
        alert('Iltimos, barcha maydonlarni to\'ldiring');
        return;
    }
    
    AdminStorage.saveProduct(product);
    
    // Синхронизировать с сервером
    const allProducts = AdminStorage.getProducts();
    const syncSuccess = await syncDataToServer('products', allProducts);
    if (syncSuccess) {
        console.log('Products synced to server');
    } else {
        console.warn('Failed to sync products to server, but saved locally');
    }
    
    document.getElementById('productModal').classList.remove('active');
    loadProducts();
    
    // Обновить данные на странице товаров
    updateProductsData();
});

// Редактирование товара
window.editProduct = function(productId) {
    const products = AdminStorage.getProducts();
    const product = products.find(p => p.id === productId);
    
    if (!product) return;
    
    editingProductId = productId;
    document.getElementById('modalTitle').textContent = 'Mahsulotni tahrirlash';
    document.getElementById('productName').value = product.name;
    document.getElementById('productDescription').value = product.description || '';
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productImage').value = product.image || '';
    document.getElementById('productCategory').value = product.category || 'pizza';
    document.getElementById('productModal').classList.add('active');
};

// Удаление товара
window.deleteProduct = async function(productId) {
    if (confirm('Bu mahsulotni o\'chirishni xohlaysizmi?')) {
        AdminStorage.deleteProduct(productId);
        
        // Синхронизировать с сервером
        const allProducts = AdminStorage.getProducts();
        const syncSuccess = await syncDataToServer('products', allProducts);
        if (syncSuccess) {
            console.log('Products synced to server');
        } else {
            console.warn('Failed to sync products to server, but saved locally');
        }
        
        loadProducts();
        updateProductsData();
    }
};

// Закрытие модального окна товара
document.getElementById('closeModal').addEventListener('click', function() {
    document.getElementById('productModal').classList.remove('active');
});

document.getElementById('cancelProductBtn').addEventListener('click', function() {
    document.getElementById('productModal').classList.remove('active');
});

// Управление баннерами
let editingBannerId = null;

function loadBanners() {
    const banners = AdminStorage.getBanners();
    const bannersList = document.getElementById('bannersList');
    bannersList.innerHTML = '';
    
    if (banners.length === 0) {
        bannersList.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">Bannerlar yo\'q</p>';
        return;
    }
    
    banners.forEach(banner => {
        const card = createBannerCard(banner);
        bannersList.appendChild(card);
    });
}

function createBannerCard(banner) {
    const card = document.createElement('div');
    card.className = 'admin-banner-card';
    card.style.background = `linear-gradient(135deg, ${banner.color1} 0%, ${banner.color2} 100%)`;
    
    card.innerHTML = `
        <div class="admin-banner-content">
            <div class="admin-banner-text">
                <h3>${banner.title}</h3>
                <p>${banner.subtitle}</p>
            </div>
            <div class="admin-banner-image">${banner.image || '👨‍🍳'}</div>
        </div>
        <div class="admin-banner-actions">
            <button class="admin-edit-btn" onclick="editBanner('${banner.id}')">Tahrirlash</button>
            <button class="admin-delete-btn" onclick="deleteBanner('${banner.id}')">O'chirish</button>
        </div>
    `;
    
    return card;
}

// Добавление баннера
document.getElementById('addBannerBtn').addEventListener('click', function() {
    editingBannerId = null;
    document.getElementById('bannerModalTitle').textContent = 'Yangi banner';
    document.getElementById('bannerTitle').value = '';
    document.getElementById('bannerSubtitle').value = '';
    document.getElementById('bannerImage').value = '';
    document.getElementById('bannerColor1').value = '#FF6B35';
    document.getElementById('bannerColor2').value = '#D62828';
    document.getElementById('bannerModal').classList.add('active');
});

// Сохранение баннера
document.getElementById('saveBannerBtn').addEventListener('click', function() {
    const banner = {
        id: editingBannerId || 'banner-' + Date.now(),
        title: document.getElementById('bannerTitle').value,
        subtitle: document.getElementById('bannerSubtitle').value,
        image: document.getElementById('bannerImage').value || '👨‍🍳',
        color1: document.getElementById('bannerColor1').value,
        color2: document.getElementById('bannerColor2').value
    };
    
    if (!banner.title || !banner.subtitle) {
        alert('Iltimos, barcha maydonlarni to\'ldiring');
        return;
    }
    
    AdminStorage.saveBanner(banner);
    
    // Синхронизировать с сервером
    const allBanners = AdminStorage.getBanners();
    syncDataToServer('banners', allBanners).then(success => {
        if (success) {
            console.log('Banners synced to server');
        } else {
            console.warn('Failed to sync banners to server, but saved locally');
        }
    });
    
    document.getElementById('bannerModal').classList.remove('active');
    loadBanners();
    updateBannersOnSite();
});

// Редактирование баннера
window.editBanner = function(bannerId) {
    const banners = AdminStorage.getBanners();
    const banner = banners.find(b => b.id === bannerId);
    
    if (!banner) return;
    
    editingBannerId = bannerId;
    document.getElementById('bannerModalTitle').textContent = 'Bannerni tahrirlash';
    document.getElementById('bannerTitle').value = banner.title;
    document.getElementById('bannerSubtitle').value = banner.subtitle;
    document.getElementById('bannerImage').value = banner.image || '';
    document.getElementById('bannerColor1').value = banner.color1 || '#FF6B35';
    document.getElementById('bannerColor2').value = banner.color2 || '#D62828';
    document.getElementById('bannerModal').classList.add('active');
};

// Удаление баннера
window.deleteBanner = function(bannerId) {
    if (confirm('Bu bannerni o\'chirishni xohlaysizmi?')) {
        AdminStorage.deleteBanner(bannerId);
        loadBanners();
        updateBannersOnSite();
    }
};

// Закрытие модального окна баннера
document.getElementById('closeBannerModal').addEventListener('click', function() {
    document.getElementById('bannerModal').classList.remove('active');
});

document.getElementById('cancelBannerBtn').addEventListener('click', function() {
    document.getElementById('bannerModal').classList.remove('active');
});

// Управление Hero-блоком
function loadHeroSettings() {
    const hero = AdminStorage.getHero();
    if (hero) {
        document.getElementById('heroTitle').value = hero.title || 'MEN OSHPAZ';
        document.getElementById('heroSubtitle').value = hero.subtitle || 'O\'zim pishiraman';
        document.getElementById('heroImage').value = hero.image || '';
        document.getElementById('heroColor1').value = hero.color1 || '#FF6B35';
        document.getElementById('heroColor2').value = hero.color2 || '#D62828';
    }
}

document.getElementById('saveHeroBtn').addEventListener('click', function() {
    const hero = {
        title: document.getElementById('heroTitle').value,
        subtitle: document.getElementById('heroSubtitle').value,
        image: document.getElementById('heroImage').value,
        color1: document.getElementById('heroColor1').value,
        color2: document.getElementById('heroColor2').value
    };
    
    AdminStorage.saveHero(hero);
    
    // Синхронизировать с сервером
    syncDataToServer('hero', hero).then(success => {
        if (success) {
            console.log('Hero settings synced to server');
            alert('Hero blok saqlandi!');
        } else {
            console.warn('Failed to sync hero settings to server, but saved locally');
            alert('Hero blok saqlandi (faqat lokal)!');
        }
    });
    
    updateHeroOnSite();
});

// Сохранение настроек бота
const saveBotSettingsBtn = document.getElementById('saveBotSettingsBtn');
if (saveBotSettingsBtn) {
    saveBotSettingsBtn.addEventListener('click', function() {
        const botSettings = {
            startMessage: document.getElementById('botStartMessage').value,
            aboutMessage: document.getElementById('botAboutMessage').value,
            suggestionsMessage: document.getElementById('botSuggestionsMessage').value,
            partnershipMessage: document.getElementById('botPartnershipMessage').value,
            contactUsername: document.getElementById('botContactUsername').value,
            contactEmail: document.getElementById('botContactEmail').value,
            feedbackMessage: document.getElementById('botFeedbackMessage').value,
            feedbackUsername: document.getElementById('botFeedbackUsername').value,
            helpMessage: document.getElementById('botHelpMessage').value
        };
        
        AdminStorage.saveBotSettings(botSettings);
        
        // Попытка сохранить на сервер (если есть API)
        saveBotSettingsToServer(botSettings);
        
        alert('Bot sozlamalari saqlandi! Botni qayta ishga tushirish kerak bo\'lishi mumkin.');
    });
}

// Сохранение настроек на сервер
function saveBotSettingsToServer(settings) {
    // Отправляем настройки на сервер через API
    try {
        fetch('/api/bot-settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(settings)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('Bot settings saved to server');
            } else {
                console.error('Error saving bot settings:', data.error);
            }
        })
        .catch(error => {
            console.error('Error saving bot settings to server:', error);
            // Если сервер недоступен, настройки останутся только в localStorage
        });
    } catch (e) {
        console.error('Error saving bot settings to server:', e);
    }
}

// Загрузка заказов
async function loadOrders() {
    try {
        const response = await fetch(`/api/orders?userId=${currentUserId}`);
        if (!response.ok) {
            throw new Error('Failed to load orders');
        }
        const data = await response.json();
        if (data.success) {
            displayOrders(data.orders || []);
        } else {
            console.error('Error loading orders:', data.error);
            document.getElementById('ordersList').innerHTML = '<p>Xatolik yuz berdi</p>';
        }
    } catch (error) {
        console.error('Error loading orders:', error);
        document.getElementById('ordersList').innerHTML = '<p>Server bilan bog\'lanishda xatolik</p>';
    }
}

// Отображение заказов
function displayOrders(orders) {
    const ordersList = document.getElementById('ordersList');
    const statusFilter = document.getElementById('orderStatusFilter')?.value || 'all';
    const searchQuery = document.getElementById('orderSearch')?.value.toLowerCase() || '';
    
    // Фильтрация заказов
    let filteredOrders = orders;
    if (statusFilter !== 'all') {
        filteredOrders = filteredOrders.filter(order => order.status === statusFilter);
    }
    if (searchQuery) {
        filteredOrders = filteredOrders.filter(order => {
            const orderId = (order.id || order.orderId || '').toString();
            const name = (order.customerName || order.name || '').toLowerCase();
            const phone = (order.customerPhone || order.phone || '').toString();
            return orderId.includes(searchQuery) || name.includes(searchQuery) || phone.includes(searchQuery);
        });
    }
    
    if (filteredOrders.length === 0) {
        ordersList.innerHTML = '<p class="empty-message">Buyurtmalar topilmadi</p>';
        return;
    }
    
    // Сортировка по дате (новые сначала)
    filteredOrders.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.timestamp || 0);
        const dateB = new Date(b.createdAt || b.timestamp || 0);
        return dateB - dateA;
    });
    
    ordersList.innerHTML = filteredOrders.map(order => createOrderCard(order)).join('');
    
    // Добавить обработчики событий для изменения статуса
    document.querySelectorAll('.order-status-select').forEach(select => {
        select.addEventListener('change', function() {
            const orderId = this.dataset.orderId;
            const newStatus = this.value;
            updateOrderStatus(orderId, newStatus);
        });
    });
}

// Создание карточки заказа
function createOrderCard(order) {
    const orderId = order.id || order.orderId || 'N/A';
    const status = order.status || 'new';
    const statusColors = {
        'new': '#FF6B35',
        'processing': '#FFA500',
        'confirmed': '#4CAF50',
        'preparing': '#2196F3',
        'delivering': '#9C27B0',
        'completed': '#4CAF50',
        'cancelled': '#F44336'
    };
    
    const items = order.items || [];
    const total = order.totalAmount || order.total || 0;
    const createdAt = order.createdAt || order.timestamp || '';
    const date = createdAt ? new Date(createdAt).toLocaleString('uz-UZ') : 'N/A';
    
    return `
        <div class="admin-order-card">
            <div class="admin-order-header">
                <div class="admin-order-id">#${orderId.slice(-6)}</div>
                <div class="admin-order-date">${date}</div>
            </div>
            <div class="admin-order-info">
                <div class="admin-order-customer">
                    <strong>${order.customerName || order.name || 'N/A'}</strong><br>
                    📞 ${order.customerPhone || order.phone || 'N/A'}<br>
                    📍 ${order.deliveryAddress || order.address || 'N/A'}
                </div>
                <div class="admin-order-items">
                    <strong>Mahsulotlar:</strong>
                    <ul>
                        ${items.map(item => `<li>${item.name} x${item.quantity} - ${(item.price * item.quantity).toLocaleString('ru-RU')} so'm</li>`).join('')}
                    </ul>
                </div>
                <div class="admin-order-total">
                    <strong>Jami: ${total.toLocaleString('ru-RU')} so'm</strong>
                </div>
                <div class="admin-order-status">
                    <label>Holat:</label>
                    <select class="order-status-select" data-order-id="${orderId}" style="background-color: ${statusColors[status] || '#ccc'}; color: white; padding: 5px; border-radius: 5px; border: none;">
                        <option value="new" ${status === 'new' ? 'selected' : ''}>Yangi</option>
                        <option value="processing" ${status === 'processing' ? 'selected' : ''}>Jarayonda</option>
                        <option value="confirmed" ${status === 'confirmed' ? 'selected' : ''}>Tasdiqlangan</option>
                        <option value="preparing" ${status === 'preparing' ? 'selected' : ''}>Tayyorlanmoqda</option>
                        <option value="delivering" ${status === 'delivering' ? 'selected' : ''}>Yetkazilmoqda</option>
                        <option value="completed" ${status === 'completed' ? 'selected' : ''}>Yakunlangan</option>
                        <option value="cancelled" ${status === 'cancelled' ? 'selected' : ''}>Bekor qilingan</option>
                    </select>
                </div>
            </div>
        </div>
    `;
}

// Обновление статуса заказа
async function updateOrderStatus(orderId, newStatus) {
    try {
        const response = await fetch(`/api/orders/${orderId}/status`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: currentUserId,
                status: newStatus
            })
        });
        
        const data = await response.json();
        if (data.success) {
            console.log('Order status updated');
            loadOrders(); // Перезагрузить список заказов
        } else {
            alert('Holatni yangilashda xatolik: ' + (data.error || 'Noma\'lum xatolik'));
        }
    } catch (error) {
        console.error('Error updating order status:', error);
        alert('Holatni yangilashda xatolik yuz berdi');
    }
}

// Инициализация фильтров заказов
if (document.getElementById('orderStatusFilter')) {
    document.getElementById('orderStatusFilter').addEventListener('change', loadOrders);
}
if (document.getElementById('orderSearch')) {
    document.getElementById('orderSearch').addEventListener('input', loadOrders);
}

// Статистика
async function loadStats() {
    // Загрузить статистику из заказов
    try {
        const response = await fetch(`/api/orders?userId=${currentUserId}`);
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                const orders = data.orders || [];
                const totalOrders = orders.length;
                const totalRevenue = orders.reduce((sum, order) => sum + (order.totalAmount || order.total || 0), 0);
                const uniqueUsers = new Set(orders.map(o => o.customerPhone || o.phone || '')).size;
                
                document.getElementById('totalOrders').textContent = totalOrders;
                document.getElementById('totalUsers').textContent = uniqueUsers;
                document.getElementById('totalRevenue').textContent = totalRevenue.toLocaleString('ru-RU') + ' so\'m';
                document.getElementById('totalProducts').textContent = AdminStorage.getProducts().length;
                return;
            }
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
    
    // Fallback на localStorage
    const stats = AdminStorage.getStats();
    document.getElementById('totalOrders').textContent = stats.orders || 0;
    document.getElementById('totalUsers').textContent = stats.users || 0;
    document.getElementById('totalRevenue').textContent = (stats.revenue || 0).toLocaleString('ru-RU') + ' so\'m';
    document.getElementById('totalProducts').textContent = AdminStorage.getProducts().length;
}

// Выход из админ-панели
document.getElementById('exitBtn').addEventListener('click', function() {
    if (confirm('Admin paneldan chiqmoqchimisiz?')) {
        window.location.href = 'index.html';
    }
});

// Хранилище для админ-панели
const AdminStorage = {
    // Товары
    getProducts: function() {
        const products = localStorage.getItem('admin_products');
        return products ? JSON.parse(products) : [];
    },
    
    saveProduct: function(product) {
        let products = this.getProducts();
        const index = products.findIndex(p => p.id === product.id);
        
        if (index >= 0) {
            products[index] = product;
        } else {
            products.push(product);
        }
        
        localStorage.setItem('admin_products', JSON.stringify(products));
    },
    
    deleteProduct: function(productId) {
        let products = this.getProducts();
        products = products.filter(p => p.id !== productId);
        localStorage.setItem('admin_products', JSON.stringify(products));
    },
    
    // Баннеры
    getBanners: function() {
        const banners = localStorage.getItem('admin_banners');
        return banners ? JSON.parse(banners) : [];
    },
    
    saveBanner: function(banner) {
        let banners = this.getBanners();
        const index = banners.findIndex(b => b.id === banner.id);
        
        if (index >= 0) {
            banners[index] = banner;
        } else {
            banners.push(banner);
        }
        
        localStorage.setItem('admin_banners', JSON.stringify(banners));
    },
    
    deleteBanner: function(bannerId) {
        let banners = this.getBanners();
        banners = banners.filter(b => b.id !== bannerId);
        localStorage.setItem('admin_banners', JSON.stringify(banners));
    },
    
    // Hero-блок
    getHero: function() {
        const hero = localStorage.getItem('admin_hero');
        return hero ? JSON.parse(hero) : null;
    },
    
    saveHero: function(hero) {
        localStorage.setItem('admin_hero', JSON.stringify(hero));
    },
    
    // Статистика
    getStats: function() {
        const stats = localStorage.getItem('admin_stats');
        return stats ? JSON.parse(stats) : { orders: 0, users: 0, revenue: 0 };
    },
    
    saveStats: function(stats) {
        localStorage.setItem('admin_stats', JSON.stringify(stats));
    },
    
    // Настройки бота
    getBotSettings: function() {
        const settings = localStorage.getItem('admin_bot_settings');
        return settings ? JSON.parse(settings) : null;
    },
    
    saveBotSettings: function(settings) {
        localStorage.setItem('admin_bot_settings', JSON.stringify(settings));
    }
};
    
    // Настройки бота
    getBotSettings: function() {
        const settings = localStorage.getItem('admin_bot_settings');
        return settings ? JSON.parse(settings) : null;
    },
    
    saveBotSettings: function(settings) {
        localStorage.setItem('admin_bot_settings', JSON.stringify(settings));
    }
};

// Обновление данных на сайте
function updateProductsData() {
    // Обновить products.js данные из localStorage
    const adminProducts = AdminStorage.getProducts();
    // Это будет использоваться при загрузке products.html
}

function updateBannersOnSite() {
    // Обновить баннеры на главной странице
    // Это можно сделать через обновление DOM или перезагрузку страницы
}

function updateHeroOnSite() {
    // Обновить hero-блок на главной странице
    // Это можно сделать через обновление DOM или перезагрузку страницы
}

// Форматирование цены
function formatPrice(price) {
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

// Инициализация демо данных
function initDemoData() {
    // Проверяем, есть ли уже данные
    const existingProducts = AdminStorage.getProducts();
    const existingBanners = AdminStorage.getBanners();
    const existingHero = AdminStorage.getHero();
    
    // Добавляем демо товары, если их нет
    if (existingProducts.length === 0) {
        const demoProducts = [
            {
                id: 'demo-pizza-1',
                category: 'pizza',
                name: 'Pitsa xamiri',
                description: 'Tayyor pitsa xamiri, uyda pitsa pishirish uchun',
                price: 25000,
                image: '🍕'
            },
            {
                id: 'demo-pizza-2',
                category: 'pizza',
                name: 'Mozzarella pishloq',
                description: 'Italyan pishlog\'i, pitsa uchun ideal',
                price: 35000,
                image: '🧀'
            },
            {
                id: 'demo-samsa-1',
                category: 'samsa',
                name: 'Somsa xamiri',
                description: 'Tayyor somsa xamiri, yumshoq va xushbo\'y',
                price: 12000,
                image: '🥟'
            },
            {
                id: 'demo-samsa-2',
                category: 'samsa',
                name: 'Go\'shtli somsa to\'plami',
                description: 'Go\'sht, xamir va barcha kerakli ingredientlar',
                price: 45000,
                image: '📦'
            },
            {
                id: 'demo-burger-1',
                category: 'burger',
                name: 'Burger to\'plami',
                description: 'To\'liq burger to\'plami: non, kotlet, sabzavotlar',
                price: 75000,
                image: '🍔'
            },
            {
                id: 'demo-breakfast-1',
                category: 'breakfast',
                name: 'Nonushta to\'plami',
                description: 'Tuxum, sosiska, pishloq, non va murabbo',
                price: 55000,
                image: '🥞'
            }
        ];
        
        demoProducts.forEach(product => {
            AdminStorage.saveProduct(product);
        });
    }
    
    // Добавляем демо баннер, если его нет
    if (existingBanners.length === 0) {
        const demoBanner = {
            id: 'demo-banner-1',
            title: 'Har kuni yangi mahsulotlar',
            subtitle: 'Uyda pishirish uchun barcha kerakli narsalar',
            image: '👨‍🍳',
            color1: '#FF6B35',
            color2: '#D62828'
        };
        AdminStorage.saveBanner(demoBanner);
    }
    
    // Устанавливаем демо Hero, если его нет
    if (!existingHero) {
        const demoHero = {
            title: 'MEN OSHPAZ',
            subtitle: 'O\'zim pishiraman',
            image: '👨‍🍳',
            color1: '#FF6B35',
            color2: '#D62828'
        };
        AdminStorage.saveHero(demoHero);
    }
}

// Инициализация при загрузке
// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    initAdminPanel();
});

// Инициализация контента админ-панели (будет вызвана из initAdminPanel если пользователь админ)
function initializeAdminPanelContent() {
    initDemoData();
    loadProducts();
    loadStats();
}

