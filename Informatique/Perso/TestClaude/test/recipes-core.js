/**
 * Mes Recettes - Core Functions
 * Fonctions pures et utilitaires exportables pour les tests
 */

// ============================================================================
// GESTION DU STOCKAGE (avec gestion d'erreurs)
// ============================================================================

/**
 * Récupère toutes les recettes depuis le localStorage
 * @returns {Array} Tableau des recettes
 */
export function getRecipes() {
    try {
        const recipes = localStorage.getItem('recipes');
        return recipes ? JSON.parse(recipes) : [];
    } catch (e) {
        console.error('Erreur lecture localStorage:', e);
        if (typeof showToast !== 'undefined') {
            showToast('Erreur de chargement des recettes', 'error');
        }
        return [];
    }
}

/**
 * Sauvegarde toutes les recettes dans le localStorage
 * @param {Array} recipes - Tableau des recettes à sauvegarder
 */
export function saveRecipes(recipes) {
    try {
        localStorage.setItem('recipes', JSON.stringify(recipes));
    } catch (e) {
        console.error('Erreur sauvegarde localStorage:', e);
        if (e.name === 'QuotaExceededError') {
            if (typeof showToast !== 'undefined') {
                showToast('Stockage plein ! Supprimez des recettes ou des images.', 'error');
            }
        } else {
            if (typeof showToast !== 'undefined') {
                showToast('Erreur de sauvegarde', 'error');
            }
        }
    }
}

/**
 * Récupère les recettes favorites
 * @returns {Array} Tableau des IDs de recettes favorites
 */
export function getFavorites() {
    try {
        const favorites = localStorage.getItem('favorites');
        return favorites ? JSON.parse(favorites) : [];
    } catch (e) {
        return [];
    }
}

/**
 * Sauvegarde les recettes favorites
 * @param {Array} favorites - Tableau des IDs de recettes favorites
 */
export function saveFavorites(favorites) {
    try {
        localStorage.setItem('favorites', JSON.stringify(favorites));
    } catch (e) {
        console.error('Erreur sauvegarde favoris:', e);
    }
}

// ============================================================================
// FONCTIONS UTILITAIRES
// ============================================================================

/**
 * Génère un ID unique pour les recettes
 * @returns {string} ID unique
 */
export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

/**
 * Formate une durée en minutes vers un format lisible
 * @param {number} minutes - Durée en minutes
 * @returns {string} Durée formatée
 */
export function formatTime(minutes) {
    if (!minutes || minutes <= 0) return '0 min';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}` : `${hours}h`;
}

/**
 * Retourne l'emoji correspondant à une catégorie
 * @param {string} category - Catégorie de la recette
 * @returns {string} Emoji
 */
export function getCategoryEmoji(category) {
    const emojis = {
        'entrée': '🥗',
        'plat': '🍽️',
        'dessert': '🍰',
        'apéritif': '🥂',
        'snack': '🍿',
        'boisson': '🍹'
    };
    return emojis[category] || '🍳';
}

/**
 * Échappe le HTML pour prévenir les injections XSS
 * @param {string} text - Texte à échapper
 * @returns {string} Texte échappé
 */
export function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================================================
// CRUD RECETTES
// ============================================================================

/**
 * Ajoute une nouvelle recette
 * @param {Object} recipe - Objet recette (sans id)
 * @returns {Object} La recette créée avec son id
 */
export function addRecipe(recipe) {
    const recipes = getRecipes();
    recipe.id = generateId();
    recipe.createdAt = new Date().toISOString();
    recipe.updatedAt = recipe.createdAt;
    recipes.unshift(recipe);
    saveRecipes(recipes);
    return recipe;
}

/**
 * Met à jour une recette existante
 * @param {string} id - ID de la recette
 * @param {Object} recipe - Nouvelles données de la recette
 * @returns {boolean} Succès de l'opération
 */
export function updateRecipe(id, recipe) {
    const recipes = getRecipes();
    const index = recipes.findIndex(r => r.id === id);

    if (index === -1) {
        return false;
    }

    recipe.id = id;
    recipe.updatedAt = new Date().toISOString();
    // Conserver l'image si aucune nouvelle image n'est fournie
    if (!recipe.image && recipes[index].image) {
        recipe.image = recipes[index].image;
    }

    recipes[index] = recipe;
    saveRecipes(recipes);
    return true;
}

/**
 * Supprime une recette
 * @param {string} id - ID de la recette à supprimer
 */
export function deleteRecipe(id) {
    const recipes = getRecipes();
    const filtered = recipes.filter(r => r.id !== id);
    saveRecipes(filtered);

    // Supprimer aussi des favoris si présent
    const favorites = getFavorites().filter(fid => fid !== id);
    saveFavorites(favorites);
}

/**
 * Récupère une recette par son ID
 * @param {string} id - ID de la recette
 * @returns {Object|undefined} La recette ou undefined
 */
export function getRecipeById(id) {
    const recipes = getRecipes();
    return recipes.find(r => r.id === id);
}

/**
 * Bascule une recette en favori
 * @param {string} id - ID de la recette
 */
export function toggleFavorite(id) {
    const favorites = getFavorites();
    const index = favorites.indexOf(id);

    if (index === -1) {
        favorites.push(id);
        if (typeof showToast !== 'undefined') {
            showToast('Ajouté aux favoris', 'success');
        }
    } else {
        favorites.splice(index, 1);
        if (typeof showToast !== 'undefined') {
            showToast('Retiré des favoris', 'info');
        }
    }

    saveFavorites(favorites);
}

// ============================================================================
// EXPORT/IMPORT
// ============================================================================

/**
 * Exporte toutes les recettes en fichier JSON
 */
export function exportRecipes() {
    const recipes = getRecipes();
    const favorites = getFavorites();

    const data = {
        version: '2.0',
        exportDate: new Date().toISOString(),
        recipes: recipes,
        favorites: favorites
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `mes-recettes-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    if (typeof showToast !== 'undefined') {
        showToast(`${recipes.length} recettes exportées`, 'success');
    }
}

/**
 * Importe des recettes depuis un fichier JSON
 * @param {File} file - Fichier JSON à importer
 * @returns {Promise<{count: number, error?: string}>}
 */
export async function importRecipes(file) {
    try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (!data.recipes || !Array.isArray(data.recipes)) {
            throw new Error('Format de fichier invalide');
        }

        const currentRecipes = getRecipes();
        const currentFavorites = getFavorites();

        // Fusionner les recettes (éviter les doublons par ID)
        const existingIds = new Set(currentRecipes.map(r => r.id));
        const newRecipes = data.recipes.filter(r => !existingIds.has(r.id));
        const updatedRecipes = [...newRecipes, ...currentRecipes];

        // Fusionner les favoris
        const newFavorites = [...new Set([...currentFavorites, ...(data.favorites || [])])];

        saveRecipes(updatedRecipes);
        saveFavorites(newFavorites);

        if (typeof showToast !== 'undefined') {
            showToast(`${newRecipes.length} recettes importées`, 'success');
        }

        return { count: newRecipes.length };
    } catch (e) {
        console.error('Erreur import:', e);
        if (typeof showToast !== 'undefined') {
            showToast('Erreur lors de l\'import: ' + e.message, 'error');
        }
        return { count: 0, error: e.message };
    }
}
