/**
 * Recipe Calculator Application
 * Professional tool for calculating ingredient quantities in recipes
 */

// ===== CONSTANTS =====
const STORAGE_KEYS = {
    FOLDER_SELECTED: 'folderSelected'
};

const MESSAGES = {
    // Folder operations
    FOLDER_REQUIRED: 'Для работы приложения необходимо выбрать рабочую папку.',
    FOLDER_RETURN: 'Папка была выбрана ранее. Выберите ту же рабочую папку для продолжения работы.',
    FOLDER_SUCCESS: 'Папка успешно выбрана!',
    FOLDER_ERROR: 'Ошибка при выборе папки',

    // Data operations
    LOAD_ERROR: 'Ошибка при загрузке данных',
    SAVE_ERROR: 'Ошибка при сохранении данных',

    // Ingredients
    INGREDIENT_ADDED: 'Ингредиент добавлен',
    INGREDIENT_EXISTS: 'Ингредиент с таким названием уже существует',
    INGREDIENT_DELETED: 'Ингредиент удален',
    INGREDIENT_USED: 'Невозможно удалить ингредиент, так как он используется в рецептах',
    INGREDIENT_NOT_FOUND: 'Ошибка: ингредиент не найден',
    INGREDIENT_NAME_REQUIRED: 'Введите название ингредиента',

    // Recipes
    RECIPE_SAVED: 'Рецепт сохранен',
    RECIPE_DELETED: 'Рецепт удален',
    RECIPE_NAME_REQUIRED: 'Введите название рецепта',
    RECIPE_INGREDIENTS_REQUIRED: 'Добавьте хотя бы один ингредиент',
    RECIPE_SELECT_INGREDIENT: 'Выберите ингредиент',
    RECIPE_INVALID_GRAMS: 'Введите корректное количество грамм',
    RECIPE_INGREDIENT_EXISTS: 'Этот ингредиент уже добавлен в рецепт',
    RECIPE_NEW_INGREDIENT_ERROR: 'Ошибка при сохранении нового ингредиента',
    RECIPE_WEIGHT_REQUIRED: 'Укажите вес готового изделия',

    // Calculator
    CALCULATOR_SELECT: 'Выберите рецепт и укажите количество',
    CALCULATOR_NOT_FOUND: 'Рецепт не найден',
    CALCULATOR_SUCCESS: 'Расчет выполнен успешно',

    // General
    RECIPES_SAVED: 'Рецепты сохранены',
    CONFIRM_DELETE: 'Вы уверены, что хотите удалить этот элемент?'
};

const STATUS_TIMEOUT = 4000;
const ANIMATION_DURATION = 300;

// ===== APPLICATION STATE =====
let appState = {
    folderHandle: null,
    ingredients: [],
    filteredIngredients: [],
    recipes: [],
    db: null,
    currentRecipe: {
        name: '',
        ingredients: [],
        gramsPerItem: 0
    },
    editingRecipeId: null,
    selectedIngredientId: null,
    selectedRecipeId: null,
    isLoading: false
};

// ===== DOM CACHE =====
// Cache frequently used DOM elements for better performance
const DOM = {
    // Main containers
    mainContent: document.getElementById('main-content'),
    appContainer: document.querySelector('.app-container'),

    // Welcome screen
    folderSelector: document.getElementById('folder-selector'),
    selectFolderBtn: document.getElementById('select-folder-btn'),

    // App content
    appContent: document.getElementById('app-content'),

    // Calculator section
    calculatorSection: document.getElementById('calculator-section'),
    recipeInput: document.getElementById('calculator-recipe-input'),
    quantityInput: document.getElementById('calculator-quantity'),
    calculateBtn: document.getElementById('calculate-btn'),
    calculatorResults: document.getElementById('calculator-results'),
    printBtn: document.getElementById('print-btn'),

    // Recipes section
    recipesSection: document.getElementById('recipes-section'),
    recipesList: document.getElementById('recipes-list'),
    addRecipeBtn: document.getElementById('add-recipe-btn'),
    recipeForm: document.getElementById('recipe-form-container'),
    recipeNameInput: document.getElementById('recipe-name'),
    ingredientInput: document.getElementById('recipe-ingredient-input'),
    gramsInput: document.getElementById('recipe-ingredient-grams'),
    addIngredientBtn: document.getElementById('add-recipe-ingredient-btn'),
    gramsPerItemInput: document.getElementById('recipe-grams-per-item'),
    recipePreview: document.getElementById('recipe-preview'),
    saveRecipeBtn: document.getElementById('save-recipe-btn'),

    // Ingredients section
    ingredientsSection: document.getElementById('ingredients-section'),
    ingredientsList: document.getElementById('ingredients-list'),
    ingredientNameInput: document.getElementById('ingredient-name'),
    ingredientSearch: document.getElementById('ingredient-search'),
    addIngredientBtn: document.getElementById('add-ingredient-btn'),

    // Status and loading
    statusMessage: document.getElementById('status-message'),
    loadingIndicator: document.getElementById('loading-indicator')
};

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', initApp);

/**
 * Initialize the application
 */
async function initApp() {
    try {
        setLoadingState(true);

        // Initialize IndexedDB
        appState.db = await initDB();

        // Check if folder was previously selected
        const folderSelected = localStorage.getItem(STORAGE_KEYS.FOLDER_SELECTED);
        if (folderSelected === 'true') {
            // Try to load saved folder handle
            const savedHandle = await loadFolderHandle();
            if (savedHandle) {
                appState.folderHandle = savedHandle;
                await loadApplicationData();
                showAppContent();
            } else {
                showWelcomeScreen(false);
            }
        } else {
            showWelcomeScreen(false);
        }

        // Setup event listeners
        setupEventListeners();

    } catch (error) {
        console.error('Application initialization error:', error);
        showWelcomeScreen(false);
        showStatus(MESSAGES.LOAD_ERROR, 'error');
    } finally {
        setLoadingState(false);
    }
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
    // Welcome screen
    DOM.selectFolderBtn?.addEventListener('click', handleFolderSelection);

    // Calculator
    DOM.recipeInput?.addEventListener('input', handleRecipeInput);
    DOM.recipeInput?.addEventListener('change', handleRecipeSelect);
    DOM.calculateBtn?.addEventListener('click', handleCalculate);
    DOM.printBtn?.addEventListener('click', handlePrint);

    // Recipes
    DOM.addRecipeBtn?.addEventListener('click', showRecipeForm);
    DOM.saveRecipeBtn?.addEventListener('click', handleSaveRecipe);
    DOM.addIngredientBtn?.addEventListener('click', handleAddRecipeIngredient);

    // Recipe form inputs
    DOM.gramsPerItemInput?.addEventListener('input', updateRecipePreview);
    DOM.ingredientInput?.addEventListener('input', handleIngredientInput);
    DOM.ingredientInput?.addEventListener('change', handleIngredientSelect);
    DOM.ingredientInput?.addEventListener('keydown', handleIngredientKeyDown);
    DOM.gramsInput?.addEventListener('keydown', handleGramsKeyDown);

    // Ingredients
    DOM.addIngredientBtn?.addEventListener('click', handleAddIngredient);
    DOM.ingredientNameInput?.addEventListener('keydown', handleIngredientNameKeyDown);
    DOM.ingredientSearch?.addEventListener('input', handleIngredientSearch);

    // Global events
    window.addEventListener('beforeunload', handleBeforeUnload);
}

/**
 * Handle folder selection
 */
async function handleFolderSelection() {
    try {
        setLoadingState(true);
        appState.folderHandle = await window.showDirectoryPicker();
        await saveFolderHandle(appState.folderHandle);
        localStorage.setItem(STORAGE_KEYS.FOLDER_SELECTED, 'true');

        await loadApplicationData();
        showAppContent();
        showStatus(MESSAGES.FOLDER_SUCCESS, 'success');

    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error('Folder selection error:', error);
            showStatus(MESSAGES.FOLDER_ERROR, 'error');
        }
    } finally {
        setLoadingState(false);
    }
}





/**
 * Handle before unload to warn about unsaved changes
 */
function handleBeforeUnload(event) {
    // Could add logic to warn about unsaved recipe changes
    // For now, just a placeholder
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

var ingredients = [];
var recipes = [];
var folderHandle = null;
var currentRecipe = {
    name: '',
    ingredients: [],
    gramsPerItem: 0
};
var editingRecipeId = null;
var selectedIngredientId = null;

// ===== UTILITY FUNCTIONS =====

/**
 * Format number with proper rounding and decimal places
 */
function formatNumber(num) {
    if (!num || isNaN(num)) return '0';

    // Round up to 2 decimal places
    const rounded = Math.ceil(num * 100) / 100;

    // Convert to string and remove trailing zeros
    let str = rounded.toString();

    if (str.includes('.')) {
        str = str.replace(/\.?0+$/, '');
        if (str.endsWith('.')) {
            str = str.slice(0, -1);
        }
    }

    return str;
}

/**
 * Capitalize first letter of string
 */
function capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Set loading state for the application
 */
function setLoadingState(isLoading) {
    appState.isLoading = isLoading;

    if (DOM.loadingIndicator) {
        if (isLoading) {
            DOM.loadingIndicator.classList.remove('hidden');
        } else {
            DOM.loadingIndicator.classList.add('hidden');
        }
    }

    // Disable/enable interactive elements during loading
    const interactiveElements = document.querySelectorAll('button, input, select');
    interactiveElements.forEach(element => {
        if (!element.closest('.status-message')) {
            element.disabled = isLoading;
        }
    });
}

/**
 * Show status message to user
 */
function showStatus(message, type = 'info') {
    if (!DOM.statusMessage) return;

    DOM.statusMessage.textContent = message;
    DOM.statusMessage.className = `status-message ${type}`;
    DOM.statusMessage.style.transform = 'translateY(0)';
    DOM.statusMessage.style.opacity = '1';

    // Auto-hide after timeout
    setTimeout(() => {
        hideStatus();
    }, STATUS_TIMEOUT);
}

/**
 * Hide status message
 */
function hideStatus() {
    if (!DOM.statusMessage) return;

    DOM.statusMessage.style.transform = 'translateY(100px)';
    DOM.statusMessage.style.opacity = '0';
}

// ===== MISSING EVENT HANDLERS =====

/**
 * Handle ingredient input change
 */
function handleIngredientInput(event) {
    const inputValue = event.target.value.trim();
    if (inputValue === '') {
        appState.selectedIngredientId = null;
        return;
    }

    // Find ingredient by name
    const ingredient = appState.ingredients.find(i => i.name.toLowerCase() === inputValue.toLowerCase());
    if (ingredient) {
        appState.selectedIngredientId = ingredient.id;
    } else {
        appState.selectedIngredientId = null;
    }
}

/**
 * Handle recipe input change
 */
function handleRecipeInput(event) {
    const inputValue = event.target.value.trim();
    if (inputValue === '') {
        appState.selectedRecipeId = null;
        return;
    }

    // Find recipe by name
    const recipe = appState.recipes.find(r => r.name.toLowerCase() === inputValue.toLowerCase());
    if (recipe) {
        appState.selectedRecipeId = recipe.id;
    } else {
        appState.selectedRecipeId = null;
    }
}

/**
 * Handle ingredient select change
 */
function handleIngredientSelect(event) {
    const inputValue = event.target.value.trim();
    if (inputValue === '') {
        appState.selectedIngredientId = null;
        return;
    }

    // Find ingredient by name
    const ingredient = appState.ingredients.find(i => i.name.toLowerCase() === inputValue.toLowerCase());
    if (ingredient) {
        appState.selectedIngredientId = ingredient.id;
        // Set the input value to the exact ingredient name
        if (DOM.ingredientInput) {
            DOM.ingredientInput.value = ingredient.name;
        }
    } else {
        appState.selectedIngredientId = null;
    }

    updateGramsFieldState();
}

/**
 * Handle recipe select change
 */
function handleRecipeSelect(event) {
    const inputValue = event.target.value.trim();
    if (inputValue === '') {
        appState.selectedRecipeId = null;
        return;
    }

    // Find recipe by name
    const recipe = appState.recipes.find(r => r.name.toLowerCase() === inputValue.toLowerCase());
    if (recipe) {
        appState.selectedRecipeId = recipe.id;
        // Set the input value to the exact recipe name
        if (DOM.recipeInput) {
            DOM.recipeInput.value = recipe.name;
        }
    } else {
        appState.selectedRecipeId = null;
    }
}

/**
 * Handle ingredient input keydown (for recipe ingredient selection)
 */
function handleIngredientKeyDown(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        handleAddRecipeIngredient();
    }
}

/**
 * Handle ingredient name input keydown (for adding new ingredients)
 */
function handleIngredientNameKeyDown(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        handleAddIngredient();
    }
}

/**
 * Handle grams input keydown
 */
function handleGramsKeyDown(event) {
    if (event.key === 'Enter' && !event.target.disabled) {
        event.preventDefault();
        handleAddRecipeIngredient();
    }
}

/**
 * Handle ingredient search input
 */
function handleIngredientSearch(event) {
    const query = event.target.value.toLowerCase().trim();
    if (query === '') {
        appState.filteredIngredients = appState.ingredients.slice();
    } else {
        appState.filteredIngredients = appState.ingredients.filter(ing =>
            ing.name.toLowerCase().includes(query)
        );
    }
    updateIngredientsList();
}

/**
 * Handle add ingredient button click
 */
async function handleAddIngredient() {
    const name = DOM.ingredientNameInput?.value?.trim();
    if (!name) {
        showStatus(MESSAGES.INGREDIENT_NAME_REQUIRED, 'error');
        return;
    }

    const capitalizedName = capitalizeFirst(name);

    // Check uniqueness
    if (appState.ingredients.some(ing => ing.name.toLowerCase() === capitalizedName.toLowerCase())) {
        showStatus(MESSAGES.INGREDIENT_EXISTS, 'error');
        return;
    }

    // Add ingredient
    const newIngredient = {
        id: Date.now(),
        name: capitalizedName
    };

    appState.ingredients.unshift(newIngredient);
    await saveIngredients();
    appState.filteredIngredients = appState.ingredients.slice();
    updateIngredientsList();
    updateRecipeIngredientSelect();

    // Clear input
    if (DOM.ingredientNameInput) {
        DOM.ingredientNameInput.value = '';
        DOM.ingredientNameInput.focus();
    }

    showStatus(MESSAGES.INGREDIENT_ADDED, 'success');
}

/**
 * Handle add recipe ingredient button click
 */
function handleAddRecipeIngredient() {
    const grams = parseFloat(DOM.gramsInput?.value);
    const ingredientId = appState.selectedIngredientId;

    if (!ingredientId) {
        showStatus(MESSAGES.RECIPE_SELECT_INGREDIENT, 'error');
        return;
    }

    if (!grams || grams <= 0) {
        showStatus(MESSAGES.RECIPE_INVALID_GRAMS, 'error');
        return;
    }

    // Check if ingredient already exists in recipe
    if (appState.currentRecipe.ingredients.some(ing => ing.ingredientId === ingredientId)) {
        showStatus(MESSAGES.RECIPE_INGREDIENT_EXISTS, 'error');
        return;
    }

    // Add ingredient to recipe
    appState.currentRecipe.ingredients.push({
        ingredientId: ingredientId,
        grams: grams
    });

    // Reset form
    appState.selectedIngredientId = null;
    if (DOM.ingredientInput) DOM.ingredientInput.value = '';
    if (DOM.gramsInput) DOM.gramsInput.value = '';

    updateRecipeIngredientSelect();
    updateRecipePreview();

    showStatus('Ингредиент добавлен в рецепт', 'success');
}

/**
 * Handle save recipe button click
 */
async function handleSaveRecipe() {
    const name = DOM.recipeNameInput?.value?.trim();
    if (!name) {
        showStatus(MESSAGES.RECIPE_NAME_REQUIRED, 'error');
        return;
    }

    if (appState.currentRecipe.ingredients.length === 0) {
        showStatus(MESSAGES.RECIPE_INGREDIENTS_REQUIRED, 'error');
        return;
    }

    // Set default grams per item if not set
    if (!appState.currentRecipe.gramsPerItem || appState.currentRecipe.gramsPerItem <= 0) {
        const totalGrams = appState.currentRecipe.ingredients.reduce((sum, ing) => sum + ing.grams, 0);
        appState.currentRecipe.gramsPerItem = totalGrams;
        if (DOM.gramsPerItemInput) {
            DOM.gramsPerItemInput.value = formatNumber(totalGrams);
        }
    }

    // Create new recipe
    const newRecipe = {
        id: appState.editingRecipeId || Date.now(),
        name: capitalizeFirst(name),
        ingredients: [...appState.currentRecipe.ingredients],
        gramsPerItem: appState.currentRecipe.gramsPerItem
    };

    // Add or update recipe
    if (appState.editingRecipeId) {
        const existingIndex = appState.recipes.findIndex(r => r.id === appState.editingRecipeId);
        if (existingIndex >= 0) {
            appState.recipes[existingIndex] = newRecipe;
        }
    } else {
        const existingIndex = appState.recipes.findIndex(r => r.name.toLowerCase() === newRecipe.name.toLowerCase());
        if (existingIndex >= 0) {
            appState.recipes[existingIndex] = newRecipe;
        } else {
            appState.recipes.push(newRecipe);
        }
    }

    await saveRecipes();
    updateRecipesList();
    updateCalculatorRecipeSelect();

    resetRecipeForm();
    showStatus(MESSAGES.RECIPE_SAVED, 'success');
}

/**
 * Handle calculate button click
 */
function handleCalculate() {
    const recipeId = appState.selectedRecipeId;
    const quantity = parseFloat(DOM.quantityInput?.value);

    if (!recipeId || !quantity || quantity <= 0) {
        showStatus(MESSAGES.CALCULATOR_SELECT, 'error');
        return;
    }

    const recipe = appState.recipes.find(r => r.id === recipeId);
    if (!recipe) {
        showStatus(MESSAGES.CALCULATOR_NOT_FOUND, 'error');
        return;
    }

    // Calculate
    const totalRecipeGrams = recipe.ingredients.reduce((sum, ing) => sum + ing.grams, 0);
    const itemsFromRecipe = totalRecipeGrams / recipe.gramsPerItem;

    const resultsBody = DOM.calculatorResults?.querySelector('#calculator-results-body');
    if (resultsBody) {
        resultsBody.innerHTML = '';

        recipe.ingredients.forEach(ing => {
            const ingredient = appState.ingredients.find(i => i.id === ing.ingredientId);
            if (ingredient) {
                const neededGrams = (ing.grams * quantity) / itemsFromRecipe;
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${ingredient.name}</td>
                    <td>${formatNumber(neededGrams)} г</td>
                `;
                resultsBody.appendChild(row);
            }
        });
    }

    // Update summary
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

    // Show results
    if (DOM.calculatorResults) {
        DOM.calculatorResults.classList.remove('hidden');
    }
    if (DOM.printBtn) {
        const printBtnContainer = DOM.printBtn.closest('.results-actions');
        if (printBtnContainer) {
            printBtnContainer.classList.remove('hidden');
        }
    }

    showStatus(MESSAGES.CALCULATOR_SUCCESS, 'success');
}

/**
 * Handle print button click
 */
function handlePrint() {
    const results = DOM.calculatorResults?.cloneNode(true);
    if (!results) return;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head>
                <title>Результаты расчета</title>
                <style>
                    body { margin: 0; padding: 20px; font-family: 'Montserrat', sans-serif; }
                    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
                    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ccc; font-size: 18px; }
                    th { background-color: #f9f9f9; font-weight: 600; font-size: 20px; }
                    td { font-size: 18px; }
                    .summary-item { display: flex; justify-content: space-between; margin-bottom: 8px; }
                    .summary-item strong { font-weight: 600; }
                    @media print { body { margin: 0; } }
                </style>
            </head>
            <body>
    `);
    printWindow.document.body.appendChild(results);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.print();
    printWindow.close();
}

// ===== UI MANAGEMENT =====

/**
 * Show welcome screen for folder selection
 */
function showWelcomeScreen(isReturningUser = false) {
    if (DOM.folderSelector) {
        DOM.folderSelector.classList.remove('hidden');
        DOM.appContent?.classList.add('hidden');

        const message = DOM.folderSelector.querySelector('p');
        if (message) {
            message.textContent = isReturningUser ? MESSAGES.FOLDER_RETURN : MESSAGES.FOLDER_REQUIRED;
        }
    }
}

/**
 * Show main application content
 */
function showAppContent() {
    DOM.folderSelector?.classList.add('hidden');
    DOM.appContent?.classList.remove('hidden');

    // Show all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.add('active');
    });
}

/**
 * Show specific section and update navigation
 */
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });

    // Remove active class from all menu items
    document.querySelectorAll('.sidebar-menu-item').forEach(item => {
        item.classList.remove('active');
    });

    // Show target section
    const targetSection = document.getElementById(`${sectionName}-section`);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    // Activate corresponding menu item
    const targetMenuItem = document.querySelector(`.sidebar-menu-item[data-section="${sectionName}"]`);
    if (targetMenuItem) {
        targetMenuItem.classList.add('active');
        targetMenuItem.setAttribute('aria-current', 'page');
    }
}

// ===== DATA MANAGEMENT =====

/**
 * Load application data from files
 */
async function loadApplicationData() {
    try {
        appState.ingredients = await loadFile('ingredients.json', []);
        appState.filteredIngredients = appState.ingredients.slice();
        appState.recipes = await loadFile('recipes.json', []);

        updateIngredientsList();
        updateRecipesList();
        updateRecipeIngredientSelect();
        updateCalculatorRecipeSelect();
    } catch (error) {
        console.error('Error loading application data:', error);
        showStatus(MESSAGES.LOAD_ERROR, 'error');
    }
}

/**
 * Load file from selected folder
 */
async function loadFile(filename, defaultValue = []) {
    try {
        const fileHandle = await appState.folderHandle.getFileHandle(filename, { create: true });
        const file = await fileHandle.getFile();
        const contents = await file.text();

        if (contents.trim() === '') {
            return defaultValue;
        }

        return JSON.parse(contents);
    } catch (error) {
        console.error(`Error loading file ${filename}:`, error);
        return defaultValue;
    }
}

/**
 * Save file to selected folder
 */
async function saveFile(filename, data) {
    try {
        const fileHandle = await appState.folderHandle.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(JSON.stringify(data, null, 2));
        await writable.close();
        return true;
    } catch (error) {
        console.error(`Error saving file ${filename}:`, error);
        showStatus(MESSAGES.SAVE_ERROR, 'error');
        return false;
    }
}

/**
 * Save ingredients to file
 */
async function saveIngredients() {
    const success = await saveFile('ingredients.json', appState.ingredients);
    return success;
}

/**
 * Save recipes to file
 */
async function saveRecipes() {
    const success = await saveFile('recipes.json', appState.recipes);
    if (success) {
        showStatus(MESSAGES.RECIPES_SAVED, 'success');
    }
    return success;
}

// ===== INGREDIENTS MANAGEMENT =====

/**
 * Update ingredients list display
 */
function updateIngredientsList() {
    if (!DOM.ingredientsList) return;

    DOM.ingredientsList.innerHTML = '';

    if (appState.filteredIngredients.length === 0) {
        DOM.ingredientsList.innerHTML = '<p style="text-align: center; padding: 20px; color: #666;">Нет добавленных ингредиентов</p>';
        return;
    }

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
    DOM.ingredientsList.appendChild(table);

    const tbody = document.getElementById('ingredients-table-body');
    if (!tbody) return;

    appState.filteredIngredients.forEach(ingredient => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${ingredient.name}</td>
            <td style="text-align: center;">
                <button class="btn-small btn-danger" data-id="${ingredient.id}">🗑️</button>
            </td>
        `;
        tbody.appendChild(row);

        row.querySelector('button').addEventListener('click', async (e) => {
            await deleteIngredient(parseInt(e.target.dataset.id));
        });
    });
}

/**
 * Delete ingredient
 */
async function deleteIngredient(id) {
    // Check if ingredient is used in recipes
    const isUsed = appState.recipes.some(recipe =>
        recipe.ingredients.some(ing => ing.ingredientId === id)
    );

    if (isUsed) {
        showStatus(MESSAGES.INGREDIENT_USED, 'error');
        return;
    }

    appState.ingredients = appState.ingredients.filter(ing => ing.id !== id);
    const success = await saveIngredients();
    if (success) {
        appState.filteredIngredients = appState.ingredients.slice();
        updateIngredientsList();
        updateRecipeIngredientSelect();
        showStatus(MESSAGES.INGREDIENT_DELETED, 'success');
    }
}

// ===== RECIPES MANAGEMENT =====

/**
 * Show recipe form
 */
function showRecipeForm() {
    if (DOM.recipeForm) DOM.recipeForm.classList.remove('hidden');
    if (DOM.addRecipeBtn) DOM.addRecipeBtn.classList.add('hidden');
}

/**
 * Hide recipe form
 */
function hideRecipeForm() {
    if (DOM.recipeForm) DOM.recipeForm.classList.add('hidden');
    if (DOM.addRecipeBtn) DOM.addRecipeBtn.classList.remove('hidden');
}

/**
 * Reset recipe form
 */
function resetRecipeForm() {
    if (DOM.recipeNameInput) DOM.recipeNameInput.value = '';
    if (DOM.gramsPerItemInput) DOM.gramsPerItemInput.value = '';
    if (DOM.ingredientInput) DOM.ingredientInput.value = '';
    if (DOM.gramsInput) DOM.gramsInput.value = '';

    appState.currentRecipe = {
        name: '',
        ingredients: [],
        gramsPerItem: 0
    };
    appState.editingRecipeId = null;
    appState.selectedIngredientId = null;

    if (DOM.recipePreview) DOM.recipePreview.classList.add('hidden');

    updateRecipeIngredientSelect();
    hideRecipeForm();
}

/**
 * Update recipe ingredient select options
 */
function updateRecipeIngredientSelect() {
    const datalist = document.getElementById('ingredient-datalist');
    if (!datalist) return;

    datalist.innerHTML = '';
    const addedIds = appState.currentRecipe.ingredients.map(ing => ing.ingredientId);

    appState.ingredients.forEach(ingredient => {
        if (!addedIds.includes(ingredient.id)) {
            const option = document.createElement('option');
            option.value = ingredient.name;
            datalist.appendChild(option);
        }
    });

    updateGramsFieldState();
}

/**
 * Update grams field state based on ingredient selection
 */
function updateGramsFieldState() {
    const gramsField = DOM.gramsInput;
    const addButton = DOM.addIngredientBtn;

    if (!gramsField || !addButton) return;

    const hasSelection = appState.selectedIngredientId !== null;

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

/**
 * Update recipe preview
 */
function updateRecipePreview() {
    const preview = DOM.recipePreview;
    const previewContent = document.getElementById('recipe-preview-content');
    const calcInfo = document.getElementById('recipe-calc-info');

    if (!preview || !previewContent || !calcInfo) return;

    if (appState.currentRecipe.ingredients.length === 0) {
        preview.classList.add('hidden');
        return;
    }

    preview.classList.remove('hidden');
    previewContent.innerHTML = '';

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
    if (!tbody) return;

    appState.currentRecipe.ingredients.forEach(ing => {
        const ingredient = appState.ingredients.find(i => i.id === ing.ingredientId);
        if (ingredient) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${ingredient.name}</td>
                <td style="text-align: right;">
                    <input type="number" class="ingredient-grams-input" data-id="${ing.ingredientId}" value="${formatNumber(ing.grams)}" min="0" step="0.01">
                </td>
                <td style="text-align: center;">
                    <button class="btn-small btn-danger" data-id="${ing.ingredientId}">🗑️</button>
                </td>
            `;
            tbody.appendChild(row);

            const input = row.querySelector('.ingredient-grams-input');
            input.addEventListener('change', (e) => {
                const id = parseInt(e.target.dataset.id);
                const ing = appState.currentRecipe.ingredients.find(i => i.ingredientId === id);
                if (ing) {
                    ing.grams = parseFloat(e.target.value) || 0;
                    updateRecipePreview();
                }
            });

            row.querySelector('button').addEventListener('click', (e) => {
                deleteRecipeIngredient(parseInt(e.target.dataset.id));
            });
        }
    });

    const totalGrams = appState.currentRecipe.ingredients.reduce((sum, ing) => sum + ing.grams, 0);
    const gramsPerItem = parseFloat(DOM.gramsPerItemInput?.value) || 0;

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
        appState.currentRecipe.gramsPerItem = gramsPerItem;
    } else {
        calcInfo.innerHTML = '';
        calcInfo.className = '';
        appState.currentRecipe.gramsPerItem = 0;
    }
}

/**
 * Delete ingredient from recipe
 */
function deleteRecipeIngredient(ingredientId) {
    appState.currentRecipe.ingredients = appState.currentRecipe.ingredients.filter(
        ing => ing.ingredientId !== ingredientId
    );
    updateRecipeIngredientSelect();
    updateRecipePreview();
}

/**
 * Update recipes list display
 */
function updateRecipesList() {
    if (!DOM.recipesList) return;

    DOM.recipesList.innerHTML = '';

    if (appState.recipes.length === 0) {
        DOM.recipesList.innerHTML = '<p style="text-align: center; padding: 20px; color: #666;">Нет сохраненных рецептов</p>';
        return;
    }

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
    DOM.recipesList.appendChild(table);

    const tbody = document.getElementById('recipes-table-body');
    if (!tbody) return;

    appState.recipes.forEach(recipe => {
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

        row.querySelector('.btn-secondary').addEventListener('click', (e) => {
            editRecipe(parseInt(e.target.dataset.id));
        });

        row.querySelector('.btn-danger').addEventListener('click', (e) => {
            deleteRecipe(parseInt(e.target.dataset.id));
        });
    });
}

/**
 * Get ingredients text for recipe display
 */
function getIngredientsText(recipe) {
    return recipe.ingredients.map(ing => {
        const ingredient = appState.ingredients.find(i => i.id === ing.ingredientId);
        return ingredient ? `${ingredient.name}: ${formatNumber(ing.grams)}г` : '';
    }).join('<br>');
}

/**
 * Edit recipe
 */
function editRecipe(id) {
    const recipe = appState.recipes.find(r => r.id === id);
    if (!recipe) return;

    if (DOM.recipeNameInput) DOM.recipeNameInput.value = recipe.name;
    if (DOM.gramsPerItemInput) DOM.gramsPerItemInput.value = recipe.gramsPerItem;

    appState.currentRecipe = {
        name: recipe.name,
        ingredients: [...recipe.ingredients],
        gramsPerItem: recipe.gramsPerItem
    };
    appState.editingRecipeId = id;

    updateRecipeIngredientSelect();
    updateRecipePreview();
    showRecipeForm();
}

/**
 * Delete recipe
 */
function deleteRecipe(id) {
    if (!confirm(MESSAGES.CONFIRM_DELETE)) return;

    appState.recipes = appState.recipes.filter(recipe => recipe.id !== id);
    saveRecipes();
    updateRecipesList();
    updateCalculatorRecipeSelect();
    showStatus(MESSAGES.RECIPE_DELETED, 'success');
}

// ===== CALCULATOR MANAGEMENT =====

/**
 * Update calculator recipe datalist options
 */
function updateCalculatorRecipeSelect() {
    const datalist = document.getElementById('recipe-datalist');
    if (!datalist || !DOM.calculateBtn) return;

    datalist.innerHTML = '';

    if (appState.recipes.length === 0) {
        DOM.calculateBtn.disabled = true;
    } else {
        appState.recipes.forEach(recipe => {
            const option = document.createElement('option');
            option.value = recipe.name;
            datalist.appendChild(option);
        });
        DOM.calculateBtn.disabled = false;
    }
}
