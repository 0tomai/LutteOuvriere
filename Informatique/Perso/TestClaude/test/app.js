/**
 * Mes Recettes - Application de gestion de recettes de cuisine
 * Version 2.0 - Avec dark mode, favoris, export/import, upload d'images
 */

import {
    getRecipes,
    saveRecipes,
    getFavorites,
    saveFavorites,
    toggleFavorite,
    generateId,
    formatTime,
    getCategoryEmoji,
    escapeHtml,
    addRecipe,
    updateRecipe,
    deleteRecipe,
    getRecipeById,
    exportRecipes,
    importRecipes
} from './recipes-core.js';

// Exposer les fonctions globalement pour les handlers inline
window.getRecipes = getRecipes;
window.saveRecipes = saveRecipes;
window.getFavorites = getFavorites;
window.saveFavorites = saveFavorites;
window.toggleFavorite = toggleFavorite;
window.generateId = generateId;
window.formatTime = formatTime;
window.getCategoryEmoji = getCategoryEmoji;
window.escapeHtml = escapeHtml;
window.addRecipe = addRecipe;
window.updateRecipe = updateRecipe;
window.deleteRecipe = deleteRecipe;
window.getRecipeById = getRecipeById;
window.exportRecipes = exportRecipes;
window.importRecipes = importRecipes;

// ============================================================================
// SYSTÈME DE NOTIFICATIONS (TOAST)
// ============================================================================

/**
 * Affiche une notification toast
 * @param {string} message - Message à afficher
 * @param {string} type - Type: 'success', 'error', 'info', 'warning'
 * @param {number} duration - Durée en ms (défaut: 3000)
 */
window.showToast = function showToast(message, type = 'info', duration = 3000) {
    // Créer le conteneur toast s'il n'existe pas
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        document.body.appendChild(toastContainer);
    }

    // Créer le toast
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${type === 'success' ? '✓' : type === 'error' ? '✕' : type === 'warning' ? '⚠' : 'ℹ'}</span>
        <span class="toast-message">${escapeHtml(message)}</span>
    `;

    toastContainer.appendChild(toast);

    // Animation d'entrée
    requestAnimationFrame(() => {
        toast.classList.add('toast-show');
    });

    // Supprimer après la durée
    setTimeout(() => {
        toast.classList.remove('toast-show');
        toast.classList.add('toast-hide');
        setTimeout(() => toast.remove(), 300);
    }, duration);
};

const showToast = window.showToast;

/**
 * Affiche une modal de confirmation
 * @param {string} message - Message de confirmation
 * @param {Function} onConfirm - Callback si confirmé
 */
function showConfirmModal(message, onConfirm) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal">
            <div class="modal-content">
                <h2>Confirmation</h2>
                <p>${escapeHtml(message)}</p>
                <div class="modal-actions">
                    <button class="btn-secondary modal-cancel">Annuler</button>
                    <button class="btn-danger modal-confirm">Confirmer</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Focus trap
    const confirmBtn = modal.querySelector('.modal-confirm');
    const cancelBtn = modal.querySelector('.modal-cancel');
    confirmBtn.focus();

    const closeModal = () => {
        modal.classList.add('modal-hide');
        setTimeout(() => modal.remove(), 300);
    };

    confirmBtn.addEventListener('click', () => {
        closeModal();
        onConfirm();
    });

    cancelBtn.addEventListener('click', closeModal);

    // Fermer avec Echap
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            document.removeEventListener('keydown', handleEscape);
            closeModal();
        }
    };
    document.addEventListener('keydown', handleEscape);
}

// ============================================================================
// GESTION DU DARK MODE
// ============================================================================

/**
 * Initialise le dark mode selon la préférence utilisateur
 */
function initDarkMode() {
    const darkMode = localStorage.getItem('darkMode') === 'true';
    if (darkMode) {
        document.body.classList.add('dark-mode');
    }

    // Mettre à jour le bouton toggle
    const toggle = document.getElementById('dark-mode-toggle');
    if (toggle) {
        toggle.textContent = darkMode ? '☀️ Mode clair' : '🌙 Mode sombre';
    }
}

/**
 * Bascule entre mode sombre et clair
 */
window.toggleDarkMode = function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDark);

    const toggle = document.getElementById('dark-mode-toggle');
    if (toggle) {
        toggle.textContent = isDark ? '☀️ Mode clair' : '🌙 Mode sombre';
    }
};

const toggleDarkMode = window.toggleDarkMode;

// ============================================================================
// AFFICHAGE DES RECETTES
// ============================================================================

/**
 * Crée le HTML d'une carte de recette
 * @param {Object} recipe - Objet recette
 * @param {Array} favorites - Tableau des IDs favoris
 * @returns {string} HTML de la carte
 */
function createRecipeCard(recipe, favorites) {
    const isFavorite = favorites.includes(recipe.id);
    const imageHtml = recipe.image
        ? `<img src="${recipe.image}" alt="${escapeHtml(recipe.title)}" class="recipe-card-img">`
        : `<div class="recipe-card-image">${getCategoryEmoji(recipe.category)}</div>`;

    return `
        <article class="recipe-card" data-id="${recipe.id}" tabindex="0" role="article" aria-label="Recette: ${escapeHtml(recipe.title)}">
            ${imageHtml}
            <div class="recipe-card-content">
                <div class="recipe-card-header">
                    <h3 class="recipe-card-title">${escapeHtml(recipe.title)}</h3>
                    <button class="favorite-btn ${isFavorite ? 'active' : ''}"
                            data-id="${recipe.id}"
                            aria-label="${isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}"
                            title="Ajouter aux favoris">
                        ${isFavorite ? '★' : '☆'}
                    </button>
                </div>
                <div class="recipe-card-meta">
                    <span class="category-badge">${recipe.category}</span>
                    <span>⏱️ ${formatTime(recipe.prepTime + recipe.cookTime)}</span>
                    <span>👥 ${recipe.servings || '?'} parts</span>
                </div>
                <p class="recipe-card-description">${escapeHtml(recipe.description || 'Aucune description')}</p>
            </div>
        </article>
    `;
}

/**
 * Attache les écouteurs d'événements aux cartes de recettes
 */
function attachCardListeners() {
    // Gestion du clic sur les cartes
    document.querySelectorAll('.recipe-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (!e.target.classList.contains('favorite-btn')) {
                window.location.href = `view.html?id=${card.dataset.id}`;
            }
        });

        // Navigation clavier
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (!e.target.classList.contains('favorite-btn')) {
                    window.location.href = `view.html?id=${card.dataset.id}`;
                }
            }
        });
    });

    // Gestion des boutons favoris
    document.querySelectorAll('.favorite-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFavorite(btn.dataset.id);
        });
    });
}

/**
 * Affiche les recettes récentes sur la page d'accueil
 */
function displayRecentRecipes() {
    const container = document.getElementById('recent-recipes');
    if (!container) return;

    const recipes = getRecipes().slice(0, 3);
    const favorites = getFavorites();

    if (recipes.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📖</div>
                <p>Aucune recette pour le moment</p>
                <a href="add.html" class="btn-primary" style="margin-top: 1rem;">Ajouter ma première recette</a>
            </div>
        `;
        return;
    }

    container.innerHTML = recipes.map(recipe => createRecipeCard(recipe, favorites)).join('');

    // Ajouter les écouteurs d'événements
    attachCardListeners();
}

/**
 * Affiche toutes les recettes avec filtres et tri
 * @param {string} searchTerm - Terme de recherche
 * @param {string} categoryFilter - Filtre de catégorie
 * @param {string} sortBy - Tri (date, name, time)
 * @param {boolean} favoritesOnly - Afficher uniquement les favoris
 */
function displayAllRecipes(searchTerm = '', categoryFilter = '', sortBy = 'date', favoritesOnly = false) {
    const container = document.getElementById('recipes-container');
    if (!container) return;

    let recipes = getRecipes();
    const favorites = getFavorites();

    // Appliquer les filtres
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        recipes = recipes.filter(r =>
            r.title.toLowerCase().includes(term) ||
            r.description?.toLowerCase().includes(term) ||
            r.ingredients?.some(i => i.toLowerCase().includes(term))
        );
    }

    if (categoryFilter) {
        recipes = recipes.filter(r => r.category === categoryFilter);
    }

    if (favoritesOnly) {
        recipes = recipes.filter(r => favorites.includes(r.id));
    }

    // Appliquer le tri
    switch (sortBy) {
        case 'name':
            recipes.sort((a, b) => a.title.localeCompare(b.title));
            break;
        case 'time':
            recipes.sort((a, b) => (a.prepTime + a.cookTime) - (b.prepTime + b.cookTime));
            break;
        case 'date':
        default:
            // Déjà trié par date décroissante (plus récent en premier)
            break;
    }

    if (recipes.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🔍</div>
                <p>Aucune recette trouvée</p>
                ${favoritesOnly ? '<p style="margin-top: 0.5rem">Ajoutez des recettes aux favoris pour les voir ici</p>' : ''}
            </div>
        `;
        return;
    }

    container.innerHTML = recipes.map(recipe => createRecipeCard(recipe, favorites)).join('');

    // Ajouter les écouteurs d'événements
    attachCardListeners();
}

/**
 * Affiche les détails d'une recette
 */
function displayRecipeDetail() {
    const container = document.getElementById('recipe-detail');
    if (!container) return;

    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    if (!id) {
        container.innerHTML = '<div class="empty-state"><p>Recette non trouvée</p></div>';
        return;
    }

    const recipe = getRecipeById(id);
    const favorites = getFavorites();
    const isFavorite = favorites.includes(id);

    if (!recipe) {
        container.innerHTML = '<div class="empty-state"><p>Recette non trouvée</p></div>';
        return;
    }

    const imageHtml = recipe.image
        ? `<div class="recipe-detail-image"><img src="${recipe.image}" alt="${escapeHtml(recipe.title)}"></div>`
        : '';

    container.innerHTML = `
        <div class="recipe-detail">
            <nav class="breadcrumb" aria-label="Fil d'Ariane">
                <a href="index.html">Accueil</a>
                <span aria-hidden="true">›</span>
                <a href="recipes.html">Recettes</a>
                <span aria-hidden="true">›</span>
                <span>${escapeHtml(recipe.title)}</span>
            </nav>

            ${imageHtml}

            <div class="recipe-header">
                <h1>${escapeHtml(recipe.title)}</h1>
                <div class="recipe-meta">
                    <span>${getCategoryEmoji(recipe.category)} ${recipe.category}</span>
                    <span>⏱️ Préparation: ${formatTime(recipe.prepTime)}</span>
                    <span>🔥 Cuisson: ${formatTime(recipe.cookTime)}</span>
                    <span>👥 ${recipe.servings || '?'} parts</span>
                </div>
            </div>

            <div class="recipe-body">
                ${recipe.description ? `
                <div class="recipe-section">
                    <h2>Description</h2>
                    <p>${escapeHtml(recipe.description)}</p>
                </div>
                ` : ''}

                <div class="recipe-section">
                    <h2>Ingrédients</h2>
                    <ul class="ingredients-list">
                        ${recipe.ingredients?.map(i => `<li>${escapeHtml(i)}</li>`).join('') || '<li>Aucun ingrédient</li>'}
                    </ul>
                </div>

                <div class="recipe-section">
                    <h2>Instructions</h2>
                    <ol class="instructions-list">
                        ${recipe.instructions?.map(i => `<li>${escapeHtml(i)}</li>`).join('') || '<li>Aucune instruction</li>'}
                    </ol>
                </div>

                <div class="recipe-actions">
                    <a href="recipes.html" class="btn-secondary">← Retour aux recettes</a>
                    <a href="add.html?edit=${recipe.id}" class="btn-primary" id="edit-btn">Modifier</a>
                    <button class="btn-info" id="favorite-btn" onclick="toggleFavorite('${recipe.id}')">
                        ${isFavorite ? '★ Favori' : '☆ Favori'}
                    </button>
                    <button class="btn-danger" id="delete-btn">Supprimer</button>
                </div>
            </div>
        </div>
    `;

    // Attacher le gestionnaire de suppression
    document.getElementById('delete-btn')?.addEventListener('click', () => {
        showConfirmModal('Voulez-vous vraiment supprimer cette recette ?', () => {
            deleteRecipe(id);
            showToast('Recette supprimée', 'success');
            window.location.href = 'recipes.html';
        });
    });
}

// ============================================================================
// GESTION DU FORMULAIRE
// ============================================================================

/**
 * Valide un champ de formulaire
 * @param {HTMLElement} input - L'input à valider
 * @param {boolean} isValid - Si le champ est valide
 * @param {string} errorMessage - Message d'erreur
 * @returns {boolean} Le statut de validation
 */
function validateField(input, isValid, errorMessage) {
    const existingError = input.parentElement.querySelector('.field-error');

    if (!isValid) {
        input.classList.add('invalid');
        if (!existingError) {
            const error = document.createElement('span');
            error.className = 'field-error';
            error.textContent = errorMessage;
            input.parentElement.appendChild(error);
        }
        return false;
    } else {
        input.classList.remove('invalid');
        if (existingError) {
            existingError.remove();
        }
        return true;
    }
}

/**
 * Initialise le formulaire d'ajout/édition de recette
 */
function handleRecipeForm() {
    const form = document.getElementById('recipe-form');
    if (!form) return;

    // Vérifier si on est en mode édition
    const params = new URLSearchParams(window.location.search);
    const editId = params.get('edit');

    if (editId) {
        // Mode édition - charger les données existantes
        const recipe = getRecipeById(editId);
        if (recipe) {
            document.getElementById('title').value = recipe.title;
            document.getElementById('category').value = recipe.category;
            document.getElementById('prep-time').value = recipe.prepTime || 0;
            document.getElementById('cook-time').value = recipe.cookTime || 0;
            document.getElementById('servings').value = recipe.servings || 1;
            document.getElementById('description').value = recipe.description || '';
            document.getElementById('ingredients').value = recipe.ingredients?.join('\n') || '';
            document.getElementById('instructions').value = recipe.instructions?.join('\n') || '';

            // Changer le texte du bouton
            form.querySelector('button[type="submit"]').textContent = 'Mettre à jour la recette';

            // Ajouter un lien pour annuler l'édition
            const cancelLink = document.createElement('a');
            cancelLink.href = `view.html?id=${editId}`;
            cancelLink.className = 'btn-secondary';
            cancelLink.textContent = 'Annuler';
            form.querySelector('.form-actions').appendChild(cancelLink);
        } else {
            showToast('Recette non trouvée', 'error');
            window.location.href = 'recipes.html';
            return;
        }
    }

    // Validation en temps réel
    const titleInput = document.getElementById('title');
    titleInput.addEventListener('blur', () => {
        validateField(titleInput, titleInput.value.trim().length >= 3, 'Le titre doit faire au moins 3 caractères');
    });

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Validation
        const title = document.getElementById('title').value.trim();
        const category = document.getElementById('category').value;

        if (!validateField(titleInput, title.length >= 3, 'Le titre doit faire au moins 3 caractères')) {
            return;
        }

        if (!category) {
            showToast('Veuillez sélectionner une catégorie', 'error');
            return;
        }

        // Gestion de l'image
        let imageData = null;
        const imageInput = document.getElementById('recipe-image');
        if (imageInput && imageInput.files[0]) {
            try {
                const file = imageInput.files[0];
                imageData = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
                // Vérifier la taille (max 500KB)
                if (imageData.length > 500000) {
                    showToast('Image trop lourde (max 500KB)', 'warning');
                    return;
                }
            } catch (err) {
                showToast('Erreur lors du chargement de l\'image', 'error');
                return;
            }
        }

        const ingredients = document.getElementById('ingredients').value
            .split('\n')
            .filter(line => line.trim() !== '');

        const instructions = document.getElementById('instructions').value
            .split('\n')
            .filter(line => line.trim() !== '');

        const recipe = {
            title: title,
            category: category,
            prepTime: parseInt(document.getElementById('prep-time').value) || 0,
            cookTime: parseInt(document.getElementById('cook-time').value) || 0,
            servings: parseInt(document.getElementById('servings').value) || 1,
            description: document.getElementById('description').value,
            ingredients: ingredients,
            instructions: instructions,
            image: imageData
        };

        if (editId) {
            // Mode édition
            if (updateRecipe(editId, recipe)) {
                showToast('Recette mise à jour !', 'success');
                window.location.href = `view.html?id=${editId}`;
            } else {
                showToast('Erreur lors de la mise à jour', 'error');
            }
        } else {
            // Mode création
            addRecipe(recipe);
            showToast('Recette ajoutée avec succès !', 'success');
            window.location.href = 'recipes.html';
        }
    });
}

// ============================================================================
// EXPORT / IMPORT
// ============================================================================

/**
 * Initialise les boutons export/import
 */
function handleExportImport() {
    const exportBtn = document.getElementById('export-btn');
    const importInput = document.getElementById('import-input');

    if (exportBtn) {
        exportBtn.addEventListener('click', exportRecipes);
    }

    if (importInput) {
        importInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                await importRecipes(file);
                e.target.value = ''; // Reset pour permettre le même fichier
                // Rafraîchir après un court délai
                setTimeout(() => window.location.reload(), 1000);
            }
        });
    }
}

// ============================================================================
// APERÇU D'IMAGE
// ============================================================================

/**
 * Initialise l'aperçu d'image dans le formulaire
 */
function initImagePreview() {
    const imageInput = document.getElementById('recipe-image');
    const preview = document.getElementById('image-preview');

    if (!imageInput || !preview) return;

    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Vérifier le type de fichier
        if (!file.type.startsWith('image/')) {
            showToast('Veuillez sélectionner une image valide', 'error');
            return;
        }

        // Vérifier la taille (max 500KB)
        if (file.size > 500000) {
            showToast('Image trop lourde (max 500KB)', 'warning');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            preview.src = e.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    });
}

// ============================================================================
// INITIALISATION
// ============================================================================

/**
 * Initialise l'application
 */
function init() {
    // Initialiser le dark mode
    initDarkMode();

    // Détecter la page actuelle et initialiser en conséquence
    const path = window.location.pathname;

    if (path.includes('index.html') || path.endsWith('/') || path === '') {
        displayRecentRecipes();
    } else if (path.includes('recipes.html')) {
        displayAllRecipes();
        handleSearchAndFilters();
        handleExportImport();
    } else if (path.includes('add.html')) {
        handleRecipeForm();
    } else if (path.includes('view.html')) {
        displayRecipeDetail();
    }

    // Gestionnaire global pour le dark mode toggle
    document.getElementById('dark-mode-toggle')?.addEventListener('click', toggleDarkMode);
}

// Gérer la recherche et les filtres
function handleSearchAndFilters() {
    const searchInput = document.getElementById('search-input');
    const categoryFilter = document.getElementById('category-filter');
    const sortSelect = document.getElementById('sort-select');
    const favoritesFilter = document.getElementById('favorites-filter');

    if (!searchInput) return;

    function updateRecipes() {
        const searchTerm = searchInput.value || '';
        const category = categoryFilter?.value || '';
        const sortBy = sortSelect?.value || 'date';
        const favoritesOnly = favoritesFilter?.checked || false;
        displayAllRecipes(searchTerm, category, sortBy, favoritesOnly);
    }

    searchInput.addEventListener('input', updateRecipes);
    categoryFilter?.addEventListener('change', updateRecipes);
    sortSelect?.addEventListener('change', updateRecipes);
    favoritesFilter?.addEventListener('change', updateRecipes);
}

// Lancer l'application
document.addEventListener('DOMContentLoaded', () => {
    init();
    initImagePreview();
});
