// menu.js - Script principal du menu de sélection des niveau

// === CONFIGURATION DES NIVEAUX ===
// Adaptée pour vos fichiers de scénarios existants
const levelsData = [
  {
    name: "Stéréotypes, discriminations et consentement",
    image: "img/Lea/img_contextuel/(H1)_fond_A.png",
    stickers: [
      "img/Stykers/Stickers consentement texte.png",
      "img/Stykers/Stickers Stereotype.png",
    ],
    description:
      "Scénario éducatif sur les stéréotypes de genre, le sexisme, la masculinité toxique et le consentement à travers une conversation entre deux lycéens.",
    colors: ["#f46c31", "#f9bb87"],
    creators: ["eleves 1","eleves 2","eleves 3","eleves 4","eleves 5"],
    scenarioFile: "scenario-leaV2.json"
  },
  {
    name: "LGBTQIA+",
    image: "/img/img_contextuel/nico_gaetan_marche_des_fierte.png",
    stickers: [
      "img/Stykers/Stickers consentement.png",
      "img/Stykers/Stickers Stereotype texte.png",
    ],
    description:
      "Explorez les questions d'identité, d'orientation et d'acceptation dans un parcours bienveillant et éducatif. Découvrez l'importance du respect et de la diversité.",
    colors: ["#FF6B6B", "#FFD166"],
    creators: [
      "Élèves du collège de La Réunion",
      "ARPSH",
      "Planning Familial",
      "Rive",
      "Asetis",
    ],
    scenarioFile: "scenario_lgbtqia_V2.json"
  },
  {
    name: "Anthology Complete",
    image: "/img/Rive/img-context/(H8)_fond_C_discussion_apres_vol.png",
    stickers: [
      "img/Stykers/Stickers sexualité texte.png",
      "img/Stykers/Stickers regle texte.png",
    ],
    description:
      "Une collection complète d'histoires interconnectées explorant différents aspects de la santé sexuelle et relationnelle. Un parcours complet et enrichissant.",
    colors: ["#797979ff", "#00d9ffff"],
    creators: ["Équipe pédagogique RSG974"],
    scenarioFile: "anthology_completeh7.json"
  },
  {
    name: "La Spirale",
    image: "/img/Rive/img-context/(H9)_fond_C_confrontation_tijean.png",
    stickers: [
      "img/Stykers/Stickers sexualité texte.png",
      "img/Stykers/Stickers prostitution texte.png",
    ],
    description:
      "Anthologie de situations autour du thème de la prostitution, de la précarité et de la réinsertion sociale",
    colors: ["#92430eff", "#14d4ffff"],
    creators: ["eleves 1","eleves 2","eleves 3","eleves 4","eleves 5"],
    scenarioFile: "spirale_salkira.json"
  },
];

// === VARIABLES GLOBALES ===
let selectedMode = null;
let currentLevel = null;
let isTransitioning = false;

// === RÉFÉRENCES DOM ===
const backToModeButton = document.getElementById("back-to-mode-button");
const backToHomeButton = document.getElementById("back-to-home-button");
const modeSelectionView = document.getElementById("mode-selection-view");
const homeView = document.getElementById("home-view");
const levelView = document.getElementById("level-view");

// === INITIALISATION ===
document.addEventListener("DOMContentLoaded", () => {
  console.log("Menu initialisé");
  
  // Toujours cacher l'overlay au chargement
  const loadingOverlay = document.getElementById('loading-overlay');
  if (loadingOverlay) {
    loadingOverlay.style.display = 'none';
  }
  
  // Gérer le bouton retour du navigateur
  window.addEventListener('popstate', function(event) {
    console.log('Bouton retour détecté');
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
      overlay.style.display = 'none';
    }
  });
  
  // Vérifier si on revient du jeu
  checkReturnFromGame();
  
  // Afficher la vue de sélection de mode par défaut
  showModeSelection();
  
  // Attacher les événements aux éléments du DOM
  initializeEventListeners();
});

// === GESTION DES ÉVÉNEMENTS ===
function initializeEventListeners() {
  console.log("Initialisation des événements...");
  
  // Boutons de sélection de mode
  const modeSolo = document.getElementById("mode-option-solo");
  const modeGroup = document.getElementById("mode-option-group");
  
  if (modeSolo) {
    modeSolo.addEventListener("click", function() {
      console.log("Mode Solo sélectionné");
      selectMode(this, "solo");
    });
  }
  
  if (modeGroup) {
    modeGroup.addEventListener("click", function() {
      console.log("Mode Groupe sélectionné");
      selectMode(this, "group");
    });
  }
  
  // Bouton continuer après sélection du mode
  const proceedButton = document.getElementById("proceed-to-levels-button");
  if (proceedButton) {
    proceedButton.addEventListener("click", function() {
      console.log("Bouton Continuer cliqué");
      showLevelsFromMode();
    });
  }
  
  // Boutons de retour
  if (backToModeButton) {
    backToModeButton.addEventListener("click", function() {
      console.log("Retour à la sélection de mode");
      if (!isTransitioning) {
        showModeSelection();
      }
    });
  }
  
  if (backToHomeButton) {
    backToHomeButton.addEventListener("click", function() {
      console.log("Retour à la liste des niveaux");
      if (!isTransitioning) {
        showHome();
      }
    });
  }
  
  // Bouton de lancement du niveau
  const launchButton = document.getElementById("launch-button");
  if (launchButton) {
    launchButton.addEventListener("click", function() {
      console.log("Lancement du niveau");
      launchLevelWithTheme();
    });
  }
  
  console.log("Événements initialisés avec succès");
}

// === GESTION DES VUES ===
function hideAllViews() {
  isTransitioning = true;
  
  [modeSelectionView, homeView, levelView].forEach(view => {
    if (view) {
      view.style.transform = "translateX(-100%)";
      view.style.opacity = "0";
    }
  });
  
  // Cacher tous les boutons de retour
  if (backToModeButton) backToModeButton.style.display = "none";
  if (backToHomeButton) backToHomeButton.style.display = "none";
  
  setTimeout(() => {
    isTransitioning = false;
  }, 300);
}

function showModeSelection() {
  hideAllViews();
  
  setTimeout(() => {
    if (modeSelectionView) {
      modeSelectionView.style.transform = "translateX(0%)";
      modeSelectionView.style.opacity = "1";
    }
  }, 100);
  
  // Réinitialiser la sélection
  selectedMode = null;
  document.querySelectorAll(".mode-option").forEach(opt => opt.classList.remove("selected"));
  
  const proceedButton = document.getElementById("proceed-to-levels-button");
  if (proceedButton) {
    proceedButton.textContent = "Continuer";
    proceedButton.disabled = true;
    proceedButton.style.cursor = "not-allowed";
    proceedButton.style.opacity = "0.5";
  }
}

function showLevelsFromMode() {
  if (!selectedMode) {
    const modeSection = document.querySelector(".mode-selection");
    if (modeSection) {
      modeSection.style.transition = "transform 0.1s ease-in-out";
      modeSection.style.transform = "scale(1.02)";
      setTimeout(() => {
        modeSection.style.transform = "scale(1)";
      }, 200);
    }
    return;
  }
  
  showHome();
}

function showHome() {
  hideAllViews();
  
  setTimeout(() => {
    if (homeView) {
      homeView.style.transform = "translateX(0%)";
      homeView.style.opacity = "1";
    }
    displayLevels();
    
    if (backToModeButton) {
      backToModeButton.style.display = "flex";
    }
  }, 100);
}

function showLevel(index) {
  if (index < 0 || index >= levelsData.length) {
    console.error("Index de niveau invalide:", index);
    return;
  }
  
  currentLevel = levelsData[index];
  populateLevelDetails(currentLevel);
  hideAllViews();
  
  setTimeout(() => {
    if (levelView) {
      levelView.style.transform = "translateX(0%)";
      levelView.style.opacity = "1";
    }
    
    if (backToHomeButton) {
      backToHomeButton.style.display = "flex";
    }
  }, 100);
}

// === SÉLECTION DU MODE ===
function selectMode(element, mode) {
  document.querySelectorAll(".mode-option").forEach(opt => opt.classList.remove("selected"));
  element.classList.add("selected");
  selectedMode = mode;
  
  const proceedButton = document.getElementById("proceed-to-levels-button");
  if (proceedButton) {
    proceedButton.disabled = false;
    proceedButton.style.opacity = "1";
    proceedButton.style.cursor = "pointer";
    proceedButton.textContent = mode === "solo" ? "Continuer en Solo" : "Continuer en Groupe";
  }
  
  sessionStorage.setItem("selectedMode", mode);
}

// === GESTION DU THÈME ===
function applyLevelTheme(colors) {
  if (!colors || colors.length < 2) {
    console.warn('Couleurs manquantes pour le thème');
    return;
  }
  
  const root = document.documentElement;
  
  root.style.setProperty('--couleur-jaunePeps', colors[0]);
  root.style.setProperty('--couleur-grisBleuClair', colors[1]);
  root.style.setProperty('--couleur-primary', colors[0]);
  root.style.setProperty('--couleur-secondary', colors[1]);
  
  // Fonction utilitaire pour convertir hex en rgba
  const hex2rgba = (hex, alpha) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };
  
  root.style.setProperty('--couleur-primary-light', hex2rgba(colors[0], 0.2));
  root.style.setProperty('--couleur-primary-hover', hex2rgba(colors[0], 0.8));
  root.style.setProperty('--couleur-secondary-light', hex2rgba(colors[1], 0.3));
  root.style.setProperty('--couleur-secondary-hover', hex2rgba(colors[1], 0.8));
  
  console.log(`Thème appliqué: Principal=${colors[0]}, Secondaire=${colors[1]}`);
}

// === AFFICHAGE DES NIVEAUX ===
function displayLevels() {
  const list = document.getElementById("levels-list");
  if (!list) return;
  
  list.innerHTML = "";
  
  levelsData.forEach((level, index) => {
    const card = createLevelCard(level, index);
    list.appendChild(card);
  });
}

function createLevelCard(level, index) {
  const card = document.createElement("div");
  card.className = "level-card";
  
  // Ajouter l'image de fond si elle existe
  if (level.image) {
    card.style.backgroundColor = level.colors[0];
    card.style.backgroundImage = `url('${level.image}')`;
    card.style.backgroundSize = '200%';
    card.style.backgroundPosition = 'center';
    card.style.backgroundBlendMode = 'screen';
  }
  
  card.addEventListener("click", () => {
    console.log(`Carte niveau cliquée: ${level.name}`);
    showLevel(index);
  });
  
  // Titre du niveau
  const title = document.createElement("div");
  title.className = "level-title";
  title.textContent = level.name;
  card.appendChild(title);
  
  // Container des stickers
  const stickersContainer = document.createElement("div");
  stickersContainer.className = "level-stickers";
  
  level.stickers.slice(0, 3).forEach((stickerPath, i) => {
    const img = document.createElement("img");
    img.className = "sticker";
    img.src = stickerPath;
    img.alt = `Sticker ${i + 1}`;
    img.style.bottom = `${15 + i * 25}%`;
    img.style.right = `${20 + i * 20}%`;
    img.style.transform = `rotate(${(i - 1) * 10}deg)`;
    img.onerror = () => {
      console.log(`Impossible de charger le sticker: ${stickerPath}`);
    };
    stickersContainer.appendChild(img);
  });
  
  card.appendChild(stickersContainer);
  return card;
}

// === DÉTAILS DU NIVEAU ===
function populateLevelDetails(level) {
  if (!level) return;
  
  // Appliquer le thème du niveau
  applyLevelTheme(level.colors);
  
  // Mettre à jour le header avec l'image de fond
  const levelHeader = document.getElementById("level-detail-header");
  if (levelHeader && level.image) {
    levelHeader.style.backgroundColor = level.colors[0];
    levelHeader.style.backgroundImage = `url('${level.image}')`;
    levelHeader.style.backgroundSize = '350%';
    levelHeader.style.backgroundPosition = 'center';
    levelHeader.style.backgroundBlendMode = 'screen';
    levelHeader.style.position = 'relative';
    levelHeader.style.borderRadius = '20px';
    levelHeader.style.boxShadow = '-9px 4px 11px 0px rgba(0, 0, 0, 0.25)';
    
    // Ajouter un overlay pour la lisibilité - CORRECTION: éviter les doublons
    let existingOverlay = levelHeader.querySelector('.header-overlay');
    if (!existingOverlay) {
      const overlay = document.createElement('div');
      overlay.className = 'header-overlay';
      overlay.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(135deg, 
          rgba(0,0,0,0.3) 0%, 
          rgba(0,0,0,0.1) 50%, 
          rgba(0,0,0,0.3) 100%);
        pointer-events: none;
        border-radius: inherit;
      `;
      levelHeader.appendChild(overlay);
    }
  }
  
  // Titre
  const titleElement = document.getElementById("level-detail-title");
  if (titleElement) {
    titleElement.textContent = level.name;
    titleElement.style.position = 'relative';
    titleElement.style.zIndex = '10';
    titleElement.style.color = 'white';
    titleElement.style.textShadow = '2px 2px 8px rgba(0,0,0,0.6)';
  }
  
  // Description
  const descElement = document.getElementById("level-detail-description");
  if (descElement) {
    descElement.innerHTML = `<p>${level.description}</p>`;
  }
  
  // Créateurs
  const creatorsList = document.getElementById("level-detail-creators");
  if (creatorsList) {
    creatorsList.innerHTML = "";
    level.creators.forEach(creatorName => {
      const pill = document.createElement("div");
      pill.className = "creator-pill";
      pill.textContent = creatorName;
      creatorsList.appendChild(pill);
    });
  }
  
  // Stickers dans l'en-tête - CORRECTION: simplifier le positionnement
  const stickerHeader = document.getElementById("level-detail-stickers-header");
  if (stickerHeader) {
    stickerHeader.innerHTML = "";
    stickerHeader.style.position = 'relative';
    stickerHeader.style.zIndex = '10';
    
    level.stickers.forEach((stickerPath, i) => {
      const img = document.createElement("img");
      img.className = "sticker";
      img.src = stickerPath;
      img.alt = `Sticker ${i + 1}`;
      
      // CORRECTION: Positionnement simplifié
      img.style.position = 'static';
      img.style.transform = `rotate(${(i - 1) * 8}deg)`;
      
      img.onerror = () => {
        console.log(`Impossible de charger le sticker: ${stickerPath}`);
        img.style.display = 'none';
      };
      
      stickerHeader.appendChild(img);
    });
  }
}

// === LANCEMENT DU NIVEAU ===
function launchLevelWithTheme() {
  if (!selectedMode || !currentLevel) {
    console.error("Mode ou niveau non sélectionné");
    showNotification("Veuillez sélectionner un mode et un niveau", "error");
    return;
  }
  
  console.log(`Lancement de "${currentLevel.name}" en mode ${selectedMode}`);
  
  const gameConfig = {
    mode: selectedMode,
    level: currentLevel.name,
    scenarioFile: currentLevel.scenarioFile,
    levelColors: currentLevel.colors,
    levelDescription: currentLevel.description,
    timestamp: Date.now()
  };
  
  console.log("Configuration sauvegardée:", gameConfig);
  sessionStorage.setItem('gameConfig', JSON.stringify(gameConfig));
  
  showLoadingScreen();
  
  setTimeout(() => {
    if (selectedMode === 'solo') {
      launchSoloMode();
    } else {
      launchGroupMode();
    }
  }, 500);
}

function launchSoloMode() {
  const soloConfig = {
    lobbyName: `solo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    playerName: 'Joueur Solo',
    autoStart: true,
    skipPlayerInfo: true
  };
  
  sessionStorage.setItem('soloMode', JSON.stringify(soloConfig));
  
  const params = new URLSearchParams({
    mode: 'solo',
    scenario: currentLevel.scenarioFile,
    level: currentLevel.name
  });
  
  console.log("Redirection vers:", `/game?${params.toString()}`);
  window.location.replace(`/game?${params.toString()}`);
}

function launchGroupMode() {
  const params = new URLSearchParams({
    mode: 'intervenant',
    scenario: currentLevel.scenarioFile,
    level: currentLevel.name
  });
  
  console.log("Redirection vers:", `/game?${params.toString()}`);
  window.location.replace(`/game?${params.toString()}`);
}

// === FONCTIONS UTILITAIRES ===
function showLoadingScreen() {
  // CORRECTION: Éviter les doublons de loading screen
  const existingLoader = document.getElementById("loading-overlay");
  if (existingLoader) {
    existingLoader.remove();
  }
  
  const loader = document.createElement("div");
  loader.id = "loading-overlay";
  loader.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    z-index: 10000;
    transition: opacity 0.3s ease;
  `;
  
  loader.innerHTML = `
    <div class="loader" style="
      width: 50px;
      height: 50px;
      border: 5px solid #f3f3f3;
      border-top: 5px solid ${currentLevel ? currentLevel.colors[0] : '#FF6B6B'};
      border-radius: 50%;
      animation: spin 1s linear infinite;
    "></div>
    <p style="
      color: white;
      margin-top: 20px;
      font-size: 18px;
      font-family: 'Inter', sans-serif;
    ">Chargement du niveau...</p>
  `;
  
  // CORRECTION: Éviter les doublons de styles
  if (!document.getElementById("loader-styles")) {
    const style = document.createElement("style");
    style.id = "loader-styles";
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(loader);
}

function showNotification(message, type = "info") {
  const notification = document.createElement("div");
  notification.className = `notification notification-${type}`;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    background: ${type === 'error' ? '#ff4444' : '#4CAF50'};
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    z-index: 10001;
    font-family: 'Inter', sans-serif;
  `;
  
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

function checkReturnFromGame() {
  const urlParams = new URLSearchParams(window.location.search);
  const returnFrom = urlParams.get('return');
  
  if (returnFrom === 'game') {
    const savedMode = sessionStorage.getItem('selectedMode');
    if (savedMode) {
      selectedMode = savedMode;
      showHome();
    }
  }
  
  if (urlParams.has('return')) {
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

// === EXPORT DES FONCTIONS GLOBALES ===
window.menuFunctions = {
  showModeSelection,
  showHome,
  showLevel,
  launchLevelWithTheme,
  getCurrentLevel: () => currentLevel,
  getSelectedMode: () => selectedMode,
  getLevelsData: () => levelsData
};

console.log("Menu.js chargé avec succès");