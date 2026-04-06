/**
 * Tests unitaires pour Mes Recettes
 * Couvre toutes les fonctions pures et utilitaires de recipes-core.js
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
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
    exportRecipes
} from '../recipes-core.js';

// Mock du localStorage
let localStorageStore = {};
const localStorageMock = {
    getItem: vi.fn((key) => localStorageStore[key] || null),
    setItem: vi.fn((key, value) => { localStorageStore[key] = value; }),
    removeItem: vi.fn((key) => { delete localStorageStore[key]; }),
    clear: vi.fn(() => { localStorageStore = {}; })
};

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true
});

// Mock de showToast
window.showToast = vi.fn();

describe('Fonctions utilitaires', () => {
    describe('formatTime', () => {
        it('devrait retourner "0 min" pour une valeur nulle', () => {
            expect(formatTime(null)).toBe('0 min');
            expect(formatTime(0)).toBe('0 min');
            expect(formatTime(undefined)).toBe('0 min');
        });

        it('devrait formater les minutes inférieures à 60', () => {
            expect(formatTime(5)).toBe('5 min');
            expect(formatTime(30)).toBe('30 min');
            expect(formatTime(59)).toBe('59 min');
        });

        it('devrait formater les heures exactes', () => {
            expect(formatTime(60)).toBe('1h');
            expect(formatTime(120)).toBe('2h');
            expect(formatTime(180)).toBe('3h');
        });

        it('devrait formater les heures et minutes', () => {
            expect(formatTime(65)).toBe('1h 5');
            expect(formatTime(90)).toBe('1h 30');
            expect(formatTime(125)).toBe('2h 5');
        });
    });

    describe('getCategoryEmoji', () => {
        it('devrait retourner les emojis corrects par catégorie', () => {
            expect(getCategoryEmoji('entrée')).toBe('🥗');
            expect(getCategoryEmoji('plat')).toBe('🍽️');
            expect(getCategoryEmoji('dessert')).toBe('🍰');
            expect(getCategoryEmoji('apéritif')).toBe('🥂');
            expect(getCategoryEmoji('snack')).toBe('🍿');
            expect(getCategoryEmoji('boisson')).toBe('🍹');
        });

        it('devrait retourner 🍳 pour une catégorie inconnue', () => {
            expect(getCategoryEmoji('inconnu')).toBe('🍳');
            expect(getCategoryEmoji('')).toBe('🍳');
        });
    });

    describe('escapeHtml', () => {
        it('devrait échapper les balises HTML', () => {
            expect(escapeHtml('<script>alert("XSS")</script>'))
                .toBe('&lt;script&gt;alert("XSS")&lt;/script&gt;');
        });

        it('devrait échapper les guillemets', () => {
            const result = escapeHtml('Test "guillemets"');
            expect(result).toBe('Test &quot;guillemets&quot;');
        });

        it('devrait gérer les valeurs nulles', () => {
            expect(escapeHtml(null)).toBe('');
            expect(escapeHtml(undefined)).toBe('');
        });

        it('devrait laisser passer le texte normal', () => {
            expect(escapeHtml('Recette de grand-mère'))
                .toBe('Recette de grand-mère');
        });

        it('devrait prévenir les injections XSS', () => {
            const result = escapeHtml('<img src="x" onerror="alert(1)">');
            expect(result).toContain('&lt;img');
            expect(result).toContain('&gt;');
            // Le contenu textuel n'est pas dangereux car il est échappé
            expect(result).not.toContain('<img');
        });
    });

    describe('generateId', () => {
        it('devrait générer un ID unique à chaque appel', () => {
            const ids = new Set();
            for (let i = 0; i < 100; i++) {
                ids.add(generateId());
            }
            expect(ids.size).toBe(100);
        });

        it('devrait générer un ID non vide', () => {
            const id = generateId();
            expect(id).toBeTruthy();
            expect(typeof id).toBe('string');
            expect(id.length).toBeGreaterThan(0);
        });
    });
});

describe('Gestion des recettes (CRUD)', () => {
    beforeEach(() => {
        localStorageStore = {};
        vi.clearAllMocks();
    });

    describe('getRecipes / saveRecipes', () => {
        it('devrait retourner un tableau vide quand il n\'y a pas de recettes', () => {
            expect(getRecipes()).toEqual([]);
        });

        it('devrait parser le JSON des recettes', () => {
            const recipes = [
                { id: '1', title: 'Recette 1' },
                { id: '2', title: 'Recette 2' }
            ];
            localStorageStore['recipes'] = JSON.stringify(recipes);

            expect(getRecipes()).toEqual(recipes);
        });

        it('devrait sauvegarder les recettes en JSON', () => {
            const recipes = [{ id: '1', title: 'Test' }];
            saveRecipes(recipes);

            expect(localStorageMock.setItem).toHaveBeenCalled();
            const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
            expect(savedData).toEqual(recipes);
        });

        it('devrait gérer les erreurs de localStorage', () => {
            const originalGetItem = localStorageMock.getItem;
            localStorageMock.getItem = vi.fn(() => {
                throw new Error('Storage error');
            });

            expect(getRecipes()).toEqual([]);

            localStorageMock.getItem = originalGetItem;
        });
    });

    describe('addRecipe', () => {
        beforeEach(() => {
            localStorageStore = {};
        });

        it('devrait ajouter une recette avec un ID généré', () => {
            const recipe = { title: 'Nouvelle recette', category: 'plat' };
            const result = addRecipe(recipe);

            expect(result.id).toBeDefined();
            expect(result.createdAt).toBeDefined();
            expect(result.title).toBe('Nouvelle recette');
        });

        it('devrait ajouter la recette au début du tableau', () => {
            localStorageStore['recipes'] = JSON.stringify([{ id: 'old', title: 'Ancienne' }]);

            addRecipe({ title: 'Nouvelle' });

            const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
            expect(savedData.length).toBe(2);
            expect(savedData[0].title).toBe('Nouvelle');
        });
    });

    describe('updateRecipe', () => {
        beforeEach(() => {
            localStorageStore = {};
            const recipes = [
                { id: '1', title: 'Recette 1', updatedAt: '2024-01-01' },
                { id: '2', title: 'Recette 2', updatedAt: '2024-01-01' }
            ];
            localStorageStore['recipes'] = JSON.stringify(recipes);
        });

        it('devrait mettre à jour une recette existante', () => {
            const result = updateRecipe('1', { title: 'Recette 1 modifiée' });

            expect(result).toBe(true);
            const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
            expect(savedData.find(r => r.id === '1').title).toBe('Recette 1 modifiée');
        });

        it('devrait mettre à jour le timestamp updatedAt', () => {
            updateRecipe('1', { title: 'Modifiée' });

            const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
            const updated = savedData.find(r => r.id === '1');
            expect(updated.updatedAt).not.toBe('2024-01-01');
        });

        it('devrait retourner false pour une recette inexistante', () => {
            const result = updateRecipe('inexistant', { title: 'Test' });
            expect(result).toBe(false);
        });
    });

    describe('deleteRecipe', () => {
        beforeEach(() => {
            localStorageStore = {};
            const recipes = [
                { id: '1', title: 'Recette 1' },
                { id: '2', title: 'Recette 2' },
                { id: '3', title: 'Recette 3' }
            ];
            localStorageStore['recipes'] = JSON.stringify(recipes);
        });

        it('devrait supprimer une recette par ID', () => {
            deleteRecipe('2');

            const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
            expect(savedData.length).toBe(2);
            expect(savedData.map(r => r.id)).not.toContain('2');
        });

        it('devrait laisser les autres recettes intactes', () => {
            deleteRecipe('2');

            const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
            expect(savedData.map(r => r.id)).toContain('1');
            expect(savedData.map(r => r.id)).toContain('3');
        });
    });

    describe('getRecipeById', () => {
        beforeEach(() => {
            const recipes = [
                { id: '1', title: 'Recette 1' },
                { id: '2', title: 'Recette 2' }
            ];
            localStorageStore['recipes'] = JSON.stringify(recipes);
        });

        it('devrait trouver une recette par son ID', () => {
            const recipe = getRecipeById('1');
            expect(recipe).toEqual({ id: '1', title: 'Recette 1' });
        });

        it('devrait retourner undefined pour un ID inexistant', () => {
            const recipe = getRecipeById('inexistant');
            expect(recipe).toBeUndefined();
        });
    });
});

describe('Gestion des favoris', () => {
    beforeEach(() => {
        localStorageStore = {};
        vi.clearAllMocks();
    });

    describe('getFavorites / saveFavorites', () => {
        it('devrait retourner un tableau vide par défaut', () => {
            expect(getFavorites()).toEqual([]);
        });

        it('devrait retourner les IDs des recettes favorites', () => {
            localStorageStore['favorites'] = JSON.stringify(['1', '2', '3']);
            expect(getFavorites()).toEqual(['1', '2', '3']);
        });
    });

    describe('toggleFavorite', () => {
        beforeEach(() => {
            localStorageStore = {};
        });

        it('devrait ajouter un favori', () => {
            toggleFavorite('1');

            const savedData = JSON.parse(localStorageMock.setItem.mock.calls.find(c => c[0] === 'favorites')[1]);
            expect(savedData).toContain('1');
        });

        it('devrait retirer un favori', () => {
            localStorageStore['favorites'] = JSON.stringify(['1', '2']);

            toggleFavorite('1');

            const savedData = JSON.parse(localStorageMock.setItem.mock.calls.find(c => c[0] === 'favorites')[1]);
            expect(savedData).not.toContain('1');
            expect(savedData).toContain('2');
        });
    });
});

describe('Export/Import', () => {
    beforeEach(() => {
        localStorageStore = {};
        vi.clearAllMocks();

        // Mock pour createObjectURL et revokeObjectURL
        global.URL.createObjectURL = vi.fn(() => 'blob:test-url');
        global.URL.revokeObjectURL = vi.fn();
    });

    describe('exportRecipes', () => {
        it('devrait appeler les méthodes de téléchargement', () => {
            localStorageStore['recipes'] = JSON.stringify([{ id: '1', title: 'Test' }]);
            localStorageStore['favorites'] = JSON.stringify(['1']);

            exportRecipes();

            expect(global.URL.createObjectURL).toHaveBeenCalled();
            expect(global.URL.revokeObjectURL).toHaveBeenCalled();
        });
    });
});
