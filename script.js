// Глобальные переменные
let folderHandle = null;
let ingredients = [];
let recipes = [];
let db = null;

// Элементы DOM
const folderSelector = document.getElementById('folder-selector');
const appContent = document.getElementById('app-content');
const selectFolderBtn = document.getElementById('select-folder-btn');
const statusMessage = document.getElementById('status-message');

// Инициализация приложения
document.addEventListener('DOMContentLoaded', initApp);

// Функция переключения темы
function toggleTheme() {
    const body = document.body;
    const themeIcon = document.querySelector('#theme-toggle i');
    const themeSpan = document.querySelector('#theme-toggle span');

    if (body.classList.contains('dark-theme')) {
        body.classList.remove('dark-theme');
        themeIcon.textContent = '🌙';
        themeSpan.textContent = 'Тема';
        localStorage.setItem('theme', 'light');
    } else {
        body.classList.add('dark-theme');
        themeIcon.textContent = '☀️';
        themeSpan.textContent = 'Тема';
        localStorage.setItem('theme', 'dark');
    }
}

// Применение сохраненной темы
function applySavedTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark'; // По умолчанию тёмная
    const body = document.body;
    const themeIcon = document.querySelector('#theme-toggle i');
    const themeSpan = document.querySelector('#theme-toggle span');

    if (savedTheme === 'dark') {
        body.classList.add('dark-theme');
        if (themeIcon) themeIcon.textContent = '☀️';
        if (themeSpan) themeSpan.textContent = 'Тема';
    } else {
        body.classList.remove('dark-theme');
        if (themeIcon) themeIcon.textContent = '🌙';
        if (themeSpan) themeSpan.textContent = 'Тема';
    }
}

// Работа с IndexedDB для сохранения FileSystemDirectoryHandle
async function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('recipeCalculatorDB', 1);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('handles')) {
                db.createObjectStore('handles');
            }
        };
    });
}

async function saveFolderHandle(handle) {
    if (!db) await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['handles'], 'readwrite');
        const store = transaction.objectStore('handles');
        const request = store.put(handle, 'folderHandle');
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

async function loadFolderHandle() {
    if (!db) await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['handles'], 'readonly');
        const store = transaction.objectStore('handles');
        const request = store.get('folderHandle');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Основные функции
async function initApp() {
    try {
        // Применяем сохраненную тему
        applySavedTheme();

        // Инициализируем IndexedDB
        await initDB();

        // Всегда показываем селектор папки
        showFolderSelector(false);
    } catch (error) {
        console.error('Ошибка при инициализации приложения:', error);
        showFolderSelector(false);
    }

    // Настраиваем обработчики событий
    setupEventListeners();
}

function showFolderSelector(isReturningUser = false) {
    folderSelector.classList.remove('hidden');
    appContent.classList.add('hidden');

    const message = folderSelector.querySelector('p');
    if (isReturningUser) {
        message.textContent = 'Папка была выбрана ранее. Выберите ту же рабочую папку для продолжения работы.';
    } else {
        message.textContent = 'Для работы приложения необходимо выбрать рабочую папку.';
    }
}

function showAppContent() {
    folderSelector.classList.add('hidden');
    appContent.classList.remove('hidden');
    // По умолчанию показываем рецепты
    showSection('recipes');
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('expanded');
}

function showSection(sectionName) {
    // Скрываем все секции
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });

    // Убираем активный класс со всех пунктов меню
    document.querySelectorAll('.sidebar-menu-item').forEach(item => {
        item.classList.remove('active');
    });

    // Показываем выбранную секцию
    const targetSection = document.getElementById(`${sectionName}-section`);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    // Делаем активным соответствующий пункт меню
    const targetMenuItem = document.querySelector(`.sidebar-menu-item[data-section="${sectionName}"]`);
    if (targetMenuItem) {
        targetMenuItem.classList.add('active');
    }
}

function setupEventListeners() {
    // Выбор папки
    selectFolderBtn.addEventListener('click', selectFolder);

    // Sidebar
    document.getElementById('sidebar-toggle').addEventListener('click', toggleSidebar);
    document.querySelectorAll('.sidebar-menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const section = e.currentTarget.dataset.section;
            if (section) {
                showSection(section);
            } else if (e.currentTarget.id === 'theme-toggle') {
                toggleTheme();
            }
        });
    });

    // Ингредиенты
    document.getElementById('add-ingredient-btn').addEventListener('click', addIngredient);
    document.getElementById('ingredient-name').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addIngredient();
    });

    // Рецепты
    document.getElementById('add-recipe-btn').addEventListener('click', showRecipeForm);
    document.getElementById('add-recipe-ingredient-btn').addEventListener('click', addRecipeIngredient);
    document.getElementById('recipe-ingredient-grams').addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.target.disabled) {
            addRecipeIngredient();
        }
    });
    // События для текстового поля выбора ингредиента
    const ingredientInput = document.getElementById('recipe-ingredient-input');
    if (ingredientInput) {
        ingredientInput.addEventListener('input', handleIngredientInput);
        ingredientInput.addEventListener('change', handleIngredientSelect);
        ingredientInput.addEventListener('keydown', handleIngredientKeyDown);
    }
    document.getElementById('save-recipe-btn').addEventListener('click', saveRecipe);

    // Калькулятор
    document.getElementById('calculate-btn').addEventListener('click', calculateRecipe);
    document.getElementById('print-btn').addEventListener('click', printResults);

    // Отслеживание изменений для предпросмотра рецепта
    document.getElementById('recipe-grams-per-item').addEventListener('input', updateRecipePreview);

    // Скрываем боковое меню при клике вне его, если оно развернуто
    document.addEventListener('click', (e) => {
        const sidebar = document.getElementById('sidebar');
        const toggle = document.getElementById('sidebar-toggle');
        // Если меню развернуто и клик был вне sidebar и не на кнопке toggle, сворачиваем меню
        if (sidebar.classList.contains('expanded') && !sidebar.contains(e.target) && e.target !== toggle && !toggle.contains(e.target)) {
            sidebar.classList.remove('expanded');
        }
    });
}

async function selectFolder() {
    try {
        // Запрашиваем разрешение на доступ к папке
        folderHandle = await window.showDirectoryPicker();

        // Сохраняем handle в IndexedDB
        await saveFolderHandle(folderHandle);

        // Сохраняем флаг в localStorage
        localStorage.setItem('folderSelected', 'true');

        // Загружаем данные
        await loadData();
        showAppContent();
        showStatus('Папка успешно выбрана!', 'success');
    } catch (error) {
        console.error('Ошибка при выборе папки:', error);
        if (error.name === 'AbortError') {
            // Пользователь отменил выбор, показываем селектор
            showFolderSelector(false);
        } else {
            showStatus('Ошибка при выборе папки', 'error');
        }
    }
}

async function loadData() {
    try {
        // Загружаем ингредиенты
        ingredients = await loadFile('ingredients.json', []);

        // Загружаем рецепты
        recipes = await loadFile('recipes.json', []);

        // Обновляем интерфейс
        updateIngredientsList();
        updateRecipesList();
        updateRecipeIngredientSelect();
        updateCalculatorRecipeSelect();
    } catch (error) {
        console.error('Ошибка при загрузке данных:', error);
        showStatus('Ошибка при загрузке данных', 'error');
    }
}

async function loadFile(filename, defaultValue) {
    try {
        const fileHandle = await folderHandle.getFileHandle(filename, { create: true });
        const file = await fileHandle.getFile();
        const contents = await file.text();

        if (contents.trim() === '') {
            return defaultValue;
        }

        return JSON.parse(contents);
    } catch (error) {
        console.error(`Ошибка при загрузке файла ${filename}:`, error);
        return defaultValue;
    }
}

async function saveFile(filename, data) {
    try {
        const fileHandle = await folderHandle.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(JSON.stringify(data, null, 2));
        await writable.close();
        return true;
    } catch (error) {
        console.error(`Ошибка при сохранении файла ${filename}:`, error);
        showStatus('Ошибка при сохранении данных', 'error');
        return false;
    }
}

function toggleSection(e) {
    const section = e.currentTarget.parentElement;
    section.classList.toggle('active');
}

// Функция для капитализации первой буквы
function capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// Управление ингредиентами
async function addIngredient() {
    const nameInput = document.getElementById('ingredient-name');
    const name = capitalizeFirst(nameInput.value.trim());

    if (!name) {
        showStatus('Введите название ингредиента', 'error');
        return;
    }

    // Проверяем уникальность
    if (ingredients.some(ing => ing.name.toLowerCase() === name.toLowerCase())) {
        showStatus('Ингредиент с таким названием уже существует', 'error');
        return;
    }

    // Добавляем ингредиент в начало списка
    const newIngredient = {
        id: Date.now(),
        name: name
    };

    ingredients.unshift(newIngredient);
    await saveIngredients();
    updateIngredientsList();
    updateRecipeIngredientSelect();

    // Очищаем поле ввода
    nameInput.value = '';
    nameInput.focus();

    showStatus('Ингредиент добавлен', 'success');
}

async function deleteIngredient(id) {
    // Преобразуем id в число для корректного сравнения
    const ingredientId = typeof id === 'string' ? parseInt(id, 10) : id;

    // Проверяем, используется ли ингредиент в рецептах
    const isUsed = recipes.some(recipe =>
        recipe.ingredients.some(ing => {
            const ingId = typeof ing.ingredientId === 'string' ? parseInt(ing.ingredientId, 10) : ing.ingredientId;
            return ingId === ingredientId;
        })
    );

    if (isUsed) {
        showStatus('Невозможно удалить ингредиент, так как он используется в рецептах', 'error');
        return;
    }

    // Удаляем ингредиент с учетом типа данных
    const beforeCount = ingredients.length;
    ingredients = ingredients.filter(ing => {
        const ingId = typeof ing.id === 'string' ? parseInt(ing.id, 10) : ing.id;
        return ingId !== ingredientId;
    });

    const afterCount = ingredients.length;

    // Проверяем, что ингредиент действительно был удален
    if (beforeCount === afterCount) {
        showStatus('Ошибка: ингредиент не найден', 'error');
        return;
    }

    // Сохраняем и обновляем интерфейс
    const success = await saveIngredients();
    if (success) {
        updateIngredientsList();
        updateRecipeIngredientSelect();
        showStatus('Ингредиент удален', 'success');
    } else {
        // Если сохранение не удалось, восстанавливаем массив
        await loadData();
        showStatus('Ошибка при сохранении. Изменения отменены.', 'error');
    }
}

function updateIngredientsList() {
    const list = document.getElementById('ingredients-list');
    list.innerHTML = '';

    if (ingredients.length === 0) {
        list.innerHTML = '<p style="text-align: center; padding: 20px; color: #666;">Нет добавленных ингредиентов</p>';
        return;
    }

    // Создаем таблицу
    const table = document.createElement('table');
    table.className = 'ingredients-table';
    table.innerHTML = `
        <thead>
            <tr>
                <th>Название ингредиента</th>
                <th style="text-align: center; width: 120px;">Действие</th>
            </tr>
        </thead>
        <tbody id="ingredients-table-body"></tbody>
    `;
    list.appendChild(table);

    const tbody = document.getElementById('ingredients-table-body');

    ingredients.forEach(ingredient => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${ingredient.name}</td>
            <td style="text-align: center;">
                <button class="btn-small btn-danger" data-id="${ingredient.id}">🗑️</button>
            </td>
        `;
        tbody.appendChild(row);

        // Добавляем обработчик удаления
        row.querySelector('button').addEventListener('click', async (e) => {
            const id = e.target.dataset.id;
            if (id) {
                await deleteIngredient(id);
            }
        });
    });
}

async function saveIngredients() {
    const success = await saveFile('ingredients.json', ingredients);
    return success;
}

// Управление рецептами
let currentRecipe = {
    name: '',
    ingredients: [],
    gramsPerItem: 0
};
let editingRecipeId = null;

// Текущий выбранный ингредиент для добавления в рецепт.
// Если null, то ингредиент не выбран. Используется для активации поля грамм и кнопки добавления.
let selectedIngredientId = null;

function updateRecipeIngredientSelect() {
    // Заполняем datalist подсказками, исключая ингредиенты, уже добавленные в текущий рецепт
    const datalist = document.getElementById('ingredient-datalist');
    if (!datalist) return;
    datalist.innerHTML = '';
    const addedIds = currentRecipe.ingredients.map(ing => ing.ingredientId);
    ingredients.forEach(ingredient => {
        if (!addedIds.includes(ingredient.id)) {
            const option = document.createElement('option');
            option.value = ingredient.name;
            datalist.appendChild(option);
        }
    });
    updateGramsFieldState();
}

/**
 * Обработчик ввода текста в поле ингредиента. Очищает выбранный ингредиент,
 * пока пользователь вводит текст, и пытается найти существующий ингредиент
 * с таким названием, чтобы включить поле грамм.
 */
function handleIngredientInput(e) {
    const value = e.target.value.trim();
    selectedIngredientId = null;
    if (value) {
        const existing = ingredients.find(ing => ing.name.toLowerCase() === value.toLowerCase());
        if (existing && !currentRecipe.ingredients.some(i => i.ingredientId === existing.id)) {
            selectedIngredientId = existing.id;
        }
    }
    updateGramsFieldState();
}

/**
 * Обработчик выбора из подсказок (datalist). Устанавливает выбранный
 * ингредиент по названию.
 */
function handleIngredientSelect(e) {
    const value = e.target.value.trim();
    if (!value) {
        selectedIngredientId = null;
    } else {
        const existing = ingredients.find(ing => ing.name.toLowerCase() === value.toLowerCase());
        if (existing && !currentRecipe.ingredients.some(i => i.ingredientId === existing.id)) {
            selectedIngredientId = existing.id;
        } else {
            selectedIngredientId = null;
        }
    }
    updateGramsFieldState();
}

/**
 * Обработчик клавиш в поле ингредиента. При нажатии Enter создаёт
 * новый ингредиент, если такого ещё нет, и выбирает его.
 */
async function handleIngredientKeyDown(e) {
    if (e.key === 'Enter') {
        const input = e.target;
        const value = input.value.trim();
        if (!value) return;
        const existing = ingredients.find(ing => ing.name.toLowerCase() === value.toLowerCase());
        if (!existing) {
            // Создаём новый ингредиент
            const newId = await addIngredientByName(value);
            if (newId !== null && newId !== undefined) {
                selectedIngredientId = newId;
                // Обновляем подсказки после добавления
                updateRecipeIngredientSelect();
                const newIngredient = ingredients.find(ing => ing.id === newId);
                if (newIngredient) {
                    input.value = newIngredient.name;
                }
            }
        } else {
            if (!currentRecipe.ingredients.some(i => i.ingredientId === existing.id)) {
                selectedIngredientId = existing.id;
            }
        }
        updateGramsFieldState();
        e.preventDefault();
    }
}

/**
 * Добавляет новый ингредиент по имени, если такого нет. Возвращает его ID.
 */
async function addIngredientByName(name) {
    const capitalized = capitalizeFirst(name.trim());
    if (!capitalized) return null;
    const existing = ingredients.find(ing => ing.name.toLowerCase() === capitalized.toLowerCase());
    if (existing) {
        return existing.id;
    }
    const newIngredient = { id: Date.now(), name: capitalized };
    ingredients.unshift(newIngredient);
    const success = await saveIngredients();
    if (success) {
        updateIngredientsList();
        updateCalculatorRecipeSelect();
        return newIngredient.id;
    } else {
        // откат если не получилось сохранить
        ingredients.shift();
        showStatus('Ошибка при сохранении нового ингредиента', 'error');
        return null;
    }
}

function updateGramsFieldState() {
    const gramsField = document.getElementById('recipe-ingredient-grams');
    const addButton = document.getElementById('add-recipe-ingredient-btn');
    // Если выбран ингредиент (selectedIngredientId не null), активируем поле грамм и кнопку
    const hasSelection = selectedIngredientId !== null;
    gramsField.disabled = !hasSelection;
    addButton.disabled = !hasSelection;
    if (!hasSelection) {
        gramsField.value = '';
        gramsField.style.opacity = '0.6';
        gramsField.style.cursor = 'not-allowed';
        addButton.style.opacity = '0.6';
        addButton.style.cursor = 'not-allowed';
    } else {
        gramsField.style.opacity = '1';
        gramsField.style.cursor = 'text';
        addButton.style.opacity = '1';
        addButton.style.cursor = 'pointer';
    }
}

function addRecipeIngredient() {
    const grams = parseFloat(document.getElementById('recipe-ingredient-grams').value);
    const ingredientInput = document.getElementById('recipe-ingredient-input');
    const ingredientId = selectedIngredientId;
    // Проверяем, выбран ли ингредиент
    if (!ingredientId || isNaN(ingredientId)) {
        showStatus('Выберите ингредиент', 'error');
        return;
    }
    // Проверяем, что граммы введены корректно
    if (!grams || grams <= 0) {
        showStatus('Введите корректное количество грамм', 'error');
        return;
    }
    // Дополнительная проверка, не добавлен ли уже этот ингредиент
    if (currentRecipe.ingredients.some(ing => ing.ingredientId === ingredientId)) {
        showStatus('Этот ингредиент уже добавлен в рецепт', 'error');
        return;
    }
    // Добавляем ингредиент в текущий рецепт
    currentRecipe.ingredients.push({
        ingredientId: ingredientId,
        grams: grams
    });
    // Сбрасываем выбранный ингредиент и поля
    selectedIngredientId = null;
    if (ingredientInput) {
        ingredientInput.value = '';
    }
    document.getElementById('recipe-ingredient-grams').value = '';
    // Обновляем список подсказок (исключаем добавленный ингредиент) и предпросмотр
    updateRecipeIngredientSelect();
    updateRecipePreview();
}

function deleteRecipeIngredient(ingredientId) {
    currentRecipe.ingredients = currentRecipe.ingredients.filter(
        ing => ing.ingredientId !== ingredientId
    );
    // Обновляем селект, чтобы удаленный ингредиент снова появился в списке
    updateRecipeIngredientSelect();
    updateRecipePreview();
}

function updateRecipePreview() {
    const preview = document.getElementById('recipe-preview');
    const previewContent = document.getElementById('recipe-preview-content');
    const calcInfo = document.getElementById('recipe-calc-info');

    if (currentRecipe.ingredients.length === 0) {
        preview.classList.add('hidden');
        return;
    }

    preview.classList.remove('hidden');
    previewContent.innerHTML = '';

    // Создаем таблицу для ингредиентов
    const table = document.createElement('table');
    table.className = 'recipe-preview-table';
    table.innerHTML = `
        <thead>
            <tr>
                <th>Ингредиент</th>
                <th style="text-align: right;">Вес (г)</th>
                <th style="text-align: center; width: 100px;">Действие</th>
            </tr>
        </thead>
        <tbody id="recipe-preview-table-body"></tbody>
    `;
    previewContent.appendChild(table);

    const tbody = document.getElementById('recipe-preview-table-body');

    // Отображаем ингредиенты рецепта в таблице
    currentRecipe.ingredients.forEach(ing => {
        const ingredient = ingredients.find(i => i.id === ing.ingredientId);
        if (ingredient) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${ingredient.name}</td>
                <td style="text-align: right;"><input type="number" class="ingredient-grams-input" data-id="${ing.ingredientId}" value="${formatNumber(ing.grams)}" min="0" step="0.01"></td>
                <td style="text-align: center;">
                    <button class="btn-small btn-danger" data-id="${ing.ingredientId}">🗑️</button>
                </td>
            `;
            tbody.appendChild(row);

            // Добавляем обработчик изменения веса
            const input = row.querySelector('.ingredient-grams-input');
            input.addEventListener('change', (e) => {
                const id = parseInt(e.target.dataset.id);
                const ing = currentRecipe.ingredients.find(i => i.ingredientId === id);
                if (ing) {
                    ing.grams = parseFloat(e.target.value) || 0;
                    updateRecipePreview();
                }
            });

            // Добавляем обработчик удаления
            row.querySelector('button').addEventListener('click', (e) => {
                deleteRecipeIngredient(parseInt(e.target.dataset.id));
            });
        }
    });

    // Расчет информации о рецепте
    const totalGrams = currentRecipe.ingredients.reduce((sum, ing) => sum + ing.grams, 0);
    const gramsPerItem = parseFloat(document.getElementById('recipe-grams-per-item').value) || 0;

    if (gramsPerItem > 0) {
        const itemsCount = totalGrams / gramsPerItem;
        calcInfo.className = 'recipe-preview-info';
        calcInfo.innerHTML = `
            <div class="recipe-preview-item">
                <span>Общий вес ингредиентов:</span>
                <span>${formatNumber(totalGrams)} г</span>
            </div>
            <div class="recipe-preview-item">
                <span>Вес одного товара:</span>
                <span>${formatNumber(gramsPerItem)} г</span>
            </div>
            <div class="recipe-preview-item">
                <span>Получится товаров:</span>
                <span><strong>${formatNumber(itemsCount)} шт</strong></span>
            </div>
        `;

        currentRecipe.gramsPerItem = gramsPerItem;
    } else {
        calcInfo.innerHTML = '';
        calcInfo.className = '';
        currentRecipe.gramsPerItem = 0;
    }
}

function saveRecipe() {
    const nameInput = document.getElementById('recipe-name');
    const name = capitalizeFirst(nameInput.value.trim());

    if (!name) {
        showStatus('Введите название рецепта', 'error');
        return;
    }

    if (currentRecipe.ingredients.length === 0) {
        showStatus('Добавьте хотя бы один ингредиент', 'error');
        return;
    }

    // Если вес одного товара не задан или меньше либо равен 0,
    // устанавливаем его равным сумме граммов всех ингредиентов.
    if (!currentRecipe.gramsPerItem || currentRecipe.gramsPerItem <= 0) {
        const totalGrams = currentRecipe.ingredients.reduce((sum, ing) => sum + ing.grams, 0);
        currentRecipe.gramsPerItem = totalGrams;
        // Также обновим поле ввода, чтобы пользователь видел рассчитанное значение
        const gramsPerItemInput = document.getElementById('recipe-grams-per-item');
        if (gramsPerItemInput) {
            gramsPerItemInput.value = formatNumber(totalGrams);
        }
    }

    // Создаем новый рецепт
    const newRecipe = {
        id: editingRecipeId || Date.now(),
        name: name,
        ingredients: [...currentRecipe.ingredients],
        gramsPerItem: currentRecipe.gramsPerItem
    };

    // Добавляем или обновляем рецепт
    if (editingRecipeId) {
        const existingIndex = recipes.findIndex(r => r.id === editingRecipeId);
        if (existingIndex >= 0) {
            recipes[existingIndex] = newRecipe;
        }
    } else {
        const existingIndex = recipes.findIndex(r => r.name.toLowerCase() === name.toLowerCase());
        if (existingIndex >= 0) {
            recipes[existingIndex] = newRecipe;
        } else {
            recipes.push(newRecipe);
        }
    }

    saveRecipes();
    updateRecipesList();
    updateCalculatorRecipeSelect();

    // Сбрасываем форму
    resetRecipeForm();

    showStatus('Рецепт сохранен', 'success');
}

function showRecipeForm() {
    const formContainer = document.getElementById('recipe-form-container');
    formContainer.classList.remove('hidden');
    document.getElementById('add-recipe-btn').classList.add('hidden');
}

function hideRecipeForm() {
    const formContainer = document.getElementById('recipe-form-container');
    formContainer.classList.add('hidden');
    document.getElementById('add-recipe-btn').classList.remove('hidden');
}

function resetRecipeForm() {
    document.getElementById('recipe-name').value = '';
    document.getElementById('recipe-grams-per-item').value = '';
    // Очищаем поле ввода ингредиента и сбрасываем выбранный ID
    const ingredientInput = document.getElementById('recipe-ingredient-input');
    if (ingredientInput) {
        ingredientInput.value = '';
    }
    selectedIngredientId = null;
    document.getElementById('recipe-ingredient-grams').value = '';
    currentRecipe = {
        name: '',
        ingredients: [],
        gramsPerItem: 0
    };
    editingRecipeId = null;
    document.getElementById('recipe-preview').classList.add('hidden');
    // Обновляем список подсказок и состояние поля грамм
    updateRecipeIngredientSelect();
    // Скрываем форму добавления рецепта
    hideRecipeForm();
}

function deleteRecipe(id) {
    if (!confirm('Вы уверены, что хотите удалить этот рецепт?')) {
        return;
    }

    recipes = recipes.filter(recipe => recipe.id !== id);
    saveRecipes();
    updateRecipesList();
    updateCalculatorRecipeSelect();

    showStatus('Рецепт удален', 'success');
}

function editRecipe(id) {
    const recipe = recipes.find(r => r.id === id);
    if (!recipe) return;

    // Заполняем форму данными рецепта
    document.getElementById('recipe-name').value = recipe.name;
    document.getElementById('recipe-grams-per-item').value = recipe.gramsPerItem;
    currentRecipe = {
        name: recipe.name,
        ingredients: [...recipe.ingredients],
        gramsPerItem: recipe.gramsPerItem
    };
    editingRecipeId = id;

    // Обновляем селект и предпросмотр
    updateRecipeIngredientSelect();
    updateRecipePreview();

    // Показываем форму
    showRecipeForm();
}

function getIngredientsText(recipe) {
    return recipe.ingredients.map(ing => {
        const ingredient = ingredients.find(i => i.id === ing.ingredientId);
        return ingredient ? `${ingredient.name}: ${formatNumber(ing.grams)}г` : '';
    }).join('<br>');
}

function updateRecipesList() {
    const list = document.getElementById('recipes-list');
    list.innerHTML = '';

    if (recipes.length === 0) {
        list.innerHTML = '<p style="text-align: center; padding: 20px; color: #666;">Нет сохраненных рецептов</p>';
        return;
    }

    // Создаем таблицу
    const table = document.createElement('table');
    table.className = 'recipes-table';
    table.innerHTML = `
        <thead>
            <tr>
                <th>Название рецепта</th>
                <th>Ингредиенты</th>
                <th>Вес товара (г/шт)</th>
                <th style="text-align: center; width: 180px;">Действие</th>
            </tr>
        </thead>
        <tbody id="recipes-table-body"></tbody>
    `;
    list.appendChild(table);

    const tbody = document.getElementById('recipes-table-body');

    recipes.forEach(recipe => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${recipe.name}</strong></td>
            <td>${getIngredientsText(recipe)}</td>
            <td>${formatNumber(recipe.gramsPerItem)}</td>
            <td style="text-align: center; display: flex; gap: 8px;">
                <button class="btn-small btn-secondary" data-id="${recipe.id}" style="flex: 1;">✏️</button>
                <button class="btn-small btn-danger" data-id="${recipe.id}" style="flex: 1;">🗑️</button>
            </td>
        `;
        tbody.appendChild(row);

        // Добавляем обработчики
        const editBtn = row.querySelector('.btn-secondary');
        const deleteBtn = row.querySelector('.btn-danger');

        editBtn.addEventListener('click', (e) => {
            editRecipe(parseInt(e.target.dataset.id));
        });

        deleteBtn.addEventListener('click', (e) => {
            deleteRecipe(parseInt(e.target.dataset.id));
        });
    });
}

async function saveRecipes() {
    const success = await saveFile('recipes.json', recipes);
    if (success) {
        showStatus('Рецепты сохранены', 'success');
    }
}

function updateCalculatorRecipeSelect() {
    const select = document.getElementById('calculator-recipe-select');
    const calculateBtn = document.getElementById('calculate-btn');
    select.innerHTML = '';

    if (recipes.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'Нет доступных рецептов';
        select.appendChild(option);
        select.disabled = true;
        calculateBtn.disabled = true;
    } else {
        recipes.forEach(recipe => {
            const option = document.createElement('option');
            option.value = recipe.id;
            option.textContent = recipe.name;
            select.appendChild(option);
        });
        select.disabled = false;
        calculateBtn.disabled = false;
    }
}

// Калькулятор
function calculateRecipe() {
    const recipeId = parseInt(document.getElementById('calculator-recipe-select').value);
    const quantity = parseFloat(document.getElementById('calculator-quantity').value);

    console.log('calculateRecipe called with recipeId:', recipeId, 'quantity:', quantity);
    console.log('recipes:', recipes);
    console.log('ingredients:', ingredients);

    if (!recipeId || !quantity || quantity <= 0) {
        showStatus('Выберите рецепт и укажите количество', 'error');
        return;
    }

    const recipe = recipes.find(r => r.id === recipeId);
    console.log('found recipe:', recipe);
    if (!recipe) {
        showStatus('Рецепт не найден', 'error');
        return;
    }

    // Расчет
    const totalRecipeGrams = recipe.ingredients.reduce((sum, ing) => sum + ing.grams, 0);
    const itemsFromRecipe = totalRecipeGrams / recipe.gramsPerItem;

    console.log('recipe.ingredients:', recipe.ingredients);
    console.log('totalRecipeGrams:', totalRecipeGrams, 'itemsFromRecipe:', itemsFromRecipe);

    const resultsBody = document.getElementById('calculator-results-body');
    resultsBody.innerHTML = '';

    recipe.ingredients.forEach(ing => {
        console.log('processing ingredient:', ing);
        const ingredient = ingredients.find(i => i.id === ing.ingredientId);
        console.log('found ingredient:', ingredient);
        if (ingredient) {
            // Расчет необходимого количества: масштабируем рецепт под указанное количество товаров
            const neededGrams = (ing.grams * quantity) / itemsFromRecipe;
            console.log('neededGrams:', neededGrams);
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${ingredient.name}</td>
                <td>${formatNumber(neededGrams)} г</td>
            `;
            resultsBody.appendChild(row);
        } else {
            console.log('ingredient not found for id:', ing.ingredientId);
        }
    });

    // Обновляем блок сводки результатов
    const summaryDiv = document.getElementById('calculator-summary');
    if (summaryDiv) {
        summaryDiv.innerHTML = `
            <div class="summary-item">
                <span>Рецепт:</span>
                <span><strong>${recipe.name}</strong></span>
            </div>
            <div class="summary-item">
                <span>Товаров на выходе:</span>
                <span>${formatNumber(quantity)} шт</span>
            </div>
            <div class="summary-item">
                <span>Граммов на 1 товар:</span>
                <span>${formatNumber(recipe.gramsPerItem)} г</span>
            </div>
        `;
    }

    // Показываем блок результатов и кнопку распечатать после успешного расчета
    document.getElementById('calculator-results').classList.remove('hidden');
    document.getElementById('print-btn').classList.remove('hidden');
}

function printResults() {
    const results = document.getElementById('calculator-results').cloneNode(true);
    const printWindow = window.open('', '_blank');
    printWindow.document.write('<html><head><title>Print</title><style>body { margin: 0; padding: 0; font-family: \'Montserrat\', sans-serif; } table { width: 100%; border-collapse: collapse; margin-top: 16px; } th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ccc; font-size: 18px; } th { background-color: #f9f9f9; font-weight: 600; font-size: 24px; } td { font-size: 22px; } .calculator-results-summary { margin-top: 20px; padding-top: 20px; border-top: 2px solid #ccc; } .summary-item { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; font-size: 20px; font-weight: 500; } .summary-item strong { font-weight: 600; font-size: 22px; }</style></head><body>');
    printWindow.document.body.appendChild(results);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.print();
    printWindow.close();
}

// Вспомогательные функции
function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = `status ${type}`;

    // Автоматически скрываем сообщение через 3 секунды
    setTimeout(() => {
        statusMessage.className = 'status';
    }, 3000);
}

// Функция для форматирования чисел с округлением до 2 знаков в большую сторону
function formatNumber(num) {
    // Округляем до 2 знаков после запятой в большую сторону
    const rounded = Math.ceil(num * 100) / 100;

    // Преобразуем в строку и убираем лишние нули
    let str = rounded.toString();

    // Если есть дробная часть
    if (str.includes('.')) {
        // Убираем лишние нули в конце
        str = str.replace(/\.?0+$/, '');

        // Если после удаления нулей осталась только точка, убираем и ее
        if (str.endsWith('.')) {
            str = str.slice(0, -1);
        }
    }

    return str;
}
