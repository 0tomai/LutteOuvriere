# Mes Recettes

Un site web simple pour gérer vos recettes de cuisine.

## Fonctionnalités

- **Accueil** : Vue d'ensemble avec les dernières recettes ajoutées
- **Liste des recettes** : Parcourir toutes les recettes avec recherche et filtres par catégorie
- **Ajouter une recette** : Formulaire complet pour ajouter de nouvelles recettes
- **Détails** : Vue détaillée de chaque recette avec ingrédients et instructions

## Catégories disponibles

- Entrée
- Plat principal
- Dessert
- Apéritif

## Installation

Aucune installation requise ! Ouvrez simplement `index.html` dans votre navigateur.

```bash
# Sur Linux/Mac
xdg-open index.html  # ou open index.html sur Mac

# Sur Windows
start index.html
```

## Stockage des données

Les recettes sont sauvegardées dans le **localStorage** de votre navigateur. Cela signifie :
- ✅ Pas besoin de serveur ou de base de données
- ✅ Les données persistent après fermeture du navigateur
- ⚠️ Les recettes ne sont accessibles que sur le même navigateur/appareil

## Structure des fichiers

```
test/
├── index.html      # Page d'accueil
├── recipes.html    # Liste des recettes
├── add.html        # Ajouter une recette
├── view.html       # Détails d'une recette
├── styles.css      # Feuille de style
├── app.js          # Logique JavaScript
└── README.md       # Ce fichier
```

## Utilisation

1. Cliquez sur **"Ajouter"** pour créer une nouvelle recette
2. Remplissez le formulaire (nom, catégorie, temps, ingrédients, instructions)
3. Retrouvez vos recettes dans l'onglet **"Recettes"**
4. Utilisez la barre de recherche pour filtrer par nom
5. Cliquez sur une carte pour voir les détails complets
