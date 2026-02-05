// Данные товаров по категориям
const productsData = {
    pizza: {
        title: 'Pitsa pishiramiz',
        products: [
            { id: 'pizza-1', name: 'Pitsa xamiri', price: 25000, image: '🍕', description: 'Tayyor pitsa xamiri' },
            { id: 'pizza-2', name: 'Pitsa sousi', price: 15000, image: '🍅', description: 'Pitsa uchun maxsus sous' },
            { id: 'pizza-3', name: 'Mozzarella pishloq', price: 35000, image: '🧀', description: 'Italyan pishlog\'i' },
            { id: 'pizza-4', name: 'Pitsa to\'plami', price: 65000, image: '📦', description: 'To\'liq pitsa to\'plami' },
            { id: 'pizza-5', name: 'Peperoni', price: 28000, image: '🌶️', description: 'Pitsa uchun peperoni' },
            { id: 'pizza-6', name: 'Qo\'ziqorin', price: 18000, image: '🍄', description: 'Taza qo\'ziqorin' }
        ]
    },
    samsa: {
        title: 'Somsa pishiramiz',
        products: [
            { id: 'samsa-1', name: 'Somsa xamiri', price: 12000, image: '🥟', description: 'Tayyor somsa xamiri' },
            { id: 'samsa-2', name: 'Go\'shtli somsa to\'plami', price: 45000, image: '📦', description: 'Go\'sht va xamir to\'plami' },
            { id: 'samsa-3', name: 'Kartoshkali somsa to\'plami', price: 35000, image: '🥔', description: 'Kartoshka va xamir to\'plami' },
            { id: 'samsa-4', name: 'Piyoz', price: 8000, image: '🧅', description: 'Taza piyoz' },
            { id: 'samsa-5', name: 'Go\'sht', price: 55000, image: '🥩', description: 'Somsa uchun go\'sht' },
            { id: 'samsa-6', name: 'Ziravorlar', price: 10000, image: '🌿', description: 'Somsa uchun ziravorlar' }
        ]
    },
    burger: {
        title: 'Burger pishiramiz',
        products: [
            { id: 'burger-1', name: 'Burger noni', price: 15000, image: '🍔', description: 'Tayyor burger noni' },
            { id: 'burger-2', name: 'Burger kotleti', price: 40000, image: '🥩', description: 'Tayyor kotlet' },
            { id: 'burger-3', name: 'Burger to\'plami', price: 75000, image: '📦', description: 'To\'liq burger to\'plami' },
            { id: 'burger-4', name: 'Pomidor', price: 12000, image: '🍅', description: 'Taza pomidor' },
            { id: 'burger-5', name: 'Salat bargi', price: 10000, image: '🥬', description: 'Taza salat' },
            { id: 'burger-6', name: 'Burger sousi', price: 18000, image: '🍯', description: 'Maxsus burger sousi' }
        ]
    },
    breakfast: {
        title: 'Uyda nonushta',
        products: [
            { id: 'breakfast-1', name: 'Tuxum', price: 20000, image: '🥚', description: 'Taza tuxum' },
            { id: 'breakfast-2', name: 'Nonushta to\'plami', price: 55000, image: '📦', description: 'To\'liq nonushta to\'plami' },
            { id: 'breakfast-3', name: 'Sosiska', price: 30000, image: '🌭', description: 'Tayyor sosiska' },
            { id: 'breakfast-4', name: 'Pishloq', price: 35000, image: '🧀', description: 'Turli pishloq' },
            { id: 'breakfast-5', name: 'Non', price: 15000, image: '🍞', description: 'Taza non' },
            { id: 'breakfast-6', name: 'Murabbo', price: 18000, image: '🍯', description: 'Uy sharoitida tayyorlangan murabbo' }
        ]
    }
};

// Получить категорию из URL
function getCategoryFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('category') || 'pizza';
}

// Отобразить товары
async function displayProducts() {
    const category = getCategoryFromURL();
    let products = [];
    
    // Сначала попробовать загрузить с сервера
    try {
        const response = await fetch('/api/products');
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.products && data.products.length > 0) {
                products = data.products.filter(p => p.category === category);
                // Сохранить в localStorage для офлайн-доступа
                localStorage.setItem('admin_products', JSON.stringify(data.products));
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки товаров с сервера:', error);
    }
    
    // Если нет товаров с сервера, попробовать из localStorage
    if (products.length === 0) {
        const adminProducts = localStorage.getItem('admin_products');
        if (adminProducts) {
            try {
                const allProducts = JSON.parse(adminProducts);
                products = allProducts.filter(p => p.category === category);
            } catch (e) {
                console.error('Ошибка загрузки товаров из localStorage:', e);
            }
        }
    }
    
    // Если нет товаров из localStorage, использовать дефолтные
    if (products.length === 0) {
        const categoryData = productsData[category];
        if (categoryData) {
            products = categoryData.products;
        }
    }
    
    if (products.length === 0) {
        const productsList = document.getElementById('productsList');
        productsList.innerHTML = `
            <div style="text-align: center; padding: 60px 20px;">
                <div style="font-size: 64px; margin-bottom: 20px;">📦</div>
                <h2 style="font-size: 20px; font-weight: 600; color: var(--dark); margin-bottom: 10px;">
                    Mahsulot topilmadi
                </h2>
                <p style="font-size: 14px; color: var(--dark); opacity: 0.7; margin-bottom: 30px;">
                    Bu kategoriyada hozircha mahsulotlar yo'q. Tez orada qo'shiladi.
                </p>
                <button onclick="window.location.href='index.html'" style="
                    background: linear-gradient(135deg, var(--orange) 0%, var(--light-orange) 100%);
                    border: none;
                    border-radius: 25px;
                    padding: 12px 24px;
                    color: white;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                ">
                    Asosiy sahifaga qaytish
                </button>
            </div>
        `;
        return;
    }
    
    // Установить заголовок
    const categoryTitles = {
        pizza: 'Pitsa pishiramiz',
        samsa: 'Somsa pishiramiz',
        burger: 'Burger pishiramiz',
        breakfast: 'Uyda nonushta'
    };
    document.getElementById('categoryTitle').textContent = categoryTitles[category] || 'Mahsulotlar';
    
    // Отобразить товары
    const productsList = document.getElementById('productsList');
    productsList.innerHTML = '';
    
    products.forEach(product => {
        const productCard = createProductCard(product);
        productsList.appendChild(productCard);
    });
}

// Создать карточку товара
function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    
    card.innerHTML = `
        <div class="product-image">${product.image}</div>
        <div class="product-info">
            <h3 class="product-name">${product.name}</h3>
            <p class="product-description">${product.description}</p>
            <div class="product-footer">
                <div class="product-price">${formatPrice(product.price)} so'm</div>
                <button class="product-add-btn" data-product-id="${product.id}">
                    <span class="add-icon">+</span>
                    Savatga
                </button>
            </div>
        </div>
    `;
    
    // Обработчик добавления в корзину
    const addBtn = card.querySelector('.product-add-btn');
    addBtn.addEventListener('click', function() {
        if (typeof Cart !== 'undefined') {
            Cart.addItem(product);
        } else {
            // Fallback если Cart не загружен
            console.error('Cart не загружен');
        }
        
        // Визуальная обратная связь
        addBtn.style.transform = 'scale(0.95)';
        setTimeout(() => {
            addBtn.style.transform = 'scale(1)';
        }, 150);
    });
    
    return card;
}

// Форматировать цену
function formatPrice(price) {
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

// Обработка кнопки "Назад"
const backBtn = document.getElementById('backBtn');
if (backBtn) {
    backBtn.addEventListener('click', function() {
        window.location.href = 'index.html';
        
        if (window.Telegram && window.Telegram.WebApp) {
            window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
        }
    });
}

// Обработка кнопки корзины
const cartBtn = document.getElementById('cartBtn');
if (cartBtn) {
    cartBtn.addEventListener('click', function() {
        handleCartClick();
    });
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    displayProducts();
    if (typeof Cart !== 'undefined') {
        Cart.updateCartCount();
    }
});

