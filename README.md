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

### 3. Comment Utiliser l'Éditeur de Scénarios

L'éditeur vous permet de créer vos propres histoires interactives ou de modifier celles qui existent déjà.

1.  **Accédez à l'Éditeur :** Allez directement à l'adresse [http://localhost:3000/editor.html](http://localhost:3000/editor.html).

2.  **Charger un Scénario Existant :**
    *   Utilisez le menu déroulant "Choisir un scénario à modifier" pour voir la liste des scénarios disponibles.
    *   Sélectionnez un scénario et cliquez sur "Charger". Les détails et les questions du scénario rempliront le formulaire.

3.  **Créer un Nouveau Scénario :**
    *   Si vous ne chargez aucun scénario, vous pouvez commencer à en créer un nouveau directement.
    *   **Titre du Scénario :** Donnez un nom clair et descriptif à votre histoire.
    *   **Nom du Fichier :** Choisissez un nom de fichier unique (par exemple, `mon-histoire.json`). Ce nom est important pour sauvegarder et charger le scénario.
    *   **ID de la Question de Départ :** Indiquez l'ID de la toute première question de votre histoire (par exemple, `intro`).

4.  **Gérer les Questions :**
    *   **Ajouter une Question :** Cliquez sur "Ajouter une Question". Un nouveau bloc de question apparaît.
    *   **ID de la Question :** Donnez un identifiant unique à chaque question (par exemple, `intro`, `choix1_consequence`, etc.). Cet ID est utilisé pour lier les questions entre elles.
    *   **Texte de la question :** Écrivez le texte principal de la question ou de la situation.
    *   **Image de fond :** (Optionnel) Indiquez le chemin vers une image (par exemple, `/img/mon_image.png`). L'image doit se trouver dans le dossier `public`.
    *   **Supprimer une Question :** Cliquez sur le bouton de suppression en haut à droite du bloc de la question.

5.  **Gérer les Choix :**
    *   **Ajouter un Choix :** Dans une question, cliquez sur "Ajouter un choix".
    *   **Texte du choix :** Écrivez le texte que le joueur verra.
    *   **Question Suivante :** C'est ici que vous liez l'histoire. Utilisez le menu déroulant pour sélectionner l'ID de la question qui suivra si le joueur sélectionne ce choix.
    *   **Supprimer un Choix :** Cliquez sur le `X` à côté du choix.

6.  **Sauvegarder votre Scénario :**
    *   Une fois que vous avez terminé, cliquez sur le bouton "Sauvegarder le Scénario" en bas de la page.
    *   Une notification vous confirmera que la sauvegarde a réussi. Votre scénario sera maintenant disponible dans les modes de jeu Solo et Groupe.
