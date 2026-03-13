# 🎬 MediaBox

Votre Netflix personnel — diffusez vos films et séries depuis votre navigateur.

## ✅ Pré-requis

- **Node.js** version 14 ou supérieure
  - Vérifiez : `node --version`
  - Télécharger : https://nodejs.org

## 🚀 Lancement

### Option 1 — Double-cliquez sur le script de démarrage
- **macOS / Linux** : `start.sh`
- **Windows** : `start.bat`

### Option 2 — Terminal
```bash
cd mediabox
node server.js
```

Puis ouvrez http://localhost:8080 dans votre navigateur.

---

## 📁 Ajouter vos médias

1. Cliquez sur **"Sources"** en haut à droite
2. Entrez le chemin absolu d'un dossier, ex :
   - macOS : `/Users/VotreNom/Films`
   - Windows : `C:\Users\VotreNom\Films`
   - Linux : `/home/votreNom/Videos`
3. Cliquez **Ajouter**

Les sous-dossiers sont scannés automatiquement.

---

## 🎯 Fonctionnalités

- 🎬 **Films** — détection automatique du titre et de l'année
- 📺 **Séries** — détection S01E02, organisation par saisons
- ▶️ **Lecture** — streaming direct dans le navigateur
- 💾 **Reprise** — continue là où vous vous étiez arrêté
- ✅ **Vu/Non vu** — marquage automatique à la fin
- ★ **Favoris** — sauvegardez vos préférés
- 🔍 **Recherche** — filtrage instantané
- 📝 **Sous-titres** — fichiers .srt/.vtt détectés automatiquement

## 📹 Formats supportés

`.mp4` `.mkv` `.avi` `.mov` `.wmv` `.flv` `.webm` `.m4v` `.ts` `.m2ts`

> **Note :** Pour les fichiers `.mkv` et `.avi`, le navigateur peut ne pas les lire nativement.  
> Recommandé : convertir en `.mp4` avec [HandBrake](https://handbrake.fr/) pour une compatibilité maximale.

## ⚙️ Configuration

Port par défaut : `8080`  
Changer le port : `PORT=9000 node server.js`

La configuration (dossiers, historique, favoris) est sauvegardée dans `mediabox.config.json`.

---

## 🛑 Arrêter le serveur

Dans le terminal : `Ctrl + C`
