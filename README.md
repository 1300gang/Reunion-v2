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

## Guide d'Utilisation

Une fois le serveur démarré, voici comment utiliser les différentes fonctionnalités de l'application.

### 1. Comment Jouer (Mode Solo)

Le mode solo vous permet de parcourir une histoire interactive à votre propre rythme.

1.  **Accédez au Menu Principal :** Ouvrez votre navigateur et allez sur [http://localhost:3000](http://localhost:3000).
2.  **Choisissez le Mode Solo :** Cliquez sur le bouton "SOLO".
3.  **Sélectionnez un Scénario :** Une liste des scénarios disponibles apparaît. Cliquez sur celui que vous souhaitez lancer.
4.  **Jouez :** L'histoire commence. Lisez le texte affiché et cliquez sur l'un des choix proposés pour avancer dans le récit. Continuez jusqu'à la fin de l'histoire.

### 2. Comment Animer et Participer à une Session (Mode Groupe)

Le mode groupe est conçu pour être animé par un intervenant, où les participants votent pour les choix.

#### Pour l'Animateur

1.  **Créez une Session :**
    *   Depuis le menu principal, cliquez sur "GROUPE".
    *   Sélectionnez le scénario que vous souhaitez présenter.
    *   Cliquez sur "CRÉER UNE SESSION".
2.  **Partagez le Code de Session :**
    *   Un **code de session unique** (par exemple, `ABCD`) s'affichera en haut de votre écran.
    *   Communiquez ce code aux participants pour qu'ils puissent rejoindre votre partie.
3.  **Animez la Partie :**
    *   Votre écran affiche la question et les choix. Vous verrez également les votes des participants arriver en temps réel.
    *   Une fois que tout le monde a voté (ou que vous décidez de continuer), cliquez sur le choix qui a reçu le plus de votes pour passer à la question suivante.

#### Pour les Participants

1.  **Rejoignez une Session :**
    *   Sur la page d'accueil, entrez le **code de session** fourni par l'animateur dans le champ prévu à cet effet.
    *   Cliquez sur "REJOINDRE".
2.  **Votez pour les Choix :**
    *   Votre écran affichera les choix de réponse pour la question en cours.
    *   Cliquez sur le choix que vous préférez. Votre vote est automatiquement envoyé à l'animateur.
    *   Attendez que l'animateur fasse avancer l'histoire.

