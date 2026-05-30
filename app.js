// ==========================================
// ГЛОБАЛЬНІ ЗМІННІ (оголошуємо лише один раз!)
// ==========================================
let db;

// Конфігурація для завантаження wasm
const config = {
    locateFile: filename => `./lib/${filename}`
};

// ==========================================
// ІНІЦІАЛІЗАЦІЯ БАЗИ ДАНИХ
// ==========================================
initSqlJs(config).then(function(SQL) {
    db = new SQL.Database();

    // Вмикаємо зовнішні ключі
    db.run("PRAGMA foreign_keys = ON;");

    // 1. СПОЧАТКУ створюємо таблиці
    createTables();

    // 2. Сповіщаємо про успіх (БЕЗПЕЧНА ПЕРЕВІРКА)
    const initMessageBlock = document.getElementById('catalog-content');
    if (initMessageBlock) {
        initMessageBlock.innerHTML = "<p>База даних успішно ініціалізована!</p>";
    }

    console.log("SQLite БД ініціалізована та таблиці створені.");

    // 3. Завантажуємо дані для Фази 3 (щоб каталог не був порожнім при старті)
    if (typeof populateSelects === 'function') populateSelects();
    if (typeof renderProducts === 'function') renderProducts();

}).catch(function(err) {
    console.error("Помилка ініціалізації бази даних:", err);
    const content = document.getElementById('catalog-content');
    if(content) content.innerHTML = "<p style='color: red;'>Помилка завантаження БД.</p>";
});

function createTables() {
    const initSql = `
        CREATE TABLE categories (
            category_id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT
        );
        CREATE TABLE units (
            unit_id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            short_name TEXT NOT NULL
        );
        CREATE TABLE products (
            product_id INTEGER PRIMARY KEY AUTOINCREMENT,
            category_id INTEGER NOT NULL,
            unit_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            article TEXT UNIQUE,
            price REAL NOT NULL,
            description TEXT,
            image TEXT,
            in_stock INTEGER DEFAULT 0,
            FOREIGN KEY (category_id) REFERENCES categories (category_id),
            FOREIGN KEY (unit_id) REFERENCES units (unit_id)
        );
        CREATE TABLE customers (
            customer_id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT,
            email TEXT,
            address TEXT
        );
        CREATE TABLE orders (
            order_id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER NOT NULL,
            order_date TEXT DEFAULT CURRENT_TIMESTAMP,
            markup_percent REAL DEFAULT 0,
            delivery_cost REAL DEFAULT 0,
            status TEXT DEFAULT 'Нове',
            total_amount REAL DEFAULT 0,
            FOREIGN KEY (customer_id) REFERENCES customers (customer_id)
        );
        CREATE TABLE order_items (
            order_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            quantity REAL NOT NULL,
            price REAL NOT NULL,
            FOREIGN KEY (order_id) REFERENCES orders (order_id),
            FOREIGN KEY (product_id) REFERENCES products (product_id)
        );
    `;
    db.run(initSql);
}

// ==========================================
// НАВІГАЦІЯ ТА ІНТЕРФЕЙС
// ==========================================
function originalShowSection(sectionId) {
    document.querySelectorAll('.section').forEach(el => {
        el.style.display = 'none';
    });
    const section = document.getElementById(sectionId);
    if(section) section.style.display = 'block';
}

// Перевизначаємо навігацію для підвантаження даних
function showSection(sectionId) {
    originalShowSection(sectionId);

    // Якщо відкриваємо довідники, завантажуємо їх з БД
    if (sectionId === 'dictionaries') {
        renderCategories();
        renderUnits();
    }
}

// ==========================================
// ФАЗА 2: ЛОГІКА ДОВІДНИКІВ
// ==========================================

// --- КАТЕГОРІЇ ---
function saveCategory(event) {
    event.preventDefault();

    const id = document.getElementById('category_id').value;
    const name = document.getElementById('category_name').value.trim();
    const desc = document.getElementById('category_desc').value.trim();

    if (id) {
        db.run("UPDATE categories SET name = ?, description = ? WHERE category_id = ?", [name, desc, id]);
    } else {
        db.run("INSERT INTO categories (name, description) VALUES (?, ?)", [name, desc]);
    }

    clearCategoryForm();
    renderCategories();
}

function deleteCategory(id) {
    if (confirm("Видалити цю категорію?")) {
        try {
            db.run("DELETE FROM categories WHERE category_id = ?", [id]);
            renderCategories();
        } catch (e) {
            alert("Помилка видалення! Можливо, існують товари з цією категорією.");
        }
    }
}

function editCategory(id, name, desc) {
    document.getElementById('category_id').value = id;
    document.getElementById('category_name').value = name;
    document.getElementById('category_desc').value = desc;
}

function clearCategoryForm() {
    document.getElementById('category-form').reset();
    document.getElementById('category_id').value = "";
}

function renderCategories() {
    const tbody = document.getElementById('categories-list');
    if(!tbody) return;

    tbody.innerHTML = "";

    const res = db.exec("SELECT * FROM categories");
    if (res.length === 0) return;

    res[0].values.forEach(row => {
        const [id, name, desc] = row;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${id}</td>
            <td>${name}</td>
            <td>${desc || ''}</td>
            <td>
                <button class="btn-edit" onclick="editCategory(${id}, '${name}', '${desc || ''}')">Ред.</button>
                <button class="btn-delete" onclick="deleteCategory(${id})">Вид.</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// --- ОДИНИЦІ ВИМІРУ ---
function saveUnit(event) {
    event.preventDefault();

    const id = document.getElementById('unit_id').value;
    const name = document.getElementById('unit_name').value.trim();
    const short = document.getElementById('unit_short').value.trim();

    if (id) {
        db.run("UPDATE units SET name = ?, short_name = ? WHERE unit_id = ?", [name, short, id]);
    } else {
        db.run("INSERT INTO units (name, short_name) VALUES (?, ?)", [name, short]);
    }

    clearUnitForm();
    renderUnits();
}

function deleteUnit(id) {
    if (confirm("Видалити цю одиницю виміру?")) {
        try {
            db.run("DELETE FROM units WHERE unit_id = ?", [id]);
            renderUnits();
        } catch (e) {
            alert("Помилка видалення! Можливо, існують товари з цією одиницею.");
        }
    }
}

function editUnit(id, name, short) {
    document.getElementById('unit_id').value = id;
    document.getElementById('unit_name').value = name;
    document.getElementById('unit_short').value = short;
}

function clearUnitForm() {
    document.getElementById('unit-form').reset();
    document.getElementById('unit_id').value = "";
}

function renderUnits() {
    const tbody = document.getElementById('units-list');
    if(!tbody) return;

    tbody.innerHTML = "";

    const res = db.exec("SELECT * FROM units");
    if (res.length === 0) return;

    res[0].values.forEach(row => {
        const [id, name, short] = row;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${id}</td>
            <td>${name}</td>
            <td>${short}</td>
            <td>
                <button class="btn-edit" onclick="editUnit(${id}, '${name}', '${short}')">Ред.</button>
                <button class="btn-delete" onclick="deleteUnit(${id})">Вид.</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// ==========================================
// ФАЗА 3: МОДУЛЬ КАТАЛОГУ ТОВАРІВ
// ==========================================

// Оновлюємо перевизначену функцію навігації, щоб вона вантажила і каталог
const originalShowSectionForPhase3 = showSection;
showSection = function(sectionId) {
    originalShowSectionForPhase3(sectionId);

    if (sectionId === 'catalog') {
        populateSelects(); // Оновлюємо випадаючі списки
        renderProducts();  // Завантажуємо товари
    }
};

// Заповнення випадаючих списків категорій та одиниць
function populateSelects() {
    const catSelect = document.getElementById('product_category');
    const filterSelect = document.getElementById('filter-category');
    const unitSelect = document.getElementById('product_unit');

    if (!catSelect || !filterSelect || !unitSelect) return;

    // Отримуємо категорії
    const cats = db.exec("SELECT category_id, name FROM categories");
    let catOptions = '<option value="">Оберіть категорію*</option>';
    let filterOptions = '<option value="">Всі категорії</option>';

    if (cats.length > 0) {
        cats[0].values.forEach(row => {
            catOptions += `<option value="${row[0]}">${row[1]}</option>`;
            filterOptions += `<option value="${row[0]}">${row[1]}</option>`;
        });
    }
    catSelect.innerHTML = catOptions;
    filterSelect.innerHTML = filterOptions;

    // Отримуємо одиниці виміру
    const units = db.exec("SELECT unit_id, short_name FROM units");
    let unitOptions = '<option value="">Одиниці виміру*</option>';

    if (units.length > 0) {
        units[0].values.forEach(row => {
            unitOptions += `<option value="${row[0]}">${row[1]}</option>`;
        });
    }
    unitSelect.innerHTML = unitOptions;
}

// Збереження товару (Створення / Оновлення)
function saveProduct(event) {
    event.preventDefault();

    const id = document.getElementById('product_id').value;
    const name = document.getElementById('product_name').value.trim();
    const article = document.getElementById('product_article').value.trim();
    const price = parseFloat(document.getElementById('product_price').value);
    const cat_id = document.getElementById('product_category').value;
    const unit_id = document.getElementById('product_unit').value;
    const desc = document.getElementById('product_desc').value.trim();
    const image = document.getElementById('product_image').value.trim();
    const in_stock = document.getElementById('product_instock').checked ? 1 : 0;

    try {
        if (id) {
            db.run(`UPDATE products SET 
                    name = ?, article = ?, price = ?, category_id = ?, unit_id = ?, 
                    description = ?, image = ?, in_stock = ? 
                    WHERE product_id = ?`,
                [name, article, price, cat_id, unit_id, desc, image, in_stock, id]);
        } else {
            db.run(`INSERT INTO products 
                    (name, article, price, category_id, unit_id, description, image, in_stock) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [name, article, price, cat_id, unit_id, desc, image, in_stock]);
        }
        clearProductForm();
        renderProducts();
    } catch (e) {
        if (e.message.includes("UNIQUE constraint failed")) {
            alert("Помилка: Товар з таким артикулом вже існує!");
        } else {
            alert("Помилка при збереженні товару: " + e.message);
        }
    }
}

// Видалення товару
function deleteProduct(id) {
    if (confirm("Видалити цей товар?")) {
        try {
            db.run("DELETE FROM products WHERE product_id = ?", [id]);
            renderProducts();
        } catch (e) {
            alert("Помилка! Можливо товар вже доданий до замовлення.");
        }
    }
}

// Підготовка до редагування
function editProduct(id, name, article, price, cat_id, unit_id, desc, image, in_stock) {
    document.getElementById('product_id').value = id;
    document.getElementById('product_name').value = name;
    document.getElementById('product_article').value = article !== 'null' ? article : '';
    document.getElementById('product_price').value = price;
    document.getElementById('product_category').value = cat_id;
    document.getElementById('product_unit').value = unit_id;
    document.getElementById('product_desc').value = desc !== 'null' ? desc : '';
    document.getElementById('product_image').value = image !== 'null' ? image : '';
    document.getElementById('product_instock').checked = parseInt(in_stock) === 1;
}

function clearProductForm() {
    document.getElementById('product-form').reset();
    document.getElementById('product_id').value = "";
}

// Відмальовування таблиці товарів з пошуком та фільтрацією
function renderProducts() {
    const tbody = document.getElementById('products-list');
    if (!tbody) return;
    tbody.innerHTML = "";

    const searchQuery = document.getElementById('search-product').value.toLowerCase();
    const catFilter = document.getElementById('filter-category').value;

    // Базовий запит із JOIN для підтягування назв довідників
    let sql = `
        SELECT p.product_id, p.name, p.article, p.price, p.description, p.image, p.in_stock,
               c.name as cat_name, u.short_name as unit_name, p.category_id, p.unit_id
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.category_id
        LEFT JOIN units u ON p.unit_id = u.unit_id
        WHERE 1=1
    `;
    let params = [];

    // Динамічне додавання умов фільтрації
    if (searchQuery) {
        sql += ` AND (LOWER(p.name) LIKE ? OR LOWER(p.article) LIKE ?)`;
        params.push(`%${searchQuery}%`, `%${searchQuery}%`);
    }
    if (catFilter) {
        sql += ` AND p.category_id = ?`;
        params.push(catFilter);
    }

    try {
        // У sql.js для SELECT з параметрами використовуємо prepare + bind + step
        const stmt = db.prepare(sql);
        stmt.bind(params);

        while (stmt.step()) {
            const row = stmt.get();
            const [id, name, article, price, desc, image, in_stock, cat_name, unit_name, cat_id, unit_id] = row;

            const imgSrc = image ? image : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" fill="%23ddd"><rect width="50" height="50"/></svg>';
            const stockBadge = in_stock ? '<span class="badge-yes">Так</span>' : '<span class="badge-no">Ні</span>';
            const safeArticle = article || '-';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><img src="${imgSrc}" class="product-thumb" alt="фото"></td>
                <td>${safeArticle}</td>
                <td><strong>${name}</strong></td>
                <td>${cat_name}</td>
                <td>${price.toFixed(2)} / ${unit_name}</td>
                <td>${stockBadge}</td>
                <td>
                    <button class="btn-edit" onclick="editProduct(${id}, '${name}', '${article}', ${price}, ${cat_id}, ${unit_id}, '${desc}', '${image}', ${in_stock})">Ред.</button>
                    <button class="btn-delete" onclick="deleteProduct(${id})">Вид.</button>
                </td>
            `;
            tbody.appendChild(tr);
        }
        stmt.free(); // Звільняємо пам'ять після виконання запиту
    } catch (e) {
        console.error("Помилка завантаження товарів:", e);
    }
}

// ==========================================
// ФАЗА 4: МОДУЛЬ КЛІЄНТІВ
// ==========================================

// Оновлюємо навігацію для підвантаження даних клієнтів
const originalShowSectionForPhase4 = showSection;
showSection = function(sectionId) {
    originalShowSectionForPhase4(sectionId);

    if (sectionId === 'customers') {
        renderCustomers();
    }
};

// Збереження клієнта (Створення / Оновлення)
function saveCustomer(event) {
    event.preventDefault();

    const id = document.getElementById('customer_id').value;
    const name = document.getElementById('customer_name').value.trim();
    const phone = document.getElementById('customer_phone').value.trim();
    const email = document.getElementById('customer_email').value.trim();
    const address = document.getElementById('customer_address').value.trim();

    try {
        if (id) {
            db.run(`UPDATE customers SET name = ?, phone = ?, email = ?, address = ? WHERE customer_id = ?`,
                [name, phone, email, address, id]);
        } else {
            db.run(`INSERT INTO customers (name, phone, email, address) VALUES (?, ?, ?, ?)`,
                [name, phone, email, address]);
        }
        clearCustomerForm();
        renderCustomers();
    } catch (e) {
        alert("Помилка при збереженні клієнта: " + e.message);
    }
}

// Видалення клієнта
function deleteCustomer(id) {
    if (confirm("Видалити цього клієнта?")) {
        try {
            db.run("DELETE FROM customers WHERE customer_id = ?", [id]);
            renderCustomers();
        } catch (e) {
            alert("Помилка! Можливо, у цього клієнта вже є оформлені замовлення. (Спрацював захист зовнішнього ключа)");
        }
    }
}

// Підготовка до редагування
function editCustomer(id, name, phone, email, address) {
    document.getElementById('customer_id').value = id;
    document.getElementById('customer_name').value = name;
    document.getElementById('customer_phone').value = phone !== 'null' ? phone : '';
    document.getElementById('customer_email').value = email !== 'null' ? email : '';
    document.getElementById('customer_address').value = address !== 'null' ? address : '';
}

// Очищення форми
function clearCustomerForm() {
    document.getElementById('customer-form').reset();
    document.getElementById('customer_id').value = "";
}

// Відмальовування таблиці клієнтів
function renderCustomers() {
    const tbody = document.getElementById('customers-list');
    if (!tbody) return;
    tbody.innerHTML = "";

    try {
        const res = db.exec("SELECT customer_id, name, phone, email, address FROM customers ORDER BY customer_id DESC");

        if (res.length === 0) return;

        res[0].values.forEach(row => {
            const [id, name, phone, email, address] = row;

            // Захист від null значень для безпечного виводу
            const safePhone = phone || '-';
            const safeEmail = email || '-';
            const safeAddress = address || '-';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${id}</td>
                <td><strong>${name}</strong></td>
                <td>${safePhone}</td>
                <td>${safeEmail}</td>
                <td>${safeAddress}</td>
                <td>
                    <button class="btn-edit" onclick="editCustomer(${id}, '${name}', '${safePhone}', '${safeEmail}', '${safeAddress}')">Ред.</button>
                    <button class="btn-delete" onclick="deleteCustomer(${id})">Вид.</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        console.error("Помилка завантаження клієнтів:", e);
    }
}

// ==========================================
// ФАЗА 5: МОДУЛЬ ЗАМОВЛЕНЬ ТА КАЛЬКУЛЯТОР
// ==========================================

// Глобальний масив для тимчасового зберігання позицій перед збереженням замовлення
let currentCart = [];

// Оновлюємо навігацію
const originalShowSectionForPhase5 = showSection;
showSection = function(sectionId) {
    originalShowSectionForPhase5(sectionId);
    if (sectionId === 'orders') {
        populateOrderSelects();
        renderOrdersHistory();
    }
};

// Заповнення списків клієнтів та товарів у формі замовлення
function populateOrderSelects() {
    const custSelect = document.getElementById('order_customer');
    const prodSelect = document.getElementById('order_product');
    if (!custSelect || !prodSelect) return;

    // Клієнти
    const customers = db.exec("SELECT customer_id, name FROM customers");
    let custOptions = '<option value="">Оберіть клієнта*</option>';
    if (customers.length > 0) {
        customers[0].values.forEach(row => {
            custOptions += `<option value="${row[0]}">${row[1]}</option>`;
        });
    }
    custSelect.innerHTML = custOptions;

    // Товари (Зберігаємо поточну ціну та одиницю виміру в data-атрибутах!)
    const products = db.exec(`
        SELECT p.product_id, p.name, p.price, u.short_name 
        FROM products p 
        LEFT JOIN units u ON p.unit_id = u.unit_id
    `);
    let prodOptions = '<option value="">Оберіть товар з каталогу</option>';
    if (products.length > 0) {
        products[0].values.forEach(row => {
            const [id, name, price, unit] = row;
            // Фіксуємо ціну в data-price, щоб використати її при додаванні в кошик
            prodOptions += `<option value="${id}" data-price="${price}" data-unit="${unit}">${name} (${price} грн/${unit})</option>`;
        });
    }
    prodSelect.innerHTML = prodOptions;
}

// Додавання товару до кошика
function addOrderItem() {
    const prodSelect = document.getElementById('order_product');
    const qtyInput = document.getElementById('order_quantity');

    const productId = prodSelect.value;
    const quantity = parseFloat(qtyInput.value);

    if (!productId || isNaN(quantity) || quantity <= 0) {
        alert("Оберіть товар та вкажіть коректну кількість.");
        return;
    }

    const selectedOption = prodSelect.options[prodSelect.selectedIndex];
    const price = parseFloat(selectedOption.getAttribute('data-price'));
    const name = selectedOption.text.split(' (')[0]; // Беремо чисту назву
    const unit = selectedOption.getAttribute('data-unit');

    // Перевіряємо, чи є вже такий товар у кошику. Якщо так - збільшуємо кількість
    const existingItemIndex = currentCart.findIndex(item => item.product_id === productId);
    if (existingItemIndex > -1) {
        currentCart[existingItemIndex].quantity += quantity;
    } else {
        // Фіксація ціни відбувається тут
        currentCart.push({
            product_id: productId,
            name: name,
            unit: unit,
            quantity: quantity,
            price: price
        });
    }

    // Скидаємо поля вибору
    prodSelect.value = '';
    qtyInput.value = '1';

    renderCart();
}

// Видалення товару з кошика
function removeOrderItem(index) {
    currentCart.splice(index, 1);
    renderCart();
}

// Відмальовування кошика та виклик перерахунку
function renderCart() {
    const tbody = document.getElementById('cart-items');
    tbody.innerHTML = '';

    if (currentCart.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #7f8c8d;">Кошик порожній</td></tr>';
        calculateTotal();
        return;
    }

    currentCart.forEach((item, index) => {
        const sum = item.price * item.quantity;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.name}</td>
            <td>${item.quantity} ${item.unit}</td>
            <td>${item.price.toFixed(2)}</td>
            <td><strong>${sum.toFixed(2)}</strong></td>
            <td><button class="btn-delete" onclick="removeOrderItem(${index})">✕</button></td>
        `;
        tbody.appendChild(tr);
    });

    calculateTotal();
}

// Калькулятор вартості (Формула з ТЗ)
function calculateTotal() {
    // 1. Сума позицій
    const subtotal = currentCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // 2. Отримуємо націнку і доставку з форми
    const markupPercent = parseFloat(document.getElementById('order_markup').value) || 0;
    const deliveryCost = parseFloat(document.getElementById('order_delivery').value) || 0;

    // 3. Формула: сума позицій * (1 + націнка / 100) + доставка
    const markupValue = subtotal * (markupPercent / 100);
    const totalAmount = subtotal + markupValue + deliveryCost;

    // 4. Оновлюємо інтерфейс
    document.getElementById('summary_subtotal').innerText = subtotal.toFixed(2);
    document.getElementById('summary_markup').innerText = markupValue.toFixed(2);
    document.getElementById('summary_delivery').innerText = deliveryCost.toFixed(2);
    document.getElementById('summary_total').innerText = totalAmount.toFixed(2);
}

// Збереження замовлення у БД (orders + order_items)
function saveOrder() {
    const customerId = document.getElementById('order_customer').value;
    if (!customerId) {
        alert("Помилка: Оберіть клієнта!");
        return;
    }
    if (currentCart.length === 0) {
        alert("Помилка: Додайте хоча б один товар до замовлення!");
        return;
    }

    const status = document.getElementById('order_status').value;
    const markup = parseFloat(document.getElementById('order_markup').value) || 0;
    const delivery = parseFloat(document.getElementById('order_delivery').value) || 0;
    const totalAmount = parseFloat(document.getElementById('summary_total').innerText);

    try {
        // 1. Зберігаємо головний запис у таблицю orders
        db.run(`INSERT INTO orders (customer_id, markup_percent, delivery_cost, status, total_amount) 
                VALUES (?, ?, ?, ?, ?)`,
            [customerId, markup, delivery, status, totalAmount]);

        // 2. Отримуємо ID щойно створеного замовлення (last_insert_rowid)
        const res = db.exec("SELECT last_insert_rowid()");
        const newOrderId = res[0].values[0][0];

        // 3. Зберігаємо всі товари з кошика у таблицю order_items
        currentCart.forEach(item => {
            db.run(`INSERT INTO order_items (order_id, product_id, quantity, price) 
                    VALUES (?, ?, ?, ?)`,
                [newOrderId, item.product_id, item.quantity, item.price]);
        });

        alert("Замовлення успішно збережено!");

        // Очищаємо форму та кошик
        currentCart = [];
        document.getElementById('order_customer').value = '';
        document.getElementById('order_status').value = 'Нове';
        document.getElementById('order_markup').value = '0';
        document.getElementById('order_delivery').value = '0';
        renderCart(); // Очистить таблицю і обнулить підсумки
        renderOrdersHistory(); // Оновить список

    } catch (e) {
        alert("Помилка при збереженні замовлення: " + e.message);
        console.error(e);
    }
}

// Відображення історії замовлень
// Відображення історії замовлень (Оновлено для Фази 6)
function renderOrdersHistory() {
    const tbody = document.getElementById('orders-list');
    if (!tbody) return;
    tbody.innerHTML = '';

    try {
        const res = db.exec(`
            SELECT o.order_id, o.order_date, c.name, o.status, o.total_amount
            FROM orders o
                     JOIN customers c ON o.customer_id = c.customer_id
            ORDER BY o.order_id DESC
        `);

        if (res.length === 0) return;

        res[0].values.forEach(row => {
            const [id, date, customer, status, total] = row;
            const formattedDate = new Date(date).toLocaleString('uk-UA');

            // Динамічний селект для статусу
            const statusSelect = `
                <select onchange="changeOrderStatus(${id}, this.value)" style="padding: 4px; border-radius: 4px;">
                    <option value="Нове" ${status === 'Нове' ? 'selected' : ''}>Нове</option>
                    <option value="В обробці" ${status === 'В обробці' ? 'selected' : ''}>В обробці</option>
                    <option value="Виконано" ${status === 'Виконано' ? 'selected' : ''}>Виконано</option>
                    <option value="Скасовано" ${status === 'Скасовано' ? 'selected' : ''}>Скасовано</option>
                </select>
            `;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><b>#${id}</b></td>
                <td>${formattedDate}</td>
                <td>${customer}</td>
                <td>${statusSelect}</td>
                <td><b>${total.toFixed(2)} грн</b></td>
                <td>
                    <button class="btn-save" style="background-color: #8e44ad; padding: 0.3rem 0.6rem;" onclick="viewOrderDetails(${id})">📄 Деталі</button>
                    <button class="btn-delete" onclick="deleteOrder(${id})">Вид.</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        console.error("Помилка завантаження історії:", e);
    }
}

// Видалення замовлення (спочатку позиції, потім саме замовлення)
function deleteOrder(orderId) {
    if (confirm("Видалити це замовлення?")) {
        try {
            // Спочатку видаляємо зв'язані позиції (через Foreign Key)
            db.run("DELETE FROM order_items WHERE order_id = ?", [orderId]);
            // Потім саме замовлення
            db.run("DELETE FROM orders WHERE order_id = ?", [orderId]);
            renderOrdersHistory();
        } catch (e) {
            alert("Помилка при видаленні: " + e.message);
        }
    }
}

// ==========================================
// ФАЗА 6: ДЕТАЛІ, ДРУК ТА СТАТУСИ
// ==========================================

// Зміна статусу замовлення
function changeOrderStatus(orderId, newStatus) {
    try {
        db.run("UPDATE orders SET status = ? WHERE order_id = ?", [newStatus, orderId]);
        // Сповіщення можна не виводити, щоб не дратувати користувача при кожному кліку
        console.log(`Статус замовлення #${orderId} змінено на '${newStatus}'`);
    } catch(e) {
        alert("Помилка зміни статусу: " + e.message);
    }
}

// Завантаження деталей замовлення та відкриття модалки
function viewOrderDetails(orderId) {
    try {
        // 1. Отримуємо загальні дані замовлення та реквізити клієнта
        const orderRes = db.exec(`
            SELECT o.order_id, o.order_date, o.status, o.markup_percent, o.delivery_cost, o.total_amount,
                   c.name, c.phone, c.email, c.address
            FROM orders o
            JOIN customers c ON o.customer_id = c.customer_id
            WHERE o.order_id = ${orderId}
        `);

        if (orderRes.length === 0) {
            alert("Замовлення не знайдено!"); return;
        }

        const [id, date, status, markup, delivery, total, cName, cPhone, cEmail, cAddress] = orderRes[0].values[0];

        // 2. Отримуємо список товарів (з таблиці order_items)
        const itemsRes = db.exec(`
            SELECT p.name, oi.quantity, oi.price, u.short_name
            FROM order_items oi
            JOIN products p ON oi.product_id = p.product_id
            JOIN units u ON p.unit_id = u.unit_id
            WHERE oi.order_id = ${orderId}
        `);

        // 3. Формуємо HTML таблицю товарів для рахунку
        let itemsHtml = '';
        let subtotal = 0;

        if (itemsRes.length > 0) {
            itemsRes[0].values.forEach((item, index) => {
                const [pName, qty, price, unit] = item;
                const sum = qty * price;
                subtotal += sum;
                itemsHtml += `
                    <tr>
                        <td style="text-align: center;">${index + 1}</td>
                        <td>${pName}</td>
                        <td style="text-align: center;">${qty} ${unit}</td>
                        <td style="text-align: right;">${price.toFixed(2)}</td>
                        <td style="text-align: right;">${sum.toFixed(2)}</td>
                    </tr>
                `;
            });
        }

        // 4. Генеруємо повний документ
        const printArea = document.getElementById('print-area');
        printArea.innerHTML = `
            <div class="invoice-header">
                <h2>Замовлення / Специфікація №${id}</h2>
                <p>від ${new Date(date).toLocaleString('uk-UA')}</p>
            </div>
            
            <div class="invoice-details">
                <div style="flex: 1;">
                    <h3>Постачальник:</h3>
                    <p><strong>ФОП (КВЕД 46.13)</strong></p>
                    <p>Каталог будівельних матеріалів</p>
                </div>
                <div style="flex: 1; text-align: right;">
                    <h3>Покупець:</h3>
                    <p><strong>${cName}</strong></p>
                    <p>${cPhone || 'Телефон не вказано'}</p>
                    <p>${cAddress || 'Адреса не вказана'}</p>
                </div>
            </div>
            
            <table class="invoice-table">
                <thead>
                    <tr>
                        <th style="width: 5%;">№</th>
                        <th style="width: 45%;">Найменування товару</th>
                        <th style="width: 15%; text-align: center;">К-ть</th>
                        <th style="width: 15%; text-align: right;">Ціна (грн)</th>
                        <th style="width: 20%; text-align: right;">Сума (грн)</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
            </table>
            
            <div style="text-align: right; margin-bottom: 1.5rem; line-height: 1.6;">
                <p>Всього за товарами: <b>${subtotal.toFixed(2)} грн</b></p>
                <p>Комісія постачальника (${markup}%): <b>${(subtotal * (markup/100)).toFixed(2)} грн</b></p>
                <p>Доставка: <b>${delivery.toFixed(2)} грн</b></p>
            </div>
            
            <div class="invoice-total">
                Загальна сума до сплати: ${total.toFixed(2)} грн
            </div>
            
            <div style="margin-top: 4rem; display: flex; justify-content: space-between; border-top: 1px solid #eee; padding-top: 2rem;">
                <p>Виписав(ла): ___________________ (Підпис)</p>
                <p>Отримав(ла): ___________________ (Підпис)</p>
            </div>
        `;

        // Відкриваємо модалку
        document.getElementById('order-modal').style.display = 'block';

    } catch (e) {
        alert("Помилка завантаження деталей: " + e.message);
    }
}

// Функція закриття модалки
function closeOrderModal() {
    document.getElementById('order-modal').style.display = 'none';
}

// Закриття модалки при кліку на темний фон поза нею
window.onclick = function(event) {
    const modal = document.getElementById('order-modal');
    if (event.target == modal) {
        closeOrderModal();
    }
}