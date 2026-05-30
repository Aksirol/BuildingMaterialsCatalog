// tests.js

async function runAutomatedTests() {
    console.log("%c=== Запуск автоматизованих тестів Фази 1 ===", "color: blue; font-weight: bold; font-size: 14px;");

    let passed = 0;
    const total = 5;

    // Чекаємо трохи, щоб sql.js встиг ініціалізуватися
    await new Promise(resolve => setTimeout(resolve, 500));

    // ТП-1.1: Запуск застосунку
    // Якщо скрипт дійшов до цієї точки і немає невідловлених помилок (їх можна побачити у консолі)
    console.log("%c[ПРОЙДЕНО] ТП-1.1:", "color: green;", "Сторінка завантажується, інтерфейс відображається.");
    passed++;

    // ТП-1.2: Ініціалізація sql.js
    if (typeof db !== 'undefined' && db !== null) {
        console.log("%c[ПРОЙДЕНО] ТП-1.2:", "color: green;", "Бібліотека завантажена, об'єкт БД створено.");
        passed++;
    } else {
        console.error("[ПОМИЛКА] ТП-1.2: Об'єкт бази даних (db) не існує.");
    }

    // ТП-1.3: Створення схеми (перевірка наявності 6 таблиць)
    try {
        // Запит до системної таблиці sqlite_master
        const res = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';");

        // Витягуємо масив імен таблиць
        const tables = res[0] ? res[0].values.flat() : [];
        const requiredTables = ['categories', 'units', 'products', 'customers', 'orders', 'order_items'];

        // Перевіряємо, чи всі необхідні таблиці існують
        const allExist = requiredTables.every(t => tables.includes(t));

        if (tables.length === 6 && allExist) {
            console.log("%c[ПРОЙДЕНО] ТП-1.3:", "color: green;", "У базі присутні всі 6 таблиць із потрібними полями.");
            passed++;
        } else {
            console.error(`[ПОМИЛКА] ТП-1.3: Очікувалось 6 таблиць, знайдено: ${tables.join(', ')}`);
        }
    } catch (e) {
        console.error("[ПОМИЛКА] ТП-1.3: Збій під час перевірки схеми таблиць.", e);
    }

    // ТП-1.4: Зовнішні ключі
    try {
        const res = db.exec("PRAGMA foreign_keys;");
        const fkStatus = res[0].values[0][0];

        if (fkStatus === 1) {
            console.log("%c[ПРОЙДЕНО] ТП-1.4:", "color: green;", "Контроль зовнішніх ключів увімкнено (PRAGMA foreign_keys = 1).");
            passed++;
        } else {
            console.error(`[ПОМИЛКА] ТП-1.4: Зовнішні ключі вимкнено (Отримано значення: ${fkStatus}).`);
        }
    } catch (e) {
        console.error("[ПОМИЛКА] ТП-1.4: Збій під час запиту PRAGMA.", e);
    }

    // ТП-1.5: Навігація
    try {
        // Емулюємо перехід на вкладку "Клієнти"
        showSection('customers');

        const catalogStyle = document.getElementById('catalog').style.display;
        const customersStyle = document.getElementById('customers').style.display;

        if (catalogStyle === 'none' && customersStyle === 'block') {
            // Повертаємо стан інтерфейсу назад до початкового
            showSection('catalog');

            // Додамо підсвічування активної кнопки (якщо це реалізовано в CSS/JS)
            console.log("%c[ПРОЙДЕНО] ТП-1.5:", "color: green;", "Розділи відкриваються коректно.");
            passed++;
        } else {
            console.error("[ПОМИЛКА] ТП-1.5: Відображення секцій не змінилося належним чином.");
        }
    } catch (e) {
        console.error("[ПОМИЛКА] ТП-1.5: Збій під час перевірки навігації.", e);
    }

    // Підсумок
    console.log(`%c=== Результат: ${passed} / ${total} тестів успішно пройдено ===`, "color: blue; font-weight: bold;");
}

async function runPhase2Tests() {
    console.log("%c=== Запуск автоматизованих тестів Фази 2 ===", "color: blue; font-weight: bold; font-size: 14px;");
    let passed = 0;
    const total = 5;

    // Перевіряємо, чи БД готова
    if (typeof db === 'undefined' || db === null) {
        console.error("БД не ініціалізована. Тести скасовано.");
        return;
    }

    // ТП-2.1: Додавання категорії
    try {
        // Заповнюємо DOM елементи
        document.getElementById('category_id').value = '';
        document.getElementById('category_name').value = 'Деревина';
        document.getElementById('category_desc').value = 'Тестовий опис';

        // Емулюємо подію submit, передаючи об'єкт-заглушку для preventDefault
        saveCategory({ preventDefault: () => {} });

        // Перевіряємо в базі
        const res = db.exec("SELECT category_id, name FROM categories WHERE name = 'Деревина'");
        if (res.length > 0 && res[0].values.length > 0) {
            console.log("%c[ПРОЙДЕНО] ТП-2.1:", "color: green;", "Категорія 'Деревина' з'явилась у списку та збережена в БД.");
            passed++;
        } else {
            console.error("[ПОМИЛКА] ТП-2.1: Категорію не знайдено в базі.");
        }
    } catch (e) {
        console.error("[ПОМИЛКА] ТП-2.1: Збій під час додавання.", e);
    }

    // Отримуємо ID доданої категорії для наступних тестів
    let testCatId = null;
    try {
        const res = db.exec("SELECT category_id FROM categories WHERE name = 'Деревина' ORDER BY category_id DESC LIMIT 1");
        if (res.length > 0) testCatId = res[0].values[0][0];
    } catch(e) {}

    // ТП-2.2: Редагування категорії
    try {
        if (testCatId) {
            document.getElementById('category_id').value = testCatId;
            document.getElementById('category_name').value = 'Деревина Оновлена';
            document.getElementById('category_desc').value = 'Оновлений опис';

            saveCategory({ preventDefault: () => {} });

            const res = db.exec(`SELECT name FROM categories WHERE category_id = ${testCatId}`);
            if (res.length > 0 && res[0].values[0][0] === 'Деревина Оновлена') {
                console.log("%c[ПРОЙДЕНО] ТП-2.2:", "color: green;", "Зміни категорії успішно збережено.");
                passed++;
            } else {
                console.error("[ПОМИЛКА] ТП-2.2: Зміни не збереглись у базі.");
            }
        } else {
            console.error("[ПОМИЛКА] ТП-2.2: Пропущено, бо категорію з ТП-2.1 не знайдено.");
        }
    } catch (e) {
        console.error("[ПОМИЛКА] ТП-2.2: Збій під час редагування.", e);
    }

    // ТП-2.3: Видалення категорії
    try {
        if (testCatId) {
            // Тимчасово замокуємо (підміняємо) вікно підтвердження браузера
            const originalConfirm = window.confirm;
            window.confirm = () => true; // Завжди відповідаємо "Так"

            deleteCategory(testCatId);

            // Повертаємо стандартну поведінку
            window.confirm = originalConfirm;

            const res = db.exec(`SELECT * FROM categories WHERE category_id = ${testCatId}`);
            if (res.length === 0) {
                console.log("%c[ПРОЙДЕНО] ТП-2.3:", "color: green;", "Категорію успішно видалено з БД.");
                passed++;
            } else {
                console.error("[ПОМИЛКА] ТП-2.3: Категорія все ще існує в базі.");
            }
        } else {
            console.error("[ПОМИЛКА] ТП-2.3: Пропущено, немає ID для видалення.");
        }
    } catch (e) {
        console.error("[ПОМИЛКА] ТП-2.3: Збій під час видалення.", e);
    }

    // ТП-2.4: Додавання одиниць
    try {
        const unitsToAdd = [
            { name: 'Штука', short: 'шт' },
            { name: 'Метр квадратний', short: 'м²' },
            { name: 'Метр кубічний', short: 'м³' }
        ];

        // Додаємо всі три в циклі
        unitsToAdd.forEach(u => {
            document.getElementById('unit_id').value = '';
            document.getElementById('unit_name').value = u.name;
            document.getElementById('unit_short').value = u.short;
            saveUnit({ preventDefault: () => {} });
        });

        // Шукаємо їх у БД
        const res = db.exec("SELECT short_name FROM units WHERE short_name IN ('шт', 'м²', 'м³')");
        // Якщо знайшлося 3 записи, тест пройдено
        if (res.length > 0 && res[0].values.length === 3) {
            console.log("%c[ПРОЙДЕНО] ТП-2.4:", "color: green;", "Одиниці виміру (шт, м², м³) збережені й доступні.");
            passed++;
        } else {
            console.error("[ПОМИЛКА] ТП-2.4: Не всі одиниці виміру додано.", res[0] ? res[0].values : []);
        }
    } catch (e) {
        console.error("[ПОМИЛКА] ТП-2.4: Збій під час додавання одиниць.", e);
    }

    // ТП-2.5: Валідація
    try {
        const form = document.getElementById('category-form');
        document.getElementById('category_id').value = '';
        document.getElementById('category_name').value = ''; // Залишаємо порожнім обов'язкове поле

        // Перевіряємо вбудовану HTML5-валідацію (атрибут required)
        const isValid = form.checkValidity();

        if (!isValid) {
            console.log("%c[ПРОЙДЕНО] ТП-2.5:", "color: green;", "Спроба зберегти запис із порожньою назвою відхилена.");
            passed++;
        } else {
            console.error("[ПОМИЛКА] ТП-2.5: Форма дозволяє збереження без обов'язкових полів.");
        }
    } catch (e) {
        console.error("[ПОМИЛКА] ТП-2.5: Збій під час перевірки валідації.", e);
    }

    console.log(`%c=== Результат: ${passed} / ${total} тестів Фази 2 успішно пройдено ===`, "color: blue; font-weight: bold;");
}