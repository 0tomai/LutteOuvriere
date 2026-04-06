/**
 * Tests d'intégration pour Mes Recettes
 * Test des flux complets : ajout → liste → vue → modification → suppression
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    getRecipes,
    saveRecipes,
    getFavorites,
    saveFavorites,
    toggleFavorite,
    formatTime,
    escapeHtml,
    addRecipe,
    updateRecipe,
    deleteRecipe,
    getRecipeById
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

describe('Flux complet CRUD', () => {
    beforeEach(() => {
        localStorageStore = {};
        vi.clearAllMocks();
    });

    it('devrait créer, lire, mettre à jour et supprimer une recette', () => {
        // CREATE
        const newRecipe = {
            title: 'Gâteau au chocolat',
            category: 'dessert',
            prepTime: 15,
            cookTime: 30,
            servings: 6,
            description: 'Un délicieux gâteau au chocolat',
            ingredients: ['200g chocolat noir', '3 œufs', '100g beurre', '50g farine'],
            instructions: ['Faire fondre le chocolat', 'Ajouter les œufs', 'Cuire 30min']
        };

        const created = addRecipe(newRecipe);
        expect(created.id).toBeDefined();
        expect(created.title).toBe('Gâteau au chocolat');

        // READ - la recette est sauvegardée dans le mock
        const found = getRecipeById(created.id);
        expect(found).toBeDefined();
        expect(found.title).toBe('Gâteau au chocolat');

        // UPDATE
        const updated = updateRecipe(created.id, {
            title: 'Gâteau au chocolat fondant',
            prepTime: 20
        });
        expect(updated).toBe(true);

        const retrieved = getRecipeById(created.id);
        expect(retrieved.title).toBe('Gâteau au chocolat fondant');
        expect(retrieved.prepTime).toBe(20);

        // DELETE
        deleteRecipe(created.id);
        const afterDelete = getRecipeById(created.id);
        expect(afterDelete).toBeUndefined();
    });

    it('devrait gérer plusieurs recettes', () => {
        // Ajouter 5 recettes
        for (let i = 1; i <= 5; i++) {
            addRecipe({
                title: `Recette ${i}`,
                category: i % 2 === 0 ? 'plat' : 'dessert',
                prepTime: i * 10,
                ingredients: [`Ingrédient ${i}`],
                instructions: [`Étape ${i}`]
            });
        }

        const allRecipes = getRecipes();
        expect(allRecipes.length).toBe(5);

        // Vérifier le tri par défaut (plus récent en premier)
        expect(allRecipes[0].title).toBe('Recette 5');
        expect(allRecipes[4].title).toBe('Recette 1');
    });
});

describe('Filtres et recherche', () => {
    beforeEach(() => {
        localStorageStore = {};

        // Créer des recettes de test
        const testRecipes = [
            { id: '1', title: 'Crêpes', category: 'dessert', description: 'Délicieuses crêpes', ingredients: ['farine', 'lait', 'oeufs'], prepTime: 10 },
            { id: '2', title: 'Quiche Lorraine', category: 'plat', description: 'Quiche traditionnelle', ingredients: ['pâte', 'lardons', 'oeufs'], prepTime: 30 },
            { id: '3', title: 'Salade composée', category: 'entrée', description: 'Salade fraîcheur', ingredients: ['laitue', 'tomates', 'concombre'], prepTime: 15 },
            { id: '4', title: 'Tiramisu', category: 'dessert', description: 'Dessert italien', ingredients: ['mascarpone', 'café', 'oeufs'], prepTime: 20 },
            { id: '5', title: 'Pizza maison', category: 'plat', description: 'Pizza faite maison', ingredients: ['pâte', 'tomate', 'mozzarella'], prepTime: 45 }
        ];

        localStorageStore['recipes'] = JSON.stringify(testRecipes);
    });

    it('devrait filtrer par catégorie', () => {
        const recipes = getRecipes();
        const desserts = recipes.filter(r => r.category === 'dessert');

        expect(desserts.length).toBe(2);
        expect(desserts.map(r => r.title)).toEqual(expect.arrayContaining(['Crêpes', 'Tiramisu']));
    });

    it('devrait rechercher par titre', () => {
        const recipes = getRecipes();
        const searchResults = recipes.filter(r =>
            r.title.toLowerCase().includes('pizza')
        );

        expect(searchResults.length).toBe(1);
        expect(searchResults[0].title).toBe('Pizza maison');
    });

    it('devrait rechercher dans les ingrédients', () => {
        const recipes = getRecipes();
        // "oeufs" sans accent pour correspondre exactement
        const searchResults = recipes.filter(r =>
            r.ingredients?.some(i => i.toLowerCase().includes('oeufs'))
        );

        expect(searchResults.length).toBe(3); // Crêpes, Quiche et Tiramisu
    });

    it('devrait trier par nom', () => {
        const recipes = getRecipes();
        const sorted = [...recipes].sort((a, b) => a.title.localeCompare(b.title));

        expect(sorted[0].title).toBe('Crêpes');
        expect(sorted[4].title).toBe('Tiramisu');
    });

    it('devrait trier par temps de préparation', () => {
        const recipes = getRecipes();
        const sorted = [...recipes].sort((a, b) => a.prepTime - b.prepTime);

        expect(sorted[0].title).toBe('Crêpes'); // 10 min
        expect(sorted[4].title).toBe('Pizza maison'); // 45 min
    });
});

describe('Gestion des favoris', () => {
    beforeEach(() => {
        localStorageStore = {};

        const testRecipes = [
            { id: '1', title: 'Recette 1', category: 'plat' },
            { id: '2', title: 'Recette 2', category: 'dessert' },
            { id: '3', title: 'Recette 3', category: 'entrée' }
        ];

        localStorageStore['recipes'] = JSON.stringify(testRecipes);
        localStorageStore['favorites'] = JSON.stringify(['1']);
    });

    it('devrait charger les favoris existants', () => {
        const favorites = getFavorites();
        expect(favorites).toEqual(['1']);
    });

    it('devrait filtrer les recettes par favoris', () => {
        const recipes = getRecipes();
        const favorites = getFavorites();
        const favoriteRecipes = recipes.filter(r => favorites.includes(r.id));

        expect(favoriteRecipes.length).toBe(1);
        expect(favoriteRecipes[0].id).toBe('1');
    });
});

describe('Validation des données', () => {
    beforeEach(() => {
        localStorageStore = {};
    });

    it('devrait accepter une recette valide avec tous les champs', () => {
        const recipe = {
            title: 'Test Recipe',
            category: 'plat',
            prepTime: 10,
            cookTime: 20,
            servings: 4,
            description: 'Test',
            ingredients: ['a', 'b'],
            instructions: ['1', '2']
        };

        const result = addRecipe(recipe);
        expect(result.id).toBeDefined();
        expect(result.title).toBe('Test Recipe');
    });

    it('devrait gérer une recette sans description', () => {
        const recipe = {
            title: 'Test',
            category: 'plat',
            ingredients: ['a'],
            instructions: ['1']
        };

        const result = addRecipe(recipe);
        expect(result.description).toBeUndefined();
    });

    it('devrait gérer les temps à 0', () => {
        const recipe = {
            title: 'Sandwich',
            category: 'plat',
            prepTime: 0,
            cookTime: 0,
            ingredients: ['pain', 'jambon'],
            instructions: ['Assembler']
        };

        const result = addRecipe(recipe);
        expect(result.prepTime).toBe(0);
        expect(result.cookTime).toBe(0);
    });
});

describe('Formatage et utilitaires', () => {
    it('devrait formater correctement tous les cas de temps', () => {
        expect(formatTime(0)).toBe('0 min');
        expect(formatTime(1)).toBe('1 min');
        expect(formatTime(59)).toBe('59 min');
        expect(formatTime(60)).toBe('1h');
        expect(formatTime(61)).toBe('1h 1');
        expect(formatTime(90)).toBe('1h 30');
        expect(formatTime(120)).toBe('2h');
        expect(formatTime(125)).toBe('2h 5');
    });

    it('devrait échapper correctement le HTML malveillant', () => {
        const maliciousInputs = [
            '<script>alert("XSS")</script>',
            '<img src="x" onerror="alert(1)">',
            '"><script>evil()</script>',
            'javascript:alert(1)'
        ];

        maliciousInputs.forEach(input => {
            const escaped = escapeHtml(input);
            // Vérifier que les balises sont échappées
            expect(escaped).not.toContain('<script>');
            expect(escaped).not.toContain('<img');
            expect(escaped).not.toContain('javascript:');
            // Vérifier que le HTML est échappé
            expect(escaped).toContain('&lt;');
            expect(escaped).toContain('&gt;');
        });
    });
});

describe('Gestion d\'erreurs', () => {
    beforeEach(() => {
        localStorageStore = {};
    });

    it('devrait gérer un JSON invalide dans localStorage', () => {
        localStorageStore['recipes'] = 'invalid json{{{';

        expect(() => getRecipes()).not.toThrow();
        expect(getRecipes()).toEqual([]);
    });

    it('devrait gérer une erreur de stockage (quota exceeded)', () => {
        const originalSetItem = localStorageMock.setItem;
        localStorageMock.setItem = vi.fn(() => {
            const error = new Error('Quota exceeded');
            error.name = 'QuotaExceededError';
            throw error;
        });

        expect(() => saveRecipes([{ id: '1' }])).not.toThrow();

        localStorageMock.setItem = originalSetItem;
    });

    it('devrait retourner false pour une mise à jour d\'une recette inexistante', () => {
        const result = updateRecipe('inexistant', { title: 'Test' });
        expect(result).toBe(false);
    });
});
