// ============================================================================
// GAME.JS - Script principal du jeu avec support multi-scénarios ET THÈME URL
// ============================================================================

// ============================================================================
// 1. VARIABLES GLOBALES ET CONFIGURATION
// ============================================================================

const socket = io();

// Configuration du jeu
const gameConfig = {
  mode: null,           // 'solo', 'intervenant', 'player'
  lobby: '',            // Nom du lobby actuel
  playerName: '',       // Nom du joueur
  scenario: null,       // Données du scénario
  scenarioFile: null,   // Fichier du scénario
  levelInfo: null,      // Infos du niveau depuis le menu
  levelColors: null,    // Couleurs du thème
  levelName: null       // Nom du niveau
};

// État du jeu
const gameState = {
  currentQuestion: null,
  allPlayers: [],
  votedPlayers: new Set(),
  hasVoted: false,
  responses: {},
  voteComponents: {},
  chaptersMenu: null,
  playerLink: ''
};

// ============================================================================
// 2. INITIALISATION ET POINT D'ENTRÉE
// ============================================================================

document.addEventListener('DOMContentLoaded', function() {
  console.log('🎮 Initialisation du jeu...');
  
  // PREMIÈRE CHOSE: Charger et appliquer le thème (modifié pour gérer les URLs)
  initializeGameThemeWithURL();
  
  // Récupérer la configuration depuis le menu
  loadGameConfiguration();
  
  // Initialiser les événements
  initializeEventListeners();
  
  // Initialiser les animations et effets visuels
  initializeVisualEffects();
  
  // Déterminer le mode et démarrer
  determineGameMode();
});

// === SYSTÈME DE THÈME AMÉLIORÉ AVEC URL PARAMETERS ===
function initializeGameThemeWithURL() {
  // 1. D'abord essayer de récupérer depuis l'URL (pour les joueurs)
  const urlParams = new URLSearchParams(window.location.search);
  const colorsParam = urlParams.get('colors');
  const levelNameParam = urlParams.get('level');
  
  if (colorsParam) {
    // Décoder les couleurs depuis l'URL
    const colors = colorsParam.split(',').map(c => c.startsWith('#') ? c : '#' + c);
    
    console.log(`✅ Couleurs trouvées dans l'URL: ${colors}`);
    
    // Sauvegarder dans gameConfig
    gameConfig.levelColors = colors;
    gameConfig.levelName = levelNameParam ? decodeURIComponent(levelNameParam) : 'Niveau';
    
    // Appliquer le thème
    applyLevelTheme(colors);
    
    // Créer le badge
    if (levelNameParam) {
      createLevelBadge(decodeURIComponent(levelNameParam), colors);
    }
    
    // Sauvegarder pour cette session
    sessionStorage.setItem('gameConfig', JSON.stringify({
      levelColors: colors,
      level: gameConfig.levelName,
      fromURL: true
    }));
    
    return true;
  }
  
  // 2. Sinon, essayer depuis sessionStorage (pour l'intervenant)
  const storedConfig = sessionStorage.getItem('gameConfig');
  
  if (storedConfig) {
    try {
      const config = JSON.parse(storedConfig);
      
      if (config.levelColors && config.level) {
        // Sauvegarder dans gameConfig
        gameConfig.levelColors = config.levelColors;
        gameConfig.levelName = config.level;
        
        // Appliquer le thème
        applyLevelTheme(config.levelColors);
        
        // Créer le badge
        createLevelBadge(config.level, config.levelColors);
        
        console.log(`✅ Thème "${config.level}" chargé depuis sessionStorage`);
        return true;
      }
    } catch (error) {
      console.error('Erreur lors du chargement du thème:', error);
    }
  }
  
  // 3. Fallback: thème par défaut
  console.warn('⚠️ Aucun thème trouvé, utilisation des couleurs par défaut');
  applyDefaultTheme();
  return false;
}

function applyDefaultTheme() {
  const defaultColors = ['#e9bc40', '#c9e2e5']; // Jaune/Bleu par défaut
  gameConfig.levelColors = defaultColors;
  gameConfig.levelName = 'Niveau par défaut';
  applyLevelTheme(defaultColors);
  console.log('🎨 Thème par défaut appliqué');
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
  
  console.log(`🎨 Thème appliqué dans le jeu: Principal=${colors[0]}, Secondaire=${colors[1]}`);
}

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
    animation: slideIn 0.5s ease-out;
  `;
  
  document.body.appendChild(badge);
  
  // Ajouter les styles pour les dots si pas déjà présents
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
  
  console.log(`📖 Badge créé pour le niveau: ${levelName}`);
}

// ============================================================================
// 3. CONFIGURATION ET DÉTECTION DU MODE
// ============================================================================

function loadGameConfiguration() {
  // Récupérer la configuration depuis sessionStorage (venant du menu)
  const storedConfig = sessionStorage.getItem('gameConfig');
  if (storedConfig) {
    const config = JSON.parse(storedConfig);
    gameConfig.levelInfo = config;
    console.log('📦 Configuration chargée:', config);
  }
  
  // Récupérer le mode solo si présent
  const soloMode = sessionStorage.getItem('soloMode');
  if (soloMode) {
    const soloConfig = JSON.parse(soloMode);
    gameConfig.mode = 'solo';
    gameConfig.lobby = soloConfig.lobbyName;
    gameConfig.playerName = soloConfig.playerName;
    console.log('🎮 Mode solo détecté:', soloConfig);
  }
}

function determineGameMode() {
  const urlParams = new URLSearchParams(window.location.search);
  const mode = urlParams.get('mode');
  const scenarioFile = urlParams.get('scenario');
  const lobbyFromUrl = urlParams.get('lobby');
  const level = urlParams.get('level');
  
  console.log('🔍 Paramètres URL:', { mode, scenarioFile, lobbyFromUrl, level });
  
  // Mode Solo (depuis le menu)
  if (mode === 'solo' && scenarioFile) {
    initializeSoloMode(scenarioFile, level);
  }
  // Mode Intervenant (depuis le menu)
  else if (mode === 'intervenant' && scenarioFile) {
    initializeIntervenantMode(scenarioFile, level);
  }
  // Mode Joueur (rejoint via URL)
  else if (lobbyFromUrl) {
    initializePlayerMode(lobbyFromUrl);
  }
  // Par défaut : mode intervenant classique
  else {
    gameConfig.mode = 'intervenant';
    showScreen('intervenant-screen');
  }
}

// ============================================================================
// 4. INITIALISATION DES DIFFÉRENTS MODES
// ============================================================================

function initializeSoloMode(scenarioFile, level) {
  console.log('🎮 Initialisation mode SOLO');
  gameConfig.mode = 'solo';
  gameConfig.scenarioFile = scenarioFile;
  
  // Récupérer la config solo
  const soloConfig = JSON.parse(sessionStorage.getItem('soloMode') || '{}');
  gameConfig.lobby = soloConfig.lobbyName || `solo_${Date.now()}`;
  gameConfig.playerName = soloConfig.playerName || 'Joueur Solo';
  
  // Créer le lobby en mode solo
  socket.emit('create-lobby', {
    lobbyName: gameConfig.lobby,
    scenarioFile: scenarioFile,
    mode: 'solo'
  });
  
  // Afficher l'interface solo
  showScreen('solo-screen');
  
  // Mettre à jour le pill avec la couleur du niveau
  const pillEl = document.querySelector('#solo-screen .pill');
  if (pillEl && gameConfig.levelColors) {
    // Appliquer la couleur principale au pill
    pillEl.style.background = gameConfig.levelColors[0];
    pillEl.style.color = gameConfig.levelColors[0].startsWith('#e') ? 
                          'var(--couleur-noirVolcan)' : 'var(--couleur-blancSite)';
  }
  
  // Mettre à jour le texte du pill
  const lobbyNameEl = document.getElementById('soloLobbyName');
  if (lobbyNameEl) {
    lobbyNameEl.textContent = `Mode Solo - ${level || gameConfig.levelName || 'Niveau'}`;
  }
}

function initializeIntervenantMode(scenarioFile, level) {
  console.log('👨‍🏫 Initialisation mode INTERVENANT');
  gameConfig.mode = 'intervenant';
  gameConfig.scenarioFile = scenarioFile;
  
  // Stocker le scénario pour la création du lobby
  sessionStorage.setItem('currentScenarioFile', scenarioFile);
  
  // Afficher l'écran de création
  showScreen('intervenant-screen');
  showElement('intervenant-creation');
  
  // Afficher les infos du niveau sélectionné
  displaySelectedLevel(level);
}

function initializePlayerMode(lobbyName) {
  console.log('👤 Initialisation mode JOUEUR');
  gameConfig.mode = 'player';
  gameConfig.lobby = lobbyName;
  
  showScreen('player-screen');
  document.getElementById('lobbyCodeInput').value = lobbyName;
  hideElement('player-join');
  showElement('player-info');
  
  socket.emit('join-lobby', { lobbyName: lobbyName });
}

// ============================================================================
// 5. GESTION DES ÉVÉNEMENTS DOM
// ============================================================================

function initializeEventListeners() {
  // === Boutons Intervenant ===
  const intervenantButtons = {
    'createLobbyBtn': createLobby,
    'copyLinkBtn': copyPlayerLink,
    'startGameBtn': startGame,
    'endGameBtn': endGame,
    'generateCsvBtn': generateCsv,
    'sendResultsBtn': sendResults,
    'newSessionBtn': newSession,
    'backToMenuBtn': backToMenu
  };
  
  // === Boutons Joueur ===
  const playerButtons = {
    'joinLobbyBtn': joinLobby,
    'randomFillBtn': fillRandomInfo,
    'backToHomeBtn': backToHome,
    'showAnswersBtn': showAnswerPanel,
    'closeAnswersBtn': hideAnswerPanel,
    'sendFeedbackBtn': sendPlayerFeedback
  };
  
  // === Boutons Solo ===
  const soloButtons = {
    'soloShowAnswersBtn': showSoloAnswerPanel,
    'soloCloseAnswersBtn': hideSoloAnswerPanel,
    'soloReplayBtn': () => location.reload(),
    'soloNewLevelBtn': backToMenu,
    'soloDownloadBtn': () => showNotification('Fonction PDF à implémenter', 'info'),
    'soloShareBtn': () => showNotification('Fonction partage à implémenter', 'info')
  };
  
  // Attacher tous les événements
  attachButtonEvents(intervenantButtons);
  attachButtonEvents(playerButtons);
  attachButtonEvents(soloButtons);
  
  // Formulaires
  const playerForm = document.getElementById('playerInfoForm');
  if (playerForm) {
    playerForm.onsubmit = submitPlayerInfo;
  }
  
  // Bouton CSV final
  const finalCsvBtn = document.getElementById('finalDownloadCsvBtn');
  if (finalCsvBtn) {
    finalCsvBtn.onclick = () => {
      const existingLink = document.getElementById('csvDownloadLink');
      if (existingLink && existingLink.href) {
        existingLink.click();
      } else {
        generateCsv();
      }
    };
  }
}

function attachButtonEvents(buttons) {
  Object.entries(buttons).forEach(([id, handler]) => {
    const element = document.getElementById(id);
    if (element) {
      element.onclick = handler;
    }
  });
}

// ============================================================================
// 6. FONCTIONS MODE INTERVENANT
// ============================================================================

function createLobby() {
  const lobbyName = document.getElementById('lobbyNameInput').value.trim();
  
  if (!lobbyName) {
    showNotification('Veuillez entrer un nom de partie', 'warning');
    return;
  }
  
  gameConfig.lobby = lobbyName;
  
  // Récupérer le scénario depuis la config ou l'URL
  const scenarioFile = gameConfig.scenarioFile || 
                       sessionStorage.getItem('currentScenarioFile') || 
                       'scenario_lgbtqia_V2.json';
  
  // S'assurer que les couleurs et le nom du niveau sont bien récupérés
  const storedConfig = sessionStorage.getItem('gameConfig');
  if (storedConfig) {
    try {
      const config = JSON.parse(storedConfig);
      if (config.levelColors && !gameConfig.levelColors) {
        gameConfig.levelColors = config.levelColors;
      }
      if (config.level && !gameConfig.levelName) {
        gameConfig.levelName = config.level;
      }
    } catch (e) {
      console.warn('Erreur récupération config:', e);
    }
  }
  
  socket.emit('create-lobby', {
    lobbyName: lobbyName,
    scenarioFile: scenarioFile,
    mode: 'group'
  });
}

function generateShareableLink(lobbyName) {
  // Utiliser /game au lieu de /game.html (selon server.js)
  const baseUrl = window.location.origin + '/game';
  
  // Créer les paramètres URL incluant les couleurs
  const params = new URLSearchParams({
    lobby: lobbyName
  });
  
  // Ajouter les couleurs si disponibles
  if (gameConfig.levelColors) {
    params.append('colors', gameConfig.levelColors.join(','));
  }
  
  // Ajouter le nom du niveau si disponible
  if (gameConfig.levelName) {
    params.append('level', gameConfig.levelName);
  }
  
  const fullUrl = `${baseUrl}?${params.toString()}`;
  
  console.log(`🔗 Lien généré avec thème: ${fullUrl}`);
  
  return fullUrl;
}

function generateQRCode(text) {
  const qrCodeElement = document.getElementById('qrcode');
  if (!qrCodeElement) return;
  
  qrCodeElement.innerHTML = '';
  
  // Utiliser le lien avec les couleurs
  const urlWithTheme = generateShareableLink(gameConfig.lobby);
  
  try {
    if (typeof QRious !== 'undefined') {
      const canvas = document.createElement('canvas');
      const qr = new QRious({
        element: canvas,
        value: urlWithTheme, // Utiliser l'URL avec thème
        size: 200,
        foreground: gameConfig.levelColors ? gameConfig.levelColors[0] : '#322a22',
        background: '#fafff6'
      });
      
      qrCodeElement.appendChild(canvas);
      console.log(`📱 QR Code généré avec thème pour: ${urlWithTheme}`);
    }
  } catch (e) {
    console.error('Erreur QR Code:', e);
  }
}

function startGame() {
  console.log('🚀 Démarrage de la partie...');
  socket.emit('start-game');
  
  // Initialiser le menu des chapitres si disponible
  const imageContainer = document.querySelector('.image-container');
  if (imageContainer && gameConfig.scenario) {
    gameState.chaptersMenu = new ChaptersMenu(imageContainer, {
      scenario: gameConfig.scenario,
      currentQuestion: null,
      responses: gameState.responses[gameConfig.lobby] || {},
      questionPath: []
    });
  }
  
  hideElement('qr-overlay');
}

function endGame() {
  if (confirm('Êtes-vous sûr de vouloir terminer la partie ?')) {
    socket.emit('end-game');
  }
}

function generateCsv() {
  socket.emit('generate-csv');
  showNotification('Génération du CSV en cours...', 'info');
}

function copyPlayerLink() {
  // Générer le lien avec les couleurs
  const linkWithTheme = generateShareableLink(gameConfig.lobby);
  
  navigator.clipboard.writeText(linkWithTheme).then(() => {
    const btn = document.getElementById('copyLinkBtn');
    btn.textContent = '✔ Copié !';
    showNotification('Lien copié avec le thème !', 'success');
    setTimeout(() => {
      btn.textContent = '📋 Copier le lien';
    }, 2000);
  }).catch(() => {
    // Fallback pour les navigateurs plus anciens
    const textArea = document.createElement('textarea');
    textArea.value = linkWithTheme;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    showNotification('Lien copié avec le thème !', 'success');
  });
}

// ============================================================================
// 7. FONCTIONS MODE JOUEUR
// ============================================================================

function joinLobby() {
  const lobby = document.getElementById('lobbyCodeInput').value.trim();
  
  if (!lobby) {
    showNotification('Veuillez entrer le code de la partie', 'warning');
    return;
  }
  
  gameConfig.lobby = lobby;
  socket.emit('join-lobby', { lobbyName: lobby });
}

function submitPlayerInfo(e) {
  e.preventDefault();
  
  const info = {
    prenom: document.getElementById('playerPrenom').value.trim(),
    age: document.getElementById('playerAge').value,
    genre: document.getElementById('playerGenre').value,
    ecole: document.getElementById('playerEcole').value.trim()
  };
  
  gameConfig.playerName = info.prenom;
  socket.emit('player-info', info);
}

function fillRandomInfo() {
  const prenoms = ['Alex', 'Jordan', 'Charlie', 'Sam', 'Robin', 'Casey', 'Taylor', 'Morgan'];
  const ecoles = ['Lycée Victor Hugo', 'Collège Jean Moulin', 'Lycée Saint-Exupéry', 'Collège Simone Veil'];
  
  document.getElementById('playerPrenom').value = prenoms[Math.floor(Math.random() * prenoms.length)];
  document.getElementById('playerAge').value = Math.floor(Math.random() * 8) + 12;
  document.getElementById('playerGenre').value = ['Fille', 'Garçon', 'Autre'][Math.floor(Math.random() * 3)];
  document.getElementById('playerEcole').value = ecoles[Math.floor(Math.random() * ecoles.length)];
}

function sendPlayerFeedback() {
  const feedback = document.getElementById('playerFeedback').value;
  if (feedback.trim()) {
    socket.emit('player-feedback', { feedback });
    showNotification('Merci pour votre feedback !', 'success');
    document.getElementById('playerFeedback').value = '';
  }
}

// ============================================================================
// 8. FONCTIONS MODE SOLO (HARMONISÉES AVEC MODE JOUEUR)
// ============================================================================

async function displaySoloQuestion(questionData) {
  gameState.currentQuestion = questionData;
  gameState.hasVoted = false;
  
  // Cacher le panneau de réponses au début
  hideSoloAnswerPanel();
  hideElement('soloWaitingMessage');
  
  // Afficher l'image contextuelle
  if (questionData.contextual_image) {
    const imageEl = document.getElementById('soloContextImage');
    if (imageEl) imageEl.src = questionData.contextual_image;
  }
  
  // Afficher le contexte
  const contextDiv = document.getElementById('soloQuestionContext');
  if (contextDiv) {
    if (questionData.context) {
      contextDiv.textContent = questionData.context;
      showElement('soloQuestionContext');
    } else {
      hideElement('soloQuestionContext');
    }
  }
  
  // Afficher conversation messenger si présente
  if (questionData.type === 'messenger_scenario' && questionData.conversation) {
    await displaySoloMessengerConversation(questionData.conversation);
    showElement('soloMessengerView');
  } else {
    hideElement('soloMessengerView');
  }
  
  // Gérer les questions "Continuer"
  if (questionData.isContinue || isContinueQuestion(questionData)) {
    handleSoloContinue(questionData);
    return;
  }
  
  // Question normale
  setupSoloChoices(questionData);
}

function handleSoloContinue(questionData) {
  console.log('Question Continue en mode solo:', questionData.id);
  
  document.getElementById('soloQuestionTitle').textContent = 'Cliquez pour continuer';
  
  const choicesDiv = document.getElementById('soloAnswerChoices');
  if (!choicesDiv) return;
  
  choicesDiv.innerHTML = '';
  
  const continueBtn = document.createElement('button');
  continueBtn.className = 'button button-primary continue-button';
  continueBtn.innerHTML = `
    <span>${questionData.choices[0] || 'Continuer'}</span>
    <span class="arrow">→</span>
  `;
  
  continueBtn.onclick = () => {
    if (questionData.nextQuestions && questionData.nextQuestions.A) {
      socket.emit('choose-next-question', { 
        nextQuestionId: questionData.nextQuestions.A 
      });
    }
    
    continueBtn.classList.add('clicked');
    continueBtn.disabled = true;
    
    document.getElementById('soloAnswerStatus').textContent = '✅ Suite de l\'histoire...';
    hideSoloAnswerPanel();
    showElement('soloWaitingMessage');
  };
  
  choicesDiv.appendChild(continueBtn);
  showElement('soloShowAnswersBtn');
}

function setupSoloChoices(questionData) {
  const titleEl = document.getElementById('soloQuestionTitle');
  if (titleEl) titleEl.textContent = questionData.question || 'Que faire ?';
  
  const choicesDiv = document.getElementById('soloAnswerChoices');
  if (!choicesDiv) return;
  
  choicesDiv.innerHTML = '';
  gameState.voteComponents = {};
  
  questionData.choices.forEach((choice, index) => {
    const letter = String.fromCharCode(65 + index);
    const choiceContainer = document.createElement('div');
    choiceContainer.className = 'answer-choice-container';
    choiceContainer.id = `solo-answer-choice-${letter}`;
    
    choicesDiv.appendChild(choiceContainer);
    
    gameState.voteComponents[letter] = new VoteComponent(choiceContainer, {
      letter: letter,
      text: choice,
      count: 0,
      totalVotes: 0,
      isClickable: true,
      showVoters: false,
      onVote: (selectedLetter) => submitSoloAnswer(questionData.id, selectedLetter, questionData.nextQuestions[selectedLetter])
    });
  });
  
  document.getElementById('soloAnswerStatus').textContent = '';
  showElement('soloShowAnswersBtn');
}

function submitSoloAnswer(questionId, answer, nextQuestionId) {
  if (gameState.hasVoted) return;
  
  gameState.hasVoted = true;
  socket.emit('player-answer', { questionId, answer });
  
  // Désactiver tous les choix
  Object.values(gameState.voteComponents).forEach(component => {
    component.disable();
  });
  
  // Animer le choix sélectionné
  if (gameState.voteComponents[answer]) {
    gameState.voteComponents[answer].showVoteAnimation();
    gameState.voteComponents[answer].update({
      count: 1,
      totalVotes: 1
    });
  }
  
  document.getElementById('soloAnswerStatus').textContent = '✅ Choix enregistré !';
  showElement('soloWaitingMessage');
  
  // Passer à la question suivante après un délai
  if (nextQuestionId) {
    setTimeout(() => {
      socket.emit('choose-next-question', { nextQuestionId });
      hideSoloAnswerPanel();
    }, 1000);
  }
}

async function displaySoloMessengerConversation(conversation) {
  const messengerDiv = document.getElementById('soloMessengerView');
  if (!messengerDiv) return;
  
  messengerDiv.innerHTML = '<div class="messenger-messages"></div>';
  
  const messages = conversation.messages.map(message => {
    const participant = conversation.participants.find(p => p.id === message.sender);
    return {
      sender: participant.name,
      avatar: message.avatar || participant.avatar,
      content: message.content,
      isCurrentUser: participant.isCurrentUser
    };
  });
  
  await animateSoloMessages(messages);
}

async function animateSoloMessages(messages) {
  const container = document.querySelector('#soloMessengerView .messenger-messages');
  if (!container) return;
  
  for (const message of messages) {
    const typingIndicator = document.querySelector('#soloMessengerView .typing-indicator');
    if (typingIndicator) {
      typingIndicator.classList.remove('hidden');
      await sleep(300 + Math.random() * 200);
      typingIndicator.classList.add('hidden');
    }
    
    const messageDiv = createMessageElement(message);
    messageDiv.style.opacity = '0';
    messageDiv.style.transform = 'translateY(20px) scale(0.9)';
    container.appendChild(messageDiv);
    
    await sleep(50);
    messageDiv.style.transition = 'all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
    messageDiv.style.opacity = '1';
    messageDiv.style.transform = 'translateY(0) scale(1)';
    
    container.scrollTo({
      top: container.scrollHeight,
      behavior: 'smooth'
    });
    
    await sleep(400);
  }
}

function showSoloAnswerPanel() {
  const panel = document.getElementById('soloAnswerPanel');
  if (panel) panel.classList.add('show');
  hideElement('soloShowAnswersBtn');
}

function hideSoloAnswerPanel() {
  const panel = document.getElementById('soloAnswerPanel');
  if (panel) panel.classList.remove('show');
  showElement('soloShowAnswersBtn');
}

// ============================================================================
// 9. GESTION DE L'AFFICHAGE DES QUESTIONS
// ============================================================================

function displayQuestion(questionData) {
  gameState.currentQuestion = questionData;
  
  if (gameConfig.mode === 'solo') {
    displaySoloQuestion(questionData);
  } else if (gameConfig.mode === 'intervenant') {
    displayIntervenantQuestion(questionData);
  } else if (gameConfig.mode === 'player') {
    displayPlayerQuestion(questionData);
  }
}

function displayIntervenantQuestion(questionData) {
  // Mettre à jour le menu des chapitres
  if (gameState.chaptersMenu) {
    gameState.chaptersMenu.update({
      currentQuestion: questionData.id,
      responses: gameState.responses[gameConfig.lobby] || {},
      questionPath: questionData.questionPath || []
    });
  }
  
  // Gérer les questions "Continuer"
  if (questionData.isContinue || isContinueQuestion(questionData)) {
    handleIntervenantContinue(questionData);
    return;
  }
  
  // Question normale avec votes
  setupIntervenantVoting(questionData);
}

function handleIntervenantContinue(questionData) {
  console.log('Question Continue détectée côté MJ:', questionData.id);
  
  if (questionData.context) {
    showNotification(`📖 ${questionData.context}`, 2000);
  }
  
  // Auto-continuation après délai
  if (questionData.nextQuestions && questionData.nextQuestions.A) {
    setTimeout(() => {
      socket.emit('gm-auto-continue', { 
        currentQuestionId: questionData.id,
        nextQuestionId: questionData.nextQuestions.A 
      });
    }, 1500);
  }
}

function setupIntervenantVoting(questionData) {
  hideElement('qr-overlay');
  hideElement('participants-section');
  hideElement('startGameBtn');
  showElement('game-control');
  
  document.getElementById('lobbyNameGame').textContent = gameConfig.lobby;
  
  // Réinitialiser les votes
  gameState.votedPlayers.clear();
  updatePendingPlayers();
  
  // Afficher l'image
  if (questionData.contextual_image) {
    const imageEl = document.getElementById('questionImage');
    if (imageEl) imageEl.src = questionData.contextual_image;
  }
  
  // Afficher la question
  document.getElementById('questionContext').textContent = questionData.context || '';
  document.getElementById('questionTitle').textContent = questionData.question;
  
  // Créer les options de vote
  createVotingOptions(questionData);
}

function createVotingOptions(questionData) {
  const votingDiv = document.getElementById('votingOptions');
  if (!votingDiv) return;
  
  votingDiv.innerHTML = '';
  gameState.voteComponents = {};
  
  questionData.choices.forEach((choice, index) => {
    const letter = String.fromCharCode(65 + index);
    const optionDiv = document.createElement('div');
    optionDiv.className = 'voting-option';
    optionDiv.id = `voting-option-${letter}`;
    
    votingDiv.appendChild(optionDiv);
    
    gameState.voteComponents[letter] = new VoteComponent(optionDiv, {
      letter: letter,
      text: choice,
      count: 0,
      totalVotes: 0,
      voters: [],
      isClickable: true,
      showVoters: true,
      nextQuestionId: questionData.nextQuestions ? questionData.nextQuestions[letter] : null,
      onVote: (nextQuestionId) => confirmNextQuestion(nextQuestionId)
    });
  });
}

async function displayPlayerQuestion(questionData) {
  gameState.currentQuestion = questionData;
  gameState.hasVoted = false;
  
  hideAnswerPanel();
  hideElement('waitingMessage');
  
  // Afficher l'image
  if (questionData.contextual_image) {
    const imageEl = document.getElementById('playerContextImage');
    if (imageEl) imageEl.src = questionData.contextual_image;
  }
  
  // Afficher le contexte
  const contextDiv = document.getElementById('playerQuestionContext');
  if (contextDiv) {
    if (questionData.context) {
      contextDiv.textContent = questionData.context;
      showElement('playerQuestionContext');
    } else {
      hideElement('playerQuestionContext');
    }
  }
  
  // Afficher conversation messenger si présente
  if (questionData.type === 'messenger_scenario' && questionData.conversation) {
    await displayMessengerConversation(questionData.conversation);
    showElement('messengerView');
  } else {
    hideElement('messengerView');
  }
  
  // Gérer les questions "Continuer"
  if (questionData.isContinue || isContinueQuestion(questionData)) {
    handlePlayerContinue(questionData);
    return;
  }
  
  // Question normale
  setupPlayerChoices(questionData);
}

function handlePlayerContinue(questionData) {
  console.log('Question Continue côté joueur:', questionData.id);
  
  document.getElementById('playerQuestionTitle').textContent = 'Cliquez pour continuer';
  
  const choicesDiv = document.getElementById('answerChoices');
  if (!choicesDiv) return;
  
  choicesDiv.innerHTML = '';
  
  const continueBtn = document.createElement('button');
  continueBtn.className = 'button button-primary continue-button';
  continueBtn.innerHTML = `
    <span>${questionData.choices[0] || 'Continuer'}</span>
    <span class="arrow">→</span>
  `;
  
  continueBtn.onclick = () => {
    socket.emit('player-answer', { 
      questionId: questionData.id, 
      answer: 'continue' 
    });
    
    continueBtn.classList.add('clicked');
    continueBtn.disabled = true;
    
    document.getElementById('answerStatus').textContent = '✅ Suite de l\'histoire...';
    hideAnswerPanel();
    showElement('waitingMessage');
  };
  
  choicesDiv.appendChild(continueBtn);
  showElement('showAnswersBtn');
}

function setupPlayerChoices(questionData) {
  const titleEl = document.getElementById('playerQuestionTitle');
  if (titleEl) titleEl.textContent = questionData.question || 'Que faire ?';
  
  const choicesDiv = document.getElementById('answerChoices');
  if (!choicesDiv) return;
  
  choicesDiv.innerHTML = '';
  gameState.voteComponents = {};
  
  questionData.choices.forEach((choice, index) => {
    const letter = String.fromCharCode(65 + index);
    const choiceContainer = document.createElement('div');
    choiceContainer.className = 'answer-choice-container';
    choiceContainer.id = `answer-choice-${letter}`;
    
    choicesDiv.appendChild(choiceContainer);
    
    gameState.voteComponents[letter] = new VoteComponent(choiceContainer, {
      letter: letter,
      text: choice,
      count: 0,
      totalVotes: 0,
      isClickable: true,
      showVoters: false,
      onVote: (selectedLetter) => submitAnswer(questionData.id, selectedLetter)
    });
  });
  
  document.getElementById('answerStatus').textContent = '';
  showElement('showAnswersBtn');
}

function submitAnswer(questionId, answer) {
  if (gameState.hasVoted) return;
  
  gameState.hasVoted = true;
  socket.emit('player-answer', { questionId, answer });
  
  // Désactiver tous les choix
  Object.values(gameState.voteComponents).forEach(component => {
    component.disable();
  });
  
  // Animer le choix sélectionné
  if (gameState.voteComponents[answer]) {
    gameState.voteComponents[answer].showVoteAnimation();
    gameState.voteComponents[answer].update({
      count: 1,
      totalVotes: 1
    });
  }
  
  document.getElementById('answerStatus').textContent = '✅ Réponse enregistrée !';
  showElement('waitingMessage');
}

// ============================================================================
// 10. ÉVÉNEMENTS SOCKET.IO
// ============================================================================

// === Événements Généraux ===

socket.on('connect', () => {
  console.log('✅ Connecté au serveur');
  showNotification('Connexion établie', 'success');
});

socket.on('disconnect', () => {
  console.log('❌ Déconnecté du serveur');
  showNotification('Connexion perdue', 'error');
});

socket.on('error', (message) => {
  console.error('Erreur socket:', message);
  showNotification(message, 'error');
});

// === Événements Lobby ===

socket.on('lobby-created', ({ lobbyName, scenarioTitle, scenarioData, mode }) => {
  console.log('Lobby créé:', { lobbyName, scenarioTitle, mode });
  
  gameConfig.scenario = scenarioData;
  
  if (mode === 'solo') {
    handleSoloLobbyCreated(scenarioTitle);
  } else {
    handleGroupLobbyCreated(lobbyName, scenarioTitle);
  }
});

function handleSoloLobbyCreated(scenarioTitle) {
  // Démarrer automatiquement en mode solo
  setTimeout(() => {
    socket.emit('start-game');
  }, 500);
  
  console.log('🎮 Mode solo prêt à démarrer');
}

function handleGroupLobbyCreated(lobbyName, scenarioTitle) {
  hideElement('intervenant-creation');
  showElement('intervenant-lobby');
  
  document.getElementById('lobbyNameDisplay').textContent = lobbyName;
  document.getElementById('lobbyNameGame').textContent = lobbyName;
  document.getElementById('lobbyNameEnd').textContent = lobbyName;
  
  // Générer le lien avec les couleurs du thème
  gameState.playerLink = generateShareableLink(lobbyName);
  
  // Générer le QR code avec le lien complet
  generateQRCode(gameState.playerLink);
  
  updateStartButton();
  
  console.log(`🎯 Lobby créé avec lien thématisé: ${gameState.playerLink}`);
}

// === Événements Joueurs ===

socket.on('player-joined', ({ playerName, playerCount }) => {
  const playersDiv = document.getElementById('playersList');
  if (playersDiv) {
    const pill = document.createElement('span');
    pill.className = 'player-pill';
    pill.id = `pill-${playerName}`;
    pill.textContent = playerName;
    playersDiv.appendChild(pill);
  }
  
  gameState.allPlayers.push(playerName);
  
  const countEl = document.getElementById('playerCount');
  if (countEl) countEl.textContent = playerCount;
  
  updateStartButton();
  showNotification(`${playerName} a rejoint la partie`, 'info');
});

socket.on('player-left', ({ playerName, playerCount }) => {
  const pill = document.getElementById(`pill-${playerName}`);
  if (pill) pill.remove();
  
  gameState.allPlayers = gameState.allPlayers.filter(p => p !== playerName);
  gameState.votedPlayers.delete(playerName);
  
  const countEl = document.getElementById('playerCount');
  if (countEl) countEl.textContent = playerCount;
  
  updateStartButton();
  updatePendingPlayers();
  showNotification(`${playerName} a quitté la partie`, 'info');
});

socket.on('request-player-info', () => {
  hideElement('player-join');
  showElement('player-info');
  const lobbyNameEl = document.getElementById('playerLobbyName');
  if (lobbyNameEl) lobbyNameEl.textContent = gameConfig.lobby;
});

socket.on('joined-lobby', ({ scenarioTitle }) => {
  hideElement('player-info');
  showElement('player-waiting');
  
  const waitingLobbyEl = document.getElementById('waitingLobbyName');
  if (waitingLobbyEl) waitingLobbyEl.textContent = gameConfig.lobby;
  
  const gameLobbyEl = document.getElementById('gameLobbyName');
  if (gameLobbyEl) gameLobbyEl.textContent = gameConfig.lobby;
});

// === Événements Jeu ===

socket.on('game-start', () => {
  console.log('🎮 Partie démarrée');
  
  if (gameConfig.mode === 'player') {
    hideElement('player-waiting');
    showElement('player-game');
  } else if (gameConfig.mode === 'solo') {
    // Plus besoin de montrer des éléments spécifiques, tout est déjà visible
    console.log('🎮 Mode solo démarré');
  }
});

socket.on('question', (questionData) => {
  console.log('Question reçue:', questionData);
  
  // Ajouter le flag isContinue si absent
  if (!questionData.hasOwnProperty('isContinue')) {
    questionData.isContinue = isContinueQuestion(questionData);
  }
  
  // Utiliser la bonne fonction selon le mode
  if (gameConfig.mode === 'solo') {
    displaySoloQuestion(questionData);
  } else {
    displayQuestion(questionData);
  }
});

socket.on('vote-update', (voteData) => {
  if (gameConfig.mode === 'intervenant') {
    updateVotes(voteData);
  } else if (gameConfig.mode === 'player' && gameState.hasVoted) {
    updatePlayerVoteDisplay(voteData);
  }
});

socket.on('question-path-update', ({ questionPath, currentQuestion }) => {
  if (gameState.chaptersMenu && gameConfig.mode === 'intervenant') {
    gameState.chaptersMenu.update({
      questionPath: questionPath,
      currentQuestion: currentQuestion
    });
  }
});

socket.on('game-over', () => {
  if (gameConfig.mode === 'player') {
    hideElement('player-game');
    showElement('player-game-over');
  } else if (gameConfig.mode === 'intervenant') {
    hideElement('game-control');
    showElement('game-over-gm');
  } else if (gameConfig.mode === 'solo') {
    showScreen('solo-end-screen');
  }
});

socket.on('csv-ready', (filename) => {
  const link = document.getElementById('csvDownloadLink');
  if (link) {
    link.href = '/exports/' + filename;
    link.download = filename;
    showElement('csvDownloadLink');
    
    if (gameConfig.mode === 'intervenant') {
      link.click();
    }
  }
  
  showNotification('CSV prêt au téléchargement', 'success');
});

socket.on('lobby-closed', () => {
  showNotification('La partie a été fermée', 'warning');
  setTimeout(() => {
    backToHome();
  }, 2000);
});

// ============================================================================
// 11. FONCTIONS UTILITAIRES
// ============================================================================

function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const screen = document.getElementById(screenId);
  if (screen) screen.classList.add('active');
}

function showElement(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('hidden');
}

function hideElement(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('hidden');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isContinueQuestion(questionData) {
  return questionData && 
         questionData.choices && 
         questionData.choices.length === 1 && 
         (questionData.choices[0].toLowerCase() === 'continuer' || 
          questionData.question === '' ||
          questionData.question === null);
}

function confirmNextQuestion(nextQuestionId) {
  if (confirm('Passer à la question suivante ?')) {
    socket.emit('choose-next-question', { nextQuestionId });
  }
}

function updatePendingPlayers() {
  const pending = gameState.allPlayers.filter(p => !gameState.votedPlayers.has(p));
  const pendingText = pending.length > 0 ? pending.join(', ') : 'Tous ont voté !';
  
  const pendingEl = document.getElementById('pendingPlayersGame');
  if (pendingEl) pendingEl.textContent = pendingText;
  
  const waitingDiv = document.getElementById('waitingForVotesGame');
  if (waitingDiv) {
    if (pending.length > 0) {
      showElement('waitingForVotesGame');
    } else {
      hideElement('waitingForVotesGame');
    }
  }
}

function updateVotes(voteData) {
  const { voteCounts, voteDetails, playerName: votingPlayer } = voteData;
  
  if (votingPlayer) {
    gameState.votedPlayers.add(votingPlayer);
    updatePendingPlayers();
  }
  
  const totalVotes = Object.values(voteCounts).reduce((sum, count) => sum + count, 0);
  
  Object.keys(gameState.voteComponents).forEach(letter => {
    if (gameState.voteComponents[letter]) {
      gameState.voteComponents[letter].update({
        count: voteCounts[letter] || 0,
        totalVotes: totalVotes,
        voters: voteDetails[letter] || []
      });
    }
  });
}

function updatePlayerVoteDisplay(voteData) {
  const { voteCounts } = voteData;
  const totalVotes = Object.values(voteCounts).reduce((sum, count) => sum + count, 0);
  
  Object.keys(gameState.voteComponents).forEach(letter => {
    if (gameState.voteComponents[letter]) {
      gameState.voteComponents[letter].update({
        count: voteCounts[letter] || 0,
        totalVotes: totalVotes
      });
    }
  });
}

function updateStartButton() {
  const btn = document.getElementById('startGameBtn');
  const count = parseInt(document.getElementById('playerCount')?.textContent || '0');
  
  if (btn) {
    if (count >= 1) {
      btn.disabled = false;
      hideElement('minPlayersText');
    } else {
      btn.disabled = true;
      showElement('minPlayersText');
    }
  }
}

function displaySelectedLevel(level) {
  const displayEl = document.getElementById('selected-level-display');
  if (!displayEl || !gameConfig.levelInfo) return;
  
  displayEl.innerHTML = `
    <div class="selected-level-info">
      <span class="level-badge" style="background: linear-gradient(45deg, ${gameConfig.levelInfo.levelColors[0]}, ${gameConfig.levelInfo.levelColors[1]})">
        ${gameConfig.levelInfo.level}
      </span>
      <p class="level-description">${gameConfig.levelInfo.levelDescription}</p>
    </div>
  `;
}

// ============================================================================
// 12. NAVIGATION ET RETOURS
// ============================================================================

function backToHome() {
  window.location.href = window.location.origin + window.location.pathname;
}

function backToMenu() {
  // Nettoyer le sessionStorage
  sessionStorage.removeItem('gameConfig');
  sessionStorage.removeItem('soloMode');
  sessionStorage.removeItem('currentScenarioFile');
  
  // Déconnecter le socket
  socket.disconnect();
  
  // Retourner au menu
  window.location.href = '/menu.html?return=game';
}

function newSession() {
  if (confirm('Créer une nouvelle session ?')) {
    location.reload();
  }
}

function sendResults() {
  showNotification('Fonction d\'envoi par email à implémenter', 'info');
}

function showAnswerPanel() {
  const panel = document.getElementById('answerPanel');
  if (panel) panel.classList.add('show');
  hideElement('showAnswersBtn');
}

function hideAnswerPanel() {
  const panel = document.getElementById('answerPanel');
  if (panel) panel.classList.remove('show');
  showElement('showAnswersBtn');
}

// ============================================================================
// 13. MESSENGER ET ANIMATIONS
// ============================================================================

async function displayMessengerConversation(conversation) {
  const messengerDiv = document.getElementById('messengerView');
  if (!messengerDiv) return;
  
  messengerDiv.innerHTML = '<div class="messenger-messages"></div>';
  
  const messages = conversation.messages.map(message => {
    const participant = conversation.participants.find(p => p.id === message.sender);
    return {
      sender: participant.name,
      avatar: message.avatar || participant.avatar,
      content: message.content,
      isCurrentUser: participant.isCurrentUser
    };
  });
  
  await animateMessages(messages);
}

async function animateMessages(messages) {
  const container = document.querySelector('.messenger-messages');
  if (!container) return;
  
  for (const message of messages) {
    showElement('typing-indicator');
    await sleep(300 + Math.random() * 200);
    hideElement('typing-indicator');
    
    const messageDiv = createMessageElement(message);
    messageDiv.style.opacity = '0';
    messageDiv.style.transform = 'translateY(20px) scale(0.9)';
    container.appendChild(messageDiv);
    
    await sleep(50);
    messageDiv.style.transition = 'all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
    messageDiv.style.opacity = '1';
    messageDiv.style.transform = 'translateY(0) scale(1)';
    
    container.scrollTo({
      top: container.scrollHeight,
      behavior: 'smooth'
    });
    
    await sleep(400);
  }
}

function createMessageElement(message) {
  const messageDiv = document.createElement('div');
  const isCurrentUser = message.isCurrentUser || false;
  messageDiv.className = `message ${isCurrentUser ? 'message-right' : 'message-left'}`;
  
  const isImageAvatar = message.avatar && (
    message.avatar.startsWith('http') || 
    message.avatar.startsWith('/') || 
    /\.(jpg|jpeg|png|gif|svg)$/i.test(message.avatar)
  );
  
  const avatarContent = isImageAvatar 
    ? `<img src="${message.avatar}" alt="${message.sender}" class="avatar-image" />`
    : (message.avatar || '👤');
  
  messageDiv.innerHTML = `
    <div class="message-avatar">${avatarContent}</div>
    <div class="message-content">
      <div class="message-name">${message.sender || 'Utilisateur'}</div>
      <div class="message-text">${message.content}</div>
    </div>
  `;
  
  return messageDiv;
}

// ============================================================================
// 14. NOTIFICATIONS ET EFFETS VISUELS
// ============================================================================

function showNotification(message, type = 'info', duration = 3000) {
  let notif = document.getElementById('notification-toast');
  if (!notif) {
    notif = document.createElement('div');
    notif.id = 'notification-toast';
    notif.className = 'notification-toast';
    notif.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      padding: 12px 24px;
      border-radius: 8px;
      z-index: 10000;
      display: none;
      align-items: center;
      gap: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      animation: slideInDown 0.3s ease-out;
    `;
    document.body.appendChild(notif);
  }
  
  const icons = {
    'info': '📢',
    'success': '✅',
    'warning': '⚠️',
    'error': '❌'
  };
  
  const colors = {
    'info': '#3498db',
    'success': '#27ae60',
    'warning': '#f39c12',
    'error': '#e74c3c'
  };
  
  notif.style.background = colors[type] || colors.info;
  notif.style.color = 'white';
  notif.innerHTML = `
    <span class="notification-icon">${icons[type] || icons.info}</span>
    <span class="notification-text">${message}</span>
  `;
  
  notif.style.display = 'flex';
  notif.classList.add('show');
  
  setTimeout(() => {
    notif.style.animation = 'slideOutUp 0.3s ease-out';
    setTimeout(() => {
      notif.style.display = 'none';
      notif.classList.remove('show');
    }, 300);
  }, duration);
}

function initializeVisualEffects() {
  // Ajouter les styles d'animation
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    @keyframes slideInDown {
      from {
        transform: translateX(-50%) translateY(-100px);
        opacity: 0;
      }
      to {
        transform: translateX(-50%) translateY(0);
        opacity: 1;
      }
    }
    
    @keyframes slideOutUp {
      from {
        transform: translateX(-50%) translateY(0);
        opacity: 1;
      }
      to {
        transform: translateX(-50%) translateY(-100px);
        opacity: 0;
      }
    }
    
    .continue-button.clicked {
      opacity: 0.6;
      transform: scale(0.95);
    }
    
    .level-badge {
      padding: 4px 12px;
      border-radius: 20px;
      color: white;
      font-weight: bold;
      display: inline-block;
    }
    
    .selected-level-info {
      padding: 15px;
      background: rgba(255,255,255,0.1);
      border-radius: 8px;
      margin-bottom: 20px;
    }
  `;
  document.head.appendChild(styleSheet);
  
  console.log('✨ Effets visuels initialisés');
}

// ============================================================================
// 15. EXPORT DES FONCTIONS GLOBALES
// ============================================================================

window.gameManager = {
  config: gameConfig,
  state: gameState,
  showNotification,
  backToMenu,
  restartGame: () => location.reload()
};

console.log('🎮 Game.js chargé avec succès (version avec mode Solo harmonisé)');