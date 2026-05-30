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