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
    colors: ["#f800aaff", "#72ff14ff"],
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
    scenarioFile: "parcours-vie-json-imagais.json"
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
  // Vous pouvez ajouter d'autres niveaux ici si vous avez d'autres fichiers JSON
];

// === VARIABLES GLOBALES ===
let selectedMode = null; // 'solo' ou 'group'
let currentLevel = null; // Niveau actuellement sélectionné
let isTransitioning = false; // Pour éviter les doubles clics

// === RÉFÉRENCES DOM ===
const backToModeButton = document.getElementById("back-to-mode-button");
const backToHomeButton = document.getElementById("back-to-home-button");
const modeSelectionView = document.getElementById("mode-selection-view");
const homeView = document.getElementById("home-view");
const levelView = document.getElementById("level-view");

// === INITIALISATION ===
document.addEventListener("DOMContentLoaded", () => {


  console.log("Menu initialisé");
    // FIX 1: Toujours cacher l'overlay au chargement
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
    
    // FIX 2: Gérer le bouton retour
    window.addEventListener('popstate', function(event) {
        console.log('🔙 Bouton retour détecté');
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
  
  // Boutons de sélection de mode - utiliser les IDs corrects
  const modeSolo = document.getElementById("mode-option-solo");
  const modeGroup = document.getElementById("mode-option-group");
  
  if (modeSolo) {
    modeSolo.addEventListener("click", function() {
      console.log("Mode Solo sélectionné");
      selectMode(this, "solo");
    });
  } else {
    console.warn("Élément mode-option-solo non trouvé");
  }
  
  if (modeGroup) {
    modeGroup.addEventListener("click", function() {
      console.log("Mode Groupe sélectionné");
      selectMode(this, "group");
    });
  } else {
    console.warn("Élément mode-option-group non trouvé");
  }
  
  // Bouton continuer après sélection du mode
  const proceedButton = document.getElementById("proceed-to-levels-button");
  if (proceedButton) {
    proceedButton.addEventListener("click", function() {
      console.log("Bouton Continuer cliqué");
      showLevelsFromMode();
    });
  } else {
    console.warn("Bouton proceed-to-levels-button non trouvé");
  }
  
  // Boutons de retour
  const backToModeBtn = document.getElementById("back-to-mode-button");
  if (backToModeBtn) {
    backToModeBtn.addEventListener("click", function() {
      console.log("Retour à la sélection de mode");
      if (!isTransitioning) {
        showModeSelection();
      }
    });
  }
  
  const backToHomeBtn = document.getElementById("back-to-home-button");
  if (backToHomeBtn) {
    backToHomeBtn.addEventListener("click", function() {
      console.log("Retour à la liste des niveaux");
      if (!isTransitioning) {
        showHome();
      }
    });
  }
  
  // Bouton de lancement du niveau - noter l'ID différent
  const launchButton = document.getElementById("launch-button");
  if (launchButton) {
    launchButton.addEventListener("click", function() {
      console.log("Lancement du niveau");
      launchLevelWithTheme();
    });
  } else {
    console.warn("Bouton launch-button non trouvé");
  }
  
  console.log("Événements initialisés avec succès");
}

// === GESTION DES VUES ===
function hideAllViews() {
  isTransitioning = true;
  
  [modeSelectionView, homeView, levelView].forEach(view => {
    if (view) {
      view.style.transform = "translateY(-100%)";
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
    // Animation pour indiquer qu'un mode doit être sélectionné
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
    
    // Afficher le bouton retour vers la sélection de mode
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
    
    // Afficher le bouton retour vers la liste des niveaux
    if (backToHomeButton) {
      backToHomeButton.style.display = "flex";
    }
  }, 100);
}

// === SÉLECTION DU MODE ===
function selectMode(element, mode) {
  // Retirer la sélection précédente
  document.querySelectorAll(".mode-option").forEach(opt => opt.classList.remove("selected"));
  
  // Ajouter la sélection
  element.classList.add("selected");
  selectedMode = mode;
  
  // Activer le bouton continuer
  const proceedButton = document.getElementById("proceed-to-levels-button");
  if (proceedButton) {
    proceedButton.disabled = false;
    proceedButton.style.opacity = "1";
    proceedButton.style.cursor = "pointer";
    proceedButton.textContent = mode === "solo" ? "Continuer en Solo" : "Continuer en Groupe";
  }
  
  // Sauvegarder le mode sélectionné
  sessionStorage.setItem("selectedMode", mode);
}
function applyLevelTheme(colors) {
  if (!colors || colors.length < 2) {
    console.warn('❌ Couleurs manquantes pour le thème');
    return;
  }
  
  const root = document.documentElement;
  
  // Couleur principale [0] - Remplace jaunePeps
  root.style.setProperty('--couleur-jaunePeps', colors[0]);
  
  // Couleur secondaire [1] - Remplace grisBleuClair  
  root.style.setProperty('--couleur-grisBleuClair', colors[1]);
  
  // Créer des variations utiles
  root.style.setProperty('--couleur-primary', colors[0]);
  root.style.setProperty('--couleur-secondary', colors[1]);
  
  // Variations avec transparence pour les hovers
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
  
  console.log(`🎨 Thème appliqué: Principal=${colors[0]}, Secondaire=${colors[1]}`);
}

// === 2. BADGE COLORÉ DU NIVEAU ===
function createLevelBadge(levelName, colors) {
  // Retirer l'ancien badge s'il existe
  const oldBadge = document.getElementById('level-theme-badge');
  if (oldBadge) oldBadge.remove();
  
  // Créer le nouveau badge
  const badge = document.createElement('div');
  badge.id = 'level-theme-badge';
  badge.className = 'level-theme-badge';
  badge.innerHTML = `
    <div class="badge-colors">
      <span class="color-dot" style="background: ${colors[0]}"></span>
      <span class="color-dot" style="background: ${colors[1]}"></span>
    </div>
    <span class="badge-text">${levelName}</span>
  `;
  
  // Positionner le badge
  badge.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: white;
    padding: 8px 16px;
    border-radius: 25px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    display: flex;
    align-items: center;
    gap: 10px;
    z-index: 1000;
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    font-weight: 600;
    border: 2px solid ${colors[0]};
  `;
  
  document.body.appendChild(badge);
  
  // Ajouter les styles pour les dots
  if (!document.getElementById('badge-styles')) {
    const style = document.createElement('style');
    style.id = 'badge-styles';
    style.textContent = `
      .level-theme-badge {
        animation: slideIn 0.5s ease-out;
      }
      
      .badge-colors {
        display: flex;
        gap: 4px;
      }
      
      .color-dot {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
      }
      
      @keyframes slideIn {
        from {
          transform: translateX(100px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);
  }
}

// === AFFICHAGE DES NIVEAUX ===
function displayLevels() {
  const list = document.getElementById("levels-list");
  if (!list) return;
  
  list.innerHTML = ""; // Vider la liste
  
  levelsData.forEach((level, index) => {
    const card = createLevelCard(level, index);
    list.appendChild(card);
  });
}

function createLevelCard(level, index) {
  const card = document.createElement("div");
  card.className = "level-card";
  card.style.setProperty(
    "--level-bg",
    `linear-gradient(45deg, ${level.colors[0]}33, ${level.colors[1]}33)`
  );
  
  // Ajouter l'image de fond si elle existe
  if (level.image) {
    card.style.backgroundColor = level.colors[0];
    card.style.backgroundImage = `url('${level.image}')`;
    card.style.backgroundSize = '200%';
    card.style.backgroundPosition = 'center';
    card.style.backgroundBlendMode = 'screen';
  }
  
  // Utiliser addEventListener au lieu de onclick
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
      //img.style.display = 'none'; // Cacher si l'image ne charge pas
    };
    stickersContainer.appendChild(img);
  });
  
  card.appendChild(stickersContainer);
  return card;
}

// === DÉTAILS DU NIVEAU ===
function populateLevelDetails(level) {
  if (!level) return;
  
  // Mettre à jour les variables CSS avec les couleurs du niveau
  document.documentElement.style.setProperty(
    "--level-color-1-rgb",
    hexToRgb(level.colors[0])
  );
  document.documentElement.style.setProperty(
    "--level-color-2-rgb",
    hexToRgb(level.colors[1])
  );
  document.documentElement.style.setProperty(
    "--ui-accent-color",
    level.colors[0]
  );
  
  // Appliquer l'image et les couleurs au header
  const levelHeader = document.getElementById("level-detail-header");
  if (levelHeader && level.image) {
    levelHeader.style.backgroundColor = level.colors[0];
    levelHeader.style.backgroundImage = `url('${level.image}')`;
    levelHeader.style.backgroundSize = '200%';
    levelHeader.style.backgroundPosition = 'center';
    levelHeader.style.backgroundBlendMode = 'screen';
    // Ajouter un peu de style supplémentaire pour améliorer la lisibilité
    levelHeader.style.position = 'relative';
    levelHeader.style.padding = '60px 20px';
    levelHeader.style.borderRadius = '20px';
    levelHeader.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)';
    
    // Ajouter un overlay pour améliorer la lisibilité du texte
    const existingOverlay = levelHeader.querySelector('.header-overlay');
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
  
  // Titre et description
  const titleElement = document.getElementById("level-detail-title");
  if (titleElement) {
    titleElement.textContent = level.name;
    // Style du titre pour qu'il soit visible sur l'image
    titleElement.style.position = 'relative';
    titleElement.style.zIndex = '2';
    titleElement.style.color = 'white';
    titleElement.style.textShadow = '2px 2px 8px rgba(0,0,0,0.6)';
    titleElement.style.fontSize = '2.5rem';
    titleElement.style.fontWeight = 'bold';
    titleElement.style.zIndex = '10';
  }
  
  const descElement = document.getElementById("level-detail-description");
  if (descElement) descElement.innerHTML = `<p>${level.description}</p>`;
  
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
  
  // Stickers dans l'en-tête
  const stickerHeader = document.getElementById("level-detail-stickers-header");
  if (stickerHeader) {
    stickerHeader.innerHTML = "";
    stickerHeader.style.position = 'relative';
    stickerHeader.style.zIndex = '3';
    
    level.stickers.forEach((stickerPath, i) => {
      const img = document.createElement("img");
      img.className = "sticker";
      img.src = stickerPath;
      img.alt = `Sticker ${i + 1}`;
      
      // Positions des stickers
      if (i === 0) {
        img.style.top = "-80px";
        img.style.left = "20px";
        img.style.transform = "rotate(-8deg)";
      } else if (i === 1) {
        img.style.top = "-100px";
        img.style.right = "30px";
        img.style.left = "auto";
        img.style.transform = "rotate(12deg)";
      } else if (i === 2) {
        img.style.bottom = "20px";
        img.style.left = "40px";
        img.style.top = "auto";
        img.style.transform = "rotate(-5deg)";
      }
      
      img.onerror = () => {
        img.style.display = 'none';
      };
      
      stickerHeader.appendChild(img);
    });
  }
  
  // Mettre à jour le bouton de lancement
  updateLaunchButton();
}

function updateLaunchButton() {
  const launchButton = document.getElementById("launch-level-button");
  if (launchButton && selectedMode && currentLevel) {
    launchButton.textContent = selectedMode === "solo" 
      ? `🎮 Jouer "${currentLevel.name}" en Solo`
      : `👥 Créer une partie "${currentLevel.name}"`;
    launchButton.disabled = false;
  }
}

// === LANCEMENT DU NIVEAU ===
function launchLevelWithTheme() {
  if (!selectedMode || !currentLevel) {
    console.error("Mode ou niveau non sélectionné");
    showNotification("Veuillez sélectionner un mode et un niveau", "error");
    return;
  }
  
  console.log(`🚀 Lancement de "${currentLevel.name}" en mode ${selectedMode}`);
  
  // Sauvegarder la configuration avec les couleurs
  const gameConfig = {
    mode: selectedMode,
    level: currentLevel.name,
    scenarioFile: currentLevel.scenarioFile,
    levelColors: currentLevel.colors, // IMPORTANT: les couleurs du niveau
    levelDescription: currentLevel.description,
    timestamp: Date.now()
  };
  
  console.log("💾 Configuration sauvegardée:", gameConfig);
  sessionStorage.setItem('gameConfig', JSON.stringify(gameConfig));
  
  // Appliquer le thème immédiatement dans le menu (preview)
  applyLevelTheme(currentLevel.colors);
  
  // Afficher un loader pendant la transition
  showLoadingScreen();
  
  // Rediriger selon le mode
  setTimeout(() => {
    if (selectedMode === 'solo') {
      console.log("Lancement en mode SOLO");
      launchSoloMode();
    } else {
      console.log("Lancement en mode GROUPE");
      launchGroupMode();
    }
  }, 500);
}

function launchSoloMode() {
  // Créer une configuration pour le mode solo
  const soloConfig = {
    lobbyName: `solo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    playerName: 'Joueur Solo',
    autoStart: true,
    skipPlayerInfo: true
  };
  
  sessionStorage.setItem('soloMode', JSON.stringify(soloConfig));
  
  // Rediriger vers la page du jeu avec les paramètres solo
  // Utiliser /game selon les routes du serveur
  const params = new URLSearchParams({
    mode: 'solo',
    scenario: currentLevel.scenarioFile,
    level: currentLevel.name
  });
  
  console.log("Redirection vers:", `/game?${params.toString()}`);
  window.location.replace(`/game?${params.toString()}`);
}

function launchGroupMode() {
  // Rediriger vers la page du jeu en mode intervenant
  const params = new URLSearchParams({
    mode: 'intervenant',
    scenario: currentLevel.scenarioFile,
    level: currentLevel.name
  });
  
  console.log("Redirection vers:", `/game?${params.toString()}`);
  window.location.replace(`/game?${params.toString()}`);
}

// === FONCTIONS UTILITAIRES ===
function hexToRgb(hex) {
  let r = 0, g = 0, b = 0;
  
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.substring(1, 3), 16);
    g = parseInt(hex.substring(3, 5), 16);
    b = parseInt(hex.substring(5, 7), 16);
  }
  
  return `${r},${g},${b}`;
}

function showLoadingScreen() {
  // Créer un overlay de chargement
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
  
  // Ajouter l'animation CSS si elle n'existe pas
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
    animation: slideIn 0.3s ease;
    font-family: 'Inter', sans-serif;
  `;
  
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = "slideOut 0.3s ease";
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

function checkReturnFromGame() {
  // Vérifier si on revient du jeu (par exemple avec le bouton retour)
  const urlParams = new URLSearchParams(window.location.search);
  const returnFrom = urlParams.get('return');
  
  if (returnFrom === 'game') {
    // Restaurer l'état précédent si disponible
    const savedMode = sessionStorage.getItem('selectedMode');
    if (savedMode) {
      selectedMode = savedMode;
      // Optionnel : aller directement à la sélection des niveaux
      showHome();
    }
  }
  
  // Nettoyer l'URL
  if (urlParams.has('return')) {
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

// === EXPORT DES FONCTIONS GLOBALES ===
// Pour permettre l'accès depuis d'autres scripts si nécessaire
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