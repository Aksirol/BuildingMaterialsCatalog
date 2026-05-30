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

    // 2. Сповіщаємо про успіх
    document.getElementById('catalog-content').innerHTML = "<p>База даних успішно ініціалізована!</p>";
    console.log("SQLite БД ініціалізована та таблиці створені.");

    // 3. Лише тепер можна маніпулювати інтерфейсом
    // (Необов'язково: можна відразу відкривати довідники після старту)
    // showSection('dictionaries');

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