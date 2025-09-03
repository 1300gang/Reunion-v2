# Projet de Serious Game Interactif

Bienvenue sur la plateforme de serious game ! Cette application est conçue pour des sessions interactives et éducatives, animées par un intervenant ou jouées en solo.

## Description

Cette application web permet de jouer à des scénarios narratifs à choix multiples. Elle a été développée pour aborder des thèmes de société importants de manière interactive. Elle propose un mode groupe, où un animateur guide la session et les participants votent sur les choix, et un mode solo pour une expérience individuelle.

## Fonctionnalités Principales

-   **Mode Solo :** Parcourez les histoires à votre propre rythme.
-   **Mode Groupe :** Participez à des sessions animées en temps réel avec des votes collectifs.
-   **Éditeur de Scénarios :** Créez et modifiez vos propres scénarios narratifs via une interface web dédiée.
-   **Export de Données :** Exportez les résultats et les réponses des sessions de groupe au format CSV pour analyse.
-   **Persistance des Données :** L'état des parties est sauvegardé dans une base de données SQLite.

## Technologies Utilisées

-   **Backend :** Node.js, Express.js
-   **Communication Temps Réel :** Socket.IO
-   **Base de données :** SQLite
-   **Frontend :** HTML, CSS, JavaScript (Vanilla)

## Installation et Lancement

Pour lancer le projet sur votre machine locale, suivez ces étapes :

1.  **Installer les dépendances :**
    ```bash
    npm install
    ```

2.  **Démarrer le serveur :**
    ```bash
    npm start
    ```

3.  Le serveur sera alors accessible à l'adresse `http://localhost:3000`.

## Utilisation de l'Application

Une fois le serveur démarré, vous pouvez accéder aux différentes parties de l'application :

-   **Menu Principal :** Ouvrez votre navigateur et allez sur [http://localhost:3000](http://localhost:3000) pour choisir un mode de jeu et un scénario.

-   **Éditeur de Scénarios :** Pour créer ou modifier des scénarios, allez directement à l'adresse suivante :
    [http://localhost:3000/editor.html](http://localhost:3000/editor.html)
